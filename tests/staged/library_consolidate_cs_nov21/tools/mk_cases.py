# mk_cases.py (library_consolidate_cs_nov21): new confined space state cases. 51 x 2 ("does <state> follow federal?", "<state> CO limit")
# + 6 state-specific ones (CA rescue 2026, CA test order cite, WA permit keep, OR signature, MI part, MD adoption) + 5 office-level 811 rule
# questions that the analysis route used to take (comparison fix). chunks = the state's exception card(s) + the table card.
import json, re, sys
H = '/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21'
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_consolidate_nov21/tools')
exec(open('/home/claude/index.html-/tests/staged/library_consolidate_nov21/tools/mk_cases.py').read().split('A = {}')[0].split("H = ")[0])
src = open('/home/claude/index.html-/tests/staged/library_consolidate_nov21/tools/mk_cases.py').read()
exec(src[src.index('ST = {'):src.index('A = {}')])
A = {}
for l in open(f'{H}/work/after_rows.jsonl'):
    r = json.loads(l); A[r['c']['id']] = r['c']
def table_for(code):
    name = ST[code]
    for i in ('osha-pl-cs-states-1', 'osha-pl-cs-states-2'):
        t = A[i]['text'] if code == 'WV' else A[i]['text'].replace('West Virginia', '')
        if re.search(r'\b' + re.escape(name) + r'\b', t): return i
EXC = {c: [i for i in A if i.startswith(f'sp-{c.lower()}-confined')] for c in ST}
FOLLOW = {'CA': r'1950|Article 37|Title 8|8 CCR', 'WA': r'296-809', 'OR': r'437-002-0146|own (confined space )?rule', 'MI': r'Part 35',
          'MD': r'federal|Subpart AA|1926', 'MN': r'federal|Subpart AA|1926'}
NOTCHK = {'IN', 'KY', 'SC', 'IA', 'VT', 'WY'}
cases = []
for code, name in ST.items():
    lc, where = code.lower(), f'{CITY[code]}, {code}'
    t = table_for(code); assert t, code
    must = FOLLOW.get(code) or (r'not checked|not confirmed|confirm|ask' if code in NOTCHK else r'federal|Subpart AA|1926')
    cases.append({'id': f'cs-{lc}-fed', 'coll': 'confined', 'q': f'Does {name} follow the federal confined space rule, or does it have its own?', 'where': where,
                  'level': 'foreman', 'must': [must], 'chunks': EXC[code] + [t], 'table': t})
    cases.append({'id': f'cs-{lc}-co', 'coll': 'confined', 'q': 'What is the carbon monoxide limit for entering a manhole?', 'where': where, 'level': 'pipelayer',
                  'must': [r'25 ?ppm' if code == 'CA' else r'50 ?ppm'], 'chunks': (EXC[code] if code == 'CA' else []) + ['osha-pl-cs-air-1'], 'table': t})
X = [('cs-ca-rescue', 'Fresno, CA', 'foreman', 'Can we rely on the fire department for rescue on a manhole entry, or do we need someone at the site?', [r'at the site|immediately available|standby'], ['sp-ca-confined-2026-1']),
     ('cs-ca-order', 'Fresno, CA', 'pipelayer', 'What order do we test the air in a vault before entry?', [r'oxygen'], ['sp-ca-confined-1', 'osha-pl-cs-monitor-1']),
     ('cs-wa-keep', 'Spokane, WA', 'foreman', 'How long do we have to keep confined space entry permits?', [r'1 year|one year'], ['sp-wa-confined-1', 'osha-pl-cs-permit-keep-1', 'osha-pl-cs-permit-1']),
     ('cs-or-sign', 'Salem, OR', 'foreman', 'Can the entry supervisor just initial the confined space permit?', [r'signature|sign'], ['sp-or-confined-1']),
     ('cs-mi-rule', 'Grand Rapids, MI', 'office', 'Which confined space rule applies to my crew going into a manhole on a Michigan construction job?', [r'Part 35'], ['sp-mi-confined-2']),
     ('cs-md-rule', 'Baltimore, MD', 'office', 'Does Maryland have its own confined space rule for construction?', [r'federal|Subpart AA|1926'], ['osha-pl-cs-states-2', 'sp-md-who-1'])]
for i, w, lv, q, m, ch in X: cases.append({'id': i, 'coll': 'confined', 'q': q, 'where': w, 'level': lv, 'must': m, 'chunks': ch})
# office-level 811 rule questions (the analysis route took "my ... ticket ... how long")
AN = [('an-oh-life', 'Cleveland, OH', 'How long is my locate ticket good for?', 'fed-811-ticketlife-1'),
      ('an-tx-life', 'San Antonio, TX', 'How long is my 811 ticket good for?', 'fed-811-ticketlife-1'),
      ('an-ga-wait', 'Savannah, GA', 'How long do I have to wait after calling in my locate tickets before we dig?', 'fed-811-wait-1'),
      ('an-mi-zone', 'Grand Rapids, MI', 'How close to the marks can my crews dig on our tickets?', 'fed-811-zone-1'),
      ('an-co-life', 'Colorado Springs, CO', 'How long are our locate tickets valid?', 'fed-811-ticketlife-1')]
for i, w, q, t in AN:
    code = w[-2:]; lc = code.lower()
    dig = [x for x in A if x.startswith(f'dig-{lc}-') and 'locatable' not in x]
    cases.append({'id': i, 'coll': '811-office', 'q': q, 'where': w, 'level': 'office', 'must': [], 'chunks': dig + [t], 'table': t,
                  'forbid': [r'\b(' + '|'.join(n for c, n in ST.items() if c != code and n not in ST[code]) + r')\b', r'elsewhere|most states|other states']})
with open(f'{H}/cases_cs.jsonl', 'w') as f:
    for c in cases: f.write(json.dumps(c) + '\n')
print(len(cases), 'cases')
