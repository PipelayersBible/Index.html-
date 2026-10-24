#!/usr/bin/env python3
"""usage: python3 build_live.py LIVE_INDEX SITE_DIR
From Oct 23 (another session edits the repo's index.html directly), builds start from the LIVE index.html (already the
self-hosted form: localStorage, full page). This makes SITE_DIR/index.html (as given), SITE_DIR/app.html (the
instrumented test copy) and SITE_DIR/ex_build.js (the main script, syntax-checked), exactly like build_variant.py's
outputs, with no storage rewrite and no page wrapper."""
import sys, os, re, subprocess, shutil
src, site = sys.argv[1], sys.argv[2]
os.makedirs(site, exist_ok=True)
c = open(src, encoding='utf-8').read()
assert 'window.storage' not in c, 'this is a core (window.storage) file, not the live one'
assert c.lstrip().startswith('<!DOCTYPE html>'), 'not the live page'
idx = os.path.join(site, 'index.html')
if os.path.abspath(src) != os.path.abspath(idx): shutil.copyfile(src, idx)
r = subprocess.run([sys.executable, '/home/claude/test/instrument.py', idx, os.path.join(site, 'app.html')], capture_output=True, text=True)
if r.returncode: print(r.stdout, r.stderr); sys.exit(1)
scripts = re.findall(r'<script>(.*?)</script>', c, re.S)
open(os.path.join(site, 'ex_build.js'), 'w', encoding='utf-8').write(max(scripts, key=len))
r = subprocess.run(['node', '--check', os.path.join(site, 'ex_build.js')], capture_output=True, text=True)
print('syntax OK' if r.returncode == 0 else 'SYNTAX ERROR\n' + r.stderr)
# r15.28 lesson: every inline script, not only the main one (the crash reporter's <script> once failed to parse unnoticed)
bad = 0
for i, sc in enumerate(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', c, re.S)):
    fn = os.path.join(site, '_chk%d.js' % i); open(fn, 'w', encoding='utf-8').write(sc)
    rr = subprocess.run(['node', '--check', fn], capture_output=True, text=True); os.remove(fn)
    if rr.returncode: bad += 1; print('SYNTAX ERROR in inline script %d\n' % i + rr.stderr[:600])
print('all inline scripts OK' if not bad else '%d inline script(s) BROKEN' % bad)
if bad or r.returncode: sys.exit(1)
