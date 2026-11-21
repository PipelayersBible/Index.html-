# mk_sql.py (state audit Nov 21): SQL for the merged load, from the files merge.py wrote. NOT APPLIED by anything here.
#   python3 tools/mk_sql.py [expected.json]
#   -> sql/10_precheck.sql (SELECT only), sql/11_load.sql (one transaction), sql/91_rollback.sql (undo 11), sql/12_eval_cases_inactive.sql
# The md5 of each touched row before the load comes from work/live_rows.jsonl via the local Postgres copy (its whole-library md5 = the server's).
# expected.json (written by tools/local_test.sh after a first local run) holds the md5s of the touched rows AFTER the load; the load and the
# rollback check against them. Without it they are generated with placeholders and must not be used.
import json, os, sys, subprocess
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
import lib_kb
V = 'b3e91f6c47d2'; N0 = 3236
PRE_ALL, PRE_SHELF = '347ae4d8eee91b042fc1ff49baf0fd60', 'fa1033cecf0744b3aa3d3ccac028160e'   # server, read Nov 20 21:00 PT
rd = lambda f: [json.loads(l) for l in open(os.path.join(H, f)) if l.strip()]
core, shelf, edits, cases = rd('merged_core.jsonl'), rd('merged_shelf.jsonl'), rd('edits.jsonl'), rd('cases.jsonl')
live = {r['o']: r for r in rd('work/live_rows.jsonl')}; live_id = {r['c']['id']: r['o'] for r in live.values()}
exp = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else None

ins = [c for c in core if not c.get('supersedes')]
sup = [c for c in core if c.get('supersedes')]
# every in-place change, by ord: (ord, lib, old chunk, new chunk)
inplace = [(e['ord'], e['lib'], e['old'], e['new']) for e in edits]
for c in sup:
    o = live_id[c['supersedes']]; inplace.append((o, lib_kb.lib_of(c), live[o]['c'], c))
inplace.sort(key=lambda x: x[0])
for o, lib, old, new in inplace: assert live[o]['c'] == old and live[o]['lib'] == lib
ords_touched = [x[0] for x in inplace]; N1 = N0 + len(ins)
new_ids = [c['id'] for c in ins]; shelf_ids = [c['id'] for c in shelf]

# md5(chunk::text) of the touched rows as they are on live, read from the local copy
D = '/var/lib/postgresql/askmerge_pg'
def q(sql): return subprocess.run(['psql', '-h', D, '-p', '55433', '-U', 'postgres', '-X', '-Atc', sql], capture_output=True, text=True, check=True).stdout.strip()
loc = q(f"select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version = '{V}'")
old_md5 = dict(l.split('|') for l in q(f"select ord, md5(chunk::text) from pb_ai.kb_chunks where version = '{V}' and ord in ({','.join(map(str, ords_touched))})").splitlines())
PRE_TOUCHED = q(f"select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version = '{V}' and ord in ({','.join(map(str, ords_touched))})")
assert loc == PRE_ALL, 'the local copy must be the live state (run reset first)'
J = lambda v: lib_kb._q(json.dumps(v, ensure_ascii=False))
L = lambda xs: ', '.join("'" + x.replace("'", "''") + "'" for x in xs)
POST_TOUCHED = exp['post_touched'] if exp else 'PLACEHOLDER'; POST_NEW = exp['post_new'] if exp else 'PLACEHOLDER'; POST_SHELF = exp['post_shelf'] if exp else 'PLACEHOLDER'
SK = '' if exp else '-- pass 1, no expected md5 yet: '
touched_list = ','.join(map(str, ords_touched))
md5_touched = f"(select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version = '{V}' and ord in ({touched_list}))"
md5_new = f"(select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version = '{V}' and ord >= {N0})"
md5_shelf = "(select md5(string_agg(id||':'||(chunk::text), '|' order by id)) from pb_ai.kb_shelf)"
counts_tail = f"""  update pb_ai.kb_versions v set n = c.n, counts = c.counts
    from (select sum(k)::int as n, jsonb_object_agg(lib, k) as counts from (select lib, count(*)::int as k from pb_ai.kb_chunks where version = '{V}' group by lib) x) c
   where v.version = '{V}';
  delete from pb_ai.kb_index_parts where version = '{V}';   -- the saved search index is rebuilt by the next cold start (about 2 s, once)
  delete from pb_ai.kb_index where version = '{V}';"""

