# stcards.py: helper - state of each live card (state field, else id rules like the build's chunkStates, else state name at title start)
import json, re
H = '/home/claude/index.html-/tests/staged/ask_quality_nov22/work/'
ST = {"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"}
RULES = [r'^dig-([a-z]{2})(-|$)', r'^plan-([a-z]{2})-', r'^emp-state-([a-z]{2})-', r'^emp-([a-z]{2})-', r'^brk-([a-z]{2})$', r'^st-([a-z]{2})$', r'^(ca)-', r'^(?:sp|tc|spec|env|lic|row)-([a-z]{2})-']
def state_of(c):
    s = c.get('state')
    if s and s != 'US' and len(s) == 2: return s
    if s == 'US': return 'US'
    for rr in RULES:
        m = re.match(rr, c['id'])
        if m and m.group(1).upper() in ST: return m.group(1).upper()
    t = c.get('title') or ''
    for k, v in ST.items():
        if t.startswith(v): return k
    return None
def rows(f='live_rows.jsonl'): return [json.loads(l) for l in open(H + f)]
