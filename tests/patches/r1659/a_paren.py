import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
a = "    if (sure(se) && se.feet != null && Number.isFinite(seFeet)"
assert s.count(a) == 1
s = s.replace(a, "    if (!sure(se) && /^\\s*\\(\\s*\\d{1,5}(?:\\.\\d{1,3})?\\s*\\)\\s*$/.test(String(se.as_written || '')) && se.feet != null && Number.isFinite(seFeet) && seWritten !== null && Math.abs(seWritten - Math.abs(seFeet)) < 0.002) se.conf = 'high'; /* r16.59: a number in parentheses on the hub lath is the hub elevation */\n" + a)
s = s.replace("const PB_APP_BUILD = 'r16.58 · 2026-11-16';", "const PB_APP_BUILD = 'r16.59 · 2026-11-16';")
assert "r16.59 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
