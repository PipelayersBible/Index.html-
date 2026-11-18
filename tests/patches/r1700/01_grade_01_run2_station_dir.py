import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# grade2 audit 01: Run 2+ stations ran UP from the junction when Run 1's stations go DOWN. A Run N with nothing on it
# saying which way (no End station, nothing remembered, no hub entered as a station) fell back to "up"; its start was
# already worked out from Run N-1's own direction, so its rows climbed back over Run N-1's stakes. It now continues the
# run before it, the way its start station does.
rep("""    for (const p of pbStHubs(n)) { const v = sv(p); if (v !== null) return v > s.v ? 1 : -1; }
    return 1;
  }""",
    """    for (const p of pbStHubs(n)) { const v = sv(p); if (v !== null) return v > s.v ? 1 : -1; }
    if (n > 1 && (depth || 0) < 6) return pbStDirOf(n - 1, (depth || 0) + 1); // grade2 audit 01: Run N continues the run before it
    return 1;
  }""")
open(out, "w", encoding="utf-8").write(s)
