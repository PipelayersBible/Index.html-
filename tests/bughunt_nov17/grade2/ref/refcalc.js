// Independent grade reference for The Pipelayer's Bible (grade2 audit, Nov 17 2026).
// Written from first principles, NOT from the app's code paths. Input: a scenario (see gen.js). Output: points,
// the grade at any station, the station text of a distance, volumes. Units: feet.
//
//   HI           = stake elevation + rod shot on the stake (each shot stake / shot invert is one HI reading),
//                  or benchmark elevation + backsight, or typed. Readings that agree (within 0.02): the run's HI
//                  for elevations is the LOWEST; readings to lay to at design points use the HIGHEST (owner rule,
//                  hidisc 2). A shot stake's own reading = its shot + cut (- fill).
//   invert       = stake elevation - cut (+ fill), or the typed invert, or HI - the reading shot on the invert,
//                  or (Run 2+ Start, measured step) previous End invert - its wall + step + this run's wall.
//   grade        = straight line between consecutive points (by station; the same station keeps entry order).
//   BOP          = INV - wall;  TOP = BOP + real OD (the app's OD tables: pbPipeOdIn);  subgrade = BOP - bedding.
//   rod reading  = HI - elevation (Lenker shows elevations).
'use strict';
const OD_DI = { 4: 4.8, 6: 6.9, 8: 9.05, 10: 11.1, 12: 13.2, 14: 15.3, 16: 17.4, 18: 19.5, 20: 21.6, 24: 25.8, 30: 32, 36: 38.3, 42: 44.5, 48: 50.8 };
const OD_SDR35 = { 4: 4.215, 6: 6.275, 8: 8.4, 10: 10.5, 12: 12.5, 15: 15.3, 18: 18.701, 21: 22.047, 24: 24.803, 27: 27.953, 30: 32, 36: 38.3, 42: 44.5, 48: 50.8 };
const OD_IPS = { 1.5: 1.9, 2: 2.375, 2.5: 2.875, 3: 3.5, 4: 4.5, 5: 5.563, 6: 6.625, 8: 8.625, 10: 10.75, 12: 12.75, 14: 14, 16: 16, 18: 18, 20: 20, 24: 24, 30: 30, 36: 36 };
const OD_CORR = { 4: 4.8, 6: 7.1, 8: 9.3, 10: 11.9, 12: 14.7, 15: 17.6, 18: 21.4, 24: 28.2, 30: 34.7, 36: 40.6, 42: 47.5, 48: 54.1, 60: 66.8 };
// wall (in) by type and nominal size (the app's pipe index), used only when a scenario leaves the wall to the app
const WALL_IN = {
  'PVC SDR 35': { 4: 0.12, 6: 0.18, 8: 0.24, 10: 0.3, 12: 0.36, 15: 0.437, 18: 0.499, 21: 0.588, 24: 0.661, 27: 0.745, 30: 0.853, 36: 1.021, 42: 1.187, 48: 1.355 },
  'PVC C900': { 4: 0.267, 6: 0.383, 8: 0.503, 10: 0.617, 12: 0.733, 14: 0.85, 16: 0.967, 18: 1.083, 20: 1.2, 24: 1.433, 30: 1.778 },
  'Ductile Iron': { 4: 0.312, 6: 0.312, 8: 0.312, 10: 0.323, 12: 0.343, 14: 0.374, 16: 0.394, 18: 0.404, 20: 0.424, 24: 0.424, 30: 0.465, 36: 0.505, 42: 0.535, 48: 0.585 },
  'Solid-Wall HDPE': { 4: 0.265, 6: 0.39, 8: 0.507, 10: 0.632, 12: 0.75, 14: 0.824, 16: 0.941, 18: 1.059, 20: 1.176, 24: 1.412 },
  'Corrugated HDPE': { 4: 0.4, 6: 0.55, 8: 0.65, 10: 0.95, 12: 1.35, 15: 1.3, 18: 1.7, 24: 2.1, 30: 2.35, 36: 2.3, 42: 2.75, 48: 3.05, 60: 3.4 },
  'Concrete': { 12: 2, 15: 2.25, 18: 2.5, 21: 2.75, 24: 3, 27: 3.25, 30: 3.5, 33: 3.75, 36: 4, 42: 4.5, 48: 5 },
  'Vitrified Clay': { 4: 0.688, 6: 0.875, 8: 1.062, 10: 1.125, 12: 1.312 },
  'Steel': { 4: 0.237, 6: 0.28, 8: 0.322, 10: 0.365, 12: 0.406, 14: 0.438, 16: 0.5, 18: 0.562, 20: 0.594, 24: 0.688, 36: 0.75 },
  'PVC Sch 40': { 3: 0.216, 4: 0.237, 6: 0.28, 8: 0.322, 10: 0.365, 12: 0.406, 14: 0.437, 16: 0.5, 18: 0.562 },
  'PVC Sch 80': { 3: 0.3, 4: 0.337, 6: 0.432, 8: 0.5, 10: 0.593, 12: 0.687 }
};
function tableWallFt(type, sizeIn) { const t = (type === '' || type === 'Other') ? 'PVC SDR 35' : type; const w = WALL_IN[t] && WALL_IN[t][sizeIn]; return w ? Math.round(w / 12 * 1000) / 1000 : null; }
function odIn(type, d, wallFt) {
  const g = (tb, max) => (tb[d] && (!max || d <= max)) ? tb[d] : null;
  if (type === '' || type === 'PVC SDR 35') return g(OD_SDR35);
  if (type === 'Ductile Iron') return g(OD_DI);
  if (type === 'PVC C900') return g(OD_DI, 30);
  if (type === 'Solid-Wall HDPE') return d >= 4 && d <= 24 ? g(OD_IPS) : null;
  if (type === 'Corrugated HDPE') return g(OD_CORR);
  if (type === 'Steel') return d >= 4 && d <= 36 && d !== 30 ? g(OD_IPS) : null;
  if (type === 'PVC Sch 40') return d <= 18 ? g(OD_IPS) : null;
  if (type === 'PVC Sch 80') return d <= 12 ? g(OD_IPS) : null;
  if (type === 'Concrete') return wallFt > 0 ? d + 2 * wallFt * 12 : null;
  return null; // Vitrified clay, Other: no table
}
// INV to outside TOP (ft) = OD - wall; OD = table OD, else nominal + 2 walls
function invToTop(type, sizeIn, wallFt) {
  if (wallFt === null || !(sizeIn > 0)) return null;
  const od = odIn(type, sizeIn, wallFt);
  const odFt = od && od / 12 - 2 * wallFt > 0 ? od / 12 : sizeIn / 12 + 2 * wallFt;
  return odFt - wallFt;
}
function odFtOf(type, sizeIn, wallFt) { const od = odIn(type, sizeIn, wallFt); return od && od / 12 - 2 * wallFt > 0 ? od / 12 : sizeIn / 12 + 2 * wallFt; }
const r3 = x => Math.round(x * 1000) / 1000;
function staText(ft) { const c = Math.round(Math.abs(ft) * 100); return (ft < 0 && c > 0 ? '-' : '') + Math.floor(c / 10000) + '+' + ((c % 10000) / 100).toFixed(2).padStart(5, '0'); }
function archText(n) { // ft-in-1/16 (nearest sixteenth)
  const s16 = Math.round(Math.abs(n) * 192); const ft = Math.floor(s16 / 192), rest = s16 - ft * 192, inch = Math.floor(rest / 16); let six = rest - inch * 16;
  let fr = '"'; if (six > 0) { let num = six, den = 16; while (num % 2 === 0) { num /= 2; den /= 2; } fr = ' ' + num + '/' + den + '"'; }
  return (n < 0 && s16 > 0 ? '-' : '') + ft + "'-" + inch + fr;
}

