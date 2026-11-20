-- hunt2 (read-only): every app table has row security on and none is reachable signed-out. Run Nov 20 2026: 214 tables,
-- no_rls 0, anon_reach 0 in every schema.
with t as (select n.nspname, c.relname, c.relrowsecurity, has_table_privilege('anon', c.oid, 'select') a_sel, has_table_privilege('anon', c.oid, 'insert') a_ins,
  has_table_privilege('authenticated', c.oid, 'select') u_sel, has_table_privilege('authenticated', c.oid, 'insert,update,delete') u_w,
  (select count(*) from pg_policy p where p.polrelid = c.oid) pol
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema','auth','storage','extensions','vault','graphql','graphql_public','realtime','pgsodium','net','cron','supabase_functions','pgbouncer','supabase_migrations','pg_toast'))
select nspname, count(*) tables, count(*) filter (where not relrowsecurity) no_rls,
  count(*) filter (where not relrowsecurity and (a_sel or u_sel or u_w)) no_rls_reachable,
  count(*) filter (where a_sel or a_ins) anon_reach, count(*) filter (where relrowsecurity and pol = 0) rls_no_policy
from t group by 1 order by 1;
