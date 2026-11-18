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
-- Billing Phase 0 (hand-sent invoices). NOT APPLIED. Review, then apply as one migration (01, 02, 03 in order).
-- Built Nov 17 2026 against live rogfassochneycezecxa / app r16.96, from plan/billing/PLAN.md and the owner's decisions:
--   hand invoices (no Stripe API), seller not formed yet (setting, never hard-coded), monthly or yearly (yearly = 10 months),
--   $99 incl. 5 people + $12 each extra, company login free / every other login counts / open invites count,
--   added people billed from the next invoice / no credit for removals, founder lock (12 months at $99 + $12) only for a beta
--   company that commits BEFORE its beta ends, no AI add-on, plan reading add-on only for PAID companies (price = setting),
--   individual plans by hand only, 7 days' grace then read-only through the beta's existing lock, no card surcharge.
--
-- Additive: new tables pb_billing.settings / accounts / events and new functions. Changed existing functions (each diffed
-- against its live definition in sql/diffs/, proven equivalent for every company without a billing row):
--   pb_billing.beta_closed_guard   also refuses (same code) when a PAID account is read-only
--   public.pb_my_plan              'closed' = beta closed OR paid read-only; new key 'paused'
--   public.pb_owner_company_set    refuses 'paid' (only pb_owner_make_paid makes a company paid, so the deal is always recorded)
--
-- Billing state lives here, NEVER in companies.status: pb_billing.company_of() only returns status = 'active', so a
-- 'past_due' status would make every member company-less at once.

