-- Turns the pre-request check on for the whole API (every RPC and table request). Run after 01_one_device.sql.
-- Before running: select public.pb_session_gate();  must return without error (as postgres there are no claims).
-- After running: open the app signed in and signed out; both must load as before. If anything is wrong: 99_undo.sql part 1.
alter role authenticator set pgrst.db_pre_request = 'public.pb_session_gate';
notify pgrst, 'reload config';
