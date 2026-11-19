// speed2 #52 measurement (not pass/fail): one laid mark with a big Records (MB of photos), r17.04 vs the new build,
// 4x CPU slowdown (CDP), same Records for both. Prints main-thread long tasks in the 6 s after the tap, the time until
// the save finished (wrapped IDB put of the Records key completing), and the bytes written to IndexedDB for that save.
// The copies are 22+ days old, so the crew-send and seal passes (last 21 days) don't run for them in either build and
// the numbers are the laid mark itself. saveMs = the in-app saveRunArchive call from start to its result.
// Usage: node m52_laid_speed.js [runs=40] [kb=300] [repeats=3]
const T = require('./phlib');
const N = +process.argv[2] || 40, KB = +process.argv[3] || 300, REP = +process.argv[4] || 3;
const INSTR = `(()=>{window.__w={bytes:0,last:0};const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,k){const n=typeof v==='string'?v.length:(v&&v.u?v.u.length:0);window.__w.bytes+=n;const r=put.apply(this,arguments);const t=this.transaction;t.addEventListener('complete',()=>{window.__w.last=performance.now();});return r;};})();`;
async function one(p, row) {
  await p.evaluate(() => {
    window.__lt = []; window.__w.bytes = 0; window.__w.last = 0; window.__saves = [];
    if (!window.__ltObs) { window.__ltObs = new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))); window.__ltObs.observe({ entryTypes: ['longtask'] }); }
    if (!window.__wrapped) { window.__wrapped = 1; window.__ev('saveRunArchive = ((o) => async function () { const t = performance.now(); const r = await o.apply(this, arguments); window.__saves.push([t, performance.now()]); return r; })(saveRunArchive)'); }
  });
  const t0 = await p.evaluate(() => performance.now());
  await T.lay(p, row);
  await p.waitForTimeout(6000);
  return p.evaluate((t0) => {
    const lt = window.__lt.filter((x) => x[0] >= t0), sv = window.__saves[0];
    const inSave = sv ? lt.filter((x) => x[0] + x[1] > sv[0] && x[0] < sv[1]).reduce((a, x) => a + x[1], 0) : null;
    return { ltSum: Math.round(lt.reduce((a, x) => a + x[1], 0)), ltMax: Math.round(Math.max(0, ...lt.map((x) => x[1]))), saves: window.__saves.length, saveMs: sv ? Math.round(sv[1] - sv[0]) : null, ltInSave: inSave === null ? null : Math.round(inSave), writtenMB: +(window.__w.bytes / 1048576).toFixed(2) };
  }, t0);
}
(async () => {
  const { page, close, ctx } = await T.open({ init: INSTR });
  let p = await page();
  await T.makeRun(p);
  const seeded = await T.seedOld(p, N, KB, 22 * 86400000);
  console.log('Records:', (seeded.chars / 1048576).toFixed(1), 'MB text,', seeded.photos, 'photo places');
  const res = { base: [], new: [] };
  const run = async (url, key) => {
    const q = await page(url, 1500);
    const cdp = await ctx.newCDPSession(q); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    if (key === 'new') { const st = await T.waitSweep(q, 600000); console.log('new build moved the photos:', st && st.last, st && st.verified); }
    await q.evaluate(() => pbResumeLastRunResults()); await q.waitForTimeout(3000); await T.L.clearModals(q);
    const rows = await T.L.rows(q);
    for (let i = 0; i < REP; i++) { const r = await one(q, rows[(key === 'new' ? 3 + REP * 2 : 2) + i * 2]); await T.L.clearModals(q); res[key].push(r); console.log(key, 'laid mark', i + 1, JSON.stringify(r)); }
    const heap = await q.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null); console.log(key, 'JS heap MB', heap);
    await q.close({ runBeforeUnload: false });
  };
  await run(T.ROOT + 'base.html', 'base');
  await run(undefined, 'new');
  const avg = (a, k) => Math.round(a.reduce((s, x) => s + (x[k] || 0), 0) / a.length);
  for (const k of ['base', 'new']) console.log('SUMMARY', k, 'avg: long tasks after the tap', avg(res[k], 'ltSum'), 'ms (max single', avg(res[k], 'ltMax'), 'ms); save', avg(res[k], 'saveMs'), 'ms, of it main thread blocked', avg(res[k], 'ltInSave'), 'ms; written', (res[k].reduce((s, x) => s + x.writtenMB, 0) / res[k].length).toFixed(2), 'MB');
  await close();
})().catch((e) => { console.log('ERROR', e && e.stack); process.exit(1); });
