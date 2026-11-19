#!/usr/bin/env python3
"""speed2 #53: the release build. The one-file source (index.html, as patched and tested) stays as it is; this makes
the page that is published, smaller:

  python3 build.py <source index.html> <out dir> [--hooks]

  1. pdf.js + its worker and jsPDF + AutoTable (inert text blocks) go to <out>/pbx/<name>-<sha256[:12]>.js, verbatim
     (a part never changes under a name, so phones keep it across releases); the block stays, empty, naming its file
     (data-pb-src; jsPDF also data-pb-now: read into the page right after load). 05_lazy_parts.py reads them.
  2. every executable inline <script> is minified by esbuild: whitespace, comments and syntax only (NO renaming, so
     function names stay readable in crash reports), target es2020 (the source already needs ES2020: it uses ??),
     charset utf8. The ES5 boot watchdog (first script) is left exactly as written.
  3. JSON blocks (toolbox talks) are written compactly; CSS blocks lose whitespace and comments (esbuild, no rewrites).
  4. two statements tools read from the page text keep their source form: the build stamp (PB_APP_BUILD = '...';
     the service worker, Settings, the test runner) and the crew-notice version.
  5. checks: every minified script passes node --check, no script body contains "</script", the number of scripts and
     styles is unchanged, the parts' fingerprints match their files. Prints the sizes (raw and gzip -9).
--hooks: the test runner's hooks (tests/runner/hooks.js) are put into the source first, so the audit suites can run on
the minified page (the shipped build is made without them).
Needs esbuild (PATH, or $ESBUILD) and node.
"""
import sys, os, re, json, gzip, hashlib, subprocess, shutil, tempfile

SRC, OUT = sys.argv[1], sys.argv[2]
HOOKS = '--hooks' in sys.argv[3:]
ESBUILD = os.environ.get('ESBUILD') or shutil.which('esbuild') or os.path.expanduser('~/.npm-global/bin/esbuild')
assert ESBUILD and os.path.exists(ESBUILD), 'esbuild not found (set $ESBUILD)'
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))

s = open(SRC, encoding='utf-8').read()
src_len = len(s.encode('utf-8'))
if HOOKS:
    js = "const {addHooks}=require(process.argv[1]);const fs=require('fs');const h=addHooks(fs.readFileSync(0,'utf8'));h.warnings.forEach(w=>console.error(w));process.stdout.write(h.html);"
    s = subprocess.run(['node', '-e', js, os.path.join(REPO, 'tests/runner/hooks.js')], input=s.encode('utf-8'), capture_output=True, check=True).stdout.decode('utf-8')

os.makedirs(os.path.join(OUT, 'pbx'), exist_ok=True)

# ---- 1. parts to their own files ----
PARTS = [('pbJsPdfSrc', 'jspdf-2.5.1', True), ('pbJsPdfAtSrc', 'jspdf-autotable-3.5.25', True),
         ('pbPdfjsLibSrc', 'pdfjs-3.5.141', False), ('pbPdfjsWorkerSrc', 'pdfjs-worker-3.5.141', False)]
parts = []
for pid, name, now in PARTS:
    m = re.search(r'<script type="text/plain" id="' + pid + r'">(.*?)</script>', s, re.S)
    assert m, 'part not found: ' + pid
    body = m.group(1)
    data = body.encode('utf-8')
    fn = '%s-%s.js' % (name, hashlib.sha256(data).hexdigest()[:12])
    open(os.path.join(OUT, 'pbx', fn), 'wb').write(data)
    tag = '<script type="text/plain" id="%s" data-pb-src="pbx/%s"%s></script>' % (pid, fn, ' data-pb-now="1"' if now else '')
    s = s[:m.start()] + tag + s[m.end():]
    parts.append((fn, len(data), len(gzip.compress(data, 9))))

