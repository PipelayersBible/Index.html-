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
    where h.state = 'queued' and s.state in ('uploading', 'reading') and pb_billing.plan_reading_on(s.company_id)
    order by s.created_at, h.page limit greatest(1, least(p_n, 6)) for update of h skip locked),
  upd as (update pb_plans.sheets h set state = 'reading', claimed_at = now(), tries = h.tries + 1 from pick where h.id = pick.id returning h.id)
  select array_agg(id) into v_ids from upd;
  select coalesce(jsonb_agg(jsonb_build_object('sheet_id', h.id, 'set_id', h.set_id, 'page', h.page, 'pages', s.pages, 'grid', h.grid,
      'title', s.title, 'job', s.job_number, 'tries', h.tries,
      'prev', (select jsonb_build_object('sheet_no', p.sheet_no, 'title', p.sheet_title) from pb_plans.sheets p where p.set_id = h.set_id and p.page = h.page - 1 and p.state = 'done'))), '[]'::jsonb)
    into v from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id where h.id = any(coalesce(v_ids, '{}'));
  return v;
end $function$
