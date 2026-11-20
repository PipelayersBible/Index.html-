-- Paste as ONE query on live. It applies the migration and runs the checks, then ENDS WITH AN ERROR on purpose so
-- everything rolls back. Success = an error starting  RESULT: {"checks": "all passed"}. Anything else (FAIL / pb_patch:) = stop.
-- billing_yearly_nov20: (1) the individual's Monthly / Yearly pick travels with the plan request and Turn On uses it;
-- (2) the app owner's Billing can show plan sheets read (this month, last month, total) per company and per individual.
-- STAGED. Apply as ONE migration (one transaction). Additive: 1 nullable column, 1 new function, 3 functions replaced.
-- Guard: refuses to run if any of the 3 functions it replaces is not exactly what was read on live on Nov 20 2026
-- (unless it is already this file's version, so applying twice is safe).
do $g$
declare r record;
begin
  for r in select * from (values
      ('public.pb_plan_request(text)', 'e83d01b766df58b545d1188d289e5c48', 'billing_yearly_nov20'),
      ('public.pb_owner_plan_requests()', '94a2c6e43a655c5d76f0ac2279780579', 'billing_yearly_nov20'),
      ('public.pb_owner_individual_on(uuid)', '844442ffe75cbb68911166515718bcfb', null)) v(sig, md5, mark) loop
    if to_regprocedure(r.sig) is null then
      if r.mark is null and to_regprocedure('public.pb_owner_individual_on(uuid,text)') is not null then continue; end if; -- already applied
      raise exception 'pb_patch: % is missing', r.sig;
    end if;
    if md5(pg_get_functiondef(to_regprocedure(r.sig))) <> r.md5
       and not (r.mark is not null and pg_get_functiondef(to_regprocedure(r.sig)) like '%' || r.mark || '%') then
      raise exception 'pb_patch: % is not the Nov 20 live version (md5 %). Nothing applied.', r.sig, md5(pg_get_functiondef(to_regprocedure(r.sig)));
    end if;
  end loop;
end $g$;

-- 1. which billing period the person picked (null = asked before this change, or a company request)
alter table pb_billing.plan_requests add column if not exists billing_interval text;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'plan_requests_billing_interval_check' and conrelid = 'pb_billing.plan_requests'::regclass) then
    alter table pb_billing.plan_requests add constraint plan_requests_billing_interval_check check (billing_interval is null or billing_interval in ('month', 'year'));
  end if;
end $c$;

-- 2. the request: p_kind 'individual:month' / 'individual:year' carries the pick (same signature, so old apps keep working:
--    'individual' and 'company' behave exactly as before)
create or replace function public.pb_plan_request(p_kind text default 'individual'::text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_kind text := case when p_kind = 'company' then 'company' else 'individual' end; v_n integer;
  v_int text := case when p_kind = 'individual:year' then 'year' when p_kind = 'individual:month' then 'month' end; -- billing_yearly_nov20
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'code', 'pb:signed_out'); end if;
  select x.company_id into v_co from pb_billing.company_of(v_uid) x;
  insert into pb_billing.plan_requests (user_id, company_id, kind, billing_interval) values (v_uid, v_co, v_kind, v_int)
    on conflict (user_id, kind) do update set
      created_at = case when pb_billing.plan_requests.done_at is not null then now() else pb_billing.plan_requests.created_at end,
      done_at = null, billing_interval = coalesce(excluded.billing_interval, pb_billing.plan_requests.billing_interval);
  select count(*) into v_n from pb_support.messages m where m.user_id = v_uid and m.created_at > now() - interval '1 day';
  if v_n < 30 then
    insert into pb_support.messages (user_id, client_message_id, body, app_build, screen, kind, company_id)
      values (v_uid, 'plan-' || v_kind || '-' || to_char(now() at time zone 'utc', 'YYYYMMDD'),
              case when v_kind = 'company' then 'Asked for the company to start a paid plan (end of beta).' else 'Asked for an individual plan' || case when v_co is null then '.' else ' (end of beta).' end end
                || case when v_int = 'year' then ' Picked yearly: $' || to_char(pb_billing.setting_int('individual_year_cents', 14400) / 100.0, 'FM999990.00') || ' a year, plus tax.'
                        when v_int = 'month' then ' Picked monthly: $' || to_char(pb_billing.setting_int('individual_cents', 1500) / 100.0, 'FM999990.00') || ' a month, plus tax.'
                        else ' Price shown: $' || case when v_kind = 'company' then to_char(pb_billing.setting_int('base_cents', 9900) / 100.0, 'FM999990.00') || ' a month'
                     else to_char(pb_billing.setting_int('individual_cents', 1500) / 100.0, 'FM999990.00') || ' a month or $' || to_char(pb_billing.setting_int('individual_year_cents', 14400) / 100.0, 'FM999990.00') || ' a year' end || ', plus tax.' end,
              null, 'Beta ended', 'idea', v_co)
      on conflict (user_id, client_message_id) do nothing;
  end if;
  return jsonb_build_object('ok', true);
