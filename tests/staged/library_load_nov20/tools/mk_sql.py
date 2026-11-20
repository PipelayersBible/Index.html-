# mk_sql.py: the merged set as lib_kb SQL for the lead (NOT applied by this job): out/sql/merged_core_NN.sql (+ precheck) for pb_ai.kb_chunks
# when the library goes live, out/sql/merged_shelf_NN.sql for pb_ai.kb_shelf. The 5 in-place edits of live chunks go as "supersedes itself".
import json, os, sys
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(os.path.dirname(H), 'library_arch_nov20')); import lib_kb
L = lambda f: [json.loads(l) for l in open(os.path.join(H, 'out', f)) if l.strip()]
core = L('core.jsonl'); edits = [dict(c, supersedes=c['id']) for c in L('edits.jsonl')]
lib_kb.lib_of = (lambda f: (lambda c: f(c) if 'kind' in c else 'field'))(lib_kb.lib_of)      # the 5 edited live chunks are all in the field library
os.makedirs(os.path.join(H, 'out/sql'), exist_ok=True)
print(lib_kb.write_sql(core + edits, 'merged_core', os.path.join(H, 'out/sql')))
print(lib_kb.write_sql(L('shelf.jsonl'), 'merged_shelf', os.path.join(H, 'out/sql'), table='pb_ai.kb_shelf'))
