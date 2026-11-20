// hunt2 grade re-check: my own scenario maker (same scenario shape the grade2 form driver fills). Seeds 0..: random;
// kind forces an edge family.
'use strict';
function rng(seed) { let s = (seed * 2654435761 + 12345) >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const KINDS = ['plain', 'plain', 'plain', 'fill', 'flat', 'steep', 'long', 'station', 'step', 'reducer', 'tiny', 'deep'];
function make(seed, force) {
  const R = rng(seed + 1), u = (a, b) => a + (b - a) * R(), pick = (a) => a[Math.floor(R() * a.length)], ch = (p) => R() < p;
  const kind = force || KINDS[seed % KINDS.length];
  const rod = pick(['engineer', 'engineer', 'architect', 'architect', 'lenker']), arch = rod === 'architect';
  const q = (x) => arch ? Math.round(x * 192) / 192 : Math.round(x * 100) / 100;
  const nRuns = kind === 'step' ? 2 + Math.floor(R() * 2) : ch(0.25) ? 2 : 1;
  const base = kind === 'deep' ? u(-40, 5) : u(20, 6000);
  const sizes = [4, 6, 8, 10, 12, 15];
  const hiTrue = q(base + u(14, 22)); // on the typing grid, so a shot is exact
  let inv = base; const runs = [];
  const sc = { seed, kind, rod, pipeType: kind === 'reducer' ? 'PVC SDR 35' : '', runs, hiMode: rod === 'lenker' ? 'stakes' : pick(['direct', 'bm', 'stakes']), startSta: null, dir: 1, staEntry: 'dist' };
  let shotLeft = sc.hiMode === 'stakes' ? 1 : 0;
  for (let n = 1; n <= nRuns; n++) {
    const dist = kind === 'long' ? Math.round(u(2000, 9000)) : kind === 'tiny' ? Math.round(u(2, 12) * 100) / 100 : ch(0.5) ? Math.round(u(40, 700)) : Math.round(u(20, 500) * 100) / 100;
    const interval = kind === 'long' ? pick([50, 100]) : kind === 'tiny' ? pick([1, 2.5]) : pick([5, 10, 20, 25, 50, 12.5]);
    const sizeIn = kind === 'reducer' ? pick([10, 12, 15]) : pick(sizes);
    const run = { n, sizeIn, wallFt: Math.round(u(0.02, 0.12) * 1000) / 1000, wallAuto: false, bedding: ch(0.7) ? pick([0.25, 0.33, 0.5, 1]) : null, trenchWidth: null, dist, interval, lay: null, hubs: [] };
    const nh = kind === 'tiny' ? 0 : Math.floor(R() * 4) + (kind === 'reducer' ? 1 : 0);
    const xs = []; for (let i = 0; i < nh; i++) { const x = Math.round(u(1, dist - 1) * (ch(0.5) ? 1 : 100)) / (1); const xx = ch(0.5) ? Math.round(x) : Math.round(u(1, dist - 1) * 100) / 100; if (xx > 0.5 && xx < dist - 0.5 && !xs.some(y => Math.abs(y - xx) < 0.6)) xs.push(xx); }
    xs.sort((a, b) => a - b);
    const slope = () => kind === 'flat' ? 0 : kind === 'steep' ? u(20, 100) / 100 * (ch(0.5) ? 1 : -1) : kind === 'long' ? u(0.04, 0.5) / 100 * (ch(0.5) ? 1 : -1) : u(-3, 3) / 100;
    const pt = (elevTrue) => {
      const r = R();
      if (r < 0.65 || rod === 'lenker' && r < 0.8) { const fill = kind === 'fill' ? ch(0.7) : ch(0.06); const cf = q(fill ? u(0.01, 6) : ch(0.05) ? 0 : u(0.5, 13)); const p = { mode: 'stake', cf: fill ? 'fill' : 'cut', cfVal: cf, stakeElev: q(fill ? elevTrue - cf : elevTrue + cf), shot: null }; if (shotLeft && hiTrue - p.stakeElev > 0.2) { p.shot = hiTrue - p.stakeElev; shotLeft = 0; } return p; }
      if (r < 0.88 || rod === 'lenker' || sc.hiMode === 'stakes') return { mode: 'elev', elev: q(elevTrue) };
      return { mode: 'elev', elev: null, elevReading: q(hiTrue - q(elevTrue)) };
    };
    const stations = [0].concat(xs, [dist]); let cur = inv; const el = [cur];
    for (let i = 1; i < stations.length; i++) { cur += (stations[i] - stations[i - 1]) * slope(); el.push(cur); }
    run.start = (n > 1 && (kind === 'step' || ch(0.5))) ? { mode: 'step', step: q(ch(0.3) ? 0 : u(-0.8, 0.8)) } : pt(el[0]);
    run.hubs = xs.map((x, i) => Object.assign(pt(el[i + 1]), { station: x }));
    run.end = pt(el[el.length - 1]);
    if (kind === 'reducer' && run.hubs.length) { const h = run.hubs[Math.floor(R() * run.hubs.length)]; const to = pick(sizes.filter(s => s < sizeIn)); h.reducer = { toIn: to, wallFt: null, wallTyped: false }; }
    runs.push(run); inv = cur + (ch(0.5) ? 0 : u(-0.3, 0.3));
  }
  if (sc.hiMode === 'stakes' && shotLeft) { sc.hiMode = rod === 'lenker' ? 'stakes' : 'direct'; }
  if (rod !== 'lenker') { if (sc.hiMode === 'direct') sc.hiDirect = hiTrue; if (sc.hiMode === 'bm') { sc.bmBS = q(u(3, 8)); sc.bmElev = hiTrue - sc.bmBS; if (arch) sc.bmElev = Math.round(sc.bmElev * 192) / 192; else sc.bmElev = Math.round(sc.bmElev * 100) / 100; } }
  if (kind === 'station' || ch(0.35)) {
    const total = runs.reduce((a, r) => a + r.dist, 0);
    sc.dir = ch(0.5) ? 1 : -1; sc.startSta = pick([0, 100, 99.99, 1234.5, 12345.67, Math.round(u(0, 30000) * 100) / 100, Math.round(u(0, 500))]);
    if (sc.dir === -1 && sc.startSta < total) sc.startSta = Math.round((sc.startSta + Math.ceil(total / 100) * 100) * 100) / 100;
    sc.staEntry = ch(0.5) ? 'sta' : 'dist';
  }
  return sc;
}
module.exports = { make, KINDS };
