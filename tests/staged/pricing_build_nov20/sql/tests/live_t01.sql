do $T$
declare
  AD uuid := gen_random_uuid(); OW uuid := gen_random_uuid(); M1 uuid := gen_random_uuid(); M2 uuid := gen_random_uuid(); M3 uuid := gen_random_uuid();
  M4 uuid := gen_random_uuid(); M5 uuid := gen_random_uuid(); IV uuid := gen_random_uuid(); IND uuid := gen_random_uuid(); IND2 uuid := gen_random_uuid();
  BO uuid := gen_random_uuid(); BM uuid := gen_random_uuid(); NP uuid := gen_random_uuid();
  C uuid := gen_random_uuid(); B uuid := gen_random_uuid(); DCO uuid := gen_random_uuid(); DO1 uuid := gen_random_uuid(); DM uuid := gen_random_uuid(); DIG uuid; DIGO uuid;
  r jsonb; res jsonb := '{}'::jsonb; n int; i int; a pb_billing.accounts; d date; today date := (now() at time zone 'utc')::date; L jsonb;
begin
-- Pricing build, Nov 20 2026 (STAGED, not applied). Prices, the individual plan, and hard caps on everything that costs money.
-- Apply as ONE migration (it runs in one transaction; any failed self-check rolls all of it back).
--
-- Decisions it carries (the owner, Nov 20):
--   Company plan  $99 a month, 5 people included, $12 each extra person, yearly = 10 months, founder lock 12 months.
--                 Everyone with a login counts as a person. The company account (the owner login) is free and is not counted.
--   Individual    $15 a month billed monthly, or $144 for a year ($12 a month). No free tier.
--   Plan reading  an add-on at $1 a sheet, charged once when the sheet is read. It stays OFF for customers until Billing
--                 can show sheets read; this file only records the price and the caps.
--   The company account gets tight limits of its own (it is free, so it must not be a way around paying for people).
--   The app owner's own company (testing and demos) gets high limits through a row in pb_billing.limit_overrides
--                 (a per-company setting; no company id is written in any function). Its AI still stops at $150 a month.
--   Limits        worst case (everybody at every limit every day) costs about 30% of the monthly price, so it stays
--                 under 40% of the money even on the yearly deal with card fees. The math is in NOTES.md.
--
-- How the worst case is made certain: every AI request already reports its real cost (public.ai_cost_add). This file keeps a
-- running total per company (or per individual) and stops AI for the rest of the month when the total reaches the budget.
-- The count limits (per day, per month) are there so people see a plain number long before the dollar stop is reached.
--
-- Existing functions are changed in two ways:
--   REPLACED in full:  public.ai_daily_limit, public.ai_try_consume, public.ai_cost_add,
--     public.ai_refund, public.pb_storage_put_ok, pb_billing.individual_limits, pb_billing.has_individual, pb_plans.limits, pb_docs.limits,
--     pb_docs.limits_for
--     (to roll back: sql/undo_01_pricing_limits.sql puts every old text back)
--   PATCHED in place by pg_temp.pb_patch (one exact piece of text swapped; refuses unless it finds it exactly once):
--     public.pb_my_plan, public.pb_plan_request, public.pb_plans_begin, public.pb_owner_billing,
--     public.pb_owner_billing_setting_set, public.pb_owner_individual_on, public.pb_owner_individual_off
-- Seat counting is NOT changed: pb_billing.seats_used already counts member logins + waiting invites and never the owner login
-- (checked by the test).

create or replace function pg_temp.pb_patch(p_fn regprocedure, p_old text, p_new text) returns void language plpgsql as $p$
declare d text := pg_get_functiondef(p_fn); n int;
begin
  if position(p_new in d) > 0 then return; end if;  -- already applied
  n := (length(d) - length(replace(d, p_old, ''))) / length(p_old);
  if n <> 1 then raise exception 'pb_patch: expected the old text exactly once in %, found % times', p_fn, n; end if;
  execute replace(d, p_old, p_new);
end $p$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Prices
insert into pb_billing.settings (key, value, note) values
  ('individual_cents', '1500'::jsonb, 'Individual plan (one person, no company), billed monthly: per month.'),
  ('individual_year_cents', '14400'::jsonb, 'Individual plan billed yearly: for the whole year ($144 = $12 a month).'),
  ('plan_sheet_cents', '100'::jsonb, 'Plan reading add-on: per sheet, charged once when the sheet is read. Keep plan reading off for customers until Billing shows sheets read.')
on conflict (key) do nothing;
update pb_billing.settings set note = 'Not used: plan reading is priced per sheet (plan_sheet_cents). Leave empty.'
  where key = 'plan_reading_cents' and note = 'Plan reading add-on, per month. Not decided yet (null = price not set).';

create or replace function pb_billing.prices() returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'base_cents', pb_billing.setting_int('base_cents', 9900), 'base_seats', pb_billing.setting_int('base_seats', 5),
    'seat_cents', pb_billing.setting_int('seat_cents', 1200), 'yearly_months', pb_billing.setting_int('yearly_months', 10),
    'founder_months', pb_billing.setting_int('founder_months', 12), 'individual_cents', pb_billing.setting_int('individual_cents', 1500),
    'individual_year_cents', pb_billing.setting_int('individual_year_cents', 14400), 'plan_sheet_cents', pb_billing.setting_int('plan_sheet_cents', 100),
    'plan_reading_cents', pb_billing.setting_int('plan_reading_cents', null), 'tax', 'plus applicable tax')
$$;

-- The price list, for the app before login and for the website. Nothing private in it.
create or replace function public.pb_plan_prices() returns jsonb
language sql stable security definer set search_path to '' as $$
  select pb_billing.prices() || jsonb_build_object('ok', true)
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. The limits, in one place. (Beta limits stay in pb_billing.trial_limits.)
--   member      a person on a paid company plan             owner   the free company account (tight on purpose)
--   individual  a person on the individual plan             company the whole company together, per paid person
--   Counts are AI requests (Ask, stake/photo reads, cut sheet reads, ticket reads). "ask" = Ask questions incl. analysis.
--   usd = the dollar stop for one calendar month (UTC), measured from the real cost of each request.
create or replace function pb_billing.plan_limits() returns jsonb
language sql immutable set search_path to '' as $$
  select '{
    "member":     {"day": 25, "month": 150, "ask": 8, "analysis": 3, "stake": 15, "cutsheet": 3, "ticket": 10, "plans_strong": 2, "other": 5, "photos_day": 150},
    "owner":      {"day": 5,  "month": 30,  "ask": 5, "analysis": 1, "stake": 5,  "cutsheet": 1, "ticket": 2,  "plans_strong": 0, "other": 2, "photos_day": 20},
    "individual": {"day": 15, "month": 50,  "ask": 5, "analysis": 2, "stake": 10, "cutsheet": 2, "ticket": 3,  "plans_strong": 0, "other": 3, "photos_day": 60,
                   "usd_month": 2.50, "storage_gb": 1},
    "company":    {"day_per_person": 12, "month_per_person": 60, "usd_base": 22.00, "usd_per_extra": 3.25, "storage_gb_base": 10, "storage_gb_per_extra": 1},
    "beta":       {"usd_month": 30.00, "photos_day": 150, "storage_gb": 10},
    "none":       {"photos_day": 10, "storage_gb": 0.1},
    "plan_reading": {"sheets_month": 150, "usd_month": 45, "sets_day": 3, "pages_set": 150, "cost_sheet": 0.28}
  }'::jsonb
$$;

-- One company's own numbers (a per-company setting). "limits" has the same sections as plan_limits() (member, owner, company,
-- beta, plan_reading) plus "docs" (pb_docs.limits keys); only the numbers written here replace the standard ones.
-- No row = the standard limits. To change or remove one: update / delete the row (nothing else to redeploy).
create table if not exists pb_billing.limit_overrides (
  company_id uuid primary key references public.companies(id) on delete cascade,
  limits     jsonb not null check (jsonb_typeof(limits) = 'object'),
  note       text,
  created_at timestamptz not null default now()
);
alter table pb_billing.limit_overrides enable row level security;  -- no policies: read only by the functions below

