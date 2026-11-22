# p1_emergency_block.py <in.html> <out.html> (emergency_nov22): the phone's instant emergency check = the server's new emergency.ts,
# pasted (src_patch/emergency.ts, `export ` dropped, indented 2). Exact once: the whole old block (live r17.15 = ask_quality_nov22
# emergency.ts) is replaced, so a base that differs is refused. Keep the two copies identical.
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
here = os.path.dirname(os.path.abspath(__file__))
def paste(f):
    ts = open(f, encoding='utf-8').read()
    return ''.join(('  ' + l[7:] if l.startswith('export ') else ('  ' + l if l.strip() else l)) for l in ts.splitlines(True))
old = paste(os.path.join(here, 'base_emergency_ask_quality.ts'))
new = paste(os.path.join(here, '..', 'src_patch', 'emergency.ts'))
p.rep(old + '  const PB_AI_EMERGENCY_RX = PB_EMG_STRONG;\n', new + '  const PB_AI_EMERGENCY_RX = PB_EMG_STRONG;\n')
p.save()
