// Batch 17 END: helpers for the "run left open" tests (on /home/claude/test/lib.js; the clock is Playwright's, as in
// hunt27/lifecycle/w6_next_morning_note_end_time.js).
const L = require('/home/claude/test/lib.js');
const sleep = (p, ms) => p.waitForTimeout(ms);
const modalUp = (p) => p.evaluate(() => getComputedStyle(document.getElementById('pbModalOverlay')).display !== 'none');
const title = (p) => p.evaluate(() => getComputedStyle(document.getElementById('pbModalOverlay')).display !== 'none' ? document.getElementById('pbModalTitle').textContent : '');
const message = (p) => p.evaluate(() => document.getElementById('pbModalMessage').textContent);
const buttons = (p) => p.evaluate(() => getComputedStyle(document.getElementById('pbModalOverlay')).display !== 'none' ? Array.from(document.querySelectorAll('#pbModalButtons button')).map(b => b.textContent.trim()) : []);
const tap = (p, label) => p.evaluate((lb) => { const b = Array.from(document.querySelectorAll('#pbModalButtons button')).find(x => x.textContent.trim() === lb); if (b) b.click(); return !!b; }, label);
// The question's fields: { point: key | '', day, time, options: [text], days: [value] }
const fields = (p) => p.evaluate(() => { const pt = document.getElementById('pbEaPoint'), d = document.getElementById('pbEaDay'), t = document.getElementById('pbEaTime');
  return pt ? { point: pt.value, pointText: pt.selectedIndex >= 0 ? pt.options[pt.selectedIndex].textContent : '', day: d.value, time: t.value, options: Array.from(pt.options).map(o => o.textContent), days: Array.from(d.options).map(o => o.value) } : null; });
const fill = (p, { pointIdx, day, time }) => p.evaluate(([i, d, t]) => {
  const e = window.__debugGetCurrentArchiveEntry(), pt = document.getElementById('pbEaPoint');
  if (i !== undefined && i !== null) { const r = e.intervalRows[i]; pt.value = r.pointId ? 'p:' + r.pointId : 's:' + r.stationFt + ':' + (r.addedTime || ''); }
  if (d) document.getElementById('pbEaDay').value = d; if (t !== undefined) document.getElementById('pbEaTime').value = t; }, [pointIdx, day, time]);
const keyOf = (p, i) => p.evaluate((i) => { const r = window.__debugGetCurrentArchiveEntry().intervalRows[i]; return r.pointId ? 'p:' + r.pointId : 's:' + r.stationFt + ':' + (r.addedTime || ''); }, i);
const runOf = (p, id) => p.evaluate((id) => { const e = window.__debugGetArchive().find(x => x.id === id); if (!e) return null;
  return { completed: !!e.completed, incomplete: !!e.incomplete, end: typeof e.runEndTime === 'number' ? new Date(e.runEndTime).toString().slice(0, 21) : null, dist: e.completedDistance, stop: e.stoppedAtStation,
    entered: !!e.endTimeEntered, endEntry: e.endEntry ? JSON.parse(JSON.stringify(e.endEntry)) : null, rows: JSON.stringify(e.intervalRows), summary: JSON.stringify(e.summary), segments: JSON.stringify(e.segments || null),
    report: e.reportText || '', durationMin: e.durationMin, resumedIntoId: e.resumedIntoId || null, crew: JSON.stringify(e.crewLog || []) }; }, id);
const storedRun = (p, uid, id) => p.evaluate(([u, id]) => { const a = JSON.parse(localStorage.getItem(u + ':runArchive') || '[]'); const e = a.find(x => x && x.id === id); return e ? { completed: !!e.completed, incomplete: !!e.incomplete, runEndTime: e.runEndTime, endEntry: e.endEntry || null } : null; }, [uid, id]);
const openRun = (p) => p.evaluate(() => window.pbHomeOpenRun());
const screen = (p) => p.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id || '');
const reportOf = (p, id) => p.evaluate((id) => { const e = window.__debugGetArchive().find(x => x.id === id); return window.__debugBuildRunReportFromEntry(e); }, id);
async function start(browser, uid, when, { dist = 100 } = {}) {
  const page = await L.newPage(browser, uid); await L.dismiss(page);
  await page.clock.install({ time: new Date(when) });
  await page.reload(); await sleep(page, 1200); await L.dismiss(page);
  const id = await L.lockRun(page, { dist }); await L.dismiss(page);
  return { page, id };
}
module.exports = { L, check: L.check, sleep, modalUp, title, message, buttons, tap, fields, fill, keyOf, runOf, storedRun, openRun, screen, reportOf, start };
