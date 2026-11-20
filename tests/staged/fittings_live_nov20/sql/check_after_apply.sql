-- fittings_live: read-only check AFTER applying 01. Expected: one row,
--   keeps_fit = {"n": 3, "of": 5, "tw": 2, "b": 1, "s": 0, "o": 0}, drops_junk = true, old_phone_same = true,
--   whole_closed = true (the helper is not open to anon / authenticated), kind_ok = true, with_fit = how many stored statuses carry a count.
select pb_prod.clean_status('{"sessionRef":"x","fit":{"n":3,"of":5,"tw":2,"b":1,"s":0,"o":0}}')->'fit' as keeps_fit,
  not (pb_prod.clean_status('{"sessionRef":"x","fit":{"n":"3","of":99999}}') ? 'fit') as drops_junk,
  pb_prod.clean_status('{"sessionRef":"x","laidFt":12}') = '{"sessionRef":"x","laidFt":12}'::jsonb as old_phone_same,
  not has_function_privilege('authenticated', 'pb_prod.whole(jsonb,integer)', 'execute') and not has_function_privilege('anon', 'pb_prod.whole(jsonb,integer)', 'execute') as whole_closed,
  (select not p.prosecdef and p.provolatile = 's' and p.proconfig = array['search_path=""'] from pg_proc p where p.oid = 'pb_prod.clean_status(jsonb)'::regprocedure) as kind_ok,
  (select count(*) from pb_prod.run_status r where r.status ? 'fit') as with_fit;
