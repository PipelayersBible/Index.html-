# grade7.py <results file(s)...> : grades lib7 pilot-type results. Results = saved output of a query returning rows with "results": [{id,status,usd,ms,text}].
#   fu7-*-t1 : turn 1 of a follow-through case: must END with an offer.   fu7-*-t2 : turn 2: the case's 'all' facts in turn1+turn2, no "did not come
#   through", not a restart (line 1 of turn 2 is not line 1 of turn 1), status 200.   st7-* : strictest-rule cases (must / mustnot / lead in the
#   first 40 words / no other state named / answer within 70 words before the closing lines).   lib-* : out/cases.jsonl via grade.py's rules.
#   anything else: the existing eval_set patterns (work/lib7/old148_cases.json, Postgres regex) with WIDEN (documented pattern fixes).
import json, os, re, sys, statistics
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(H, 'tools')); sys.path.insert(0, os.path.join(os.path.dirname(H), 'library_arch_nov20'))
import sqlout, lib_kb
D = json.load(open(os.path.join(H, 'work/lib7/cases_lib7.json')))
FU = {c['id']: c for c in D['fu']}; ST = {c['id']: c for c in D['st']}
LIB = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(H, 'out/cases.jsonl'))}
OLD = {c['id']: c for c in json.load(open(os.path.join(H, 'work/lib7/old148_cases.json')))}
# pattern fixes for the existing set (case wrong, answer right; each read by hand, see ROUNDS.md lib7): the old pattern stays as one alternative.
WIDEN = {
 'ct4': ('90 ?min|1\\.5 ?h', '90 ?min|1\\.5 ?h|1[- ]1/2 ?h|one and a half hours?'),
 'nw12': ('ticket|811 center|Arkansas 811', 'ticket|811 center|Arkansas 811|notice|notif'),
 'ph08': ('unknown|unidentified', 'unknown|unidentified|doesn.t know|don.t know|not (yet )?(known|identified)|unmarked'),
 'brk1': ('2 [^.]{0,25}meal|two [^.]{0,25}meal|second meal|second 30|2nd meal', '2 [^.]{0,35}meal|two [^.]{0,35}meal|second meal|second 30|2nd meal'),
}
def pg(p):  # Postgres ARE -> Python
    return re.compile(p.replace('\\m', '\\b').replace('\\M', '\\b').replace('\\y', '\\b'), re.I)
def offer_end(t):
    last = [x.strip() for x in t.strip().split('\n') if x.strip()][-1] if t.strip() else ''
    return bool(re.search(r'\?\s*$', last) and re.match(r'[-*\s]*(want|need|should i|do you want|would you like)\b', last, re.I))
CP = re.compile(r"competent person (decides|makes|checks)|entry supervisor (decides|makes)", re.I)
def closing(t):
    n = 0
    for ln in reversed([x for x in t.strip().split('\n') if x.strip()]):
        x = ln.strip().lstrip('-* ').strip()
        if re.match(r'(for a specific case|for your specific case)', x, re.I) and len(x.split()) <= 26: n += len(ln.split()); continue  # the labor-law closing line the prompt requires (lib7)
        if (CP.search(x) and len(x.split()) <= 14) or (re.search(r'\?\s*$', x) and re.match(r'(want|need|should i|do you want|would you like)\b', x, re.I) and len(x.split()) <= 16): n += len(ln.split()); continue
        break
    return n
def others(where, q, t):
    st = where[-2:]; named = lib_kb.state_names_in(q); own = lib_kb.STATES.get(st, '')
    return [n for k, n in lib_kb.STATES.items() if k != st and k not in named and k != 'DC' and n not in own and not (st == 'WV' and k == 'VA')
            and re.search((r'(?<!West )\bVirginia\b' if n == 'Virginia' else r'\b' + re.escape(n) + r'\b'), re.sub(r'Washington,? D\.?C\.?', '', t))]
