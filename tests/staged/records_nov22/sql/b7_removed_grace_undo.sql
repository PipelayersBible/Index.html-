-- undo records_nov22 B7 (the removals log is kept; only the grace is taken out)
begin;
select pb_stage.patch_fn('public.pb_prod_run_record_put(text,jsonb,uuid,uuid)'::regprocedure,
$o$  if v_company is null then -- records_nov22 B7: a run locked before he was removed still goes, for 14 days
    begin v_lock := (p_record->>'lockTime')::timestamptz; exception when others then v_lock := null; end;
    select m.company_id into v_company from pb_prod.member_removals m
      where m.user_id = v_uid and m.company_id = p_access_company and m.removed_at > now() - interval '14 days' and v_lock is not null and v_lock < m.removed_at
      order by m.removed_at desc limit 1;
  end if;
$o$, '');
commit;
