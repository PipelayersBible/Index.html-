# build_after.py (library_consolidate_cs_nov21): live rows (work/live_rows_3243.json = live b3e91f6c47d2, 3,243 rows, md5 a9af05ee...)
# + cards/consolidate_cs.jsonl + cards/edits.json + RETIRE -> work/after_rows.jsonl. Survivors keep their order, renumbered 0..n-1; new rows appended.
import json, sys
H = '/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21'
RETIRE = [f'confined-space-field-numbers-{i}' for i in range(1, 7)] + ['confined-space-silica-1', 'confined-space-silica-2', 'ca-cal-osha-trench-and-confined-4']
def lib_of(c): return 'osha' if c['id'].startswith('osha-19') and c.get('kind') == 'verbatim' else 'field'
def build():
    live = json.load(open(f'{H}/work/live_rows_3243.json'))
    cards = [json.loads(l) for l in open(f'{H}/cards/consolidate_cs.jsonl')]
    edits = json.load(open(f'{H}/cards/edits.json'))
    byid = {r['c']['id']: r for r in live}
    assert all(x in byid for x in RETIRE), [x for x in RETIRE if x not in byid]
    rep = {c['supersedes']: c for c in cards if c.get('supersedes')}
    assert all(x in byid for x in rep), [x for x in rep if x not in byid]
    new = [c for c in cards if not c.get('supersedes')]
    assert not any(c['id'] in byid for c in new)
    out = []
    for r in sorted(live, key=lambda r: r['o']):
        r = dict(r); cid = r['c']['id']
        if cid in RETIRE: continue
        if cid in rep: r = {'o': r['o'], 'lib': lib_of(rep[cid]), 'c': rep[cid]}
        for e in edits:
            if e['id'] == cid:
                c = dict(r['c']); assert c['text'].count(e['old']) == 1, cid; c['text'] = c['text'].replace(e['old'], e['new']); r = {'o': r['o'], 'lib': r['lib'], 'c': c}
        out.append(r)
    for c in new: out.append({'o': None, 'lib': lib_of(c), 'c': c})
    for i, r in enumerate(out): r['o_old'] = r['o']; r['o'] = i
    return live, out
if __name__ == '__main__':
    live, out = build()
    with open(f'{H}/work/after_rows.jsonl', 'w') as f:
        for r in out: f.write(json.dumps({'o': r['o'], 'lib': r['lib'], 'c': r['c']}) + '\n')
    ch = lambda rows: sum(len(r['c']['text']) for r in rows)
    print(f"before {len(live)} rows {ch(live)} chars; after {len(out)} rows {ch(out)} chars")
