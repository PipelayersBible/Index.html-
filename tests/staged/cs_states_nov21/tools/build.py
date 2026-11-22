# build.py (cs_states_nov21): live rows (work/live_rows_3240.jsonl = live b3e91f6c47d2 after the cs consolidation, 3,240 rows,
# md5 131904c2de6b687c14ff4d68ccaea531) + 3 in-place card edits -> work/after_rows.jsonl, cards/cs_states.jsonl (the 3 new chunk texts).
# No rows added, deleted or renumbered. Sources: NOTES.md "Sources" (all read 2026-11-21).
import json, os, sys
H = '/home/claude/index.html-/tests/staged/cs_states_nov21'
CHECKED = '2026-11-21'

T2 = ("Twenty-one states run their own OSHA plan for private construction crews. A plan must be at least as effective as federal OSHA's "
      "confined space in construction rule (29 CFR 1926 Subpart AA) and may be stricter, so name the plan as the source. Use only the line for "
      "the job's state. As checked by 2026-11-21. "
      "Uses the federal rule, no state change found: Alaska (8 AAC 61.1010(c)), Indiana (from Feb 4, 2016), Iowa (875 IAC 26.1), "
      "Kentucky (803 KAR 2:445), Maryland (by reference from Jan 2, 2017), Michigan (Part 35, except as amended), Minnesota, New Mexico, "
      "South Carolina (from Aug 28, 2015), Tennessee, Utah, Vermont (Vt. rule 24-050-003), Virginia, Wyoming (WY OSHA chapter 27). "
      "Vermont also keeps its own air contaminant table for general industry (CO 35 ppm over 8 hours); whether it reaches construction is "
      "not confirmed: ask VOSHA. "
      "Not on the plan's unique list, so taken as federal: Arizona, Nevada, North Carolina, Hawaii (not confirmed). "
      "Own rule, each has its own card: California (8 CCR 1950 to 1962, amended January 1, 2026, stricter CO limit), Washington "
      "(chapter 296-809, all industries), Oregon (437-002-0146; supervisor signs, not initials).")

def edit_states2(c):
    c = dict(c)
    c['text'] = T2
    c['source'] = ("osha.gov/stateplans; OSHA State Plan adoption table for the 2015-05-04 Subpart AA rule; each plan's adopting rule as cited in the text; "
                   "each state card")
    c['edition'] = 'State plan rules as read 2026-11-19 to 2026-11-21 (IN, IA, KY, SC, VT, WY, MD read 2026-11-21)'
    c['checked'] = CHECKED
    c['note'] = ("Built from the sp-<st>-who-1 / sp-<st>-confined-* cards; IN, IA, KY, SC, VT, WY and MD from official sources read 2026-11-21 "
                 "(tests/staged/cs_states_nov21/NOTES.md). Hawaii still not confirmed.")
    return c

MD_WHO_OLD = ("the adoption page names no Maryland change, but the supplement's own text was not read (2026-11-21), so what it adds is not confirmed: ask MOSH.")
MD_WHO_NEW = ("MOSH's list entry for that supplement links to the federal Subpart AA text itself and the adoption page names no Maryland change, "
              "so the federal rule applies as written (read 2026-11-21).")
MD_TR_OLD = "adopted by reference effective January 2, 2017 (MOSH adoption page, read 2026-11-21)."
MD_TR_NEW = "adopted by reference effective January 2, 2017, with no Maryland change found (MOSH adoption page and supplement list, read 2026-11-21)."

def edit_md_who(c):
    c = dict(c); assert c['text'].count(MD_WHO_OLD) == 1
    c['text'] = c['text'].replace(MD_WHO_OLD, MD_WHO_NEW)
    c.pop('unconfirmed', None)
    c['checked'] = CHECKED; c['edition'] = 'MOSH pages, read 2026-11-20 and 2026-11-21'
    return c

def edit_md_trench(c):
    c = dict(c); assert c['text'].count(MD_TR_OLD) == 1
    c['text'] = c['text'].replace(MD_TR_OLD, MD_TR_NEW)
    c['checked'] = CHECKED; c['edition'] = 'MOSH web pages, read 2026-11-20 and 2026-11-21'
    return c

EDITS = {'osha-pl-cs-states-2': edit_states2, 'sp-md-who-1': edit_md_who, 'sp-md-trench-1': edit_md_trench}

def build():
    live = [json.loads(l) for l in open(f'{H}/work/live_rows_3240.jsonl')]
    assert len(live) == 3240 and [r['o'] for r in live] == list(range(3240))
    out, seen = [], set()
    for r in live:
        f = EDITS.get(r['c']['id'])
        if f: r = {'o': r['o'], 'lib': r['lib'], 'c': f(r['c'])}; seen.add(r['c']['id'])
        out.append(r)
    assert seen == set(EDITS), seen
    return live, out

if __name__ == '__main__':
    live, out = build()
    with open(f'{H}/work/after_rows.jsonl', 'w') as f:
        for r in out: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    with open(f'{H}/cards/cs_states.jsonl', 'w') as f:
        for r in out:
            if r['c']['id'] in EDITS: f.write(json.dumps(r['c'], ensure_ascii=False) + '\n')
    with open(f'{H}/work/check_batch.jsonl', 'w') as f:   # lib_kb check copy: supersedes = own id (replaced in place), not loaded
        for r in out:
            if r['c']['id'] in EDITS: f.write(json.dumps({**r['c'], 'supersedes': r['c']['id']}, ensure_ascii=False) + '\n')
    for rows, dst in ((live, 'kb_before.json'), (out, 'kb_after.json')):
        kb = {'app': [], 'field': [], 'osha': []}
        for r in rows: kb[r['lib']].append(r['c'])
        json.dump(kb, open(f'{H}/work/{dst}', 'w'))
    ch = lambda rows: sum(len(r['c']['text']) for r in rows)
    print(f"before {len(live)} rows {ch(live)} chars; after {len(out)} rows {ch(out)} chars; edited {sorted(EDITS)}")
