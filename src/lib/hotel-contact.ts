import { createClient } from '@/lib/supabase/server'
import { formatClockTime } from '@/lib/format'

export type HotelContact = {
  phone: string
  whatsapp: string
  /** Display-ready check-in/out times from hotel_settings, e.g. "12:00 PM". */
  checkinTime: string
  checkoutTime: string
  /** 24h "HH:MM" from hotel_settings, for schema.org JSON-LD. '' if unavailable. */
  checkinTimeISO: string
  checkoutTimeISO: string
}

/** Postgres `time` "12:00:00" → "12:00" (HH:MM). '' for empty/malformed input. */
function toHHMM(time: unknown): string {
  return typeof time === 'string' && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : ''
}

// Public-facing hotel contact, sourced from hotel_settings (editable in admin)
// rather than build-time env vars. Used by public surfaces (track page, footer,
// contact section) so displayed phone/WhatsApp/reception hours reflect the DB.
// Non-throwing — returns empty strings if settings can't be read, so callers can
// fall back gracefully.
export async function getHotelContact(): Promise<HotelContact> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('hotel_settings')
      .select('phone, whatsapp, check_in_time, check_out_time')
      .limit(1)
      .maybeSingle()
    return {
      phone: data?.phone ?? '',
      whatsapp: data?.whatsapp ?? '',
      checkinTime: formatClockTime(data?.check_in_time)?.toUpperCase() ?? '',
      checkoutTime: formatClockTime(data?.check_out_time)?.toUpperCase() ?? '',
      checkinTimeISO: toHHMM(data?.check_in_time),
      checkoutTimeISO: toHHMM(data?.check_out_time),
    }
  } catch {
    return {
      phone: '',
      whatsapp: '',
      checkinTime: '',
      checkoutTime: '',
      checkinTimeISO: '',
      checkoutTimeISO: '',
    }
  }
}