-- ---------------------------------------------------------------------------------------------------------------------
-- Settings (prices, grace, the seller's name). One row per key. Prices are copied onto an account at Make Paid, so a
-- later change here never changes what an existing customer pays (Terms 7.4 notice is a manual step).
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
  ('grace_days',         '7'::jsonb,    'Days after Past Due before the company goes read-only.'),
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

-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists pb_billing.accounts (
  company_id         uuid primary key references public.companies(id) on delete restrict,
  legal_name         text not null check (length(btrim(legal_name)) between 1 and 200),
  billing_email      text not null check (billing_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(billing_email) <= 254),
  billing_contact    text check (length(billing_contact) <= 200),
  billing_address    jsonb not null default '{}'::jsonb,      -- {line1, city, state, postal_code, country}; sales tax follows it
  tax_status         text not null default 'taxable' check (tax_status in ('taxable', 'exempt')),
  seller_legal_name  text,                                     -- the seller at Make Paid (setting), null while not formed
  seats_paid         integer not null check (seats_paid between 0 and 1000),   -- people on the last invoice
  base_seats         integer not null check (base_seats between 1 and 100),
  base_cents         integer not null check (base_cents between 0 and 10000000),
  seat_cents         integer not null check (seat_cents between 0 and 1000000),
  billing_interval   text not null default 'month' check (billing_interval in ('month', 'year')),
  yearly_months      integer not null default 10 check (yearly_months between 1 and 12),
  collection         text not null default 'invoice' check (collection in ('invoice', 'card_auto')),
  plan_reading       boolean not null default false,           -- the add-on; off = plan sets stay parked, as in the beta
  plan_reading_cents integer check (plan_reading_cents between 0 and 10000000),  -- null = price not set yet
  state              text not null default 'active' check (state in ('active', 'past_due', 'read_only', 'canceled')),
  period_start       date not null,                            -- first day of the first billed period (the anchor)
  paid_through       date,                                     -- end (exclusive) of the last period marked paid; null = first invoice unpaid
  grace_until        timestamptz,
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

-- ---------------------------------------------------------------------------------------------------------------------
-- People billed: every member login (foremen, pipelayers, PMs, superintendents, managers) plus open, unexpired invitations.
-- The company login (companies.owner_user_id) is free: an owner has no company_members row.
create or replace function pb_billing.seats_used(p_company uuid) returns integer
language sql stable security definer set search_path to '' as $$
  select (select count(*)::int from public.company_members m where m.company_id = p_company)
       + (select count(*)::int from pb_crew.invitations i where i.company_id = p_company and i.status = 'pending'
            and not pb_crew.invitation_expired(i.created_at)
            and not exists (select 1 from public.company_members m2 where m2.user_id = i.user_id and m2.company_id = p_company))
$$;

-- Read-only = the lock the ended beta uses: new company records refused with pb:beta_ended, phones keep them queued, nothing
-- deleted. No billing row (a beta, or the one legacy paid company) = never read-only here.
create or replace function pb_billing.read_only(p_company uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from pb_billing.accounts a where a.company_id = p_company
                 and (a.state = 'read_only'
                      or (a.state = 'past_due' and a.grace_until is not null and a.grace_until <= now())
                      or (a.state = 'canceled' and coalesce(a.cancel_at, now()) <= now())))
$$;

create or replace function pb_billing.writes_closed(p_company uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select pb_billing.beta_closed(p_company) or pb_billing.read_only(p_company)
$$;

-- Plan reading runs only for an active PAID company that bought the add-on and is not read-only. A paid company with no
-- billing row (only the legacy DIG Civil company today: it was made paid before billing existed) keeps reading, as now.
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

-- One period's invoice for an account at a seat count, in cents (monthly price x yearly_months for a yearly invoice).
create or replace function pb_billing.amount_cents(a pb_billing.accounts, p_seats integer) returns integer
language sql immutable set search_path to '' as $$
  select ((a.base_cents + greatest(0, p_seats - a.base_seats) * a.seat_cents
           + case when a.plan_reading then coalesce(a.plan_reading_cents, 0) else 0 end)
          * case when a.billing_interval = 'year' then a.yearly_months else 1 end)::int
$$;

-- What an account shows on the owner's screen, including the next invoice: the period after paid_through (or the first
-- period), people counted NOW (added people are billed from the next invoice; removals give no credit for a paid period).
create or replace function pb_billing.account_json(a pb_billing.accounts) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare v_used int := pb_billing.seats_used(a.company_id); v_from date := coalesce(a.paid_through, a.period_start);
  v_to date := pb_billing.period_after(coalesce(a.paid_through, a.period_start), a.billing_interval);
  v_bill int := case when a.paid_through is null then greatest(a.seats_paid, pb_billing.seats_used(a.company_id)) else pb_billing.seats_used(a.company_id) end;
begin
  return jsonb_build_object('legal_name', a.legal_name, 'billing_email', a.billing_email, 'billing_contact', a.billing_contact,
    'billing_address', a.billing_address, 'tax_state', a.billing_address->>'state', 'seller_legal_name', a.seller_legal_name,
    'state', a.state, 'read_only', pb_billing.read_only(a.company_id), 'grace_until', a.grace_until, 'cancel_at', a.cancel_at,
    'interval', a.billing_interval, 'yearly_months', a.yearly_months, 'base_cents', a.base_cents, 'base_seats', a.base_seats,
    'seat_cents', a.seat_cents, 'plan_reading', a.plan_reading, 'plan_reading_cents', a.plan_reading_cents,
    'plan_reading_price_missing', a.plan_reading and a.plan_reading_cents is null,
    'founder_until', a.founder_until, 'founder_set_at', a.founder_set_at,
    'founder_set_by', (select u.email::text from auth.users u where u.id = a.founder_set_by),
    'order_signed_by', a.order_signed_by, 'order_signed_at', a.order_signed_at,
    'period_start', a.period_start, 'paid_through', a.paid_through, 'seats_paid', a.seats_paid, 'seats_used', v_used,
    'next', jsonb_build_object('from', v_from, 'to', v_to, 'seats', v_bill, 'amount_cents', pb_billing.amount_cents(a, v_bill),
      'founder', a.founder_until is not null and v_from < a.founder_until,
      'due', a.state <> 'canceled' and v_from <= current_date + pb_billing.setting_int('invoice_ahead_days', 7)));
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- CHANGED (diff: sql/diffs/beta_closed_guard.diff). The trigger on the six company record tables.
create or replace function pb_billing.beta_closed_guard() returns trigger
language plpgsql security definer set search_path to '' as $function$
begin
  if new.company_id is not null and pb_billing.beta_closed(new.company_id) then raise exception 'pb:beta_ended'; end if;
  -- billing Phase 0: a paid company that is read-only (7 days past due, read-only, or canceled) is closed the same way.
  -- Same code on purpose: the app (r16.96) keeps only pb:beta_ended records waiting on the phone; any other code is a refusal.
  if new.company_id is not null and pb_billing.read_only(new.company_id) then raise exception 'pb:beta_ended'; end if;
  return new;
end $function$;

-- CHANGED (diff: sql/diffs/pb_my_plan.diff). 'closed' also true for a read-only paid company; new 'paused' (paid and read-only).
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

-- CHANGED (diff: sql/diffs/pb_owner_company_set.diff). 'paid' is refused: a company becomes paid only through
-- pb_owner_make_paid, which records the deal and keeps plan sets parked unless the add-on is on. 'trial' (Add 30 Days) is
-- unchanged except that it refuses a company with a billing account (it would turn a paying company back into a beta).
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

-- ---------------------------------------------------------------------------------------------------------------------
-- Make Paid v2: the deal Tommy agreed with the company (signed order form). Prices come from the settings, never the phone.
-- Founder lock: only when the company is still in its beta (plan 'trial' and trial_ends_at in the future) at this moment.
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
    return jsonb_build_object('ok', false, 'code', 'pb:already_paid', 'message', 'This company already has a paid plan. Use Paid, Past Due, Read-Only or Cancel.');
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
      state, period_start, paid_through, founder_until, founder_set_by, founder_set_at, order_signed_by, order_signed_at,
      terms_version, created_by)
    values (p_company, btrim(p_legal_name), lower(btrim(p_billing_email)), nullif(btrim(coalesce(p_contact, '')), ''),
      coalesce(p_address, '{}'::jsonb), pb_billing.setting('seller_legal_name') #>> '{}',
      p_seats, pb_billing.setting_int('base_seats', 5), pb_billing.setting_int('base_cents', 9900), pb_billing.setting_int('seat_cents', 1200),
      p_interval, pb_billing.setting_int('yearly_months', 10), coalesce(p_plan_reading, false),
      case when p_plan_reading then pb_billing.setting_int('plan_reading_cents', null) end,
      'active', current_date, null,
      case when p_founder then (current_date + make_interval(months => v_months))::date end,
      case when p_founder then auth.uid() end, case when p_founder then now() end,
      btrim(p_signed_by), now(), p_terms_version, auth.uid())
    on conflict (company_id) do update set   -- only a canceled account gets here: a fresh start, never a founder lock
      legal_name = excluded.legal_name, billing_email = excluded.billing_email, billing_contact = excluded.billing_contact,
      billing_address = excluded.billing_address, seller_legal_name = excluded.seller_legal_name, seats_paid = excluded.seats_paid,
      base_seats = excluded.base_seats, base_cents = excluded.base_cents, seat_cents = excluded.seat_cents,
      billing_interval = excluded.billing_interval, yearly_months = excluded.yearly_months, plan_reading = excluded.plan_reading,
      plan_reading_cents = excluded.plan_reading_cents, state = 'active', period_start = excluded.period_start, paid_through = null,
      grace_until = null, cancel_at = null, founder_until = excluded.founder_until, founder_set_by = excluded.founder_set_by,
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

-- Past Due (grace from the settings, 7 days), Read-Only now, Cancel (read-only once what was paid runs out), or Active
-- (undo without recording a payment). companies.status is never touched.
create or replace function public.pb_owner_billing_state(p_company uuid, p_state text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare a pb_billing.accounts;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  if p_state is null or p_state not in ('active', 'past_due', 'read_only', 'canceled') then return jsonb_build_object('ok', false, 'code', 'pb:bad_state'); end if;
  update pb_billing.accounts x set state = p_state,
      grace_until = case when p_state = 'past_due' then
                      case when x.state = 'past_due' and x.grace_until is not null then x.grace_until   -- pressing it again never adds days
                           else now() + make_interval(days => greatest(0, least(pb_billing.setting_int('grace_days', 7), 30))) end end,
      cancel_at = case when p_state = 'canceled' then coalesce(x.cancel_at, greatest(now(), coalesce(x.paid_through, current_date)::timestamptz)) end,
      updated_at = now()
    where x.company_id = p_company returning * into a;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  insert into pb_billing.events (company_id, kind, detail, actor)
    values (p_company, 'state', jsonb_build_object('state', p_state, 'grace_until', a.grace_until, 'cancel_at', a.cancel_at, 'note', left(p_note, 300)), auth.uid());
  perform pb_audit.admin_note('company_billing_state', p_company, null, jsonb_build_object('state', p_state));
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a));
end $$;

