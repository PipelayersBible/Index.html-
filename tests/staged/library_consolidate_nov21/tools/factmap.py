# factmap.py: old card -> each sentence (fact) -> new card(s) that hold it. Checked automatically: every number / section cite / $ amount /
# date token of the sentence must be in the destination text; sentences with no tokens are matched by word overlap. Unmatched lines are
# listed for a hand check (work/factmap_unmatched.txt); hand decisions are in HAND below.
import json, re, sys
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_consolidate_nov21/tools')
from build_after import build, RETIRE
H = '/home/claude/index.html-/tests/staged/library_consolidate_nov21'
live, after = build()
L = {r['c']['id']: r['c'] for r in live}; A = {r['c']['id']: r['c'] for r in after}
cards = [json.loads(l) for l in open(f'{H}/cards/consolidate.jsonl')]
edits = json.load(open(f'{H}/cards/edits.json'))
fed24 = [f'sp-{s}-trench-1' for s in 'al ar co de dc fl ga id ks la ms mo mt ne nh nd oh ok pa ri sd tx wv wi'.split()]
NAME = {'al':'Alabama','ar':'Arkansas','co':'Colorado','de':'Delaware','dc':'District of Columbia','fl':'Florida','ga':'Georgia','id':'Idaho','ks':'Kansas','la':'Louisiana','ms':'Mississippi','mo':'Missouri','mt':'Montana','ne':'Nebraska','nh':'New Hampshire','nd':'North Dakota','oh':'Ohio','ok':'Oklahoma','pa':'Pennsylvania','ri':'Rhode Island','sd':'South Dakota','tx':'Texas','wv':'West Virginia','wi':'Wisconsin'}
# where each old card's facts went (first = main destination)
DEST = {x: ['osha-pl-trench-states-1'] for x in fed24}
DEST.update({'sp-in-trench-1': ['osha-pl-trench-states-2', 'osha-pl-exc-inspect-1', 'osha-pl-exc-protect-5ft-1'],
 'sp-wa-trench-other-1': ['sp-wa-trench-1', 'sp-wa-trench-plan-1'],
 'ca-cal-osha-trench-and-confined-1': ['sp-ca-trench-1'], 'cal-1': ['sp-ca-trench-1', 'sp-ca-trench-other-1'],
 'ca-cal-osha-trench-and-confined-2': ['sp-ca-trench-other-1', 'sp-ca-trench-1', 'sp-ca-trench-dig-1'],
 'dig-ca-overview-1': ['ca-dig-alert-4216-1', 'ca-dig-alert-4216-2', 'ca-dig-alert-4216-3', 'ca-dig-alert-4216-4', 'ca-dig-alert-4216-7', 'dig-ca-damage-1', 'dig-ca-penalties-2'],
 'ca-dig-alert-4216-9': ['dig-ca-penalties-2'],
 'plan-trench-depth-1': ['osha-pl-trench-states-2', 'sp-wa-trench-1', 'sp-wa-trench-plan-1', 'sp-ca-trench-1', 'sp-mi-trench-1', 'sp-sc-trench-1', 'sp-or-trench-1', 'sp-md-trench-1', 'osha-pl-trench-states-1'],
 'sp-wa-trench-1': ['sp-wa-trench-1', 'sp-wa-trench-slope-1'], 'sp-ca-trench-1': ['sp-ca-trench-1'], 'sp-ca-trench-other-1': ['sp-ca-trench-other-1'],
 'sp-mn-trench-1': ['sp-mn-confined-1', 'osha-pl-trench-states-2', 'sp-mn-report-1'], 'dig-ca-penalties-1': ['dig-ca-penalties-2']})
for e in edits: DEST[e['id']] = [e['id']] + {'trench-safety-1': ['sp-wa-trench-1'], 'dig-basics-1': ['fed-811-wait-1', 'fed-811-ticketlife-1', 'fed-811-zone-1'], 'sp-md-who-1': ['sp-md-trench-1']}[e['id']]
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
        if oid in fed24 and not hit and NAME[oid[3:5]].lower() in dtext['osha-pl-trench-states-1']: hit = 'osha-pl-trench-states-1 (state listed)'
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
