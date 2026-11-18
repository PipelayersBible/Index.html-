// Flip property: node ref/run_flip.js FROM TO [PAGE] [WORKERS]. Single-run scenarios: after Flip This Run, the row at
// distance d must carry exactly the grade the row at (total - d) had before (INV, BOP, TOP, subgrade, readings), the HI
// must not move, and the station text of a row must be the same stake's station as before.
'use strict';
const fs = require('fs'), path = require('path');
const boot = require(__dirname+'/../../../rig/boot'), co = require(__dirname+'/../../../rig/co');
const { gen } = require('./gen');
const FROM = +(process.argv[2] || 0), TO = +(process.argv[3] || 50), PAGE = process.argv[4] || 'cur.html', W = +(process.argv[5] || 4);
const DRV = fs.readFileSync(path.join(__dirname, 'driver.js'), 'utf8');
(async () => {
  const seeds = []; for (let s = FROM; s < TO; s++) seeds.push(s);
  let n = 0, rows = 0, bad = 0; const kinds = {};
  const worker = async () => {
    const { b, p } = await boot((process.env.PB_ROOT||'http://127.0.0.1:8843/') + PAGE, { init: co });
    await p.evaluate(src => window.__ev(src), DRV);
    while (seeds.length) {
      const s = seeds.shift(); const sc = gen(s, { nRuns: 1 });
      sc.runs[0].lay = null; sc.runs[0].hubs.forEach(h => { delete h.reducer; }); // flip: interval rows (laying-length marks re-lay from the new start by design)
      let A, B;
      try { A = await p.evaluate(sc => { window.__g2fill(sc); return window.__g2calc(); }, sc); if (A.errors) continue; B = await p.evaluate(() => window.__g2flip()); }
      catch (e) { console.log('seed', s, 'driver', e.message.slice(0, 200)); continue; }
      n++;
      const out = [];
      if (B.errors) { out.push('flip errors: ' + B.errors.join(' | ')); }
      else {
        if (A.hi !== null && Math.abs(A.hi - B.hi) > 0.0005) out.push('HI ' + A.hi + ' -> ' + B.hi);
        const P = A.points, at = (x, k) => { for (let i = 0; i < P.length - 1; i++) { const u = P[i], v = P[i + 1]; if (x >= u.st - 1e-9 && x <= v.st + 1e-9 && v.st > u.st) return u[k] + (v[k] - u[k]) * (x - u.st) / (v.st - u.st); } return null; };
        const dup = x => P.filter(q => Math.abs(q.st - x) < 1e-6).length > 1;
        const off0 = A.rows[0], dB = off0.bp - off0.pi, dT = off0.tp === null ? null : off0.tp - off0.pi;
        B.rows.forEach(r => { rows++;
          const x = A.total - r.st; if (dup(x)) return;
          const inv = at(x, 'pi'), rd = A.points[0].rd === null ? null : at(x, 'rd');
          if (inv === null) { out.push('no grade at ' + x); return; }
          if (Math.abs(inv - r.pi) > 0.005) out.push('INV at ' + r.st + ': ' + r.pi.toFixed(4) + ' (before, at ' + x.toFixed(3) + ': ' + inv.toFixed(4) + ')');
          if (rd !== null && Math.abs(rd - r.ri) > 0.005) out.push('rINV at ' + r.st + ': ' + r.ri.toFixed(4) + ' (before ' + rd.toFixed(4) + ')');
          if (r.bp !== null && Math.abs((r.bp - r.pi) - dB) > 0.0005) out.push('BOP offset at ' + r.st);
          if (dT !== null && r.tp !== null && Math.abs((r.tp - r.pi) - dT) > 0.0005) out.push('TOP offset at ' + r.st);
          const ax = A.rows.find(y => Math.abs(y.st - x) < 0.0005 && !dup(y.st)); if (ax && ax.sta && r.sta !== ax.sta) out.push('station at ' + r.st + ': ' + r.sta + ' (before ' + ax.sta + ')');
        });
      }
      if (out.length) { bad++; console.log('seed', s, sc.rod, JSON.stringify(out.slice(0, 4))); out.forEach(o => { const k = o.replace(/[-\d.]+/g, '#').slice(0, 40); kinds[k] = (kinds[k] || 0) + 1; }); }
      if (p.errs.length) console.log('seed', s, 'page errors', p.errs.splice(0).slice(0, 2));
    }
    await b.close();
  };
  await Promise.all(Array.from({ length: W }, worker));
  console.log(`flip: runs ${n}, rows ${rows}, runs with a mismatch ${bad}`); Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log(String(v).padStart(5), k));
})();
