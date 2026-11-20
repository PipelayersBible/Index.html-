-- fittings_live #02: rolled-back test of 01_live_fittings.sql. Nothing is kept: it always ends with
-- raise exception 'RESULT: ...', which undoes the two status rows it wrote.
-- Run it after 01 is applied, or in the same transaction as the body of 01 (without its begin/commit).
-- It finds its own people: an active company with an owner account and a crew member.
-- Expected last line: RESULT: PASS 24/24
do $t$
declare co uuid; own uuid; mem uuid; n integer := 0; nf integer := 0; bad text := ''; r jsonb; g jsonb; s jsonb; base jsonb; e text;
  ref1 text := 'fit-test-' || substr(md5(random()::text), 1, 10); ref2 text := 'fit-test-' || substr(md5(random()::text), 1, 10); ms bigint := (extract(epoch from now()) * 1000)::bigint; d text := ((now() at time zone 'utc')::date)::text;
begin
  -- A) the whitelist alone (pure: no rows)
  base := jsonb_build_object('sessionRef', 'x1', 'jobNumber', '26014', 'laidFt', 120, 'ended', false, 'junk', 'dropped');
  s := pb_prod.clean_status(base || '{"fit":{"n":3,"of":5,"tw":2,"b":1,"s":0,"o":0}}');
  n := n + 1; if s->'fit' is distinct from '{"n":3,"of":5,"tw":2,"b":1,"s":0,"o":0}'::jsonb then nf := nf + 1; bad := bad || ' 1:kept=' || coalesce((s->'fit')::text, 'null'); end if;
  n := n + 1; if s ? 'junk' or s->>'laidFt' <> '120' or s->>'sessionRef' <> 'x1' then nf := nf + 1; bad := bad || ' 2:rest=' || s::text; end if;
  -- a status with no fit (every phone before this update) comes out exactly as before
  n := n + 1; if pb_prod.clean_status(base) ? 'fit' or pb_prod.clean_status(base) is distinct from (s - 'fit') then nf := nf + 1; bad := bad || ' 3:nofit'; end if;
  -- text numbers, decimals, negatives, over the cap, true/false: not kept
  s := pb_prod.clean_status(base || '{"fit":{"n":"3"}}');                 n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 4:text=' || (s->'fit')::text; end if;
  s := pb_prod.clean_status(base || '{"fit":{"n":2.5}}');                 n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 5:decimal=' || (s->'fit')::text; end if;
  s := pb_prod.clean_status(base || '{"fit":{"n":-1}}');                  n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 6:negative=' || (s->'fit')::text; end if;
  s := pb_prod.clean_status(base || '{"fit":{"n":501}}');                 n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 7:cap=' || (s->'fit')::text; end if;
  s := pb_prod.clean_status(base || '{"fit":{"n":true}}');                n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 8:bool=' || (s->'fit')::text; end if;
  s := pb_prod.clean_status(base || '{"fit":{"n":1e400}}'::jsonb);        n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 9:huge=' || (s->'fit')::text; end if;
  s := pb_prod.clean_status(base || '{"fit":{"n":500,"of":500}}');        n := n + 1; if s->'fit' is distinct from '{"n":500,"of":500}'::jsonb then nf := nf + 1; bad := bad || ' 10:atcap=' || coalesce((s->'fit')::text, 'null'); end if;
  -- not an object, or no count: no fit at all
  s := pb_prod.clean_status(base || '{"fit":7}');                         n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 11:number'; end if;
  s := pb_prod.clean_status(base || '{"fit":[3,5]}');                     n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 12:array'; end if;
  s := pb_prod.clean_status(base || '{"fit":"<b>3</b>"}');                n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 13:text'; end if;
  s := pb_prod.clean_status(base || '{"fit":{"of":5,"tw":2}}');           n := n + 1; if s ? 'fit' then nf := nf + 1; bad := bad || ' 14:no_n=' || (s->'fit')::text; end if;
  -- types that do not add up to the count are dropped (the count stays); "of" below the count is dropped
  s := pb_prod.clean_status(base || '{"fit":{"n":3,"of":5,"tw":9,"b":1}}'); n := n + 1; if s->'fit' is distinct from '{"n":3,"of":5}'::jsonb then nf := nf + 1; bad := bad || ' 15:sum=' || coalesce((s->'fit')::text, 'null'); end if;
  s := pb_prod.clean_status(base || '{"fit":{"n":3,"of":2,"tw":3}}');     n := n + 1; if s->'fit' is distinct from '{"n":3,"tw":3}'::jsonb then nf := nf + 1; bad := bad || ' 16:of=' || coalesce((s->'fit')::text, 'null'); end if;
  -- anything else inside fit is dropped; zero is a real count
  s := pb_prod.clean_status(base || '{"fit":{"n":0,"of":4,"note":"<script>","items":[{"name":"x"}]}}'); n := n + 1; if s->'fit' is distinct from '{"n":0,"of":4}'::jsonb then nf := nf + 1; bad := bad || ' 17:extra=' || coalesce((s->'fit')::text, 'null'); end if;
  -- B) the functions as they stand: same kind as before, the helper closed to app roles
  n := n + 1; if not exists (select 1 from pg_proc p where p.oid = 'pb_prod.clean_status(jsonb)'::regprocedure and not p.prosecdef and p.provolatile = 's' and p.proconfig = array['search_path=""'] and p.prolang = (select oid from pg_language where lanname = 'sql'))
    then nf := nf + 1; bad := bad || ' 18:clean_status_kind'; end if;
  n := n + 1; if not exists (select 1 from pg_proc p where p.oid = 'pb_prod.whole(jsonb,integer)'::regprocedure and not p.prosecdef and p.provolatile = 'i' and p.proconfig = array['search_path=""'])
    or has_function_privilege('authenticated', 'pb_prod.whole(jsonb,integer)', 'execute') or has_function_privilege('anon', 'pb_prod.whole(jsonb,integer)', 'execute') or has_function_privilege('anon', 'pb_prod.clean_status(jsonb)', 'execute')
    then nf := nf + 1; bad := bad || ' 19:helper_kind_or_grants'; end if;
  -- C) end to end: a crew phone sends, the company account reads
  select c.id, c.owner_user_id, m.user_id into co, own, mem from public.companies c join public.company_members m on m.company_id = c.id
    where c.status = 'active' and c.owner_user_id is not null and pb_prod.my_company(m.user_id) = c.id and pb_prod.managed_company(c.owner_user_id) = c.id and m.user_id <> c.owner_user_id
    order by (m.role = 'pipelayer') desc limit 1;
  if co is null then raise exception 'RESULT: no company with an owner account and a crew member to test with (A and B: % checks, % failed%)', n, nf, bad; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', mem, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', mem::text, true);
  r := public.pb_prod_run_status_put(jsonb_build_object('sessionRef', ref1, 'runRef', ref1, 'jobNumber', 'FIT-TEST', 'workDate', d, 'laidFt', 60, 'totalFt', 200, 'ended', false, 'seq', ms, 'phoneAt', ms,
    'fit', '{"n":3,"of":5,"tw":2,"b":1,"s":0,"o":0}'::jsonb), mem, co);
  n := n + 1; if r->>'ok' is distinct from 'true' or r->>'stale' is distinct from 'false' then nf := nf + 1; bad := bad || ' 20:put=' || r::text; end if;
  -- an old phone (no fit) and a tampered one (fit full of junk) are both taken, without a fit
  r := public.pb_prod_run_status_put(jsonb_build_object('sessionRef', ref2, 'runRef', ref2, 'jobNumber', 'FIT-TEST', 'workDate', d, 'laidFt', 10, 'ended', false, 'seq', ms, 'phoneAt', ms,
    'fit', '{"n":"12; drop table","of":99999,"tw":[1]}'::jsonb), mem, co);
  n := n + 1; if r->>'ok' is distinct from 'true' or (select x.status ? 'fit' from pb_prod.run_status x where x.user_id = mem and x.company_id = co and x.session_ref = ref2) then nf := nf + 1; bad := bad || ' 21:junk_put=' || r::text; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', own::text, true);
  g := public.pb_prod_company_live(d::date);
  select x.run->'status' into s from (select jsonb_array_elements(p.person->'runs') as run from jsonb_array_elements(g->'people') p(person) where p.person->>'id' = mem::text) x where x.run->>'session_ref' = ref1;
  n := n + 1; if s->'fit' is distinct from '{"n":3,"of":5,"tw":2,"b":1,"s":0,"o":0}'::jsonb then nf := nf + 1; bad := bad || ' 22:board=' || coalesce(s::text, 'no row'); end if;
  select x.run->'status' into s from (select jsonb_array_elements(p.person->'runs') as run from jsonb_array_elements(g->'people') p(person) where p.person->>'id' = mem::text) x where x.run->>'session_ref' = ref2;
  n := n + 1; if s is null or s ? 'fit' or s->>'laidFt' <> '10' then nf := nf + 1; bad := bad || ' 23:board_nofit=' || coalesce(s::text, 'no row'); end if;
  -- a newer status with a new count replaces the old one
  perform set_config('request.jwt.claims', json_build_object('sub', mem, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', mem::text, true);
  r := public.pb_prod_run_status_put(jsonb_build_object('sessionRef', ref1, 'runRef', ref1, 'jobNumber', 'FIT-TEST', 'workDate', d, 'laidFt', 90, 'ended', false, 'seq', ms + 1, 'phoneAt', ms, 'fit', '{"n":4,"of":5,"tw":2,"b":2,"s":0,"o":0}'::jsonb), mem, co);
  n := n + 1; if (select x.status->'fit'->>'n' from pb_prod.run_status x where x.user_id = mem and x.company_id = co and x.session_ref = ref1) is distinct from '4' then nf := nf + 1; bad := bad || ' 24:newer'; end if;
  raise exception '%', 'RESULT: ' || case when nf = 0 then 'PASS' else 'FAIL' end || ' ' || (n - nf) || '/' || n || bad;
end $t$;
