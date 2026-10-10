import { z } from 'zod'

import { toTitleCase } from '@/lib/format'
import { indianPhone, isoDate, localeSchema, uuidLike } from './shared'

// Public (guest-facing) booking request. The server is authoritative for price
// and availability — the client total is never trusted. Each line books a
// room TYPE with a quantity; physical rooms are assigned at check-in.
export const publicBookingRoomSchema = z.object({
  room_type_id: uuidLike,
  quantity: z.coerce.number().int().positive().max(10),
})

export const publicBookingSchema = z
  .object({
    guest: z.object({
      fullname: z.string().trim().min(2, 'Name is too short').max(100).transform(toTitleCase),
      phone: indianPhone,
      email: z.string().trim().email('Enter a valid email').max(255),
      city: z.string().trim().min(1, 'City is required').max(50),
      preferred_language: localeSchema.default('en'),
    }),
    check_in: isoDate,
    check_out: isoDate,
    rooms: z.array(publicBookingRoomSchema).min(1, 'Select at least one room'),
    payment_path: z.enum(['hotel', 'upi']).default('hotel'),
    special_requests: z.string().trim().max(500).optional(),
    session_id: z.string().trim().max(100).optional(), // to release holds
    idempotency_key: uuidLike.optional(),
    turnstile_token: z.string().min(1, 'Turnstile token is required'),
  })
  .refine((b) => b.check_out > b.check_in, {
    message: 'Check-out must be after check-in',
    path: ['check_out'],
  })

export type PublicBookingInput = z.infer<typeof publicBookingSchema>
