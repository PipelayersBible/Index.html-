import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# critic 01: the pre-lock review said "No warnings — data looks clean." even when a stake value is a full foot wrong
# (a wrong cut on the end stake still gives a believable slope, and nothing can catch it without a second rod shot).
# The line now says what was checked and what was not.
rep("""      html += `<div class="pb-clean">No warnings — data looks clean.</div>`;""",
    """      html += `<div class="pb-clean">No warnings from the app’s checks. They can’t tell if a stake was read or typed wrong: compare the numbers above with the stakes.</div>`;""")
open(out, 'w', encoding='utf-8').write(s)
