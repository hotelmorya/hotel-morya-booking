-- 022_race_safe_booking_ref.sql
--
-- Race-safe booking references.
--
-- nextBookingRef() was SELECT max(booking_ref) + 1 in application code, in a
-- round-trip separate from the INSERT that consumed the result. Two requests
-- that read before either writes compute the same reference; one loses to the
-- unique constraint on bookings.booking_ref and is retried by the caller. That
-- is a lost-update race dressed as a retry loop, and no locking inside the
-- SELECT fixes it, because the allocation and the insert are not in the same
-- transaction.
--
-- A counter table rather than a sequence: the reference resets per IST year, so
-- a single sequence cannot express it and per-year sequences would have to be
-- created on the fly. And rather than an advisory lock: that would be released
-- when the allocating statement's transaction ended, which is BEFORE the booking
-- row exists, so the next caller would read the same max() anyway.
--
-- INSERT ... ON CONFLICT DO UPDATE ... RETURNING on a one-row-per-year counter
-- is atomic in a single statement. A concurrent caller blocks on the row lock,
-- then re-reads the committed value and increments from it. Verified on a live
-- database by firing 60 concurrent allocations: 60 distinct, contiguous, zero
-- duplicates.
--
-- Consequence, accepted deliberately: references can now have GAPS, because one
-- is allocated before the booking insert and a failed insert burns it. The old
-- scheme was gapless precisely because it re-derived from the table, which is
-- what made it racy — and it would happily REUSE the reference of a hard-deleted
-- booking, pointing two different stays at one number in the email trail.
-- Unique matters; gapless does not.

create table if not exists public.booking_ref_counters (
  year      integer primary key,
  last_seq  integer not null default 0 check (last_seq >= 0)
);

comment on table public.booking_ref_counters is
  'One row per IST year holding the last allocated booking_ref sequence. Written only by next_booking_ref().';

-- No policies, deliberately. Only the service-role client (which bypasses RLS)
-- allocates references. RLS is enabled so a future anon or authenticated caller
-- is denied by default rather than by omission.
alter table public.booking_ref_counters enable row level security;

-- Seed from what already exists so the counter can never hand out a reference
-- that is already on a booking. Soft-deleted rows are INCLUDED: the unique
-- constraint on booking_ref does not filter deleted_at, so their references are
-- still taken.
insert into public.booking_ref_counters (year, last_seq)
select
  (substring(booking_ref from 4 for 4))::int,
  max((substring(booking_ref from 9))::int)
from public.bookings
where booking_ref ~ '^BK-[0-9]{4}-[0-9]+$'
group by 1
on conflict (year) do update
  set last_seq = greatest(public.booking_ref_counters.last_seq, excluded.last_seq);

create or replace function public.next_booking_ref()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  -- IST, not UTC. A booking taken at 05:00 IST on 1 January belongs to the new
  -- year; UTC would still read 31 December and issue an old-year reference.
  v_year int := extract(year from (now() at time zone 'Asia/Kolkata'))::int;
  v_seq  int;
begin
  insert into public.booking_ref_counters as c (year, last_seq)
  values (v_year, 1)
  on conflict (year) do update
    set last_seq = c.last_seq + 1
  returning c.last_seq into v_seq;

  -- lpad pads but never truncates, so passing 9999 in a year yields
  -- BK-2026-10000 rather than a silently mangled reference.
  return 'BK-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

comment on function public.next_booking_ref() is
  'Atomically allocates the next BK-YYYY-NNNN reference for the current IST year. Service-role only.';

-- Postgres grants EXECUTE on new functions to PUBLIC by default, which would put
-- a counter-incrementing function behind the publishable key that ships in the
-- browser bundle.
revoke execute on function public.next_booking_ref() from public;
revoke execute on function public.next_booking_ref() from anon;
revoke execute on function public.next_booking_ref() from authenticated;
grant  execute on function public.next_booking_ref() to service_role;
