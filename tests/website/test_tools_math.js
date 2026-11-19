// Unit tests for the math on the free tool pages of pipelayersbible.com.
// Loads each page's <script id="tool-math"> exactly as published and checks it against hand-worked cases,
// and against the app's own functions pulled out of the app source (/home/claude/index.html-/index.html).
// Usage: node /tmp/claude-0/site/tools/test_tools_math.js
const fs = require('fs'); const vm = require('vm'); const assert = require('assert');
const WEB = process.env.WEB || '/tmp/claude-0/website'; const APP = process.env.APP || '/home/claude/index.html-/index.html';
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '\n   ', e.message); } };
const J = (x) => JSON.parse(JSON.stringify(x)); const deq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), (m || '') + ' got ' + a + ' want ' + b);

function pageMath(rel) {
  const html = fs.readFileSync(WEB + rel + 'index.html', 'utf8');
  const m = html.match(/<script id="tool-math">([\s\S]*?)<\/script>/); assert.ok(m, 'no tool-math in ' + rel);
  return vm.runInNewContext(m[1] + '\n;PBT', {});
}
// app source: pull out a function by name (brace matching from its first "{") or a "var/const NAME = {...};" object
const app = fs.readFileSync(APP, 'utf8');
function appFn(name) {
  const i = app.indexOf('function ' + name + '('); assert.ok(i >= 0, 'app has no ' + name);
  let j = app.indexOf('{', i), depth = 0;
  for (let k = j; k < app.length; k++) { if (app[k] === '{') depth++; else if (app[k] === '}') { depth--; if (!depth) return app.slice(i, k + 1); } }
  throw new Error('unbalanced ' + name);
}
function appObj(decl) { const i = app.indexOf(decl); assert.ok(i >= 0, 'app has no ' + decl); let j = app.indexOf('{', i), depth = 0; for (let k = j; k < app.length; k++) { if (app[k] === '{') depth++; else if (app[k] === '}') { depth--; if (!depth) return app.slice(i, k + 1) + ';'; } } }
const A = vm.runInNewContext([appFn('fmt'), appFn('toArch'), appFn('pbCutsheetStaText'), appObj('const TRENCH_SLOPES ='),
  appObj('var PB_OD_DI ='), appObj('var PB_OD_SDR35 ='), appObj('var PB_OD_IPS ='), appObj('var PB_OD_CORR ='), appFn('pbPipeOdIn'),
  ';({ fmt, toArch, staText: pbCutsheetStaText, TRENCH_SLOPES, pbPipeOdIn })'].join('\n'), {});
const appRow = (type, size) => { const m = app.match(new RegExp("'" + type + "': \\{ '4': \\[[^\\n]*")); assert.ok(m, 'no PB_PIPE_INDEX row ' + type); const r = m[0].match(new RegExp("'" + size + "': \\[([0-9.]+), ")); return Number(r[1]); };

// random values for the cross-checks (fixed seed)
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const samples = []; for (let i = 0; i < 20000; i++) { const v = (rnd() - 0.4) * (i % 3 === 0 ? 5 : i % 3 === 1 ? 200 : 3000); samples.push(Math.round(v * (i % 2 ? 1000 : 100)) / (i % 2 ? 1000 : 100) + (i % 5 === 0 ? 0.005 : 0)); }
samples.push(0, 0.5, -0.5, 19.825, 19.475, 2.675, 1.005, 99.99999, 11.99999, 0.03125, 0.96875);

