import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
a = "if (/\\bWYE\\b/.test(d) || /(?:^|\\s)Y(?=\\s|$)/.test(d)) return { type: 'wye',"
assert s.count(a) == 1
s = s.replace(a, "if (/\\bWYE\\b/.test(d) || /(?:^|[^A-Z])Y(?![A-Z])/.test(d)) return { type: 'wye', /* r16.57: Y = wye: 8X6Y, 6\"Y, Y-LAT, (Y), Y. */")
s = s.replace("const PB_APP_BUILD = 'r16.56 · 2026-11-16';", "const PB_APP_BUILD = 'r16.57 · 2026-11-16';")
assert "r16.57 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