end $function$;

-- 3. the owner's list of requests carries the pick ('interval': 'month' | 'year' | null)
create or replace function public.pb_owner_plan_requests()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  return jsonb_build_object('ok', true, 'requests', (select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'kind', r.kind, 'at', r.created_at,
      'who', coalesce(pb_prod.member_name_or_null(r.company_id, r.user_id), (select u.email from auth.users u where u.id = r.user_id)),
      'email', (select u.email from auth.users u where u.id = r.user_id),
      'interval', r.billing_interval, -- billing_yearly_nov20
      'company', (select c.name from public.companies c where c.id = r.company_id)) order by r.created_at desc), '[]'::jsonb)
    from pb_billing.plan_requests r where r.done_at is null));
end $function$;

-- 4. Turn On: Monthly or Yearly. p_interval null = what the person picked, else monthly (as before).
drop function if exists public.pb_owner_individual_on(uuid);
create or replace function public.pb_owner_individual_on(p_user uuid, p_interval text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_int text;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  v_int := case when p_interval in ('month', 'year') then p_interval
                else coalesce((select r.billing_interval from pb_billing.plan_requests r where r.user_id = p_user and r.kind = 'individual' and r.done_at is null), 'month') end;
  if exists (select 1 from public.subscriptions s where s.user_id = p_user) then
    update public.subscriptions set tier = 'individual', status = 'active', updated_at = now() where user_id = p_user;
  else
    insert into public.subscriptions (user_id, tier, status) values (p_user, 'individual', 'active');
  end if;
  update pb_billing.plan_requests set done_at = now() where user_id = p_user and kind = 'individual' and done_at is null;
  perform pb_billing.individual_open(p_user, v_int);  -- pricing Nov 20; billing_yearly_nov20: the picked period
  perform pb_audit.admin_note('individual_plan_on', null, p_user, jsonb_build_object('interval', v_int)); -- r16.85
  return jsonb_build_object('ok', true, 'interval', v_int,
    'account', (select x from jsonb_array_elements(pb_billing.individuals_json()) x where x->>'user_id' = p_user::text limit 1));
end $function$;
revoke all on function public.pb_owner_individual_on(uuid, text) from public;
do $a$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on function public.pb_owner_individual_on(uuid, text) from anon'; end if; end $a$;
grant execute on function public.pb_owner_individual_on(uuid, text) to authenticated;

-- 5. plan sheets read. A sheet counts once, when it is read (pb_plans.sheets.state = 'done', read_at set by
--    pb_plans_svc_put; nothing moves a sheet out of 'done' and nothing deletes sheets). Months are UTC calendar months,
--    the same clock as the billing dates (current_date). Sheets of a removed set still count: they were read.
create or replace function public.pb_owner_sheets_read()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare m0 timestamptz := date_trunc('month', now()); m1 timestamptz := date_trunc('month', now()) - interval '1 month';
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  return (with r as (
      select s.company_id, case when s.company_id is null then s.owner_user end as user_id, h.read_at, h.usd
        from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id
       where h.state = 'done' and h.read_at is not null),
    g as (select company_id, user_id,
        count(*) filter (where read_at >= m0) as month, count(*) filter (where read_at >= m1 and read_at < m0) as last_month,
        count(*) as total, round(coalesce(sum(usd) filter (where read_at >= m0), 0), 2) as usd_month
      from r group by company_id, user_id)
    select jsonb_build_object('ok', true, 'month_start', (m0 at time zone 'utc')::date, 'sheet_cents', pb_billing.setting_int('plan_sheet_cents', 100),
      'companies', coalesce((select jsonb_agg(jsonb_build_object('company_id', g.company_id, 'month', g.month, 'last_month', g.last_month, 'total', g.total, 'usd_month', g.usd_month)) from g where g.company_id is not null), '[]'::jsonb),
      'individuals', coalesce((select jsonb_agg(jsonb_build_object('user_id', g.user_id, 'email', (select u.email::text from auth.users u where u.id = g.user_id), 'month', g.month, 'last_month', g.last_month, 'total', g.total)) from g where g.company_id is null and g.user_id is not null), '[]'::jsonb),
      'all', (select jsonb_build_object('month', coalesce(sum(g.month), 0), 'last_month', coalesce(sum(g.last_month), 0), 'total', coalesce(sum(g.total), 0)) from g)));
end $function$;
revoke all on function public.pb_owner_sheets_read() from public;
do $a$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on function public.pb_owner_sheets_read() from anon'; end if; end $a$;
grant execute on function public.pb_owner_sheets_read() to authenticated;

notify pgrst, 'reload schema';

do $t$
declare
  A uuid := 'aaaaaaaa-0000-4000-8000-00000000ad01'; U1 uuid := 'aaaaaaaa-0000-4000-8000-000000000a01'; U2 uuid := 'aaaaaaaa-0000-4000-8000-000000000a02';
  U3 uuid := 'aaaaaaaa-0000-4000-8000-000000000a03'; U4 uuid := 'aaaaaaaa-0000-4000-8000-000000000a04'; U5 uuid := 'aaaaaaaa-0000-4000-8000-000000000a05';
  C1 uuid := 'aaaaaaaa-0000-4000-8000-0000000000c1'; S1 uuid := 'aaaaaaaa-0000-4000-8000-0000000000e1'; S2 uuid := 'aaaaaaaa-0000-4000-8000-0000000000e2';
  j jsonb; n int; t text; d date; f text[] := '{}'; npass int := 0; m0 timestamptz := date_trunc('month', now());
  lm int;
begin
  insert into auth.users (id, email) values (A, 'ytest-admin@example.invalid'), (U1, 'ytest-1@example.invalid'), (U2, 'ytest-2@example.invalid'), (U3, 'ytest-3@example.invalid'), (U4, 'ytest-4@example.invalid'), (U5, 'ytest-5@example.invalid');
  insert into pb_support.admins (user_id) values (A);
  insert into public.companies (id, name, owner_user_id, status, plan) values (C1, 'YTest Co', U3, 'active', 'paid');
  -- plan sets: S1 live set, S2 removed set
  insert into pb_plans.sets (id, company_id, owner_user, created_by, job_key, job_number, title, pages, sha256, state) values
    (S1, C1, null, U3, 'ytest', 'YT-1', 'Plans', 7, repeat('a', 64), 'ready'), (S2, C1, null, U3, 'ytest', 'YT-1', 'Old', 1, repeat('b', 64), 'removed');
  insert into pb_plans.sheets (set_id, page, state, read_at, usd) values
    (S1, 1, 'done', m0 + interval '1 hour', 0.30), (S1, 2, 'done', m0 + interval '2 hours', 0.20), (S1, 3, 'done', now(), 0.10),
    (S1, 4, 'done', m0 - interval '3 days', 0.25), (S1, 5, 'done', m0 - interval '20 days', 0.25),
    (S1, 6, 'failed', null, 0.05), (S1, 7, 'waiting', null, 0), (S2, 1, 'done', m0 + interval '3 hours', 0.40);

  -- 1. requests
  perform set_config('request.jwt.claims', json_build_object('sub', U1, 'role', 'authenticated')::text, true);
  j := public.pb_plan_request('individual:year');
  if not (j->>'ok')::boolean then f := f || 'FAIL 1a request ok'; end if;
  select billing_interval into t from pb_billing.plan_requests where user_id = U1 and kind = 'individual';
  if t is distinct from 'year' then f := f || ('FAIL 1b U1 interval ' || coalesce(t, 'null')); end if;
  select body into t from pb_support.messages where user_id = U1 order by created_at desc limit 1;
  if t not like '%Picked yearly: $144.00 a year, plus tax.%' then f := f || ('FAIL 1c note: ' || coalesce(t, 'none')); end if;
  j := public.pb_plan_request('individual:month');  -- changes their mind while it waits
  select billing_interval into t from pb_billing.plan_requests where user_id = U1 and kind = 'individual';
  if t is distinct from 'month' then f := f || ('FAIL 1d changed mind ' || coalesce(t, 'null')); end if;
  j := public.pb_plan_request('individual:year');
  select count(*) into n from pb_billing.plan_requests where user_id = U1;
  if n <> 1 then f := f || ('FAIL 1e one row per person and kind: ' || n); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', U2, 'role', 'authenticated')::text, true);
  j := public.pb_plan_request('individual');  -- an old app
  select billing_interval into t from pb_billing.plan_requests where user_id = U2 and kind = 'individual';
  if t is not null then f := f || 'FAIL 2a old app: no interval'; end if;
  select body into t from pb_support.messages where user_id = U2 order by created_at desc limit 1;
  if t not like '%Price shown: $15.00 a month or $144.00 a year, plus tax.%' then f := f || ('FAIL 2b old note: ' || coalesce(t, 'none')); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', U3, 'role', 'authenticated')::text, true);
  j := public.pb_plan_request('company');
  select billing_interval into t from pb_billing.plan_requests where user_id = U3 and kind = 'company';
  if not found or t is not null then f := f || 'FAIL 3a company request unchanged'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', U5, 'role', 'authenticated')::text, true);
  j := public.pb_plan_request('individual:month');
  -- 4. non-admin is refused
  begin perform public.pb_owner_individual_on(U5, 'year'); f := f || 'FAIL 4a non-admin Turn On'; exception when others then if sqlerrm not like '%pb:not_allowed%' then f := f || ('FAIL 4a ' || sqlerrm); end if; end;
  begin perform public.pb_owner_sheets_read(); f := f || 'FAIL 4b non-admin sheets read'; exception when others then if sqlerrm not like '%pb:not_allowed%' then f := f || ('FAIL 4b ' || sqlerrm); end if; end;
  -- 5. admin: requests carry the pick
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  j := public.pb_owner_plan_requests();
  select x->>'interval' into t from jsonb_array_elements(j->'requests') x where x->>'user_id' = U1::text;
  if t is distinct from 'year' then f := f || ('FAIL 5a U1 request interval ' || coalesce(t, 'null')); end if;
  select count(*) into n from jsonb_array_elements(j->'requests') x where x->>'user_id' = U2::text and x ? 'interval' and x->'interval' = 'null'::jsonb;
  if n <> 1 then f := f || 'FAIL 5b U2 interval null'; end if;
  -- 6. Turn On uses the pick
  j := public.pb_owner_individual_on(U1);
  select billing_interval, paid_through into t, d from pb_billing.individual_accounts where user_id = U1;
  if t is distinct from 'year' or d is distinct from (current_date + interval '1 year')::date or j->>'interval' <> 'year' or (j->'account'->'next'->>'amount_cents')::int <> 14400 then f := f || ('FAIL 6a U1 yearly ' || coalesce(t, 'null') || ' ' || coalesce(d::text, 'null') || ' ' || j::text); end if;
  select count(*) into n from pb_billing.plan_requests where user_id = U1 and done_at is null;
  if n <> 0 then f := f || 'FAIL 6b request done'; end if;
  select count(*) into n from public.subscriptions where user_id = U1 and tier = 'individual' and status = 'active';
  if n <> 1 then f := f || 'FAIL 6c subscription on'; end if;
  j := public.pb_owner_individual_on(U2, 'year');  -- the owner's pick wins over "no pick"
  select billing_interval into t from pb_billing.individual_accounts where user_id = U2;
  if t is distinct from 'year' then f := f || 'FAIL 6d explicit year'; end if;
  j := public.pb_owner_individual_on(U4);  -- no request at all: monthly, as before
  select billing_interval, paid_through into t, d from pb_billing.individual_accounts where user_id = U4;
  if t is distinct from 'month' or d is distinct from (current_date + interval '1 month')::date then f := f || 'FAIL 6e no pick = month'; end if;
  execute 'select public.pb_owner_individual_on(p_user => $1)' into j using U5;  -- the old app's call shape (named p_user only), U5 picked month
  select billing_interval into t from pb_billing.individual_accounts where user_id = U5;
  if t is distinct from 'month' or not (j->>'ok')::boolean then f := f || 'FAIL 6f old call shape'; end if;
  -- 7. existing Paid with a period switch (the app's "Paid for a year instead")
  select paid_through into d from pb_billing.individual_accounts where user_id = U4;
  j := public.pb_owner_individual_paid(U4, d, 'year');
  select billing_interval into t from pb_billing.individual_accounts where user_id = U4;
  if t is distinct from 'year' or not (j->>'ok')::boolean then f := f || 'FAIL 7a paid for a year switches'; end if;
  -- 8. sheets read
  lm := case when date_trunc('month', m0 - interval '20 days') = m0 - interval '1 month' then 2 else 1 end;
  j := public.pb_owner_sheets_read();
  select x into j from jsonb_array_elements(j->'companies') x where x->>'company_id' = C1::text;
  if (j->>'month')::int <> 4 or (j->>'last_month')::int <> lm or (j->>'total')::int <> 6 or (j->>'usd_month')::numeric <> 1.00 then
    f := f || ('FAIL 8a C1 counts ' || coalesce(j::text, 'missing')); end if;
  j := public.pb_owner_sheets_read();
  if (j->'all'->>'total')::int < 6 or (j->>'sheet_cents')::int <> 100 or jsonb_typeof(j->'individuals') <> 'array' then f := f || ('FAIL 8b totals ' || (j - 'companies')::text); end if;
  -- 9. who may call the new / changed functions
  if has_function_privilege('anon', 'public.pb_owner_individual_on(uuid,text)', 'execute') or has_function_privilege('anon', 'public.pb_owner_sheets_read()', 'execute') then f := f || 'FAIL 9a anon can execute'; end if;
  if not has_function_privilege('authenticated', 'public.pb_owner_individual_on(uuid,text)', 'execute') or not has_function_privilege('authenticated', 'public.pb_owner_sheets_read()', 'execute') then f := f || 'FAIL 9b authenticated cannot execute'; end if;
  if to_regprocedure('public.pb_owner_individual_on(uuid)') is not null then f := f || 'FAIL 9c old 1-arg Turn On still there (ambiguous)'; end if;
  if array_length(f, 1) is null then raise exception 'RESULT: {"checks": "all passed"} (rolled back, nothing kept)'; else raise exception 'RESULT: %', array_to_string(f, ' | '); end if;
end
 $t$;
