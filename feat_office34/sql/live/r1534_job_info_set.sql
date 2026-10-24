-- The Pipelayer's Bible r15.34 · feat_office34 / 35 (Oct 24 2026, overnight office sweep):
-- a project's name, address and start date can be corrected after the New job wizard.
--
-- pb_prod_job_create (batch 27, sql/01_new_project.sql) is the only function that took p_project_name / p_address /
-- p_start_date, so a typo in the wizard's Details step stayed on the Home card, the hero and every PDF header for the life
-- of the job. This function updates the same columns on the same table (pb_prod.job_info) with pb_prod_job_create's
-- guards: signed in, the expected account, the company account (owner, manager or PM through pb_prod.managed_company),
-- a job number, a sane date, the same per-job advisory lock. The job must exist in this company (a plan, job info or a
-- counted production entry); a job created before job_info existed (or through pb_prod_plan_set) gets its row here.
-- Empty strings clear a field. Returns the saved details. Re-running this file is safe.
--
-- App: Edit project › "Project details" (feat_office34 O9) calls it, then refreshes the dashboard.
create or replace function public.pb_prod_job_info_set(p_job_number text, p_project_name text, p_address text, p_start_date date, p_expect_uid uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text := pb_prod.job_key(p_job_number); v_job text;
  v_name text := nullif(left(btrim(coalesce(p_project_name, '')), 120), ''); v_addr text := nullif(left(btrim(coalesce(p_address, '')), 300), '');
  v_n integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_company := pb_prod.managed_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_start_date is not null and (p_start_date < date '2000-01-01' or p_start_date > current_date + 3650) then raise exception 'pb:bad_date'; end if;
  -- at most 500 jobs' details changed a day per company (the same ceiling as plan saves)
  select count(*) into v_n from pb_prod.job_info i where i.company_id = v_company and i.updated_at > now() - interval '1 day' and i.updated_at <> i.created_at;
  if v_n >= 500 then raise exception 'pb:quota'; end if;
  -- the same lock as pb_prod_plan_set / pb_prod_job_create, so a job created at the same moment can't slip in between
  perform pg_advisory_xact_lock(hashtextextended(v_company::text || '|' || v_key, 0));
  select coalesce((select i.job_number from pb_prod.job_info i where i.company_id = v_company and i.job_key = v_key),
                  (select p.job_number from pb_prod.plans p where p.company_id = v_company and p.job_key = v_key),
                  (select e.job_number from pb_prod.entries e where e.company_id = v_company and e.job_key = v_key and not e.voided order by e.updated_at desc limit 1)) into v_job;
  if v_job is null then raise exception 'pb:not_found'; end if;
  insert into pb_prod.job_info (company_id, job_key, job_number, project_name, address, start_date, created_by)
    values (v_company, v_key, left(v_job, 60), v_name, v_addr, p_start_date, v_uid)
    on conflict (company_id, job_key) do update set project_name = excluded.project_name, address = excluded.address, start_date = excluded.start_date, updated_at = now();
  return jsonb_build_object('ok', true, 'job_key', v_key, 'job_number', v_job, 'project_name', v_name, 'address', v_addr, 'start_date', p_start_date);
end $function$;
grant execute on function public.pb_prod_job_info_set(text, text, text, date, uuid) to authenticated, service_role;
notify pgrst, 'reload schema';
