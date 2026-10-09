import { getCurrentProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { reportIssueSchema } from '@/schemas/maintenance'
import type { UserRole } from '@/types/database'

const ALLOWED_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'receptionist',
  'housekeeping',
]

// POST /api/housekeeping/report-issue
// Inserts a maintenance_blocks row for the given room.
// Never exposes guest PII — only non-identifying room columns are read.
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

  const parsed = reportIssueSchema.safeParse(await request.json())
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

  const { room_id, reason, category, photo_url, from_date, to_date } =
    parsed.data

  // Verify room exists and is not deleted — non-PII columns only
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, room_number')
    .eq('id', room_id)
    .is('deleted_at', null)
    .single()

  if (roomError || !room) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Room not found' } },
      { status: 404 }
    )
  }

  // Build reason string: prepend category if present, then append photo URL
  let fullReason = category
    ? `[${category.toUpperCase()}] ${reason}`
    : reason

  if (photo_url) {
    const suffix = ` | Photo: ${photo_url}`
    // Truncate to 255 chars total (the DB column limit)
    if ((fullReason + suffix).length <= 255) {
      fullReason = fullReason + suffix
    } else {
      fullReason = (fullReason + suffix).slice(0, 255)
    }
  }

  const { data: block, error: insertError } = await supabase
    .from('maintenance_blocks')
    .insert({
      room_id,
      from_date,
      to_date,
      reason: fullReason,
      created_by: profile.id,
      is_active: true,
    })
    .select()
    .single()

  if (insertError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: insertError.message } },
      { status: 500 }
    )
  }

  const adminClient = createAdminClient()
  await recordActivity(adminClient, {
    action: 'maintenance_block.created',
    entity_type: 'maintenance_block',
    entity_id: block.id,
    actor: { id: profile.id, fullname: profile.fullname, role: profile.role },
    metadata: {
      room_number: room.room_number,
      reason: fullReason,
      ...(photo_url ? { photo_url } : {}),
    },
  })

  return Response.json({ data: block }, { status: 201 })
}
