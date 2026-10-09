import { MANAGER_PLUS, getCurrentProfile, type StaffProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string; paymentId: string }> }

// Payments are immutable facts (§17): amounts are never edited. The only
// corrections are voiding a mistaken entry (soft delete) or recording a refund
// (status success → refunded). A DB trigger recalculates bookings.advance_paid
// on both, which (after migration 006) excludes soft-deleted rows.

async function authorize(): Promise<
  { profile: StaffProfile } | { error: 'UNAUTHORIZED' | 'FORBIDDEN' }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'UNAUTHORIZED' as const }
  const profile = await getCurrentProfile()
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    return { error: 'FORBIDDEN' as const }
  }
  return { profile }
}

function deny(kind: 'UNAUTHORIZED' | 'FORBIDDEN') {
  return Response.json(
    {
      error: {
        code: kind,
        message: kind === 'UNAUTHORIZED' ? 'Not authenticated' : 'Insufficient permissions',
      },
    },
    { status: kind === 'UNAUTHORIZED' ? 401 : 403 }
  )
}

// Fetch the fresh booking money state so the client can refresh its
// optimistic-lock token and totals without a separate round-trip.
async function freshBooking(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase
    .from('bookings')
    .select('id, advance_paid, balance_due, updated_at')
    .eq('id', id)
    .maybeSingle()
  return data
}

// DELETE — void a mistaken payment (soft delete). The recalc trigger drops it
// from advance_paid; balance_due rises accordingly.
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id, paymentId } = await params
  const auth = await authorize()
  if ('error' in auth) return deny(auth.error)

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: payment } = await supabase
    .from('payments')
    .select('id, booking_id, amount, method, status, deleted_at')
    .eq('id', paymentId)
    .eq('booking_id', id)
    .maybeSingle()
  if (!payment || payment.deleted_at) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Payment not found' } },
      { status: 404 }
    )
  }

  // Soft delete via the admin client — an RLS update would make the row invisible
  // immediately and report 0 rows affected (CLAUDE.md §4 gotcha).
  const { error } = await admin
    .from('payments')
    .update({ deleted_at: new Date().toISOString(), deleted_by: auth.profile.id })
    .eq('id', paymentId)
    .is('deleted_at', null)
  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 }
    )
  }

  await recordActivity(admin, {
    action: 'payment.voided',
    entity_type: 'payment',
    entity_id: paymentId,
    actor: auth.profile,
    metadata: { booking_id: id, amount: payment.amount, method: payment.method },
  })

  return Response.json({ data: { id: paymentId }, booking: await freshBooking(supabase, id) })
}

// PATCH — record a refund (success → refunded). advance_paid only counts
// 'success' rows, so the balance rises by the refunded amount.
export async function PATCH(request: Request, { params }: Ctx) {
  const { id, paymentId } = await params
  const auth = await authorize()
  if ('error' in auth) return deny(auth.error)

  const body = (await request.json().catch(() => ({}))) as { reference_note?: string }
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: payment } = await supabase
    .from('payments')
    .select('id, booking_id, amount, method, status, reference_note, deleted_at')
    .eq('id', paymentId)
    .eq('booking_id', id)
    .maybeSingle()
  if (!payment || payment.deleted_at) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Payment not found' } },
      { status: 404 }
    )
  }
  if (payment.status !== 'success') {
    return Response.json(
      { error: { code: 'INVALID_TRANSITION', message: 'Only a successful payment can be refunded.' } },
      { status: 422 }
    )
  }

  const note = (body.reference_note ?? '').trim().slice(0, 255)
  const { error } = await admin
    .from('payments')
    .update({
      status: 'refunded',
      reference_note: note || payment.reference_note,
    })
    .eq('id', paymentId)
    .eq('status', 'success')
  if (error) {
    const invalid = /invalid payment status transition/i.test(error.message)
    return Response.json(
      {
        error: {
          code: invalid ? 'INVALID_TRANSITION' : 'INTERNAL',
          message: invalid ? 'This payment can no longer be refunded.' : error.message,
        },
      },
      { status: invalid ? 422 : 500 }
    )
  }

  await recordActivity(admin, {
    action: 'payment.refunded',
    entity_type: 'payment',
    entity_id: paymentId,
    actor: auth.profile,
    metadata: { booking_id: id, amount: payment.amount, method: payment.method, reference_note: note || null },
  })

  return Response.json({ data: { id: paymentId, status: 'refunded' }, booking: await freshBooking(supabase, id) })
}
