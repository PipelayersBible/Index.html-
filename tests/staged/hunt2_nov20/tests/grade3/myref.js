// hunt2 grade re-check: a reference written from first principles (not from the app, not from grade2/ref/refcalc.js).
//   invert at a stake      = stake elevation - cut      (a fill stake: stake elevation + fill)
//   HI                     = typed | benchmark + backsight | stake elevation + rod shot on that stake
//   invert from a rod shot = HI - reading
//   stepped Run N start    = the step is measured in the trench bottom-of-pipe to bottom-of-pipe (the app's stated rule):
//                            invert = (previous end invert - its wall) + step + this run's wall
//   between two points     = straight line (slope = rise / run)
//   bottom of pipe (BOP)   = invert - wall;  top of pipe = BOP + the pipe's real outside diameter;  subgrade = BOP - bedding
//                            (OD: ASTM D3034 SDR 35, 4-15 in, typed here from the standard; the app's rule for a blank
//                            pipe type is also SDR 35)
//   rod reading at X       = HI - elevation of X      (Lenker rod: reads the elevation itself)
//   shown: engineer's rod 0.01 ft (half away from zero); architect's rod feet-inches to 1/16 in; station N+NN.NN
'use strict';
const r2 = (v) => { const s = v < 0 ? -1 : 1, a = Math.abs(v); return (s * Math.round(a * 100 + 1e-7) / 100).toFixed(2); };
function ftIn16(v) { // feet -> F'-I n/d" to the nearest sixteenth
  const neg = v < 0; let n16 = Math.round(Math.abs(v) * 192); const ft = Math.floor(n16 / 192); n16 -= ft * 192; const inch = Math.floor(n16 / 16); let num = n16 - inch * 16, den = 16;
  while (num && num % 2 === 0) { num /= 2; den /= 2; }
  return (neg ? '-' : '') + ft + "'-" + inch + (num ? ' ' + num + '/' + den : '') + '"';
}
function staText(ft) { const c = Math.round(Math.abs(ft) * 100), h = Math.floor(c / 10000), r = c - h * 10000; return (ft < 0 && c > 0 ? '-' : '') + h + '+' + (r / 100).toFixed(2).padStart(5, '0'); }
const OD_D3034 = { 4: 4.215, 6: 6.275, 8: 8.4, 10: 10.5, 12: 12.5, 15: 15.3 }; // inches
function solve(sc, wallOf) {
  let hi = null;
  if (sc.rod !== 'lenker') {
    if (sc.hiMode === 'direct') hi = sc.hiDirect; else if (sc.hiMode === 'bm') hi = sc.bmElev + sc.bmBS;
    else { const his = []; sc.runs.forEach(r => [r.start].concat(r.hubs, [r.end]).forEach(p => { if (p.mode === 'stake' && p.shot !== null && p.shot !== undefined) his.push(p.stakeElev + p.shot); })); hi = his.length ? his[0] : null; if (his.some(h => Math.abs(h - his[0]) > 1e-9)) throw new Error('scenario has disagreeing shots'); }
  }
  const pts = []; let off = 0, prevEnd = null, prevWall = null;
  sc.runs.forEach((run, i) => {
    const n = i + 1; const inv = (p) => p.mode === 'stake' ? (p.cf === 'fill' ? p.stakeElev + p.cfVal : p.stakeElev - p.cfVal) : p.mode === 'step' ? (prevEnd - prevWall) + p.step + run.wallFt : (p.elev !== null && p.elev !== undefined) ? p.elev : hi - p.elevReading;
    const hubs = run.hubs.map((h, k) => ({ h, k })).sort((a, b) => a.h.station - b.h.station || a.k - b.k).map(x => x.h);
    let size = run.sizeIn / 12, wall = run.wallFt;
    const list = [{ p: run.start, x: 0, kind: 'start' }].concat(hubs.map(h => ({ p: h, x: h.station, kind: 'hub' })), [{ p: run.end, x: run.dist, kind: 'end' }]);
    list.forEach(o => {
      if (o.p.reducer) { size = o.p.reducer.toIn / 12; wall = o.p.reducer.wallTyped ? o.p.reducer.wallFt : wallOf(o.p.reducer.toIn); } // the pipe leaving the reducer
      pts.push({ run: n, kind: o.kind, x: o.x, g: off + o.x, inv: inv(o.p), id: size, wall, bed: run.bedding, ground: o.p.mode === 'stake' ? o.p.stakeElev : null });
    });
    prevEnd = pts[pts.length - 1].inv; prevWall = pts[pts.length - 1].wall; off += run.dist;
  });
  const total = off;
  const levels = (inv, q) => { const bop = q.wall === null ? null : inv - q.wall, top = q.wall === null ? null : bop + OD_D3034[Math.round(q.id * 12)] / 12, sg = (bop === null || q.bed === null || q.bed === undefined) ? null : bop - q.bed; return { inv, bop, top, sg }; };
  // a row: at a named point (index into pts), or between points of one run at global distance g
  function at(g, ptIndex) {
    if (ptIndex !== null && ptIndex !== undefined) { const q = pts[ptIndex]; return levels(q.inv, q); }
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (a.run !== b.run || !(b.g > a.g)) continue; if (g > a.g - 1e-9 && g < b.g + 1e-9) return levels(a.inv + (b.inv - a.inv) * (g - a.g) / (b.g - a.g), a); }
    return null;
  }
  const slopes = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; slopes.push(a.run === b.run && b.g > a.g ? (b.inv - a.inv) / (b.g - a.g) * 100 : 0); }
  const shown = (v) => v === null ? '—' : sc.rod === 'lenker' ? r2(v) : (hi - v < -1e-9) ? '—' : sc.rod === 'architect' ? ftIn16(hi - v) : r2(hi - v);
  const sta = (g) => staText(sc.startSta + sc.dir * g);
  // rows a crew expects: every interval mark of each run
  const marks = []; let o2 = 0; sc.runs.forEach((run, i) => { if (!(run.lay && run.lay.on)) for (let k = 0; k * run.interval < run.dist - 1e-9; k++) marks.push({ run: i + 1, g: o2 + k * run.interval }); o2 += run.dist; });
  return { hi, pts, total, at, slopes, shown, sta, marks };
}
module.exports = { solve, r2, ftIn16, staText };
