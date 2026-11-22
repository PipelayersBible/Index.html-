import json,re,sys
rows=json.load(open('work/live_rows_3270.json'))
pat_id=re.compile(r'^(dig-[a-z]{2}($|-)|ca-dig-alert|sp-[a-z]{2}-trench|ca-cal-osha-trench|plan-[a-z]{2}-trench|sp-[a-z]{2}-dig|sp-[a-z]{2}-exc)')
out=[]
for r in rows:
    c=r['c']
    if pat_id.search(c['id']): out.append(r)
json.dump(out,open('work/scope_rows.json','w'))
print(len(out), sum(len(r['c']['text']) for r in out))
import collections
print(collections.Counter(re.sub(r'^(dig|sp)-[a-z]{2}','\\1-XX',re.sub(r'-\d+$','',r['c']['id'])) for r in out))
