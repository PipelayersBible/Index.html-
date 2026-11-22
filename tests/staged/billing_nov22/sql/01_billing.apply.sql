-- billing_nov22 01: billing and trial end fixes (Review – Billing and Trial End, Nov 22 2026).
-- Plain SQL, valid as-is or pasted inside a DO block (no top-level SELECT, no begin/commit). Safe to run twice.
-- Needs pb_stage (records_nov22 01_patchfn, already on live). Undo: 99_undo_01.sql (puts back the exact live texts).
-- What it does (finding numbers from the review):
--  #2 #12 #23  Billing days are Pacific days (setting billing_tz). An invoice is due on the paid-through date (+ setting
--              due_offset_days, 0), or later if it was sent late (sent date + invoice_ahead_days). Past due the day after
--              the due date; read-only grace_days (7) after it. pb_my_plan tells the company account (only) its plan.
--  #3 #16      Make Paid and Individual On start with the first invoice sent and not paid (paid_through = start), so it
--              is in Billing due and has the same grace and lock as any invoice.
--  #4 #18      Yearly catch-up at the yearly rate (seat x yearly_months / 12 a month), joined people only, part month
--              rounds down (setting catchup_part_month = down | up).
--  #5 #6 #14   Invoice Sent snapshots seats / amount / due; Paid marks that snapshot. Make Paid needs a billing state, keeps
--              seats bought (seats_min). Edit Billing, Switch at Renewal, Undo Cancel (only while paid time remains).
--  #13         Paid - Restart From Today for a locked company.
--  #1 #17 #21  Founder price honoured for a company request sent before the trial ended; company request carries
--              Monthly / Yearly and only the company account can send it.
--  #24         Email invites (new and accepting) refused for an ended trial or a read-only company, like join links.
--  #15         The company AI pool counts the people in the company now (the dollar stop still follows paid seats).
--  #7          pb_crew_list gives the billing count, waiting invites, paid seats and interval.
--  #19 #20     pb_my_plan: 'dismissed' after Not Now, 'ended' for a canceled plan whose paid time is over.

do $g$ begin
  if to_regprocedure('pb_stage.patch_fn(regprocedure, text, text, text)') is null then raise exception 'billing_nov22: pb_stage is missing (records_nov22 01_patchfn first). Nothing was applied.'; end if;
  perform pb_stage.guard('billing_nov22', 'pb_billing.state_of(pb_billing.accounts)', 'f6e8211e6489d0bfbe37c523882cfdb9');
  perform pb_stage.guard('billing_nov22', 'pb_billing.account_json(pb_billing.accounts)', '36ee1b551bc181beb4c1bf35dcd847b4');
  perform pb_stage.guard('billing_nov22', 'pb_billing.alert_text()', 'b721287e9e5845fefd70c60f7e662c17');
  perform pb_stage.guard('billing_nov22', 'pb_billing.has_individual(uuid)', '82533a0f6c544f9f3fcc979ab19abac8');
  perform pb_stage.guard('billing_nov22', 'pb_billing.individual_open(uuid,text)', '529435b129c1060135befd861f926a41');
  perform pb_stage.guard('billing_nov22', 'pb_billing.individuals_json()', '7652d76a9fa01c4bc75c322161441ea9');
  perform pb_stage.guard('billing_nov22', 'public.pb_owner_make_paid(uuid,text,text,integer,text,boolean,boolean,text,jsonb,text,text)', 'dcd742e312a04186cede99d3a860dbae');
  perform pb_stage.guard('billing_nov22', 'public.pb_owner_billing_paid(uuid,date,integer,integer,text)', 'dc123612f264765026d560a63632fcb2');
  perform pb_stage.guard('billing_nov22', 'public.pb_my_plan()', '095045832c60bbae5d9eea31090725aa');
  perform pb_stage.guard('billing_nov22', 'public.pb_plan_request(text)', '8cddefcbf68910a043f8b119839cbe73');
  -- patched in place below (patch_fn): checked here too, so a changed live text stops everything before anything runs
  perform pb_stage.guard('billing_nov22', 'pb_billing.ai_block(uuid,text,integer)', 'e22b09f9dad9e04bd329f174377a27c8');
  perform pb_stage.guard('billing_nov22', 'public.pb_my_limits(text)', '56fdf4acdd68483ae7263d0bac253046');
  perform pb_stage.guard('billing_nov22', 'public.pb_owner_individual_paid(uuid,date,text)', '5541a0ec56ff7b5a322d63da768fae9a');
  perform pb_stage.guard('billing_nov22', 'public.pb_owner_billing_catchup_paid(uuid,integer,integer,text)', '450b870fb51560de6f42ff6e5ea7f058');
  perform pb_stage.guard('billing_nov22', 'public.pb_owner_billing_state(uuid,text,text)', '5c6e62f7c185098d5971603902d13648');
  perform pb_stage.guard('billing_nov22', 'public.pb_owner_billing()', '7e3cbfac33a237197a62d5455194fd4c');
  perform pb_stage.guard('billing_nov22', 'public.pb_owner_billing_setting_set(text,jsonb)', 'e70cbb3094dee1e4632dfef7507cda6e');
  perform pb_stage.guard('billing_nov22', 'public.pb_crew_list()', '346426f2bc889c87cbd1e2dcc9c4a7ce');
  perform pb_stage.guard('billing_nov22', 'pb_crew.svc_invite_begin(uuid,uuid,text,text)', '455ad22b111ca347903951ae145dca96');
  perform pb_stage.guard('billing_nov22', 'pb_crew.answer_invitation(uuid,uuid,boolean)', '0683a5baa661953c3146254a49b4dc4c');
end $g$;

-- ---------- settings (new rows only; existing values untouched) ----------
insert into pb_billing.settings (key, value, note) values
  ('billing_tz', '"America/Los_Angeles"', 'billing_nov22: billing days (due, past due, read-only, renewals) start at midnight in this time zone'),
  ('due_offset_days', '0', 'billing_nov22: an invoice is due this many days after the paid-through date (0 = on it). grace_days counts from the due date'),
  ('catchup_part_month', '"down"', 'billing_nov22: yearly catch-up: a part month left counts as none (down, the customer''s favour) or a whole month (up)')
on conflict (key) do nothing;

