// Auto-cancel deadline logic (§14 CLAUDE.md + §5 #7 Locked Decisions)
//
// deadline = LEAST(
//   created_at + auto_cancel_hours_after_booking,
//   check_in − min_hours_before_checkin
// )
// floored at: GREATEST(deadline, created_at + 1 hour)
//
// Pure functions — no side-effects, no DB calls. Usable server + client.

export interface AutoCancelParams {
  /** ISO timestamp — when the booking row was created */
  createdAt: string | Date
  /** ISO date string YYYY-MM-DD — the requested check-in date */
  checkIn: string
  /** Hotel setting: hours after creation before auto-cancel. Default 24. */
  autoCancelHours: number
  /** Hotel setting: must-confirm hours before check-in. Default 6. */
  minHoursBeforeCheckin: number
}

/** Compute the auto-cancel deadline for a pending booking. Returns a Date. */
export function autoCancelDeadline({
  createdAt,
  checkIn,
  autoCancelHours,
  minHoursBeforeCheckin,
}: AutoCancelParams): Date {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt

  // Deadline A: created_at + autoCancelHours
  const deadlineA = new Date(created.getTime() + autoCancelHours * 3_600_000)

  // Deadline B: check_in (midnight UTC-equivalent treated as start-of-day IST noon
  // for safety, but the spec says "check_in − min_hours_before_checkin").
  // check_in is a date string; treat it as midnight IST = UTC+05:30.
  // We use T00:00:00+05:30 to get the IST start-of-day.
  const checkInIST = new Date(`${checkIn}T00:00:00+05:30`)
  const deadlineB = new Date(checkInIST.getTime() - minHoursBeforeCheckin * 3_600_000)

  // LEAST of A and B
  const rawDeadline = deadlineA < deadlineB ? deadlineA : deadlineB

  // Floor: never earlier than created_at + 1 hour
  const floor = new Date(created.getTime() + 3_600_000)

  return rawDeadline > floor ? rawDeadline : floor
}

/** ISO string version of autoCancelDeadline for serialisation. */
export function autoCancelDeadlineISO(params: AutoCancelParams): string {
  return autoCancelDeadline(params).toISOString()
}

export interface HotelAutoCancel {
  auto_cancel_hours_after_booking: number
  min_hours_before_checkin: number
}

export interface PendingBookingShape {
  created_at: string
  check_in: string
  status: string
}

/**
 * Returns true if a `pending` booking has passed its auto-cancel deadline.
 * Treats any non-pending booking as not expired (caller should check status first).
 *
 * @param booking  - partial booking row (created_at, check_in, status)
 * @param settings - hotel_settings row (auto_cancel_hours_after_booking, min_hours_before_checkin)
 * @param now      - comparison timestamp (default: Date.now()). Pass in for deterministic tests.
 */
export function isPendingExpired(
  booking: PendingBookingShape,
  settings: HotelAutoCancel,
  now: Date = new Date()
): boolean {
  if (booking.status !== 'pending') return false
  const deadline = autoCancelDeadline({
    createdAt: booking.created_at,
    checkIn: booking.check_in,
    autoCancelHours: settings.auto_cancel_hours_after_booking,
    minHoursBeforeCheckin: settings.min_hours_before_checkin,
  })
  return now >= deadline
}
