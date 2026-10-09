import { formatDateIST, formatCurrency } from '@/lib/format'

/**
 * Builds a wa.me deep-link for an Indian mobile number.
 * phone: 10-digit Indian number (6-9 prefix), WITHOUT country code.
 * message: pre-filled text (URL-encoded automatically).
 */
export function buildWhatsAppLink({
  phone,
  message,
}: {
  phone: string
  message: string
}): string {
  return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
}

/**
 * Returns the WhatsApp booking confirmation message in the correct language.
 * lang: 'en' | 'mr'  (fallback: 'en')
 */
export function bookingConfirmationMessage(
  booking: {
    booking_ref: string
    check_in: string
    check_out: string
    nights: number
    total_amount: number
    balance_due: number
  },
  guest: { fullname: string },
  lang: string,
): string {
  const hotelName = process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging'
  const checkIn = formatDateIST(booking.check_in)
  const checkOut = formatDateIST(booking.check_out)
  const total = formatCurrency(booking.total_amount)
  const balance = formatCurrency(booking.balance_due)

  const resolved = lang === 'mr' ? 'mr' : 'en'

  if (resolved === 'mr') {
    return [
      `प्रिय ${guest.fullname},`,
      '',
      `${hotelName} येथे तुमची बुकिंग निश्चित झाली आहे! 🏨`,
      '',
      `बुकिंग क्रमांक: ${booking.booking_ref}`,
      `चेक-इन: ${checkIn}`,
      `चेक-आउट: ${checkOut}`,
      `रात्री: ${booking.nights}`,
      `एकूण: ${total}`,
      `आगमनावर शिल्लक: ${balance}`,
      '',
      'तुमच्या स्वागतासाठी आम्ही तत्पर आहोत!',
      hotelName,
    ].join('\n')
  }

  // Default: English
  return [
    `Dear ${guest.fullname},`,
    '',
    `Your booking at ${hotelName} is confirmed! 🏨`,
    '',
    `Booking Ref: ${booking.booking_ref}`,
    `Check-in: ${checkIn}`,
    `Check-out: ${checkOut}`,
    `Nights: ${booking.nights}`,
    `Total: ${total}`,
    `Balance due on arrival: ${balance}`,
    '',
    'We look forward to welcoming you!',
    hotelName,
  ].join('\n')
}
