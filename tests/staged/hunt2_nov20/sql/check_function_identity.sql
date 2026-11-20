-- hunt2 (read-only): functions a signed-in user may call that never reach an identity check (auth.uid() / auth.role() /
-- auth.jwt / is_service), directly or through up to 4 levels of helper functions. Run Nov 20 2026: only small
-- predicates (pb_daily.tz_ok, foreman_in, office_filled, checks_apply, pb_docs.shown_title, pb_prod.tz_valid; not in an
-- exposed schema) and the five functions meant for signed-out use (anonymous report x4, pb_onboard_peek).
with recursive f as (select n.nspname, p.proname, p.oid, p.prosecdef, pg_get_functiondef(p.oid) def,
    has_function_privilege('authenticated', p.oid, 'execute') auth, has_function_privilege('anon', p.oid, 'execute') anon
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.prokind = 'f' and n.nspname ~ '^(public|pb_)'),
direct as (select oid, nspname, proname from f where def ~ 'auth\.uid\(\)|auth\.role\(\)|is_service|auth\.jwt'),
lvl as (select oid, nspname, proname, 0 d from direct
  union select f.oid, f.nspname, f.proname, l.d + 1 from f join lvl l
    on position((case when l.nspname = 'public' then 'public.' else l.nspname || '.' end) || l.proname || '(' in f.def) > 0 and f.oid <> l.oid where l.d < 4)
select f.nspname, f.proname, pg_get_function_identity_arguments(f.oid) args, f.anon
from f where f.auth and f.prosecdef and not exists (select 1 from lvl where lvl.oid = f.oid) order by 1, 2;
-- and: SECURITY DEFINER functions without a pinned search_path (0 on Nov 20)
select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prokind = 'f' and n.nspname ~ '^(public|pb_)' and p.prosecdef and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'));
