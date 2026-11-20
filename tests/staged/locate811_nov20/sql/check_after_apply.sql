-- locate811 (read-only): run after applying 01. Expected: set_fns 2, log_fns 1, tickets_without_history 0,
-- anon_can f, authenticated_can t, table_reachable f, rls t, triggers 4.
select (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'pb_prod_locate_set') set_fns,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'pb_prod_locate_log') log_fns,
  (select count(*) from pb_prod.locates l where not exists (select 1 from pb_prod.locate_log g where g.locate_id = l.id)) tickets_without_history,
  (has_function_privilege('anon', 'public.pb_prod_locate_log(text,uuid)', 'execute') or has_function_privilege('anon', 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid,date)', 'execute')
    or has_function_privilege('anon', 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid)', 'execute')) anon_can,
  (has_function_privilege('authenticated', 'public.pb_prod_locate_log(text,uuid)', 'execute') and has_function_privilege('authenticated', 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid,date)', 'execute')
    and has_function_privilege('authenticated', 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid)', 'execute')) authenticated_can,
  (has_table_privilege('anon', 'pb_prod.locate_log', 'select') or has_table_privilege('authenticated', 'pb_prod.locate_log', 'select')) table_reachable,
  (select relrowsecurity from pg_class where oid = 'pb_prod.locate_log'::regclass) rls,
  (select count(*) from pg_trigger where not tgisinternal and (tgrelid = 'pb_prod.locate_log'::regclass or (tgrelid = 'pb_prod.locates'::regclass and tgname = 'locates_zz_log'))) triggers;
