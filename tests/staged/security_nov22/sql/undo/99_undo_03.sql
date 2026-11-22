-- Undo security_nov22 03: puts back the exact six functions that were live, then drops pb_docs.still_in.
select pb_sec.restore('nov22_03') as functions_restored;  -- expect 6
drop function if exists pb_docs.still_in(uuid, uuid);
