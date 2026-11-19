-- daily3 #48 (owner, Nov 18): the company and its supers search the Job Book's near misses, incidents and stop-work on
-- their own, across jobs. One read-only RPC, for the company's managers only (the company account, managers, PMs /
-- superintendents: pb_prod.managed_company, the same rule the Job Book's can_manage and the office lists use).
-- Filters: job (number or key), kinds (any of the five safety kinds), date range (the event's own date; created day in
-- the company's zone when it has none), who (logged by, or a name in "People involved"; case-insensitive). Newest first,
-- paged (limit 1..200, offset). Also returns the jobs that have safety events (for the job filter) and the total.
-- Not applied. Apply with the rest of daily3.

create index if not exists job_items_safety_idx on pb_prod.job_items (company_id, created_at desc) where kind = 'safety' and status <> 'void';

create or replace function public.pb_jb_safety_search(p_job_number text default null, p_kinds text[] default null, p_from date default null, p_to date default null,
  p_who text default null, p_limit integer default 50, p_offset integer default 0, p_expect_uid uuid default null)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := nullif(pb_prod.job_key(coalesce(p_job_number, '')), ''); v_tz text;
  v_kinds text[] := array['Near miss', 'First aid', 'Incident', 'Property damage', 'Stop work'];
  v_who text := nullif(left(btrim(coalesce(p_who, '')), 80), ''); v_lim integer := least(200, greatest(1, coalesce(p_limit, 50))); v_off integer := least(100000, greatest(0, coalesce(p_offset, 0)));
  v_total integer; v_items jsonb; v_jobs jsonb;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is not null and v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if p_kinds is not null and cardinality(p_kinds) > 0 then
    if exists (select 1 from unnest(p_kinds) k where k is null or not (k = any (v_kinds))) then raise exception 'pb:bad_kind'; end if;
    v_kinds := p_kinds;
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then raise exception 'pb:bad_dates'; end if;
  v_tz := coalesce((pb_pm.settings_of(v_co)).tz, 'America/Chicago');
  with base as (
    select x.*, case when (x.data->>'date') ~ '^\d{4}-\d{2}-\d{2}$' then (x.data->>'date')::date else (x.created_at at time zone v_tz)::date end as ev_date,
           pb_prod.member_name(x.company_id, x.created_by) as by_name
      from pb_prod.job_items x
     where x.company_id = v_co and x.kind = 'safety' and x.status <> 'void'
       and (v_key is null or x.job_key = v_key)
       and coalesce(x.data->>'kind', '') = any (v_kinds)
  ), f as (
    select * from base b
     where (p_from is null or b.ev_date >= p_from) and (p_to is null or b.ev_date <= p_to)
       and (v_who is null or strpos(lower(coalesce(b.by_name, '')), lower(v_who)) > 0 or strpos(lower(coalesce(b.data->>'people', '')), lower(v_who)) > 0)
  )
  select (select count(*) from f),
         coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'job_number', coalesce(p.job_number, pb_prod.job_item_job(v_co, p.job_key)), 'job_key', p.job_key,
             'kind', p.data->>'kind', 'date', p.ev_date, 'time', nullif(left(coalesce(p.data->>'time', ''), 5), ''), 'people', p.data->>'people', 'what', p.data->>'what', 'done', p.data->>'done',
             'status', p.status, 'by', p.by_name, 'photo_count', p.photo_count, 'version', p.version, 'created_at', p.created_at, 'updated_at', p.updated_at)
             order by p.ev_date desc, coalesce(p.data->>'time', '') desc, p.created_at desc)
           from (select * from f order by ev_date desc, coalesce(data->>'time', '') desc, created_at desc limit v_lim offset v_off) p), '[]'::jsonb)
    into v_total, v_items;
  select coalesce(jsonb_agg(jsonb_build_object('job_key', j.job_key, 'job_number', coalesce(j.job_number, pb_prod.job_item_job(v_co, j.job_key)), 'n', j.n) order by j.job_number), '[]'::jsonb) into v_jobs
    from (select x.job_key, max(x.job_number) as job_number, count(*) as n from pb_prod.job_items x where x.company_id = v_co and x.kind = 'safety' and x.status <> 'void' group by x.job_key) j;
  return jsonb_build_object('ok', true, 'server_at', now(), 'company_id', v_co, 'total', v_total, 'limit', v_lim, 'offset', v_off, 'items', v_items, 'jobs', v_jobs);
end $function$;

revoke all on function public.pb_jb_safety_search(text, text[], date, date, text, integer, integer, uuid) from public, anon;
grant execute on function public.pb_jb_safety_search(text, text[], date, date, text, integer, integer, uuid) to authenticated;
