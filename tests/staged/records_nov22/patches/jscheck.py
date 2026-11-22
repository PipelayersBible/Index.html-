# syntax-check every inline <script> of a page with node --check. python3 jscheck.py page.html
import re, sys, subprocess, tempfile, os
s = open(sys.argv[1], encoding='utf-8').read()
bad = 0
for i, m in enumerate(re.finditer(r'<script(?![^>]*type="application/(?:json|ld\+json)")(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)):
    code = m.group(1)
    if len(code.strip()) < 20: continue
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f: f.write(code); fn = f.name
    r = subprocess.run(['node', '--check', fn], capture_output=True, text=True)
    if r.returncode: bad += 1; print('SCRIPT', i, r.stderr[:800])
    os.unlink(fn)
print('scripts ok' if not bad else 'SYNTAX ERRORS: %d' % bad); sys.exit(1 if bad else 0)