-- ---------- columns ----------
alter table pb_billing.accounts
  add column if not exists seats_min integer not null default 0,          -- seats bought: invoices never bill fewer
  add column if not exists next_interval text,                            -- Switch at Renewal: the interval of the next period
  add column if not exists invoice_from date,                             -- Invoice Sent: the period start it is for
  add column if not exists invoice_sent_on date,
  add column if not exists invoice_due date,
  add column if not exists invoice_seats integer,
  add column if not exists invoice_cents integer,
  add column if not exists invoice_interval text;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'accounts_seats_min_check' and conrelid = 'pb_billing.accounts'::regclass) then
    alter table pb_billing.accounts add constraint accounts_seats_min_check check (seats_min >= 0 and seats_min <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_next_interval_check' and conrelid = 'pb_billing.accounts'::regclass) then
    alter table pb_billing.accounts add constraint accounts_next_interval_check check (next_interval is null or next_interval in ('month', 'year'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_invoice_interval_check' and conrelid = 'pb_billing.accounts'::regclass) then
    alter table pb_billing.accounts add constraint accounts_invoice_interval_check check (invoice_interval is null or invoice_interval in ('month', 'year'));
  end if;
end $c$;
alter table pb_billing.individual_accounts add column if not exists due_on date;  -- the first invoice's due date (set by Individual On)

-- ---------- helpers (security definer, closed to the API) ----------
create or replace function pb_billing.tz() returns text
language sql stable security definer set search_path to '' as $f$
  select coalesce(nullif(pb_billing.setting('billing_tz') #>> '{}', ''), 'America/Los_Angeles')
$f$;
create or replace function pb_billing.today() returns date
language sql stable security definer set search_path to '' as $f$
  select (now() at time zone pb_billing.tz())::date
$f$;
create or replace function pb_billing.day_start(p_day date) returns timestamptz
language sql stable security definer set search_path to '' as $f$
  select (p_day::timestamp at time zone pb_billing.tz())
$f$;
create or replace function pb_billing.due_on(a pb_billing.accounts) returns date
language sql stable security definer set search_path to '' as $f$
  select greatest(a.paid_through + pb_billing.setting_int('due_offset_days', 0), case when a.invoice_from = a.paid_through then a.invoice_due end)
$f$;
create or replace function pb_billing.lock_on(a pb_billing.accounts) returns date
language sql stable security definer set search_path to '' as $f$
  select pb_billing.due_on(a) + a.grace_days
$f$;
create or replace function pb_billing.ind_due_on(a pb_billing.individual_accounts) returns date
language sql stable security definer set search_path to '' as $f$
  select greatest(a.paid_through + pb_billing.setting_int('due_offset_days', 0), a.due_on)
$f$;
create or replace function pb_billing.catchup_months(p_from date, p_to date) returns integer
language sql stable security definer set search_path to '' as $f$
  select case when p_to <= p_from then 0 else (extract(year from age(p_to, p_from)) * 12 + extract(month from age(p_to, p_from)))::int
              + case when extract(day from age(p_to, p_from)) > 0 and coalesce(pb_billing.setting('catchup_part_month') #>> '{}', 'down') = 'up' then 1 else 0 end end
$f$;
create or replace function pb_billing.pool_people(p_company uuid) returns integer
language sql stable security definer set search_path to '' as $f$
  select greatest(pb_crew.seats(p_company), pb_billing.paid_people(p_company))
$f$;
create or replace function pb_billing.crew_seats_json(p_company uuid) returns jsonb
language sql stable security definer set search_path to '' as $f$
  select jsonb_build_object('plan', c.plan, 'people', pb_billing.seats_used(c.id), 'joined', pb_crew.seats(c.id),
    'waiting', pb_billing.seats_used(c.id) - pb_crew.seats(c.id),
    'paid', (select greatest(a.seats_paid, a.base_seats, a.seats_min) from pb_billing.accounts a where a.company_id = c.id and a.state <> 'canceled'),
    'interval', (select a.billing_interval from pb_billing.accounts a where a.company_id = c.id and a.state <> 'canceled'),
    'trial_limit', case when c.plan = 'trial' then (pb_billing.trial_limits()->>'seats')::int - 1 end)
  from public.companies c where c.id = p_company
$f$;
create or replace function pb_billing.owner_plan_json(p_company uuid) returns jsonb
language plpgsql stable security definer set search_path to '' as $f$
-- billing_nov22: what the company account sees about its own plan (Home and Settings > Your plan). No one else gets this.
declare a pb_billing.accounts; j jsonb; r record;
begin
  select * into r from pb_billing.plan_requests q where q.company_id = p_company and q.kind = 'company' order by q.created_at desc limit 1;
  select * into a from pb_billing.accounts x where x.company_id = p_company;
  if found then j := pb_billing.account_json(a); end if;
  return jsonb_build_object('people', pb_billing.seats_used(p_company), 'joined', pb_crew.seats(p_company),
    'request', case when r.id is not null then jsonb_build_object('at', r.created_at, 'interval', r.billing_interval, 'open', r.done_at is null,
      'before_end', exists (select 1 from public.companies c where c.id = p_company and c.trial_ends_at is not null and r.created_at <= c.trial_ends_at)) end,
    'billing', case when j is not null then jsonb_build_object('state', j->'state', 'paused_reason', j->'paused_reason', 'due_on', j->'due_on',
      'lock_on', j->'lock_on', 'paid_through', j->'paid_through', 'period_start', j->'period_start', 'first_invoice', j->'first_invoice',
      'interval', j->'interval', 'next_interval', j->'next_interval', 'seats_paid', j->'seats_capacity', 'people', j->'seats_used',
      'joined', j->'joined', 'cancel_at', j->'cancel_at', 'founder_until', j->'founder_until', 'today', j->'today',
      'next', jsonb_build_object('from', j->'next'->'from', 'to', j->'next'->'to', 'seats', j->'next'->'seats',
        'amount_cents', j->'next'->'amount_cents', 'interval', j->'next'->'interval')) end);
end $f$;

-- ---------- #2 #12: the state of a company plan ----------
CREATE OR REPLACE FUNCTION pb_billing.state_of(a pb_billing.accounts)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  -- billing_nov22: Pacific days; past due the day after the invoice is due, read-only grace_days after the due date
  select case when a.state = 'canceled' then 'canceled'
              when a.state = 'read_only' then 'read_only'
              when pb_billing.today() >= pb_billing.lock_on(a) then 'read_only'
              when pb_billing.today() > pb_billing.due_on(a) then 'past_due'
              else 'active' end
$function$;

CREATE OR REPLACE FUNCTION pb_billing.account_json(a pb_billing.accounts)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- billing_nov22: due / lock from the invoice due date, Pacific days, the Invoice Sent snapshot, yearly catch-up at the
-- yearly rate for joined people only, seats bought, the next period's interval.
declare v_today date := pb_billing.today();
  v_used int := pb_billing.seats_used(a.company_id); v_joined int := pb_crew.seats(a.company_id);
  v_st text := pb_billing.state_of(a); v_due date := pb_billing.due_on(a); v_lock date := pb_billing.lock_on(a);
  v_cap int := greatest(a.seats_paid, a.base_seats);
  v_inv boolean := a.invoice_from is not null and a.invoice_from = a.paid_through;
  v_iv text := case when a.invoice_from is not null and a.invoice_from = a.paid_through then coalesce(a.invoice_interval, a.billing_interval)
                    else coalesce(a.next_interval, a.billing_interval) end;
  v_from date := a.paid_through; v_to date; v_bill int; v_amt int; b pb_billing.accounts;
  v_extra_bill int := greatest(0, v_used - v_cap);
  v_extra int := greatest(0, v_joined - v_cap);
  v_months int := pb_billing.catchup_months(v_today, a.paid_through);
  v_each int; v_catch int := 0;
begin
  v_to := pb_billing.period_after(v_from, v_iv);
  b := a; b.billing_interval := v_iv;
  v_bill := case when v_inv then a.invoice_seats else greatest(v_used, a.seats_min) end;
  v_amt := case when v_inv then a.invoice_cents else pb_billing.amount_cents(b, v_bill) end;
  v_each := round(a.seat_cents * a.yearly_months * v_months / 12.0)::int;
  if a.billing_interval = 'year' and v_st = 'active' then v_catch := v_extra * v_each; end if;
  return jsonb_build_object('legal_name', a.legal_name, 'billing_email', a.billing_email, 'billing_contact', a.billing_contact,
    'billing_address', a.billing_address, 'tax_state', a.billing_address->>'state', 'seller_legal_name', a.seller_legal_name,
    'state', v_st, 'stored_state', a.state, 'read_only', pb_billing.read_only(a.company_id), 'cancel_at', a.cancel_at,
    'paused_reason', case when v_st = 'canceled' then case when pb_billing.read_only(a.company_id) then 'ended' end
                          when v_st = 'read_only' then case when a.state = 'read_only' then 'manual' else 'unpaid' end end,
    'today', v_today, 'due_on', v_due, 'lock_on', v_lock, 'days_to_lock', case when v_st = 'past_due' then v_lock - v_today end, 'grace_days', a.grace_days,
    'seats_capacity', v_cap, 'seats_min', a.seats_min, 'extra', v_extra_bill, 'joined', v_joined, 'waiting', v_used - v_joined,
    'catchup', jsonb_build_object('people', case when a.billing_interval = 'year' then v_extra else 0 end, 'months', v_months,
      'each_cents', v_each, 'cents', v_catch, 'monthly_next_invoice', case when a.billing_interval = 'month' then v_extra_bill else 0 end,
      'part_month', coalesce(pb_billing.setting('catchup_part_month') #>> '{}', 'down')),
    'interval', a.billing_interval, 'next_interval', a.next_interval, 'yearly_months', a.yearly_months, 'base_cents', a.base_cents, 'base_seats', a.base_seats,
    'seat_cents', a.seat_cents, 'plan_reading', a.plan_reading, 'plan_reading_cents', a.plan_reading_cents,
    'plan_reading_price_missing', a.plan_reading and a.plan_reading_cents is null,
    'founder_until', a.founder_until, 'founder_set_at', a.founder_set_at,
    'founder_set_by', (select u.email::text from auth.users u where u.id = a.founder_set_by),
    'order_signed_by', a.order_signed_by, 'order_signed_at', a.order_signed_at, 'terms_version', a.terms_version,
    'period_start', a.period_start, 'paid_through', a.paid_through, 'seats_paid', a.seats_paid, 'seats_used', v_used,
    'first_invoice', a.paid_through <= a.period_start,
    'invoice', case when v_inv then jsonb_build_object('from', a.invoice_from, 'sent_on', a.invoice_sent_on, 'due', a.invoice_due,
      'seats', a.invoice_seats, 'amount_cents', a.invoice_cents, 'interval', coalesce(a.invoice_interval, a.billing_interval)) end,
    'next', jsonb_build_object('from', v_from, 'to', v_to, 'seats', v_bill, 'amount_cents', v_amt, 'interval', v_iv, 'sent', v_inv, 'due_on', v_due,
      'first', a.paid_through <= a.period_start,
      'founder', a.founder_until is not null and v_from < a.founder_until,
      'due', v_st <> 'canceled' and (v_st in ('past_due', 'read_only') or v_catch > 0
               or v_from <= v_today + pb_billing.setting_int('invoice_ahead_days', 7))));
end $function$;

CREATE OR REPLACE FUNCTION pb_billing.alert_text()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- billing_nov22: from the invoice due date, in Pacific days
  select 'billing, not the backup (the fix line below does not apply): ' || string_agg(x.line, '; ' order by x.lock_on)
         || '. Open Settings > Beta Accounts and press Paid once it is paid.'
  from (select a.legal_name || case when pb_billing.today() < pb_billing.lock_on(a)
                 then ' is past due since ' || to_char(pb_billing.due_on(a), 'Mon DD') || ' and locks (read-only) on '
                      || to_char(pb_billing.lock_on(a), 'Mon DD') || ' (' || (pb_billing.lock_on(a) - pb_billing.today()) || ' days left)'
                 else ' locked (read-only) on ' || to_char(pb_billing.lock_on(a), 'Mon DD') || ': not paid' end line,
               pb_billing.lock_on(a) lock_on
        from pb_billing.accounts a
        where a.state = 'active' and pb_billing.today() > pb_billing.due_on(a) and pb_billing.today() < pb_billing.lock_on(a) + 3) x
  having count(*) > 0
$function$;

-- ---------- #16: individual plans ----------
CREATE OR REPLACE FUNCTION pb_billing.has_individual(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- billing_nov22: lapses grace_days after the invoice is due (Pacific days)
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active')
     and not exists (select 1 from pb_billing.individual_accounts a where a.user_id = p_user
                     and (a.state = 'canceled' or pb_billing.today() >= pb_billing.ind_due_on(a) + a.grace_days))
$function$;

CREATE OR REPLACE FUNCTION pb_billing.individual_open(p_user uuid, p_interval text DEFAULT 'month'::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- billing_nov22: starts with the first invoice sent and not paid (paid_through = today, due invoice_ahead_days from today)
  insert into pb_billing.individual_accounts (user_id, cents, year_cents, billing_interval, period_start, paid_through, grace_days, created_by, due_on)
  values (p_user, pb_billing.setting_int('individual_cents', 1500), pb_billing.setting_int('individual_year_cents', 14400),
          case when p_interval = 'year' then 'year' else 'month' end, pb_billing.today(), pb_billing.today(),
          pb_billing.setting_int('grace_days', 7), auth.uid(), pb_billing.today() + pb_billing.setting_int('invoice_ahead_days', 7))
  on conflict (user_id) do update set state = 'active', billing_interval = excluded.billing_interval, period_start = excluded.period_start,
      paid_through = excluded.paid_through, due_on = excluded.due_on, updated_at = now()
    where pb_billing.individual_accounts.state = 'canceled'
       or pb_billing.today() >= greatest(pb_billing.individual_accounts.paid_through + pb_billing.setting_int('due_offset_days', 0), pb_billing.individual_accounts.due_on)
                                + pb_billing.individual_accounts.grace_days
$function$;

CREATE OR REPLACE FUNCTION pb_billing.individuals_json()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- billing_nov22: due / lock from the due date (Pacific days), the first invoice, and the company the person is in now
  select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', (select u.email::text from auth.users u where u.id = a.user_id),
      'cents', a.cents, 'year_cents', a.year_cents, 'interval', a.billing_interval, 'paid_through', a.paid_through,
      'due_on', pb_billing.ind_due_on(a), 'lock_on', pb_billing.ind_due_on(a) + a.grace_days, 'first_invoice', a.paid_through <= a.period_start,
      'company', (select c.name from public.companies c where c.status = 'active'
                    and (c.owner_user_id = a.user_id or exists (select 1 from public.company_members m where m.company_id = c.id and m.user_id = a.user_id))
                  order by c.created_at desc limit 1),
      'state', case when a.state = 'canceled' or not exists (select 1 from public.subscriptions s where s.user_id = a.user_id and s.tier = 'individual' and s.status = 'active') then 'canceled'
                    when pb_billing.today() >= pb_billing.ind_due_on(a) + a.grace_days then 'lapsed'
                    when pb_billing.today() > pb_billing.ind_due_on(a) then 'past_due' else 'active' end,
      'next', jsonb_build_object('from', a.paid_through, 'to', pb_billing.period_after(a.paid_through, a.billing_interval),
        'amount_cents', case when a.billing_interval = 'year' then a.year_cents else a.cents end, 'due_on', pb_billing.ind_due_on(a),
        'due', a.state <> 'canceled' and a.paid_through <= pb_billing.today() + pb_billing.setting_int('invoice_ahead_days', 7)))
    order by a.paid_through), '[]'::jsonb)
  from pb_billing.individual_accounts a
$function$;

do $p$ begin
  if pb_stage.count_in_fn('public.pb_owner_individual_paid(uuid, date, text)', 'billing_nov22:I1') = 0 then
    perform pb_stage.patch_fn('public.pb_owner_individual_paid(uuid, date, text)',
      'set paid_through = v_to, billing_interval = v_int, updated_at = now() where x.user_id = p_user;',
      'set paid_through = v_to, billing_interval = v_int, due_on = null, updated_at = now() where x.user_id = p_user; /* billing_nov22:I1 */', 'billing_nov22');
  end if;
end $p$;

-- ---------- #3 #5 #6 #17: Make Paid ----------
CREATE OR REPLACE FUNCTION public.pb_owner_make_paid(p_company uuid, p_legal_name text, p_billing_email text, p_seats integer, p_interval text, p_founder boolean, p_plan_reading boolean, p_signed_by text, p_address jsonb DEFAULT '{}'::jsonb, p_contact text DEFAULT NULL::text, p_terms_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- billing_nov22: the first invoice is sent and not paid (paid_through = today) until Paid; founder price also for a company
-- request sent before the trial ended; a billing state is required; seats bought above the headcount are kept (seats_min).
declare v_co public.companies; v_used int; v_double jsonb; v_owner_email text; a pb_billing.accounts; v_months int;
  v_today date := pb_billing.today(); v_state text; v_founder_ok boolean; v_by_request boolean;
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
  if p_address is null or jsonb_typeof(p_address) <> 'object' then return jsonb_build_object('ok', false, 'code', 'pb:bad_address', 'message', 'Type the billing address.'); end if;
  v_state := upper(btrim(coalesce(p_address->>'state', '')));
  if v_state !~ '^[A-Z]{2}$' then return jsonb_build_object('ok', false, 'code', 'pb:no_state', 'message', 'Type the billing address with its state (2 letters, for sales tax).'); end if;
  p_address := p_address || jsonb_build_object('state', v_state);
  if p_contact is not null and length(btrim(p_contact)) > 200 then return jsonb_build_object('ok', false, 'code', 'pb:bad_contact', 'message', 'The billing contact is too long.'); end if;
  v_used := pb_billing.seats_used(p_company);
  if p_seats is null then p_seats := v_used; end if;
  if p_seats < v_used or p_seats > 1000 then
    return jsonb_build_object('ok', false, 'code', 'pb:seats_low', 'seats_used', v_used,
      'message', 'The company has ' || v_used || ' people now (members and open invites). Bill at least that many.');
  end if;
  v_by_request := v_co.plan = 'trial' and v_co.trial_ends_at is not null
    and exists (select 1 from pb_billing.plan_requests r where r.company_id = p_company and r.kind = 'company' and r.created_at <= v_co.trial_ends_at);
  v_founder_ok := v_co.plan = 'trial' and v_co.trial_ends_at is not null and (v_co.trial_ends_at > now() or v_by_request);
  if coalesce(p_founder, false) and not v_founder_ok then
    return jsonb_build_object('ok', false, 'code', 'pb:founder_late',
      'message', 'The founder price is only for a beta company that asked for its plan before its beta ended.');
  end if;
  v_months := pb_billing.setting_int('founder_months', 12);
  insert into pb_billing.accounts (company_id, legal_name, billing_email, billing_contact, billing_address, seller_legal_name,
      seats_paid, base_seats, base_cents, seat_cents, billing_interval, yearly_months, plan_reading, plan_reading_cents,
      state, period_start, paid_through, grace_days, founder_until, founder_set_by, founder_set_at, order_signed_by, order_signed_at,
      terms_version, created_by, seats_min, next_interval, invoice_from, invoice_sent_on, invoice_due, invoice_seats, invoice_cents, invoice_interval)
    values (p_company, btrim(p_legal_name), lower(btrim(p_billing_email)), nullif(btrim(coalesce(p_contact, '')), ''),
      p_address, pb_billing.setting('seller_legal_name') #>> '{}',
      p_seats, pb_billing.setting_int('base_seats', 5), pb_billing.setting_int('base_cents', 9900), pb_billing.setting_int('seat_cents', 1200),
      p_interval, pb_billing.setting_int('yearly_months', 10), coalesce(p_plan_reading, false),
      case when p_plan_reading then pb_billing.setting_int('plan_reading_cents', null) end,
      'active', v_today, v_today, greatest(0, least(pb_billing.setting_int('grace_days', 7), 30)),
      case when p_founder then (v_today + make_interval(months => v_months))::date end,
      case when p_founder then auth.uid() end, case when p_founder then now() end,
      btrim(p_signed_by), now(), nullif(btrim(coalesce(p_terms_version, '')), ''), auth.uid(),
      case when p_seats > v_used then p_seats else 0 end, null,
      v_today, v_today, v_today + pb_billing.setting_int('invoice_ahead_days', 7), p_seats, null, p_interval)
    on conflict (company_id) do update set   -- only a canceled account gets here: a fresh start, never a founder lock
      legal_name = excluded.legal_name, billing_email = excluded.billing_email, billing_contact = excluded.billing_contact,
      billing_address = excluded.billing_address, seller_legal_name = excluded.seller_legal_name, seats_paid = excluded.seats_paid,
      base_seats = excluded.base_seats, base_cents = excluded.base_cents, seat_cents = excluded.seat_cents,
      billing_interval = excluded.billing_interval, yearly_months = excluded.yearly_months, plan_reading = excluded.plan_reading,
      plan_reading_cents = excluded.plan_reading_cents, state = 'active', period_start = excluded.period_start, paid_through = excluded.paid_through,
      grace_days = excluded.grace_days, cancel_at = null, founder_until = excluded.founder_until, founder_set_by = excluded.founder_set_by,
      founder_set_at = excluded.founder_set_at, order_signed_by = excluded.order_signed_by, order_signed_at = excluded.order_signed_at,
      terms_version = excluded.terms_version, seats_min = excluded.seats_min, next_interval = null,
      invoice_from = excluded.invoice_from, invoice_sent_on = excluded.invoice_sent_on, invoice_due = excluded.invoice_due,
      invoice_seats = excluded.invoice_seats, invoice_cents = null, invoice_interval = excluded.invoice_interval, updated_at = now()
    returning * into a;
  update pb_billing.accounts x set invoice_cents = pb_billing.amount_cents(a, p_seats) where x.company_id = p_company returning * into a;
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
      'interval', p_interval, 'plan_reading', a.plan_reading, 'founder_until', a.founder_until, 'founder_by_request', coalesce(p_founder, false) and v_by_request and v_co.trial_ends_at <= now(),
      'signed_by', a.order_signed_by, 'terms_version', a.terms_version, 'tax_state', v_state,
      'first_invoice', jsonb_build_object('from', a.invoice_from, 'due', a.invoice_due, 'seats', a.invoice_seats, 'amount_cents', a.invoice_cents),
      'was', v_co.plan, 'trial_ends_at', v_co.trial_ends_at), auth.uid());
  perform pb_audit.admin_note('company_make_paid', p_company, null, jsonb_build_object('seats', p_seats, 'interval', p_interval,
    'founder_until', a.founder_until, 'plan_reading', a.plan_reading));
  if a.plan_reading then
    update pb_plans.sets set state = 'reading' where company_id = p_company and state = 'parked';
    if found then perform pb_plans.kick(); end if;
  end if;
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a), 'owner_login', v_owner_email,
    'individual_plans_to_stop', v_double);
end $function$;

-- ---------- #5: Paid marks the invoice that was sent ----------
CREATE OR REPLACE FUNCTION public.pb_owner_billing_paid(p_company uuid, p_from date, p_seats integer DEFAULT NULL::integer, p_amount_cents integer DEFAULT NULL::integer, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- billing_nov22: marks the Invoice Sent snapshot (its seats, amount and interval) when there is one for this period;
-- otherwise the people now (never fewer than seats bought). A Switch at Renewal takes effect here.
declare a pb_billing.accounts; b pb_billing.accounts; v_from date; v_to date; v_seats int; v_amount int; v_was text; v_inv boolean; v_int text;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  select * into a from pb_billing.accounts x where x.company_id = p_company for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  if a.state = 'canceled' then return jsonb_build_object('ok', false, 'code', 'pb:canceled', 'message', 'This plan is canceled. Use Make Paid to start it again.'); end if;
  v_from := a.paid_through; v_was := pb_billing.state_of(a);
  if p_from is distinct from v_from then
    return jsonb_build_object('ok', false, 'code', 'pb:period_changed', 'message', 'That period was already marked paid. Refresh.', 'account', pb_billing.account_json(a));
  end if;
  v_inv := a.invoice_from is not null and a.invoice_from = a.paid_through;
  v_int := case when v_inv then coalesce(a.invoice_interval, a.billing_interval) else coalesce(a.next_interval, a.billing_interval) end;
  v_to := pb_billing.period_after(v_from, v_int);
  b := a; b.billing_interval := v_int;
  if v_inv then
    v_seats := a.invoice_seats; v_amount := coalesce(a.invoice_cents, pb_billing.amount_cents(b, a.invoice_seats));
  else
    v_seats := greatest(0, least(coalesce(p_seats, greatest(pb_billing.seats_used(p_company), a.seats_min)), 1000));
    v_amount := pb_billing.amount_cents(b, v_seats);
  end if;
  update pb_billing.accounts x set paid_through = v_to, seats_paid = v_seats, state = 'active', billing_interval = v_int,
      next_interval = case when x.next_interval = v_int then null else x.next_interval end,
      invoice_from = null, invoice_sent_on = null, invoice_due = null, invoice_seats = null, invoice_cents = null, invoice_interval = null,
      updated_at = now()
    where x.company_id = p_company returning * into a;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'paid',
    jsonb_build_object('from', v_from, 'to', v_to, 'seats', v_seats, 'amount_cents', v_amount, 'interval', v_int, 'invoiced', v_inv,
      'received_cents', p_amount_cents, 'was', v_was, 'note', left(p_note, 300)), auth.uid());
  perform pb_audit.admin_note('company_billing_paid', p_company, null, jsonb_build_object('from', v_from, 'to', v_to, 'amount_cents', v_amount));
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a));
end $function$;

-- ---------- #5: Invoice Sent (new) ----------
create or replace function public.pb_owner_billing_invoice_sent(p_company uuid, p_from date, p_seats integer default null, p_due date default null)
returns jsonb language plpgsql security definer set search_path to '' as $f$
-- billing_nov22: records the invoice Tommy just sent for the next period: seats, amount, interval and due date. Paid then
-- marks exactly that. Sending again replaces it. The due date is never earlier than the paid-through date (+ offset).
declare a pb_billing.accounts; b pb_billing.accounts; v_today date := pb_billing.today(); v_int text; v_seats int; v_due date; v_amt int;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  select * into a from pb_billing.accounts x where x.company_id = p_company for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  if a.state = 'canceled' then return jsonb_build_object('ok', false, 'code', 'pb:canceled', 'message', 'This plan is canceled. Use Make Paid to start it again.'); end if;
  if p_from is distinct from a.paid_through then
    return jsonb_build_object('ok', false, 'code', 'pb:period_changed', 'message', 'That period was already marked paid. Refresh.', 'account', pb_billing.account_json(a));
  end if;
  v_int := case when a.invoice_from = a.paid_through then coalesce(a.next_interval, a.invoice_interval, a.billing_interval) else coalesce(a.next_interval, a.billing_interval) end;
  v_seats := coalesce(p_seats, greatest(pb_billing.seats_used(p_company), a.seats_min));
  if v_seats < pb_crew.seats(p_company) or v_seats > 1000 then
    return jsonb_build_object('ok', false, 'code', 'pb:seats_low', 'message', 'The company has ' || pb_crew.seats(p_company) || ' people who have joined. Bill at least that many.');
  end if;
  v_due := coalesce(p_due, greatest(a.paid_through + pb_billing.setting_int('due_offset_days', 0), v_today + pb_billing.setting_int('invoice_ahead_days', 7)));
  if v_due < v_today or v_due > v_today + 90 then return jsonb_build_object('ok', false, 'code', 'pb:bad_due', 'message', 'Pick a due date from today to 90 days out.'); end if;
  b := a; b.billing_interval := v_int; v_amt := pb_billing.amount_cents(b, v_seats);
  update pb_billing.accounts x set invoice_from = a.paid_through, invoice_sent_on = v_today, invoice_due = v_due, invoice_seats = v_seats,
      invoice_cents = v_amt, invoice_interval = v_int, updated_at = now()
    where x.company_id = p_company returning * into a;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'invoice_sent',
    jsonb_build_object('from', a.invoice_from, 'to', pb_billing.period_after(a.invoice_from, v_int), 'seats', v_seats, 'amount_cents', v_amt,
      'interval', v_int, 'due', v_due), auth.uid());
  perform pb_audit.admin_note('company_invoice_sent', p_company, null, jsonb_build_object('from', a.invoice_from, 'amount_cents', v_amt, 'due', v_due));
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a));
end $f$;

