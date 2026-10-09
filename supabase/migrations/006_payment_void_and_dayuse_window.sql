-- 1) advance_paid must ignore soft-deleted payments. The original recalc summed
--    every status='success' row regardless of deleted_at, so voiding a payment
--    (soft delete) left advance_paid — and therefore balance_due — unchanged.
--    §17 says deleting a payment must recalc advance_paid; this makes it true.
--    create or replace drops the search_path pin from migration 002 — re-add it.
create or replace function recalc_advance_paid()
returns trigger as $$
declare
  target_booking uuid;
begin
  target_booking := coalesce(new.booking_id, old.booking_id);
  update bookings
  set advance_paid = (
    select coalesce(sum(amount), 0)
    from payments
    where booking_id = target_booking
      and status = 'success'
      and deleted_at is null
  )
  where id = target_booking;
  return null;
end;
$$ language plpgsql set search_path = public;

-- 2) Optional expected time window for day-use ("day room") bookings, so staff
--    know when the room is taken / frees up. NULL for overnight stays.
alter table bookings add column if not exists day_use_from time;
alter table bookings add column if not exists day_use_to   time;
