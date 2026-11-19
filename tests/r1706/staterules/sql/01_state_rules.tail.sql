
-- the company's state and every job's picked state, for the company account, its PMs and its foremen
create or replace function public.pb_state_rules_get()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_company uuid;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_company := pb_prod.locate_company(v_uid, false);
  return jsonb_build_object('ok', true,
    'company_state', (select s.state from pb_prod.job_states s where s.company_id = v_company and s.job_key = ''),
    'jobs', coalesce((select jsonb_object_agg(s.job_key, s.state) from pb_prod.job_states s where s.company_id = v_company and s.job_key <> ''), '{}'::jsonb),
    'can_set_company', pb_prod.managed_company(v_uid) is not distinct from v_company,
    'checked', (select max(r.checked) from pb_prod.state_rules r),
    'server_at', now());
end $function$;

-- set (or clear, p_state null) a job's state; p_job_number null or '' sets the company's state (company account and
-- its managers only). Foremen and PMs of the company may set a job's state, like they add locate tickets.
create or replace function public.pb_job_state_set(p_job_number text, p_state text, p_expect_uid uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text; v_state text := nullif(upper(btrim(coalesce(p_state, ''))), ''); v_n integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  if btrim(coalesce(p_job_number, '')) = '' then
    v_company := pb_prod.managed_company(v_uid);
    if v_company is null then raise exception 'pb:not_company_account'; end if;
    v_key := '';
  else
    v_company := pb_prod.locate_company(v_uid, true);
    v_key := pb_prod.job_key(p_job_number);
    if v_key = '' then raise exception 'pb:bad_job'; end if;
  end if;
  if v_state is not null and not exists (select 1 from pb_prod.state_rules r where r.code = v_state) then raise exception 'pb:bad_state'; end if;
  if v_state is null then
    delete from pb_prod.job_states s where s.company_id = v_company and s.job_key = v_key;
  else
    select count(*) into v_n from pb_prod.job_states s where s.company_id = v_company;
    if v_n >= 5000 and not exists (select 1 from pb_prod.job_states s where s.company_id = v_company and s.job_key = v_key) then raise exception 'pb:quota'; end if;
    insert into pb_prod.job_states (company_id, job_key, state, updated_by, updated_at) values (v_company, v_key, v_state, v_uid, now())
      on conflict (company_id, job_key) do update set state = excluded.state, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  end if;
  return jsonb_build_object('ok', true, 'job_key', v_key, 'state', v_state, 'server_at', now());
end $function$;

revoke all on function public.pb_state_rules_get() from public, anon;
revoke all on function public.pb_job_state_set(text, text, uuid) from public, anon;
grant execute on function public.pb_state_rules_get() to authenticated;
grant execute on function public.pb_job_state_set(text, text, uuid) to authenticated;
