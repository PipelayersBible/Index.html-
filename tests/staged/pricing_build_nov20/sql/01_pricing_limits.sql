-- Pricing build, Nov 20 2026 (STAGED, not applied). Prices, the individual plan, and hard caps on everything that costs money.
-- Apply as ONE migration (it runs in one transaction; any failed self-check rolls all of it back).
--
-- Decisions it carries (the owner, Nov 20):
--   Company plan  $99 a month, 5 people included, $12 each extra person, yearly = 10 months, founder lock 12 months.
--                 Everyone with a login counts as a person. The company account (the owner login) is free and is not counted.
--   Individual    $12 a month (recommended; the owner said $10-15), yearly = 10 months. No free tier.
--   The company account gets tight limits of its own (it is free, so it must not be a way around paying for people).
--   Limits        worst case (everybody at every limit every day) costs at most 30% of the monthly price.
--
-- How the worst case is made certain: every AI request already reports its real cost (public.ai_cost_add). This file keeps a
-- running total per company (or per individual) and stops AI for the rest of the month when the total reaches the budget.
-- The count limits (per day, per month) are there so people see a plain number long before the dollar stop is reached.
--
-- Existing functions are changed in two ways:
--   REPLACED in full (their old text is in sql/live/):  public.ai_daily_limit, public.ai_try_consume, public.ai_cost_add,
--     public.ai_refund, public.pb_storage_put_ok, pb_billing.individual_limits, pb_billing.has_individual, pb_plans.limits, pb_docs.limits
--   PATCHED in place by pg_temp.pb_patch (one exact piece of text swapped; refuses unless it finds it exactly once):
--     public.pb_my_plan, public.pb_plan_request, public.pb_plans_begin, public.pb_owner_billing,
--     public.pb_owner_billing_setting_set, public.pb_owner_individual_on
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
  ('individual_cents', '1200'::jsonb, 'Individual plan (one person, no company), per month. Yearly = yearly_months of it.')
on conflict (key) do nothing;

create or replace function pb_billing.prices() returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'base_cents', pb_billing.setting_int('base_cents', 9900), 'base_seats', pb_billing.setting_int('base_seats', 5),
    'seat_cents', pb_billing.setting_int('seat_cents', 1200), 'yearly_months', pb_billing.setting_int('yearly_months', 10),
    'founder_months', pb_billing.setting_int('founder_months', 12), 'individual_cents', pb_billing.setting_int('individual_cents', 1200),
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
    "individual": {"day": 15, "month": 60,  "ask": 5, "analysis": 2, "stake": 10, "cutsheet": 2, "ticket": 3,  "plans_strong": 0, "other": 3, "photos_day": 60,
                   "usd_month": 3.00, "storage_gb": 1},
    "company":    {"day_per_person": 12, "month_per_person": 60, "usd_base": 24.00, "usd_per_extra": 3.50, "storage_gb_base": 10, "storage_gb_per_extra": 1},
    "beta":       {"usd_month": 30.00, "photos_day": 150, "storage_gb": 10},
    "none":       {"photos_day": 10, "storage_gb": 0.1},
    "plan_reading": {"sheets_month": 150, "usd_month": 45, "sets_day": 3, "pages_set": 150, "share": 0.33, "usd_sheet": 0.28}
  }'::jsonb
$$;

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

-- REPLACED. Was: 100 a day for a paid company member or owner, 10 for an individual. The beta lines are unchanged.
create or replace function public.ai_daily_limit(p_user uuid) returns integer
language sql stable security definer set search_path to 'public' as $function$
/* pb_sec S12 owner; Nov 16: trials go by ai_feature_limit; pricing Nov 20: paid people, the company account and individual plans go by pb_billing.plan_limits */
  select case
    when w.who = 'beta' then case when exists (select 1 from pb_billing.company_of(p_user) x where x.expired) then 0 else 30 end
    when w.who is null then 0
    else (pb_billing.plan_limits()->w.who->>'day')::int end
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
  lim := (pb_billing.plan_limits()->w.who->>'day')::int;
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
  from (select pb_billing.plan_limits() L) x
$$;

