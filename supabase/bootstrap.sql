-- Hotel KBP — consolidated database bootstrap
-- Generated from supabase/migrations/001..019 in apply order, plus the
-- Realtime publication step from docs/NEW-SUPABASE-PROJECT-SETUP.md §5.
-- Apply once to a FRESH Supabase project. Does NOT include seed.sql.
-- Verified by supabase/check-migrations.sh (14 tables, 9 types, 11 functions).

-- ═══════════════════════════════════════════════════════════════
-- 001_init.sql
-- ═══════════════════════════════════════════════════════════════
-- ============================================================
-- HOTEL BOOKING MANAGEMENT SYSTEM — DATABASE SCHEMA
-- Single-tenant · Supabase (PostgreSQL) · Plan A (Full)
--
-- Run this in the Supabase SQL Editor for each new hotel deployment.
-- Each hotel has its own isolated Supabase project — NO hotel_id anywhere.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- ENUM TYPES ----------
create type user_role        as enum ('super_admin', 'admin', 'manager', 'receptionist', 'housekeeping');
create type room_status      as enum ('available', 'occupied', 'cleaning', 'maintenance');
create type booking_status   as enum ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'not_arrived');
create type booking_source   as enum ('website', 'walkin', 'phone', 'whatsapp');
create type payment_method   as enum ('razorpay', 'upi', 'cash', 'card', 'bank');
create type payment_status   as enum ('pending', 'success', 'failed', 'refunded');
create type id_proof_type    as enum ('aadhaar', 'pan', 'passport', 'driving_license');

-- ============================================================
-- HOTEL SETTINGS  (single row per deployment)
-- ============================================================
create table hotel_settings (
  id                              uuid primary key default uuid_generate_v4(),
  name                            varchar(150) not null,
  slug                            varchar(60)  not null unique,
  description                     jsonb default '{}'::jsonb,    -- {en, mr, hi}
  address                         varchar(255) not null,
  city                            varchar(50)  not null default 'Admapur',
  state                           varchar(50)  not null default 'Maharashtra',
  phone                           varchar(10)  not null check (phone ~ '^[6-9][0-9]{9}$'),
  phone_alt                       varchar(10)  check (phone_alt ~ '^[6-9][0-9]{9}$'),
  whatsapp                        varchar(10)  check (whatsapp ~ '^[6-9][0-9]{9}$'),
  email                           varchar(255),

  logo_url                        text,
  logo_public_id                  varchar(255),

  check_in_time                   time         default '12:00:00',
  check_out_time                  time         default '11:00:00',

  google_maps_url                 text,
  facebook_url                    text,
  instagram_url                   text,
  gmb_url                         text,

  upi_qr_url                      text,
  razorpay_enabled                boolean default false,
  fee_passthrough_enabled         boolean default false,
  fee_passthrough_percent         numeric(5,2) default 3.00,

  advance_percent                 numeric(5,2) default 0.00,
  auto_cancel_hours_after_booking smallint default 24,
  min_hours_before_checkin         smallint default 6,

  gst_enabled                     boolean default false,
  gst_number                      varchar(15),
  gst_rate                        numeric(5,2) default 12.00,

  cancellation_policy             jsonb default '{}'::jsonb,    -- {en, mr, hi}
  seo_meta                        jsonb default '{}'::jsonb,    -- {home:{en:{title,description},mr:{...},...}, rooms:{...}}

  updated_at                      timestamptz default now()
);

-- ============================================================
-- USERS  (extends Supabase auth.users)
-- super_admin rows are filtered out of all admin UI listings.
-- ============================================================
create table users (
  id            uuid primary key default uuid_generate_v4(),
  auth_user_id  uuid not null references auth.users(id) on delete cascade unique,
  fullname      varchar(100) not null,
  phone         varchar(10) check (phone ~ '^[6-9][0-9]{9}$'),
  role          user_role not null default 'receptionist',
  is_active     boolean default true,
  created_by    uuid references users(id) on delete set null,
  created_at    timestamptz default now()
);

