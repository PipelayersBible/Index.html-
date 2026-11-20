# grade.py <round> <saved result file> : grades a round locally (LIBRARY_RULES section 5: facts / right state / concise / direct).
#   The result file is the saved output of:  select jsonb_agg(jsonb_build_object('id',id,'status',status,'usd',usd,'ms',ms,'text',text)) results from pb_ai.eval_results where run = '<run>'
#   Writes work/round<N>/graded.json, fails.txt (every failure with its answer), updates work/history.json. Prints the score line.
import json, os, re, sys, statistics, collections
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(os.path.dirname(H), 'library_arch_nov20')); import lib_kb
N = int(sys.argv[1]); W = os.path.join(H, 'work'); R = os.path.join(W, f'round{N}')
raw = open(sys.argv[2]).read()
try: raw = json.loads(raw)['result']
except Exception: pass
res = {}
for m in re.finditer(r'<untrusted-data-[0-9a-f-]+>\s*(\[.*?\])\s*</untrusted-data', raw, re.S):
    for row in json.loads(m.group(1)):
        for r in (row.get('results') or []): res[r['id']] = r
d = json.load(open(os.path.join(R, 'cases.json'))); cases = d['cases']
old = {c['id']: c for c in json.load(open(os.path.join(H, 'canaries.json')))}
LIM = {'simple': 70, 'rule': 100, 'complex': 110, 'steps': 170}
rx = lambda p: re.compile(p.replace(r'\m', r'\b').replace(r'\M', r'\b').replace(r'\y', r'\b'), re.I)
def offer(t):
    last = re.split(r'(?<=[.!?])\s+|\n', t.strip())[-1].strip()
    return bool(re.search(r'\?\s*$', last) and re.match(r'\s*(want|need|should i|do you want|would you like)\b', last, re.I) and len(last.split()) <= 12)
def other_states(c, t):
    st = c['where'][-2:]; named = lib_kb.state_names_in(c['q']); own = lib_kb.STATES[st]
    hit = [n for k, n in lib_kb.STATES.items() if k != st and k not in named and k != 'DC' and n not in own and not (st == 'WV' and k == 'VA')
           and re.search((r'(?<!West )\bVirginia\b' if n == 'Virginia' else r'\b' + re.escape(n) + r'\b'), re.sub(r'Washington,? D\.?C\.?', '', t))]
    return hit
out, rows = [], []
for c in cases + [dict(old[i], grp='canary_old') for i in d['canary_old']]:
    r = res.get(c['id']); g = dict(id=c['id'], grp=c['grp'], coll=c.get('coll', 'old'), st=(c.get('where') or '')[-2:], kind=c.get('kind'), safety=bool(c.get('safety')) or c['grp'] == 'canary_new')
    if not r: g.update(ok=False, why=['no result'], words=0, text=''); out.append(g); continue
    t = r.get('text') or ''; body = re.sub(r'^\s*TYPE:\s*\w+\s*', '', t); w = len(t.split()); why = []
    miss = [p for p in c.get('must', []) if not rx(p).search(t)]
    bad = [p for p in c.get('mustnot', []) if rx(p).search(t)]
    if r.get('status') != 200: why.append(f'status {r.get("status")}')
    if miss: why.append('facts: ' + ' ; '.join(miss))
    if bad: why.append('forbidden: ' + ' ; '.join(bad))
    ws = other_states(c, t) if c.get('state_strict') else []
    if ws: why.append('other state named: ' + ', '.join(ws))
    lim = c.get('maxwords') or LIM.get(c.get('kind'), 120)
    if w > lim: why.append(f'long: {w} > {lim}')
    first = ' '.join(body.split()[:40]); buried = [p for p in c.get('lead', []) if not rx(p).search(first)]
    if buried: why.append('buried: ' + ' ; '.join(buried))
    of = offer(t)
    if c['grp'] != 'canary_old':
        if c.get('complex') and not of: why.append('no offer at the end (complex)')
        if not c.get('complex') and of: why.append('offer not wanted')
    g.update(ok=not why, why=why, words=w, lim=lim, facts=not miss and r.get('status') == 200, state_ok=not bad and not ws, wrong_state=bool(ws) or any('other state' in x for x in why),
             concise=w <= lim, direct=not buried and (c['grp'] == 'canary_old' or bool(c.get('complex')) == of), usd=r.get('usd') or 0, ms=r.get('ms'), text=t, q=c.get('q', ''), safety=bool(c.get('safety')) or c['grp'] == 'canary_new')
    out.append(g)
json.dump(out, open(os.path.join(R, 'graded.json'), 'w'), indent=0)
G = lambda grp: [g for g in out if g['grp'] == grp]; P = lambda L: sum(1 for g in L if g['ok'])
allr = [g for g in out if g.get('text') is not None and g['words']]; lib = [g for g in allr if g['grp'] != 'canary_old']
can = G('canary_new') + G('canary_old'); safe_fail = [g['id'] for g in can if g.get('safety') and not g['ok']]
line = dict(round=N, n=len(out), got=len(allr), fresh=f"{P(G('fresh'))}/{len(G('fresh'))}", reask=f"{P(G('reask'))}/{len(G('reask'))}", canaries=f"{P(can)}/{len(can)}", safety_canary_fails=safe_fail,
            style=f"{P(G('style'))}/{len(G('style'))}", total=f"{P(out)}/{len(out)}", facts=sum(1 for g in allr if g.get('facts')), wrong_state=sum(1 for g in allr if g.get('wrong_state')),
            median_words=statistics.median([g['words'] for g in lib]) if lib else 0, within_limit=sum(1 for g in allr if g.get('concise')), answer_first=sum(1 for g in allr if g.get('direct')),
            concise_and_direct=sum(1 for g in allr if g.get('concise') and g.get('direct')), usd=round(sum(g.get('usd', 0) for g in allr), 2))
json.dump(line, open(os.path.join(R, 'score.json'), 'w')); print(json.dumps(line))
kinds = collections.Counter(); 
for g in out:
    if not g['ok']:
        for x in g['why']: kinds[x.split(':')[0]] += 1
print('failure reasons:', dict(kinds))
with open(os.path.join(R, 'fails.txt'), 'w') as f:
    for g in out:
        if not g['ok']: f.write(f"### {g['id']} [{g['grp']} {g['st']} {g['kind']}] {g.get('q', '')}\n   WHY: {' | '.join(g['why'])}\n   ANSWER ({g['words']} words): {g.get('text', '')}\n\n")
hp = os.path.join(W, 'history.json'); hist = json.load(open(hp)) if os.path.exists(hp) else {}
for g in out:
    h = hist.setdefault(g['id'], []); h[:] = [x for x in h if x[0] != N] + [[N, g['ok']]]
json.dump(hist, open(hp, 'w'))
if os.path.exists(os.path.join(W, 'inserted_pending.json')): os.replace(os.path.join(W, 'inserted_pending.json'), os.path.join(W, 'inserted.json'))