-- The limits that apply to a company: the standard ones, with that company's own numbers on top if it has a row.
create or replace function pb_billing.limits_of(p_company uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(
    (select jsonb_object_agg(e.k, case when jsonb_typeof(o.limits->e.k) = 'object' then e.v || (o.limits->e.k) else e.v end)
       from pb_billing.limit_overrides o, jsonb_each(pb_billing.plan_limits()) e(k, v) where o.company_id = p_company),
    pb_billing.plan_limits())
$$;

-- The app owner's own company (testing and demos with made-up accounts): high limits so a demo never stops, and still a
-- dollar stop so a bug cannot run up a bill: AI $150 a month, plan reading $75, document AI $20 (today's number).
-- Found by its owner login and name; on a database without that company this adds nothing.
insert into pb_billing.limit_overrides (company_id, limits, note)
select c.id, '{
    "member":  {"day": 300, "month": 3000, "ask": 150, "analysis": 50, "stake": 200, "cutsheet": 50, "ticket": 100, "plans_strong": 30, "other": 50, "photos_day": 400},
    "owner":   {"day": 300, "month": 3000, "ask": 150, "analysis": 50, "stake": 200, "cutsheet": 50, "ticket": 100, "plans_strong": 30, "other": 50, "photos_day": 400},
    "company": {"day_per_person": 400, "month_per_person": 4000, "usd_base": 150.00, "usd_per_extra": 0, "storage_gb_base": 50, "storage_gb_per_extra": 0},
    "plan_reading": {"sheets_month": 250, "usd_month": 75, "sets_day": 10, "pages_set": 250},
    "docs":    {"ai_pages_month": 1500, "uploads_day": 30, "check_usd_month": 20}
  }'::jsonb, 'The app owner''s own company: testing and demos. High limits; AI stops at $150 a month.'
from public.companies c join auth.users u on u.id = c.owner_user_id
where lower(u.email) = 'tfontaine@digcivil.com' and c.name ilike 'DIG Civil%'
on conflict (company_id) do nothing;

-- People a company has paid for: the paid seats, never fewer than the people included in the base price.
create or replace function pb_billing.paid_people(p_company uuid) returns integer
language sql stable security definer set search_path to '' as $$
  select greatest(coalesce((select a.seats_paid from pb_billing.accounts a where a.company_id = p_company), 0), pb_billing.setting_int('base_seats', 5))
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. The running total: AI requests and their real cost, per company (key = company id) or per individual (key = 'u:' + user id).
create table if not exists pb_billing.ai_pool (
  owner_key text not null,
  day       date not null,
  n         integer not null default 0,
  usd       numeric not null default 0,
  primary key (owner_key, day)
);
alter table pb_billing.ai_pool enable row level security;  -- no policies: reached only through the functions below

-- Whose limits apply to this person right now, and which total they draw from.
--   beta: in a beta company (an ended beta without an individual plan is still 'beta'; the caller refuses it)
--   individual: on the individual plan with no working company   owner / member: a paid company that is not read-only
--   who null: no plan
create or replace function pb_billing.ai_who(p_user uuid, out who text, out pool text, out company_id uuid)
language plpgsql stable security definer set search_path to '' as $$
declare x record;
begin
  select * into x from pb_billing.company_of(p_user);
  if found and x.plan = 'trial' and not (x.expired and pb_billing.has_individual(p_user)) then
    who := 'beta'; pool := x.company_id::text; company_id := x.company_id; return;
  end if;
  if pb_billing.individual_only(p_user) then who := 'individual'; pool := 'u:' || p_user::text; return; end if;
  if found and not x.expired and not pb_billing.read_only(x.company_id) then
    who := case when exists (select 1 from public.companies c where c.id = x.company_id and c.owner_user_id = p_user) then 'owner' else 'member' end;
    pool := x.company_id::text; company_id := x.company_id; return;
  end if;
end $$;

-- Why this request is refused right now, or null when it may go.
--   plan | budget (the month's dollar stop) | company_month | company_day | person_month | person_day | feature_day
create or replace function pb_billing.ai_block(p_user uuid, p_feature text, p_limit integer) returns text
language plpgsql stable security definer set search_path to '' as $$
declare w record; L jsonb := pb_billing.plan_limits(); P jsonb; C jsonb := pb_billing.plan_limits()->'company';
  today date := (now() at time zone 'utc')::date; m0 date := date_trunc('month', (now() at time zone 'utc'))::date;
  v_n int; v_usd numeric; v_people int; v_used int; v_cap int;
begin
  select * into w from pb_billing.ai_who(p_user);
  if w.who is null then return 'plan'; end if;
  L := pb_billing.limits_of(w.company_id); C := L->'company';  -- the company's own numbers, if it has any
  select coalesce(sum(a.n), 0), coalesce(sum(a.usd), 0) into v_n, v_usd from pb_billing.ai_pool a where a.owner_key = w.pool and a.day >= m0 and a.day <= today;
  if w.who = 'beta' then return case when v_usd >= (L->'beta'->>'usd_month')::numeric then 'budget' end; end if;  -- the beta's own counts: pb_billing.trial_limits
  P := L->w.who;
  if w.who = 'individual' then
    if v_usd >= (P->>'usd_month')::numeric then return 'budget'; end if;
  else
    v_people := pb_billing.paid_people(w.company_id);
    if v_usd >= (C->>'usd_base')::numeric + (C->>'usd_per_extra')::numeric * greatest(0, v_people - pb_billing.setting_int('base_seats', 5)) then return 'budget'; end if;
    if p_feature not in ('gonogo_q', 'plans_strong') then
      if v_n >= (C->>'month_per_person')::int * v_people then return 'company_month'; end if;
      select coalesce(sum(a.n), 0) into v_used from pb_billing.ai_pool a where a.owner_key = w.pool and a.day = today;
      if v_used >= (C->>'day_per_person')::int * v_people then return 'company_day'; end if;
    end if;
  end if;
  if p_feature = 'gonogo_q' then  -- the question-side check: its own small counter (the server passes the allowance), no part of the totals
    select coalesce(sum(u.count), 0) into v_used from public.ai_usage u where u.user_id = p_user and u.day = today and u.feature = 'gonogo_q';
    return case when v_used >= coalesce(p_limit, 0) then 'feature_day' end;
  end if;
  if p_feature <> 'plans_strong' then
    select coalesce(sum(u.count), 0) into v_used from public.ai_usage u where u.user_id = p_user and u.feature not in ('gonogo_q', 'plans_strong') and u.day >= m0 and u.day <= today;
    if v_used >= (P->>'month')::int then return 'person_month'; end if;
    select coalesce(sum(u.count), 0) into v_used from public.ai_usage u where u.user_id = p_user and u.feature not in ('gonogo_q', 'plans_strong') and u.day = today;
    if v_used >= (P->>'day')::int then return 'person_day'; end if;
  end if;
  if p_feature in ('teacher', 'analysis') then
    select coalesce(sum(u.count), 0) into v_used from public.ai_usage u where u.user_id = p_user and u.day = today and u.feature in ('teacher', 'analysis');
    if v_used >= (P->>'ask')::int then return 'feature_day'; end if;
    if p_feature = 'analysis' then
      select coalesce(sum(u.count), 0) into v_used from public.ai_usage u where u.user_id = p_user and u.day = today and u.feature = 'analysis';
      if v_used >= least((P->>'analysis')::int, coalesce(p_limit, 1000000)) then return 'feature_day'; end if;
    end if;
    return null;
  end if;
  v_cap := coalesce((P->>p_feature)::int, (P->>'other')::int);
  if p_feature in ('ticket', 'plans_strong') then v_cap := least(v_cap, coalesce(p_limit, 1000000)); end if;  -- the server's own allowance still holds
  select coalesce(sum(u.count), 0) into v_used from public.ai_usage u where u.user_id = p_user and u.day = today and u.feature = p_feature;
  if v_used >= v_cap then return 'feature_day'; end if;
  return null;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. The AI gates (called by the ai edge function with the service key).

-- CHANGED constraint (found by the first live test run, Nov 20). The ai function counts a strong plan look-up as feature
-- 'plans_strong' (ai_try_consume, "v22: Opus plan reads"), but public.ai_usage only allowed the six older names, so on live
-- every such call has been failing on this check and the strong look-up has never run (no 'plans_strong' row exists).
-- The name is added so the look-up can be counted (2 a day for a person on a company plan; its cost is inside the dollar stop).
alter table public.ai_usage drop constraint if exists ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check
  check (feature = any (array['cutsheet'::text, 'stake'::text, 'teacher'::text, 'ticket'::text, 'analysis'::text, 'gonogo_q'::text, 'plans_strong'::text]));

-- REPLACED. Was: 100 a day for a paid company member or owner, 10 for an individual. The beta lines are unchanged.
create or replace function public.ai_daily_limit(p_user uuid) returns integer
language sql stable security definer set search_path to 'public' as $function$
/* pb_sec S12 owner; Nov 16: trials go by ai_feature_limit; pricing Nov 20: paid people, the company account and individual plans go by pb_billing.plan_limits */
  select case
    when w.who = 'beta' then case when exists (select 1 from pb_billing.company_of(p_user) x where x.expired) then 0 else 30 end
    when w.who is null then 0
    else (pb_billing.limits_of(w.company_id)->w.who->>'day')::int end
  from pb_billing.ai_who(p_user) w;
$function$;

-- REPLACED. The read-only and beta parts are the live text, plus one line (the beta's dollar stop). The individual and
-- paid parts now go through pb_billing.ai_block, and every counted request is added to the company's / person's total.
create or replace function public.ai_try_consume(p_user uuid, p_feature text, p_limit integer) returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare used integer; lim integer; t record; cused integer; today date := (now() at time zone 'utc')::date; w record;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  -- billing Phase 0 (owner, Nov 18): a paid company that is read-only (unpaid past grace, Read-Only Now, or canceled) has no
  -- company AI, like an ended beta; a person with their own individual plan keeps its limits (pb_billing.individual_only)
  if exists (select 1 from pb_billing.company_of(p_user) x where pb_billing.read_only(x.company_id)) and not pb_billing.has_individual(p_user) then return -1; end if;
  select * into w from pb_billing.ai_who(p_user);
  if w.who is null then return -1; end if;
  perform pg_advisory_xact_lock(hashtextextended(w.pool, 1));
  -- Nov 16: trial companies: each feature has its own daily limit, plus one cap for the whole company
  select * into t from pb_billing.company_of(p_user) x where x.plan = 'trial' and not (x.expired and pb_billing.has_individual(p_user));
  if found then
    if t.expired then return -1; end if;
    if pb_billing.ai_block(p_user, p_feature, p_limit) = 'budget' then return -1; end if;  -- pricing Nov 20: a beta's AI stops at its month's dollar stop
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
  -- pricing Nov 20: a person on a paid company plan, the company account, or an individual plan
  if pb_billing.ai_block(p_user, p_feature, p_limit) is not null then return -1; end if;
  insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 1)
  on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1;
  if p_feature in ('gonogo_q', 'plans_strong') then  -- own allowances, not part of the totals
    select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = p_feature;
    return used;
  end if;
  insert into pb_billing.ai_pool (owner_key, day, n) values (w.pool, today, 1)
  on conflict (owner_key, day) do update set n = pb_billing.ai_pool.n + 1;
  if p_feature in ('ticket', 'analysis') then  -- the server shows these against their own allowance
    select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = p_feature;
    return used;
  end if;
  select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature not in ('gonogo_q', 'plans_strong');
  lim := (pb_billing.limits_of(w.company_id)->w.who->>'day')::int;
  if lim <= p_limit then return used; end if;
  return least(p_limit - case when used < lim then 1 else 0 end, ceil(used::numeric * p_limit / lim)::integer);
end $function$;

-- REPLACED. The first statement is the live text; the second adds the cost to the company's / person's month total.
create or replace function public.ai_cost_add(p_user uuid, p_feature text, p_usd numeric) returns void
language sql security definer set search_path to '' as $function$
  insert into pb_billing.ai_cost (day, user_id, feature, n, usd)
  values ((now() at time zone 'utc')::date, p_user, left(coalesce(p_feature, '?'), 40), 1, greatest(0, least(coalesce(p_usd, 0), 50)))
  on conflict (day, user_id, feature) do update set n = pb_billing.ai_cost.n + 1, usd = pb_billing.ai_cost.usd + excluded.usd;
  insert into pb_billing.ai_pool (owner_key, day, n, usd)
  select w.pool, (now() at time zone 'utc')::date, 0, greatest(0, least(coalesce(p_usd, 0), 50)) from pb_billing.ai_who(p_user) w where w.pool is not null
  on conflict (owner_key, day) do update set usd = pb_billing.ai_pool.usd + excluded.usd;
$function$;

-- REPLACED. The first statement is the live text; the second gives the request back to the company's / person's total.
create or replace function public.ai_refund(p_user uuid, p_feature text) returns void
language sql security definer set search_path to 'public' as $function$
  update public.ai_usage set count = greatest(count - 1, 0)
  where user_id = p_user and day = (now() at time zone 'utc')::date and feature = p_feature;
  update pb_billing.ai_pool a set n = greatest(a.n - 1, 0)
  from pb_billing.ai_who(p_user) w
  where p_feature not in ('gonogo_q', 'plans_strong') and a.owner_key = w.pool and a.day = (now() at time zone 'utc')::date;
$function$;

-- REPLACED (was stake 15, ask 5, other 3, month 200). Kept for anything that still reads it; the gate uses plan_limits.
create or replace function pb_billing.individual_limits() returns jsonb
language sql immutable set search_path to '' as $function$
  select jsonb_build_object('stake', (L->>'stake')::int, 'ask', (L->>'ask')::int, 'other', (L->>'other')::int, 'month', (L->>'month')::int)
  from (select pb_billing.plan_limits()->'individual' L) x
$function$;

-- What the app shows when a limit is reached (and in Settings): the person's own numbers, and which limit it is.
create or replace function public.pb_my_limits(p_feature text default 'teacher') returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare v_uid uuid := auth.uid(); w record; L jsonb := pb_billing.plan_limits(); P jsonb; C jsonb := pb_billing.plan_limits()->'company';
  today date := (now() at time zone 'utc')::date; m0 date := date_trunc('month', (now() at time zone 'utc'))::date;
  v_feature text := case when p_feature in ('teacher', 'analysis', 'stake', 'cutsheet', 'ticket', 'plans_strong') then p_feature else 'teacher' end;
  v_people int; v_day int; v_month int; v_cday int; v_cmonth int; r jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'code', 'pb:signed_out'); end if;
  select * into w from pb_billing.ai_who(v_uid);
  if w.who is null then return jsonb_build_object('ok', true, 'who', null, 'reached', 'plan'); end if;
  L := pb_billing.limits_of(w.company_id); C := L->'company';
  select coalesce(sum(u.count) filter (where u.day = today), 0), coalesce(sum(u.count), 0) into v_day, v_month
    from public.ai_usage u where u.user_id = v_uid and u.feature not in ('gonogo_q', 'plans_strong') and u.day >= m0 and u.day <= today;
  r := jsonb_build_object('ok', true, 'who', w.who, 'reached', case when w.who = 'beta' and exists (select 1 from pb_billing.company_of(v_uid) x where x.expired) then 'plan'
                                                                 else pb_billing.ai_block(v_uid, v_feature, 1000000) end,
    'day', jsonb_build_object('used', v_day), 'month', jsonb_build_object('used', v_month));
  if w.who = 'beta' then return r; end if;
  P := L->w.who;
  r := r || jsonb_build_object('day', jsonb_build_object('used', v_day, 'limit', (P->>'day')::int),
                               'month', jsonb_build_object('used', v_month, 'limit', (P->>'month')::int));
  if w.who in ('member', 'owner') then
    v_people := pb_billing.paid_people(w.company_id);
    select coalesce(sum(a.n) filter (where a.day = today), 0), coalesce(sum(a.n), 0) into v_cday, v_cmonth
      from pb_billing.ai_pool a where a.owner_key = w.pool and a.day >= m0 and a.day <= today;
    r := r || jsonb_build_object('people', v_people,
      'company_day', jsonb_build_object('used', v_cday, 'limit', (C->>'day_per_person')::int * v_people),
      'company_month', jsonb_build_object('used', v_cmonth, 'limit', (C->>'month_per_person')::int * v_people));
  end if;
  return r;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Photo and file uploads. REPLACED (was: only "fewer than p_cap files from this login in the last day").
--    Now also: the plan's own daily cap for the login (the company account: 20), and a total size for the company / person.
create or replace function pb_billing.storage_gb(p_who text, p_company uuid) returns numeric
language sql stable security definer set search_path to '' as $$
  select case when p_who in ('member', 'owner') then (L->'company'->>'storage_gb_base')::numeric
                + (L->'company'->>'storage_gb_per_extra')::numeric * greatest(0, pb_billing.paid_people(p_company) - pb_billing.setting_int('base_seats', 5))
              else (L->coalesce(p_who, 'none')->>'storage_gb')::numeric end
  from (select pb_billing.limits_of(p_company) L) x
$$;

create or replace function pb_billing.storage_room(p_user uuid, p_bucket text, p_cap integer) returns boolean
language plpgsql stable security definer set search_path to '' as $$
declare w record; L jsonb := pb_billing.plan_limits(); v_cap int; v_bytes numeric;
begin
  select * into w from pb_billing.ai_who(p_user);
  L := pb_billing.limits_of(w.company_id);
  v_cap := (L->(case when w.who = 'member' then 'member' when w.who is null then 'none' else w.who end)->>'photos_day')::int;
  if w.who in ('member', 'individual', 'beta') and p_bucket <> 'run-photos' then v_cap := p_cap; end if;  -- sealed runs, cut sheet sources: the policy's own cap
  if (select count(*) from storage.objects o where o.bucket_id = p_bucket and o.owner_id = p_user::text and o.created_at > now() - interval '1 day') >= least(p_cap, v_cap) then return false; end if;
  select coalesce(sum((o.metadata->>'size')::numeric), 0) into v_bytes from storage.objects o
    where o.bucket_id in ('run-photos', 'run-seals', 'cutsheet-sources')
      and o.owner_id in (select p_user::text
                         union all select m.user_id::text from public.company_members m where m.company_id = w.company_id
                         union all select c.owner_user_id::text from public.companies c where c.id = w.company_id);
  return v_bytes < pb_billing.storage_gb(w.who, w.company_id) * 1073741824;
end $$;

create or replace function public.pb_storage_put_ok(p_bucket text, p_cap integer, p_need_company boolean default false) returns boolean
language sql stable security definer set search_path to '' as $function$
  select auth.uid() is not null
     and (not p_need_company or pb_prod.my_company(auth.uid()) is not null)
     and pb_billing.storage_room(auth.uid(), p_bucket, p_cap)
$function$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. Plan reading (about $0.28 a sheet). REPLACED numbers (was 1,500 sheets and $300 a month per company, 20 sets a day).
create or replace function pb_plans.limits() returns jsonb
language sql immutable set search_path to '' as $function$
  select jsonb_build_object('sheets_month', (L->>'sheets_month')::int, 'usd_month', (L->>'usd_month')::numeric, 'sets_day', (L->>'sets_day')::int, 'pages_set', (L->>'pages_set')::int)
  from (select pb_billing.plan_limits()->'plan_reading' L) x
$function$;

-- The add-on is priced per sheet (setting plan_sheet_cents: $1, charged once when the sheet is read; a sheet costs about
-- $0.28 to read), so the caps here are only a stop against a runaway month. A company's own numbers: pb_billing.limit_overrides.
create or replace function pb_plans.limits_for(p_company uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('sheets_month', (L->>'sheets_month')::int, 'usd_month', (L->>'usd_month')::numeric, 'sets_day', (L->>'sets_day')::int, 'pages_set', (L->>'pages_set')::int)
  from (select pb_billing.limits_of(p_company)->'plan_reading' L) x
$$;

perform pg_temp.pb_patch('public.pb_plans_begin(text, text, integer, text)'::regprocedure,
  $o$'Plan sets are for company accounts.'); end if;
$o$,
  $n$'Plan sets are for company accounts.'); end if;
  v_lim := pb_plans.limits_for(v_company);  -- pricing Nov 20: the company's own plan reading allowance
$n$);

