-- after time.sql's tq table: how often the fast search returns the same excerpts as ranking everything
create temp table cmp as
select id, (select array_agg(x->>'id') from jsonb_array_elements(public.pb_ai_kb_shelf_search(q, st, 3, terms)->'rows') x) a, null::text[] b, 0::numeric ms from tq;
do $$ declare r record; t0 timestamptz; v jsonb; begin
  for r in select * from tq loop t0 := clock_timestamp(); v := public.zz_shelf_all(r.q, r.st, 3, r.terms);
    update cmp set b = (select array_agg(x->>'id') from jsonb_array_elements(v->'rows') x), ms = extract(epoch from clock_timestamp() - t0) * 1000 where id = r.id; end loop; end $$;
select 'rank-everything baseline: median ' || round(percentile_cont(0.5) within group (order by ms)::numeric, 0) || ' ms, p95 ' || round(percentile_cont(0.95) within group (order by ms)::numeric, 0) || ' ms, slowest ' || round(max(ms), 0) || ' ms' from cmp;
select 'same best excerpt: ' || count(*) filter (where a[1] = b[1]) || ' of ' || count(*) || '; best excerpt is among the baseline''s 3: ' || count(*) filter (where a[1] = any (b))
       || '; all 3 the same: ' || count(*) filter (where a = b) from cmp;
