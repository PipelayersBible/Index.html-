-- Local only (throwaway Postgres): fixtures, then checks of pb_owner_dashboard's numbers and its gate. Ends with RESULT.
create function pg_temp.ck(ok boolean, label text, inout fails text[], inout n int) language plpgsql as $$
begin n := n + 1; if ok is not true then fails := fails || label; end if; end $$;

do $t$
declare
  adm uuid := 'aaaaaaaa-0000-4000-8000-000000000001'; boss uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  crew uuid := 'cccccccc-0000-4000-8000-000000000003'; quiet uuid := 'dddddddd-0000-4000-8000-000000000004';
  ind uuid := 'eeeeeeee-0000-4000-8000-000000000005'; boss2 uuid := 'ffffffff-0000-4000-8000-000000000006';
  cb uuid := '10000000-0000-4000-8000-00000000000b';  -- beta, ends in 5 days
  cp uuid := '20000000-0000-4000-8000-00000000000c';  -- paid monthly, 7 seats, renews in 3 days
  cy uuid := '30000000-0000-4000-8000-00000000000d';  -- paid yearly, past due
  r jsonb; f text[] := '{}'; n int := 0; e text; a jsonb;
begin
  insert into auth.users (id, email, created_at) values (adm, 'tommy@admin.test', now() - interval '60 days'), (boss, 'boss@beta.test', now() - interval '3 days'),
    (crew, 'crew@beta.test', now() - interval '2 days'), (quiet, 'quiet@paid.test', now() - interval '40 days'), (ind, 'solo@ind.test', now() - interval '20 days'),
    (boss2, 'boss@paid.test', now() - interval '50 days');
  insert into pb_support.admins values (adm);
  insert into auth.mfa_factors (id, user_id, status) values (gen_random_uuid(), adm, 'verified');
  insert into public.companies (id, name, owner_user_id, status, plan, trial_ends_at, created_at) values
    (cb, 'Beta Pipe', boss, 'active', 'trial', now() + interval '5 days', now() - interval '3 days'),
    (cp, 'Paid Pipe', boss2, 'active', 'paid', null, now() - interval '50 days'),
    (cy, 'Year Co', adm, 'active', 'paid', null, now() - interval '60 days');
  insert into public.company_members (id, company_id, user_id, role) values (gen_random_uuid(), cb, crew, 'foreman'), (gen_random_uuid(), cp, quiet, 'pipelayer');
  for i in 1..6 loop insert into public.company_members (id, company_id, user_id, role) values (gen_random_uuid(), cp, gen_random_uuid(), 'pipelayer'); end loop;  -- 7 members
  insert into pb_billing.accounts (company_id, legal_name, seats_paid, base_seats, base_cents, seat_cents, billing_interval, yearly_months, plan_reading, state, paid_through, grace_days, founder_until, billing_address)
    values (cp, 'Paid Pipe LLC', 7, 5, 9900, 1200, 'month', 10, false, 'active', current_date + 3, 7, current_date + 300, '{"state":"NV"}'),
           (cy, 'Year Co LLC', 5, 5, 9900, 1200, 'year', 10, false, 'active', current_date - 2, 7, null, '{"state":"CA"}');
  insert into pb_billing.individual_accounts (user_id, cents, year_cents, billing_interval, paid_through, grace_days, state) values (ind, 1500, 14400, 'year', current_date + 100, 7, 'active');
  -- use
  insert into pb_billing.usage (day, user_id, ev, n) values (current_date, boss, 'open', 3), (current_date, crew, 'open', 1), (current_date - 1, boss, 'scr:home', 4),
    (current_date - 20, quiet, 'open', 1), (current_date, crew, 'build:r17.11', 1), (current_date - 3, boss, 'build:r17.10', 1), (current_date, boss, 'build:r17.11', 1),
    (current_date, crew, 'crash', 4), (current_date - 1, boss, 'crash', 3), (current_date - 9, boss, 'crash', 1);
  insert into public.ai_usage values (crew, current_date, 'teacher', 10), (boss, current_date - 1, 'analysis', 2), (crew, current_date, 'stake', 5);
  insert into pb_billing.ai_cost values (current_date, crew, 'teacher', 10, 0.50), (current_date - 1, boss, 'analysis', 2, 0.20), (current_date, crew, 'stake', 5, 0.10);
  insert into pb_billing.ai_pool values (cb::text, current_date, 17, 25.00), ('u:' || ind, current_date, 3, 2.60);
  -- work
  insert into pb_prod.run_records (id, company_id, user_id, work_date, laid_ft, created_at) values (gen_random_uuid(), cb, crew, current_date, 120, now() - interval '1 day');
  insert into pb_daily.reports (id, company_id, foreman_uid, received_at) values (gen_random_uuid(), cb, crew, now());
  -- safety
  insert into pb_safety.open_permits (user_id, client_permit_id, company_id, space, first_saved_at, saved_at) values (crew, 'p1', cb, 'MH-4', now() - interval '9 hours', now() - interval '1 hour');
  insert into pb_safety.em_notices (id, company_id, permit_ref, started_at, created_at) values (1, cb, 'p1', now() - interval '1 day', now() - interval '1 day'), (2, cb, 'p1', now() - interval '1 day', now() - interval '1 day');
  insert into pb_prod.locates (id, company_id, job_number, ticket_no, expires_at, closed) values (gen_random_uuid(), cb, 'J-1', 'T-99', current_date - 4, false);
  insert into pb_prod.state_rules (code, recheck_by) values ('NV', current_date - 1), ('CA', current_date + 30);
  -- reliability
  insert into pb_backup.runs (id, started_at, finished_at, status) values (1, now() - interval '2 hours', now() - interval '1 hour', 'done');
  insert into pb_prod.run_seal_checks (id, matches, checked_at) values (1, true, now()), (2, false, now());
  insert into pb_plans.sets (id, company_id, title, pages, state, created_at) values (gen_random_uuid(), cb, 'Sheet set', 9, 'reading', now() - interval '3 days');
  insert into pb_push.subscriptions (id, dead_at) values (gen_random_uuid(), now()), (gen_random_uuid(), null);
  insert into pb_push.outbox (id, given_up_at) values (gen_random_uuid(), now());
  insert into pb_support.messages (id, user_id, client_message_id, body, app_build, status, created_at) values (gen_random_uuid(), crew, 'm1', 'secret body text', 'r17.11 · 2026-11-20', 'new', now());
  insert into pb_ai.gaps (id, created_at, source, question, reason, status) values (1, now(), 'not_right', 'How deep before I need a box?', 'not_right', 'new');
  insert into pb_reports.reports (id, company_id, body, created_at) values (gen_random_uuid(), cb, 'anonymous report text', now());
  insert into pb_legal.acceptances (id, user_id, terms_version, accepted_at) values (1, boss, '1.0', now()), (2, crew, '1.0', now()), (3, crew, '1.1', now() + interval '1 second');
  insert into auth.sessions (id, user_id) select gen_random_uuid(), boss from generate_series(1, 3);

  -- the gate: no login, a non-owner, the owner without the two-step code, then the owner with it
  perform set_config('request.jwt.claim.sub', '', true);
  begin perform public.pb_owner_dashboard(); e := 'let in'; exception when others then e := sqlerrm; end;
  select * into f, n from pg_temp.ck(e = 'pb:not_allowed', 'no login refused', f, n);
  perform set_config('request.jwt.claim.sub', boss::text, true); perform set_config('request.jwt.claims', '{"aal":"aal1"}', true);
  begin perform public.pb_owner_dashboard(); e := 'let in'; exception when others then e := sqlerrm; end;
  select * into f, n from pg_temp.ck(e = 'pb:not_allowed', 'company owner refused', f, n);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  begin perform public.pb_owner_dashboard(); e := 'let in'; exception when others then e := sqlerrm; end;
  select * into f, n from pg_temp.ck(e = 'pb:not_allowed', 'app owner without the two-step code refused', f, n);
  perform set_config('request.jwt.claims', '{"aal":"aal2"}', true);
  r := public.pb_owner_dashboard(30);

  select * into f, n from pg_temp.ck((r->>'ok')::boolean, 'ok', f, n);
  -- money: Paid Pipe 9900 + 2*1200 = 12300; Year Co past due 9900*10/12 = 8250; individual 14400/12 = 1200
  select * into f, n from pg_temp.ck((r->'money'->>'company_mrr_cents')::int = 12300 + 8250, 'company MRR ' || (r->'money'->>'company_mrr_cents'), f, n);
  select * into f, n from pg_temp.ck((r->'money'->>'individual_mrr_cents')::int = 1200, 'individual MRR', f, n);
  select * into f, n from pg_temp.ck((r->'money'->'counts'->>'beta')::int = 1 and (r->'money'->'counts'->>'past_due')::int = 1, 'counts beta/past due', f, n);
  select * into f, n from pg_temp.ck((r->'money'->>'beta_pipeline_cents')::int = 9900, 'beta pipeline (1 member)', f, n);
  select * into f, n from pg_temp.ck(jsonb_array_length(r->'money'->'renewals_30') = 2, 'renewals in 30 days', f, n);
  select * into f, n from pg_temp.ck(r->'money'->'founder_locks'->0->>'company' = 'Paid Pipe', 'founder lock listed', f, n);
  -- costs
  select * into f, n from pg_temp.ck((r->'costs'->>'ai_today_usd')::numeric = 0.60, 'AI today ' || (r->'costs'->>'ai_today_usd'), f, n);
  select * into f, n from pg_temp.ck(jsonb_array_length(r->'costs'->'ai_by_day') = 30, '30 days of AI bars', f, n);
  select * into f, n from pg_temp.ck(r->'costs'->'ai_by_company'->0->>'company' = 'Beta Pipe', 'AI by company', f, n);
  select * into f, n from pg_temp.ck((select (s->>'pct')::int from jsonb_array_elements(r->'costs'->'stops') s where s->>'who' = 'Beta Pipe') = 83, 'Beta Pipe 83% of $30', f, n);
  select * into f, n from pg_temp.ck((select (s->>'pct')::int from jsonb_array_elements(r->'costs'->'stops') s where s->>'who' = 'solo@ind.test') = 104, 'individual 104% of $2.50', f, n);
  select * into f, n from pg_temp.ck((select (s->>'stop')::numeric from jsonb_array_elements(r->'costs'->'stops') s where s->>'who' = 'Paid Pipe') = 28.50, 'Paid Pipe stop 22 + 2 x 3.25', f, n);
  -- growth
  select * into f, n from pg_temp.ck((r->'growth'->>'active_today')::int = 2 and (r->'growth'->>'active_30')::int = 3, 'active today / 30', f, n);
  select * into f, n from pg_temp.ck(r->'growth'->'quiet'->0->>'who' = 'quiet@paid.test' and (r->'growth'->'quiet'->0->>'days')::int = 20, 'gone quiet', f, n);
  select * into f, n from pg_temp.ck(r->'growth'->'quiet_companies' ? 'Paid Pipe' and r->'growth'->'quiet_companies' ? 'Year Co', 'quiet companies', f, n);
  select * into f, n from pg_temp.ck((r->'growth'->'first_value'->>'reached')::int = 1, 'first value reached by 1', f, n);
  select * into f, n from pg_temp.ck((r->'growth'->'totals'->>'feet')::int = 120 and (r->'growth'->'totals'->>'ask')::int = 12, 'feet / ask totals', f, n);
  -- security
  select * into f, n from pg_temp.ck((r->'security'->'share'->>'live')::boolean = false, 'sharing: not live yet', f, n);
  select * into f, n from pg_temp.ck(r->'security'->'many_sessions'->0->>'who' = 'boss@beta.test', '3 sessions flagged', f, n);
  select * into f, n from pg_temp.ck((r->'security'->'mfa'->>'on')::int = 1 and jsonb_array_length(r->'security'->'mfa'->'bosses_without') = 2, 'MFA (Year Co owner = admin has it)', f, n);
  -- reliability
  select * into f, n from pg_temp.ck((r->'reliability'->'seal_checks'->>'bad')::int = 1, 'seal mismatch', f, n);
  select * into f, n from pg_temp.ck(r->'reliability'->'builds' @> '[{"build":"r17.11","people":2}]', 'builds in use (newest per person)', f, n);
  select * into f, n from pg_temp.ck((r->'reliability'->>'crashes_7')::int = 7 and (r->'reliability'->>'crashes_prev_7')::int = 1, 'crashes week/week', f, n);
  select * into f, n from pg_temp.ck(jsonb_array_length(r->'reliability'->'plans_stuck') = 1, 'plan set stuck', f, n);
  -- safety and privacy
  select * into f, n from pg_temp.ck((r->'safety'->'open_permits'->0->>'hours')::numeric >= 9, 'permit hours open', f, n);
  select * into f, n from pg_temp.ck((r->'safety'->>'em_notices_30')::int = 1, 'emergencies counted once per permit start', f, n);
  select * into f, n from pg_temp.ck(r->'safety'->'terms' = '{"1.0":1,"1.1":1}', 'terms by latest version ' || (r->'safety'->>'terms'), f, n);
  select * into f, n from pg_temp.ck(position('secret body' in r::text) = 0 and position('anonymous report text' in r::text) = 0, 'no feedback or report text', f, n);
  select * into f, n from pg_temp.ck((r->'safety'->>'mgmt_reports')::int = 1, 'report counted', f, n);
  -- attention
  a := r->'attention';
  select * into f, n from pg_temp.ck(a->0->>'level' = 'red', 'red first', f, n);
  select * into f, n from pg_temp.ck(a::text like '%Confined space permit open 9 hours: Beta Pipe · MH-4%', 'attention: permit', f, n);
  select * into f, n from pg_temp.ck(a::text like '%Emergency notice sent%', 'attention: emergency', f, n);
  select * into f, n from pg_temp.ck(a::text like '%1 sealed run file(s) no longer match%', 'attention: seal', f, n);
  select * into f, n from pg_temp.ck(a::text like '%Year Co is past due%', 'attention: past due', f, n);
  select * into f, n from pg_temp.ck(a::text like '%Paid Pipe renews%', 'attention: renewal', f, n);
  select * into f, n from pg_temp.ck(a::text like '%Beta Pipe’s beta ends%(5 days)%', 'attention: beta ends', f, n);
  select * into f, n from pg_temp.ck(a::text like '%solo@ind.test has used 104%AI is stopped%', 'attention: AI stop', f, n);
  select * into f, n from pg_temp.ck(a::text like '%Beta Pipe has used 83%', 'attention: AI 80%', f, n);
  select * into f, n from pg_temp.ck(a::text like '%811 ticket T-99%', 'attention: 811', f, n);
  select * into f, n from pg_temp.ck(a::text like '%plan set(s) stuck%', 'attention: plans', f, n);
  select * into f, n from pg_temp.ck(a::text like '%Crash reports up: 7 this week vs 1%', 'attention: crashes', f, n);
  select * into f, n from pg_temp.ck(a::text like '%3 or more devices%', 'attention: sessions', f, n);
  select * into f, n from pg_temp.ck(a::text like '%NV%' and a::text like '%feedback%' and a::text like '%push%', 'attention: rules, feedback, push', f, n);

  -- p_days is clamped
  r := public.pb_owner_dashboard(1000);
  select * into f, n from pg_temp.ck((r->>'days')::int = 90 and jsonb_array_length(r->'growth'->'by_day') = 90, 'days clamped to 90', f, n);

  -- as the API role
  execute 'set local role authenticated';
  begin r := public.pb_owner_dashboard(); e := 'ok'; exception when others then e := sqlerrm; end;
  select * into f, n from pg_temp.ck(e = 'ok', 'authenticated may call it: ' || e, f, n);
  begin perform pb_support.dash_uc(); e := 'let in'; exception when others then e := sqlerrm; end;
  select * into f, n from pg_temp.ck(e like 'permission denied%', 'helper not callable from the API: ' || e, f, n);
  execute 'reset role';

  raise exception 'RESULT: %', case when cardinality(f) = 0 then n || ' pass, 0 fail' else n - cardinality(f) || ' pass, ' || cardinality(f) || ' FAIL: ' || array_to_string(f, ' | ') end;
end $t$;
