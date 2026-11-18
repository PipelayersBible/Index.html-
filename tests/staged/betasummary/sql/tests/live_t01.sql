do $T$
declare
  A uuid := 'c3e7cdde-d744-4924-9508-dc991e1b68c3';           -- the app owner's admin account (pb_support.admins)
  S uuid := gen_random_uuid();   -- company account (the super who ran the pilot owns the beta company)
  P uuid := gen_random_uuid();   -- PM / superintendent member
  F uuid := gen_random_uuid();   -- foreman
  L uuid := gen_random_uuid();   -- pipelayer
  X uuid := gen_random_uuid();   -- owner of another company
  XP uuid := gen_random_uuid();  -- PM of the other company
  C uuid := gen_random_uuid(); D uuid := gen_random_uuid();
  IT uuid := gen_random_uuid(); RP uuid; PMT uuid := gen_random_uuid();
  r jsonb; r2 jsonb; e text; res jsonb := '{}'::jsonb; d0 date := current_date - 10;
begin
  create function pg_temp.act(u uuid) returns void language sql as $a$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'aal', 'aal2')::text, true) $a$;
  create function pg_temp.err(q text) returns text language plpgsql as $e$ begin execute q; return 'no error'; exception when others then return sqlerrm; end $e$;
  -- ===== 01_beta_summary.sql (rolled back with the block) =====
