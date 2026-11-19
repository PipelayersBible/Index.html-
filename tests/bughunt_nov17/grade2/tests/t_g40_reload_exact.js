// askgrade #40: Architect's rod, a Run 2+ Start set from a measured step uses the exact invert (not its 1/16 in box),
// and Edit Run Data gives the record back exactly. (grade2 t04 + run_lock seed 1, the reload that broke.)
//  1. t04's run: Run 2 Start INV 98.039 (box 98.0365), BOP shown 6'-11 7/8"; locked; reloaded: the same, exactly.
//  2. after the reload, a new invert typed in the box is the one used (the record's value is dropped).
//  3. seeds with stepped Run 2+ Starts (Architect, some Engineer): Lock, then the reloaded form calculates the calc's
//     rows exactly (every value to 1e-9, every displayed string and station), seed 1 (the run_lock failure) included.
//  4. a record locked before the fix (Run 2 Start kept as its box showed it) reloads as it did.
const { L, S, lock, gen } = require('./glib');
const q = x => Math.round(x * 192) / 192;
(async () => {
  const T = await L(); const p = T.p, fails = [];
  const sameRows = (A, C, tag) => {
    if (C.errors) { fails.push(tag + ': reloaded form errors ' + C.errors.join(' | ')); return; }
    if (C.rows.length !== A.rows.length) { fails.push(tag + ': reloaded rows ' + C.rows.length + ' vs ' + A.rows.length); return; }
    let n = 0;
    A.rows.forEach((a, i) => { const c = C.rows[i];
      ['st', 'pi', 'bp', 'tp', 'sg', 'ri', 'rb', 'rt', 'rs'].forEach(k => { const x = a[k], y = c[k]; if ((x === null) !== (y === null) || (x !== null && Math.abs(x - y) > 1e-9)) { if (n++ < 4) fails.push(tag + ': reloaded ' + k + ' at ' + a.st + ': ' + y + ' vs ' + x); } });
      ['bop', 'inv', 'top', 'sg', 'elev'].forEach(k => { if (a.d[k] !== c.d[k] && n++ < 4) fails.push(tag + ': reloaded shown ' + k + ' at ' + a.st + ': ' + c.d[k] + ' vs ' + a.d[k]); });
      if ((a.sta || '') !== (c.sta || '') && n++ < 4) fails.push(tag + ': reloaded station at ' + a.st + ': ' + c.sta + ' vs ' + a.sta); });
    if (Math.abs((C.hi || 0) - (A.hi || 0)) > 1e-9) fails.push(tag + ': reloaded HI ' + C.hi + ' vs ' + A.hi);
  };
  // 1
  const sc = { rod: 'architect', hiMode: 'direct', hiDirect: 105, pipeType: 'PVC SDR 35', startSta: null, dir: 1,
    runs: [{ sizeIn: 8, wallFt: 0.02, bedding: null, trenchWidth: null, dist: 100, interval: 50, lay: null, start: S(q(103), 5), end: S(q(104), 6), hubs: [] },
      { sizeIn: 8, wallFt: 0.031, bedding: null, trenchWidth: null, dist: 100, interval: 50, lay: null, start: { mode: 'step', step: 0.028 }, end: S(q(104.5), 6.25), hubs: [] }] };
  const A = await T.run(sc);
  const r2 = A.rows.find(x => x.hub === 'seg2start');
  console.log('1. calc: Run 2 Start INV', r2.pi.toFixed(4), 'BOP shown', r2.d.bop);
  if (Math.abs(r2.pi - 98.039) > 1e-9) fails.push('1. Run 2 Start invert ' + r2.pi + ', want 98.039');
  if (r2.d.bop !== "6'-11 7/8\"") fails.push('1. BOP shown ' + r2.d.bop + ", want 6'-11 7/8\"");
  const E = await lock(p);
  if (!E) fails.push('1. not locked');
  else {
    const e2 = E.rows.find(x => x.hub === 'seg2start');
    console.log('1. record: Run 2 Start piFt', e2.pi.toFixed(4), 'BOP', e2.bop);
    if (Math.abs(e2.pi - 98.039) > 1e-9 || e2.bop !== "6'-11 7/8\"") fails.push('1. record Run 2 Start ' + e2.pi + ' ' + e2.bop);
    const C = await p.evaluate(() => window.__g2reload());
    const c2 = C.rows && C.rows.find(x => x.hub === 'seg2start');
    console.log('1. reloaded: Run 2 Start INV', c2 && c2.pi.toFixed(4), 'BOP shown', c2 && c2.d.bop, '| box', await T.E(() => getElevVal('seg2startElev')));
    sameRows(A, C, '1');
    // 2: a new invert typed in the box
    const D = await T.E(() => { setElevFieldValue('seg2startElev', 98.0625, true); window.__g2settle(); return window.__g2calc(); });
    const d2 = D.rows.find(x => x.hub === 'seg2start');
    console.log('2. after typing 98.0625 in the box: Run 2 Start INV', d2.pi.toFixed(4));
    if (Math.abs(d2.pi - 98.0625) > 1e-9) fails.push('2. typed invert not used: ' + d2.pi);
  }
  // 3
  const seeds = [1];
  // mid-run reducers are left out: Edit Run Data does not give a reducer's size back (separate, older issue; NOTES)
  const noRed = g => !g.runs.some(r => r.hubs.some(h => h.reducer));
  for (let s = 0; seeds.length < 12 && s < 400; s++) { const g = gen(s, { rod: 'architect' }); if (g.runs.some(r => r.start.mode === 'step') && noRed(g) && s !== 1) seeds.push(s); }
  const eng = []; for (let s = 0; eng.length < 3 && s < 400; s++) { const g = gen(s, { rod: 'engineer' }); if (g.runs.some(r => r.start.mode === 'step') && noRed(g)) eng.push(s); }
  let locked = 0, rows = 0;
  for (const [s, rod] of seeds.map(s => [s, s === 1 ? null : 'architect']).concat(eng.map(s => [s, 'engineer']))) {
    const g = rod ? gen(s, { rod }) : gen(s);
    const A3 = await T.run(g);
    // the driver writes the boxes, it doesn't type in them: an elevation under 100 ft would otherwise get the short-elevation
    // help (98.68 -> 198.68) when Review takes the focus away, so the record would not be the run calculated here
    await T.E(() => document.querySelectorAll('input[data-pb-se-typed]').forEach(el => { delete el.dataset.pbSeTyped; })); if (A3.errors) { console.log('3. seed', s, 'not calculable (skipped):', A3.errors[0]); continue; }
    const E3 = await lock(p); if (!E3) { fails.push('3. seed ' + s + ' not locked'); continue; }
    locked++; rows += E3.rows.length;
    E3.rows.forEach((r, i) => { const a = A3.rows[i]; if (a && Math.abs(r.pi - a.pi) > 1e-9) fails.push('3. seed ' + s + ' record row ' + r.st + ' ' + r.pi + ' vs ' + a.pi); });
    const C3 = await p.evaluate(() => window.__g2reload());
    sameRows(A3, C3, '3. seed ' + s + ' (' + g.rod + ')');
  }
  console.log('3. runs locked and reloaded', locked, '(Architect ' + seeds.length + ', Engineer ' + eng.length + '), rows', rows);
  // 4: a record as a pre-fix build locked it (Run 2 Start = what its box showed)
  const A4 = await T.run(sc); const E4 = await lock(p);
  if (E4) {
    const C4 = await T.E(() => { const e = getCurrentArchiveEntry(); const r = e.intervalRows.find(x => x.pointId === 'seg2start'); r.piFt = Math.round(98.039 * 192) / 192; pbLoadRunIntoForm(e); window.__g2settle(); return window.__g2calc(); });
    const c4 = C4.rows.find(x => x.hub === 'seg2start');
    console.log('4. pre-fix record (piFt 98.0365, the box): reloaded Run 2 Start INV', c4.pi.toFixed(4), 'BOP shown', c4.d.bop);
    if (Math.abs(c4.pi - Math.round(98.039 * 192) / 192) > 1e-9 || c4.d.bop !== "6'-11 15/16\"") fails.push('4. pre-fix record reload changed: ' + c4.pi + ' ' + c4.d.bop);
  } else fails.push('4. not locked');
  await T.done(fails);
})();
