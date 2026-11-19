# Ask KB source, Nov 19 2026 (askgrade; decisions #63 and #65). Run: python3 kb_lockout_trench20.py
# Writes, next to this file:
#   kb_lockout_trench20.jsonl          the new field-library chunks (KB rebuild source, like kb_add/*.jsonl)
#   01_ask_kb_lockout_trench20.sql     the staged migration (NOT applied)
#   01_ask_kb_lockout_trench20_test.sql  a DO block doing the same, checking it, and rolling back (raise 'RESULT: ...')
# Same layout as /home/claude/kb_add/*.py; a copy lives at /home/claude/kb_add/lockout_trench20.py. A rebuild from
# source must also carry UPD (an edit to app-library chunk 224, which has no local source file).
# Every citation below was checked on Nov 19 2026 against osha.gov (1926.1202, 1926.1203, 1926.1204, 1910.146,
# 1910.147, 1926.417) and dir.ca.gov (8 CCR 1953, 5157, 3314); Appendix E against the KB's own eCFR copy (ord 2536).
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
VERSION = 'b3e91f6c47d2'
T = "Lockout and isolation before entering a confined space or a live sewer or water structure"
C = []
def add(i, title, text, src, url):
    C.append({"id": f"lockout-before-entry-{i}", "url": url, "text": text, "title": title, "topic": T, "source": src, "confidence": "high"})
add(1, "Lockout before entry: isolate pumps, lines and power before anyone goes into a wet well, vault, manhole or live structure",
 "Before anyone enters a confined space or a live sewer or water structure (lift station wet well, valve or meter vault, "
 "manhole on a live line, tank, large pipe), stop and isolate everything that could start, flow, fill, pressurize or move "
 "while people are inside. In plain steps: 1) List every source: pumps and their floats or automatic start, force mains "
 "and check valves, gravity flow from upstream, bypass pumps, water or air lines, mixers and gates, electrical feeds, and "
 "water or pressure held behind a valve or plug. 2) Shut each one down the normal way. 3) Isolate it so it cannot come "
 "back on: open the disconnect and lock it (a control switch or float is not isolation); close valves and lock or tag "
 "them; for a line that could flood or gas the space, blank it, remove a section, or use double block and bleed (two "
 "closed valves locked or tagged, with the drain or vent between them open). 4) Release stored energy: bleed pressure, "
 "drain, block anything that can drop or turn. 5) Verify before entry: try to start the pump from its controls and "
 "confirm no pressure or flow. A lock physically stops a restart; a tag is only a warning. Good practice is a personal "
 "lock for each person going in, removed only by that person when they are out. A live sewer usually cannot be fully "
 "shut off upstream, so plugs, bypass, continuous air monitoring and a flow and weather watch are part of the plan. The "
 "entry permit lists the isolation used and the entry supervisor checks it before signing. Many owners and utilities "
 "operate their own valves and pumps: get their lockout done and confirmed. Plain-language guidance: your company "
 "program, the owner's procedure and the regulation govern.",
 "29 CFR 1926.1202 (isolation, blanking, double block and bleed); 1926.1204(c)(3) and (e)(1); 1910.146(d)(3)(iii) and (f)(8); 1910.147(d); 1910.146 Appendix E",
 "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1204")
add(2, "Lockout before entry: which rules apply (OSHA 1926.1204(c)(3), 1910.146(d)(3)(iii), 1910.147, 1926.417; Cal/OSHA 1953, 5157, 3314)",
 "Construction crews entering a permit space work under 29 CFR 1926 Subpart AA. The permit space program must include "
 "\"isolating the permit space and physical hazard(s) within the space\" (1926.1204(c)(3)). Isolation means entrants are "
 "completely protected against the release of energy and material into the space and contact with a physical hazard, "
 "by blanking or blinding, misaligning or removing sections of lines, pipes or ducts, a double block and bleed system, "
 "lockout or tagout of all sources of energy, blocking or disconnecting mechanical linkages, or barriers (1926.1202). "
 "Forced-air ventilation does not count as eliminating or isolating a hazard (1926.1203(g)), and alternate (ventilation-"
 "only) entry needs all physical hazards eliminated or isolated first (1926.1203(e)(1)). A plant's or utility's own staff "
 "(general industry) follow 1910.146: \"isolating the permit space\" (1910.146(d)(3)(iii)), with the isolation measures "
 "written on the permit (1910.146(f)(8)). OSHA's lockout/tagout standard 1910.147 (shutdown, isolation, lock or tag, "
 "stored energy, verify isolation) covers servicing and maintenance in general industry, not construction "
 "(1910.147(a)(1)(ii)(A)); on a construction job the electrical rule is 1926.417: deenergized equipment or circuits are "
 "rendered inoperative and tagged at every point where they can be energized. A sewer is different: OSHA says there is "
 "rarely any way to completely isolate a section of a continuous system (1910.146 Appendix E), so when isolation is "
 "infeasible the employer monitors continuously where entrants work and provides an early warning for engulfment "
 "(1926.1204(e)(1)). California: construction entries follow Title 8 section 1953(a)(3)(C) (isolating the permit space "
 "and physical hazards); general industry 5157(d)(3)(B) and (f)(8); and Cal/OSHA's lockout rule 3314: machinery stopped "
 "and its power source de-energized or disengaged (3314(c)) under a written hazardous energy control procedure (3314(g)). "
 "Plain-language summary, not the regulation; the regulation text and your company program govern.",
 "29 CFR 1926.1202; 1926.1203(e)(1), (g); 1926.1204(c)(3), (e)(1); 1910.146(d)(3)(iii), (f)(8), Appendix E; 1910.147(a)(1)(ii)(A), (d); 1926.417; 8 CCR 1953(a)(3)(C), 5157(d)(3)(B), (f)(8), 3314(c), (g)",
 "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1204")