# ------------------------------------------------------------------ 10 precheck
pre = f"""-- 10_precheck.sql (state audit Nov 21, ask_merge): SELECT only. Run before 11_load.sql.
-- Expect BEFORE the load: rows {N0}, max_ord {N0 - 1}, kb_n {N0}, new_ids_there 0, shelf_rows 47, shelf_new_there 0, touched_ok {len(ords_touched)},
--   touched_md5 = {PRE_TOUCHED}, all_md5 = {PRE_ALL} (if all_md5 differs but touched_md5 and the rest match, something else in the library changed: the load is still safe,
--   it only checks the rows it touches), shelf_md5 = {PRE_SHELF}.
-- Expect AFTER the load: rows {N1}, max_ord {N1 - 1}, kb_n {N1}, new_ids_there {len(new_ids)}, shelf_rows {47 + len(shelf)}, shelf_new_there {len(shelf)}, touched_ok 0, touched_md5 = {POST_TOUCHED}, new_md5 = {POST_NEW}, shelf_md5 = {POST_SHELF}.
select (select count(*) from pb_ai.kb_chunks where version = '{V}') as rows,
       (select max(ord) from pb_ai.kb_chunks where version = '{V}') as max_ord,
       (select n from pb_ai.kb_versions where version = '{V}' and active) as kb_n,
       (select count(*) from pb_ai.kb_chunks where version = '{V}' and chunk->>'id' in ({L(new_ids)})) as new_ids_there,
       (select count(*) from pb_ai.kb_shelf) as shelf_rows,
       (select count(*) from pb_ai.kb_shelf where id in ({L(shelf_ids)})) as shelf_new_there,
       (select count(*) from pb_ai.kb_chunks k join (values {', '.join(f"({o}, '{old_md5[str(o)]}')" for o in ords_touched)}) t(o, m) on k.ord = t.o and md5(k.chunk::text) = t.m where k.version = '{V}') as touched_ok,
       {md5_touched} as touched_md5,
       {md5_new} as new_md5,
       (select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version = '{V}') as all_md5,
       {md5_shelf} as shelf_md5;
"""

# ------------------------------------------------------------------ 11 load
upd = []
for o, lib, old, new in inplace:
    upd.append(f"""  -- ord {o}: {old['id']}{' -> ' + new['id'] if new['id'] != old['id'] else ''}
  update pb_ai.kb_chunks set lib = '{lib}', chunk = {J(new)}::jsonb
   where version = '{V}' and ord = {o} and chunk->>'id' = {lib_kb._q(old['id'])} and md5(chunk::text) = '{old_md5[str(o)]}';
  get diagnostics vk = row_count; if vk <> 1 then raise exception 'FAIL: row % is not the expected live text', {o}; end if;""")
