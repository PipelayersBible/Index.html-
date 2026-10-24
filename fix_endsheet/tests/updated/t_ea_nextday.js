// Batch 17 END: a run left open overnight and opened the next morning asks where it ended and what time, before
// anything else. Mon 07:00 lock (100 ft, rows every 10 ft), rows marked laid to 40.0 at Mon 15:30, Tue 06:42 opened.
// Covers: the question and its defaults, refusals (before the start, before the last activity, in the future, no
// time), the recorded end (time as entered, "entered next day at 6:42 AM", the point, stored), nothing calculated
// changes, Continue Today (Resume This Run), Not Now, the record text and PDF line, and the last row = finished.
const E = require('./ea_lib.js'); const { L, check, sleep } = E;
(async () => {
  const browser = await L.chromium.launch();
  try {
    // ---------- A: the question, refusals, the recorded end, Continue Today ----------
    { const { page, id } = await E.start(browser, 'ea1', '2026-10-12T07:00:00');
      await page.clock.fastForward(8.5 * 3600000); // Mon 15:30
      await page.evaluate(() => pbLaidMark(4)); await sleep(page, 600);
      const before = await E.runOf(page, id);
      await page.evaluate(() => pbGoto('home')); await sleep(page, 300);
      await page.clock.fastForward(15 * 3600000 + 12 * 60000); // Tue 06:42
      await E.openRun(page); await sleep(page, 700);
      check('next day: opening the run asks "Where Did This Run End?" first (got "' + await E.title(page) + '")', (await E.title(page)) === 'Where Did This Run End?');
      check('the question names the start and the laid point (fix_endsheet: one line)', /^Run started Mon 7:0\d AM and was never ended\. Laid to 40\.0 \(3:30 PM\)\.$/.test(await E.message(page)));
      let F = await E.fields(page);
      check('the point is filled in from the furthest row marked laid (40.0)', F && F.point === await E.keyOf(page, 4) && /laid to here/.test(F.pointText));
      check('the day defaults to the start day; only Mon and Tue are offered', F.day === '2026-10-12' && JSON.stringify(F.days) === '["2026-10-12","2026-10-13"]');
      check('the time is blank until the person enters it', F.time === '');
      check('buttons: Save End / Not Now (no Same Shift: last activity was 23 h ago)', JSON.stringify(await E.buttons(page)) === '["Save End","Not Now"]');
      // no time
      await E.tap(page, 'Save End'); await sleep(page, 300);
      check('no time entered: refused, nothing recorded', (await E.title(page)) === 'Check Where It Ended' && /Enter the time/.test(await E.message(page)) && !(await E.runOf(page, id)).incomplete);
      await E.tap(page, 'Back'); await sleep(page, 300);
      // before the start
      await E.fill(page, { time: '06:30' }); await E.tap(page, 'Save End'); await sleep(page, 300);
      check('06:30 Mon (before the 07:00 start): refused "before the run started"', (await E.title(page)) === 'Check Where It Ended' && /before the run started/.test(await E.message(page)));
      await E.tap(page, 'Back'); await sleep(page, 300);
      F = await E.fields(page);
      check('Back keeps what was entered (point, day, time)', F.point === await E.keyOf(page, 4) && F.day === '2026-10-12' && F.time === '06:30');
      // in the future
      await E.fill(page, { day: '2026-10-13', time: '09:00' }); await E.tap(page, 'Save End'); await sleep(page, 300);
      check('Tue 09:00 (later than now, 06:42): refused "still to come"', (await E.title(page)) === 'Check Where It Ended' && /still to come/.test(await E.message(page)));
      await E.tap(page, 'Back'); await sleep(page, 300);
      check('nothing recorded by any refusal', !(await E.runOf(page, id)).incomplete && !(await E.runOf(page, id)).endEntry && (await E.storedRun(page, 'ea1', id)).runEndTime === null);
      // a valid end: Mon 16:30 at 40.0
      await E.fill(page, { day: '2026-10-12', time: '16:30' }); await E.tap(page, 'Save End'); await sleep(page, 1500);
      check('saved: "End Recorded" offers Continue Today / Not Today', (await E.title(page)) === 'End Recorded' && JSON.stringify(await E.buttons(page)) === '["Continue Today","Not Today"]');
      check('its text says when, where and "entered next day at 6:42 AM"', /work ended at 40\.0, Mon, Oct 12 at 4:30 PM \(entered next day at 6:42 AM\)/.test(await E.message(page)));
      const r = await E.runOf(page, id), st = await E.storedRun(page, 'ea1', id);
      check('the run ended incomplete at 40.0 ft, Mon 16:30, time entered after the fact', r.incomplete && !r.completed && r.dist === 40 && /Oct 12 2026 16:30/.test(r.end) && r.entered && /^40\.0/.test(r.stop));
      check('9.5 hours of work (07:00 to 16:30), not 23.7', Math.round(r.durationMin) === 570);
      check('endEntry keeps every time: end, entered (Tue 06:42), asked, the point, the laid point offered', r.endEntry && new Date(r.endEntry.enteredAt).toString().slice(16, 21) === '06:42' && r.endEntry.askedAt <= r.endEntry.enteredAt && r.endEntry.station === '40.0' && r.endEntry.laidTo && r.endEntry.laidTo.station === '40.0' && r.endEntry.fromLaid === true && r.endEntry.via === 'next_day' && r.endEntry.complete === false);
      check('stored on the phone with the end (Archive)', st && st.incomplete && st.endEntry && st.endEntry.endAt === st.runEndTime);
      check('no calculation output changed: grade rows, summary, segments identical', r.rows === before.rows && r.summary === before.summary && r.segments === before.segments);
      const rep = await E.reportOf(page, id);
      check('run record: "Run ended: … (entered next day at 6:42 AM)" and the entered-later line', /Run ended: .*\(entered next day at 6:42 AM\)/.test(rep) && /End entered .* \(run left open, asked .*\): work ended at 40\.0, .*Rows marked laid reached 40\.0 \(the point entered\)\./.test(rep));
      // the real PDF the app writes (batch 15 PDF's dispute-grade report in the r14 build, the original run PDF without it)
      await page.evaluate(() => { window.__pdfData = null; window.__debugPdfSink = (d) => { window.__pdfData = d; }; });
      await page.evaluate((id) => pbDownloadArchivePDF(window.__debugGetArchive().findIndex(e => e.id === id)), id);
      for (let i = 0; i < 40 && !(await page.evaluate(() => !!window.__pdfData)); i++) await sleep(page, 250);
      const pdfData = await page.evaluate(() => window.__pdfData); await page.evaluate(() => { window.__debugPdfSink = null; });
      let pdf = '';
      if (pdfData) { const fs = require('fs'), os = require('os'), path = require('path'); const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pbea-')), 'run.pdf'); fs.writeFileSync(f, Buffer.from(pdfData.split(',')[1], 'base64')); pdf = require('child_process').execFileSync('pdftotext', ['-raw', f, '-']).toString().replace(/\s+/g, ' '); }
      const newRpt = /Pipe Run Record/.test(pdf);
      console.log('   PDF: ' + (newRpt ? 'dispute-grade run report' : 'original run PDF'));
      check('PDF: the end says it was typed later and the entered-later line is there', newRpt
        ? /Run ended .*time typed on this phone the next day, at Oct 13, 2026 6:42 AM [A-Z]{2,5}/.test(pdf) && /Run left open, end entered later: .*Typed on this phone at Oct 13, 2026 6:42 AM [A-Z]{2,5} \(device time\): work ended at Sta .*Oct 12, 2026 4:30 PM [A-Z]{2,5}/.test(pdf) && /Server received: not known to this phone/.test(pdf) && /Run end typed on this phone the next day/.test(pdf)
        : /Ended: .*\(entered next day at 6:42 AM\)/.test(pdf) && /End entered .*work ended at 40\.0/.test(pdf));
      if (!(await page.evaluate(() => 1))) console.log(pdf.slice(0, 3000));
      await E.tap(page, 'Continue Today'); await sleep(page, 900);
      check('Continue Today: the run form opens to resume this run (Resuming This Run)', (await E.title(page)) === 'Resuming This Run' && (await E.screen(page)) === 'screen-input');
      check('setup check: no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
      await page.context().close(); }
    // ---------- B: Not Now goes Home and records nothing; the question comes back ----------
    { const { page, id } = await E.start(browser, 'ea2', '2026-10-12T07:00:00');
      await page.evaluate(() => pbGoto('home')); await page.clock.fastForward(24 * 3600000); // Tue 07:00
      await E.openRun(page); await sleep(page, 700);
      const F = await E.fields(page);
      check('B: no laid marks: no point filled in ("Choose the point")', F && F.point === '' && /Pick the last point/.test(await page.evaluate(() => document.getElementById('pbEaPointHelp').textContent)));
      await E.tap(page, 'Not Now'); await sleep(page, 500);
      check('B: Not Now goes Home and records nothing', (await E.screen(page)) === 'screen-home' && !(await E.runOf(page, id)).incomplete && !(await E.runOf(page, id)).endEntry);
      await page.evaluate(() => window.pbActiveBarGo && document.querySelector('[onclick^="pbActiveBarGo"]') ? document.querySelector('[onclick^="pbActiveBarGo"]').click() : window.pbHomeOpenRun()); await sleep(page, 700);
      check('B: opened again: asked again', (await E.title(page)) === 'Where Did This Run End?');
      // the last row = the whole run: recorded as finished
      await E.fill(page, { pointIdx: 10, day: '2026-10-12', time: '15:00' }); await E.tap(page, 'Save End'); await sleep(page, 1500);
      const r = await E.runOf(page, id);
      check('B: the last row (100.0, the whole run) ends it as finished, Mon 15:00 ("Run Finished")', (await E.title(page)) === 'Run Finished' && r.completed && !r.incomplete && /Oct 12 2026 15:00/.test(r.end) && r.endEntry && r.endEntry.complete === true);
      await E.tap(page, 'OK'); await sleep(page, 400);
      check('B: Home after', (await E.screen(page)) === 'screen-home');
      await page.evaluate(() => pbResumeLastRunResults()); await sleep(page, 700);
      check('B: opening the ended run again asks nothing', (await E.screen(page)) === 'screen-results' && !(await E.modalUp(page)));
      check('B: no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
      await page.context().close(); }
  } finally { await browser.close(); }
})();
