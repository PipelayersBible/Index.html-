-- UNDO for 01_pricing_limits.sql (pricing build, Nov 20 2026). Apply as ONE migration. Safe to run twice.
-- Puts back the old text of every function the pricing build replaced or patched, removes the three new settings and the
-- new functions. It KEEPS the three new tables (pb_billing.ai_pool, pb_billing.individual_accounts, pb_billing.limit_overrides):
-- nothing reads them once the functions are back, and they hold the month's AI totals and any individual billing records.
-- After this the limits are the ones from before Nov 20 (100 AI requests a day for a paid person, no dollar stop).
-- Built by sql/mk_undo.py; proven by sql/local/run_undo.sh (migration, then this, and every function has its old md5 again).

create or replace function pg_temp.pb_unpatch(p_fn regprocedure, p_added text, p_old text) returns void language plpgsql as $p$
declare d text := pg_get_functiondef(p_fn); n int;
begin
  n := (length(d) - length(replace(d, p_added, ''))) / length(p_added);
  if n = 0 then return; end if;  -- already undone (or never applied)
  if n <> 1 then raise exception 'pb_unpatch: expected the added text at most once in %, found % times', p_fn, n; end if;
  execute replace(d, p_added, p_old);
end $p$;

-- 1. The functions that were patched in place: each added piece of text is swapped back (last patch first).
select pg_temp.pb_unpatch('public.pb_plan_request(text)'::regprocedure,
  $a$else 'Asked for an individual plan' || case when v_co is null then '.' else ' (end of beta).' end end
                || ' Price shown: $' || case when v_kind = 'company' then to_char(pb_billing.setting_int('base_cents', 9900) / 100.0, 'FM999990.00') || ' a month'
                     else to_char(pb_billing.setting_int('individual_cents', 1500) / 100.0, 'FM999990.00') || ' a month or $' || to_char(pb_billing.setting_int('individual_year_cents', 14400) / 100.0, 'FM999990.00') || ' a year' end || ', plus tax.',$a$,
  $b$else 'Asked for an individual plan (end of beta).' end,$b$);
select pg_temp.pb_unpatch('public.pb_my_plan()'::regprocedure,
  $a$    jsonb_build_object('ok', true, 'plan', null, 'individual', pb_billing.has_individual(auth.uid()),
      'requested', exists (select 1 from pb_billing.plan_requests r where r.user_id = auth.uid() and r.done_at is null),
      'prices', pb_billing.prices()))$a$,
  $b$    jsonb_build_object('ok', true, 'plan', null))$b$);
select pg_temp.pb_unpatch('public.pb_my_plan()'::regprocedure,
  $a$r.done_at is null), 'prices', pb_billing.prices())
     from pb_billing.left_company l$a$,
  $b$r.done_at is null))
     from pb_billing.left_company l$b$);
select pg_temp.pb_unpatch('public.pb_my_plan()'::regprocedure,
  $a$'limits', case when x.plan = 'trial' then pb_billing.trial_limits() end, 'prices', pb_billing.prices())$a$,
  $b$'limits', case when x.plan = 'trial' then pb_billing.trial_limits() end)$b$);
select pg_temp.pb_unpatch('public.pb_owner_billing_setting_set(text, jsonb)'::regprocedure,
  $a$    when 'individual_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 1000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'individual_year_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 10000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'plan_sheet_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 100000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    else null end;$a$,
  $b$    else null end;$b$);
select pg_temp.pb_unpatch('public.pb_owner_billing()'::regprocedure,
  $a$    'individuals', pb_billing.individuals_json(),
    'companies', v_cos,$a$,
  $b$    'companies', v_cos,$b$);
select pg_temp.pb_unpatch('public.pb_owner_individual_off(uuid, text)'::regprocedure,
  $a$  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  update pb_billing.individual_accounts set state = 'canceled', updated_at = now() where user_id = p_user;  -- pricing Nov 20$a$,
  $b$  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;$b$);
select pg_temp.pb_unpatch('public.pb_owner_individual_on(uuid)'::regprocedure,
  $a$  perform pb_billing.individual_open(p_user, 'month');  -- pricing Nov 20
  perform pb_audit.admin_note('individual_plan_on', null, p_user, null);$a$,
  $b$  perform pb_audit.admin_note('individual_plan_on', null, p_user, null);$b$);
select pg_temp.pb_unpatch('public.pb_plans_begin(text, text, integer, text)'::regprocedure,
  $a$'Plan sets are for company accounts.'); end if;
  v_lim := pb_plans.limits_for(v_company);  -- pricing Nov 20: the company's own plan reading allowance
