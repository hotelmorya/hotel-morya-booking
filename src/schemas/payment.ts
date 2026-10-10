import { z } from 'zod'
import { uuidLike } from './shared'

export const paymentMethodSchema = z.enum([
  'upi',
  'cash',
  'card',
  'bank',
])

export const paymentStatusSchema = z.enum([
  'pending',
  'success',
  'failed',
  'refunded',
])

// Payments are immutable facts — there is no "edit payment" schema.
// Corrections are made by adding a counter entry, never by editing.
export const paymentSchema = z.object({
  booking_id: uuidLike,
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  method: paymentMethodSchema,
  reference_note: z.string().trim().max(255).optional(), // UTR for UPI, last-4 for card, etc.
  status: paymentStatusSchema.default('success'),
})

export type PaymentInput = z.infer<typeof paymentSchema>
