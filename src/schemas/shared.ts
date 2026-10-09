import { z } from 'zod'

// Indian mobile: 10 digits starting 6-9 (matches the DB CHECK constraint).
// Stored without +91 — the prefix is added only when building wa.me/SMS links.
export const indianPhone = z
  .string()
  .trim()
  .regex(/^[6-9][0-9]{9}$/, 'Enter a 10-digit mobile number starting with 6-9')

// Multilingual jsonb column shape {en, mr, hi}. English is required as the
// fallback language; Marathi and Hindi are optional.
export const multilingualText = z.object({
  en: z.string().trim().min(1, 'English text is required'),
  mr: z.string().trim().optional(),
  hi: z.string().trim().optional(),
})

export type MultilingualText = z.infer<typeof multilingualText>

export const localeSchema = z.enum(['en', 'mr'])
export type Locale = z.infer<typeof localeSchema>

// ISO date string (yyyy-mm-dd) — all check-in/check-out dates resolve in IST.
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')

export const money = z.coerce.number().nonnegative('Amount cannot be negative')

// UUID shape check (8-4-4-4-12 hex) that accepts ANY version/variant, unlike
// Zod's strict `.uuid()` (RFC 9562, versions 1-8 only). Postgres' `uuid` type
// is version-agnostic, and the single-tenant seed uses readable ids such as
// `10000000-0000-0000-0000-000000000001` for room types — which strict `.uuid()`
// rejects, breaking holds/bookings for those rooms. Validate shape only and let
// the DB (foreign keys) be the source of truth for existence.
export const uuidLike = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Must be a valid UUID',
  )
