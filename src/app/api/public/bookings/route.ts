import { after } from 'next/server'
import { roomsAvailableByType } from '@/lib/availability'
import { nextBookingRef } from '@/lib/booking-ref'
import { sendEmail } from '@/lib/email/client'
import {
  adminNewBooking,
  bookingConfirmation,
  type BookingEmailData,
  type GuestEmailData,
  type HotelEmailData,
} from '@/lib/email/templates'
import { releaseHolds } from '@/lib/holds'
import { nightsBetween, resolveNightlyRate } from '@/lib/pricing'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTurnstileToken, TurnstileConfigError } from '@/lib/turnstile'
import { buildWhatsAppLink, bookingConfirmationMessage } from '@/lib/whatsapp'
import { publicBookingSchema } from '@/schemas/public-booking'

// POST /api/public/bookings — the public single-page booking flow's create step.
// PUBLIC + unauthenticated, so it runs on the service-role client but is strict:
//   1. Turnstile token must be valid (bot protection verified at hold time and booking time)
//   2. availability is re-checked server-side (holds/race-safe)
//   3. price is computed server-side from base rate + overrides + GST (client total ignored)
// Created as `pending`; both payment paths are settled at the hotel, so a
// member of staff confirms the booking.
export async function POST(request: Request) {
  const admin = createAdminClient()

  const parsed = publicBookingSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } },
      { status: 400 }
    )
  }
  const input = parsed.data

  // Idempotency (§30): a repeated submit with the same key returns the booking.
  if (input.idempotency_key) {
    const { data: existing } = await admin
      .from('bookings')
      .select('id, booking_ref, status, total_amount, gst_amount, balance_due')
      .eq('idempotency_key', input.idempotency_key)
      .is('deleted_at', null)
      .maybeSingle()
    if (existing) return Response.json({ data: existing }, { status: 200 })
  }

  // 1) Turnstile verification — bot protection. Verify before any DB work.
  try {
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined

    const tokenValid = await verifyTurnstileToken(input.turnstile_token, {
      action: 'booking',
      remoteip: clientIp,
    })
    if (!tokenValid) {
      return Response.json(
        { error: { code: 'TURNSTILE_FAILED', message: 'Human verification failed. Please refresh and try again.' } },
        { status: 403 }
      )
    }
  } catch (e) {
    if (e instanceof TurnstileConfigError) {
      return Response.json(
        { error: { code: 'TURNSTILE_NOT_CONFIGURED', message: 'Bot protection is not configured. Contact the site administrator.' } },
        { status: 503 }
      )
    }
    throw e
  }

  // Hotel settings — GST + auto-cancel knobs.
  const { data: hotel } = await admin
    .from('hotel_settings')
    .select(
      'name, phone, whatsapp, email, address, city, gst_enabled, gst_rate, auto_cancel_hours_after_booking, min_hours_before_checkin'
    )
    .limit(1)
    .maybeSingle()

  // 2) Re-check availability for the window.
  const avail = await roomsAvailableByType({
    supabase: admin,
    checkIn: input.check_in,
    checkOut: input.check_out,
    settings: {
      auto_cancel_hours_after_booking: hotel?.auto_cancel_hours_after_booking ?? 24,
      min_hours_before_checkin: hotel?.min_hours_before_checkin ?? 6,
    },
  })
  const availByType = new Map(avail.map((a) => [a.room_type_id, a.available_count]))
  for (const line of input.rooms) {
    const free = availByType.get(line.room_type_id) ?? 0
    if (free < line.quantity) {
      return Response.json(
        { error: { code: 'UNAVAILABLE', message: 'Sorry, those rooms were just taken. Please pick again.' } },
        { status: 409 }
      )
    }
  }

  // 3) Server-authoritative pricing. Snapshot the check-in night's rate per line
  //    (consistent with the Phase 4 single-rate booking_rooms model).
  const nights = nightsBetween(input.check_in, input.check_out)
  const typeIds = input.rooms.map((r) => r.room_type_id)
  const { data: types } = await admin
    .from('room_types')
    .select('id, name, base_rate')
    .in('id', typeIds)
    .is('deleted_at', null)
  const typeById = new Map((types ?? []).map((t: { id: string; name: unknown; base_rate: number }) => [t.id, t]))
  const { data: overrides } = await admin
    .from('rate_overrides')
    .select('room_type_id, start_date, end_date, rate')
    .in('room_type_id', typeIds)

  const roomRows: { room_type_id: string; rate_per_night: number; nights: number }[] = []
  let totalAmount = 0
  for (const line of input.rooms) {
    const t = typeById.get(line.room_type_id)
    if (!t) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Unknown room type.' } },
        { status: 400 }
      )
    }
    const ovs = (overrides ?? [])
      .filter((o: { room_type_id: string }) => o.room_type_id === line.room_type_id)
      .map((o: { start_date: string; end_date: string; rate: number }) => ({
        start_date: o.start_date,
        end_date: o.end_date,
        rate: o.rate,
      }))
    const rate = resolveNightlyRate(Number(t.base_rate), ovs, input.check_in)
    for (let i = 0; i < line.quantity; i++) {
      roomRows.push({ room_type_id: line.room_type_id, rate_per_night: rate, nights })
      totalAmount += rate * nights
    }
  }
  const gstAmount =
    hotel?.gst_enabled ? Math.round((totalAmount * Number(hotel.gst_rate ?? 0)) / 100) : 0

  // 4) Upsert the guest by phone.
  const { data: existingGuest } = await admin
    .from('guests')
    .select('id')
    .eq('phone', input.guest.phone)
    .is('deleted_at', null)
    .maybeSingle()

  let guestId: string
  if (existingGuest) {
    guestId = existingGuest.id
    await admin
      .from('guests')
      .update({
        fullname: input.guest.fullname,
        email: input.guest.email || null,
        city: input.guest.city || null,
        preferred_language: input.guest.preferred_language,
        phone_verified: true,
      })
      .eq('id', guestId)
  } else {
    const { data: g, error: gErr } = await admin
      .from('guests')
      .insert({
        fullname: input.guest.fullname,
        phone: input.guest.phone,
        email: input.guest.email || null,
        city: input.guest.city || null,
        preferred_language: input.guest.preferred_language,
        phone_verified: true,
      })
      .select('id')
      .single()
    if (gErr || !g) {
      return Response.json(
        { error: { code: 'INTERNAL', message: gErr?.message ?? 'Could not save guest' } },
        { status: 500 }
      )
    }
    guestId = g.id
  }

  // 5) Create the booking (+ rooms), retrying once on a ref collision.
  let booking: { id: string; booking_ref: string } | null = null
  let lastError = ''
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    const booking_ref = await nextBookingRef(admin)
    const { data, error } = await admin
      .from('bookings')
      .insert({
        guest_id: guestId,
        booking_ref,
        check_in: input.check_in,
        check_out: input.check_out,
        source: 'website',
        total_amount: totalAmount,
        gst_amount: gstAmount,
        special_requests: input.special_requests || null,
        idempotency_key: input.idempotency_key || null,
        phone_verified_at: new Date().toISOString(),
        status: 'pending',
      })
      .select('id, booking_ref')
      .single()
    if (!error) {
      booking = data
      break
    }
    lastError = error.message
    if (input.idempotency_key && /idempotency/i.test(error.message)) {
      const { data: ex } = await admin
        .from('bookings')
        .select('id, booking_ref, status, total_amount, gst_amount, balance_due')
        .eq('idempotency_key', input.idempotency_key)
        .is('deleted_at', null)
        .maybeSingle()
      if (ex) return Response.json({ data: ex }, { status: 200 })
    }
    if (!/duplicate key|23505/i.test(error.message)) break
  }
  if (!booking) {
    return Response.json(
      { error: { code: 'INTERNAL', message: lastError || 'Could not create booking' } },
      { status: 500 }
    )
  }

  const { error: roomsError } = await admin.from('booking_rooms').insert(
    roomRows.map((r) => ({
      booking_id: booking!.id,
      room_type_id: r.room_type_id,
      rate_per_night: r.rate_per_night,
      nights: r.nights,
    }))
  )
  if (roomsError) {
    await admin.from('bookings').delete().eq('id', booking.id)
    return Response.json(
      { error: { code: 'INTERNAL', message: roomsError.message } },
      { status: 500 }
    )
  }

  // 6) Release this session's holds — they've converted into a booking.
  if (input.session_id) {
    try {
      await releaseHolds(admin, input.session_id)
    } catch {
      /* non-fatal — holds lazily expire anyway */
    }
  }

  // The booking INSERT is recorded in the canonical activity_log by the DB
  // trigger log_booking_activity() (action 'created', source 'website').

  // 7) Best-effort notifications (never block the booking on email failure).
  // Run AFTER the response is sent. Vercel keeps the function alive for `after()`
  // work; a bare fire-and-forget promise (the old `void sendBookingEmails(...)`)
  // gets frozen/killed the moment the response returns, so on serverless the
  // Resend calls never actually completed and no booking emails were delivered.
  after(() =>
    sendBookingEmails({
      booking: {
        booking_ref: booking.booking_ref,
        check_in: input.check_in,
        check_out: input.check_out,
        nights,
        total_amount: totalAmount,
        discount_amount: 0,
        gst_amount: gstAmount,
        advance_paid: 0,
        balance_due: totalAmount + gstAmount,
        status: 'pending',
      },
      guest: {
        fullname: input.guest.fullname,
        phone: input.guest.phone,
        email: input.guest.email || '',
        preferred_language: input.guest.preferred_language,
      },
      hotel: {
        name: hotel?.name ?? currentHotelName(),
        phone: hotel?.phone ?? '',
        whatsapp: hotel?.whatsapp ?? '',
        email: hotel?.email ?? '',
        address: [hotel?.address, hotel?.city].filter(Boolean).join(', '),
      },
    }),
  )

  // NOTF-03: build a WhatsApp link for the guest if the hotel has a WhatsApp number.
  // The link pre-fills a booking confirmation message in the guest's preferred language.
  let whatsapp_link: string | null = null
  const hotelWhatsapp = hotel?.whatsapp ?? ''
  if (hotelWhatsapp) {
    const msg = bookingConfirmationMessage(
      {
        booking_ref: booking.booking_ref,
        check_in: input.check_in,
        check_out: input.check_out,
        nights,
        total_amount: totalAmount,
        balance_due: totalAmount + gstAmount,
      },
      { fullname: input.guest.fullname },
      input.guest.preferred_language ?? 'en',
    )
    whatsapp_link = buildWhatsAppLink({ phone: hotelWhatsapp, message: msg })
  }

  return Response.json(
    {
      data: {
        id: booking.id,
        booking_ref: booking.booking_ref,
        status: 'pending',
        total_amount: totalAmount,
        gst_amount: gstAmount,
        balance_due: totalAmount + gstAmount,
        payment_path: input.payment_path,
        whatsapp_link,
      },
    },
    { status: 201 }
  )
}

function currentHotelName(): string {
  return process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging'
}

async function sendBookingEmails(args: {
  booking: BookingEmailData
  guest: GuestEmailData
  hotel: HotelEmailData
}) {
  const { booking, guest, hotel } = args
  // Guest confirmation (only if we have an email).
  if (guest.email) {
    try {
      await sendEmail({
        to: guest.email,
        subject: `Booking ${booking.booking_ref} — ${hotel.name}`,
        html: bookingConfirmation(booking, guest, hotel),
      })
    } catch {
      /* email not configured / failed — ignore */
    }
  }
  // Owner notification — goes to the hotel's operational inbox (where staff watch
  // for "needs call" bookings), falling back to the super_admin/sender address.
  // The super_admin is BCC'd on every email via the sendEmail helper anyway.
  const owner =
    hotel.email ||
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
    process.env.RESEND_FROM_EMAIL
  if (owner) {
    try {
      await sendEmail({
        to: owner,
        subject: `New booking ${booking.booking_ref}`,
        html: adminNewBooking(booking, guest),
      })
    } catch {
      /* ignore */
    }
  }
}
