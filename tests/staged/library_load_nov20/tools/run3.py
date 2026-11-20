# run3.py <run> <label> <cases.json> [--ids id,id,...] : SQL that starts an eval run on ai-next in batches of 3 (eval_start uses 6, which hits
# HTTP 546 with the overlay build). Inline cases (with optional "history") go straight into pb_ai.eval_runs; --ids are read from pb_ai.eval_set.
# The usual pb_ai.eval_collect(<run>) then pumps (5 batches in flight) and retries 546 up to 3 times.  Prints the SQL.
import json, sys
run, label, f = sys.argv[1], sys.argv[2], sys.argv[3]
ids = sys.argv[sys.argv.index('--ids') + 1].split(',') if '--ids' in sys.argv else []
inline = json.load(open(f)) if f != '-' else []
keep = ('id', 'q', 'where', 'level', 'history')
inline = [{k: c[k] for k in keep if k in c} for c in inline]
b = [inline[i:i + 3] for i in range(0, len(inline), 3)]
arr = json.dumps(b, ensure_ascii=False, separators=(',', ':')); assert '$j$' not in arr
q = lambda s: "'" + s.replace("'", "''") + "'"
sql = ''
if b:
    sql += f"insert into pb_ai.eval_runs(run, fn, label, k, ids, cases) select {q(run)}, 'ai-next', {q(label)}, (o - 1)::int, array(select x->>'id' from jsonb_array_elements(e) x), e from jsonb_array_elements($j${arr}$j$::jsonb) with ordinality t(e, o);\n"
if ids:
    sql += f"""insert into pb_ai.eval_runs(run, fn, label, k, ids, cases) with s as (select *, (row_number() over (order by id) - 1) / 3 g from pb_ai.eval_set where id = any(array[{','.join(q(i) for i in ids)}]))
  select {q(run)}, 'ai-next', {q(label)}, 1000 + g, array_agg(id), jsonb_agg(jsonb_build_object('id', id, 'q', q, 'where', "where", 'level', level)
      || case when images is null then '{{}}'::jsonb else jsonb_build_object('images', images) end
      || case when image_ids is null then '{{}}'::jsonb else jsonb_build_object('image_ids', to_jsonb(image_ids)) end
      || case when feature is null then '{{}}'::jsonb else jsonb_build_object('feature', feature) end
      || case when model is null then '{{}}'::jsonb else jsonb_build_object('model', model) end) from s group by g;\n"""
sql += f"select pb_ai.eval_pump({q(run)}) started, (select count(*) from pb_ai.eval_runs where run = {q(run)}) batches;"
print(sql)
