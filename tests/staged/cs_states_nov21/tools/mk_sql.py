# mk_sql.py (cs_states_nov21): promotion SQL for the confined space state check. NOT APPLIED by anything here.
#   python3 tools/mk_sql.py [work/expected.json] -> sql/20_precheck.sql, 21_load.sql, 91_rollback.sql, 21t_live_test.sql
# 3 rows changed in place (same ord, same lib); no row added, deleted or renumbered, so ords never move (CHECK ord >= 0 is never at risk).
# Guards: whole-library md5 before (131904c2..., live after the cs consolidation) and each old row's md5; the result must equal the md5
# tested on the local Postgres copy (expected.json, from tools/local_test.sh pass 1). Rollback: only on that tested result, back to 131904c2... exactly.
import json, os, sys
H = '/home/claude/index.html-/tests/staged/cs_states_nov21'
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20'); sys.path.insert(0, os.path.join(H, 'tools'))
import lib_kb
from build import build
V = 'b3e91f6c47d2'; N = 3240
PRE_ALL = '131904c2de6b687c14ff4d68ccaea531'   # live after 21_load of library_consolidate_cs_nov21 (applied Nov 21 evening) = local copy
live, after = build()
exp = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else None
POST_ALL = exp['post_all'] if exp else 'PLACEHOLDER'
SK = '' if exp else '-- pass 1: '
ch = [(o['o'], o, a) for o, a in zip(live, after) if o != a]
assert len(ch) == 3 and all(o['lib'] == a['lib'] and o['c']['id'] == a['c']['id'] for _, o, a in ch)
J = lambda v: lib_kb._q(json.dumps(v, ensure_ascii=False))
ALLQ = f"(select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version = '{V}')"
CNT = f"(select count(*) from pb_ai.kb_chunks where version = '{V}')"
old_vals = ', '.join(f"({o}, {lib_kb._q(r['c']['id'])}, md5({J(r['c'])}::jsonb::text))" for o, r, _ in ch)
new_vals = ', '.join(f"({o}, {lib_kb._q(r['c']['id'])}, md5({J(r['c'])}::jsonb::text))" for o, _, r in ch)
idx = f"""  delete from pb_ai.kb_index_parts where version = '{V}';   -- saved search index: rebuilt by the next cold start (about 2 s, once)
  delete from pb_ai.kb_index where version = '{V}';"""

def upd(frm, to, tag):
    out = []
    for o, a, b in ch:
        x, y = (a, b) if frm == 'old' else (b, a)
        out.append(f"""  update pb_ai.kb_chunks set chunk = {J(y['c'])}::jsonb
   where version = '{V}' and ord = {o} and chunk->>'id' = {lib_kb._q(x['c']['id'])} and md5(chunk::text) = md5({J(x['c'])}::jsonb::text);
  get diagnostics vk = row_count; if vk <> 1 then raise exception 'FAIL {tag}: row % ({x['c']['id']}) is not the expected text', {o}; end if;""")
    return '\n'.join(out)

LOAD_BODY = f"""  select {CNT}, {ALLQ} into vn, vm;
  {SK}if vn = {N} and vm = '{POST_ALL}' then raise notice 'cs_states 21_load: already applied, nothing changed'; return; end if;
  if vn <> {N} or vm is distinct from '{PRE_ALL}' then raise exception 'FAIL load: library is not the live state this was built on (% rows, md5 %)', vn, vm; end if;
  if (select n from pb_ai.kb_versions where version = '{V}' and active) is distinct from {N} then raise exception 'FAIL load: kb_versions.n is not {N} or {V} not active'; end if;
{upd('old', 'new', 'load')}
{idx}
  select {CNT}, {ALLQ} into vn, vm;
  if vn <> {N} or (select max(ord) from pb_ai.kb_chunks where version = '{V}') <> {N - 1} then raise exception 'FAIL load: row count / ords'; end if;
  {SK}if vm <> '{POST_ALL}' then raise exception 'FAIL load: result % differs from the tested library', vm; end if;"""

RB_BODY = f"""  select {CNT}, {ALLQ} into vn, vm;
  if vn = {N} and vm = '{PRE_ALL}' then raise notice 'cs_states 91_rollback: already rolled back (or never applied), nothing changed'; return; end if;
  if vn <> {N} or vm is distinct from '{POST_ALL}' then raise exception 'FAIL rollback: library is not the state 21_load leaves (% rows, md5 %): nothing rolled back', vn, vm; end if;
{upd('new', 'old', 'rollback')}
{idx}
  if {ALLQ} <> '{PRE_ALL}' then raise exception 'FAIL rollback: not back to the live md5'; end if;"""

