-- r15.32 server (overnight sweep, /home/claude/night/server.md): seven findings, each tested on the mirror in a rolled-back transaction.
-- F1: voiding a foreman's claimed copy gives the pipelayer's run back (it stayed 'claimed' for good and left every total).
create or replace function pb_prod.close_on_void(p_id uuid, p_by uuid)
 returns integer language plpgsql security definer set search_path to '' as $function$
declare v_e pb_prod.entries%rowtype; pe record; c record; v_n integer := 0;
  v_dec text := pb_prod.edit_decision_name('voided', 'rejected');
  v_note text := 'Voided: taken off the totals, so this approval was closed';
begin
  select * into v_e from pb_prod.entries e where e.id = p_id;
  if not found or not v_e.voided then return 0; end if;
  for pe in select * from pb_prod.pending_edits x where x.entry_id = v_e.id and x.decision is null for update loop
    update pb_prod.pending_edits set decision = v_dec, decided_by = p_by, decided_at = now(), decision_note = v_note where id = pe.id;
    v_n := v_n + 1;
    if pe.kind = 'late_claim' then
      if v_e.crew_state = 'late_pending' then update pb_prod.entries set crew_state = 'late_rejected' where id = v_e.id; end if;
      insert into pb_prod.crew_actions (entry_id, action, by_user, target_user, related_entry_id, note)
        values (coalesce(v_e.source_entry_id, v_e.id), pb_prod.crew_action_name('late_claim_voided', 'late_claim_rejected'), p_by, v_e.user_id, v_e.id,
                'Late claim closed: the claimed copy was voided');
    else
      insert into pb_prod.crew_actions (entry_id, action, by_user, target_user, note)
        values (v_e.id, pb_prod.crew_action_name('edit_voided', 'edit_rejected'), p_by, pe.saved_by, 'Edit closed: the run was voided');
    end if;
  end loop;
  if v_e.crew_state = 'late_pending' then update pb_prod.entries set crew_state = 'late_rejected' where id = v_e.id; end if;
  -- NEW: a live claim copy (in-window claim, or an approved late claim) was voided: the pipelayer's run is held again,
  -- with its original arrival time (inside its 24 h it waits for a foreman; past them it counts at once).
  if v_e.source_entry_id is not null and v_e.crew_state is null then
    update pb_prod.entries set crew_state = 'late_rejected' where id = v_e.id; -- frees prod_entries_source_idx and held_for_me for a new claim
    update pb_prod.entries o set crew_state = 'pending', claimed_entry_id = null, crew_by = p_by, crew_at = now(),
        crew_note = 'Claim removed: the foreman''s copy was voided', assigned_to = null, assigned_at = null
      where o.id = v_e.source_entry_id and o.crew_state = 'claimed' and o.claimed_entry_id = v_e.id and not o.voided;
    if found then
      insert into pb_prod.crew_actions (entry_id, action, by_user, target_user, related_entry_id, note)
        values (v_e.source_entry_id, 'held', p_by, v_e.user_id, v_e.id, 'Claim removed: the foreman''s copy was voided; held for a foreman again');
    end if;
  end if;
  if v_e.source_entry_id is null then
    for c in select * from pb_prod.entries x where x.source_entry_id = v_e.id and x.crew_state = 'late_pending' order by x.id for update loop
      for pe in select * from pb_prod.pending_edits x where x.entry_id = c.id and x.decision is null for update loop
        update pb_prod.pending_edits set decision = v_dec, decided_by = p_by, decided_at = now(), decision_note = 'Voided: the run was taken off the totals, so this late claim was closed' where id = pe.id;
        v_n := v_n + 1;
      end loop;
      update pb_prod.entries set crew_state = 'late_rejected' where id = c.id;
      insert into pb_prod.crew_actions (entry_id, action, by_user, target_user, related_entry_id, note)
        values (v_e.id, pb_prod.crew_action_name('late_claim_voided', 'late_claim_rejected'), p_by, c.user_id, c.id, 'Late claim closed: the run was voided');
    end loop;
  end if;
  return v_n;
