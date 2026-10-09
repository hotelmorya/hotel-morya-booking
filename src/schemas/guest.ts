import { z } from 'zod'

import { toTitleCase } from '@/lib/format'
import { indianPhone, localeSchema } from './shared'

export const idProofTypeSchema = z.enum([
  'aadhaar',
  'pan',
  'passport',
  'driving_license',
])

export const guestSchema = z.object({
  fullname: z.string().trim().min(2, 'Name is too short').max(100).transform(toTitleCase),
  email: z.string().trim().email('Enter a valid email').max(255).optional().or(z.literal('')),
  phone: indianPhone,
  id_type: idProofTypeSchema.optional(),
  id_number: z.string().trim().max(20).optional(),
  city: z.string().trim().max(50).optional(),
  address: z.string().trim().max(255).optional(),
  preferred_language: localeSchema.default('en'),
  notes: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
})

export type GuestInput = z.infer<typeof guestSchema>
