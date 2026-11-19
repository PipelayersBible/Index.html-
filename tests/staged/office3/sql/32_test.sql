-- office3 #32 rolled-back test: run AFTER the body of 32_version_check.sql (without its begin/commit) in the same
-- transaction; it ends with raise exception 'RESULT: ...' so nothing stays. Company: DIG Civil (owner + its PM).
do $t$
declare own uuid := 'e03416b7-6086-40a5-8d42-9267b846fc26'; pm uuid := 'e4a0170b-1189-4bd5-86fe-e47e092ede3f';
  g jsonb; a jsonb; b jsonb; c jsonb; v0 int; out text := ''; pv int; p1 jsonb; p2 jsonb; p3 jsonb; e text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', own::text, true);
  -- job details: A and B both read version v0
  g := public.pb_prod_job_info_get('26014'); v0 := (g->>'info_ver')::int;
  out := out || 'get ver=' || v0 || ' name=' || coalesce(g->>'project_name','null');
  a := public.pb_prod_job_info_set('26014', 'Renamed by A', 'Banning, CA', (g->>'start_date')::date, own, v0);
  out := out || ' | A ok=' || (a->>'ok') || ' ver=' || (a->>'info_ver');
  -- B saves on the version it read: refused, told what is there now, nothing written
  b := public.pb_prod_job_info_set('26014', g->>'project_name', g->>'address', date '2026-10-29', own, v0);
  out := out || ' | B ok=' || (b->>'ok') || ' code=' || coalesce(b->>'code','') || ' now=' || coalesce(b->'now'->>'project_name','') || '/' || coalesce(b->'now'->>'info_ver','');
  if (select project_name from pb_prod.job_info where company_id='d01a4a5f-312a-418f-9172-ea9aec9784b5' and job_key='26014') <> 'Renamed by A' then raise exception 'FAIL B overwrote A'; end if;
  -- B again on the new version: written
  c := public.pb_prod_job_info_set('26014', 'Renamed by A', 'Banning, CA', date '2026-10-29', own, (b->'now'->>'info_ver')::int);
  out := out || ' | B2 ok=' || (c->>'ok') || ' ver=' || (c->>'info_ver');
  -- same values again: no new version
  c := public.pb_prod_job_info_set('26014', 'Renamed by A', 'Banning, CA', date '2026-10-29', own, (c->>'info_ver')::int);
  out := out || ' | same=' || coalesce(c->>'same','') || ' ver=' || (c->>'info_ver');
  -- the old signature refuses
  begin perform public.pb_prod_job_info_set('26014', 'Old app', null, null, own); out := out || ' | OLD5 WROTE'; exception when others then e := sqlerrm; out := out || ' | old5=' || e; end;
  -- a job with no details row yet: version 0 creates it
  g := public.pb_prod_job_info_get('26043');
  out := out || ' | 26043 ver=' || (g->>'info_ver');
  -- PMs & supers
  p1 := public.pb_job_pms_get('26014'); pv := (p1->>'ver')::int;
  out := out || ' || pms ver=' || pv || ' n=' || jsonb_array_length(p1->'assigned');
  p2 := public.pb_job_pms_set('26014', array[]::uuid[], own, pv);               -- A takes the PM off
  out := out || ' | A ok=' || (p2->>'ok') || ' ver=' || (p2->>'ver') || ' n=' || jsonb_array_length(p2->'assigned');
  p3 := public.pb_job_pms_set('26014', array[pm]::uuid[], own, pv);              -- B, on the version it read, would put the PM back
  out := out || ' | B ok=' || (p3->>'ok') || ' code=' || coalesce(p3->>'code','') || ' n=' || coalesce(jsonb_array_length(p3->'assigned')::text,'') || ' ver=' || coalesce(p3->>'ver','');
  if exists (select 1 from pb_pm.job_pms where company_id='d01a4a5f-312a-418f-9172-ea9aec9784b5' and job_key='26014' and user_id=pm and ended_at is null) then raise exception 'FAIL B undid A'; end if;
  p3 := public.pb_job_pms_set('26014', array[pm]::uuid[], own, (p3->>'ver')::int); -- B on the new version: written
  out := out || ' | B2 ok=' || (p3->>'ok') || ' n=' || jsonb_array_length(p3->'assigned') || ' ver=' || (p3->>'ver');
  begin perform public.pb_job_pms_set('26014', array[]::uuid[], own); out := out || ' | OLD3 WROTE'; exception when others then out := out || ' | old3=' || sqlerrm; end;
  out := out || ' || grants: get=' || has_function_privilege('authenticated', 'public.pb_prod_job_info_get(text)', 'execute')
    || ' set6=' || has_function_privilege('authenticated', 'public.pb_prod_job_info_set(text,text,text,date,uuid,integer)', 'execute')
    || ' pms4=' || has_function_privilege('authenticated', 'public.pb_job_pms_set(text,uuid[],uuid,integer)', 'execute')
    || ' anon_set6=' || has_function_privilege('anon', 'public.pb_prod_job_info_set(text,text,text,date,uuid,integer)', 'execute')
    || ' anon_pms4=' || has_function_privilege('anon', 'public.pb_job_pms_set(text,uuid[],uuid,integer)', 'execute')
    || ' jobver_auth=' || has_function_privilege('authenticated', 'pb_pm.job_ver(uuid,text)', 'execute');
  raise exception 'RESULT: %', out;
end $t$;
