import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentDateIST } from '@/lib/format'
import { sendEmail } from '@/lib/email/client'
import {
  preArrivalReminder,
  type BookingEmailData,
  type GuestEmailData,
  type HotelEmailData,
} from '@/lib/email/templates'

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get('authorization') ?? ''
  const xCronHeader = request.headers.get('x-cron-secret') ?? ''
  const candidate = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : xCronHeader
  if (!candidate) return false
  try {
    const a = Buffer.from(secret, 'utf8')
    const b = Buffer.from(candidate, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  // 1. Authenticate
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Compute tomorrow in IST (currentDateIST returns "YYYY-MM-DD")
  // Use Date.UTC on IST date parts to avoid UTC-vs-IST ambiguity at midnight.
  // Date.UTC normalises month/year rollovers automatically (e.g. Dec 31 + 1 = Jan 1).
  const todayIST = currentDateIST()
  const [y, m, d] = todayIST.split('-').map(Number)
  const tomorrowIST = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)

  const admin = createAdminClient()

  // 3. Fetch confirmed bookings checking in tomorrow
  const { data: bookings, error: bookingsError } = await admin
    .from('bookings')
    .select(`
      id, booking_ref, check_in, check_out, nights,
      total_amount, discount_amount, gst_amount, advance_paid, balance_due,
      status, special_requests,
      guests!inner(fullname, email, phone, preferred_language)
    `)
    .eq('check_in', tomorrowIST)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .is('reminder_sent_at', null) // idempotent — skip already-reminded bookings

  if (bookingsError) {
    console.error('[reminders/daily] DB error fetching bookings:', bookingsError)
    return Response.json(
      { error: 'Failed to fetch bookings', details: bookingsError.message },
      { status: 500 }
    )
  }

  // 4. Fetch hotel settings for email template
  const { data: hotelArr } = await admin
    .from('hotel_settings')
    .select('name, phone, phone_alt, whatsapp, address, email, check_in_time, check_out_time')
    .limit(1)

  const hotelRaw = hotelArr?.[0]

  const hotelData: HotelEmailData = {
    name: hotelRaw?.name ?? process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging',
    phone: hotelRaw?.phone ?? '',
    phone_alt: hotelRaw?.phone_alt,
    whatsapp: hotelRaw?.whatsapp,
    address: hotelRaw?.address ?? '',
    email: hotelRaw?.email,
    check_in_time: hotelRaw?.check_in_time,
    check_out_time: hotelRaw?.check_out_time,
  }

  // 5. Send reminders
  let sent = 0
  let skipped = 0

  try {
    for (const booking of bookings ?? []) {
      // PostgREST may return the joined guest as an object or array for !inner
      const guest = booking.guests
      const guestData = Array.isArray(guest) ? guest[0] : guest

      if (!guestData?.email) {
        skipped++
        continue
      }

      const bookingData: BookingEmailData = {
        booking_ref: booking.booking_ref,
        check_in: booking.check_in,
        check_out: booking.check_out,
        nights: booking.nights,
        total_amount: booking.total_amount,
        discount_amount: booking.discount_amount,
        gst_amount: booking.gst_amount,
        advance_paid: booking.advance_paid,
        balance_due: booking.balance_due,
        status: booking.status,
        special_requests: booking.special_requests,
      }

      const guestEmailData: GuestEmailData = {
        fullname: guestData.fullname,
        email: guestData.email,
        phone: guestData.phone,
        preferred_language: guestData.preferred_language,
      }

      const html = preArrivalReminder(bookingData, guestEmailData, hotelData)

      const lang = guestEmailData.preferred_language ?? 'en'
      const subjectMap: Record<string, string> = {
        en: `See you tomorrow — ${hotelData.name}`,
        mr: `उद्या भेटू — ${hotelData.name}`,
        hi: `कल मिलते हैं — ${hotelData.name}`,
      }
      const subject = subjectMap[lang] ?? subjectMap['en']

      try {
        await sendEmail({ to: guestData.email, subject, html })
        // Stamp so a retry / second run today won't re-send this reminder.
        await admin
          .from('bookings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', booking.id)
        sent++
      } catch (emailErr) {
        console.error(
          `[reminders/daily] Failed to send reminder for booking ${booking.booking_ref}:`,
          emailErr
        )
        skipped++
      }
    }
  } catch (loopErr) {
    console.error('[reminders/daily] Unexpected error in send loop:', loopErr)
    return Response.json(
      { error: 'Internal error during send loop', sent, skipped },
      { status: 500 }
    )
  }

  return Response.json({
    data: {
      ok: true,
      date: tomorrowIST,
      total: (bookings ?? []).length,
      sent,
      skipped,
    },
  })
}

export const POST = GET
