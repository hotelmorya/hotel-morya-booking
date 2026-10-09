-- Phase 4 QA fix: room status change crashed with
--   "insert or update on table activity_log violates foreign key constraint
--    activity_log_user_id_fkey"
--
-- Root cause: activity_log.user_id references public.users(id) (the staff profile
-- PK). The profile is linked to auth via a SEPARATE column, users.auth_user_id.
-- Migration 003 made log_room_activity() fall back to auth.uid(), assuming
-- auth.uid() == users.id — but it is the auth.users id, which only ever matches
-- users.auth_user_id, never users.id. So every status change inserted a user_id
-- that violated the FK and rolled back the whole UPDATE.
--
-- Fix #1 (correctness): resolve the actor to users.id via the auth_user_id map.
-- Fix #2 (§31 invariant): wrap every activity-log trigger so a failed log write
--   can never roll back the primary mutation. Activity logging is never
--   load-bearing. user_id is nullable, so an unresolved actor logs anonymously.
--
-- create or replace drops the search_path pin from migration 002, so re-declare it.

-- Room ------------------------------------------------------------------------
create or replace function log_room_activity()
returns trigger as $$
declare
  v_user uuid := nullif(current_setting('app.current_user_id', true), '')::uuid;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- app.current_user_id (if set) is already a users.id; otherwise resolve the
    -- authenticated request's auth.uid() to its staff-profile PK.
    if v_user is null then
      select id into v_user from public.users where auth_user_id = auth.uid();
    end if;
    insert into activity_log(user_id, entity_type, entity_id, action, metadata)
    values (v_user, 'room', new.id, 'status_changed',
            jsonb_build_object('room_number', new.room_number, 'from', old.status, 'to', new.status));
  end if;
  return null;
exception when others then
  return null;  -- §31: never roll back the room update on a log failure
end;
$$ language plpgsql set search_path = public;

-- Booking ---------------------------------------------------------------------
create or replace function log_booking_activity()
returns trigger as $$
declare
  v_user uuid := nullif(current_setting('app.current_user_id', true), '')::uuid;
begin
  if tg_op = 'INSERT' then
    insert into activity_log(user_id, entity_type, entity_id, action, metadata)
    values (coalesce(v_user, new.created_by), 'booking', new.id, 'created',
            jsonb_build_object('ref', new.booking_ref, 'status', new.status, 'source', new.source));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into activity_log(user_id, entity_type, entity_id, action, metadata)
    values (coalesce(v_user, new.updated_by), 'booking', new.id, 'status_changed',
            jsonb_build_object('ref', new.booking_ref, 'from', old.status, 'to', new.status));
  elsif tg_op = 'UPDATE' and new.deleted_at is not null and old.deleted_at is null then
    insert into activity_log(user_id, entity_type, entity_id, action, metadata)
    values (coalesce(v_user, new.deleted_by), 'booking', new.id, 'deleted_soft',
            jsonb_build_object('ref', new.booking_ref));
  end if;
  return null;
exception when others then
  return null;  -- §31: never roll back the booking mutation on a log failure
end;
$$ language plpgsql set search_path = public;

-- Payment ---------------------------------------------------------------------
create or replace function log_payment_activity()
returns trigger as $$
declare
  v_user uuid := nullif(current_setting('app.current_user_id', true), '')::uuid;
begin
  if tg_op = 'INSERT' then
    insert into activity_log(user_id, entity_type, entity_id, action, metadata)
    values (coalesce(v_user, new.recorded_by), 'payment', new.id, 'recorded',
            jsonb_build_object('booking_id', new.booking_id, 'amount', new.amount, 'method', new.method));
  end if;
  return null;
exception when others then
  return null;  -- §31: never roll back the payment insert on a log failure
end;
$$ language plpgsql set search_path = public;
