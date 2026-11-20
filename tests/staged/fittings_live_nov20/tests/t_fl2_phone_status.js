// fittings_live 02: the PHONE. The live status a crew phone already sends now carries the fittings laid so far ("fit").
//   - a run with no fittings: no new field at all (the status is what it was)
//   - fittings on the run: n laid of N, and by type (tees/wyes, bends, manholes/structures, other), as rows are marked laid
//   - the count is the daily report's own "counted by the app" count (pbFitCount) whenever laid marks are used or the run is ended
//   - a run in progress with nothing marked laid says 0 (not "all of them")
//   - a server from before this update just answers ok: nothing fails, nothing is asked twice
const path = require('path');
const h = require(path.resolve(__dirname, '../../hunt_nov19/tests/hlib.js'));
const URL = process.env.PB_URL || 'http://127.0.0.1:10050/cur.html';
const CAP = ";window.__flPuts=[];window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_prod_run_status_put:(a)=>{window.__flPuts.push(JSON.parse(JSON.stringify(a)));return {ok:true,stale:false,server_at:new Date().toISOString()};}});";
const lastPut = (p) => p.evaluate(() => { const a = window.__flPuts; return a.length ? a[a.length - 1] : null; });
const waitPut = async (p, test) => { for (let i = 0; i < 24; i++) { const a = await lastPut(p); if (a && test(a.p_status)) return a; await p.waitForTimeout(500); } return await lastPut(p); };
(async () => {
  const { b, p } = await h.lockedRun({ url: URL, init: CAP });
  // ---- no fittings on the run: nothing new is sent ----
  let a = await waitPut(p, () => true);
  h.ok(a && a.p_status && a.p_status.sessionRef && !('fit' in a.p_status), 'a run with no fittings: the status has no "fit" field (same as before): ' + (a ? Object.keys(a.p_status).join(',') : 'no status sent'));
  h.ok(a && Object.keys(a).sort().join() === 'p_access_company,p_expect_uid,p_status', 'the same server call with the same three arguments');
  // ---- put five fittings on the run (30 wye, 50 tee, 70 bend, 90 "Manhole", 100 "Gate valve") ----
  await p.evaluate(() => { const e = window.__pbCsEntry(), R = e.intervalRows; const put = (i, id, fit) => { R[i].pointId = id; e.pointInputs[id] = Object.assign(e.pointInputs[id] || {}, { fit }); };
    put(3, 'hub1', { type: 'wye', info: '8x6' }); put(5, 'hub2', { type: 'tee', info: '' }); put(7, 'hub3', { type: 'bend', info: '45°' }); put(9, 'hub4', { type: 'other', info: 'Manhole' }); put(10, 'end', { type: 'other', info: 'Gate valve' }); });
  let f = await p.evaluate(() => { const e = window.__pbCsEntry(); return { live: window.__pbLiveFitOf(e), daily: window.pbFitCount(e) }; });
  h.ok(JSON.stringify(f.live) === JSON.stringify({ fit: { n: 0, of: 5, tw: 0, b: 0, s: 0, o: 0 } }), 'in progress, nothing marked laid: 0 of 5 (the daily would say ' + f.daily.total + ' once ended; live says none yet): ' + JSON.stringify(f.live));
  // ---- mark rows laid: through 50 ft -> the wye and the tee ----
  for (const i of [1, 2, 3, 4, 5]) { await p.evaluate((i) => window.pbLaidMark(i), i); await p.waitForTimeout(250); }
  a = await waitPut(p, (s) => s.fit && s.fit.n === 2);
  f = await p.evaluate(() => window.pbFitCount(window.__pbCsEntry()));
  h.ok(a && JSON.stringify(a.p_status.fit) === JSON.stringify({ n: 2, of: 5, tw: 2, b: 0, s: 0, o: 0 }), 'laid to 50 ft: the phone sends 2 of 5, both tees/wyes: ' + JSON.stringify(a && a.p_status.fit));
  h.ok(f.total === 2 && f.planned === 5 && f.laidOnly === true, 'the same count the daily report makes (counted by the app): ' + f.total + ' of ' + f.planned);
  h.ok(a && a.p_status.laidFt === 50 && a.p_status.laidToStation === '50.0' && a.p_status.totalFt === 100, 'the rest of the status is as before (laid 50 of 100 ft): ' + JSON.stringify(a && [a.p_status.laidFt, a.p_status.laidToStation, a.p_status.rowsLaid]));
  // ---- through 90 ft: + the bend and the manhole ----
  for (const i of [6, 7, 8, 9]) { await p.evaluate((i) => window.pbLaidMark(i), i); await p.waitForTimeout(250); }
  a = await waitPut(p, (s) => s.fit && s.fit.n === 4);
  h.ok(a && JSON.stringify(a.p_status.fit) === JSON.stringify({ n: 4, of: 5, tw: 2, b: 1, s: 1, o: 0 }), 'laid to 90 ft: 4 of 5: 2 tees/wyes, 1 bend, 1 manhole/structure: ' + JSON.stringify(a && a.p_status.fit));
  // ---- the last row: the gate valve is "other" ----
  await p.evaluate(() => window.pbLaidMark(10));
  a = await waitPut(p, (s) => s.fit && s.fit.n === 5);
  f = await p.evaluate(() => window.pbFitCount(window.__pbCsEntry()));
  h.ok(a && JSON.stringify(a.p_status.fit) === JSON.stringify({ n: 5, of: 5, tw: 2, b: 1, s: 1, o: 1 }) && f.total === 5, 'all laid: 5 of 5, 1 other; the daily count agrees (' + f.total + '): ' + JSON.stringify(a && a.p_status.fit));
  h.ok(a && a.p_status.fit.tw + a.p_status.fit.b + a.p_status.fit.s + a.p_status.fit.o === a.p_status.fit.n, 'the types add up to the count (the server drops them otherwise)');
  const size = a ? JSON.stringify(a.p_status).length : 99999;
  h.ok(size < 1500, 'the status stays small (' + size + ' characters; the server takes up to 4,000 bytes)');
  // ---- an ended run with no laid marks counts like the daily (all of them, or up to where it stopped) ----
  f = await p.evaluate(() => { const e = JSON.parse(JSON.stringify(window.__pbCsEntry())); delete e.laid; const open = window.__pbLiveFitOf(e).fit; e.completed = true; const done = window.__pbLiveFitOf(e).fit, daily = window.pbFitCount(e).total;
    delete e.completed; e.incomplete = true; e.completedDistance = 60; const short = window.__pbLiveFitOf(e).fit, dailyShort = window.pbFitCount(e).total; return { open, done, daily, short, dailyShort }; });
  h.ok(f.open.n === 0 && f.done.n === 5 && f.daily === 5, 'no laid marks: in progress 0, ended 5 (the daily: ' + f.daily + ')');
  h.ok(f.short.n === 2 && f.dailyShort === 2 && f.short.of === 5, 'no laid marks, ended short at 60 ft: 2 of 5 (the daily: ' + f.dailyShort + ')');
  // ---- an "old" server (answers ok, knows nothing of fit): the queue empties, nothing repeats ----
  await p.waitForTimeout(4000);
  const q = await p.evaluate(() => { const d = window.__pbLiveDebug(); return { pending: Object.keys(d.q.pending).length, sent: Object.keys(d.q.sent).length, puts: window.__flPuts.length }; });
  await p.waitForTimeout(5000);
  const q2 = await p.evaluate(() => window.__flPuts.length);
  h.ok(q.pending === 0 && q.sent === 1 && q2 === q.puts, 'sent once per change and then quiet (pending ' + q.pending + ', sends ' + q.puts + ' then ' + q2 + ')');
  h.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await h.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
