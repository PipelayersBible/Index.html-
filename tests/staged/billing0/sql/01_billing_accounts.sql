-- Billing Phase 0 (hand-sent invoices). NOT APPLIED. Review, then apply as one migration (01, 02, 03 in order).
-- Built Nov 17 2026 against live rogfassochneycezecxa / app r16.96, from plan/billing/PLAN.md and the owner's decisions:
--   hand invoices (no Stripe API), seller not formed yet (setting, never hard-coded), monthly or yearly (yearly = 10 months),
--   $99 incl. 5 people + $12 each extra, company login free / every other login counts / open invites count,
--   added people billed from the next invoice / no credit for removals, founder lock (12 months at $99 + $12) only for a beta
--   company that commits BEFORE its beta ends, no AI add-on, plan reading add-on only for PAID companies (price = setting),
--   individual plans by hand only, 7 days' grace then read-only through the beta's existing lock, no card surcharge.
-- Round 2 (owner, Nov 18): past due and read-only are AUTOMATIC, computed on every read from paid_through + grace_days
--   (no cron, nothing can be missed); Paid moves paid_through one period; a manual Read-Only Now stays. Paid seats per
--   period: adding someone into a free paid seat costs nothing; above the paid seats a yearly plan shows a catch-up
--   (extra people x months left x seat price), a monthly plan bills them from the next invoice. AI stops while read-only (04).
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

-- ---------------------------------------------------------------------------------------------------------------------
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

-- The account's state, computed on read (UTC dates): canceled (stored) | read_only (stored by Tommy, or grace over) |
-- past_due (today is on/after paid_through, within grace_days) | active.
create or replace function pb_billing.state_of(a pb_billing.accounts) returns text
language sql stable set search_path to '' as $$
  select case when a.state = 'canceled' then 'canceled'
              when a.state = 'read_only' then 'read_only'
              when current_date >= a.paid_through + a.grace_days then 'read_only'
              when current_date >= a.paid_through then 'past_due'
              else 'active' end
$$;

-- Read-only = the lock the ended beta uses: new company records refused with pb:beta_ended, phones keep them queued, nothing
-- deleted. No billing row (a beta, or the one legacy paid company) = never read-only here.
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

-- Months (whole or part) from p_from up to p_to; 0 when p_to is not after p_from.
create or replace function pb_billing.months_left(p_from date, p_to date) returns integer
language sql immutable set search_path to '' as $$
  select case when p_to <= p_from then 0 else (extract(year from age(p_to, p_from)) * 12 + extract(month from age(p_to, p_from))
              + case when extract(day from age(p_to, p_from)) > 0 then 1 else 0 end)::int end
$$;

-- What an account shows on the owner's screen. Next invoice = the period starting at paid_through, people counted NOW.
-- Paid seats: capacity = greatest(seats_paid, base_seats); people above it are "extra": a yearly plan shows a catch-up
-- (extra x months left x seat price), a monthly plan bills them on the next invoice. Removing someone frees a seat (no credit).
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

-- Read-Only Now (Tommy's manual lock), Cancel (read-only once what was paid runs out), or Active (undo either). Past due is
-- never set by hand: it is computed from paid_through. companies.status is never touched.
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

-- Paid: the invoice for the next period was paid; paid_through moves one period (month or year) and the paid seats become
-- the people billed (p_seats, the count Billing Due showed; default: people now). p_from must equal the current paid_through
-- (pressing Paid twice, or on a stale screen, records nothing). It ends past due / grace read-only by moving paid_through,
-- and clears a manual Read-Only Now. A canceled account is not reopened here (Make Paid again).
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

-- Catch-up Paid (yearly plan): the catch-up invoice for the people above the paid seats was paid; the paid seats become
-- p_seats (the people billed, at most the people now) for the rest of the period. Nothing else changes.
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

-- One line for the operator: companies past due (with the day they lock) and companies that locked in the last 3 days
-- because nothing was paid. Null when there is nothing to say. Used by the 10:00 UTC check (sql/05, optional).
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
                            'plan_reading_price_missing', x->'account'->'plan_reading_price_missing',
                            'lock_on', x->'account'->'lock_on', 'days_to_lock', x->'account'->'days_to_lock',
                            'paid_through', x->'account'->'paid_through', 'seats_paid', x->'account'->'seats_paid',
                            'extra', x->'account'->'extra', 'catchup', x->'account'->'catchup')
                       order by (x->'account'->>'state') = 'active', x->'account'->'next'->>'from')
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
  pb_billing.state_of(pb_billing.accounts), pb_billing.months_left(date, date), pb_billing.alert_text(),
  pb_billing.read_only(uuid), pb_billing.writes_closed(uuid), pb_billing.plan_reading_on(uuid),
  pb_billing.period_after(date, text), pb_billing.amount_cents(pb_billing.accounts, integer), pb_billing.account_json(pb_billing.accounts)
  from public, anon, authenticated;
revoke all on function public.pb_owner_make_paid(uuid, text, text, integer, text, boolean, boolean, text, jsonb, text, text) from public, anon;
revoke all on function public.pb_owner_billing_state(uuid, text, text) from public, anon;
revoke all on function public.pb_owner_billing_paid(uuid, date, integer, integer, text) from public, anon;
revoke all on function public.pb_owner_billing_catchup_paid(uuid, integer, integer, text) from public, anon;
revoke all on function public.pb_owner_billing() from public, anon;
revoke all on function public.pb_owner_billing_setting_set(text, jsonb) from public, anon;
revoke all on function public.pb_owner_individual_off(uuid, text) from public, anon;
grant execute on function public.pb_owner_make_paid(uuid, text, text, integer, text, boolean, boolean, text, jsonb, text, text) to authenticated;
grant execute on function public.pb_owner_billing_state(uuid, text, text) to authenticated;
grant execute on function public.pb_owner_billing_paid(uuid, date, integer, integer, text) to authenticated;
grant execute on function public.pb_owner_billing_catchup_paid(uuid, integer, integer, text) to authenticated;
grant execute on function public.pb_owner_billing() to authenticated;
grant execute on function public.pb_owner_billing_setting_set(text, jsonb) to authenticated;
grant execute on function public.pb_owner_individual_off(uuid, text) to authenticated;