rows_ins = ',\n'.join(json.dumps({'lib': lib_kb.lib_of(c), 'chunk': c}, ensure_ascii=False) for c in ins)
load = f"""-- 11_load.sql (state audit Nov 21, ask_merge): Ask library, ONE transaction. NOT APPLIED. Generated by tools/mk_sql.py.
-- Adds {len(ins)} core cards at ord {N0}..{N1 - 1}, changes {len(inplace)} rows in place (same ord: {len(sup)} superseded + {len(edits)} edited), adds {len(shelf)} shelf cards.
-- Guarded: it changes nothing unless every touched row still has its live text (md5 of the row), the library has {N0} rows (ord 0..{N0 - 1}) and none of the new ids are there.
-- Safe to run twice: a second run finds everything in place, says "already applied" and changes nothing (the saved index is not dropped again).
begin;
lock table pb_ai.kb_chunks in share row exclusive mode;
lock table pb_ai.kb_shelf in share row exclusive mode;
do $load$
declare vk int; vn int; vmx int; vd int;
begin
  -- already applied?
  if (select count(*) from pb_ai.kb_chunks where version = '{V}') = {N1}
     and {md5_touched} = '{POST_TOUCHED}' and {md5_new} = '{POST_NEW}'
     and (select count(*) from pb_ai.kb_shelf where id in ({L(shelf_ids)})) = {len(shelf)} then
    raise notice 'ask_merge 11_load: already applied, nothing changed'; return;
  end if;
  select count(*), max(ord) into vn, vmx from pb_ai.kb_chunks where version = '{V}';
  if vn <> {N0} or vmx <> {N0 - 1} then raise exception 'FAIL: library has % rows (max ord %), expected {N0}', vn, vmx; end if;
  if (select n from pb_ai.kb_versions where version = '{V}' and active) is distinct from {N0} then raise exception 'FAIL: kb_versions.n is not {N0} or {V} is not active'; end if;
  if exists (select 1 from pb_ai.kb_chunks where version = '{V}' and chunk->>'id' in ({L(new_ids)})) then raise exception 'FAIL: some new ids are already in the library (partly applied?)'; end if;
  if exists (select 1 from pb_ai.kb_shelf where id in ({L(shelf_ids)})) then raise exception 'FAIL: some new shelf ids are already there'; end if;
  if {md5_touched} <> '{PRE_TOUCHED}' then raise exception 'FAIL: the rows this load changes are not the live text it was built on'; end if;

  -- 1. rows changed in place (same ord; an edited row keeps its id, a superseded row takes the new id)
{chr(10).join(upd)}

  -- 2. new core cards at the next ords, in file order (ord continuity: {N0}..{N1 - 1})
  insert into pb_ai.kb_chunks (version, ord, lib, chunk)
  select '{V}', {N0 - 1} + t.i, t.e->>'lib', t.e->'chunk'
    from jsonb_array_elements({lib_kb._q('[' + rows_ins + ']')}::jsonb) with ordinality t(e, i);
  get diagnostics vk = row_count; if vk <> {len(ins)} then raise exception 'FAIL: inserted % core rows, expected {len(ins)}', vk; end if;

  -- 3. shelf cards (pb_ai.kb_shelf, keyed by id)
  insert into pb_ai.kb_shelf (id, chunk)
  select e->>'id', e from jsonb_array_elements({J(shelf)}::jsonb) e;
  get diagnostics vk = row_count; if vk <> {len(shelf)} then raise exception 'FAIL: inserted % shelf rows', vk; end if;

  -- 4. row count for the loader, drop the saved index
{counts_tail}

  -- 5. checks: ords 0..n-1 with no gap, ids unique, n right, and exactly the rows that were tested on the local copy
  select count(*), max(ord), count(distinct chunk->>'id') into vn, vmx, vd from pb_ai.kb_chunks where version = '{V}';
  if vn <> {N1} or vmx <> {N1 - 1} then raise exception 'FAIL ord gap or count: % rows, max ord %', vn, vmx; end if;
  if vd <> vn then raise exception 'FAIL duplicate chunk id: % ids for % rows', vd, vn; end if;
  if (select v.n from pb_ai.kb_versions v where v.version = '{V}') <> {N1} then raise exception 'FAIL kb_versions.n'; end if;
  {SK}if {md5_touched} <> '{POST_TOUCHED}' then raise exception 'FAIL: changed rows differ from the tested result'; end if;
  {SK}if {md5_new} <> '{POST_NEW}' then raise exception 'FAIL: new rows differ from the tested result'; end if;
  if (select count(*) from pb_ai.kb_shelf where id in ({L(shelf_ids)})) <> {len(shelf)} then raise exception 'FAIL shelf'; end if;
  raise notice 'ask_merge 11_load: applied: % rows', vn;
end $load$;
commit;
"""

# ------------------------------------------------------------------ 91 rollback (like library_load_nov20/tools/mk_rollback.py: rows back by ord from the live copy, new ords deleted)
back = [[o, live[o]['lib'], live[o]['c']] for o in ords_touched]
arr = json.dumps(back, ensure_ascii=False); assert '$kb$' not in arr
rb = f"""-- 91_rollback.sql (state audit Nov 21, ask_merge): undo 11_load.sql. NOT APPLIED. Generated by tools/mk_sql.py (the mk_rollback.py way).
-- Puts the {len(back)} rows changed in place back to their live content (by ord, from work/live_rows.jsonl, the local copy whose md5 = the server's {PRE_ALL}),
-- deletes the {len(ins)} rows added at ord {N0} and up and the {len(shelf)} shelf cards, fixes the row count, drops the saved index.
-- Guarded: runs only on the state 11 leaves (touched rows and new rows exactly as tested). Run twice: the second run says "already rolled back".
begin;
lock table pb_ai.kb_chunks in share row exclusive mode;
lock table pb_ai.kb_shelf in share row exclusive mode;
do $rb$
declare vk int; vn int; vmx int;
begin
  if (select count(*) from pb_ai.kb_chunks where version = '{V}') = {N0} and {md5_touched} = '{PRE_TOUCHED}'
     and not exists (select 1 from pb_ai.kb_shelf where id in ({L(shelf_ids)})) then
    raise notice 'ask_merge 91_rollback: already rolled back (or never applied), nothing changed'; return;
  end if;
  if (select count(*) from pb_ai.kb_chunks where version = '{V}') <> {N1} or {md5_touched} <> '{POST_TOUCHED}' or {md5_new} <> '{POST_NEW}' then
    raise exception 'FAIL: the library is not in the state 11_load.sql leaves (changed since?): nothing rolled back';
  end if;
  update pb_ai.kb_chunks k set lib = e->>1, chunk = e->2 from jsonb_array_elements({lib_kb._q(arr)}::jsonb) e where k.version = '{V}' and k.ord = (e->>0)::int;
  get diagnostics vk = row_count; if vk <> {len(back)} then raise exception 'FAIL: % rows put back', vk; end if;
  delete from pb_ai.kb_chunks where version = '{V}' and ord >= {N0};
  get diagnostics vk = row_count; if vk <> {len(ins)} then raise exception 'FAIL: % rows deleted', vk; end if;
  delete from pb_ai.kb_shelf where id in ({L(shelf_ids)});
{counts_tail}
  select count(*), max(ord) into vn, vmx from pb_ai.kb_chunks where version = '{V}';
  if vn <> {N0} or vmx <> {N0 - 1} then raise exception 'FAIL: rows % max ord %', vn, vmx; end if;
  if {md5_touched} <> '{PRE_TOUCHED}' then raise exception 'FAIL: rows not back to the live text'; end if;
  if (select v.n from pb_ai.kb_versions v where v.version = '{V}') <> {N0} then raise exception 'FAIL kb_versions.n'; end if;
  raise notice 'ask_merge 91_rollback: done, % rows', vn;
end $rb$;
commit;
"""