# #63: app-library chunk 224 describes the Trench Sloping calculator; it gives no slope at 20 ft from this release on
UPD = [{"ord": 224, "id": "app-data-calculator-formulas-9",
  "old": "At exactly 20 ft it still gives the slope with a warning; over 20 ft no slope is given:",
  "new": "At 20 ft or deeper (exactly 20 ft included) no slope is given and the result says \"Engineer Required\": Table B-1 covers excavations \"less than 20 feet deep\", and note 3 says:"}]

def q(s, tag):
    assert ('$' + tag + '$') not in s
    return '$' + tag + '$' + s + '$' + tag + '$'

with open(os.path.join(HERE, 'kb_lockout_trench20.jsonl'), 'w') as f:
    for c in C: f.write(json.dumps(c, ensure_ascii=False) + '\n')
arr = q(json.dumps(C, ensure_ascii=False), 'kb')
ids = ', '.join("'" + c['id'] + "'" for c in C)
body = []
body.append(f"""-- 1. #65: the new field-library chunks, at the next ord numbers (skipped if their ids are already there)
insert into pb_ai.kb_chunks (version, ord, lib, chunk)
select '{VERSION}', m.mx + t.i, 'field', t.e
  from jsonb_array_elements({arr}::jsonb) with ordinality as t(e, i),
       (select max(ord) as mx from pb_ai.kb_chunks where version = '{VERSION}') m
 where not exists (select 1 from pb_ai.kb_chunks k where k.version = '{VERSION}' and k.chunk->>'id' in ({ids}));""")
for u in UPD:
    body.append(f"""-- 2. #63: chunk {u['ord']} ({u['id']}): the Trench Sloping calculator gives no slope at exactly 20 ft any more
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{{text}}', to_jsonb(replace(chunk->>'text', {q(u['old'], 'old')}, {q(u['new'], 'new')})))
 where version = '{VERSION}' and ord = {u['ord']} and chunk->>'id' = '{u['id']}'
   and strpos(chunk->>'text', {q(u['old'], 'old')}) > 0;""")
body.append(f"""-- 3. the version's row count: the Ask loader pages to kb_versions.n and refuses a build whose rows don't match it
--    ("got N of n rows"), and kb_activate checks the same. A changed n also retires the saved index blob
--    (pb_ai_kb_boot only returns a blob with kb_index.n = kb_versions.n).
update pb_ai.kb_versions v
   set n = c.n, counts = c.counts
  from (select sum(k)::int as n, jsonb_object_agg(lib, k) as counts
          from (select lib, count(*)::int as k from pb_ai.kb_chunks where version = '{VERSION}' group by lib) x) c
 where v.version = '{VERSION}';""")
body.append(f"""-- 4. invalidate the cached search-index blob the way fixes.sql (ask_kb_safety_fixes_nov18) did
update pb_ai.kb_index set parts = 32 where version = '{VERSION}';""")
mig = ["-- 01_ask_kb_lockout_trench20.sql (askgrade, Nov 19 2026): Ask KB additions for decisions #65 (lockout before entry)",
       "-- and #63 (Trench Sloping calculator at exactly 20 ft). NOT APPLIED. Generated by kb_lockout_trench20.py.",
       "-- Apply together with (or after) the app patch 04_trench_20ft_engineer.py, so chunk 224 never describes a build that",
       "-- still gives a slope at 20 ft. Run in one transaction; expect: insert 2, update 1, update 1, update 1.", "", "begin;", ""]
