-- messaging_nov22 undo 02: the message policies go. The buckets stay if they hold files (storage refuses to drop a bucket
-- with objects; empty them through the Storage API first if they must go). Run with the same role as 02.
begin;
drop policy if exists msg_photos_insert on storage.objects;
drop policy if exists msg_photos_read on storage.objects;
drop policy if exists msg_archives_read on storage.objects;
delete from storage.buckets b where b.id in ('msg-photos', 'msg-archives') and not exists (select 1 from storage.objects o where o.bucket_id = b.id);
commit;
