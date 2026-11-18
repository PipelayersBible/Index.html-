import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# feat_laidstats: a gap over 60 min between two mark times (lunch) is left out of the time, so the pipes marked at
# the end of that gap must be left out of the count too: their laying time is not in `ms`.
rep("""      for (let k = 1; k < times.length; k++) { const g = times[k] - times[k - 1] - pbBrkOverlap(BK, times[k - 1], times[k]); if (g > 0 && g <= PB_LS_GAP) ms += g; }
      if (sticks >= 1 && ms > 0) avg = ms / sticks;""",
    """      const skipT = new Set(); /* bughunt grade 04: mark times that end a dropped gap */
      for (let k = 1; k < times.length; k++) { const g = times[k] - times[k - 1] - pbBrkOverlap(BK, times[k - 1], times[k]); if (g > 0 && g <= PB_LS_GAP) ms += g; else if (g > PB_LS_GAP) skipT.add(times[k]); }
      if (skipT.size) sticks = own.filter(i => S.laid[i] > tF && S.laid[i] <= tL && !skipT.has(S.laid[i]) && (noLay ? !!S.rows[i] : PB_LS_STICK.test(String((S.rows[i] && S.rows[i].layoutKind) || '')))).length;
      if (sticks >= 1 && ms > 0) avg = ms / sticks;""")
open(out, "w", encoding="utf-8").write(s)

