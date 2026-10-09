import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentDateIST } from '@/lib/format'

// ---------------------------------------------------------------------------
// Day-use auto-checkout sweep — checks out overdue day-use ("few hours")
// bookings still `checked_in`, then frees their rooms.
//
// Why: a day-use booking is modeled as a single-night stay (check_out =
// check_in + 1). While it stays `checked_in` it blocks the room for that night
// on availability (incl. the public booking page → "Sold out"). If staff forget
// to check a few-hours guest out, the room is silently lost for the whole night.
// This sweep is the backstop to the dashboard "overdue" nudge. A booking is
// auto-closed when either:
//   - its check-in day has fully passed (guest is certainly gone), or
//   - it's still today but we're past its expected day_use_to window + a grace
//     period (only when an expected end time was set).
// (Day-use payment is collected at check-in, so no balance is stranded; any
// balance still shows in Outstanding Balances after checkout.)
//
// Run frequently (e.g. hourly) via cron-job.org so the same-day grace path fires
// promptly; a nightly run alone would only catch the end-of-day path.
//
// Runs on a schedule via cron-job.org (Bearer CRON_SECRET). The booking status
// change (checked_in → checked_out) and each room change (→ cleaning) are
// recorded in the canonical activity_log by the DB triggers; with no actor set
// they read as "System checked out the guest".
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
  const today = currentDateIST()
  const now = new Date()

  // Hours past the expected day_use_to window before a SAME-DAY day-use is
  // auto-closed. Prior days are always overdue regardless of this grace.
  const DAY_USE_GRACE_HOURS = 2

  // 2. Candidate day-use bookings still checked-in on or before today.
  const { data: candidates, error } = await admin
    .from('bookings')
    .select('id, booking_ref, check_in, day_use_to, booking_rooms(room_id)')
    .eq('status', 'checked_in')
    .eq('stay_type', 'day_use')
    .lte('check_in', today)
    .is('deleted_at', null)

  if (error) {
    console.error('[bookings/auto-checkout] DB error fetching overdue day-use:', error)
    return Response.json(
      { error: 'Failed to fetch overdue day-use bookings', details: error.message },
      { status: 500 }
    )
  }

  // 2b. Keep the ones actually due for auto-checkout:
  //   - check_in before today → the day ended, guest is certainly gone.
  //   - check_in == today → only once we're past day_use_to + grace (and only
  //     when an expected end time was set; otherwise wait for end of day).
  const overdue = (candidates ?? []).filter((b) => {
    if (b.check_in < today) return true
    if (!b.day_use_to) return false
    const expectedEnd = new Date(`${b.check_in}T${b.day_use_to}+05:30`)
    if (Number.isNaN(expectedEnd.getTime())) return false
    return now.getTime() > expectedEnd.getTime() + DAY_USE_GRACE_HOURS * 3_600_000
  })

  if (overdue.length === 0) {
    return Response.json({
      data: { ok: true, scanned: candidates?.length ?? 0, checked_out: 0 },
    })
  }

  const ids = overdue.map((b) => b.id)

  // 3. Flip them to checked_out. The `.eq('status','checked_in')` guard keeps
  //    this safe against a concurrent manual checkout (a flipped row won't match).
  //    Booking goes checked_out BEFORE any room flip so the DB occupied-room
  //    guard (guard_room_status_occupied) no longer sees a checked-in guest.
  const { data: closed, error: updErr } = await admin
    .from('bookings')
    .update({
      status: 'checked_out',
      actual_check_out: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .in('id', ids)
    .eq('status', 'checked_in')
    .select('id, booking_ref')

  if (updErr) {
    console.error('[bookings/auto-checkout] DB error checking out:', updErr)
    return Response.json(
      { error: 'Failed to check out overdue day-use bookings', details: updErr.message },
      { status: 500 }
    )
  }

  const closedIds = new Set((closed ?? []).map((b) => b.id))

  // 4. Free the rooms of the bookings we actually closed → cleaning.
  const roomIds = overdue
    .filter((b) => closedIds.has(b.id))
    .flatMap((b) =>
      ((b.booking_rooms as Array<{ room_id: string | null }>) ?? [])
        .map((br) => br.room_id)
        .filter((r): r is string => !!r)
    )
  if (roomIds.length > 0) {
    await admin.from('rooms').update({ status: 'cleaning' }).in('id', roomIds)
  }

  const closedRows = closed ?? []
  console.info(
    `[bookings/auto-checkout] checked out ${closedRows.length} overdue day-use booking(s):`,
    closedRows.map((b) => b.booking_ref).join(', ')
  )

  return Response.json({
    data: {
      ok: true,
      scanned: candidates?.length ?? 0,
      checked_out: closedRows.length,
      refs: closedRows.map((b) => b.booking_ref),
    },
  })
}

export const POST = GET
