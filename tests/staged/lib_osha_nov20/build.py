# lib_osha_nov20 / build.py - writes lib_osha_fed.jsonl, lib_osha_sp.jsonl, reports and staged SQL (NOT applied). Run: python3 build.py
import sys, json
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
from lib_kb import Batch
import kb_fed, kb_states
live = json.load(open('/home/claude/index.html-/tests/staged/ask_state_nov20/work/kb_live2.json'))
existing = {c['id'] for l in live.values() for c in l}
for name, coll, chunks in (('lib_osha_fed', 'osha', kb_fed.FED), ('lib_osha_sp', 'sp', kb_states.ST)):
    B = Batch(name, collection=coll)
    for c in chunks: B.add(**c)
    B.write(existing_ids=existing)
    core = sum(1 for c in chunks if c['tier'] == 'core')
    print(name, len(chunks), 'chunks,', core, 'core,', len(chunks) - core, 'shelf')
