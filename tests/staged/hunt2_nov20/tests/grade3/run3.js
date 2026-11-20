// hunt2 grade re-check: node run3.js FROM TO   (PG=<hook page> PB_ROOT=http://127.0.0.1:PORT/)
// Fills the New Run form with each scenario (grade2's form driver), reads the app's calculation and compares every
// row with myref.js: values to 0.0005 ft, shown text exactly (a value sitting on a rounding edge may show either way).
'use strict';
const g = require('../../../../r1707/askgrade/tests/glib.js'), { make } = require('./mygen'), { solve } = require('./myref');
const FROM = +(process.argv[2] || 0), TO = +(process.argv[3] || 50), TOL = 0.0005;
(async () => {
  let T = await g.L(); const walls = {};
  for (const s of [4, 6, 8, 10, 12, 15]) walls[s] = await T.p.evaluate((s) => window.__ev("(pbPipeLookup('PVC SDR 35'," + s + ")||{}).wallFt"), s);
  let runs = 0, rows = 0, vals = 0, bad = 0; const kinds = {}; const byKind = {};
  for (let seed = FROM; seed < TO; seed++) {
    if (seed > FROM && (seed - FROM) % 60 === 0) { await T.b.close(); T = await g.L(); }
    const sc = make(seed); const out = []; let ref;
    try { ref = solve(sc, (s) => walls[s]); } catch (e) { continue; }
    let app; try { app = await T.run(sc); } catch (e) { app = { errors: ['DRIVER ' + String(e.message).slice(0, 200)] }; }
    runs++; byKind[sc.kind] = (byKind[sc.kind] || 0) + 1;
    if (app.errors) out.push('app errors: ' + app.errors.join(' | ').slice(0, 300));
    else {
      const seen = new Set(), say = (k, m) => { if (!seen.has(k)) { seen.add(k); out.push(m); } };
      if (Math.abs(app.total - ref.total) > 1e-6) say('total', 'total ' + app.total + ' ref ' + ref.total);
      if (sc.rod !== 'lenker' && (app.hi === null || Math.abs(app.hi - ref.hi) > TOL)) say('hi', 'HI ' + app.hi + ' ref ' + ref.hi);
      if (app.points.length !== ref.pts.length) say('npts', 'points ' + app.points.length + ' ref ' + ref.pts.length);
      const idx = new Map(); app.points.forEach((p, i) => idx.set(p.id, i));
      app.points.forEach((p, i) => { const q = ref.pts[i]; if (q && Math.abs(p.st - q.g) > 1e-6) say('ptst', 'point ' + p.id + ' at ' + p.st + ' ref ' + q.g); });
      app.rows.forEach(r => {
        rows++; const pi = r.hub ? idx.get(r.hub) : null, e = ref.at(r.st, pi); if (!e) { say('norow', 'row at ' + r.st + ' has no reference'); return; }
        const ck = (nm, a, b) => { vals++; if (b === null) { if (a !== null && a !== undefined) say(nm + 'x', nm + ' at ' + r.st + ': app ' + a + ' ref none'); return; } if (a === null || a === undefined || Math.abs(a - b) > TOL) say(nm, nm + ' at ' + r.st + (r.hub ? ' (' + r.hub + ')' : '') + ': app ' + a + ' ref ' + b.toFixed(5)); };
        ck('INV', r.pi, e.inv); ck('BOP', r.bp, e.bop); ck('TOP', r.tp, e.top); ck('SG', r.sg, e.sg);
        if (sc.rod !== 'lenker') { ck('rINV', r.ri, ref.hi - e.inv); if (e.bop !== null) { ck('rBOP', r.rb, ref.hi - e.bop); ck('rTOP', r.rt, ref.hi - e.top); } if (e.sg !== null) ck('rSG', r.rs, ref.hi - e.sg); }
        ['inv', 'bop', 'top', 'sg'].forEach(f => { vals++; const w = ref.shown(e[f]); if (r.d[f] === w) return; const v = e[f] === null ? null : sc.rod === 'lenker' ? e[f] : ref.hi - e[f], step = sc.rod === 'architect' ? 1 / 192 : 0.01;
          const edge = v !== null && Math.abs(((v / step) % 1 + 1) % 1 - 0.5) < 1e-4 / step; if (!edge) say('show-' + f, 'shown ' + f + ' at ' + r.st + ': app "' + r.d[f] + '" ref "' + w + '"'); });
        if (sc.startSta !== null) { vals++; const w = ref.sta(r.st); if (r.sta !== w) { const c = (sc.startSta + sc.dir * r.st) * 100, edge = Math.abs((c % 1 + 1) % 1 - 0.5) < 1e-4; if (!edge) say('sta', 'station at ' + r.st + ': app "' + r.sta + '" ref "' + w + '"'); } }
      });
      ref.marks.forEach(m => { if (!app.rows.some(r => Math.abs(r.st - m.g) < 0.0505)) say('mark', 'no row at interval mark ' + m.g + ' (run ' + m.run + ')'); });
      // slopes between consecutive points
      const segs = await T.p.evaluate(() => window.__ev('lastCalc.segments.map(s => s.slopePct)'));
      if (segs.length === ref.slopes.length) segs.forEach((s, i) => { vals++; if (Math.abs(s - ref.slopes[i]) > 1e-4 * Math.max(1, Math.abs(ref.slopes[i]))) say('slope', 'slope ' + i + ': app ' + s + ' ref ' + ref.slopes[i]); }); else say('nseg', 'segments ' + segs.length + ' ref ' + ref.slopes.length);
    }
    if (T.p.errs.length) out.push('page errors: ' + T.p.errs.splice(0).slice(0, 2).join(' | '));
    if (out.length) { bad++; console.log('seed ' + seed + ' [' + sc.kind + ', ' + sc.rod + ', ' + sc.runs.length + ' run(s)] ' + out.slice(0, 4).join(' ; ')); out.forEach(m => { const k = m.replace(/[-\d.]+/g, '#').slice(0, 50); kinds[k] = (kinds[k] || 0) + 1; }); }
  }
  console.log('scenarios ' + runs + ' ' + JSON.stringify(byKind) + ', rows ' + rows + ', values checked ' + vals + ', scenarios with a mismatch ' + bad);
  Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log(String(v).padStart(5) + ' ' + k));
  await T.b.close(); process.exit(bad ? 1 : 0);
})();
