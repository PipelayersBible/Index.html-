# Ask KB source, Nov 20 2026 (ask_followups_nov20). Run: python3 kb_followups.py
# Same layout as ../../ask_nationwide_nov20/sql/kb_nationwide.py. Writes next to this file:
#   kb_followups.jsonl            new field-library chunks (KB rebuild source)
#   01_ask_kb_followups.sql       staged migration (NOT applied): INSERT ONLY, guarded by id, for KB version VERSION
#   01_ask_kb_followups_test.sql  same statements in a DO block, checked, rolled back by raising 'RESULT: ...'
#   02_ask_eval_cases_followups.sql  eval cases fwa1-fwa5 (wa1-wa5 are taken on live by water questions)
# Chunk format (for whoever adds the next state chunks):
#   {"id","url","text","title","topic","source","confidence","state"}
#   id     plan-<st>-<subject>-<n>   (plan-wa-trench-1). The ask_state build reads the state from the id (dig-<st>,
#          plan-<st>-, st-<st>, emp-state-<st>-, brk-<st>) AND from "state"; always set both.
#   state  two letters ("WA"), two states "KS,MO", or "US" for a general chunk whose title happens to name a state.
#   title  starts with the state's name and names ONLY that state; topic names no other state.
#   text   under 2600 characters; the first 300 characters and the source line name no other state (the build that is
#          live today, b4ad91749f6f, still filters on title + source + first 300 characters).
# Sources, all read 2026-11-20 at lawfilesext.leg.wa.gov (the Code Reviser's current text):
#   WAC 296-155-657 (WSR 16-09-085), WAC 296-155-66403 (WSR 16-09-085), WAC 296-155-655 and WSR 26-09-113
#   (Order 21-20, filed 4/21/26, effective 6/1/26). Federal side: 29 CFR 1926.652(a)(1), Subpart P Appendix B Table B-1.
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
VERSION = 'b3e91f6c47d2'   # live pb_ai.kb_versions on 2026-11-20: n = rows = 2840, max ord 2839 (read-only check)
TODAY = '2026-11-20'
W = "https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-"
C = []
def add(id, state, title, topic, text, src, url, conf='high'):
    C.append({"id": id, "url": url, "text": text, "title": title, "topic": topic, "source": src, "confidence": conf, "state": state})

TP = "State OSHA plans: where trench and confined space rules differ from federal OSHA"
add("plan-wa-trench-1", "WA",
 "Washington trench rules (WAC 296-155 Part N): protective system at 4 ft, written trench work plan, competent person on site",
 TP,
 "Washington runs its own OSHA plan (DOSH, at Labor and Industries) and its excavation rule is chapter 296-155 WAC, Part N. "
 "It is stricter than federal OSHA in three ways a crew will feel. "
 "1) Depth: every employee in an excavation must be protected from cave-ins by a protective system (sloping, benching, shoring "
 "or a shield) unless the excavation is entirely in stable rock, or it is less than 4 ft deep and a competent person has "
 "examined the ground and found no indication of a potential cave-in (WAC 296-155-657(1)(a)). Federal OSHA draws that line "
 "at 5 ft. "
 "2) Written plan, since June 1, 2026: the employer must have a competent person complete a written trench excavation work "
 "plan for any trench an employee may enter where a protective system is required; employees are trained on the plan before "
 "they go in, and the plan is kept on the job site. No written plan is needed when the trench is 4 ft or less and no "
 "protective system is required, or when the trench is sloped at 1.5 horizontal to 1 vertical or flatter "
 "(WAC 296-155-655(13)). "
 "3) Competent person on site: a competent person must remain on the job site any time trench excavation work is being "
 "performed (WAC 296-155-655(13)(a)), and inspects the excavation, the area around it and the protective system daily, "
 "before work starts, as needed during the shift and after every rainstorm (WAC 296-155-655(11)). "
 "The rest matches the federal numbers: a ladder, stairway or ramp in trenches 4 ft or more deep with no more than 25 ft of "
 "lateral travel; spoil and equipment at least 2 ft back from the edge; test the air before entering an excavation deeper "
 "than 4 ft where a hazardous atmosphere could exist; digging up to 2 ft below the bottom of a shield only when the shield "
 "is rated for the full depth and no soil is being lost from behind or below it; sloping or benching for an excavation "
 "deeper than 20 ft designed by a registered professional engineer. Plain-language summary; the WAC text, your competent "
 "person and your company program govern.",
 f"WAC 296-155-657(1)(a), (7)(b); WAC 296-155-655(3), (7), (10), (11), (13) as amended by WSR 26-09-113 (effective June 1, 2026); checked {TODAY}",
 W + "657.htm")
