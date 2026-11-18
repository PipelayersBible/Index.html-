import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# Run report PDF, at-a-glance strip: "Inverts, start / end (ft)" printed summary.startInv / endInv, which for an
# engineer's or architect's rod are the INV ROD READINGS (7.97 / 6.17), not elevations. Print the invert elevations
# (summary.startInvElevFt / endInvElevFt); a Lenker rod's startInv already is the elevation.
rep("""        ['Inverts, start / end (ft)', s ? (s.startInv !== undefined ? s.startInv : '—') + ' / ' + (s.endInv !== undefined ? s.endInv : '—') : '—'],""",
    """        ['Invert elev., start / end (ft)', s ? ((v, d) => typeof v === 'number' && isFinite(v) ? fmt(v, 2) : (e.rodUnit === 'lenker' && d !== undefined ? d : '—'))(s.startInvElevFt, s.startInv) + ' / ' + ((v, d) => typeof v === 'number' && isFinite(v) ? fmt(v, 2) : (e.rodUnit === 'lenker' && d !== undefined ? d : '—'))(s.endInvElevFt, s.endInv) : '—'], /* bughunt grade 01: elevations, never rod readings */""")
open(out, "w", encoding="utf-8").write(s)

