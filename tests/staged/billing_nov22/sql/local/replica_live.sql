-- LOCAL ONLY: live function texts read Nov 22 2026 (pg_get_functiondef). replica_check.sql compares their md5 with live.
CREATE OR REPLACE FUNCTION pb_support.admin_ok(p_uid uuid, p_aal text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p_uid is not null and exists (select 1 from pb_support.admins a where a.user_id = p_uid)
    and (coalesce(p_aal, '') = 'aal2' or not exists (select 1 from auth.mfa_factors f where f.user_id = p_uid and f.status = 'verified'))
$function$;
CREATE OR REPLACE FUNCTION pb_crew.invitation_expired(p_created timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select p_created < now() - interval '7 days'
$function$;
CREATE OR REPLACE FUNCTION pb_crew.ctx(p_actor uuid, p_expect_company uuid, OUT company_id uuid, OUT owner_id uuid, OUT is_owner boolean)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_actor is null then raise exception 'pb:signed_out'; end if;
  company_id := pb_prod.managed_company(p_actor);
  if company_id is null then raise exception 'pb:not_company_account'; end if;
  if p_expect_company is not null and p_expect_company <> company_id then raise exception 'pb:company_changed'; end if;
  select c.owner_user_id into owner_id from public.companies c where c.id = company_id;
  is_owner := owner_id = p_actor;
end $function$;
CREATE OR REPLACE FUNCTION pb_crew.in_other_company(p_user uuid, p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.company_members m where m.user_id = p_user and m.company_id <> p_company)
      or exists (select 1 from public.companies o where o.owner_user_id = p_user and o.id <> p_company)
$function$;
CREATE OR REPLACE FUNCTION pb_onboard.live_links(p_company uuid, p_except uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select count(*)::int from pb_onboard.links l
   where l.company_id = p_company and l.kind = 'join' and l.used_at is null and l.revoked_at is null and l.expires_at > now()
     and l.id is distinct from p_except
$function$;
CREATE OR REPLACE FUNCTION pb_crew.seats(p_company uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select count(*)::int from public.company_members m where m.company_id = p_company
$function$;
CREATE OR REPLACE FUNCTION pb_crew.seats_included()
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select 5 $function$;
CREATE OR REPLACE FUNCTION pb_billing.setting(p_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select s.value from pb_billing.settings s where s.key = p_key
$function$;
CREATE OR REPLACE FUNCTION pb_billing.setting_int(p_key text, p_default integer)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(case when jsonb_typeof(s.value) = 'number' then (s.value #>> '{}')::integer end, p_default)
  from (select pb_billing.setting(p_key) value) s
$function$;
CREATE OR REPLACE FUNCTION pb_billing.period_after(p_start date, p_interval text)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select (p_start + case when p_interval = 'year' then interval '1 year' else interval '1 month' end)::date
$function$;
CREATE OR REPLACE FUNCTION pb_billing.months_left(p_from date, p_to date)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p_to <= p_from then 0 else (extract(year from age(p_to, p_from)) * 12 + extract(month from age(p_to, p_from))
              + case when extract(day from age(p_to, p_from)) > 0 then 1 else 0 end)::int end
$function$;
CREATE OR REPLACE FUNCTION pb_billing.amount_cents(a pb_billing.accounts, p_seats integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select ((a.base_cents + greatest(0, p_seats - a.base_seats) * a.seat_cents
           + case when a.plan_reading then coalesce(a.plan_reading_cents, 0) else 0 end)
          * case when a.billing_interval = 'year' then a.yearly_months else 1 end)::int
$function$;
CREATE OR REPLACE FUNCTION pb_billing.state_of(a pb_billing.accounts)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select case when a.state = 'canceled' then 'canceled'
              when a.state = 'read_only' then 'read_only'
              when current_date >= a.paid_through + a.grace_days then 'read_only'
              when current_date >= a.paid_through then 'past_due'
              else 'active' end
$function$;
CREATE OR REPLACE FUNCTION pb_billing.read_only(p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pb_billing.accounts a where a.company_id = p_company
                 and (pb_billing.state_of(a) = 'read_only'
                      or (a.state = 'canceled' and coalesce(a.cancel_at, now()) <= now())))
$function$;
CREATE OR REPLACE FUNCTION pb_billing.beta_closed(p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.companies c where c.id = p_company and c.plan = 'trial'
                 and coalesce(c.trial_ends_at, now()) + interval '3 days' <= now())
$function$;
CREATE OR REPLACE FUNCTION pb_billing.writes_closed(p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pb_billing.beta_closed(p_company) or pb_billing.read_only(p_company)
$function$;
CREATE OR REPLACE FUNCTION pb_billing.company_of(p_user uuid)
 RETURNS TABLE(company_id uuid, plan text, trial_ends_at timestamp with time zone, expired boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.id, c.plan, c.trial_ends_at, (c.plan = 'trial' and coalesce(c.trial_ends_at, now()) <= now())
  from public.companies c
  where c.status = 'active' and p_user is not null
    and (c.owner_user_id = p_user or exists (select 1 from public.company_members m where m.company_id = c.id and m.user_id = p_user))
  order by (c.owner_user_id = p_user) desc, c.created_at desc limit 1
$function$;
CREATE OR REPLACE FUNCTION pb_billing.seats_used(p_company uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select count(*)::int from public.company_members m where m.company_id = p_company)
       + (select count(*)::int from pb_crew.invitations i where i.company_id = p_company and i.status = 'pending'
            and not pb_crew.invitation_expired(i.created_at)
            and not exists (select 1 from public.company_members m2 where m2.user_id = i.user_id and m2.company_id = p_company))
$function$;
CREATE OR REPLACE FUNCTION pb_billing.paid_people(p_company uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select greatest(coalesce((select a.seats_paid from pb_billing.accounts a where a.company_id = p_company), 0), pb_billing.setting_int('base_seats', 5))
$function$;
CREATE OR REPLACE FUNCTION pb_billing.prices()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'base_cents', pb_billing.setting_int('base_cents', 9900), 'base_seats', pb_billing.setting_int('base_seats', 5),
    'seat_cents', pb_billing.setting_int('seat_cents', 1200), 'yearly_months', pb_billing.setting_int('yearly_months', 10),
    'founder_months', pb_billing.setting_int('founder_months', 12), 'individual_cents', pb_billing.setting_int('individual_cents', 1500),
    'individual_year_cents', pb_billing.setting_int('individual_year_cents', 14400), 'plan_sheet_cents', pb_billing.setting_int('plan_sheet_cents', 100),
    'plan_reading_cents', pb_billing.setting_int('plan_reading_cents', null), 'tax', 'plus applicable tax')
$function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_limits()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object('days', 30, 'stake', 30, 'teacher', 10, 'analysis', 10, 'cutsheet', 5, 'ticket', 5, 'plans_strong', 0,
    'other', 10, 'company_day', 200, 'plan_sets_month', 2, 'seats', 7)
$function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_seats_used(p_company uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select 1 + (select count(*)::int from public.company_members m where m.company_id = p_company)
    + (select count(*)::int from pb_crew.invitations i where i.company_id = p_company and i.status = 'pending' and not pb_crew.invitation_expired(i.created_at))
$function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_seats_full(p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.companies c where c.id = p_company and c.plan = 'trial')
     and pb_billing.trial_seats_used(p_company) >= (pb_billing.trial_limits()->>'seats')::int
$function$;
CREATE OR REPLACE FUNCTION pb_billing.has_individual(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active')
     and not exists (select 1 from pb_billing.individual_accounts a where a.user_id = p_user
                     and (a.state = 'canceled' or current_date >= a.paid_through + a.grace_days))
$function$;
CREATE OR REPLACE FUNCTION pb_billing.individual_only(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pb_billing.has_individual(p_user) and not exists (select 1 from pb_billing.company_of(p_user) x where not x.expired and not pb_billing.read_only(x.company_id)) -- billing Phase 0
$function$;
CREATE OR REPLACE FUNCTION pb_billing.individual_open(p_user uuid, p_interval text DEFAULT 'month'::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into pb_billing.individual_accounts (user_id, cents, year_cents, billing_interval, period_start, paid_through, grace_days, created_by)
  values (p_user, pb_billing.setting_int('individual_cents', 1500), pb_billing.setting_int('individual_year_cents', 14400),
          case when p_interval = 'year' then 'year' else 'month' end, current_date,
          pb_billing.period_after(current_date, case when p_interval = 'year' then 'year' else 'month' end), pb_billing.setting_int('grace_days', 7), auth.uid())
  on conflict (user_id) do update set state = 'active', billing_interval = excluded.billing_interval, period_start = excluded.period_start,
      paid_through = excluded.paid_through, updated_at = now()
    where pb_billing.individual_accounts.state = 'canceled' or current_date >= pb_billing.individual_accounts.paid_through + pb_billing.individual_accounts.grace_days
$function$;
CREATE OR REPLACE FUNCTION pb_billing.individuals_json()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION pb_billing.account_json(a pb_billing.accounts)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_used int := pb_billing.seats_used(a.company_id); v_from date := a.paid_through;
  v_to date := pb_billing.period_after(a.paid_through, a.billing_interval);
  v_bill int := pb_billing.seats_used(a.company_id);
  v_st text := pb_billing.state_of(a); v_lock date := a.paid_through + a.grace_days;
  v_cap int := greatest(a.seats_paid, a.base_seats);
  v_extra int := greatest(0, pb_billing.seats_used(a.company_id) - greatest(a.seats_paid, a.base_seats));
  v_months int := pb_billing.months_left(current_date, a.paid_through);
  v_catch int := 0;
begin
  if a.billing_interval = 'year' and v_st = 'active' then v_catch := v_extra * a.seat_cents * v_months; end if;
  return jsonb_build_object('legal_name', a.legal_name, 'billing_email', a.billing_email, 'billing_contact', a.billing_contact,
    'billing_address', a.billing_address, 'tax_state', a.billing_address->>'state', 'seller_legal_name', a.seller_legal_name,
    'state', v_st, 'stored_state', a.state, 'read_only', pb_billing.read_only(a.company_id), 'cancel_at', a.cancel_at,
    'lock_on', v_lock, 'days_to_lock', case when v_st = 'past_due' then v_lock - current_date end, 'grace_days', a.grace_days,
    'seats_capacity', v_cap, 'extra', v_extra,
    'catchup', jsonb_build_object('people', case when a.billing_interval = 'year' then v_extra else 0 end, 'months', v_months,
      'cents', v_catch, 'monthly_next_invoice', case when a.billing_interval = 'month' then v_extra else 0 end),
    'interval', a.billing_interval, 'yearly_months', a.yearly_months, 'base_cents', a.base_cents, 'base_seats', a.base_seats,
    'seat_cents', a.seat_cents, 'plan_reading', a.plan_reading, 'plan_reading_cents', a.plan_reading_cents,
    'plan_reading_price_missing', a.plan_reading and a.plan_reading_cents is null,
    'founder_until', a.founder_until, 'founder_set_at', a.founder_set_at,
    'founder_set_by', (select u.email::text from auth.users u where u.id = a.founder_set_by),
    'order_signed_by', a.order_signed_by, 'order_signed_at', a.order_signed_at,
    'period_start', a.period_start, 'paid_through', a.paid_through, 'seats_paid', a.seats_paid, 'seats_used', v_used,
    'next', jsonb_build_object('from', v_from, 'to', v_to, 'seats', v_bill, 'amount_cents', pb_billing.amount_cents(a, v_bill),
      'founder', a.founder_until is not null and v_from < a.founder_until,
      'due', v_st <> 'canceled' and (v_st in ('past_due', 'read_only') or v_catch > 0
               or v_from <= current_date + pb_billing.setting_int('invoice_ahead_days', 7))));
end $function$;
CREATE OR REPLACE FUNCTION pb_billing.alert_text()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select 'billing, not the backup (the fix line below does not apply): ' || string_agg(x.line, '; ' order by x.lock_on)
         || '. Open Settings > Beta Accounts and press Paid once it is paid.'
  from (select a.legal_name || case when current_date < a.paid_through + a.grace_days
                 then ' is past due since ' || to_char(a.paid_through, 'Mon DD') || ' and locks (read-only) on '
                      || to_char(a.paid_through + a.grace_days, 'Mon DD') || ' (' || (a.paid_through + a.grace_days - current_date) || ' days left)'
                 else ' locked (read-only) on ' || to_char(a.paid_through + a.grace_days, 'Mon DD') || ': not paid' end line,
               a.paid_through + a.grace_days lock_on
        from pb_billing.accounts a
        where a.state = 'active' and current_date >= a.paid_through and current_date < a.paid_through + a.grace_days + 3) x
  having count(*) > 0
$function$;
CREATE OR REPLACE FUNCTION pb_billing.plan_limits()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION pb_billing.limits_of(p_company uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (select jsonb_object_agg(e.k, case when jsonb_typeof(o.limits->e.k) = 'object' then e.v || (o.limits->e.k) else e.v end)
       from pb_billing.limit_overrides o, jsonb_each(pb_billing.plan_limits()) e(k, v) where o.company_id = p_company),
    pb_billing.plan_limits())
$function$;
CREATE OR REPLACE FUNCTION pb_billing.ai_who(p_user uuid, OUT who text, OUT pool text, OUT company_id uuid)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;
CREATE OR REPLACE FUNCTION pb_billing.ai_block(p_user uuid, p_feature text, p_limit integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;
CREATE OR REPLACE FUNCTION pb_onboard.room(p_company uuid, p_freed integer DEFAULT 0, p_except uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when not exists (select 1 from public.companies c where c.id = p_company and c.status = 'active') then 'pb:company_inactive'
    when pb_billing.beta_closed(p_company) then 'pb:beta_ended'
    when pb_billing.read_only(p_company) then 'pb:read_only'
    when exists (select 1 from public.companies c where c.id = p_company and c.plan = 'trial')
         and pb_billing.trial_seats_used(p_company) - p_freed + pb_onboard.live_links(p_company, p_except) >= (pb_billing.trial_limits()->>'seats')::int then 'pb:trial_seats'
    else null end
$function$;
CREATE OR REPLACE FUNCTION pb_onboard.seat_info(p_company uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when c.plan = 'trial' then jsonb_build_object(
      'plan', 'trial',
      'people', pb_billing.trial_seats_used(p_company) - 1,
      'waiting', pb_onboard.live_links(p_company),
      'limit', (pb_billing.trial_limits()->>'seats')::int - 1)
    else jsonb_build_object(
      'plan', c.plan,
      'people', pb_billing.seats_used(p_company),
      'waiting', pb_onboard.live_links(p_company),
      'paid', (select greatest(a.seats_paid, pb_crew.seats_included()) from pb_billing.accounts a where a.company_id = p_company),
      'interval', (select a.billing_interval from pb_billing.accounts a where a.company_id = p_company))
    end
  from public.companies c where c.id = p_company
$function$;
CREATE OR REPLACE FUNCTION pb_billing.on_member_removed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into pb_billing.left_company (user_id, company_id, company_name, left_at, dismissed_at)
    values (old.user_id, old.company_id, (select c.name from public.companies c where c.id = old.company_id), now(), null)
    on conflict (user_id) do update set company_id = excluded.company_id, company_name = excluded.company_name, left_at = now(), dismissed_at = null;
  return old;
exception when others then return old; -- never block a removal
end $function$;
create trigger pb_member_removed after delete on public.company_members for each row execute function pb_billing.on_member_removed();
