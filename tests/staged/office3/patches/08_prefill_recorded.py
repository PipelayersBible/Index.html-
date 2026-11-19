#!/usr/bin/env python3
# office3 #38: the run record says which production boxes the app filled from the laid marks.
# Save Production now stores entry.foreman.prefilled = ['feetPipeInstalled', 'feetExcavated', 'feetBackfill' ...]: the
# boxes that still held the app's own pre-filled number (never typed over) when Save was tapped. A box that was
# pre-filled at an earlier Save and still holds that same saved number stays listed; a box the foreman changed is not.
# No list is stored when nothing was pre-filled (the record keeps its old shape).
# The run PDF marks those quantities "(filled by the app from the laid marks)" and says the others were typed. Records
# saved before this keep the r17.04 wording (the record doesn't say which boxes were typed), never a guess.
# Shared code touched: pbSaveForemanData (one line before the save), the run PDF's "Foreman production" section.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

rep("""    Object.assign(submitted, fmX.vals); // feat_foreman 3: units and the plan's other items
    const mark = { vals: pbForemanFieldValues() }; // what this Save took: not "unsaved" while it is on its way""",
"""    Object.assign(submitted, fmX.vals); // feat_foreman 3: units and the plan's other items
    try { /* office3 #38: which boxes still hold the app's own number from the laid marks (never typed over) */
      const pf = [], was = entry.foreman && Array.isArray(entry.foreman.prefilled) ? entry.foreman.prefilled : [];
      [['fpPipeInstalled', 'feetPipeInstalled'], ['fpExcavated', 'feetExcavated'], ['fpBackfill', 'feetBackfill']].forEach(([id, k]) => {
        const el = document.getElementById(id); if (!el || submitted[k] === null || submitted[k] === undefined) return;
        const shown = el.dataset.pbLaidPrefill !== undefined && el.value === el.dataset.pbLaidPrefill;
        const typed = id === 'fpPipeInstalled' ? pbLaidTouched === entry.id : !!el.dataset.pbMoreTyped;
        if (shown && !typed) { pf.push(k); return; }
        // filled by the app at an earlier Save and left exactly as saved
        if (was.includes(k) && entry.foreman && entry.foreman[k] === submitted[k] && !typed) pf.push(k);
      });
      if (pf.length) submitted.prefilled = pf;
    } catch (e) { console.error(e); }
    const mark = { vals: pbForemanFieldValues() }; // what this Save took: not "unsaved" while it is on its way""")

rep("""      R.section('foreman', 'Foreman production', { keep: 40, intro: 'Quantities saved by the foreman for this session (today\\u2019s work, not a running total). Pipe installed, excavated and backfill feet can be pre-filled by the app from the laid marks; the record does not say which boxes were typed and which were left as pre-filled.' }); /* audit pdfs 09 */
      const q = (v, u) => v === null || v === undefined ? null : (typeof v === 'number' ? v.toFixed(u === '' ? 0 : 1) : v) + (u ? ' ' + u : '');
      R.table({ head: ['Item', 'Quantity'], body: [['Excavated', q(f.feetExcavated, 'ft')], ['Pipe installed', q(f.feetPipeInstalled, 'ft')], ['Backfill', q(f.feetBackfill, 'ft')], ['Restoration', q(f.feetRestoration, 'ft')], ['Demo', typeof f.feetDemo === 'number' ? q(f.feetDemo, 'ft') : null], ['Appurtenances', q(f.appurtenances, '')]].filter(r => r[1] !== null).map(r => [r[0], r[1]]), columns: [{ cellWidth: 60 }, { halign: 'right', cellWidth: 40 }], width: 100 });""",
"""      const pfl = Array.isArray(f.prefilled) ? f.prefilled.filter(k => typeof k === 'string') : null; /* office3 #38: recorded since r17.05 */
      R.section('foreman', 'Foreman production', { keep: 40, intro: pfl ? 'Quantities saved by the foreman for this session (today\\u2019s work, not a running total). Each quantity marked "filled by the app" was filled in from the laid marks and saved as filled; the others were typed.'
        : 'Quantities saved by the foreman for this session (today\\u2019s work, not a running total). Pipe installed, excavated and backfill feet can be pre-filled by the app from the laid marks; the record does not say which boxes were typed and which were left as pre-filled.' }); /* audit pdfs 09 */
      const q = (v, u) => v === null || v === undefined ? null : (typeof v === 'number' ? v.toFixed(u === '' ? 0 : 1) : v) + (u ? ' ' + u : '');
      const qp = (k, v, u) => { const t = q(v, u); return t !== null && pfl && pfl.includes(k) ? t + ' (filled by the app from the laid marks)' : t; };
      R.table({ head: ['Item', 'Quantity'], body: [['Excavated', qp('feetExcavated', f.feetExcavated, 'ft')], ['Pipe installed', qp('feetPipeInstalled', f.feetPipeInstalled, 'ft')], ['Backfill', qp('feetBackfill', f.feetBackfill, 'ft')], ['Restoration', q(f.feetRestoration, 'ft')], ['Demo', typeof f.feetDemo === 'number' ? q(f.feetDemo, 'ft') : null], ['Appurtenances', q(f.appurtenances, '')]].filter(r => r[1] !== null).map(r => [r[0], r[1]]), columns: [{ cellWidth: 60 }, { halign: 'right', cellWidth: pfl && pfl.length ? 90 : 40 }], width: pfl && pfl.length ? 150 : 100 });""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
