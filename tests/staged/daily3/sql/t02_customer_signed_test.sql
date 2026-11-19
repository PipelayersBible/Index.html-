-- Rolled-back test of 02_customer_signed.sql: run the function file and this block in ONE query. A foreman of a live
-- company signs a daily for job ZZ-XS-1 through pb_daily_submit (the real path: triggers, events_store) with three
-- entries; the office's pb_daily_events_list then says who signed. Ends in raise exception 'RESULT: ...' (nothing kept).
do $t$
declare A uuid; ownA uuid; fm uuid; r jsonb; L jsonb; out text := ''; ok boolean := true; e1 jsonb; e2 jsonb; e3 jsonb; snap jsonb;
begin
  select c.id, c.owner_user_id, (select m.user_id from public.company_members m where m.company_id = c.id and m.role = 'foreman' and pb_prod.managed_company(m.user_id) is null limit 1)
    into A, ownA, fm from public.companies c where c.status = 'active' and exists (select 1 from public.company_members m where m.company_id = c.id and m.role = 'foreman' and pb_prod.managed_company(m.user_id) is null) order by c.created_at limit 1;
  if A is null then raise exception 'RESULT: SKIP no company with a foreman'; end if;
  snap := jsonb_build_object('v', 1, 'kind', 'foreman_daily_report', 'job', jsonb_build_object('number', 'ZZ-XS-1'), 'work_date', to_char((now() at time zone 'utc')::date - 1, 'YYYY-MM-DD'),
    'crew_today', jsonb_build_object('people', '[]'::jsonb),
    'events', jsonb_build_array(
      jsonb_build_object('cid', 'xs1', 'kind', 'extra', 'reason', 'owner_extra', 'detail', 'Moved hydrant 6 ft', 'hours', 3, 'crew_size', 3, 'equipment', '[]'::jsonb, 'photos', '[]'::jsonb,
        'cust_sig', jsonb_build_object('v', 1, 'name', 'Pat Owner', 'title', 'Owner''s rep', 'at', '2026-11-18T20:10:00.000Z', 'tz', 'America/Los_Angeles', 'png', 'iVBORw0KGgo=', 'png_sha', repeat('a', 64), 'entry_sha', repeat('b', 64))),
      jsonb_build_object('cid', 'xs2', 'kind', 'delay', 'reason', 'weather', 'hours', 1, 'equipment', '[]'::jsonb, 'photos', '[]'::jsonb),
      jsonb_build_object('cid', 'xs3', 'kind', 'extra', 'reason', 'design', 'detail', 'Extra tee', 'hours', 2, 'equipment', '[]'::jsonb, 'photos', '[]'::jsonb,
        'prior', jsonb_build_array(jsonb_build_object('hours', 1.5, 'reason', 'design', 'cust_sig', jsonb_build_object('name', 'Pat Owner', 'at', '2026-11-18T18:00:00.000Z', 'tz', 'America/Los_Angeles'))))));
  perform set_config('request.jwt.claims', json_build_object('sub', fm, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', fm::text, true);
  r := public.pb_daily_submit('zz-xs-test-' || gen_random_uuid()::text, 'ZZ-XS-1', null, (now() at time zone 'utc')::date - 1, snap, repeat('c', 64), 'Test Foreman', now(), 'America/Los_Angeles', null, null, null, now(), true, fm);
  out := out || ' submit=' || coalesce(r->>'ok', '?') || '/' || coalesce(r->>'code', '') || ' events=' || coalesce(r->>'events', '?'); ok := ok and (r->>'ok')::boolean and (r->>'events')::int = 3;
  perform set_config('request.jwt.claims', json_build_object('sub', ownA, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', ownA::text, true);
  L := public.pb_daily_events_list('ZZ-XS-1', null, 30, ownA);
  select x into e1 from jsonb_array_elements(L->'events') x where x->>'client_event_id' = 'xs1';
  select x into e2 from jsonb_array_elements(L->'events') x where x->>'client_event_id' = 'xs2';
  select x into e3 from jsonb_array_elements(L->'events') x where x->>'client_event_id' = 'xs3';
  out := out || ' e1=' || coalesce(e1->'customer_signed'->>'name', 'null') || '/' || coalesce(e1->'customer_signed'->>'title', '') || ' e2=' || coalesce((e2->'customer_signed')::text, '?') || ' e3=' || coalesce((e3->>'amended_after_signature'), '?') || '/' || coalesce((e3->'customer_signed')::text, '?');
  ok := ok and e1->'customer_signed'->>'name' = 'Pat Owner' and e1->'customer_signed'->>'entry_sha256' = repeat('b', 64) and not (e1->'customer_signed' ? 'png')
           and e2 ? 'customer_signed' and jsonb_typeof(e2->'customer_signed') = 'null' and (e2->>'amended_after_signature')::boolean = false
           and jsonb_typeof(e3->'customer_signed') = 'null' and (e3->>'amended_after_signature')::boolean = true;
  -- every older event still reads (no snapshot match: the two keys, null / false)
  ok := ok and not exists (select 1 from pb_daily.events e where not (pb_daily.event_json(e) ? 'customer_signed'));
  raise exception 'RESULT: % %', case when ok then 'PASS' else 'FAIL' end, out;
end $t$;
