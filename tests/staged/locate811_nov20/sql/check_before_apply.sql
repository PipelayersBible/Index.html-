-- locate811 (read-only): run before applying 01. Expected on Nov 20 2026 (as read from the live project):
-- no_log_table t, no_new_cols t, set_fns 1, log_fns 0, has_locked t, has_audit t, views_on_locates 0,
-- set_md5 c7a8851cd31071f4111b1716249fbf93, json_md5 be9448556dfb3df026877c842841eb9e
-- (the two md5s are the bodies 01 was written against; if either differs, someone changed the function since: re-read it first).
select to_regclass('pb_prod.locate_log') is null as no_log_table,
  not exists (select 1 from information_schema.columns where table_schema = 'pb_prod' and table_name = 'locates' and column_name in ('renewed_at', 'renewals')) as no_new_cols,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'pb_prod_locate_set') set_fns,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'pb_prod_locate_log') log_fns,
  to_regprocedure('pb_prod.versions_locked()') is not null as has_locked, to_regprocedure('pb_audit.direct_write()') is not null as has_audit,
  (select md5(prosrc) from pg_proc where oid = 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid)'::regprocedure) set_md5,
  (select md5(prosrc) from pg_proc where oid = 'pb_prod.locate_json(pb_prod.locates)'::regprocedure) json_md5,
  (select count(*) from pg_views where definition ilike '%pb_prod.locates%') views_on_locates;