create or replace function public.pb_company_beta_summary(p_company uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal');
  v_co public.companies%rowtype;
  v_role text;
  v_tz text;
  v_from timestamptz; v_to timestamptz; d_from date; d_to date; v_kind text;
  v_users uuid[];
  foot jsonb; caught jsonb; paper jsonb; crew jsonb; usej jsonb;
begin
  if v_uid is null then raise exception 'pb:not_signed_in'; end if;
  if p_company is null then
    -- the caller's own company: one they own first (any status, so a closed company still reads), else one where they are a PM
    select c.* into v_co from public.companies c where c.owner_user_id = v_uid order by (c.status = 'active') desc, c.created_at desc limit 1;
    if v_co.id is not null then v_role := 'owner';
    else
      select c.* into v_co from public.companies c join public.company_members m on m.company_id = c.id and m.user_id = v_uid and m.role = 'pm'
        order by (c.status = 'active') desc, m.created_at desc nulls last limit 1;
      if v_co.id is not null then v_role := 'pm'; end if;
    end if;
    if v_co.id is null then raise exception 'pb:not_allowed'; end if;
  else
    select c.* into v_co from public.companies c where c.id = p_company;
    if v_co.id is null then raise exception 'pb:no_company'; end if;
    if v_co.owner_user_id = v_uid then v_role := 'owner';
    elsif exists (select 1 from public.company_members m where m.company_id = v_co.id and m.user_id = v_uid and m.role = 'pm') then v_role := 'pm';
    elsif v_admin then v_role := 'admin';
    else raise exception 'pb:not_allowed'; end if;
  end if;

  -- dates are the company's own (its time zone setting), UTC when it has none
  select s.tz into v_tz from pb_pm.settings s where s.company_id = v_co.id;
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then v_tz := 'UTC'; end if;
  if v_co.plan = 'trial' then
    v_kind := 'beta'; v_from := v_co.created_at; v_to := least(coalesce(v_co.trial_ends_at, now()), now());
    if v_to < v_from then v_to := v_from; end if;
  else
    v_kind := 'last_30_days'; v_to := now(); v_from := now() - interval '30 days';
  end if;
  d_from := (v_from at time zone v_tz)::date; d_to := (v_to at time zone v_tz)::date;
  v_users := array(select m.user_id from public.company_members m where m.company_id = v_co.id union select v_co.owner_user_id);

  -- footage and runs (pb_prod.run_records, pb_prod.items)
  with rr as (
    select r.* from pb_prod.run_records r
    where r.company_id = v_co.id and r.removed_at is null
      and coalesce(r.work_date, (r.locked_at at time zone v_tz)::date) between d_from and d_to)
  select jsonb_build_object(
    'laid_ft', (select round(coalesce(sum(rr.laid_ft), 0), 1) from rr),
    'runs_locked', (select count(*) from rr where rr.locked_at is not null),
    'pipe_logged_lf', (select round(coalesce(sum(i.qty), 0), 1) from pb_prod.items i
                       where i.company_id = v_co.id and not i.voided and i.category_key = 'pipe' and i.work_date between d_from and d_to),
    'days_worked', (select count(*) from (
        select rr.work_date d from rr where rr.work_date is not null
        union select e.work_date from pb_prod.entries e where e.company_id = v_co.id and not e.voided and e.work_date between d_from and d_to
        union select s.work_date from pb_prod.site_log s where s.company_id = v_co.id and s.work_date between d_from and d_to
        union select dr.work_date from pb_daily.reports dr where dr.company_id = v_co.id and dr.work_date between d_from and d_to) x),
    'runs_sent', (select count(*) from rr where rr.sent_at is not null),
    'runs_reviewed', (select count(*) from rr where rr.reviewed_at is not null),
    'photos_runs', (select coalesce(sum(rr.photo_count), 0) from rr),
    'check_shots', (select count(*) from rr, jsonb_array_elements(case when jsonb_typeof(rr.record->'checkShots') = 'array' then rr.record->'checkShots' else '[]'::jsonb end) c
                    where jsonb_typeof(c->'rod') = 'number'),
    -- the app's own rule (pbCsResult): more than 0.02 ft high or low, after rounding to 0.01 ft
    'check_shots_off', (select count(*) from rr, jsonb_array_elements(case when jsonb_typeof(rr.record->'checkShots') = 'array' then rr.record->'checkShots' else '[]'::jsonb end) c
                    where jsonb_typeof(c->'rod') = 'number' and jsonb_typeof(c->'diff') = 'number' and round(abs((c->>'diff')::numeric) * 100 + 0.0000001) / 100 > 0.02),
    -- warnings the app put on the run when it was locked (record.warnings[].type)
    'warn_hi', (select count(*) from rr, jsonb_array_elements(case when jsonb_typeof(rr.record->'warnings') = 'array' then rr.record->'warnings' else '[]'::jsonb end) w
                where w->>'type' in ('hi-minor', 'hi-serious')),
    'warn_backflow', (select count(*) from rr, jsonb_array_elements(case when jsonb_typeof(rr.record->'warnings') = 'array' then rr.record->'warnings' else '[]'::jsonb end) w
                where w->>'type' in ('backflow', 'backflow-all')),
    'warn_low_slope', (select count(*) from rr, jsonb_array_elements(case when jsonb_typeof(rr.record->'warnings') = 'array' then rr.record->'warnings' else '[]'::jsonb end) w
                where w->>'type' = 'low-slope'),
    'warn_other', (select count(*) from rr, jsonb_array_elements(case when jsonb_typeof(rr.record->'warnings') = 'array' then rr.record->'warnings' else '[]'::jsonb end) w
                where w->>'type' in ('typo', 'same-station', 'layout')),
    'runs_users', (select array_agg(distinct rr.user_id) from rr)
  ) into foot;

  -- run notes logged on the phone (pb_prod.site_log: delay / utility / rework / equip)
  with sl as (
    select s.kind, s.data, s.user_id from pb_prod.site_log s
    where s.company_id = v_co.id and coalesce(s.work_date, (s.device_at at time zone v_tz)::date, (s.created_at at time zone v_tz)::date) between d_from and d_to),
  h as (select sl.*, (case when sl.data->>'hours' ~ '^[0-9]+(\.[0-9]+)?$' then (sl.data->>'hours')::numeric else 0 end) hrs,
               (case when sl.data->>'down' ~ '^[0-9]+(\.[0-9]+)?$' then (sl.data->>'down')::numeric else 0 end) dwn from sl)
  select jsonb_build_object(
    'delays', (select count(*) from h where h.kind = 'delay'),
    'delay_hours', (select round(coalesce(sum(h.hrs), 0), 1) from h where h.kind = 'delay'),
    'utility_conflicts', (select count(*) from h where h.kind = 'utility'),
    'utility_damaged', (select count(*) from h where h.kind = 'utility' and h.data->>'damaged' = 'yes'),
    'rework', (select count(*) from h where h.kind = 'rework'),
    'rework_hours', (select round(coalesce(sum(h.hrs), 0), 1) from h where h.kind = 'rework'),
    'breakdowns', (select count(*) from h where h.kind = 'equip' and h.data->>'breakdown' = 'yes'),
    'breakdown_hours', (select round(coalesce(sum(h.dwn), 0), 1) from h where h.kind = 'equip' and h.data->>'breakdown' = 'yes'),
    -- daily report entries (pb_daily.events, current versions only)
    'daily_delays', (select count(*) from pb_daily.events e where e.company_id = v_co.id and e.superseded_at is null and e.kind in ('delay', 'standby') and e.work_date between d_from and d_to),
    'daily_delay_hours', (select round(coalesce(sum(e.hours), 0), 1) from pb_daily.events e where e.company_id = v_co.id and e.superseded_at is null and e.kind in ('delay', 'standby') and e.work_date between d_from and d_to),
    'extra_work', (select count(*) from pb_daily.events e where e.company_id = v_co.id and e.superseded_at is null and e.kind = 'extra' and e.work_date between d_from and d_to),
    'extra_work_hours', (select round(coalesce(sum(e.hours), 0), 1) from pb_daily.events e where e.company_id = v_co.id and e.superseded_at is null and e.kind = 'extra' and e.work_date between d_from and d_to),
    -- inspections recorded (pb_daily.checks)
    'inspections', (select count(*) from pb_daily.checks k where k.company_id = v_co.id and k.done_at >= v_from and k.done_at <= v_to),
    'inspections_failed', (select count(*) from pb_daily.checks k where k.company_id = v_co.id and k.done_at >= v_from and k.done_at <= v_to and k.result = 'fail'),
    'inspections_partial', (select count(*) from pb_daily.checks k where k.company_id = v_co.id and k.done_at >= v_from and k.done_at <= v_to and k.result = 'partial'),
    'site_users', (select array_agg(distinct sl.user_id) from sl)
  ) into caught;

  -- confined-space permits (pb_safety.permits, latest pb_safety.permit_versions record): readings outside the permit's own limits
  with pm as (
    select p.id, p.closed_at, p.first_backed_up_at,
      (select v.record from pb_safety.permit_versions v where v.permit_id = p.id order by v.version desc limit 1) rec
    from pb_safety.permits p
    where p.company_id = v_co.id and coalesce(p.closed_at, p.first_backed_up_at) >= v_from and coalesce(p.closed_at, p.first_backed_up_at) <= v_to),
  rd as (
    select pm.id, a,
      coalesce(case when pm.rec->'permit'->>'minO2' ~ '^[0-9]+(\.[0-9]+)?$' then (pm.rec->'permit'->>'minO2')::numeric end, 19.5) min_o2,
      coalesce(case when pm.rec->'permit'->>'maxO2' ~ '^[0-9]+(\.[0-9]+)?$' then (pm.rec->'permit'->>'maxO2')::numeric end, 23.5) max_o2,
      coalesce(case when pm.rec->'permit'->>'maxLEL' ~ '^[0-9]+(\.[0-9]+)?$' then (pm.rec->'permit'->>'maxLEL')::numeric end, 10) max_lel,
      coalesce(case when pm.rec->'permit'->>'maxH2S' ~ '^[0-9]+(\.[0-9]+)?$' then (pm.rec->'permit'->>'maxH2S')::numeric end, 10) max_h2s,
      coalesce(case when pm.rec->'permit'->>'maxCO' ~ '^[0-9]+(\.[0-9]+)?$' then (pm.rec->'permit'->>'maxCO')::numeric end, 25) max_co
    from pm, jsonb_array_elements(case when jsonb_typeof(pm.rec->'atmoLog') = 'array' then pm.rec->'atmoLog' else '[]'::jsonb end) a),
  rv as (
    select rd.*,
      case when rd.a->>'o2' ~ '^[0-9]+(\.[0-9]+)?$' then (rd.a->>'o2')::numeric end o2,
      case when rd.a->>'lel' ~ '^[0-9]+(\.[0-9]+)?$' then (rd.a->>'lel')::numeric end lel,
      case when rd.a->>'h2s' ~ '^[0-9]+(\.[0-9]+)?$' then (rd.a->>'h2s')::numeric end h2s,
      case when rd.a->>'co' ~ '^[0-9]+(\.[0-9]+)?$' then (rd.a->>'co')::numeric end co
    from rd)
  select jsonb_build_object(
    'permits_closed', (select count(*) from pm where pm.closed_at is not null),
    'permits_backed_up', (select count(*) from pm),
    'permit_readings', (select count(*) from rv),
    'permit_readings_out', (select count(*) from rv where rv.o2 < rv.min_o2 or rv.o2 > rv.max_o2 or rv.lel > rv.max_lel or rv.h2s > rv.max_h2s or rv.co > rv.max_co)
  ) into crew;
  caught := caught || crew;

  -- paperwork
  select jsonb_build_object(
    'runs_sent', foot->'runs_sent', 'runs_reviewed', foot->'runs_reviewed',
    -- signed daily reports, the current version of each (an amendment replaces the one it supersedes)
    'daily_signed', (select count(*) from pb_daily.reports dr where dr.company_id = v_co.id and dr.signed_at is not null and dr.work_date between d_from and d_to
                     and not exists (select 1 from pb_daily.reports d2 where d2.supersedes = dr.id)),
    'permits_closed', caught->'permits_closed',
    'photos_runs', foot->'photos_runs',
    'photos_daily', (select coalesce(sum(k.photo_count), 0) from pb_daily.checks k where k.company_id = v_co.id and k.done_at >= v_from and k.done_at <= v_to)
                  + (select coalesce(sum(e.photo_count), 0) from pb_daily.events e where e.company_id = v_co.id and e.superseded_at is null and e.work_date between d_from and d_to),
    'sealed_copies', (select count(*) from pb_prod.run_seals s where s.company_id = v_co.id and s.sealed_at >= v_from and s.sealed_at <= v_to)
  ) into paper;

  -- the crew and app use
  select jsonb_build_object(
    'members', (select count(*) from public.company_members m where m.company_id = v_co.id),
    'foremen', (select count(*) from public.company_members m where m.company_id = v_co.id and m.role = 'foreman'),
    'pipelayers', (select count(*) from public.company_members m where m.company_id = v_co.id and m.role = 'pipelayer'),
    'managers', (select count(*) from public.company_members m where m.company_id = v_co.id and m.role = 'pm'),
    -- people of the company now who used the app or sent a record in the window
    'active', (select count(distinct u) from (
        select x.user_id u from pb_billing.usage x where x.user_id = any(v_users) and x.day between d_from and d_to
        union select unnest(coalesce((select array_agg(z) from jsonb_array_elements_text(coalesce(foot->'runs_users', '[]'::jsonb)) z), '{}')::uuid[])
        union select unnest(coalesce((select array_agg(z) from jsonb_array_elements_text(coalesce(caught->'site_users', '[]'::jsonb)) z), '{}')::uuid[])
        union select dr.foreman_uid from pb_daily.reports dr where dr.company_id = v_co.id and dr.work_date between d_from and d_to) y
      where y.u = any(v_users) and y.u is distinct from v_co.owner_user_id)
  ) into crew;
  select jsonb_build_object(
    'days_used', (select count(distinct x.day) from pb_billing.usage x where x.user_id = any(v_users) and x.day between d_from and d_to),
    'stake_reads', (select coalesce(sum(a.count), 0) from public.ai_usage a where a.user_id = any(v_users) and a.feature = 'stake' and a.day between d_from and d_to)
  ) into usej;

  return jsonb_build_object('ok', true,
    'company', jsonb_build_object('id', v_co.id, 'name', v_co.name, 'plan', v_co.plan, 'status', v_co.status, 'trial_ends_at', v_co.trial_ends_at,
      'beta_ended', v_co.plan = 'trial' and coalesce(v_co.trial_ends_at, now()) <= now(), 'closed', pb_billing.writes_closed(v_co.id)),
    'window', jsonb_build_object('kind', v_kind, 'from', d_from, 'to', d_to, 'days', d_to - d_from + 1, 'tz', v_tz),
    'as', v_role,
    'footage', jsonb_build_object('laid_ft', foot->'laid_ft', 'pipe_logged_lf', foot->'pipe_logged_lf', 'runs_locked', foot->'runs_locked', 'days_worked', foot->'days_worked'),
    'crew', crew,
    'caught', jsonb_build_object('check_shots', foot->'check_shots', 'check_shots_off', foot->'check_shots_off',
      'warn_hi', foot->'warn_hi', 'warn_backflow', foot->'warn_backflow', 'warn_low_slope', foot->'warn_low_slope', 'warn_other', foot->'warn_other')
      || (caught - 'site_users' - 'permits_closed' - 'permits_backed_up'),
    'paperwork', paper || jsonb_build_object('permits_backed_up', caught->'permits_backed_up'),
    'use', usej,
    'generated_at', now());
end $function$;


  insert into auth.users (id, email, aud, role) select u, 'bs-' || u || '@test.invalid', 'authenticated', 'authenticated' from unnest(array[S, P, F, L, X, XP]) u;
  insert into public.companies (id, name, owner_user_id, status, plan, trial_ends_at, created_at) values
    (C, 'BS Test Pipeline', S, 'active', 'trial', now() + interval '3 days', now() - interval '27 days'),
    (D, 'BS Other Co', X, 'active', 'trial', now() + interval '20 days', now() - interval '10 days');
  insert into public.company_members (company_id, user_id, role, title) values (C, P, 'pm', 'superintendent'), (D, XP, 'pm', 'project_manager');
  insert into public.company_members (company_id, user_id, role) values (C, F, 'foreman'), (C, L, 'pipelayer');

  -- ===== the crew's records during the beta =====
  -- runs: 3 locked sessions (one removed: not counted), check shots (2 of 4 off: 0.03 high, 0.05 low; 0.02 and 0.025->0.03? no: 0.024 rounds to 0.02 = on grade), warnings
  insert into pb_prod.run_records (company_id, user_id, entry_id, record, record_md5, work_date, locked_at, laid_ft, distance_ft, photo_count, sent_at, reviewed_at, removed_at) values
    (C, L, 'bs-r1', jsonb_build_object('checkShots', jsonb_build_array(jsonb_build_object('rod', 4.36, 'diff', 0.03), jsonb_build_object('rod', 4.40, 'diff', -0.05), jsonb_build_object('rod', 4.41, 'diff', 0.02), jsonb_build_object('rod', 4.42, 'diff', 0.024)),
       'warnings', jsonb_build_array(jsonb_build_object('type', 'hi-minor'), jsonb_build_object('type', 'photo'), jsonb_build_object('type', 'low-slope'))), 'x', d0, now() - interval '10 days', 120.5, 130, 4, now() - interval '10 days', now() - interval '9 days', null),
    (C, L, 'bs-r2', jsonb_build_object('warnings', jsonb_build_array(jsonb_build_object('type', 'backflow'), jsonb_build_object('type', 'hi-serious'), jsonb_build_object('type', 'typo'))), 'x', d0 + 1, now() - interval '9 days', 80, 80, 2, now() - interval '9 days', null, null),
    (C, F, 'bs-r3', '{}'::jsonb, 'x', d0 + 2, now() - interval '8 days', 50, 50, 1, null, null, null),
    (C, F, 'bs-r4', '{}'::jsonb, 'x', d0 + 2, now() - interval '8 days', 999, 999, 9, now(), null, now());
  -- another company's run: never counted for C
  insert into pb_prod.run_records (company_id, user_id, entry_id, record, record_md5, work_date, locked_at, laid_ft) values (D, X, 'bs-d1', '{}'::jsonb, 'x', d0, now() - interval '10 days', 777);
  -- foreman production: pipe 200 LF (+ 50 voided)
  insert into pb_prod.entries (id, user_id, company_id, client_entry_id, kind, job_number, work_date, record) values (gen_random_uuid(), F, C, 'bs-e1', 'manual', '26001', d0 + 3, '{}'::jsonb), (gen_random_uuid(), F, C, 'bs-e2', 'manual', '26001', d0 + 3, '{}'::jsonb);
  insert into pb_prod.items (entry_id, category_key, qty, unit, company_id, work_date, voided) select id, 'pipe', 200, 'LF', C, d0 + 3, false from pb_prod.entries where client_entry_id = 'bs-e1' and company_id = C;
  insert into pb_prod.items (entry_id, category_key, qty, unit, company_id, work_date, voided) select id, 'pipe', 50, 'LF', C, d0 + 3, true from pb_prod.entries where client_entry_id = 'bs-e2' and company_id = C;
  -- run notes: 2 delays (1.5 h + 0.75 h), 1 utility conflict (damaged), 1 rework 2 h, 1 breakdown 3 h, 1 equip hours (not a breakdown)
  insert into pb_prod.site_log (user_id, company_id, client_item_id, kind, work_date, data) values
    (L, C, 'bs-s1', 'delay', d0, '{"reason":"inspector","hours":1.5}'), (L, C, 'bs-s2', 'delay', d0 + 1, '{"reason":"equipment","hours":0.75,"note":"Excavator"}'),
    (F, C, 'bs-s3', 'utility', d0 + 1, '{"damaged":"yes","util":"gas"}'), (F, C, 'bs-s4', 'rework', d0 + 2, '{"reason":"grade","hours":2}'),
    (F, C, 'bs-s5', 'equip', d0 + 2, '{"machine":"Loader","breakdown":"yes","down":3,"hours":6}'), (F, C, 'bs-s6', 'equip', d0 + 2, '{"machine":"Roller","breakdown":"no","hours":4}');
  -- sealed copies: 2
  insert into pb_prod.run_seals (user_id, company_id, entry_id, version, path, sha256, bytes, sealed_at) values (L, C, 'bs-r1', 1, 'bs/' || C || '/1.pdf', repeat('a', 64), 1000, now() - interval '10 days'), (L, C, 'bs-r1', 2, 'bs/' || C || '/2.pdf', repeat('b', 64), 1000, now() - interval '9 days');
  -- inspections: an item (company account), checks by the foreman: 1 fail, 1 partial (2 photos), then pass
  perform pg_temp.act(S);
  insert into pb_daily.items (id, company_id, client_item_id, job_number, kind, foreman_uid, location_text) values (IT, C, 'bs-i1', '26001', 'inspection', F, 'MH-3 to MH-4');
  perform pg_temp.act(F);
  insert into pb_daily.checks (item_id, company_id, job_key, client_check_id, result, inspector_name, inspector_agency, done_at, done_tz, photo_count) values
    (IT, C, 'x', 'bs-c1', 'fail', 'Pat', 'City', now() - interval '9 days', 'America/Los_Angeles', 0),
    (IT, C, 'x', 'bs-c2', 'partial', 'Pat', 'City', now() - interval '8 days', 'America/Los_Angeles', 2),
    (IT, C, 'x', 'bs-c3', 'pass', 'Pat', 'City', now() - interval '7 days', 'America/Los_Angeles', 1);
  -- a signed daily report and an amendment of it (counts once), plus a second day
  insert into pb_daily.reports (company_id, job_key, job_number, work_date, client_report_id, snapshot, snapshot_sha256, signed_name, signed_at, signed_tz)
    values (C, 'x', '26001', d0, 'bs-d1', '{}'::jsonb, repeat('c', 64), 'Fred Foreman', now() - interval '10 days', 'America/Los_Angeles') returning id into RP;
  insert into pb_daily.reports (company_id, job_key, job_number, work_date, client_report_id, snapshot, snapshot_sha256, signed_name, signed_at, signed_tz, supersedes, amend_reason)
    values (C, 'x', '26001', d0, 'bs-d1b', '{}'::jsonb, repeat('d', 64), 'Fred Foreman', now() - interval '9 days', 'America/Los_Angeles', RP, 'Forgot the loader');
  insert into pb_daily.reports (company_id, job_key, job_number, work_date, client_report_id, snapshot, snapshot_sha256, signed_name, signed_at, signed_tz)
    values (C, 'x', '26001', d0 + 4, 'bs-d2', '{}'::jsonb, repeat('e', 64), 'Fred Foreman', now() - interval '6 days', 'America/Los_Angeles');
  -- daily report entries: standby 4 h, delay 1 h (1 photo), extra work 2.5 h, and a superseded delay (not counted)
  insert into pb_daily.events (company_id, job_key, job_number, report_id, client_event_id, work_date, kind, reason, hours, created_by, photo_count, superseded_at) values
    (C, 'x', '26001', RP, 'bs-v1', d0, 'standby', 'weather', 4, F, 0, null), (C, 'x', '26001', RP, 'bs-v2', d0, 'delay', 'utility', 1, F, 1, null),
    (C, 'x', '26001', RP, 'bs-v3', d0, 'extra', 'owner_extra', 2.5, F, 0, null), (C, 'x', '26001', RP, 'bs-v4', d0, 'delay', 'other', 9, F, 0, now());
  -- a closed permit with 4 readings: 2 outside its own limits (O2 19.0 below 19.5; CO 30 above its 25), 1 text value not counted
  insert into pb_safety.permits (id, user_id, company_id, client_permit_id, space, closed_at, first_backed_up_at) values (PMT, F, C, 'bs-p1', 'MH-3', now() - interval '8 days', now() - interval '8 days');
  insert into pb_safety.permit_versions (permit_id, version, record, record_sha256) values (PMT, 1,
    jsonb_build_object('kind', 'confined', 'permit', jsonb_build_object('minO2', 19.5, 'maxO2', 23.5, 'maxLEL', 10, 'maxH2S', 10, 'maxCO', 25),
      'atmoLog', jsonb_build_array(jsonb_build_object('o2', 20.9, 'lel', 0), jsonb_build_object('o2', 19.0, 'lel', 0), jsonb_build_object('o2', 20.8, 'lel', 1, 'co', 30), jsonb_build_object('o2', 'bad', 'lel', 0))), repeat('f', 64));
  -- app use: 3 days, stake reads 7 (+ another company's user: not counted)
  insert into pb_billing.usage (day, user_id, company_id, ev, n) values (d0, L, C, 'open', 3), (d0 + 1, F, C, 'open', 1), (d0 + 2, P, C, 'open', 1), (d0, X, D, 'open', 5);
  insert into public.ai_usage (user_id, day, feature, count) values (L, d0, 'stake', 4), (F, d0 + 1, 'stake', 3), (L, d0, 'teacher', 2), (X, d0, 'stake', 9);
  -- a run TODAY (inside the beta now; outside it once the beta is ended 4 days ago)
  insert into pb_prod.run_records (company_id, user_id, entry_id, record, record_md5, work_date, locked_at, laid_ft) values (C, L, 'bs-r5', '{}'::jsonb, 'x', current_date, now(), 10);

  -- ===== who may call =====
  perform pg_temp.act(S); r := public.pb_company_beta_summary();
  if not (r->>'ok')::boolean or r->'company'->>'id' <> C::text or r->>'as' <> 'owner' then raise exception 'FAIL 1 owner %', r; end if;
  perform pg_temp.act(P); r2 := public.pb_company_beta_summary();
  if r2->>'as' <> 'pm' or (r2 - 'as' - 'generated_at') <> (r - 'as' - 'generated_at') then raise exception 'FAIL 2 super sees the same %', r2; end if;
  perform pg_temp.act(P); r2 := public.pb_company_beta_summary(C);
  if r2->>'as' <> 'pm' then raise exception 'FAIL 2b super with id'; end if;
  perform pg_temp.act(F); e := pg_temp.err('select public.pb_company_beta_summary()'); if e <> 'pb:not_allowed' then raise exception 'FAIL 3 foreman %', e; end if;
  e := pg_temp.err(format('select public.pb_company_beta_summary(%L)', C)); if e <> 'pb:not_allowed' then raise exception 'FAIL 3b foreman id %', e; end if;
  perform pg_temp.act(L); e := pg_temp.err(format('select public.pb_company_beta_summary(%L)', C)); if e <> 'pb:not_allowed' then raise exception 'FAIL 4 pipelayer %', e; end if;
  e := pg_temp.err('select public.pb_company_beta_summary()'); if e <> 'pb:not_allowed' then raise exception 'FAIL 4b pipelayer %', e; end if;
  perform pg_temp.act(X); e := pg_temp.err(format('select public.pb_company_beta_summary(%L)', C)); if e <> 'pb:not_allowed' then raise exception 'FAIL 5 other owner %', e; end if;
  perform pg_temp.act(XP); e := pg_temp.err(format('select public.pb_company_beta_summary(%L)', C)); if e <> 'pb:not_allowed' then raise exception 'FAIL 5b other PM %', e; end if;
  perform pg_temp.act(A); r2 := public.pb_company_beta_summary(C);
  if r2->>'as' <> 'admin' or (r2 - 'as' - 'generated_at') <> (r - 'as' - 'generated_at') then raise exception 'FAIL 6 admin %', r2; end if;
  e := pg_temp.err('select public.pb_company_beta_summary()'); if e <> 'pb:not_allowed' then raise exception 'FAIL 6b admin with no company of his own %', e; end if;
  e := pg_temp.err(format('select public.pb_company_beta_summary(%L)', gen_random_uuid())); if e <> 'pb:no_company' then raise exception 'FAIL 6c no company %', e; end if;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true); e := pg_temp.err('select public.pb_company_beta_summary()'); if e <> 'pb:not_signed_in' then raise exception 'FAIL 7 no user %', e; end if;

  -- ===== the numbers (beta still on: window = created 27 days ago to now) =====
  if r->'window'->>'kind' <> 'beta' or (r->'window'->>'from')::date > current_date - 26 or (r->'window'->>'to')::date < current_date - 1 then raise exception 'FAIL 8 window %', r->'window'; end if;
  if (r->'footage'->>'laid_ft')::numeric <> 260.5 or (r->'footage'->>'runs_locked')::int <> 4 or (r->'footage'->>'pipe_logged_lf')::numeric <> 200 then raise exception 'FAIL 9 footage %', r->'footage'; end if;
  if (r->'footage'->>'days_worked')::int <> 6 then raise exception 'FAIL 9b days worked (d0..d0+4 and today) %', r->'footage'; end if;
  if (r->'crew'->>'members')::int <> 3 or (r->'crew'->>'foremen')::int <> 1 or (r->'crew'->>'pipelayers')::int <> 1 or (r->'crew'->>'managers')::int <> 1 or (r->'crew'->>'active')::int <> 3 then raise exception 'FAIL 10 crew %', r->'crew'; end if;
  if (r->'caught'->>'check_shots')::int <> 4 or (r->'caught'->>'check_shots_off')::int <> 2 then raise exception 'FAIL 11 check shots %', r->'caught'; end if;
  if (r->'caught'->>'warn_hi')::int <> 2 or (r->'caught'->>'warn_backflow')::int <> 1 or (r->'caught'->>'warn_low_slope')::int <> 1 or (r->'caught'->>'warn_other')::int <> 1 then raise exception 'FAIL 12 warnings %', r->'caught'; end if;
  if (r->'caught'->>'delays')::int <> 2 or (r->'caught'->>'delay_hours')::numeric <> 2.3 or (r->'caught'->>'utility_conflicts')::int <> 1 or (r->'caught'->>'utility_damaged')::int <> 1
     or (r->'caught'->>'rework')::int <> 1 or (r->'caught'->>'rework_hours')::numeric <> 2 or (r->'caught'->>'breakdowns')::int <> 1 or (r->'caught'->>'breakdown_hours')::numeric <> 3 then raise exception 'FAIL 13 run notes %', r->'caught'; end if;
  if (r->'caught'->>'daily_delays')::int <> 2 or (r->'caught'->>'daily_delay_hours')::numeric <> 5 or (r->'caught'->>'extra_work')::int <> 1 or (r->'caught'->>'extra_work_hours')::numeric <> 2.5 then raise exception 'FAIL 14 daily entries %', r->'caught'; end if;
  if (r->'caught'->>'inspections')::int <> 3 or (r->'caught'->>'inspections_failed')::int <> 1 or (r->'caught'->>'inspections_partial')::int <> 1 then raise exception 'FAIL 15 inspections %', r->'caught'; end if;
  if (r->'caught'->>'permit_readings')::int <> 4 or (r->'caught'->>'permit_readings_out')::int <> 2 then raise exception 'FAIL 16 permit readings %', r->'caught'; end if;
  if (r->'paperwork'->>'runs_sent')::int <> 2 or (r->'paperwork'->>'runs_reviewed')::int <> 1 or (r->'paperwork'->>'daily_signed')::int <> 2 or (r->'paperwork'->>'permits_closed')::int <> 1
     or (r->'paperwork'->>'photos_runs')::int <> 7 or (r->'paperwork'->>'photos_daily')::int <> 4 or (r->'paperwork'->>'sealed_copies')::int <> 2 then raise exception 'FAIL 17 paperwork %', r->'paperwork'; end if;
  if (r->'use'->>'days_used')::int <> 3 or (r->'use'->>'stake_reads')::int <> 7 then raise exception 'FAIL 18 use %', r->'use'; end if;
  if (r->'company'->>'beta_ended')::boolean or (r->'company'->>'closed')::boolean then raise exception 'FAIL 19 flags %', r->'company'; end if;
  res := res || jsonb_build_object('during_beta', r - 'generated_at' - 'company');

  -- ===== beta ended 4 days ago and the company closed (writes refused): reading still works, today's run is outside the window =====
  update public.companies set trial_ends_at = now() - interval '4 days' where id = C;
  if pg_temp.err(format('insert into pb_prod.site_log (user_id, company_id, client_item_id, kind, data) values (%L, %L, %L, %L, %L)', L, C, 'bs-late', 'delay', '{}')) <> 'pb:beta_ended' then raise exception 'FAIL 20 ended beta should refuse writes'; end if;
  perform pg_temp.act(S); r2 := public.pb_company_beta_summary();
  if not (r2->'company'->>'beta_ended')::boolean or not (r2->'company'->>'closed')::boolean then raise exception 'FAIL 21 ended flags %', r2->'company'; end if;
  if (r2->'window'->>'to')::date <> current_date - 4 or (r2->'footage'->>'laid_ft')::numeric <> 250.5 or (r2->'footage'->>'days_worked')::int <> 5 then raise exception 'FAIL 22 ended window %', r2; end if;
  perform pg_temp.act(P); r2 := public.pb_company_beta_summary();
  if not (r2->>'ok')::boolean or (r2->'footage'->>'runs_locked')::int <> 3 then raise exception 'FAIL 23 super after the end %', r2; end if;
  -- company status no longer active (e.g. closed out): the owner and the super still read it
  update public.companies set status = 'inactive' where id = C;
  perform pg_temp.act(S); r2 := public.pb_company_beta_summary();
  if r2->'company'->>'id' <> C::text or r2->'company'->>'status' <> 'inactive' then raise exception 'FAIL 24 inactive owner %', r2->'company'; end if;
  perform pg_temp.act(P); r2 := public.pb_company_beta_summary();
  if r2->'company'->>'id' <> C::text then raise exception 'FAIL 24b inactive super'; end if;
  perform pg_temp.act(F); if pg_temp.err('select public.pb_company_beta_summary()') <> 'pb:not_allowed' then raise exception 'FAIL 24c inactive foreman'; end if;
  res := res || jsonb_build_object('after_end', jsonb_build_object('window', r2->'window', 'company', (r2->'company') - 'id' - 'trial_ends_at', 'laid_ft', r2->'footage'->'laid_ft', 'runs_locked', r2->'footage'->'runs_locked'));
  -- a paid company: the last 30 days
  update public.companies set plan = 'paid', trial_ends_at = null, status = 'active' where id = C;
  perform pg_temp.act(S); r2 := public.pb_company_beta_summary();
  if r2->'window'->>'kind' <> 'last_30_days' or (r2->'window'->>'days')::int <> 31 or (r2->'footage'->>'laid_ft')::numeric <> 260.5 then raise exception 'FAIL 25 paid window %', r2->'window'; end if;
  -- nothing was written by the reads
  res := res || jsonb_build_object('paid_window', r2->'window', 'function_flags', (select jsonb_build_object('secdef', p.prosecdef, 'volatile', p.provolatile, 'config', p.proconfig) from pg_proc p where p.oid = 'public.pb_company_beta_summary(uuid)'::regprocedure));
  raise exception 'RESULT: %', res;
end $T$;
