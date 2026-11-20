# test build: the four PDF parts moved to pbx/ files exactly as tests/r1708/speed2/build/build.py step 1 does (no minify)
import sys, os, re, hashlib
src, outdir, name = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(src, encoding='utf-8').read()
os.makedirs(os.path.join(outdir, 'pbx'), exist_ok=True)
for pid, nm, now in [('pbJsPdfSrc', 'jspdf-2.5.1', True), ('pbJsPdfAtSrc', 'jspdf-autotable-3.5.25', True), ('pbPdfjsLibSrc', 'pdfjs-3.5.141', False), ('pbPdfjsWorkerSrc', 'pdfjs-worker-3.5.141', False)]:
    m = re.search(r'<script type="text/plain" id="' + pid + r'">(.*?)</script>', s, re.S); assert m, pid
    data = m.group(1).encode('utf-8'); fn = '%s-%s.js' % (nm, hashlib.sha256(data).hexdigest()[:12])
    open(os.path.join(outdir, 'pbx', fn), 'wb').write(data)
    s = s[:m.start()] + '<script type="text/plain" id="%s" data-pb-src="pbx/%s"%s></script>' % (pid, fn, ' data-pb-now="1"' if now else '') + s[m.end():]
open(os.path.join(outdir, name), 'w', encoding='utf-8').write(s)
print('ok', name, len(s))
