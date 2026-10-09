import { z } from 'zod'

import { indianPhone } from './shared'

// Public site is non-CMS: branding/identity fields (slug, description, logo,
// map URL, social links, cancellation policy) were removed from settings and
// dropped from the DB (migration 017). `name` is kept — used on receipts/emails.
const baseHotelSettings = z.object({
    name: z.string().trim().min(2).max(150),
    address: z.string().trim().min(5).max(255),
    city: z.string().trim().max(50).default('Admapur'),
    state: z.string().trim().max(50).default('Maharashtra'),
    phone: indianPhone,
    phone_alt: indianPhone.optional().or(z.literal('')),
    whatsapp: indianPhone.optional().or(z.literal('')),
    email: z.string().trim().email().max(255).optional().or(z.literal('')),

    check_in_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).default('12:00'),
    check_out_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).default('11:00'),

    upi_qr_url: z.string().trim().url().optional().or(z.literal('')),
    // UPI VPA (e.g. hotelkbp@okaxis) — powers the mobile "Pay with UPI app"
    // deep link (upi://pay). Lenient handle@bank check.
    upi_id: z
      .string()
      .trim()
      .regex(/^[^\s@]{2,}@[^\s@]{2,}$/, 'Enter a valid UPI ID (e.g. name@bank)')
      .optional()
      .or(z.literal('')),
    fee_passthrough_enabled: z.boolean().default(false),
    fee_passthrough_percent: z.coerce.number().min(0).max(100).default(3),

    advance_percent: z.coerce.number().min(0).max(100).default(0),
    // Unified auto-cancel timer knobs (lazy expiry — no cron)
    auto_cancel_hours_after_booking: z.coerce.number().int().min(1).max(168).default(24),
    min_hours_before_checkin: z.coerce.number().int().min(0).max(72).default(6),

    gst_enabled: z.boolean().default(false),
    gst_number: z
      .string()
      .trim()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN')
      .optional()
      .or(z.literal('')),
    gst_rate: z.coerce.number().min(0).max(28).default(12),
  })

export const hotelSettingsSchema = baseHotelSettings.refine(
  (s) => !s.gst_enabled || !!s.gst_number,
  {
    message: 'GST number is required when GST is enabled',
    path: ['gst_number'],
  }
)

export type HotelSettingsInput = z.infer<typeof hotelSettingsSchema>

// Partial schema for incremental updates: each settings tab edits only a subset
// of fields, so validating/saving just the provided keys means one tab's save
// never fails on another tab's required fields.
export const hotelSettingsUpdateSchema = baseHotelSettings.partial()
export type HotelSettingsUpdate = z.infer<typeof hotelSettingsUpdateSchema>

// The Policies tab's own fields.
export const policiesSchema = baseHotelSettings.pick({
  advance_percent: true,
  fee_passthrough_enabled: true,
  fee_passthrough_percent: true,
  upi_qr_url: true,
  upi_id: true,
  auto_cancel_hours_after_booking: true,
  min_hours_before_checkin: true,
})
export type PoliciesInput = z.input<typeof policiesSchema>