create or replace function pb_billing.storage_room(p_user uuid, p_bucket text, p_cap integer) returns boolean
language plpgsql stable security definer set search_path to '' as $$
declare w record; L jsonb := pb_billing.plan_limits(); v_cap int; v_bytes numeric;
begin
  select * into w from pb_billing.ai_who(p_user);
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

-- A company with a priced plan reading add-on: the month's reading budget is a third of what it pays for the add-on,
-- and the sheet count follows from it ($0.28 a sheet). No price on the account: the default above.
create or replace function pb_plans.limits_for(p_company uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select case when a.plan_reading_cents is null or not a.plan_reading then pb_plans.limits()
    else pb_plans.limits() || jsonb_build_object(
      'usd_month', round(a.plan_reading_cents / 100.0 * (L->>'share')::numeric, 2),
      'sheets_month', floor(a.plan_reading_cents / 100.0 * (L->>'share')::numeric / (L->>'usd_sheet')::numeric)::int,
      'pages_set', floor(a.plan_reading_cents / 100.0 * (L->>'share')::numeric / (L->>'usd_sheet')::numeric)::int) end
  from (select pb_billing.plan_limits()->'plan_reading' L) x
  left join pb_billing.accounts a on a.company_id = p_company
$$;

select pg_temp.pb_patch('public.pb_plans_begin(text, text, integer, text)'::regprocedure,
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

-- ---------------------------------------------------------------------------------------------------------------------
-- 8. The individual plan in pb_billing: what the person pays and how far it is paid.
create table if not exists pb_billing.individual_accounts (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  cents            integer not null check (cents >= 0),          -- per month, copied from the setting when the plan starts
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  yearly_months    integer not null default 10,
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
  insert into pb_billing.individual_accounts (user_id, cents, billing_interval, yearly_months, period_start, paid_through, grace_days, created_by)
  values (p_user, pb_billing.setting_int('individual_cents', 1200), case when p_interval = 'year' then 'year' else 'month' end,
          pb_billing.setting_int('yearly_months', 10), current_date,
          pb_billing.period_after(current_date, case when p_interval = 'year' then 'year' else 'month' end), pb_billing.setting_int('grace_days', 7), auth.uid())
  on conflict (user_id) do update set state = 'active', billing_interval = excluded.billing_interval, period_start = excluded.period_start,
      paid_through = excluded.paid_through, updated_at = now()
    where pb_billing.individual_accounts.state = 'canceled' or current_date >= pb_billing.individual_accounts.paid_through + pb_billing.individual_accounts.grace_days
$$;

create or replace function pb_billing.individuals_json() returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', (select u.email::text from auth.users u where u.id = a.user_id),
      'cents', a.cents, 'interval', a.billing_interval, 'paid_through', a.paid_through, 'lock_on', a.paid_through + a.grace_days,
      'state', case when a.state = 'canceled' or not exists (select 1 from public.subscriptions s where s.user_id = a.user_id and s.tier = 'individual' and s.status = 'active') then 'canceled'
                    when current_date >= a.paid_through + a.grace_days then 'lapsed'
                    when current_date >= a.paid_through then 'past_due' else 'active' end,
      'next', jsonb_build_object('from', a.paid_through, 'to', pb_billing.period_after(a.paid_through, a.billing_interval),
        'amount_cents', a.cents * case when a.billing_interval = 'year' then a.yearly_months else 1 end,
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
    jsonb_build_object('from', a.paid_through, 'to', v_to, 'interval', v_int, 'amount_cents', a.cents * case when v_int = 'year' then a.yearly_months else 1 end), auth.uid());
  perform pb_audit.admin_note('individual_plan_paid', null, p_user, jsonb_build_object('from', a.paid_through, 'to', v_to));
  return jsonb_build_object('ok', true, 'individuals', pb_billing.individuals_json());
end $$;

-- PATCHED: turning an individual plan on also opens its billing record (monthly, at today's price).
select pg_temp.pb_patch('public.pb_owner_individual_on(uuid)'::regprocedure,
  $o$  perform pb_audit.admin_note('individual_plan_on', null, p_user, null);$o$,
  $n$  perform pb_billing.individual_open(p_user, 'month');  -- pricing Nov 20
  perform pb_audit.admin_note('individual_plan_on', null, p_user, null);$n$);

-- PATCHED: turning it off closes the record too.
select pg_temp.pb_patch('public.pb_owner_individual_off(uuid, text)'::regprocedure,
  $o$  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;$o$,
  $n$  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  update pb_billing.individual_accounts set state = 'canceled', updated_at = now() where user_id = p_user;  -- pricing Nov 20$n$);

-- PATCHED: Billing shows the individual plans too.
select pg_temp.pb_patch('public.pb_owner_billing()'::regprocedure,
  $o$    'companies', v_cos,$o$,
  $n$    'individuals', pb_billing.individuals_json(),
    'companies', v_cos,$n$);

-- PATCHED: the individual price can be set like the others.
select pg_temp.pb_patch('public.pb_owner_billing_setting_set(text, jsonb)'::regprocedure,
  $o$    else null end;$o$,
  $n$    when 'individual_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 1000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    else null end;$n$);

-- ---------------------------------------------------------------------------------------------------------------------
-- 9. What the app is told. PATCHED pb_my_plan: every answer carries the price list; a person with no company is told
--    whether they have an individual plan or a request waiting.
select pg_temp.pb_patch('public.pb_my_plan()'::regprocedure,
  $o$'limits', case when x.plan = 'trial' then pb_billing.trial_limits() end)$o$,
  $n$'limits', case when x.plan = 'trial' then pb_billing.trial_limits() end, 'prices', pb_billing.prices())$n$);
select pg_temp.pb_patch('public.pb_my_plan()'::regprocedure,
  $o$r.done_at is null))
     from pb_billing.left_company l$o$,
  $n$r.done_at is null), 'prices', pb_billing.prices())
     from pb_billing.left_company l$n$);
