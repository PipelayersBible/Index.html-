do $T$
declare
  A uuid := 'c3e7cdde-d744-4924-9508-dc991e1b68c3';           -- the app owner's admin account (pb_support.admins)
  DIG uuid := 'd01a4a5f-312a-418f-9172-ea9aec9784b5';         -- the legacy paid company
  S uuid := gen_random_uuid(); O uuid := gen_random_uuid(); M1 uuid := gen_random_uuid(); M2 uuid := gen_random_uuid();
  M3 uuid := gen_random_uuid(); M4 uuid := gen_random_uuid(); M5 uuid := gen_random_uuid(); I1 uuid := gen_random_uuid();
  XU uuid := gen_random_uuid(); XU2 uuid := gen_random_uuid();
  C uuid := gen_random_uuid(); B uuid := gen_random_uuid(); D uuid := gen_random_uuid();
  SET1 uuid := gen_random_uuid(); SET2 uuid := gen_random_uuid(); SH bigint;
  r jsonb; r2 jsonb; e text; res jsonb := '{}'::jsonb; before_plan jsonb; before_dig jsonb; before_dig_m jsonb; n int; dd date; tt timestamptz;
begin
  create function pg_temp.act(u uuid) returns void language sql as $a$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'aal', 'aal2')::text, true) $a$;
  create function pg_temp.err(q text) returns text language plpgsql as $e$ begin execute q; return 'no error'; exception when others then return sqlerrm; end $e$;
  create function pg_temp.w(c uuid, u uuid) returns text language sql as $w$ select pg_temp.err(format('insert into pb_prod.site_log (user_id, company_id, client_item_id, kind, data) values (%L, %L, %L, %L, %L)', u, c, gen_random_uuid()::text, 'delay', '{}')) $w$;
  insert into auth.users (id, email, aud, role) select u, 'b0t-' || u || '@test.invalid', 'authenticated', 'authenticated' from unnest(array[S, O, M1, M2, M3, M4, M5, I1, XU, XU2]) u;
  insert into public.companies (id, name, owner_user_id, status, plan, trial_ends_at) values
    (C, 'B0 Test Pipeline', S, 'active', 'trial', now() + interval '10 days'),   -- in its beta, run by superintendent S
    (B, 'B0 Ended Beta', XU2, 'active', 'trial', now() - interval '5 days'),      -- beta ended 5 days ago (closed)
    (D, 'B0 Other Beta', XU, 'active', 'trial', now() + interval '3 days');
  insert into public.company_members (company_id, user_id, role) values (C, O, 'foreman'), (C, M1, 'pipelayer'), (C, M2, 'pipelayer'), (C, M3, 'pipelayer'), (C, M4, 'pipelayer');
  insert into pb_crew.invitations (company_id, user_id, role, invited_by, status) values (C, I1, 'pipelayer', S, 'pending');
  insert into public.subscriptions (user_id, tier, status) values (M2, 'individual', 'active');
  insert into pb_billing.plan_requests (user_id, company_id, kind) values (O, C, 'company');
  perform pg_temp.act(M1); before_plan := public.pb_my_plan();
  perform pg_temp.act((select owner_user_id from public.companies where id = DIG)); before_dig := public.pb_my_plan();
  perform pg_temp.act((select user_id from public.company_members where company_id = DIG limit 1)); before_dig_m := public.pb_my_plan();

  -- ===== the SQL under test, inlined (rolled back with the block) =====

  -- ----- 01_billing_accounts.sql

