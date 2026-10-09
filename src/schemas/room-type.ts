import { z } from 'zod'

import { money, multilingualText } from './shared'

// Curated bed types — kept in sync with the DB CHECK constraint (migration 014).
export const BED_TYPES = [
  'Single',
  'Twin',
  'Double',
  'Queen',
  'King',
  'Bunk Bed',
  'Floor Mattress',
] as const

export const roomTypeSchema = z.object({
  name: multilingualText,
  description: multilingualText.partial().default({}),
  base_rate: money,
  // Opt-in flat rate for day-use ("day room") short stays. null/blank = this
  // room type is not offered as a day room. Empty string coerces to null.
  day_use_rate: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    money.nullable()
  ),
  max_guests: z.coerce.number().int().min(1).max(100),
  // Bed configuration. bed_type is optional (halls may leave it blank); empty
  // string coerces to null. number_of_beds defaults to 1.
  bed_type: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.enum(BED_TYPES).nullable()
  ),
  // Optional — halls have no beds. Empty string coerces to null.
  number_of_beds: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(1).max(100).nullable()
  ),
  amenities: z.array(z.string().trim().min(1)).default([]),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).default(0),
})

export type RoomTypeInput = z.infer<typeof roomTypeSchema>
