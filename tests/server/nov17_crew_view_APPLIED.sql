-- Crew View (feat crewview, on r16.94): a linked crew member opens today's locked runs of his crew read-only.
-- Who: everyone rr_can_open allows (the office, the run's foreman), plus the pipelayers with an OPEN crew link to the
-- run's foreman: for a run locked by a foreman, that foreman; for a run locked by a pipelayer, his run's foreman
-- (pb_prod.run_foreman: the pick on the run, else his crew link; a run sent "office only" has none). Same company only.
-- What: only the grade sheet (job, labels, stations, the rows' numbers, laid marks per row with their time). No laid
-- log (account ids), no notes, photos, production, report text or names other than the run's author.

create or replace function pb_prod.rr_crew_can_view(p_viewer uuid, p_company uuid, p_author uuid, p_entry text)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select p_viewer is not null and p_company is not null and (
    coalesce(pb_prod.rr_can_open(p_viewer, p_company, p_author, p_entry), false)
    or coalesce(
      p_viewer <> p_author
      and pb_prod.my_company(p_viewer) = p_company
      and pb_prod.is_pipelayer_of(p_viewer, p_company)
      and exists (
        select 1 from pb_prod.crew_links l
        where l.pipelayer_id = p_viewer and l.company_id = p_company and l.ended_at is null
          and pb_prod.is_foreman_of(l.foreman_id, p_company)
          and l.foreman_id = coalesce(case when pb_prod.is_foreman_of(p_author, p_company) then p_author end,
                                      pb_prod.run_foreman(p_company, p_author, p_entry))
      ), false))
$function$;
revoke all on function pb_prod.rr_crew_can_view(uuid, uuid, uuid, text) from public, anon, authenticated;

create or replace function public.pb_prod_crew_view_list()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_runs jsonb;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_company := pb_prod.my_company(v_uid);
  if v_company is null then return jsonb_build_object('ok', true, 'runs', '[]'::jsonb, 'server_at', now()); end if;
  select coalesce(jsonb_agg(x.o order by x.at desc), '[]'::jsonb) into v_runs from (
    select r.locked_at as at, jsonb_build_object('id', r.id, 'who', pb_prod.member_name_or_null(r.company_id, r.user_id),
      'job_number', r.job_number, 'jobsite', r.jobsite, 'label', r.label, 'locked_at', r.locked_at, 'updated_at', coalesce(r.updated_at, r.created_at),
      'ended', r.ended, 'version', r.version, 'distance_ft', r.distance_ft, 'laid_ft', r.laid_ft) as o
    from pb_prod.run_records r
    where r.company_id = v_company and r.locked_at > now() - interval '36 hours' and r.removed_at is null and r.user_id <> v_uid
      and pb_prod.rr_crew_can_view(v_uid, r.company_id, r.user_id, r.entry_id)
    order by r.locked_at desc limit 20) x;
  return jsonb_build_object('ok', true, 'runs', v_runs, 'server_at', now());
end $function$;
revoke all on function public.pb_prod_crew_view_list() from public, anon;
grant execute on function public.pb_prod_crew_view_list() to authenticated;

create or replace function public.pb_prod_crew_view_get(p_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_r pb_prod.run_records%rowtype; v_rec jsonb; v_rows jsonb; v_pi jsonb;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  select * into v_r from pb_prod.run_records r where r.id = p_id;
  if not found then raise exception 'pb:not_found'; end if;
  -- the same answer for "not yours" and "another company": nothing about the run is told
  if v_r.user_id = v_uid or not pb_prod.rr_crew_can_view(v_uid, v_r.company_id, v_r.user_id, v_r.entry_id) then raise exception 'pb:not_your_crew'; end if;
  if v_r.removed_at is not null then raise exception 'pb:removed'; end if;
  v_rec := v_r.record;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('station', x->'station', 'stationFt', x->'stationFt', 'pointId', x->'pointId', 'label', x->'label',
      'bop', x->'bop', 'inv', x->'inv', 'top', x->'top', 'sgDisp', x->'sgDisp', 'elevation', x->'elevation', 'addedTime', x->'addedTime',
      'layoutShort', x->'layoutShort', 'layoutExact', x->'layoutExact', 'layoutKind', x->'layoutKind')) order by n), '[]'::jsonb)
    into v_rows from jsonb_array_elements(case when jsonb_typeof(v_rec->'intervalRows') = 'array' then v_rec->'intervalRows' else '[]'::jsonb end) with ordinality as t(x, n)
    where jsonb_typeof(x) = 'object';
  select coalesce(jsonb_object_agg(k, jsonb_build_object('label', v->'label')), '{}'::jsonb) into v_pi
    from jsonb_each(case when jsonb_typeof(v_rec->'pointInputs') = 'object' then v_rec->'pointInputs' else '{}'::jsonb end) as t(k, v)
    where jsonb_typeof(v) = 'object' and jsonb_typeof(v->'label') = 'string';
  return jsonb_build_object('ok', true, 'id', v_r.id, 'who', pb_prod.member_name_or_null(v_r.company_id, v_r.user_id),
    'updated_at', coalesce(v_r.updated_at, v_r.created_at), 'version', v_r.version, 'ended', v_r.ended, 'server_at', now(),
    'sheet', jsonb_strip_nulls(jsonb_build_object('id', v_rec->'id', 'kind', 'run', 'lockTime', v_rec->'lockTime', 'jobNumber', v_r.job_number, 'jobsite', v_r.jobsite,
      'startLabel', v_rec->'startLabel', 'endLabel', v_rec->'endLabel', 'rodUnit', v_rec->'rodUnit', 'completed', v_rec->'completed', 'incomplete', v_rec->'incomplete',
      'runEndTime', v_rec->'runEndTime', 'runStations', case when jsonb_typeof(v_rec->'runStations') = 'object' then v_rec->'runStations' end, 'pointInputs', v_pi,
      'intervalRows', v_rows, 'laid', jsonb_build_object('marks', case when jsonb_typeof(v_rec->'laid'->'marks') = 'object' then v_rec->'laid'->'marks' else '{}'::jsonb end))));
end $function$;
revoke all on function public.pb_prod_crew_view_get(uuid) from public, anon;
grant execute on function public.pb_prod_crew_view_get(uuid) to authenticated;

