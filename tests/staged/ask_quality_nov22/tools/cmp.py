# cmp.py <before.json> <after.json>: free-check comparison per set (chunk / facts / worse / better / lower rank) + text127
import json, sys
b, a = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
for s in a['sets']:
    A = a['sets'][s]; B = b['sets'].get(s, {})
    ks = [k for k in A if k in B]
    worse = [k for k in ks if (B[k]['ok'] and not A[k]['ok']) or (B[k]['facts'] and not A[k]['facts'])]
    better = [k for k in ks if (not B[k]['ok'] and A[k]['ok']) or (not B[k]['facts'] and A[k]['facts'])]
    down = [f"{k} {B[k]['rank']}->{A[k]['rank']}" for k in ks if A[k]['ok'] and B[k]['ok'] and A[k]['rank'] > B[k]['rank']]
    avg = lambda d: round(sum(x['chars'] for x in d.values()) / max(1, len(d)))
    print(f"{s}: n={len(A)} chunk {sum(B[k]['ok'] for k in ks)}->{sum(A[k]['ok'] for k in A)} facts {sum(B[k]['facts'] for k in ks)}->{sum(A[k]['facts'] for k in A)} chars {avg(B) if B else '-'}->{avg(A)} office->analysis {sum(B[k].get('office_analysis',0) for k in ks)}->{sum(A[k].get('office_analysis',0) for k in A)}")
    if worse: print("   WORSE", worse)
    if better: print("   better", better[:30])
    if down: print("   lower rank", down[:30])
    if not B:
        for k, v in A.items():
            if not (v['ok'] and v['facts']): print("   miss", k, v['ids'][:8])
tb, ta = b['text'], a['text']
print(f"text127: all facts {sum(v['s']==1 for v in tb.values())}->{sum(v['s']==1 for v in ta.values())}; worse {[k for k in tb if ta[k]['s'] < tb[k]['s']]}")
