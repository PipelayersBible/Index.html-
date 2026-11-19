-- office3 #35: a member can leave the company on their own, and the office can hand a removed foreman's waiting runs
-- and crew to another foreman.
--
-- pb_crew_leave(p_expect_uid, p_expect_company): the caller's own membership row goes (the same row the owner's Remove
-- deletes, so every existing removal trigger runs: billing's "left company" note that offers an individual plan, run
-- reports moving to the pipelayer's linked foreman, the report key rotation, PM assignments). Their crew links end now
-- (not at the next clean-up). Logged in pb_crew.audit as 'leave'. The owner gets a push. The company account (owner)
-- has no membership row and can't leave its own company this way.
-- pb_crew_handover(p_from, p_to, p_expect_uid): the company account, a PM/super or a manager moves, from a foreman who
-- is no longer a foreman of the company (removed, left, or changed to pipelayer) to a current foreman:
--   * crew runs still waiting for a foreman's claim that were assigned to him (pb_prod.entries crew_state 'pending',
--     assigned_to = him): assigned to the new foreman, with an 'assign' crew action like a pipelayer's own assign;
--   * his crew: pipelayers whose link to him ended within 30 days because his membership changed, who are still
--     pipelayers here and have no foreman now, get a new link to the new foreman (history kept: a new row).
--   Unreviewed run reports sent to him already follow the pipelayer's linked foreman (pb_prod.rr_foreman), so they go to
--   the new foreman with the new links. Logged as 'handover'; the new foreman gets a push.
-- Both are SECURITY DEFINER, execute for authenticated only.

begin;

alter table pb_crew.audit drop constraint audit_action_check;
alter table pb_crew.audit add constraint audit_action_check check (action = any (array['invite', 'invitation', 'resend', 'accept', 'decline', 'withdraw', 'set_role', 'set_manager', 'remove', 'leave', 'handover']));

create or replace function public.pb_crew_leave(p_expect_uid uuid, p_expect_company uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); m public.company_members%rowtype; v_owner uuid; v_name text; v_co_name text; v_old jsonb;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  select * into m from public.company_members x where x.user_id = v_uid for update;
  if m.id is null then return jsonb_build_object('ok', false, 'code', 'pb:not_member'); end if;
  if p_expect_company is null or m.company_id <> p_expect_company then return jsonb_build_object('ok', false, 'code', 'pb:company_changed'); end if;
  select c.owner_user_id, c.name into v_owner, v_co_name from public.companies c where c.id = m.company_id;
  if v_owner = v_uid then return jsonb_build_object('ok', false, 'code', 'pb:is_owner'); end if;
  v_name := left(coalesce(nullif(btrim(pb_prod.member_name_public(m.company_id, v_uid)), ''), 'A crew member'), 60);
  v_old := pb_crew.member_state(v_uid, m.company_id);
  update pb_prod.crew_links set ended_at = now(), ended_by = v_uid, end_reason = 'membership_changed'
    where ended_at is null and company_id = m.company_id and (foreman_id = v_uid or pipelayer_id = v_uid);
  delete from pb_reports.managers where company_id = m.company_id and user_id = v_uid;
  delete from public.company_members where id = m.id;
  perform pb_crew.log(m.company_id, v_uid, 'leave', v_uid, null, v_old, jsonb_build_object('member', false, 'manager', false), 'ok', null, null);
  if v_owner is not null then
    perform pb_push.enqueue(v_owner, 'crew_nudge', left(v_name || ' left the company', 80),
      left(v_name || ' (' || coalesce(m.role, 'crew') || ') left ' || coalesce(v_co_name, 'the company') || ' in the app. Their records filed so far stay the company’s.', 180),
      '#/settings', 'leave:' || v_uid::text || ':' || m.company_id::text || ':' || floor(extract(epoch from now()))::bigint::text, true);
  end if;
  return jsonb_build_object('ok', true, 'company_id', m.company_id, 'company_name', v_co_name, 'role', m.role);
end $function$;

