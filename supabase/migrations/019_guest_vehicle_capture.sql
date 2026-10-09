-- 019_guest_vehicle_capture
-- Capture the guest's vehicle (type + number) per stay at check-in, plus a
-- convenience "last vehicle" pre-fill on the guest for repeat pilgrims.
--
-- Columns are NULLABLE by design: pending/confirmed bookings have no vehicle
-- yet. The "vehicle is required at check-in" rule (and "number required unless
-- type = none") is enforced at check-in time in the API + form (CLAUDE.md §16
-- three-layer Zod), NOT via a NOT NULL / CHECK constraint.

-- 1) Vehicle type enum (follows the existing enum convention, e.g. stay_type).
create type vehicle_type as enum ('two_wheeler', 'car', 'bus_tempo', 'auto', 'other', 'none');

-- 2) Per-stay vehicle on the booking (canonical source of truth for the stay).
alter table bookings
  add column vehicle_type   vehicle_type,        -- gated at check-in time, nullable by design
  add column vehicle_number varchar(20);

-- 3) Convenience pre-fill on the guest, updated on each check-in.
alter table guests
  add column last_vehicle_type   vehicle_type,
  add column last_vehicle_number varchar(20);
