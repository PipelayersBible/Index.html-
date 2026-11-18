import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 04: the permit closeout PDF promised "The app keeps closed permits indefinitely." The Terms say the opposite
# (s.9: keeping required records is the company's responsibility; s.16: after an account closes "we may delete your data"),
# and a permit that never backed up lives only on the phone. The PDF now says what is true.
rep("""The app keeps closed permits indefinitely.']""",
    """Keeping it for that period is the company\\u2019s responsibility: the app keeps a closed permit in Records on the phone that made it and, once backed up, in the company account while the account is open (see the Terms). Keep your own copy.']""")
open(out, 'w', encoding='utf-8').write(s)
