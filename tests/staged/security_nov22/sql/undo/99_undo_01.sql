-- Undo security_nov22 01: puts back the exact pb_session_gate() that was live (saved by the guard), drops pb_session_ok().
-- Deploy the old crew-admin and weather edge functions FIRST (the new ones call pb_session_ok; without it they answer as
-- before only if the RPC is missing: they treat "function not found" as allowed, so order is not critical).
select pb_sec.restore('nov22_01') as functions_restored;  -- expect 1
drop function if exists public.pb_session_ok();
