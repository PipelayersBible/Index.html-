-- Fix 02 (NOT applied). Finding 3: any signed-in account (no company, beta ended, removed) can upload without limit
-- into run-photos (15 MB each), run-seals (50 MB each) and cutsheet-sources (15 MB each).
-- Adds a per-account daily cap to the three insert policies. Limits are proposals (owner decision):
--   run-photos 400 a day (pbRrPhotosUp sends at most 20 per pass; legacy report photos a handful per report),
--   run-seals 100 a day (one sealed PDF per sent run version), cutsheet-sources 50 a day (the app no longer uses it).
-- Also: run-seals requires a company (checked inside the definer function: policies run as authenticated,
-- which has no USAGE on pb_prod); sealed originals exist only for company run reports.

begin;

create or replace function public.pb_storage_put_ok(p_bucket text, p_cap integer, p_need_company boolean default false)
returns boolean
language sql stable security definer set search_path to ''
as $$
  select auth.uid() is not null
     and (not p_need_company or pb_prod.my_company(auth.uid()) is not null)
     and (select count(*) from storage.objects o
           where o.bucket_id = p_bucket and o.owner_id = auth.uid()::text
             and o.created_at > now() - interval '1 day') < p_cap
$$;
revoke execute on function public.pb_storage_put_ok(text, integer, boolean) from public, anon;
grant execute on function public.pb_storage_put_ok(text, integer, boolean) to authenticated;

alter policy run_photos_owner_insert on storage.objects
  with check (bucket_id = 'run-photos' and (storage.foldername(name))[1] = (auth.uid())::text
              and public.pb_storage_put_ok('run-photos', 400));

alter policy run_seals_owner_insert on storage.objects
  with check (bucket_id = 'run-seals' and (storage.foldername(name))[1] = (auth.uid())::text
              and name ~ '^[0-9a-f-]{36}/runs/[A-Za-z0-9_.-]{1,60}/[0-9]{8}T[0-9]{6}-[0-9a-f]{16}\.pdf$'
              and public.pb_storage_put_ok('run-seals', 100, true));

alter policy "Users can manage their own files in cutsheet-sources" on storage.objects
  using (bucket_id = 'cutsheet-sources' and (storage.foldername(name))[1] = (auth.uid())::text)
  with check (bucket_id = 'cutsheet-sources' and (storage.foldername(name))[1] = (auth.uid())::text
              and public.pb_storage_put_ok('cutsheet-sources', 50));

commit;
