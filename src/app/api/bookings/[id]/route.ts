import { after } from 'next/server'
import {
  ADMIN_PLUS,
  MANAGER_PLUS,
  OPERATIONAL,
  getCurrentProfile,
} from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { sendCancellationEmail } from '@/lib/email/cancellation'
import { setVehicleSchema } from '@/schemas/booking'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/bookings/[id] — full detail (guest, room lines, payments).
export async function GET(_request: Request, { params }: Ctx) {
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

  const { data, error } = await supabase
    .from('bookings')
    .select(
      '*, guests(*), booking_rooms(*, room_types(id, name), rooms(id, room_number)), payments(*)'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 }
    )
  }
  if (!data) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Booking not found' } },
      { status: 404 }
    )
  }
  // Hide soft-deleted payments from the ledger.
  if (Array.isArray(data.payments)) {
    data.payments = data.payments.filter(
      (p: { deleted_at: string | null }) => !p.deleted_at
    )
  }
  return Response.json({ data })
}

type PatchBody = {
  action: 'confirm' | 'cancel' | 'not_arrived' | 'discount' | 'set_vehicle'
  updated_at: string
  cancellation_reason?: string
  discount_amount?: number
  discount_reason?: string
  vehicle_type?: string
  vehicle_number?: string
}

// PATCH /api/bookings/[id] — status transitions + discount. Status rules are
// enforced by a DB trigger; we attempt the change and surface its error.
export async function PATCH(request: Request, { params }: Ctx) {
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
  if (!profile) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  const body = (await request.json()) as PatchBody
  if (!body.updated_at) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'updated_at is required' } },
      { status: 400 }
    )
  }

  // Per-action role gate (§9): discount + manual confirm = manager+, others operational.
  const needsManager = body.action === 'discount' || body.action === 'confirm'
  const allowed = needsManager ? MANAGER_PLUS : OPERATIONAL
  if (!allowed.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  const patch: Record<string, unknown> = {
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }
  if (body.action === 'confirm') patch.status = 'confirmed'
  else if (body.action === 'cancel') patch.status = 'cancelled'
  else if (body.action === 'not_arrived') patch.status = 'not_arrived'
  else if (body.action === 'discount') {
    const amount = Number(body.discount_amount ?? 0)
    if (amount > 0 && !body.discount_reason?.trim()) {
      return Response.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A reason is required when applying a discount',
          },
        },
        { status: 400 }
      )
    }
    patch.discount_amount = amount
    patch.discount_reason = body.discount_reason?.trim() || null
    patch.discount_by = amount > 0 ? profile.id : null
  } else if (body.action === 'set_vehicle') {
    const parsed = setVehicleSchema.safeParse({
      vehicle_type: body.vehicle_type,
      vehicle_number: body.vehicle_number,
    })
    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message ?? 'Invalid vehicle details',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      )
    }
    patch.vehicle_type = parsed.data.vehicle_type
    patch.vehicle_number =
      parsed.data.vehicle_type === 'none'
        ? null
        : parsed.data.vehicle_number?.trim() || null
  } else {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Unknown action' } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', id)
    .eq('updated_at', body.updated_at)
    .is('deleted_at', null)
    .select('id, status, updated_at')

  if (error) {
    // DB transition guard raises an exception for invalid status changes.
    const invalidTransition = /invalid booking status transition/i.test(
      error.message
    )
    return Response.json(
      {
        error: {
          code: invalidTransition ? 'INVALID_TRANSITION' : 'INTERNAL',
          message: invalidTransition
            ? 'That status change is not allowed from the current state.'
            : error.message,
        },
      },
      { status: invalidTransition ? 422 : 500 }
    )
  }
  if (!data || data.length === 0) {
    return Response.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'Booking was modified by another user. Please refresh.',
        },
      },
      { status: 409 }
    )
  }

  // Discount + cancel aren't covered by the status-change trigger's metadata —
  // record the reason for the audit trail.
  if (body.action === 'discount') {
    await recordActivity(createAdminClient(), {
      action: 'booking.discount_applied',
      entity_type: 'booking',
      entity_id: id,
      actor: profile,
      metadata: { amount: patch.discount_amount, reason: patch.discount_reason },
    })
  } else if (body.action === 'cancel' && body.cancellation_reason) {
    await recordActivity(createAdminClient(), {
      action: 'booking.cancelled',
      entity_type: 'booking',
      entity_id: id,
      actor: profile,
      metadata: { reason: body.cancellation_reason },
    })
  } else if (body.action === 'set_vehicle') {
    await recordActivity(createAdminClient(), {
      action: 'booking.vehicle_updated',
      entity_type: 'booking',
      entity_id: id,
      actor: profile,
      metadata: {
        vehicle_type: patch.vehicle_type,
        vehicle_number: patch.vehicle_number,
      },
    })
  }

  // Notify guest when their booking reaches a terminal negative state. Non-blocking
  // and non-throwing — a failed send must never prevent the status change from succeeding.
  if (body.action === 'cancel' || body.action === 'not_arrived') {
    // `after()` so Vercel keeps the function alive to finish the send — a bare
    // fire-and-forget promise is killed when the response returns.
    after(() =>
      sendCancellationEmail(
        id,
        body.action === 'cancel' ? 'cancelled' : 'not_arrived'
      )
    )
  }

  return Response.json({ data: data[0] })
}

// DELETE /api/bookings/[id] — soft delete (admin only). Uses the admin client:
// an RLS-scoped soft-delete makes the row invisible mid-update and appears to fail.
export async function DELETE(request: Request, { params }: Ctx) {
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
  if (!profile || !ADMIN_PLUS.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as { updated_at?: string }
  const admin = createAdminClient()
  let q = admin
    .from('bookings')
    .update({ deleted_at: new Date().toISOString(), deleted_by: profile.id })
    .eq('id', id)
    .is('deleted_at', null)
  if (body.updated_at) q = q.eq('updated_at', body.updated_at)

  const { data, error } = await q.select('id')
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
          message: 'Booking was modified or already removed. Please refresh.',
        },
      },
      { status: 409 }
    )
  }
  return Response.json({ data: { id } })
}