-- ---------- #13: Paid - restart from today (new) ----------
create or replace function public.pb_owner_billing_restart(p_company uuid, p_seats integer default null, p_amount_cents integer default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path to '' as $f$
-- billing_nov22: a past-due or locked company paid to come back: a new period starts today (no charge for the locked time).
declare a pb_billing.accounts; b pb_billing.accounts; v_today date := pb_billing.today(); v_st text; v_int text; v_seats int; v_amt int; v_was date;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  select * into a from pb_billing.accounts x where x.company_id = p_company for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  v_st := pb_billing.state_of(a);
  if a.state = 'canceled' then return jsonb_build_object('ok', false, 'code', 'pb:canceled', 'message', 'This plan is canceled. Use Make Paid to start it again.'); end if;
  if v_st not in ('past_due', 'read_only') then return jsonb_build_object('ok', false, 'code', 'pb:not_locked', 'message', 'This plan isn''t past due or read-only. Use Paid.', 'account', pb_billing.account_json(a)); end if;
  v_int := coalesce(a.next_interval, a.billing_interval);
  v_seats := coalesce(p_seats, greatest(pb_billing.seats_used(p_company), a.seats_min));
  if v_seats < pb_crew.seats(p_company) or v_seats > 1000 then
    return jsonb_build_object('ok', false, 'code', 'pb:seats_low', 'message', 'The company has ' || pb_crew.seats(p_company) || ' people who have joined. Bill at least that many.');
  end if;
  b := a; b.billing_interval := v_int; v_amt := pb_billing.amount_cents(b, v_seats); v_was := a.paid_through;
  update pb_billing.accounts x set period_start = v_today, paid_through = pb_billing.period_after(v_today, v_int), seats_paid = v_seats,
      billing_interval = v_int, next_interval = null, state = 'active',
      invoice_from = null, invoice_sent_on = null, invoice_due = null, invoice_seats = null, invoice_cents = null, invoice_interval = null, updated_at = now()
    where x.company_id = p_company returning * into a;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'restart',
    jsonb_build_object('was_paid_through', v_was, 'was', v_st, 'from', v_today, 'to', a.paid_through, 'seats', v_seats, 'amount_cents', v_amt,
      'interval', v_int, 'received_cents', p_amount_cents, 'note', left(p_note, 300)), auth.uid());
  perform pb_audit.admin_note('company_billing_restart', p_company, null, jsonb_build_object('from', v_today, 'to', a.paid_through, 'amount_cents', v_amt));
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a));
end $f$;

