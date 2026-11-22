# dates_xing_nov22 d6: water / sewer crossings.
#  8 The water rule was skipped for crossings typed "Waterline", "WTR", "WL", "WM", "W", '8" W' (\bwater\b does not
#    match "Waterline"), and when our own pipe is a water line in HDPE, steel or PVC Sch 40 (the app guessed "sewer"
#    from those types). Now the crossing's words are read wider, and the run has a "This run carries" choice (Sewer /
#    Storm drain / Water / Other; blank = from the pipe type, and the blank option says what that is). Shown under the
#    pipe only when the run has a crossing. Kept with the record (entry.runCarries), drafts, Resume / Edit and Reuse.
#  9 The Check Before Locking heading said "Water Below Sewer" even when the water was ABOVE but too close: now
#    "Water Too Close Above Sewer" / "Water Too Close Below Sewer" / "Water Below Sewer", and the line gives the gap
#    and the need: "Gap 12.1 in, needs 24 in."
# 10 Arizona (A.A.C. R18-5-502(C), read Nov 22 2026 on law.cornell.edu): no water main within 6 ft horizontally and
#    below 2 ft above the top of a sewer main unless extra protection (MJ ductile iron sewer, or both mains in 6 in of
#    concrete for 10 ft); none within 2 ft below the sewer; force mains / pressure sewers 2 ft vertical and 6 ft
#    horizontal under all conditions, encased (or MJ DIP) for 10 ft each side where the force main crosses above or less
#    than 6 ft below the water line. Storm drains are not sewer mains there: no state row (the box minimum applies).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
# the run-level choice (hidden until the run has a crossing)
p.rep("""          <div class="pb-field" id="runPipeTypeWrap"><label for="runPipeType">Pipe type</label><div class="pb-pt-box"><select id="runPipeType"></select><span class="pb-pa-auto" id="runPipeTypeAuto" hidden>auto</span></div></div>
        </div>""", """          <div class="pb-field" id="runPipeTypeWrap"><label for="runPipeType">Pipe type</label><div class="pb-pt-box"><select id="runPipeType"></select><span class="pb-pa-auto" id="runPipeTypeAuto" hidden>auto</span></div></div>
        </div>
        <div class="pb-field" id="runCarriesWrap" hidden><label for="runCarries">This run carries <span class="pbx-opt">(for crossing rules)</span></label><select id="runCarries"><option value="">Sewer (from pipe type)</option><option value="sewer">Sewer</option><option value="storm">Storm drain</option><option value="water">Water</option><option value="other">Other</option></select></div>""")
p.rep("""  const PB_X22_WATER = /\\b(water|potable|domestic|dw|fire ?(line|service))\\b/i,""",
"""  const PB_X22_WATER = /\\b(water(?:line|main|s)?|wtr|wl|wm|w|potable|domestic|dw|fire ?(line|service))\\b/i, /* dates_xing_nov22: + Waterline, WTR, WL, WM, W, 8" W */""")
p.rep("""    const pt = String((entry && (entry.pipeType || entry.statsType)) || ''), oursWater = /C9(00|09)|\\bDR ?1[48]\\b|ductile|\\bDIP\\b|water|copper|blue ?brute/i.test(pt);
    const uWater = PB_X22_WATER.test(u) && !PB_X22_NOT.test(u), uSew = PB_X22_SEW.test(u) || PB_X22_NOT.test(u);""",
"""    const ours = pbXingOurs(entry), oursWater = ours === 'water'; /* dates_xing_nov22: the run's own choice, else the pipe type */
    if (ours === 'other') return null;
    const uWater = PB_X22_WATER.test(u) && !PB_X22_NOT.test(u), uSew = PB_X22_SEW.test(u) || PB_X22_NOT.test(u);""")
