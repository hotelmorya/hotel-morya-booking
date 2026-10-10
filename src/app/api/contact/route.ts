/**
 * POST /api/contact — public enquiry form submission.
 *
 * Validates the incoming message and sends it via Resend to the hotel owner.
 *
 * Environment variables:
 *   RESEND_CONTACT_TO  — optional override; falls back to 'hotelkbpadmapur@gmail.com'
 *
 * Auth: none — this is a public route.
 * DB: no writes — contact enquiries are email-only.
 *
 * Threat mitigations (T-tbt-02, T-tbt-04):
 *   - Field length caps prevent runaway Resend calls
 *   - HTML in email body is entity-escaped before insertion
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/client'

// Max field lengths — keep in sync with the Contact form (components/public/landing/Contact.tsx)
const MAX_NAME = 100
const MAX_PHONE = 20
const MAX_SHORT = 100 // checkin / checkout / service / guests
const MAX_MESSAGE = 2000

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { name, phone, checkin, checkout, service, guests, message, website } =
    body as Record<string, unknown>

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  // Honeypot — the hidden `website` field is invisible to humans. If it's filled,
  // a bot submitted the form: pretend success (200) so the bot gets no signal,
  // but send nothing.
  if (str(website)) {
    return NextResponse.json({ ok: true })
  }

  const nameV = str(name)
  const phoneV = str(phone)

  // Required fields — must match the form's mandatory inputs (name, phone).
  if (!nameV || !phoneV) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Length caps (T-tbt-02)
  if (nameV.length > MAX_NAME) {
    return NextResponse.json({ error: 'Name is too long' }, { status: 400 })
  }
  if (phoneV.length > MAX_PHONE) {
    return NextResponse.json({ error: 'Phone number is too long' }, { status: 400 })
  }
  if (str(message).length > MAX_MESSAGE) {
    return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
  }
  for (const v of [checkin, checkout, service, guests]) {
    if (str(v).length > MAX_SHORT) {
      return NextResponse.json({ error: 'A field is too long' }, { status: 400 })
    }
  }

  const hotelName = process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging'
  const to =
    process.env.RESEND_CONTACT_TO ?? 'hotelmoryaadmapur@gmail.com'

  // Escape user input before inserting into HTML body (T-tbt-04)
  const safe = {
    name: escapeHtml(nameV),
    phone: escapeHtml(phoneV),
    checkin: escapeHtml(str(checkin)),
    checkout: escapeHtml(str(checkout)),
    service: escapeHtml(str(service)),
    guests: escapeHtml(str(guests)),
    message: escapeHtml(str(message)),
  }

  // Only emit rows for fields the guest actually provided.
  const row = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:8px 0;font-weight:600;width:130px;color:#6b5d52">${label}</td><td style="padding:8px 0">${value}</td></tr>`
      : ''

  const messageBlock = safe.message
    ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0">
  <p style="font-weight:600;color:#6b5d52;margin-bottom:4px">Message</p>
  <p style="white-space:pre-line;line-height:1.6">${safe.message}</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#2a1f1a">
  <h2 style="color:#4F46E5;margin-bottom:4px">New enquiry — ${hotelName}</h2>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0">
  <table style="width:100%;border-collapse:collapse">
    ${row('Name', safe.name)}
    ${row('Phone / WhatsApp', `<a href="tel:${safe.phone}" style="color:#4F46E5">${safe.phone}</a>`)}
    ${row('Check-in', safe.checkin)}
    ${row('Check-out', safe.checkout)}
    ${row('Service', safe.service)}
    ${row('Guests', safe.guests)}
  </table>
  ${messageBlock}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0">
  <p style="font-size:12px;color:#b4a893">
    Sent from the contact form on ${hotelName}'s website.
  </p>
</body>
</html>
`.trim()

  try {
    await sendEmail({
      to,
      subject: `New enquiry from ${safe.name} — ${hotelName}`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/contact] Failed to send email:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
