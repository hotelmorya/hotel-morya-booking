import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { MANAGER_PLUS, getCurrentProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { galleryMediaCreateSchema } from '@/schemas/gallery-media'
import type { GalleryMedia } from '@/types/database'

// GET /api/gallery-media — gallery list (used by the admin manager).
// Returns all non-deleted items ordered by sort_order. We intentionally do NOT
// filter on is_active here: RLS does the right thing per caller — an authenticated
// manager+ sees every row (including hidden ones, so they can be un-hidden in the
// admin grid), while an anonymous caller only sees active rows via the public_read
// RLS policy. The public /gallery page runs its own active-only query separately.
// No pagination: gallery is bounded content (typically < 100 items).
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('gallery_media')
    .select('id, media_type, video_kind, public_id, url, external_url, alt_text, sort_order, is_active, updated_at, created_at')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: (error as { message: string }).message } },
      { status: 500 }
    )
  }

  return Response.json({ data: (data as GalleryMedia[]) ?? [] })
}

// POST /api/gallery-media — MANAGER_PLUS gate
export async function POST(request: Request) {
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

  const parsed = galleryMediaCreateSchema.safeParse(body)
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

  // 4. Build insert payload — remove undefined optional fields so DB defaults apply
  const insertData: Record<string, unknown> = { ...parsed.data }
  if (insertData.public_id === undefined) delete insertData.public_id
  if (insertData.url === undefined) delete insertData.url
  if (insertData.external_url === undefined) delete insertData.external_url

  const { data, error } = await supabase
    .from('gallery_media')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: (error as { message: string }).message } },
      { status: 500 }
    )
  }

  // 5. Activity log (non-blocking — never throws)
  await recordActivity(createAdminClient(), {
    action: 'gallery_media.created',
    entity_type: 'gallery_media',
    entity_id: (data as GalleryMedia)?.id,
    actor: profile,
    metadata: {
      media_type: (data as GalleryMedia)?.media_type,
    },
  })

  return Response.json({ data: data as GalleryMedia }, { status: 201 })
}
