// askgrade #41: runs locked before the station-direction fix (r17.00, grade2 01) keep their Run 2+ station labels.
// Run 1 stations go DOWN from 10+00 (1000 to 900); Run 2 has nothing saying which way. r17.00+ continues down
// (9+00 -> 8+00); a build before it ran Run 2 UP from the junction (9+00 -> 10+00) and the record kept that direction.
// A record made that way (runStations[2].dir = 1) must show 9+00 -> 10+00 on Results, the PDF's station text and the
// reloaded form (Edit Run Data), and a lock from that form keeps it. A record locked today shows 9+00 -> 8+00.
const { L, S, lock } = require('./glib');
(async () => {
  const T = await L(); const p = T.p, fails = [];
  const sc = { rod: 'engineer', hiMode: 'direct', hiDirect: 110, pipeType: 'PVC SDR 35', startSta: 1000, dir: -1, staEntry: 'dist',
    runs: [{ sizeIn: 8, wallFt: 0.02, bedding: null, trenchWidth: null, dist: 100, interval: 50, lay: null, start: S(103, 5), end: S(104, 6), hubs: [] },
      { sizeIn: 8, wallFt: 0.02, bedding: null, trenchWidth: null, dist: 100, interval: 50, lay: null, start: { mode: 'step', step: 0 }, end: S(105, 6.5), hubs: [] }] };
  const A = await T.run(sc); if (A.errors) { fails.push(A.errors.join(' | ')); return T.done(fails); }
  const E = await lock(p); if (!E) { fails.push('not locked'); return T.done(fails); }
  const run2 = (rows, sta) => rows.map((r, i) => ({ st: r.st, sta: sta ? sta[i] : r.sta })).filter(x => x.st > 100).map(x => x.sta).join(' ');
  const today = run2(E.rows, E.sta);
  console.log('locked today: runStations', JSON.stringify(await T.E(() => getCurrentArchiveEntry().runStations)), '| Run 2 stations', today);
  if (!/^8\+50(\.00)? 8\+00(\.00)?$/.test(today)) fails.push('today\'s record Run 2 stations ' + today + ', want 8+50 8+00 (down from 9+00)');
  // the same record as a pre-r17.00 build locked it
  const R = await T.E(() => {
    const e = getCurrentArchiveEntry(); e.runStations[2].dir = 1; saveRunArchive();
    const f = pbStRowStaFn(e), rec = e.intervalRows.filter(r => r.stationFt > 100).map(f);
    const pdf = e.intervalRows.filter(r => r.stationFt > 100).map(r => { try { return pbStRowStaFn(e)({ stationFt: r.stationFt, pointId: '' }); } catch (x) { return 'ERR'; } });
    pbLoadRunIntoForm(e); window.__g2settle(); const c = window.__g2calc();
    return { rec: rec.join(' '), pdf: pdf.join(' '), form: c.rows.filter(r => r.st > 100).map(r => r.sta).join(' '), cap: JSON.stringify(pbStCapture(c)), stored: JSON.stringify(e.runStations) };
  });
  console.log('pre-fix record: Results', R.rec, '| report', R.pdf, '| Edit Run Data form', R.form, '| captured from that form', R.cap, '| stored', R.stored);
  const up = s => /^9\+50(\.00)? 10\+00(\.00)?$/.test(s); // Run 2 past the junction (9+00)
  if (!up(R.rec)) fails.push('pre-fix record Results stations changed: ' + R.rec);
  if (!up(R.pdf)) fails.push('pre-fix record report stations changed: ' + R.pdf);
  if (!up(R.form)) fails.push('pre-fix record reloaded form stations changed: ' + R.form);
  if (!/"2":\{[^}]*"dir":1/.test(R.cap)) fails.push('a lock from the reloaded form would change Run 2 direction: ' + R.cap);
  if (!/"2":\{[^}]*"dir":1/.test(R.stored)) fails.push('stored record changed: ' + R.stored);
  // and after a restart (the archive read back from storage)
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3000);
  const R2 = await T.E(() => { const all = runArchive.filter(x => x && x.kind === 'run' && x.runStations && x.runStations[2]); const x = all[all.length - 1]; const f = pbStRowStaFn(x); return { dir: x.runStations[2].dir, rec: x.intervalRows.filter(r => r.stationFt > 100).map(f).join(' ') }; }).catch(e => ({ err: String(e) }));
  console.log('after a restart:', JSON.stringify(R2));
  if (R2.err || R2.dir !== 1 || !up(R2.rec)) fails.push('after a restart: ' + JSON.stringify(R2));
  await T.done(fails);
})();
