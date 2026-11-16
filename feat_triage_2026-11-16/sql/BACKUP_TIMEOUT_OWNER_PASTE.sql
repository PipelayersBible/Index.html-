-- Nightly backup: give the backup's database calls more than 8 seconds (triage, Nov 16 2026).
-- Owner runs this himself in Supabase dashboard > SQL editor. Nothing is deleted or changed in any table.
--
-- Why: pb-backup reads each schema through PostgREST as service_role. service_role has no timeout of its own, so it
-- inherits authenticator's 8 s. pb_ai (the Ask library: kb_chunks, eval_images with the quality-run photos, ...) is now
-- 22.8 MB of JSON and takes ~3.6 s hot; at 2 AM, cold, it crossed 8 s twice on Nov 16 (both tries cancelled by
-- "statement timeout"), so 2026-11-16/pb_ai.json is missing. pb_daily did the same once on Nov 10. It will only grow.
--
-- Checked Nov 16: a SET statement_timeout inside the function itself does NOT help (the 8 s timer is already armed when
-- the statement starts; tested). The role setting does: PostgREST applies the impersonated role's settings with
-- SET LOCAL at the start of each request, before the query (Supabase docs > Database > Timeouts > Role level).
-- It only loosens a time limit for calls made with the service key (the edge functions); users' calls keep 8 s / 3 s.

alter role service_role set statement_timeout = '120s';
notify pgrst, 'reload config';

-- Then (a few seconds later) redo today's backup so the folder 2026-11-16 gets its pb_ai.json; harmless to run twice:
select pb_backup.kick();

-- Check (a minute later): status should be done, files 17.
-- select id, started_at, finished_at, status, files, bytes, rows, error from pb_backup.runs order by id desc limit 3;
-- and the role: select rolname, rolconfig from pg_roles where rolname = 'service_role';

-- Optional, your call (DROP, so never run by the triage): pb_ai.kb_chunks_backup is a 2,741-row copy of kb_chunks from
-- before the Nov 14 batch-4 seal, 3.4 MB of every night's backup. If the sealed library is good, it can go:
-- drop table pb_ai.kb_chunks_backup;
