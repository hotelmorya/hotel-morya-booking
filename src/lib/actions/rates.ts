'use server'

import { revalidatePath } from 'next/cache'

import { MANAGER_PLUS, getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { rateOverrideSchema, type RateOverrideInput } from '@/schemas/rate-override'
import { money } from '@/schemas/shared'

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

// Update a room type's base_rate
export async function updateBaseRate(
  roomTypeId: string,
  rate: number
): Promise<ActionResult> {
  const profile = await getCurrentProfile()
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const parsed = money.safeParse(rate)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid rate' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('room_types')
    .update({ base_rate: parsed.data, updated_by: profile.id, updated_at: new Date().toISOString() })
    .eq('id', roomTypeId)
    .is('deleted_at', null)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/rates')
  return { success: true }
}

// Create a rate override
export async function createRateOverride(
  raw: RateOverrideInput
): Promise<ActionResult> {
  const profile = await getCurrentProfile()
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const parsed = rateOverrideSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Validation failed',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('rate_overrides').insert({
    ...parsed.data,
    created_by: profile.id,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/rates')
  return { success: true }
}

// Update a rate override
export async function updateRateOverride(
  id: string,
  raw: RateOverrideInput
): Promise<ActionResult> {
  const profile = await getCurrentProfile()
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const parsed = rateOverrideSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Validation failed',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('rate_overrides')
    .update({ ...parsed.data, updated_by: profile.id })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/rates')
  return { success: true }
}

// Delete a rate override (hard delete is allowed per spec — they are snapshot-safe)
export async function deleteRateOverride(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile()
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('rate_overrides').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/rates')
  return { success: true }
}
