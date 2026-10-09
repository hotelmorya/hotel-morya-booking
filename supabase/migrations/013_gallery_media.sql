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
