-- 023_fix_rate_overrides_columns.sql
--
-- Fix rate_overrides columns compatibility.
--
-- The application code, forms, and pricing queries use:
-- (start_date, end_date, rate, label)
-- An earlier schema version created rate_overrides with (from_date, to_date, reason)
-- and NOT NULL constraints. This migration relaxes those legacy constraints,
-- keeps them in sync via a trigger, ensures check constraint on (end_date >= start_date),
-- and creates idx_rate_overrides_lookup.

-- 1. Relax NOT NULL on legacy columns
alter table rate_overrides alter column from_date drop not null;
alter table rate_overrides alter column to_date drop not null;
alter table rate_overrides alter column reason drop not null;
alter table rate_overrides alter column reason set default '';

-- 2. Drop old check constraint if present
alter table rate_overrides drop constraint if exists rate_overrides_check;

-- 3. Add proper date order check constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rate_overrides_dates_check'
  ) then
    alter table rate_overrides add constraint rate_overrides_dates_check check (end_date >= start_date);
  end if;
end $$;

-- 4. Bi-directional sync trigger between (start_date, end_date, label) and (from_date, to_date, reason)
create or replace function sync_rate_overrides_dates()
returns trigger as $$
begin
  if new.start_date is not null and new.from_date is null then
    new.from_date := new.start_date;
  end if;
  if new.end_date is not null and new.to_date is null then
    new.to_date := new.end_date;
  end if;
  if new.from_date is not null and new.start_date is null then
    new.start_date := new.from_date;
  end if;
  if new.to_date is not null and new.end_date is null then
    new.end_date := new.to_date;
  end if;
  if new.reason is null then
    new.reason := coalesce(new.label, '');
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_sync_rate_overrides_dates
before insert or update on rate_overrides
for each row execute function sync_rate_overrides_dates();

-- 5. Lookup index
create index if not exists idx_rate_overrides_lookup on rate_overrides(room_type_id, start_date, end_date);
