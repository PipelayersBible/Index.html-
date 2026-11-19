# Builds sql/02_onboard_test.sql: every statement of 01_onboard.sql run with EXECUTE inside ONE DO block, then checks as
# the real roles (authenticated / anon / service_role, with request.jwt.claims) and three throw-away accounts made inside
# the block, then RAISE 'RESULT: ...': everything is rolled back, the schema included. Run:  python3 sql/mktest.py
import os
D = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(D, '01_onboard.sql')).read().split('-- ----------')[0]
stmts, cur, inside = [], [], False
for line in src.splitlines():
    if not cur and (not line.strip() or line.startswith('--')): continue
    cur.append(line)
    if line.count('$function$') % 2: inside = not inside
    if not inside and line.rstrip().endswith(';'):
        stmts.append('\n'.join(cur).rstrip().rstrip(';')); cur = []
# the live company (DIG Civil Construction) and its people: owner, foreman, pipelayer, PM (ids only)
O='e03416b7-6086-40a5-8d42-9267b846fc26'; F='4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e'; P='8cd34746-efb4-469c-b1d7-caa8709ba3e4'
PM='e4a0170b-1189-4bd5-86fe-e47e092ede3f'; C='d01a4a5f-312a-418f-9172-ea9aec9784b5'
N1='9e9e9e9e-0000-4000-8000-0000000000a1'; N2='9e9e9e9e-0000-4000-8000-0000000000a2'; N3='9e9e9e9e-0000-4000-8000-0000000000a3'
LEGAL = """jsonb_build_object('terms', '1.0', 'privacy', '1.0', 'notice', '3', 'phone_at', now(), 'build', 'r17.05 test', 'ua', 'test')"""
body = '\n'.join("  execute $obq$" + s + "\n$obq$;" for s in stmts)
def who(u, role='authenticated'):
    return "  reset role; perform set_config('request.jwt.claims', '{\"sub\":\"%s\",\"role\":\"%s\"}', true); set local role %s;" % (u, role, role)
