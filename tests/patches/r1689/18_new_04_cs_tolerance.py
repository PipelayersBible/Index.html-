import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt (Nov 17): a check shot is judged on the value it prints (to 0.01 ft). Before, 1/4 in (0.0208 ft) printed as
# "0.02 ft LOW" and was Off Grade while "On grade (0.02 ft low)" was the tolerance: the same number both ways.
rep(r"""  function pbCsResult(diff) { const a = Math.abs(diff); if (a <= PB_CS_TOL + 1e-9) return""",
    r"""  function pbCsResult(diff) { const a = Math.round(Math.abs(diff) * 100 + 1e-7) / 100; if (a <= PB_CS_TOL + 1e-9) return""")
rep(r"""(diff > 0 ? 'HIGH' : 'LOW') + ' (' + pbCsIn(a) + ')' }; }""", r"""(diff > 0 ? 'HIGH' : 'LOW') + ' (' + pbCsIn(Math.abs(diff)) + ')' }; }""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
