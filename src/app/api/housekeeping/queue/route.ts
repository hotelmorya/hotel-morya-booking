import { getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { currentDateIST } from '@/lib/format'
import type { UserRole } from '@/types/database'

const ALLOWED_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'receptionist',
  'housekeeping',
]

// GET /api/housekeeping/queue
// Returns rooms needing cleaning and the caller's active cleaning locks.
// Never exposes guest PII — only non-identifying room columns are selected.
export async function GET() {
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

  // Query 1: rooms currently in cleaning status, oldest wait first (most urgent)
  const { data: queue, error: queueError } = await supabase
    .from('rooms')
    .select('id, room_number, floor, status, updated_at')
    .eq('status', 'cleaning')
    .is('deleted_at', null)
    .order('updated_at', { ascending: true })

  if (queueError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: queueError.message } },
      { status: 500 }
    )
  }

  // Query 2: caller's active locks (not yet expired)
  const { data: myLocks, error: locksError } = await supabase
    .from('cleaning_locks')
    .select(
      'room_id, locked_at, auto_release_at, rooms!cleaning_locks_room_id_fkey(id, room_number, floor, status)'
    )
    .eq('locked_by', profile.id)
    .gt('auto_release_at', new Date().toISOString())

  if (locksError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: locksError.message } },
      { status: 500 }
    )
  }

  // Query 3: rooms this staff member has cleaned today (from activity_log)
  // Uses admin client — activity_log is not readable via RLS client.
  // Non-fatal: a failed read here must not block the queue response.
  const todayStart = `${currentDateIST()}T00:00:00+05:30`
  const adminForLog = createAdminClient()
  const { data: completedToday, error: completedError } = await adminForLog
    .from('activity_log')
    .select('entity_id, metadata, created_at')
    .eq('action', 'cleaning.completed')
    .eq('user_id', profile.id)
    .gte('created_at', todayStart)
    .order('created_at', { ascending: false })

  if (completedError) {
    console.error('[hk/queue] completed_today query failed:', completedError.message)
  }

  return Response.json({
    data: {
      queue: queue ?? [],
      my_locks: myLocks ?? [],
      completed_today: completedToday ?? [],
    },
  })
}