add("plan-wa-trench-2", "WA",
 "Washington trench sloping (WAC 296-155-66403, Table N-1): maximum slopes by soil type, no steeper short-term slope in Type A",
 TP,
 "Washington's sloping table is Table N-1 in WAC 296-155-66403 (Part N, Appendix B). Maximum allowable slopes, horizontal to "
 "vertical, for excavations less than 20 ft deep: stable rock vertical (90 degrees); Type A soil 3/4 to 1 (53 degrees); "
 "Type B soil 1 to 1 (45 degrees); Type C soil 1 1/2 to 1 (34 degrees). Sloping or benching for an excavation deeper than "
 "20 ft must be designed by a registered professional engineer. "
 "Where it differs from the federal table: the federal table (29 CFR 1926 Subpart P, Appendix B, Table B-1) has a note "
 "allowing a steeper short-term slope of 1/2 to 1 in Type A soil for excavations 12 ft or less that are open 24 hours or "
 "less. Table N-1 has no such note and the Washington appendix has no short-term allowance, so on a Washington job Type A "
 "is 3/4 to 1 no matter how short a time the trench is open. The Type A, B and C angles themselves are the same as "
 "federal. When the slope shows signs of distress, cut it back at least 1/2 horizontal to 1 vertical flatter than the "
 "maximum allowable slope. In the app's Trench Sloping screen, pick plain Type A (0.75:1) on a Washington job; its "
 "'Type A, short-term' choice (0.5:1) is the federal note and is not in Washington's table. And remember that Washington "
 "requires protection from 4 ft, not 5 ft. "
 "The competent person classifies the soil and picks the slope; this is a plain-language summary and the WAC text governs.",
 f"WAC 296-155-66403 Table N-1 and notes (WSR 16-09-085); 29 CFR 1926 Subpart P Appendix B, Table B-1 note 2; checked {TODAY}",
 W + "66403.htm")

# ---- checks: what the LIVE filter (title + source + first 300 chars) and the ask_state filter (id / state) will see
from importlib.machinery import SourceFileLoader
NAMES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"]
CODE = {'WA': 'Washington'}
ids = [c['id'] for c in C]; assert len(set(ids)) == len(ids)
for c in C:
    own = CODE[c['state']]
    head = f"{c['title']} {c['source']} {c['text'][:300]}"
    other = [n for n in NAMES if n != own and re.search(r'\b' + n + r'\b', head)]
    assert not other, (c['id'], other)
    assert c['title'].startswith(own) and re.match(r'^plan-' + c['state'].lower() + r'-', c['id'])
    assert not [n for n in NAMES if n != own and n in c['title'] + c['topic']]
    assert len(c['text']) < 2600, (c['id'], len(c['text']))
    assert '’' not in c['text'] and '$kb$' not in c['text']
print('new chunks:', [(c['id'], len(c['text'])) for c in C])

def q(s, tag):
    assert ('$' + tag + '$') not in s
    return '$' + tag + '$' + s + '$' + tag + '$'
with open(os.path.join(HERE, 'kb_followups.jsonl'), 'w') as f:
    for c in C: f.write(json.dumps(c, ensure_ascii=False) + '\n')
arr = q(json.dumps(C, ensure_ascii=False), 'kb'); idl = ', '.join("'" + i + "'" for i in ids); n = len(C)
ins = f"""insert into pb_ai.kb_chunks (version, ord, lib, chunk)
select '{VERSION}', m.mx + t.i, 'field', t.e
  from jsonb_array_elements({arr}::jsonb) with ordinality as t(e, i),
       (select max(ord) as mx from pb_ai.kb_chunks where version = '{VERSION}') m
 where exists (select 1 from pb_ai.kb_versions v where v.version = '{VERSION}')
   and not exists (select 1 from pb_ai.kb_chunks k where k.version = '{VERSION}' and k.chunk->>'id' in ({idl}))"""
cnt = f"""update pb_ai.kb_versions v
   set n = c.n, counts = c.counts
  from (select sum(k)::int as n, jsonb_object_agg(lib, k) as counts
          from (select lib, count(*)::int as k from pb_ai.kb_chunks where version = '{VERSION}' group by lib) x) c
 where v.version = '{VERSION}'"""
