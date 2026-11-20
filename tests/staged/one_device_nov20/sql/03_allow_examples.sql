-- Exceptions (optional). By rule (pb_auth.allowed): a company account (the owner login) and the app owner get 2 devices,
-- everyone else 1. Rows here override the rule for one login. Tommy, Nov 20: his own login and his DIG Civil test
-- accounts get 2. His own login is already 2 by the app-owner rule; this row keeps it 2 even if that rule changes.
insert into pb_auth.allow (user_id, devices, note)
select u.id, 2, 'Tommy: own login (Nov 20)' from auth.users u where lower(u.email) = 'tfontaine@digcivil.com'
on conflict (user_id) do update set devices = excluded.devices, note = excluded.note, set_at = now();
-- Test accounts: list them first, then add the ones that are tests (the lead picks; none are added by this file).
--   select u.id, u.email from auth.users u where lower(u.email) like '%@digcivil.com' order by 2;
--   insert into pb_auth.allow (user_id, devices, note) select u.id, 2, 'DIG Civil test account' from auth.users u
--    where lower(u.email) in ('...', '...') on conflict (user_id) do update set devices = 2;
