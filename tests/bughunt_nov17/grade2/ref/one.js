// Debug one scenario: node ref/one.js SEED [PAGE]  -> points app vs reference, then the mismatches
'use strict';
const fs = require('fs'), path = require('path');
const boot = require('/home/claude/rig/boot'), co = require('/home/claude/rig/co');
const { gen } = require('./gen'), { compare } = require('./compare'), { compute } = require('./refcalc');
const SEED = +process.argv[2], PAGE = process.argv[3] || 'cur.html';
(async () => {
  const { b, p } = await boot('http://127.0.0.1:8843/' + PAGE, { init: co });
  await p.evaluate(src => window.__ev(src), fs.readFileSync(path.join(__dirname, 'driver.js'), 'utf8'));
  const sc = process.env.SC ? JSON.parse(fs.readFileSync(process.env.SC, 'utf8')) : gen(SEED);
  if (process.env.SHOW) console.log(JSON.stringify(sc));
  const app = await p.evaluate(sc => { window.__g2fill(sc); const r = window.__g2calc(); r.form = { rs: (window.__ev('JSON.stringify(pbStCapture(lastCalc))')) }; return r; }, sc);
  if (app.errors) { console.log(app.errors); await b.close(); return; }
  const ref = compute(sc);
  console.log('HI app', app.hi, 'lay', app.hiLay, '| ref low', ref.hiLow, 'high', ref.hiHigh, '| runStations', JSON.stringify(app.runStations));
  app.points.forEach((q, i) => { const r = ref.pts[i]; console.log(q.id.padEnd(10), 'st', q.st, 'pi', q.pi && q.pi.toFixed(4), r && r.inv.toFixed(4), 'rd', q.rd !== null ? q.rd.toFixed(4) : null, r && r.reading !== null ? r.reading.toFixed(4) : null, 'wt', q.wt, r && r.wt, 'id', q.idFt && (q.idFt * 12).toFixed(2), r && r.sizeIn, r && r.pt.mode); });
  const res = compare(sc, app);
  res.out.slice(0, 30).forEach(m => console.log('  ', m));
  if (process.env.ROWS) app.rows.forEach(r => console.log(r.st, r.hub || '', r.pi.toFixed(4), JSON.stringify(r.d), r.sta));
  console.log('vol', JSON.stringify(app.vol), 'bed', JSON.stringify(app.bed), 'ref bed', JSON.stringify(ref.beddingYd3()), 'ref bf', JSON.stringify(ref.backfillYd3()));
  console.log('errs', p.errs);
  await b.close();
})();
