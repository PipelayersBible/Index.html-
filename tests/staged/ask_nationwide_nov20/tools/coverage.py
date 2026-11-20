# Coverage map: for each topic, which states have a KB chunk that names the state AND carries a state-specific rule
# (a number or a state citation), not just "check your state". Reads ../work/kb_live.json. Prints a table.
import json,re,sys
kb=json.load(open('../work/kb_live.json')); C=kb['app']+kb['field']
ST={"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"}
PLAN="AK AZ CA HI IN IA KY MD MI MN NV NM NC OR SC TN UT VT VA WA WY".split()
T={
 'trench/shoring':r'protective system|shoring|trench (box|shield)|cave-in|excavation (permit|standard|rule)',
 'confined space':r'confined space|permit space|permit-required',
 '811 numbers':r'(\d+ (working|business|calendar|full) days?|48 hours|72 hours)[^.]{0,120}(ticket|dig|excavat|notice|locate)|tolerance zone[^.]{0,80}\d+ in|(ticket|locate)[^.]{0,80}(good|valid|expire)[^.]{0,40}\d+',
 'lockout':r'lockout|tagout|hazardous energy',
 'heat illness':r'heat (illness|rule|standard|stress)|shade|cool-down|acclimat',
 'traffic control':r'MUTCD|flagger|traffic control|work zone',
 'silica':r'silica',
 'fall protection':r'fall protection|guardrail|fall arrest',
 'competent person':r'competent person',
 'near utilities':r'tolerance zone|hand dig|pothol|vacuum excavat',
 'meal/rest breaks':r'meal (break|period)|rest (break|period)',
 'overtime':r'overtime',
}
def named(c,name):
    return re.search(r'\b'+name+r'\b', c['title']+' '+(c.get('topic') or '')) is not None
res={}
for t,rx in T.items():
    rx=re.compile(rx,re.I); hit=[]
    for code,name in ST.items():
        n=sum(1 for c in C if named(c,name) and rx.search(c['title']+' '+c['text']))
        if n: hit.append(code)
    res[t]=hit
    miss=[c for c in ST if c not in hit]
    print(f"{t:18} states with a named chunk: {len(hit):2}  plan states missing: {' '.join(p for p in PLAN if p not in hit) or '-'}")
    print(f"{'':18} have: {' '.join(hit)}")
json.dump(res,open('../work/coverage.json','w'))
