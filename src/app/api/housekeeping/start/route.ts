import { getCurrentProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { uuidLike } from '@/schemas/shared'
import type { UserRole } from '@/types/database'

const ALLOWED_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'receptionist',
  'housekeeping',
]

const bodySchema = z.object({
  room_id: uuidLike,
})

// POST /api/housekeeping/start
// Acquires a cleaning lock for the given room.
// cleaning_locks has a PK on room_id — first INSERT wins; PK conflict → 409.
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
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.issues,
        },
      },
      { status: 422 }
    )
  }

  const { room_id } = parsed.data

  // Verify room exists, is not deleted, and is in cleaning status
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, room_number, status')
    .eq('id', room_id)
    .is('deleted_at', null)
    .single()

  if (roomError || !room) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Room not found' } },
      { status: 404 }
    )
  }

  if (room.status !== 'cleaning') {
    return Response.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'Room is not in cleaning status',
        },
      },
      { status: 409 }
    )
  }

  // INSERT into cleaning_locks — PK on room_id means first INSERT wins
  const { data: lock, error: lockError } = await supabase
    .from('cleaning_locks')
    .insert({ room_id, locked_by: profile.id })
    .select()
    .single()

  if (lockError) {
    // Postgres unique/PK violation — someone else already claimed this room
    if (lockError.code === '23505') {
      return Response.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Already being cleaned by someone else',
          },
        },
        { status: 409 }
      )
    }
    return Response.json(
      { error: { code: 'INTERNAL', message: lockError.message } },
      { status: 500 }
    )
  }

  const adminClient = createAdminClient()
  await recordActivity(adminClient, {
    action: 'cleaning.started',
    entity_type: 'cleaning',
    entity_id: room_id,
    actor: { id: profile.id, fullname: profile.fullname, role: profile.role },
    metadata: { room_number: room.room_number },
  })

  return Response.json({ data: lock }, { status: 201 })
}
