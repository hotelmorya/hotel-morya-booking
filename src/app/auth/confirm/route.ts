import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// Verifies a recovery (or other email OTP) token_hash server-side and forwards
// to the destination with a session set via cookies. Device-independent — works
// even when the link is opened in a different browser than it was requested
// (no PKCE code_verifier needed). Used by both the admin copy-link reset and
// the self-service forgot-password email (when its template routes here).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next') ?? '/auth/reset-password'
  // Only allow internal relative redirects.
  const next = nextParam.startsWith('/') ? nextParam : '/auth/reset-password'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Invalid or expired link.
  return NextResponse.redirect(
    new URL('/auth/reset-password?error=invalid', origin)
  )
}
