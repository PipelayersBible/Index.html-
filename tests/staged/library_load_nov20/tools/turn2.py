# turn2.py <turn-1 run> <turn-2 run> [ids...] : SQL for turn 2 of the follow-through cases: the reply ("yes", "go on" ...) with the turn-1 question and
# the answer the model actually gave (from pb_ai.eval_results) as history, newest first, as the app sends it. Batches of 3.
import json, os, sys
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r1, r2 = sys.argv[1], sys.argv[2]; per = int(os.environ.get('PER', 3)); only = set(sys.argv[3:])
fu = [c for c in json.load(open(os.path.join(H, 'work/lib7/cases_lib7.json')))['fu'] if not only or c['id'] in only]
arr = json.dumps([[c['id'], c['q'], c['where'], c['level'], c['reply']] for c in fu], ensure_ascii=False); assert '$j$' not in arr
print(f"""insert into pb_ai.eval_runs(run, fn, label, k, ids, cases)
with c as (select e->>0 id, e->>1 q1, e->>2 wh, e->>3 lv, e->>4 rp, o from jsonb_array_elements($j${arr}$j$::jsonb) with ordinality t(e, o)),
 j as (select c.*, (row_number() over (order by o) - 1) / {per} g, jsonb_build_object('id', c.id || '-t2', 'q', c.rp, 'where', c.wh, 'level', c.lv,
   'history', jsonb_build_array(jsonb_build_object('q', c.q1, 'a', r.text))) cs from c join pb_ai.eval_results r on r.run = '{r1}' and r.id = c.id || '-t1')
select '{r2}', 'ai-next', 'lib7 follow-through turn 2', g, array_agg(id || '-t2'), jsonb_agg(cs order by o) from j group by g;
select pb_ai.eval_pump('{r2}') started, (select count(*) from pb_ai.eval_runs where run = '{r2}') batches;""")