mig += [b + "\n" for b in body]
mig += [f"""-- check: 2 new chunks, chunk 224 edited, n = rows, blob not used
select (select count(*) from pb_ai.kb_chunks where version = '{VERSION}' and chunk->>'id' in ({ids})) as new_chunks,
       (select n from pb_ai.kb_versions where version = '{VERSION}') as n,
       (select count(*) from pb_ai.kb_chunks where version = '{VERSION}') as rows,
       (select strpos(chunk->>'text', 'exactly 20 ft included') > 0 from pb_ai.kb_chunks where version = '{VERSION}' and ord = 224) as chunk224_edited,
       (select coalesce(jsonb_typeof(public.pb_ai_kb_boot()->'index'), 'null') <> 'object') as blob_not_used;
""", "commit;", "-- Warm Ask workers keep their in-memory index; the edits reach answers as workers cold-start (as with Nov 18)."]
open(os.path.join(HERE, '01_ask_kb_lockout_trench20.sql'), 'w').write('\n'.join(mig) + '\n')

# rolled-back test: the same statements inside a DO block, checked, then undone by raising
plain = '\n'.join(b for b in body)
stmts = [s.strip() for s in plain.split(';\n') if s.strip()]
dyn = '\n'.join('  execute ' + q('\n'.join(l for l in s.split('\n') if not l.startswith('--')).rstrip(';'), 'st') + ';' for s in stmts)
test = f"""-- 01_ask_kb_lockout_trench20_test.sql: runs the migration's statements, checks them, and rolls everything back by
-- raising 'RESULT: ...' at the end (safe to run live: nothing is kept). Generated by kb_lockout_trench20.py.
do $t$
declare n0 int; n1 int; r int; mx0 int; o1 int; o2 int; pg jsonb; t224 text; vn int; cnt jsonb; blob boolean; act jsonb; res text;
begin
  select count(*), max(ord) into n0, mx0 from pb_ai.kb_chunks where version = '{VERSION}';
{dyn}
  select count(*) into n1 from pb_ai.kb_chunks where version = '{VERSION}';
  select min(ord), max(ord) into o1, o2 from pb_ai.kb_chunks where version = '{VERSION}' and chunk->>'id' in ({ids});
  select chunk->>'text' into t224 from pb_ai.kb_chunks where version = '{VERSION}' and ord = 224;
  select n, counts into vn, cnt from pb_ai.kb_versions where version = '{VERSION}';
  blob := coalesce(jsonb_typeof(public.pb_ai_kb_boot()->'index'), 'null') = 'object'; -- index is JSON null when the blob is not used
  act := public.pb_ai_kb_active();
  pg := public.pb_ai_kb_page('{VERSION}', o1, 500);
  if n1 <> n0 + 2 then raise exception 'FAIL rows % -> %', n0, n1; end if;
  if o1 <> mx0 + 1 or o2 <> mx0 + 2 then raise exception 'FAIL ords % %, want % %', o1, o2, mx0 + 1, mx0 + 2; end if;
  if vn <> n1 or (act->>'n')::int <> n1 then raise exception 'FAIL kb_versions.n % / active % vs rows %', vn, act->>'n', n1; end if;
  if (cnt->>'field')::int <> (select count(*) from pb_ai.kb_chunks where version = '{VERSION}' and lib = 'field') then raise exception 'FAIL counts %', cnt; end if;
  if blob then raise exception 'FAIL the old index blob would still be used'; end if;
  if jsonb_array_length(pg) <> 2 or pg->0->>'lib' <> 'field' or pg->0->'chunk'->>'id' <> 'lockout-before-entry-1' or pg->1->'chunk'->>'id' <> 'lockout-before-entry-2' then raise exception 'FAIL page %', left(pg::text, 200); end if;
  if strpos(t224, 'exactly 20 ft included') = 0 or strpos(t224, 'still gives the slope') > 0 then raise exception 'FAIL chunk 224: %', t224; end if;
  if strpos(pg->1->'chunk'->>'text', '1926.1204(c)(3)') = 0 or strpos(pg->1->'chunk'->>'text', '5157(d)(3)(B)') = 0 then raise exception 'FAIL citations'; end if;
  -- running it twice adds nothing (the insert is guarded by id, the update by its old phrase)
{dyn}
  select count(*) into r from pb_ai.kb_chunks where version = '{VERSION}';
  if r <> n1 then raise exception 'FAIL second run changed rows % -> %', n1, r; end if;
  res := format('PASS rows %s -> %s, new ords %s-%s, n %s, counts %s, blob used %s, chunk 224 edited, page from %s: %s + %s, rerun no-op',
                n0, n1, o1, o2, vn, cnt, blob, o1, pg->0->'chunk'->>'id', pg->1->'chunk'->>'id');
  raise exception 'RESULT: %', res;
end $t$;
"""
open(os.path.join(HERE, '01_ask_kb_lockout_trench20_test.sql'), 'w').write(test)
print(len(C), 'chunks;', sum(len(c['text']) for c in C), 'chars')
