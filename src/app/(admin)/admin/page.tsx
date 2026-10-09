import { createClient } from '@/lib/supabase/server'
import { formatDayUseWindow, formatElapsedSince } from '@/lib/format'
import { getCurrentProfile, ADMIN_PLUS, MANAGER_PLUS } from '@/lib/auth'
import { autoCancelDeadline, isPendingExpired } from '@/lib/auto-cancel'
import type { UserRole } from '@/types/database'

import { KpiStrip } from '@/components/admin/dashboard/KpiStrip'
import { StatsRow } from '@/components/admin/dashboard/StatsRow'
import {
  SetupChecklist,
  type ChecklistItem,
} from '@/components/admin/dashboard/SetupChecklist'
import {
  ArrivalsDeparturePanels,
  TomorrowsArrivals,
  type ArrivalRow,
  type DepartureRow,
} from '@/components/admin/dashboard/ArrivalsDeparturePanels'
import {
  OutstandingBalances,
  type OutstandingBalanceRow,
} from '@/components/admin/dashboard/OutstandingBalances'
import {
  ActivityFeed,
  type ActivityEntry,
} from '@/components/admin/dashboard/ActivityFeed'
import { RoomStatusMiniGridCard } from '@/components/admin/rooms/RoomStatusMiniGrid'
import {
  ActiveHoldsPanel,
  type ActiveHold,
} from '@/components/admin/dashboard/ActiveHoldsPanel'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns today's date string in IST as yyyy-mm-dd */
function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/** Returns tomorrow's date string in IST as yyyy-mm-dd */
function tomorrowIST(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/** Returns yesterday's date string in IST as yyyy-mm-dd */
function yesterdayIST(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}


// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchDashboardData(role: UserRole, userId: string) {
  const supabase = await createClient()
  const today = todayIST()
  const tomorrow = tomorrowIST()
  const yesterday = yesterdayIST()
  const now = new Date().toISOString()
  const threeHoursFromNow = new Date(Date.now() + 3 * 3_600_000).toISOString()

  // Run all queries in parallel
  const [
    pendingBookingsRes,
    activeHoldsRes,
    arrivalsRes,
    departuresRes,
    tomorrowArrivalsRes,
    arrivalsYesterdayRes,
    departuresYesterdayRes,
    checkedInRes,
    roomsRes,
    revenueRes,
    activityRes,
    settingsRes,
    roomTypesCountRes,
    roomsCountRes,
    photosCountRes,
    nonSuperUsersRes,
  ] = await Promise.all([
    // Pending bookings — for needs-call + deadline-soon
    supabase
      .from('bookings')
      .select('id, created_at, check_in')
      .eq('status', 'pending')
      .is('deleted_at', null),

    // Active holds — details for the holds panel (room type + dates + expiry)
    supabase
      .from('booking_holds')
      .select('id, check_in, check_out, expires_at, room_types(name)')
      .gt('expires_at', now)
      .order('expires_at', { ascending: true }),

    // Arrivals today
    supabase
      .from('bookings')
      .select(
        'id, booking_ref, status, nights, advance_paid, total_amount, check_in, created_at, stay_type, day_use_from, day_use_to, guest:guests!bookings_guest_id_fkey(fullname, phone)'
      )
      .eq('check_in', today)
      .in('status', ['confirmed', 'pending'])
      .is('deleted_at', null)
      .limit(10),

    // Departures today + overdue — overnight bookings due today OR still checked
    // in past their check_out (overdue); day-use bookings leave on their check_in
    // day (check_out is artificially check_in + 1). Using check_out.lte captures
    // both today's checkouts and forgotten prior-night guests so they stay visible.
    supabase
      .from('bookings')
      .select(
        'id, booking_ref, status, nights, advance_paid, total_amount, check_out, check_in, stay_type, actual_check_in, day_use_from, day_use_to, guest:guests!bookings_guest_id_fkey(fullname, phone)'
      )
      .eq('status', 'checked_in')
      .or(
        `and(stay_type.eq.overnight,check_out.lte.${today}),and(stay_type.eq.day_use,check_in.lte.${today})`
      )
      .is('deleted_at', null)
      .order('check_out', { ascending: true })
      .limit(15),

    // Tomorrow's arrivals
    supabase
      .from('bookings')
      .select(
        'id, booking_ref, status, nights, advance_paid, total_amount, check_in, created_at, stay_type, day_use_from, day_use_to, guest:guests!bookings_guest_id_fkey(fullname, phone)'
      )
      .eq('check_in', tomorrow)
      .in('status', ['confirmed', 'pending'])
      .is('deleted_at', null)
      .limit(10),

    // Arrivals yesterday — for trend
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('check_in', yesterday)
      .in('status', ['confirmed', 'pending', 'checked_in', 'checked_out'])
      .is('deleted_at', null),

    // Departures yesterday — for trend (day-use departs on its check_in day)
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['checked_in', 'checked_out'])
      .or(
        `and(stay_type.eq.overnight,check_out.eq.${yesterday}),and(stay_type.eq.day_use,check_in.eq.${yesterday})`
      )
      .is('deleted_at', null),

    // In-house or departed guests who still owe money. checked_out is included
    // because guests routinely settle the full balance at/after checkout — those
    // balances must stay visible until actually collected.
    supabase
      .from('bookings')
      .select(
        'id, booking_ref, balance_due, guest:guests!bookings_guest_id_fkey(fullname)'
      )
      .in('status', ['checked_in', 'checked_out'])
      .gt('balance_due', 0)
      .is('deleted_at', null)
      .limit(10),

    // All rooms — for occupancy %
    supabase.from('rooms').select('status').is('deleted_at', null),

    // Payments — for revenue today + yesterday
    supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('status', 'success')
      .is('deleted_at', null),

    // Activity log — receptionist sees only own
    role === 'receptionist'
      ? supabase
          .from('activity_log')
          .select('id, action, entity_type, entity_id, created_at, user_id, metadata')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
      : supabase
          .from('activity_log')
          .select('id, action, entity_type, entity_id, created_at, user_id, metadata')
          .order('created_at', { ascending: false })
          .limit(10),

    // Hotel settings (single row)
    supabase.from('hotel_settings').select('*').maybeSingle(),

    // Checklist: room types
    supabase
      .from('room_types')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),

    // Checklist: rooms
    supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),

    // Checklist: room photos
    supabase.from('room_photos').select('id', { count: 'exact', head: true }),

    // Checklist: non-super-admin users
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'super_admin'),
  ])

  // ---- KPI ----
  const pendingBookings = pendingBookingsRes.data ?? []
  const settings = settingsRes.data
  const cancelHours = settings?.auto_cancel_hours_after_booking ?? 24
  const minHoursBeforeCheckin = settings?.min_hours_before_checkin ?? 6
  const acSettings = {
    auto_cancel_hours_after_booking: cancelHours,
    min_hours_before_checkin: minHoursBeforeCheckin,
  }
  const nowDate = new Date(now)

  // Past-deadline pendings have effectively auto-cancelled (lazy expiry, §14) and
  // are swept to `cancelled` by the /api/bookings/auto-cancel cron. Until a sweep
  // runs they may still read as `pending` in the DB, so the dashboard treats them
  // as expired everywhere — they don't need a call and aren't real arrivals.
  const livePending = pendingBookings.filter(
    (b) =>
      !isPendingExpired(
        {
          created_at: b.created_at ?? new Date().toISOString(),
          check_in: b.check_in,
          status: 'pending',
        },
        acSettings,
        nowDate
      )
  )

  const needsCallCount = livePending.length

  // "Deadline soon" = a live pending whose auto-cancel deadline lands within the
  // next 3h (livePending already excludes those past deadline).
  const deadlineSoonCount = livePending.filter((b) => {
    const deadline = autoCancelDeadline({
      createdAt: b.created_at ?? new Date().toISOString(),
      checkIn: b.check_in,
      autoCancelHours: cancelHours,
      minHoursBeforeCheckin,
    })
    return deadline <= new Date(threeHoursFromNow)
  }).length

  // Active-hold details — an online guest is mid-booking. A hold carries no guest
  // info (it's created before the guest form), so the honest "clue" for staff is
  // room type + dates + time-to-expiry. Grouped by (type, dates) so a multi-room
  // hold reads as "2× AC Room" rather than two identical rows.
  type RawHoldRow = {
    id: string
    check_in: string
    check_out: string
    expires_at: string
    room_types: { name: { en?: string } | null } | { name: { en?: string } | null }[] | null
  }
  const holdGroups = new Map<string, ActiveHold>()
  for (const h of (activeHoldsRes.data ?? []) as unknown as RawHoldRow[]) {
    const rt = Array.isArray(h.room_types) ? h.room_types[0] : h.room_types
    const typeName = rt?.name?.en ?? 'Room'
    const key = `${typeName}|${h.check_in}|${h.check_out}`
    const existing = holdGroups.get(key)
    if (existing) {
      existing.quantity += 1
      existing.ids.push(h.id)
      // Surface the soonest expiry for the group.
      if (h.expires_at < existing.expires_at) existing.expires_at = h.expires_at
    } else {
      holdGroups.set(key, {
        id: h.id,
        ids: [h.id],
        room_type_name: typeName,
        check_in: h.check_in,
        check_out: h.check_out,
        expires_at: h.expires_at,
        quantity: 1,
      })
    }
  }
  const activeHolds = [...holdGroups.values()]

  // ---- Stats ----
  const allRooms = roomsRes.data ?? []
  const occupiedCount = allRooms.filter((r) => r.status === 'occupied').length
  const totalRooms = allRooms.length
  const occupancyPercent =
    totalRooms === 0 ? null : Math.round((occupiedCount / totalRooms) * 100)

  // Revenue today and yesterday (for trend)
  const allPayments = revenueRes.data ?? []
  const revenueToday = allPayments.reduce((sum, p) => {
    if (!p.paid_at) return sum
    const dateStr = new Date(p.paid_at).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    })
    return dateStr === today ? sum + (p.amount ?? 0) : sum
  }, 0)

  const revenueYesterday = allPayments.reduce((sum, p) => {
    if (!p.paid_at) return sum
    const dateStr = new Date(p.paid_at).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    })
    return dateStr === yesterday ? sum + (p.amount ?? 0) : sum
  }, 0)

  // Trends: today minus yesterday (null means data available but may be 0)
  const arrivalsYesterdayCount = arrivalsYesterdayRes.count ?? 0
  const departuresYesterdayCount = departuresYesterdayRes.count ?? 0

  // ---- Arrivals / Departures ----
  type RawGuestField =
    | { fullname: string; phone: string }
    | { fullname: string; phone: string }[]
    | null

  function normaliseGuest(raw: RawGuestField): { fullname: string; phone: string } {
    if (!raw) return { fullname: 'Unknown', phone: '' }
    if (Array.isArray(raw)) return raw[0] ?? { fullname: 'Unknown', phone: '' }
    return raw
  }

  // We need to cast because the generic select() return types are broad
  type RawArrivalRow = {
    id: string
    booking_ref: string
    status: string
    nights: number | null
    advance_paid: number
    total_amount: number
    check_in: string
    created_at: string | null
    stay_type: 'overnight' | 'day_use' | null
    day_use_from: string | null
    day_use_to: string | null
    guest: RawGuestField
  }

  // A pending arrival past its auto-cancel deadline has effectively expired — drop
  // it so it doesn't masquerade as a live arrival (mirrors the KPI treatment).
  const isLiveArrival = (r: RawArrivalRow): boolean =>
    !isPendingExpired(
      {
        created_at: r.created_at ?? new Date().toISOString(),
        check_in: r.check_in,
        status: r.status,
      },
      acSettings,
      nowDate
    )

  type RawDepartureRow = {
    id: string
    booking_ref: string
    status: string
    nights: number | null
    advance_paid: number
    total_amount: number
    check_out: string
    check_in: string
    stay_type: 'overnight' | 'day_use' | null
    actual_check_in: string | null
    day_use_from: string | null
    day_use_to: string | null
    guest: RawGuestField
  }

  const arrivalsToday: ArrivalRow[] = ((arrivalsRes.data ?? []) as unknown as RawArrivalRow[])
    .filter(isLiveArrival)
    .map((r) => {
      const g = normaliseGuest(r.guest)
      const isDayUse = r.stay_type === 'day_use'
      return {
        id: r.id,
        booking_ref: r.booking_ref,
        status: r.status as ArrivalRow['status'],
        guest_fullname: g.fullname,
        guest_phone: g.phone,
        nights: r.nights,
        advance_paid: r.advance_paid,
        total_amount: r.total_amount,
        check_in: r.check_in,
        is_day_use: isDayUse,
        day_use_window: isDayUse
          ? formatDayUseWindow(r.day_use_from, r.day_use_to)
          : null,
      }
    }
  )

  const departuresToday: DepartureRow[] = (
    (departuresRes.data ?? []) as unknown as RawDepartureRow[]
  ).map((r) => {
    const g = normaliseGuest(r.guest)
    const isDayUse = r.stay_type === 'day_use'
    // Overdue = guest is still checked_in but should have checked out already.
    // Day-use: past its check_in day, or past its expected window end on that day.
    // Overnight: check_out date is before today (guest stayed past due date).
    const overdue = isDayUse
      ? r.check_in < today ||
        (!!r.day_use_to &&
          new Date(`${r.check_in}T${r.day_use_to}+05:30`).getTime() <
            nowDate.getTime())
      : r.check_out < today
    return {
      id: r.id,
      booking_ref: r.booking_ref,
      status: r.status as DepartureRow['status'],
      guest_fullname: g.fullname,
      guest_phone: g.phone,
      nights: r.nights,
      advance_paid: r.advance_paid,
      total_amount: r.total_amount,
      check_out: r.check_out,
      is_day_use: isDayUse,
      day_use_window: isDayUse
        ? formatDayUseWindow(r.day_use_from, r.day_use_to)
        : null,
      in_room: isDayUse ? formatElapsedSince(r.actual_check_in, nowDate) : null,
      overdue,
    }
  })

  const tomorrowArrivals: ArrivalRow[] = (
    (tomorrowArrivalsRes.data ?? []) as unknown as RawArrivalRow[]
  )
    .filter(isLiveArrival)
    .map((r) => {
    const g = normaliseGuest(r.guest)
    const isDayUse = r.stay_type === 'day_use'
    return {
      id: r.id,
      booking_ref: r.booking_ref,
      status: r.status as ArrivalRow['status'],
      guest_fullname: g.fullname,
      guest_phone: g.phone,
      nights: r.nights,
      advance_paid: r.advance_paid,
      total_amount: r.total_amount,
      check_in: r.check_in,
      is_day_use: isDayUse,
      day_use_window: isDayUse
        ? formatDayUseWindow(r.day_use_from, r.day_use_to)
        : null,
    }
  })

  // ---- Outstanding balances ----
  type RawCheckedInRow = {
    id: string
    booking_ref: string
    balance_due: number | null
    guest: { fullname: string } | { fullname: string }[] | null
  }

  const outstandingBalances: OutstandingBalanceRow[] = (
    (checkedInRes.data ?? []) as unknown as RawCheckedInRow[]
  ).map((r) => {
    const g = r.guest
    const fullname = Array.isArray(g)
      ? (g[0]?.fullname ?? 'Unknown')
      : (g?.fullname ?? 'Unknown')
    return {
      id: r.id,
      booking_ref: r.booking_ref,
      guest_fullname: fullname,
      balance_due: r.balance_due ?? 0,
    }
  })

  // ---- Activity — enrich with user names ----
  const activityRaw = activityRes.data ?? []
  const userIds = [
    ...new Set(
      activityRaw
        .map((a) => a.user_id)
        .filter((id): id is string => id !== null)
    ),
  ]

  const userNameMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, fullname')
      .in('id', userIds)
    ;(usersData ?? []).forEach((u) => {
      userNameMap[u.id] = u.fullname
    })
  }

  const activityEntries: ActivityEntry[] = activityRaw.map((a) => ({
    id: a.id,
    action: a.action,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    created_at: a.created_at,
    user_fullname: a.user_id ? (userNameMap[a.user_id] ?? null) : null,
    metadata: (a.metadata ?? null) as Record<string, unknown> | null,
  }))

  // ---- Setup checklist ----
  const checklistItems: ChecklistItem[] = [
    {
      label: 'Hotel info added',
      done: !!settings,
      href: '/admin/settings',
    },
    {
      label: 'At least one room type created',
      done: (roomTypesCountRes.count ?? 0) >= 1,
      href: '/admin/room-types',
    },
    {
      label: 'At least one room added',
      done: (roomsCountRes.count ?? 0) >= 1,
      href: '/admin/room-types',
    },
    {
      label: 'At least one room photo uploaded',
      done: (photosCountRes.count ?? 0) >= 1,
      href: '/admin/room-types',
    },
    {
      label: 'UPI QR code uploaded',
      done: !!settings?.upi_qr_url,
      href: '/admin/settings',
      optional: true,
    },
    {
      label: 'Staff user added',
      done: (nonSuperUsersRes.count ?? 0) >= 1,
      href: '/admin/settings',
      optional: true,
    },
  ]

  return {
    needsCallCount,
    deadlineSoonCount,
    activeHolds,
    arrivalsToday,
    arrivalsCount: arrivalsToday.length,
    departuresCount: departuresToday.length,
    departuresToday,
    tomorrowArrivals,
    occupancyPercent,
    revenueToday,
    revenueYesterday,
    arrivalsYesterdayCount,
    departuresYesterdayCount,
    outstandingBalances,
    activityEntries,
    checklistItems,
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function AdminDashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const role = profile.role

  const data = await fetchDashboardData(role, profile.id)

  const isAdminPlus = ADMIN_PLUS.includes(role)
  const showActivityFeed = MANAGER_PLUS.includes(role) || role === 'receptionist'

  // Trend values (today minus yesterday)
  const arrivalsTrend = data.arrivalsCount - data.arrivalsYesterdayCount
  const departuresTrend = data.departuresCount - data.departuresYesterdayCount
  const revenueTrend = data.revenueToday - data.revenueYesterday

  return (
    <div className="space-y-6">
      {/* 1. Setup checklist — admin+ only; hides automatically when all done */}
      {isAdminPlus && <SetupChecklist items={data.checklistItems} />}

      {/* 2. KPI strip — all roles */}
      <KpiStrip
        needsCallCount={data.needsCallCount}
        deadlineSoonCount={data.deadlineSoonCount}
      />

      {/* 2b. Active holds detail — what the "Holds active" KPI points at */}
      <ActiveHoldsPanel holds={data.activeHolds} />

      {/* 3. Stats row — role-filtered */}
      <StatsRow
        role={role}
        arrivalsToday={data.arrivalsCount}
        departuresToday={data.departuresCount}
        occupancyPercent={data.occupancyPercent}
        revenueToday={data.revenueToday}
        arrivalsTrend={arrivalsTrend}
        departuresTrend={departuresTrend}
        revenueTrend={revenueTrend}
      />

      {/* 4. Arrivals + Departures panels side-by-side */}
      <ArrivalsDeparturePanels
        arrivals={data.arrivalsToday}
        departures={data.departuresToday}
      />

      {/* 5. Tomorrow's arrivals preview */}
      <TomorrowsArrivals arrivals={data.tomorrowArrivals} />

      {/* 6. Room status mini-grid */}
      <RoomStatusMiniGridCard />

      {/* 7. Outstanding balances */}
      <OutstandingBalances rows={data.outstandingBalances} />

      {/* 8. Recent activity feed */}
      {showActivityFeed && <ActivityFeed entries={data.activityEntries} />}
    </div>
  )
}
