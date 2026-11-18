import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt tonight 05: the reference page states the TOP the grade sheet uses since r16.90.
rep("""<span class="k">TOP (Top of Pipe)</span><br>Elevation: INV + pipe ID + wall thickness. Engineer's/Architect's Rod reading: INV reading − (ID + wall thickness) (reads LOWER, not higher).</div>""",
    """<span class="k">TOP (Top of Pipe)</span><br>Elevation: BOP + the pipe's outside diameter (OD), which is INV − wall thickness + OD. The app uses the real OD for the run's pipe type and size (15" SDR 35 is 15.30" OD, 12" ductile iron 13.20"); with no OD on file for the type or size, OD = pipe size + 2 × wall thickness. Engineer's/Architect's Rod reading: INV reading + wall thickness − OD (reads LOWER, not higher).</div>""")
open(out, 'w', encoding='utf-8').write(s)
