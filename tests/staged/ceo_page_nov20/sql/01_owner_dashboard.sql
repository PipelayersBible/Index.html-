-- Owner Dashboard (staged Nov 20 2026, on r17.11). Safe to run twice. Run as postgres, in one transaction.
-- Adds two read-only functions; changes no table, no existing function, no data:
--   public.pb_owner_dashboard(p_days integer default 30) -> jsonb   (the page's one call)
--   pb_support.dash_uc()   helper: who belongs to which active company (not reachable from the API)
-- Same gate as Beta Accounts (pb_owner_overview / pb_owner_billing): pb_support.admin_ok(auth.uid(), aal) = the app
-- owner's login, with the two-step code when that login has one. Anyone else gets 'pb:not_allowed'.
-- Reads pb_auth.flags only when it exists (one_device_nov20), by dynamic SQL, so this applies before or after that.
-- Never returns management-report text, feedback text, passwords, tokens or locations.

create or replace function pb_support.dash_uc()
 returns table (user_id uuid, company_id uuid, is_owner boolean) language sql stable security definer set search_path to ''
as $function$
  select c.owner_user_id, c.id, true from public.companies c where c.status = 'active' and c.owner_user_id is not null
  union
  select m.user_id, m.company_id, false from public.company_members m join public.companies c on c.id = m.company_id and c.status = 'active'
   where m.user_id is not null and m.user_id is distinct from c.owner_user_id
$function$;
revoke all on function pb_support.dash_uc() from public, anon, authenticated;

create or replace function public.pb_owner_dashboard(p_days integer default 30)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
  d int := least(greatest(coalesce(p_days, 30), 7), 90);
  t date := current_date;
  m0 date := date_trunc('month', current_date)::date;
  L jsonb := pb_billing.plan_limits();
  v_money jsonb; v_cost jsonb; v_growth jsonb; v_sec jsonb; v_rel jsonb; v_safety jsonb; v_ask jsonb; v_attn jsonb := '[]'::jsonb;
  v_share jsonb; v_mrr numeric := 0; v_ai_mtd numeric := 0; v_fixed numeric;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;

  ---------------------------------------------------------------- MONEY
  with co as (
    select c.id, c.name, c.plan, c.trial_ends_at, c.created_at, a as acct,
      pb_billing.seats_used(c.id) seats_used,
      case when a.company_id is null then null else pb_billing.state_of(a) end bstate,
      case when a.company_id is null then 0
           when pb_billing.state_of(a) in ('canceled', 'read_only') then 0
           else pb_billing.amount_cents(a, greatest(a.seats_paid, a.base_seats))::numeric / case when a.billing_interval = 'year' then 12 else 1 end end mrr_cents
    from public.companies c left join pb_billing.accounts a on a.company_id = c.id where c.status = 'active'),
  ind as (
    select i.*, case when i.state = 'canceled' or current_date >= i.paid_through + i.grace_days then 0
                     when i.billing_interval = 'year' then coalesce(i.year_cents, 0)::numeric / 12 else coalesce(i.cents, 0) end mrr_cents
    from pb_billing.individual_accounts i)
  select jsonb_build_object(
    'mrr_cents', round((select coalesce(sum(mrr_cents), 0) from co) + (select coalesce(sum(mrr_cents), 0) from ind)),
    'company_mrr_cents', round((select coalesce(sum(mrr_cents), 0) from co)),
    'individual_mrr_cents', round((select coalesce(sum(mrr_cents), 0) from ind)),
    'individuals', jsonb_build_object('n', (select count(*) from ind), 'active', (select count(*) from ind where mrr_cents > 0)),
    'counts', jsonb_build_object(
       'beta', (select count(*) from co where plan = 'trial' and coalesce(trial_ends_at, now()) > now()),
       'beta_ended', (select count(*) from co where plan = 'trial' and coalesce(trial_ends_at, now()) <= now()),
       'paid', (select count(*) from co where plan = 'paid' and coalesce(bstate, 'active') in ('active', 'past_due')),
       'paid_no_billing', (select count(*) from co where plan = 'paid' and bstate is null),
       'past_due', (select count(*) from co where bstate = 'past_due'),
       'read_only', (select count(*) from co where bstate = 'read_only'),
       'canceled', (select count(*) from co where bstate = 'canceled'),
       'seats_used', (select coalesce(sum(seats_used), 0) from co),
       'seats_paid', (select coalesce(sum((acct).seats_paid), 0) from co where bstate in ('active', 'past_due'))),
    -- if every running beta became paid today at its seats (monthly price)
    'beta_pipeline_cents', (select coalesce(sum(pb_billing.setting_int('base_cents', 9900)
                              + greatest(0, seats_used - pb_billing.setting_int('base_seats', 5)) * pb_billing.setting_int('seat_cents', 1200)), 0)
                            from co where plan = 'trial' and coalesce(trial_ends_at, now()) > now()),
    'companies', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plan', plan, 'trial_ends_at', trial_ends_at,
        'days_left', case when plan = 'trial' and trial_ends_at is not null then (trial_ends_at::date - t) end,
        'created_at', created_at, 'seats_used', seats_used, 'seats_paid', (acct).seats_paid, 'state', coalesce(bstate, case when plan = 'paid' then 'no_billing' end),
        'interval', (acct).billing_interval, 'paid_through', (acct).paid_through, 'founder_until', (acct).founder_until,
        'tax_state', (acct).billing_address->>'state', 'tax_status', (acct).tax_status, 'mrr_cents', round(mrr_cents))
        order by (plan = 'trial') desc, trial_ends_at nulls last, name) from co), '[]'::jsonb),
    'renewals_30', coalesce((select jsonb_agg(jsonb_build_object('company', name, 'paid_through', (acct).paid_through, 'interval', (acct).billing_interval,
        'amount_cents', pb_billing.amount_cents(acct, seats_used), 'founder', (acct).founder_until is not null and (acct).paid_through < (acct).founder_until) order by (acct).paid_through)
        from co where bstate in ('active', 'past_due') and (acct).paid_through <= t + 30), '[]'::jsonb),
    'founder_locks', coalesce((select jsonb_agg(jsonb_build_object('company', name, 'until', (acct).founder_until) order by (acct).founder_until)
        from co where (acct).founder_until is not null and (acct).founder_until >= t), '[]'::jsonb),
    'prices', jsonb_build_object('base_cents', pb_billing.setting_int('base_cents', 9900), 'base_seats', pb_billing.setting_int('base_seats', 5),
        'seat_cents', pb_billing.setting_int('seat_cents', 1200), 'individual_cents', pb_billing.setting_int('individual_cents', 1500)),
    'stripe_connected', exists (select 1 from pb_billing.accounts a where a.stripe_subscription_id is not null))
  into v_money;
  v_mrr := coalesce((v_money->>'mrr_cents')::numeric, 0);

  ---------------------------------------------------------------- COSTS
  v_ai_mtd := coalesce((select sum(k.usd) from pb_billing.ai_cost k where k.day >= m0), 0);
  v_fixed := nullif(pb_billing.setting_int('owner_fixed_month_cents', -1), -1);
  with pool as (
    select p.owner_key, sum(p.usd) usd, sum(p.n) n from pb_billing.ai_pool p where p.day >= m0 group by 1),
  stops as (
    select c.id::text k, c.name, case
        when c.plan = 'trial' then (pb_billing.limits_of(c.id)->'beta'->>'usd_month')::numeric
        else (pb_billing.limits_of(c.id)->'company'->>'usd_base')::numeric
             + (pb_billing.limits_of(c.id)->'company'->>'usd_per_extra')::numeric * greatest(0, pb_billing.paid_people(c.id) - pb_billing.setting_int('base_seats', 5)) end stop
      from public.companies c where c.status = 'active'
    union all
    select 'u:' || i.user_id::text, coalesce((select u.email::text from auth.users u where u.id = i.user_id), 'Individual plan'), (L->'individual'->>'usd_month')::numeric
      from pb_billing.individual_accounts i)
  select jsonb_build_object(
    'ai_today_usd', round(coalesce((select sum(k.usd) from pb_billing.ai_cost k where k.day = t), 0), 2),
    'ai_mtd_usd', round(v_ai_mtd, 2),
    'ai_window_usd', round(coalesce((select sum(k.usd) from pb_billing.ai_cost k where k.day > t - d), 0), 2),
    'ai_by_day', coalesce((select jsonb_agg(jsonb_build_object('day', g::date, 'usd', round(coalesce((select sum(k.usd) from pb_billing.ai_cost k where k.day = g::date), 0), 3)) order by g)
        from generate_series(t - d + 1, t, interval '1 day') g), '[]'::jsonb),
    'ai_by_feature', coalesce((select jsonb_agg(jsonb_build_object('feature', x.feature, 'n', x.n, 'usd', round(x.usd, 3)) order by x.usd desc)
        from (select k.feature, sum(k.n)::int n, sum(k.usd) usd from pb_billing.ai_cost k where k.day > t - d group by 1) x), '[]'::jsonb),
    'ai_uses_by_feature', coalesce((select jsonb_object_agg(x.feature, x.n) from (select u.feature, sum(u.count)::int n from public.ai_usage u where u.day > t - d group by 1) x), '{}'::jsonb),
    'ai_by_company', coalesce((select jsonb_agg(jsonb_build_object('company', x.name, 'usd', round(x.usd, 2), 'n', x.n) order by x.usd desc)
        from (select coalesce(c.name, 'No company / individual') name, sum(k.usd) usd, sum(k.n)::int n from pb_billing.ai_cost k
              left join lateral (select uc.company_id from pb_support.dash_uc() uc where uc.user_id = k.user_id order by uc.is_owner desc limit 1) uc on true
              left join public.companies c on c.id = uc.company_id where k.day > t - d group by 1) x), '[]'::jsonb),
    'stops', coalesce((select jsonb_agg(jsonb_build_object('who', s.name, 'usd', round(coalesce(p.usd, 0), 2), 'stop', s.stop,
        'pct', case when s.stop > 0 then round(100 * coalesce(p.usd, 0) / s.stop) end) order by coalesce(p.usd, 0) / nullif(s.stop, 0) desc nulls last)
        from stops s left join pool p on p.owner_key = s.k), '[]'::jsonb),
    'fixed_month_cents', v_fixed,
    'margin_mtd_cents', round(v_mrr - v_ai_mtd * 100 - coalesce(v_fixed, 0)),
    'storage_gb', coalesce((select jsonb_object_agg(x.bucket_id, x.gb) from (select o.bucket_id, round(sum(coalesce((o.metadata->>'size')::bigint, 0)) / 1e9, 3) gb
        from storage.objects o group by 1) x), '{}'::jsonb),
    'db_gb', round(pg_database_size(current_database()) / 1e9, 3),
    'plan_sheets_mtd', coalesce((select sum(s.pages) from pb_plans.sets s where s.created_at >= m0 and s.state <> 'removed'), 0),
    'plan_usd_mtd', round(coalesce((select sum(s.usd) from pb_plans.sets s where s.created_at >= m0), 0), 2),
    'emails_mtd', coalesce((select jsonb_object_agg(x.kind, x.n) from (select b.kind, sum(b.n)::int n from pb_pm.email_budget b where b.at >= m0 group by 1) x), '{}'::jsonb),
    'pushes', jsonb_build_object('sent', (select count(*) from pb_push.outbox o where o.sent_at > now() - make_interval(days => d)),
        'gave_up', (select count(*) from pb_push.outbox o where o.given_up_at > now() - make_interval(days => d))))
  into v_cost;

  ---------------------------------------------------------------- GROWTH AND USE
  select jsonb_build_object(
    'logins', (select count(*) from auth.users),
    'new_logins', (select count(*) from auth.users u where u.created_at > now() - make_interval(days => d)),
    'new_companies', (select count(*) from public.companies c where c.status = 'active' and c.created_at > now() - make_interval(days => d)),
    'active_today', (select count(distinct u.user_id) from pb_billing.usage u where u.day = t),
    'active_7', (select count(distinct u.user_id) from pb_billing.usage u where u.day > t - 7),
    'active_30', (select count(distinct u.user_id) from pb_billing.usage u where u.day > t - 30),
    'active_companies_7', (select count(distinct uc.company_id) from pb_billing.usage u join pb_support.dash_uc() uc on uc.user_id = u.user_id where u.day > t - 7),
    'usage_since', (select min(u.day) from pb_billing.usage u),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', g::date,
        'active', (select count(distinct u.user_id) from pb_billing.usage u where u.day = g::date),
        'signups', (select count(*) from auth.users x where x.created_at::date = g::date),
        'runs', (select count(*) from pb_prod.run_records r where r.created_at::date = g::date and r.removed_at is null),
        'feet', (select round(coalesce(sum(r.laid_ft), 0)) from pb_prod.run_records r where r.work_date = g::date and r.removed_at is null),
        'reports', (select count(*) from pb_daily.reports r where r.received_at::date = g::date),
        'entries', (select count(*) from pb_prod.entries e where e.created_at::date = g::date and not e.voided),
        'permits', (select count(*) from pb_safety.permits p where p.first_backed_up_at::date = g::date),
        'ask', (select coalesce(sum(a.count), 0) from public.ai_usage a where a.day = g::date and a.feature in ('teacher', 'analysis')),
        'crashes', (select coalesce(sum(u.n), 0) from pb_billing.usage u where u.day = g::date and u.ev = 'crash')) order by g)
        from generate_series(t - d + 1, t, interval '1 day') g), '[]'::jsonb),
    'totals', jsonb_build_object(
        'runs', (select count(*) from pb_prod.run_records r where r.created_at > now() - make_interval(days => d) and r.removed_at is null),
        'feet', (select round(coalesce(sum(r.laid_ft), 0)) from pb_prod.run_records r where r.work_date > t - d and r.removed_at is null),
        'reports', (select count(*) from pb_daily.reports r where r.received_at > now() - make_interval(days => d)),
        'entries', (select count(*) from pb_prod.entries e where e.created_at > now() - make_interval(days => d) and not e.voided),
        'permits', (select count(*) from pb_safety.permits p where p.first_backed_up_at > now() - make_interval(days => d)),
        'ask', (select coalesce(sum(a.count), 0) from public.ai_usage a where a.day > t - d and a.feature in ('teacher', 'analysis')),
        'plan_sets', (select count(*) from pb_plans.sets s where s.created_at > now() - make_interval(days => d))),
    'invites', jsonb_build_object(
        'sent', (select count(*) from pb_crew.audit a where a.action = 'invite' and a.outcome = 'ok' and a.at > now() - make_interval(days => d)),
        'accepted', (select count(*) from pb_crew.invitations i where i.status = 'accepted' and i.decided_at > now() - make_interval(days => d)),
        'refused', (select count(*) from pb_crew.audit a where a.outcome = 'refused' and a.at > now() - make_interval(days => d)),
        'links_made', (select count(*) from pb_onboard.links l where l.created_at > now() - make_interval(days => d)),
        'links_used', (select count(*) from pb_onboard.links l where l.used_at > now() - make_interval(days => d)),
        'link_misses', (select count(*) from pb_onboard.misses x where x.at > now() - make_interval(days => d))),
    -- hours from sign-up to the first run sent, daily report or production entry, for logins made in the last 90 days
    'first_value', (select jsonb_build_object('n', count(*), 'reached', count(fv), 'median_hours',
          round((percentile_cont(0.5) within group (order by extract(epoch from fv - created_at) / 3600))::numeric, 1))
        from (select u.created_at, least(
                (select min(r.created_at) from pb_prod.run_records r where r.user_id = u.id),
                (select min(r.received_at) from pb_daily.reports r where r.foreman_uid = u.id),
                (select min(e.created_at) from pb_prod.entries e where e.user_id = u.id)) fv
              from auth.users u where u.created_at > now() - interval '90 days') x),
    'quiet', coalesce((select jsonb_agg(q.j order by q.last) from (
        select jsonb_build_object('who', coalesce(pb_crew.display_name(uc.company_id, x.user_id), (select u.email::text from auth.users u where u.id = x.user_id), 'A login'),
                 'company', c.name, 'last', x.last, 'days', t - x.last) j, x.last
          from (select u.user_id, max(u.day) last from pb_billing.usage u group by 1) x
          left join lateral (select uc.company_id from pb_support.dash_uc() uc where uc.user_id = x.user_id order by uc.is_owner desc limit 1) uc on true
          left join public.companies c on c.id = uc.company_id
         where x.last <= t - 7 and x.last > t - 60 limit 25) q), '[]'::jsonb),
    'quiet_companies', coalesce((select jsonb_agg(c.name order by c.name) from public.companies c where c.status = 'active'
        and not exists (select 1 from pb_billing.usage u join pb_support.dash_uc() uc on uc.user_id = u.user_id where uc.company_id = c.id and u.day > t - 7)), '[]'::jsonb),
    'screens', coalesce((select jsonb_agg(jsonb_build_object('screen', x.ev, 'n', x.n, 'people', x.p) order by x.n desc) from (
        select substr(u.ev, 5) ev, sum(u.n)::int n, count(distinct u.user_id)::int p from pb_billing.usage u where u.ev like 'scr:%' and u.day > t - d
        group by 1 order by 2 desc limit 15) x), '[]'::jsonb),
    'lang_es', (select coalesce(sum(u.n), 0) from pb_billing.usage u where u.ev = 'lang:es' and u.day > t - d))
  into v_growth;

  ---------------------------------------------------------------- ACCOUNT SHARING AND SECURITY
  if to_regclass('pb_auth.flags') is not null then
    execute $q$
      select jsonb_build_object('live', true,
        'by_kind_7', coalesce((select jsonb_object_agg(x.kind, x.n) from (select f.kind, count(*) n from pb_auth.flags f where f.at > now() - interval '7 days' group by 1) x), '{}'::jsonb),
        'by_kind_30', coalesce((select jsonb_object_agg(x.kind, x.n) from (select f.kind, count(*) n from pb_auth.flags f where f.at > now() - interval '30 days' group by 1) x), '{}'::jsonb),
        'top', coalesce((select jsonb_agg(x.j order by x.n desc) from (
            select jsonb_build_object('who', coalesce(case when c.owner_user_id = f.user_id then 'Company account' else pb_crew.display_name(c.id, f.user_id) end, u.email::text, 'A login'),
                     'email', u.email::text, 'company', c.name, 'n', count(*), 'kinds', jsonb_agg(distinct f.kind), 'last', max(f.at)) j, count(*) n
              from pb_auth.flags f left join auth.users u on u.id = f.user_id left join public.companies c on c.id = f.company_id
             where f.at > now() - interval '30 days' group by f.user_id, u.email, c.id, c.name, c.owner_user_id order by count(*) desc limit 10) x), '[]'::jsonb))
    $q$ into v_share;
  else
    v_share := jsonb_build_object('live', false);
  end if;
  select jsonb_build_object(
    'share', v_share,
    'many_sessions', coalesce((select jsonb_agg(jsonb_build_object('who', coalesce(u.email::text, 'A login'), 'company', c.name, 'sessions', x.n) order by x.n desc)
        from (select s.user_id, count(*) n from auth.sessions s where s.not_after is null or s.not_after > now() group by 1 having count(*) >= 3) x
        left join auth.users u on u.id = x.user_id
        left join lateral (select uc.company_id from pb_support.dash_uc() uc where uc.user_id = x.user_id order by uc.is_owner desc limit 1) uc on true
        left join public.companies c on c.id = uc.company_id), '[]'::jsonb),
    'mfa', jsonb_build_object('logins', (select count(*) from auth.users),
        'on', (select count(distinct f.user_id) from auth.mfa_factors f where f.status = 'verified'),
        'bosses_without', coalesce((select jsonb_agg(jsonb_build_object('who', coalesce(u.email::text, 'A login'), 'company', c.name, 'role', case when uc.is_owner then 'company account' else m.role end) order by c.name)
          from pb_support.dash_uc() uc join public.companies c on c.id = uc.company_id left join auth.users u on u.id = uc.user_id
          left join public.company_members m on m.company_id = uc.company_id and m.user_id = uc.user_id
          where (uc.is_owner or m.role = 'pm')
            and not exists (select 1 from auth.mfa_factors f where f.user_id = uc.user_id and f.status = 'verified')), '[]'::jsonb)),
    'removed', (select count(*) from pb_crew.audit a where a.action = 'remove' and a.outcome = 'ok' and a.at > now() - make_interval(days => d)),
    'refused', (select count(*) from pb_crew.audit a where a.outcome = 'refused' and a.at > now() - make_interval(days => d)),
    'admin_log', (select count(*) from pb_audit.admin_log a where a.at > now() - make_interval(days => d)),
    'admin_log_last', (select max(a.at) from pb_audit.admin_log a),
    'billing_actions', (select count(*) from pb_billing.events e where e.at > now() - make_interval(days => d)),
    'failed_signins_available', exists (select 1 from auth.audit_log_entries limit 1))
  into v_sec;

  ---------------------------------------------------------------- RELIABILITY
  select jsonb_build_object(
    'backup_problem', pb_backup.health(now()),
    'backup_last', (select jsonb_build_object('at', b.started_at, 'status', b.status, 'files', b.files, 'bytes', b.bytes) from pb_backup.runs b order by b.id desc limit 1),
    'offsite_last', (select jsonb_build_object('at', o.at, 'copied', o.copied, 'failed', o.failed) from pb_backup.offsite_runs o order by o.id desc limit 1),
    'offsite_files', (select count(*) from pb_backup.offsite),
    'seal_checks', jsonb_build_object('n', (select count(*) from pb_prod.run_seal_checks), 'bad', (select count(*) from pb_prod.run_seal_checks x where not x.matches),
        'last', (select max(x.checked_at) from pb_prod.run_seal_checks x)),
    'photo_checks', jsonb_build_object('n', (select count(*) from pb_prod.run_photo_checks), 'bad', (select count(*) from pb_prod.run_photo_checks x where not x.matches),
        'last', (select max(x.checked_at) from pb_prod.run_photo_checks x)),
    'jobs', jsonb_build_array(
        jsonb_build_object('name', 'Weather alerts', 'last', (select max(w.done_at) from pb_daily.wx_runs w), 'failed', (select coalesce(sum(w.failed), 0) from pb_daily.wx_runs w where w.local_date > t - 7),
          'stuck', (select count(*) from pb_daily.wx_runs w where w.done_at is null and w.claimed_at < now() - interval '1 hour')),
        jsonb_build_object('name', '811 reminders', 'last', (select max(x.ran_at) from pb_prod.locate_runs x)),
        jsonb_build_object('name', 'Order-by alerts', 'last', (select max(x.ran_at) from pb_mat.orderby_runs x)),
        jsonb_build_object('name', 'PM daily email', 'last', (select max(x.built_at) from pb_pm.digest_runs x))),
    'push_subs', jsonb_build_object('n', (select count(*) from pb_push.subscriptions), 'dead', (select count(*) from pb_push.subscriptions s where s.dead_at is not null)),
    'push_gave_up_7', (select count(*) from pb_push.outbox o where o.given_up_at > now() - interval '7 days'),
    'email_gave_up_7', (select count(*) from pb_pm.email_outbox o where o.given_up_at > now() - interval '7 days'),
    'email_waiting', (select count(*) from pb_pm.email_outbox o where o.sent_at is null and o.given_up_at is null),
    'server_errors_7', (select count(*) from pb_prod.pass_errors e where e.at > now() - interval '7 days'),
    'server_errors', coalesce((select jsonb_agg(jsonb_build_object('at', e.at, 'place', e.place, 'message', left(e.message, 140)) order by e.at desc)
        from (select * from pb_prod.pass_errors x order by x.at desc limit 5) e), '[]'::jsonb),
    'legacy_7', jsonb_build_object('people', (select count(distinct x.user_id) from pb_prod.legacy_write_days x where x.day > t - 7),
        'writes', (select coalesce(sum(x.ins + x.upd), 0) from pb_prod.legacy_write_days x where x.day > t - 7),
        'rpcs', (select coalesce(sum(x.n), 0) from pb_prod.legacy_rpc_days x where x.day > t - 7)),
    'plans_stuck', coalesce((select jsonb_agg(jsonb_build_object('company', c.name, 'title', s.title, 'pages', s.pages, 'since', s.created_at) order by s.created_at)
        from pb_plans.sets s left join public.companies c on c.id = s.company_id
        where s.state in ('uploading', 'reading') and s.created_at < now() - interval '2 hours'), '[]'::jsonb),
    -- builds: the newest build:* usage event per person in 14 days (the app patch adds it; empty until then)
    'builds', coalesce((select jsonb_agg(jsonb_build_object('build', x.b, 'people', x.n) order by x.b desc) from (
        select y.b, count(*)::int n from (select distinct on (u.user_id) u.user_id, substr(u.ev, 7) b from pb_billing.usage u
          where u.ev like 'build:%' and u.day > t - 14 order by u.user_id, u.day desc, u.ev desc) y group by 1) x), '[]'::jsonb),
    'crashes_7', (select coalesce(sum(u.n), 0) from pb_billing.usage u where u.ev = 'crash' and u.day > t - 7),
    'crashes_prev_7', (select coalesce(sum(u.n), 0) from pb_billing.usage u where u.ev = 'crash' and u.day > t - 14 and u.day <= t - 7),
    'feedback_builds', coalesce((select jsonb_object_agg(x.b, x.n) from (select split_part(m.app_build, ' ', 1) b, count(*) n from pb_support.messages m
        where m.created_at > now() - make_interval(days => d) group by 1) x), '{}'::jsonb))
  into v_rel;

  ---------------------------------------------------------------- SAFETY AND LEGAL
  select jsonb_build_object(
    'open_permits', coalesce((select jsonb_agg(jsonb_build_object('company', c.name, 'space', left(o.space, 60), 'job', o.job_number,
        'opened', o.first_saved_at, 'last_saved', o.saved_at, 'hours', round((extract(epoch from now() - o.first_saved_at) / 3600)::numeric, 1)) order by o.first_saved_at)
        from pb_safety.open_permits o left join public.companies c on c.id = o.company_id), '[]'::jsonb),
    'em_notices_30', (select count(distinct (e.permit_ref, e.started_at)) from pb_safety.em_notices e where e.created_at > now() - interval '30 days'),
    'em_last', (select max(e.created_at) from pb_safety.em_notices e),
    'em_refused_30', (select count(*) from pb_safety.em_refused e where e.at > now() - interval '30 days'),
    'permits_window', (select count(*) from pb_safety.permits p where p.first_backed_up_at > now() - make_interval(days => d)),
    'locates', jsonb_build_object(
        'expired_open', coalesce((select jsonb_agg(jsonb_build_object('company', c.name, 'job', l.job_number, 'ticket', l.ticket_no, 'expired', l.expires_at) order by l.expires_at)
           from pb_prod.locates l left join public.companies c on c.id = l.company_id where not l.closed and l.expires_at < t), '[]'::jsonb),
        'soon', (select count(*) from pb_prod.locates l where not l.closed and l.expires_at between t and t + 3),
        'open', (select count(*) from pb_prod.locates l where not l.closed)),
    'field_events', coalesce((select jsonb_object_agg(x.k, x.n) from (
        select e.kind k, count(*) n from pb_daily.events e where e.created_at > now() - make_interval(days => d) and e.superseded_at is null group by 1
        union all select 'log:' || s.kind, count(*) from pb_prod.site_log s where s.created_at > now() - make_interval(days => d) group by s.kind) x), '{}'::jsonb),
    'mgmt_reports', (select count(*) from pb_reports.reports r where r.created_at > now() - make_interval(days => d)),
    'feedback', coalesce((select jsonb_object_agg(coalesce(x.status, '?'), x.n) from (select m.status, count(*) n from pb_support.messages m group by 1) x), '{}'::jsonb),
    'feedback_new', (select count(*) from pb_support.messages m where m.status = 'new'),
    'trial_requests_new', (select count(*) from pb_support.trial_requests r where r.status = 'new'),
    'terms', coalesce((select jsonb_object_agg(coalesce(y.v, '?'), y.n) from (select z.v, count(*) n from (select distinct on (a.user_id) a.user_id, a.terms_version v
        from pb_legal.acceptances a order by a.user_id, a.accepted_at desc) z group by 1) y), '{}'::jsonb),
    'logins_no_terms', (select count(*) from auth.users u where not exists (select 1 from pb_legal.acceptances a where a.user_id = u.id)),
    'state_rules_overdue', coalesce((select jsonb_agg(s.code order by s.recheck_by) from pb_prod.state_rules s where s.recheck_by < t), '[]'::jsonb),
    'state_rules_next', (select min(s.recheck_by) from pb_prod.state_rules s where s.recheck_by >= t))
  into v_safety;

  ---------------------------------------------------------------- ASK QUALITY
  select jsonb_build_object(
    'questions', (select coalesce(sum(a.count), 0) from public.ai_usage a where a.day > t - d and a.feature in ('teacher', 'analysis')),
    'questions_today', (select coalesce(sum(a.count), 0) from public.ai_usage a where a.day = t and a.feature in ('teacher', 'analysis')),
    'usd', round(coalesce((select sum(k.usd) from pb_billing.ai_cost k where k.day > t - d and k.feature in ('teacher', 'analysis')), 0), 2),
    'usd_per_q', (select round(sum(k.usd) / nullif(sum(k.n), 0), 4) from pb_billing.ai_cost k where k.day > t - d and k.feature in ('teacher', 'analysis')),
    'gaps_new', (select count(*) from pb_ai.gaps g where g.status = 'new'),
    'gaps_by_reason', coalesce((select jsonb_object_agg(x.reason, x.n) from (select coalesce(g.reason, '?') reason, count(*) n from pb_ai.gaps g where g.created_at > now() - make_interval(days => d) group by 1) x), '{}'::jsonb),
    'not_right', (select count(*) from pb_ai.gaps g where g.source = 'not_right' and g.created_at > now() - make_interval(days => d)),
    'newest', coalesce((select jsonb_agg(jsonb_build_object('at', g.created_at, 'reason', g.reason, 'q', left(g.question, 140)) order by g.created_at desc)
        from (select * from pb_ai.gaps x where x.status = 'new' order by x.created_at desc limit 5) g), '[]'::jsonb),
    'kb_version', (select k.version from pb_ai.kb_versions k where k.active limit 1))
  into v_ask;

  ---------------------------------------------------------------- NEEDS YOUR ATTENTION (worst first: 1 red, 2 amber, 3 info)
  with a(lvl, area, msg) as (
    select 1, 'safety', 'Confined space permit open ' || round((extract(epoch from now() - o.first_saved_at) / 3600)::numeric) || ' hours: '
           || coalesce(c.name, 'a company') || coalesce(' · ' || nullif(left(o.space, 40), ''), '')
      from pb_safety.open_permits o left join public.companies c on c.id = o.company_id where o.first_saved_at < now() - interval '8 hours'
    union all select 1, 'safety', 'Emergency notice sent ' || to_char(max(e.created_at) at time zone 'UTC', 'Mon DD') || ' (' || count(distinct (e.permit_ref, e.started_at)) || ' in 7 days). Call the company.'
      from pb_safety.em_notices e where e.created_at > now() - interval '7 days' having count(*) > 0
    union all select 1, 'reliability', 'Backup: ' || pb_backup.health(now()) where pb_backup.health(now()) is not null
    union all select 1, 'reliability', count(*) || ' sealed run file(s) no longer match their fingerprint. Look before anyone relies on them.'
      from pb_prod.run_seal_checks x where not x.matches having count(*) > 0
    union all select 1, 'reliability', count(*) || ' run photo(s) no longer match their fingerprint.' from pb_prod.run_photo_checks x where not x.matches having count(*) > 0
    union all select case when pb_billing.state_of(ac) = 'read_only' then 1 else 2 end, 'money',
           c.name || case when pb_billing.state_of(ac) = 'read_only' then ' is read-only (not paid).' else ' is past due; locks ' || to_char(ac.paid_through + ac.grace_days, 'Mon DD') || '.' end
      from pb_billing.accounts ac join public.companies c on c.id = ac.company_id where pb_billing.state_of(ac) in ('past_due', 'read_only') and ac.state <> 'canceled'
    union all select 2, 'money', c.name || ' renews ' || to_char(ac.paid_through, 'Mon DD') || '. Send the invoice.'
      from pb_billing.accounts ac join public.companies c on c.id = ac.company_id where pb_billing.state_of(ac) = 'active' and ac.paid_through between t and t + 7
    union all select 2, 'money', c.name || '’s beta ends ' || to_char(c.trial_ends_at, 'Mon DD') || ' (' || (c.trial_ends_at::date - t) || ' days). Talk to them about paying.'
      from public.companies c where c.status = 'active' and c.plan = 'trial' and c.trial_ends_at::date between t and t + 7
    union all select 2, 'money', c.name || '’s beta ended ' || to_char(c.trial_ends_at, 'Mon DD') || ' and it is not paid.'
      from public.companies c where c.status = 'active' and c.plan = 'trial' and c.trial_ends_at < now() and c.trial_ends_at > now() - interval '30 days'
    union all select case when (s->>'pct')::int >= 100 then 1 else 2 end, 'costs',
           (s->>'who') || ' has used ' || (s->>'pct') || '% of its AI money this month ($' || (s->>'usd') || ' of $' || (s->>'stop') || ')'
           || case when (s->>'pct')::int >= 100 then ': AI is stopped for them.' else '.' end
      from jsonb_array_elements(v_cost->'stops') s where (s->>'pct')::int >= 80
    union all select 2, 'security', (select sum(v::int) from jsonb_each_text(v_share->'by_kind_7') x(k, v)) || ' account sharing signal(s) in 7 days. See Account sharing.'
      where (v_share->>'live')::boolean and v_share->'by_kind_7' <> '{}'::jsonb
    union all select 2, 'security', jsonb_array_length(v_sec->'many_sessions') || ' login(s) signed in on 3 or more devices right now.'
      where jsonb_array_length(v_sec->'many_sessions') > 0
    union all select 2, 'safety', '811 ticket ' || coalesce(l.ticket_no, '') || ' (' || coalesce(c.name, '') || coalesce(', job ' || l.job_number, '') || ') expired ' || to_char(l.expires_at, 'Mon DD') || ' and is not closed.'
      from pb_prod.locates l left join public.companies c on c.id = l.company_id where not l.closed and l.expires_at < t
    union all select 2, 'reliability', count(*) || ' plan set(s) stuck reading since ' || to_char(min(s.created_at) at time zone 'UTC', 'Mon DD') || '.'
      from pb_plans.sets s where s.state in ('uploading', 'reading') and s.created_at < now() - interval '2 hours' having count(*) > 0
    union all select 2, 'reliability', 'Crash reports up: ' || (v_rel->>'crashes_7') || ' this week vs ' || (v_rel->>'crashes_prev_7') || ' last week.'
      where (v_rel->>'crashes_7')::int >= 5 and (v_rel->>'crashes_7')::int > 2 * greatest((v_rel->>'crashes_prev_7')::int, 1)
    union all select 2, 'reliability', (v_rel->>'push_gave_up_7') || ' push notice(s) could not be delivered in 7 days; '
           || (v_rel->'push_subs'->>'dead') || ' of ' || (v_rel->'push_subs'->>'n') || ' phone push sign-ups are dead.'
      where (v_rel->>'push_gave_up_7')::int > 0
    union all select 2, 'reliability', (v_rel->>'email_gave_up_7') || ' email(s) gave up in 7 days.' where (v_rel->>'email_gave_up_7')::int > 0
    union all select 2, 'reliability', (v_rel->>'server_errors_7') || ' server error(s) logged in 7 days.' where (v_rel->>'server_errors_7')::int > 0
    union all select 2, 'reliability', (v_rel->'legacy_7'->>'people') || ' person(s) on an old app build are still writing the old run table.'
      where (v_rel->'legacy_7'->>'people')::int > 0
    union all select 2, 'reliability', 'Weather alerts: ' || (v_rel->'jobs'->0->>'failed') || ' failed in 7 days.' where (v_rel->'jobs'->0->>'failed')::int > 0
    union all select 2, 'legal', 'State rules past their re-check date: ' || (select string_agg(x, ', ') from jsonb_array_elements_text(v_safety->'state_rules_overdue') x) || '.'
      where jsonb_array_length(v_safety->'state_rules_overdue') > 0
    union all select 2, 'people', (v_safety->>'feedback_new') || ' feedback message(s) not read yet. Open App problems.' where (v_safety->>'feedback_new')::int > 0
    union all select 2, 'growth', (v_safety->>'trial_requests_new') || ' new beta request(s) from the website.' where (v_safety->>'trial_requests_new')::int > 0
    union all select 3, 'growth', jsonb_array_length(v_growth->'quiet_companies') || ' company(ies) with no one in the app for 7 days: '
           || (select string_agg(x, ', ') from jsonb_array_elements_text(v_growth->'quiet_companies') x) || '.'
      where jsonb_array_length(v_growth->'quiet_companies') > 0
    union all select 3, 'ask', (v_ask->>'gaps_new') || ' Ask question(s) waiting for a better answer (Documents review).' where (v_ask->>'gaps_new')::int > 0
  )
  select coalesce(jsonb_agg(jsonb_build_object('level', case lvl when 1 then 'red' when 2 then 'amber' else 'info' end, 'area', area, 'text', msg) order by lvl, area), '[]'::jsonb)
    into v_attn from (select * from a where msg is not null limit 40) z;

  return jsonb_build_object('ok', true, 'at', now(), 'days', d, 'attention', v_attn, 'money', v_money, 'costs', v_cost, 'growth', v_growth,
    'security', v_sec, 'reliability', v_rel, 'safety', v_safety, 'ask', v_ask);
end $function$;

revoke all on function public.pb_owner_dashboard(integer) from public, anon;
grant execute on function public.pb_owner_dashboard(integer) to authenticated;
