// Compare one app calculation with the reference. Returns a list of mismatches (each a short string) and counts.
'use strict';
const { compute, archText, r3 } = require('./refcalc');
const TOL = 0.005;
function fmt2(n) { if (n === null || n === undefined || isNaN(n)) return '—'; return (Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-7) / 100).toFixed(2); }
function compare(sc, app, opts = {}) {
  const ref = compute(sc), out = [], seen = new Set();
  const bad = (k, msg) => { if (seen.has(k)) return; seen.add(k); out.push(msg); };
  let rows = 0, vals = 0;
  if (app.errors) { out.push('APP ERRORS: ' + app.errors.join(' | ')); return { out, rows, vals, ref }; }
  if (Math.abs(app.total - ref.total) > 1e-6) bad('total', 'total ' + app.total + ' vs ' + ref.total);
  if (!ref.lenker) { if (app.hi === null || Math.abs(app.hi - ref.hiLow) > TOL) bad('hi', 'HI ' + app.hi + ' vs ref ' + ref.hiLow); }
  // points: map app points to reference points in order
  if (app.points.length !== ref.pts.length) bad('npts', 'points ' + app.points.length + ' vs ' + ref.pts.length);
  // rows
  const ptIdx = new Map(); app.points.forEach((p, i) => ptIdx.set(p.id, i));
  app.rows.forEach(r => {
    rows++;
    const pi = r.hub ? ptIdx.get(r.hub) : null;
    const e = ref.gradeAt(r.st, pi);
    const chk = (name, a, b) => { vals++; if (b === null || b === undefined) { if (a !== null && a !== undefined) bad(name + '-null', name + ' app ' + a + ' where ref has none (row ' + r.st + ')'); return; } if (a === null || a === undefined || Math.abs(a - b) > TOL) bad(name + (r.hub ? '@pt' : '@iv'), name + ' at ' + r.st + (r.hub ? ' (' + r.hub + ')' : '') + ': app ' + (a === null || a === undefined ? a : a.toFixed(4)) + ' ref ' + b.toFixed(4) + ' diff ' + (a === null || a === undefined ? '?' : (a - b).toFixed(4))); };
    chk('INV', r.pi, e.inv); chk('BOP', r.bp, e.bop); chk('TOP', r.tp, e.top); chk('SG', r.sg, e.sg);
    if (!ref.lenker) { chk('rINV', r.ri, e.rInv); chk('rBOP', r.rb, e.rBop); chk('rTOP', r.rt, e.rTop); chk('rSG', r.rs, e.rSg); }
    // display: the number shown (2 decimals / ft-in-1/16), from the reference value
    const want = (v) => v === null || v === undefined ? '—' : (!ref.lenker && v < -1e-9) ? '—' : sc.rod === 'architect' ? archText(v) : fmt2(v);
    const shown = ref.lenker ? { bop: e.bop, inv: e.inv, top: e.top, sg: e.sg } : { bop: e.rBop, inv: e.rInv, top: e.rTop, sg: e.rSg };
    ['bop', 'inv', 'top', 'sg'].forEach(f => { const w = want(shown[f]); if (r.d[f] !== w) { // a value on a rounding edge may show either way: only a difference beyond rounding counts
      const step = sc.rod === 'architect' ? 1 / 192 : 0.01; const v = shown[f];
      const edge = v !== null && v !== undefined && Math.abs(((v / step) % 1 + 1) % 1 - 0.5) < (TOL / 4) / step;
      if (!edge) bad('disp-' + f, 'shown ' + f.toUpperCase() + ' at ' + r.st + ': app "' + r.d[f] + '" ref "' + w + '" (ref ' + (v === null || v === undefined ? v : v.toFixed(4)) + ')'); } });
    // station text
    if (sc.startSta !== null && sc.startSta !== undefined) { const runN = r.hub ? ref.pts[pi].run : ref.runOfX(r.st); const w = ref.staOf(r.st, runN); if (r.sta !== w) bad('sta' + runN, 'station text at ' + r.st + ' (run ' + runN + '): app "' + r.sta + '" ref "' + w + '"'); }
  });
  // row stations: every expected station present (generated marks within 0.05 ft of a point merge into it)
  const appSt = app.rows.map(r => r.st);
  ref.expectedStations().forEach(x => { if (!appSt.some(s => Math.abs(s - x.st) < (x.lay ? 0.0505 : 0.0006)) && !ref.pts.some(p => Math.abs(p.station - x.st) < 0.0505 && x.lay) && !(x.lay && ref.pts.some(p => p.pt.reducer && Math.abs(p.station - x.st) < 2))) bad('missing-' + x.run, 'expected row at ' + x.st + ' (run ' + x.run + (x.lay ? ', laying length' : '') + ') missing'); });
  // volumes
  if (opts.volumes !== false) {
    const bd = ref.beddingYd3();
    if (bd.yd3 !== null && (app.bed.yd3 === null || Math.abs(app.bed.yd3 - bd.yd3) > 0.01 + 0.001 * bd.yd3)) bad('bed', 'bedding volume app ' + app.bed.yd3 + ' ref ' + bd.yd3.toFixed(3));
    const allStake = ref.pts.every(p => p.pt.mode === 'stake');
    const bf = ref.backfillYd3();
    if (bf.yd3 !== null && app.vol && app.vol.yd3 !== null && Math.abs(app.vol.yd3 - bf.yd3) > 0.02 + 0.002 * bf.yd3) bad('vol', 'backfill app ' + app.vol.yd3.toFixed(3) + ' ref ' + bf.yd3.toFixed(3));
    // ground is known at an unstaked point between stakes of its own run; a Run N Start stands on the previous End's stake
    const runStart = {}; ref.pts.forEach(p => { if (p.kind === 'start') runStart[p.run] = p.station; });
    const ownG = n => ref.pts.filter(p => p.pt.mode === 'stake' && (p.run === n || Math.abs(p.station - runStart[n]) < 1e-6));
    const covered = ref.pts.filter(p => p.pt.mode !== 'stake').every(u => ownG(u.run).some(g => g.station <= u.station + 1e-9) && ownG(u.run).some(g => g.station >= u.station - 1e-9));
    if (bf.yd3 !== null && covered && app.vol && app.vol.yd3 === null) bad('volnull', 'backfill app unavailable (' + (allStake ? 'all staked' : 'some points unstaked: ' + ref.pts.filter(p => p.pt.mode !== 'stake').map(p => p.id + '@' + p.station).join(',')) + ') ref ' + bf.yd3.toFixed(2));
  }
  return { out, rows, vals, ref };
}
module.exports = { compare };
