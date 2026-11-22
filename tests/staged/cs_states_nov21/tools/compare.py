import json, sys
H='/home/claude/index.html-/tests/staged/cs_states_nov21/work'; P=sys.argv[1] if len(sys.argv)>1 else '0'
L=[f"PLAIN_MIN={P}"]
for C in ('cases_existing','cases_consol204','cases_cs','cases_cs_states_retr'):
    b,a=json.load(open(f'{H}/r_{C}_before_p{P}.json')),json.load(open(f'{H}/r_{C}_after_p{P}.json'))
    worse=[k for k in b if (b[k]['ok'] and not a[k]['ok']) or (b[k]['facts'] and not a[k]['facts'])]
    better=[k for k in b if (not b[k]['ok'] and a[k]['ok']) or (not b[k]['facts'] and a[k]['facts'])]
    down=[f"{k} {b[k]['rank']}->{a[k]['rank']}" for k in b if a[k]['ok'] and b[k]['ok'] and a[k]['rank']>b[k]['rank']]
    avg=lambda d: round(sum(x['chars'] for x in d.values())/len(d))
    L+=[f"{C}: {len(b)}; chunk {sum(v['ok'] for v in b.values())} -> {sum(v['ok'] for v in a.values())}; facts {sum(v['facts'] for v in b.values())} -> {sum(v['facts'] for v in a.values())}; avg chars {avg(b)} -> {avg(a)}",
        f"  WORSE {len(worse)} {worse}", f"  better {len(better)} {better[:20]}", f"  lower rank {len(down)} {down}"]
    for k,v in a.items():
        if C=='cases_cs_states_retr' and not (v['ok'] and v['facts']): L.append(f"  miss {k}: forced {v['forced']} ids {v['ids']}")
rb,ra=json.load(open(f'{H}/reg_before_p{P}.json')),json.load(open(f'{H}/reg_after_p{P}.json'))
L.append(f"127 text: all facts {sum(v['s']==1 for v in rb.values())} -> {sum(v['s']==1 for v in ra.values())}; worse {[k for k in rb if ra[k]['s']<rb[k]['s']]}")
open(f'{H}/retr_compare_p{P}.txt','w').write('\n'.join(L)+'\n'); print('\n'.join(L))
