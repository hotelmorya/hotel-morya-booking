import { MANAGER_PLUS, getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 100

// GET /api/payments?page=<n>&pageSize=<n>
// Returns paginated payments with booking_ref and guest name decorated for Excel export.
// Role: manager+ only (payments contain financial data).
export async function GET(request: Request) {
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
      { error: { code: 'FORBIDDEN', message: 'Payments export is restricted to manager and above' } },
      { status: 403 }
    )
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get('pageSize') ?? String(PAGE_SIZE)))
  )
  const offset = (page - 1) * pageSize

  const admin = createAdminClient()

  // Join bookings (for booking_ref) and guests (for guest name) via bookings.guest_id.
  // Soft-delete filter applied to both payments and bookings.
  const { data, count, error } = await admin
    .from('payments')
    .select(
      'id, booking_id, amount, method, status, reference_note, paid_at, created_at, bookings!inner(booking_ref, guests!inner(fullname))',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .is('bookings.deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 }
    )
  }

  // Flatten nested join for the PaymentExportRow shape ExportButtons expects.
  // Supabase returns the bookings FK join as an object (not array) when using !inner.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []).map((p: any) => {
    const booking = p.bookings as { booking_ref: string; guests: { fullname: string } } | null
    const guestName = Array.isArray(booking?.guests)
      ? (booking?.guests[0]?.fullname ?? null)
      : (booking?.guests?.fullname ?? null)
    return {
      id: p.id,
      booking_id: p.booking_id,
      booking_ref: booking?.booking_ref ?? null,
      guest_name: guestName,
      amount: p.amount,
      method: p.method,
      status: p.status,
      reference_note: p.reference_note,
      paid_at: p.paid_at,
      created_at: p.created_at,
    }
  })

  return Response.json({
    data: rows,
    meta: { total: count ?? 0, page, pageSize },
  })
}
