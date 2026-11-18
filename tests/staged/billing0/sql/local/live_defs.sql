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