blob = f"update pb_ai.kb_index set parts = 32 where version = '{VERSION}'"
open(os.path.join(HERE, '01_ask_kb_followups.sql'), 'w').write(f"""-- 01_ask_kb_followups.sql (ask_followups_nov20, {TODAY}): Washington trench rules for Ask. NOT APPLIED. Generated by kb_followups.py.
-- INSERT ONLY: adds {n} field chunks ({', '.join(ids)}) at the next ord numbers of KB version {VERSION}. No existing chunk is changed.
-- Guarded: nothing is inserted if any of the ids is already there, or if {VERSION} is no longer a KB version (then re-generate
-- with the new version). Safe before or after the ask_state build: the chunks carry "state":"WA" for the new filter and name
-- only Washington in title / source / first 300 characters for the filter that is live today.
-- Expect: INSERT 0 {n}, UPDATE 1, UPDATE 1 (or 0 if kb_index has no row), then the check row: new_chunks {n}, n = rows.
-- Run 01_ask_kb_followups_test.sql first (it rolls back). A KB rebuild from source must carry kb_followups.jsonl.

begin;

-- 1. the new chunks
{ins};

-- 2. the version's row count (the Ask loader refuses a build whose rows don't match kb_versions.n)
{cnt};

-- 3. the saved search index is rebuilt by the next Ask worker that starts (same reset as the Nov 18-20 batches)
{blob};

select (select count(*) from pb_ai.kb_chunks where version = '{VERSION}' and chunk->>'id' in ({idl})) as new_chunks,
       (select count(*) from pb_ai.kb_chunks where version = '{VERSION}' and chunk->>'id' in ({idl}) and chunk->>'state' = 'WA') as with_state,
       (select n from pb_ai.kb_versions where version = '{VERSION}') as n,
       (select count(*) from pb_ai.kb_chunks where version = '{VERSION}') as rows;

commit;
-- Warm Ask workers keep their in-memory index; the new chunks reach answers as workers cold-start.
""")
open(os.path.join(HERE, '01_ask_kb_followups_test.sql'), 'w').write(f"""-- 01_ask_kb_followups_test.sql: runs the migration's statements, checks them, runs the insert a second time (must add
-- nothing), and rolls everything back by raising 'RESULT: ...'. Nothing is kept. NOT RUN by the helper (it writes inside a
-- transaction and the server is read-only for helpers). Expect the error text to start with: RESULT: PASS
do $t$
declare n0 int; n1 int; n2 int; r int; mx0 int; vn int; act jsonb;
begin
  select count(*), max(ord) into n0, mx0 from pb_ai.kb_chunks where version = '{VERSION}';
  execute {q(ins, 'st')}; get diagnostics r = row_count;
  if r <> {n} then raise exception 'FAIL insert count % (ids already there, or the KB version changed)', r; end if;
  execute {q(cnt, 'st')};
  execute {q(blob, 'st')};
  select count(*) into n1 from pb_ai.kb_chunks where version = '{VERSION}';
  select n into vn from pb_ai.kb_versions where version = '{VERSION}';
  act := public.pb_ai_kb_active();
  if n1 <> n0 + {n} then raise exception 'FAIL rows % -> %', n0, n1; end if;
  if vn <> n1 or (act->>'n')::int <> n1 then raise exception 'FAIL kb_versions.n % / active % vs rows %', vn, act->>'n', n1; end if;
  if (select count(*) from pb_ai.kb_chunks where version = '{VERSION}' and ord > mx0 and lib = 'field' and chunk->>'state' = 'WA' and chunk->>'id' in ({idl})) <> {n} then raise exception 'FAIL new ids'; end if;
  if (select count(distinct chunk->>'id') from pb_ai.kb_chunks where version = '{VERSION}') <> n1 then raise exception 'FAIL duplicate chunk id'; end if;
  if (select count(distinct ord) from pb_ai.kb_chunks where version = '{VERSION}') <> n1 then raise exception 'FAIL duplicate ord'; end if;
  if coalesce(jsonb_typeof(public.pb_ai_kb_boot()->'index'), 'null') = 'object' then raise exception 'FAIL the old index blob would still be used'; end if;
  execute {q(ins, 'st')}; get diagnostics r = row_count;
  select count(*) into n2 from pb_ai.kb_chunks where version = '{VERSION}';
  if r <> 0 or n2 <> n1 then raise exception 'FAIL second run added % rows', r; end if;
  raise exception 'RESULT: PASS rows % -> %, n %, rerun added 0 (rolled back)', n0, n1, vn;
end $t$;
""")
EV = [
 ('fwa1', 'trench', 'At what depth do I need shoring or a trench box?', 'Seattle, WA', 'pipelayer', ["4 ?(ft|feet|foot)", "296-155|Washington"], ["is safe"], 190),
 ('fwa2', 'trench', 'Do I need a written plan before my guys get in a 6 foot trench?', 'Spokane, WA', 'foreman', ["written", "work plan|trench plan", "competent person"], ["no written plan is (needed|required) (for|in) (a|this) 6"], 200),
 ('fwa3', 'trench', 'Type A soil and the trench is only open a few hours. Can I slope it at half to one?', 'Tacoma, WA', 'foreman', ["3/4|0\\.75|three.quarter", "Washington|296-155|Table N-1"], ["yes,? (you can|1/2)", "is safe"], 200),
 ('fwa4', 'trench', 'Can the competent person leave the site while the crew is laying pipe in the trench?', 'Seattle, WA', 'foreman', ["on (the )?(job ?)?site|remain|stay", "competent person"], ["is safe"], 190),
 # control: the same sloping question on a Texas job gets the federal answer, not Washington's
 ('fwa5', 'trench', 'Type A soil and the trench is only open a few hours. Can I slope it at half to one?', 'Houston, TX', 'foreman', ["1/2|half", "12 ?(ft|feet|foot)", "24 hours|short.term"], ["Washington", "Table N-1", "is safe"], 200),
]
def row(e):
    return "(" + ", ".join(["'" + e[0] + "'", "'" + e[1] + "'", "'" + e[2].replace("'", "''") + "'", "'" + e[3] + "'", "'" + e[4] + "'",
        q(json.dumps(e[5]), 'j') + '::jsonb', q(json.dumps(e[6]), 'j') + '::jsonb', str(e[7]), 'true']) + ")"
