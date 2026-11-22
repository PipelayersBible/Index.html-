# mk_cases.py: 4 new cases per state (51 x 4 = 204): trench "does <state> follow federal?", trench "<state> number" (depth),
# 811 "does <state> follow federal?" (wait), 811 "<state> number" (ticket life). chunks = the state's exception card(s) + the table card.
import json, re
H = '/home/claude/index.html-/tests/staged/library_consolidate_nov21'
ST = {"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"}
CITY = {"AL":"Birmingham","AK":"Anchorage","AZ":"Tucson","AR":"Fayetteville","CA":"Fresno","CO":"Colorado Springs","CT":"Hartford","DE":"Dover","DC":"Washington","FL":"Tampa","GA":"Savannah","HI":"Honolulu","ID":"Boise","IL":"Springfield","IN":"Indianapolis","IA":"Des Moines","KS":"Wichita","KY":"Lexington","LA":"Baton Rouge","ME":"Portland","MD":"Baltimore","MA":"Worcester","MI":"Grand Rapids","MN":"Rochester","MS":"Jackson","MO":"Kansas City","MT":"Billings","NE":"Omaha","NV":"Reno","NH":"Manchester","NJ":"Newark","NM":"Albuquerque","NY":"Buffalo","NC":"Raleigh","ND":"Fargo","OH":"Cleveland","OK":"Tulsa","OR":"Salem","PA":"Pittsburgh","RI":"Providence","SC":"Columbia","SD":"Sioux Falls","TN":"Nashville","TX":"San Antonio","UT":"Provo","VT":"Burlington","VA":"Richmond","WA":"Spokane","WV":"Charleston","WI":"Madison","WY":"Cheyenne"}
A = {}
for l in open(f'{H}/work/after_rows.jsonl'):
    r = json.loads(l); A[r['c']['id']] = r['c']
def table_for(ids, code):
    name = ST[code]
    for i in ids:
        t = A[i]['text'] if code == 'WV' else A[i]['text'].replace('West Virginia', '')
        if re.search(r'\b' + re.escape(name) + r'\b', t): return i
def group(tid, code):
    t = A[tid]['text']; t = t[t.index('line'):]; name = ST[code]
    for seg in re.split(r'(?<=\.)\s+(?=[0-9A-Z])', t):
        m = re.match(r'([^:]+):(.*)', seg)
        if not m: continue
        body = m.group(2) if code == 'WV' else m.group(2).replace('West Virginia', '')
        if re.search(r'\b' + re.escape(name) + r'\b', body): return m.group(1).strip()
TR_EXC = {'WA': ['sp-wa-trench-1', 'sp-wa-trench-plan-1', 'sp-wa-trench-slope-1'], 'CA': ['sp-ca-trench-1', 'sp-ca-trench-dig-1', 'sp-ca-trench-other-1'],
          'MI': ['sp-mi-trench-1', 'sp-mi-trench-2'], 'MD': ['sp-md-trench-1'], 'SC': ['sp-sc-trench-1'], 'OR': ['sp-or-trench-1']}
TR_FOLLOW_MUST = {'WA': r'4 ?(ft|feet|foot)', 'CA': r'permit', 'MI': r'Part 9|MIOSHA|408\.409', 'MD': r'record|jobsite|job site', 'SC': r'training|competent person',
                  'OR': r'437-003-0096|one-call|locate', 'IA': r'not checked|not confirmed|5 ?(ft|feet)', 'VT': r'not checked|not confirmed|5 ?(ft|feet)', 'WY': r'not checked|not confirmed|5 ?(ft|feet)'}
def wait_re(g):
    g = g.lower()
    if 'not confirmed' in g: return r'not confirmed'
    if g.startswith('2 working'): return r'(2|two) (full )?(working|business)'
    if g.startswith('48'): return r'48'
    if g.startswith('72'): return r'72|(3|three) business'
    if g.startswith('3 working'): return r'(3|three) (full )?(working|business)'
    if g.startswith('96'): return r'96'
    if g.startswith('5 working'): return r'(5|five) working'
    raise SystemExit(g)
def life_re(g):
    g = g.lower()
    if 'not confirmed' in g: return r'not confirmed'
    if 'no set' in g: return r'no set|(no|not|doesn.?t|don.?t|never) .{0,30}expir|no ticket (life|expir)'
    if g.startswith('4 weeks'): return r'(4|four) (consecutive )?weeks'
    if g.startswith('each 14'): return r'14 business'
    n = re.match(r'(\d+)', g).group(1); return n + r'\b'
cases = []
for code, name in ST.items():
    lc, where = code.lower(), f'{CITY[code]}, {code}'
    tt = table_for(['osha-pl-trench-states-1', 'osha-pl-trench-states-2'], code)
    exc = TR_EXC.get(code, [])
    cases.append({'id': f'con-{lc}-tr-fed', 'coll': 'trench', 'q': f'Does {name} follow the federal OSHA trench rule, or does it have its own?', 'where': where, 'level': 'foreman',
                  'must': [TR_FOLLOW_MUST.get(code, r'5 ?(ft|feet|foot)')], 'chunks': exc + [tt], 'table': tt})
    cases.append({'id': f'con-{lc}-tr-num', 'coll': 'trench', 'q': 'At what depth does a trench need a trench box or shoring?', 'where': where, 'level': 'pipelayer',
                  'must': [r'4 ?(ft|feet|foot)' if code == 'WA' else r'5 ?(ft|feet|foot)'], 'chunks': exc + [tt], 'table': tt})
    dig = [i for i in A if (i.startswith(f'dig-{lc}-') and 'locatable' not in i) or (code == 'CA' and i.startswith('ca-dig-alert-'))]
    gw, gl = group('fed-811-wait-1', code), group('fed-811-ticketlife-1', code)
    cases.append({'id': f'con-{lc}-dig-fed', 'coll': '811', 'q': f'Is the wait after calling 811 a federal rule, or does {name} set its own?', 'where': where, 'level': 'foreman',
                  'must': [wait_re(gw)], 'chunks': dig + ['fed-811-wait-1'], 'table': 'fed-811-wait-1', 'group': gw})
    cases.append({'id': f'con-{lc}-dig-num', 'coll': '811', 'q': 'How long is my locate ticket good for?', 'where': where, 'level': 'pipelayer',
                  'must': [life_re(gl)], 'chunks': dig + ['fed-811-ticketlife-1'], 'table': 'fed-811-ticketlife-1', 'group': gl})
with open(f'{H}/cases_new.jsonl', 'w') as f:
    for c in cases: f.write(json.dumps(c) + '\n')
print(len(cases), 'cases')
