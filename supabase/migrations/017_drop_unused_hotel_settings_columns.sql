-- 017_drop_unused_hotel_settings_columns
-- Public site is non-CMS: branding/identity is hardcoded, not editable in admin.
-- Drop the now-unused hotel_settings columns. `name` is kept (receipts/emails).
-- The UNIQUE index hotel_settings_slug_key drops automatically with the slug column.

ALTER TABLE public.hotel_settings
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS logo_public_id,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS google_maps_url,
  DROP COLUMN IF EXISTS facebook_url,
  DROP COLUMN IF EXISTS instagram_url,
  DROP COLUMN IF EXISTS gmb_url,
  DROP COLUMN IF EXISTS cancellation_policy;
