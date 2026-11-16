import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
rep("""    if (sg.isStart) return 'Start point';
    if (sg.isEnd) return 'End point';
    const text = [v.offset, v.line, th.line, got.other].filter(Boolean).join(' ');
    const up = text.toUpperCase().replace(/^\\s*\\d+(?:\\.\\d+)?\\s*\\/\\s*[A-Z]+\\b/, ' ');
""", """    const text = [v.offset, v.line, th.line, got.other].filter(Boolean).join(' ');
    const up = text.toUpperCase().replace(/^\\s*\\d+(?:\\.\\d+)?\\s*\\/\\s*[A-Z]+\\b/, ' ');
    if (sg.isStart || sg.isEnd) { /* r16.51: the stake's MH or lateral number names the run's ends */
      const m0 = /\\b(?:SS|SD|STM|SAN)?(?:MH|MANHOLE)\\s?-?\\s?#?\\s?(\\d{1,4}[A-Z]?)\\b/.exec(up); if (m0) return 'MH-' + m0[1];
      const l0 = /\\bLAT(?:ERAL)?\\s?-?\\s?#?\\s?(\\d{1,4}[A-Z]?)\\b/.exec(up); if (l0) return 'LAT-' + l0[1];
      return sg.isStart ? 'Start point' : 'End point';
    }
""")
s = s.replace("const PB_APP_BUILD = 'r16.50 · 2026-11-15';", "const PB_APP_BUILD = 'r16.51 · 2026-11-16';")
assert "r16.51 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
