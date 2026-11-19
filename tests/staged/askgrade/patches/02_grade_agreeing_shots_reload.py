import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# Decision #43 (Nov 18): Edit Run Data keeps rod shots that agree as field shots. The record kept how the HI was given and
# the shots typed (hiSrc) only when the readings disagreed (0.01 ft or more after rounding). Shots that agreed within
# 0.005 ft, or a single shot, were dropped on reload: the form came back with the HI typed in (the higher HI of the
# agreeing pair: 110.003 instead of 110) and every reading faded (predicted), so the Shot column and the verified marks
# were lost the next time the run was locked. Now any run with a field shot keeps them; pbHdRestoreSrc still checks that
# the form gives back both recorded HIs, and falls back to the typed HI as before when it doesn't.
rep("""    const hc = computeHiCrossCheck();
    if (hc.candidates.length < 2 || hc.severity === 'none') return null;""",
    """    const hc = computeHiCrossCheck();
    if (!hc.candidates.length) return null; // #43: shots that agree (even within 0.005 ft), or one shot, are kept too (below)""")
rep("""      else if (md === 'elev' && !pbSegStartStepDriven(id)) { const v = getElevVal(id + 'ElevReading'); if (v !== null && !isPredictedFillMarked(id + 'ElevReading')) o.shots[id] = { m: 'elev', v, el: pbHdElevFromShot(id) ? 1 : 0 }; }
    });
    return o;""",
    """      else if (md === 'elev' && !pbSegStartStepDriven(id)) { const v = getElevVal(id + 'ElevReading'); if (v !== null && !isPredictedFillMarked(id + 'ElevReading')) o.shots[id] = { m: 'elev', v, el: pbHdElevFromShot(id) ? 1 : 0 }; }
    });
    if ((hc.candidates.length < 2 || hc.severity === 'none') && !Object.keys(o.shots).length) return null; // #43: nothing shot and nothing disagreeing: the typed HI gives the form back, as before
    return o;""")
open(out, "w", encoding="utf-8").write(s)
