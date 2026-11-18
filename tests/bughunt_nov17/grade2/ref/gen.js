// Random but realistic run scenarios (grade2 audit). gen(seed) -> scenario; same seed, same run.
'use strict';
const { tableWallFt } = require('./refcalc');
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const TYPES = ['', 'PVC SDR 35', 'PVC C900', 'Ductile Iron', 'Solid-Wall HDPE', 'Corrugated HDPE', 'Concrete', 'Vitrified Clay', 'Steel', 'PVC Sch 40', 'PVC Sch 80', 'Other'];
const SIZES = [4, 6, 8, 10, 12, 15, 18, 21, 24, 27, 30, 36, 42, 48];
function gen(seed, opts = {}) {
  const R = rng(seed), pick = a => a[Math.floor(R() * a.length)], uni = (a, b) => a + (b - a) * R(), chance = p => R() < p;
  const rod = opts.rod || pick(['engineer', 'engineer', 'engineer', 'architect', 'architect', 'lenker', 'lenker']);
  const arch = rod === 'architect';
  const q = x => arch ? Math.round(x * 192) / 192 : Math.round(x * 100) / 100; // what a person types (0.01 ft, or 1/16 in)
  const q3 = x => arch ? Math.round(x * 192) / 192 : Math.round(x * 1000) / 1000;
  let pipeType = opts.pipeType !== undefined ? opts.pipeType : pick(TYPES);
  const sizesFor = t => { const tt = (t === '' || t === 'Other') ? 'PVC SDR 35' : t; return SIZES.filter(s => tableWallFt(tt, s) !== null || t === 'Vitrified Clay' || t === 'Other'); };
  let sizes = sizesFor(pipeType); if (!sizes.length) { pipeType = ''; sizes = sizesFor(''); }
  const wallFor = (s) => { const w = tableWallFt(pipeType, s); return w !== null && !chance(0.1) ? { w, auto: chance(0.4) } : { w: Math.round(uni(0.04, Math.max(0.05, s / 12 * 0.12)) * 1000) / 1000, auto: false }; };
  const nRuns = opts.nRuns || (chance(0.45) ? 1 : 1 + Math.ceil(R() * 4));
  const base = uni(80, 4800);
  let inv = base; const dir = chance(0.5) ? 1 : -1; const rising = chance(0.6);
  const runs = [];
  let id = 0;
  for (let n = 1; n <= nRuns; n++) {
    const sizeIn = pick(sizes); const wl = wallFor(sizeIn);
    const dist = chance(0.2) ? Math.round(uni(15, 120) * 100) / 100 : chance(0.5) ? Math.round(uni(50, 600)) : Math.round(uni(30, 900) * 10) / 10;
    const run = { n, sizeIn, wallFt: wl.w, wallAuto: wl.auto && n === 1, bedding: chance(0.6) ? pick([0.25, 0.33, 0.5, 0.67, 1]) : null, trenchWidth: null, dist, interval: pick([5, 10, 10, 12.5, 20, 25, 50, 3.3, 7.5]), lay: null, hubs: [] };
    if (chance(0.6)) run.trenchWidth = Math.round((sizeIn / 12 + 1.5 + R() * 2) * 10) / 10;
    if (chance(0.25)) run.lay = { on: true, len: pick([13, 14, 18.5, 20, 19.5, 8]), div: pick(['halves', 'quarters', 'joints']) };
    if (run.wallAuto) run.wallFt = tableWallFt(pipeType, sizeIn);
    const nh = n === 1 ? Math.floor(R() * 7) : Math.floor(R() * 3);
    const hs = [];
    for (let i = 0; i < nh; i++) {
      let st = chance(0.6) ? Math.round(uni(1, dist - 1) * 100) / 100 : Math.round(uni(1, dist - 1));
      if (hs.length && chance(0.12)) st = hs[hs.length - 1]; // two hubs at one station
      if (chance(0.04)) st = 0; else if (chance(0.04)) st = dist; // hub at start / end
      hs.push(st);
    }
    // inverts along the run: slopes between consecutive stations
    const stations = [0].concat(hs.slice().sort((a, b) => a - b), [dist]);
    const invAt = {}; let cur = inv; invAt[0] = cur;
    for (let i = 1; i < stations.length; i++) { const L = stations[i] - stations[i - 1]; const sl = (rising ? 1 : -1) * (chance(0.5) ? uni(0.05, 2) : uni(0.2, 15)) / 100 * (chance(0.08) ? -1 : 1); cur += L * sl; invAt[i] = cur; }
    const mkPt = (invE, pid) => {
      const p = { id: pid };
      const r = R();
      if (r < 0.72) { p.mode = 'stake'; const fill = chance(0.08); const cf = fill ? q(uni(0, 2.5)) : chance(0.04) ? 0 : q(uni(1, 14)); p.cf = fill ? 'fill' : 'cut'; p.cfVal = cf; p.stakeElev = q(fill ? invE - cf : invE + cf); }
      else if (r < 0.9) { p.mode = 'elev'; p.elev = q(invE); }
      else { p.mode = 'elev'; p.elev = null; p.elevReading = '__fromHI'; p._inv = invE; }
      return p;
    };
    run._invs = invAt; run._stations = stations;
    run.start = mkPt(invAt[0], n === 1 ? 'start' : 'seg' + n + 'start');
    if (n > 1) { if (chance(0.7)) { run.start = { id: 'seg' + n + 'start', mode: 'step', step: q(chance(0.5) ? 0 : uni(-0.6, 0.6)) }; } }
    const sortedIdx = hs.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s || a.i - b.i);
    const hubsArr = new Array(hs.length);
    sortedIdx.forEach((o, k) => { hubsArr[o.i] = Object.assign(mkPt(invAt[k + 1], null), { station: o.s }); });
    run.hubs = hubsArr;
    run.end = mkPt(invAt[stations.length - 1], n === 1 ? 'end' : 'seg' + n + 'end');
    // reducer mid-run (to a smaller size, at a hub strictly inside the run)
    if (chance(0.15) && run.hubs.length) { const h = run.hubs.find(x => x.station > 0 && x.station < dist); const smaller = sizes.filter(s => s < sizeIn); if (h && smaller.length) { const to = pick(smaller); const tw = tableWallFt(pipeType, to); h.reducer = { toIn: to, wallFt: tw !== null ? tw : Math.round(uni(0.03, 0.2) * 1000) / 1000, wallTyped: tw === null || chance(0.3) }; } }
    runs.push(run);
    inv = cur;
  }
  // HI from a true instrument height above the highest stake / invert
  const tops = []; runs.forEach(r => [r.start].concat(r.hubs, [r.end]).forEach(p => { if (p.mode === 'stake') tops.push(p.stakeElev); else if (p.elev != null) tops.push(p.elev); else if (p._inv != null) tops.push(p._inv); }));
  const trueHI = Math.max(...tops) + uni(2.5, 9);
  let hiMode = rod === 'lenker' ? 'stakes' : pick(['stakes', 'stakes', 'stakes', 'direct', 'bm']);
  const sc = { seed, rod, pipeType, runs, hiMode, startSta: null, dir, staEntry: 'dist' };
  if (rod !== 'lenker') {
    let anyShot = false;
    runs.forEach(r => [r.start].concat(r.hubs, [r.end]).forEach(p => {
      if (p.mode === 'stake') { if (chance(hiMode === 'stakes' ? 0.55 : 0.25)) { p.shot = q(trueHI - p.stakeElev); anyShot = true; } else p.shot = null; }
      if (p.elevReading === '__fromHI') { p.elevReading = q(trueHI - p._inv); }
    }));
    if (hiMode === 'stakes' && !anyShot) { const p = [runs[0].start].concat(runs[0].hubs, [runs[0].end]).find(x => x.mode === 'stake'); if (p) p.shot = q(trueHI - p.stakeElev); else { hiMode = sc.hiMode = 'direct'; } }
    if (hiMode === 'direct') sc.hiDirect = q3(trueHI);
    if (hiMode === 'bm') { sc.bmElev = q(trueHI - uni(3, 8)); sc.bmBS = q(trueHI - sc.bmElev); }
    // an invert entered as a rod reading needs an HI: in "stakes" mode it must come from a shot stake
  } else {
    runs.forEach(r => [r.start].concat(r.hubs, [r.end]).forEach(p => { if (p.mode === 'stake') p.shot = null; if (p.elevReading === '__fromHI') { p.elev = q(p._inv); delete p.elevReading; } }));
  }
  runs.forEach(r => [r.start].concat(r.hubs, [r.end]).forEach(p => { delete p._inv; }));
  runs.forEach(r => { delete r._invs; delete r._stations; });
  if (chance(0.5)) { sc.startSta = Math.round(uni(0, 9000)) / (chance(0.5) ? 1 : 1) + (chance(0.5) ? Math.round(R() * 100) / 100 : 0); if (sc.dir === -1 && sc.startSta < runs.reduce((a, r) => a + r.dist, 0)) sc.startSta += runs.reduce((a, r) => a + r.dist, 0); sc.staEntry = chance(0.5) ? 'sta' : 'dist'; }
  return sc;
}
module.exports = { gen, rng };
