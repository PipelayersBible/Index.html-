import json, sys
H='/home/claude/index.html-/tests/staged/library_consolidate_nov21/work'; P=sys.argv[1] if len(sys.argv)>1 else '0'
b, a = json.load(open(f'{H}/retr_before_p{P}.json')), json.load(open(f'{H}/retr_after_p{P}.json'))
worse = [k for k in b if (b[k]['ok'] and not a[k]['ok']) or (b[k]['facts'] and not a[k]['facts'])]
better = [k for k in b if (not b[k]['ok'] and a[k]['ok']) or (not b[k]['facts'] and a[k]['facts'])]
down = [f"{k} {b[k]['rank']}->{a[k]['rank']}" for k in b if a[k]['ok'] and b[k]['ok'] and a[k]['rank'] > b[k]['rank']]
rb, ra = json.load(open(f'{H}/reg_before_p{P}.json')), json.load(open(f'{H}/reg_after_p{P}.json'))
rw = [k for k in rb if ra[k]['s'] < rb[k]['s']]; rbt = [k for k in rb if ra[k]['s'] > rb[k]['s']]
nb, na = json.load(open(f'{H}/retr_new_before_p{P}.json')), json.load(open(f'{H}/retr_new_after_p{P}.json'))
avg = lambda d: round(sum(x['chars'] for x in d.values()) / len(d))
lines = [f"PLAIN_MIN={P}",
 f"existing library + state-audit cases (core): {len(b)}; chunk {sum(v['ok'] for v in b.values())} -> {sum(v['ok'] for v in a.values())}; facts {sum(v['facts'] for v in b.values())} -> {sum(v['facts'] for v in a.values())}",
 f"  WORSE: {len(worse)} {worse}", f"  better: {len(better)} {better}", f"  same chunk, lower rank (still in excerpts): {len(down)} {down}",
 f"  average excerpt chars {avg(b)} -> {avg(a)}",
 f"127 text cases: all facts {sum(v['s']==1 for v in rb.values())} -> {sum(v['s']==1 for v in ra.values())}; worse {len(rw)} {rw}; better {len(rbt)} {rbt}; avg chars {avg(rb)} -> {avg(ra)}",
 f"new state cases: {len(na)}; chunk (state card or table) {sum(v['ok'] for v in nb.values())} -> {sum(v['ok'] for v in na.values())}; facts {sum(v['facts'] for v in nb.values())} -> {sum(v['facts'] for v in na.values())}"]
for k, v in na.items():
    if not (v['ok'] and v['facts']): lines.append(f"  new miss {k}: {v}")
open(f'{H}/retr_compare_p{P}.txt', 'w').write('\n'.join(lines) + '\n'); print('\n'.join(lines))
