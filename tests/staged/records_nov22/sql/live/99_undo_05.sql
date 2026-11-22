-- undo records_nov22 Phase B 05 (B8): drops the run history export. After this an r17.16 export just says the history
-- could not be read (the app handles the missing function). Plain SQL, DO-block safe. Safe twice.
drop function if exists public.pb_prod_run_versions(uuid, uuid);
