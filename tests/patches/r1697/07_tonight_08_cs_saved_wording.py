import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt tonight 08: the last EVACUATE-era order in the record-only permit (r16.90).
rep("""Try saving again once the space is evacuated.""", """Try saving it again.""")
open(out, 'w', encoding='utf-8').write(s)
