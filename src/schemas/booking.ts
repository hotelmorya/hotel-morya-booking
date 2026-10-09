import { z } from 'zod'

import { isoDate, money, uuidLike } from './shared'

export const bookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'not_arrived',
])

export const bookingSourceSchema = z.enum([
  'website',
  'walkin',
  'phone',
  'whatsapp',
])

// 'day_use' = short stay of a few hours (bath/rest). Stored as a single-night
// booking (check_out = check_in + 1) so availability/holds are unchanged; the
// flag drives flat day-use pricing + display. See migration 005.
export const stayTypeSchema = z.enum(['overnight', 'day_use'])

// Vehicle captured per stay at check-in. 'none' is an explicit valid choice for
// guests arriving by ST bus / shared transport / on foot. Admin English-only.
export const vehicleTypeSchema = z.enum([
  'two_wheeler',
  'car',
  'bus_tempo',
  'auto',
  'other',
  'none',
])

export type VehicleType = z.infer<typeof vehicleTypeSchema>

// Shared by the check-in dialog, booking detail edit, and print receipt.
export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  two_wheeler: '2-wheeler',
  car: 'Car',
  bus_tempo: 'Bus / Tempo',
  auto: 'Auto',
  other: 'Other',
  none: 'None (no vehicle)',
}

// Vehicle fields + the "number required unless type = none" refine, reused by
// both the check-in schema and the booking-detail set_vehicle PATCH.
const vehicleFields = {
  vehicle_type: vehicleTypeSchema,
  vehicle_number: z.string().trim().max(20).optional(),
}
const requireNumberUnlessNone = (v: {
  vehicle_type: VehicleType
  vehicle_number?: string
}) => v.vehicle_type === 'none' || !!v.vehicle_number?.trim()

// Three-layer Zod (CLAUDE.md §16): the SAME schema is the RHF resolver in
// CheckInDialog AND the safeParse gate in POST /api/bookings/[id]/checkin.
export const checkInSchema = z
  .object({
    updated_at: z.string(),
    assignments: z
      .array(
        z.object({
          booking_room_id: z.string().uuid(),
          room_id: z.string().uuid(),
        })
      )
      .min(1, 'Assign at least one room'),
    actual_check_in: z.string().optional(),
    ...vehicleFields,
  })
  .refine(requireNumberUnlessNone, {
    message: 'Vehicle number is required',
    path: ['vehicle_number'],
  })

export type CheckInInput = z.infer<typeof checkInSchema>

// Edit-after-check-in PATCH (booking detail). Same vehicle rule, no assignments.
export const setVehicleSchema = z
  .object(vehicleFields)
  .refine(requireNumberUnlessNone, {
    message: 'Vehicle number is required',
    path: ['vehicle_number'],
  })

export type SetVehicleInput = z.infer<typeof setVehicleSchema>

// One line per room booked — by room type; the specific room is assigned at
// check-in. rate_per_night is snapshotted so later rate changes never affect
// existing bookings.
export const bookingRoomSchema = z.object({
  room_type_id: uuidLike,
  room_id: z.string().uuid().nullable().optional(),
  rate_per_night: money,
  nights: z.coerce.number().int().positive(),
})

export const bookingSchema = z
  .object({
    guest_id: z.string().uuid().optional(), // omitted when guest is created in the same request
    check_in: isoDate,
    check_out: isoDate,
    stay_type: stayTypeSchema.default('overnight'),
    // Optional expected time window for day-use stays (HH:MM, 24h). Blank → undefined.
    day_use_from: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time').optional()
    ),
    day_use_to: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time').optional()
    ),
    source: bookingSourceSchema.default('website'),
    rooms: z.array(bookingRoomSchema).min(1, 'Select at least one room'),
    total_amount: money,
    discount_amount: money.default(0),
    discount_reason: z.string().trim().max(100).optional(),
    gst_amount: money.default(0),
    special_requests: z.string().trim().optional(),
    additional_guests: z.string().trim().optional(),
    group_ref: z.string().trim().max(20).optional(),
    is_backdated: z.boolean().default(false),
    backdated_reason: z.string().trim().max(255).optional(),
    // Frontend-generated UUID; duplicate submissions within 5 min return the
    // existing booking instead of creating another.
    idempotency_key: z.string().uuid().optional(),
  })
  .refine((b) => b.check_out > b.check_in, {
    message: 'Check-out must be after check-in',
    path: ['check_out'],
  })
  // A day-use stay occupies exactly one night slot (check_out = check_in + 1 day).
  .refine(
    (b) =>
      b.stay_type !== 'day_use' ||
      new Date(b.check_out).getTime() - new Date(b.check_in).getTime() ===
        86_400_000,
    { message: 'Day-use stays cover a single day', path: ['check_out'] }
  )
  .refine((b) => b.discount_amount === 0 || !!b.discount_reason?.trim(), {
    message: 'A reason is required when applying a discount',
    path: ['discount_reason'],
  })
  .refine((b) => !b.is_backdated || !!b.backdated_reason?.trim(), {
    message: 'A reason is required for backdated bookings',
    path: ['backdated_reason'],
  })

export type BookingInput = z.infer<typeof bookingSchema>

export const cancelBookingSchema = z.object({
  cancellation_reason: z.string().trim().min(3, 'Reason is required').max(255),
})