// ======================= a) pipe grade =======================
const G = pageMath('/tools/pipe-grade-calculator/');
t('grade: fmt matches the app on 20,000 values (half away from zero)', () => { samples.forEach((v) => [0, 1, 2, 3].forEach((d) => assert.strictEqual(G.fmt(v, d), A.fmt(v, d), v + ' d' + d))); });
t('grade: toArch matches the app on 20,000 values', () => { samples.forEach((v) => assert.strictEqual(G.toArch(v), A.toArch(v), String(v))); });
t('grade: station text matches the app on 20,000 values', () => { samples.forEach((v) => assert.strictEqual(G.staText(v), A.staText(v), String(v))); });
t('grade: hand cases for fmt and toArch', () => {
  assert.strictEqual(G.fmt(19.825, 2), '19.83'); assert.strictEqual(G.fmt(19.475, 2), '19.48'); assert.strictEqual(G.fmt(-0.125, 2), '-0.13'); assert.strictEqual(G.fmt(2.675, 2), '2.68');
  assert.strictEqual(G.toArch(6.45), '6\'-5 3/8"'); assert.strictEqual(G.toArch(96.03), '96\'-0 3/8"'); assert.strictEqual(G.toArch(99.5), '99\'-6"');
  assert.strictEqual(G.toArch(0.1), '0\'-1 3/16"'); assert.strictEqual(G.toArch(1.99999), '2\'-0"'); assert.strictEqual(G.toArch(-0.5), '-0\'-6"');
  assert.strictEqual(G.staText(125), '1+25.00'); assert.strictEqual(G.staText(0), '0+00.00'); assert.strictEqual(G.staText(1234.567), '12+34.57'); assert.strictEqual(G.staText(199.999), '2+00.00');
});
t('grade: 250 ft at 0.40% falling from 100.00, every 25 ft', () => {
  const g = G.gradeTable(100, 0.4, 'down', 250, 25);
  deq(g.rows.map((r) => r.d), [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250]);
  deq(g.rows.map((r) => G.fmt(r.elev, 2)), ['100.00', '99.90', '99.80', '99.70', '99.60', '99.50', '99.40', '99.30', '99.20', '99.10', '99.00']);
  near(g.end, 99); near(g.change, 1); near(g.inPerFt, 0.048);
});
t('grade: rising run and an odd length (last row at the end, not past it)', () => {
  const g = G.gradeTable(96.03, 2, 'up', 110, 25);
  deq(g.rows.map((r) => r.d), [0, 25, 50, 75, 100, 110]);
  deq(g.rows.map((r) => G.fmt(r.elev, 2)), ['96.03', '96.53', '97.03', '97.53', '98.03', '98.23']);
  near(g.inPerFt, 0.24); assert.strictEqual(G.toArch(g.change), '2\'-2 3/8"'); // 2.2 ft = 2'-2.4" -> 2 3/8
});
t('grade: stations built like the app (accumulated interval, rounded to 1/1000, equal ones merged)', () => {
  deq(G.stations(1, 0.1), [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  deq(G.stations(50, 0), [50], 'no interval: just the end');
  deq(G.stations(100, 33.333), [0, 33.333, 66.666, 99.999, 100]);
});
t('grade: drop to slope, and slope from two inverts (rise positive, like the app)', () => {
  near(G.slopeFromDrop(1, 250), 0.4);
  const s = G.slopeFromInverts(96.03, 95.03, 250); near(s.slopePct, -0.4); near(s.fall, 1, 1e-9); near(s.inPerFt, 0.048);
  const u = G.slopeFromInverts(100, 101.5, 75); near(u.slopePct, 2); near(u.fall, -1.5); near(u.inPerFt, 0.24);
  // the app's own segment formula: ((b.pi - a.pi) / dist) * 100
  [[100, 99.2, 200], [12.34, 12.99, 13], [500, 480, 1000]].forEach(([a, b, d]) => near(G.slopeFromInverts(a, b, d).slopePct, ((b - a) / d) * 100, 1e-12));
});

// ======================= b) rod reading =======================
const R = pageMath('/tools/rod-reading-to-invert/');
t('rod: fmt and toArch match the app', () => { samples.forEach((v) => { assert.strictEqual(R.fmt(v, 3), A.fmt(v, 3)); assert.strictEqual(R.toArch(v), A.toArch(v)); }); });
t('rod: HI and elevation (105.20 + 4.36 = 109.56; 109.56 - 12.85 = 96.71)', () => { const h = R.hi(105.2, 4.36); assert.strictEqual(R.fmt(h, 3), '109.560'); assert.strictEqual(R.fmt(R.elevFromRod(h, 12.85), 3), '96.710'); });
t('rod: 8" SDR 35: top of pipe is 0.68 ft above the invert (8.4 OD - 0.24 wall)', () => { const p = R.pipeFt('sdr35-8'); near(p.topFromInv, 0.68, 1e-12); near(p.wallFt, 0.02); });
t('rod: invert from a shot on the invert, on top of the pipe and under it', () => {
  assert.strictEqual(R.fmt(R.invertFromShot(96.71, 'top', 'sdr35-8'), 3), '96.030');
  assert.strictEqual(R.fmt(R.invertFromShot(96.01, 'bop', 'sdr35-8'), 3), '96.030');
  assert.strictEqual(R.fmt(R.invertFromShot(96.03, 'inv', 'sdr35-8'), 3), '96.030');
});
t('rod: reading to lay to (HI 109.56, design 96.03): invert 13.53, top 12.85, BOP 13.55', () => {
  assert.strictEqual(R.fmt(R.targetReading(109.56, 96.03, 'inv', 'sdr35-8'), 2), '13.53');
  assert.strictEqual(R.fmt(R.targetReading(109.56, 96.03, 'top', 'sdr35-8'), 2), '12.85');
  assert.strictEqual(R.fmt(R.targetReading(109.56, 96.03, 'bop', 'sdr35-8'), 2), '13.55');
});
t('rod: 8" C900 DR18: wall 0.503 in rounds to 0.042 ft like the app; top = 9.05/12 - 0.042', () => { const p = R.pipeFt('c900-8'); near(p.wallFt, 0.042); near(p.topFromInv, 9.05 / 12 - 0.042, 1e-12); });
t('rod: pipe ODs and walls are the app\'s (pbPipeOdIn and PB_PIPE_INDEX)', () => {
  Object.keys(R.PIPES).forEach((k) => {
    const [kind, size] = k.split('-'), type = kind === 'sdr35' ? 'PVC SDR 35' : 'PVC C900', p = R.PIPES[k];
    assert.strictEqual(p.od, A.pbPipeOdIn(type, Number(size)), k + ' OD'); assert.strictEqual(p.wall, appRow(type, size), k + ' wall');
    near(p.od / p.wall, kind === 'sdr35' ? 35 : 18, kind === 'sdr35' ? 0.4 : 0.05, k + ' DR (walls are rounded to 0.01 in or so)');
  });
});

// ======================= c) trench sloping =======================
const S = pageMath('/tools/trench-sloping/');
t('trench: Table B-1 ratios and angles (OSHA 1926 Subpart P App. B) and the app\'s TRENCH_SLOPES agree', () => {
  const osha = { rock: [0, 90], A: [0.75, 53], B: [1, 45], C: [1.5, 34] };
  Object.keys(osha).forEach((k) => { assert.strictEqual(S.SOILS[k].ratio, osha[k][0]); assert.strictEqual(S.SOILS[k].deg, osha[k][1]); assert.strictEqual(A.TRENCH_SLOPES[k].ratio, osha[k][0]); assert.strictEqual(A.TRENCH_SLOPES[k].deg, osha[k][1]); });
  assert.strictEqual(Object.keys(S.SOILS).length, 4, 'no short-term Type A choice on the site');
});
t('trench: 8 ft deep, 3 ft bottom: rock 3, A 15, B 19, C 27 ft top width', () => {
  const r = S.trench(8, 3).rows, by = {}; r.forEach((x) => { by[x.key] = x; });
  deq([by.rock.side, by.A.side, by.B.side, by.C.side], [0, 6, 8, 12]); deq([by.rock.top, by.A.top, by.B.top, by.C.top], [3, 15, 19, 27]);
});
t('trench: no bottom width gives the lay-back only; 12.5 ft Type C lays back 18.75', () => { const r = S.trench(12.5, null).rows; assert.strictEqual(r[3].side, 18.75); assert.strictEqual(r[3].top, null); });
t('trench: 19.99 ft still tabulated; 20 ft and deeper: engineer, no slope; 0 ft is an error', () => {
  assert.ok(S.trench(19.99, 2).rows); deq(S.trench(20, 2), { pe: true }); deq(S.trench(30, 2), { pe: true }); assert.strictEqual(S.trench(0, 2).error, 'depth');
});

// ======================= d) pipe volume and backfill =======================
const V = pageMath('/tools/pipe-volume-weight/');
t('volume: 7.48052 gal per ft3 (231 in3 a gallon), the same constant the app uses', () => { near(V.GAL_PER_CF, 1728 / 231, 1e-5); assert.ok(app.includes('cubicFt * 7.48052')); assert.strictEqual(V.GAL_PER_CF, 7.48052); });
t('volume: 100 ft of 8" ID = 34.91 ft3 = 261.12 gal, 2.611 gal/ft (rule of thumb 0.0408 x ID^2)', () => {
  const w = V.water(8, 100); near(w.cf, Math.PI / 9 * 100, 1e-9); assert.strictEqual(V.fmt(w.cf, 2), '34.91'); assert.strictEqual(V.fmt(w.gal, 2), '261.12'); near(w.galPerFt, 0.0408 * 64, 0.001);
});
t('volume: 1000 ft of 12" ID = 785.40 ft3 = 5875.19 gal', () => { const w = V.water(12, 1000); assert.strictEqual(V.fmt(w.cf, 2), '785.40'); assert.strictEqual(V.fmt(w.gal, 2), '5875.19'); });
t('volume: trench 3 x 6 x 100, 8.4" OD, 6" bed, 12" cover', () => {
  const r = V.trench(3, 6, 100, 8.4, 6, 12);
  near(r.totalCf, 1800); near(r.pipeCf, Math.PI * 0.35 * 0.35 * 100, 1e-9); near(r.zoneH, 2.2, 1e-12); near(r.aboveCf, 1140, 1e-9); near(r.zoneCf + r.aboveCf, r.fillCf, 1e-9);
  deq([r.totalCf, r.pipeCf, r.zoneCf, r.aboveCf, r.fillCf].map((c) => V.fmt(V.yd(c), 2)), ['66.67', '1.43', '23.02', '42.22', '65.24']);
});
t('volume: pipe zone deeper than the trench, and pipe wider than the trench, are refused', () => { assert.strictEqual(V.trench(3, 1, 10, 8.4, 6, 12).error, 'zone'); assert.strictEqual(V.trench(0.5, 6, 10, 8.4, 0, 0).error, 'wide'); });
t('volume: inside diameter from a pipe = OD - 2 walls (8" SDR 35: 7.92)', () => { near(V.idFromPipe('sdr35-8'), 7.92, 1e-12); near(V.idFromPipe('c900-6'), 6.9 - 0.766, 1e-12); assert.strictEqual(V.idFromPipe('nope'), null); });
t('volume: pipe table is the same on both pages that carry it', () => { deq(JSON.parse(JSON.stringify(V.PIPES)), JSON.parse(JSON.stringify(R.PIPES))); });

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
