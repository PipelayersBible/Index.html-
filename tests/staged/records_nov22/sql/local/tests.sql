-- LOCAL ONLY: checks of the staged B migrations on the scratch replica. Each block ends by raising 'RESULT: ...' so
-- everything it did is rolled back; \set ON_ERROR_STOP off so every block reports.
\set ON_ERROR_STOP off
-- B3: the open permit's first-seen proof moves onto the permit; the open row goes
do $t$ declare u uuid := gen_random_uuid(); p pb_safety.permits; begin
  insert into pb_safety.open_permits (user_id, client_permit_id, snapshot, record_sha256, bytes, saves, first_saved_at, saved_at)
    values (u, 'cps-1', jsonb_build_object('phoneAt', to_char((now() + interval '90 seconds') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')), 'abc', 10, 7, now() - interval '3 hours', now());
  insert into pb_safety.permits (user_id, client_permit_id) values (u, 'cps-1') returning * into p;
  select * into p from pb_safety.permits where id = p.id;
  if p.open_saves = 7 and p.open_first_saved_at < now() - interval '2 hours' and p.open_last_sha256 = 'abc' and p.open_clock_ahead_s between 85 and 95
     and not exists (select 1 from pb_safety.open_permits where user_id = u) then raise exception 'RESULT: PASS B3 proof copied (saves 7, first seen 3 h before, clock +% s), open row dropped', p.open_clock_ahead_s; end if;
  raise exception 'RESULT: FAIL B3 % % %', p.open_saves, p.open_first_saved_at, p.open_clock_ahead_s;
end $t$;
-- B9: no direct delete of an open permit; the close-out path still drops it
do $t$ declare u uuid := gen_random_uuid(); begin
  insert into pb_safety.open_permits (user_id, client_permit_id, snapshot, record_sha256, bytes) values (u, 'cps-2', '{}', 'x', 1);
  begin delete from pb_safety.open_permits where user_id = u; raise exception 'RESULT: FAIL B9 open permit deleted directly';
  exception when others then if sqlerrm <> 'pb:history_is_permanent' then raise; end if; end;
  insert into pb_safety.permits (user_id, client_permit_id) values (u, 'cps-2');
  if exists (select 1 from pb_safety.open_permits where user_id = u) then raise exception 'RESULT: FAIL B9 close-out could not drop the open row'; end if;
  if (select count(*) from pb_audit.admin_log where tbl = 'pb_safety.open_permits') < 2 then raise exception 'RESULT: FAIL B9 open_permits writes not in the admin log'; end if;
  raise exception 'RESULT: PASS B9 open permit: direct delete refused, close-out drop allowed, writes logged';
end $t$;
-- B9: events — review fields change, content doesn't; photos and reviews insert-only; report delete no longer cascades
do $t$ declare r uuid; e uuid; ok text := ''; begin
  insert into pb_daily.reports (company_id) values (gen_random_uuid()) returning id into r;
  insert into pb_daily.events (company_id, job_key, job_number, report_id, client_event_id, work_date, kind, reason, hours, created_by) values (gen_random_uuid(), 'j', 'J', r, 'c1', current_date, 'delay', 'Rain', 2, gen_random_uuid()) returning id into e;
  update pb_daily.events set status = 'approved', reviewed_at = now(), review_rev = review_rev + 1 where id = e; ok := ok || 'review ok; ';
  update pb_daily.events set superseded_at = now() where id = e; ok := ok || 'supersede ok; ';
  begin update pb_daily.events set hours = 9 where id = e; ok := ok || 'HOURS CHANGED; '; exception when others then ok := ok || 'hours refused; '; end;
  begin update pb_daily.events set superseded_at = null where id = e; ok := ok || 'UNSUPERSEDED; '; exception when others then ok := ok || 'unsupersede refused; '; end;
  begin delete from pb_daily.events where id = e; ok := ok || 'EVENT DELETED; '; exception when others then ok := ok || 'event delete refused; '; end;
  insert into pb_daily.event_photos (event_id, n, company_id, data_b64) values (e, 1, gen_random_uuid(), 'x');
  begin update pb_daily.event_photos set data_b64 = 'y'; ok := ok || 'PHOTO CHANGED; '; exception when others then ok := ok || 'photo change refused; '; end;
  begin delete from pb_daily.event_photos; ok := ok || 'PHOTO DELETED; '; exception when others then ok := ok || 'photo delete refused; '; end;
  insert into pb_daily.report_photos (report_id, n, company_id, data_b64, sha256) values (r, 1, gen_random_uuid(), 'x', 's');
  begin delete from pb_daily.reports where id = r; ok := ok || 'REPORT+PHOTOS DELETED; '; exception when others then ok := ok || 'report delete blocked (no cascade); '; end;
  insert into pb_daily.event_reviews (company_id, event_id, job_key, work_date, foreman_uid, client_event_id, from_status, to_status) values (gen_random_uuid(), e, 'j', current_date, gen_random_uuid(), 'c1', 'new', 'approved');
  begin update pb_daily.event_reviews set note = 'x'; ok := ok || 'REVIEW CHANGED; '; exception when others then ok := ok || 'review change refused; '; end;
  if ok ~ '[A-Z]{4,}' then raise exception 'RESULT: FAIL B9 %', ok; end if;
  raise exception 'RESULT: PASS B9 daily: %', ok;
end $t$;
-- B9: ticket photos insert-only; B5: talk versions kept, locked
do $t$ declare tk uuid; c uuid := gen_random_uuid(); tid uuid := gen_random_uuid(); ok text := ''; n integer; begin
  insert into pb_tickets.tickets default values returning id into tk;
  insert into pb_tickets.photos (ticket_id, data_b64) values (tk, 'x');
  begin delete from pb_tickets.photos; ok := ok || 'TICKET PHOTO DELETED; '; exception when others then ok := ok || 'ticket photo delete refused; '; end;
  insert into public.companies values (c);
  insert into pb_prod.talks_given (id, company_id, user_id, job_key, job_number, talk_id, title, given_on, attendees) values (tid, c, gen_random_uuid(), 'j', 'J', 'TT-001', 'Trench', current_date, '[{"name":"A"}]');
  update pb_prod.talks_given set attendees = '[{"name":"A"},{"name":"B"}]', version = 2, updated_at = now() where talks_given.id = tid;
  select count(*) into n from pb_prod.talk_versions v where v.talk_id = tid;
  ok := ok || n || ' talk versions; ';
  if (select row_data->'attendees' from pb_prod.talk_versions v where v.talk_id = tid and version = 1) <> '[{"name":"A"}]' then ok := ok || 'V1 LOST; '; end if;
  begin update pb_prod.talk_versions set row_data = '{}'; ok := ok || 'VERSION CHANGED; '; exception when others then ok := ok || 'version change refused; '; end;
  begin delete from pb_prod.talks_given where talks_given.id = tid; ok := ok || 'TALK DELETED; '; exception when others then ok := ok || 'talk delete refused; '; end;
  if ok ~ '[A-Z]{4,}' or n <> 2 then raise exception 'RESULT: FAIL B5/B9 %', ok; end if;
  raise exception 'RESULT: PASS B5/B9 %', ok;
end $t$;
-- B8: manager-only run history
do $t$ declare c uuid := gen_random_uuid(); u uuid := gen_random_uuid(); r uuid; j jsonb; begin
  insert into pb_prod.run_records (company_id, user_id, entry_id, version) values (c, gen_random_uuid(), 'e1', 2) returning id into r;
  insert into pb_prod.run_record_versions (run_record_id, version, record, record_md5) values (r, 1, '{"a":1}', 'm1'), (r, 2, '{"a":2}', 'm2');
  insert into pb_prod.run_record_events (run_record_id, company_id, action, by_user, note) values (r, c, 'removed', u, 'Entered twice');
  perform set_config('test.uid', u::text, true);
  begin perform public.pb_prod_run_versions(r, u); raise exception 'RESULT: FAIL B8 not a manager but got the history';
  exception when others then if sqlerrm <> 'pb:not_company_account' then raise; end if; end;
  perform set_config('test.managed', c::text, true);
  j := public.pb_prod_run_versions(r, u);
  if jsonb_array_length(j->'versions') = 2 and j->'versions'->1->'record'->>'a' = '2' and j->'events'->0->>'note' = 'Entered twice' then raise exception 'RESULT: PASS B8 manager gets 2 versions + the removal with its reason; others refused'; end if;
  raise exception 'RESULT: FAIL B8 %', j;
end $t$;
-- A9 (on the stand-in) through _patchfn: empty reason refused; a piece found twice is refused
do $t$ declare r uuid; begin
  insert into pb_prod.run_records (company_id, user_id, entry_id) values (gen_random_uuid(), gen_random_uuid(), 'e2') returning id into r;
  perform pb_stage.patch_fn('public.pb_prod_run_remove(uuid,text,uuid)'::regprocedure, $o$  if false then return jsonb_build_object('ok', true, 'again', true); end if;$o$,
    $n$  if false then return jsonb_build_object('ok', true, 'again', true); end if;
  if v_reason is null or length(v_reason) < 3 then raise exception 'pb:reason_required'; end if; -- records_nov22 A9$n$);
  begin perform public.pb_prod_run_remove(r, '  ', null); raise exception 'RESULT: FAIL A9 empty reason accepted'; exception when others then if sqlerrm <> 'pb:reason_required' then raise; end if; end;
  if public.pb_prod_run_remove(r, 'Entered twice', null)->>'reason' <> 'Entered twice' then raise exception 'RESULT: FAIL A9 reason lost'; end if;
  begin perform pb_stage.patch_fn('public.pb_prod_run_remove(uuid,text,uuid)'::regprocedure, 'v_reason', 'x'); raise exception 'RESULT: FAIL patch_fn patched a piece found many times';
  exception when others then if sqlerrm !~ 'expected the piece once' then raise; end if; end;
  raise exception 'RESULT: PASS A9 empty reason refused, reason kept; patch_fn refuses an ambiguous piece';
end $t$;