anon = "  reset role; perform set_config('request.jwt.claims', '{\"role\":\"anon\"}', true); set local role anon;"
svc = "  reset role; perform set_config('request.jwt.claims', '{\"role\":\"service_role\"}', true); set local role service_role;"
ok = lambda e: "case when (%s->>'ok')::boolean then 'ok' else coalesce(%s->>'code', 'null') end" % (e, e)
test = f"""do $obtest$
declare out text := ''; j jsonb; t1 text; c1 text; t2 text; id2 uuid; t3 text; c3 text; id3 uuid; t4 text; id4 uuid; th text; ch text; lid uuid; i int; snap text; ev int; t5 text; id5 uuid;
begin
{body}
  -- three throw-away accounts (rolled back with everything else): two joined by link (no email), one with an email
  insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
    values ('{N1}', 'm-test1@crew.pipelayersbible.com', 'authenticated', 'authenticated', '{{"pb_link":true}}', '{{}}', now(), now(), now()),
           ('{N2}', 'test2@example.com', 'authenticated', 'authenticated', '{{}}', '{{}}', now(), now(), null),
           ('{N3}', 'm-test3@crew.pipelayersbible.com', 'authenticated', 'authenticated', '{{"pb_link":true}}', '{{}}', now(), now(), now());
  -- 0. grants: nothing new is open by default
  out := '0.grants anonMake=' || has_function_privilege('anon', 'public.pb_onboard_link_make(text,text,uuid)', 'execute')
    || ' anonPeek=' || has_function_privilege('anon', 'public.pb_onboard_peek(text,text)', 'execute')
    || ' authSvc=' || has_function_privilege('authenticated', 'public.pb_onboard_svc(text,jsonb)', 'execute')
    || ' authLost=' || has_function_privilege('authenticated', 'public.pb_onboard_lost_phone(uuid)', 'execute')
    || ' anonLost=' || has_function_privilege('anon', 'public.pb_onboard_lost_phone(uuid)', 'execute')
    || ' authInner=' || has_function_privilege('authenticated', 'pb_onboard.join_link(uuid,uuid,text,text,jsonb)', 'execute');
  -- 1. the owner: a Pipelayer link for Mike on Ray's (the foreman's) crew, a Foreman link; not PM; not paired with a non-foreman
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', 'Mike', '{F}'); t1 := j->>'token'; c1 := j->>'code';
  out := out || ' | 1.O.make=' || {ok('j')} || ' toklen=' || length(t1) || ' code=' || (c1 ~ '^[ACDEFHJKMNPRTUVWXY34679]{{6}}$') || ' role=' || (j->>'role') || ' exp_h=' || round(extract(epoch from ((j->>'expires_at')::timestamptz - now()))/3600) || ' pairName=' || coalesce(j->>'pair_name', '-');
  j := public.pb_onboard_link_make('foreman', null); t2 := j->>'token'; id2 := (j->>'id')::uuid; out := out || ' O.makeForeman=' || {ok('j')};
  begin j := public.pb_onboard_link_make('pm', null); out := out || ' O.makePm=ALLOWED'; exception when others then out := out || ' O.makePm=' || sqlerrm; end;
  j := public.pb_onboard_link_make('pipelayer', null, '{P}'); out := out || ' O.pairWithPipelayer=' || {ok('j')};
  j := public.pb_onboard_link_make('foreman', null, '{F}'); out := out || ' O.pairForemanLink=' || {ok('j')};
  -- 2. the foreman: Pipelayer yes (on his own crew), Foreman no
{who(F)}
  j := public.pb_onboard_link_make('pipelayer', null); t3 := j->>'token'; c3 := j->>'code'; id3 := (j->>'id')::uuid; out := out || ' | 2.F.makePl=' || {ok('j')};
  begin j := public.pb_onboard_link_make('foreman', null); out := out || ' F.makeFm=ALLOWED'; exception when others then out := out || ' F.makeFm=' || sqlerrm; end;
  reset role; out := out || ' F.linkPair=' || ((select l.pair_foreman from pb_onboard.links l where l.id = id3) = '{F}');
  -- 3. a pipelayer can't
{who(P)}
  begin j := public.pb_onboard_link_make('pipelayer', null); out := out || ' | 3.P.make=ALLOWED'; exception when others then out := out || ' | 3.P.make=' || sqlerrm; end;
  -- 4. signed out: what the link is. Opening it (3 times, like a scanner and a preview) changes nothing.
  reset role; select md5(string_agg(l::text, ',' order by l.id)) into snap from pb_onboard.links l; select count(*) into ev from pb_onboard.events;
{anon}
  j := public.pb_onboard_peek(t1, null); out := out || ' | 4.anon.peek=' || {ok('j')} || ' co=' || (j->>'company_name') || ' role=' || (j->>'role') || ' label=' || (j->>'label') || ' pair=' || coalesce(j->>'pair_name', '-') || ' codeBack=' || ((j->>'code') = c1);
  j := public.pb_onboard_peek(t1, null); j := public.pb_onboard_peek(t1, null);
  j := public.pb_onboard_peek(null, lower(substr(c1,1,3)) || '-' || substr(c1,4)); out := out || ' peekByCode=' || {ok('j')} || ' codeHidden=' || (j->'code' = 'null'::jsonb or j->'code' is null);
  reset role; out := out || ' peekChangedNothing=' || ((select md5(string_agg(l::text, ',' order by l.id)) from pb_onboard.links l) = snap and (select count(*) from pb_onboard.events) = ev);
{anon}
  j := public.pb_onboard_peek('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', null); out := out || ' peekWrong=' || (j->>'code');
  begin perform public.pb_onboard_join(t1, null, 'x'); out := out || ' anon.join=ALLOWED'; exception when others then out := out || ' anon.join=denied'; end;
  begin perform pb_onboard.find(t1, null, null); out := out || ' anon.find=ALLOWED'; exception when others then out := out || ' anon.find=denied'; end;
  begin perform public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); out := out || ' anon.svc=ALLOWED'; exception when others then out := out || ' anon.svc=denied'; end;
  begin perform public.pb_onboard_lost_phone('{P}'); out := out || ' anon.lost=ALLOWED'; exception when others then out := out || ' anon.lost=denied'; end;
  begin perform public.pb_onboard_start(); out := out || ' anon.start=ALLOWED'; exception when others then out := out || ' anon.start=denied'; end;
  -- 5. the edge function: claim, (account made), join with the Terms and the crew notice ticked on the join screen
{svc}
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); lid := (j->>'link_id')::uuid; out := out || ' | 5.svc.claim=' || {ok('j')} || ' kind=' || (j->>'kind');
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); out := out || ' claimAgain=' || coalesce(j->>'code', 'ok');
  j := public.pb_onboard_svc('join', jsonb_build_object('link_id', lid, 'user_id', '{N1}', 'name', 'Mike Rivera', 'legal', {LEGAL}));
  out := out || ' join=' || {ok('j')} || ' role=' || (j->>'role') || ' legal=' || (j->>'legal') || ' pairedWith=' || coalesce(j->>'paired_with', '-');
  reset role;
  out := out || ' member=' || coalesce((select m.role from public.company_members m where m.user_id = '{N1}' and m.company_id = '{C}'), 'NONE')
     || ' label=' || coalesce(pb_crew.label_of('{C}', '{N1}'), '-') || ' own=' || coalesce(pb_crew.own_name('{N1}'), '-')
     || ' crewLink=' || exists (select 1 from pb_prod.crew_links l where l.pipelayer_id = '{N1}' and l.foreman_id = '{F}' and l.ended_at is null)
     || ' terms=' || coalesce((select a.terms_version || '/' || a.privacy_version || '/' || a.app_build from pb_legal.acceptances a where a.user_id = '{N1}'), 'NONE')
     || ' notice=' || coalesce((select a.version from pb_legal.notice_acks a where a.user_id = '{N1}' and a.notice = 'crew_notice'), 'NONE');
{svc}
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); out := out || ' claimUsed=' || (j->>'code');
{anon}
  j := public.pb_onboard_peek(t1, null); out := out || ' peekUsed=' || (j->>'code');
  -- 6. an account already signed in on that phone joins with the foreman's code: on the foreman's crew
{who(N2)}
  j := public.pb_onboard_join(null, c3, 'Dave', {LEGAL}); out := out || ' | 6.N2.join=' || {ok('j')} || ' role=' || (j->>'role') || ' paired=' || coalesce(j->>'paired_with', '-');
  j := public.pb_onboard_join(t3, null, 'Dave'); out := out || ' again=' || (j->>'code');
  reset role; out := out || ' N2.crewLink=' || exists (select 1 from pb_prod.crew_links l where l.pipelayer_id = '{N2}' and l.foreman_id = '{F}' and l.ended_at is null)
    || ' N2.terms=' || exists (select 1 from pb_legal.acceptances a where a.user_id = '{N2}');
  -- 7. an existing member with the Foreman link: refused, role unchanged
{who(P)}
  j := public.pb_onboard_join(t2, null, null); reset role; out := out || ' | 7.P.join=' || (j->>'code') || ' P.role=' || (select m.role from public.company_members m where m.user_id = '{P}');
  -- 8. revoke: the foreman can't revoke the owner's link; the owner can
{who(F)}
  j := public.pb_onboard_link_revoke(id2); out := out || ' | 8.F.revokeOwners=' || coalesce(j->>'code', 'ok');
{who(O)}
  j := public.pb_onboard_link_revoke(id2); out := out || ' O.revoke=' || {ok('j')};
{anon}
  j := public.pb_onboard_peek(t2, null); out := out || ' peekRevoked=' || (j->>'code');
  -- 9. expiry
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', null); t4 := j->>'token'; id4 := (j->>'id')::uuid;
  reset role; update pb_onboard.links set expires_at = now() - interval '1 minute' where id = id4;
{anon}
  j := public.pb_onboard_peek(t4, null); out := out || ' | 9.peekExpired=' || (j->>'code');
  -- 10. the lists
{who(O)}
  j := public.pb_onboard_links(); out := out || ' | 10.O.links=' || jsonb_array_length(j->'links') || ' statuses=' || (select string_agg(x->>'status', ',' order by x->>'status') from jsonb_array_elements(j->'links') x)
     || ' joinedName=' || coalesce((select x->>'joined_name' from jsonb_array_elements(j->'links') x where (x->>'joined_user') = '{N1}'), '-')
     || ' pairShown=' || coalesce((select x->>'pair_name' from jsonb_array_elements(j->'links') x where (x->>'joined_user') = '{N1}'), '-')
     || ' seats=' || coalesce(j->>'seats', '-') || ' room=' || coalesce(j->>'room', 'null');
{who(F)}
  j := public.pb_onboard_links(); out := out || ' F.links=' || jsonb_array_length(j->'links') || ' F.mgr=' || (j->>'manager') || ' F.seats=' || coalesce(j->>'seats', 'hidden') || ' F.pairedSelf=' || coalesce((select x->>'paired_self' from jsonb_array_elements(j->'links') x limit 1), '-');
{who(P)}
  j := public.pb_onboard_links(); out := out || ' P.links=' || jsonb_array_length(j->'links');
  -- 11. handoff: N1 signs in to the Home Screen app with a code
{who(N1)}
  j := public.pb_onboard_handoff_make(); th := j->>'token'; ch := j->>'code'; out := out || ' | 11.N1.handoff=' || {ok('j')} || ' min=' || round(extract(epoch from ((j->>'expires_at')::timestamptz - now()))/60);
{anon}
  j := public.pb_onboard_peek(null, ch); out := out || ' peekHandoffAsJoin=' || (j->>'code');
{svc}
  j := public.pb_onboard_svc('claim', jsonb_build_object('code', ch)); lid := (j->>'link_id')::uuid; out := out || ' claim=' || (j->>'kind') || ' email=' || (j->>'email');
  j := public.pb_onboard_svc('handoff', jsonb_build_object('link_id', lid)); out := out || ' use=' || {ok('j')} || ' user=' || ((j->>'user_id') = '{N1}');
  j := public.pb_onboard_svc('claim', jsonb_build_object('code', ch)); out := out || ' again=' || (j->>'code');
  -- 12. the brake on typed codes (a token still works)
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', null); t4 := j->>'token';
  reset role; insert into pb_onboard.misses (kind) select 'code' from generate_series(1, 30);
{anon}
  j := public.pb_onboard_peek(null, c3); out := out || ' | 12.peekCodeBraked=' || (j->>'code');
  j := public.pb_onboard_peek(t4, null); out := out || ' peekFreshTokenBraked=' || {ok('j')};
  reset role; delete from pb_onboard.misses;
  -- 13. beta seat cap (company switched to beta inside the test only): company account + 6
  update pb_onboard.links set revoked_at = now() where company_id = '{C}' and used_at is null;
  update public.companies set plan = 'trial', trial_ends_at = now() + interval '20 days' where id = '{C}';
  out := out || ' | 13.trialUsedBefore=' || pb_billing.trial_seats_used('{C}');
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', null); t5 := j->>'token'; out := out || ' make1=' || {ok('j')};
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' make2=' || {ok('j')};
  j := public.pb_onboard_links(); out := out || ' seats=' || (j->>'seats');
{svc}
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t5)); out := out || ' claimLast=' || {ok('j')};
  j := public.pb_onboard_svc('abandon', jsonb_build_object('link_id', j->>'link_id'));
  -- the beta ended (3 days after its end date): no links, and a link already out is refused when opened
  reset role; update public.companies set trial_ends_at = now() - interval '4 days' where id = '{C}';
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' betaEndedMake=' || {ok('j')};
{anon}
  j := public.pb_onboard_peek(t5, null); out := out || ' betaEndedPeek=' || {ok('j')};
{svc}
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t5)); out := out || ' betaEndedClaim=' || {ok('j')};
  reset role; update pb_onboard.links set revoked_at = now() where company_id = '{C}' and used_at is null;
  update public.companies set plan = 'paid', trial_ends_at = null where id = '{C}';
  -- 14. paid company with a billing row: seats shown, never blocked by seats; read-only blocks
  insert into pb_billing.accounts (company_id, legal_name, billing_email, seats_paid, base_seats, base_cents, seat_cents, period_start, paid_through)
    values ('{C}', 'Test Co', 'test@example.com', 5, 5, 9900, 1200, current_date - 10, current_date + 20);
{who(O)}
  j := public.pb_onboard_links(); out := out || ' | 14.paidSeats=' || (j->>'seats');
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' paidMake=' || {ok('j')};
  reset role; update pb_billing.accounts set state = 'read_only' where company_id = '{C}';
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' readOnlyMake=' || {ok('j')};
  j := public.pb_onboard_links(); out := out || ' room=' || coalesce(j->>'room', 'null');
  reset role; delete from pb_billing.accounts where company_id = '{C}';
  update pb_onboard.links set revoked_at = now() where company_id = '{C}' and used_at is null;
  -- 15. at most 10 live links
{who(O)}
  i := 0; loop j := public.pb_onboard_link_make('pipelayer', null); exit when not (j->>'ok')::boolean or i > 12; i := i + 1; end loop;
  out := out || ' | 15.liveMade=' || i || ' then=' || (j->>'code');
  reset role; update pb_onboard.links set revoked_at = now() where company_id = '{C}' and used_at is null;
  -- 16. the office's switch: foreman links off stops new ones and the ones already out
{who(F)}
  j := public.pb_onboard_link_make('pipelayer', null); t4 := j->>'token';
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', null); t5 := j->>'token';
  j := public.pb_onboard_settings_set(false); out := out || ' | 16.O.off=' || {ok('j')};
{anon}
  j := public.pb_onboard_peek(t4, null); out := out || ' foremansLinkNow=' || coalesce(j->>'code', 'ok');
  j := public.pb_onboard_peek(t5, null); out := out || ' officesLinkNow=' || {ok('j')};
{who(F)}
  begin j := public.pb_onboard_link_make('pipelayer', null); out := out || ' F.off=ALLOWED'; exception when others then out := out || ' F.off=' || sqlerrm; end;
  j := public.pb_onboard_links(); out := out || ' F.sees=' || (j->>'foreman_links');
  begin j := public.pb_onboard_settings_set(true); out := out || ' F.setting=' || coalesce(j->>'code', 'ok'); exception when others then out := out || ' F.setting=' || sqlerrm; end;
  begin perform public.pb_onboard_svc('claim', '{{}}'::jsonb); out := out || ' F.svc=ALLOWED'; exception when others then out := out || ' F.svc=' || sqlerrm; end;
{who(O)}
  j := public.pb_onboard_settings_set(true);
  -- 17. lost phone: N1 (joined by link, on Ray's crew) lost his phone
  reset role; insert into auth.sessions (id, user_id, created_at) values (gen_random_uuid(), '{N1}', now()), (gen_random_uuid(), '{N1}', now());
  out := out || ' | 17.N1sessions=' || (select count(*) from auth.sessions s where s.user_id = '{N1}');
{who(F)}
  j := public.pb_onboard_lost_phone('{N1}'); out := out || ' F.lost=' || {ok('j')};
{who(O)}
  j := public.pb_onboard_lost_phone('{N2}'); out := out || ' O.lostEmailAcct=' || {ok('j')};
  j := public.pb_onboard_lost_phone('{PM}'); out := out || ' O.lostPm=' || {ok('j')};
  j := public.pb_onboard_lost_phone('{N1}'); t5 := j->>'token'; id5 := (j->>'id')::uuid;
  out := out || ' O.lost=' || {ok('j')} || ' removed=' || (j->>'removed') || ' name=' || coalesce(j->>'removed_name', '-') || ' role=' || (j->>'role') || ' pair=' || coalesce(j->>'pair_name', '-') || ' seats=' || (j->>'seats_before') || '>' || (j->>'seats_after');
  reset role;
  out := out || ' N1member=' || exists (select 1 from public.company_members m where m.user_id = '{N1}')
    || ' N1sessions=' || (select count(*) from auth.sessions s where s.user_id = '{N1}')
    || ' N1crewLink=' || exists (select 1 from pb_prod.crew_links l where l.pipelayer_id = '{N1}' and l.ended_at is null)
    || ' audit=' || (select string_agg(a.outcome, ',' order by a.id) from pb_crew.audit a where a.target_user = '{N1}' and a.action = 'remove')
    || ' link=' || (select l.role || '/' || coalesce(l.label, '-') || '/' || (l.pair_foreman = '{F}') || '/' || (l.replaces_user = '{N1}') from pb_onboard.links l where l.id = id5);
{svc}
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t5)); lid := (j->>'link_id')::uuid;
  j := public.pb_onboard_svc('join', jsonb_build_object('link_id', lid, 'user_id', '{N3}', 'name', 'Mike Rivera', 'legal', {LEGAL}));
  out := out || ' newPhoneJoin=' || {ok('j')} || ' paired=' || coalesce(j->>'paired_with', '-');
{who(O)}
  j := public.pb_onboard_links(); out := out || ' listReplaces=' || coalesce((select x->>'replaces_name' from jsonb_array_elements(j->'links') x where x->>'id' = id5::text), '-');
  -- 18. the getting-started card's numbers
  j := public.pb_onboard_start(); out := out || ' | 18.start=' || {ok('j')} || ' crew=' || (j->>'crew') || ' signedIn=' || (j->>'crew_signed_in') || ' linksWaiting=' || (j->>'links_waiting');
{who(F)}
  j := public.pb_onboard_start(); out := out || ' F.start=' || {ok('j')};
  reset role;
  out := out || ' | events=' || (select string_agg(a || ':' || n, ',' order by a) from (select action a, count(*) n from pb_onboard.events group by 1) e);
  raise exception 'RESULT: %', out;
end $obtest$;
"""
open(os.path.join(D, '02_onboard_test.sql'), 'w').write(test)
print(len(stmts), 'statements', len(test), 'chars')