select pg_temp.pb_patch('public.pb_my_plan()'::regprocedure,
  $o$    jsonb_build_object('ok', true, 'plan', null))$o$,
  $n$    jsonb_build_object('ok', true, 'plan', null, 'individual', pb_billing.has_individual(auth.uid()),
      'requested', exists (select 1 from pb_billing.plan_requests r where r.user_id = auth.uid() and r.done_at is null),
      'prices', pb_billing.prices()))$n$);

-- PATCHED pb_plan_request: the note the app owner gets says what price the person was shown, and no longer says
-- "end of beta" for someone who was never in a company.
select pg_temp.pb_patch('public.pb_plan_request(text)'::regprocedure,
  $o$else 'Asked for an individual plan (end of beta).' end,$o$,
  $n$else 'Asked for an individual plan' || case when v_co is null then '.' else ' (end of beta).' end end
                || ' Price shown: $' || to_char(case when v_kind = 'company' then pb_billing.setting_int('base_cents', 9900) else pb_billing.setting_int('individual_cents', 1200) end / 100.0, 'FM999990.00') || ' a month plus tax.',$n$);

-- ---------------------------------------------------------------------------------------------------------------------
-- 10. Who may call what. The helpers are reached only through the functions above.
revoke all on function pb_billing.prices(), pb_billing.plan_limits(), pb_billing.paid_people(uuid), pb_billing.ai_who(uuid),
  pb_billing.ai_block(uuid, text, integer), pb_billing.storage_gb(text, uuid), pb_billing.storage_room(uuid, text, integer),
  pb_billing.individual_open(uuid, text), pb_billing.individuals_json(), pb_plans.limits_for(uuid)
  from public, anon, authenticated;
revoke all on function public.pb_my_limits(text) from public, anon;
revoke all on function public.pb_owner_individual_paid(uuid, date, text) from public, anon;
revoke all on function public.pb_plan_prices() from public;
grant execute on function public.pb_my_limits(text) to authenticated;
grant execute on function public.pb_owner_individual_paid(uuid, date, text) to authenticated;
grant execute on function public.pb_plan_prices() to anon, authenticated;
grant execute on function pb_billing.ai_who(uuid), pb_billing.ai_block(uuid, text, integer) to service_role;