$a$,
  $b$'Plan sets are for company accounts.'); end if;
$b$);

-- 2. The functions that were replaced in full: the text that was live before (md5-checked against live on Nov 20).
CREATE OR REPLACE FUNCTION pb_billing.has_individual(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active')
$function$;

CREATE OR REPLACE FUNCTION pb_billing.individual_limits()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select '{"stake": 15, "ask": 5, "other": 3, "month": 200}'::jsonb
$function$;

CREATE OR REPLACE FUNCTION pb_plans.limits()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object('sheets_month', 1500, 'usd_month', 300, 'sets_day', 20, 'pages_set', 400)
$function$;

CREATE OR REPLACE FUNCTION public.ai_cost_add(p_user uuid, p_feature text, p_usd numeric)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into pb_billing.ai_cost (day, user_id, feature, n, usd)
  values ((now() at time zone 'utc')::date, p_user, left(coalesce(p_feature, '?'), 40), 1, greatest(0, least(coalesce(p_usd, 0), 50)))
  on conflict (day, user_id, feature) do update set n = pb_billing.ai_cost.n + 1, usd = pb_billing.ai_cost.usd + excluded.usd
$function$;

CREATE OR REPLACE FUNCTION public.ai_refund(p_user uuid, p_feature text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.ai_usage set count = greatest(count - 1, 0)
  where user_id = p_user and day = (now() at time zone 'utc')::date and feature = p_feature;
$function$;

CREATE OR REPLACE FUNCTION public.ai_try_consume(p_user uuid, p_feature text, p_limit integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare used integer; lim integer; t record; cused integer; today date := (now() at time zone 'utc')::date; L jsonb; mused integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  -- billing Phase 0 (owner, Nov 18): a paid company that is read-only (unpaid past grace, Read-Only Now, or canceled) has no
  -- company AI, like an ended beta; a person with their own individual plan keeps its limits (pb_billing.individual_only)
  if exists (select 1 from pb_billing.company_of(p_user) x where pb_billing.read_only(x.company_id)) and not pb_billing.has_individual(p_user) then return -1; end if;
  -- Nov 16: trial companies: each feature has its own daily limit, plus one cap for the whole company
  select * into t from pb_billing.company_of(p_user) x where x.plan = 'trial' and not (x.expired and pb_billing.has_individual(p_user));
  if found then
    if t.expired then return -1; end if;
    lim := case when p_feature = 'gonogo_q' then p_limit else public.ai_feature_limit(p_user, p_feature) end;
    if coalesce(lim, 0) <= 0 then return -1; end if;
    if p_feature <> 'gonogo_q' then
      select coalesce(sum(u.count), 0) into cused from public.ai_usage u
        where u.day = today and u.feature <> 'gonogo_q'
          and u.user_id in (select m.user_id from public.company_members m where m.company_id = t.company_id
                            union select c.owner_user_id from public.companies c where c.id = t.company_id);
      if cused >= (pb_billing.trial_limits()->>'company_day')::int then return -1; end if;
    end if;
    select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = p_feature;
    if used >= lim then return -1; end if;
    insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 1)
    on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1;
    if lim <= p_limit then return used + 1; end if;
    return least(p_limit - case when used + 1 < lim then 1 else 0 end, ceil((used + 1)::numeric * p_limit / lim)::integer);
  end if;
  -- Nov 17 (owner): individual plan: stake 15 a day, Ask 5 a day (teacher + analysis), others 3 a day, 200 a month in all
  if p_feature <> 'gonogo_q' and pb_billing.individual_only(p_user) then
    L := pb_billing.individual_limits();
    select coalesce(sum(count), 0) into mused from public.ai_usage where user_id = p_user and feature <> 'gonogo_q'
      and day >= date_trunc('month', today)::date and day <= today;
    if mused >= (L->>'month')::int then return -1; end if;
    if p_feature = 'stake' then lim := (L->>'stake')::int;
      select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = 'stake';
    elsif p_feature in ('teacher', 'analysis') then lim := (L->>'ask')::int;
      select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature in ('teacher', 'analysis');
    elsif p_feature = 'plans_strong' then return -1; -- plan reading is for company accounts
    else lim := (L->>'other')::int;
      select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = p_feature;
    end if;
    if used >= lim then return -1; end if;
    insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 1)
    on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1;
    if lim <= p_limit then return used + 1; end if;
    return least(p_limit - case when used + 1 < lim then 1 else 0 end, ceil((used + 1)::numeric * p_limit / lim)::integer);
  end if;
  if p_feature in ('ticket', 'analysis', 'gonogo_q', 'plans_strong') then  -- own allowances (owner, Oct 18: tickets; Ask v2: analysis, question-side classifier checks; v22: Opus plan reads)
    select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = p_feature;
    if used >= p_limit then return -1; end if;
    insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 1)
    on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1;
    return used + 1;
  end if;
  select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature not in ('ticket', 'analysis', 'gonogo_q', 'plans_strong');
  lim := greatest(p_limit, coalesce(public.ai_daily_limit(p_user), 0));
  if used >= lim then return -1; end if;
  insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 1)
  on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1;
  if lim <= p_limit then return used + 1; end if;
  return least(p_limit - case when used + 1 < lim then 1 else 0 end, ceil((used + 1)::numeric * p_limit / lim)::integer);
