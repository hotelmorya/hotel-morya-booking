import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { findOverbookedTypes } from '@/lib/availability'
import { nextBookingRef } from '@/lib/booking-ref'
import { currentDateIST } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { bookingSchema } from '@/schemas/booking'

const PAGE_SIZE = 25

const ALLOWED_SOURCES = ['website', 'walkin', 'phone', 'whatsapp'] as const
const ALLOWED_SORTS = ['booked', 'total', 'balance', 'checkin'] as const
const ALLOWED_DIRS = ['asc', 'desc'] as const

type AllowedSort = (typeof ALLOWED_SORTS)[number]
type AllowedDir = (typeof ALLOWED_DIRS)[number]

const SORT_COL: Record<AllowedSort, string> = {
  booked: 'created_at',
  total: 'total_amount',
  balance: 'balance_due',
  checkin: 'check_in',
}

const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'not_arrived',
] as const

// GET /api/bookings?page=&status=&search=&source=&checkInFrom=&checkInTo=&sort=&dir=
export async function GET(request: Request) {
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
  const profile = await getCurrentProfile()
  if (!profile || !OPERATIONAL.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const status = url.searchParams.get('status') ?? ''
  const search = (url.searchParams.get('search') ?? '').trim()
  const offset = (page - 1) * PAGE_SIZE

  // Validated optional filters
  const rawSource = url.searchParams.get('source') ?? ''
  const source = (ALLOWED_SOURCES as readonly string[]).includes(rawSource) ? rawSource : ''
  const checkInFrom = url.searchParams.get('checkInFrom') ?? ''
  const checkInTo = url.searchParams.get('checkInTo') ?? ''
  const checkOutFrom = url.searchParams.get('checkOutFrom') ?? ''
  const checkOutTo = url.searchParams.get('checkOutTo') ?? ''
  // Effective-departure range. A day-use booking departs on its check_in day
  // (check_out is artificially check_in + 1), so "departing today" must match
  // overnight stays by check_out and day-use stays by check_in. Validate to a
  // strict yyyy-mm-dd so the value is safe to embed in a PostgREST .or() filter.
  const isISODate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
  const rawDepartingFrom = url.searchParams.get('departingFrom') ?? ''
  const rawDepartingTo = url.searchParams.get('departingTo') ?? ''
  const departingFrom = isISODate(rawDepartingFrom) ? rawDepartingFrom : ''
  const departingTo = isISODate(rawDepartingTo) ? rawDepartingTo : ''
  // `balance=outstanding` → only bookings that still owe money (dashboard deep-link).
  const balanceOutstanding = url.searchParams.get('balance') === 'outstanding'

  // Sort params
  const rawSort = url.searchParams.get('sort') ?? ''
  const rawDir = url.searchParams.get('dir') ?? ''
  const sort: AllowedSort = (ALLOWED_SORTS as readonly string[]).includes(rawSort)
    ? (rawSort as AllowedSort)
    : 'booked'
  const dir: AllowedDir = (ALLOWED_DIRS as readonly string[]).includes(rawDir)
    ? (rawDir as AllowedDir)
    : 'desc'
  const sortCol = SORT_COL[sort]
  const ascending = dir === 'asc'

  // Resolve search guest IDs once, build orExpr once — reused for data + count queries.
  let orExpr: string | null = null
  if (search) {
    // Neutralise PostgREST filter metacharacters so a comma/paren in the search
    // term can't split the OR list or alter the query. `%` and `_` are ilike
    // wildcards — escaped so they match literally.
    const safe = search.replace(/[(),*\\%_]/g, (c) => `\\${c}`)
    // PostgREST can't OR across an embedded resource's columns in one filter.
    // Resolve guest matches first, then OR with booking_ref on the parent.
    const { data: gs } = await supabase
      .from('guests')
      .select('id')
      .or(`fullname.ilike.%${safe}%,phone.ilike.%${safe}%`)
      .is('deleted_at', null)
      .limit(50)
    const guestIds = (gs ?? []).map((g: { id: string }) => g.id)
    const orParts = [
      `booking_ref.ilike.%${safe}%`,
      `group_ref.ilike.%${safe}%`,
    ]
    if (guestIds.length > 0) orParts.push(`guest_id.in.(${guestIds.join(',')})`)
    orExpr = orParts.join(',')
  }

  // Shared base filter helper — applies deleted_at, source, date range, and search.
  // The status filter is intentionally NOT included so it can be applied independently
  // (data query uses status; count queries per-status apply their own).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyBase(q: any): any {
    q = q.is('deleted_at', null)
    if (source) q = q.eq('source', source)
    if (checkInFrom) q = q.gte('check_in', checkInFrom)
    if (checkInTo) q = q.lte('check_in', checkInTo)
    if (checkOutFrom) q = q.gte('check_out', checkOutFrom)
    if (checkOutTo) q = q.lte('check_out', checkOutTo)
    if (departingFrom || departingTo) {
      const overnight = ['stay_type.eq.overnight']
      const dayUse = ['stay_type.eq.day_use']
      if (departingFrom) {
        overnight.push(`check_out.gte.${departingFrom}`)
        dayUse.push(`check_in.gte.${departingFrom}`)
      }
      if (departingTo) {
        overnight.push(`check_out.lte.${departingTo}`)
        dayUse.push(`check_in.lte.${departingTo}`)
      }
      q = q.or(`and(${overnight.join(',')}),and(${dayUse.join(',')})`)
    }
    if (balanceOutstanding) q = q.gt('balance_due', 0)
    if (orExpr) q = q.or(orExpr)
    return q
  }

  // Status counts — run in parallel with the main data query.
  // Each is a lightweight HEAD request (count only, no data rows returned).
  const countAll = applyBase(
    supabase.from('bookings').select('id', { count: 'exact', head: true })
  )
  const countQueries = BOOKING_STATUSES.map((s) =>
    applyBase(
      supabase.from('bookings').select('id', { count: 'exact', head: true })
    ).eq('status', s)
  )

  // Main data query
  let dataQuery = applyBase(
    supabase
      .from('bookings')
      .select(
        'id, booking_ref, check_in, check_out, nights, stay_type, status, source, total_amount, discount_amount, gst_amount, advance_paid, balance_due, created_at, guests!inner(id, fullname, phone, tags)',
        { count: 'exact' }
      )
  )
  if (status) dataQuery = dataQuery.eq('status', status)
  dataQuery = dataQuery.order(sortCol, { ascending })
  if (sortCol !== 'created_at') {
    dataQuery = dataQuery.order('created_at', { ascending: false })
  }
  dataQuery = dataQuery.range(offset, offset + PAGE_SIZE - 1)

  // Run everything in parallel
  const [dataResult, allCountResult, ...statusCountResults] = await Promise.all([
    dataQuery,
    countAll,
    ...countQueries,
  ])

  const { data, count, error } = dataResult
  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 }
    )
  }

  const counts: Record<string, number> = {
    all: allCountResult.count ?? 0,
  }
  BOOKING_STATUSES.forEach((s, i) => {
    counts[s] = statusCountResults[i]?.count ?? 0
  })

  return Response.json({
    data,
    meta: { total: count ?? 0, page, pageSize: PAGE_SIZE, counts },
  })
}

