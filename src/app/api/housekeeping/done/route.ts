import { getCurrentProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { UserRole } from '@/types/database'

const ALLOWED_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'receptionist',
  'housekeeping',
]

const bodySchema = z.object({
  room_id: z.string().uuid(),
})

// POST /api/housekeeping/done
// Releases the caller's cleaning lock and marks the room as available.
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

  // Verify lock exists for this room
  const { data: lock, error: lockError } = await supabase
    .from('cleaning_locks')
    .select('room_id, locked_by, auto_release_at')
    .eq('room_id', room_id)
    .single()

  if (lockError || !lock) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'No active lock for this room' } },
      { status: 404 }
    )
  }

  if (lock.locked_by !== profile.id) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'You are not cleaning this room' } },
      { status: 403 }
    )
  }

  if (new Date(lock.auto_release_at) < new Date()) {
    return Response.json(
      {
        error: {
          code: 'GONE',
          message: 'Lock has expired — it was auto-released',
        },
      },
      { status: 410 }
    )
  }

  // Delete the cleaning lock
  const { error: deleteError } = await supabase
    .from('cleaning_locks')
    .delete()
    .eq('room_id', room_id)
    .eq('locked_by', profile.id)

  if (deleteError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: deleteError.message } },
      { status: 500 }
    )
  }

  // Mark room as available
  const { data: room, error: updateError } = await supabase
    .from('rooms')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', room_id)
    .is('deleted_at', null)
    .select('id, room_number')
    .single()

  if (updateError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: updateError.message } },
      { status: 500 }
    )
  }

  const adminClient = createAdminClient()
  await recordActivity(adminClient, {
    action: 'cleaning.completed',
    entity_type: 'cleaning',
    entity_id: room_id,
    actor: { id: profile.id, fullname: profile.fullname, role: profile.role },
    metadata: { room_number: room?.room_number },
  })

  return Response.json({ data: { room_id, status: 'available' } })
}
