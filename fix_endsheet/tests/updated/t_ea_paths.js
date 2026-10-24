// Batch 17 END: when the "run left open" question is asked, and when not.
//  C same-day resume: no question (morning and late evening of the start day)
//  D night shift: started Mon 22:00, opened Tue 02:00: asked, with Still Working, which records nothing
//  E the earliest end is the run's last recorded activity (a note at Mon 12:00): 11:30 refused, 12:30 accepted
//  F reload mid-question: nothing half-saved; asked again after the reload
//  G the notification link (#/run/endask) on the start day: asked, Still Working, then saved ("entered later"); again:
//    already ended; no open run at all: said so
//  H account switch while the question is open: the question goes, neither account's run is ended; the other
//    account's own run asks about ITS run
const E = require('./ea_lib.js'); const { L, check, sleep } = E;
const M = require('/home/claude/test/hunt15/accounts/mock15.js');
const note = async (page, text) => { await page.evaluate(() => document.querySelector('button[onclick="pbToggleNote(this, 5)"]').click()); await sleep(page, 150);
  await page.evaluate((t) => { const tr = document.querySelector('#note5Photo').closest('tr'); tr.querySelector('textarea').value = t; return pbSaveNote(tr.querySelector('button.pb-btn:not(.ghost)'), 5); }, text); await sleep(page, 800); await L.dismiss(page); };
