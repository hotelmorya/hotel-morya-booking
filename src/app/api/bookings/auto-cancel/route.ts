import { timingSafeEqual } from 'crypto'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPendingExpired } from '@/lib/auto-cancel'
import { sendCancellationEmail } from '@/lib/email/cancellation'

// ---------------------------------------------------------------------------
// Auto-cancel sweep (§7 / §14) — flips pending bookings past their auto-cancel
// deadline to `cancelled`. Runs on a schedule via cron-job.org (Bearer CRON_SECRET).
// Complements the app's lazy expiry: lists/dashboards already treat past-deadline
// pendings as expired, but this sweep makes the DB state actually consistent so
// inventory frees up and stale "needs call" bookings clear without staff action.
//
// The booking status change (pending → cancelled) is recorded in the canonical
// activity_log by the DB trigger log_booking_activity(); with no actor set it
// reads as "System cancelled the booking".
// ---------------------------------------------------------------------------

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get('authorization') ?? ''
  const xCronHeader = request.headers.get('x-cron-secret') ?? ''
  const candidate = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : xCronHeader
  if (!candidate) return false
  try {
    const a = Buffer.from(secret, 'utf8')
    const b = Buffer.from(candidate, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  // 1. Authenticate
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 2. Hotel auto-cancel knobs (fall back to spec defaults)
  const { data: settingsArr } = await admin
    .from('hotel_settings')
    .select('auto_cancel_hours_after_booking, min_hours_before_checkin')
    .limit(1)

  const settings = {
    auto_cancel_hours_after_booking:
      settingsArr?.[0]?.auto_cancel_hours_after_booking ?? 24,
    min_hours_before_checkin: settingsArr?.[0]?.min_hours_before_checkin ?? 6,
  }

  // 3. All live pending bookings
  const { data: pending, error } = await admin
    .from('bookings')
    .select('id, booking_ref, created_at, check_in, status')
    .eq('status', 'pending')
    .is('deleted_at', null)

  if (error) {
    console.error('[bookings/auto-cancel] DB error fetching pending:', error)
    return Response.json(
      { error: 'Failed to fetch pending bookings', details: error.message },
      { status: 500 }
    )
  }

  const now = new Date()

  // 4. Filter to those past their auto-cancel deadline
  const expired = (pending ?? []).filter((b) =>
    isPendingExpired(
      {
        created_at: b.created_at ?? now.toISOString(),
        check_in: b.check_in,
        status: 'pending',
      },
      settings,
      now
    )
  )

  if (expired.length === 0) {
    return Response.json({ data: { ok: true, scanned: (pending ?? []).length, cancelled: 0 } })
  }

  // 5. Flip them to cancelled. The `.eq('status','pending')` guard keeps this safe
  // against a concurrent confirm/check-in (a flipped row simply won't match).
  const expiredIds = expired.map((b) => b.id)
  const { data: cancelledRows, error: updateError } = await admin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: now.toISOString() })
    .in('id', expiredIds)
    .eq('status', 'pending')
    .select('id, booking_ref')

  if (updateError) {
    console.error('[bookings/auto-cancel] DB error cancelling:', updateError)
    return Response.json(
      { error: 'Failed to cancel expired bookings', details: updateError.message },
      { status: 500 }
    )
  }

  const cancelled = cancelledRows ?? []
  console.info(
    `[bookings/auto-cancel] cancelled ${cancelled.length} expired pending booking(s):`,
    cancelled.map((b) => b.booking_ref).join(', ')
  )

  // Best-effort: notify each guest whose booking was auto-cancelled. Runs via
  // `after()` so Vercel keeps the function alive until the Resend calls finish —
  // a bare fire-and-forget promise is killed when the response returns.
  // allSettled so one failed send can't break the rest of the sweep.
  if (cancelled.length > 0) {
    after(() =>
      Promise.allSettled(
        cancelled.map((b) => sendCancellationEmail(b.id, 'cancelled')),
      ),
    )
  }

  return Response.json({
    data: {
      ok: true,
      scanned: (pending ?? []).length,
      cancelled: cancelled.length,
      refs: cancelled.map((b) => b.booking_ref),
    },
  })
}

export const POST = GET
