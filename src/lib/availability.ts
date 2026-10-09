// Availability helpers — server-only (uses Supabase client).
// Computes per-room-type available count for a date range, accounting for:
//   1. Physical room count (not deleted)
//   2. Overlapping pending/confirmed/checked_in bookings (excluding expired
//      pending; checked_out is excluded — the guest has departed)
//   3. Active holds (expires_at > now())
//   4. Rooms under maintenance (rooms.status = 'maintenance')
//
// Overlap test (§6 CLAUDE.md):
//   existing.check_in < requested.check_out
//   AND existing.check_out > requested.check_in
//
// Do NOT call getUser() here — availability is public.

import { isPendingExpired, type HotelAutoCancel } from '@/lib/auto-cancel'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

export interface AvailabilityParams {
  supabase: AnySupabaseClient
  checkIn: string   // YYYY-MM-DD
  checkOut: string  // YYYY-MM-DD
  /** Hotel settings for auto-cancel deadline — needed to discount expired-pending bookings */
  settings?: HotelAutoCancel
}

export interface RoomTypeAvailability {
  room_type_id: string
  total_rooms: number        // physical rooms of this type (not deleted, not maintenance)
  booked_rooms: number       // rooms occupied by active overlapping bookings
  held_rooms: number         // rooms held by active (non-expired) holds
  available_count: number    // total_rooms - booked_rooms - held_rooms (clamped ≥ 0)
}

/**
 * Returns available-count per room_type_id for the requested [checkIn, checkOut) window.
 *
 * Excludes:
 *  - cancelled / not_arrived bookings
 *  - checked_out bookings (guest has departed — room is vacated and resellable)
 *  - pending bookings past their auto-cancel deadline (if settings supplied)
 *  - soft-deleted bookings
 *  - expired holds (expires_at ≤ now)
 *  - rooms with status = 'maintenance'
 *
 * Uses a single anon/RLS client — never requires auth.
 */
export async function roomsAvailableByType({
  supabase,
  checkIn,
  checkOut,
  settings,
}: AvailabilityParams): Promise<RoomTypeAvailability[]> {
  const now = new Date()

  // ── 1–3. Fire all three independent reads concurrently ──
  const [roomsResult, bookingsResult, holdsResult] = await Promise.all([
    // 1. Total physical rooms per room_type (not deleted, not maintenance)
    supabase
      .from('rooms')
      .select('id, room_type_id, status')
      .is('deleted_at', null),

    // 2. Overlapping bookings
    // Overlap: check_in < checkOut AND check_out > checkIn
    // Exclude: cancelled, not_arrived, checked_out, soft-deleted.
    // checked_out is excluded because the guest has departed and the room is
    // vacated — it must be resellable for the rest of that window (e.g. a day-use
    // booking that checked out frees the room for an overnight stay the same date).
    supabase
      .from('bookings')
      .select('id, status, created_at, check_in, booking_rooms(room_type_id, room_id)')
      .is('deleted_at', null)
      .not('status', 'in', '(cancelled,not_arrived,checked_out)')
      .lt('check_in', checkOut)
      .gt('check_out', checkIn),

    // 3. Active holds overlapping the range
    supabase
      .from('booking_holds')
      .select('room_type_id, check_in, check_out, expires_at')
      .gt('expires_at', now.toISOString())
      .lt('check_in', checkOut)
      .gt('check_out', checkIn),
  ])

  const { data: roomsRaw, error: roomsErr } = roomsResult
  const { data: bookingsRaw, error: bookingsErr } = bookingsResult
  const { data: holdsRaw, error: holdsErr } = holdsResult

  if (roomsErr) throw new Error(`rooms query failed: ${roomsErr.message}`)
  if (bookingsErr) throw new Error(`bookings query failed: ${bookingsErr.message}`)
  if (holdsErr) throw new Error(`holds query failed: ${holdsErr.message}`)

  // Map: room_type_id → all physical room ids; also collect maintenance rooms
  const roomsByType: Record<string, string[]> = {}
  const maintenanceRoomIds = new Set<string>()

  for (const r of roomsRaw ?? []) {
    const typeId = r.room_type_id as string
    if (!roomsByType[typeId]) roomsByType[typeId] = []
    roomsByType[typeId].push(r.id as string)
    if (r.status === 'maintenance') {
      maintenanceRoomIds.add(r.id as string)
    }
  }

  // Count overlapping bookings per room_type (filtering out expired-pending)
  const bookedByType: Record<string, number> = {}

  for (const booking of bookingsRaw ?? []) {
    // Skip pending bookings past their auto-cancel deadline (they're effectively gone)
    if (
      booking.status === 'pending' &&
      settings &&
      isPendingExpired(
        { created_at: booking.created_at, check_in: booking.check_in, status: 'pending' },
        settings,
        now
      )
    ) {
      continue
    }

    const bookingRooms = (
      booking.booking_rooms as Array<{ room_type_id: string; room_id: string | null }>
    ) ?? []

    for (const br of bookingRooms) {
      const typeId = br.room_type_id
      bookedByType[typeId] = (bookedByType[typeId] ?? 0) + 1
    }
  }

  const heldByType: Record<string, number> = {}
  for (const h of holdsRaw ?? []) {
    const typeId = h.room_type_id as string
    heldByType[typeId] = (heldByType[typeId] ?? 0) + 1
  }

  // ── 4. Assemble result ──
  const result: RoomTypeAvailability[] = []

  for (const [typeId, roomIds] of Object.entries(roomsByType)) {
    // Available rooms = those NOT under maintenance
    const usableRooms = roomIds.filter((id) => !maintenanceRoomIds.has(id))
    const totalRooms = usableRooms.length
    const booked = bookedByType[typeId] ?? 0
    const held = heldByType[typeId] ?? 0
    const available = Math.max(0, totalRooms - booked - held)

    result.push({
      room_type_id: typeId,
      total_rooms: totalRooms,
      booked_rooms: booked,
      held_rooms: held,
      available_count: available,
    })
  }

  return result
}

export interface Overbooking {
  room_type_id: string
  requested: number
  available: number
}

/**
 * Given a requested quantity per room_type_id, return the types whose request
 * exceeds availability for the window. Empty array = booking fits. Used as the
 * server-side guard before creating a booking (walk-in + public) so we never
 * reserve more rooms of a type than exist/are free for the dates.
 */
export async function findOverbookedTypes(
  params: AvailabilityParams & { requested: Record<string, number> }
): Promise<Overbooking[]> {
  const { requested, ...rest } = params
  const avail = await roomsAvailableByType(rest)
  const availById = new Map(avail.map((a) => [a.room_type_id, a.available_count]))
  const violations: Overbooking[] = []
  for (const [typeId, qty] of Object.entries(requested)) {
    if (qty <= 0) continue
    const available = availById.get(typeId) ?? 0
    if (qty > available) violations.push({ room_type_id: typeId, requested: qty, available })
  }
  return violations
}
