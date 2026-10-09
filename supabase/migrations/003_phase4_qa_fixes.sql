-- Phase 4 QA fixes.
--   #4  Booking idempotency (§30): store the frontend-generated key and enforce
--       one booking per key so a duplicate submit can't create a second booking.
--   #5  Room-activity attribution: log_room_activity had no actor fallback, so
--       check-in/out room status changes logged anonymously. Fall back to
--       auth.uid() (set by Supabase for RLS-authenticated requests).

-- #4 ---------------------------------------------------------------------------
alter table bookings add column if not exists idempotency_key uuid;

create unique index if not exists bookings_idempotency_key_idx
  on bookings(idempotency_key) where idempotency_key is not null;

-- #5 ---------------------------------------------------------------------------
-- create or replace drops the search_path pin from migration 002, so re-declare it.
create or replace function log_room_activity()
returns trigger as $$
declare
  v_user uuid := nullif(current_setting('app.current_user_id', true), '')::uuid;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into activity_log(user_id, entity_type, entity_id, action, metadata)
    values (coalesce(v_user, auth.uid()), 'room', new.id, 'status_changed',
            jsonb_build_object('room_number', new.room_number, 'from', old.status, 'to', new.status));
  end if;
  return null;
end;
$$ language plpgsql set search_path = public;