-- ---------------------------------------------------------------------------------------------------------------------
-- 7. Uploaded documents (spec books) read by AI. REPLACED numbers only:
--    company: AI pages a month 1,500 -> 200, AI dollars a month 20 -> 4, uploads a day 30 -> 10
--    individual: AI pages a month 100 -> 30, AI dollars a month 5 -> 0.50, uploads a day 10 -> 3
create or replace function pb_docs.limits(p_kind text) returns jsonb
language sql immutable set search_path to '' as $function$
  -- r16.24: company spec books (the Greenbook runs about 700 pages, 2.3 M characters): 1,500 pages and 6 M characters a file, 1 GB in all
  -- pricing Nov 20: the AI page and AI dollar allowances are inside the plan's worst-case budget
  select case when p_kind = 'individual' then '{"bytes_total": 52428800, "file_bytes": 26214400, "file_pages": 200, "ai_pages_month": 30, "uploads_day": 3, "shares_day_owner": 3, "shares_day_user": 3, "chars_doc_max": 1000000, "share_max_pages": 120, "check_usd_month": 0.5}'::jsonb
              else '{"bytes_total": 1073741824, "file_bytes": 52428800, "file_pages": 1500, "ai_pages_month": 200, "uploads_day": 10, "shares_day_owner": 20, "shares_day_user": 10, "chars_doc_max": 6000000, "share_max_pages": 120, "check_usd_month": 4}'::jsonb end
