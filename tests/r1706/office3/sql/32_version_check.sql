-- office3 #32: a version check on the server for Job details and a job's PMs & supers, so a copy of the app that loaded
-- them earlier (or an old app) can't put back what another manager just changed.
--
-- Job details: pb_prod.job_info gets info_ver (0 for every row today). pb_prod_job_info_get returns the details with
-- their version; pb_prod_job_info_set takes p_expect_ver and answers {ok:false, code:'pb:changed', now:{...}} when the
-- row moved on since. Each real change adds 1 (a save that changes nothing changes nothing).
-- PMs & supers: the version is worked out, not stored: the number of assignment rows for the job plus the number of
-- ended ones (pb_pm.job_pms rows are permanent; every add inserts a row and every removal ends one, so it only grows).
-- pb_job_pms_get / _set return it as 'ver'; pb_job_pms_set takes p_expect_ver.
-- The old signatures (no expected version) now refuse with pb:update_app: an app from before this change can't save
-- these two things until it updates (decision 1 in NOTES). Nothing else about them changes.
-- Apply BEFORE the app patch 03 ships (the patched app falls back to the old signatures while the new ones are missing).

begin;

alter table pb_prod.job_info add column if not exists info_ver integer not null default 0;

create or replace function pb_pm.job_ver(p_company uuid, p_job_key text)
 returns integer language sql stable security definer set search_path to '' as $$
  select (count(*) + count(a.ended_at))::integer from pb_pm.job_pms a where a.company_id = p_company and a.job_key = p_job_key
$$;
revoke all on function pb_pm.job_ver(uuid, text) from public, anon, authenticated;

-- ---------- Job details ----------
create or replace function public.pb_prod_job_info_get(p_job_number text)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text := pb_prod.job_key(p_job_number); i pb_prod.job_info%rowtype;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_company := pb_prod.managed_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  select * into i from pb_prod.job_info j where j.company_id = v_company and j.job_key = v_key;
  return jsonb_build_object('ok', true, 'job_key', v_key, 'job_number', i.job_number, 'project_name', i.project_name, 'address', i.address,
    'start_date', i.start_date, 'info_ver', coalesce(i.info_ver, 0), 'server_at', now());
end $function$;

create or replace function public.pb_prod_job_info_set(p_job_number text, p_project_name text, p_address text, p_start_date date, p_expect_uid uuid, p_expect_ver integer)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text := pb_prod.job_key(p_job_number); v_job text;
  v_name text := nullif(left(btrim(coalesce(p_project_name, '')), 120), ''); v_addr text := nullif(left(btrim(coalesce(p_address, '')), 300), '');
  v_n integer; v_cur pb_prod.job_info%rowtype; v_ver integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_company := pb_prod.managed_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_expect_ver is null or p_expect_ver < 0 then raise exception 'pb:bad_version'; end if;
  if p_start_date is not null and (p_start_date < date '2000-01-01' or p_start_date > current_date + 3650) then raise exception 'pb:bad_date'; end if;
  select count(*) into v_n from pb_prod.job_info i where i.company_id = v_company and i.updated_at > now() - interval '1 day' and i.updated_at <> i.created_at;
  if v_n >= 500 then raise exception 'pb:quota'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_company::text || '|' || v_key, 0));
  select * into v_cur from pb_prod.job_info i where i.company_id = v_company and i.job_key = v_key for update;
  if coalesce(v_cur.info_ver, 0) <> p_expect_ver then
    return jsonb_build_object('ok', false, 'code', 'pb:changed', 'now', jsonb_build_object('project_name', v_cur.project_name, 'address', v_cur.address,
      'start_date', v_cur.start_date, 'info_ver', coalesce(v_cur.info_ver, 0)));
  end if;
  select coalesce(v_cur.job_number,
                  (select p.job_number from pb_prod.plans p where p.company_id = v_company and p.job_key = v_key),
                  (select e.job_number from pb_prod.entries e where e.company_id = v_company and e.job_key = v_key and not e.voided order by e.updated_at desc limit 1)) into v_job;
  if v_job is null then raise exception 'pb:not_found'; end if;
  if v_cur.job_key is not null and v_cur.project_name is not distinct from v_name and v_cur.address is not distinct from v_addr and v_cur.start_date is not distinct from p_start_date then
    return jsonb_build_object('ok', true, 'same', true, 'job_key', v_key, 'job_number', v_job, 'project_name', v_name, 'address', v_addr, 'start_date', p_start_date, 'info_ver', v_cur.info_ver);
  end if;
  v_ver := coalesce(v_cur.info_ver, 0) + 1;
  insert into pb_prod.job_info (company_id, job_key, job_number, project_name, address, start_date, created_by, info_ver)
    values (v_company, v_key, left(v_job, 60), v_name, v_addr, p_start_date, v_uid, v_ver)
    on conflict (company_id, job_key) do update set project_name = excluded.project_name, address = excluded.address, start_date = excluded.start_date,
      info_ver = excluded.info_ver, updated_at = now();
  return jsonb_build_object('ok', true, 'job_key', v_key, 'job_number', v_job, 'project_name', v_name, 'address', v_addr, 'start_date', p_start_date, 'info_ver', v_ver);
