-- Takes out what 01_owner_dashboard.sql added. Safe to run twice. Nothing else is touched.
drop function if exists public.pb_owner_dashboard(integer);
drop function if exists pb_support.dash_uc();