$function$;

-- REPLACED (was: the line above only, and marked immutable). A company's own document numbers ("docs" in its override row).
create or replace function pb_docs.limits_for(p_company uuid) returns jsonb
language sql stable security definer set search_path to '' as $function$
  select pb_docs.limits(case when p_company is null then 'individual' else 'company' end)
      || coalesce((select o.limits->'docs' from pb_billing.limit_overrides o where o.company_id = p_company and jsonb_typeof(o.limits->'docs') = 'object'), '{}'::jsonb)
$function$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 8. The individual plan in pb_billing: what the person pays and how far it is paid.
create table if not exists pb_billing.individual_accounts (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  cents            integer not null check (cents >= 0),          -- billed monthly: per month. Copied from the setting when the plan starts
  year_cents       integer not null check (year_cents >= 0),     -- billed yearly: for the whole year. Copied the same way
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  period_start     date not null,
  paid_through     date not null,
  grace_days       integer not null default 7,
  state            text not null default 'active' check (state in ('active', 'canceled')),
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table pb_billing.individual_accounts enable row level security;  -- no policies

-- Opens (or re-opens) the record when the app owner turns an individual plan on. The price is copied, like a company's.
create or replace function pb_billing.individual_open(p_user uuid, p_interval text default 'month') returns void
language sql security definer set search_path to '' as $$
  insert into pb_billing.individual_accounts (user_id, cents, year_cents, billing_interval, period_start, paid_through, grace_days, created_by)
  values (p_user, pb_billing.setting_int('individual_cents', 1500), pb_billing.setting_int('individual_year_cents', 14400),
          case when p_interval = 'year' then 'year' else 'month' end, current_date,
          pb_billing.period_after(current_date, case when p_interval = 'year' then 'year' else 'month' end), pb_billing.setting_int('grace_days', 7), auth.uid())
  on conflict (user_id) do update set state = 'active', billing_interval = excluded.billing_interval, period_start = excluded.period_start,
      paid_through = excluded.paid_through, updated_at = now()
    where pb_billing.individual_accounts.state = 'canceled' or current_date >= pb_billing.individual_accounts.paid_through + pb_billing.individual_accounts.grace_days
$$;

create or replace function pb_billing.individuals_json() returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', (select u.email::text from auth.users u where u.id = a.user_id),
      'cents', a.cents, 'year_cents', a.year_cents, 'interval', a.billing_interval, 'paid_through', a.paid_through, 'lock_on', a.paid_through + a.grace_days,
      'state', case when a.state = 'canceled' or not exists (select 1 from public.subscriptions s where s.user_id = a.user_id and s.tier = 'individual' and s.status = 'active') then 'canceled'
                    when current_date >= a.paid_through + a.grace_days then 'lapsed'
                    when current_date >= a.paid_through then 'past_due' else 'active' end,
      'next', jsonb_build_object('from', a.paid_through, 'to', pb_billing.period_after(a.paid_through, a.billing_interval),
        'amount_cents', case when a.billing_interval = 'year' then a.year_cents else a.cents end,
        'due', a.state <> 'canceled' and a.paid_through <= current_date + pb_billing.setting_int('invoice_ahead_days', 7)))
    order by a.paid_through), '[]'::jsonb)
  from pb_billing.individual_accounts a
$$;

-- REPLACED. Was: an active individual subscription. Now also: if the plan has a billing record, it is not past its paid
-- date + grace and not canceled. A subscription without a record (the two made before this) is unchanged.
create or replace function pb_billing.has_individual(p_user uuid) returns boolean
language sql stable security definer set search_path to '' as $function$
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active')
     and not exists (select 1 from pb_billing.individual_accounts a where a.user_id = p_user
                     and (a.state = 'canceled' or current_date >= a.paid_through + a.grace_days))
$function$;

-- Paid: the person paid for the period that starts at p_from (pressing twice records nothing). Yearly or monthly can be switched here.
create or replace function public.pb_owner_individual_paid(p_user uuid, p_from date, p_interval text default null) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare a pb_billing.individual_accounts; v_int text; v_to date;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  select * into a from pb_billing.individual_accounts x where x.user_id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  if a.state = 'canceled' then return jsonb_build_object('ok', false, 'code', 'pb:canceled', 'message', 'This plan is off. Turn the individual plan on again.'); end if;
  if p_from is distinct from a.paid_through then return jsonb_build_object('ok', false, 'code', 'pb:period_changed', 'message', 'That period was already marked paid. Refresh.'); end if;
  v_int := case when p_interval in ('month', 'year') then p_interval else a.billing_interval end;
  v_to := pb_billing.period_after(a.paid_through, v_int);
  update pb_billing.individual_accounts x set paid_through = v_to, billing_interval = v_int, updated_at = now() where x.user_id = p_user;
  insert into pb_billing.events (user_id, kind, detail, actor) values (p_user, 'individual_paid',
    jsonb_build_object('from', a.paid_through, 'to', v_to, 'interval', v_int, 'amount_cents', case when v_int = 'year' then a.year_cents else a.cents end), auth.uid());
  perform pb_audit.admin_note('individual_plan_paid', null, p_user, jsonb_build_object('from', a.paid_through, 'to', v_to));
  return jsonb_build_object('ok', true, 'individuals', pb_billing.individuals_json());
end $$;

