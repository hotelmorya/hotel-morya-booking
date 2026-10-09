-- Integrity (§17): a room with a checked-in guest must not be removed. Soft
-- delete excludes the room from availability/grids, which would orphan the
-- in-house guest (no room to check out / show as occupied). Block it; staff
-- must check the guest out (or reassign) first.
create or replace function guard_room_delete_occupied()
returns trigger as $$
begin
  if new.deleted_at is not null and old.deleted_at is null
     and exists (
       select 1 from booking_rooms br
       join bookings b on b.id = br.booking_id
       where br.room_id = new.id
         and b.status = 'checked_in'
         and b.deleted_at is null
     )
  then
    raise exception 'Room % has a checked-in guest and cannot be removed. Check the guest out first.',
      new.room_number;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_guard_room_delete_occupied
  before update of deleted_at on rooms
  for each row execute function guard_room_delete_occupied();
