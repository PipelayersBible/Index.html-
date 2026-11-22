# factmap.py: old card -> each sentence (fact) -> new card(s) that hold it. Checked automatically: every number / section cite / $ amount /
# date token of the sentence must be in the destination text; sentences with no tokens are matched by word overlap. Unmatched lines are
# listed for a hand check (work/factmap_unmatched.txt); hand decisions are in HAND below.
import json, re, sys
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21/tools')
from build_after import build, RETIRE
H = '/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21'
live, after = build()
L = {r['c']['id']: r['c'] for r in live}; A = {r['c']['id']: r['c'] for r in after}
cards = [json.loads(l) for l in open(f'{H}/cards/consolidate_cs.jsonl')]
edits = json.load(open(f'{H}/cards/edits.json'))
NAT = ['osha-pl-cs-scope-1','osha-pl-cs-air-1','osha-pl-cs-monitor-1','osha-pl-cs-permit-1','osha-pl-cs-permit-keep-1','osha-pl-cs-retrieval-1','osha-pl-cs-rescue-1','osha-pl-cs-altproc-1','osha-pl-cs-reclass-1','osha-pl-cs-roles-1','osha-pl-cs-program-1','osha-pl-cs-first-steps-1','osha-pl-cs-defs-1','app-howto-confined-space-2','app-howto-confined-space-3','app-data-other-reference-values-1']
CA = ['sp-ca-confined-1','sp-ca-confined-2026-1','sp-ca-confined-air-1','ca-cal-osha-trench-and-confined-6']
DEST = {f'confined-space-field-numbers-{i}': NAT + CA for i in range(1, 7)}
DEST.update({'confined-space-silica-1': NAT, 'confined-space-silica-2': NAT, 'ca-cal-osha-trench-and-confined-4': CA + NAT,
 'ca-cal-osha-trench-and-confined-3': ['sp-ca-confined-air-1'],
 'osha-pl-cs-scope-1': ['osha-pl-cs-scope-1'], 'osha-pl-cs-monitor-1': ['osha-pl-cs-monitor-1', 'osha-pl-cs-air-1'], 'osha-pl-cs-permit-1': ['osha-pl-cs-permit-1', 'osha-pl-cs-permit-keep-1'],
 'osha-pl-cs-rescue-1': ['osha-pl-cs-rescue-1', 'osha-pl-cs-retrieval-1'], 'osha-pl-cs-altproc-1': ['osha-pl-cs-altproc-1', 'osha-pl-cs-reclass-1'],
 'sp-ca-confined-1': CA, 'sp-ca-confined-2026-1': CA, 'sp-wa-confined-1': ['sp-wa-confined-1'], 'sp-mi-confined-2': ['sp-mi-confined-2']})
for e in edits: DEST[e['id']] = [e['id'], 'osha-pl-cs-states-2']
TOK = re.compile(r'\$\s?[\d,]+|\b\d+(?:\.\d+)*(?:\([0-9a-zA-Z]+\))*|\b(?:19|20)\d\d\b')
norm = lambda t: re.sub(r'\s+', ' ', t.replace('$ ', '$')).lower()
def sents(t): return [s.strip() for s in re.split(r'(?<=[.;:])\s+(?=[A-Z("])', t) if s.strip()]
words = lambda s: set(w for w in re.findall(r'[a-z]{4,}', s.lower()))
rows, unmatched = [], []
for oid, dests in DEST.items():
    old = L[oid]; status = 'retired' if oid in RETIRE else ('replaced in place by ' + next((c['id'] for c in cards if c.get('supersedes') == oid), oid)) if any(c.get('supersedes') == oid for c in cards) else 'edited in place'
    dtext = {d: norm(A[d]['title'] + ' ' + A[d]['text'] + ' ' + A[d].get('source', '')) for d in dests}
    for s in sents(old['text']):
        toks = [norm(t).replace(',', '') for t in TOK.findall(s)]
        hit = None
        for d, t in dtext.items():
            tt = t.replace(',', '')
            if toks and all(x in tt for x in toks): hit = d; break
        if not hit and not toks:
            best = max(dests, key=lambda d: len(words(s) & words(dtext[d])) / max(1, len(words(s))))
            if len(words(s) & words(dtext[best])) / max(1, len(words(s))) >= 0.6: hit = best
        rows.append((oid, status, s, hit or 'CHECK BY HAND'))
        if not hit: unmatched.append((oid, s, toks))
    # the source cites must survive too
    for t in set(TOK.findall(old.get('source', '') or '')):
        tt = norm(t).replace(',', '')
        if not any(tt in v.replace(',', '') for v in dtext.values()): unmatched.append((oid, 'SOURCE CITE ' + t, [t]))
with open(f'{H}/work/factmap.tsv', 'w') as f:
    f.write('old_id\tstatus\tfact (sentence of the old card)\tnow in\n')
    for r in rows: f.write('\t'.join(x.replace('\t', ' ') for x in r) + '\n')
with open(f'{H}/work/factmap_unmatched.txt', 'w') as f:
    for oid, s, t in unmatched: f.write(f'{oid}\t{t}\t{s}\n')
print(len(rows), 'facts;', sum(r[3] != 'CHECK BY HAND' for r in rows), 'matched automatically;', len(unmatched), 'to check by hand (incl. source cites)')
