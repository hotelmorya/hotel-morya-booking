import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { params: Promise<{ ref: string }> }

// GET /api/public/bookings/[ref]?phone=NNNNNNNNNN — public booking status lookup
// for the /track page. `bookings` has no public-read RLS, so this runs on the
// admin client; authorization is the booking_ref + matching guest phone (a
// random visitor can't read a stranger's booking without both). Returns only
// non-sensitive status fields. 404 on any miss — never reveal which half failed.
export async function GET(_request: Request, { params }: Ctx) {
  const { ref } = await params
  const url = new URL(_request.url)
  const phone = (url.searchParams.get('phone') ?? '').replace(/\D/g, '').slice(-10)

  if (!ref || phone.length !== 10) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Booking reference and mobile number are required.' } },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('bookings')
    .select(`
      booking_ref, status, check_in, check_out, nights,
      total_amount, gst_amount, advance_paid, balance_due,
      guests!inner(phone),
      booking_rooms(room_types(name))
    `)
    .eq('booking_ref', ref.trim().toUpperCase())
    .is('deleted_at', null)
    .maybeSingle()

  // Surface real query errors in logs instead of masking them as a 404 (a bad
  // column once silently broke every lookup). The response stays generic.
  if (error) console.error('[track] lookup query error:', error.message)

  const guest = Array.isArray(data?.guests) ? data?.guests[0] : data?.guests
  if (!data || guest?.phone !== phone) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'No booking found for those details.' } },
      { status: 404 }
    )
  }

  // booking_rooms has one row per room (no quantity column) — aggregate to
  // { name, quantity } by counting rows per room-type name.
  const counts = new Map<string, number>()
  for (const br of (data.booking_rooms ?? []) as unknown as Array<{ room_types: { name: Record<string, string> } | null }>) {
    const name = br.room_types?.name?.['en'] ?? 'Room'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const roomTypeNames = Array.from(counts, ([name, quantity]) => ({ quantity, name }))

  return Response.json({
    data: {
      booking_ref: data.booking_ref,
      status: data.status,
      check_in: data.check_in,
      check_out: data.check_out,
      nights: data.nights,
      total_amount: data.total_amount,
      gst_amount: data.gst_amount,
      advance_paid: data.advance_paid,
      balance_due: data.balance_due,
      rooms: roomTypeNames,
    },
  })
}
