import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 12: daily report Permits "Status" cell: the close-out time was printed bare right under the emergency times,
# so it read as another emergency line ("... 11:19 PM to 11:20 PM / 11:20 PM"). Label it.
rep("""+ (p.closed_at ? '\\n' + t(p.closed_at) : '')]) });""", """+ (p.closed_at ? '\\nClosed out ' + t(p.closed_at) : '')]) }); /* audit pdfs 12 */""")
open(out, 'w', encoding='utf-8').write(s)