LACK = re.compile(r"did(n.t| not) come through|(was|were|is|are) cut off|not in (my|the) excerpts|excerpts (don.t|do not) (have|include|show)|don.t have (the|that) (table|list)|wasn.t included", re.I)
def grade(res):
    out = {}
    for i, r in res.items():
        t = r.get('text') or ''; why = []; w = len(t.split())
        if r.get('status') != 200: why.append(f"status {r.get('status')}")
        if i.endswith('-t1') and i[:-3] in FU:
            if not offer_end(t): why.append('turn 1 ends without an offer')
        elif i.endswith('-t2') and i[:-3] in FU:
            c = FU[i[:-3]]; t1 = (res.get(i[:-3] + '-t1') or {}).get('text') or ''
            both = t1 + '\n' + t
            miss = [p for p in c['all'] if not re.search(p, both, re.I)]
            if miss: why.append('facts over both turns: ' + ' ; '.join(miss))
            if LACK.search(t): why.append('says the part did not come through')
            l1 = lambda s: re.sub(r'\W+', ' ', ([x for x in s.strip().split('\n') if x.strip()] or [''])[0]).strip().lower()
            if l1(t) and l1(t) == l1(t1): why.append('restarted (same first line)')
            if w > 260: why.append(f'long: {w} > 260')
        elif i in ST:
            c = ST[i]; miss = [p for p in c['must'] if not re.search(p, t, re.I)]; bad = [p for p in c['mustnot'] if re.search(p, t, re.I | re.M)]
            lead = [p for p in c['lead'] if not re.search(p, ' '.join(t.split()[:40]), re.I)]; o = others(c['where'], c['q'], t)
            if miss: why.append('facts: ' + ' ; '.join(miss))
            if bad: why.append('forbidden: ' + ' ; '.join(bad))
            if lead: why.append('buried: ' + ' ; '.join(lead))
            if o: why.append('other state named: ' + ', '.join(o))
            if w - closing(t) > 70: why.append(f'long: {w - closing(t)} > 70')
        elif i in LIB:
            c = LIB[i]; miss = [p for p in c.get('must', []) if not re.search(p, t, re.I)]; bad = [p for p in c.get('mustnot', []) if re.search(p, t, re.I)]
            lim = c.get('maxwords') or {'simple': 70, 'rule': 100, 'complex': 110, 'steps': 170}.get(c.get('kind'), 120)
            o = others(c['where'], c['q'], t) if c.get('state_strict') else []
            if miss: why.append('facts: ' + ' ; '.join(miss))
            if bad: why.append('forbidden: ' + ' ; '.join(bad))
            if o: why.append('other state named: ' + ', '.join(o))
            if w - closing(t) > lim: why.append(f'long: {w - closing(t)} > {lim}')
        elif i in OLD:
            c = OLD[i]; must = [WIDEN[i][1] if i in WIDEN and p == WIDEN[i][0] else p for p in c['must']]
            miss = [p for p in must if not pg(p).search(t)]; bad = [p for p in c['mustnot'] if pg(p).search(t)]
            if miss: why.append('facts: ' + ' ; '.join(miss))
            if bad: why.append('forbidden: ' + ' ; '.join(bad))
            if w > c['maxwords']: why.append(f"long: {w} > {c['maxwords']}")
        else: why.append('unknown case')
        out[i] = dict(ok=not why, why=why, words=w, usd=r.get('usd') or 0, text=t)
    return out
if __name__ == '__main__':
    res = {}
    for f in sys.argv[1:]:
        for row in sqlout.rows(f):
            for r in (row.get('results') or []): res[r['id']] = r
    g = grade(res)
    for i, x in sorted(g.items()):
        if not x['ok']: print(f"FAIL {i}: {' | '.join(x['why'])}\n   {x['text'][:600]!r}")
    grp = lambda p: [x for i, x in g.items() if i.startswith(p)]
    print(json.dumps({p: f"{sum(x['ok'] for x in grp(p))}/{len(grp(p))}" for p in ('fu7', 'st7', 'lib-', 'tr', 'ct', 'nw', 'ph', 'brk', 'wa')}), 'usd', round(sum(x['usd'] for x in g.values()), 2))
    json.dump(g, open(os.path.join(H, 'work/lib7/last_graded.json'), 'w'), indent=0)
