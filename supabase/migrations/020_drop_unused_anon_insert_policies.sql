-- 020_drop_unused_anon_insert_policies.sql
--
-- Drop four inherited RLS policies that grant anonymous INSERT and are used by
-- no code path in this repo.
--
--   public_create_guests        on guests        with check (true)
--   public_create_bookings      on bookings      with check (true)
--   public_create_booking_rooms on booking_rooms with check (true)
--   public_create_payments      on payments      with check (true)
--
-- They date from a design where the public booking flow wrote through the anon
-- client. It does not: POST /api/public/bookings runs entirely on the
-- service-role client (createAdminClient()), which bypasses RLS. Every other
-- writer to these four tables is staff-gated — app/api/bookings/route.ts,
-- app/api/guests/route.ts and app/api/bookings/[id]/payments/route.ts all call
-- getUser() and check the profile role against OPERATIONAL before writing, so
-- they run as an authenticated staff user and are covered by staff_manage_*.
-- Checked call site by call site before dropping.
--
-- Left in place they are not merely untidy. The publishable key ships in the
-- browser bundle by design, so anyone who opens devtools can POST straight to
-- PostgREST and:
--
--   * insert bookings that never passed bot protection, the availability
--     re-check or server-side pricing — filling the hotel with rooms nobody is
--     coming to;
--   * insert guests at will;
--   * and worst, insert a payments row with status = 'success' against any
--     booking id. trg_payments_recalc_advance then fires recalc_advance_paid,
--     which sums successful payments into bookings.advance_paid, and balance_due
--     is a generated column derived from it. A stranger can mark a stay as paid
--     in full, and the front desk sees a settled bill.
--
-- booking_holds KEEPS its three permissive policies: POST/DELETE /api/holds
-- genuinely run on the anon client, holds carry no personal data, and they
-- expire in five minutes on their own.

drop policy if exists "public_create_guests"        on public.guests;
drop policy if exists "public_create_bookings"      on public.bookings;
drop policy if exists "public_create_booking_rooms" on public.booking_rooms;
drop policy if exists "public_create_payments"      on public.payments;