# ------------------------------------------------------------------ 12 eval cases, inactive (server eval_set has no lead / complex columns: PROPOSED_eval_style.sql is not applied)
qq = lambda s: "'" + s.replace("'", "''") + "'"
jj = lambda v: qq(json.dumps(v)) + '::jsonb'
vals = []
for c in cases:
    st = c['where'][-2:]; mustnot = list(c.get('mustnot', []))
    if c.get('state_strict'):   # same as library_arch_nov20/tools/cases_sql.py
        named = lib_kb.state_names_in(c['q'])
        others = [n for k2, n in lib_kb.STATES.items() if k2 != st and k2 not in named and not (st == 'WV' and k2 == 'VA') and k2 != 'DC']
        own = lib_kb.STATES[st]
        mustnot.append(r'\m(' + '|'.join(('(?<!West )Virginia' if n == 'Virginia' else n) for n in others if n not in own) + r')\M')
    vals.append(f"({qq(c['id'])}, {qq(c['cat'])}, {qq(c['q'])}, {qq(c['where'])}, {qq(c.get('level', 'pipelayer'))}, {jj(c['must'])}, {jj(mustnot)}, "
                f"{c.get('maxwords', lib_kb.CASE_MAXWORDS[c['kind']])}, false)")
ev = f"""-- 12_eval_cases_inactive.sql (state audit Nov 21, ask_merge): {len(cases)} library eval cases for the new cards, INACTIVE (active = false). NOT APPLIED.
-- Columns as on the server today (no lead / complex: sql/PROPOSED_eval_style.sql in library_arch_nov20 is not applied; the lead / complex regexes stay in cases.jsonl).
-- state_strict cases get the other-state-names mustnot (as tools/cases_sql.py). Safe to run twice (on conflict do nothing). Check first: the select must say 0.
select count(*) as already_there from pb_ai.eval_set where id in ({L([c['id'] for c in cases])});
begin;
insert into pb_ai.eval_set (id, cat, q, "where", level, must, mustnot, maxwords, active) values
{(','+chr(10)).join(vals)}
on conflict (id) do nothing;
commit;
-- undo: delete from pb_ai.eval_set where not active and id in ({L([c['id'] for c in cases])});
"""
os.makedirs(os.path.join(H, 'sql'), exist_ok=True)
for fn, s in (('10_precheck.sql', pre), ('11_load.sql', load), ('91_rollback.sql', rb), ('12_eval_cases_inactive.sql', ev)):
    assert len(s.encode()) < 900_000, fn
    open(os.path.join(H, 'sql', fn), 'w').write(s)
json.dump({'ords_touched': ords_touched, 'old_md5': old_md5, 'pre_touched': PRE_TOUCHED, 'n0': N0, 'n1': N1, 'local_all_md5': loc}, open(os.path.join(H, 'work/sql_meta.json'), 'w'), indent=1)
print(f'local copy md5 {loc} (server {PRE_ALL}: {"same" if loc == PRE_ALL else "DIFFERENT"}); touched {len(ords_touched)} ords {ords_touched}; insert {len(ins)}; shelf {len(shelf)}; cases {len(cases)};',
      'expected md5s ' + ('embedded' if exp else 'PLACEHOLDER (run tools/local_test.sh)'))
for fn in ('10_precheck.sql', '11_load.sql', '91_rollback.sql', '12_eval_cases_inactive.sql'): print(fn, os.path.getsize(os.path.join(H, 'sql', fn)), 'bytes')
