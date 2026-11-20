# pick.py <round>: picks the round's ~100 cases per LIBRARY_RULES section 5 and writes work/round<N>/{cases.json, insert.sql, start.sql}.
#   35 re-asked failures of the last round (round 1: the weakest in the free check), 45 fresh (811 9, state safety 9, federal OSHA 7,
#   traffic 9, specs 7, other 4; no state more than 3; failing states drawn more), 15 canaries (10 existing + 5 new-library safety), 5 style probes.
# Cases go into pb_ai.eval_set INACTIVE (so nobody's full-set run picks them up) with empty must lists: grading is local (tools/grade.py).
import json, os, sys, random, re, collections
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); N = int(sys.argv[1]); random.seed(1120 + N)
W = os.path.join(H, 'work'); R = os.path.join(W, f'round{N}'); os.makedirs(R, exist_ok=True)
cases = [json.loads(l) for l in open(os.path.join(H, 'out/cases.jsonl'))]; by = {c['id']: c for c in cases}
hist = json.load(open(os.path.join(W, 'history.json'))) if os.path.exists(os.path.join(W, 'history.json')) else {}   # id -> [[round, ok], ...]
free = json.load(open(os.path.join(W, 'retr_after.json')))
CAN_OLD = [c['id'] for c in json.load(open(os.path.join(H, 'canaries.json')))]
CAN_NEW = ['lib-us-em-1', 'lib-us-em-2', 'lib-us-osha-1', 'lib-us-osha-42', 'lib-wa-fup-1']
STYLE = [c['id'] for c in cases if c.get('complex') and c['tier'] == 'core'][:5]
def group(c):
    if c['coll'] == '811': return '811'
    if c['coll'] == 'osha': return 'osha_fed' if c['id'].startswith('lib-us-') else 'state_safety'
    return {'traffic': 'traffic', 'specs': 'specs', 'more': 'other'}[c['coll']]
SAFE = lambda c: 0 if c['cat'] in ('trench', 'confined', 'emergency', 'safety', 'heat', 'fall') or c['coll'] == 'osha' else 1 if c['coll'] == '811' else 2 if c['coll'] == 'traffic' else 3
pool = [c for c in cases if c['tier'] == 'core' and c['id'] not in CAN_NEW and c['id'] not in STYLE]
# --- 35 re-asked
if N == 1: re_ask = sorted([c for c in pool if not free[c['id']]['ok']], key=lambda c: (free[c['id']]['facts'], SAFE(c), c['id']))[:35]
else:
    last = [i for i, h in hist.items() if h[-1][0] == N - 1 and not h[-1][1] and i in by and i not in CAN_NEW and i not in STYLE]
    re_ask = sorted([by[i] for i in last], key=lambda c: (SAFE(c), c['id']))[:35]
if os.environ.get('NO_REASK'): re_ask = []   # lib7 (Tommy: rounds of 100 FRESH): no re-asks, 80 fresh + 15 canaries + 5 style
# --- fresh
asked = set(hist) | {c['id'] for c in re_ask}
fail_states = collections.Counter(by[i]['where'][-2:] for i, h in hist.items() if i in by and not h[-1][1])
last_states = {by[i]['where'][-2:] for i, h in hist.items() if i in by and h[-1][0] == N - 1}
want = {'811': 9, 'state_safety': 9, 'osha_fed': 7, 'traffic': 9, 'specs': 7, 'other': 4}
extra = 35 - len(re_ask)
for g in ['811', 'state_safety', 'traffic', 'osha_fed', 'specs', 'other'] * 8:
    if extra <= 0: break
    want[g] += 1; extra -= 1
fresh, st_n = [], collections.Counter(c['where'][-2:] for c in re_ask)
for g, k in want.items():
    cand = [c for c in pool if group(c) == g and c['id'] not in asked]; random.shuffle(cand)
    # states not seen last round first, then states that failed more
    cand.sort(key=lambda c: (c['where'][-2:] in last_states, -min(fail_states[c['where'][-2:]], 2)))
    got = 0
    for c in cand:
        if got >= k: break
        st = c['where'][-2:]
        if g not in ('osha_fed', 'other') and st_n[st] >= 3: continue
        fresh.append(c); st_n[st] += 1; got += 1
rows = [dict(by[c['id']], grp='reask') for c in re_ask] + [dict(c, grp='fresh') for c in fresh] + [dict(by[i], grp='canary_new') for i in CAN_NEW] + [dict(by[i], grp='style') for i in STYLE]
ids = [r['id'] for r in rows] + CAN_OLD; assert len(set(ids)) == len(ids)
json.dump({'round': N, 'cases': rows, 'canary_old': CAN_OLD}, open(os.path.join(R, 'cases.json'), 'w'), indent=0)
ins = json.load(open(os.path.join(W, 'inserted.json'))) if os.path.exists(os.path.join(W, 'inserted.json')) else []
new = [r for r in rows if r['id'] not in ins]
q = lambda s: "'" + s.replace("'", "''") + "'"
tag = f'lib{N}'; LIMS = {'simple': 70, 'rule': 100, 'complex': 110, 'steps': 170}
sql = ''
if new:   # compact: one json list of [id, q, where, level, maxwords]
    arr = json.dumps([[r['id'], r['q'], r['where'], r.get('level', 'pipelayer'), r.get('maxwords') or LIMS[r['kind']]] for r in new], ensure_ascii=False, separators=(',', ':'))
    assert '$j$' not in arr
    sql += f"insert into pb_ai.eval_set (id, cat, q, \"where\", level, must, mustnot, maxwords, active) select e->>0, '{tag}', e->>1, e->>2, e->>3, '[]', '[]', (e->>4)::int, false from jsonb_array_elements($j${arr}$j$::jsonb) e on conflict (id) do nothing;\n"
oldrows = [r['id'] for r in rows if r['id'] in ins]
if oldrows: sql += f"update pb_ai.eval_set set cat = '{tag}' where not active and id in (" + ','.join(q(i) for i in oldrows) + ");\n"
sql += f"select pb_ai.eval_start('ai-next', 'lib round {N}', (select array_agg(id) from pb_ai.eval_set where cat = '{tag}' and not active) || array[" + ','.join(q(i) for i in CAN_OLD) + "]) as run, (select count(*) from pb_ai.eval_set where cat = '{tag}' and not active) as n;\n"
open(os.path.join(R, 'run.sql'), 'w').write(sql)
json.dump(ins + [r['id'] for r in new], open(os.path.join(W, 'inserted_pending.json'), 'w'))
print(f'run.sql {len(sql)} bytes; round {N}: {len(re_ask)} re-asked, {len(fresh)} fresh ({dict(collections.Counter(group(c) for c in fresh))}), {len(CAN_NEW)}+{len(CAN_OLD)} canaries, {len(STYLE)} style = {len(ids)}; {len(new)} to insert; states {len(st_n)}')
