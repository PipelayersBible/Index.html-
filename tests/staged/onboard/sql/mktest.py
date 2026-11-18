# Builds sql/01_onboard_test.sql: every statement of 01_onboard.sql run with EXECUTE inside ONE DO block, then checks as
# real users (and two throw-away accounts made inside the block), then RAISE: everything is rolled back, schema included.
src = open('/tmp/claude-0/feat/onboard/sql/01_onboard.sql').read().split('-- ----------')[0]
stmts, cur, inside = [], [], False
for line in src.splitlines():
    if not cur and (not line.strip() or line.startswith('--')): continue
    cur.append(line)
    if line.count('$function$') % 2: inside = not inside
    if not inside and line.rstrip().endswith(';'):
        stmts.append('\n'.join(cur).rstrip().rstrip(';')); cur = []
O='e03416b7-6086-40a5-8d42-9267b846fc26'; F='4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e'; P='8cd34746-efb4-469c-b1d7-caa8709ba3e4'
PM='e4a0170b-1189-4bd5-86fe-e47e092ede3f'; C='d01a4a5f-312a-418f-9172-ea9aec9784b5'
N1='9e9e9e9e-0000-4000-8000-0000000000a1'; N2='9e9e9e9e-0000-4000-8000-0000000000a2'
body = '\n'.join("  execute $obq$" + s + "\n$obq$;" for s in stmts)
def who(u, role='authenticated'):
    return "  reset role; perform set_config('request.jwt.claims', '{\"sub\":\"%s\",\"role\":\"%s\"}', true); set local role %s;" % (u, role, role)
