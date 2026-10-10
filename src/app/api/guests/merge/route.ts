import { z } from 'zod'
import { MANAGER_PLUS, getCurrentProfile } from '@/lib/auth'
import { uuidLike } from '@/schemas/shared'
import { recordActivity } from '@/lib/activity-log/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const mergeSchema = z
  .object({
    keep_id: uuidLike,
    merge_id: uuidLike,
  })
  .refine((d) => d.keep_id !== d.merge_id, {
    message: 'Cannot merge a guest with themselves',
  })

// ── POST /api/guests/merge ────────────────────────────────────────────────────
// Merge two guests: reassign all bookings from merge_id → keep_id, then
// soft-delete merge_id. Requires MANAGER_PLUS.
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
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const parsed = mergeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    )
  }

  const { keep_id, merge_id } = parsed.data

  // Verify both guests exist and are not deleted.
  const { data: guests, error: guestFetchError } = await supabase
    .from('guests')
    .select('id, fullname')
    .in('id', [keep_id, merge_id])
    .is('deleted_at', null)

  if (guestFetchError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: guestFetchError.message } },
      { status: 500 }
    )
  }

  const foundIds = (guests ?? []).map((g: { id: string }) => g.id)
  if (!foundIds.includes(keep_id)) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'keep_id guest not found' } },
      { status: 404 }
    )
  }
  if (!foundIds.includes(merge_id)) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'merge_id guest not found' } },
      { status: 404 }
    )
  }

  const adminClient = createAdminClient()

  // Step 1: Reassign all bookings from merge_id to keep_id.
  const { data: reassigned, error: reassignError } = await adminClient
    .from('bookings')
    .update({ guest_id: keep_id })
    .eq('guest_id', merge_id)
    .is('deleted_at', null)
    .select('id')

  if (reassignError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: reassignError.message } },
      { status: 500 }
    )
  }

  const mergedCount = reassigned?.length ?? 0

  // Step 2: Soft-delete the merged guest.
  const now = new Date().toISOString()
  const { error: deleteError } = await adminClient
    .from('guests')
    .update({ deleted_at: now, deleted_by: profile.id })
    .eq('id', merge_id)
    .is('deleted_at', null)

  if (deleteError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: deleteError.message } },
      { status: 500 }
    )
  }

  await recordActivity(adminClient, {
    action: 'guest.merged',
    entity_type: 'guest',
    entity_id: keep_id,
    actor: profile,
    metadata: { merged_guest_id: merge_id },
  })

  return Response.json({ data: { keep_id, merged_count: mergedCount } })
}
