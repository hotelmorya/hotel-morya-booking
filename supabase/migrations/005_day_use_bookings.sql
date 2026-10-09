-- Day-use ("day room") bookings — short stays of a few hours (bath/rest before
-- darshan). Modeled as a normal single-night booking flagged stay_type='day_use':
-- check_out = check_in + 1 so the room is held for that day and the existing
-- availability/overlap/holds math is unchanged. Pricing uses a flat per-room-type
-- day_use_rate instead of nights × rate. Reports separate day-use from room-nights.

-- Opt-in flat day-use rate per room type. NULL = this type is not offered as a
-- day room (e.g. a hall). >= 0 when set.
alter table room_types
  add column if not exists day_use_rate numeric(10,2)
  check (day_use_rate is null or day_use_rate >= 0);

-- Stay type. Default 'overnight' keeps every existing booking unchanged.
do $$ begin
  create type stay_type as enum ('overnight', 'day_use');
exception when duplicate_object then null;
end $$;

alter table bookings
  add column if not exists stay_type stay_type not null default 'overnight';
