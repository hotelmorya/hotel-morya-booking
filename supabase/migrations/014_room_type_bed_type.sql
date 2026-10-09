-- 014_room_type_bed_type.sql
-- Add bed_type + number_of_beds to room_types.
-- bed_type: curated set, nullable (halls may leave it blank).
-- number_of_beds: integer ≥ 1, default 1.

alter table room_types
  add column if not exists bed_type text
    check (bed_type is null or bed_type in
      ('Single','Twin','Double','Queen','King','Bunk Bed','Floor Mattress')),
  add column if not exists number_of_beds smallint not null default 1
    check (number_of_beds > 0);
