-- plans_stuck_nov20: plan sets could sit at "reading" forever.
-- (1) A sheet left "reading" by a worker that died was only put back in the queue when the worker was already
--     running (svc_take), but the cron only starts the worker when a sheet is QUEUED. So it never ran again.
--     Fix: svc_more() is also true when a sheet has been "reading" for over 6 minutes.
-- (2) A set only turned "ready" when its last sheet was read OK (svc_put). If its last open sheet FAILED, the set
--     stayed "reading". Fix: pb_plans.finish_sets() marks a set ready once no sheet is queued or reading
--     (done + failed only, at least one done); called from svc_fail, svc_take and the cron.
create or replace function pb_plans.finish_sets()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n int;
begin
  update pb_plans.sets s set state = 'ready', ready_at = now()
   where s.state = 'reading'
     and not exists (select 1 from pb_plans.sheets h where h.set_id = s.id and h.state in ('queued', 'reading', 'waiting'))
     and exists (select 1 from pb_plans.sheets h where h.set_id = s.id and h.state = 'done');
  get diagnostics n = row_count;
  return n;
end $function$;
revoke all on function pb_plans.finish_sets() from public, anon, authenticated;

create or replace function public.pb_plans_svc_more()
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select exists (select 1 from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id where h.state = 'queued' and s.state in ('uploading','reading') and pb_billing.plan_reading_on(s.company_id))
      or exists (select 1 from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id where h.state = 'reading' and h.claimed_at < now() - interval '6 minutes' and s.state in ('uploading','reading')) -- plans_stuck_nov20
      or exists (select 1 from pb_plans.issues where state = 'candidate')
$function$;

create or replace function public.pb_plans_svc_fail(p_sheet bigint, p_error text, p_usd numeric, p_final boolean)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare h pb_plans.sheets;
begin
  update pb_plans.sheets set state = case when p_final or tries >= 3 then 'failed' else 'queued' end, error = left(p_error, 300),
      usd = usd + coalesce(p_usd, 0) where id = p_sheet and state = 'reading' returning * into h;
  if found then update pb_plans.sets set usd = usd + coalesce(p_usd, 0) where id = h.set_id; end if;
  perform pb_plans.finish_sets(); -- plans_stuck_nov20
end $function$;

-- svc_take: same as live, plus finish_sets() after putting stale sheets back
create or replace function public.pb_plans_svc_take(p_n integer)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v jsonb; v_ids bigint[];
begin
  update pb_plans.sheets set state = case when tries >= 3 then 'failed' else 'queued' end,
      error = case when tries >= 3 then coalesce(error, 'Couldn''t read this sheet.') else error end
    where state = 'reading' and claimed_at < now() - interval '6 minutes';
  perform pb_plans.finish_sets(); -- plans_stuck_nov20
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