(async () => {
  const browser = await L.chromium.launch();
  try {
    // ---------- C ----------
    { const { page, id } = await E.start(browser, 'eaC', '2026-10-12T07:00:00');
      await page.evaluate(() => pbGoto('home')); await page.clock.fastForward(3 * 3600000);
      await E.openRun(page); await sleep(page, 700);
      check('C: same day (10:00): Continue Run opens Results with no question', (await E.screen(page)) === 'screen-results' && !(await E.modalUp(page)));
      await page.evaluate(() => pbGoto('home')); await page.clock.fastForward(13.5 * 3600000); // Mon 23:30
      await E.openRun(page); await sleep(page, 700);
      check('C: same day 23:30: still no question', (await E.screen(page)) === 'screen-results' && !(await E.modalUp(page)) && !(await E.runOf(page, id)).incomplete);
      check('C: no JS errors', page._errors.length === 0); await page.context().close(); }
    // ---------- D ----------
    { const { page, id } = await E.start(browser, 'eaD', '2026-10-12T22:00:00');
      await page.evaluate(() => pbGoto('home')); await page.clock.fastForward(4 * 3600000); // Tue 02:00
      await E.openRun(page); await sleep(page, 700);
      check('D: night shift (Mon 22:00 to Tue 02:00): asked', (await E.title(page)) === 'Where Did This Run End?');
      check('D: Still Working is offered (last activity 4 h ago)', JSON.stringify(await E.buttons(page)) === '["Save End","Still Working","Not Now"]');
      const F = await E.fields(page);
      check('D: the day can be Mon (start) or Tue (a shift past midnight)', JSON.stringify(F.days) === '["2026-10-12","2026-10-13"]');
      await E.tap(page, 'Still Working'); await sleep(page, 400);
      check('D: Still Working: stays on Results, records nothing', (await E.screen(page)) === 'screen-results' && !(await E.modalUp(page)) && !(await E.runOf(page, id)).endEntry && !(await E.runOf(page, id)).incomplete);
      await page.evaluate(() => pbGoto('home')); await sleep(page, 200); await E.openRun(page); await sleep(page, 700);
      check('D: opened again in the same shift: not asked again', !(await E.modalUp(page)));
      check('D: no JS errors', page._errors.length === 0); await page.context().close(); }
    // ---------- E ----------
    { const { page, id } = await E.start(browser, 'eaE', '2026-10-12T07:00:00');
      await page.clock.fastForward(5 * 3600000); await note(page, 'crew at the tee'); // Mon 12:00
      await page.evaluate(() => pbGoto('home')); await page.clock.fastForward(19 * 3600000); // Tue 07:00
      await E.openRun(page); await sleep(page, 700);
      await E.fill(page, { pointIdx: 3, day: '2026-10-12', time: '11:30' }); await E.tap(page, 'Save End'); await sleep(page, 400);
      check('E: Mon 11:30, before the 12:00 note: refused "before the run’s last recorded activity"', (await E.title(page)) === 'Check Where It Ended' && /last recorded activity/.test(await E.message(page)) && !(await E.runOf(page, id)).incomplete);
      await E.tap(page, 'Back'); await sleep(page, 300);
      await E.fill(page, { time: '12:30' }); await E.tap(page, 'Save End'); await sleep(page, 1500);
      const r = await E.runOf(page, id);
      check('E: Mon 12:30 at 30.0: recorded', (await E.title(page)) === 'End Recorded' && r.incomplete && r.dist === 30 && /Oct 12 2026 12:30/.test(r.end) && r.endEntry && r.endEntry.laidTo === null && r.endEntry.fromLaid === false);
      await E.tap(page, 'Not Today'); await sleep(page, 400);
      check('E: Not Today goes Home; the run is ended there (it can be finished from Home)', (await E.screen(page)) === 'screen-home');
      check('E: no JS errors', page._errors.length === 0); await page.context().close(); }
    // ---------- F ----------
    { const { page, id } = await E.start(browser, 'eaF', '2026-10-12T07:00:00');
      await page.evaluate(() => pbGoto('home')); await page.clock.fastForward(24 * 3600000);
      await E.openRun(page); await sleep(page, 700);
      await E.fill(page, { pointIdx: 6, time: '16:00' });
      check('F: question open with a time typed', (await E.title(page)) === 'Where Did This Run End?' && (await E.fields(page)).time === '16:00');
      await page.reload(); await sleep(page, 1500); await L.dismiss(page);
      const st = await E.storedRun(page, 'eaF', id);
      check('F: after the reload nothing was half-saved (still open, no end, no endEntry)', st && !st.incomplete && !st.completed && st.runEndTime === null && !st.endEntry);
      await E.openRun(page); await sleep(page, 900);
      const F = await E.fields(page);
      check('F: opened after the reload: asked again, fresh (time blank)', (await E.title(page)) === 'Where Did This Run End?' && F && F.time === '');
      await E.fill(page, { pointIdx: 6, day: '2026-10-12', time: '16:00' }); await E.tap(page, 'Save End'); await sleep(page, 1500);
      check('F: then saved normally', (await E.title(page)) === 'End Recorded' && (await E.storedRun(page, 'eaF', id)).incomplete);
      check('F: no JS errors', page._errors.length === 0); await page.context().close(); }
    // ---------- G ----------
    { const { page, id } = await E.start(browser, 'eaG', '2026-10-12T07:00:00');
      await page.clock.fastForward(7 * 3600000); await page.evaluate(() => pbLaidMark(7)); await sleep(page, 500); // Mon 14:00
      await page.evaluate(() => pbGoto('home')); await page.clock.fastForward(2 * 3600000); // Mon 16:00
      await page.evaluate(() => window.pbPushOpen('#/run/endask')); await sleep(page, 900);
      check('G: the notification opens the run on the question ("Did This Run End?") the same day', (await E.screen(page)) === 'screen-results' && (await E.title(page)) === 'Did This Run End?');
      check('G: Save / Still Working / Not Now; only today offered; point from the laid marks (70.0)', JSON.stringify(await E.buttons(page)) === '["Save End","Still Working","Not Now"]' && JSON.stringify((await E.fields(page)).days) === '["2026-10-12"]' && (await E.fields(page)).point === await E.keyOf(page, 7));
      await E.tap(page, 'Still Working'); await sleep(page, 300);
      check('G: Still Working records nothing', !(await E.runOf(page, id)).endEntry && !(await E.runOf(page, id)).incomplete);
      await page.evaluate(() => pbGoto('home')); await E.openRun(page); await sleep(page, 600);
      check('G: opening it normally the same day asks nothing', !(await E.modalUp(page)));
      await page.evaluate(() => pbGoto('home')); await page.evaluate(() => window.pbPushOpen('#/run/endask')); await sleep(page, 900);
      check('G: the notification again: asked again', (await E.title(page)) === 'Did This Run End?');
      await E.fill(page, { time: '15:45' }); await E.tap(page, 'Save End'); await sleep(page, 1500);
      const r = await E.runOf(page, id);
      check('G: saved "entered later at 4:00 PM"; the end, via the notification', (await E.title(page)) === 'End Recorded' && /entered later at 4:00 PM/.test(await E.message(page)) && r.incomplete && r.dist === 70 && /15:45/.test(r.end) && r.endEntry.via === 'push');
      await L.dismiss(page); await sleep(page, 300);
      await page.evaluate(() => window.pbPushOpen('#/run/endask')); await sleep(page, 600);
      check('G: the notification after the end: "Run Already Ended", nothing to enter', (await E.title(page)) === 'Run Already Ended' && /entered later/.test(await E.message(page)));
      check('G: no JS errors', page._errors.length === 0); await page.context().close(); }
    { const page = await L.newPage(browser, 'eaG2'); await L.dismiss(page);
      await page.evaluate(() => window.pbPushOpen('#/run/endask')); await sleep(page, 600);
      check('G: no open run on this phone: "No Open Run"', (await E.title(page)) === 'No Open Run');
      await page.context().close(); }
    // ---------- H ----------
    { const ctx = await M.newCtx(browser);
      await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); localStorage.setItem('legacyDataMigrated', 'true');
        localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctB', email: 'b@x.com' })); localStorage.setItem('lastKnownUserId', 'acctB');
        localStorage.setItem('acctA:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' })); localStorage.setItem('acctB:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' })); });
      const page = await M.open(ctx);
      await page.clock.install({ time: new Date('2026-10-12T07:00:00') });
      await page.reload(); await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none'); await sleep(page, 800); await L.dismiss(page);
      const idB = await L.lockRun(page, { dist: 100 }); await L.dismiss(page);
      await M.loginAs(page, 'a@x.com'); await sleep(page, 600); await L.dismiss(page);
      await page.clock.fastForward(60000);
      const idA = await L.lockRun(page, { dist: 150 }); await L.dismiss(page);
      await page.clock.fastForward(24 * 3600000 + 30 * 60000); // Tue 07:31
      await page.evaluate(() => { localStorage.setItem('__hangBoot', '1'); localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctB', email: 'b@x.com' })); });
      await page.reload(); await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none', null, { timeout: 15000 }); await sleep(page, 800); await L.dismiss(page);
      await E.openRun(page); await sleep(page, 800);
      const F = await E.fields(page);
      check('H: account A’s run asks (its last row is 150.0)', (await E.title(page)) === 'Where Did This Run End?' && F && /^150\.0/.test(F.options[F.options.length - 1]));
      await E.fill(page, { pointIdx: 5, day: '2026-10-12', time: '15:00' });
      await page.evaluate(() => window.__answerSession({ id: 'acctB', email: 'b@x.com' })); await sleep(page, 2500);
      const t = await E.title(page);
      check('H: the switch to account B takes A’s question away (no "Where Did This Run End?" about A’s run; got "' + t + '")', !(await E.fields(page)) || !/^150\.0/.test(((await E.fields(page)).options.slice(-1)[0]) || ''));
      for (let k = 0; k < 3; k++) { if (!(await E.modalUp(page))) break; if (await E.fields(page)) break; await L.dismiss(page); await sleep(page, 300); }
      const a = await E.storedRun(page, 'acctA', idA), b = await E.storedRun(page, 'acctB', idB);
      check('H: neither run was ended by the answer typed for A', a && !a.incomplete && !a.completed && !a.endEntry && b && !b.incomplete && !b.completed && !b.endEntry);
      if (!(await E.fields(page))) { await E.openRun(page); await sleep(page, 800); }
      const F2 = await E.fields(page);
      check('H: as B, the question is about B’s own run (last row 100.0), fresh', F2 && /^100\.0/.test(F2.options[F2.options.length - 1]) && F2.time === '');
      await E.fill(page, { pointIdx: 2, day: '2026-10-12', time: '10:00' }); await E.tap(page, 'Save End'); await sleep(page, 1500);
      const a2 = await E.storedRun(page, 'acctA', idA), b2 = await E.storedRun(page, 'acctB', idB);
      check('H: B’s answer ends only B’s run', b2 && b2.incomplete && b2.endEntry && b2.endEntry.by === 'acctB' && a2 && !a2.incomplete && !a2.endEntry);
      check('H: no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
      await ctx.close(); }
  } finally { await browser.close(); }
})();
