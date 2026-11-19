#!/usr/bin/env python3
# office3 #39: a typed check mark or X prints on PDFs exactly as typed.
# The PDF font (Liberation Sans subset, PB_RPT_FONT) had no check-mark glyphs, so every PDF rewrote U+2713/U+2714 as
# "yes" and U+2717/U+2718 as "no": "Compaction test (X) retest Fri" printed "Compaction test no retest Fri". Tommy: both
# marks can mean "checked", so never turn them into words; print what was typed.
# This adds four glyphs to both embedded fonts (regular and bold): U+2713 CHECK MARK, U+2714 HEAVY CHECK MARK,
# U+2717 BALLOT X, U+2718 HEAVY BALLOT X. They are simple outlines drawn here (no glyphs copied from another font, so no
# new font licence is involved), sized to the capital height. The coverage list gets the four code points and the
# rewrite to yes/no is removed. Other symbols keep their current handling.
# Needs fontTools when the patch is applied (python3 -c "import fontTools"); the output is deterministic (no timestamp).
import sys, re, io, base64
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

def clockwise(pts):
    a = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    return pts if a < 0 else list(reversed(pts))  # TrueType outer contours run clockwise (negative signed area)

def check(heavy):
    if heavy: return [(110, 760), (330, 930), (560, 610), (1180, 1440), (1400, 1280), (560, 120)]
    return [(150, 720), (290, 830), (560, 470), (1210, 1360), (1350, 1250), (560, 180)]

def xmark(heavy):
    L, R, B, T, cx, cy = 230, 1170, 120, 1300, 700, 710
    d = 170 if heavy else 105
    return [(L, T - d), (L + d, T), (cx, cy + d), (R - d, T), (R, T - d), (cx + d, cy), (R, B + d), (R - d, B), (cx, cy - d), (L + d, B), (L, B + d), (cx - d, cy)]

GLYPHS = [('uni2713', 0x2713, check(False)), ('uni2714', 0x2714, check(True)), ('uni2717', 0x2717, xmark(False)), ('uni2718', 0x2718, xmark(True))]
ADV = 1500

def add_marks(b64):
    f = TTFont(io.BytesIO(base64.b64decode(b64)), recalcTimestamp=False)
    order = list(f.getGlyphOrder())
    glyf, hmtx = f['glyf'], f['hmtx']
    for name, cp, pts in GLYPHS:
        assert name not in order, name
        pen = TTGlyphPen(None)
        pts = clockwise(pts)
        pen.moveTo(pts[0])
        for p in pts[1:]: pen.lineTo(p)
        pen.closePath()
        g = pen.glyph()
        glyf.glyphs[name] = g
        order.append(name)
        hmtx.metrics[name] = (ADV, min(p[0] for p in pts))
    f.setGlyphOrder(order)
    glyf.glyphOrder = order
    f['maxp'].numGlyphs = len(order)
    for t in f['cmap'].tables:
        if t.isUnicode():
            for name, cp, _ in GLYPHS: t.cmap[cp] = name
    out = io.BytesIO(); f.save(out)
    return base64.b64encode(out.getvalue()).decode('ascii')

i = s.find('const PB_RPT_FONT = {')
assert i > 0
for key in ('normal', 'bold'):
    m = re.compile(key + r": '([A-Za-z0-9+/=]+)'").search(s, i)
    assert m and m.start() - i < 200000, key
    s = s[:m.start(1)] + add_marks(m.group(1)) + s[m.end(1):]

# the coverage list (what pbPdfFontCovers lets through)
rep("""[8592, 8595], [8722, 8722]],""", """[8592, 8595], [8722, 8722], [10003, 10004], [10007, 10008]], /* office3 #39: check marks and ballot X */""")
# no more rewriting the marks into words
# (only in pbPdfSafeFor, the embedded-font path: its line starts "s = s.replace("; pbPdfSafe, the no-font fallback, keeps
#  the words because the built-in PDF font can't draw the marks)
line_start = s.index("    s = s.replace(/\\u2192/g, 'to')")
line_end = s.index('\n', line_start)
line = s[line_start:line_end]
mk = ".replace(/\\u2713|\\u2714/g, 'yes').replace(/\\u2717|\\u2718/g, 'no')"
assert line.count(mk) == 1 and s.count("    s = s.replace(/\\u2192/g, 'to')") == 1
s = s[:line_start] + line.replace(mk, '') + ' /* office3 #39: check marks and X print as typed (the font has them) */' + s[line_end:]

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
