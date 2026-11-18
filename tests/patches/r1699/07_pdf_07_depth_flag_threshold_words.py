import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 07: since r16.79 a run is depth-flagged at 4 ft when the phone is in Washington or doesn't know the state
# (caveFt 4), but the run PDF still said "WARNING: trench 5 ft or deeper indicated by stake data ... (OSHA 29 CFR 1926.652)"
# and the Job Summary "(5 ft or deeper)". A 4.2 ft trench was recorded as 5 ft+. The PDF now prints the run's own rule
# (the same words the Results screen uses) and the Job Summary counts without a wrong number.
rep("""    if (e.depthFlagged) alerts.push('WARNING: trench 5 ft or deeper indicated by stake data. A protective system is required (OSHA 29 CFR 1926.652).');""",
    """    if (e.depthFlagged) alerts.push('WARNING: ' + (e.caveFt === 4 || e.caveFt === 5 ? pbDepthFlagText(e) : 'trench 5 ft or deeper indicated by stake data. A protective system is required (OSHA 29 CFR 1926.652).')); /* audit pdfs 07: the run's own threshold */""")
rep("""' run session report(s) had a trench depth flag (5 ft or deeper).');""",
    """' run session report(s) had a trench depth flag (' + (s.runs.some(e => e.depthFlagged && e.caveFt === 4) ? '4 or 5 ft or deeper, by the rule each run used' : '5 ft or deeper') + ').'); /* audit pdfs 07 */""")
open(out, 'w', encoding='utf-8').write(s)
