# lib_traffic_nov20 / v2 / build_v2.py : python3 build_v2.py
# Pass 2 state cards -> v2/traffic_tc.jsonl (+ v2/sql/, v2/traffic_tc_report.txt). Leaves ../traffic_tc.jsonl alone.
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
sys.path.insert(0, HERE)
from lib_kb import Batch
import kb_traffic_states_v2 as STA
T = Batch('traffic_tc', collection='tc', out_dir=HERE)
for c in STA.S: T.add(**c)
T.write()
core = [c for c in STA.S if c['tier'] == 'core']
print('tc', len(STA.S), 'chunks,', len(core), 'core,', len(STA.S) - len(core), 'shelf; longest core', max(len(c['text']) for c in core))
