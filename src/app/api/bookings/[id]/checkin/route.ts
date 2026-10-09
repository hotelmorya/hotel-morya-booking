import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { checkInSchema } from '@/schemas/booking'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

// Accept a staff-supplied timestamp, falling back to now for blank/invalid input.
function parseActualTime(input?: string): string {
  if (!input) return new Date().toISOString()
  const t = new Date(input)
  return Number.isNaN(t.getTime()) ? new Date().toISOString() : t.toISOString()
}

// POST /api/bookings/[id]/checkin — assign a physical room to each room line,
// set actual_check_in, move booking → checked_in and the rooms → occupied.
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
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

  // Three-layer Zod (CLAUDE.md §16): same schema as the RHF resolver in the dialog.
  const parsed = checkInSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message:
            parsed.error.issues[0]?.message ??
            'Room assignments, updated_at and vehicle are required',
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    )
  }
  const body = parsed.data

  // Reject the same physical room assigned to more than one line in this request.
  const roomIds = body.assignments.map((a) => a.room_id)
  if (new Set(roomIds).size !== roomIds.length) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Each room can be assigned to only one guest line.' } },
      { status: 400 }
    )
  }

  // Day-use ("few hours") bookings must be paid in full at check-in — payment is
  // collected up front since the guest leaves the same day. Block check-in while
  // a balance remains; staff add the payment first, then check in.
  const { data: bk } = await supabase
    .from('bookings')
    .select('guest_id, stay_type, balance_due')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (bk?.stay_type === 'day_use' && (bk.balance_due ?? 0) > 0) {
    return Response.json(
      {
        error: {
          code: 'PAYMENT_REQUIRED',
          message:
            'Collect the day-use payment before check-in. Add the payment, then check in.',
        },
      },
      { status: 422 }
    )
  }

  // ID-proof gate (CLAUDE.md / CONTEXT): a guest cannot occupy a room without a
  // verified ID on file. Re-fetch and reject server-side — the dialog gate is a
  // UX convenience only; this is the authoritative check.
  if (bk?.guest_id) {
    const { data: guest } = await supabase
      .from('guests')
      .select('id_type, id_number, id_proof_url')
      .eq('id', bk.guest_id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!guest?.id_type || !guest?.id_number || !guest?.id_proof_url) {
      return Response.json(
        {
          error: {
            code: 'ID_PROOF_REQUIRED',
            message:
              'Guest ID proof is required before check-in. Add the ID type, number, and upload the document, then check in.',
          },
        },
        { status: 422 }
      )
    }
  }

  // Validate assignments BEFORE flipping the booking so a bad room never leaves
  // the booking checked-in with rooms in an inconsistent state.
  const { data: lines } = await supabase
    .from('booking_rooms')
    .select('id, room_type_id')
    .eq('booking_id', id)
  const lineById = new Map((lines ?? []).map((l: { id: string; room_type_id: string }) => [l.id, l]))

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_type_id, status')
    .in('id', roomIds)
    .is('deleted_at', null)
  const roomById = new Map(
    (rooms ?? []).map((r: { id: string; room_type_id: string; status: string }) => [r.id, r])
  )

  for (const a of body.assignments) {
    const line = lineById.get(a.booking_room_id)
    if (!line) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'A room line does not belong to this booking.' } },
        { status: 400 }
      )
    }
    const room = roomById.get(a.room_id)
    if (!room) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Selected room not found.' } },
        { status: 400 }
      )
    }
    if (room.room_type_id !== line.room_type_id) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Selected room is not of the booked room type.' } },
        { status: 400 }
      )
    }
    if (room.status !== 'available') {
      return Response.json(
        {
          error: {
            code: 'ROOM_UNAVAILABLE',
            message: `Room is no longer available (${room.status}). Please pick another.`,
          },
        },
        { status: 409 }
      )
    }
  }

  // Move the booking (optimistic lock + DB transition guard: confirmed → checked_in).
  const { data: updated, error: bErr } = await supabase
    .from('bookings')
    .update({
      status: 'checked_in',
      actual_check_in: parseActualTime(body.actual_check_in),
      vehicle_type: body.vehicle_type,
      vehicle_number:
        body.vehicle_type === 'none' ? null : (body.vehicle_number?.trim() || null),
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('updated_at', body.updated_at)
    .is('deleted_at', null)
    .select('id, updated_at')

  if (bErr) {
    const invalid = /invalid booking status transition/i.test(bErr.message)
    return Response.json(
      {
        error: {
          code: invalid ? 'INVALID_TRANSITION' : 'INTERNAL',
          message: invalid
            ? 'Only a confirmed booking can be checked in.'
            : bErr.message,
        },
      },
      { status: invalid ? 422 : 500 }
    )
  }
  if (!updated || updated.length === 0) {
    return Response.json(
      { error: { code: 'CONFLICT', message: 'Booking was modified by another user. Please refresh.' } },
      { status: 409 }
    )
  }

  // Assign rooms to lines + mark each room occupied. Surface the first failure
  // instead of silently leaving a room unmarked.
  for (const a of body.assignments) {
    const { error: lineErr } = await supabase
      .from('booking_rooms')
      .update({ room_id: a.room_id })
      .eq('id', a.booking_room_id)
      .eq('booking_id', id)
    if (lineErr) {
      return Response.json(
        { error: { code: 'INTERNAL', message: lineErr.message } },
        { status: 500 }
      )
    }
    // Guard the room status flip on its current state so a room grabbed by a
    // concurrent check-in can't be double-occupied.
    const { data: roomUpd, error: roomErr } = await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', a.room_id)
      .eq('status', 'available')
      .select('id')
    if (roomErr) {
      return Response.json(
        { error: { code: 'INTERNAL', message: roomErr.message } },
        { status: 500 }
      )
    }
    if (!roomUpd || roomUpd.length === 0) {
      return Response.json(
        {
          error: {
            code: 'ROOM_UNAVAILABLE',
            message: 'Room was taken by another check-in. Please refresh and pick another.',
          },
        },
        { status: 409 }
      )
    }
  }

  // Refresh the guest's "last vehicle" pre-fill for next time (convenience only).
  // Non-critical: a failure here must never roll back a completed check-in.
  if (bk?.guest_id) {
    await supabase
      .from('guests')
      .update({
        last_vehicle_type: body.vehicle_type,
        last_vehicle_number:
          body.vehicle_type === 'none' ? null : (body.vehicle_number?.trim() || null),
      })
      .eq('id', bk.guest_id)
      .is('deleted_at', null)
  }

  // The booking status change (→ checked_in) and each room's status change
  // (→ occupied) are recorded in the canonical activity_log by the DB triggers
  // log_booking_activity() / log_room_activity(). No extra audit entry here.

  return Response.json({
    data: { id, status: 'checked_in', updated_at: updated[0].updated_at },
  })
}
