import { MANAGER_PLUS, getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { currentDateIST } from '@/lib/format'

// Helper: YYYY-MM-DD for the first day of the current month in IST
function firstDayOfCurrentMonthIST(): string {
  const today = currentDateIST() // "YYYY-MM-DD"
  return today.slice(0, 7) + '-01'
}

export type RevenueData = {
  /** Total advance_paid across ALL bookings (overnight + day-use). */
  collected: number
  waived: number
  /** Advance paid for overnight bookings only. */
  overnight_collected: number
  /** Advance paid for day-use bookings only. */
  day_use_collected: number
  /** Number of day-use bookings in the period. */
  day_use_count: number
}

export type SourceBreakdownItem = {
  source: string
  count: number
  revenue: number
}

export type PaymentBreakdownItem = {
  method: string
  count: number
  amount: number
}

export type OutstandingData = {
  /** Sum of balance_due for checked_in + checked_out bookings in the date range with balance > 0. */
  total: number
  /** Number of such bookings. */
  count: number
}

export type PendingData = {
  /** Number of pending bookings in the date range. */
  count: number
  /** Sum of (total_amount - discount_amount + gst_amount) — the gross amount committed. */
  billable: number
  /** Sum of advance_paid across those pending bookings. */
  collected: number
  /** billable - collected — money expected but not yet received. */
  receivable: number
}

export type ReportsData = {
  revenue: RevenueData
  occupancy: number | null
  adr: number | null
  revpar: number | null
  /**
   * Room-nights sold — OVERNIGHT bookings only.
   * Day-use bookings are excluded because they are not part of nightly inventory.
   */
  rooms_sold: number
  rooms_available: number
  source_breakdown: SourceBreakdownItem[]
  payment_breakdown: PaymentBreakdownItem[]
  /** Money owed by guests who checked in or checked out but haven't paid in full. */
  outstanding: OutstandingData
  /** Pending bookings: committed but unconfirmed/unpaid revenue. */
  pending: PendingData
  from: string
  to: string
}

const COUNTED_STATUSES = ['confirmed', 'checked_in', 'checked_out']

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
// Defaults to current month if omitted.
// Role: manager+ only.
export async function GET(request: Request) {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  // 2. Role
  const profile = await getCurrentProfile()
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Reports are restricted to manager and above' } },
      { status: 403 }
    )
  }

  // 3. Date range params (defaults: current month IST)
  const url = new URL(request.url)
  const from = url.searchParams.get('from') || firstDayOfCurrentMonthIST()
  const to = url.searchParams.get('to') || currentDateIST()

  // 4. Aggregate via admin client to skip RLS row-by-row filtering overhead
  //    (still filters by deleted_at = null for data integrity).
  const admin = createAdminClient()

  // --- Revenue: sum totals on bookings in range (check_in falls in range) ---
  // stay_type is selected so we can split overnight vs day-use metrics.
  const { data: bookingRows, error: bookingErr } = await admin
    .from('bookings')
    .select('total_amount, discount_amount, gst_amount, advance_paid, source, nights, stay_type')
    .is('deleted_at', null)
    .in('status', COUNTED_STATUSES)
    .gte('check_in', from)
    .lte('check_in', to)

  if (bookingErr) {
    return Response.json(
      { error: { code: 'INTERNAL', message: bookingErr.message } },
      { status: 500 }
    )
  }

  const rows = bookingRows ?? []

  // Revenue collected:
  //   - overnight_collected: advance_paid for overnight bookings only (used in ADR/RevPAR)
  //   - day_use_collected: advance_paid for day-use bookings only
  //   - collected (total): overnight + day-use combined — shown as the headline revenue figure
  // Revenue waived = sum(discount_amount) across all bookings.
  // rooms_sold = sum(nights) for OVERNIGHT bookings only.
  //   Day-use rooms are NOT part of nightly inventory, so they must not inflate occupancy,
  //   ADR, or RevPAR figures.
  let overnight_collected = 0
  let day_use_collected = 0
  let waived = 0
  let rooms_sold = 0 // overnight room-nights only
  let day_use_count = 0

  for (const b of rows) {
    const paid = Number(b.advance_paid ?? 0)
    waived += Number(b.discount_amount ?? 0)

    if (b.stay_type === 'day_use') {
      day_use_collected += paid
      day_use_count += 1
    } else {
      // overnight (or null/missing stay_type treated as overnight for backwards compat)
      overnight_collected += paid
      rooms_sold += Number(b.nights ?? 0)
    }
  }

  const collected = overnight_collected + day_use_collected

  // --- Source breakdown: all bookings (overnight + day-use).
  // This correctly reflects channel mix regardless of stay type.
  const sourceMap: Record<string, { count: number; revenue: number }> = {}
  for (const b of rows) {
    const src = b.source ?? 'unknown'
    if (!sourceMap[src]) sourceMap[src] = { count: 0, revenue: 0 }
    sourceMap[src].count += 1
    sourceMap[src].revenue += Number(b.advance_paid ?? 0)
  }
  const source_breakdown: SourceBreakdownItem[] = Object.entries(sourceMap).map(
    ([source, v]) => ({ source, ...v })
  )

  // --- Payment method breakdown: from payments table ---
  const { data: paymentRows, error: paymentErr } = await admin
    .from('payments')
    .select('method, amount, booking_id')
    .is('deleted_at', null)
    .eq('status', 'success')

  if (paymentErr) {
    return Response.json(
      { error: { code: 'INTERNAL', message: paymentErr.message } },
      { status: 500 }
    )
  }

  // Filter payments to only those belonging to bookings in our date-filtered set
  const bookingIdsInRange = new Set<string>()
  // We need booking ids — re-query with id included for payment join
  const { data: bookingIds } = await admin
    .from('bookings')
    .select('id')
    .is('deleted_at', null)
    .in('status', COUNTED_STATUSES)
    .gte('check_in', from)
    .lte('check_in', to)

  for (const b of bookingIds ?? []) {
    bookingIdsInRange.add(b.id)
  }

  const methodMap: Record<string, { count: number; amount: number }> = {}
  for (const p of paymentRows ?? []) {
    if (!bookingIdsInRange.has(p.booking_id)) continue
    const m = p.method ?? 'unknown'
    if (!methodMap[m]) methodMap[m] = { count: 0, amount: 0 }
    methodMap[m].count += 1
    methodMap[m].amount += Number(p.amount ?? 0)
  }
  const payment_breakdown: PaymentBreakdownItem[] = Object.entries(methodMap).map(
    ([method, v]) => ({ method, ...v })
  )

  // --- Occupancy: rooms_available = total active rooms × days in range ---
  const { data: activeRooms, error: roomErr } = await admin
    .from('rooms')
    .select('id', { count: 'exact' })
    .is('deleted_at', null)

  if (roomErr) {
    return Response.json(
      { error: { code: 'INTERNAL', message: roomErr.message } },
      { status: 500 }
    )
  }

  const totalRooms = activeRooms?.length ?? 0

  // Days in the range (inclusive of from, exclusive of to — like check-in nights)
  const fromMs = new Date(from).getTime()
  const toMs = new Date(to).getTime()
  const daysInRange = Math.max(1, Math.round((toMs - fromMs) / 86_400_000) + 1)

  const rooms_available = totalRooms * daysInRange
  const occupancy = rooms_available > 0 ? Math.round((rooms_sold / rooms_available) * 100) : null
  // ADR and RevPAR use overnight_collected only — day-use revenue must not distort
  // per-room-night averages since day-use bookings are excluded from the denominator.
  const adr = rooms_sold > 0 ? Math.round(overnight_collected / rooms_sold) : null
  const revpar = rooms_available > 0 ? Math.round(overnight_collected / rooms_available) : null

  // --- Outstanding balances: checked_in or checked_out bookings with balance_due > 0 ---
  // Scoped to the same check_in date window as the rest of the report.
  // Uses the admin client so RLS row-filtering doesn't hide data.
  const { data: outstandingRows, error: outstandingErr } = await admin
    .from('bookings')
    .select('balance_due')
    .is('deleted_at', null)
    .in('status', ['checked_in', 'checked_out'])
    .gt('balance_due', 0)
    .gte('check_in', from)
    .lte('check_in', to)

  if (outstandingErr) {
    return Response.json(
      { error: { code: 'INTERNAL', message: outstandingErr.message } },
      { status: 500 }
    )
  }

  const outstanding: OutstandingData = (outstandingRows ?? []).reduce(
    (acc, b) => ({
      total: acc.total + Number(b.balance_due ?? 0),
      count: acc.count + 1,
    }),
    { total: 0, count: 0 }
  )

  // --- Pending revenue: pending bookings — committed but not yet confirmed/paid ---
  // Separate query — pending must NEVER be folded into COUNTED_STATUSES (which drive
  // revenue/occupancy/ADR/RevPAR).  Scoped to the same check_in date window.
  const { data: pendingRows, error: pendingErr } = await admin
    .from('bookings')
    .select('total_amount, discount_amount, gst_amount, advance_paid')
    .is('deleted_at', null)
    .eq('status', 'pending')
    .gte('check_in', from)
    .lte('check_in', to)

  if (pendingErr) {
    return Response.json(
      { error: { code: 'INTERNAL', message: pendingErr.message } },
      { status: 500 }
    )
  }

  const pending: PendingData = (pendingRows ?? []).reduce(
    (acc, b) => {
      const billable =
        Number(b.total_amount ?? 0) -
        Number(b.discount_amount ?? 0) +
        Number(b.gst_amount ?? 0)
      const collected = Number(b.advance_paid ?? 0)
      return {
        count: acc.count + 1,
        billable: acc.billable + billable,
        collected: acc.collected + collected,
        receivable: acc.receivable + (billable - collected),
      }
    },
    { count: 0, billable: 0, collected: 0, receivable: 0 }
  )

  const data: ReportsData = {
    revenue: { collected, waived, overnight_collected, day_use_collected, day_use_count },
    occupancy,
    adr,
    revpar,
    rooms_sold,
    rooms_available,
    source_breakdown,
    payment_breakdown,
    outstanding,
    pending,
    from,
    to,
  }

  return Response.json({ data })
}