end $function$;

-- F1b: an old voided copy can never block a new claim.
do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_prod_crew_claim(uuid,uuid,integer)'::regprocedure);
  n := (length(d) - length(replace(d, 'select c.id into v_id from pb_prod.entries c where c.source_entry_id = p_entry_id and c.user_id = v_uid and c.crew_state is distinct from ''late_rejected'' order by c.created_at desc limit 1;', ''))) / length('select c.id into v_id from pb_prod.entries c where c.source_entry_id = p_entry_id and c.user_id = v_uid and c.crew_state is distinct from ''late_rejected'' order by c.created_at desc limit 1;');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_prod_crew_claim(uuid,uuid,integer)', n; end if;
  d := replace(d, 'select c.id into v_id from pb_prod.entries c where c.source_entry_id = p_entry_id and c.user_id = v_uid and c.crew_state is distinct from ''late_rejected'' order by c.created_at desc limit 1;', 'select c.id into v_id from pb_prod.entries c where c.source_entry_id = p_entry_id and c.user_id = v_uid and not c.voided and c.crew_state is distinct from ''late_rejected'' order by c.created_at desc limit 1;');
  execute d;
end $m$;

do $m$ declare d text; n int; begin
  d := pg_get_functiondef('pb_prod.held_for_me(uuid,uuid,boolean)'::regprocedure);
  n := (length(d) - length(replace(d, 'if exists (select 1 from pb_prod.entries c where c.source_entry_id = v_e.id and c.user_id <> p_uid and c.crew_state = ''late_pending'') then', ''))) / length('if exists (select 1 from pb_prod.entries c where c.source_entry_id = v_e.id and c.user_id <> p_uid and c.crew_state = ''late_pending'') then');
  if n <> 1 then raise exception 'pb migration: anchor found % times in pb_prod.held_for_me(uuid,uuid,boolean)', n; end if;
  d := replace(d, 'if exists (select 1 from pb_prod.entries c where c.source_entry_id = v_e.id and c.user_id <> p_uid and c.crew_state = ''late_pending'') then', 'if exists (select 1 from pb_prod.entries c where c.source_entry_id = v_e.id and c.user_id <> p_uid and not c.voided and c.crew_state = ''late_pending'') then');
  execute d;
end $m$;

do $m$ declare d text; n int; begin
  d := pg_get_functiondef('pb_prod.held_for_me(uuid,uuid,boolean)'::regprocedure);
  n := (length(d) - length(replace(d, 'if exists (select 1 from pb_prod.entries c where c.source_entry_id = v_e.id and c.user_id <> p_uid and c.crew_state is distinct from ''late_rejected'') then', ''))) / length('if exists (select 1 from pb_prod.entries c where c.source_entry_id = v_e.id and c.user_id <> p_uid and c.crew_state is distinct from ''late_rejected'') then');
  if n <> 1 then raise exception 'pb migration: anchor found % times in pb_prod.held_for_me(uuid,uuid,boolean)', n; end if;
  d := replace(d, 'if exists (select 1 from pb_prod.entries c where c.source_entry_id = v_e.id and c.user_id <> p_uid and c.crew_state is distinct from ''late_rejected'') then', 'if exists (select 1 from pb_prod.entries c where c.source_entry_id = v_e.id and c.user_id <> p_uid and not c.voided and c.crew_state is distinct from ''late_rejected'') then');
  execute d;
end $m$;

-- F1c: one-time repair of runs already stuck 'claimed' under a voided copy (function-internal updates; run once below).
create or replace function pb_prod.repair_voided_claims()
 returns jsonb language plpgsql security definer set search_path to '' as $f$
