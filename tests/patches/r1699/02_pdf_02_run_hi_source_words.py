import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 02: the run PDF printed every HI as "(entered)", also the default "Calculate from Stakes" HI (worked out from
# one rod shot on a stake) and a benchmark + backsight HI. The record now keeps how the HI was set (hiMode) and the PDF says it;
# a record locked before this says it is not recorded (unless the hiSrc snapshot, kept when shots disagreed, has the mode).
rep("""      hiSrc: calc.rodUnit !== 'lenker' && calc.hi !== null && calc.hi !== undefined ? pbHdSrcSnap(calc) : null, // fix98 1""",
    """      hiMode: calc.rodUnit !== 'lenker' && calc.hi !== null && calc.hi !== undefined ? (() => { try { const m = activeVal('hiToggle'); return m === 'direct' || m === 'bm' || m === 'stakes' ? m : null; } catch (x) { return null; } })() : null, // audit pdfs 02: how the HI was set
      hiSrc: calc.rodUnit !== 'lenker' && calc.hi !== null && calc.hi !== undefined ? pbHdSrcSnap(calc) : null, // fix98 1""")
rep("""fmt(e.hi, 3) + ' ft (entered)') : 'not used']""",
    """fmt(e.hi, 3) + ' ft ' + (m => m === 'direct' ? '(typed: "I know my HI")' : m === 'bm' ? '(worked out from benchmark + backsight)' : m === 'stakes' ? '(worked out from the rod shot on a run point)' : '(how it was set is not recorded)')(e.hiMode || (e.hiSrc && e.hiSrc.mode))) : 'not used']""")
open(out, 'w', encoding='utf-8').write(s)