create table if not exists pb_billing.settings (
  key        text primary key,
  value      jsonb,
  note       text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table pb_billing.settings enable row level security;  -- no policies: reached only through the functions below
insert into pb_billing.settings (key, value, note) values
  ('seller_legal_name',  'null'::jsonb, 'Legal name on invoices and orders. Not set until the new LLC is formed.'),
  ('base_cents',         '9900'::jsonb, 'Company plan, per month, includes base_seats people.'),
  ('base_seats',         '5'::jsonb,    'People included in the base price. The company login is never counted.'),
  ('seat_cents',         '1200'::jsonb, 'Each person over base_seats, per month.'),
  ('yearly_months',      '10'::jsonb,   'A yearly invoice = this many months of the monthly price.'),
  ('grace_days',         '7'::jsonb,    'Days after the paid-through date before an unpaid company goes read-only (copied onto each account).'),
  ('founder_months',     '12'::jsonb,   'How long a founder price is locked.'),
  ('plan_reading_cents', 'null'::jsonb, 'Plan reading add-on, per month. Not decided yet (null = price not set).'),
  ('invoice_ahead_days', '7'::jsonb,    'Billing due lists a period this many days before it starts.')
on conflict (key) do nothing;

create or replace function pb_billing.setting(p_key text) returns jsonb
language sql stable security definer set search_path to '' as $$
  select s.value from pb_billing.settings s where s.key = p_key
$$;

create or replace function pb_billing.setting_int(p_key text, p_default integer) returns integer
language sql stable security definer set search_path to '' as $$
  select coalesce(case when jsonb_typeof(s.value) = 'number' then (s.value #>> '{}')::integer end, p_default)
  from (select pb_billing.setting(p_key) value) s
$$;

create table if not exists pb_billing.accounts (
  company_id         uuid primary key references public.companies(id) on delete restrict,
  legal_name         text not null check (length(btrim(legal_name)) between 1 and 200),
  billing_email      text not null check (billing_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(billing_email) <= 254),
  billing_contact    text check (length(billing_contact) <= 200),
  billing_address    jsonb not null default '{}'::jsonb,      -- {line1, city, state, postal_code, country}; sales tax follows it
  tax_status         text not null default 'taxable' check (tax_status in ('taxable', 'exempt')),
  seller_legal_name  text,                                     -- the seller at Make Paid (setting), null while not formed
  seats_paid         integer not null check (seats_paid between 0 and 1000),   -- paid seats for the current period (free slots = paid - used)
  base_seats         integer not null check (base_seats between 1 and 100),
  base_cents         integer not null check (base_cents between 0 and 10000000),
  seat_cents         integer not null check (seat_cents between 0 and 1000000),
  billing_interval   text not null default 'month' check (billing_interval in ('month', 'year')),
  yearly_months      integer not null default 10 check (yearly_months between 1 and 12),
  collection         text not null default 'invoice' check (collection in ('invoice', 'card_auto')),
  plan_reading       boolean not null default false,           -- the add-on; off = plan sets stay parked, as in the beta
  plan_reading_cents integer check (plan_reading_cents between 0 and 10000000),  -- null = price not set yet
  state              text not null default 'active' check (state in ('active', 'read_only', 'canceled')),  -- stored: what Tommy set
                                                               -- (past due / read-only after grace are computed: pb_billing.state_of)
  period_start       date not null,                            -- first day of the first billed period (the anchor)
  paid_through       date not null,                            -- end (exclusive) of the period paid for; set to the first period's end at Make Paid
  grace_days         integer not null default 7 check (grace_days between 0 and 30),
  cancel_at          timestamptz,
  founder_until      date,                                     -- founder price locked until this date (null = no lock)
  founder_set_by     uuid,
  founder_set_at     timestamptz,
  order_signed_by    text check (length(order_signed_by) <= 200),  -- name and title of who signed the order for the company
  order_signed_at    timestamptz,
  terms_version      text,
  stripe_customer_id     text unique,                          -- Phase 2 (webhook); empty in Phase 0/1
  stripe_subscription_id text unique,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table pb_billing.accounts enable row level security;

create table if not exists pb_billing.events (
  id              bigserial primary key,
  company_id      uuid references public.companies(id) on delete set null,
  user_id         uuid,
  kind            text not null,     -- make_paid, paid, state, plan_reading, setting, handover, individual_off, stripe:<type>
  detail          jsonb,
  stripe_event_id text unique,       -- Phase 2: webhook retries are ignored
  actor           uuid,
  at              timestamptz not null default now()
);
alter table pb_billing.events enable row level security;
create index if not exists events_company_at on pb_billing.events (company_id, at desc);

create or replace function pb_billing.seats_used(p_company uuid) returns integer
language sql stable security definer set search_path to '' as $$
  select (select count(*)::int from public.company_members m where m.company_id = p_company)
       + (select count(*)::int from pb_crew.invitations i where i.company_id = p_company and i.status = 'pending'
            and not pb_crew.invitation_expired(i.created_at)
            and not exists (select 1 from public.company_members m2 where m2.user_id = i.user_id and m2.company_id = p_company))
$$;

create or replace function pb_billing.state_of(a pb_billing.accounts) returns text
language sql stable set search_path to '' as $$
  select case when a.state = 'canceled' then 'canceled'
              when a.state = 'read_only' then 'read_only'
              when current_date >= a.paid_through + a.grace_days then 'read_only'
              when current_date >= a.paid_through then 'past_due'
              else 'active' end
$$;

create or replace function pb_billing.read_only(p_company uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from pb_billing.accounts a where a.company_id = p_company
                 and (pb_billing.state_of(a) = 'read_only'
                      or (a.state = 'canceled' and coalesce(a.cancel_at, now()) <= now())))
$$;

create or replace function pb_billing.writes_closed(p_company uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select pb_billing.beta_closed(p_company) or pb_billing.read_only(p_company)
$$;

create or replace function pb_billing.plan_reading_on(p_company uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.companies c where c.id = p_company and c.plan = 'paid' and c.status = 'active')
     and not pb_billing.read_only(p_company)
     and coalesce((select a.plan_reading from pb_billing.accounts a where a.company_id = p_company), true)
$$;

create or replace function pb_billing.period_after(p_start date, p_interval text) returns date
language sql immutable set search_path to '' as $$
  select (p_start + case when p_interval = 'year' then interval '1 year' else interval '1 month' end)::date
$$;

create or replace function pb_billing.amount_cents(a pb_billing.accounts, p_seats integer) returns integer
language sql immutable set search_path to '' as $$
  select ((a.base_cents + greatest(0, p_seats - a.base_seats) * a.seat_cents
           + case when a.plan_reading then coalesce(a.plan_reading_cents, 0) else 0 end)
          * case when a.billing_interval = 'year' then a.yearly_months else 1 end)::int
$$;

create or replace function pb_billing.months_left(p_from date, p_to date) returns integer
language sql immutable set search_path to '' as $$
  select case when p_to <= p_from then 0 else (extract(year from age(p_to, p_from)) * 12 + extract(month from age(p_to, p_from))
              + case when extract(day from age(p_to, p_from)) > 0 then 1 else 0 end)::int end
$$;

create or replace function pb_billing.account_json(a pb_billing.accounts) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
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
end $$;

create or replace function pb_billing.beta_closed_guard() returns trigger
language plpgsql security definer set search_path to '' as $function$
begin
  if new.company_id is not null and pb_billing.beta_closed(new.company_id) then raise exception 'pb:beta_ended'; end if;
  -- billing Phase 0: a paid company that is read-only (7 days past due, read-only, or canceled) is closed the same way.
  -- Same code on purpose: the app (r16.96) keeps only pb:beta_ended records waiting on the phone; any other code is a refusal.
  if new.company_id is not null and pb_billing.read_only(new.company_id) then raise exception 'pb:beta_ended'; end if;
  return new;
end $function$;

create or replace function public.pb_my_plan() returns jsonb
language sql stable security definer set search_path to '' as $function$
  select coalesce(
    (select jsonb_build_object('ok', true, 'plan', x.plan, 'trial_ends_at', x.trial_ends_at, 'expired', x.expired,
      'closed', pb_billing.writes_closed(x.company_id), 'individual', pb_billing.has_individual(auth.uid()),
      'paused', pb_billing.read_only(x.company_id),
      'requested', exists (select 1 from pb_billing.plan_requests r where r.user_id = auth.uid() and r.done_at is null),
      'days_left', case when x.plan = 'trial' then greatest(0, ceil(extract(epoch from (x.trial_ends_at - now())) / 86400))::int end,
      'limits', case when x.plan = 'trial' then pb_billing.trial_limits() end)
    from pb_billing.company_of(auth.uid()) x),
    -- no company now: removed from one, and not on their own plan yet
    (select jsonb_build_object('ok', true, 'plan', null, 'removed', jsonb_build_object('company', l.company_name, 'at', l.left_at),
        'individual', pb_billing.has_individual(auth.uid()),
        'requested', exists (select 1 from pb_billing.plan_requests r where r.user_id = auth.uid() and r.done_at is null))
     from pb_billing.left_company l where l.user_id = auth.uid() and l.dismissed_at is null and not pb_billing.has_individual(auth.uid())),
    jsonb_build_object('ok', true, 'plan', null))
$function$;

create or replace function public.pb_owner_company_set(p_company uuid, p_plan text, p_days integer default null::integer)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v public.companies;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  if p_plan not in ('paid', 'trial') then return jsonb_build_object('ok', false, 'code', 'pb:bad_plan'); end if;
  if p_plan = 'paid' then return jsonb_build_object('ok', false, 'code', 'pb:use_make_paid'); end if; -- billing Phase 0
  if exists (select 1 from pb_billing.accounts a where a.company_id = p_company) then return jsonb_build_object('ok', false, 'code', 'pb:has_billing'); end if; -- billing Phase 0
  update public.companies c set plan = p_plan,
      trial_ends_at = case when p_plan = 'paid' then null else greatest(coalesce(c.trial_ends_at, now()), now()) + make_interval(days => greatest(1, least(coalesce(p_days, 30), 365))) end,
      updated_at = now()
    where c.id = p_company returning * into v;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  perform pb_audit.admin_note('company_plan_set', p_company, null, jsonb_build_object('plan', p_plan, 'days', p_days)); -- r16.85
  if p_plan = 'paid' then
    update pb_plans.sets set state = 'reading' where company_id = p_company and state = 'parked';
    if found then perform pb_plans.kick(); end if;
  end if;
  return jsonb_build_object('ok', true, 'plan', v.plan, 'trial_ends_at', v.trial_ends_at);
end $function$;

create or replace function public.pb_owner_make_paid(
  p_company uuid, p_legal_name text, p_billing_email text, p_seats integer, p_interval text,
  p_founder boolean, p_plan_reading boolean, p_signed_by text,
  p_address jsonb default '{}'::jsonb, p_contact text default null, p_terms_version text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_co public.companies; v_used int; v_double jsonb; v_owner_email text; a pb_billing.accounts; v_months int;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  select * into v_co from public.companies c where c.id = p_company for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  if v_co.status <> 'active' then return jsonb_build_object('ok', false, 'code', 'pb:company_inactive'); end if;
  if exists (select 1 from pb_billing.accounts x where x.company_id = p_company and x.state <> 'canceled') then
    return jsonb_build_object('ok', false, 'code', 'pb:already_paid', 'message', 'This company already has a paid plan. Use Paid, Read-Only Now or Cancel Plan.');
  end if;
  if p_legal_name is null or length(btrim(p_legal_name)) not between 1 and 200 then return jsonb_build_object('ok', false, 'code', 'pb:bad_name', 'message', 'Type the company''s legal name.'); end if;
  if p_billing_email is null or btrim(p_billing_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(btrim(p_billing_email)) > 254 then return jsonb_build_object('ok', false, 'code', 'pb:bad_email', 'message', 'Type the billing email.'); end if;
  if p_signed_by is null or length(btrim(p_signed_by)) not between 2 and 200 then return jsonb_build_object('ok', false, 'code', 'pb:no_signer', 'message', 'Type the name of the person who signed the order.'); end if;
  if p_interval is null or p_interval not in ('month', 'year') then return jsonb_build_object('ok', false, 'code', 'pb:bad_interval'); end if;
  if p_address is not null and jsonb_typeof(p_address) <> 'object' then return jsonb_build_object('ok', false, 'code', 'pb:bad_address'); end if;
  v_used := pb_billing.seats_used(p_company);
  if p_seats is null then p_seats := v_used; end if;
  if p_seats < v_used or p_seats > 1000 then
    return jsonb_build_object('ok', false, 'code', 'pb:seats_low', 'seats_used', v_used,
      'message', 'The company has ' || v_used || ' people now (members and open invites). Bill at least that many.');
  end if;
  if coalesce(p_founder, false) and not (v_co.plan = 'trial' and v_co.trial_ends_at is not null and v_co.trial_ends_at > now()) then
    return jsonb_build_object('ok', false, 'code', 'pb:founder_late',
      'message', 'The founder price is only for a beta company that commits before its beta ends.');
  end if;
  v_months := pb_billing.setting_int('founder_months', 12);
  insert into pb_billing.accounts (company_id, legal_name, billing_email, billing_contact, billing_address, seller_legal_name,
      seats_paid, base_seats, base_cents, seat_cents, billing_interval, yearly_months, plan_reading, plan_reading_cents,
      state, period_start, paid_through, grace_days, founder_until, founder_set_by, founder_set_at, order_signed_by, order_signed_at,
      terms_version, created_by)
    values (p_company, btrim(p_legal_name), lower(btrim(p_billing_email)), nullif(btrim(coalesce(p_contact, '')), ''),
      coalesce(p_address, '{}'::jsonb), pb_billing.setting('seller_legal_name') #>> '{}',
      p_seats, pb_billing.setting_int('base_seats', 5), pb_billing.setting_int('base_cents', 9900), pb_billing.setting_int('seat_cents', 1200),
      p_interval, pb_billing.setting_int('yearly_months', 10), coalesce(p_plan_reading, false),
      case when p_plan_reading then pb_billing.setting_int('plan_reading_cents', null) end,
      'active', current_date, pb_billing.period_after(current_date, p_interval), greatest(0, least(pb_billing.setting_int('grace_days', 7), 30)),
      case when p_founder then (current_date + make_interval(months => v_months))::date end,
      case when p_founder then auth.uid() end, case when p_founder then now() end,
      btrim(p_signed_by), now(), p_terms_version, auth.uid())
    on conflict (company_id) do update set   -- only a canceled account gets here: a fresh start, never a founder lock
      legal_name = excluded.legal_name, billing_email = excluded.billing_email, billing_contact = excluded.billing_contact,
      billing_address = excluded.billing_address, seller_legal_name = excluded.seller_legal_name, seats_paid = excluded.seats_paid,
      base_seats = excluded.base_seats, base_cents = excluded.base_cents, seat_cents = excluded.seat_cents,
      billing_interval = excluded.billing_interval, yearly_months = excluded.yearly_months, plan_reading = excluded.plan_reading,
      plan_reading_cents = excluded.plan_reading_cents, state = 'active', period_start = excluded.period_start, paid_through = excluded.paid_through,
      grace_days = excluded.grace_days, cancel_at = null, founder_until = excluded.founder_until, founder_set_by = excluded.founder_set_by,
      founder_set_at = excluded.founder_set_at, order_signed_by = excluded.order_signed_by, order_signed_at = excluded.order_signed_at,
      terms_version = excluded.terms_version, updated_at = now()
    returning * into a;
  update public.companies set plan = 'paid', trial_ends_at = null, updated_at = now() where id = p_company;
  -- the company's plan requests are answered
  update pb_billing.plan_requests set done_at = now() where company_id = p_company and kind = 'company' and done_at is null;
  -- members still on their own individual plan: Tommy stops those (Individual Off) so nobody pays twice
  select coalesce(jsonb_agg(jsonb_build_object('user_id', s.user_id, 'email', u.email)), '[]'::jsonb) into v_double
    from public.subscriptions s join public.company_members m on m.user_id = s.user_id and m.company_id = p_company
    left join auth.users u on u.id = s.user_id
    where s.tier = 'individual' and s.status = 'active';
  select u.email into v_owner_email from auth.users u where u.id = v_co.owner_user_id;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'make_paid',
    jsonb_build_object('seats', p_seats, 'seats_used', v_used, 'base_cents', a.base_cents, 'seat_cents', a.seat_cents,
      'interval', p_interval, 'plan_reading', a.plan_reading, 'founder_until', a.founder_until, 'signed_by', a.order_signed_by,
      'was', v_co.plan, 'trial_ends_at', v_co.trial_ends_at), auth.uid());
  perform pb_audit.admin_note('company_make_paid', p_company, null, jsonb_build_object('seats', p_seats, 'interval', p_interval,
    'founder_until', a.founder_until, 'plan_reading', a.plan_reading));
  if a.plan_reading then
    update pb_plans.sets set state = 'reading' where company_id = p_company and state = 'parked';
    if found then perform pb_plans.kick(); end if;
  end if;
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a), 'owner_login', v_owner_email,
    'individual_plans_to_stop', v_double);
end $$;

create or replace function public.pb_owner_billing_state(p_company uuid, p_state text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare a pb_billing.accounts;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  if p_state is null or p_state not in ('active', 'read_only', 'canceled') then return jsonb_build_object('ok', false, 'code', 'pb:bad_state'); end if;
  update pb_billing.accounts x set state = p_state,
      cancel_at = case when p_state = 'canceled' then coalesce(x.cancel_at, greatest(now(), x.paid_through::timestamptz)) end,
      updated_at = now()
    where x.company_id = p_company returning * into a;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  insert into pb_billing.events (company_id, kind, detail, actor)
    values (p_company, 'state', jsonb_build_object('state', p_state, 'cancel_at', a.cancel_at, 'note', left(p_note, 300)), auth.uid());
  perform pb_audit.admin_note('company_billing_state', p_company, null, jsonb_build_object('state', p_state));
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a));
end $$;

create or replace function public.pb_owner_billing_paid(p_company uuid, p_from date, p_seats integer default null, p_amount_cents integer default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare a pb_billing.accounts; v_from date; v_to date; v_seats int; v_amount int; v_was text;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  select * into a from pb_billing.accounts x where x.company_id = p_company for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  if a.state = 'canceled' then return jsonb_build_object('ok', false, 'code', 'pb:canceled', 'message', 'This plan is canceled. Use Make Paid to start it again.'); end if;
  v_from := a.paid_through; v_was := pb_billing.state_of(a);
  if p_from is distinct from v_from then
    return jsonb_build_object('ok', false, 'code', 'pb:period_changed', 'message', 'That period was already marked paid. Refresh.', 'account', pb_billing.account_json(a));
  end if;
  v_to := pb_billing.period_after(v_from, a.billing_interval);
  v_seats := greatest(0, least(coalesce(p_seats, pb_billing.seats_used(p_company)), 1000));
  v_amount := pb_billing.amount_cents(a, v_seats);
  update pb_billing.accounts x set paid_through = v_to, seats_paid = v_seats, state = 'active', updated_at = now()
    where x.company_id = p_company returning * into a;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'paid',
    jsonb_build_object('from', v_from, 'to', v_to, 'seats', v_seats, 'amount_cents', v_amount, 'received_cents', p_amount_cents, 'was', v_was, 'note', left(p_note, 300)), auth.uid());
  perform pb_audit.admin_note('company_billing_paid', p_company, null, jsonb_build_object('from', v_from, 'to', v_to, 'amount_cents', v_amount));
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a));
end $$;

create or replace function public.pb_owner_billing_catchup_paid(p_company uuid, p_seats integer, p_amount_cents integer default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare a pb_billing.accounts; v_was int; v_used int;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  select * into a from pb_billing.accounts x where x.company_id = p_company for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  v_used := pb_billing.seats_used(p_company); v_was := a.seats_paid;
  if p_seats is null or p_seats <= greatest(a.seats_paid, a.base_seats) or p_seats > v_used then
    return jsonb_build_object('ok', false, 'code', 'pb:no_catchup', 'message', 'Nothing to catch up: the people now fit in the paid seats.', 'account', pb_billing.account_json(a));
  end if;
  update pb_billing.accounts x set seats_paid = p_seats, updated_at = now() where x.company_id = p_company returning * into a;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'catchup_paid',
    jsonb_build_object('seats_from', v_was, 'seats_to', p_seats, 'until', a.paid_through, 'received_cents', p_amount_cents, 'note', left(p_note, 300)), auth.uid());
  perform pb_audit.admin_note('company_billing_catchup', p_company, null, jsonb_build_object('seats_from', v_was, 'seats_to', p_seats));
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a));
end $$;

