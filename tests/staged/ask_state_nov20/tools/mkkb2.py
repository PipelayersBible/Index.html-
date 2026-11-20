# Local copy of the live KB after the Nov 20 nationwide batch: nationwide work/kb_live.json + its staged edits + 56 new chunks.
# Prints md5 per 100-ord bucket (same recipe as the read-only SQL in NOTES) so it can be compared with live.
import json,hashlib,sys
N='/home/claude/index.html-/tests/staged/ask_nationwide_nov20/'
kb=json.load(open(N+'work/kb_live.json')); ed=json.load(open(N+'work/edited_chunks.json'))
rows=[]
for lib in kb:
    for c in kb[lib]:
        o=int(c['_ord'])
        if str(o) in ed: e=dict(ed[str(o)]); e['_ord']=o; c=e
        c['_ord']=o; c['_lib']=lib; rows.append(c)
o=max(r['_ord'] for r in rows)
for l in open(N+'sql/kb_nationwide.jsonl'):
    if l.strip(): o+=1; c=json.loads(l); c['_ord']=o; c['_lib']='field'; rows.append(c)
rows.sort(key=lambda r:r['_ord'])
h={}
for r in rows:
    s='|'.join((r.get(k) if r.get(k) not in (None,'None') or k!='x' else '') or '' for k in ('id','title','topic','source','text'))
    h.setdefault(r['_ord']//100,[]).append(hashlib.md5(s.encode()).hexdigest())
print(len(rows)); print(json.dumps({b:hashlib.md5(''.join(v).encode()).hexdigest() for b,v in h.items()}))
out={'app':[],'field':[],'osha':[]}
for r in rows:
    lib=r.pop('_lib'); out[lib].append(r)
json.dump(out,open('work/kb_live2.json','w'))
