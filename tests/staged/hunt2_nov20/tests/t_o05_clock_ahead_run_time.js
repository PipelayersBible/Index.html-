// hunt2 05: the phone's clock is ahead (argv minutes, default 120) when a run is locked and pipe is laid offline; the
// clock then corrects itself and the run is ended. The run must still end and reach the company, and its report must
// not show a negative time.
// Run: PB_ROOT=http://127.0.0.1:<port>/ PB_SITE=<folder that serves it> PG=<hook page> node t_o05_clock_ahead_run_time.js [minutes]
const path = require('path'); const R = path.resolve(__dirname, '../../../bughunt_nov17/offline/rig');
const { launch } = require(R + '/srv'), co = require(R + '/co_ok'), F = require(R + '/flow'), L = require(R + '/lib');
const AHEAD = (+process.argv[2] || 120) * 60000; let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { b, ctx, p, S, page } = await launch(process.env.PB_ROOT + (process.env.PG || 'cur.html'), { init: co });
  await p.close(); await ctx.setOffline(true);
  await ctx.clock.install({ time: Date.now() + AHEAD }); await ctx.clock.resume();
  const p1 = await page();
  await L.newRun(p1, 100); await L.lock(p1); const r = await L.rows(p1); await L.markLaid(p1, r[10]); await p1.waitForTimeout(800);
  await p1.close({ runBeforeUnload: false });
  await ctx.clock.setSystemTime(Date.now() - AHEAD); await ctx.setOffline(false); // network time is back
  const p2 = await page(); await p2.waitForTimeout(2500);
  await p2.evaluate(() => pbResumeLastRunResults()); await p2.waitForTimeout(2000);
  await p2.evaluate(() => { window.__pbNoEndLaidAsk = true; const x = [...document.querySelectorAll('#screen-results button')].find(x => /^End Run/.test(x.textContent.trim()) && x.offsetParent); x && x.click(); }); await p2.waitForTimeout(1500);
  for (let i = 0; i < 5; i++) { const bs = await F(p2).modalBtns(); if (!bs.length) break; const c = ['End Run', 'Now', 'Just Now', 'Yes', 'OK', 'Got It'].find(x => bs.includes(x)) || bs[bs.length - 1]; await F(p2).modalClick(c); await p2.waitForTimeout(1200); }
  await p2.waitForTimeout(8000);
  const e = await p2.evaluate(() => { const e = window.__pbRrDebug.run(); return { completed: !!e.completed, dur: e.durationMin, lines: (e.reportText || '').split('\n').filter(l => /time on run|Time this session/i.test(l)) }; });
  console.log(JSON.stringify(e));
  ok(e.completed, 'the run ended');
  ok(typeof e.dur === 'number' && e.dur < 0, 'the record keeps what the clocks said (end before start: ' + Math.round(e.dur) + ' min)');
  ok(e.lines.length > 0 && !e.lines.some(l => /-\d/.test(l)), 'the report shows no negative time: "' + e.lines.join(' | ') + '"');
  ok(e.lines.some(l => /not known/.test(l)), 'it says the time is not known and why');
  ok(S.calls.filter(c => c.n === 'pb_prod_run_record_put' && c.done).length > 0, 'the ended run reached the company');
  ok(!p2.errs.length, 'no page errors ' + p2.errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'RESULT: ' + fails + ' failed' : 'RESULT: all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
