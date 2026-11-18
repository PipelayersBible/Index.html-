import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt tonight 09: pbShowModal shows its message as text, so the stake's name is not HTML-escaped (6" LAT, not 6&quot; LAT).
rep("""Shoot the rod on ' + escapeHtml(getPointLabel(tgt, tgt === 'end' ? 'the End stake' : 'one more stake')) + '""",
    """Shoot the rod on ' + getPointLabel(tgt, tgt === 'end' ? 'the End stake' : 'one more stake') + '""")
open(out, 'w', encoding='utf-8').write(s)
