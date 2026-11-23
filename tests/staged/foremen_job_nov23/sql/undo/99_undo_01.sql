-- foremen_job_nov23 undo of 01_job_foremen.apply.sql. Run as postgres, in one transaction. Safe to run twice.
-- Part 1 (always): cuts the app off and takes the trigger off company_members. The app then says "Assigning foremen isn't
-- ready on the company server yet." and Messages falls back to its other foreman rules (it checks for the table).
-- The assignments themselves (pb_pm.job_foremen) are KEPT, so applying 01 again brings them back as they were.
-- pb_pm.audit's check goes back to the live text only when no 'job_foremen' audit row exists (audit rows are permanent);
-- otherwise it stays widened and this says so.
begin;
drop function if exists public.pb_job_foremen_get(text);
drop function if exists public.pb_job_foremen_set(text, uuid[], uuid, integer);
drop trigger if exists company_members_foreman_sync on public.company_members;
drop function if exists pb_pm.foreman_role_sync();
drop function if exists pb_pm.job_foremen_state(uuid, text);
drop function if exists pb_pm.job_foremen_ver(uuid, text);
drop function if exists pb_pm.company_foremen(uuid);
do $u$
begin
  if not exists (select 1 from pb_pm.audit where action = 'job_foremen') then
    alter table pb_pm.audit drop constraint if exists audit_action_check;
    alter table pb_pm.audit add constraint audit_action_check check (action = any (array['job_pms'::text, 'settings'::text]));
    raise notice 'undo 01: audit check back to the live text';
  else
    raise notice 'undo 01: audit check left allowing job_foremen (% audit rows are permanent)', (select count(*) from pb_pm.audit where action = 'job_foremen');
  end if;
end $u$;
commit;
select 'undo 01 done (assignments kept in pb_pm.job_foremen: ' || coalesce((xpath('/row/c/text()', query_to_xml('select count(*) as c from pb_pm.job_foremen', false, true, '')))[1]::text, '?') || ' rows)'
 where to_regclass('pb_pm.job_foremen') is not null
union all select 'undo 01 done (no pb_pm.job_foremen table)' where to_regclass('pb_pm.job_foremen') is null;

-- Part 2 (ONLY if Tommy wants the assignment history gone too; it is not needed to undo the feature). Uncomment to run:
-- begin;
-- drop table if exists pb_pm.job_foremen;      -- (DROP is not blocked by the no-delete triggers)
-- commit;