create or replace function pb_billing.alert_text() returns text
language sql stable security definer set search_path to '' as $$
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
$$;

create or replace function public.pb_owner_billing() returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare v_cos jsonb;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'plan', c.plan, 'trial_ends_at', c.trial_ends_at,
      'owner_user_id', c.owner_user_id, 'owner_login', (select u.email::text from auth.users u where u.id = c.owner_user_id),
      'seats_used', pb_billing.seats_used(c.id),
      'members', (select count(*) from public.company_members m where m.company_id = c.id),
      'founder_ok', c.plan = 'trial' and c.trial_ends_at is not null and c.trial_ends_at > now(),
      'people', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email::text, 'role', m.role, 'title', m.title) order by u.email)
                 from public.company_members m left join auth.users u on u.id = m.user_id where m.company_id = c.id), '[]'::jsonb),
      'account', (select pb_billing.account_json(a) from pb_billing.accounts a where a.company_id = c.id)) order by c.name), '[]'::jsonb)
    into v_cos from public.companies c where c.status = 'active';
  return jsonb_build_object('ok', true,
    'settings', (select jsonb_object_agg(s.key, s.value) from pb_billing.settings s),
    'companies', v_cos,
    'due', coalesce((select jsonb_agg(jsonb_build_object('company_id', x->>'id', 'name', x->>'name') || (x->'account'->'next')
                       || jsonb_build_object('legal_name', x->'account'->>'legal_name', 'billing_email', x->'account'->>'billing_email',
                            'interval', x->'account'->>'interval', 'state', x->'account'->>'state', 'tax_state', x->'account'->>'tax_state',
                            'plan_reading_price_missing', x->'account'->'plan_reading_price_missing',
                            'lock_on', x->'account'->'lock_on', 'days_to_lock', x->'account'->'days_to_lock',
                            'paid_through', x->'account'->'paid_through', 'seats_paid', x->'account'->'seats_paid',
                            'extra', x->'account'->'extra', 'catchup', x->'account'->'catchup')
                       order by (x->'account'->>'state') = 'active', x->'account'->'next'->>'from')
                     from jsonb_array_elements(v_cos) x where x->'account' is not null and (x->'account'->'next'->>'due')::boolean), '[]'::jsonb));
