-- office3 #37 rolled-back test: run AFTER the body of 37_permit_secret_apart.sql (without begin/commit), same transaction.
do $t$
declare fm uuid := '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e'; sec text := 'abcdefghjkmnpqrstvwxyz0123'; sec2 text := 'zyxwvtsrqpnmkjhgfedcba9876';
  k text; k2 text; rec jsonb; r jsonb; out text := ''; stored jsonb; sha text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', fm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', fm::text, true);
  k := pb_safety.em_derive(sec); k2 := pb_safety.em_derive(sec2);
  -- 1) a new record: secret beside it
  rec := jsonb_build_object('kind', 'confined', 'emSecretApart', true, 'space', 'MH-7 test', 'lockTime', '2026-11-19T18:00:00.000Z', 'jobNumber', '26014',
    'permit', jsonb_build_object('space', 'MH-7 test', 'emLink', jsonb_build_object('k', k, 'at', 1763575200000)));
  r := public.pb_permit_backup('cps-office3-t1', rec, fm, sec);
  select pv.record, pv.record_sha256 into stored, sha from pb_safety.permit_versions pv join pb_safety.permits p on p.id = pv.permit_id where p.user_id = fm and p.client_permit_id = 'cps-office3-t1' order by pv.version desc limit 1;
  out := out || 'new ok=' || (r->>'ok') || ' stored_has_s=' || ((stored->'permit'->'emLink') ? 's')::text
    || ' sha_matches_sent=' || (sha = encode(sha256(convert_to(rec::text, 'UTF8')), 'hex'))::text
    || ' filed=' || exists (select 1 from pb_safety.em_links l where l.token_hash = pb_safety.em_hash(k) and l.user_id = fm and l.client_permit_id = 'cps-office3-t1')::text
    || ' refused=' || exists (select 1 from pb_safety.em_refused x where x.token_hash = pb_safety.em_hash(k))::text;
  -- 2) a record that says apart but still carries the secret: refused
  begin r := public.pb_permit_backup('cps-office3-t2', jsonb_set(rec, '{permit,emLink,s}', to_jsonb(sec)), fm, sec); out := out || ' | apart+s ACCEPTED';
  exception when others then out := out || ' | apart+s=' || sqlerrm; end;
  -- 3) an old record (secret inside, no flag) through the old call: still filed, kept as sent
  rec := jsonb_build_object('kind', 'confined', 'space', 'MH-8 old', 'lockTime', '2026-11-18T18:00:00.000Z',
    'permit', jsonb_build_object('emLink', jsonb_build_object('k', k2, 'at', 1763488800000, 's', sec2)));
  r := public.pb_permit_backup('cps-office3-t3', rec, fm);
  out := out || ' | old ok=' || (r->>'ok') || ' filed=' || exists (select 1 from pb_safety.em_links l where l.token_hash = pb_safety.em_hash(k2) and l.client_permit_id = 'cps-office3-t3')::text;
  -- 4) wrong secret beside a new record: the code is not filed (refused), the record is still backed up
  rec := jsonb_build_object('kind', 'confined', 'emSecretApart', true, 'space', 'MH-9', 'lockTime', '2026-11-19T19:00:00.000Z',
    'permit', jsonb_build_object('emLink', jsonb_build_object('k', pb_safety.em_derive('qqqqqqqqqqqqqqqqqqqqqqqqqq'), 'at', 1763578800000)));
  r := public.pb_permit_backup('cps-office3-t4', rec, fm, sec);
  out := out || ' | wrong-secret ok=' || (r->>'ok') || ' filed=' || exists (select 1 from pb_safety.em_links l where l.client_permit_id = 'cps-office3-t4')::text
    || ' refused=' || exists (select 1 from pb_safety.em_refused x where x.client_permit_id = 'cps-office3-t4')::text;
  -- 5) same record again: same version (no new version)
  r := public.pb_permit_backup('cps-office3-t4', rec, fm, sec);
  out := out || ' | again same=' || coalesce(r->>'same', '');
  out := out || ' | grants auth=' || has_function_privilege('authenticated', 'public.pb_permit_backup(text,jsonb,uuid,text)', 'execute')
    || ' anon=' || has_function_privilege('anon', 'public.pb_permit_backup(text,jsonb,uuid,text)', 'execute');
  raise exception 'RESULT: %', out;
end $t$;
