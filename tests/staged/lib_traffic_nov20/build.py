# lib_traffic_nov20 / build.py : python3 build.py
# Writes traffic_mutcd.jsonl (federal) and traffic_tc.jsonl (states) with lib_kb.Batch, plus the staged SQL in sql/ (NOT applied).
import sys, os
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_kb import Batch
import kb_traffic_federal as FED
import kb_traffic_states as STA

B = Batch('traffic_mutcd', collection='mutcd')
for c in FED.F: B.add(**c)
B.write()
T = Batch('traffic_tc', collection='tc')
for c in STA.S: T.add(**c)
T.write()
for name, L in (('mutcd', FED.F), ('tc', STA.S)):
    core = [c for c in L if c['tier'] == 'core']
    print(name, len(L), 'chunks,', len(core), 'core,', len(L) - len(core), 'shelf; longest core', max(len(c['text']) for c in core))
