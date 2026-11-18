import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt tonight 02: the crossing check measures to the same TOP as the grade sheet (BOP + real OD, r16.90). A record
# without an OD (locked before r16.90) keeps INV + size + wall, as its own grade sheet does.
rep("""        o.our = { inv, bop: wt !== null ? inv - wt : null, top: wt !== null && idf !== null ? inv + idf + wt : null };""",
    """        o.our = { inv, bop: wt !== null ? inv - wt : null, top: wt !== null && idf !== null ? (typeof p.odIn === 'number' && p.odIn > 0 ? inv - wt + p.odIn / 12 : inv + idf + wt) : null };""")
open(out, 'w', encoding='utf-8').write(s)
