import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { MANAGER_PLUS, getCurrentProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import {
  galleryMediaReorderSchema,
  galleryMediaVisibilitySchema,
} from '@/schemas/gallery-media'
import type { GalleryMedia } from '@/types/database'
import { z } from 'zod'

// Unified PATCH schema: accepts reorder OR visibility toggle
const patchSchema = z.union([galleryMediaReorderSchema, galleryMediaVisibilitySchema])

// PATCH /api/gallery-media/[id] — reorder or toggle visibility; MANAGER_PLUS gate
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 1. Auth
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

  // 2. Role
  const profile = await getCurrentProfile()
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  // 3. Zod validation
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const parsed = patchSchema.safeParse(body)
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

  // 4. Build update payload — exclude updated_at from the data being written
  const { updated_at, ...updateFields } = parsed.data as Record<string, unknown>

  const { data, count, error } = await supabase
    .from('gallery_media')
    .update({ ...updateFields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('updated_at', updated_at)        // optimistic lock
    .is('deleted_at', null)
    .select()

  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: (error as { message: string }).message } },
      { status: 500 }
    )
  }

  // 0 rows affected = optimistic lock conflict (another user modified the row)
  if (!count && (!data || (Array.isArray(data) && data.length === 0))) {
    return Response.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'Record was modified by another user. Please refresh.',
        },
      },
      { status: 409 }
    )
  }

  // 5. Activity log (non-blocking)
  await recordActivity(createAdminClient(), {
    action: 'gallery_media.updated',
    entity_type: 'gallery_media',
    entity_id: id,
    actor: profile,
    metadata: updateFields as Record<string, unknown>,
  })

  const updatedRow = Array.isArray(data) ? data[0] : data
  return Response.json({ data: updatedRow as GalleryMedia })
}

// DELETE /api/gallery-media/[id] — soft-delete via admin client; MANAGER_PLUS gate
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 1. Auth
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

  // 2. Role
  const profile = await getCurrentProfile()
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  // 3. Parse body — we need updated_at for the optimistic lock
  let body: unknown
  try {
    body = await request.json()
  } catch {
    // Allow DELETE without body — no optimistic lock in that case
    body = {}
  }

  // 4. Soft-delete MUST use createAdminClient()
  // (RLS client silently fails: row becomes invisible after deleted_at is set)
  const adminClient = createAdminClient()

  const updateQuery = adminClient
    .from('gallery_media')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: profile.id,
    })
    .eq('id', id)
    .is('deleted_at', null)

  // Apply optimistic lock if updated_at was supplied
  const bodyObj = body as Record<string, unknown>
  const lockedQuery = bodyObj?.updated_at
    ? updateQuery.eq('updated_at', bodyObj.updated_at)
    : updateQuery

  const { error } = await lockedQuery

  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: (error as { message: string }).message } },
      { status: 500 }
    )
  }

  // 5. Activity log (non-blocking)
  await recordActivity(adminClient, {
    action: 'gallery_media.deleted',
    entity_type: 'gallery_media',
    entity_id: id,
    actor: profile,
    metadata: {},
  })

  return Response.json({ data: { id } })
}
