-- office3 #36: the office's first bulk exports (spreadsheets).
-- pb_prod_export_days(p_job_number, p_from, p_to): a job's production by day, one row per day, item and unit, with the
--   quantity and how many entries it came from. The same rule as the job page and Home's totals (pb_prod.counts: voided
--   entries and crew runs still in their 24-hour hold are left out), so the spreadsheet agrees with the dashboard.
-- pb_prod_export_hours(p_job_number, p_from, p_to): crew hours for payroll, from the signed daily reports: one row per
--   person on each report's "Crew on site" list (the foreman's own numbers, as signed), only the newest version of each
--   report (an amendment replaces the report it supersedes). p_job_number null: every job of the company.
-- Both: the company account, PMs/supers and managers only (pb_prod.managed_company); at most 400 days per export;
-- read-only. Execute for authenticated only.

begin;

create or replace function public.pb_prod_export_days(p_job_number text, p_from date, p_to date)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := pb_prod.job_key(p_job_number);
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then raise exception 'pb:bad_range'; end if;
  return jsonb_build_object('ok', true, 'job_key', v_key, 'from', p_from, 'to', p_to, 'server_at', now(),
    'job', (select jsonb_build_object('job_number', i.job_number, 'project_name', i.project_name, 'address', i.address) from pb_prod.job_info i where i.company_id = v_co and i.job_key = v_key),
    'plan', (select p.plan from pb_prod.plans p where p.company_id = v_co and p.job_key = v_key),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('date', d.work_date, 'key', d.category_key, 'unit', d.unit, 'qty', d.q, 'entries', d.n) order by d.work_date, d.category_key, d.unit)
      from (select i.work_date, i.category_key, coalesce(i.unit, '') unit, sum(i.qty) q, count(distinct i.entry_id) n
              from pb_prod.items i join pb_prod.entries e on e.id = i.entry_id
             where i.company_id = v_co and i.job_key = v_key and i.qty is not null and not i.voided and i.work_date between p_from and p_to
               and pb_prod.counts(e.company_id, e.user_id, e.kind, e.role, e.crew_state, e.created_at)
             group by 1, 2, 3) d), '[]'::jsonb));
end $function$;

create or replace function public.pb_prod_export_hours(p_job_number text, p_from date, p_to date)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := case when nullif(btrim(coalesce(p_job_number, '')), '') is null then null else pb_prod.job_key(p_job_number) end;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then raise exception 'pb:bad_range'; end if;
  return jsonb_build_object('ok', true, 'job_key', v_key, 'from', p_from, 'to', p_to, 'server_at', now(),
    'rows', coalesce((select jsonb_agg(x order by x->>'date', x->>'job_number', x->>'foreman', (x->>'n')::int) from (
      select jsonb_build_object('date', r.work_date, 'job_number', r.job_number, 'jobsite', r.jobsite, 'foreman', r.signed_name,
               'signed_at', r.signed_at, 'version', r.version, 'report_id', r.id, 'n', p.n,
               'name', left(coalesce(nullif(btrim(p.v->>'name'), ''), 'Name not entered'), 120),
               'hours', case when jsonb_typeof(p.v->'hours') = 'number' then (p.v->>'hours')::numeric end,
               'linked', (p.v->>'user_id') is not null) x
        from pb_daily.reports r
        cross join lateral jsonb_array_elements(case when jsonb_typeof(r.snapshot->'crew_today'->'people') = 'array' then r.snapshot->'crew_today'->'people' else '[]'::jsonb end) with ordinality p(v, n)
       where r.company_id = v_co and r.work_date between p_from and p_to and (v_key is null or r.job_key = v_key)
         and not exists (select 1 from pb_daily.reports n2 where n2.supersedes = r.id)
         and jsonb_typeof(p.v) = 'object') s), '[]'::jsonb),
    'reports', (select count(*) from pb_daily.reports r where r.company_id = v_co and r.work_date between p_from and p_to and (v_key is null or r.job_key = v_key)
                  and not exists (select 1 from pb_daily.reports n2 where n2.supersedes = r.id)));
end $function$;

revoke all on function public.pb_prod_export_days(text, date, date) from public, anon;
revoke all on function public.pb_prod_export_hours(text, date, date) from public, anon;
grant execute on function public.pb_prod_export_days(text, date, date) to authenticated;
grant execute on function public.pb_prod_export_hours(text, date, date) to authenticated;

commit;