declare n int := 0; r record;
begin
  perform pb_crew.require_service();
  for r in select c.id as copy_id, c.source_entry_id, c.user_id as copy_user from pb_prod.entries c join pb_prod.entries o on o.id = c.source_entry_id
           where c.voided and c.source_entry_id is not null and c.crew_state is null and o.crew_state = 'claimed' and o.claimed_entry_id = c.id and not o.voided loop
    update pb_prod.entries set crew_state = 'late_rejected' where id = r.copy_id;
    update pb_prod.entries o set crew_state = 'pending', claimed_entry_id = null, crew_at = now(), crew_note = 'Claim removed: the foreman''s copy was voided', assigned_to = null, assigned_at = null where o.id = r.source_entry_id;
    insert into pb_prod.crew_actions (entry_id, action, by_user, target_user, related_entry_id, note) values (r.source_entry_id, 'held', r.copy_user, r.copy_user, r.copy_id, 'Claim removed: the foreman''s copy was voided; held for a foreman again (repair)');
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'repaired', n);
end $f$;

-- F2: the plan editor never sends 'inspections'; saving the plan kept wiping the job's required inspection counts.
create or replace function public.pb_prod_plan_set(p_job_number text, p_plan jsonb, p_expect_uid uuid, p_expect_version integer)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text := pb_prod.job_key(p_job_number); v_job text := left(btrim(coalesce(p_job_number, '')), 60);
  v_plan jsonb; v_cur pb_prod.plans%rowtype; v_n integer; v_version integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_company := pb_prod.managed_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if pg_column_size(p_plan) > 20000 then raise exception 'pb:too_big'; end if;
  v_plan := pb_prod.clean_plan(p_plan);
  v_plan := pb_prod.fill_planned(v_company, v_key, v_plan, true); -- r15.13
  select count(*) into v_n from pb_prod.plan_versions pv where pv.company_id = v_company and pv.saved_at > now() - interval '1 day';
  if v_n >= 500 then raise exception 'pb:quota'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_company::text || '|' || v_key, 0));
  select * into v_cur from pb_prod.plans p where p.company_id = v_company and p.job_key = v_key for update;
  if not found then
    if coalesce(p_expect_version, 0) <> 0 then raise exception 'pb:plan_changed'; end if;
    select count(*) into v_n from pb_prod.plans p where p.company_id = v_company;
    if v_n >= 1000 then raise exception 'pb:quota'; end if;
    v_version := 1;
    insert into pb_prod.plans (company_id, job_key, job_number, plan, version, updated_by) values (v_company, v_key, v_job, v_plan, 1, v_uid);
  else
    if coalesce(p_expect_version, -1) <> v_cur.version then raise exception 'pb:plan_changed'; end if;
    if not (p_plan ? 'inspections') and v_cur.plan ? 'inspections' then -- NEW: an app that doesn't send the required inspections keeps them (r15.22)
      v_plan := v_plan || jsonb_build_object('inspections', v_cur.plan->'inspections');
    end if;
    if v_cur.plan = v_plan then return jsonb_build_object('ok', true, 'version', v_cur.version, 'plan', v_cur.plan); end if;
    v_version := v_cur.version + 1;
    update pb_prod.plans set plan = v_plan, version = v_version, job_number = v_job, updated_at = now(), updated_by = v_uid where company_id = v_company and job_key = v_key;
  end if;
  insert into pb_prod.plan_versions (company_id, job_key, version, plan, saved_by) values (v_company, v_key, v_version, v_plan, v_uid);
  if (select count(*) from pb_tickets.cost_codes x where x.company_id = v_company and x.job_number = v_job) < 500 then
    insert into pb_tickets.cost_codes (company_id, job_number, code, name)
      select distinct on (c->>'cost_code') v_company, v_job, c->>'cost_code', coalesce(c->>'cost_code_name', c->>'name')
      from jsonb_array_elements(v_plan->'categories') c where nullif(c->>'cost_code', '') is not null
    on conflict (company_id, job_number, code) do update set name = coalesce(pb_tickets.cost_codes.name, excluded.name), updated_at = now();
  end if;
  return jsonb_build_object('ok', true, 'version', v_version, 'plan', v_plan);
