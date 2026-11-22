# mk_overlay.py <rev>: the consolidation as a test-function overlay (replace by old id, add new, remove retired) -> work/overlay.json
import json, sys
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21/tools')
from build_after import build, RETIRE
live, after = build()
L = {r['c']['id']: r for r in live}
rep, add = {}, []
for r in after:
    if r['o_old'] is None: add.append({'lib': r['lib'], 'chunk': r['c']}); continue
    old = next(x for x in live if x['o'] == r['o_old'])
    if old['c'] != r['c'] or old['lib'] != r['lib']: rep[old['c']['id']] = {'lib': r['lib'], 'chunk': r['c']}
o = {'rev': sys.argv[1], 'base': 'b3e91f6c47d2-a9af05ee', 'replace': rep, 'add': add, 'remove': RETIRE}
json.dump(o, open('/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21/work/overlay.json', 'w'), ensure_ascii=False)
print(f'overlay {sys.argv[1]}: replace {len(rep)}, add {len(add)}, remove {len(RETIRE)}')
