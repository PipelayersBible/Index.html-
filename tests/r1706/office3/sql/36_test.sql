-- office3 #36 rolled-back test: run AFTER the body of 36_exports.sql (without begin/commit), same transaction.
do $t$
declare own uuid := 'e03416b7-6086-40a5-8d42-9267b846fc26'; p uuid := '8cd34746-efb4-469c-b1d7-caa8709ba3e4'; r jsonb; h jsonb; out text := ''; tot numeric; dash numeric;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', own::text, true);
  r := public.pb_prod_export_days('26014', date '2026-09-01', date '2026-11-19');
  select coalesce(sum((x->>'qty')::numeric), 0) into tot from jsonb_array_elements(r->'rows') x where x->>'key' = 'pipe';
  select coalesce(sum((c->>'done')::numeric), 0) into dash from jsonb_array_elements(pb_prod.cat_sums('d01a4a5f-312a-418f-9172-ea9aec9784b5', '26014', current_date)) c where c->>'key' = 'pipe';
  out := 'days ok=' || (r->>'ok') || ' rows=' || jsonb_array_length(r->'rows') || ' first=' || coalesce((r->'rows'->0)::text, 'none') || ' pipe_total=' || tot || ' dashboard_pipe_done=' || dash || ' job=' || coalesce(r->'job'->>'project_name', '');
  h := public.pb_prod_export_hours('26014', date '2026-09-01', date '2026-11-19');
  out := out || ' | hours ok=' || (h->>'ok') || ' rows=' || jsonb_array_length(h->'rows') || ' reports=' || (h->>'reports') || ' first=' || coalesce((h->'rows'->0)::text, 'none');
  h := public.pb_prod_export_hours(null, date '2026-09-01', date '2026-11-19');
  out := out || ' | all jobs rows=' || jsonb_array_length(h->'rows');
  begin r := public.pb_prod_export_days('26014', date '2025-01-01', date '2026-11-19'); out := out || ' | long range ALLOWED'; exception when others then out := out || ' | long=' || sqlerrm; end;
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', p::text, true);
  begin r := public.pb_prod_export_days('26014', date '2026-09-01', date '2026-11-19'); out := out || ' | pipelayer ALLOWED'; exception when others then out := out || ' | pipelayer=' || sqlerrm; end;
  out := out || ' | grants days=' || has_function_privilege('authenticated', 'public.pb_prod_export_days(text,date,date)', 'execute') || ' hours=' || has_function_privilege('authenticated', 'public.pb_prod_export_hours(text,date,date)', 'execute')
    || ' anon=' || has_function_privilege('anon', 'public.pb_prod_export_days(text,date,date)', 'execute') || '/' || has_function_privilege('anon', 'public.pb_prod_export_hours(text,date,date)', 'execute');
  raise exception 'RESULT: %', out;
end $t$;