end $function$;

-- the old signature: an app from before the version check
create or replace function public.pb_prod_job_info_set(p_job_number text, p_project_name text, p_address text, p_start_date date, p_expect_uid uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
begin raise exception 'pb:update_app'; end $function$;

-- ---------- PMs & supers ----------
create or replace function public.pb_job_pms_get(p_job_number text)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := pb_prod.job_key(p_job_number);
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  return jsonb_build_object('ok', true, 'company_id', v_co, 'can_edit', true,
    'is_owner', exists (select 1 from public.companies c where c.id = v_co and c.owner_user_id = v_uid)) || pb_pm.job_state(v_co, v_key)
    || jsonb_build_object('ver', pb_pm.job_ver(v_co, v_key)); -- office3 #32
end $function$;

create or replace function public.pb_job_pms_set(p_job_number text, p_user_ids uuid[], p_expect_uid uuid, p_expect_ver integer)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := pb_prod.job_key(p_job_number); v_ids uuid[]; v_old jsonb; v_bad uuid; v_ver integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is distinct from v_uid then raise exception 'pb:wrong_account'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_expect_ver is null or p_expect_ver < 0 then raise exception 'pb:bad_version'; end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_user_ids, '{}'::uuid[])) x where x is not null;
  if cardinality(v_ids) > 10 then raise exception 'pb:too_many_pms'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pb_pm_job:' || v_co::text || ':' || v_key, 0));
  v_ver := pb_pm.job_ver(v_co, v_key);
  if v_ver <> p_expect_ver then -- office3 #32: someone changed the list since this copy read it; nothing is written
    return jsonb_build_object('ok', false, 'code', 'pb:changed', 'company_id', v_co) || pb_pm.job_state(v_co, v_key) || jsonb_build_object('ver', v_ver);
  end if;
  select x into v_bad from unnest(v_ids) x where not pb_pm.is_pm(x, v_co) limit 1;
  v_old := (pb_pm.job_state(v_co, v_key))->'assigned';
  if v_bad is not null then
    insert into pb_pm.audit (company_id, actor, action, job_key, old_value, new_value, outcome, code)
      values (v_co, v_uid, 'job_pms', v_key, v_old, to_jsonb(v_ids), 'refused', 'pb:not_pm');
    return jsonb_build_object('ok', false, 'code', 'pb:not_pm', 'user_id', v_bad);
  end if;
  -- feat_office:pms (owner rule Oct 28): the owner, PMs and supers take anyone off; a manager only themselves
  if not (exists (select 1 from public.companies c where c.id = v_co and c.owner_user_id = v_uid) or pb_pm.is_pm(v_uid, v_co)) then
    select a.user_id into v_bad from pb_pm.job_pms a
      where a.company_id = v_co and a.job_key = v_key and a.ended_at is null and a.user_id <> v_uid and not (a.user_id = any (v_ids)) limit 1;
    if v_bad is not null then
      insert into pb_pm.audit (company_id, actor, action, job_key, old_value, new_value, outcome, code)
        values (v_co, v_uid, 'job_pms', v_key, v_old, to_jsonb(v_ids), 'refused', 'pb:owner_only');
      return jsonb_build_object('ok', false, 'code', 'pb:owner_only', 'user_id', v_bad);
    end if;
  end if;
  update pb_pm.job_pms set ended_at = now(), ended_by = v_uid, end_reason = 'unassigned'
    where company_id = v_co and job_key = v_key and ended_at is null and not (user_id = any (v_ids));
  insert into pb_pm.job_pms (company_id, job_key, job_number, user_id, assigned_by)
    select v_co, v_key, left(btrim(p_job_number), 60), x, v_uid from unnest(v_ids) x
    on conflict (company_id, job_key, user_id) where ended_at is null do nothing;
  insert into pb_pm.audit (company_id, actor, action, job_key, old_value, new_value, outcome, code)
    values (v_co, v_uid, 'job_pms', v_key, v_old, to_jsonb(v_ids), 'ok', null);
  return jsonb_build_object('ok', true, 'company_id', v_co) || pb_pm.job_state(v_co, v_key) || jsonb_build_object('ver', pb_pm.job_ver(v_co, v_key));
end $function$;

create or replace function public.pb_job_pms_set(p_job_number text, p_user_ids uuid[], p_expect_uid uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
begin raise exception 'pb:update_app'; end $function$;

revoke all on function public.pb_prod_job_info_get(text) from public, anon;
revoke all on function public.pb_prod_job_info_set(text, text, text, date, uuid, integer) from public, anon;
revoke all on function public.pb_job_pms_set(text, uuid[], uuid, integer) from public, anon;
grant execute on function public.pb_prod_job_info_get(text) to authenticated;
grant execute on function public.pb_prod_job_info_set(text, text, text, date, uuid, integer) to authenticated;
grant execute on function public.pb_job_pms_set(text, uuid[], uuid, integer) to authenticated;

commit;
