-- locate811 #02: rolled-back test of 01_locate_renew_history.sql. Nothing is kept: it always ends with
-- raise exception 'RESULT: ...' (the lead's way), which undoes every row it wrote.
-- Run it either in the same transaction as the body of 01 (without its begin/commit), or after 01 is applied.
-- It finds its people itself: a company that has a foreman and a job on file (live: the beta company, job 26014),
-- that company's account, PM and pipelayer when there are any, and a member of another company when there is one.
-- Expected last line: RESULT: PASS 49/49 (fewer checks, all passing, where a PM / pipelayer / second company is missing).
do $t$
declare co uuid; own uuid; fm uuid; pm uuid; pl uuid; other uuid; job text; d date := current_date;
  t1 uuid := gen_random_uuid(); t2 uuid := gen_random_uuid(); t3 uuid := gen_random_uuid(); t4 uuid := gen_random_uuid(); t5 uuid := gen_random_uuid();
  r jsonb; g jsonb; n integer := 0; bad text := ''; e text; v integer; i integer; v_before bigint; nf integer := 0;
begin
  select m.company_id, m.user_id, c.owner_user_id into co, fm, own from public.company_members m join public.companies c on c.id = m.company_id
    where m.role = 'foreman' and c.status = 'active' and exists (select 1 from pb_prod.job_info j where j.company_id = m.company_id)
      and pb_prod.managed_company(m.user_id) is null
    order by (select count(*) from public.company_members x where x.company_id = m.company_id) desc limit 1;
  if co is null then raise exception 'RESULT: no company with a foreman and a job to test with'; end if;
  select j.job_number into job from pb_prod.job_info j where j.company_id = co order by j.job_key limit 1;
  select m.user_id into pm from public.company_members m where m.company_id = co and m.role = 'pm' limit 1;
  select m.user_id into pl from public.company_members m where m.company_id = co and m.role = 'pipelayer' limit 1;
  select m.user_id into other from public.company_members m join public.companies c on c.id = m.company_id where m.company_id <> co and c.status = 'active' and m.role in ('foreman', 'pm')
    and pb_prod.managed_company(m.user_id) is distinct from co limit 1;
  select count(*) into v_before from pb_prod.locate_log;
  perform set_config('request.jwt.claims', json_build_object('sub', fm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', fm::text, true);

  -- 1) a plain add through the old 9-argument call: Renew can show (renewals 0), History has its first row
  r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1', d - 10, d + 5, 'north side', null, 0, fm);
  n := n + 1; if not (r->>'ok' = 'true' and r->'locate'->>'renewals' = '0' and r->'locate'->'renewed_at' = 'null'::jsonb and r->'locate'->>'log_n' = '1') then nf := nf + 1; bad := bad || ' 1:add9=' || (r->'locate')::text; end if;
  -- 2) an edit through the old call: one "edited" row with the old and new value
  r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1', d - 10, d + 5, 'south side', null, 1, fm);
  g := public.pb_prod_locate_log(job, t1);
  n := n + 1; if not (g->>'total' = '2' and g->'log'->0->>'action' = 'edited' and g->'log'->0->'changes'->'note' = '["north side", "south side"]'::jsonb and g->'log'->1->>'action' = 'added' and g->'log'->0->>'by_name' is not null) then nf := nf + 1; bad := bad || ' 2:edit=' || g::text; end if;
  -- 3) a renewal (the app's 10-argument call): renewed today, new expiry
  r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1', d - 10, d + 28, 'south side', null, 2, fm, d);
  g := public.pb_prod_locate_log(job, t1);
  n := n + 1; if not (r->>'ok' = 'true' and r->'locate'->>'renewals' = '1' and r->'locate'->>'renewed_at' = d::text and r->'locate'->>'expires_at' = (d + 28)::text and r->'locate'->>'version' = '3') then nf := nf + 1; bad := bad || ' 3:renew=' || (r->'locate')::text; end if;
  n := n + 1; if not (g->'log'->0->>'action' = 'renewed' and g->'log'->0->'changes'->'expires_at' = jsonb_build_array(d + 5, d + 28) and g->'log'->0->'changes'->'renewed_at' = jsonb_build_array(null, d) and g->'log'->0->>'expires_was' = (d + 5)::text and g->>'total' = '3') then nf := nf + 1; bad := bad || ' 3:renewlog=' || (g->'log'->0)::text; end if;
  -- 4) the same renewal again (the phone never got the answer and retries on the old version): same, not counted twice
  r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1', d - 10, d + 28, 'south side', null, 2, fm, d);
  n := n + 1; if not (r->>'same' = 'true' and r->'locate'->>'renewals' = '1' and r->'locate'->>'log_n' = '3' and r->'locate'->>'version' = '3') then nf := nf + 1; bad := bad || ' 4:retry=' || r::text; end if;
  -- 5) an edit through the 9-argument call after the renewal keeps the renewal day and count
  r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 28, 'south side', null, 3, fm);
  n := n + 1; if not (r->>'ok' = 'true' and r->'locate'->>'renewed_at' = d::text and r->'locate'->>'renewals' = '1' and r->'locate'->>'ticket_no' = 'T-RENEW-1B') then nf := nf + 1; bad := bad || ' 5:edit9keeps=' || (r->'locate')::text; end if;
  -- 6) the app's Edit sends the renewal day it has: not a second renewal; an earlier day is a correction (edited)
  r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 27, 'south side', null, 4, fm, d);
  n := n + 1; if not (r->>'ok' = 'true' and r->'locate'->>'renewals' = '1') then nf := nf + 1; bad := bad || ' 6:editcarries=' || (r->'locate')::text; end if;
  r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 27, 'south side', null, 5, fm, d - 1);
  g := public.pb_prod_locate_log(job, t1);
  n := n + 1; if not (r->'locate'->>'renewals' = '1' and r->'locate'->>'renewed_at' = (d - 1)::text and g->'log'->0->>'action' = 'edited' and g->'log'->0->'changes'->'renewed_at' = jsonb_build_array(d, d - 1)) then nf := nf + 1; bad := bad || ' 6:correction=' || (g->'log'->0)::text; end if;
  -- 7) a second renewal counts 2
  r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 29, 'south side', null, 6, fm, d + 1);
  n := n + 1; if not (r->'locate'->>'renewals' = '2' and r->'locate'->>'renewed_at' = (d + 1)::text) then nf := nf + 1; bad := bad || ' 7:second=' || (r->'locate')::text; end if;

  -- 8) an expired ticket: a renewal dated after its expiry is refused; one dated before it (sent late) is taken
  r := public.pb_prod_locate_set(job, t2, 'T-LATE-2', d - 40, d - 5, null, null, 0, fm);
  begin r := public.pb_prod_locate_set(job, t2, 'T-LATE-2', d - 40, d + 28, null, null, 1, fm, d); e := 'ACCEPTED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:renew_late' then nf := nf + 1; bad := bad || ' 8:late=' || e; end if;
  n := n + 1; if (select count(*) from pb_prod.locate_log x where x.locate_id = t2) <> 1 then nf := nf + 1; bad := bad || ' 8:late_logged'; end if;
  r := public.pb_prod_locate_set(job, t2, 'T-LATE-2', d - 40, d + 22, null, null, 1, fm, d - 6);
  n := n + 1; if not (r->>'ok' = 'true' and r->'locate'->>'renewals' = '1') then nf := nf + 1; bad := bad || ' 8:sentlate=' || r::text; end if;

  -- 9) dates the app also refuses
  begin r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 29, 'south side', null, 7, fm, d - 11); e := 'ACCEPTED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:bad_date' then nf := nf + 1; bad := bad || ' 9:before_call=' || e; end if;
  begin r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 29, 'south side', null, 7, fm, d + 3); e := 'ACCEPTED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:bad_date' then nf := nf + 1; bad := bad || ' 9:future=' || e; end if;
  begin r := public.pb_prod_locate_set(job, t3, 'T-BAD-3', d - 10, d - 2, null, null, 0, fm, d - 1); e := 'ACCEPTED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:bad_date' then nf := nf + 1; bad := bad || ' 9:exp_before_renewal=' || e; end if;
  begin r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 1 + 366, 'south side', null, 7, fm, d + 1); e := 'ACCEPTED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:bad_date' then nf := nf + 1; bad := bad || ' 9:over_a_year=' || e; end if;
  begin r := public.pb_prod_locate_set(job, t3, 'T-BAD-3', d - 10, d + 400, null, null, 0, fm); e := 'ACCEPTED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:bad_date' then nf := nf + 1; bad := bad || ' 9:plain_over_a_year=' || e; end if;
  -- 10) a long job: called in 360 days ago, renewed today for 30 more days (more than a year after the call: fine once renewed)
  r := public.pb_prod_locate_set(job, t3, 'T-LONG-3', d - 360, d + 3, null, null, 0, fm);
  r := public.pb_prod_locate_set(job, t3, 'T-LONG-3', d - 360, d + 30, null, null, 1, fm, d);
  n := n + 1; if not (r->>'ok' = 'true' and r->'locate'->>'expires_at' = (d + 30)::text) then nf := nf + 1; bad := bad || ' 10:long=' || r::text; end if;
  r := public.pb_prod_locate_set(job, t3, 'T-LONG-3', d - 360, d + 30, 'gate B', null, 2, fm); -- and an old-style edit of it still saves
  n := n + 1; if not (r->>'ok' = 'true' and r->'locate'->>'renewed_at' = d::text) then nf := nf + 1; bad := bad || ' 10:long_edit9=' || r::text; end if;

  -- 11) changed on the server meanwhile: a renewal on an old version is not applied, the server's copy comes back
  r := public.pb_prod_locate_set(job, t3, 'T-LONG-3', d - 360, d + 31, 'gate B', null, 1, fm, d + 1);
  n := n + 1; if not (r->>'stale' = 'true' and r->'locate'->>'renewals' = '1' and r->'locate'->>'expires_at' = (d + 30)::text) then nf := nf + 1; bad := bad || ' 11:stale=' || r::text; end if;

  -- 12) close and reopen are history rows too
  r := public.pb_prod_locate_set(job, t2, 'T-LATE-2', d - 40, d + 22, null, true, 2, fm);
  r := public.pb_prod_locate_set(job, t2, 'T-LATE-2', d - 40, d + 22, null, false, 3, fm, d - 6);
  g := public.pb_prod_locate_log(job, t2);
  n := n + 1; if not (g->'log'->0->>'action' = 'reopened' and g->'log'->1->>'action' = 'closed' and g->'log'->2->>'action' = 'renewed' and g->'log'->3->>'action' = 'added' and g->>'total' = '4' and r->'locate'->>'renewals' = '1') then nf := nf + 1; bad := bad || ' 12:close_reopen=' || g::text; end if;

  -- 13) added and renewed before the phone had signal: one save, shown as added with its renewal day
  r := public.pb_prod_locate_set(job, t4, 'T-BOTH-4', d - 20, d + 20, null, null, 0, fm, d - 2);
  g := public.pb_prod_locate_log(job, t4);
  n := n + 1; if not (r->'locate'->>'renewals' = '1' and g->'log'->0->>'action' = 'added' and g->'log'->0->>'renewed_at' = (d - 2)::text and g->>'total' = '1') then nf := nf + 1; bad := bad || ' 13:both=' || g::text; end if;

  -- 14) the lists the app loads carry the new fields
  r := public.pb_prod_locates(job);
  n := n + 1; if exists (select 1 from jsonb_array_elements(r->'locates') x where not (x ? 'renewals' and x ? 'log_n' and x ? 'renewed_at') or (x->>'log_n')::int < 1 or x->'renewals' = 'null'::jsonb) then nf := nf + 1; bad := bad || ' 14:list=' || (r->'locates')::text; end if;
  n := n + 1; if exists (select 1 from pb_prod.locates l where not exists (select 1 from pb_prod.locate_log x where x.locate_id = l.id)) then nf := nf + 1; bad := bad || ' 14:ticket_without_history'; end if;
  n := n + 1; if exists (select 1 from pb_prod.locates l where l.id not in (t1, t2, t3, t4) and (select x.action from pb_prod.locate_log x where x.locate_id = l.id order by x.id limit 1) <> 'on_file') then nf := nf + 1; bad := bad || ' 14:on_file_row'; end if;

  -- 15) who may read a ticket's history
  begin g := public.pb_prod_locate_log(job || 'x', t1); e := 'READ'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:not_found' then nf := nf + 1; bad := bad || ' 15:wrong_job=' || e; end if;
  begin g := public.pb_prod_locate_log(job, gen_random_uuid()); e := 'READ'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:not_found' then nf := nf + 1; bad := bad || ' 15:no_ticket=' || e; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', own::text, true);
  g := public.pb_prod_locate_log(job, t1);
  n := n + 1; if not (g->>'ok' = 'true' and (g->>'total')::int = jsonb_array_length(g->'log') and g->'log'->0->>'action' = 'renewed') then nf := nf + 1; bad := bad || ' 15:owner=' || g::text; end if;
  r := public.pb_prod_locate_set(job, t4, 'T-BOTH-4', d - 20, d + 30, null, null, 1, own, d); -- the office renews the foreman's ticket
  g := public.pb_prod_locate_log(job, t4);
  n := n + 1; if not (r->'locate'->>'renewals' = '2' and g->'log'->0->>'action' = 'renewed' and (select x.by_user from pb_prod.locate_log x where x.locate_id = t4 order by x.id desc limit 1) = own and (select x.by_user from pb_prod.locate_log x where x.locate_id = t4 order by x.id limit 1) = fm) then nf := nf + 1; bad := bad || ' 15:office_renews=' || g::text; end if;
  if pm is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', pm, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', pm::text, true);
    begin g := public.pb_prod_locate_log(job, t1); e := g->>'ok'; exception when others then e := sqlerrm; end;
    n := n + 1; if e <> 'true' then nf := nf + 1; bad := bad || ' 15:pm=' || e; end if;
  end if;
  if pl is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', pl, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', pl::text, true);
    begin g := public.pb_prod_locate_log(job, t1); e := 'READ'; exception when others then e := sqlerrm; end;
    n := n + 1; if e <> 'pb:foremen_only' then nf := nf + 1; bad := bad || ' 15:pipelayer_reads=' || e; end if;
    begin r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 30, 'south side', null, 7, pl, d + 1); e := 'SAVED'; exception when others then e := sqlerrm; end;
    n := n + 1; if e <> 'pb:foremen_only' then nf := nf + 1; bad := bad || ' 15:pipelayer_renews=' || e; end if;
  end if;
  if other is not null then -- another company's foreman or PM: the ticket reads as not there, and can't be renewed
    perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', other::text, true);
    begin g := public.pb_prod_locate_log(job, t1); e := 'READ'; exception when others then e := sqlerrm; end;
    n := n + 1; if e <> 'pb:not_found' then nf := nf + 1; bad := bad || ' 15:other_company_reads=' || e; end if;
    begin r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 30, 'south side', null, 7, other, d + 1); e := 'SAVED'; exception when others then e := sqlerrm; end;
    n := n + 1; if e not in ('pb:not_found', 'pb:no_job') then nf := nf + 1; bad := bad || ' 15:other_company_renews=' || e; end if;
    begin r := public.pb_prod_locates(job); e := (select count(*) from jsonb_array_elements(r->'locates') x where x->>'id' in (t1::text, t2::text, t3::text, t4::text))::text; exception when others then e := sqlerrm; end;
    n := n + 1; if e <> '0' then nf := nf + 1; bad := bad || ' 15:other_company_lists=' || e; end if;
  end if;
  e := gen_random_uuid()::text; -- signed in, in no company
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', e, true);
  begin g := public.pb_prod_locate_log(job, t1); e := 'READ'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:not_company_member' then nf := nf + 1; bad := bad || ' 15:no_company=' || e; end if;
  perform set_config('request.jwt.claims', '', true); perform set_config('request.jwt.claim.sub', '', true); -- signed out
  begin g := public.pb_prod_locate_log(job, t1); e := 'READ'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:signed_out' then nf := nf + 1; bad := bad || ' 15:signed_out_reads=' || e; end if;
  begin r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 30, 'south side', null, 7, fm, d + 1); e := 'SAVED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:signed_out' then nf := nf + 1; bad := bad || ' 15:signed_out_renews=' || e; end if;
  begin r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 30, 'south side', null, 7, fm); e := 'SAVED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:signed_out' then nf := nf + 1; bad := bad || ' 15:signed_out_saves9=' || e; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', own::text, true);
  begin r := public.pb_prod_locate_set(job, t1, 'T-RENEW-1B', d - 10, d + 30, 'south side', null, 7, fm, d + 1); e := 'SAVED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:wrong_account' then nf := nf + 1; bad := bad || ' 15:wrong_account=' || e; end if;

  -- 16) history is permanent
  begin update pb_prod.locate_log set action = 'edited' where locate_id = t1; e := 'UPDATED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:permanent' then nf := nf + 1; bad := bad || ' 16:update=' || e; end if;
  begin delete from pb_prod.locate_log where locate_id = t1; e := 'DELETED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:permanent' then nf := nf + 1; bad := bad || ' 16:delete=' || e; end if;
  begin truncate pb_prod.locate_log; e := 'TRUNCATED'; exception when others then e := sqlerrm; end;
  n := n + 1; if e <> 'pb:permanent' then nf := nf + 1; bad := bad || ' 16:truncate=' || e; end if;

  -- 17) 60 changes a day on one ticket, then pb:quota; nothing of the refused change is kept
  perform set_config('request.jwt.claims', json_build_object('sub', fm, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', fm::text, true);
  r := public.pb_prod_locate_set(job, t5, 'T-BUSY-5', d, d + 28, 'n0', null, 0, fm); e := '';
  for i in 1..60 loop
    begin r := public.pb_prod_locate_set(job, t5, 'T-BUSY-5', d, d + 28, 'n' || i, null, i, fm); exception when others then e := e || i || ':' || sqlerrm || ' '; end;
  end loop;
  select count(*) into v from pb_prod.locate_log x where x.locate_id = t5;
  n := n + 1; if not (e = '60:pb:quota ' and v = 60 and (select l.note from pb_prod.locates l where l.id = t5) = 'n59') then nf := nf + 1; bad := bad || ' 17:cap=' || e || '/' || v; end if;

  -- 18) who can reach what
  n := n + 1; if not (has_function_privilege('authenticated', 'public.pb_prod_locate_log(text,uuid)', 'execute') and has_function_privilege('authenticated', 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid,date)', 'execute')
    and has_function_privilege('authenticated', 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid)', 'execute')) then nf := nf + 1; bad := bad || ' 18:authenticated_cannot_call'; end if;
  n := n + 1; if has_function_privilege('anon', 'public.pb_prod_locate_log(text,uuid)', 'execute') or has_function_privilege('anon', 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid,date)', 'execute')
    or has_function_privilege('anon', 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid)', 'execute') or has_function_privilege('anon', 'pb_prod.locate_log_write()', 'execute')
    or has_function_privilege('authenticated', 'pb_prod.locate_log_write()', 'execute') then nf := nf + 1; bad := bad || ' 18:anon_can_call'; end if;
  n := n + 1; if has_table_privilege('anon', 'pb_prod.locate_log', 'select') or has_table_privilege('authenticated', 'pb_prod.locate_log', 'select') or has_table_privilege('authenticated', 'pb_prod.locate_log', 'insert')
    or not (select c.relrowsecurity from pg_class c where c.oid = 'pb_prod.locate_log'::regclass) then nf := nf + 1; bad := bad || ' 18:table_reachable'; end if;
  n := n + 1; if exists (select 1 from pg_proc p where p.oid in ('public.pb_prod_locate_log(text,uuid)'::regprocedure, 'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid,date)'::regprocedure,
      'public.pb_prod_locate_set(text,uuid,text,date,date,text,boolean,integer,uuid)'::regprocedure, 'pb_prod.locate_log_write()'::regprocedure)
    and not (p.prosecdef and p.proconfig @> array['search_path=""'])) then nf := nf + 1; bad := bad || ' 18:definer_search_path'; end if;
  n := n + 1; if (select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'pb_prod_locate_set') <> 2 then nf := nf + 1; bad := bad || ' 18:overloads'; end if;

  raise exception 'RESULT: % %/% | company % job % pm % pipelayer % other-company % | history rows before % written here % |%',
    case when bad = '' then 'PASS' else 'FAIL' end, n - nf, n, left(co::text, 8), job,
    (pm is not null), (pl is not null), (other is not null), v_before, (select count(*) from pb_prod.locate_log) - v_before, bad;
end $t$;
