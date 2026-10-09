-- 021_drop_otp_attempts.sql
--
-- Drop otp_attempts.
--
-- Guest OTP was replaced by Cloudflare Turnstile and nothing in this codebase
-- reads or writes this table. It was never dropped, so it is still here.
--
-- It is not merely dead weight. Migration 001 creates it with two policies:
--
--   public_create_otp  for insert  with check (true)
--   public_update_otp  for update  with check (true)
--
-- which makes it an anonymously INSERT- and UPDATE-able table with no reader,
-- no rate limit and no expiry sweep. Anyone holding the publishable key — which
-- ships in the browser bundle by design — can write to it until the disk quota
-- is gone. Dropping the table drops those policies and its indexes with it.

drop table if exists public.otp_attempts;