pre = f"""-- 20_precheck.sql (cs_states_nov21): SELECT only. Run before and after 21_load.sql.
-- BEFORE: rows {N}, max_ord {N - 1}, kb_n {N}, all_md5 {PRE_ALL}, old_rows_ok 3, new_rows_ok 0.
-- AFTER:  rows {N}, max_ord {N - 1}, kb_n {N}, all_md5 {POST_ALL}, old_rows_ok 0, new_rows_ok 3.
select {CNT} as rows, (select max(ord) from pb_ai.kb_chunks where version = '{V}') as max_ord,
       (select n from pb_ai.kb_versions where version = '{V}' and active) as kb_n, {ALLQ} as all_md5,
       (select count(*) from pb_ai.kb_chunks k join (values {old_vals}) t(o, id, m) on k.ord = t.o and k.chunk->>'id' = t.id and md5(k.chunk::text) = t.m where k.version = '{V}') as old_rows_ok,
       (select count(*) from pb_ai.kb_chunks k join (values {new_vals}) t(o, id, m) on k.ord = t.o and k.chunk->>'id' = t.id and md5(k.chunk::text) = t.m where k.version = '{V}') as new_rows_ok;
"""
ids = ', '.join(f"{o} {a['c']['id']}" for o, a, _ in ch)
load = f"""-- 21_load.sql (cs_states_nov21): confined space state check, ONE transaction. NOT APPLIED. Generated by tools/mk_sql.py.
-- Changes 3 rows in place (ord {ids}); no row added, deleted or renumbered; kb_versions.n stays {N}; drops the saved search index.
-- Runs only on {N} rows with md5 {PRE_ALL}; ends at md5 {POST_ALL}. Run twice: the second run says "already applied".
begin;
lock table pb_ai.kb_chunks in share row exclusive mode;
do $load$
declare vk int; vn int; vm text;
begin
{LOAD_BODY}
  raise notice 'cs_states 21_load: applied, 3 rows changed, % rows', vn;
end $load$;
commit;
"""
rb = f"""-- 91_rollback.sql (cs_states_nov21): undo 21_load.sql exactly. NOT APPLIED. Generated by tools/mk_sql.py.
-- Puts the 3 rows back (ord {ids}) as they are live now; drops the saved search index.
-- Runs only on md5 {POST_ALL}; ends at {N} rows, md5 {PRE_ALL}. Run twice: "already rolled back".
begin;
lock table pb_ai.kb_chunks in share row exclusive mode;
do $rb$
declare vk int; vn int; vm text;
begin
{RB_BODY}
  raise notice 'cs_states 91_rollback: done, % rows', {N};
end $rb$;
commit;
"""
# rolled-back live test: one statement; the final RAISE undoes everything (load, index drop, rollback).
t_load = LOAD_BODY.replace("raise notice 'cs_states 21_load: already applied, nothing changed'; return;", "raise exception 'FAIL test: already applied on live';")
t_rb = RB_BODY.replace("raise notice 'cs_states 91_rollback: already rolled back (or never applied), nothing changed'; return;", "raise exception 'FAIL test: load did not change anything';")
test = f"""-- 21t_live_test.sql (cs_states_nov21): ROLLED-BACK live test. One DO block: load body -> md5 -> rollback body -> md5 -> RAISE.
-- The RAISE at the end aborts the statement, so nothing stays written (also the saved-index delete is undone).
-- Expected result: ERROR:  CS STATES ROLLBACK TEST OK: before {N} / {PRE_ALL}, after load {N} / {POST_ALL}, after rollback {N} / {PRE_ALL}
-- Any message starting with FAIL means: do not run 21_load.sql.
do $t$
declare vk int; vn int; vm text; m0 text; m1 text; m2 text; n1 int; n2 int;
begin
  select {ALLQ} into m0;
{t_load}
  select {CNT}, {ALLQ} into n1, m1;
{t_rb}
  select {CNT}, {ALLQ} into n2, m2;
  raise exception 'CS STATES ROLLBACK TEST OK: before {N} / %, after load % / %, after rollback % / %', m0, n1, m1, n2, m2;
end $t$;
"""
os.makedirs(os.path.join(H, 'sql'), exist_ok=True)
for fn, s in (('20_precheck.sql', pre), ('21_load.sql', load), ('91_rollback.sql', rb), ('21t_live_test.sql', test)):
    assert len(s.encode()) < 900_000; open(os.path.join(H, 'sql', fn), 'w').write(s)
    print(fn, len(s.encode()), 'bytes')
print('expected post md5', POST_ALL)
