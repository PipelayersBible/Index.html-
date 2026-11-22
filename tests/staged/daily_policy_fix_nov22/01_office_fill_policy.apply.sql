-- daily_policy_fix_nov22: a foreman's daily report insert fails on live with "permission denied for function is_foreman_of".
-- The insert policy daily_reports_add calls pb_prod.is_foreman_of, which the authenticated role may not execute
-- (Postgres checks EXECUTE on every function in the expression, even the branch a foreman never reaches).
-- Fix: a small definer wrapper the role may call, with the same rule (a listed manager filling in for one of the
-- company's foremen). Same meaning as before; nothing else changes. Plain SQL, safe to run twice.
create or replace function pb_daily.office_fill_for(p_for uuid, p_company uuid) returns boolean
  language sql stable security definer set search_path to '' as
  $f$ select pb_daily.is_manager(p_company) and pb_prod.is_foreman_of(p_for, p_company) $f$;
revoke all on function pb_daily.office_fill_for(uuid, uuid) from public;
revoke all on function pb_daily.office_fill_for(uuid, uuid) from anon;
grant execute on function pb_daily.office_fill_for(uuid, uuid) to authenticated, service_role;
drop policy if exists daily_reports_add on pb_daily.reports;
create policy daily_reports_add on pb_daily.reports for insert to authenticated
  with check ((foreman_uid = auth.uid()) and (pb_daily.is_foreman(company_id)
    or ((for_foreman is not null) and pb_daily.office_fill_for(for_foreman, company_id))));
