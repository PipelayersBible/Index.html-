# cmp_rank.py <base.json> <new.json>: per eval case, rank of the wanted card and whether the long state instructions are sent (own>0 or dependent)
import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
worse=better=0; lw=lb=0; ex=[]
for st in a['sets']:
    for k,x in a['sets'][st].items():
        y=b['sets'][st][k]
        if y['rank']>x['rank']: worse+=1; ex.append(('worse',st,k,x['rank'],y['rank'],x['ids'][:2],y['ids'][:2]))
        elif y['rank']<x['rank']: better+=1
        la=bool(x['own'] or x['dep']); lbb=bool(y['own'] or y['dep'])
        if la and not lbb: lw+=1; ex.append(('long->short',st,k,x['own'],y['own'],x['ids'][:1],y['ids'][:1]))
        if lbb and not la: lb+=1
print('rank worse',worse,'better',better,'| long->short',lw,'short->long',lb)
for e in ex[:60]: print(e)
