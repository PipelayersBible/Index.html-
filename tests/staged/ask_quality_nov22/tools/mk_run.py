# mk_run.py (copied from library_consolidate_cs_nov21) <run> <label> <cases.jsonl> [id,id,...] : eval_runs insert for ai-next, 3 cases per batch (k = 2000 + batch), then eval_pump.
import json, sys
run, label, f = sys.argv[1:4]; only = sys.argv[4].split(',') if len(sys.argv) > 4 else None
cs = [json.loads(l) for l in open(f) if l.strip()]
if only: cs = [c for c in cs if c['id'] in only]
q = lambda s: "'" + s.replace("'", "''") + "'"
rows = []
for b in range(0, len(cs), 3):
    g = cs[b:b + 3]
    ids = 'array[' + ','.join(q(c['id']) for c in g) + ']'
    js = json.dumps([{'id': c['id'], 'q': c['q'], 'where': c['where'], 'level': c['level']} for c in g])
    rows.append(f"({q(run)}, 'ai-next', {q(label)}, {2000 + b // 3}, {ids}, {q(js)}::jsonb)")
print(f"insert into pb_ai.eval_runs(run, fn, label, k, ids, cases) values\n" + ',\n'.join(rows) + ";\n" +
      f"select pb_ai.eval_pump({q(run)}) started, (select count(*) from pb_ai.eval_runs where run = {q(run)}) batches;")