p.rep("""  function pbXingT22(entry, cx) {""", """  // dates_xing_nov22: what our run carries: the run's choice (entry.runCarries), else a guess from the pipe type
  const PB_XING_OURS = ['sewer', 'storm', 'water', 'other'];
  function pbXingOursGuess(pt) { return /C9(00|09)|\\bDR ?1[48]\\b|ductile|\\bDIP\\b|water|copper|blue ?brute/i.test(String(pt || '')) ? 'water' : 'sewer'; }
  function pbXingOurs(entry) { const rc = String((entry && entry.runCarries) || ''); return PB_XING_OURS.indexOf(rc) >= 0 ? rc : pbXingOursGuess(entry && (entry.pipeType || entry.statsType)); }
  window.pbXingOurs = pbXingOurs;
  function pbXingT22(entry, cx) {""")
# our storm pipe under a water crossing is a storm drain, not a sewer
p.rep("""  function pbXingSepRule(code, cx, t22) {
    const mine = t22 === 'utilAbove', u = mine ? '' : String((cx && cx.util) || ''), other = mine ? 'sewer' : pbXingUtil(cx); // utilAbove: the sewer side is our own pipe""",
"""  function pbXingSepRule(code, cx, t22, ours) {
    const mine = t22 === 'utilAbove', u = mine ? (ours === 'storm' ? 'storm drain' : '') : String((cx && cx.util) || ''), other = mine ? (ours === 'storm' ? 'storm drain' : 'sewer') : pbXingUtil(cx); // utilAbove: the sewer side is our own pipe""")
p.rep("""    if (!code) return { code: '', above: 24, below: null, tag: 'Job state not known""",
"""    if (code === 'AZ') { if (storm) return null; /* dates_xing_nov22: A.A.C. R18-5-502(C) */
      return /force ?main|\\bfm\\b|pressure/i.test(u) ? { code, above: 24, below: 24, tag: 'Arizona rule (A.A.C. R18-5-502)', words: 'at least 2 ft vertical and 6 ft horizontal between the water main and a force main; where the force main crosses above, or less than 6 ft below, the water line, it is encased in 6 in of concrete or mechanical-joint ductile iron for 10 ft each side' }
        : { code, above: 24, below: null, tag: 'Arizona rule (A.A.C. R18-5-502)', words: 'water crosses at least 2 ft above the ' + other + ', unless extra protection is used (mechanical-joint ductile iron sewer, or both pipes in 6 in of concrete for 10 ft); never within 2 ft below it' }; }
    if (!code) return { code: '', above: 24, below: null, tag: 'Job state not known""")
p.rep("""      const R = t22 ? pbXingSepRule(xState, cx, t22) : null;
      if (R && (o.pos === 'above' || o.pos === 'below')) {
        const up = o.pos === (t22 === 'utilAbove' ? 'above' : 'below'), need = up ? R.above : R.below;
        min = Math.max(min, need === null ? R.above : need);
        if (need === null || (o.clrFt !== null && o.clrFt * 12 < need - 1e-6)) { o.t22 = t22; o.sep = { R, need }; }""",
"""      const R = t22 ? pbXingSepRule(xState, cx, t22, pbXingOurs(entry)) : null;
      if (R && (o.pos === 'above' || o.pos === 'below')) {
        const up = o.pos === (t22 === 'utilAbove' ? 'above' : 'below'), need = up ? R.above : R.below;
        min = Math.max(min, need === null ? R.above : need);
        if (need === null || (o.clrFt !== null && o.clrFt * 12 < need - 1e-6)) { o.t22 = t22; o.sep = { R, need, up, gapIn: o.clrFt === null ? null : o.clrFt * 12 }; } /* dates_xing_nov22: up = the water is on top */""")
p.rep("""    return S.R.tag + ': ' + S.R.words + '.' + where;
  }""", """    const gap = S.need !== null && S.gapIn !== null && S.gapIn !== undefined ? ' Gap ' + fmt(S.gapIn, 1) + ' in, needs ' + S.need + ' in.' : ''; /* dates_xing_nov22 */
    return S.R.tag + ': ' + S.R.words + '.' + where + gap;
  }
  // dates_xing_nov22: the Check Before Locking heading for a water / sewer crossing
  function pbXingT22Head(o) { const S = o && o.sep; return S && S.up ? 'Water Too Close Above Sewer' : S && S.need !== null ? 'Water Too Close Below Sewer' : 'Water Below Sewer'; }""")