end $function$;

-- F3: tickets match the job the way production and materials do (pb_prod.job_key: lower + trimmed).
do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_ticket_company_totals(text)'::regprocedure);
  n := (length(d) - length(replace(d, 'with t as (select * from pb_tickets.tickets where company_id = v_company and (p_job_number is null or job_number = p_job_number))', ''))) / length('with t as (select * from pb_tickets.tickets where company_id = v_company and (p_job_number is null or job_number = p_job_number))');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_ticket_company_totals(text)', n; end if;
  d := replace(d, 'with t as (select * from pb_tickets.tickets where company_id = v_company and (p_job_number is null or job_number = p_job_number))', 'with t as (select * from pb_tickets.tickets where company_id = v_company and (p_job_number is null or pb_prod.job_key(job_number) = pb_prod.job_key(p_job_number)))');
  execute d;
end $m$;

do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_ticket_company_totals(text)'::regprocedure);
  n := (length(d) - length(replace(d, '(select jsonb_build_object(''job_number'', job_number, ''jobsite'', max(jobsite), ''tickets'', count(*)) x from pb_tickets.tickets where company_id = v_company group by job_number) j)', ''))) / length('(select jsonb_build_object(''job_number'', job_number, ''jobsite'', max(jobsite), ''tickets'', count(*)) x from pb_tickets.tickets where company_id = v_company group by job_number) j)');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_ticket_company_totals(text)', n; end if;
  d := replace(d, '(select jsonb_build_object(''job_number'', job_number, ''jobsite'', max(jobsite), ''tickets'', count(*)) x from pb_tickets.tickets where company_id = v_company group by job_number) j)', '(select jsonb_build_object(''job_number'', coalesce((select p.job_number from pb_prod.plans p where p.company_id = v_company and p.job_key = g.k), g.jn), ''jobsite'', g.js, ''tickets'', g.n) x from (select pb_prod.job_key(job_number) k, max(job_number) jn, max(jobsite) js, count(*) n from pb_tickets.tickets where company_id = v_company group by 1) g) j)');
  execute d;
end $m$;

do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_ticket_company_page(text,timestamptz,uuid,integer)'::regprocedure);
  n := (length(d) - length(replace(d, 'where t.company_id = v_company and (p_job_number is null or t.job_number = p_job_number)', ''))) / length('where t.company_id = v_company and (p_job_number is null or t.job_number = p_job_number)');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_ticket_company_page(text,timestamptz,uuid,integer)', n; end if;
  d := replace(d, 'where t.company_id = v_company and (p_job_number is null or t.job_number = p_job_number)', 'where t.company_id = v_company and (p_job_number is null or pb_prod.job_key(t.job_number) = pb_prod.job_key(p_job_number))');
  execute d;
end $m$;

do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_ticket_company_page2(text,timestamptz,uuid,integer)'::regprocedure);
  n := (length(d) - length(replace(d, '(p_job_number is null or t.job_number = p_job_number)', ''))) / length('(p_job_number is null or t.job_number = p_job_number)');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_ticket_company_page2(text,timestamptz,uuid,integer)', n; end if;
  d := replace(d, '(p_job_number is null or t.job_number = p_job_number)', '(p_job_number is null or pb_prod.job_key(t.job_number) = pb_prod.job_key(p_job_number))');
  execute d;
end $m$;

do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_ticket_cost_codes(text)'::regprocedure);
  n := (length(d) - length(replace(d, 'c.company_id = v_company and c.job_number = trim(p_job_number)', ''))) / length('c.company_id = v_company and c.job_number = trim(p_job_number)');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_ticket_cost_codes(text)', n; end if;
  d := replace(d, 'c.company_id = v_company and c.job_number = trim(p_job_number)', 'c.company_id = v_company and pb_prod.job_key(c.job_number) = pb_prod.job_key(p_job_number)');
  execute d;
