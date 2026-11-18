import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 10: the AI section said "None changed by hand after the AI read." on a run whose AI-read hub was then moved
# 2 ft by a correction after lock (and turned into an elevation point). The comparison is AI read vs value AT LOCK; say so, and
# point to the corrections when there are any.
rep("""(ch ? ' ' + pbRptPlural(ch, 'value') + ' changed by hand after the AI read.' : ' None changed by hand after the AI read.') + ' The stake photos are in the Photos section.' });""",
    """(ch ? ' ' + pbRptPlural(ch, 'value') + ' changed by hand between the AI read and the lock.' : ' None changed by hand between the AI read and the lock.') + (hist.length ? ' The Locked column is the value at lock: ' + pbRptPlural(hist.length, 'correction') + ' made after lock (see Corrections and change history) may have changed a point listed here.' : '') + ' The stake photos are in the Photos section.' }); /* audit pdfs 10 */""")
open(out, 'w', encoding='utf-8').write(s)
