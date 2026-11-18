-- Fix 01 (NOT applied). Findings 1 and 2.
-- 1) pb_ai.eval_start: only postgres (cron / the owner's SQL) may start an eval run.
-- 2) No function in a pb_* schema stays EXECUTE-able by PUBLIC (which includes anon and authenticated).
--    Roles that can reach a pb_* schema today keep exactly what they need:
--      service_role (USAGE on pb_billing, pb_daily, pb_docs) gets EXECUTE back on what it had through PUBLIC;
--      authenticated (USAGE on pb_ai, pb_daily, pb_docs, pb_plans) gets EXECUTE back on the NON security-definer
--      helpers it had through PUBLIC (pb_daily.place_name_key, place_trgm, sb_sta, us_state_code, wx_cfg).
--    Every other role had no USAGE on the schema, so losing EXECUTE changes nothing for it.
-- 3) Future functions (any schema, created by postgres) start with no PUBLIC EXECUTE. New RPCs then need an
--    explicit `grant execute ... to authenticated` (the pattern recent releases already follow).

begin;

revoke execute on function pb_ai.eval_start(text, text, text[], text) from public, anon, authenticated;

do $fix$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text sig, n.nspname, p.prosecdef, p.prorettype = 'trigger'::regtype is_trg
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname like 'pb\_%' and p.prokind = 'f'
      and (p.proacl is null or exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'))
  loop
    execute format('revoke execute on function %s from public', r.sig);
    execute format('revoke execute on function %s from anon', r.sig);
    if r.nspname in ('pb_billing', 'pb_daily', 'pb_docs') then
      execute format('grant execute on function %s to service_role', r.sig);
    end if;
    if r.nspname in ('pb_daily', 'pb_docs', 'pb_plans', 'pb_ai') and not r.prosecdef and not r.is_trg and r.sig <> 'pb_ai.eval_start(text,text,text[],text)' then
      execute format('grant execute on function %s to authenticated', r.sig);
    end if;
  end loop;
end $fix$;

-- Must be the GLOBAL form: a per-schema "revoke ... from public" is a no-op, because per-schema default
-- privileges can only add to the global ones (tested: a new pb_prod function still came out EXECUTE-able by anon).
-- This also covers schema public, where a new function today is EXECUTE-able by anon as well (tested).
alter default privileges for role postgres revoke execute on functions from public;

commit;
