# Builds the files for the local Postgres test: roles + schema, a synthetic shelf of N rows (the live library's chunks
# copied and re-labelled: 40% nationwide, 60% spread over 51 states), and the timing script (the 127 eval questions with
# the word groups Ask really sends, each asked on a job in a rotating state).   python3 tools/pg_setup.py <rows> <dir>
import json, sys, os, csv, random
HERE = os.path.dirname(os.path.abspath(__file__)); N, D = int(sys.argv[1]), sys.argv[2]
kb = json.load(open(os.path.join(HERE, '../../ask_state_nov20/work/kb_live2.json')))
STATES = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split()
src = [c for L in kb.values() for c in L if 200 <= len(c['text']) <= 1800 and c.get('title')]
random.seed(7)
with open(os.path.join(D, 'shelf.csv'), 'w', newline='') as f:
    w = csv.writer(f)
    for i in range(N):
        c = src[i % len(src)]; st = 'US' if random.random() < 0.4 else random.choice(STATES)
        cid = f"{'fed' if st == 'US' else 'sp-' + st.lower()}-syn-{i}"
        w.writerow([cid, json.dumps({'id': cid, 'state': st, 'tier': 'shelf', 'title': c['title'][:110] + f' #{i // len(src)}', 'topic': c.get('topic') or '', 'text': c['text'],
                                     'source': c.get('source') or 'x', 'url': 'https://example.gov/x', 'confidence': 'high', 'kind': 'summary'})])
open(os.path.join(D, 'roles.sql'), 'w').write("""
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; create role authenticated; create role service_role; end if;
end $$;
drop schema if exists pb_ai cascade; create schema pb_ai; grant usage on schema pb_ai to authenticated;
drop function if exists public.pb_ai_kb_shelf_search(text, text, integer, text[], text[], integer);
""")
qs = json.load(open(os.path.join(HERE, '../work/queries.json')))
lit = lambda s: "'" + s.replace("'", "''") + "'"
vals = ",\n".join(f"({lit(q['id'])}, {lit(q['q'])}, {lit(STATES[k % len(STATES)])}, array[{','.join(lit(t) for t in q['terms'])}]::text[])" for k, q in enumerate(qs) if q['terms'])
open(os.path.join(D, 'time.sql'), 'w').write(f"""
create temp table tq (id text, q text, st text, terms text[]);
insert into tq values
{vals};
create temp table tr (id text, ms numeric, n int);
do $$
declare r record; t0 timestamptz; v jsonb; pass int;
begin
  for pass in 1..2 loop
    if pass = 2 then truncate tr; end if;        -- first pass warms the cache, second is timed
    for r in select * from tq loop
      t0 := clock_timestamp();
      v := public.pb_ai_kb_shelf_search(r.q, r.st, 3, r.terms);
      insert into tr values (r.id, extract(epoch from clock_timestamp() - t0) * 1000, jsonb_array_length(v->'rows'));
    end loop;
  end loop;
end $$;
select 'searches ' || count(*) || ': median ' || round(percentile_cont(0.5) within group (order by ms)::numeric, 1) || ' ms, p95 ' || round(percentile_cont(0.95) within group (order by ms)::numeric, 1)
       || ' ms, slowest ' || round(max(ms), 1) || ' ms; with 3 excerpts ' || count(*) filter (where n = 3) || ', with none ' || count(*) filter (where n = 0) from tr;
select 'slowest: ' || string_agg(x, ' | ') from (select round(tr.ms, 0) || ' ms "' || left(tq.q, 50) || '"' x from tr join tq using (id) order by tr.ms desc limit 4) s;
""")
