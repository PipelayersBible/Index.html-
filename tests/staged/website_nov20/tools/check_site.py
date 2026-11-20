#!/usr/bin/env python3
# Static checks on the clone: internal links + anchors, one h1, title/description length, canonical, JSON-LD parses, sitemap matches pages, banned words.
import sys, os, re, json, html
root = sys.argv[1]; bad = []; pages = {}
for d, _, fs in os.walk(root):
    if '.git' in d: continue
    for f in fs:
        if f.endswith('.html'):
            p = os.path.join(d, f); rel = '/' + os.path.relpath(p, root).replace('index.html', ''); pages[rel] = open(p, encoding='utf-8').read()
ids = {u: set(re.findall(r'\sid="([^"]+)"', s)) for u, s in pages.items()}
for u, s in pages.items():
    for h in re.findall(r'(?:href|src)="([^"]+)"', s):
        if h.startswith(('http', 'mailto:', 'tel:', 'sms:', 'data:')): continue
        path, _, frag = h.partition('#'); path = path or u
        if path.startswith('/'):
            fp = os.path.join(root, path.lstrip('/'))
            if path.endswith('/'): fp = os.path.join(fp, 'index.html')
            if not os.path.exists(fp): bad.append((u, 'broken', h))
            elif frag and path in ids and frag not in ids[path]: bad.append((u, 'no anchor', h))
        else: bad.append((u, 'relative link', h))
    if u == '/404.html': continue
    t = re.search(r'<title>(.*?)</title>', s).group(1); t = html.unescape(t)
    dsc = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', s).group(1))
    can = re.search(r'<link rel="canonical" href="([^"]*)"', s).group(1)
    if len(t) > 66: bad.append((u, 'title long', len(t)))
    if not 70 <= len(dsc) <= 165: bad.append((u, 'description length', len(dsc)))
    if can != 'https://pipelayersbible.com' + u: bad.append((u, 'canonical', can))
    if len(re.findall(r'<h1[ >]', s)) != 1: bad.append((u, 'h1 count'))
    for m in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', s, re.S):
        try: json.loads(m)
        except Exception as e: bad.append((u, 'json-ld', str(e)))
    body = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
    for w in ['one-tap emergency call', 'crew management', 'pipe contractor', 'tamper-proof', 'OSHA-compliant', 'OSHA compliant', '—', 'court-ready', 'guarantee']:
        if w.lower() in body.lower(): bad.append((u, 'banned wording', w))
sm = set(re.findall(r'<loc>https://pipelayersbible.com(.*?)</loc>', open(os.path.join(root, 'sitemap.xml')).read()))
want = set(pages) - {'/404.html'}
if sm != want: bad.append(('sitemap', sorted(sm ^ want)))
print(len(pages), 'pages');
for b in bad: print('BAD', b)
print('OK' if not bad else 'FAILED')