create or replace function public.pb_crew_handover(p_from uuid, p_to uuid, p_expect_uid uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_runs integer := 0; v_crew integer := 0; r record; v_from_name text; v_to_name text; v_id bigint;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if p_from is null or p_to is null or p_from = p_to then return jsonb_build_object('ok', false, 'code', 'pb:bad_request'); end if;
  if not pb_prod.is_foreman_of(p_to, v_co) then return jsonb_build_object('ok', false, 'code', 'pb:not_a_foreman'); end if;
  if pb_prod.is_foreman_of(p_from, v_co) then return jsonb_build_object('ok', false, 'code', 'pb:still_foreman'); end if;
  if not (exists (select 1 from pb_prod.crew_links l where l.company_id = v_co and l.foreman_id = p_from)
          or exists (select 1 from pb_prod.entries e where e.company_id = v_co and e.assigned_to = p_from)) then
    return jsonb_build_object('ok', false, 'code', 'pb:nothing_to_hand_over');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('pb_handover:' || v_co::text || ':' || p_from::text, 0));
  -- a link to him still open (a removal doesn't end links at once; pb_prod.end_stale_links does it later): end it now
  update pb_prod.crew_links set ended_at = now(), ended_by = v_uid, end_reason = 'membership_changed'
    where company_id = v_co and foreman_id = p_from and ended_at is null;
  -- waiting crew runs assigned to him
  for r in select e.id from pb_prod.entries e
            where e.company_id = v_co and e.assigned_to = p_from and e.crew_state = 'pending' and not e.voided
            order by e.created_at limit 500 for update loop
    update pb_prod.entries set assigned_to = p_to, assigned_at = now() where id = r.id;
    insert into pb_prod.crew_actions (entry_id, action, by_user, target_user, note) values (r.id, 'assign', v_uid, p_to, 'Handed over from a foreman no longer in the company');
    v_runs := v_runs + 1;
  end loop;
  -- his crew: links that ended because his membership changed (last 30 days), pipelayers still here with no foreman now
  for r in select distinct on (l.pipelayer_id) l.pipelayer_id from pb_prod.crew_links l
            where l.company_id = v_co and l.foreman_id = p_from and l.end_reason = 'membership_changed' and l.ended_at > now() - interval '30 days'
              and pb_prod.is_pipelayer_of(l.pipelayer_id, v_co)
              and not exists (select 1 from pb_prod.crew_links o where o.pipelayer_id = l.pipelayer_id and o.ended_at is null)
            order by l.pipelayer_id, l.ended_at desc limit 200 loop
    perform pg_advisory_xact_lock(hashtextextended('crew_link|' || r.pipelayer_id::text, 0));
    if not exists (select 1 from pb_prod.crew_links o where o.pipelayer_id = r.pipelayer_id and o.ended_at is null) then
      insert into pb_prod.crew_links (company_id, foreman_id, pipelayer_id, started_by) values (v_co, p_to, r.pipelayer_id, v_uid) returning id into v_id;
      v_crew := v_crew + 1;
    end if;
  end loop;
  v_from_name := left(coalesce(nullif(btrim(pb_prod.member_name_public(v_co, p_from)), ''), 'a foreman who left'), 60);
  v_to_name := pb_prod.member_name(v_co, p_to);
  perform pb_crew.log(v_co, v_uid, 'handover', p_from, null, jsonb_build_object('runs', v_runs, 'crew', v_crew), jsonb_build_object('to', p_to), 'ok', null, null);
  if v_runs + v_crew > 0 then
    perform pb_push.enqueue(p_to, 'crew_nudge', 'Runs and crew handed to you',
      left(concat_ws(' and ', case when v_runs > 0 then v_runs || case when v_runs = 1 then ' waiting run' else ' waiting runs' end end,
                               case when v_crew > 0 then v_crew || case when v_crew = 1 then ' crew member' else ' crew members' end end) || ' from ' || v_from_name || ' are yours now.', 180),
      '#/crew', 'handover:' || p_from::text || ':' || p_to::text || ':' || floor(extract(epoch from now()))::bigint::text, true);
  end if;
  return jsonb_build_object('ok', true, 'runs', v_runs, 'crew', v_crew, 'to_name', v_to_name);
end $function$;

revoke all on function public.pb_crew_leave(uuid, uuid) from public, anon;
revoke all on function public.pb_crew_handover(uuid, uuid, uuid) from public, anon;
grant execute on function public.pb_crew_leave(uuid, uuid) to authenticated;
grant execute on function public.pb_crew_handover(uuid, uuid, uuid) to authenticated;

commit;
