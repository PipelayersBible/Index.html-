import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt tonight 06: the low-slope note never shows the slope rounded up to (or past) the minimum it is under.
rep("""text: `${Math.abs(s.slopePct).toFixed(2)}% from""",
    """text: `${(() => { const a = Math.abs(s.slopePct); let d = 2; while (d < 4 && +a.toFixed(d) >= min - 1e-9) d++; return a.toFixed(d); })()}% from""")
open(out, 'w', encoding='utf-8').write(s)
