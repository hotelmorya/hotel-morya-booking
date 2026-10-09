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
