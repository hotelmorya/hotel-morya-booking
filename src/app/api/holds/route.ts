// POST   /api/holds         — Create a 5-minute hold for a room type
// DELETE /api/holds?session_id=  — Release all holds for a session
//
// PUBLIC — no auth required (public booking flow).
// Holds use lazy expiry; expired rows are never cleaned up synchronously.
// Queries always filter expires_at > now().

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { uuidLike } from '@/schemas/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { roomsAvailableByType } from '@/lib/availability'
import { createHolds, releaseHolds } from '@/lib/holds'
import type { HotelAutoCancel } from '@/lib/auto-cancel'

// ── Validation schema ─────────────────────────────────────────────────────────

const createHoldSchema = z
  .object({
    room_type_id: uuidLike,
    check_in: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'check_in must be YYYY-MM-DD'),
    check_out: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'check_out must be YYYY-MM-DD'),
    session_id: z
      .string()
      .min(1, 'session_id is required')
      .max(100, 'session_id too long'),
    quantity: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .default(1),
  })
  .refine((d) => d.check_out > d.check_in, {
    message: 'check_out must be after check_in',
    path: ['check_out'],
  })

// ── POST — create hold ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: 'Request body must be valid JSON' } },
      { status: 400 }
    )
  }

  const parsed = createHoldSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    )
  }

  const { room_type_id, check_in, check_out, session_id, quantity } = parsed.data

  // Note: holds are NOT Turnstile-gated. Bot protection is enforced once, at
  // booking creation (POST /api/public/bookings), with a fresh single-use token.
  // Holds are transient (5-min lazy expiry) and cannot convert to a lasting
  // booking without passing Turnstile, so they are not a durable abuse vector.

  // 2. Anon RLS client — the hold INSERT below stays on it, which is what
  //    public_create_holds exists for.
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

  // 4. Hotel settings for auto-cancel deadline (needed for availability check)
  const { data: settings } = await supabase
    .from('hotel_settings')
    .select('auto_cancel_hours_after_booking, min_hours_before_checkin')
    .limit(1)
    .maybeSingle()

  const hotelAutoCancel: HotelAutoCancel = {
    auto_cancel_hours_after_booking: settings?.auto_cancel_hours_after_booking ?? 24,
    min_hours_before_checkin: settings?.min_hours_before_checkin ?? 6,
  }

  // 5. Re-check availability for this room type — must have enough rooms
  //    (accounts for already-active holds from this session too)
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

  const typeAvail = availability.find((a) => a.room_type_id === room_type_id)
  const availableCount = typeAvail?.available_count ?? 0

  if (availableCount < quantity) {
    return Response.json(
      {
        error: {
          code: 'NOT_AVAILABLE',
          message:
            availableCount === 0
              ? 'No rooms available for the selected dates'
              : `Only ${availableCount} room${availableCount === 1 ? '' : 's'} available`,
          available_count: availableCount,
        },
      },
      { status: 409 }
    )
  }

  // 6. Create the hold rows
  let holds: Awaited<ReturnType<typeof createHolds>>
  try {
    holds = await createHolds({
      supabase,
      roomTypeId: room_type_id,
      checkIn: check_in,
      checkOut: check_out,
      sessionId: session_id,
      quantity,
    })
  } catch (e) {
    return Response.json(
      { error: { code: 'INTERNAL', message: (e as Error).message } },
      { status: 500 }
    )
  }

  // expires_at is the same for all rows (DB default now()+5min)
  const expiresAt = holds[0]?.expires_at ?? null

  return Response.json(
    {
      data: {
        holds,
        expires_at: expiresAt,
        available_count: availableCount,
      },
    },
    { status: 201 }
  )
}

// ── DELETE — release session holds ───────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId || sessionId.trim() === '') {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'session_id query param is required' } },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  let released: number
  try {
    released = await releaseHolds(supabase, sessionId)
  } catch (e) {
    return Response.json(
      { error: { code: 'INTERNAL', message: (e as Error).message } },
      { status: 500 }
    )
  }

  return Response.json({ data: { released } })
}
