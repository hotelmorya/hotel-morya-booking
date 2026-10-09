import { MANAGER_PLUS, OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { guestSchema } from '@/schemas/guest'

type RouteContext = { params: Promise<{ id: string }> }

// ── GET /api/guests/[id] ──────────────────────────────────────────────────────
// Fetch a single guest with their booking history.
export async function GET(_request: Request, ctx: RouteContext) {
  const { id } = await ctx.params
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

  const { data, error } = await supabase
    .from('guests')
    .select(
      '*, bookings(id, booking_ref, check_in, check_out, status, total_amount, deleted_at)'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'Guest not found' } },
        { status: 404 }
      )
    }
    return Response.json(
      { error: { code: 'INTERNAL', message: error?.message ?? 'Unknown error' } },
      { status: 500 }
    )
  }

  // Filter out soft-deleted bookings from the embedded array.
  const guest = {
    ...data,
    bookings: (data.bookings ?? []).filter(
      (b: { deleted_at: string | null }) => b.deleted_at === null
    ),
  }

  return Response.json({ data: guest })
}

// ── PATCH /api/guests/[id] ────────────────────────────────────────────────────
// Update guest fields. Requires updated_at for optimistic locking → 409 on stale.
export async function PATCH(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const bodyObj = body as Record<string, unknown>
  const updatedAt = bodyObj.updated_at as string | undefined
  if (!updatedAt) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'updated_at is required for optimistic locking',
        },
      },
      { status: 400 }
    )
  }

  const parsed = guestSchema.safeParse(body)
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

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('guests')
    .update({ ...parsed.data, updated_at: now })
    .eq('id', id)
    .eq('updated_at', updatedAt)
    .is('deleted_at', null)
    .select()

  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 }
    )
  }

  if (!data || data.length === 0) {
    return Response.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'Guest was modified by another user. Please refresh.',
        },
      },
      { status: 409 }
    )
  }

  const adminClient = createAdminClient()
  await recordActivity(adminClient, {
    action: 'guest.updated',
    entity_type: 'guest',
    entity_id: id,
    actor: profile,
    metadata: { fullname: parsed.data.fullname },
  })

  return Response.json({ data: data[0] })
}

// ── DELETE /api/guests/[id] ───────────────────────────────────────────────────
// Soft-delete a guest. Disallowed if the guest has active bookings.
// Requires MANAGER_PLUS (destructive action).
export async function DELETE(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params
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

  let body: { updated_at?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional for DELETE
  }

  // Guard: reject if the guest has any non-deleted bookings.
  const { count, error: countError } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('guest_id', id)
    .is('deleted_at', null)

  if (countError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: countError.message } },
      { status: 500 }
    )
  }

  if (count && count > 0) {
    return Response.json(
      {
        error: {
          code: 'HAS_BOOKINGS',
          message:
            'Cannot delete a guest who has bookings. Remove or reassign their bookings first.',
        },
      },
      { status: 409 }
    )
  }

  const now = new Date().toISOString()
  const adminClient = createAdminClient()

  let deleteQuery = adminClient
    .from('guests')
    .update({ deleted_at: now, deleted_by: profile.id })
    .eq('id', id)
    .is('deleted_at', null)

  if (body.updated_at) {
    deleteQuery = deleteQuery.eq('updated_at', body.updated_at)
  }

  const { error: deleteError } = await deleteQuery

  if (deleteError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: deleteError.message } },
      { status: 500 }
    )
  }

  await recordActivity(adminClient, {
    action: 'guest.deleted',
    entity_type: 'guest',
    entity_id: id,
    actor: profile,
  })

  return Response.json({ data: { id } })
}
