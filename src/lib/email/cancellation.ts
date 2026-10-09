import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/client'
import {
  bookingCancellation,
  type BookingEmailData,
  type GuestEmailData,
  type HotelEmailData,
} from '@/lib/email/templates'

/**
 * Send a branded cancellation email to the guest on file.
 *
 * Non-throwing — a failed email must never surface to the caller or roll back
 * the booking status change. Silently skips when the guest has no email address.
 */
export async function sendCancellationEmail(
  bookingId: string,
  status: 'cancelled' | 'not_arrived'
): Promise<void> {
  try {
    const admin = createAdminClient()

    const { data: row } = await admin
      .from('bookings')
      .select(
        'booking_ref, check_in, check_out, nights, total_amount, discount_amount, gst_amount, advance_paid, balance_due, special_requests, guests(fullname, email, phone, preferred_language)'
      )
      .eq('id', bookingId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!row) return

    const guestRaw = Array.isArray(row.guests) ? row.guests[0] : row.guests
    if (!guestRaw?.email) return   // no email on file — skip silently

    const { data: hotelArr } = await admin
      .from('hotel_settings')
      .select('name, phone, phone_alt, whatsapp, address, city, email, check_in_time, check_out_time')
      .limit(1)
    const h = hotelArr?.[0]

    const booking: BookingEmailData = {
      booking_ref:      row.booking_ref,
      check_in:         row.check_in,
      check_out:        row.check_out,
      nights:           row.nights,
      total_amount:     row.total_amount,
      discount_amount:  row.discount_amount ?? 0,
      gst_amount:       row.gst_amount ?? 0,
      advance_paid:     row.advance_paid ?? 0,
      balance_due:      row.balance_due ?? 0,
      special_requests: row.special_requests,
      status,
    }
    const guest: GuestEmailData = {
      fullname:           guestRaw.fullname,
      email:              guestRaw.email,
      phone:              guestRaw.phone ?? '',
      preferred_language: guestRaw.preferred_language,
    }
    const hotel: HotelEmailData = {
      name:           h?.name ?? process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging',
      phone:          h?.phone ?? '',
      phone_alt:      h?.phone_alt,
      whatsapp:       h?.whatsapp,
      address:        [h?.address, h?.city].filter(Boolean).join(', '),
      email:          h?.email,
      check_in_time:  h?.check_in_time,
      check_out_time: h?.check_out_time,
    }

    const subject =
      status === 'cancelled'
        ? `Booking ${row.booking_ref} cancelled — ${hotel.name}`
        : `Booking ${row.booking_ref} — ${hotel.name}`

    await sendEmail({
      to:      guestRaw.email,
      subject,
      html:    bookingCancellation(booking, guest, hotel),
    })
  } catch {
    // best-effort — swallow all errors so the cancellation is never blocked
  }
}
