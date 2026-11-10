CREATE OR REPLACE FUNCTION public.pb_prod_foreman_scope(p_today date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_today date := pb_prod.today(p_today); v jsonb; v_mgr boolean;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_company := pb_prod.my_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_member'; end if;
  v_mgr := pb_prod.managed_company(v_uid) is not distinct from v_company;
  select jsonb_build_object('today', v_today, 'server_at', now(),
    'jobs', coalesce((select jsonb_agg(jsonb_build_object('job_key', j.job_key, 'job_number', j.job_number, 'last_at', j.last_at,
        'plan', (select case when v_mgr then p.plan else pb_prod.crew_plan(p.plan) end from pb_prod.plans p where p.company_id = v_company and p.job_key = j.job_key),
        'cats', (select coalesce(jsonb_agg(c) filter (where v_mgr or c->>'key' <> '_manhours'), '[]'::jsonb) from jsonb_array_elements(pb_prod.cat_sums(v_company, j.job_key, v_today)) c),
        'locates', pb_prod.locates_json(v_company, j.job_key), -- feat_locates
        'mine', coalesce((select jsonb_agg(jsonb_build_object('key', m.category_key, 'unit', m.unit, 'done', m.done, 'today', m.today) order by m.category_key)
            from (select i.category_key, coalesce(i.unit, '') unit, sum(i.qty) done, coalesce(sum(i.qty) filter (where i.work_date = v_today), 0) today
              from pb_prod.items i join pb_prod.entries e on e.id = i.entry_id
              where (e.user_id = v_uid or e.covers_user = v_uid) and e.company_id = v_company and e.job_key = j.job_key and i.qty is not null and not i.voided
                and pb_prod.counts(e.company_id, e.user_id, e.kind, e.role, e.crew_state, e.created_at) group by 1, 2) m), '[]'::jsonb)
      ) order by j.last_at desc)
      from (select k.job_key, (array_agg(k.job_number order by k.at desc))[1] job_number, max(k.at) last_at
        from (
          select e.job_key, e.job_number, e.updated_at at
          from pb_prod.entries e
          where (e.user_id = v_uid or e.covers_user = v_uid) and e.company_id = v_company and e.job_key <> '' and not e.voided
            and exists (select 1 from pb_prod.items i where i.entry_id = e.id and i.qty >= 1 and i.category_key not like '\_%' and not i.voided) -- review 2: at least 1 LF / 1 EA
          union all
          select r.job_key, r.job_number, r.updated_at
          from pb_prod.run_records r
          where r.user_id = v_uid and r.company_id = v_company and coalesce(r.job_key, '') <> '' and r.removed_at is null
        ) k
        group by k.job_key order by 3 desc limit 50) j), '[]'::jsonb)) into v;
  return v;
end $function$;

-- r16.15: page the signed-in person's own run records so a reinstalled phone can restore Records and Stats.
CREATE OR REPLACE FUNCTION public.pb_run_mine_page(p_before_locked timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL, p_limit integer DEFAULT 25)
 RETURNS TABLE(row_id uuid, entry_id text, locked_at timestamptz, version integer, record jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'pb:signed_out'; end if;
  return query
    select r.id, r.entry_id, r.locked_at, r.version, r.record
    from pb_prod.run_records r
    where r.user_id = auth.uid() and r.removed_at is null and r.record is not null
      and (p_before_id is null or (coalesce(r.locked_at, '-infinity'::timestamptz), r.id) < (coalesce(p_before_locked, '-infinity'::timestamptz), p_before_id))
    order by coalesce(r.locked_at, '-infinity'::timestamptz) desc, r.id desc
    limit least(greatest(coalesce(p_limit, 25), 1), 50);
end $function$;
revoke all on function public.pb_run_mine_page(timestamptz, uuid, integer) from public, anon;
grant execute on function public.pb_run_mine_page(timestamptz, uuid, integer) to authenticated;
