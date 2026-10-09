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
