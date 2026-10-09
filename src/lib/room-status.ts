/**
 * Room status derivation logic (lib/room-status.ts)
 *
 * The DB enum stores the physical status (available | occupied | cleaning |
 * maintenance). The *displayed* status adds two logical states derived from
 * active bookings:
 *   - arriving  : confirmed/pending booking whose check_in = today (IST)
 *   - repair    : rooms.status = 'maintenance' (renamed for display clarity)
 *
 * "Today" is always resolved in IST as required by CLAUDE.md §17.
 */

import type { Tables } from '@/types/database'

export type DerivedRoomStatus =
  | 'available'
  | 'arriving'
  | 'occupied'
  | 'cleaning'
  | 'repair'

export type BookingRoomWithBooking = Tables<'booking_rooms'> & {
  bookings: Pick<Tables<'bookings'>, 'status' | 'check_in'> | null
}

/**
 * Derive the display status for a single room.
 *
 * @param room         - The rooms row (including status from the DB).
 * @param bookingRooms - booking_rooms rows joined with their parent booking
 *                       (only rows where room_id = room.id need to be passed,
 *                       but passing all is safe — they are filtered here).
 */
export function deriveRoomStatus(
  room: Pick<Tables<'rooms'>, 'id' | 'status'>,
  bookingRooms: BookingRoomWithBooking[] = []
): DerivedRoomStatus {
  // Booking truth wins over physical rooms.status. A room with a checked-in
  // guest is OCCUPIED even if its physical status drifted (e.g. housekeeping or
  // an edit set it to cleaning/available while the guest is still in-house) —
  // otherwise an occupied room could show available and be double-assigned.
  // (Requires the caller to pass booking_rooms; with [] it falls back to the
  // physical status below — preserving prior behaviour.)
  const roomAssignments = bookingRooms.filter((br) => br.room_id === room.id)
  const hasCheckedInGuest = roomAssignments.some(
    (br) => br.bookings?.status === 'checked_in'
  )
  if (hasCheckedInGuest) return 'occupied'

  // Otherwise physical states are authoritative.
  if (room.status === 'maintenance') return 'repair'
  if (room.status === 'cleaning') return 'cleaning'
  if (room.status === 'occupied') return 'occupied'

  const todayIST = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })

  // An incoming (not-yet-arrived) booking for today shows as arriving.
  for (const br of roomAssignments) {
    const booking = br.bookings
    if (
      booking &&
      (booking.status === 'confirmed' || booking.status === 'pending') &&
      booking.check_in === todayIST
    ) {
      return 'arriving'
    }
  }

  return 'available'
}

/** Stable display label (uppercase) for each derived status. */
export const STATUS_LABEL: Record<DerivedRoomStatus, string> = {
  available: 'AVAILABLE',
  arriving: 'ARRIVING',
  occupied: 'OCCUPIED',
  cleaning: 'CLEANING',
  repair: 'REPAIR',
}

/**
 * Tailwind token set for each derived status.
 * Keys map to the CSS custom property tokens defined in globals.css and
 * tailwind.config.ts. Use with template literals or className helpers:
 *   `bg-room-${status}-bg text-room-${status}-text border-room-${status}-border`
 * or use the returned class string directly.
 */
export function statusClasses(status: DerivedRoomStatus): string {
  return `bg-room-${status}-bg text-room-${status}-text border-room-${status}-border`
}

// ─────────────────────────────────────────────────────────────────────────────
// Room booking context (guest + booking link) for occupied / arriving rooms.
// Shared by the dashboard mini-grid and the full /admin/rooms grid.
// ─────────────────────────────────────────────────────────────────────────────

/** PostgREST select that carries enough booking + guest context for the grids. */
export const ROOM_ASSIGNMENT_SELECT =
  '*, bookings!inner(id, booking_ref, status, check_in, deleted_at, guest:guests!bookings_guest_id_fkey(fullname))'

/** A booking_rooms row joined with booking + guest context (see ROOM_ASSIGNMENT_SELECT). */
export type AssignmentWithContext = Tables<'booking_rooms'> & {
  bookings: {
    id: string
    booking_ref: string
    status: string
    check_in: string
    deleted_at: string | null
    guest: { fullname: string } | { fullname: string }[] | null
  } | null
}

export interface RoomBookingContext {
  bookingId: string
  bookingRef: string
  guestName: string
}

function assignmentGuestName(b: AssignmentWithContext['bookings']): string {
  const g = b?.guest
  if (!g) return 'Guest'
  return (Array.isArray(g) ? g[0]?.fullname : g.fullname) ?? 'Guest'
}

/**
 * Map each room to the booking that explains its status. Prefers the checked-in
 * booking (occupied), otherwise an arriving-today booking — matching
 * deriveRoomStatus precedence so the displayed context always agrees with the
 * displayed status.
 */
export function buildRoomContextMap(
  assignments: AssignmentWithContext[],
  todayIST: string
): Map<string, RoomBookingContext> {
  const map = new Map<string, RoomBookingContext>()
  const set = (roomId: string, b: NonNullable<AssignmentWithContext['bookings']>) =>
    map.set(roomId, {
      bookingId: b.id,
      bookingRef: b.booking_ref,
      guestName: assignmentGuestName(b),
    })

  // First pass: checked-in wins.
  for (const a of assignments) {
    if (!a.room_id || !a.bookings) continue
    if (a.bookings.status === 'checked_in') set(a.room_id, a.bookings)
  }
  // Second pass: arriving-today fills rooms without a checked-in guest.
  for (const a of assignments) {
    if (!a.room_id || !a.bookings || map.has(a.room_id)) continue
    const b = a.bookings
    if (
      (b.status === 'confirmed' || b.status === 'pending') &&
      b.check_in === todayIST
    ) {
      set(a.room_id, b)
    }
  }
  return map
}