-- Paid: the invoice for the listed period was paid. p_from must be the period Billing Due showed (pressing Paid twice, or on
-- a stale screen, records nothing). Clears Past Due / Read-Only. A canceled account is not reopened here (Make Paid again).
create or replace function public.pb_owner_billing_paid(p_company uuid, p_from date, p_amount_cents integer default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare a pb_billing.accounts; v_from date; v_to date; v_seats int; v_amount int;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  select * into a from pb_billing.accounts x where x.company_id = p_company for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  if a.state = 'canceled' then return jsonb_build_object('ok', false, 'code', 'pb:canceled', 'message', 'This plan is canceled. Use Make Paid to start it again.'); end if;
  v_from := coalesce(a.paid_through, a.period_start);
  if p_from is distinct from v_from then
    return jsonb_build_object('ok', false, 'code', 'pb:period_changed', 'message', 'That period was already marked paid. Refresh.', 'account', pb_billing.account_json(a));
  end if;
  v_to := pb_billing.period_after(v_from, a.billing_interval);
  v_seats := case when a.paid_through is null then greatest(a.seats_paid, pb_billing.seats_used(p_company)) else pb_billing.seats_used(p_company) end;
  v_amount := pb_billing.amount_cents(a, v_seats);
  update pb_billing.accounts x set paid_through = v_to, seats_paid = v_seats, state = 'active', grace_until = null, updated_at = now()
    where x.company_id = p_company returning * into a;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'paid',
    jsonb_build_object('from', v_from, 'to', v_to, 'seats', v_seats, 'amount_cents', v_amount, 'received_cents', p_amount_cents, 'note', left(p_note, 300)), auth.uid());
  perform pb_audit.admin_note('company_billing_paid', p_company, null, jsonb_build_object('from', v_from, 'to', v_to, 'amount_cents', v_amount));
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a));
end $$;

