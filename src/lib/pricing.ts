// Pure rate resolution — usable on client (booking form) and server (validation).
// A festival/seasonal rate_override that covers the date wins; otherwise the
// room type's base rate. Phase 4 snapshots a single rate_per_night per room line
// (resolved against check-in); full per-night resolution lands in Phase 6.

export type RateOverride = {
  start_date: string // ISO yyyy-mm-dd
  end_date: string // ISO yyyy-mm-dd (inclusive)
  rate: number
}

/** Nightly rate for a stay starting on `dateISO`. */
export function resolveNightlyRate(
  baseRate: number,
  overrides: RateOverride[],
  dateISO: string
): number {
  const hit = overrides.find(
    (o) => o.start_date <= dateISO && dateISO <= o.end_date
  )
  return hit ? Number(hit.rate) : Number(baseRate)
}

/** Nights between two ISO dates (check_out − check_in). Returns 0 when either
 * date is missing or invalid, so callers never propagate NaN into prices. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const inMs = new Date(checkIn).getTime()
  const outMs = new Date(checkOut).getTime()
  if (Number.isNaN(inMs) || Number.isNaN(outMs)) return 0
  return Math.max(0, Math.round((outMs - inMs) / 86_400_000))
}

// ── Phase 6: per-night stay quote ─────────────────────────────────────────────

export interface NightlyBreakdownItem {
  date: string   // YYYY-MM-DD (the night starting on this date)
  rate: number   // rate charged for this night
}

export interface StayQuote {
  /** Per-night rate breakdown (one entry per night) */
  breakdown: NightlyBreakdownItem[]
  /** Total nights */
  nights: number
  /** Sum of all nightly rates */
  subtotal: number
}

/**
 * Compute a per-night price breakdown for a stay.
 *
 * Each night is resolved individually: the date checked is the *start* of that
 * night (i.e. check-in night = checkIn, second night = checkIn+1, …,
 * last night = checkOut-1). This matches the calendar display (you pay for
 * the night you sleep, not the morning you leave).
 *
 * @param baseRate  - room_type.base_rate
 * @param overrides - rate_overrides rows for this room type
 * @param checkIn   - YYYY-MM-DD
 * @param checkOut  - YYYY-MM-DD (exclusive — guest leaves this morning)
 */
export function quoteStay(params: {
  baseRate: number
  overrides: RateOverride[]
  checkIn: string
  checkOut: string
}): StayQuote {
  const { baseRate, overrides, checkIn, checkOut } = params
  const nights = nightsBetween(checkIn, checkOut)
  const breakdown: NightlyBreakdownItem[] = []

  // Iterate night-by-night from checkIn up to (but not including) checkOut
  const cursor = new Date(`${checkIn}T00:00:00Z`)
  const endMs = new Date(`${checkOut}T00:00:00Z`).getTime()

  while (cursor.getTime() < endMs) {
    // Format as YYYY-MM-DD (UTC date of the cursor)
    const dateISO = cursor.toISOString().slice(0, 10)
    const rate = resolveNightlyRate(baseRate, overrides, dateISO)
    breakdown.push({ date: dateISO, rate })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  const subtotal = breakdown.reduce((sum, n) => sum + n.rate, 0)

  return { breakdown, nights, subtotal }
}
