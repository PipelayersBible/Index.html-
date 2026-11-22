-- daily_policy_fix_nov22 02: the office filling in a foreman's missed day (pb_daily_submit, office_fill path) calls
-- pb_prod.is_foreman_of and pb_pm.settings_of directly; pb_daily_submit runs as the caller, who may not execute
-- either, so the office fill answers "permission denied". Use small definer wrappers the app role may call.
-- Same meaning. Needs 01 (pb_daily.office_fill_for) and records 01 (pb_stage.patch_fn). Safe to run twice.
create or replace function pb_daily.company_tz(p_company uuid) returns text
  language sql stable security definer set search_path to '' as
  $f$ select (pb_pm.settings_of(p_company)).tz $f$;
revoke all on function pb_daily.company_tz(uuid) from public;
revoke all on function pb_daily.company_tz(uuid) from anon;
grant execute on function pb_daily.company_tz(uuid) to authenticated, service_role;
do $p$ begin
  if position('pb_daily.office_fill_for(v_for, v_c)' in pg_get_functiondef('public.pb_daily_submit(text,text,text,date,jsonb,text,text,timestamp with time zone,text,text,uuid,text,timestamp with time zone,boolean,uuid)'::regprocedure)) = 0 then
    perform pb_stage.patch_fn('public.pb_daily_submit(text,text,text,date,jsonb,text,text,timestamp with time zone,text,text,uuid,text,timestamp with time zone,boolean,uuid)'::regprocedure,
      'pb_prod.is_foreman_of(v_for, v_c)', 'pb_daily.office_fill_for(v_for, v_c)', 'daily_fix_02');
    perform pb_stage.patch_fn('public.pb_daily_submit(text,text,text,date,jsonb,text,text,timestamp with time zone,text,text,uuid,text,timestamp with time zone,boolean,uuid)'::regprocedure,
      '(pb_pm.settings_of(v_c)).tz', 'pb_daily.company_tz(v_c)');
  end if;
end $p$;
