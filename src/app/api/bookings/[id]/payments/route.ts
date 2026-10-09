import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { paymentSchema } from '@/schemas/payment'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/bookings/[id]/payments — record a payment. A DB trigger recalculates
// bookings.advance_paid and logs the activity. Recording a payment on a pending
// booking auto-confirms it (§14).
export async function POST(request: Request, { params }: Ctx) {
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

  const raw = await request.json()
  const parsed = paymentSchema.safeParse({ ...raw, booking_id: id })
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

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!booking) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Booking not found' } },
      { status: 404 }
    )
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      booking_id: id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      reference_note: parsed.data.reference_note || null,
      status: parsed.data.status,
      paid_at: parsed.data.status === 'success' ? new Date().toISOString() : null,
      recorded_by: profile.id,
    })
    .select('*')
    .single()
  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 }
    )
  }

  // Recording a successful payment confirms a pending booking. The resulting
  // status change (pending → confirmed) is recorded in the canonical activity_log
  // by the DB trigger log_booking_activity(). The `.eq('status','pending')` guard
  // keeps the confirm idempotent under concurrent writes.
  if (booking.status === 'pending' && parsed.data.status === 'success') {
    await supabase
      .from('bookings')
      .update({ status: 'confirmed', updated_by: profile.id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
  }

  // The payment trigger recalculates advance_paid (and we may have auto-confirmed),
  // both of which bump the booking's updated_at. Return the fresh values so the
  // client can refresh its optimistic-lock token without waiting for a refetch.
  const { data: bk } = await supabase
    .from('bookings')
    .select('status, updated_at')
    .eq('id', id)
    .maybeSingle()

  return Response.json({ data, booking: bk }, { status: 201 })
}
