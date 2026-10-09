import { z } from 'zod'

import { isoDate, money, uuidLike } from './shared'

// Festival/seasonal pricing. Snapshot-safe: rates are captured into
// booking_rooms at booking time, so overrides never affect existing bookings.
export const rateOverrideSchema = z
  .object({
    room_type_id: uuidLike,
    start_date: isoDate,
    end_date: isoDate,
    rate: money,
    label: z.string().trim().max(60).optional(), // e.g. "Balumama Yatra"
  })
  .refine((r) => r.end_date >= r.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  })

export type RateOverrideInput = z.infer<typeof rateOverrideSchema>
export type RateOverrideFormValues = z.input<typeof rateOverrideSchema>
