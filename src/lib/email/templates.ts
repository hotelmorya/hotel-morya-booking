import {
  formatCurrency,
  formatDateIST,
  formatDateRange,
  formatNights,
} from '@/lib/format'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingEmailData {
  booking_ref: string
  check_in: string       // ISO date string
  check_out: string      // ISO date string
  nights: number
  total_amount: number
  discount_amount: number
  gst_amount: number
  advance_paid: number
  balance_due: number
  special_requests?: string | null
  status: string
}

export interface GuestEmailData {
  fullname: string
  email?: string | null
  phone: string
  preferred_language?: string | null   // 'en' | 'mr' | 'hi'
}

export interface HotelEmailData {
  name: string
  phone: string
  phone_alt?: string | null
  whatsapp?: string | null
  address: string
  email?: string | null
  check_in_time?: string | null    // "12:00:00"
  check_out_time?: string | null   // "11:00:00"
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function getLang(guest: GuestEmailData): 'en' | 'mr' | 'hi' {
  return guest.preferred_language === 'mr' ? 'mr'
       : guest.preferred_language === 'hi' ? 'hi'
       : 'en'
}

function getEnv(key: string, fallback: string): string {
  return (typeof process !== 'undefined' && process.env[key]) || fallback
}

function themeColor(): string {
  return getEnv('NEXT_PUBLIC_HOTEL_THEME_COLOR', '#F5A623')
}

function hotelName(): string {
  return getEnv('NEXT_PUBLIC_HOTEL_NAME', 'Hotel Morya Lodging')
}

function appUrl(): string {
  return getEnv('NEXT_PUBLIC_APP_URL', 'https://hotelkbp.vercel.app')
}

/** Format a HH:MM:SS time string to "12:00 PM" */
function formatTime(t: string | null | undefined): string {
  if (!t) return '—'
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${suffix}`
}

// ---------------------------------------------------------------------------
// Shared HTML building blocks (inline CSS throughout — email clients)
// ---------------------------------------------------------------------------

function htmlWrapper(
  content: string,
  options: { themeColor: string; hotelName: string }
): string {
  const { themeColor: tc, hotelName: hn } = options
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${hn}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${tc};padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${hn}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;color:#6B7280;text-align:center;line-height:1.6;">
                ${hn} &bull; Admapur, Maharashtra<br />
                This is an automated email. Please do not reply directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function divider(color: string): string {
  return `<hr style="border:none;border-top:1px solid ${color};margin:20px 0;" />`
}

function amountRow(label: string, value: string, bold = false): string {
  const weight = bold ? '700' : '400'
  return `<tr>
    <td style="padding:5px 0;font-size:14px;color:#374151;font-weight:${weight};">${label}</td>
    <td style="padding:5px 0;font-size:14px;color:#111827;font-family:monospace,monospace;text-align:right;font-weight:${weight};">${value}</td>
  </tr>`
}

function contactBlock(hotel: HotelEmailData, contactLabel: string, waText: string): string {
  const waNumber = hotel.whatsapp
    ? hotel.whatsapp.replace(/\D/g, '')
    : hotel.phone.replace(/\D/g, '')
  const waNumber91 = waNumber.length === 10 ? `91${waNumber}` : waNumber

  const altPhone = hotel.phone_alt
    ? `<br /><span style="color:#6B7280;">${hotel.phone_alt}</span>`
    : ''

  const emailLine = hotel.email
    ? `<br /><a href="mailto:${hotel.email}" style="color:#4F46E5;text-decoration:none;">${hotel.email}</a>`
    : ''

  return `<p style="margin:12px 0 4px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">${contactLabel}</p>
<p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
  📞 <a href="tel:${hotel.phone}" style="color:#374151;text-decoration:none;">${hotel.phone}</a>${altPhone}${emailLine}<br />
  💬 <a href="https://wa.me/${waNumber91}" style="color:#25D366;text-decoration:none;">${waText}</a><br />
  📍 ${hotel.address}
</p>`
}

// ---------------------------------------------------------------------------
// 1. Booking Confirmation
// ---------------------------------------------------------------------------

const confirmStrings = {
  en: {
    greeting:   (name: string) => `Dear ${name},`,
    headline:   'Your booking is confirmed!',
    ref:        'Booking Reference',
    checkin:    'Check-in',
    checkout:   'Check-out',
    nights:     'Nights',
    total:      'Total',
    discount:   'Discount',
    gst:        'GST',
    grandTotal: 'Grand Total',
    advance:    'Advance Paid',
    balance:    'Balance Due',
    contact:    'Contact Us',
    footer:     (hn: string) => `Thank you for choosing ${hn}`,
    help:       'If you need assistance, call us or WhatsApp',
    special:    'Special Requests',
    wa:         'WhatsApp us',
  },
  mr: {
    greeting:   (name: string) => `प्रिय ${name},`,
    headline:   'तुमची बुकिंग निश्चित झाली आहे!',
    ref:        'बुकिंग संदर्भ',
    checkin:    'चेक-इन',
    checkout:   'चेक-आउट',
    nights:     'रात्री',
    total:      'एकूण',
    discount:   'सूट',
    gst:        'जीएसटी',
    grandTotal: 'महाराष्ट्र',
    advance:    'अग्रिम भरलेले',
    balance:    'शिल्लक',
    contact:    'संपर्क',
    footer:     (hn: string) => `${hn} निवडल्याबद्दल धन्यवाद`,
    help:       'मदतीसाठी फोन किंवा व्हाट्सअ‍ॅप करा',
    special:    'विशेष विनंत्या',
    wa:         'व्हाट्सअ‍ॅप करा',
  },
  hi: {
    greeting:   (name: string) => `प्रिय ${name},`,
    headline:   'आपकी बुकिंग की पुष्टि हो गई है!',
    ref:        'बुकिंग संदर्भ',
    checkin:    'चेक-इन',
    checkout:   'चेक-आउट',
    nights:     'रातें',
    total:      'कुल',
    discount:   'छूट',
    gst:        'जीएसटी',
    grandTotal: 'कुल योग',
    advance:    'अग्रिम भुगतान',
    balance:    'शेष राशि',
    contact:    'संपर्क करें',
    footer:     (hn: string) => `${hn} को चुनने के लिए धन्यवाद`,
    help:       'सहायता के लिए कॉल या व्हाट्सएप करें',
    special:    'विशेष अनुरोध',
    wa:         'व्हाट्सएप करें',
  },
} as const

export function bookingConfirmation(
  booking: BookingEmailData,
  guest: GuestEmailData,
  hotel: HotelEmailData
): string {
  const lang = getLang(guest)
  const s = confirmStrings[lang]
  const tc = themeColor()
  const hn = hotelName()

  const specialRow = booking.special_requests
    ? `${divider('#E5E7EB')}
       <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">${s.special}</p>
       <p style="margin:0;font-size:14px;color:#374151;">${booking.special_requests}</p>`
    : ''

  const discountRow =
    booking.discount_amount > 0
      ? amountRow(`${s.discount}`, `−${formatCurrency(booking.discount_amount)}`)
      : ''

  const gstRow =
    booking.gst_amount > 0
      ? amountRow(s.gst, formatCurrency(booking.gst_amount))
      : ''

  const content = `
    <p style="margin:0 0 4px;font-size:16px;color:#374151;">${s.greeting(guest.fullname)}</p>
    <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#111827;">${s.headline}</p>

    <!-- Booking reference badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#F3F4F6;border-left:4px solid ${tc};border-radius:4px;padding:10px 16px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">${s.ref}</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#111827;font-family:monospace,monospace;letter-spacing:1px;">${booking.booking_ref}</p>
        </td>
      </tr>
    </table>

    <!-- Dates -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">${s.checkin}</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${formatDateIST(booking.check_in)}</p>
          ${hotel.check_in_time ? `<p style="margin:2px 0 0;font-size:13px;color:#6B7280;">from ${formatTime(hotel.check_in_time)}</p>` : ''}
        </td>
        <td width="50%" style="padding-left:8px;border-left:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">${s.checkout}</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${formatDateIST(booking.check_out)}</p>
          ${hotel.check_out_time ? `<p style="margin:2px 0 0;font-size:13px;color:#6B7280;">by ${formatTime(hotel.check_out_time)}</p>` : ''}
        </td>
      </tr>
    </table>
    <p style="margin:0 0 20px;font-size:14px;color:#6B7280;">${formatDateRange(booking.check_in, booking.check_out)} &bull; ${formatNights(booking.nights)}</p>

    ${divider('#E5E7EB')}

    <!-- Amount summary -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${amountRow(s.total, formatCurrency(booking.total_amount))}
      ${discountRow}
      ${gstRow}
      ${amountRow(s.grandTotal, formatCurrency(booking.total_amount - booking.discount_amount + booking.gst_amount), true)}
      ${amountRow(s.advance, formatCurrency(booking.advance_paid))}
    </table>

    <!-- Balance due highlight -->
    ${booking.balance_due > 0 ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;width:100%;">
      <tr>
        <td style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:10px 16px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size:14px;color:#92400E;font-weight:600;">${s.balance}</td>
              <td style="font-size:16px;color:#92400E;font-family:monospace,monospace;text-align:right;font-weight:700;">${formatCurrency(booking.balance_due)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>` : `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;width:100%;">
      <tr>
        <td style="background:#DCFCE7;border-left:4px solid #16A34A;border-radius:4px;padding:10px 16px;">
          <p style="margin:0;font-size:14px;color:#14532D;font-weight:600;">${s.advance} ✓</p>
        </td>
      </tr>
    </table>`}

    ${specialRow}

    ${divider('#E5E7EB')}

    ${contactBlock(hotel, s.contact, s.wa)}

    ${divider('#E5E7EB')}

    <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${s.footer(hn)}</p>
    <p style="margin:8px 0 0;font-size:13px;color:#6B7280;">${s.help}</p>
  `

  return htmlWrapper(content, { themeColor: tc, hotelName: hn })
}

// ---------------------------------------------------------------------------
// 2. Admin New Booking Notification
// ---------------------------------------------------------------------------

export function adminNewBooking(
  booking: BookingEmailData,
  guest: GuestEmailData
): string {
  const tc = themeColor()
  const hn = hotelName()
  const url = appUrl()
  const adminLink = `${url}/admin/bookings/${booking.booking_ref}`

  const content = `
    <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111827;">New booking received</p>

    <!-- Booking ref + status -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#F3F4F6;border-left:4px solid ${tc};border-radius:4px;padding:10px 16px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Booking Reference</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827;font-family:monospace,monospace;letter-spacing:1px;">${booking.booking_ref}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">Status: <strong style="color:#111827;">${booking.status}</strong></p>
        </td>
      </tr>
    </table>

    <!-- Guest details -->
    <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Guest</p>
    <p style="margin:0 0 16px;font-size:15px;color:#111827;">
      <strong>${guest.fullname}</strong><br />
      📞 <a href="tel:${guest.phone}" style="color:#374151;text-decoration:none;">${guest.phone}</a>
      ${guest.email ? `<br />✉️ <a href="mailto:${guest.email}" style="color:#4F46E5;text-decoration:none;">${guest.email}</a>` : ''}
    </p>

    ${divider('#E5E7EB')}

    <!-- Stay details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Check-in</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${formatDateIST(booking.check_in)}</p>
        </td>
        <td width="50%" style="padding-left:8px;border-left:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Check-out</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${formatDateIST(booking.check_out)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:13px;color:#6B7280;">${formatDateRange(booking.check_in, booking.check_out)} &bull; ${formatNights(booking.nights)}</p>

    ${divider('#E5E7EB')}

    <!-- Amount summary -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${amountRow('Total', formatCurrency(booking.total_amount))}
      ${booking.discount_amount > 0 ? amountRow('Discount', `−${formatCurrency(booking.discount_amount)}`) : ''}
      ${booking.gst_amount > 0 ? amountRow('GST', formatCurrency(booking.gst_amount)) : ''}
      ${amountRow('Grand Total', formatCurrency(booking.total_amount - booking.discount_amount + booking.gst_amount), true)}
      ${amountRow('Advance Paid', formatCurrency(booking.advance_paid))}
    </table>

    ${booking.balance_due > 0 ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;width:100%;">
      <tr>
        <td style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:10px 16px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size:14px;color:#92400E;font-weight:600;">Balance Due</td>
              <td style="font-size:16px;color:#92400E;font-family:monospace,monospace;text-align:right;font-weight:700;">${formatCurrency(booking.balance_due)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>` : `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;width:100%;">
      <tr>
        <td style="background:#DCFCE7;border-left:4px solid #16A34A;border-radius:4px;padding:10px 16px;">
          <p style="margin:0;font-size:14px;color:#14532D;font-weight:600;">Fully Paid ✓</p>
        </td>
      </tr>
    </table>`}

    ${booking.special_requests ? `
    ${divider('#E5E7EB')}
    <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Special Requests</p>
    <p style="margin:0;font-size:14px;color:#374151;">${booking.special_requests}</p>` : ''}

    ${divider('#E5E7EB')}

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${tc};border-radius:6px;padding:12px 24px;">
          <a href="${adminLink}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">View in Admin →</a>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0;font-size:12px;color:#6B7280;">Or open: <a href="${adminLink}" style="color:#4F46E5;">${adminLink}</a></p>
  `

  return htmlWrapper(content, { themeColor: tc, hotelName: hn })
}

// ---------------------------------------------------------------------------
// 3. Pre-Arrival Reminder
// ---------------------------------------------------------------------------

const reminderStrings = {
  en: {
    headline:    (hn: string) => `Your stay at ${hn} is tomorrow!`,
    sub:         "We're looking forward to welcoming you",
    checkinDate: 'Check-in date',
    checkinTime: 'Check-in time',
    balance:     'Balance due on arrival',
    directions:  'Getting here',
    contact:     'Contact us',
    footer:      'Safe travels!',
    wa:          'WhatsApp us',
  },
  mr: {
    headline:    (hn: string) => `${hn} मध्ये तुमचा मुक्काम उद्या आहे!`,
    sub:         'आम्ही तुमच्या स्वागतासाठी तयार आहोत',
    checkinDate: 'चेक-इन तारीख',
    checkinTime: 'चेक-इन वेळ',
    balance:     'आगमनावर शिल्लक',
    directions:  'येण्याचा मार्ग',
    contact:     'संपर्क',
    footer:      'सुरक्षित प्रवास!',
    wa:          'व्हाट्सअ‍ॅप करा',
  },
  hi: {
    headline:    (hn: string) => `${hn} में आपका प्रवास कल है!`,
    sub:         'हम आपका स्वागत करने के लिए तत्पर हैं',
    checkinDate: 'चेक-इन तारीख',
    checkinTime: 'चेक-इन समय',
    balance:     'आगमन पर शेष राशि',
    directions:  'यहाँ कैसे पहुँचें',
    contact:     'संपर्क',
    footer:      'सुरक्षित यात्रा!',
    wa:          'व्हाट्सएप करें',
  },
} as const

export function preArrivalReminder(
  booking: BookingEmailData,
  guest: GuestEmailData,
  hotel: HotelEmailData
): string {
  const lang = getLang(guest)
  const s = reminderStrings[lang]
  const tc = themeColor()
  const hn = hotelName()

  const content = `
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Dear ${guest.fullname},</p>
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${s.headline(hn)}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B7280;">${s.sub}</p>

    <!-- Booking ref -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#F3F4F6;border-left:4px solid ${tc};border-radius:4px;padding:10px 16px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Booking Reference</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827;font-family:monospace,monospace;letter-spacing:1px;">${booking.booking_ref}</p>
        </td>
      </tr>
    </table>

    <!-- Check-in info -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">${s.checkinDate}</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${formatDateIST(booking.check_in)}</p>
        </td>
        <td width="50%" style="padding-left:8px;border-left:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">${s.checkinTime}</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${formatTime(hotel.check_in_time)}</p>
        </td>
      </tr>
    </table>

    ${booking.balance_due > 0 ? `
    ${divider('#E5E7EB')}
    <!-- Balance due -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:4px;">
      <tr>
        <td style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:10px 16px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size:14px;color:#92400E;font-weight:600;">${s.balance}</td>
              <td style="font-size:18px;color:#92400E;font-family:monospace,monospace;text-align:right;font-weight:700;">${formatCurrency(booking.balance_due)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>` : ''}

    ${divider('#E5E7EB')}

    <!-- Directions -->
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">${s.directions}</p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">📍 ${hotel.address}</p>

    ${contactBlock(hotel, s.contact, s.wa)}

    ${divider('#E5E7EB')}

    <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${s.footer}</p>
  `

  return htmlWrapper(content, { themeColor: tc, hotelName: hn })
}

// ---------------------------------------------------------------------------
// 5. Booking Cancellation / Not-Arrived
// ---------------------------------------------------------------------------

const cancelStrings = {
  en: {
    greeting:           (name: string) => `Dear ${name},`,
    headlineCancelled:  'Your booking has been cancelled',
    headlineNotArrived: 'Your booking was marked as not arrived',
    subCancelled:       'If you have any questions, please contact us.',
    subNotArrived:      'If you believe this is a mistake, please contact us.',
    ref:                'Booking Reference',
    checkin:            'Check-in',
    checkout:           'Check-out',
    nights:             'Nights',
    total:              'Total',
    discount:           'Discount',
    gst:                'GST',
    grandTotal:         'Grand Total',
    advance:            'Advance Paid',
    advanceNote:        'Please contact us to arrange a refund.',
    contact:            'Contact Us',
    trackCta:           'Track your booking',
    footer:             (hn: string) => `Thank you for choosing ${hn}`,
    wa:                 'WhatsApp us',
  },
  mr: {
    greeting:           (name: string) => `प्रिय ${name},`,
    headlineCancelled:  'तुमची बुकिंग रद्द केली गेली आहे',
    headlineNotArrived: 'तुमची बुकिंग न आलेली म्हणून नोंदवण्यात आली',
    subCancelled:       'कोणत्याही प्रश्नासाठी कृपया आमच्याशी संपर्क साधा.',
    subNotArrived:      'हे चुकीचे वाटत असल्यास, कृपया आमच्याशी संपर्क साधा.',
    ref:                'बुकिंग संदर्भ',
    checkin:            'चेक-इन',
    checkout:           'चेक-आउट',
    nights:             'रात्री',
    total:              'एकूण',
    discount:           'सूट',
    gst:                'जीएसटी',
    grandTotal:         'एकूण रक्कम',
    advance:            'अग्रिम भरलेले',
    advanceNote:        'परतावा मिळवण्यासाठी कृपया आमच्याशी संपर्क साधा.',
    contact:            'संपर्क',
    trackCta:           'बुकिंग तपासा',
    footer:             (hn: string) => `${hn} निवडल्याबद्दल धन्यवाद`,
    wa:                 'व्हाट्सअ‍ॅप करा',
  },
  hi: {
    greeting:           (name: string) => `प्रिय ${name},`,
    headlineCancelled:  'आपकी बुकिंग रद्द कर दी गई है',
    headlineNotArrived: 'आपकी बुकिंग न-आगमन के रूप में दर्ज की गई',
    subCancelled:       'किसी भी प्रश्न के लिए कृपया हमसे संपर्क करें।',
    subNotArrived:      'यदि यह गलती है, तो कृपया हमसे संपर्क करें।',
    ref:                'बुकिंग संदर्भ',
    checkin:            'चेक-इन',
    checkout:           'चेक-आउट',
    nights:             'रातें',
    total:              'कुल',
    discount:           'छूट',
    gst:                'जीएसटी',
    grandTotal:         'कुल योग',
    advance:            'अग्रिम भुगतान',
    advanceNote:        'धनवापसी के लिए कृपया हमसे संपर्क करें।',
    contact:            'संपर्क करें',
    trackCta:           'बुकिंग ट्रैक करें',
    footer:             (hn: string) => `${hn} को चुनने के लिए धन्यवाद`,
    wa:                 'व्हाट्सएप करें',
  },
} as const

export function bookingCancellation(
  booking: BookingEmailData,
  guest: GuestEmailData,
  hotel: HotelEmailData
): string {
  const lang = getLang(guest)
  const s = cancelStrings[lang]
  const tc = themeColor()
  const hn = hotelName()
  const url = appUrl()

  const headline = booking.status === 'not_arrived' ? s.headlineNotArrived : s.headlineCancelled
  const sub      = booking.status === 'not_arrived' ? s.subNotArrived : s.subCancelled

  const discountRow =
    booking.discount_amount > 0
      ? amountRow(s.discount, `−${formatCurrency(booking.discount_amount)}`)
      : ''

  const gstRow =
    booking.gst_amount > 0
      ? amountRow(s.gst, formatCurrency(booking.gst_amount))
      : ''

  // Advance-paid refund callout — only shown when the guest paid something upfront.
  const advanceBlock =
    booking.advance_paid > 0
      ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;width:100%;">
      <tr>
        <td style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:10px 16px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size:14px;color:#92400E;font-weight:600;">${s.advance}: ${formatCurrency(booking.advance_paid)}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#92400E;padding-top:4px;">${s.advanceNote}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
      : ''

  const content = `
    <p style="margin:0 0 4px;font-size:16px;color:#374151;">${s.greeting(guest.fullname)}</p>
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${headline}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B7280;">${sub}</p>

    <!-- Booking reference badge (amber — distinct from the green confirmation badge) -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:10px 16px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">${s.ref}</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#111827;font-family:monospace,monospace;letter-spacing:1px;">${booking.booking_ref}</p>
        </td>
      </tr>
    </table>

    <!-- Dates -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">${s.checkin}</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${formatDateIST(booking.check_in)}</p>
        </td>
        <td width="50%" style="padding-left:8px;border-left:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">${s.checkout}</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${formatDateIST(booking.check_out)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 20px;font-size:14px;color:#6B7280;">${formatDateRange(booking.check_in, booking.check_out)} &bull; ${formatNights(booking.nights)}</p>

    ${divider('#E5E7EB')}

    <!-- Amount summary -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${amountRow(s.total, formatCurrency(booking.total_amount))}
      ${discountRow}
      ${gstRow}
      ${amountRow(s.grandTotal, formatCurrency(booking.total_amount - booking.discount_amount + booking.gst_amount), true)}
    </table>

    ${advanceBlock}

    ${divider('#E5E7EB')}

    <!-- Track CTA — deep-link prefills the ref; guest still enters phone to see status -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="background:#F59E0B;border-radius:6px;padding:12px 24px;">
          <a href="${url}/track?ref=${booking.booking_ref}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${s.trackCta} →</a>
        </td>
      </tr>
    </table>

    ${contactBlock(hotel, s.contact, s.wa)}

    ${divider('#E5E7EB')}

    <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${s.footer(hn)}</p>
  `

  return htmlWrapper(content, { themeColor: tc, hotelName: hn })
}

// ---------------------------------------------------------------------------
// 4. Staff Password Reset (hotel-branded — sent via Resend, never Supabase)
// ---------------------------------------------------------------------------

export function passwordReset(resetLink: string): {
  subject: string
  html: string
} {
  const tc = themeColor()
  const hn = hotelName()

  const content = `
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Reset your password</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
      We received a request to reset the password for your ${hn} staff account.
      Click the button below to choose a new one.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="border-radius:6px;background:${tc};">
          <a href="${resetLink}" target="_blank"
             style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">
            Reset password
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:13px;color:#6B7280;line-height:1.6;">
      This link is single-use and expires in about 1 hour. If the button doesn't
      work, copy and paste this link into your browser:<br />
      <a href="${resetLink}" style="color:#4F46E5;word-break:break-all;">${resetLink}</a>
    </p>

    <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
      If you didn't request this, you can safely ignore this email — your
      password won't change.
    </p>
  `

  return {
    subject: `Reset your ${hn} password`,
    html: htmlWrapper(content, { themeColor: tc, hotelName: hn }),
  }
}
