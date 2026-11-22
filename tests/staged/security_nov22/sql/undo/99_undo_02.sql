-- Undo security_nov22 02: puts back the exact pb_permit_backup(text,jsonb,uuid) and pb_run_seal_add(...) that were live.
-- pb_safety.closed_frozen() is dropped too (nothing else uses it).
select pb_sec.restore('nov22_02') as functions_restored;  -- expect 2
drop function if exists pb_safety.closed_frozen();
