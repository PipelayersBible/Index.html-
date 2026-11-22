-- messaging_nov22 undo 01: removes the messaging server part. THIS DELETES EVERY MESSAGE (records): take an archive of each
-- chat first (pb_msg_archive_request) or keep the schema and only revoke the app's access (the first block alone).
-- Run 99_undo_03 and 99_undo_02 first if they were applied.
begin;
-- 1) the app can no longer call anything (keeps every message)
do $r$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'pb\_msg\_%' loop
    execute format('revoke all on function %s from authenticated, service_role', f.sig);
  end loop;
end $r$;
do $c$ begin if to_regnamespace('cron') is not null then perform cron.unschedule('pb_msg_sweep'); end if; exception when others then null; end $c$;
-- 2) remove everything (comment out to keep the messages)
do $d$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'pb\_msg\_%' loop
    execute format('drop function %s', f.sig);
  end loop;
end $d$;
drop schema if exists pb_msg cascade;
do $p$ begin
  if to_regclass('pb_push.outbox') is not null then
    delete from pb_push.outbox where type = 'message';
    alter table pb_push.outbox drop constraint if exists pb_push_out_type;
    alter table pb_push.outbox add constraint pb_push_out_type check (type = any (array['runs_waiting', 'mgmt_report', 'test', 'crew_production', 'run_end_ask',
      'material_alert', 'crew_nudge', 'permit_closed', 'permit_due', 'schedule', 'delays', 'locates', 'safety', 'plan_change', 'run_back', 'weather',
      'emergency', 'inspection', 'daily_missing']));
  end if;
end $p$;
commit;
select 'messaging undo 01 done: pb_msg ' || (select count(*) from pg_namespace where nspname = 'pb_msg') || ', public pb_msg_* ' || (select count(*) from pg_proc where proname like 'pb\_msg\_%');