-- ============================================================
-- ROOM TYPES
-- name + description are multilingual jsonb {en, mr, hi}.
-- ============================================================
create table room_types (
  id           uuid primary key default uuid_generate_v4(),
  name         jsonb not null,                            -- {en:"Standard AC", mr:"...", hi:"..."}
  description  jsonb default '{}'::jsonb,
  base_rate    numeric(10,2) not null check (base_rate >= 0),
  max_guests   smallint not null default 2 check (max_guests > 0),
  amenities    jsonb default '[]'::jsonb,                 -- ["AC","WiFi","TV","Geyser"]
  is_active    boolean default true,
  sort_order   smallint default 0,                        -- display order on public site (drag-reorder)
  created_by   uuid references users(id) on delete set null,
  updated_by   uuid references users(id) on delete set null,
  deleted_at   timestamptz,
  deleted_by   uuid references users(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- ROOMS  (physical rooms)
-- Min 4, Max 30 rooms per hotel (enforced in app, not DB).
-- ============================================================
create table rooms (
  id            uuid primary key default uuid_generate_v4(),
  room_type_id  uuid not null references room_types(id) on delete restrict,
  room_number   varchar(10) not null unique,
  floor         smallint default 0,
  status        room_status not null default 'available',
  deleted_at    timestamptz,
  deleted_by    uuid references users(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- ROOM PHOTOS  (Cloudinary)
-- ============================================================
create table room_photos (
  id            uuid primary key default uuid_generate_v4(),
  room_type_id  uuid not null references room_types(id) on delete cascade,
  url           text not null,
  public_id     varchar(255) not null,
  sort_order    smallint default 0,
  is_primary    boolean default false,
  created_at    timestamptz default now()
);

-- ============================================================
-- RATE OVERRIDES  (festival / seasonal pricing)
-- Snapshot-safe: rate is captured into booking_rooms at booking time.
-- ============================================================
create table rate_overrides (
  id            uuid primary key default uuid_generate_v4(),
  room_type_id  uuid not null references room_types(id) on delete cascade,
  start_date    date not null,
  end_date      date not null,
  rate          numeric(10,2) not null check (rate >= 0),
  label         varchar(60),
  created_by    uuid references users(id) on delete set null,
  updated_by    uuid references users(id) on delete set null,
  created_at    timestamptz default now(),
  check (end_date >= start_date)
);

-- ============================================================
-- GUESTS
-- ============================================================
create table guests (
  id                  uuid primary key default uuid_generate_v4(),
  fullname            varchar(100) not null,
  email               varchar(255),
  phone               varchar(10) not null unique check (phone ~ '^[6-9][0-9]{9}$'),  -- unique per hotel
  phone_verified      boolean default false,
  id_type             id_proof_type,
  id_number           varchar(20),
  id_proof_url        text,                                  -- Supabase Storage (private)
  city                varchar(50),
  address             varchar(255),
  preferred_language  varchar(2) default 'en' check (preferred_language in ('en','mr','hi')),
  notes               text,                                  -- admin-only free text
  tags                text[] default '{}',                   -- ['VIP','Frequent','Comp','Local','Group leader']
  total_stays         smallint default 0,                    -- denormalized for fast list rendering, updated by trigger
  lifetime_value      numeric(12,2) default 0,               -- denormalized
  last_stayed_at      timestamptz,                           -- denormalized
  deleted_at          timestamptz,
  deleted_by          uuid references users(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- BOOKINGS
-- ============================================================
create table bookings (
  id                  uuid primary key default uuid_generate_v4(),
  guest_id            uuid not null references guests(id) on delete restrict,
  booking_ref         varchar(20) not null unique,             -- BK-2024-0001
  check_in            date not null,
  check_out           date not null,
  nights              smallint generated always as (check_out - check_in) stored,
  total_amount        numeric(10,2) not null default 0 check (total_amount >= 0),
  discount_amount     numeric(10,2) not null default 0 check (discount_amount >= 0),
  discount_reason     varchar(100),
  discount_by         uuid references users(id) on delete set null,
  gst_amount          numeric(10,2) not null default 0,
  advance_paid        numeric(10,2) not null default 0,        -- maintained by trigger
  balance_due         numeric(10,2) generated always as (total_amount - discount_amount + gst_amount - advance_paid) stored,
  status              booking_status not null default 'pending',
  source              booking_source not null default 'website',
  special_requests    text,
  additional_guests   text,                                     -- free text for accompanying guests
  is_backdated        boolean default false,
  backdated_reason    varchar(255),
  actual_check_in     timestamptz,
  actual_check_out    timestamptz,
  created_by          uuid references users(id) on delete set null,
  updated_by          uuid references users(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  group_ref           varchar(20),                                -- shared id for group/yatra bookings (GR-2024-0001)
  phone_verified_at   timestamptz,                                -- MSG91 OTP gate. NULL until verified. Required != null for status='confirmed'.
  deleted_at          timestamptz,                                -- soft delete only
  deleted_by          uuid references users(id) on delete set null,
  check (check_out > check_in),
  check (status = 'pending' or phone_verified_at is not null or source != 'website')  -- OTP required for website bookings to leave pending
);

-- ============================================================
-- BOOKING ROOMS
-- Book by room_type (required). Specific room assigned at check-in.
-- ============================================================
create table booking_rooms (
  id              uuid primary key default uuid_generate_v4(),
  booking_id      uuid not null references bookings(id) on delete cascade,
  room_type_id    uuid not null references room_types(id) on delete restrict,
  room_id         uuid references rooms(id) on delete set null,
  rate_per_night  numeric(10,2) not null check (rate_per_night >= 0),
  nights          smallint not null check (nights > 0),
  subtotal        numeric(10,2) generated always as (rate_per_night * nights) stored
);

-- ============================================================
-- PAYMENTS  (one booking → many payments → partial/split supported)
-- ============================================================
create table payments (
  id                   uuid primary key default uuid_generate_v4(),
  booking_id           uuid not null references bookings(id) on delete restrict,  -- never auto-cascade delete payments
  amount               numeric(10,2) not null check (amount > 0),
  method               payment_method not null,
  razorpay_order_id    varchar(50),
  razorpay_payment_id  varchar(50),
  razorpay_signature   varchar(255),
  reference_note       varchar(255),
  status               payment_status not null default 'pending',
  paid_at              timestamptz,
  recorded_by          uuid references users(id) on delete set null,
  deleted_at           timestamptz,
  deleted_by           uuid references users(id) on delete set null,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  -- Idempotency: prevent duplicate Razorpay webhooks from creating duplicate rows
  constraint payments_razorpay_unique unique nulls not distinct (razorpay_payment_id)
);

-- ============================================================
-- BOOKING HOLDS  (5-minute soft lock during online booking)
-- Lazy expiry — availability queries ignore rows with expires_at < now().
-- ============================================================
create table booking_holds (
  id            uuid primary key default uuid_generate_v4(),
  room_type_id  uuid not null references room_types(id) on delete cascade,
  check_in      date not null,
  check_out     date not null,
  session_id    varchar(100) not null,
  expires_at    timestamptz not null default (now() + interval '5 minutes'),
  created_at    timestamptz default now()
);

-- ============================================================
-- ACTIVITY LOG (unified — powers Recent Activity, Audit Log, Per-entity history, Housekeeping log)
-- Insert-only. Append-only audit trail. Never updated, never deleted.
-- ============================================================
create table activity_log (
  id            bigserial primary key,
  user_id       uuid references users(id) on delete set null,   -- who did it
  entity_type   varchar(20) not null check (entity_type in (
                    'booking','payment','guest','room','room_type',
                    'rate_override','maintenance_block','cleaning','user')),
  entity_id     uuid,                                           -- target row (nullable for system events)
  action        varchar(40) not null,                           -- 'created','status_changed','cleaned','payment_recorded','deleted_soft', etc.
  metadata      jsonb default '{}'::jsonb,                      -- {from:'pending', to:'confirmed', amount: 1200, room_number:'202'}
  created_at    timestamptz default now() not null
);

-- ============================================================
-- MAINTENANCE BLOCKS (scheduled future repair windows; distinct from rooms.status='maintenance' which is for NOW)
-- Availability queries exclude rooms with an overlapping active block.
-- ============================================================
create table maintenance_blocks (
  id            uuid primary key default uuid_generate_v4(),
  room_id       uuid not null references rooms(id) on delete cascade,
  from_date     date not null,
  to_date       date not null,
  reason        varchar(255) not null,
  created_by    uuid references users(id) on delete set null,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  check (to_date >= from_date)
);

-- ============================================================
-- CLEANING LOCKS (housekeeper claims a room; prevents two staff working same room)
-- 1-hour auto-release. Periodic cleanup via cron.
-- ============================================================
create table cleaning_locks (
  room_id          uuid primary key references rooms(id) on delete cascade,  -- one lock per room
  locked_by        uuid not null references users(id) on delete cascade,
  locked_at        timestamptz default now(),
  auto_release_at  timestamptz default (now() + interval '1 hour') not null
);

-- ============================================================
-- OTP ATTEMPTS (MSG91 rate limiting: 3 sends/hour per phone, 5 verify-attempts per OTP)
-- ============================================================
create table otp_attempts (
  id            uuid primary key default uuid_generate_v4(),
  phone         varchar(10) not null check (phone ~ '^[6-9][0-9]{9}$'),
  otp_hash      varchar(64),                                 -- never store raw OTP; sha256 hex
  sent_at       timestamptz default now(),
  verified_at   timestamptz,                                 -- null until verified
  attempt_count smallint default 0 check (attempt_count <= 10),
  expires_at    timestamptz not null default (now() + interval '10 minutes')
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_bookings_check_in        on bookings(check_in);
create index idx_bookings_check_out       on bookings(check_out);
create index idx_bookings_status          on bookings(status);
create index idx_bookings_guest           on bookings(guest_id);
create index idx_bookings_dates_status    on bookings(check_in, check_out, status);
create index idx_bookings_status_check_in on bookings(status, check_in) where deleted_at is null;
create index idx_bookings_group_ref       on bookings(group_ref) where group_ref is not null;
create index idx_bookings_not_deleted     on bookings(created_at desc) where deleted_at is null;

create index idx_booking_rooms_booking    on booking_rooms(booking_id);
create index idx_booking_rooms_room       on booking_rooms(room_id);
create index idx_booking_rooms_type       on booking_rooms(room_type_id);

create index idx_payments_booking         on payments(booking_id) where deleted_at is null;
create index idx_payments_status          on payments(status);

create index idx_rooms_status             on rooms(status) where deleted_at is null;
create index idx_rooms_type               on rooms(room_type_id);

create index idx_rate_overrides_lookup    on rate_overrides(room_type_id, start_date, end_date);

create index idx_holds_expiry             on booking_holds(expires_at);
create index idx_holds_lookup             on booking_holds(room_type_id, check_in, check_out);

create index idx_room_photos_type         on room_photos(room_type_id);

create index idx_guests_phone             on guests(phone) where deleted_at is null;
create index idx_guests_tags              on guests using gin(tags);
create index idx_users_role               on users(role) where role <> 'super_admin';

create index idx_activity_log_entity      on activity_log(entity_type, entity_id, created_at desc);
create index idx_activity_log_user        on activity_log(user_id, created_at desc);
create index idx_activity_log_timeline    on activity_log(created_at desc);

create index idx_maintenance_blocks_room  on maintenance_blocks(room_id, from_date, to_date) where is_active = true;

create index idx_cleaning_locks_release   on cleaning_locks(auto_release_at);

create index idx_otp_phone                on otp_attempts(phone, sent_at desc);
create index idx_otp_expiry               on otp_attempts(expires_at);

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create trigger trg_hotel_settings_updated_at
  before update on hotel_settings
  for each row execute function set_updated_at();

-- Recalculate advance_paid from successful payments
create or replace function recalc_advance_paid()
returns trigger as $$
declare
  target_booking uuid;
begin
  target_booking := coalesce(new.booking_id, old.booking_id);
  update bookings
  set advance_paid = (
    select coalesce(sum(amount), 0)
    from payments
    where booking_id = target_booking
      and status = 'success'
  )
  where id = target_booking;
  return null;
end;
$$ language plpgsql;

create trigger trg_payments_recalc_advance
  after insert or update or delete on payments
  for each row execute function recalc_advance_paid();

-- Updated_at triggers for all writable tables (added in this revision)
create trigger trg_guests_updated_at          before update on guests          for each row execute function set_updated_at();
create trigger trg_room_types_updated_at      before update on room_types      for each row execute function set_updated_at();
create trigger trg_rooms_updated_at           before update on rooms           for each row execute function set_updated_at();
create trigger trg_payments_updated_at        before update on payments        for each row execute function set_updated_at();

-- ============================================================
-- STATE TRANSITION GUARDS (booking + payment)
-- Prevents invalid status changes (e.g., checked_out -> pending) at DB level.
-- ============================================================
create or replace function guard_booking_status_transition()
returns trigger as $$
declare
  valid boolean := false;
begin
  if old.status is null or new.status = old.status then
    return new;
  end if;
  -- Allowed transitions
  if (old.status = 'pending'     and new.status in ('confirmed','cancelled','not_arrived')) then valid := true;
  elsif (old.status = 'confirmed'  and new.status in ('checked_in','cancelled','not_arrived')) then valid := true;
  elsif (old.status = 'checked_in' and new.status in ('checked_out','cancelled')) then valid := true;
  elsif (old.status = 'checked_out'  and new.status in ('cancelled')) then valid := true;  -- post-stay cancellation = comp/refund only
  end if;
  if not valid then
    raise exception 'Invalid booking status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_bookings_guard_transition
  before update of status on bookings
  for each row execute function guard_booking_status_transition();

create or replace function guard_payment_status_transition()
returns trigger as $$
declare
  valid boolean := false;
begin
  if old.status is null or new.status = old.status then return new; end if;
  if (old.status = 'pending' and new.status in ('success','failed')) then valid := true;
  elsif (old.status = 'success'  and new.status in ('refunded')) then valid := true;
  end if;
  if not valid then
    raise exception 'Invalid payment status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_payments_guard_transition
  before update of status on payments
  for each row execute function guard_payment_status_transition();

-- ============================================================
-- ACTIVITY LOG AUTO-INSERT
-- Triggers on key tables write a row into activity_log for audit + dashboard feed.
-- ============================================================
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
end;
$$ language plpgsql;

create trigger trg_log_booking_activity
  after insert or update on bookings
  for each row execute function log_booking_activity();

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
end;
$$ language plpgsql;

create trigger trg_log_payment_activity
  after insert on payments
  for each row execute function log_payment_activity();

create or replace function log_room_activity()
returns trigger as $$
declare
  v_user uuid := nullif(current_setting('app.current_user_id', true), '')::uuid;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into activity_log(user_id, entity_type, entity_id, action, metadata)
    values (v_user, 'room', new.id, 'status_changed',
            jsonb_build_object('room_number', new.room_number, 'from', old.status, 'to', new.status));
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_log_room_activity
  after update of status on rooms
  for each row execute function log_room_activity();

-- ============================================================
-- DENORMALIZED GUEST STATS (total_stays, lifetime_value, last_stayed_at)
-- Updated on booking checkout for fast guest list rendering.
-- ============================================================
create or replace function recalc_guest_stats()
returns trigger as $$
begin
  if new.status = 'checked_out' and (old.status is null or old.status != 'checked_out') then
    update guests g
    set total_stays    = (select count(*) from bookings where guest_id = g.id and status = 'checked_out' and deleted_at is null),
        lifetime_value = (select coalesce(sum(total_amount - discount_amount + gst_amount), 0)
                          from bookings where guest_id = g.id and status = 'checked_out' and deleted_at is null),
        last_stayed_at = now(),
        updated_at     = now()
    where g.id = new.guest_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_recalc_guest_stats
  after update of status on bookings
  for each row execute function recalc_guest_stats();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table hotel_settings      enable row level security;
alter table users               enable row level security;
alter table room_types          enable row level security;
alter table rooms               enable row level security;
alter table room_photos         enable row level security;
alter table rate_overrides      enable row level security;
alter table guests              enable row level security;
alter table bookings            enable row level security;
alter table booking_rooms       enable row level security;
alter table payments            enable row level security;
alter table booking_holds       enable row level security;
alter table activity_log        enable row level security;
alter table maintenance_blocks  enable row level security;
alter table cleaning_locks      enable row level security;
alter table otp_attempts        enable row level security;

create or replace function current_user_role()
returns user_role as $$
  select role from users where auth_user_id = auth.uid() limit 1;
$$ language sql stable security definer;

-- ---- PUBLIC READ (website) ----
create policy "public_read_hotel"        on hotel_settings for select using (true);
create policy "public_read_room_types"   on room_types     for select using (is_active = true and deleted_at is null);
create policy "public_read_rooms"        on rooms          for select using (deleted_at is null);
create policy "public_read_room_photos"  on room_photos    for select using (true);
create policy "public_read_rate_overrides" on rate_overrides for select using (true);

-- ---- PUBLIC INSERT (online booking via API routes) ----
create policy "public_create_guests"          on guests        for insert with check (true);
create policy "public_create_bookings"        on bookings      for insert with check (true);
create policy "public_create_booking_rooms"   on booking_rooms for insert with check (true);
create policy "public_create_payments"        on payments      for insert with check (true);
create policy "public_create_holds"           on booking_holds for insert with check (true);
create policy "public_read_holds"             on booking_holds for select using (true);
create policy "public_delete_holds"           on booking_holds for delete using (true);
create policy "public_create_otp"             on otp_attempts  for insert with check (true);
create policy "public_update_otp"             on otp_attempts  for update using (true);

-- ---- OPERATIONAL STAFF (admin, manager, receptionist — full booking lifecycle) ----
-- Housekeeping DENIED on these tables. Soft-deleted rows filtered out by app queries.
create policy "staff_manage_guests"        on guests        for all
  using (current_user_role() in ('super_admin','admin','manager','receptionist'));

create policy "staff_manage_bookings"      on bookings      for all
  using (current_user_role() in ('super_admin','admin','manager','receptionist'));

create policy "staff_manage_booking_rooms" on booking_rooms for all
  using (current_user_role() in ('super_admin','admin','manager','receptionist'));

create policy "staff_manage_payments"      on payments      for all
  using (current_user_role() in ('super_admin','admin','manager','receptionist'));

-- ---- ROOMS — operational staff full; housekeeping limited to status updates ----
create policy "staff_manage_rooms"  on rooms for all
  using (current_user_role() in ('super_admin','admin','manager','receptionist'));

-- Housekeeping: SELECT rooms (status only, no joins to bookings/guests at app layer)
create policy "hk_read_rooms" on rooms for select
  using (current_user_role() = 'housekeeping' and deleted_at is null);

-- Housekeeping: UPDATE status only (cleaning -> available; available -> cleaning if reporting)
create policy "hk_update_room_status" on rooms for update
  using (current_user_role() = 'housekeeping')
  with check (current_user_role() = 'housekeeping');

-- ---- CLEANING LOCKS — housekeeping + operational staff ----
create policy "hk_manage_locks" on cleaning_locks for all
  using (current_user_role() in ('super_admin','admin','manager','receptionist','housekeeping'));

-- ---- MAINTENANCE BLOCKS — housekeeping can INSERT (report); manager+ can schedule/edit ----
create policy "hk_report_maintenance" on maintenance_blocks for insert
  with check (current_user_role() in ('super_admin','admin','manager','receptionist','housekeeping'));

create policy "mgr_manage_maintenance" on maintenance_blocks for all
  using (current_user_role() in ('super_admin','admin','manager'));

-- ---- ACTIVITY LOG — all authenticated roles can INSERT their own; read scoped by role ----
create policy "all_insert_activity" on activity_log for insert
  with check (current_user_role() is not null);

-- Housekeeping reads only their own actions; manager+ reads all
create policy "hk_read_own_activity" on activity_log for select
  using (current_user_role() = 'housekeeping' and user_id = (select id from users where auth_user_id = auth.uid()));

create policy "mgr_read_activity" on activity_log for select
  using (current_user_role() in ('super_admin','admin','manager'));

-- Receptionist reads their own activity + booking-entity activity
create policy "recep_read_activity" on activity_log for select
  using (current_user_role() = 'receptionist'
         and (user_id = (select id from users where auth_user_id = auth.uid())
              or entity_type in ('booking','payment','guest')));

-- ---- MANAGER+ (rates, photos, room types, settings) ----
create policy "mgr_manage_room_types"     on room_types     for all
  using (current_user_role() in ('super_admin','admin','manager'));

create policy "mgr_manage_room_photos"    on room_photos    for all
  using (current_user_role() in ('super_admin','admin','manager'));

create policy "mgr_manage_rate_overrides" on rate_overrides for all
  using (current_user_role() in ('super_admin','admin','manager'));

create policy "mgr_manage_settings"       on hotel_settings for all
  using (current_user_role() in ('super_admin','admin','manager'));

-- ---- ADMIN+ (user management) ----
create policy "admin_manage_users"   on users for all
  using (current_user_role() in ('super_admin','admin'));

create policy "users_read_self"      on users for select
  using (auth_user_id = auth.uid());

-- ============================================================
-- NOTES
-- ============================================================
-- • advance_paid is maintained by trigger; never set it directly.
-- • balance_due / nights / subtotal are generated columns (read-only).
-- • Multilingual columns are jsonb with shape {en, mr, hi}; en is fallback.
-- • Availability = room_types with rooms NOT in active overlapping bookings
--   (status not in cancelled/not_arrived) MINUS active holds (expires_at > now())
--   MINUS rooms with active maintenance_blocks overlapping the date range.
-- • Auto-cancel deadline computed in app:
--     LEAST(created_at + auto_cancel_hours_after_booking,
--           check_in - min_hours_before_checkin)
--   floored at created_at + 1 hour.
-- • super_admin: filter out from /admin/settings users list.
-- • Time zone: Vercel env TZ=Asia/Kolkata; all date math in IST.
-- • Soft delete: NEVER hard-delete bookings, payments, guests, rooms, room_types.
--   Use deleted_at + deleted_by. Queries must include "where deleted_at is null".
-- • Optimistic locking: API mutations include updated_at in WHERE clause to detect
--   stale writes; 0-row-affected response → return 409 to client.
-- • State transitions enforced at DB level (booking, payment). Client should not
--   need to know rules; just attempt, catch the error message.
-- • activity_log is append-only. Never UPDATE or DELETE. Never expose hard-delete
--   policy to any role. Truncate via maintenance only.
-- • cleaning_locks auto-release after 1 hour. Periodic cron (cron-job.org) sweeps
--   expired locks: DELETE FROM cleaning_locks WHERE auto_release_at < now();
-- • OTP: never store raw codes — sha256 hash only. Rate limit: app layer enforces
--   3 sends/hour/phone, 5 verify attempts/OTP, 10 attempts/24h global per phone.
-- • Set "app.current_user_id" via SET LOCAL on each authenticated request so
--   activity_log triggers can capture who did what without explicit RPC params.

-- ═══════════════════════════════════════════════════════════════
-- 002_harden_function_search_path.sql
-- ═══════════════════════════════════════════════════════════════
-- Pin search_path on all app functions (Supabase security advisor lint 0011).
-- Applied to the live project on 2026-06-10 as `harden_function_search_path`.
alter function public.set_updated_at()                    set search_path = public;
alter function public.recalc_advance_paid()               set search_path = public;
alter function public.guard_booking_status_transition()   set search_path = public;
alter function public.guard_payment_status_transition()   set search_path = public;
alter function public.log_booking_activity()              set search_path = public;
alter function public.log_payment_activity()              set search_path = public;
alter function public.log_room_activity()                 set search_path = public;
alter function public.recalc_guest_stats()                set search_path = public;
alter function public.current_user_role()                 set search_path = public;

-- ═══════════════════════════════════════════════════════════════
-- 003_phase4_qa_fixes.sql
-- ═══════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════
-- 004_fix_room_activity_actor.sql
-- ═══════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════
-- 005_day_use_bookings.sql
-- ═══════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════
-- 006_payment_void_and_dayuse_window.sql
-- ═══════════════════════════════════════════════════════════════
-- 1) advance_paid must ignore soft-deleted payments. The original recalc summed
--    every status='success' row regardless of deleted_at, so voiding a payment
--    (soft delete) left advance_paid — and therefore balance_due — unchanged.
--    §17 says deleting a payment must recalc advance_paid; this makes it true.
--    create or replace drops the search_path pin from migration 002 — re-add it.
create or replace function recalc_advance_paid()
returns trigger as $$
declare
  target_booking uuid;
begin
  target_booking := coalesce(new.booking_id, old.booking_id);
  update bookings
  set advance_paid = (
    select coalesce(sum(amount), 0)
    from payments
    where booking_id = target_booking
      and status = 'success'
      and deleted_at is null
  )
  where id = target_booking;
  return null;
end;
$$ language plpgsql set search_path = public;

-- 2) Optional expected time window for day-use ("day room") bookings, so staff
--    know when the room is taken / frees up. NULL for overnight stays.
alter table bookings add column if not exists day_use_from time;
alter table bookings add column if not exists day_use_to   time;

-- ═══════════════════════════════════════════════════════════════
-- 007_fix_payments_razorpay_unique.sql
-- ═══════════════════════════════════════════════════════════════
-- Critical: payments_razorpay_unique was UNIQUE (razorpay_payment_id) NULLS NOT
-- DISTINCT, which treats every NULL as equal — so only ONE manual payment
-- (cash/UPI/pay-at-hotel, where razorpay_payment_id IS NULL) could exist across
-- the whole table. The second manual payment anywhere failed with
-- "duplicate key value violates unique constraint payments_razorpay_unique".
--
-- The constraint's only job (§30) is to dedupe Razorpay webhook retries, which
-- always carry a non-null razorpay_payment_id. Make it a PARTIAL unique index so
-- it applies only to real Razorpay rows and ignores manual (NULL) payments.
-- It's a table constraint (not a bare index), so drop the constraint.
alter table public.payments drop constraint if exists payments_razorpay_unique;

create unique index payments_razorpay_unique
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

-- ═══════════════════════════════════════════════════════════════
-- 008_room_occupancy_integrity.sql
-- ═══════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════
-- 009_guard_room_delete_occupied.sql
-- ═══════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════
-- 010_id_proofs_storage_bucket.sql
-- ═══════════════════════════════════════════════════════════════
-- (Renumbered 004 -> 010 to resolve a duplicate-004 prefix and give the
--  migration set a strict linear apply order. Independent of 005-009; no
--  later migration depends on this bucket, so the move is order-safe.)
--
-- Phase 5 (guests): private Supabase Storage bucket for guest ID proofs.
-- Uploaded/read via the RLS-bound server client; never public — access only
-- through short-lived signed URLs. The API route (app/api/guests/[id]/id-proof)
-- additionally gates by staff role.

insert into storage.buckets (id, name, public)
values ('id-proofs', 'id-proofs', false)
on conflict (id) do nothing;

-- Authenticated staff may read/write objects in this bucket. The bucket is
-- private (public=false) so anon users get nothing; signed URLs are the only
-- read path exposed to the UI.
create policy "id_proofs_staff_select" on storage.objects
  for select to authenticated using (bucket_id = 'id-proofs');

create policy "id_proofs_staff_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'id-proofs');

create policy "id_proofs_staff_update" on storage.objects
  for update to authenticated using (bucket_id = 'id-proofs')
  with check (bucket_id = 'id-proofs');

-- ═══════════════════════════════════════════════════════════════
-- 011_reminder_sent_at.sql
-- ═══════════════════════════════════════════════════════════════
-- (Renumbered 005 -> 011 to resolve a duplicate-005 prefix and give the
--  migration set a strict linear apply order. A standalone column add; nothing
--  depends on its position, so the move is order-safe.)
--
-- Phase 6 follow-up: make the daily pre-arrival reminder idempotent.
-- The cron route filters on `reminder_sent_at is null` and stamps it after a
-- successful send, so a cron-job.org retry (or a second run the same day) can't
-- email the same guest twice.

alter table bookings add column if not exists reminder_sent_at timestamptz;

-- ═══════════════════════════════════════════════════════════════
-- 012_hotel_settings_upi_id.sql
-- ═══════════════════════════════════════════════════════════════
-- Add the hotel's UPI VPA (e.g. hotelgokul@okaxis) to settings.
-- Powers the public booking flow's mobile "Pay with UPI app" deep link
-- (upi://pay?pa=<upi_id>&...), which opens the guest's UPI app directly — a QR
-- image alone can't be scanned on the same device the guest is booking from.
-- Nullable: hotels that only use the QR image (desktop) leave it empty.

alter table hotel_settings add column if not exists upi_id text;

-- ═══════════════════════════════════════════════════════════════
-- 013_gallery_media.sql
-- ═══════════════════════════════════════════════════════════════
-- Migration 013: gallery_media table for curated hotel gallery
-- Enables admin to upload images/videos (Cloudinary) or link external YouTube/Vimeo URLs.
-- RLS mirrors room_photos pattern from 001_init.sql.

-- Ensure uuid-ossp is available (already present from init)
-- create extension if not exists "uuid-ossp";

create table if not exists gallery_media (
  id            uuid        primary key default uuid_generate_v4(),
  media_type    text        not null check (media_type in ('image', 'video')),
  video_kind    text        check (video_kind in ('upload', 'external')),  -- null for images
  public_id     text,           -- Cloudinary public_id; null for external videos
  url           text,           -- Cloudinary secure_url for uploads; null for external videos
  external_url  text,           -- YouTube/Vimeo URL; null for uploads
  alt_text      text        not null default '',
  sort_order    smallint    not null default 0,
  is_active     boolean     not null default true,
  deleted_at    timestamptz,
  deleted_by    uuid        references users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Enforce media_type/video_kind consistency:
  -- image: must have public_id + url, must NOT have external_url
  -- video upload: must have public_id + url, must NOT have external_url
  -- video external: must have external_url, must NOT have public_id or url
  constraint gallery_media_fields_check check (
    (media_type = 'image' and public_id is not null and url is not null and external_url is null)
    or (media_type = 'video' and video_kind = 'upload' and public_id is not null and url is not null and external_url is null)
    or (media_type = 'video' and video_kind = 'external' and external_url is not null and public_id is null and url is null)
  )
);

-- Index for ordered public reads
create index if not exists idx_gallery_media_order
  on gallery_media(sort_order)
  where deleted_at is null;

-- Auto-update updated_at on row change
-- search_path pinned to '' per project convention (security advisor 0011)
create or replace function update_gallery_media_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_gallery_media_updated_at
  before update on gallery_media
  for each row execute function update_gallery_media_updated_at();

-- Row Level Security
alter table gallery_media enable row level security;

-- Public can read active, non-deleted items
create policy "public_read_gallery_media"
  on gallery_media for select
  using (deleted_at is null and is_active = true);

-- Manager+ can manage all rows (insert, update, delete)
create policy "mgr_manage_gallery_media"
  on gallery_media for all
  using (
    exists (
      select 1 from users
      where auth_user_id = auth.uid()
        and role in ('super_admin', 'admin', 'manager')
        and is_active = true
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 014_room_type_bed_type.sql
-- ═══════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════
-- 015_room_type_number_of_beds_optional.sql
-- ═══════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════
-- 016_drop_hindi_locale.sql
-- ═══════════════════════════════════════════════════════════════
-- 016_drop_hindi_locale.sql
-- Drop Hindi as a supported language — keep only English + Marathi.
-- Restrict guests.preferred_language to ('en','mr'). Safe: no 'hi' rows exist.
alter table guests drop constraint if exists guests_preferred_language_check;
alter table guests add constraint guests_preferred_language_check
  check (preferred_language in ('en','mr'));

-- ═══════════════════════════════════════════════════════════════
-- 017_drop_unused_hotel_settings_columns.sql
-- ═══════════════════════════════════════════════════════════════
-- 017_drop_unused_hotel_settings_columns
-- Public site is non-CMS: branding/identity is hardcoded, not editable in admin.
-- Drop the now-unused hotel_settings columns. `name` is kept (receipts/emails).
-- The UNIQUE index hotel_settings_slug_key drops automatically with the slug column.

ALTER TABLE public.hotel_settings
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS logo_public_id,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS google_maps_url,
  DROP COLUMN IF EXISTS facebook_url,
  DROP COLUMN IF EXISTS instagram_url,
  DROP COLUMN IF EXISTS gmb_url,
  DROP COLUMN IF EXISTS cancellation_policy;

-- ═══════════════════════════════════════════════════════════════
-- 018_titlecase_guest_names.sql
-- ═══════════════════════════════════════════════════════════════
-- 018_titlecase_guest_names
-- Guest names are always stored title-cased ("rajesh kumar" -> "Rajesh Kumar").

-- 1) Backfill existing rows.
UPDATE public.guests
SET fullname = pg_catalog.initcap(fullname)
WHERE fullname IS NOT NULL
  AND fullname <> pg_catalog.initcap(fullname);

-- 2) Enforce on every future write at the DB level (source of truth; CLAUDE.md §28).
CREATE OR REPLACE FUNCTION public.titlecase_guest_fullname()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.fullname IS NOT NULL THEN
    NEW.fullname := pg_catalog.initcap(NEW.fullname);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guests_titlecase_fullname ON public.guests;
CREATE TRIGGER guests_titlecase_fullname
  BEFORE INSERT OR UPDATE OF fullname ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.titlecase_guest_fullname();

-- ═══════════════════════════════════════════════════════════════
-- 019_guest_vehicle_capture.sql
-- ═══════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════
-- Realtime (runbook §5) — live room-status grid subscribes to these.
-- ═══════════════════════════════════════════════════════════════
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table booking_rooms;


-- ============================================================
-- 020_drop_unused_anon_insert_policies.sql
-- ============================================================
-- Drop four inherited RLS policies that grant anonymous INSERT and are used by
-- no code path in this repo.
--
--   public_create_guests        on guests        with check (true)
--   public_create_bookings      on bookings      with check (true)
--   public_create_booking_rooms on booking_rooms with check (true)
--   public_create_payments      on payments      with check (true)
--
-- They date from a design where the public booking flow wrote through the anon
-- client. It does not: POST /api/public/bookings runs entirely on the
-- service-role client (createAdminClient()), which bypasses RLS. Every other
-- writer to these four tables is staff-gated — app/api/bookings/route.ts,
-- app/api/guests/route.ts and app/api/bookings/[id]/payments/route.ts all call
-- getUser() and check the profile role against OPERATIONAL before writing, so
-- they run as an authenticated staff user and are covered by staff_manage_*.
-- Checked call site by call site before dropping.
--
-- Left in place they are not merely untidy. The publishable key ships in the
-- browser bundle by design, so anyone who opens devtools can POST straight to
-- PostgREST and:
--
--   * insert bookings that never passed bot protection, the availability
--     re-check or server-side pricing — filling the hotel with rooms nobody is
--     coming to;
--   * insert guests at will;
--   * and worst, insert a payments row with status = 'success' against any
--     booking id. trg_payments_recalc_advance then fires recalc_advance_paid,
--     which sums successful payments into bookings.advance_paid, and balance_due
--     is a generated column derived from it. A stranger can mark a stay as paid
--     in full, and the front desk sees a settled bill.
--
-- booking_holds KEEPS its three permissive policies: POST/DELETE /api/holds
-- genuinely run on the anon client, holds carry no personal data, and they
-- expire in five minutes on their own.

drop policy if exists "public_create_guests"        on public.guests;
drop policy if exists "public_create_bookings"      on public.bookings;
drop policy if exists "public_create_booking_rooms" on public.booking_rooms;
drop policy if exists "public_create_payments"      on public.payments;

-- ============================================================
-- 021_drop_otp_attempts.sql
-- ============================================================
-- Drop otp_attempts.
--
-- Guest OTP was replaced by Cloudflare Turnstile and nothing in this codebase
-- reads or writes this table. It was never dropped, so it is still here.
--
-- It is not merely dead weight. Migration 001 creates it with two policies:
--
--   public_create_otp  for insert  with check (true)
--   public_update_otp  for update  with check (true)
--
-- which makes it an anonymously INSERT- and UPDATE-able table with no reader,
-- no rate limit and no expiry sweep. Anyone holding the publishable key — which
-- ships in the browser bundle by design — can write to it until the disk quota
-- is gone. Dropping the table drops those policies and its indexes with it.

drop table if exists public.otp_attempts;

-- ============================================================
-- 022_race_safe_booking_ref.sql
-- ============================================================
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
