import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# r16.77 AI-read record: with the Architect's rod an elevation box is ft / in / 1-16 in, so the app itself rounds what
# the AI read by up to 1/32 in (0.0026 ft). That is not "changed by hand": the tolerance follows the box.
rep("""        const same = f.kind === 'elev' || f.kind === 'num' ? (now !== null && Math.abs(Number(now) - Number(f.val)) < 0.0005) : String(now == null ? '' : now) === String(f.val);""",
    """        const tol = f.kind === 'elev' && document.getElementById(f.id + '_ft') ? 1 / 12 / 32 + 0.0006 : 0.0005; /* bughunt grade 03: a ft-in box holds the nearest 1/16 in (now is rounded to 0.001) */
        const same = f.kind === 'elev' || f.kind === 'num' ? (now !== null && Math.abs(Number(now) - Number(f.val)) < tol) : String(now == null ? '' : now) === String(f.val);""")
open(out, "w", encoding="utf-8").write(s)

