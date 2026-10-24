// Batch 17 END: an end entered later reaches production, the live status and the 24-hour claim lists, said so.
// On batch 14 F's production mock (lf_lib / pd_lib: a company, the pb_prod_* rpc fakes).
//  P (a pipelayer): Mon 07:00 lock, Joe checked in 07:10, rows marked laid to 30.0 at 15:00; opened Wed 07:00 (48 h:
//    past F's 36-hour "current" window); entered "Mon 16:00 at 40.0".
//    - crew hours end at the entered time (Joe checked out Mon 16:00, not Wed)
//    - the run's status is sent once more: ended, endedAt = Mon 16:00, endLate, endEnteredAt (Wed 07:00), the point,
//      the phone's time zone
//    - Feet of pipe installed is filled in to where it ended (40), said so; the production record for the session is
//      unchanged in shape (workDate = the start day)
//  W (a foreman): the claim list line "Run ended … (entered next day at …)" from pb_prod_crew_run_ends
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const E = require('./ea_lib.js');
const sleep = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const browser = await M.chromium.launch();
  try {
    { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer', touch: false });
      await page.clock.install({ time: new Date('2026-10-12T07:00:00') });
      await page.reload(); await sleep(page, 1800); await M.dismiss(page);
      await M.lockRun(page); await M.dismiss(page);
      const id = await page.evaluate(async () => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101';
        e.crewLog = [{ id: 'crew-t1', name: 'Joe Lopez', type: 'Laborer', category: '', status: 'in', log: [{ action: 'Checked In', time: Date.now() + 10 * 60000 }] }];
        await window.__debugSaveRunArchive(); return e.id; });
      await page.clock.fastForward(8 * 3600000); await page.evaluate(() => pbLaidMark(3)); await sleep(page, 600); // Mon 15:00
      await page.evaluate(() => pbGoto('home')); await page.clock.fastForward(16 * 3600000 + 24 * 3600000); // Wed 07:00
      await page.evaluate(() => { window.__statusPuts = []; });
      await E.openRun(page); await sleep(page, 900);
      check('P: Wed: asked where Monday’s run ended (point filled in: 30.0, laid)', (await E.title(page)) === 'Where Did This Run End?' && (await E.fields(page)).point === await E.keyOf(page, 3));
      check('P: days offered Mon..Wed', JSON.stringify((await E.fields(page)).days) === '["2026-10-12","2026-10-13","2026-10-14"]');
      await E.fill(page, { pointIdx: 4, day: '2026-10-12', time: '16:00' }); await E.tap(page, 'Save Where It Ended'); await sleep(page, 1500);
      check('P: recorded ("entered Wed, Oct 14 at 7:00 AM": two days later)', (await E.title(page)) === 'End Recorded' && /entered Wed, Oct 14 at 7:00 AM/.test(await E.message(page)));
      await E.tap(page, 'Not Today'); await sleep(page, 400);
      const crew = await page.evaluate((id) => JSON.parse(JSON.stringify(window.__debugGetArchive().find(x => x.id === id).crewLog)), id);
      const out = crew[0].log[crew[0].log.length - 1];
      check('P: Joe is checked out at the entered end (Mon 16:00), so crew hours end there', crew[0].status === 'out' && /^Checked Out/.test(out.action) && new Date(out.time).toString().slice(4, 21) === 'Oct 12 2026 16:00');
      let put = null; for (let t = 0; t < 40 && !put; t++) { await sleep(page, 500); put = await page.evaluate((id) => (window.__statusPuts || []).filter(s => s.sessionRef === String(id) && s.ended).pop() || null, id); }
      check('P: the status says ended, at the entered end (Mon 16:00), even 48 h after the start', put && put.ended === true && new Date(put.endedAt).toString().slice(4, 21) === 'Oct 12 2026 16:00');
      check('P: … and that the end was entered later: endLate, endEnteredAt (Wed 07:00), 40.0 / 40 ft, via next_day', put && put.endLate === true && new Date(put.endEnteredAt).toString().slice(4, 21) === 'Oct 14 2026 07:00' && put.endStation === '40.0' && put.endFt === 40 && put.endVia === 'next_day');
      check('P: … with the phone’s time zone (for the 9 PM–6 AM rule)', put && typeof put.tz === 'string' && put.tz.length > 0);
      // the Foreman Production Entry on that run: Feet of pipe installed filled in to where it ended
      await page.evaluate(() => pbResumeLastRunResults()); await sleep(page, 800); await M.dismiss(page);
      const fp = await page.evaluate(() => ({ v: document.getElementById('fpPipeInstalled').value, hint: (document.getElementById('fpLaidHint') || {}).textContent || '', hidden: (document.getElementById('fpLaidHint') || {}).hidden }));
      check('P: Feet of pipe installed is filled in to where it ended (40, not the 30 marked laid), and says so', fp.v === '40' && /where the run ended \(40\.0, entered/.test(fp.hint) && fp.hidden === false);
      await page.fill('#fpForeman', 'Wes'); await page.evaluate(() => pbSaveForemanData()); await sleep(page, 2500); await M.dismiss(page);
      for (let t = 0; t < 20 && !(await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_save'))); t++) await sleep(page, 500);
      const sv = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_save').pop());
      check('P: the production entry for that session: work date Monday, 40 ft of pipe, crew hours to 16:00 (8.8 h)', sv && sv.args.p_record.workDate === '2026-10-12' && sv.args.p_items.some(i => i.key === 'pipe' && i.qty === 40) && sv.args.p_items.some(i => i.key === '_manhours' && Math.abs(i.qty - 8.83) < 0.02));
      check('P: no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
      await ctx.close(); }
    { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman', touch: false });
      await page.evaluate(() => {
        const srv = JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}');
        srv.entries['acctP|run:w1'] = { id: '00000000-0000-0000-0000-0000000000e1', user: 'acctP', company: 'c1', versions: [1], record: { jobNumber: '24-101', workDate: '2026-10-12', enteredBy: 'Wes Hall', sessionRef: 's1' }, items: [{ key: 'pipe', qty: 40, unit: 'LF' }], crew: { state: 'pending', created: Date.now() - 3600000, assigned: null } };
        localStorage.setItem('__psrv', JSON.stringify(srv));
        const o = window.__rpc; window.__rpc = async (fn, a) => fn === 'pb_prod_crew_run_ends' ? (window.__rpcLog.push({ fn }), { data: { server_at: new Date().toISOString(), ends: [{ id: '00000000-0000-0000-0000-0000000000e1', run_end_at: new Date(2026, 9, 12, 16, 0).toISOString(), end_entered_at: new Date(2026, 9, 13, 6, 42).toISOString(), end_late: true, end_station: '40.0', end_ft: 40 }] }, error: null }) : o(fn, a);
      });
      await page.evaluate(() => window.pbOpenProdMine()); await sleep(page, 2500);
      let txt = ''; for (let t = 0; t < 20; t++) { txt = await page.evaluate(() => (document.getElementById('pmWaiting') || {}).textContent || ''); if (/Run ended/.test(txt)) break; await page.evaluate(() => window.pbProdSyncNow && window.pbProdSyncNow()); await sleep(page, 500); }
      check('W: the waiting run asks the end from the server (pb_prod_crew_run_ends)', await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_crew_run_ends')));
      check('W: Runs waiting for you: "Run ended Mon, Oct 12 at 4:00 PM at 40.0 (entered next day at 6:42 AM)"', /Run ended Mon, Oct 12 at 4:00 PM at 40\.0 \(entered next day at 6:42 AM\)/.test(txt));
      check('W: no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
      await ctx.close(); }
  } finally { await browser.close(); }
})();
