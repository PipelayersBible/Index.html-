-- Plan reading gate (billing Phase 0, decision 9). NOT APPLIED. Apply after 01.
-- Plan reading stays off for betas; a PAID company gets it only with the add-on (Make Paid, or Plan Reading On later).
-- Off = plan sets stay parked (viewable, not read), exactly as for a beta today.
--
-- Also fixes a live leak: pb_plans_sheet_ready queues each sheet while its set is still 'uploading', and the worker
-- (cron pb-plans-read, every minute -> plans edge function -> pb_plans_svc_take) takes queued sheets from 'uploading' sets.
-- So while any set is being read, a BETA company's sheets are read (AI cost) during upload, before pb_plans_uploaded parks
-- the set. The worker now takes only sheets of companies where pb_billing.plan_reading_on(company).
--
-- Changed existing functions (diffs in sql/diffs/): pb_plans_uploaded, pb_plans_svc_take, pb_plans_svc_more.

-- CHANGED (diff: sql/diffs/pb_plans_uploaded.diff): park unless plan reading is on (was: park only for plan = 'trial').
create or replace function public.pb_plans_uploaded(p_set uuid) returns jsonb
language plpgsql security definer set search_path to '' as $function$
declare v_s pb_plans.sets; v_missing int; v_trial boolean;
begin
  select * into v_s from pb_plans.sets where id = p_set;
  if not found or v_s.created_by is distinct from auth.uid() then return jsonb_build_object('ok', false, 'code', 'pb:not_yours'); end if;
  select count(*) into v_missing from pb_plans.sheets where set_id = p_set and state = 'waiting';
  if v_missing > 0 then return jsonb_build_object('ok', false, 'code', 'pb:missing', 'missing', v_missing); end if;
  -- Nov 16: a beta company's sets wait, viewable, until it pays (pb_owner_company_set turns them to reading)
  -- billing Phase 0: also a paid company without the plan reading add-on (or read-only); Make Paid / Plan Reading On read them
  select not pb_billing.plan_reading_on(v_s.company_id) into v_trial;
  if v_trial then
    update pb_plans.sets set state = 'parked' where id = p_set and state = 'uploading';
    return jsonb_build_object('ok', true, 'parked', true);
  end if;
  update pb_plans.sets set state = 'reading' where id = p_set and state = 'uploading';
  perform pb_plans.kick();
  return jsonb_build_object('ok', true);
end $function$;

-- CHANGED (diff: sql/diffs/pb_plans_svc_take.diff): only sheets of companies with plan reading on.
create or replace function public.pb_plans_svc_take(p_n integer) returns jsonb
language plpgsql security definer set search_path to '' as $function$
declare v jsonb; v_ids bigint[];
begin
  update pb_plans.sheets set state = case when tries >= 3 then 'failed' else 'queued' end,
      error = case when tries >= 3 then coalesce(error, 'Couldn''t read this sheet.') else error end
    where state = 'reading' and claimed_at < now() - interval '6 minutes';
  with pick as (
    select h.id from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id
    where h.state = 'queued' and s.state in ('uploading', 'reading') and pb_billing.plan_reading_on(s.company_id)
    order by s.created_at, h.page limit greatest(1, least(p_n, 6)) for update of h skip locked),
  upd as (update pb_plans.sheets h set state = 'reading', claimed_at = now(), tries = h.tries + 1 from pick where h.id = pick.id returning h.id)
  select array_agg(id) into v_ids from upd;
  select coalesce(jsonb_agg(jsonb_build_object('sheet_id', h.id, 'set_id', h.set_id, 'page', h.page, 'pages', s.pages, 'grid', h.grid,
      'title', s.title, 'job', s.job_number, 'tries', h.tries,
      'prev', (select jsonb_build_object('sheet_no', p.sheet_no, 'title', p.sheet_title) from pb_plans.sheets p where p.set_id = h.set_id and p.page = h.page - 1 and p.state = 'done'))), '[]'::jsonb)
    into v from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id where h.id = any(coalesce(v_ids, '{}'));
  return v;
end $function$;

-- CHANGED (diff: sql/diffs/pb_plans_svc_more.diff): the same filter, so the cron does not kick the worker for nothing.
create or replace function public.pb_plans_svc_more() returns boolean
language sql stable security definer set search_path to '' as $function$
  select exists (select 1 from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id where h.state = 'queued' and s.state in ('uploading','reading') and pb_billing.plan_reading_on(s.company_id))
      or exists (select 1 from pb_plans.issues where state = 'candidate')
$function$;

-- Plan Reading On / Off for a PAID company with a billing account (Tommy, at Make Paid or later). On: the add-on price is
-- copied from the setting (null = not decided yet; Billing Due then says "price not set") and parked sets start reading.
-- Off: sets being read go back to parked (a sheet already with the reader finishes; nothing is deleted).
create or replace function public.pb_owner_plan_reading_set(p_company uuid, p_on boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare a pb_billing.accounts; v_n int := 0;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  if p_on is null then return jsonb_build_object('ok', false, 'code', 'pb:bad_request'); end if;
  if not exists (select 1 from public.companies c where c.id = p_company and c.plan = 'paid') then
    return jsonb_build_object('ok', false, 'code', 'pb:not_paid', 'message', 'Plan reading is only for paid companies.');
  end if;
  update pb_billing.accounts x set plan_reading = p_on,
      plan_reading_cents = case when p_on then coalesce(case when x.plan_reading then x.plan_reading_cents end, pb_billing.setting_int('plan_reading_cents', null)) else x.plan_reading_cents end,
      updated_at = now()
    where x.company_id = p_company and x.state <> 'canceled' returning * into a;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:no_account', 'message', 'Use Make Paid first.'); end if;
  if p_on and pb_billing.plan_reading_on(p_company) then
    update pb_plans.sets set state = 'reading' where company_id = p_company and state = 'parked';
    get diagnostics v_n = row_count;
    if v_n > 0 then perform pb_plans.kick(); end if;
  elsif not p_on then
    -- not 'uploading': the phone is still sending sheets (sheet_ready refuses a parked set); the worker skips them now and
    -- pb_plans_uploaded parks the set when the upload ends
    update pb_plans.sets set state = 'parked' where company_id = p_company and state = 'reading';
    get diagnostics v_n = row_count;
  end if;
  insert into pb_billing.events (company_id, kind, detail, actor) values (p_company, 'plan_reading',
    jsonb_build_object('on', p_on, 'cents', a.plan_reading_cents, 'sets', v_n), auth.uid());
  perform pb_audit.admin_note('company_plan_reading', p_company, null, jsonb_build_object('on', p_on));
  return jsonb_build_object('ok', true, 'sets', v_n, 'account', pb_billing.account_json(a));
end $$;
revoke all on function public.pb_owner_plan_reading_set(uuid, boolean) from public, anon;
grant execute on function public.pb_owner_plan_reading_set(uuid, boolean) to authenticated;
