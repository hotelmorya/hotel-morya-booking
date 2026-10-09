-- 015_room_type_number_of_beds_optional.sql
-- Halls (Mini Hall, Big Hall) have no beds, so number_of_beds must be optional.
-- The existing "number_of_beds > 0" CHECK already permits NULL (NULL > 0 is
-- unknown, so the constraint is satisfied), so we only drop NOT NULL + default.
alter table room_types
  alter column number_of_beds drop not null,
  alter column number_of_beds drop default;

-- Clear beds on existing halls (data fix; they have no beds).
update room_types
set number_of_beds = null
where deleted_at is null
  and name->>'en' ilike '%hall%';
