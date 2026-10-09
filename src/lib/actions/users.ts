'use server'

import { revalidatePath } from 'next/cache'

import { ADMIN_PLUS, getCurrentProfile } from '@/lib/auth'
import { sendEmail } from '@/lib/email/client'
import { passwordReset } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  createUserSchema,
  forgotPasswordSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/schemas/user'

// Builds the hotel-domain recovery link (never the raw *.supabase.co action
// link) so no Supabase URL is ever exposed to a user. /auth/confirm verifies
// the token_hash server-side, then forwards to /auth/reset-password.
function buildResetLink(tokenHash: string): string {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  ).replace(/\/$/, '')
  return `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(
    tokenHash
  )}&type=recovery&next=${encodeURIComponent('/auth/reset-password')}`
}

// A 'use server' module may only export async functions, so the schema + type
// live in @/schemas/user and are imported here and by the client form.

export type CreateUserResult =
  | { success: true; userId: string }
  | { success: false; error: string }

export async function createStaffUser(
  raw: CreateUserInput
): Promise<CreateUserResult> {
  const profile = await getCurrentProfile()
  if (!profile || !ADMIN_PLUS.includes(profile.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const parsed = createUserSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Validation failed',
    }
  }

  const { email, password, fullname, phone, role } = parsed.data

  // Service role to bypass RLS for user creation
  const adminClient = createAdminClient()

  // Create auth user
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? 'Failed to create auth user' }
  }

  // Insert public.users row
  const { data: inserted, error: insertError } = await adminClient
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      fullname,
      phone: phone || null, // "" (blank optional field) → null; DB CHECK rejects ""
      role,
      is_active: true,
      created_by: profile.id,
    })
    .select('id')
    .single()

  if (insertError) {
    // Roll back the auth user to avoid orphans
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: insertError.message }
  }

  revalidatePath('/admin/settings/users')
  return { success: true, userId: inserted.id }
}

export type ToggleActiveResult =
  | { success: true }
  | { success: false; error: string }

export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<ToggleActiveResult> {
  const profile = await getCurrentProfile()
  if (!profile || !ADMIN_PLUS.includes(profile.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Cannot deactivate yourself
  if (userId === profile.id) {
    return { success: false, error: 'You cannot deactivate your own account' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)
    .neq('role', 'super_admin') // safety guard

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/settings/users')
  return { success: true }
}

export type ResetLinkResult =
  | { success: true; link: string; email: string }
  | { success: false; error: string }

/**
 * Admin-initiated password reset. Generates a one-time recovery link the admin
 * can copy and send to the staff member (e.g. via WhatsApp) — no email/SMTP
 * dependency. The link points at /auth/confirm, which verifies the token_hash
 * server-side (device-independent, no PKCE code_verifier needed) and forwards
 * to /auth/reset-password. Recovery links are single-use and expire (default 1h).
 */
export async function generatePasswordResetLink(
  userId: string
): Promise<ResetLinkResult> {
  const profile = await getCurrentProfile()
  if (!profile || !ADMIN_PLUS.includes(profile.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const adminClient = createAdminClient()

  // Resolve the target's auth user + email; never touch the hidden super_admin.
  const { data: target } = await adminClient
    .from('users')
    .select('auth_user_id, role')
    .eq('id', userId)
    .maybeSingle()

  if (!target || !target.auth_user_id) {
    return { success: false, error: 'User not found' }
  }
  if (target.role === 'super_admin') {
    return { success: false, error: 'This account cannot be reset here' }
  }

  const { data: authUser } = await adminClient.auth.admin.getUserById(
    target.auth_user_id
  )
  const email = authUser?.user?.email
  if (!email) {
    return { success: false, error: 'This account has no email on file' }
  }

  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({ type: 'recovery', email })

  const tokenHash = linkData?.properties?.hashed_token
  if (linkError || !tokenHash) {
    return {
      success: false,
      error: linkError?.message ?? 'Could not generate a reset link',
    }
  }

  return { success: true, link: buildResetLink(tokenHash), email }
}

export type RequestResetResult = { success: true } | { success: false; error: string }

/**
 * Self-service "Forgot password?" — UNAUTHENTICATED. Generates a recovery link
 * and sends it ourselves via Resend (hotel-branded), so Supabase never emails
 * the user and no Supabase branding/URL is ever exposed. Always returns success
 * for existing-or-not addresses (don't reveal whether an account exists).
 */
export async function requestPasswordReset(
  raw: unknown
): Promise<RequestResetResult> {
  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: 'Enter a valid email' }
  }
  const { email } = parsed.data

  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    const tokenHash = data?.properties?.hashed_token
    // No such user (or generation failed) — stay silent to avoid account
    // enumeration. The caller always sees success.
    if (error || !tokenHash) {
      return { success: true }
    }

    const { subject, html } = passwordReset(buildResetLink(tokenHash))
    await sendEmail({ to: email, subject, html })
  } catch (err) {
    // Don't leak internals; the admin copy-link is the reliable fallback.
    console.error('requestPasswordReset failed:', err)
  }

  return { success: true }
}

export type UpdateUserResult =
  | { success: true }
  | { success: false; error: string }

export async function updateStaffUser(
  userId: string,
  raw: UpdateUserInput
): Promise<UpdateUserResult> {
  const profile = await getCurrentProfile()
  if (!profile || !ADMIN_PLUS.includes(profile.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const parsed = updateUserSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Validation failed',
    }
  }
  const { fullname, phone, role } = parsed.data

  // Don't let an admin change their own role — avoids accidental self-lockout.
  if (userId === profile.id && role !== profile.role) {
    return { success: false, error: 'You cannot change your own role.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .update({ fullname, phone: phone || null, role })
    .eq('id', userId)
    .neq('role', 'super_admin') // never edit the hidden super_admin
    .select('id')

  if (error) return { success: false, error: error.message }
  if (!data || data.length === 0) {
    return { success: false, error: 'User not found or cannot be edited.' }
  }

  revalidatePath('/admin/settings/users')
  return { success: true }
}
