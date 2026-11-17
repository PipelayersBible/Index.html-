import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.77 (legal review: evidence I1): what the AI read on each stake is kept with the run, next to the value locked,
# and Lock asks once that the AI-read values were checked against the stakes.
rep("  const pbStakeAiFront = {}; // prefix -> { img, ctx }",
    "  const pbStakeAiProv = {}; /* r16.77: prefix -> { at, ctx, fields: [{ id, name, kind, val }], unsure } */\n  window.pbStakeAiProvOf = () => pbStakeAiProv;\n  const pbStakeAiFront = {}; // prefix -> { img, ctx }")
rep("""      if (sg.isStart && sta !== null) pbStakeAiStations[prefix] = sta;
      delete pbStakeAiPending[prefix];""",
    """      if (sg.isStart && sta !== null) pbStakeAiStations[prefix] = sta;
      try { const was = pbStakeAiProv[prefix] && !pbStakeAiStale(prefix, pbStakeAiProv[prefix].ctx) ? pbStakeAiProv[prefix] : null, now = plan.filter(x => !(onlyEmpty && x.cur !== null)).map(x => ({ id: x.id, name: x.name, kind: x.kind, val: x.val }));
        pbStakeAiProv[prefix] = { at: Date.now(), ctx: { photoGen: p.photoGen, life: p.life }, fields: (was ? was.fields.filter(f => !now.some(n => n.id === f.id)) : []).concat(now), unsure: Object.keys(p.flags || {}).concat(was ? was.unsure : []) }; } catch (e) {} /* r16.77 */
      delete pbStakeAiPending[prefix];""")
# Lock: one question when AI filled values
rep("""    if (!(opts && opts.jobAsked) && typeof window.pbRfAskJob === 'function' && window.pbRfAskJob(opts)) return; // feat_runflow P6: a company run needs its job
    pbLockInFlight = true;""",
    """    if (!(opts && opts.jobAsked) && typeof window.pbRfAskJob === 'function' && window.pbRfAskJob(opts)) return; // feat_runflow P6: a company run needs its job
    if (!(opts && opts.aiChecked)) { const ai = pbAiReadsNow(); if (ai.length) { const nv = ai.reduce((a, x) => a + x.fields.length, 0); pbShowModal(nv + ' value' + (nv === 1 ? ' was' : 's were') + ' read from ' + (ai.length === 1 ? '1 stake photo' : ai.length + ' stake photos') + ' by AI. Check them against the stakes before you lock.', [{ label: 'Go Back' }, { label: 'I Checked Them', primary: true, onClick: () => { window._pbAiCheckedAt = Date.now(); pbLock(Object.assign({}, opts || {}, { aiChecked: true })); } }], 'Check the AI Readings'); return; } } /* r16.77 */
    pbLockInFlight = true;""")
rep("""    try { if (typeof window.pbMatRunCapture === 'function') { const pbMm = window.pbMatRunCapture(calc);""",
    """    try { const ai = pbAiReadsNow(); if (ai.length) { entry.aiReads = ai; entry.aiCheckedAt = window._pbAiCheckedAt || null; } } catch (e) { console.warn('AI reads not kept.'); } /* r16.77 */
    window._pbAiCheckedAt = null;
    try { if (typeof window.pbMatRunCapture === 'function') { const pbMm = window.pbMatRunCapture(calc);""")
rep("""  function recordArchiveEntry(calc, lockTime, cfv, photoCount, depthFlagged) {""",
    """  // r16.77: the AI-read values still on the form, each with the value it holds now (what Lock records)
  function pbAiReadsNow() {
    const P = typeof window.pbStakeAiProvOf === 'function' ? window.pbStakeAiProvOf() : {}, out = [];
    Object.keys(P).forEach(prefix => {
      const a = P[prefix]; if (!a || !document.getElementById(prefix + 'ModeToggle') || window._pbPhotoContextGen !== a.ctx.photoGen || ((window._pbPointLifecycleGen || {})[prefix] || 0) !== a.ctx.life) return;
      const lab = document.getElementById(prefix + 'Label'), sta = document.getElementById(prefix + 'StaTxt');
      const fields = a.fields.map(f => {
        let now = null;
        if (f.kind === 'elev') { const v = getElevVal(f.id); now = v === null || !Number.isFinite(v) ? null : Math.round(v * 1000) / 1000; }
        else { const el = document.getElementById(f.id); now = el ? (f.kind === 'num' ? (el.value.trim() === '' ? null : Number(el.value)) : el.value.trim()) : null; }
        const same = f.kind === 'elev' || f.kind === 'num' ? (now !== null && Math.abs(Number(now) - Number(f.val)) < 0.0005) : String(now == null ? '' : now) === String(f.val);
        return { name: f.name, ai: f.val, locked: now, changed: !same };
      });
      out.push({ point: (lab && lab.value.trim()) || (sta && sta.value.trim() ? 'Sta ' + sta.value.trim() : prefix), at: a.at, fields, unsure: Array.from(new Set(a.unsure || [])) });
    });
    return out;
  }
  function recordArchiveEntry(calc, lockTime, cfv, photoCount, depthFlagged) {""")
# report: the section, and the legend says it when the run has it
rep("""    // --- field notes
    if (notes.length) {
      R.section('notes', 'Field notes (' + notes.length + ')', { keep: 26 });""",
    """    // --- r16.77: values read from stake photos by AI
    if (Array.isArray(e.aiReads) && e.aiReads.length) {
      const ch = e.aiReads.reduce((a, x) => a + x.fields.filter(f => f.changed).length, 0);
      R.section('aireads', 'Values read from stake photos by AI', { keep: 30, intro: 'What the AI read on each stake photo, next to the value locked. ' + (e.aiCheckedAt ? 'The person who locked the run confirmed they checked these against the stakes (' + pbRptDt(e.aiCheckedAt, { sec: true }) + ', device time).' : 'No check was confirmed at lock.') + (ch ? ' ' + pbRptPlural(ch, 'value') + ' changed by hand after the AI read.' : ' None changed by hand after the AI read.') + ' The stake photos are in the Photos section.' });
      const fmt = (v) => v === null || v === undefined || v === '' ? 'empty' : (typeof v === 'number' ? v.toFixed(3) : String(v));
      R.table({ head: ['Point', 'Value', 'AI read', 'Locked', 'Read at (device time)'], body: [].concat(...e.aiReads.map(x => x.fields.map((f, i) => [i ? '' : String(x.point || ''), f.name, fmt(f.ai), f.changed ? { content: fmt(f.locked) + ' (changed)', _accent: true } : fmt(f.locked), i ? '' : pbRptDt(x.at, { sec: true })]))), fontSize: 8.5 });
    }
    // --- field notes
    if (notes.length) {
      R.section('notes', 'Field notes (' + notes.length + ')', { keep: 26 });""")
rep("""(R.howto = R.howto || []).unshift('Grade sheet: ' + PB_RPT_SRC_LEGEND +""",
    """(R.howto = R.howto || []).unshift('Grade sheet: ' + (Array.isArray(e.aiReads) && e.aiReads.length ? PB_RPT_SRC_LEGEND.replace('The app does not record, point by point, whether a point was typed, filled from a cutsheet import or read by AI: that source is not recorded for any point.', 'Values read from stake photos by AI are listed in their own section, with what the AI read and the value locked; other points were typed or imported.') : PB_RPT_SRC_LEGEND) +""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
