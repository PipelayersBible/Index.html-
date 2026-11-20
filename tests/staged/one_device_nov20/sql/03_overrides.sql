-- Overrides (Tommy, Nov 20). Run after 01. Safe to run twice.
-- Everyone: signed in on up to 2 devices, one in use at a time. These rows change that for test logins:
--   devices = 5, one_at_a_time = false  ->  up to 5 devices signed in, usable at the same time (nothing locks, nothing is refused
--   until the 6th). ASSUMPTION: that is what "the same override as my own login" should mean now that everyone gets 2
--   devices. To give them something else, change the two numbers below; the rule reads these tables on every sign-in.
-- 1. Every login of the DIG Civil company: its company account (owner login) and all its members, now and later.
insert into pb_auth.company_allow (company_id, devices, one_at_a_time, note)
select c.id, 5, false, 'DIG Civil: Tommy''s test company (Nov 20)' from public.companies c where c.name ilike 'DIG Civil%'
on conflict (company_id) do update set devices = excluded.devices, one_at_a_time = excluded.one_at_a_time, note = excluded.note, set_at = now();
-- 2. Tommy's own login, whatever company it is or isn't in.
insert into pb_auth.allow (user_id, devices, one_at_a_time, note)
select u.id, 5, false, 'Tommy: own login (Nov 20)' from auth.users u where lower(u.email) = 'tfontaine@digcivil.com'
on conflict (user_id) do update set devices = excluded.devices, one_at_a_time = excluded.one_at_a_time, note = excluded.note, set_at = now();
-- Check what it matched (expect one company and one login):
select 'company' as what, c.name as name from pb_auth.company_allow ca join public.companies c on c.id = ca.company_id
union all select 'login', u.email from pb_auth.allow a join auth.users u on u.id = a.user_id;
