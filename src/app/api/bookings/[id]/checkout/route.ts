import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/bookings/[id]/checkout — set actual_check_out, move booking →
// checked_out (DB trigger recalcs guest stats) and assigned rooms → cleaning.
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

  const body = (await request.json()) as {
    updated_at: string
    actual_check_out?: string
  }
  if (!body.updated_at) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'updated_at is required' } },
      { status: 400 }
    )
  }
  // Staff may adjust the actual check-out moment; default to now.
  const actualCheckOut = (() => {
    if (!body.actual_check_out) return new Date().toISOString()
    const t = new Date(body.actual_check_out)
    return Number.isNaN(t.getTime()) ? new Date().toISOString() : t.toISOString()
  })()

  // Capture assigned rooms before the status flips.
  const { data: lines } = await supabase
    .from('booking_rooms')
    .select('room_id')
    .eq('booking_id', id)

  const { data: updated, error: bErr } = await supabase
    .from('bookings')
    .update({
      status: 'checked_out',
      actual_check_out: actualCheckOut,
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
            ? 'Only a checked-in booking can be checked out.'
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

  const roomIds = (lines ?? [])
    .map((l: { room_id: string | null }) => l.room_id)
    .filter((r): r is string => !!r)
  if (roomIds.length > 0) {
    await supabase.from('rooms').update({ status: 'cleaning' }).in('id', roomIds)
  }

  // The booking status change (→ checked_out) and each room's status change
  // (→ cleaning) are recorded in the canonical activity_log by the DB triggers
  // log_booking_activity() / log_room_activity(). No extra audit entry here.

  return Response.json({
    data: { id, status: 'checked_out', updated_at: updated[0].updated_at },
  })
}