-- ---------- #14: Edit Billing and Switch at Renewal (new) ----------
create or replace function public.pb_owner_billing_edit(p_company uuid, p_changes jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $f$
-- billing_nov22: legal_name, billing_email, billing_address (state required), billing_contact, seats_min (seats bought).
declare a pb_billing.accounts; v jsonb := coalesce(p_changes, '{}'::jsonb); v_before jsonb := '{}'::jsonb; v_st text; v_addr jsonb;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  if jsonb_typeof(v) <> 'object' then return jsonb_build_object('ok', false, 'code', 'pb:bad_request'); end if;
  select * into a from pb_billing.accounts x where x.company_id = p_company for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  if v ? 'legal_name' and (jsonb_typeof(v->'legal_name') <> 'string' or length(btrim(v->>'legal_name')) not between 1 and 200) then
    return jsonb_build_object('ok', false, 'code', 'pb:bad_name', 'message', 'Type the company''s legal name.'); end if;
  if v ? 'billing_email' and (jsonb_typeof(v->'billing_email') <> 'string' or btrim(v->>'billing_email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(btrim(v->>'billing_email')) > 254) then
    return jsonb_build_object('ok', false, 'code', 'pb:bad_email', 'message', 'Type the billing email.'); end if;
  if v ? 'billing_contact' and jsonb_typeof(v->'billing_contact') not in ('string', 'null') then return jsonb_build_object('ok', false, 'code', 'pb:bad_contact'); end if;
  if v ? 'billing_contact' and length(btrim(coalesce(v->>'billing_contact', ''))) > 200 then return jsonb_build_object('ok', false, 'code', 'pb:bad_contact', 'message', 'The billing contact is too long.'); end if;
  if v ? 'billing_address' then
    if jsonb_typeof(v->'billing_address') <> 'object' then return jsonb_build_object('ok', false, 'code', 'pb:bad_address', 'message', 'Type the billing address.'); end if;
    v_st := upper(btrim(coalesce(v->'billing_address'->>'state', '')));
    if v_st !~ '^[A-Z]{2}$' then return jsonb_build_object('ok', false, 'code', 'pb:no_state', 'message', 'Type the billing address with its state (2 letters, for sales tax).'); end if;
    v_addr := (v->'billing_address') || jsonb_build_object('state', v_st);
  end if;
  if v ? 'seats_min' and (jsonb_typeof(v->'seats_min') <> 'number' or (v->>'seats_min')::numeric <> trunc((v->>'seats_min')::numeric) or (v->>'seats_min')::numeric not between 0 and 1000) then
    return jsonb_build_object('ok', false, 'code', 'pb:bad_seats', 'message', 'Seats bought: a whole number from 0 to 1000.'); end if;
  v_before := jsonb_strip_nulls(jsonb_build_object('legal_name', case when v ? 'legal_name' then a.legal_name end,
    'billing_email', case when v ? 'billing_email' then a.billing_email end, 'billing_contact', case when v ? 'billing_contact' then a.billing_contact end,
    'billing_address', case when v ? 'billing_address' then a.billing_address end, 'seats_min', case when v ? 'seats_min' then a.seats_min end));
  update pb_billing.accounts x set
      legal_name = case when v ? 'legal_name' then btrim(v->>'legal_name') else x.legal_name end,
      billing_email = case when v ? 'billing_email' then lower(btrim(v->>'billing_email')) else x.billing_email end,
      billing_contact = case when v ? 'billing_contact' then nullif(btrim(coalesce(v->>'billing_contact', '')), '') else x.billing_contact end,
      billing_address = case when v ? 'billing_address' then v_addr else x.billing_address end,
      seats_min = case when v ? 'seats_min' then (v->>'seats_min')::int else x.seats_min end,
      updated_at = now()
    where x.company_id = p_company returning * into a;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'edit', jsonb_build_object('before', v_before, 'changes', v), auth.uid());
  perform pb_audit.admin_note('company_billing_edit', p_company, null, jsonb_build_object('keys', (select jsonb_agg(k) from jsonb_object_keys(v) k)));
  return jsonb_build_object('ok', true, 'account', pb_billing.account_json(a));
end $f$;

create or replace function public.pb_owner_billing_next_interval(p_company uuid, p_interval text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
-- billing_nov22: Switch to Yearly (or Monthly) at Renewal: the next period (its invoice, Paid) uses it. null = keep as is.
declare a pb_billing.accounts; v_resend boolean;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  if p_interval is not null and p_interval not in ('month', 'year') then return jsonb_build_object('ok', false, 'code', 'pb:bad_interval'); end if;
  select * into a from pb_billing.accounts x where x.company_id = p_company for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account'); end if;
  if a.state = 'canceled' then return jsonb_build_object('ok', false, 'code', 'pb:canceled', 'message', 'This plan is canceled. Use Make Paid to start it again.'); end if;
  v_resend := a.invoice_from = a.paid_through and coalesce(a.invoice_interval, a.billing_interval) is distinct from coalesce(p_interval, a.billing_interval);
  update pb_billing.accounts x set next_interval = case when p_interval = x.billing_interval then null else p_interval end, updated_at = now()
    where x.company_id = p_company returning * into a;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'next_interval', jsonb_build_object('interval', p_interval), auth.uid());
  perform pb_audit.admin_note('company_billing_next_interval', p_company, null, jsonb_build_object('interval', p_interval));
  return jsonb_build_object('ok', true, 'resend_invoice', coalesce(v_resend, false), 'account', pb_billing.account_json(a));
end $f$;

-- ---------- #4 #18 catch-up (joined people), #14 Undo Cancel, #17 founder in the list, settings keys ----------
do $p$ begin
  if pb_stage.count_in_fn('public.pb_owner_billing_catchup_paid(uuid, integer, integer, text)', 'billing_nov22:C1') = 0 then
    perform pb_stage.patch_fn('public.pb_owner_billing_catchup_paid(uuid, integer, integer, text)',
      'v_used := pb_billing.seats_used(p_company); v_was := a.seats_paid;',
      'v_used := pb_crew.seats(p_company); v_was := a.seats_paid; /* billing_nov22:C1 catch-up counts joined people only */', 'billing_nov22');
  end if;
  if pb_stage.count_in_fn('public.pb_owner_billing_state(uuid, text, text)', 'billing_nov22:S1') = 0 then
    perform pb_stage.patch_fn('public.pb_owner_billing_state(uuid, text, text)',
      '  update pb_billing.accounts x set state = p_state,',
      '  if p_state = ''active'' and exists (select 1 from pb_billing.accounts y where y.company_id = p_company and y.state = ''canceled'' and y.cancel_at <= now()) then /* billing_nov22:S1 Undo Cancel only while paid time remains */
    return jsonb_build_object(''ok'', false, ''code'', ''pb:cancel_over'', ''message'', ''The paid time has run out. Use Make Paid to start the plan again.'');
  end if;
  update pb_billing.accounts x set state = p_state,', 'billing_nov22');
    perform pb_stage.patch_fn('public.pb_owner_billing_state(uuid, text, text)',
      'greatest(now(), x.paid_through::timestamptz)',
      'greatest(now(), pb_billing.day_start(x.paid_through)) /* billing_nov22:S2 midnight Pacific */', 'billing_nov22');
  end if;
  if pb_stage.count_in_fn('public.pb_owner_billing()', 'billing_nov22:B1') = 0 then
    perform pb_stage.patch_fn('public.pb_owner_billing()',
      '''founder_ok'', c.plan = ''trial'' and c.trial_ends_at is not null and c.trial_ends_at > now(),',
      '''founder_ok'', c.plan = ''trial'' and c.trial_ends_at is not null and (c.trial_ends_at > now() /* billing_nov22:B1 */
          or exists (select 1 from pb_billing.plan_requests r where r.company_id = c.id and r.kind = ''company'' and r.created_at <= c.trial_ends_at)),
      ''request'', (select jsonb_build_object(''at'', r.created_at, ''interval'', r.billing_interval, ''open'', r.done_at is null,
          ''before_end'', c.trial_ends_at is not null and r.created_at <= c.trial_ends_at)
          from pb_billing.plan_requests r where r.company_id = c.id and r.kind = ''company'' order by r.created_at desc limit 1),
      ''joined'', pb_crew.seats(c.id),', 'billing_nov22');
    perform pb_stage.patch_fn('public.pb_owner_billing()',
      '''extra'', x->''account''->''extra'', ''catchup'', x->''account''->''catchup'')',
      '''extra'', x->''account''->''extra'', ''catchup'', x->''account''->''catchup'', /* billing_nov22:B2 */
                            ''due_on'', x->''account''->''due_on'', ''first_invoice'', x->''account''->''first_invoice'', ''invoice'', x->''account''->''invoice'',
                            ''seats_min'', x->''account''->''seats_min'', ''next_interval'', x->''account''->''next_interval'', ''today'', x->''account''->''today'')', 'billing_nov22');
  end if;
  if pb_stage.count_in_fn('public.pb_owner_billing_setting_set(text, jsonb)', 'billing_nov22:T1') = 0 then
    perform pb_stage.patch_fn('public.pb_owner_billing_setting_set(text, jsonb)',
      '    else null end;',
      '    when ''billing_tz'' then jsonb_typeof(p_value) = ''string'' and exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p_value #>> ''{}'') /* billing_nov22:T1 */
    when ''due_offset_days'' then jsonb_typeof(p_value) = ''number'' and (p_value #>> ''{}'')::numeric between 0 and 60 and (p_value #>> ''{}'')::numeric = trunc((p_value #>> ''{}'')::numeric)
    when ''catchup_part_month'' then jsonb_typeof(p_value) = ''string'' and (p_value #>> ''{}'') in (''down'', ''up'')
    else null end;', 'billing_nov22');
  end if;
end $p$;

-- ---------- #1 #9 #19 #20 #21 #23: what the app is told (pb_my_plan) ----------
CREATE OR REPLACE FUNCTION public.pb_my_plan()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- billing_nov22: as before, plus: is_owner; for the company account only, its own plan (people, request, billing: state,
-- due / lock dates, paid seats, next bill); 'ended' for a canceled plan whose paid time is over; 'dismissed' after Not Now;
-- 'individual_state' for someone with their own plan.
declare v_uid uuid := auth.uid(); x record; v_owner boolean; r jsonb; v_ind jsonb; v_req boolean; ia pb_billing.individual_accounts; v_ended boolean;
begin
  v_req := v_uid is not null and exists (select 1 from pb_billing.plan_requests q where q.user_id = v_uid and q.done_at is null);
  select * into ia from pb_billing.individual_accounts q where q.user_id = v_uid;
  if ia.user_id is not null and exists (select 1 from public.subscriptions s where s.user_id = v_uid and s.tier = 'individual' and s.status = 'active') and ia.state <> 'canceled' then
    v_ind := jsonb_build_object('individual_state', case when pb_billing.today() >= pb_billing.ind_due_on(ia) + ia.grace_days then 'lapsed'
                                                         when pb_billing.today() > pb_billing.ind_due_on(ia) then 'past_due' else 'active' end,
      'individual_due_on', pb_billing.ind_due_on(ia), 'individual_lock_on', pb_billing.ind_due_on(ia) + ia.grace_days);
  else v_ind := '{}'::jsonb; end if;
  select * into x from pb_billing.company_of(v_uid) q;
  if found then
    v_owner := exists (select 1 from public.companies c where c.id = x.company_id and c.owner_user_id = v_uid);
    v_ended := exists (select 1 from pb_billing.accounts a where a.company_id = x.company_id and a.state = 'canceled' and coalesce(a.cancel_at, now()) <= now());
    r := jsonb_build_object('ok', true, 'plan', x.plan, 'trial_ends_at', x.trial_ends_at, 'expired', x.expired,
      'closed', pb_billing.writes_closed(x.company_id), 'individual', pb_billing.has_individual(v_uid),
      'paused', pb_billing.read_only(x.company_id), 'ended', v_ended, 'is_owner', v_owner,
      'company', (select c.name from public.companies c where c.id = x.company_id),
      'requested', v_req,
      'days_left', case when x.plan = 'trial' then greatest(0, ceil(extract(epoch from (x.trial_ends_at - now())) / 86400))::int end,
      'limits', case when x.plan = 'trial' then pb_billing.trial_limits() end, 'prices', pb_billing.prices(), 'server_at', now()) || v_ind;
    if v_owner then r := r || pb_billing.owner_plan_json(x.company_id); end if;
    return r;
  end if;
  -- no company now: removed from one, and not on their own plan yet
  select jsonb_build_object('ok', true, 'plan', null, 'removed', jsonb_build_object('company', l.company_name, 'at', l.left_at),
      'individual', false, 'requested', v_req, 'prices', pb_billing.prices()) || v_ind into r
    from pb_billing.left_company l where l.user_id = v_uid and l.dismissed_at is null and not pb_billing.has_individual(v_uid);
  if r is not null then return r; end if;
  return jsonb_build_object('ok', true, 'plan', null, 'individual', pb_billing.has_individual(v_uid), 'requested', v_req,
    'dismissed', v_uid is not null and exists (select 1 from pb_billing.left_company l where l.user_id = v_uid and l.dismissed_at is not null),
    'prices', pb_billing.prices()) || v_ind;
end $function$;

CREATE OR REPLACE FUNCTION public.pb_plan_request(p_kind text DEFAULT 'individual'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- billing_nov22: 'company', 'company:month', 'company:year' (only the company account); 'individual', 'individual:month',
-- 'individual:year'. The message to Tommy says when it was sent (before / after the trial ended), the pick and the amount.
declare v_uid uuid := auth.uid(); v_co uuid; v_n integer; v_people int; v_cents int; v_before boolean; v_end timestamptz;
  v_kind text := case when p_kind in ('company', 'company:month', 'company:year') then 'company' else 'individual' end;
  v_int text := case when p_kind in ('individual:year', 'company:year') then 'year' when p_kind in ('individual:month', 'company:month') then 'month' end;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'code', 'pb:signed_out'); end if;
  select x.company_id into v_co from pb_billing.company_of(v_uid) x;
  if v_kind = 'company' and (v_co is null or not exists (select 1 from public.companies c where c.id = v_co and c.owner_user_id = v_uid)) then
    return jsonb_build_object('ok', false, 'code', 'pb:not_company_account');
  end if;
  insert into pb_billing.plan_requests (user_id, company_id, kind, billing_interval) values (v_uid, v_co, v_kind, v_int)
    on conflict (user_id, kind) do update set
      created_at = case when pb_billing.plan_requests.done_at is not null then now() else pb_billing.plan_requests.created_at end,
      company_id = coalesce(excluded.company_id, pb_billing.plan_requests.company_id),
      done_at = null, billing_interval = coalesce(excluded.billing_interval, pb_billing.plan_requests.billing_interval);
  if v_kind = 'company' then
    select c.trial_ends_at into v_end from public.companies c where c.id = v_co;
    select r.created_at <= coalesce(v_end, '-infinity'::timestamptz) into v_before from pb_billing.plan_requests r where r.user_id = v_uid and r.kind = 'company';
    v_people := pb_billing.seats_used(v_co);
    v_cents := pb_billing.setting_int('base_cents', 9900) + greatest(0, v_people - pb_billing.setting_int('base_seats', 5)) * pb_billing.setting_int('seat_cents', 1200);
  end if;
  select count(*) into v_n from pb_support.messages m where m.user_id = v_uid and m.created_at > now() - interval '1 day';
  if v_n < 30 then
    insert into pb_support.messages (user_id, client_message_id, body, app_build, screen, kind, company_id)
      values (v_uid, 'plan-' || v_kind || '-' || to_char(now() at time zone 'utc', 'YYYYMMDD'),
              case when v_kind = 'company' then 'Asked for the company to start a paid plan (' || case when v_before then 'before the trial ended: founder price' else 'after the trial ended' end || '). '
                     || case when v_int = 'year' then 'Picked yearly: $' || to_char(v_cents * pb_billing.setting_int('yearly_months', 10) / 100.0, 'FM999990.00') || ' a year'
                             else 'Picked monthly: $' || to_char(v_cents / 100.0, 'FM999990.00') || ' a month' end
                     || ' for ' || v_people || ' people, plus tax. Send the one-page order, then Make Paid.'
                   else 'Asked for an individual plan' || case when v_co is null then '.' else ' (end of beta).' end
                || case when v_int = 'year' then ' Picked yearly: $' || to_char(pb_billing.setting_int('individual_year_cents', 14400) / 100.0, 'FM999990.00') || ' a year, plus tax.'
                        when v_int = 'month' then ' Picked monthly: $' || to_char(pb_billing.setting_int('individual_cents', 1500) / 100.0, 'FM999990.00') || ' a month, plus tax.'
                        else ' Price shown: $' || to_char(pb_billing.setting_int('individual_cents', 1500) / 100.0, 'FM999990.00') || ' a month or $' || to_char(pb_billing.setting_int('individual_year_cents', 14400) / 100.0, 'FM999990.00') || ' a year, plus tax.' end end,
              null, 'Beta ended', 'idea', v_co)
      on conflict (user_id, client_message_id) do nothing;
  end if;
  return jsonb_build_object('ok', true, 'kind', v_kind, 'interval', v_int, 'before_end', v_before, 'people', v_people, 'month_cents', v_cents);
end $function$;

-- ---------- #15 AI pool, #7 crew screen, #24 email invites ----------
do $p$ begin
  if pb_stage.count_in_fn('pb_billing.ai_block(uuid, text, integer)', 'billing_nov22:A1') = 0 then
    perform pb_stage.patch_fn('pb_billing.ai_block(uuid, text, integer)',
      'if v_n >= (C->>''month_per_person'')::int * v_people then return ''company_month''; end if;',
      'if v_n >= (C->>''month_per_person'')::int * pb_billing.pool_people(w.company_id) then return ''company_month''; end if; /* billing_nov22:A1 the people now */', 'billing_nov22');
    perform pb_stage.patch_fn('pb_billing.ai_block(uuid, text, integer)',
      'if v_used >= (C->>''day_per_person'')::int * v_people then return ''company_day''; end if;',
      'if v_used >= (C->>''day_per_person'')::int * pb_billing.pool_people(w.company_id) then return ''company_day''; end if;', 'billing_nov22');
  end if;
  if pb_stage.count_in_fn('public.pb_my_limits(text)', 'billing_nov22:A2') = 0 then
    perform pb_stage.patch_fn('public.pb_my_limits(text)',
      'v_people := pb_billing.paid_people(w.company_id);',
      'v_people := pb_billing.pool_people(w.company_id); /* billing_nov22:A2 */', 'billing_nov22');
  end if;
  if pb_stage.count_in_fn('public.pb_crew_list()', 'billing_nov22:L1') = 0 then
    perform pb_stage.patch_fn('public.pb_crew_list()',
      '''seats'', pb_crew.seats(c.company_id), ''seats_included'', pb_crew.seats_included(),',
      '''seats'', pb_crew.seats(c.company_id), ''seats_included'', pb_crew.seats_included(),
    ''billing'', pb_billing.crew_seats_json(c.company_id), /* billing_nov22:L1 */', 'billing_nov22');
  end if;
  if pb_stage.count_in_fn('pb_crew.svc_invite_begin(uuid, uuid, text, text)', 'billing_nov22:V1') = 0 then
    perform pb_stage.patch_fn('pb_crew.svc_invite_begin(uuid, uuid, text, text)',
      'if pb_billing.trial_seats_full(c.company_id) then return jsonb_build_object(''ok'', false, ''code'', ''pb:trial_seats''); end if; /* r16.67: beta = 5 accounts */',
      'if pb_billing.trial_seats_full(c.company_id) then return jsonb_build_object(''ok'', false, ''code'', ''pb:trial_seats''); end if; /* r16.67: beta = 5 accounts */
  if pb_billing.beta_closed(c.company_id) then return jsonb_build_object(''ok'', false, ''code'', ''pb:beta_ended''); end if; /* billing_nov22:V1 like join links */
  if pb_billing.read_only(c.company_id) then return jsonb_build_object(''ok'', false, ''code'', ''pb:read_only''); end if;', 'billing_nov22');
  end if;
  if pb_stage.count_in_fn('pb_crew.answer_invitation(uuid, uuid, boolean)', 'billing_nov22:V2') = 0 then
    perform pb_stage.patch_fn('pb_crew.answer_invitation(uuid, uuid, boolean)',
      '  v_before := pb_crew.seats(i.company_id);',
      '  if pb_billing.beta_closed(i.company_id) then return jsonb_build_object(''ok'', false, ''code'', ''pb:beta_ended'', ''company_name'', v_co.name); end if; /* billing_nov22:V2 */
  if pb_billing.read_only(i.company_id) then return jsonb_build_object(''ok'', false, ''code'', ''pb:read_only'', ''company_name'', v_co.name); end if;
  v_before := pb_crew.seats(i.company_id);', 'billing_nov22');
  end if;
end $p$;

-- ---------- privileges ----------
revoke all on function pb_billing.tz() from public, anon, authenticated;
revoke all on function pb_billing.today() from public, anon, authenticated;
revoke all on function pb_billing.day_start(date) from public, anon, authenticated;
revoke all on function pb_billing.due_on(pb_billing.accounts) from public, anon, authenticated;
revoke all on function pb_billing.lock_on(pb_billing.accounts) from public, anon, authenticated;
revoke all on function pb_billing.ind_due_on(pb_billing.individual_accounts) from public, anon, authenticated;
revoke all on function pb_billing.catchup_months(date, date) from public, anon, authenticated;
revoke all on function pb_billing.pool_people(uuid) from public, anon, authenticated;
revoke all on function pb_billing.crew_seats_json(uuid) from public, anon, authenticated;
revoke all on function pb_billing.owner_plan_json(uuid) from public, anon, authenticated;
-- Thomas's new owner tools: like the other pb_owner_* (admin + two-step login checked inside), callable when signed in only
revoke all on function public.pb_owner_billing_invoice_sent(uuid, date, integer, date) from public, anon;
revoke all on function public.pb_owner_billing_restart(uuid, integer, integer, text) from public, anon;
revoke all on function public.pb_owner_billing_edit(uuid, jsonb) from public, anon;
revoke all on function public.pb_owner_billing_next_interval(uuid, text) from public, anon;
grant execute on function public.pb_owner_billing_invoice_sent(uuid, date, integer, date) to authenticated;
grant execute on function public.pb_owner_billing_restart(uuid, integer, integer, text) to authenticated;
grant execute on function public.pb_owner_billing_edit(uuid, jsonb) to authenticated;
grant execute on function public.pb_owner_billing_next_interval(uuid, text) to authenticated;
