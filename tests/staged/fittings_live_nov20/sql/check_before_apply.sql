-- fittings_live: read-only check BEFORE applying 01. Expected: one row,
--   clean_status_md5 = 5abdc95eeee058254eac882811861605 (the body 01 was written against and 99 puts back),
--   whole_exists = false, live_row_md5 = 0beff383670e8ccee280b4e345638691, put_md5 = 8b10d0e5e7bb2b2434ceb115d0cc28cd,
--   callers = {public.pb_prod_run_status_put}  (the only function that calls clean_status).
-- If clean_status_md5 differs, the live function changed since Nov 20: do not apply; re-stage from the new body.
select md5(pg_get_functiondef('pb_prod.clean_status(jsonb)'::regprocedure)) as clean_status_md5,
  to_regprocedure('pb_prod.whole(jsonb,integer)') is not null as whole_exists,
  md5(pg_get_functiondef('pb_prod.live_row(pb_prod.run_status,uuid)'::regprocedure)) as live_row_md5,
  md5(pg_get_functiondef('public.pb_prod_run_status_put(jsonb,uuid,uuid)'::regprocedure)) as put_md5,
  (select array_agg(n.nspname || '.' || p.proname order by 1) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.prosrc ilike '%clean_status%') as callers;
