-- hunt_nov19: READ-ONLY check (the "test" for SERVER 01). Expected after the fix: zero rows from the first query, and
-- the waiting counts in the second query go to 0 within ~10-20 minutes.
-- Result on Nov 20 2026 06:10 UTC (before the fix): 6 rows; seals 2 / checks 0 (oldest waiting since Nov 18 03:50 UTC);
-- run photos 8 / checks 0 (oldest since Nov 17 16:26 UTC); pb_daily.wx_runs 0 rows ever.
select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as service_only_function_without_service_grant
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.prosrc like '%is_service()%' or p.prosrc like '%service_role%')
  and not has_function_privilege('service_role', p.oid, 'EXECUTE') order by 1;

select (select count(*) from pb_prod.run_seals) as seals, (select count(*) from pb_prod.run_seal_checks) as seal_checks,
  (select count(*) from pb_prod.run_seals s where not exists (select 1 from pb_prod.run_seal_checks c where c.seal_id = s.id)) as seals_waiting,
  (select count(*) from storage.objects o where o.bucket_id = 'run-photos' and o.name ~ '^[0-9a-f-]{36}/runs/[^/]+/[0-9a-f]{64}\.jpg$'
     and not exists (select 1 from pb_prod.run_photo_checks c where c.name = o.name)) as photos_waiting,
  (select count(*) from pb_prod.run_photo_checks) as photo_checks, (select count(*) from pb_daily.wx_runs) as weather_runs;
