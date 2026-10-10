import { timingSafeEqual } from 'crypto'

import { getFromAddress, getMonitorBcc } from '@/lib/email/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentDateIST } from '@/lib/format'

export const dynamic = 'force-dynamic'

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
// IST date formatter (inline — avoids importing browser-only lib/format helpers)
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  } catch {
    return iso ?? ''
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function handler(request: Request): Promise<Response> {
  try {
    // 1. Authenticate
    if (!verifyCronSecret(request)) {
      return Response.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or missing CRON_SECRET' } },
        { status: 401 },
      )
    }

    const admin = createAdminClient()

    // 2. Query data
    const [bookingsResult, guestsResult, paymentsResult] = await Promise.all([
      admin
        .from('bookings')
        .select(
          'booking_ref, status, source, check_in, check_out, nights, total_amount, discount_amount, gst_amount, advance_paid, balance_due, special_requests, created_at, guests!inner(fullname, phone)',
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),

      admin
        .from('guests')
        .select(
          'fullname, phone, email, city, preferred_language, total_stays, lifetime_value, last_stayed_at, tags, notes, created_at',
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),

      admin
        .from('payments')
        .select(
          'id, amount, method, status, reference_note, paid_at, created_at, bookings!inner(booking_ref, guests!inner(fullname))',
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ])

    if (bookingsResult.error) {
      console.error('[backup/weekly] bookings query error:', bookingsResult.error)
      return Response.json(
        { error: { code: 'DB_ERROR', message: 'Failed to fetch bookings' } },
        { status: 500 },
      )
    }
    if (guestsResult.error) {
      console.error('[backup/weekly] guests query error:', guestsResult.error)
      return Response.json(
        { error: { code: 'DB_ERROR', message: 'Failed to fetch guests' } },
        { status: 500 },
      )
    }
    if (paymentsResult.error) {
      console.error('[backup/weekly] payments query error:', paymentsResult.error)
      return Response.json(
        { error: { code: 'DB_ERROR', message: 'Failed to fetch payments' } },
        { status: 500 },
      )
    }

    const bookings = bookingsResult.data ?? []
    const guests = guestsResult.data ?? []
    const payments = paymentsResult.data ?? []

    // 3. Build Excel workbook
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx')
    const wb = XLSX.utils.book_new()

    // Bookings sheet
    const bookingRows = [
      [
        'Booking Ref',
        'Guest Name',
        'Phone',
        'Status',
        'Source',
        'Check-in',
        'Check-out',
        'Nights',
        'Total (₹)',
        'Discount (₹)',
        'GST (₹)',
        'Advance Paid (₹)',
        'Balance Due (₹)',
        'Special Requests',
        'Created At',
      ],
      ...bookings.map((b) => {
        const guestData = b.guests
        const g = Array.isArray(guestData) ? guestData[0] : guestData
        return [
          b.booking_ref,
          g?.fullname ?? '',
          g?.phone ?? '',
          b.status,
          b.source,
          fmtDate(b.check_in),
          fmtDate(b.check_out),
          b.nights,
          b.total_amount,
          b.discount_amount,
          b.gst_amount,
          b.advance_paid,
          b.balance_due,
          b.special_requests ?? '',
          fmtDate(b.created_at),
        ]
      }),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bookingRows), 'Bookings')

    // Guests sheet
    const guestRows = [
      [
        'Full Name',
        'Phone',
        'Email',
        'City',
        'Language',
        'Total Stays',
        'Lifetime Value (₹)',
        'Last Stayed',
        'Tags',
        'Notes',
        'Added On',
      ],
      ...guests.map((g) => [
        g.fullname,
        g.phone,
        g.email ?? '',
        g.city ?? '',
        g.preferred_language ?? '',
        g.total_stays ?? 0,
        g.lifetime_value ?? 0,
        fmtDate(g.last_stayed_at),
        (g.tags ?? []).join(', '),
        g.notes ?? '',
        fmtDate(g.created_at),
      ]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guestRows), 'Guests')

    // Payments sheet
    const paymentRows = [
      [
        'Payment ID',
        'Booking Ref',
        'Guest Name',
        'Amount (₹)',
        'Method',
        'Status',
        'Reference / UTR',
        'Paid At',
        'Recorded At',
      ],
      ...payments.map((p) => {
        const bkData = p.bookings
        const bk = Array.isArray(bkData) ? bkData[0] : bkData
        const guestData = bk && bk.guests
        const g = guestData && (Array.isArray(guestData) ? guestData[0] : guestData)
        return [
          p.id,
          bk?.booking_ref ?? '',
          g?.fullname ?? '',
          p.amount,
          p.method,
          p.status,
          p.reference_note ?? '',
          fmtDate(p.paid_at),
          fmtDate(p.created_at),
        ]
      }),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paymentRows), 'Payments')

    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // 4. Get owner email from hotel_settings
    const { data: hotelArr } = await admin
      .from('hotel_settings')
      .select('name, email')
      .limit(1)
    const hotel = hotelArr?.[0]
    const hotelName = hotel?.name ?? process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging'
    const ownerEmail =
      hotel?.email ?? process.env.RESEND_FROM_EMAIL ?? 'bookings@hotelmoryaadmapur.in'
    const today = currentDateIST()

    // 5. Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1F2937;">&#128202; Weekly Backup &#8212; ${hotelName}</h2>
  <p>Your weekly data backup is attached for <strong>${today}</strong>.</p>
  <p>The Excel file contains 3 sheets:</p>
  <ul>
    <li><strong>Bookings</strong> &#8212; ${bookings.length} records</li>
    <li><strong>Guests</strong> &#8212; ${guests.length} records</li>
    <li><strong>Payments</strong> &#8212; ${payments.length} records</li>
  </ul>
  <p style="color: #6B7280; font-size: 14px;">This is an automated backup from cron-job.org. Keep this email for your records.</p>
</body>
</html>
`

    // 6. Send via Resend with attachment (can't use sendEmail helper — needs attachment)
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: { code: 'CONFIG_ERROR', message: 'RESEND_API_KEY not set' } },
        { status: 503 },
      )
    }
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const filename = `hotel-kbp-backup-${today}.xlsx`
    const bcc = getMonitorBcc()

    const { error: emailError } = await resend.emails.send({
      from: getFromAddress(),
      to: ownerEmail,
      subject: `Weekly Backup — ${hotelName} — ${today}`,
      html: emailHtml,
      ...(bcc ? { bcc } : {}),
      attachments: [
        {
          filename,
          content: buf,
        },
      ],
    })

    if (emailError) {
      console.error('[backup/weekly] Resend error:', emailError)
      return Response.json(
        { error: { code: 'EMAIL_ERROR', message: 'Failed to send backup email' } },
        { status: 502 },
      )
    }

    // 7. Return success
    return Response.json({
      data: {
        ok: true,
        date: today,
        rows: {
          bookings: bookings.length,
          guests: guests.length,
          payments: payments.length,
        },
        sentTo: ownerEmail,
      },
    })
  } catch (err) {
    console.error('[backup/weekly] unexpected error:', err)
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 },
    )
  }
}

export const GET = handler
export const POST = handler
