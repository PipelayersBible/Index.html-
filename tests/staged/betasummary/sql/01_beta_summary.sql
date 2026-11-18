-- Beta Results summary (staged Nov 18 2026; NOT applied). One read-only RPC for the one-page "Beta Results" PDF a
-- superintendent hands to his company owner. Counts only what the company's own records in the app hold, over the
-- beta window (company created_at to trial_ends_at, or to now while the beta runs), or the last 30 days for a paid company.
-- Who may call: the company account (owner), the company's PMs / superintendents (company_members.role = 'pm'), and the
-- app admin (pb_support.admin_ok) for any company. Foremen and pipelayers: refused (pb:not_allowed).
-- It never checks companies.status or the billing state, so it still works after the beta has ended and the company is
-- closed or read-only. It writes nothing.
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

revoke all on function public.pb_company_beta_summary(uuid) from public;
revoke all on function public.pb_company_beta_summary(uuid) from anon;
grant execute on function public.pb_company_beta_summary(uuid) to authenticated;