-- PATCHED: turning an individual plan on also opens its billing record (monthly, at today's prices; Paid can switch it to yearly).
perform pg_temp.pb_patch('public.pb_owner_individual_on(uuid)'::regprocedure,
  $o$  perform pb_audit.admin_note('individual_plan_on', null, p_user, null);$o$,
  $n$  perform pb_billing.individual_open(p_user, 'month');  -- pricing Nov 20
  perform pb_audit.admin_note('individual_plan_on', null, p_user, null);$n$);

-- PATCHED: turning it off closes the record too.
perform pg_temp.pb_patch('public.pb_owner_individual_off(uuid, text)'::regprocedure,
  $o$  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;$o$,
  $n$  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  update pb_billing.individual_accounts set state = 'canceled', updated_at = now() where user_id = p_user;  -- pricing Nov 20$n$);

-- PATCHED: Billing shows the individual plans too.
perform pg_temp.pb_patch('public.pb_owner_billing()'::regprocedure,
  $o$    'companies', v_cos,$o$,
  $n$    'individuals', pb_billing.individuals_json(),
    'companies', v_cos,$n$);

-- PATCHED: the individual price can be set like the others.
perform pg_temp.pb_patch('public.pb_owner_billing_setting_set(text, jsonb)'::regprocedure,
  $o$    else null end;$o$,
  $n$    when 'individual_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 1000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'individual_year_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 10000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'plan_sheet_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 100000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    else null end;$n$);

-- ---------------------------------------------------------------------------------------------------------------------
-- 9. What the app is told. PATCHED pb_my_plan: every answer carries the price list; a person with no company is told
--    whether they have an individual plan or a request waiting.
perform pg_temp.pb_patch('public.pb_my_plan()'::regprocedure,
  $o$'limits', case when x.plan = 'trial' then pb_billing.trial_limits() end)$o$,
  $n$'limits', case when x.plan = 'trial' then pb_billing.trial_limits() end, 'prices', pb_billing.prices())$n$);
perform pg_temp.pb_patch('public.pb_my_plan()'::regprocedure,
  $o$r.done_at is null))
     from pb_billing.left_company l$o$,
  $n$r.done_at is null), 'prices', pb_billing.prices())
     from pb_billing.left_company l$n$);
perform pg_temp.pb_patch('public.pb_my_plan()'::regprocedure,
  $o$    jsonb_build_object('ok', true, 'plan', null))$o$,
  $n$    jsonb_build_object('ok', true, 'plan', null, 'individual', pb_billing.has_individual(auth.uid()),
      'requested', exists (select 1 from pb_billing.plan_requests r where r.user_id = auth.uid() and r.done_at is null),
      'prices', pb_billing.prices()))$n$);

-- PATCHED pb_plan_request: the note the app owner gets says what price the person was shown, and no longer says
-- "end of beta" for someone who was never in a company.
perform pg_temp.pb_patch('public.pb_plan_request(text)'::regprocedure,
  $o$else 'Asked for an individual plan (end of beta).' end,$o$,
  $n$else 'Asked for an individual plan' || case when v_co is null then '.' else ' (end of beta).' end end
                || ' Price shown: $' || case when v_kind = 'company' then to_char(pb_billing.setting_int('base_cents', 9900) / 100.0, 'FM999990.00') || ' a month'
                     else to_char(pb_billing.setting_int('individual_cents', 1500) / 100.0, 'FM999990.00') || ' a month or $' || to_char(pb_billing.setting_int('individual_year_cents', 14400) / 100.0, 'FM999990.00') || ' a year' end || ', plus tax.',$n$);

