import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string; bookingRoomId: string }> }

// POST /api/bookings/[id]/rooms/[bookingRoomId]/reassign — move an in-house guest
// to a different free room of the SAME type (e.g. a tech fault in their room).
// Body: { updated_at, new_room_id, old_room_disposition: 'cleaning' | 'maintenance' }.
// Rate is snapshotted on booking_rooms, so the charge is unchanged.
export async function POST(request: Request, { params }: Ctx) {
  const { id, bookingRoomId } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
  }
  const profile = await getCurrentProfile()
  if (!profile || !OPERATIONAL.includes(profile.role)) {
    return Response.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    updated_at?: string
    new_room_id?: string
    old_room_disposition?: 'cleaning' | 'maintenance'
  }
  const disposition = body.old_room_disposition === 'maintenance' ? 'maintenance' : 'cleaning'
  if (!body.updated_at || !body.new_room_id) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'updated_at and new_room_id are required' } },
      { status: 400 }
    )
  }

  // Booking must be in-house.
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, updated_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!booking) {
    return Response.json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
  }
  if (booking.status !== 'checked_in') {
    return Response.json(
      { error: { code: 'INVALID_STATE', message: 'Only a checked-in booking can have its room changed.' } },
      { status: 422 }
    )
  }

  // The room line being moved (must belong to this booking and have a room).
  const { data: line } = await supabase
    .from('booking_rooms')
    .select('id, booking_id, room_type_id, room_id')
    .eq('id', bookingRoomId)
    .eq('booking_id', id)
    .maybeSingle()
  if (!line || !line.room_id) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Room line not found or not yet assigned.' } },
      { status: 404 }
    )
  }
  const oldRoomId = line.room_id as string
  if (oldRoomId === body.new_room_id) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Pick a different room.' } },
      { status: 400 }
    )
  }

  // New room must exist, be of the same type, and be available.
  const { data: newRoom } = await supabase
    .from('rooms')
    .select('id, room_type_id, status, room_number')
    .eq('id', body.new_room_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!newRoom) {
    return Response.json({ error: { code: 'NOT_FOUND', message: 'Selected room not found.' } }, { status: 404 })
  }
  if (newRoom.room_type_id !== line.room_type_id) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'New room must be the same room type.' } },
      { status: 400 }
    )
  }
  if (newRoom.status !== 'available') {
    return Response.json(
      { error: { code: 'ROOM_UNAVAILABLE', message: `That room is ${newRoom.status}. Pick an available one.` } },
      { status: 409 }
    )
  }

  // Claim the optimistic lock (and re-assert checked_in) before mutating rooms.
  const { data: locked } = await supabase
    .from('bookings')
    .update({ updated_at: new Date().toISOString(), updated_by: profile.id })
    .eq('id', id)
    .eq('updated_at', body.updated_at)
    .eq('status', 'checked_in')
    .is('deleted_at', null)
    .select('updated_at')
  if (!locked || locked.length === 0) {
    return Response.json(
      { error: { code: 'CONFLICT', message: 'Booking was modified by another user. Please refresh.' } },
      { status: 409 }
    )
  }

  // Move the assignment first, so the OLD room no longer has a checked-in guest
  // (the occupancy guard would otherwise block freeing it).
  const { error: moveErr } = await supabase
    .from('booking_rooms')
    .update({ room_id: body.new_room_id })
    .eq('id', bookingRoomId)
    .eq('room_id', oldRoomId)
  if (moveErr) {
    return Response.json({ error: { code: 'INTERNAL', message: moveErr.message } }, { status: 500 })
  }

  // Occupy the new room (race-safe). If it was just taken, revert the move.
  const { data: occ, error: occErr } = await supabase
    .from('rooms')
    .update({ status: 'occupied' })
    .eq('id', body.new_room_id)
    .eq('status', 'available')
    .select('id')
  if (occErr || !occ || occ.length === 0) {
    await supabase.from('booking_rooms').update({ room_id: oldRoomId }).eq('id', bookingRoomId)
    return Response.json(
      { error: { code: 'ROOM_UNAVAILABLE', message: 'That room was just taken. Please refresh and pick another.' } },
      { status: 409 }
    )
  }

  // Free the old room (now permitted — no checked-in guest on it).
  await supabase.from('rooms').update({ status: disposition }).eq('id', oldRoomId)

  await recordActivity(createAdminClient(), {
    action: 'room.reassigned',
    entity_type: 'booking',
    entity_id: id,
    actor: profile,
    metadata: {
      booking_room_id: bookingRoomId,
      from_room_id: oldRoomId,
      to_room_id: body.new_room_id,
      to_room_number: newRoom.room_number,
      old_room_disposition: disposition,
    },
  })

  return Response.json({ data: { id, updated_at: locked[0].updated_at } })
}
