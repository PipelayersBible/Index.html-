-- Undo. Part 1 alone turns the check off at once (the trigger keeps signing other devices out; old access tokens then
-- last up to their normal hour). Part 2 stops the one-device rule. Part 3 removes the rest (optional; the tables are small).
-- Part 1: the gate off
alter role authenticator reset pgrst.db_pre_request;
notify pgrst, 'reload config';
-- Part 2: sign-ins no longer end other sessions
drop trigger if exists pb_one_device_ins on auth.sessions;
drop trigger if exists pb_one_device_aal on auth.sessions;
drop trigger if exists pb_one_device_del on auth.sessions;
-- Part 3: everything else (run only after the app no longer calls these; the app treats a missing function as "no answer")
drop function if exists public.pb_owner_share_notes();
drop function if exists public.pb_share_notes();
drop function if exists public.pb_device_seen(text, text, double precision, double precision, timestamptz, text);
drop function if exists public.pb_session_why(uuid);
drop function if exists public.pb_session_take_slot(uuid, integer);
drop function if exists public.pb_session_gate();
drop schema if exists pb_auth cascade;
