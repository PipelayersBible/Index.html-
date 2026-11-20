-- 04_check_after_load.sql (ask_shelf_nov20). SELECT only. Run after 01 and after shelf batches are loaded.
-- 1 what is on the shelf
select coll, count(*) as chunks, count(distinct state) as states, min(added_at)::date as first_added, max(added_at)::date as last_added
  from pb_ai.kb_shelf group by coll order by coll;
-- 2 who may call the search (expect: service_role true, authenticated false, anon false) and that the table is closed
select has_function_privilege('service_role',  'public.pb_ai_kb_shelf_search(text, text, integer, text[], text[], integer, real[])', 'execute') as service_role_can_call,
       has_function_privilege('authenticated', 'public.pb_ai_kb_shelf_search(text, text, integer, text[], text[], integer, real[])', 'execute') as users_can_call,
       has_function_privilege('anon',          'public.pb_ai_kb_shelf_search(text, text, integer, text[], text[], integer, real[])', 'execute') as anon_can_call,
       has_table_privilege('authenticated', 'pb_ai.kb_shelf', 'select') as users_can_read_table,
       (select count(*) from pg_indexes where schemaname = 'pb_ai' and tablename = 'kb_shelf') as indexes;      -- expect 3
-- 3 three searches as Ask would ask them (the answer chunk should be the first row; ids are from the helpers' batches)
select 'bedding under 48 inch RCP, Rhode Island job -> mfr-acpa-install-1' as expect,
       (select string_agg((e->>'id') || ' cover ' || (e->>'cover'), ', ') from jsonb_array_elements(public.pb_ai_kb_shelf_search('How thick is the bedding under 48 inch RCP?', 'RI', 3)->'rows') e) as got
union all
select 'bones in the trench, South Dakota job -> fed-achp-discovery-1',
       (select string_agg((e->>'id') || ' cover ' || (e->>'cover'), ', ') from jsonb_array_elements(public.pb_ai_kb_shelf_search('Operator just dug up what looks like bones. What do we do?', 'SD', 3)->'rows') e)
union all
select 'ticket updates, Georgia job -> dig-ga-tickets-1 first; no other state''s dig- chunk',
       (select string_agg((e->>'id') || ' [' || (e->>'state') || ']', ', ') from jsonb_array_elements(public.pb_ai_kb_shelf_search('How many times can I update my ticket?', 'GA', 5)->'rows') e);
-- 4 no state's chunk leaks to another state's job (expect 0)
select count(*) as wrong_state_rows
  from (select st from unnest(array['TX','CA','WV','VA','DC','KS']) st) s,
       lateral jsonb_array_elements(public.pb_ai_kb_shelf_search('811 ticket trench flagger permit bedding cover', s.st, 8)->'rows') e
 where e->>'state' <> 'US' and not (s.st = any (string_to_array(e->>'state', ',')));
-- 5 speed, on the server's own rows (run twice; the second number is the one that counts)
explain (analyze, timing off, summary on, costs off) select public.pb_ai_kb_shelf_search('How deep can a trench be before I need a trench box?', 'TX', 4);