end $function$;

CREATE OR REPLACE FUNCTION public.pb_storage_put_ok(p_bucket text, p_cap integer, p_need_company boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select auth.uid() is not null
     and (not p_need_company or pb_prod.my_company(auth.uid()) is not null)
     and (select count(*) from storage.objects o
           where o.bucket_id = p_bucket and o.owner_id = auth.uid()::text
             and o.created_at > now() - interval '1 day') < p_cap
$function$;
CREATE OR REPLACE FUNCTION public.ai_daily_limit(p_user uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* pb_sec S12 owner; Nov 16: company accounts 100 a day; trials go by ai_feature_limit; an ended beta with an individual plan: 10 */
  select case
    when exists (select 1 from pb_billing.company_of(p_user) x where x.plan = 'trial') then
      case when not exists (select 1 from pb_billing.company_of(p_user) x where x.expired) then 30
           when pb_billing.has_individual(p_user) then 10 else 0 end
    when exists (select 1 from public.company_members m join public.companies c on c.id = m.company_id
                 where m.user_id = p_user and c.status = 'active') then 100
    when exists (select 1 from public.companies o where o.owner_user_id = p_user and o.status = 'active') then 100
    when exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active') then 10
    else 0 end;
$function$;
CREATE OR REPLACE FUNCTION pb_docs.limits(p_kind text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  -- r16.24: company spec books (the Greenbook runs about 700 pages, 2.3 M characters): 1,500 pages and 6 M characters a file, 1 GB in all
  select case when p_kind = 'individual' then '{"bytes_total": 52428800, "file_bytes": 26214400, "file_pages": 200, "ai_pages_month": 100, "uploads_day": 10, "shares_day_owner": 3, "shares_day_user": 3, "chars_doc_max": 1000000, "share_max_pages": 120, "check_usd_month": 5}'::jsonb
              else '{"bytes_total": 1073741824, "file_bytes": 52428800, "file_pages": 1500, "ai_pages_month": 1500, "uploads_day": 30, "shares_day_owner": 20, "shares_day_user": 10, "chars_doc_max": 6000000, "share_max_pages": 120, "check_usd_month": 20}'::jsonb end
$function$;
CREATE OR REPLACE FUNCTION pb_docs.limits_for(p_company uuid)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select pb_docs.limits(case when p_company is null then 'individual' else 'company' end)
$function$;
alter function pb_docs.limits_for(uuid) security invoker;

-- 3. The new settings, and the old note.
delete from pb_billing.settings where key in ('individual_cents', 'individual_year_cents', 'plan_sheet_cents');
update pb_billing.settings set note = 'Plan reading add-on, per month. Not decided yet (null = price not set).'
  where key = 'plan_reading_cents' and note = 'Not used: plan reading is priced per sheet (plan_sheet_cents). Leave empty.';

-- 4. The new functions (nothing calls them once the old texts are back; the app falls back to its old messages).
drop function if exists public.pb_my_limits(text);
drop function if exists public.pb_plan_prices();
drop function if exists public.pb_owner_individual_paid(uuid, date, text);
drop function if exists pb_plans.limits_for(uuid);
drop function if exists pb_billing.storage_room(uuid, text, integer);
drop function if exists pb_billing.storage_gb(text, uuid);
drop function if exists pb_billing.ai_block(uuid, text, integer);
drop function if exists pb_billing.ai_who(uuid);
drop function if exists pb_billing.individuals_json();
drop function if exists pb_billing.individual_open(uuid, text);
drop function if exists pb_billing.paid_people(uuid);
drop function if exists pb_billing.limits_of(uuid);
drop function if exists pb_billing.plan_limits();
drop function if exists pb_billing.prices();
