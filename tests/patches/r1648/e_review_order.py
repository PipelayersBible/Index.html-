import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.48: Check Before Locking puts likely typos and backflow first, then the deep-trench note, then the rest
rep("""      html += `<div class="pb-warn photo"><strong>Deep Trench — Check Sloping</strong>""", """      deepHtml = `<div class="pb-warn photo"><strong>Deep Trench — Check Sloping</strong>""")
rep("""    const { maxDepth, maxPrefix, maxCut, maxExtra } = getMaxStakeCutDepth();""", """    const { maxDepth, maxPrefix, maxCut, maxExtra } = getMaxStakeCutDepth();
    let deepHtml = '';""")
rep("""      html += pbXingReviewWarnHtml(xingWarns); /* feat_xingalert: first, never blocks Lock */
      calc.warnings.forEach(w => {""", """      html += pbXingReviewWarnHtml(xingWarns); /* feat_xingalert: first, never blocks Lock */
      const rvRank = (w) => w.type === 'typo' ? 0 : (w.type === 'backflow' || w.type === 'backflow-all' || w.type === 'hi-serious') ? 1 : 2;
      const rvSorted = calc.warnings.map((w, i) => ({ w, i })).sort((a, b) => rvRank(a.w) - rvRank(b.w) || a.i - b.i).map(x => x.w);
      let deepDone = false;
      rvSorted.forEach(w => {
        if (!deepDone && rvRank(w) === 2) { html += deepHtml; deepDone = true; }""")
rep("""      calc.capabilityNotes.forEach(note => { html += `<div class="pb-warn photo">${escapeHtml(note)}</div>`; });
    }""", """      if (!deepDone) html += deepHtml;
      calc.capabilityNotes.forEach(note => { html += `<div class="pb-warn photo">${escapeHtml(note)}</div>`; });
    }""")
open(out, 'w', encoding='utf-8').write(s)
s = open(out, encoding='utf-8').read()
old = """      if (box.textContent !== t) box.textContent = t;
      if (t) { box.removeAttribute('aria-hidden');"""
new = """      if (box.textContent !== t) box.textContent = t;
      { const v = parseFloat(String(t).replace('\\u2212', '-')); box.classList.toggle('pb-rs-slope-bad', isFinite(v) && Math.abs(v) > 20); } // r16.48: a likely typo shows red
      if (t) { box.removeAttribute('aria-hidden');"""
assert s.count(old) == 1
s = s.replace(old, new)
old = "#pbApp#pbApp #screen-input .pb-rs-slope:empty { display: none; }"
assert s.count(old) == 1
s = s.replace(old, old + "\n#pbApp#pbApp #screen-input .pb-rs-slope.pb-rs-slope-bad { color: var(--pb-danger-text); border-color: var(--pb-danger); background: var(--pb-danger-soft); }")
open(out, 'w', encoding='utf-8').write(s)