anon = "  reset role; perform set_config('request.jwt.claims', '{\"role\":\"anon\"}', true); set local role anon;"
svc = "  reset role; perform set_config('request.jwt.claims', '{\"role\":\"service_role\"}', true); set local role service_role;"
test = f"""do $obtest$
declare out text := ''; j jsonb; t1 text; c1 text; t2 text; id2 uuid; t3 text; c3 text; t4 text; id4 uuid; th text; ch text; lid uuid; i int;
begin
{body}
  -- two throw-away accounts (rolled back with everything else)
  insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('{N1}', 'm-test1@crew.pipelayersbible.com', 'authenticated', 'authenticated', '{{"pb_link":true}}', '{{}}', now(), now()),
           ('{N2}', 'test2@example.com', 'authenticated', 'authenticated', '{{}}', '{{}}', now(), now());
  -- 1. the owner makes a Pipelayer link (named Mike) and a Foreman link
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', 'Mike'); t1 := j->>'token'; c1 := j->>'code';
  out := out || '1.O.make=' || (j->>'ok') || ' toklen=' || length(t1) || ' code=' || (c1 ~ '^[ACDEFHJKMNPRTUVWXY34679]{{6}}$') || ' role=' || (j->>'role') || ' exp_h=' || round(extract(epoch from ((j->>'expires_at')::timestamptz - now()))/3600);
  j := public.pb_onboard_link_make('foreman', null); t2 := j->>'token'; id2 := (j->>'id')::uuid;
  out := out || ' O.makeForeman=' || (j->>'ok');
  begin j := public.pb_onboard_link_make('pm', null); out := out || ' O.makePm=ALLOWED'; exception when others then out := out || ' O.makePm=' || sqlerrm; end;
  -- 2. the foreman: Pipelayer yes, Foreman no
{who(F)}
  j := public.pb_onboard_link_make('pipelayer', null); t3 := j->>'token'; c3 := j->>'code'; out := out || ' | 2.F.makePl=' || (j->>'ok');
  begin j := public.pb_onboard_link_make('foreman', null); out := out || ' F.makeFm=ALLOWED'; exception when others then out := out || ' F.makeFm=' || sqlerrm; end;
  -- 3. a pipelayer can't
{who(P)}
  begin j := public.pb_onboard_link_make('pipelayer', null); out := out || ' | 3.P.make=ALLOWED'; exception when others then out := out || ' | 3.P.make=' || sqlerrm; end;
  -- 4. signed out: what the link is
{anon}
  j := public.pb_onboard_peek(t1, null); out := out || ' | 4.anon.peek=' || (j->>'ok') || ' co=' || (j->>'company_name') || ' role=' || (j->>'role') || ' label=' || (j->>'label') || ' by=' || (j->>'invited_by') || ' codeBack=' || ((j->>'code') = c1);
  j := public.pb_onboard_peek(null, lower(substr(c1,1,3)) || '-' || substr(c1,4)); out := out || ' peekByCode=' || (j->>'ok') || ' codeHidden=' || (j->'code' = 'null'::jsonb or j->'code' is null);
  j := public.pb_onboard_peek('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', null); out := out || ' peekWrong=' || (j->>'code');
  begin perform public.pb_onboard_join(t1, null, 'x'); out := out || ' anon.join=ALLOWED'; exception when others then out := out || ' anon.join=denied'; end;
  begin perform pb_onboard.find(t1, null, null); out := out || ' anon.find=ALLOWED'; exception when others then out := out || ' anon.find=denied'; end;
  begin perform public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); out := out || ' anon.svc=ALLOWED'; exception when others then out := out || ' anon.svc=denied'; end;
  -- 5. the edge function: claim, (account made), join
{svc}
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); lid := (j->>'link_id')::uuid; out := out || ' | 5.svc.claim=' || (j->>'ok') || ' kind=' || (j->>'kind');
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); out := out || ' claimAgain=' || coalesce(j->>'code', 'ok');
  j := public.pb_onboard_svc('join', jsonb_build_object('link_id', lid, 'user_id', '{N1}', 'name', 'Mike Rivera')); out := out || ' join=' || (j->>'ok') || ' role=' || (j->>'role');
  reset role;
  out := out || ' member=' || coalesce((select m.role from public.company_members m where m.user_id = '{N1}' and m.company_id = '{C}'), 'NONE')
     || ' label=' || coalesce(pb_crew.label_of('{C}', '{N1}'), '-') || ' own=' || coalesce(pb_crew.own_name('{N1}'), '-');
{svc}
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); out := out || ' claimUsed=' || (j->>'code');
{anon}
  j := public.pb_onboard_peek(t1, null); out := out || ' peekUsed=' || (j->>'code');
  -- 6. an account already signed in joins with the foreman's code
{who(N2)}
  j := public.pb_onboard_join(null, c3, 'Dave'); out := out || ' | 6.N2.join=' || (j->>'ok') || ' role=' || (j->>'role') || ' co=' || (j->>'company_name');
  j := public.pb_onboard_join(t3, null, 'Dave'); out := out || ' again=' || (j->>'code');
  -- 7. an existing member with the foreman link
{who(P)}
  j := public.pb_onboard_join(t2, null, null); reset role; out := out || ' | 7.P.join=' || (j->>'code') || ' P.role=' || (select m.role from public.company_members m where m.user_id = '{P}');
  -- 8. revoke: the foreman can't revoke the owner's link; the owner can
{who(F)}
  j := public.pb_onboard_link_revoke(id2); out := out || ' | 8.F.revokeOwners=' || coalesce(j->>'code', 'ok');
{who(O)}
  j := public.pb_onboard_link_revoke(id2); out := out || ' O.revoke=' || (j->>'ok');
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
     || ' joinedName=' || coalesce((select x->>'joined_name' from jsonb_array_elements(j->'links') x where x->>'status' = 'joined' and (x->>'joined_user') = '{N1}'), '-');
{who(F)}
  j := public.pb_onboard_links(); out := out || ' F.links=' || jsonb_array_length(j->'links') || ' F.mgr=' || (j->>'manager');
{who(P)}
  j := public.pb_onboard_links(); out := out || ' P.links=' || jsonb_array_length(j->'links');
  -- 11. handoff: N1 signs in to the Home Screen app with a code
{who(N1)}
  j := public.pb_onboard_handoff_make(); th := j->>'token'; ch := j->>'code'; out := out || ' | 11.N1.handoff=' || (j->>'ok') || ' min=' || round(extract(epoch from ((j->>'expires_at')::timestamptz - now()))/60);
{anon}
  j := public.pb_onboard_peek(null, ch); out := out || ' peekHandoffAsJoin=' || (j->>'code');
{svc}
  j := public.pb_onboard_svc('claim', jsonb_build_object('code', ch)); lid := (j->>'link_id')::uuid; out := out || ' claim=' || (j->>'kind') || ' email=' || (j->>'email');
  j := public.pb_onboard_svc('handoff', jsonb_build_object('link_id', lid)); out := out || ' use=' || (j->>'ok') || ' user=' || ((j->>'user_id') = '{N1}');
  j := public.pb_onboard_svc('claim', jsonb_build_object('code', ch)); out := out || ' again=' || (j->>'code');
  -- 12. the brake on typed codes (a token still works)
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', null); t4 := j->>'token';
  reset role; insert into pb_onboard.misses (kind) select 'code' from generate_series(1, 30);
{anon}
  j := public.pb_onboard_peek(null, c3); out := out || ' | 12.peekCodeBraked=' || (j->>'code');
  j := public.pb_onboard_peek(t4, null); out := out || ' peekFreshTokenBraked=' || case when (j->>'ok')::boolean then 'ok' else j->>'code' end;
  reset role; delete from pb_onboard.misses;
  -- 13. beta seat cap (company switched to trial inside the test only)
  update pb_onboard.links set revoked_at = now() where company_id = '{C}' and used_at is null;
  update public.companies set plan = 'trial' where id = '{C}';
{who(O)}
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' | 13.trial make1=' || case when (j->>'ok')::boolean then 'ok' else j->>'code' end;
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' make2=' || case when (j->>'ok')::boolean then 'ok' else j->>'code' end;
  reset role; out := out || ' seatsUsed=' || pb_billing.trial_seats_used('{C}');
  reset role; update pb_onboard.links set revoked_at = now() where company_id = '{C}' and used_at is null;
  reset role; update public.companies set plan = 'paid' where id = '{C}';
  -- 14. at most 10 live links
{who(O)}
  i := 0; loop j := public.pb_onboard_link_make('pipelayer', null); exit when not (j->>'ok')::boolean or i > 12; i := i + 1; end loop;
  out := out || ' | 14.liveMade=' || i || ' then=' || (j->>'code');
  -- 15. the company turns foreman links off
  j := public.pb_onboard_settings_set(false);
{who(F)}
  reset role; update pb_onboard.links set revoked_at = now() where company_id = '{C}' and used_at is null;
{who(F)}
  begin j := public.pb_onboard_link_make('pipelayer', null); out := out || ' | 15.F.off=ALLOWED'; exception when others then out := out || ' | 15.F.off=' || sqlerrm; end;
  begin j := public.pb_onboard_settings_set(true); out := out || ' F.setting=' || coalesce(j->>'code', 'ok'); exception when others then out := out || ' F.setting=' || sqlerrm; end;
  begin perform public.pb_onboard_svc('claim', '{{}}'::jsonb); out := out || ' F.svc=ALLOWED'; exception when others then out := out || ' F.svc=' || sqlerrm; end;
  reset role;
  out := out || ' | events=' || (select string_agg(a || ':' || n, ',' order by a) from (select action a, count(*) n from pb_onboard.events group by 1) e);
  raise exception 'RESULT: %', out;
end $obtest$;
"""
open('/tmp/claude-0/feat/onboard/sql/01_onboard_test.sql','w').write(test)
print(len(stmts), 'statements')
