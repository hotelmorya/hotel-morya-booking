-- Occupancy integrity (§28): a room with a checked-in guest must stay 'occupied'.
-- Blocks manual / housekeeping status drift (e.g. setting it to cleaning or
-- available) that would hide an in-house guest and let the check-in picker
-- double-assign the room. The normal check-out flow flips the booking to
-- checked_out BEFORE setting the room to cleaning, so it is NOT blocked.
create or replace function guard_room_status_occupied()
returns trigger as $$
begin
  if new.status is distinct from old.status
     and new.status <> 'occupied'
     and exists (
       select 1 from booking_rooms br
       join bookings b on b.id = br.booking_id
       where br.room_id = new.id
         and b.status = 'checked_in'
         and b.deleted_at is null
     )
  then
    raise exception 'Room % has a checked-in guest and cannot be set to %.',
      new.room_number, new.status;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_guard_room_status_occupied
  before update of status on rooms
  for each row execute function guard_room_status_occupied();

-- One-time reconcile: rooms whose physical status drifted away from the booking
-- truth while a guest is still checked in (e.g. room 102). Setting to 'occupied'
-- is permitted by the guard above.
update rooms r
set status = 'occupied'
where r.deleted_at is null
  and r.status <> 'occupied'
  and exists (
    select 1 from booking_rooms br
    join bookings b on b.id = br.booking_id
    where br.room_id = r.id and b.status = 'checked_in' and b.deleted_at is null
  );