-- The owner's billing screen: settings, every active company (with who would be billed and whether the founder price is
-- still possible), and Billing Due (who to invoice now, seats, amount, period).
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
                            'plan_reading_price_missing', x->'account'->'plan_reading_price_missing')
                       order by x->'account'->'next'->>'from')
                     from jsonb_array_elements(v_cos) x where x->'account' is not null and (x->'account'->'next'->>'due')::boolean), '[]'::jsonb));
end $$;

-- Change a setting (prices for NEW deals, grace days, the seller's legal name once the LLC exists, the plan reading price).
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

-- The missing "off" for an individual plan (decision 10: individual plans only by hand).
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

-- Helpers are reached only through the security-definer functions above (authenticated has no USAGE on pb_billing anyway).
revoke all on function pb_billing.setting(text), pb_billing.setting_int(text, integer), pb_billing.seats_used(uuid),
  pb_billing.read_only(uuid), pb_billing.writes_closed(uuid), pb_billing.plan_reading_on(uuid),
  pb_billing.period_after(date, text), pb_billing.amount_cents(pb_billing.accounts, integer), pb_billing.account_json(pb_billing.accounts)
  from public, anon, authenticated;
revoke all on function public.pb_owner_make_paid(uuid, text, text, integer, text, boolean, boolean, text, jsonb, text, text) from public, anon;
revoke all on function public.pb_owner_billing_state(uuid, text, text) from public, anon;
revoke all on function public.pb_owner_billing_paid(uuid, date, integer, text) from public, anon;
revoke all on function public.pb_owner_billing() from public, anon;
revoke all on function public.pb_owner_billing_setting_set(text, jsonb) from public, anon;
revoke all on function public.pb_owner_individual_off(uuid, text) from public, anon;
grant execute on function public.pb_owner_make_paid(uuid, text, text, integer, text, boolean, boolean, text, jsonb, text, text) to authenticated;
grant execute on function public.pb_owner_billing_state(uuid, text, text) to authenticated;
grant execute on function public.pb_owner_billing_paid(uuid, date, integer, text) to authenticated;
grant execute on function public.pb_owner_billing() to authenticated;
grant execute on function public.pb_owner_billing_setting_set(text, jsonb) to authenticated;
grant execute on function public.pb_owner_individual_off(uuid, text) to authenticated;

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
  if not (r->>'ok')::boolean or (r->'account'->'next'->>'amount_cents')::int <> 99000 or (r->'account'->'next'->>'to')::date <> (current_date + interval '1 year')::date
     or (r->'account'->>'founder_until') is not null then raise exception 'FAIL 6b yearly %', r; end if;
  if pg_temp.w(B, XU2) <> 'no error' then raise exception 'FAIL 6c ended beta writes again once paid'; end if;
  r := public.pb_owner_billing();
  if (select count(*) from jsonb_array_elements(r->'due') x where x->>'company_id' in (C::text, B::text)) <> 2 then raise exception 'FAIL 7 due %', r->'due'; end if;
  if (select (x->>'amount_cents')::int from jsonb_array_elements(r->'due') x where x->>'company_id' = C::text) <> 11100
     or (select (x->>'founder')::boolean from jsonb_array_elements(r->'due') x where x->>'company_id' = C::text) is not true
     or (select x->>'tax_state' from jsonb_array_elements(r->'due') x where x->>'company_id' = C::text) <> 'CA'
     or (select (x->>'founder_ok')::boolean from jsonb_array_elements(r->'companies') x where x->>'id' = D::text) is not true
     or (r->'settings'->>'base_cents')::int <> 9900 or r->'settings'->'seller_legal_name' <> 'null'::jsonb then raise exception 'FAIL 7b billing %', r; end if;
  res := res || jsonb_build_object('due_rows', (select jsonb_agg(x - 'billing_email') from jsonb_array_elements(r->'due') x where x->>'company_id' in (C::text, B::text)));
  if pg_temp.w(C, M1) <> 'no error' then raise exception 'FAIL 8 paid writes'; end if;
  r := public.pb_owner_billing_state(C, 'past_due', 'invoice 1 late');
  tt := (r->'account'->>'grace_until')::timestamptz;
  if r->'account'->>'state' <> 'past_due' or tt < now() + interval '6 days 23 hours' or tt > now() + interval '7 days 1 hour' or (r->'account'->>'read_only')::boolean then raise exception 'FAIL 9 past due %', r; end if;
  r := public.pb_owner_billing_state(C, 'past_due', 'again');
  if (r->'account'->>'grace_until')::timestamptz <> tt then raise exception 'FAIL 9b second press added days'; end if;
  if pg_temp.w(C, M1) <> 'no error' then raise exception 'FAIL 9c grace writes'; end if;
  if (select status from public.companies where id = C) <> 'active' then raise exception 'FAIL 9d status changed'; end if;
  update pb_billing.accounts set grace_until = now() - interval '1 minute' where company_id = C;
  if pg_temp.w(C, M1) <> 'pb:beta_ended' then raise exception 'FAIL 10 read-only after grace'; end if;
  if (select company_id from pb_billing.company_of(M1)) is distinct from C then raise exception 'FAIL 10b member lost company'; end if;
  perform pg_temp.act(M1); r := public.pb_my_plan(); perform pg_temp.act(A);
  if r->>'plan' <> 'paid' or not (r->>'closed')::boolean or not (r->>'paused')::boolean then raise exception 'FAIL 10c my_plan %', r; end if;
  res := res || jsonb_build_object('my_plan_paused', r);
  r := public.pb_owner_billing_paid(C, current_date - 1);
  if r->>'code' <> 'pb:period_changed' then raise exception 'FAIL 11 stale %', r; end if;
  r := public.pb_owner_billing_paid(C, current_date, 11100);
  if not (r->>'ok')::boolean or r->'account'->>'state' <> 'active' or (r->'account'->>'paid_through')::date <> (current_date + interval '1 month')::date
     or (r->'account'->>'seats_paid')::int <> 6 or (r->'account'->'next'->>'due')::boolean then raise exception 'FAIL 11b paid %', r; end if;
  r2 := public.pb_owner_billing_paid(C, current_date);
  if r2->>'code' <> 'pb:period_changed' then raise exception 'FAIL 11c double paid %', r2; end if;
  if pg_temp.w(C, M1) <> 'no error' then raise exception 'FAIL 11d writes after paid'; end if;
  insert into public.company_members (company_id, user_id, role) values (C, M5, 'pipelayer');
  r := public.pb_owner_billing();
  select x into r2 from jsonb_array_elements(r->'companies') x where x->>'id' = C::text;
  if (r2->'account'->'next'->>'seats')::int <> 7 or (r2->'account'->'next'->>'amount_cents')::int <> 12300
     or (r2->'account'->'next'->>'from')::date <> (current_date + interval '1 month')::date or (r2->'account'->>'seats_paid')::int <> 6 then raise exception 'FAIL 12 true-up %', r2; end if;
  delete from public.company_members where company_id = C and user_id = M3;
  r := public.pb_owner_billing(); select x into r2 from jsonb_array_elements(r->'companies') x where x->>'id' = C::text;
  if (r2->'account'->'next'->>'seats')::int <> 6 or (r2->'account'->>'paid_through')::date <> (current_date + interval '1 month')::date then raise exception 'FAIL 12b removal %', r2; end if;
  r := public.pb_owner_billing_state(C, 'read_only');
  if pg_temp.w(C, M1) <> 'pb:beta_ended' or not (r->'account'->>'read_only')::boolean then raise exception 'FAIL 13 read-only'; end if;
  r := public.pb_owner_billing_state(C, 'active');
  if pg_temp.w(C, M1) <> 'no error' then raise exception 'FAIL 13b active again'; end if;
  r := public.pb_owner_billing_state(C, 'canceled', 'owner emailed');
  if (r->'account'->>'cancel_at')::timestamptz::date <> (current_date + interval '1 month')::date or (r->'account'->>'read_only')::boolean then raise exception 'FAIL 14 cancel %', r; end if;
  if pg_temp.w(C, M1) <> 'no error' then raise exception 'FAIL 14b paid period still open'; end if;
  update pb_billing.accounts set cancel_at = now() - interval '1 minute' where company_id = C;
  if pg_temp.w(C, M1) <> 'pb:beta_ended' then raise exception 'FAIL 14c canceled closes'; end if;
  r := public.pb_owner_billing();
  if exists (select 1 from jsonb_array_elements(r->'due') x where x->>'company_id' = C::text) then raise exception 'FAIL 14d canceled still due'; end if;
  if (public.pb_owner_billing_paid(C, current_date + 30))->>'code' <> 'pb:canceled' then raise exception 'FAIL 14e paid on canceled'; end if;
  if (select status from public.companies where id = C) <> 'active' then raise exception 'FAIL 14f status'; end if;
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
--@local-only-begin  (grants are not sent to live: GRANT/REVOKE needs a confirmation this client cannot give)
  set local role anon;
  begin perform public.pb_owner_billing(); e := 'no error'; exception when others then e := sqlerrm; end;
  reset role;
  if e not like 'permission denied%' then raise exception 'FAIL 18 anon %', e; end if;
--@local-only-end
  res := res || jsonb_build_object('events', (select count(*) from pb_billing.events where company_id in (C, B)), 'audit', (select count(*) from pb_audit.admin_log where company_id in (C, B)));
  res := res || jsonb_build_object('defs', (select jsonb_object_agg(p.proname, md5(rtrim(pg_get_functiondef(p.oid), E'\n'))) from pg_proc p join pg_namespace n2 on n2.oid = p.pronamespace where (n2.nspname, p.proname) in (('pb_billing','beta_closed_guard'),('public','pb_my_plan'),('public','pb_owner_company_set'),('public','pb_plans_uploaded'),('public','pb_plans_svc_take'),('public','pb_plans_svc_more'))));
  raise notice 'RESULT: %', res;
end $T$;
