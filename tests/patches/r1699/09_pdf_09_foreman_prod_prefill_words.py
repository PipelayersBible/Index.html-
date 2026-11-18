import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 09: the run PDF called every foreman quantity "typed by the foreman", but since prodfill (Nov 6) Pipe installed,
# Excavated and Backfill are pre-filled from the laid marks and saved as shown when the foreman taps Save Production
# (rig: only Pipe installed typed; Excavated 100 and Backfill 100 printed as typed). Say what the record can support.
rep("""intro: 'Quantities typed by the foreman for this session (today\\u2019s work, not a running total).' });""",
    """intro: 'Quantities saved by the foreman for this session (today\\u2019s work, not a running total). Pipe installed, excavated and backfill feet can be pre-filled by the app from the laid marks; the record does not say which boxes were typed and which were left as pre-filled.' }); /* audit pdfs 09 */""")
open(out, 'w', encoding='utf-8').write(s)
