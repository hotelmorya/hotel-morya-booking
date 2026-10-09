// All date/time helpers resolve against IST (Asia/Kolkata) as required by
// CLAUDE.md. Never use new Date() directly for "today" — use currentDateIST().

const IST = 'Asia/Kolkata'

/**
 * Title-case a person's name: capitalize the first letter of every word, lower
 * the rest ("rajesh kumar" → "Rajesh Kumar"). Mirrors Postgres `initcap()`, which
 * the DB trigger applies as the source of truth — this is the client/Zod mirror.
 */
export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s.'-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
}

/** ₹1,23,456 — Indian grouping, no decimals for whole rupees */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** ₹1,23,456.50 — same but always shows paise */
export function formatCurrencyWithPaise(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** "11 Jun 2026" */
export function formatDateIST(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: IST,
  }).format(typeof date === 'string' ? new Date(date) : date)
}

/** "11 Jun 2026, 3:30 PM" */
export function formatDateTimeIST(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  }).format(typeof date === 'string' ? new Date(date) : date)
}

/** "3:30 PM" */
export function formatTimeIST(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  }).format(typeof date === 'string' ? new Date(date) : date)
}

/** YYYY-MM-DD in IST — safe "today" for date comparisons */
export function currentDateIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(new Date())
}

/** Format a wall-clock `time` column ("17:00:00" / "17:00") as "5:00 pm".
 * Day-use windows are stored as IST wall-clock times entered by staff — no TZ
 * conversion. Returns null for empty/unparseable input. */
export function formatClockTime(time: string | null | undefined): string | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (Number.isNaN(h) || Number.isNaN(min) || h > 23 || min > 59) return null
  const ampm = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`
}

/** Expected day-use window: "5:00 pm – 8:00 pm", or one-sided, or null. */
export function formatDayUseWindow(
  from: string | null | undefined,
  to: string | null | undefined
): string | null {
  const a = formatClockTime(from)
  const b = formatClockTime(to)
  if (a && b) return `${a} – ${b}`
  if (a) return `from ${a}`
  if (b) return `until ${b}`
  return null
}

/** Approx elapsed time since a timestamp, as "~2h" / "~45m". null if invalid. */
export function formatElapsedSince(
  since: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!since) return null
  const ms = now.getTime() - new Date(since).getTime()
  if (Number.isNaN(ms) || ms < 0) return null
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `~${Math.max(1, mins)}m`
  return `~${Math.round(ms / 3_600_000)}h`
}

/** "2 hours ago" / "yesterday" / "3 days ago" — always in IST */
export function formatRelativeIST(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay} days ago`
  return formatDateIST(d)
}

/** "1 night" / "3 nights" */
export function formatNights(n: number): string {
  return `${n} ${n === 1 ? 'night' : 'nights'}`
}

/** "1 guest" / "4 guests" */
export function formatGuests(n: number): string {
  return `${n} ${n === 1 ? 'guest' : 'guests'}`
}

/**
 * Bed configuration label: "2 King beds" / "1 Queen bed" / "3 beds".
 * Returns '' when there's nothing meaningful to show.
 */
export function formatBeds(
  numberOfBeds?: number | null,
  bedType?: string | null,
  bedNoun = 'bed',
  bedsNoun = 'beds'
): string {
  const count = numberOfBeds ?? 0
  if (!count && !bedType) return ''
  const n = count || 1
  const noun = n === 1 ? bedNoun : bedsNoun
  return bedType ? `${n} ${bedType} ${noun}` : `${n} ${noun}`
}

/** "BK-2026-0001" from a booking_ref string — already formatted, pass-through */
export function formatBookingRef(ref: string): string {
  return ref
}

/** Approx hours a day-use guest occupied a room, from actual timestamps.
 * Returns "~4h" (rounded, min 1h) or null when not both check-in/out are set. */
export function formatDayUseHours(
  actualCheckIn: string | null | undefined,
  actualCheckOut: string | null | undefined
): string | null {
  if (!actualCheckIn || !actualCheckOut) return null
  const ms = new Date(actualCheckOut).getTime() - new Date(actualCheckIn).getTime()
  if (Number.isNaN(ms) || ms <= 0) return null
  return `~${Math.max(1, Math.round(ms / 3_600_000))}h`
}

/** One-line stay descriptor used across list/detail/receipt.
 * Day-use: "Day use · 14 Jun 2026 (~4h)". Overnight: the date range + nights. */
export function formatStay(booking: {
  stay_type?: 'overnight' | 'day_use' | null
  check_in: string
  check_out: string
  nights?: number | null
  actual_check_in?: string | null
  actual_check_out?: string | null
}): string {
  if (booking.stay_type === 'day_use') {
    const hours = formatDayUseHours(booking.actual_check_in, booking.actual_check_out)
    return `Day use · ${formatDateIST(booking.check_in)}${hours ? ` (${hours})` : ''}`
  }
  const range = formatDateRange(booking.check_in, booking.check_out)
  const nights =
    booking.nights ??
    Math.round(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) /
        86_400_000
    )
  return `${range} · ${formatNights(nights)}`
}

/** Check-in/out date range: "11 Jun – 14 Jun 2026" */
export function formatDateRange(checkIn: string, checkOut: string): string {
  const inDate = new Date(checkIn)
  const outDate = new Date(checkOut)
  const inMonth = inDate.toLocaleDateString('en-IN', { month: 'short', timeZone: IST })
  const outMonth = outDate.toLocaleDateString('en-IN', { month: 'short', timeZone: IST })
  const inDay = inDate.toLocaleDateString('en-IN', { day: 'numeric', timeZone: IST })
  const outDay = outDate.toLocaleDateString('en-IN', { day: 'numeric', timeZone: IST })
  const year = outDate.toLocaleDateString('en-IN', { year: 'numeric', timeZone: IST })

  if (inMonth === outMonth) {
    return `${inDay} – ${outDay} ${outMonth} ${year}`
  }
  return `${inDay} ${inMonth} – ${outDay} ${outMonth} ${year}`
}
