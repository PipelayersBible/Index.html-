-- Read-only checks on the live data, run right after 01_owner_dashboard.sql in the SAME query (block_t01.sql = both).
-- Ends with an error starting 'RESULT:', so the function itself is rolled back too. Writes nothing (no fixtures).
do $t$
declare
  adm uuid := (select a.user_id from pb_support.admins a order by a.user_id limit 1);
  r jsonb; f text[] := '{}'; n int := 0; e text; t0 timestamptz := clock_timestamp(); ms int; k text; fl int;
begin
  if adm is null then raise exception 'RESULT: FAIL no app owner in pb_support.admins'; end if;
  -- refused: no login, a random login, the owner at aal1 when the owner has a two-step factor
  perform set_config('request.jwt.claim.sub', '', true); perform set_config('request.jwt.claims', '{}', true);
  begin perform public.pb_owner_dashboard(); e := 'let in'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:not_allowed' then f := f || ('no login: ' || e); end if;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true); perform set_config('request.jwt.claims', '{"aal":"aal2"}', true);
  begin perform public.pb_owner_dashboard(); e := 'let in'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:not_allowed' then f := f || ('other login: ' || e); end if;
  if exists (select 1 from auth.mfa_factors m where m.user_id = adm and m.status = 'verified') then
    perform set_config('request.jwt.claim.sub', adm::text, true); perform set_config('request.jwt.claims', '{"aal":"aal1"}', true);
    begin perform public.pb_owner_dashboard(); e := 'let in'; exception when others then e := sqlerrm; end;
    n := n + 1; if e <> 'pb:not_allowed' then f := f || ('owner at aal1: ' || e); end if;
  end if;
  -- the owner, as the API role
  perform set_config('request.jwt.claim.sub', adm::text, true); perform set_config('request.jwt.claims', '{"aal":"aal2","sub":"' || adm || '"}', true);
  execute 'set local role authenticated';
  begin r := public.pb_owner_dashboard(30); e := 'ok'; exception when others then e := sqlerrm; end;
  ms := round(extract(epoch from clock_timestamp() - t0) * 1000);
  n := n + 1; if e <> 'ok' then f := f || ('owner call: ' || e); end if;
  begin perform pb_support.dash_uc(); e := 'let in'; exception when others then e := sqlerrm; end;
  n := n + 1; if e not like 'permission denied%' then f := f || ('helper reachable: ' || e); end if;
  execute 'reset role';
  if r is not null then
    foreach k in array array['attention', 'money', 'costs', 'growth', 'security', 'reliability', 'safety', 'ask'] loop
      n := n + 1; if not r ? k then f := f || ('missing ' || k); end if;
    end loop;
    n := n + 1; if jsonb_array_length(r->'growth'->'by_day') <> 30 then f := f || 'by_day not 30'::text; end if;
    n := n + 1; if (r->'money'->'counts'->>'beta')::int + (r->'money'->'counts'->>'beta_ended')::int + (r->'money'->'counts'->>'paid')::int
                   + (r->'money'->'counts'->>'read_only')::int + (r->'money'->'counts'->>'canceled')::int
                   <> (select count(*) from public.companies c where c.status = 'active') then f := f || 'company counts do not add up'::text; end if;
    n := n + 1; if (r->'growth'->>'logins')::int <> (select count(*) from auth.users) then f := f || 'logins'::text; end if;
    if to_regclass('pb_auth.flags') is not null then
      execute 'select count(*) from pb_auth.flags where at > now() - interval ''7 days''' into fl;
      n := n + 1; if not (r->'security'->'share'->>'live')::boolean
                     or coalesce((select sum(v::int) from jsonb_each_text(r->'security'->'share'->'by_kind_7') x(k2, v)), 0) <> fl then f := f || 'share counts'::text; end if;
    else
      n := n + 1; if (r->'security'->'share'->>'live')::boolean then f := f || 'share should be not live'::text; end if;
    end if;
  end if;
  raise exception 'RESULT: %', jsonb_build_object('checks', case when cardinality(f) = 0 then 'all passed (' || n || ')' else 'FAIL ' || array_to_string(f, ' | ') end,
    'ms', ms, 'mrr_cents', r->'money'->'mrr_cents', 'companies', r->'money'->'counts', 'ai_mtd_usd', r->'costs'->'ai_mtd_usd',
    'share_live', r->'security'->'share'->'live', 'attention', (select jsonb_agg(a->>'level' || ': ' || (a->>'text')) from jsonb_array_elements(r->'attention') a));
end $t$;