# ---- 2/3. minify ----
def esbuild(code, loader, extra):
    r = subprocess.run([ESBUILD, '--loader=' + loader, '--charset=utf8', '--log-level=error'] + extra, input=code.encode('utf-8'), capture_output=True)
    if r.returncode != 0:
        raise SystemExit('esbuild failed: ' + r.stderr.decode('utf-8', 'replace')[:2000])
    return r.stdout.decode('utf-8')

out, pos, n_js, n_css, first = [], 0, 0, 0, True
tags = list(re.finditer(r'<(script|style)(\s[^>]*)?>(.*?)</\1>', s, re.S))
counts = {'script': 0, 'style': 0}
for m in tags:
    kind, attrs, body = m.group(1), m.group(2) or '', m.group(3)
    counts[kind] += 1
    new = body
    if kind == 'script':
        is_first = first; first = False
        typ = re.search(r'type="([^"]+)"', attrs)
        typ = typ.group(1) if typ else ''
        if 'src=' in attrs or not body.strip():
            pass
        elif typ == 'application/json':
            new = json.dumps(json.loads(body), separators=(',', ':'), ensure_ascii=False).replace('</', '<\\/')
        elif typ in ('', 'text/javascript') and not is_first:
            new = esbuild(body, 'js', ['--minify-whitespace', '--minify-syntax', '--target=es2020', '--legal-comments=none'])
            n_js += 1
    else:
        new = esbuild(body, 'css', ['--minify-whitespace', '--legal-comments=none'])
        n_css += 1
    out.append(s[pos:m.start(3)]); out.append(new); pos = m.end(3)
out.append(s[pos:])
b = ''.join(out)

# ---- 4. statements read from the page text keep their source form ----
def keep(pattern, repl, what):
    global b
    n = len(re.findall(pattern, b))
    assert n == 1, (what, n)
    b = re.sub(pattern, repl, b)
keep(r'PB_APP_BUILD="([^"\\]{1,60})"', lambda m: "PB_APP_BUILD = '" + m.group(1) + "'", 'build stamp')
keep(r'localStorage\.setItem\("pbCrewNotice:"\+uid,"([^"\\]{1,20})"\)', lambda m: "localStorage.setItem('pbCrewNotice:' + uid, '" + m.group(1) + "')", 'crew notice')

# ---- 5. checks ----
tags2 = list(re.finditer(r'<(script|style)(\s[^>]*)?>(.*?)</\1>', b, re.S))
c2 = {'script': 0, 'style': 0}
tmp = tempfile.mkdtemp()
for i, m in enumerate(tags2):
    c2[m.group(1)] += 1
    if m.group(1) == 'script':
        body, attrs = m.group(3), m.group(2) or ''
        assert '</script' not in body.lower(), 'a script body contains </script'
        typ = re.search(r'type="([^"]+)"', attrs)
        if body.strip() and (not typ or typ.group(1) in ('text/javascript',)):
            f = os.path.join(tmp, 's%d.js' % i); open(f, 'w', encoding='utf-8').write(body)
            r = subprocess.run(['node', '--check', f], capture_output=True)
            assert r.returncode == 0, ('node --check failed', i, r.stderr.decode()[:400])
assert c2 == counts, ('script/style count changed', counts, c2)
shutil.rmtree(tmp)
for fn, raw, gz in parts:
    data = open(os.path.join(OUT, 'pbx', fn), 'rb').read()
    assert hashlib.sha256(data).hexdigest()[:12] in fn

open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(b)
bb = b.encode('utf-8')
sg = len(gzip.compress(s.encode('utf-8') if False else open(SRC, 'rb').read(), 9))
print('source   %9d bytes, gzip %8d' % (src_len, sg))
print('page     %9d bytes, gzip %8d   (%d scripts and %d styles minified)' % (len(bb), len(gzip.compress(bb, 9)), n_js, n_css))
for fn, raw, gz in parts:
    print('pbx/%-48s %9d bytes, gzip %8d' % (fn, raw, gz))
print('OK', os.path.join(OUT, 'index.html'))
