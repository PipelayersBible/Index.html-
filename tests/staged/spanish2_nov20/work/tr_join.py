#!/usr/bin/env python3
"""tr_join.py <batch>   keys_<batch>.json + es_<batch>.txt -> ../strings_p2_<batch>.py
es file lines:  N|spanish     N!|spanish (safety-critical)     N|=  (stays as in English)     # comment"""
import json, sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); batch = sys.argv[1]
keys = json.load(open(os.path.join(HERE, 'keys_%s.json' % batch)))
out = ["# Spanish strings, phase 2, batch '%s'. Made by work/tr_join.py from work/keys_%s.json + work/es_%s.txt; from here on edit THIS file.\n" % (batch, batch, batch)]
n = 0; last = None; used = set()
for ln in open(os.path.join(HERE, 'es_%s.txt' % batch), encoding='utf-8'):
    ln = ln.rstrip('\n')
    if not ln.strip() or ln.startswith('#'): continue
    m = re.match(r'^(\d+)(!?)\|(.*)$', ln)
    if not m: raise SystemExit('bad line: ' + ln[:80])
    i = int(m.group(1)); sc, kind, k = keys[i]
    if i in used: raise SystemExit('twice: %d' % i)
    used.add(i)
    es = m.group(3).strip(); es = k if es == '=' else es
    if sc != last: out.append("\nSCREEN(%r)" % ('p2_' + sc)); last = sc
    out.append("S(%s, %s%s)" % (json.dumps(k, ensure_ascii=False), json.dumps(es, ensure_ascii=False), ', safety=1' if m.group(2) else '')); n += 1
open(os.path.join(HERE, '..', 'strings_p2_%s.py' % batch), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('%s: %d of %d keys translated; skipped: %s' % (batch, n, len(keys), [i for i in range(len(keys)) if i not in used][:40]))
