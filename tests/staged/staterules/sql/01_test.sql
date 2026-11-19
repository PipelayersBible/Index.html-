-- Rolled-back test for 01_state_rules.sql. Run AFTER the migration text in the same transaction (or paste both into
-- one execute_sql call): it ends in raise exception 'RESULT: ...', so nothing persists.
-- :owner / :foreman / :crew / :company are filled in by the runner (live: a company with an owner, a foreman, a crew member).
do $t$
declare r jsonb; v_err text; v_log text := ''; n int;
  c_owner uuid := '__OWNER__'; c_fm uuid := '__FOREMAN__'; c_crew uuid := '__CREW__'; c_co uuid := '__COMPANY__';
begin
  select count(*) into n from pb_prod.state_rules; v_log := v_log || 'rows=' || n || ';';
  -- every seeded row has a source and the checked day
  select count(*) into n from pb_prod.state_rules where jsonb_array_length(rules->'sources') < 1 or checked <> date '2026-11-19' or rules->>'checked' <> '2026-11-19';
  v_log := v_log || 'bad_rows=' || n || ';';
  -- the owner sets the company's state
  perform set_config('request.jwt.claims', json_build_object('sub', c_owner, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', c_owner::text, true);
  r := public.pb_job_state_set(null, 'az', c_owner); v_log := v_log || 'co_set=' || (r->>'state') || ';';
  r := public.pb_job_state_set('J-100 ', 'NV', c_owner); v_log := v_log || 'job_set=' || (r->>'job_key') || ':' || (r->>'state') || ';';
  begin r := public.pb_job_state_set('J-1', 'XX', c_owner); v_log := v_log || 'bad_state=accepted;'; exception when others then v_log := v_log || 'bad_state=' || sqlerrm || ';'; end;
  begin r := public.pb_job_state_set('J-1', 'TX', c_fm); v_log := v_log || 'wrong_uid=accepted;'; exception when others then v_log := v_log || 'wrong_uid=' || sqlerrm || ';'; end;
  r := public.pb_state_rules_get(); v_log := v_log || 'get_owner=' || (r->>'company_state') || ',' || (r->'jobs'->>'j-100') || ',' || (r->>'can_set_company') || ',' || (r->>'checked') || ';';
  -- a foreman reads and sets a job, can't set the company
  perform set_config('request.jwt.claims', json_build_object('sub', c_fm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', c_fm::text, true);
  r := public.pb_state_rules_get(); v_log := v_log || 'get_fm=' || (r->>'company_state') || ',' || (r->>'can_set_company') || ';';
  r := public.pb_job_state_set('J-100', 'UT', c_fm); v_log := v_log || 'fm_job=' || (r->>'state') || ';';
  begin r := public.pb_job_state_set('', 'TX', c_fm); v_log := v_log || 'fm_co=accepted;'; exception when others then v_log := v_log || 'fm_co=' || sqlerrm || ';'; end;
  r := public.pb_job_state_set('J-100', null, c_fm); v_log := v_log || 'fm_clear=' || coalesce(r->>'state', 'null') || ';';
  select count(*) into n from pb_prod.job_states where company_id = c_co and job_key = 'j-100'; v_log := v_log || 'j100_rows=' || n || ';';
  -- a crew member (not a foreman) gets nothing
  if c_crew is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', c_crew, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', c_crew::text, true);
    begin r := public.pb_state_rules_get(); v_log := v_log || 'crew_get=allowed;'; exception when others then v_log := v_log || 'crew_get=' || sqlerrm || ';'; end;
  end if;
  -- grants: authenticated may execute, anon may not
  v_log := v_log || 'grant_auth=' || has_function_privilege('authenticated', 'public.pb_job_state_set(text,text,uuid)', 'execute') || ',' || has_function_privilege('authenticated', 'public.pb_state_rules_get()', 'execute')
    || ';grant_anon=' || has_function_privilege('anon', 'public.pb_job_state_set(text,text,uuid)', 'execute') || ',' || has_function_privilege('anon', 'public.pb_state_rules_get()', 'execute')
    || ';table_auth=' || has_table_privilege('authenticated', 'pb_prod.job_states', 'select') || ';';
  raise exception 'RESULT: %', v_log;
end $t$;
