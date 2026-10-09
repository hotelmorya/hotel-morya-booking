import { z } from 'zod'

import { uuidLike } from './shared'

export const roomStatusSchema = z.enum([
  'available',
  'occupied',
  'cleaning',
  'maintenance',
])

export const roomSchema = z.object({
  room_type_id: uuidLike,
  room_number: z.string().trim().min(1, 'Room number is required').max(10),
  floor: z.coerce.number().int().min(0).max(50).default(0),
  status: roomStatusSchema.default('available'),
})

export type RoomInput = z.infer<typeof roomSchema>
