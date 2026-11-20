# builds the files tools/pgtest.sh loads: a copy of the server's KB tables with the local copy of the live library,
# one small lib_kb batch (core + shelf + a supersede), and a synthetic shelf of N rows (the live chunks re-labelled by state).
import json, sys, os, csv, random
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..'))
import lib_kb
N, D = int(sys.argv[1]), sys.argv[2]
kb = json.load(open(os.path.join(HERE, '../../ask_state_nov20/work/kb_live2.json')))
rows = sorted(((c['_ord'], lib, c) for lib, L in kb.items() for c in L), key=lambda r: r[0])
with open(os.path.join(D, 'chunks.csv'), 'w', newline='') as f:
    w = csv.writer(f)
    for o, lib, c in rows: w.writerow([lib_kb.VERSION, o, lib, json.dumps({k: v for k, v in c.items() if k != '_ord'})])
V = lib_kb.VERSION
open(os.path.join(D, 'setup.sql'), 'w').write(f"""
create role anon; create role authenticated; create role service_role;
create schema pb_ai;
create table pb_ai.kb_chunks (version text, ord int, lib text, chunk jsonb, primary key (version, ord));
create table pb_ai.kb_versions (version text primary key, built timestamptz, n int, counts jsonb, active boolean, loaded_at timestamptz);
create table pb_ai.kb_index (version text primary key, n int, fmt int, sha text, parts int, saved_at timestamptz);
create table pb_ai.kb_index_parts (version text, part int, data text, primary key (version, part));
\\copy pb_ai.kb_chunks from '{D}/chunks.csv' csv
insert into pb_ai.kb_versions values ('{V}', now(), {len(rows)}, '{{}}', true, now());
insert into pb_ai.kb_index values ('{V}', {len(rows)}, 1, 'x', 2, now()); insert into pb_ai.kb_index_parts values ('{V}', 0, 'a'), ('{V}', 1, 'b');
""")
base = dict(topic='Traffic control: flaggers', source='Texas MUTCD 2011 Rev. 2, Section 6E.01', url='https://www.txdot.gov/x.pdf', checked='2026-11-20',
            edition='2011 Revision 2', confidence='high', kind='summary', license='gov-state', state='TX')
txt = 'Texas follows the Texas MUTCD for flagging on public roads. ' + 'Flaggers are trained before they flag traffic at a work zone. ' * 5
B = lib_kb.Batch('pgt', out_dir=D)
for k in range(5): B.add(id=f'tc-tx-pgt-{k}', tier='core', title=f'Texas flagger rules, part {k}', text=txt, **base)
B.add(id='tc-tx-pgt-9', tier='core', title='Texas flagger rules, replaced card', text=txt, supersedes='tc-2', **base)
for k in range(3): B.add(id=f'tc-tx-pgts-{k}', tier='shelf', title=f'Texas flagger rules, detail {k}', text=txt, **base)
B.write()
# synthetic shelf: 40% nationwide, 60% spread over 51 states
random.seed(7); codes = list(lib_kb.STATES)
src = [c for _, lib, c in rows if 200 <= len(c['text']) <= 1800]
with open(os.path.join(D, 'shelf.csv'), 'w', newline='') as f:
    w = csv.writer(f)
    for i in range(N):
        c = src[i % len(src)]; st = 'US' if random.random() < 0.4 else random.choice(codes)
        cid = f"{'fed' if st == 'US' else 'sp-' + st.lower()}-syn-{i}"
        w.writerow([cid, json.dumps({'id': cid, 'state': st, 'title': c['title'][:110] + f' #{i // len(src)}', 'topic': c.get('topic') or '', 'text': c['text'],
                                     'source': c.get('source') or 'x', 'confidence': 'high', 'kind': 'summary'})])
QS = [("how deep can a trench be before I need a trench box", ["deep depth", "trench excavation ditch", "before", "trench box shield"], 'TX'),
      ("how long is my 811 ticket good for", ["long", "locate 811 usa", "ticket", "good"], 'FL'),
      ("taper length for a lane closure at 45 mph", ["taper", "length", "lane", "closure", "45", "mph"], 'OH'),
      ("minimum cover over water main", ["minimum", "cover", "over", "water potable", "main"], 'WA'),
      ("confined space permit attendant duties", ["confined space permit space", "permit", "attendant", "duty"], None),
      ("flagger station distance sign spacing", ["traffic control flagger mutcd", "station sta", "distance", "sign", "separation clearance spacing"], 'CA')]
t = ["\\timing on"]
for q, groups, st in QS:
    arr = "array[" + ",".join("'" + g + "'" for g in groups) + "]"
    t.append(f"select '{q[:40]} [{st}]: ' || jsonb_array_length(public.pb_ai_kb_shelf_search({arr}, {repr(st) if st else 'null'}, 6)->'rows') || ' rows';")
open(os.path.join(D, 'time.sql'), 'w').write("\n".join(t + t[1:]) + "\n")
