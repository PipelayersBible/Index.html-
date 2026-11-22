-- messaging_nov22 02: the two private buckets and their policies. Needs 01. NOT applied.
-- Policies on storage.objects can only be made by its owner (live: supabase_storage_admin; postgres is not a member, read
-- Nov 22). Apply this file the same way sec2/02_storage_upload_caps.sql was applied (its ALTER POLICYs are live), e.g. the
-- dashboard's SQL editor / migration path. If it answers "must be owner of table objects", that path was not it.
-- Every function a policy here calls is public.* and granted to authenticated (policies run as the caller).
-- Safe to run twice. Undo: undo/99_undo_02.sql.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('msg-photos', 'msg-photos', false, 3145728, array['image/jpeg']),
         ('msg-archives', 'msg-archives', false, 104857600, array['application/zip'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists msg_photos_insert on storage.objects;
create policy msg_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'msg-photos' and public.pb_msg_photo_put_ok(name));
drop policy if exists msg_photos_read on storage.objects;
create policy msg_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'msg-photos' and public.pb_msg_photo_can_view(name));
drop policy if exists msg_archives_read on storage.objects;
create policy msg_archives_read on storage.objects for select to authenticated
  using (bucket_id = 'msg-archives' and public.pb_msg_archive_can_view(name));
-- no update / delete policies: nobody overwrites or removes a message photo or an archive from the app.
-- The archive writer (service role) uploads archives and, for 13-month companies, deletes old files through the Storage API.
