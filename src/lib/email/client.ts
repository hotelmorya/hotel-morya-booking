import { Resend } from 'resend'

// Lazily initialized — never create at module top-level so the build doesn't
// crash when RESEND_API_KEY is unset (e.g. during `next build` on CI without
// secrets injected).
let _resend: Resend | null = null

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set')
  }
  if (!_resend) {
    _resend = new Resend(apiKey)
  }
  return _resend
}

// Hotel-branded sender, e.g. "Hotel Morya Lodging Bookings <bookings@hotelkbpadmapur.in>".
// The address MUST be on the Resend-verified domain (hotelkbpadmapur.in).
// Display name comes from RESEND_FROM_NAME, falling back to the hotel name.
// If RESEND_FROM_EMAIL already includes a "Name <email>" form, it's used as-is.
export function getFromAddress(): string {
  const email = process.env.RESEND_FROM_EMAIL ?? 'bookings@hotelkbpadmapur.in'
  if (email.includes('<')) return email
  const name =
    process.env.RESEND_FROM_NAME ??
    process.env.NEXT_PUBLIC_HOTEL_NAME ??
    'Hotel Morya Lodging'
  return `${name} <${email}>`
}

// Monitoring copies — BCC'd on every outbound email so the addresses are never
// exposed to guests or other recipients. Combines the super-admin (dev oversight)
// and admin (hotel owner) addresses; de-duplicated. Returns undefined if neither
// is set (no BCC added).
export function getMonitorBcc(): string[] | undefined {
  const list = [
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  ]
    .map((e) => e?.trim())
    .filter((e): e is string => !!e)
  const unique = [...new Set(list)]
  return unique.length ? unique : undefined
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const resend = getResend()
  const bcc = getMonitorBcc()

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html,
    ...(bcc ? { bcc } : {}),
  })
  if (error) {
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`)
  }
}