end $m$;

do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_ticket_cost_codes(text)'::regprocedure);
  n := (length(d) - length(replace(d, 't.user_id = v_uid and t.job_number = trim(p_job_number) and t.cost_code is not null', ''))) / length('t.user_id = v_uid and t.job_number = trim(p_job_number) and t.cost_code is not null');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_ticket_cost_codes(text)', n; end if;
  d := replace(d, 't.user_id = v_uid and t.job_number = trim(p_job_number) and t.cost_code is not null', 't.user_id = v_uid and pb_prod.job_key(t.job_number) = pb_prod.job_key(p_job_number) and t.cost_code is not null');
  execute d;
end $m$;

-- F4: the daily report's 'other crews' production' listed a claimed run twice and runs that do not count.
do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_daily_prod_day(text,date,uuid)'::regprocedure);
  n := (length(d) - length(replace(d, 'and not e.voided and e.user_id <> v_uid), ''[]''::jsonb));', ''))) / length('and not e.voided and e.user_id <> v_uid), ''[]''::jsonb));');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_daily_prod_day(text,date,uuid)', n; end if;
  d := replace(d, 'and not e.voided and e.user_id <> v_uid), ''[]''::jsonb));', 'and not e.voided and e.user_id <> v_uid and coalesce(e.crew_state, '''') not in (''claimed'', ''covered'', ''late_pending'', ''late_rejected'')), ''[]''::jsonb));');
  execute d;
end $m$;

-- F5: the foreman's own 'mine' totals counted an unapproved or rejected late-claim copy.
do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_prod_foreman_scope(date)'::regprocedure);
  n := (length(d) - length(replace(d, 'where e.user_id = v_uid and e.company_id = v_company and e.job_key = j.job_key and i.qty is not null and not i.voided group by 1, 2) m), ''[]''::jsonb)', ''))) / length('where e.user_id = v_uid and e.company_id = v_company and e.job_key = j.job_key and i.qty is not null and not i.voided group by 1, 2) m), ''[]''::jsonb)');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_prod_foreman_scope(date)', n; end if;
  d := replace(d, 'where e.user_id = v_uid and e.company_id = v_company and e.job_key = j.job_key and i.qty is not null and not i.voided group by 1, 2) m), ''[]''::jsonb)', 'where e.user_id = v_uid and e.company_id = v_company and e.job_key = j.job_key and i.qty is not null and not i.voided and pb_prod.counts(e.company_id, e.user_id, e.kind, e.role, e.crew_state, e.created_at) group by 1, 2) m), ''[]''::jsonb)');
  execute d;
end $m$;

-- F6: a material that is gone says pb:not_found (like the other material functions), not 'check the numbers'.
do $m$ declare d text; n int; begin
  d := pg_get_functiondef('public.pb_mat_typed_assign(text,text,text,uuid,uuid,timestamptz)'::regprocedure);
  n := (length(d) - length(replace(d, 'if not found or pb_mat.use_key(m) is distinct from p_use then raise exception ''pb:bad_material''; end if;', ''))) / length('if not found or pb_mat.use_key(m) is distinct from p_use then raise exception ''pb:bad_material''; end if;');
  if n <> 1 then raise exception 'pb migration: anchor found % times in public.pb_mat_typed_assign(text,text,text,uuid,uuid,timestamptz)', n; end if;
  d := replace(d, 'if not found or pb_mat.use_key(m) is distinct from p_use then raise exception ''pb:bad_material''; end if;', 'if not found then raise exception ''pb:not_found''; end if; if pb_mat.use_key(m) is distinct from p_use then raise exception ''pb:bad_material''; end if;');
  execute d;
end $m$;
-- F7 (push_prefs tz) deliberately left as is: the app always sends a valid zone; a raise there would be new behaviour on the notifications path. Noted for the morning.
