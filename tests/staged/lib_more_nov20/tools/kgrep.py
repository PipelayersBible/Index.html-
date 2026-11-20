# usage: python3 kgrep.py REGEX [maxchars]  -> search local copy of live KB (ask_nationwide work/kb_live.json + kb_nationwide.jsonl)
import json,re,sys,os
H=os.path.dirname(os.path.abspath(__file__))
d=json.load(open(H+'/../../ask_nationwide_nov20/work/kb_live.json'))
rows=[(l,c) for l in d for c in d[l]]
rows+=[('field',json.loads(x)) for x in open(H+'/../../ask_nationwide_nov20/sql/kb_nationwide.jsonl')]
rx=re.compile(sys.argv[1],re.I); n=int(sys.argv[2]) if len(sys.argv)>2 else 300
for l,c in rows:
    t=c['title']+' '+c['text']
    m=rx.search(t)
    if m:
        s=max(0,m.start()-len(c['title'])-1-n//3)
        print(f"[{l}] {c['id']} | {c['title']} | {c.get('source')}\n    ...{c['text'][s:s+n]}\n")