open(os.path.join(HERE, '02_ask_eval_cases_followups.sql'), 'w').write(f"""-- 02_ask_eval_cases_followups.sql (ask_followups_nov20, {TODAY}): {len(EV)} Ask eval questions for the Washington trench chunks. NOT APPLIED.
-- Same columns as 03_ask_eval_cases_nationwide.sql; skipped if the ids exist. Load after 01_ask_kb_followups.sql. Expect: INSERT 0 {len(EV)} (fewer = an id is already taken; checked free on live {TODAY}).
insert into pb_ai.eval_set (id, cat, q, "where", level, must, mustnot, maxwords, active) values
 """ + ",\n ".join(row(e) for e in EV) + "\non conflict (id) do nothing;\n")
# the same cases for the local retrieval checks
ST = lambda w: w.split(', ')[1]
json.dump([{"id": e[0], "st": ST(e[3]), "level": e[4], "q": e[2], "must": e[5]} for e in EV], open(os.path.join(HERE, '../tools/cases_wa.json'), 'w'), indent=1)
json.dump([
 {"id": "f1", "st": "WA", "q": "At what depth do I need shoring or a trench box?", "want": ["^plan-wa-trench-1$"]},
 {"id": "f2", "st": "WA", "q": "Do I need a written plan before my guys get in a 6 foot trench?", "want": ["^plan-wa-trench-1$"]},
 {"id": "f3", "st": "WA", "q": "Type A soil and the trench is only open a few hours. Can I slope it at half to one?", "want": ["^plan-wa-trench-2$"]},
 {"id": "f4", "st": "WA", "q": "Can the competent person leave the site while the crew is laying pipe in the trench?", "want": ["^plan-wa-trench-1$"]},
 {"id": "f5", "st": "WA", "q": "What are the Washington trench rules?", "want": ["^plan-wa-trench-1$"]},
 {"id": "f6", "st": "TX", "q": "Type A soil and the trench is only open a few hours. Can I slope it at half to one?", "avoid": ["^plan-wa-"]},
 {"id": "f7", "st": "TX", "q": "At what depth do I need shoring or a trench box?", "avoid": ["^plan-wa-"]},
 {"id": "f8", "st": "OR", "q": "What are the Washington trench rules?", "want": ["^plan-wa-trench-1$"]}
], open(os.path.join(HERE, '../tools/cases_retrieval_wa.json'), 'w'), indent=1)
print('wrote kb_followups.jsonl, 01_ask_kb_followups.sql, 01_ask_kb_followups_test.sql, 02_ask_eval_cases_followups.sql, tools/cases_*.json')
