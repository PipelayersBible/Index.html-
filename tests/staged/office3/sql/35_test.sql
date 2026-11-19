-- office3 #35 rolled-back test: run AFTER the body of 35_leave_handover.sql (without begin/commit), same transaction.
-- DIG Civil: foreman F (4fc9..) linked to pipelayer P (8cd3..); PM M (e4a0..) is made a foreman for the test.
do $t$
declare own uuid := 'e03416b7-6086-40a5-8d42-9267b846fc26'; f uuid := '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e'; m uuid := 'e4a0170b-1189-4bd5-86fe-e47e092ede3f';
  p uuid := '8cd34746-efb4-469c-b1d7-caa8709ba3e4'; co uuid := 'd01a4a5f-312a-418f-9172-ea9aec9784b5'; eid uuid; r jsonb; out text := '';
  procedure_as text;
begin
  -- setup: M becomes a foreman; a crew run of P waiting for F's claim
  update public.company_members set role = 'foreman' where company_id = co and user_id = m;
  insert into pb_prod.entries (user_id, company_id, client_entry_id, kind, job_number, job_key, work_date, record, crew_state, assigned_to, assigned_at, role)
    values (p, co, 'office3-test-run-1', 'run', '26014', '26014', current_date, '{}'::jsonb, 'pending', f, now(), 'pipelayer') returning id into eid;
  -- F is removed by the owner (what the crew function's take_out does)
  delete from public.company_members where company_id = co and user_id = f;
  out := out || 'setup: m_foreman=' || pb_prod.is_foreman_of(m, co) || ' f_foreman=' || pb_prod.is_foreman_of(f, co) || ' link_open=' || exists (select 1 from pb_prod.crew_links where foreman_id = f and pipelayer_id = p and ended_at is null);
  -- a crew member can't hand over
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', p::text, true);
  begin r := public.pb_crew_handover(f, m, p); out := out || ' | crew HANDED OVER'; exception when others then out := out || ' | crew=' || sqlerrm; end;
  -- the owner hands F's runs and crew to M
  perform set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', own::text, true);
  r := public.pb_crew_handover(f, own, own); out := out || ' | to non-foreman=' || coalesce(r->>'code', r::text);
  r := public.pb_crew_handover(m, f, own); out := out || ' | to removed=' || coalesce(r->>'code', r::text);
  r := public.pb_crew_handover(f, m, own);
  out := out || ' | handover ok=' || (r->>'ok') || ' runs=' || (r->>'runs') || ' crew=' || (r->>'crew') || ' to=' || coalesce(r->>'to_name', '')
    || ' entry_to_m=' || ((select assigned_to from pb_prod.entries where id = eid) = m)::text
    || ' assign_action=' || exists (select 1 from pb_prod.crew_actions a where a.entry_id = eid and a.action = 'assign' and a.target_user = m and a.by_user = own)::text
    || ' new_link=' || exists (select 1 from pb_prod.crew_links where foreman_id = m and pipelayer_id = p and ended_at is null)::text
    || ' old_link_ended=' || (not exists (select 1 from pb_prod.crew_links where foreman_id = f and ended_at is null))::text
    || ' push_m=' || exists (select 1 from pb_push.outbox o where o.user_id = m and o.dedupe_key like 'handover:%')::text
    || ' audit=' || exists (select 1 from pb_crew.audit a where a.action = 'handover' and a.target_user = f and a.outcome = 'ok')::text;
  r := public.pb_crew_handover(f, m, own); out := out || ' | again runs=' || (r->>'runs') || ' crew=' || (r->>'crew');
  r := public.pb_crew_handover(m, m, own); out := out || ' | same=' || coalesce(r->>'code', '');
  -- P leaves the company
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', p::text, true);
  r := public.pb_crew_leave(p, '1def3eee-4e8c-47db-904b-7dacd0bc7c44'); out := out || ' || leave wrong co=' || coalesce(r->>'code', '');
  begin r := public.pb_crew_leave(own, co); out := out || ' | other uid ALLOWED'; exception when others then out := out || ' | other uid=' || sqlerrm; end;
  r := public.pb_crew_leave(p, co);
  out := out || ' | leave ok=' || (r->>'ok') || ' co=' || coalesce(r->>'company_name', '') || ' role=' || coalesce(r->>'role', '')
    || ' member_gone=' || (not exists (select 1 from public.company_members where user_id = p))::text
    || ' links_ended=' || (not exists (select 1 from pb_prod.crew_links where pipelayer_id = p and ended_at is null))::text
    || ' left_note=' || exists (select 1 from pb_billing.left_company l where l.user_id = p and l.company_id = co and l.dismissed_at is null)::text
    || ' push_owner=' || exists (select 1 from pb_push.outbox o where o.user_id = own and o.dedupe_key like 'leave:' || p::text || '%')::text
    || ' audit=' || exists (select 1 from pb_crew.audit a where a.action = 'leave' and a.actor = p and a.outcome = 'ok')::text;
  r := public.pb_crew_leave(p, co); out := out || ' | again=' || coalesce(r->>'code', '');
  -- the owner (no membership row) can't leave this way
  perform set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', own::text, true);
  r := public.pb_crew_leave(own, co); out := out || ' | owner=' || coalesce(r->>'code', '');
  out := out || ' | grants leave=' || has_function_privilege('authenticated', 'public.pb_crew_leave(uuid,uuid)', 'execute')
    || ' handover=' || has_function_privilege('authenticated', 'public.pb_crew_handover(uuid,uuid,uuid)', 'execute')
    || ' anon_leave=' || has_function_privilege('anon', 'public.pb_crew_leave(uuid,uuid)', 'execute')
    || ' anon_handover=' || has_function_privilege('anon', 'public.pb_crew_handover(uuid,uuid,uuid)', 'execute');
  raise exception 'RESULT: %', out;
end $t$;