-- ---------------------------------------------------------------------------------------------------------------------
-- 10. Who may call what. The helpers are reached only through the functions above.

  create function pg_temp.act(u uuid) returns void language sql as $a$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'aal', 'aal2')::text, true) $a$;
  create function pg_temp.err(q text) returns text language plpgsql as $e$ begin execute q; return 'no error'; exception when others then return sqlerrm; end $e$;
  create function pg_temp.ok(c boolean, what text) returns void language plpgsql as $k$ begin if c is not true then raise exception 'FAIL %', what; end if; end $k$;
  -- n requests of one feature; returns how many went through
  create function pg_temp.use(u uuid, f text, k int, lim int default 20) returns int language plpgsql as $u$
    declare g int := 0; begin for j in 1..k loop if public.ai_try_consume(u, f, lim) > 0 then g := g + 1; end if; end loop; return g; end $u$;
  create function pg_temp.why(u uuid, f text) returns text language plpgsql as $y$ begin perform pg_temp.act(u); return public.pb_my_limits(f)->>'reached'; end $y$;
  create function pg_temp.put(u uuid, bucket text, k int, bytes numeric default 300000) returns void language sql as $s$
    insert into storage.objects (bucket_id, name, owner_id, metadata) select bucket, u::text || '/t/' || gen_random_uuid()::text, u::text, jsonb_build_object('size', bytes) from generate_series(1, k) $s$;
  create function pg_temp.can(u uuid, bucket text, cap int) returns boolean language plpgsql as $c$ begin perform pg_temp.act(u); return public.pb_storage_put_ok(bucket, cap); end $c$;

  insert into auth.users (id, email, aud, role) select u, 'pr-' || u || '@test.invalid', 'authenticated', 'authenticated' from unnest(array[AD, OW, M1, M2, M3, M4, M5, IV, IND, IND2, BO, BM, NP, DO1, DM]) u;
  insert into pb_support.admins (user_id) values (AD);
  insert into public.companies (id, name, owner_user_id, status, plan, trial_ends_at) values
    (C, 'Price Test Pipeline', OW, 'active', 'paid', null), (B, 'Price Test Beta', BO, 'active', 'trial', now() + interval '10 days'),
    (DCO, 'Price Test Demo', DO1, 'active', 'paid', null);   -- paid with no billing account, like the app owner's own company
  insert into public.company_members (company_id, user_id, role) values (C, M1, 'foreman'), (C, M2, 'pipelayer'), (C, M3, 'pipelayer'), (C, M4, 'pipelayer'), (C, M5, 'pm'), (B, BM, 'foreman'), (DCO, DM, 'foreman');
  insert into pb_crew.invitations (company_id, user_id, role, invited_by, status) values (C, IV, 'pipelayer', OW, 'pending');
  insert into pb_billing.accounts (company_id, legal_name, billing_email, seats_paid, base_seats, base_cents, seat_cents, billing_interval, yearly_months, period_start, paid_through)
    values (C, 'Price Test Pipeline LLC', 'ap@test.invalid', 5, 5, 9900, 1200, 'month', 10, current_date, (current_date + interval '1 month')::date);
  insert into public.subscriptions (user_id, tier, status) values (IND, 'individual', 'active');   -- an individual plan from before this (no billing record)
  L := pb_billing.plan_limits();

  -- 1. seats and prices: the company account is never a person; a waiting invite is
  select * into a from pb_billing.accounts where company_id = C;
  perform pg_temp.ok(pb_billing.seats_used(C) = 6, '1a seats_used = 5 member logins + 1 waiting invite, owner login not counted: ' || pb_billing.seats_used(C));
  perform pg_temp.ok(not exists (select 1 from public.company_members m where m.user_id = OW), '1b owner has no member row');
  perform pg_temp.ok(pb_billing.amount_cents(a, 5) = 9900 and pb_billing.amount_cents(a, 6) = 11100 and pb_billing.amount_cents(a, 12) = 18300 and pb_billing.amount_cents(a, 25) = 33900, '1c 99 / 111 / 183 / 339');
  a.billing_interval := 'year'; perform pg_temp.ok(pb_billing.amount_cents(a, 6) = 111000, '1d yearly = 10 months');
  perform pg_temp.ok(pb_billing.paid_people(C) = 5 and pb_billing.paid_people(B) = 5, '1e paid people');
  r := pb_billing.prices();
  perform pg_temp.ok((r->>'base_cents')::int = 9900 and (r->>'base_seats')::int = 5 and (r->>'seat_cents')::int = 1200 and (r->>'yearly_months')::int = 10
    and (r->>'founder_months')::int = 12 and (r->>'individual_cents')::int = 1500 and (r->>'individual_year_cents')::int = 14400 and (r->>'plan_sheet_cents')::int = 100 and r->'plan_reading_cents' = 'null'::jsonb, '1f prices: individual $15 a month or $144 a year, plan reading $1 a sheet ' || r::text);
  res := res || jsonb_build_object('seats_used', pb_billing.seats_used(C), 'prices', r);

  -- 2. who is who, and the daily number the ai function is given
  perform pg_temp.ok((select who from pb_billing.ai_who(M1)) = 'member' and (select who from pb_billing.ai_who(OW)) = 'owner' and (select who from pb_billing.ai_who(IND)) = 'individual'
    and (select who from pb_billing.ai_who(BM)) = 'beta' and (select who from pb_billing.ai_who(BO)) = 'beta' and (select who from pb_billing.ai_who(NP)) is null, '2a who');
  perform pg_temp.ok(public.ai_daily_limit(M1) = 25 and public.ai_daily_limit(OW) = 5 and public.ai_daily_limit(IND) = 15 and public.ai_daily_limit(BM) = 30 and public.ai_daily_limit(NP) = 0, '2b daily limits');
  perform pg_temp.ok(public.ai_has_paid_plan(M1) and public.ai_has_paid_plan(OW) and public.ai_has_paid_plan(IND) and not public.ai_has_paid_plan(NP), '2c paid plan check unchanged');

  -- 3. a person on a company plan: Ask 8 a day, 25 in all a day
  perform pg_temp.ok(pg_temp.use(M1, 'teacher', 9) = 8, '3a Ask: 8 a day'); perform pg_temp.ok(pg_temp.why(M1, 'teacher') = 'feature_day', '3b reason feature_day');
  perform pg_temp.ok(pg_temp.use(M1, 'analysis', 1, 15) = 0, '3c analysis is inside the Ask 8');
  perform pg_temp.ok(pg_temp.use(M1, 'stake', 16) = 15, '3d stake reads: 15 a day');
  perform pg_temp.ok(pg_temp.use(M1, 'cutsheet', 5) = 2, '3e 25 a day in all (8 + 15 + 2)'); perform pg_temp.ok(pg_temp.why(M1, 'cutsheet') = 'person_day', '3f reason person_day');
  perform pg_temp.ok(pg_temp.use(M1, 'gonogo_q', 3, 40) = 3, '3g the question check has its own counter');
  perform pg_temp.ok(pg_temp.use(M1, 'plans_strong', 3, 3) = 2, '3h strong plan reads: 2 a day');
  perform pg_temp.ok((select u.count from public.ai_usage u where u.user_id = M1 and u.day = today and u.feature = 'plans_strong') = 2
    and pg_temp.err(format('insert into public.ai_usage (user_id, day, feature, count) values (%L, current_date, %L, 1)', M1, 'other')) like '%ai_usage_feature_check%', '3h2 the strong look-ups are counted in ai_usage (the name is allowed now); an unknown name is still refused');
  perform pg_temp.act(M1); r := public.pb_my_limits('teacher');
  perform pg_temp.ok(r->'day' = '{"used": 25, "limit": 25}'::jsonb and r->'month'->>'limit' = '150' and r->'company_day' = '{"used": 25, "limit": 60}'::jsonb and r->'company_month'->>'limit' = '300' and r->>'people' = '5', '3i pb_my_limits ' || r::text);

  -- 4. the company account: 5 a day, 1 cut sheet, no strong plan reads
  perform pg_temp.ok(pg_temp.use(OW, 'cutsheet', 2) = 1, '4a owner cut sheet: 1 a day');
  perform pg_temp.ok(pg_temp.use(OW, 'plans_strong', 1, 3) = 0, '4b owner strong plan reads: none');
  perform pg_temp.ok(pg_temp.use(OW, 'teacher', 9) = 4, '4c owner: 5 a day in all'); perform pg_temp.ok(pg_temp.why(OW, 'teacher') = 'person_day', '4d');
  perform pg_temp.ok(pg_temp.use(OW, 'ticket', 2, 60) = 0, '4e owner ticket after the 5');

  -- 5. the whole company: 12 a day for each paid person (60 for 5)
  perform pg_temp.ok(pg_temp.use(M2, 'stake', 15) + pg_temp.use(M2, 'teacher', 8) + pg_temp.use(M2, 'ticket', 2, 60) = 25, '5a second person 25');
  perform pg_temp.ok(pg_temp.use(M3, 'stake', 9) = 5, '5b company stops at 60 a day (25 + 5 + 25 + 5)'); perform pg_temp.ok(pg_temp.why(M3, 'stake') = 'company_day', '5c reason company_day');
  perform pg_temp.ok((select sum(p.n) from pb_billing.ai_pool p where p.owner_key = C::text) = 60, '5d total 60');
  perform public.ai_refund(M3, 'stake'); perform pg_temp.ok((select sum(p.n) from pb_billing.ai_pool p where p.owner_key = C::text) = 59, '5e a refund gives it back');
  perform pg_temp.ok(pg_temp.use(M3, 'stake', 2) = 1, '5f and it can be used again, once');
  -- the month: 60 for each paid person (300 for 5)
  update pb_billing.ai_pool p set n = 300 where p.owner_key = C::text and p.day = today;
  perform pg_temp.ok(pg_temp.use(M4, 'teacher', 1) = 0 and pg_temp.why(M4, 'teacher') = 'company_month', '5g company month 300');
  update pb_billing.accounts set seats_paid = 12 where company_id = C;   -- 12 paid people: 720 a month, 144 a day
  perform pg_temp.ok(pg_temp.use(M4, 'teacher', 1) = 0 and pg_temp.why(M4, 'teacher') = 'company_day', '5h 12 people: month ok (720), day 144 reached');
  update pb_billing.ai_pool p set n = 0 where p.owner_key = C::text and p.day = today;
  perform pg_temp.ok(pg_temp.use(M4, 'teacher', 1) = 1, '5i room again');
  update pb_billing.accounts set seats_paid = 5 where company_id = C;

  -- 6. the dollar stop: $22 a month for the base plan, + $3.25 for each extra paid person
  perform public.ai_cost_add(M4, 'teacher', 21.95);
  perform pg_temp.ok(pg_temp.use(M4, 'teacher', 1) = 1, '6a under $22: goes');
  perform public.ai_cost_add(M4, 'teacher', 0.06);
  perform pg_temp.ok(pg_temp.use(M5, 'teacher', 1) = 0 and pg_temp.why(M5, 'teacher') = 'budget', '6b $22.01: every person in the company stops');
  perform pg_temp.ok(pg_temp.use(OW, 'gonogo_q', 1, 40) = 0 and pg_temp.use(M5, 'plans_strong', 1, 3) = 0, '6c the uncounted kinds stop too');
  update pb_billing.accounts set seats_paid = 12 where company_id = C;
  perform pg_temp.ok(pg_temp.use(M5, 'teacher', 1) = 1, '6d 12 paid people: the stop is $44.75');
  perform public.ai_cost_add(M5, 'stake', 24.50);
  perform pg_temp.ok(pg_temp.use(M5, 'teacher', 1) = 0 and pg_temp.why(M5, 'teacher') = 'budget', '6e $46.51 stops');
  update pb_billing.accounts set seats_paid = 5 where company_id = C;
  perform pg_temp.ok((select sum(usd) from pb_billing.ai_cost where user_id in (M4, M5)) = 46.51, '6f the per-person cost log still written');
  -- one person's month: 150
  delete from pb_billing.ai_pool where owner_key = C::text;
  insert into public.ai_usage (user_id, day, feature, count) values (M5, today, 'stake', 149) on conflict (user_id, day, feature) do update set count = 149;
  perform pg_temp.ok(pg_temp.use(M5, 'cutsheet', 1) = 0 and pg_temp.why(M5, 'cutsheet') = 'person_month', '6g one person: 150 a month');
  -- a read-only company (not paid past the grace days): no AI at all, as before
  update pb_billing.accounts set state = 'read_only' where company_id = C;
  perform pg_temp.ok(pg_temp.use(M3, 'stake', 1) = 0 and public.ai_daily_limit(M3) = 0 and pg_temp.why(M3, 'stake') = 'plan', '6h read-only company');
  update pb_billing.accounts set state = 'active' where company_id = C;

  -- 7. the individual plan: Ask 5, stake 10, 15 a day, 50 a month, $2.50 a month
  perform pg_temp.ok(pg_temp.use(IND, 'teacher', 6) = 5, '7a Ask 5'); perform pg_temp.ok(pg_temp.use(IND, 'stake', 11) = 10, '7b stake 10');
  perform pg_temp.ok(pg_temp.use(IND, 'cutsheet', 1) = 0 and pg_temp.why(IND, 'cutsheet') = 'person_day', '7c 15 a day');
  perform pg_temp.ok(pg_temp.use(IND, 'plans_strong', 1, 3) = 0, '7d no strong plan reads');
  perform pg_temp.ok((select sum(p.n) from pb_billing.ai_pool p where p.owner_key = 'u:' || IND::text) = 15, '7e own total');
  update public.ai_usage set count = 0 where user_id = IND; insert into public.ai_usage (user_id, day, feature, count) values (IND, today, 'stake', 50) on conflict (user_id, day, feature) do update set count = 50;
  perform pg_temp.ok(pg_temp.use(IND, 'teacher', 1) = 0 and pg_temp.why(IND, 'teacher') = 'person_month', '7f 50 a month');
  delete from public.ai_usage where user_id = IND;
  perform public.ai_cost_add(IND, 'stake', 2.49); perform pg_temp.ok(pg_temp.use(IND, 'teacher', 1) = 1, '7g under $2.50');
  perform public.ai_cost_add(IND, 'teacher', 0.02); perform pg_temp.ok(pg_temp.use(IND, 'teacher', 1) = 0 and pg_temp.why(IND, 'teacher') = 'budget', '7h $2.51 stops');
  perform pg_temp.ok(pb_billing.individual_limits() = '{"stake": 10, "ask": 5, "other": 3, "month": 50}'::jsonb, '7i individual_limits');

  -- 8. the individual plan's billing record
  perform pg_temp.act(M1); perform pg_temp.ok(pg_temp.err(format('select public.pb_owner_individual_on(%L)', IND2)) like '%pb:not_allowed%'
    and pg_temp.err(format('select public.pb_owner_individual_paid(%L, current_date)', IND2)) like '%pb:not_allowed%', '8a only the app owner');
  perform pg_temp.act(AD); r := public.pb_owner_individual_on(IND2);
  perform pg_temp.ok((r->>'ok')::boolean and exists (select 1 from pb_billing.individual_accounts x where x.user_id = IND2 and x.cents = 1500 and x.year_cents = 14400 and x.billing_interval = 'month'
    and x.paid_through = (current_date + interval '1 month')::date and x.state = 'active'), '8b record opened at $15.00 a month, $144.00 a year');
  perform pg_temp.ok(pb_billing.has_individual(IND2) and public.ai_daily_limit(IND2) = 15 and pg_temp.use(IND2, 'teacher', 1) = 1, '8c works');
  update pb_billing.individual_accounts set paid_through = current_date - 3 where user_id = IND2;
  perform pg_temp.ok(pb_billing.has_individual(IND2) and (pb_billing.individuals_json()->0->>'state') = 'past_due' and (pb_billing.individuals_json()->0->'next'->>'due')::boolean, '8d past due: 7 days of grace, listed as due');
  update pb_billing.individual_accounts set paid_through = current_date - 8 where user_id = IND2;
  perform pg_temp.ok(not pb_billing.has_individual(IND2) and pg_temp.use(IND2, 'teacher', 1) = 0 and pg_temp.why(IND2, 'teacher') = 'plan' and (pb_billing.individuals_json()->0->>'state') = 'lapsed', '8e not paid past the grace: AI off');
  perform pg_temp.act(AD); select paid_through into d from pb_billing.individual_accounts where user_id = IND2;
  r := public.pb_owner_individual_paid(IND2, d);
  perform pg_temp.ok((r->>'ok')::boolean and pb_billing.has_individual(IND2) and (r->'individuals'->0->'next'->>'amount_cents')::int = 1500, '8f Paid: one month on, next month $15.00');
  r := public.pb_owner_individual_paid(IND2, d); perform pg_temp.ok(r->>'code' = 'pb:period_changed', '8g pressed twice: nothing');
  select paid_through into d from pb_billing.individual_accounts where user_id = IND2;
  r := public.pb_owner_individual_paid(IND2, d, 'year');
  perform pg_temp.ok((r->'individuals'->0->>'interval') = 'year' and (r->'individuals'->0->'next'->>'amount_cents')::int = 14400
    and (select paid_through from pb_billing.individual_accounts where user_id = IND2) = (d + interval '1 year')::date, '8h yearly: one year on, $144.00 a year');
  r := public.pb_owner_billing(); perform pg_temp.ok(jsonb_array_length(r->'individuals') = 1 and r->'settings' ? 'individual_cents', '8i Billing lists it');
  r := public.pb_owner_billing_setting_set('individual_cents', '1800'::jsonb);
  perform pg_temp.ok((r->>'ok')::boolean and (pb_billing.prices()->>'individual_cents')::int = 1800 and (select cents from pb_billing.individual_accounts where user_id = IND2) = 1500, '8j a new price does not change who already pays');
  r := public.pb_owner_billing_setting_set('individual_cents', '1500'::jsonb);
  r := public.pb_owner_billing_setting_set('individual_year_cents', '15000'::jsonb); L := public.pb_owner_billing_setting_set('plan_sheet_cents', '125'::jsonb);
  perform pg_temp.ok((r->>'ok')::boolean and (L->>'ok')::boolean
    and (pb_billing.prices()->>'individual_year_cents')::int = 15000 and (pb_billing.prices()->>'plan_sheet_cents')::int = 125
    and public.pb_owner_billing_setting_set('plan_sheet_cents', '1.5'::jsonb)->>'code' = 'pb:bad_value', '8j2 the yearly price and the sheet price can be set');
  r := public.pb_owner_billing_setting_set('individual_year_cents', '14400'::jsonb); r := public.pb_owner_billing_setting_set('plan_sheet_cents', '100'::jsonb); L := pb_billing.plan_limits();
  r := public.pb_owner_individual_off(IND2); perform pg_temp.ok((r->>'ok')::boolean and not pb_billing.has_individual(IND2) and (select state from pb_billing.individual_accounts where user_id = IND2) = 'canceled', '8k off');
  perform pg_temp.ok(pb_billing.has_individual(IND), '8l an individual plan from before (no record) is unchanged');

  -- 9. beta: its own counts as before, plus a $30 a month dollar stop; no plan: nothing
  perform pg_temp.ok(pg_temp.use(BM, 'teacher', 11) = 10 and pg_temp.use(BM, 'stake', 2) = 2, '9a beta counts unchanged (Ask 10)');
  perform public.ai_cost_add(BM, 'teacher', 30); perform pg_temp.ok(pg_temp.use(BM, 'stake', 1) = 0 and pg_temp.use(BO, 'stake', 1) = 0 and pg_temp.why(BM, 'stake') = 'budget', '9b beta dollar stop');
  perform pg_temp.ok(pg_temp.use(NP, 'teacher', 1) = 0 and pg_temp.why(NP, 'teacher') = 'plan', '9c no plan');

  -- 10. photo uploads: the company account 20 a day, a person 150 a day, 10 GB for the company (+1 GB each extra paid person)
  perform pg_temp.put(OW, 'run-photos', 19); perform pg_temp.ok(pg_temp.can(OW, 'run-photos', 400), '10a owner 19: room');
  perform pg_temp.put(OW, 'run-photos', 1); perform pg_temp.ok(not pg_temp.can(OW, 'run-photos', 400), '10b owner 20: full');
  perform pg_temp.put(M1, 'run-photos', 149); perform pg_temp.ok(pg_temp.can(M1, 'run-photos', 400), '10c person 149');
  perform pg_temp.put(M1, 'run-photos', 1); perform pg_temp.ok(not pg_temp.can(M1, 'run-photos', 400) and pg_temp.can(M1, 'run-seals', 100) and pg_temp.can(M2, 'run-photos', 400), '10d person 150: full, sealed runs and others go on');
  perform pg_temp.put(M3, 'run-photos', 1, 10.0 * 1073741824); perform pg_temp.ok(not pg_temp.can(M2, 'run-photos', 400) and not pg_temp.can(M2, 'run-seals', 100), '10e company over 10 GB: full for everyone');
  update pb_billing.accounts set seats_paid = 7 where company_id = C; perform pg_temp.ok(pg_temp.can(M2, 'run-photos', 400), '10f 7 paid people: 12 GB');
  update pb_billing.accounts set seats_paid = 5 where company_id = C;
  perform pg_temp.put(NP, 'run-photos', 9); perform pg_temp.ok(pg_temp.can(NP, 'run-photos', 400), '10g no plan 9');
  perform pg_temp.put(NP, 'run-photos', 1); perform pg_temp.ok(not pg_temp.can(NP, 'run-photos', 400), '10h no plan: 10 a day');
  perform pg_temp.put(IND, 'run-photos', 59); perform pg_temp.ok(pg_temp.can(IND, 'run-photos', 400), '10i individual 59');
  perform pg_temp.put(IND, 'cutsheet-sources', 1, 1.0 * 1073741824); perform pg_temp.ok(not pg_temp.can(IND, 'run-photos', 400), '10j individual over 1 GB');
  perform pg_temp.ok(pg_temp.can(BM, 'run-photos', 400), '10k beta');

  -- 11. plan reading and uploaded documents
  perform pg_temp.ok(pb_plans.limits() = '{"sheets_month": 150, "usd_month": 45, "sets_day": 3, "pages_set": 150}'::jsonb, '11a plan reading default ' || pb_plans.limits()::text);
  perform pg_temp.ok(pb_plans.limits_for(C) = pb_plans.limits() and pb_plans.limits_for(B) = pb_plans.limits(), '11b every company: the default');
  update pb_billing.accounts set plan_reading = true where company_id = C;
  insert into pb_billing.limit_overrides (company_id, limits, note) values (C, '{"plan_reading": {"sheets_month": 69, "pages_set": 69}}'::jsonb, 'test');
  r := pb_plans.limits_for(C); perform pg_temp.ok((r->>'usd_month')::numeric = 45 and (r->>'sheets_month')::int = 69 and (r->>'pages_set')::int = 69 and (r->>'sets_day')::int = 3, '11c a company''s own plan reading numbers ' || r::text);
  delete from pb_billing.limit_overrides where company_id = C;
  update pb_billing.accounts set plan_reading = false where company_id = C;
  perform pg_temp.ok((pb_docs.limits('company')->>'ai_pages_month')::int = 200 and (pb_docs.limits('company')->>'check_usd_month')::numeric = 4 and (pb_docs.limits('company')->>'uploads_day')::int = 10
    and (pb_docs.limits('individual')->>'ai_pages_month')::int = 30 and (pb_docs.limits('individual')->>'check_usd_month')::numeric = 0.5 and (pb_docs.limits('company')->>'bytes_total')::bigint = 1073741824, '11h document limits');

  -- 12. what the app is told
  perform pg_temp.act(M1); r := public.pb_my_plan();
  perform pg_temp.ok(r->>'plan' = 'paid' and (r->'prices'->>'base_cents')::int = 9900 and (r->'prices'->>'seat_cents')::int = 1200, '12a member sees the prices ' || r::text);
  perform pg_temp.act(BM); r := public.pb_my_plan(); perform pg_temp.ok(r->>'plan' = 'trial' and (r->'prices'->>'base_cents')::int = 9900 and r->'limits' is not null, '12b beta sees the prices');
  perform pg_temp.act(NP); r := public.pb_my_plan();
  perform pg_temp.ok(r->'plan' = 'null'::jsonb and (r->'prices'->>'individual_cents')::int = 1500 and (r->'prices'->>'individual_year_cents')::int = 14400 and r->>'individual' = 'false' and r->>'requested' = 'false', '12c no plan: individual price ' || r::text);
  r := public.pb_plan_request('individual'); perform pg_temp.ok((r->>'ok')::boolean and (public.pb_my_plan()->>'requested')::boolean, '12d request recorded');
  perform pg_temp.ok((select m.body from pb_support.messages m where m.user_id = NP order by m.created_at desc limit 1) = 'Asked for an individual plan. Price shown: $15.00 a month or $144.00 a year, plus tax.', '12e the note: ' || coalesce((select m.body from pb_support.messages m where m.user_id = NP limit 1), 'none'));
  perform pg_temp.act(BM); r := public.pb_plan_request('company');
  perform pg_temp.ok((select m.body from pb_support.messages m where m.user_id = BM limit 1) = 'Asked for the company to start a paid plan (end of beta). Price shown: $99.00 a month, plus tax.', '12f company note');
  perform pg_temp.act(IND); r := public.pb_my_plan(); perform pg_temp.ok(r->>'individual' = 'true' and r->'plan' = 'null'::jsonb, '12g individual with no company is told so');
  perform set_config('request.jwt.claims', '{"role":"anon"}', true); r := public.pb_plan_prices(); perform pg_temp.ok((r->>'ok')::boolean and (r->>'individual_cents')::int = 1500 and (r->>'plan_sheet_cents')::int = 100, '12h price list without a login');
  perform pg_temp.ok(public.pb_my_limits()->>'code' = 'pb:signed_out', '12i limits need a login');

  -- 13. the worst case, from the limits themselves: dollars a month (AI stop + document AI stop) against the monthly price
  select jsonb_object_agg(k, jsonb_build_object('price', price, 'ai_stop', ai, 'docs_stop', docs, 'pct', round(100 * (ai + docs) / price, 1))) into r from (
    select p::text || ' people' k, 99 + 12 * greatest(0, p - 5) price, (L->'company'->>'usd_base')::numeric + (L->'company'->>'usd_per_extra')::numeric * greatest(0, p - 5) ai,
           (pb_docs.limits('company')->>'check_usd_month')::numeric docs from unnest(array[5, 12, 25]) p
    union all select 'individual, yearly ($12 a month)', 12, (L->'individual'->>'usd_month')::numeric, (pb_docs.limits('individual')->>'check_usd_month')::numeric
    union all select 'individual, monthly', 15, (L->'individual'->>'usd_month')::numeric, (pb_docs.limits('individual')->>'check_usd_month')::numeric) z;
  perform pg_temp.ok((select bool_and((v->>'pct')::numeric <= 30) from jsonb_each(r) e(k, v)), '13 worst case over 30% ' || r::text);
  res := res || jsonb_build_object('worst_case', r);

  -- 14. one company's own limits (pb_billing.limit_overrides): the app owner's own company, for testing and demos
  select c.id, c.owner_user_id into DIG, DIGO from public.companies c join auth.users u on u.id = c.owner_user_id where lower(u.email) = 'tfontaine@digcivil.com' and c.name ilike 'DIG Civil%';
  perform pg_temp.ok(DIG is not null and (select count(*) from pb_billing.limit_overrides) = 1 and exists (select 1 from pb_billing.limit_overrides o where o.company_id = DIG), '14a the migration gave exactly one company its own limits: the app owner''s');
  -- read only on the real row: who its people are, the daily number, the dollar stop
  perform pg_temp.ok((select who from pb_billing.ai_who(DIGO)) = 'owner' and public.ai_daily_limit(DIGO) = 300 and (pb_billing.limits_of(DIG)->'company'->>'usd_base')::numeric = 150
    and (pb_billing.limits_of(DIG)->'company'->>'usd_per_extra')::numeric = 0 and pb_billing.ai_block(DIGO, 'teacher', 1000000) is null
    and (select bool_and(public.ai_daily_limit(m.user_id) = 300) from public.company_members m where m.company_id = DIG), '14b its company account and its members: 300 a day, $150 a month stop');
  perform pg_temp.ok(pb_billing.limits_of(C) = pb_billing.plan_limits() and pb_billing.limits_of(null) = pb_billing.plan_limits() and public.ai_daily_limit(DO1) = 5 and public.ai_daily_limit(DM) = 25, '14c every other company: the standard limits');
  -- the same numbers on a test company (so nothing is written for real people)
  insert into pb_billing.limit_overrides (company_id, limits, note) select DCO, o.limits, 'test' from pb_billing.limit_overrides o where o.company_id = DIG;
  perform pg_temp.ok((select who from pb_billing.ai_who(DO1)) = 'owner' and public.ai_daily_limit(DO1) = 300 and public.ai_daily_limit(DM) = 300, '14d who and the daily number');
  perform pg_temp.ok(pg_temp.use(DO1, 'teacher', 40, 300) = 40 and pg_temp.use(DO1, 'cutsheet', 6, 300) = 6, '14e the company account: 40 Ask questions and 6 cut sheets in a day (standard: 5 and 1)');
  perform pg_temp.ok(pg_temp.use(DM, 'stake', 70, 300) = 70 and pg_temp.use(DM, 'teacher', 30, 300) = 30 and pg_temp.use(DM, 'plans_strong', 5, 30) = 5, '14f a member: 100 requests in a day, past the standard 25 and the standard company 60');
  perform pg_temp.act(DM); r := public.pb_my_limits('teacher');
  perform pg_temp.ok(r->'day' = '{"used": 100, "limit": 300}'::jsonb and r->'company_day' = '{"used": 146, "limit": 2000}'::jsonb and r->'company_month'->>'limit' = '20000' and r->>'reached' is null, '14g pb_my_limits ' || r::text);
  perform public.ai_cost_add(DM, 'teacher', 22.50); perform pg_temp.ok(pg_temp.use(DM, 'teacher', 1, 300) = 1, '14h past the standard $22: still goes');
  perform public.ai_cost_add(DM, 'teacher', 50); perform public.ai_cost_add(DM, 'teacher', 50); perform public.ai_cost_add(DM, 'teacher', 27.40);  -- one request is counted at $50 at most perform pg_temp.ok(pg_temp.use(DO1, 'teacher', 1, 300) = 1, '14i $149.90: goes');
  perform public.ai_cost_add(DO1, 'stake', 0.20);
  perform pg_temp.ok(pg_temp.use(DO1, 'teacher', 1, 300) = 0 and pg_temp.use(DM, 'stake', 1, 300) = 0 and pg_temp.why(DM, 'stake') = 'budget', '14j $150.10: the dollar stop holds for this company too');
  perform pg_temp.put(DO1, 'run-photos', 100); perform pg_temp.ok(pg_temp.can(DO1, 'run-photos', 400), '14k the company account: 100 photos in a day (standard: 20)');
  perform pg_temp.put(DM, 'run-photos', 1, 20.0 * 1073741824); perform pg_temp.ok(pg_temp.can(DM, 'run-photos', 400), '14l 20 GB stored (standard: 10 GB)');
  perform pg_temp.ok(pb_plans.limits_for(DCO) = '{"sheets_month": 250, "usd_month": 75, "sets_day": 10, "pages_set": 250}'::jsonb, '14m plan reading ' || pb_plans.limits_for(DCO)::text);
  perform pg_temp.ok((pb_docs.limits_for(DCO)->>'ai_pages_month')::int = 1500 and (pb_docs.limits_for(DCO)->>'check_usd_month')::numeric = 20 and (pb_docs.limits_for(DCO)->>'bytes_total')::bigint = 1073741824
    and (pb_docs.limits_for(C)->>'ai_pages_month')::int = 200 and (pb_docs.limits_for(C)->>'check_usd_month')::numeric = 4 and pb_docs.limits_for(null) = pb_docs.limits('individual'), '14n uploaded documents: its own numbers; others standard');
  delete from pb_billing.limit_overrides where company_id = DCO; delete from pb_billing.ai_pool where owner_key = DCO::text;
  perform pg_temp.ok(public.ai_daily_limit(DO1) = 5 and pg_temp.use(DO1, 'teacher', 1) = 0 and pg_temp.why(DO1, 'teacher') = 'person_month', '14o row removed: back to the standard limits at once (it is past the company account''s 30 a month)');
  res := res || jsonb_build_object('own_limits', (select jsonb_agg(jsonb_build_object('company', c.name, 'ai_stop_usd', o.limits->'company'->'usd_base')) from pb_billing.limit_overrides o join public.companies c on c.id = o.company_id), 'checks', 'all passed');
  raise exception 'RESULT: %', res;
end $T$;
