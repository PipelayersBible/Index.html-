CREATE OR REPLACE FUNCTION pb_billing.beta_closed_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.company_id is not null and pb_billing.beta_closed(new.company_id) then raise exception 'pb:beta_ended'; end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.pb_my_plan()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (select jsonb_build_object('ok', true, 'plan', x.plan, 'trial_ends_at', x.trial_ends_at, 'expired', x.expired,
      'closed', pb_billing.beta_closed(x.company_id), 'individual', pb_billing.has_individual(auth.uid()),
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
$function$
;
CREATE OR REPLACE FUNCTION public.pb_owner_company_set(p_company uuid, p_plan text, p_days integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.companies;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  if p_plan not in ('paid', 'trial') then return jsonb_build_object('ok', false, 'code', 'pb:bad_plan'); end if;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.pb_plans_uploaded(p_set uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_s pb_plans.sets; v_missing int; v_trial boolean;
begin
  select * into v_s from pb_plans.sets where id = p_set;
  if not found or v_s.created_by is distinct from auth.uid() then return jsonb_build_object('ok', false, 'code', 'pb:not_yours'); end if;
  select count(*) into v_missing from pb_plans.sheets where set_id = p_set and state = 'waiting';
  if v_missing > 0 then return jsonb_build_object('ok', false, 'code', 'pb:missing', 'missing', v_missing); end if;
  -- Nov 16: a beta company's sets wait, viewable, until it pays (pb_owner_company_set turns them to reading)
  select exists (select 1 from public.companies c where c.id = v_s.company_id and c.plan = 'trial') into v_trial;
  if v_trial then
    update pb_plans.sets set state = 'parked' where id = p_set and state = 'uploading';
    return jsonb_build_object('ok', true, 'parked', true);
  end if;
  update pb_plans.sets set state = 'reading' where id = p_set and state = 'uploading';
  perform pb_plans.kick();
  return jsonb_build_object('ok', true);
end $function$
;
CREATE OR REPLACE FUNCTION public.pb_plans_svc_take(p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v jsonb; v_ids bigint[];
begin
  update pb_plans.sheets set state = case when tries >= 3 then 'failed' else 'queued' end,
      error = case when tries >= 3 then coalesce(error, 'Couldn''t read this sheet.') else error end
    where state = 'reading' and claimed_at < now() - interval '6 minutes';
  with pick as (
    select h.id from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id
    where h.state = 'queued' and s.state in ('uploading', 'reading')
    order by s.created_at, h.page limit greatest(1, least(p_n, 6)) for update of h skip locked),
  upd as (update pb_plans.sheets h set state = 'reading', claimed_at = now(), tries = h.tries + 1 from pick where h.id = pick.id returning h.id)
  select array_agg(id) into v_ids from upd;
  select coalesce(jsonb_agg(jsonb_build_object('sheet_id', h.id, 'set_id', h.set_id, 'page', h.page, 'pages', s.pages, 'grid', h.grid,
      'title', s.title, 'job', s.job_number, 'tries', h.tries,
      'prev', (select jsonb_build_object('sheet_no', p.sheet_no, 'title', p.sheet_title) from pb_plans.sheets p where p.set_id = h.set_id and p.page = h.page - 1 and p.state = 'done'))), '[]'::jsonb)
    into v from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id where h.id = any(coalesce(v_ids, '{}'));
  return v;
end $function$
;
CREATE OR REPLACE FUNCTION public.pb_plans_svc_more()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id where h.state = 'queued' and s.state in ('uploading','reading'))
      or exists (select 1 from pb_plans.issues where state = 'candidate')
$function$
;
create trigger pb_beta_closed before insert on pb_prod.site_log for each row execute function pb_billing.beta_closed_guard();
-- the legacy paid company (live: DIG Civil) and the admin
insert into auth.users (id, email) values ('c3e7cdde-d744-4924-9508-dc991e1b68c3', 'admin@local'), ('e03416b7-6086-40a5-8d42-9267b846fc26', 'digowner@local'), ('00000000-0000-0000-0000-0000000000d1', 'digmember@local');
insert into pb_support.admins values ('c3e7cdde-d744-4924-9508-dc991e1b68c3');
insert into public.companies (id, name, owner_user_id, plan, status) values ('d01a4a5f-312a-418f-9172-ea9aec9784b5', 'DIG Civil', 'e03416b7-6086-40a5-8d42-9267b846fc26', 'paid', 'active');
insert into public.company_members (company_id, user_id, role) values ('d01a4a5f-312a-418f-9172-ea9aec9784b5', '00000000-0000-0000-0000-0000000000d1', 'foreman');
CREATE OR REPLACE FUNCTION public.ai_try_consume(p_user uuid, p_feature text, p_limit integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare used integer; lim integer; t record; cused integer; today date := (now() at time zone 'utc')::date; L jsonb; mused integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
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
CREATE OR REPLACE FUNCTION pb_billing.individual_only(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pb_billing.has_individual(p_user) and not exists (select 1 from pb_billing.company_of(p_user) x where not x.expired)
$function$
;
CREATE OR REPLACE FUNCTION public.ai_has_paid_plan(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* pb_sec S12 owner; Nov 16: an ended trial has no AI */
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active')
      or exists (select 1 from pb_billing.company_of(p_user) x where not x.expired);
$function$
;
CREATE OR REPLACE FUNCTION public.pb_backup_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r pb_backup.runs%rowtype;
begin
  perform pb_crew.require_service();
  select * into r from pb_backup.runs b order by b.id desc limit 1;
  return jsonb_build_object('problem', pb_backup.health(now()), 'alert', pb_backup.check_due(now()),
    'pass_errors_24h', (select count(*) from pb_prod.pass_errors e where e.at > now() - interval '24 hours'),
    'last_run', case when r.id is null then null else jsonb_build_object('id', r.id, 'started_at', r.started_at, 'finished_at', r.finished_at,
      'status', r.status, 'files', r.files, 'bytes', r.bytes, 'error', r.error, 'alerted', r.alerted_at is not null) end);
end $function$
;
CREATE OR REPLACE FUNCTION pb_backup.check_kick()
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
  if not pb_backup.check_due(now()) then return; end if;
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
