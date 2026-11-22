-- rolled-back test for 02: a listed manager fills in a past day for one of the company's foremen. Always raises RESULT.
do $T$
declare q_tag text := substr(md5(random()::text),1,10); q_ow uuid := gen_random_uuid(); q_fm uuid := gen_random_uuid();
  q_pm uuid := gen_random_uuid(); q_xx uuid := gen_random_uuid(); q_co uuid := gen_random_uuid(); q_day date := (now() at time zone 'utc')::date - 2;
  q_r jsonb; q_r2 jsonb; q_r3 jsonb; q_pass int := 0; q_fail int := 0; q_msg text := ''; f text;
begin
  select content into f from net._http_response where id = current_setting('pbfix.f02')::bigint; execute f;
  insert into auth.users (id, email) select u.v, 'pbfix-' || q_tag || '-' || u.o || '@example.invalid' from unnest(array[q_ow, q_fm, q_pm, q_xx]) with ordinality u(v, o);
  insert into public.companies (id, name, owner_user_id, status, plan) values (q_co, 'pbfix ' || q_tag, q_ow, 'active', 'paid');
  insert into public.company_members (company_id, user_id, role) values (q_co, q_fm, 'foreman'), (q_co, q_pm, 'pm'), (q_co, q_xx, 'pipelayer');
  insert into pb_reports.managers (company_id, user_id) values (q_co, q_pm) on conflict do nothing;
  -- manager fills in for the foreman
  perform set_config('request.jwt.claims', jsonb_build_object('sub', q_pm, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  set local role authenticated;
  begin q_r := public.pb_daily_submit('f-' || q_tag || '-1', 'F-' || q_tag, 'Fix site', q_day,
      jsonb_build_object('office_fill', jsonb_build_object('for_uid', q_fm)), encode(sha256('f1'::bytea), 'hex'),
      'Office Person', now(), 'America/Los_Angeles', null, null, null, now(), true, q_pm);
  exception when others then q_r := jsonb_build_object('err', sqlerrm); end;
  reset role;
  if q_r->>'ok' = 'true' then q_pass := q_pass + 1; else q_fail := q_fail + 1; q_msg := q_msg || ' office fill: ' || q_r::text; end if;
  -- a pipelayer (not a manager) can't fill in for the foreman
  perform set_config('request.jwt.claims', jsonb_build_object('sub', q_xx, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  set local role authenticated;
  begin q_r2 := public.pb_daily_submit('f-' || q_tag || '-2', 'F-' || q_tag, 'Fix site', q_day,
      jsonb_build_object('office_fill', jsonb_build_object('for_uid', q_fm)), encode(sha256('f2'::bytea), 'hex'),
      'Not Office', now(), 'America/Los_Angeles', null, null, null, now(), true, q_xx);
  exception when others then q_r2 := jsonb_build_object('err', sqlerrm); end;
  reset role;
  if q_r2->>'ok' = 'false' and q_r2->>'err' is null then q_pass := q_pass + 1; else q_fail := q_fail + 1; q_msg := q_msg || ' non-manager: ' || q_r2::text; end if;
  -- manager can't fill in for someone who isn't a foreman of the company
  perform set_config('request.jwt.claims', jsonb_build_object('sub', q_pm, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  set local role authenticated;
  begin q_r3 := public.pb_daily_submit('f-' || q_tag || '-3', 'F-' || q_tag, 'Fix site', q_day,
      jsonb_build_object('office_fill', jsonb_build_object('for_uid', q_xx)), encode(sha256('f3'::bytea), 'hex'),
      'Office Person', now(), 'America/Los_Angeles', null, null, null, now(), true, q_pm);
  exception when others then q_r3 := jsonb_build_object('err', sqlerrm); end;
  reset role;
  if q_r3->>'code' = 'pb:not_foreman' then q_pass := q_pass + 1; else q_fail := q_fail + 1; q_msg := q_msg || ' not-a-foreman: ' || q_r3::text; end if;
  raise exception 'RESULT: % pass, % fail%', q_pass, q_fail, q_msg;
end $T$;
