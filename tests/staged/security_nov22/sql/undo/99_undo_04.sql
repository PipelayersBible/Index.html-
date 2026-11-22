-- Undo security_nov22 04: puts back the exact braked() and miss() that were live, then removes the caller key parts.
select pb_sec.restore('nov22_04') as functions_restored;  -- expect 2
drop function if exists pb_onboard.caller();
drop index if exists pb_onboard.misses_who_at;
alter table pb_onboard.misses drop column if exists who;
drop table if exists pb_onboard.caller_salt;
