// Property run: node ref/run.js FROM TO [PAGE] [WORKERS]  (from /home/claude/rig, server on 8881)
// Generates scenarios FROM..TO-1, drives the app's form through each, compares every row with the reference.
'use strict';
const fs = require('fs'), path = require('path');
const boot = require('/home/claude/rig/boot'), co = require('/home/claude/rig/co');
const { gen } = require('./gen'), { compare } = require('./compare');
const FROM = +(process.argv[2] || 0), TO = +(process.argv[3] || 50), PAGE = process.argv[4] || 'cur.html', W = +(process.argv[5] || 4);
const DRV = fs.readFileSync(path.join(__dirname, 'driver.js'), 'utf8');
const OUT = process.env.OUT || path.join(__dirname, '..', 'runs_' + PAGE.replace(/\W/g, '_') + '.jsonl');
(async () => {
  const seeds = []; for (let s = FROM; s < TO; s++) seeds.push(s);
  let rowsT = 0, valsT = 0, runsT = 0, badRuns = 0; const kinds = {};
  fs.writeFileSync(OUT, '');
  const worker = async () => {
    const { b, p } = await boot('http://127.0.0.1:8843/' + PAGE, { init: co });
    await p.evaluate(src => window.__ev(src), DRV);
    while (seeds.length) {
      const s = seeds.shift(); const sc = gen(s);
      let app;
      try { app = await p.evaluate(sc => { window.__g2fill(sc); return window.__g2calc(); }, sc); }
      catch (e) { app = { errors: ['DRIVER ' + String(e.message || e).slice(0, 300)] }; }
      let res; try { res = compare(sc, app); } catch (e) { res = { out: ['COMPARE ' + e.message], rows: 0, vals: 0 }; }
      runsT++; rowsT += res.rows; valsT += res.vals;
      if (res.out.length) { badRuns++; res.out.forEach(m => { const k = m.replace(/[-\d.]+/g, '#').slice(0, 60); kinds[k] = (kinds[k] || 0) + 1; }); }
      fs.appendFileSync(OUT, JSON.stringify({ seed: s, rod: sc.rod, type: sc.pipeType, runs: sc.runs.length, rows: res.rows, bad: res.out }) + '\n');
      if (p.errs.length) { fs.appendFileSync(OUT, JSON.stringify({ seed: s, pageErrors: p.errs.splice(0) }) + '\n'); }
    }
    await b.close();
  };
  await Promise.all(Array.from({ length: W }, worker));
  console.log(`runs ${runsT}, rows ${rowsT}, values ${valsT}, runs with a mismatch ${badRuns}`);
  Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, v]) => console.log(String(v).padStart(5), k));
})();