p.rep("""o.t22 ? pbXingT22Text(o) : pbXingGap(o) + ' (min ' + fmt(pbXingMinFt(c), 2) + ' ft).'), t22: !!o.t22 };""",
"""o.t22 ? pbXingT22Text(o) : pbXingGap(o) + ' (min ' + fmt(pbXingMinFt(c), 2) + ' ft).'), t22: !!o.t22, head: o.t22 ? pbXingT22Head(o) : '' };""")
p.rep("""(w.hit ? 'Crossing Conflict' : w.t22 ? 'Water Below Sewer' : 'Crossing Under Minimum')""",
"""(w.hit ? 'Crossing Conflict' : w.t22 ? (w.head || 'Water Below Sewer') : 'Crossing Under Minimum')""")
# the form entry Review / live read, Lock, Resume / Edit / Reuse, New Run
p.rep("""    return { setup: true, distance: calc.totalDist, pipeType: (document.getElementById('runPipeType') || {}).value || '', crossings:""",
"""    return { setup: true, distance: calc.totalDist, pipeType: (document.getElementById('runPipeType') || {}).value || '', runCarries: (document.getElementById('runCarries') || {}).value || '', crossings:""")
p.rep("""    lockedEntry.pipeType = pbPtVal(); if (pbPtAuto()) lockedEntry.pipeTypeAuto = pbPtAuto(); else delete lockedEntry.pipeTypeAuto; pbPtSt.mode = 'kept';""",
"""    lockedEntry.pipeType = pbPtVal(); if (pbPtAuto()) lockedEntry.pipeTypeAuto = pbPtAuto(); else delete lockedEntry.pipeTypeAuto; pbPtSt.mode = 'kept';
    { const rc = (document.getElementById('runCarries') || {}).value || ''; if (rc) lockedEntry.runCarries = rc; else delete lockedEntry.runCarries; } /* dates_xing_nov22 */""")
p.rep("""  function pbPtFromEntry(e, prior, reuse) {""", """  function pbPtFromEntry(e, prior, reuse) {
    { const rc = document.getElementById('runCarries'); if (rc) rc.value = e && typeof e.runCarries === 'string' && PB_XING_OURS.indexOf(e.runCarries) >= 0 ? e.runCarries : ''; } /* dates_xing_nov22 */""")
p.rep("""  function pbPtNewRun() {
    const el = pbPtEl(); if (!el) return;""", """  function pbPtNewRun() {
    { const rc = document.getElementById('runCarries'); if (rc) rc.value = ''; } /* dates_xing_nov22 */
    const el = pbPtEl(); if (!el) return;""")
# show the choice once the run has a crossing; the blank option says what the pipe type means
p.rep("""  function pbXingLiveNow() {
    const cards = Array.from(document.querySelectorAll('#screen-input .pb-xing-card')); if (!cards.length) return;""",
"""  function pbXingCarriesNow() { /* dates_xing_nov22 */
    const w = document.getElementById('runCarriesWrap'), s = document.getElementById('runCarries'); if (!w || !s) return;
    const any = !!document.querySelector('#screen-input .pb-xing-card'); if (w.hidden === any) w.hidden = !any;
    const g = pbXingOursGuess((document.getElementById('runPipeType') || {}).value || ''), t = (g === 'water' ? 'Water' : 'Sewer') + ' (from pipe type)';
    if (s.options[0] && s.options[0].textContent !== t) s.options[0].textContent = t;
  }
  window.pbXingCarriesNow = pbXingCarriesNow;
  document.addEventListener('click', (ev) => { const tg = ev.target; if (tg && tg.closest && tg.closest('#screen-input')) setTimeout(() => { try { pbXingCarriesNow(); } catch (e) {} }, 0); }); /* a crossing added or removed */
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'input') setTimeout(() => { try { pbXingCarriesNow(); } catch (e) {} }, 50); });
  function pbXingLiveNow() {
    try { pbXingCarriesNow(); } catch (e) {}
    const cards = Array.from(document.querySelectorAll('#screen-input .pb-xing-card')); if (!cards.length) return;""")
p.save()