// POST /api/bookings — staff walk-in / phone booking. Guest must already exist
// (the form creates/looks one up via /api/guests first). Created as `pending`;
// staff confirm / add payment / check in from the detail page.
export async function POST(request: Request) {
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
  const profile = await getCurrentProfile()
  if (!profile || !OPERATIONAL.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  const parsed = bookingSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    )
  }
  const input = parsed.data
  if (!input.guest_id) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'A guest is required' } },
      { status: 400 }
    )
  }

  // Idempotency (§30): a duplicate submission carrying the same key returns the
  // booking already created for it instead of creating another. Pre-check covers
  // the common sequential double-submit; the unique index + catch below covers a
  // concurrent race.
  if (input.idempotency_key) {
    const { data: existing } = await supabase
      .from('bookings')
      .select('*, guests(id, fullname, phone, tags)')
      .eq('idempotency_key', input.idempotency_key)
      .is('deleted_at', null)
      .maybeSingle()
    if (existing) return Response.json({ data: existing }, { status: 200 })
  }

  // Availability guard — never reserve more rooms of a type than are free for
  // the dates (hard block; the UI also caps, but a stale/bypassed form must not
  // overbook). Counts overlapping bookings + active holds + maintenance.
  const requested: Record<string, number> = {}
  for (const r of input.rooms) {
    requested[r.room_type_id] = (requested[r.room_type_id] ?? 0) + 1
  }
  const { data: settings } = await supabase
    .from('hotel_settings')
    .select('auto_cancel_hours_after_booking, min_hours_before_checkin')
    .limit(1)
    .maybeSingle()
  const overbooked = await findOverbookedTypes({
    supabase,
    checkIn: input.check_in,
    checkOut: input.check_out,
    settings: settings ?? undefined,
    requested,
  })
  if (overbooked.length > 0) {
    const detail = overbooked
      .map((o) => `${o.requested} requested, ${o.available} available`)
      .join('; ')
    return Response.json(
      {
        error: {
          code: 'NO_AVAILABILITY',
          message: `Not enough rooms available for these dates (${detail}).`,
          details: overbooked,
        },
      },
      { status: 409 }
    )
  }

  // Backdated is derived from the date, not a client flag: a check-in before
  // today (IST) is backdated and requires a reason.
  const isBackdated = input.check_in < currentDateIST()
  if (isBackdated && !input.backdated_reason?.trim()) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A reason is required for a past (backdated) check-in.',
        },
      },
      { status: 400 }
    )
  }

  // Server-authoritative total from the room lines (don't trust a client total).
  const totalAmount = input.rooms.reduce(
    (sum, r) => sum + Number(r.rate_per_night) * Number(r.nights),
    0
  )

  const admin = createAdminClient()

  // Insert booking with a generated ref, retrying once on a ref collision.
  let booking: { id: string } | null = null
  let lastError = ''
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    const booking_ref = await nextBookingRef(admin)
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        guest_id: input.guest_id,
        booking_ref,
        check_in: input.check_in,
        check_out: input.check_out,
        stay_type: input.stay_type,
        day_use_from: input.stay_type === 'day_use' ? input.day_use_from || null : null,
        day_use_to: input.stay_type === 'day_use' ? input.day_use_to || null : null,
        source: input.source,
        total_amount: totalAmount,
        discount_amount: input.discount_amount,
        discount_reason: input.discount_reason || null,
        discount_by: input.discount_amount > 0 ? profile.id : null,
        gst_amount: input.gst_amount,
        special_requests: input.special_requests || null,
        additional_guests: input.additional_guests || null,
        group_ref: input.group_ref || null,
        is_backdated: isBackdated,
        backdated_reason: isBackdated ? input.backdated_reason || null : null,
        idempotency_key: input.idempotency_key || null,
        status: 'pending',
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select('id')
      .single()

    if (!error) {
      booking = data
      break
    }
    lastError = error.message
    // Concurrent duplicate submission won the race — return its booking.
    if (input.idempotency_key && /idempotency/i.test(error.message)) {
      const { data: existing } = await supabase
        .from('bookings')
        .select('*, guests(id, fullname, phone, tags)')
        .eq('idempotency_key', input.idempotency_key)
        .is('deleted_at', null)
        .maybeSingle()
      if (existing) return Response.json({ data: existing }, { status: 200 })
    }
    // 23505 = unique_violation (booking_ref race) — regenerate and retry.
    if (!/duplicate key|23505/i.test(error.message)) break
  }

  if (!booking) {
    return Response.json(
      { error: { code: 'INTERNAL', message: lastError || 'Could not create booking' } },
      { status: 500 }
    )
  }

  // Room lines. If this fails, roll back the parent booking (hard delete — it
  // has no children yet) so we never leave an orphan.
  const { error: roomsError } = await supabase.from('booking_rooms').insert(
    input.rooms.map((r) => ({
      booking_id: booking!.id,
      room_type_id: r.room_type_id,
      rate_per_night: r.rate_per_night,
      nights: r.nights,
    }))
  )
  if (roomsError) {
    await admin.from('bookings').delete().eq('id', booking.id)
    return Response.json(
      { error: { code: 'INTERNAL', message: roomsError.message } },
      { status: 500 }
    )
  }

  const { data: full } = await supabase
    .from('bookings')
    .select('*, guests(id, fullname, phone, tags)')
    .eq('id', booking.id)
    .single()

  return Response.json({ data: full }, { status: 201 })
}
