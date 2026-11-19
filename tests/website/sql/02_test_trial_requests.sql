-- 02_test_trial_requests.sql: rolled-back test for 01_trial_requests.sql.
-- Run 01 and this file together in ONE call (tools/test_sql.sh prints the combined query). The DO block always ends in
-- raise exception 'RESULT: ...', so the whole call (the table, the functions and the test rows) is rolled back.
-- Expected: RESULT: PASS 14/14
do $test$
declare
  r jsonb; pass int := 0; total int := 0; fails text := ''; i int; v_id uuid;
  ip text := 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
begin
  -- 1 a good request is stored, trimmed, email lowercased, blanks become null
  r := public.pb_trial_request_add('  Joe Smith ', 'Acme Pipeline', 'Superintendent', ' Joe@Example.com ', '', '8-15', null, ip, 'test-agent');
  total := total + 1;
  if (r->>'ok')::boolean and exists (select 1 from pb_support.trial_requests where id = (r->>'id')::uuid and name = 'Joe Smith'
      and email = 'joe@example.com' and phone is null and crew_size = '8-15' and status = 'new' and notified_at is null)
  then pass := pass + 1; else fails := fails || ' [1 stored]' || r::text; end if;
  v_id := (r->>'id')::uuid;

  -- 2 mark notified once, second call is a no-op
  total := total + 1;
  r := public.pb_trial_request_notified(v_id);
  if (r->>'ok')::boolean and not (public.pb_trial_request_notified(v_id)->>'ok')::boolean   -- separate statements: one command can't see its own update
     and (select notified_at is not null from pb_support.trial_requests where id = v_id)
  then pass := pass + 1; else fails := fails || ' [2 notified]'; end if;

  -- 3 bad role refused as invalid, nothing stored
  r := public.pb_trial_request_add('A', 'B', 'CEO', 'a@b.co', null, null, null, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', null);
  total := total + 1;
  if r->>'error' = 'invalid' and not exists (select 1 from pb_support.trial_requests where ip_hash = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
  then pass := pass + 1; else fails := fails || ' [3 role]' || r::text; end if;

  -- 4 bad email refused
  r := public.pb_trial_request_add('A', 'B', 'Owner', 'not-an-email', null, null, null, null, null);
  total := total + 1; if r->>'error' = 'invalid' then pass := pass + 1; else fails := fails || ' [4 email]' || r::text; end if;

  -- 5 too-long message refused
  r := public.pb_trial_request_add('A', 'B', 'Owner', 'a@b.co', null, null, repeat('x', 2001), null, null);
  total := total + 1; if r->>'error' = 'invalid' then pass := pass + 1; else fails := fails || ' [5 long]' || r::text; end if;

  -- 6 empty name refused
  r := public.pb_trial_request_add('   ', 'B', 'Owner', 'a@b.co', null, null, null, null, null);
  total := total + 1; if r->>'error' = 'invalid' then pass := pass + 1; else fails := fails || ' [6 empty name]' || r::text; end if;

  -- 7 rate limit: the same IP gets 5 an hour (1 already), the 6th is refused
  for i in 2..5 loop r := public.pb_trial_request_add('P' || i, 'C', 'Foreman', 'p' || i || '@x.co', null, null, null, ip, null); end loop;
  r := public.pb_trial_request_add('P6', 'C', 'Foreman', 'p6@x.co', null, null, null, ip, null);
  total := total + 1;
  if r->>'error' = 'rate' and (select count(*) from pb_support.trial_requests where ip_hash = ip) = 5
  then pass := pass + 1; else fails := fails || ' [7 rate]' || r::text; end if;

  -- 8 another IP is not limited
  r := public.pb_trial_request_add('Q', 'C', 'Other', 'q@x.co', null, null, null, 'cccccccccccccccccccccccccccccccc', null);
  total := total + 1; if (r->>'ok')::boolean then pass := pass + 1; else fails := fails || ' [8 other ip]' || r::text; end if;

  -- 9 an hour later the IP may send again
  update pb_support.trial_requests set created_at = now() - interval '61 minutes' where ip_hash = ip;
  r := public.pb_trial_request_add('P7', 'C', 'Foreman', 'p7@x.co', null, null, null, ip, null);
  total := total + 1; if (r->>'ok')::boolean then pass := pass + 1; else fails := fails || ' [9 after hour]' || r::text; end if;

  -- 10 RLS on, no policies
  total := total + 1;
  if (select relrowsecurity from pg_class where oid = 'pb_support.trial_requests'::regclass)
     and not exists (select 1 from pg_policies where schemaname = 'pb_support' and tablename = 'trial_requests')
  then pass := pass + 1; else fails := fails || ' [10 rls]'; end if;

  -- 11 anon / authenticated have no table rights
  total := total + 1;
  if not has_table_privilege('anon', 'pb_support.trial_requests', 'SELECT,INSERT,UPDATE,DELETE')
     and not has_table_privilege('authenticated', 'pb_support.trial_requests', 'SELECT,INSERT,UPDATE,DELETE')
  then pass := pass + 1; else fails := fails || ' [11 table grants]'; end if;

  -- 12 anon / authenticated can't call the functions; service_role can
  total := total + 1;
  if not has_function_privilege('anon', 'public.pb_trial_request_add(text,text,text,text,text,text,text,text,text)', 'EXECUTE')
     and not has_function_privilege('authenticated', 'public.pb_trial_request_add(text,text,text,text,text,text,text,text,text)', 'EXECUTE')
     and not has_function_privilege('anon', 'public.pb_trial_request_notified(uuid)', 'EXECUTE')
     and not has_function_privilege('authenticated', 'public.pb_trial_request_notified(uuid)', 'EXECUTE')
     and has_function_privilege('service_role', 'public.pb_trial_request_add(text,text,text,text,text,text,text,text,text)', 'EXECUTE')
     and has_function_privilege('service_role', 'public.pb_trial_request_notified(uuid)', 'EXECUTE')
  then pass := pass + 1; else fails := fails || ' [12 function grants]'; end if;

  -- 13 both functions are SECURITY DEFINER with an empty search_path
  total := total + 1;
  if (select bool_and(prosecdef and proconfig = array['search_path=""']) from pg_proc
      where oid in ('public.pb_trial_request_add(text,text,text,text,text,text,text,text,text)'::regprocedure, 'public.pb_trial_request_notified(uuid)'::regprocedure))
  then pass := pass + 1; else fails := fails || ' [13 definer]'; end if;

  -- 14 a bad ip_hash (not hex) is refused rather than stored
  r := public.pb_trial_request_add('Z', 'C', 'Owner', 'z@x.co', null, null, null, 'not hex!', null);
  total := total + 1; if r->>'error' = 'invalid' then pass := pass + 1; else fails := fails || ' [14 ip hash]' || r::text; end if;

  raise exception 'RESULT: % %/% %', case when pass = total then 'PASS' else 'FAIL' end, pass, total, coalesce(nullif(fails, ''), '');
end
$test$;