end $$;

create or replace function public.pb_owner_billing_setting_set(p_key text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_ok boolean;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  v_ok := case p_key
    when 'seller_legal_name' then p_value is null or jsonb_typeof(p_value) = 'null' or (jsonb_typeof(p_value) = 'string' and length(btrim(p_value #>> '{}')) between 2 and 200)
    when 'plan_reading_cents' then p_value is null or jsonb_typeof(p_value) = 'null' or (jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 10000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric))
    when 'base_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 10000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'seat_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 1000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'base_seats' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 1 and 100 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'yearly_months' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 1 and 12 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'grace_days' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 30 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'founder_months' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 1 and 36 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'invoice_ahead_days' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 31 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    else null end;
  if v_ok is null then return jsonb_build_object('ok', false, 'code', 'pb:bad_key'); end if;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'pb:bad_value'); end if;
  update pb_billing.settings set value = coalesce(case when jsonb_typeof(p_value) = 'string' then to_jsonb(btrim(p_value #>> '{}')) else p_value end, 'null'::jsonb),
      updated_at = now(), updated_by = auth.uid() where key = p_key;
  insert into pb_billing.events (kind, detail, actor) values ('setting', jsonb_build_object('key', p_key, 'value', p_value), auth.uid());
  perform pb_audit.admin_note('billing_setting', null, null, jsonb_build_object('key', p_key, 'value', p_value));
  return jsonb_build_object('ok', true, 'settings', (select jsonb_object_agg(s.key, s.value) from pb_billing.settings s));
end $$;

create or replace function public.pb_owner_individual_off(p_user uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  update public.subscriptions set status = 'canceled', updated_at = now() where user_id = p_user and tier = 'individual' and status = 'active';
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  insert into pb_billing.events (user_id, kind, detail, actor) values (p_user, 'individual_off', jsonb_build_object('reason', left(p_reason, 300)), auth.uid());
  perform pb_audit.admin_note('individual_plan_off', null, p_user, jsonb_build_object('reason', left(p_reason, 300)));
  return jsonb_build_object('ok', true);
end $$;



  -- ----- 04_ai_readonly.sql

create or replace function public.ai_try_consume(p_user uuid, p_feature text, p_limit integer)
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
end $function$
;

create or replace function pb_billing.individual_only(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pb_billing.has_individual(p_user) and not exists (select 1 from pb_billing.company_of(p_user) x where not x.expired and not pb_billing.read_only(x.company_id)) -- billing Phase 0
$function$
;

create or replace function public.ai_has_paid_plan(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* pb_sec S12 owner; Nov 16: an ended trial has no AI */
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active')
      or exists (select 1 from pb_billing.company_of(p_user) x where not x.expired and not pb_billing.read_only(x.company_id)); -- billing Phase 0: a read-only paid company has no company AI
$function$
;


  -- ----- 05_billing_alert_in_check.sql

create or replace function public.pb_backup_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r pb_backup.runs%rowtype;
begin
  perform pb_crew.require_service();
  select * into r from pb_backup.runs b order by b.id desc limit 1;
  -- billing Phase 0: companies past due / just locked ride along in the operator's 10:00 UTC check (pb-backup unchanged)
  return jsonb_build_object('problem', nullif(concat_ws(' | ', pb_backup.health(now()), pb_billing.alert_text()), ''),
    'alert', pb_backup.check_due(now()) or pb_billing.alert_text() is not null,
    'pass_errors_24h', (select count(*) from pb_prod.pass_errors e where e.at > now() - interval '24 hours'),
    'last_run', case when r.id is null then null else jsonb_build_object('id', r.id, 'started_at', r.started_at, 'finished_at', r.finished_at,
      'status', r.status, 'files', r.files, 'bytes', r.bytes, 'error', r.error, 'alerted', r.alerted_at is not null) end);
end $function$
;

create or replace function pb_backup.check_kick()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- feat_server: the 10:00 UTC check. Calls pb-backup?check=1 (which emails the operator) only when something is wrong
-- and nobody was told yet. Its cron job is made by 61_after_pb_backup_v5.sql, AFTER pb-backup v5 is deployed (v4 would
-- read the call as a full backup and email the owners).
declare v_secret text;
begin
  if not (pb_backup.check_due(now()) or pb_billing.alert_text() is not null) then return; end if; -- billing Phase 0: or a company is past due / just locked
  begin
    execute 'select ds.decrypted_secret from vault.decrypted_secrets ds where ds.name = ''push_cron_secret'' limit 1' into v_secret;
    if v_secret is null or length(v_secret) < 16 then return; end if;
    execute 'select net.http_post(url := $1, body := ''{"check": true}''::jsonb, headers := $2, timeout_milliseconds := 30000)'
      using 'https://rogfassochneycezecxa.supabase.co/functions/v1/pb-backup?check=1',
            jsonb_build_object('Content-Type', 'application/json', 'x-pb-push-secret', v_secret);
  exception when others then
    raise log 'pb_backup.check_kick: call not made'; perform pb_prod.note_error('pb_backup.check_kick: call not made', sqlstate, sqlerrm);
  end;
end $function$
;

  perform pg_temp.act(M1); r := public.pb_my_plan();
  if (r - 'paused') <> before_plan or (r->>'paused')::boolean then raise exception 'FAIL 0a beta my_plan changed % vs %', r, before_plan; end if;
  if pg_temp.w(B, XU2) <> 'pb:beta_ended' then raise exception 'FAIL 0 ended beta writes'; end if;
  perform pg_temp.act(S);
  if pg_temp.err(format('select public.pb_owner_make_paid(%L, %L, %L, null, %L, false, false, %L)', C, 'Acme', 'ap@acme.test', 'month', 'J Smith')) <> 'pb:not_allowed' then raise exception 'FAIL 1 non-admin'; end if;
  perform pg_temp.act(A);
  r := public.pb_owner_company_set(C, 'paid', null);
  if r->>'code' <> 'pb:use_make_paid' or (select plan from public.companies where id = C) <> 'trial' then raise exception 'FAIL 2 company_set paid %', r; end if;
  r := public.pb_owner_company_set(D, 'trial', 30);
  if not (r->>'ok')::boolean or (r->>'trial_ends_at')::timestamptz < now() + interval '32 days' then raise exception 'FAIL 2b add 30 days %', r; end if;
  r := public.pb_owner_make_paid(C, 'Acme Pipeline Inc', 'ap@acme.test', 5, 'month', true, false, 'Jane Smith, President');
  if r->>'code' <> 'pb:seats_low' or (r->>'seats_used')::int <> 6 then raise exception 'FAIL 3 seats_low %', r; end if;
  r := public.pb_owner_make_paid(C, ' Acme Pipeline Inc ', 'AP@Acme.test', null, 'month', true, false, 'Jane Smith, President', '{"state":"CA","postal_code":"92223"}');
  if not (r->>'ok')::boolean then raise exception 'FAIL 4 make paid %', r; end if;
  if (r->'account'->'next'->>'amount_cents')::int <> 11100 or (r->'account'->'next'->>'seats')::int <> 6 or (r->'account'->>'founder_until')::date <> (current_date + interval '12 months')::date
     or r->'account'->>'billing_email' <> 'ap@acme.test' or r->'account'->>'legal_name' <> 'Acme Pipeline Inc'
     or jsonb_array_length(r->'individual_plans_to_stop') <> 1 or r->'individual_plans_to_stop'->0->>'user_id' <> M2::text
     or r->>'owner_login' <> 'b0t-' || S || '@test.invalid' or (r->'account'->>'seller_legal_name') is not null then raise exception 'FAIL 4b %', r; end if;
  if (select founder_set_by from pb_billing.accounts where company_id = C) <> A then raise exception 'FAIL 4c founder who'; end if;
  if (select plan || '/' || status || '/' || coalesce(trial_ends_at::text, '-') from public.companies where id = C) <> 'paid/active/-' then raise exception 'FAIL 4d company row'; end if;
  if exists (select 1 from pb_billing.plan_requests where company_id = C and done_at is null) then raise exception 'FAIL 4e request open'; end if;
  res := res || jsonb_build_object('make_paid', r->'account'->'next', 'founder_until', r->'account'->'founder_until');
  r := public.pb_owner_make_paid(C, 'Acme', 'ap@acme.test', null, 'month', false, false, 'Jane Smith');
  if r->>'code' <> 'pb:already_paid' then raise exception 'FAIL 5 twice %', r; end if;
  r := public.pb_owner_make_paid(B, 'Ended Co LLC', 'pay@ended.test', null, 'year', true, false, 'Bob Lee, Owner');
  if r->>'code' <> 'pb:founder_late' then raise exception 'FAIL 6 founder after the beta ended %', r; end if;
  r := public.pb_owner_make_paid(B, 'Ended Co LLC', 'pay@ended.test', null, 'year', false, false, 'Bob Lee, Owner');
  if not (r->>'ok')::boolean or (r->'account'->'next'->>'amount_cents')::int <> 99000 or (r->'account'->>'paid_through')::date <> (current_date + interval '1 year')::date
     or (r->'account'->>'founder_until') is not null then raise exception 'FAIL 6b yearly %', r; end if;
  if pg_temp.w(B, XU2) <> 'no error' then raise exception 'FAIL 6c ended beta writes again once paid'; end if;
  if (select paid_through from pb_billing.accounts where company_id = C) <> (current_date + interval '1 month')::date then raise exception 'FAIL 7 paid_through'; end if;
  r := public.pb_owner_billing();
  if exists (select 1 from jsonb_array_elements(r->'due') x where x->>'company_id' in (C::text, B::text)) then raise exception 'FAIL 7a due too early %', r->'due'; end if;
  if (select (x->>'founder_ok')::boolean from jsonb_array_elements(r->'companies') x where x->>'id' = D::text) is not true
     or (r->'settings'->>'base_cents')::int <> 9900 or r->'settings'->'seller_legal_name' <> 'null'::jsonb then raise exception 'FAIL 7b billing %', r; end if;
  update pb_billing.accounts set paid_through = current_date + 3 where company_id = C;
  r := public.pb_owner_billing();
  if (select (x->>'amount_cents')::int from jsonb_array_elements(r->'due') x where x->>'company_id' = C::text) is distinct from 11100
     or (select x->>'state' from jsonb_array_elements(r->'due') x where x->>'company_id' = C::text) <> 'active'
     or (select x->>'tax_state' from jsonb_array_elements(r->'due') x where x->>'company_id' = C::text) <> 'CA' then raise exception 'FAIL 7c due 3 days ahead %', r->'due'; end if;
  if pg_temp.w(C, M1) <> 'no error' then raise exception 'FAIL 8 paid writes'; end if;
  update pb_billing.accounts set paid_through = current_date - 1 where company_id = C;
  r := public.pb_owner_billing(); select x into r2 from jsonb_array_elements(r->'due') x where x->>'company_id' = C::text;
  if r2->>'state' <> 'past_due' or (r2->>'days_to_lock')::int <> 6 or (r2->>'lock_on')::date <> current_date + 6 then raise exception 'FAIL 9 auto past due %', r2; end if;
  if pg_temp.w(C, M1) <> 'no error' then raise exception 'FAIL 9c grace writes'; end if;
  if (select status from public.companies where id = C) <> 'active' then raise exception 'FAIL 9d status changed'; end if;
  if public.ai_try_consume(M1, 'stake', 10) < 0 or not public.ai_has_paid_plan(M1) then raise exception 'FAIL 9e AI stopped during grace'; end if;
  if pb_billing.alert_text() not like '%Acme Pipeline Inc is past due since % and locks (read-only) on % (6 days left)%' then raise exception 'FAIL 9f alert %', pb_billing.alert_text(); end if;
  res := res || jsonb_build_object('past_due_row', r2 - 'billing_email' - 'company_id', 'alert_text', pb_billing.alert_text());
  update pb_billing.accounts set paid_through = current_date - 7 where company_id = C;
  if pg_temp.w(C, M1) <> 'pb:beta_ended' then raise exception 'FAIL 10 read-only after grace'; end if;
  if (select company_id from pb_billing.company_of(M1)) is distinct from C then raise exception 'FAIL 10b member lost company'; end if;
  perform pg_temp.act(M1); r := public.pb_my_plan(); perform pg_temp.act(A);
  if r->>'plan' <> 'paid' or not (r->>'closed')::boolean or not (r->>'paused')::boolean then raise exception 'FAIL 10c my_plan %', r; end if;
  if public.ai_try_consume(M1, 'stake', 10) <> -1 or public.ai_try_consume(S, 'teacher', 10) <> -1 or public.ai_has_paid_plan(M1) then raise exception 'FAIL 10d AI not stopped'; end if;
  if public.ai_try_consume(M2, 'stake', 10) < 0 or not public.ai_has_paid_plan(M2) or not pb_billing.individual_only(M2) then raise exception 'FAIL 10e individual plan stopped too'; end if;
  res := res || jsonb_build_object('my_plan_paused', r, 'ai_member_read_only', public.ai_try_consume(M1, 'stake', 10));
  r := public.pb_owner_billing_paid(C, current_date);
  if r->>'code' <> 'pb:period_changed' then raise exception 'FAIL 11 stale %', r; end if;
  r := public.pb_owner_billing_paid(C, current_date - 7, null, 11100);
  if not (r->>'ok')::boolean or r->'account'->>'state' <> 'active' or (r->'account'->>'paid_through')::date <> (current_date - 7 + interval '1 month')::date
     or (r->'account'->>'seats_paid')::int <> 6 then raise exception 'FAIL 11b paid %', r; end if;
  if (public.pb_owner_billing_paid(C, current_date - 7))->>'code' <> 'pb:period_changed' then raise exception 'FAIL 11c double paid'; end if;
  if pg_temp.w(C, M1) <> 'no error' or public.ai_try_consume(M1, 'stake', 10) < 0 then raise exception 'FAIL 11d writes/AI after paid'; end if;
  if pb_billing.alert_text() is not null then raise exception 'FAIL 11e alert after paid'; end if;
  insert into public.company_members (company_id, user_id, role) values (C, M5, 'pipelayer');
  r := public.pb_owner_billing(); select x into r2 from jsonb_array_elements(r->'companies') x where x->>'id' = C::text;
  if (r2->'account'->'next'->>'seats')::int <> 7 or (r2->'account'->'next'->>'amount_cents')::int <> 12300 or (r2->'account'->>'extra')::int <> 1
     or (r2->'account'->'catchup'->>'monthly_next_invoice')::int <> 1 or (r2->'account'->'catchup'->>'cents')::int <> 0 then raise exception 'FAIL 12 monthly extra %', r2; end if;
  delete from public.company_members where company_id = C and user_id = M3;
  r := public.pb_owner_billing(); select x into r2 from jsonb_array_elements(r->'companies') x where x->>'id' = C::text;
  if (r2->'account'->>'extra')::int <> 0 or (r2->'account'->'next'->>'seats')::int <> 6 then raise exception 'FAIL 12b removal frees the seat %', r2; end if;
  insert into auth.users (id, email) select u, 'b0y-' || u || '@test.invalid' from unnest(array[SET1, SET2]) u;
  insert into public.company_members (company_id, user_id, role) select B, u, 'pipelayer' from unnest(array[XU, SET1, SET2]) u;
  insert into pb_crew.invitations (company_id, user_id, role, invited_by, status) values (B, I1, 'pipelayer', XU2, 'pending');
  insert into public.company_members (company_id, user_id, role) values (B, M3, 'pipelayer');
  update public.company_members set company_id = B where user_id = M4;
  r := public.pb_owner_billing(); select x into r2 from jsonb_array_elements(r->'companies') x where x->>'id' = B::text;
  if (r2->'account'->>'seats_used')::int <> 6 or (r2->'account'->'catchup'->>'people')::int <> 1 or (r2->'account'->'catchup'->>'months')::int <> 12
     or (r2->'account'->'catchup'->>'cents')::int <> 14400 or not (r2->'account'->'next'->>'due')::boolean then raise exception 'FAIL 12c yearly catch-up %', r2->'account'; end if;
  if not exists (select 1 from jsonb_array_elements(r->'due') x where x->>'company_id' = B::text and (x->'catchup'->>'cents')::int = 14400) then raise exception 'FAIL 12d catch-up not in Billing due'; end if;
  res := res || jsonb_build_object('yearly_catchup', r2->'account'->'catchup');
  if (public.pb_owner_billing_catchup_paid(B, 5))->>'code' <> 'pb:no_catchup' then raise exception 'FAIL 12e catch-up within capacity'; end if;
  r := public.pb_owner_billing_catchup_paid(B, 6, 14400);
  if not (r->>'ok')::boolean or (r->'account'->>'seats_paid')::int <> 6 or (r->'account'->'catchup'->>'cents')::int <> 0 then raise exception 'FAIL 12f catch-up paid %', r; end if;
  delete from public.company_members where company_id = B and user_id = M3;   -- frees a paid seat
  insert into public.company_members (company_id, user_id, role) values (B, M3, 'pipelayer');   -- refilled: costs nothing
  r := public.pb_owner_billing(); select x into r2 from jsonb_array_elements(r->'companies') x where x->>'id' = B::text;
  if (r2->'account'->'catchup'->>'cents')::int <> 0 or (r2->'account'->>'extra')::int <> 0 then raise exception 'FAIL 12g free seat refilled %', r2->'account'; end if;
  r := public.pb_owner_billing_state(C, 'read_only');
  if pg_temp.w(C, M1) <> 'pb:beta_ended' or not (r->'account'->>'read_only')::boolean then raise exception 'FAIL 13 read-only'; end if;
  if (public.pb_owner_billing_state(C, 'past_due'))->>'code' <> 'pb:bad_state' then raise exception 'FAIL 13a past due is not set by hand'; end if;
  r := public.pb_owner_billing_state(C, 'active');
  if pg_temp.w(C, M1) <> 'no error' then raise exception 'FAIL 13b active again'; end if;
  r := public.pb_owner_billing_state(C, 'canceled', 'owner emailed');
  if (r->'account'->>'cancel_at')::timestamptz::date <> (current_date - 7 + interval '1 month')::date or (r->'account'->>'read_only')::boolean then raise exception 'FAIL 14 cancel %', r; end if;
  if pg_temp.w(C, M1) <> 'no error' then raise exception 'FAIL 14b paid period still open'; end if;
  update pb_billing.accounts set cancel_at = now() - interval '1 minute' where company_id = C;
  if pg_temp.w(C, M1) <> 'pb:beta_ended' then raise exception 'FAIL 14c canceled closes'; end if;
  r := public.pb_owner_billing();
  if exists (select 1 from jsonb_array_elements(r->'due') x where x->>'company_id' = C::text) then raise exception 'FAIL 14d canceled still due'; end if;
  if (public.pb_owner_billing_paid(C, current_date + 30))->>'code' <> 'pb:canceled' then raise exception 'FAIL 14e paid on canceled'; end if;
  if (select status from public.companies where id = C) <> 'active' then raise exception 'FAIL 14f status'; end if;
  update pb_billing.accounts set paid_through = current_date - 2 where company_id = B;
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  r := public.pb_backup_health();
  perform pg_temp.act(A);
  if coalesce(r->>'problem', '') not like '%billing, not the backup%Ended Co LLC is past due since % (5 days left)%' or not (r->>'alert')::boolean then raise exception 'FAIL 14g operator check %', r; end if;
  res := res || jsonb_build_object('operator_check_problem', r->>'problem', 'operator_check_alert', r->'alert');
  update pb_billing.accounts set paid_through = (current_date + interval '1 year')::date where company_id = B;
  if (public.pb_owner_billing_setting_set('nope', '1'))->>'code' <> 'pb:bad_key' or (public.pb_owner_billing_setting_set('base_cents', '-1'))->>'code' <> 'pb:bad_value'
     or (public.pb_owner_billing_setting_set('grace_days', '1.5'))->>'code' <> 'pb:bad_value' then raise exception 'FAIL 15 setting checks'; end if;
  r := public.pb_owner_billing_setting_set('seller_legal_name', '"Test Seller LLC"');
  if r->'settings'->>'seller_legal_name' <> 'Test Seller LLC' then raise exception 'FAIL 15b %', r; end if;
  r := public.pb_owner_billing_setting_set('plan_reading_cents', '4900');
  if (r->'settings'->>'plan_reading_cents')::int <> 4900 then raise exception 'FAIL 15c'; end if;
  perform pg_temp.act(S);
  if pg_temp.err('select public.pb_owner_billing_setting_set(''base_cents'', ''1'')') <> 'pb:not_allowed' or pg_temp.err('select public.pb_owner_billing()') <> 'pb:not_allowed'
     or pg_temp.err(format('select public.pb_owner_billing_state(%L, %L)', C, 'active')) <> 'pb:not_allowed'
     or pg_temp.err(format('select public.pb_owner_billing_paid(%L, %L)', C, current_date)) <> 'pb:not_allowed'
     or pg_temp.err(format('select public.pb_owner_individual_off(%L)', M2)) <> 'pb:not_allowed' then raise exception 'FAIL 15d non-admin'; end if;
  perform pg_temp.act(A);
  r := public.pb_owner_individual_off(M2, 'company paid');
  if not (r->>'ok')::boolean or (select status from public.subscriptions where user_id = M2) <> 'canceled' then raise exception 'FAIL 16 individual off'; end if;
  if pb_billing.read_only(DIG) or pb_billing.writes_closed(DIG) or not pb_billing.plan_reading_on(DIG) or pb_billing.plan_reading_on(D) then raise exception 'FAIL 17 legacy/beta flags'; end if;
  perform pg_temp.act((select owner_user_id from public.companies where id = DIG)); r := public.pb_my_plan();
  if (r - 'paused') <> before_dig or (r->>'paused')::boolean then raise exception 'FAIL 17b my_plan legacy % vs %', r, before_dig; end if;
  perform pg_temp.act((select user_id from public.company_members where company_id = DIG limit 1)); r := public.pb_my_plan();
  if (r - 'paused') <> before_dig_m then raise exception 'FAIL 17c my_plan legacy member'; end if;
  res := res || jsonb_build_object('legacy_my_plan_same', true);
  res := res || jsonb_build_object('events', (select count(*) from pb_billing.events where company_id in (C, B)), 'audit', (select count(*) from pb_audit.admin_log where company_id in (C, B)));
  res := res || jsonb_build_object('defs', (select jsonb_object_agg(p.proname, md5(rtrim(pg_get_functiondef(p.oid), E'\n'))) from pg_proc p join pg_namespace n2 on n2.oid = p.pronamespace where (n2.nspname, p.proname) in (('pb_billing','beta_closed_guard'),('public','pb_my_plan'),('public','pb_owner_company_set'),('public','pb_plans_uploaded'),('public','pb_plans_svc_take'),('public','pb_plans_svc_more'),('public','ai_try_consume'),('pb_billing','individual_only'),('public','ai_has_paid_plan'),('public','pb_backup_health'),('pb_backup','check_kick'))));
  raise exception 'RESULT: %', res;
end $T$;
