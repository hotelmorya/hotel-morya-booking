// GET /api/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N
//
// PUBLIC — no auth required (public booking flow).
// Returns per-room-type availability + stay pricing.
// Target: < 300 ms (two tight Supabase queries via roomsAvailableByType).

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { roomsAvailableByType } from '@/lib/availability'
import { currentDateIST } from '@/lib/format'
import { quoteStay, type RateOverride } from '@/lib/pricing'
import type { HotelAutoCancel } from '@/lib/auto-cancel'

// ── Validation schema ─────────────────────────────────────────────────────────

const availabilitySchema = z
  .object({
    check_in: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'check_in must be YYYY-MM-DD'),
    check_out: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'check_out must be YYYY-MM-DD'),
    guests: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 1))
      .pipe(z.number().int().min(1).max(100)),
  })
  .refine((d) => d.check_out > d.check_in, {
    message: 'check_out must be after check_in',
    path: ['check_out'],
  })

// ── Types ─────────────────────────────────────────────────────────────────────

type MultilingualText = { en?: string; mr?: string; hi?: string } | string | null

function pickText(val: MultilingualText): { en: string; mr: string; hi: string } {
  if (!val || typeof val === 'string') {
    const s = val ?? ''
    return { en: s, mr: s, hi: s }
  }
  const en = val.en ?? ''
  return { en, mr: val.mr ?? en, hi: val.hi ?? en }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // 1. Parse + validate query params
  const url = request.nextUrl
  const raw = {
    check_in: url.searchParams.get('check_in') ?? '',
    check_out: url.searchParams.get('check_out') ?? '',
    guests: url.searchParams.get('guests') ?? undefined,
  }

  const parsed = availabilitySchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    )
  }

  const { check_in, check_out, guests } = parsed.data

  // 2. Server client (anon, RLS — public read policies cover rooms/room_types/rate_overrides)
  const supabase = await createClient()

  /*
   * Availability is read with the SERVICE-ROLE client, not the request's anon
   * client, and that is load-bearing rather than a shortcut.
   *
   * `bookings` has no public SELECT policy — only `staff_manage_bookings`, which
   * requires a staff role. A public visitor therefore reads ZERO bookings through
   * RLS, so `roomsAvailableByType()` counts nothing as taken and reports a full
   * hotel as entirely free. Proved against a live database: with a real booking
   * present, `set role anon; select count(*) from bookings` returns 0.
   *
   * The failure is quiet and expensive. The room picker offers rooms that are
   * gone, holds are placed against inventory that does not exist, and the guest
   * is only stopped at the final step by POST /api/public/bookings, which already
   * uses the service-role client and does see the truth — so they fill in the
   * whole form to be told "sorry, those rooms were just taken."
   *
   * Giving anon a SELECT policy on `bookings` would fix the count and expose
   * every guest's stay to anyone holding the publishable key, so it is not an
   * option. This route runs server-side only and returns aggregate counts, never
   * a booking row, so reading past RLS here leaks nothing.
   *
   * Consequence: SUPABASE_SERVICE_ROLE_KEY is now required by the PUBLIC pages,
   * not only by /admin.
   */
  const admin = createAdminClient()

  // 3. Hotel settings — need auto_cancel params for expired-pending filtering
  //    and potentially gst_rate for response enrichment (caller can opt-in later).
  const { data: settings, error: settingsErr } = await supabase
    .from('hotel_settings')
    .select('auto_cancel_hours_after_booking, min_hours_before_checkin, gst_enabled, gst_rate, upi_qr_url, upi_id, phone, whatsapp')
    .limit(1)
    .maybeSingle()

  if (settingsErr) {
    return Response.json(
      { error: { code: 'INTERNAL', message: settingsErr.message } },
      { status: 500 }
    )
  }

  const hotelAutoCancel: HotelAutoCancel = {
    auto_cancel_hours_after_booking: settings?.auto_cancel_hours_after_booking ?? 24,
    min_hours_before_checkin: settings?.min_hours_before_checkin ?? 6,
  }

  // 4. Room types (active, not deleted) — fetched in parallel with availability
  const { data: roomTypesRaw, error: rtErr } = await supabase
    .from('room_types')
    .select('id, name, description, base_rate, max_guests, amenities')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (rtErr) {
    return Response.json(
      { error: { code: 'INTERNAL', message: rtErr.message } },
      { status: 500 }
    )
  }

  // 5. Rate overrides for any room type overlapping the stay
  //    (start_date <= check_out-1  AND  end_date >= check_in)
  const { data: overridesRaw, error: ovErr } = await supabase
    .from('rate_overrides')
    .select('id, room_type_id, start_date, end_date, rate, label')
    .lte('start_date', check_out)
    .gte('end_date', check_in)

  if (ovErr) {
    return Response.json(
      { error: { code: 'INTERNAL', message: ovErr.message } },
      { status: 500 }
    )
  }

  // Group overrides by room_type_id
  const overridesByType: Record<string, RateOverride[]> = {}
  for (const ov of overridesRaw ?? []) {
    const tid = ov.room_type_id as string
    if (!overridesByType[tid]) overridesByType[tid] = []
    overridesByType[tid].push({
      start_date: ov.start_date as string,
      end_date: ov.end_date as string,
      rate: Number(ov.rate),
    })
  }

  // 6. Availability counts
  let availability: Awaited<ReturnType<typeof roomsAvailableByType>>
  try {
    availability = await roomsAvailableByType({
      supabase: admin,
      checkIn: check_in,
      checkOut: check_out,
      settings: hotelAutoCancel,
    })
  } catch (e) {
    return Response.json(
      { error: { code: 'INTERNAL', message: (e as Error).message } },
      { status: 500 }
    )
  }

  // Index availability by room_type_id for O(1) lookup
  const availMap = new Map(availability.map((a) => [a.room_type_id, a]))

  // 6b. Day-use "may free up" signal. A checked-in day-use ("few hours") booking
  //     blocks the room for tonight only until it's checked out — so a type that
  //     is sold out *because* of an in-progress day-use today can honestly tell
  //     the guest it may free up this evening (call to check). We do NOT mark it
  //     bookable (an overnight stay would collide with the day-use hours) — just
  //     surface a soft note + call CTA so we don't silently lose the lead.
  const today = currentDateIST()
  const todayInWindow = check_in <= today && today < check_out
  const dayUseFreeingTypes = new Set<string>()
  if (todayInWindow) {
    const { data: dayUseRaw } = await supabase
      .from('bookings')
      .select('booking_rooms(room_type_id)')
      .eq('status', 'checked_in')
      .eq('stay_type', 'day_use')
      .eq('check_in', today)
      .is('deleted_at', null)
    for (const b of dayUseRaw ?? []) {
      for (const br of (b.booking_rooms as Array<{ room_type_id: string }>) ?? []) {
        dayUseFreeingTypes.add(br.room_type_id)
      }
    }
  }

  // 7. Build response: one entry per room type that has ≥ 1 available room
  //    AND max_guests >= requested guest count
  const roomTypes = []

  for (const rt of roomTypesRaw ?? []) {
    const typeId = rt.id as string
    const avail = availMap.get(typeId)
    const availableCount = avail?.available_count ?? 0

    // Filter by guest capacity
    const maxGuests = rt.max_guests as number
    if (maxGuests < guests) continue

    const baseRate = Number(rt.base_rate)
    const overrides = overridesByType[typeId] ?? []

    const quote = quoteStay({
      baseRate,
      overrides,
      checkIn: check_in,
      checkOut: check_out,
    })

    roomTypes.push({
      id: typeId,
      name: pickText(rt.name as MultilingualText),
      description: pickText(rt.description as MultilingualText),
      max_guests: maxGuests,
      amenities: (rt.amenities as string[]) ?? [],
      available_count: availableCount,
      // Sold out only because an in-progress day-use is vacating later today.
      day_use_freeing: availableCount === 0 && dayUseFreeingTypes.has(typeId),
      pricing: {
        base_rate: baseRate,
        nights: quote.nights,
        subtotal: quote.subtotal,
        breakdown: quote.breakdown,
        /*
         * Whether an override actually applied to the REQUESTED dates, decided
         * from the resolved nightly breakdown rather than from the mere
         * existence of an override row for this room type.
         *
         * The previous version keyed the badge off `override_label` being
         * truthy and looked the label up with a plain find() on room_type_id.
         * That failed two ways. An override saved without a label yields "",
         * which is falsy, so no badge rendered at all and the guest saw an
         * unexplained higher price. And the find() ignored dates entirely, so
         * a room type with two overrides could announce the name of a festival
         * in a different month than the one being booked.
         */
        has_override: quote.breakdown.some((n) => n.rate !== baseRate),
        override_label: (() => {
          const firstOverridden = quote.breakdown.find((n) => n.rate !== baseRate)
          if (!firstOverridden) return null
          const applied = (overridesRaw ?? []).find(
            (o) =>
              o.room_type_id === typeId &&
              (o.start_date as string) <= firstOverridden.date &&
              (o.end_date as string) >= firstOverridden.date
          )
          // An empty label is not a label; fall back to generic wording.
          const label = (applied?.label as string | null)?.trim()
          return label ? label : null
        })(),
      },
    })
  }

  return Response.json({
    data: {
      check_in,
      check_out,
      guests,
      room_types: roomTypes,
      gst: {
        enabled: settings?.gst_enabled ?? false,
        rate: Number(settings?.gst_rate ?? 0),
      },
      // Which public payment paths are offered. "Pay at hotel" is always
      // available; UPI-QR depends on hotel configuration.
      payment: {
        // Public QR image guests scan to pay by UPI (null = UPI-QR not offered).
        upi_qr_url: settings?.upi_qr_url ?? null,
        // UPI VPA for the mobile "Pay with UPI app" deep link (null = not set).
        upi_id: settings?.upi_id ?? null,
      },
      // Hotel contact for soft fallbacks (e.g. day-use "call to check" CTA).
      contact: {
        phone: settings?.phone ?? '',
        whatsapp: settings?.whatsapp ?? '',
      },
    },
  })
}
