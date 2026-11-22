-- LOCAL ONLY: live function texts (public + crew) read Nov 22 2026.
CREATE OR REPLACE FUNCTION public.pb_my_plan()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (select jsonb_build_object('ok', true, 'plan', x.plan, 'trial_ends_at', x.trial_ends_at, 'expired', x.expired,
      'closed', pb_billing.writes_closed(x.company_id), 'individual', pb_billing.has_individual(auth.uid()),
      'paused', pb_billing.read_only(x.company_id),
      'requested', exists (select 1 from pb_billing.plan_requests r where r.user_id = auth.uid() and r.done_at is null),
      'days_left', case when x.plan = 'trial' then greatest(0, ceil(extract(epoch from (x.trial_ends_at - now())) / 86400))::int end,
      'limits', case when x.plan = 'trial' then pb_billing.trial_limits() end, 'prices', pb_billing.prices())
    from pb_billing.company_of(auth.uid()) x),
    -- no company now: removed from one, and not on their own plan yet
    (select jsonb_build_object('ok', true, 'plan', null, 'removed', jsonb_build_object('company', l.company_name, 'at', l.left_at),
        'individual', pb_billing.has_individual(auth.uid()),
        'requested', exists (select 1 from pb_billing.plan_requests r where r.user_id = auth.uid() and r.done_at is null), 'prices', pb_billing.prices())
     from pb_billing.left_company l where l.user_id = auth.uid() and l.dismissed_at is null and not pb_billing.has_individual(auth.uid())),
    jsonb_build_object('ok', true, 'plan', null, 'individual', pb_billing.has_individual(auth.uid()),
      'requested', exists (select 1 from pb_billing.plan_requests r where r.user_id = auth.uid() and r.done_at is null),
      'prices', pb_billing.prices()))
