-- Rolled-back test of 01_safety_search.sql. Run the function file and this DO block in ONE transaction (one query); the
-- block always ends in raise exception 'RESULT: ...', so nothing is kept (the function, the test rows, the audit rows).
-- It picks a company that has a foreman who is not a manager, and another company, from the live data.
do $t$
declare A uuid; B uuid; ownA uuid; ownB uuid; fm uuid; r jsonb; out text := ''; ok boolean := true; k1 text := pb_prod.job_key('ZZ-SAF-1'); k2 text := pb_prod.job_key('ZZ-SAF-2'); e text;
begin
  select c.id, c.owner_user_id, (select m.user_id from public.company_members m where m.company_id = c.id and m.role = 'foreman' and pb_prod.managed_company(m.user_id) is null limit 1)
    into A, ownA, fm from public.companies c where c.status = 'active' and exists (select 1 from public.company_members m where m.company_id = c.id and m.role = 'foreman' and pb_prod.managed_company(m.user_id) is null) order by c.created_at limit 1;
  select c.id, c.owner_user_id into B, ownB from public.companies c where c.status = 'active' and c.id <> A and c.owner_user_id is not null order by c.created_at limit 1;
  if A is null then raise exception 'RESULT: SKIP no company with a foreman'; end if;
  insert into pb_prod.job_items (id, company_id, job_key, job_number, kind, data, status, version, created_by, created_at, updated_by, updated_at, photo_count) values
    (gen_random_uuid(), A, k1, 'ZZ-SAF-1', 'safety', '{"kind":"Near miss","date":"2026-11-10","time":"09:15","people":"Joe Laborer","what":"Bucket swung near a laborer"}', 'open', 1, fm, now(), fm, now(), 0),
    (gen_random_uuid(), A, k1, 'ZZ-SAF-1', 'safety', '{"kind":"Stop work","date":"2026-11-12","time":"13:00","people":"Sam Operator","what":"Gas smell, stopped work"}', 'closed', 2, fm, now(), fm, now(), 1),
    (gen_random_uuid(), A, k2, 'ZZ-SAF-2', 'safety', '{"kind":"Incident","date":"2026-11-15","what":"Trench wall sloughed"}', 'open', 1, ownA, now(), ownA, now(), 0),
    (gen_random_uuid(), A, k2, 'ZZ-SAF-2', 'safety', '{"kind":"Incident","date":"2026-11-16","what":"removed one"}', 'void', 1, fm, now(), fm, now(), 0),
    (gen_random_uuid(), A, k2, 'ZZ-SAF-2', 'issue', '{"title":"not safety"}', 'open', 1, fm, now(), fm, now(), 0);
  if B is not null then
    insert into pb_prod.job_items (id, company_id, job_key, job_number, kind, data, status, version, created_by, created_at, updated_by, updated_at, photo_count) values
      (gen_random_uuid(), B, k1, 'ZZ-SAF-1', 'safety', '{"kind":"Incident","date":"2026-11-12","what":"other company"}', 'open', 1, ownB, now(), ownB, now(), 0);
  end if;
  -- as company A's owner
  perform set_config('request.jwt.claims', json_build_object('sub', ownA, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', ownA::text, true);
  r := public.pb_jb_safety_search(null, null, '2026-11-01', '2026-11-30', null, 50, 0, ownA);
  out := out || ' all=' || (r->>'total'); ok := ok and (r->>'total')::int = 3 and not exists (select 1 from jsonb_array_elements(r->'items') x where x->>'what' in ('other company', 'removed one', 'not safety'));
  ok := ok and (r->'items'->0->>'kind') = 'Incident' and (r->'items'->0->>'date') = '2026-11-15'; -- newest first
  r := public.pb_jb_safety_search('zz-saf-1', null, null, null, null, 50, 0, ownA); out := out || ' job1=' || (r->>'total'); ok := ok and (r->>'total')::int = 2;
  r := public.pb_jb_safety_search(null, array['Stop work', 'Near miss'], null, null, null, 50, 0, ownA); out := out || ' kinds=' || (r->>'total'); ok := ok and (r->>'total')::int = 2;
  r := public.pb_jb_safety_search(null, null, '2026-11-11', '2026-11-14', null, 50, 0, ownA); out := out || ' range=' || (r->>'total'); ok := ok and (r->>'total')::int = 1 and r->'items'->0->>'kind' = 'Stop work';
  r := public.pb_jb_safety_search(null, null, null, null, 'sam', 50, 0, ownA); out := out || ' who(people)=' || (r->>'total'); ok := ok and (r->>'total')::int = 1;
  r := public.pb_jb_safety_search(null, null, '2026-11-01', '2026-11-30', null, 1, 1, ownA); out := out || ' page=' || jsonb_array_length(r->'items') || '/' || (r->>'total'); ok := ok and jsonb_array_length(r->'items') = 1 and (r->>'total')::int = 3;
  out := out || ' jobs=' || jsonb_array_length((select jsonb_agg(x) from jsonb_array_elements(r->'jobs') x where x->>'job_number' like 'ZZ-SAF-%'));
  begin r := public.pb_jb_safety_search(null, array['Paper cut'], null, null, null, 50, 0, ownA); out := out || ' badkind=ACCEPTED'; ok := false; exception when others then out := out || ' badkind=' || sqlerrm; ok := ok and sqlerrm = 'pb:bad_kind'; end;
  begin r := public.pb_jb_safety_search(null, null, '2026-11-20', '2026-11-01', null, 50, 0, ownA); ok := false; exception when others then out := out || ' baddates=' || sqlerrm; ok := ok and sqlerrm = 'pb:bad_dates'; end;
  begin r := public.pb_jb_safety_search(null, null, null, null, null, 50, 0, ownB); ok := false; exception when others then out := out || ' wronguid=' || sqlerrm; ok := ok and sqlerrm = 'pb:wrong_account'; end;
  -- a foreman (not a manager) is refused
  perform set_config('request.jwt.claims', json_build_object('sub', fm, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', fm::text, true);
  begin r := public.pb_jb_safety_search(null, null, null, null, null, 50, 0, fm); out := out || ' foreman=ACCEPTED'; ok := false; exception when others then out := out || ' foreman=' || sqlerrm; ok := ok and sqlerrm = 'pb:not_company_account'; end;
  -- the other company's owner sees only its own
  if B is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', ownB, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', ownB::text, true);
    r := public.pb_jb_safety_search('ZZ-SAF-1', null, null, null, null, 50, 0, ownB); out := out || ' otherco=' || (r->>'total'); ok := ok and (r->>'total')::int = 1 and r->'items'->0->>'what' = 'other company';
  end if;
  -- signed out
  perform set_config('request.jwt.claims', '', true); perform set_config('request.jwt.claim.sub', '', true);
  begin r := public.pb_jb_safety_search(); ok := false; exception when others then out := out || ' anon=' || sqlerrm; ok := ok and sqlerrm = 'pb:signed_out'; end;
  -- grants: no public / anon execute
  ok := ok and not has_function_privilege('anon', 'public.pb_jb_safety_search(text, text[], date, date, text, integer, integer, uuid)', 'execute') and has_function_privilege('authenticated', 'public.pb_jb_safety_search(text, text[], date, date, text, integer, integer, uuid)', 'execute');
  raise exception 'RESULT: % %', case when ok then 'PASS' else 'FAIL' end, out;
end $t$;
