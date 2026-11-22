# mk_sql.py [expected.json]: one guarded transaction for the whole library change + its rollback. NOT APPLIED.
#   sql/20_precheck.sql   SELECT only
#   sql/21_load.sql       3,247 rows md5 f85b4d61... -> 3,255 rows: 11 rows changed in place (same ord), 8 rows added at ord 3247..3254
#   sql/91_rollback.sql   back to 3,247 / f85b4d61... exactly
# md5 = md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)), the same formula ask_quality_nov22 used.
import json, sys
H = '/home/claude/index.html-/tests/staged/ask_everyday_nov22/'
V, PRE_N, PRE = 'b3e91f6c47d2', 3247, 'f85b4d61df8e54abe6bd391f7317cbd7'
POST = json.load(open(sys.argv[1]))['post_all'] if len(sys.argv) > 1 else None
live = [json.loads(l) for l in open('/home/claude/index.html-/tests/staged/ask_quality_nov22/work/after_rows.jsonl')]
after = [json.loads(l) for l in open(H + 'work/after_rows.jsonl')]
changed = [(a, b) for a, b in zip(live, after) if a != b]
added = after[len(live):]
assert all(a['o'] == b['o'] for a, b in changed) and [r['o'] for r in added] == list(range(PRE_N, PRE_N + len(added)))
q = lambda s: '$kb$' + s + '$kb$'
ALL = f"select count(*), md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version = '{V}'"
TAIL = f"""  update pb_ai.kb_versions v set n = c.n, counts = c.counts
    from (select sum(k)::int as n, jsonb_object_agg(lib, k) as counts from (select lib, count(*)::int as k from pb_ai.kb_chunks where version = '{V}' group by lib) x) c
   where v.version = '{V}';
  delete from pb_ai.kb_index_parts where version = '{V}';
  delete from pb_ai.kb_index where version = '{V}';"""
post_chk = (f"  if vn <> {len(after)} or vm is distinct from '{POST}' then raise exception 'FAIL after load: % rows, md5 %', vn, vm; end if;" if POST else
            "  raise notice 'after load: % rows, md5 %', vn, vm;")

body = []
for a, b in changed:
    body.append(f"  -- ord {a['o']}: {a['c']['id']} -> {b['c']['id']}\n  update pb_ai.kb_chunks set chunk = {q(json.dumps(b['c'], ensure_ascii=False))}::jsonb where version = '{V}' and ord = {a['o']} and chunk->>'id' = {q(a['c']['id'])};\n  get diagnostics vd = row_count; if vd <> 1 then raise exception 'FAIL row %', {a['o']}; end if;")
ins = ',\n'.join(json.dumps({'o': r['o'], 'lib': r['lib'], 'c': r['c']}, ensure_ascii=False) for r in added)
body.append(f"""  insert into pb_ai.kb_chunks (version, ord, lib, chunk)
  select '{V}', (e->>'o')::int, e->>'lib', e->'c' from jsonb_array_elements({q('[' + ins + ']')}::jsonb) e;""")
open(H + 'sql/21_load.sql', 'w').write(f"""-- 21_load.sql (ask_everyday_nov22): Ask library fixes from "Review - Ask Everyday Answers - 2026-11-22". ONE transaction. NOT APPLIED.
-- {PRE_N} -> {len(after)} rows: {len(changed)} rows changed in place (same ord), {len(added)} cards added at ord {PRE_N}..{len(after) - 1}; kb_versions.n fixed; saved index dropped.
-- Guarded by the whole-library md5: runs only on {PRE_N} rows with md5 {PRE}. Run twice: the second run says "already applied".
begin;
lock table pb_ai.kb_chunks in share row exclusive mode;
do $load$
declare vn int; vm text; vd int;
begin
  {ALL.replace('select count(*), md5', 'select count(*), md5', 1)} into vn, vm;
  if {'false' if not POST else f"vn = {len(after)} and vm = '{POST}'"} then raise notice 'ask_everyday 21_load: already applied, nothing changed'; return; end if;
  if vn <> {PRE_N} or vm is distinct from '{PRE}' then raise exception 'FAIL: library is not the state this was built on (% rows, md5 %)', vn, vm; end if;
{chr(10).join(body)}
{TAIL}
  {ALL} into vn, vm;
{post_chk}
  raise notice 'ask_everyday 21_load: applied, % rows, md5 %', vn, vm;
end $load$;
commit;
""")
rb = []
for a, b in changed:
    rb.append(f"  update pb_ai.kb_chunks set chunk = {q(json.dumps(a['c'], ensure_ascii=False))}::jsonb where version = '{V}' and ord = {a['o']} and chunk->>'id' = {q(b['c']['id'])};\n  get diagnostics vd = row_count; if vd <> 1 then raise exception 'FAIL row %', {a['o']}; end if;")
open(H + 'sql/91_rollback.sql', 'w').write(f"""-- 91_rollback.sql (ask_everyday_nov22): undo 21_load exactly. NOT APPLIED. Guarded by the post-load md5 {POST}.
begin;
lock table pb_ai.kb_chunks in share row exclusive mode;
do $rb$
declare vn int; vm text; vd int;
begin
  {ALL} into vn, vm;
  if vn = {PRE_N} and vm = '{PRE}' then raise notice 'ask_everyday 91_rollback: already rolled back'; return; end if;
  if vn <> {len(after)} or vm is distinct from '{POST}' then raise exception 'FAIL: not the 21_load result (% rows, md5 %)', vn, vm; end if;
  delete from pb_ai.kb_chunks where version = '{V}' and ord >= {PRE_N};
{chr(10).join(rb)}
{TAIL}
  {ALL} into vn, vm;
  if vn <> {PRE_N} or vm is distinct from '{PRE}' then raise exception 'FAIL after rollback: % rows, md5 %', vn, vm; end if;
  raise notice 'ask_everyday 91_rollback: done, % rows, md5 %', vn, vm;
end $rb$;
commit;
""")
ids = [b['c']['id'] for a, b in changed] + [r['c']['id'] for r in added]
open(H + 'sql/20_precheck.sql', 'w').write(f"""-- 20_precheck.sql: SELECT only. Before 21_load expect rows {PRE_N}, max_ord {PRE_N - 1}, kb_n {PRE_N}, all_md5 {PRE}, old_rows_found {len(changed)}, new_ids_there 0.
-- After: rows {len(after)}, max_ord {len(after) - 1}, kb_n {len(after)}, all_md5 {POST}, new_ids_there {len(added)}.
select (select count(*) from pb_ai.kb_chunks where version = '{V}') as rows,
       (select max(ord) from pb_ai.kb_chunks where version = '{V}') as max_ord,
       (select n from pb_ai.kb_versions where version = '{V}' and active) as kb_n,
       (select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version = '{V}') as all_md5,
       (select count(*) from pb_ai.kb_chunks where version = '{V}' and chunk->>'id' in ({', '.join(q(a['c']['id']) for a, b in changed)})) as old_rows_found,
       (select count(*) from pb_ai.kb_chunks where version = '{V}' and chunk->>'id' in ({', '.join(q(r['c']['id']) for r in added)})) as new_ids_there;
""")
print('changed', len(changed), 'added', len(added), 'post md5', POST)