function compute(sc) {
  const lenker = sc.rod === 'lenker';
  // ---- HI readings ----
  const cands = [];
  sc.runs.forEach(run => [run.start].concat(run.hubs, [run.end]).forEach(pt => {
    if (!pt) return;
    if (pt.mode === 'stake' && pt.shot !== null && pt.shot !== undefined) cands.push(pt.stakeElev + pt.shot);
    if (pt.mode === 'elev' && pt.elev !== null && pt.elev !== undefined && pt.elevReading !== null && pt.elevReading !== undefined) cands.push(pt.elev + pt.elevReading);
  }));
  let srcHi = null;
  if (!lenker && sc.hiMode === 'direct') srcHi = sc.hiDirect;
  if (!lenker && sc.hiMode === 'bm') srcHi = sc.bmElev + sc.bmBS;
  const all = cands.slice(); if (srcHi !== null && cands.length) all.push(srcHi);
  let hiLow = null, hiHigh = null;
  if (!lenker) {
    if (sc.hiMode === 'stakes' || cands.length) { if (all.length) { hiLow = Math.min(...all); hiHigh = Math.max(...all); } }
    else { hiLow = hiHigh = srcHi; }
    if (all.length && Math.max(...all) - Math.min(...all) > 0.02 + 1e-9) throw new Error('scenario HI readings disagree > 0.02 (reference models agreeing readings only)');
  }
  // ---- points ----
  const pts = []; let off = 0; let prevEnd = null;
  sc.runs.forEach((run, ri) => {
    const n = ri + 1;
    const sizeAt = (st, incl) => { let s = run.sizeIn, w = run.wallFt, best = -Infinity; run.hubs.forEach(h => { if (h.reducer && (h.station < st - 1e-6 || (incl && h.station === st && incl === h)) && h.station >= best) { best = h.station; s = h.reducer.toIn; w = h.reducer.wallFt; } }); return { s, w }; };
    const mk = (pt, kind, st) => {
      const pipe = kind === 'start' ? { s: run.sizeIn, w: run.wallFt } : kind === 'end' ? sizeAt(run.dist, null) : sizeAt(pt.station, pt);
      let inv = null, reading = null;
      if (pt.mode === 'stake') {
        inv = pt.cf === 'fill' ? pt.stakeElev + pt.cfVal : pt.stakeElev - pt.cfVal;
        if (!lenker) reading = (pt.shot !== null && pt.shot !== undefined) ? (pt.cf === 'fill' ? pt.shot - pt.cfVal : pt.shot + pt.cfVal) : hiHigh - inv;
      } else if (pt.mode === 'step') {
        inv = prevEnd.inv - prevEnd.wt + pt.step + pipe.w;
        if (!lenker) reading = hiHigh - inv;
      } else if (pt.elev !== null && pt.elev !== undefined) {
        inv = pt.elev; if (!lenker) reading = hiHigh - inv;
      } else { // reading only: elevation from the shot
        inv = hiLow - pt.elevReading; if (!lenker) reading = hiLow - inv;
      }
      return { run: n, kind, id: pt.id, station: st, inv, reading, wt: pipe.w, sizeIn: pipe.s, bedding: run.bedding, tw: run.trenchWidth, pt };
    };
    // the pipe changes AT a reducer: the reducer's own row and everything after it (in station order, the same
    // station in entry order) is the new size
    let cur = { s: run.sizeIn, w: run.wallFt };
    const mk2 = (pt, kind, st) => { if (pt.reducer) cur = { s: pt.reducer.toIn, w: pt.reducer.wallFt }; const o = mk(pt, kind, st); o.wt = cur.w; o.sizeIn = cur.s; if (pt.mode === 'step') { o.inv = prevEnd.inv - prevEnd.wt + pt.step + cur.w; if (!lenker) o.reading = hiHigh - o.inv; } return o; };
    const startPt = mk2(run.start, 'start', off);
    const hubs = run.hubs.map((h, i) => ({ h, i })).sort((a, b) => a.h.station - b.h.station || a.i - b.i).map(x => mk2(x.h, 'hub', off + x.h.station));
    const endPt = mk2(run.end, 'end', off + run.dist);
    pts.push(startPt, ...hubs, endPt);
    prevEnd = endPt; off += run.dist;
  });
  const total = off;
  const segs = []; for (let i = 0; i < pts.length - 1; i++) segs.push({ a: pts[i], b: pts[i + 1] });
  function gradeAt(x, pointIndex) {
    if (pointIndex !== undefined && pointIndex !== null) { const p = pts[pointIndex]; return rowOf(p.inv, p.reading, p); }
    const s = segs.find(g => x >= g.a.station - 1e-9 && x <= g.b.station + 1e-9 && g.b.station > g.a.station) || segs[segs.length - 1];
    const f = s.b.station > s.a.station ? (x - s.a.station) / (s.b.station - s.a.station) : 0;
    const inv = s.a.inv + (s.b.inv - s.a.inv) * f;
    const reading = lenker ? null : s.a.reading + (s.b.reading - s.a.reading) * f;
    return rowOf(inv, reading, s.a);
  }
  function rowOf(inv, reading, p) {
    const w = p.wt, it = invToTop(sc.pipeType, p.sizeIn, w);
    const o = { inv, bop: w !== null ? inv - w : null, top: it !== null ? inv + it : null, sg: (w !== null && p.bedding !== null) ? inv - w - p.bedding : null };
    if (!lenker) { o.rInv = reading; o.rBop = w !== null ? reading + w : null; o.rTop = it !== null ? reading - it : null; o.rSg = (w !== null && p.bedding !== null) ? reading + w + p.bedding : null; }
    return o;
  }
  // ---- stations (text) ----
  const runStarts = []; { let o2 = 0, s = sc.startSta, d = sc.dir || 1; sc.runs.forEach((run, i) => { runStarts.push({ off: o2, sta: s, dir: d }); if (s !== null && s !== undefined) s = s + d * run.dist; o2 += run.dist; }); }
  function staOf(x, runN) { const rs = runStarts[(runN || 1) - 1]; if (rs.sta === null || rs.sta === undefined) return ''; return staText(rs.sta + rs.dir * (x - rs.off)); }
  function runOfX(x) { let n = 1; runStarts.forEach((r, i) => { if (r.off <= x + 0.0005) n = i + 1; }); return n; }
  // ---- expected row stations (interval or laying length) ----
  function expectedStations() {
    const out = []; let o2 = 0;
    sc.runs.forEach((run, i) => {
      const n = i + 1;
      if (run.lay && run.lay.on) {
        const L = run.lay.len, D = { joints: 1, halves: 2, quarters: 4 }[run.lay.div], marks = [];
        let x = 0; while (x < run.dist - 1e-6) { const end = x + L; if (end <= run.dist + 1e-6) { if (L / D >= 0.5 - 1e-9) for (let j = 1; j < D; j++) marks.push(x + L * j / D); marks.push(Math.min(end, run.dist)); } else { const rem = run.dist - x; if (rem >= 0.05) { if (rem / D >= 0.5 - 1e-9) for (let j = 1; j < D; j++) marks.push(x + rem * j / D); marks.push(run.dist); } break; } x = end; }
        marks.forEach(m => out.push({ st: r3(o2 + m), run: n, lay: true }));
      } else {
        for (let k = 0; k * run.interval < run.dist - 1e-9; k++) out.push({ st: r3(o2 + k * run.interval), run: n });
      }
      out.push({ st: r3(o2 + run.dist), run: n }); out.push({ st: r3(o2), run: n });
      o2 += run.dist;
    });
    return out;
  }
  // ---- volumes ----
  function beddingYd3() { let cf = 0, any = false, inc = false; segs.forEach(s => { const L = s.b.station - s.a.station; if (L <= 0) return; if (s.a.bedding === null) { inc = true; return; } any = true; if (s.a.bedding === 0) return; if (!(s.a.tw > 0)) { inc = true; return; } cf += s.a.tw * L * s.a.bedding; }); return { yd3: any && !inc ? cf / 27 : null, any, inc }; }
  function groundAt(x, side) { // ground line: straight between stakes (any run), structures: arriving uses the first, leaving the last
    const g = pts.filter(p => p.pt.mode === 'stake').map(p => ({ x: p.station, e: p.pt.stakeElev }));
    if (g.length < 2) return null;
    const here = g.filter(q => Math.abs(q.x - x) < 1e-6); if (here.length > 1) return side === 'leave' ? here[here.length - 1].e : here[0].e;
    for (let i = 0; i < g.length - 1; i++) if (x >= g[i].x - 1e-9 && x <= g[i + 1].x + 1e-9) { const sp = g[i + 1].x - g[i].x; return sp > 0 ? g[i].e + (g[i + 1].e - g[i].e) * (x - g[i].x) / sp : g[i].e; }
    return null;
  }
  function backfillYd3() { // net trench (vertical sides to BOP) minus the submerged pipe, integrated along every real segment
    if (!pts.some(p => p.pt.mode === 'stake')) return { yd3: null, reason: 'no stakes' };
    let cf = 0;
    for (const s of segs) {
      const L = s.b.station - s.a.station; if (L <= 0) continue;
      const tw = s.a.tw, w = s.a.wt; if (!(tw > 0) || w === null) return { yd3: null, reason: 'no tw/wall' };
      const R = odFtOf(sc.pipeType, s.a.sizeIn, w) / 2, N = 4000;
      const ga = groundAt(s.a.station, 'leave'), gb = groundAt(s.b.station, 'arrive'); if (ga === null || gb === null) return { yd3: null, reason: 'ground unknown' };
      let acc = 0;
      for (let k = 0; k < N; k++) { const t = (k + 0.5) / N, x = s.a.station + L * t; const g = groundAt(x) === null ? ga + (gb - ga) * t : (x > s.a.station + 1e-6 && x < s.b.station - 1e-6 ? groundAt(x) : ga + (gb - ga) * t); const bop = (s.a.inv + (s.b.inv - s.a.inv) * t) - w; const d = g - bop; const tr = tw * Math.max(0, d); let pa; if (d >= 2 * R) pa = Math.PI * R * R; else if (d <= 0) pa = 0; else pa = R * R * Math.acos((R - d) / R) - (R - d) * Math.sqrt(Math.max(0, 2 * R * d - d * d)); acc += (tr - pa); }
      cf += acc * L / N;
    }
    return { yd3: Math.max(0, cf / 27), reason: null };
  }
  return { pts, segs, total, hiLow, hiHigh, gradeAt, staOf, runOfX, expectedStations, beddingYd3, backfillYd3, lenker };
}
module.exports = { compute, invToTop, odIn, odFtOf, tableWallFt, staText, archText, r3 };