$function$;
CREATE OR REPLACE FUNCTION public.pb_owner_make_paid(p_company uuid, p_legal_name text, p_billing_email text, p_seats integer, p_interval text, p_founder boolean, p_plan_reading boolean, p_signed_by text, p_address jsonb DEFAULT '{}'::jsonb, p_contact text DEFAULT NULL::text, p_terms_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;
CREATE OR REPLACE FUNCTION public.pb_plan_prices()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pb_billing.prices() || jsonb_build_object('ok', true)
$function$;
CREATE OR REPLACE FUNCTION public.pb_plan_request(p_kind text DEFAULT 'individual'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
CREATE OR REPLACE FUNCTION public.pb_removed_dismiss()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update pb_billing.left_company set dismissed_at = now() where user_id = auth.uid();
  select jsonb_build_object('ok', true);
$function$;
CREATE OR REPLACE FUNCTION public.pb_owner_billing()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'individuals', pb_billing.individuals_json(),
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
end $function$;
CREATE OR REPLACE FUNCTION public.pb_owner_billing_catchup_paid(p_company uuid, p_seats integer, p_amount_cents integer DEFAULT NULL::integer, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;
CREATE OR REPLACE FUNCTION public.pb_owner_billing_paid(p_company uuid, p_from date, p_seats integer DEFAULT NULL::integer, p_amount_cents integer DEFAULT NULL::integer, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;
CREATE OR REPLACE FUNCTION public.pb_owner_billing_state(p_company uuid, p_state text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;
CREATE OR REPLACE FUNCTION public.pb_owner_individual_off(p_user uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  update public.subscriptions set status = 'canceled', updated_at = now() where user_id = p_user and tier = 'individual' and status = 'active';
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  update pb_billing.individual_accounts set state = 'canceled', updated_at = now() where user_id = p_user;  -- pricing Nov 20
  insert into pb_billing.events (user_id, kind, detail, actor) values (p_user, 'individual_off', jsonb_build_object('reason', left(p_reason, 300)), auth.uid());
  perform pb_audit.admin_note('individual_plan_off', null, p_user, jsonb_build_object('reason', left(p_reason, 300)));
  return jsonb_build_object('ok', true);
end $function$;
CREATE OR REPLACE FUNCTION public.pb_owner_individual_on(p_user uuid, p_interval text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
CREATE OR REPLACE FUNCTION public.pb_owner_individual_paid(p_user uuid, p_from date, p_interval text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;
CREATE OR REPLACE FUNCTION public.pb_owner_billing_setting_set(p_key text, p_value jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    when 'individual_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 1000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'individual_year_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 10000000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'plan_sheet_cents' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 0 and 100000 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    else null end;
  if v_ok is null then return jsonb_build_object('ok', false, 'code', 'pb:bad_key'); end if;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'pb:bad_value'); end if;
  update pb_billing.settings set value = coalesce(case when jsonb_typeof(p_value) = 'string' then to_jsonb(btrim(p_value #>> '{}')) else p_value end, 'null'::jsonb),
      updated_at = now(), updated_by = auth.uid() where key = p_key;
  insert into pb_billing.events (kind, detail, actor) values ('setting', jsonb_build_object('key', p_key, 'value', p_value), auth.uid());
  perform pb_audit.admin_note('billing_setting', null, null, jsonb_build_object('key', p_key, 'value', p_value));
  return jsonb_build_object('ok', true, 'settings', (select jsonb_object_agg(s.key, s.value) from pb_billing.settings s));
end $function$;
CREATE OR REPLACE FUNCTION public.pb_my_limits(p_feature text DEFAULT 'teacher'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;
CREATE OR REPLACE FUNCTION public.pb_crew_list()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); c record; v jsonb;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  select * into c from pb_crew.ctx(v_uid, null);
  select jsonb_build_object(
    'company_id', c.company_id,
    'company_name', (select co.name from public.companies co where co.id = c.company_id),
    'me', v_uid, 'is_owner', c.is_owner, 'owner_user_id', c.owner_id,
    'invites_today', pb_crew.invites_today(c.company_id), 'invite_limit', pb_crew.invite_limit(),
    'seats', pb_crew.seats(c.company_id), 'seats_included', pb_crew.seats_included(),
    'pm_ready', pb_pm.ready(), 'can_manage_pms', c.is_owner,
    'alerts', to_jsonb(pb_pm.settings_of(c.company_id)),
    'server_at', now(),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', p.uid,
        'email', u.email,
        'name', pb_crew.display_name(c.company_id, p.uid),
        'names', pb_crew.name_parts(c.company_id, p.uid),
        'role', m.role, 'title', case when m.role = 'pm' then coalesce(m.title, 'project_manager') end, /* feat_super */
        'member', m.user_id is not null,
        'joined_at', coalesce(m.joined_at, m.created_at),
        'invited_at', u.invited_at,
        'confirmed_at', coalesce(u.email_confirmed_at, u.confirmed_at),
        'last_sign_in_at', u.last_sign_in_at,
        'status', case when u.last_sign_in_at is not null then 'active'
                       when u.invited_at is not null and coalesce(u.email_confirmed_at, u.confirmed_at) is null then 'invited'
                       else 'not_signed_in' end,
        'owner', p.uid = c.owner_id,
        'manager', exists (select 1 from pb_reports.managers g where g.company_id = c.company_id and g.user_id = p.uid),
        'me', p.uid = v_uid)
      order by (p.uid = c.owner_id) desc, lower(coalesce(pb_crew.display_name(c.company_id, p.uid), u.email, '')))
      from (select mm.user_id uid from public.company_members mm where mm.company_id = c.company_id
            union select c.owner_id where c.owner_id is not null) p
      left join public.company_members m on m.user_id = p.uid and m.company_id = c.company_id
      left join auth.users u on u.id = p.uid), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'email', u.email,
        'label', pb_crew.invitation_label(i.id), -- the name the company typed (never the invitee's own name before they accept)
        'role', i.role, 'title', case when i.role = 'pm' then coalesce(i.title, 'project_manager') end, 'created_at', i.created_at, 'expires_at', i.created_at + interval '7 days',
        'expired', pb_crew.invitation_expired(i.created_at)) order by i.created_at desc)
      from pb_crew.invitations i left join auth.users u on u.id = i.user_id
      where i.company_id = c.company_id and i.status = 'pending'), '[]'::jsonb)
  ) into v;
  return v;
end $function$;
CREATE OR REPLACE FUNCTION pb_crew.svc_invite_begin(p_actor uuid, p_expect_company uuid, p_email text, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
/* pb_sec S7 neutral invite */
declare c record; v_email text := pb_crew.clean_email(p_email); v_user uuid; v_m record; v_id bigint; v_inv uuid;
begin
  perform pb_crew.require_service();
  select * into c from pb_crew.ctx(p_actor, p_expect_company);
  if not pb_crew.valid_role(p_role) then return jsonb_build_object('ok', false, 'code', 'pb:bad_role'); end if;
  if p_role = 'pm' and not c.is_owner then
    perform pb_crew.log(c.company_id, p_actor, 'invite', null, v_email, null, (jsonb_build_object('role', p_role) || pb_crew.title_note()), 'refused', 'pb:owner_only', null);
    return jsonb_build_object('ok', false, 'code', 'pb:owner_only');
  end if;
  if p_role = 'pm' and not pb_pm.ready() then return jsonb_build_object('ok', false, 'code', 'pb:not_ready'); end if;
  if v_email is null then return jsonb_build_object('ok', false, 'code', 'pb:bad_email'); end if;
  perform pg_advisory_xact_lock(hashtextextended('pb_crew_invite:' || c.company_id::text, 0));
  if pb_crew.invites_today(c.company_id) >= pb_crew.invite_limit() then
    perform pb_crew.log(c.company_id, p_actor, 'invite', null, v_email, null, (jsonb_build_object('role', p_role) || pb_crew.title_note()), 'refused', 'pb:invite_limit', null);
    return jsonb_build_object('ok', false, 'code', 'pb:invite_limit', 'limit', pb_crew.invite_limit());
  end if;
  if pb_billing.trial_seats_full(c.company_id) then return jsonb_build_object('ok', false, 'code', 'pb:trial_seats'); end if; /* r16.67: beta = 5 accounts */
  v_user := pb_crew.find_account(v_email);
  if v_user is null then
    if not pb_pm.email_budget_take('invite', 1) then return jsonb_build_object('ok', false, 'code', 'pb:email_limit'); end if; /* feat_server:budget */
    v_id := pb_crew.log(c.company_id, p_actor, 'invite', null, v_email, null, (jsonb_build_object('role', p_role) || pb_crew.title_note()), 'requested', null, null);
    return jsonb_build_object('ok', true, 'need_invite', true, 'audit_id', v_id, 'email', v_email, 'company_id', c.company_id);
  end if;
  select m.company_id, m.role into v_m from public.company_members m where m.user_id = v_user;
  if v_user = c.owner_id then
    perform pb_crew.log(c.company_id, p_actor, 'invitation', v_user, v_email, null, (jsonb_build_object('role', p_role) || pb_crew.title_note()), 'refused', 'pb:is_owner', null);
    return jsonb_build_object('ok', false, 'code', 'pb:is_owner');
  end if;
  if v_m.company_id = c.company_id then
    perform pb_crew.log(c.company_id, p_actor, 'invitation', v_user, v_email, null, (jsonb_build_object('role', p_role) || pb_crew.title_note()), 'refused', 'pb:already_member', null);
    return jsonb_build_object('ok', false, 'code', 'pb:already_member', 'role', v_m.role);
  end if;
  /* S7: an account in another company gets the same in-app invitation (accepting it stays refused) */
  update pb_crew.invitations set status = 'expired', decided_at = now()
    where company_id = c.company_id and user_id = v_user and status = 'pending' and pb_crew.invitation_expired(created_at);
  if exists (select 1 from pb_crew.invitations i where i.company_id = c.company_id and i.user_id = v_user and i.status = 'pending') then
    perform pb_crew.log(c.company_id, p_actor, 'invitation', v_user, v_email, null, (jsonb_build_object('role', p_role) || pb_crew.title_note()), 'refused', 'pb:already_invited', null);
    return jsonb_build_object('ok', false, 'code', 'pb:already_invited');
  end if;
  insert into pb_crew.invitations (company_id, user_id, role, invited_by) values (c.company_id, v_user, p_role, p_actor) returning id into v_inv;
  perform pb_crew.log(c.company_id, p_actor, 'invitation', v_user, v_email, null, (jsonb_build_object('role', p_role, 'invitation', v_inv) || pb_crew.title_note() /* feat_super */ || case when pb_crew.in_other_company(v_user, c.company_id) then '{"other_company": true}'::jsonb else '{}'::jsonb end), 'ok', null, null);
  return jsonb_build_object('ok', true, 'done', true, 'added', 'invitation', 'invitation_id', v_inv, 'company_id', c.company_id);
end $function$;
CREATE OR REPLACE FUNCTION pb_crew.answer_invitation(p_user uuid, p_invitation uuid, p_accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare i pb_crew.invitations; v_co record; v_before int;
begin
  if p_user is null then raise exception 'pb:signed_out'; end if;
  if p_invitation is null or p_accept is null then return jsonb_build_object('ok', false, 'code', 'pb:bad_request'); end if;
  select * into i from pb_crew.invitations x where x.id = p_invitation and x.user_id = p_user for update;
  if i.id is null then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  select c.name, c.status, c.owner_user_id into v_co from public.companies c where c.id = i.company_id;
  if i.status <> 'pending' then return jsonb_build_object('ok', false, 'code', 'pb:already_answered', 'status', i.status, 'company_name', v_co.name); end if;
  if pb_crew.invitation_expired(i.created_at) then
    perform pb_crew.log(i.company_id, p_user, case when p_accept then 'accept' else 'decline' end, p_user, null, null, jsonb_build_object('invitation', i.id), 'refused', 'pb:invitation_expired', null);
    return jsonb_build_object('ok', false, 'code', 'pb:invitation_expired', 'company_name', v_co.name);
  end if;
  if not p_accept then
    update pb_crew.invitations set status = 'declined', decided_at = now() where id = i.id;
    perform pb_crew.log(i.company_id, p_user, 'decline', p_user, null, jsonb_build_object('invitation', i.id, 'role', i.role), jsonb_build_object('status', 'declined'), 'ok', null, null);
    return jsonb_build_object('ok', true, 'status', 'declined', 'company_id', i.company_id, 'company_name', v_co.name, 'role', i.role);
  end if;
  if v_co.status is distinct from 'active' then
    perform pb_crew.log(i.company_id, p_user, 'accept', p_user, null, null, jsonb_build_object('invitation', i.id), 'refused', 'pb:company_inactive', null);
    return jsonb_build_object('ok', false, 'code', 'pb:company_inactive', 'company_name', v_co.name);
  end if;
  -- a PM invitation is good only while the person who made it is still the owner
  if i.role = 'pm' and i.invited_by is distinct from v_co.owner_user_id then
    perform pb_crew.log(i.company_id, p_user, 'accept', p_user, null, null, jsonb_build_object('invitation', i.id), 'refused', 'pb:owner_only', null);
    return jsonb_build_object('ok', false, 'code', 'pb:invitation_expired', 'company_name', v_co.name);
  end if;
  if exists (select 1 from public.company_members m where m.user_id = p_user and m.company_id = i.company_id) then
    update pb_crew.invitations set status = 'accepted', decided_at = now() where id = i.id;
    return jsonb_build_object('ok', true, 'status', 'accepted', 'already', true, 'company_id', i.company_id, 'company_name', v_co.name,
      'role', (select m.role from public.company_members m where m.user_id = p_user and m.company_id = i.company_id)); -- their real role (review N4)
  end if;
  if pb_crew.in_other_company(p_user, i.company_id) then
    return pb_crew.refuse_other_company(i.company_id, p_user, 'accept', p_user, null, jsonb_build_object('invitation', i.id), null);
  end if;
  v_before := pb_crew.seats(i.company_id);
  insert into public.company_members (company_id, user_id, role) values (i.company_id, p_user, i.role) on conflict (user_id) do nothing;
  if not found then
    return pb_crew.refuse_other_company(i.company_id, p_user, 'accept', p_user, null, jsonb_build_object('invitation', i.id), null);
  end if;
  if i.role = 'pm' then insert into pb_reports.managers (company_id, user_id) values (i.company_id, p_user) on conflict do nothing; end if;
  update pb_crew.invitations set status = 'accepted', decided_at = now() where id = i.id;
  perform pb_crew.after_accept(i.id, i.company_id, p_user);
  perform pb_crew.log(i.company_id, p_user, 'accept', p_user, null, jsonb_build_object('invitation', i.id), jsonb_build_object('role', i.role, 'member', true), 'ok', null, null);
  return jsonb_build_object('ok', true, 'status', 'accepted', 'company_id', i.company_id, 'company_name', v_co.name, 'role', i.role,
    'seats_before', v_before, 'seats_after', pb_crew.seats(i.company_id));
end $function$;
-- ACLs like live: the app RPCs (and Thomas's owner tools, which check admin + aal2 inside) are open to authenticated
grant execute on function public.pb_my_plan(), public.pb_plan_prices(), public.pb_plan_request(text), public.pb_removed_dismiss(),
  public.pb_owner_billing(), public.pb_owner_make_paid(uuid, text, text, integer, text, boolean, boolean, text, jsonb, text, text),
  public.pb_owner_billing_catchup_paid(uuid, integer, integer, text), public.pb_owner_billing_paid(uuid, date, integer, integer, text),
  public.pb_owner_billing_state(uuid, text, text), public.pb_owner_individual_off(uuid, text), public.pb_owner_individual_on(uuid, text),
  public.pb_owner_individual_paid(uuid, date, text), public.pb_owner_billing_setting_set(text, jsonb), public.pb_my_limits(text), public.pb_crew_list()
  to authenticated;
grant execute on function pb_crew.svc_invite_begin(uuid, uuid, text, text), pb_crew.answer_invitation(uuid, uuid, boolean) to service_role;
