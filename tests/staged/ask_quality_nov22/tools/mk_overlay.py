# mk_overlay.py <rev>: the library change as a test-function overlay (replace by id, add new, remove retired) -> src_next/kb_overlay.ts
import json, sys, shutil, os
sys.path.insert(0, '/home/claude/index.html-/tests/staged/ask_quality_nov22/tools')
import build_lib as B
live, after = B.build()
L = {r['c']['id']: r for r in live}
rep, add = {}, []
for r in after:
    cid = r['c']['id']
    if cid not in L: add.append({'lib': r['lib'], 'chunk': r['c']}); continue
    if L[cid]['c'] != r['c']: rep[cid] = {'lib': r['lib'], 'chunk': r['c']}
o = {'rev': sys.argv[1], 'base': 'b3e91f6c47d2-a9e67ec6', 'replace': rep, 'add': add, 'remove': B.RETIRE}
W = '/home/claude/index.html-/tests/staged/ask_quality_nov22/work'
json.dump(o, open(W + '/overlay.json', 'w'), ensure_ascii=False)
if os.path.exists(W + '/src_next'): shutil.rmtree(W + '/src_next')
shutil.copytree(W + '/src_q', W + '/src_next')
open(W + '/src_next/kb_overlay.ts', 'w').write('// ask_quality_nov22: the library change laid over the live rows on the test function only (ai-next). Live builds carry an empty overlay.\nexport const OVERLAY = ' + json.dumps(o, ensure_ascii=False) + ';\n')
print(f'overlay {sys.argv[1]}: replace {len(rep)}, add {len(add)}, remove {len(B.RETIRE)}')
