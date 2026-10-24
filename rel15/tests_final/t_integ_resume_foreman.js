// r15 final copy: same as fix_endsheet/tests/updated/t_integ_resume.js, but the run is laid on a FOREMAN account, since r15 ROLES hides the Foreman Production Entry from company pipelayers (owner ruling).
// r14 integration fix 1 (HIGH): a resumed run counts only THAT session's feet.
// Mon 07:00 lock (200 ft, rows every 10 ft), rows marked laid to 80.0 at 15:00, foreman saves 80. Tue 06:42 the run is
// opened: END asks, "ended at 80.0, Mon 16:00", Continue Today, the new session is locked. Rows 0.0-80.0 show as laid in
// an earlier session (read-only); laying to 140.0 marks only 90.0-140.0: the pre-fill says 60 (not 140), the live status
// sends laidFt 60 / laidToFt 140, the grade rows and report are untouched. Left open again, Wed 06:42 END asks again:
// "ended at 140.0": the pre-fill is 60 (END's, less the 80 ft laid earlier). Saved: production 80 + 60, Job Summary
// 140 ft (no "reported more than measured" flag). The session's PDF says the earlier rows were laid earlier.
// On batch 14 F's production mock (lf_lib / pd_lib) with Playwright's clock, as batch 17 END's t_ea_prod.js.
// Run: flock /home/claude/pw.lock env PB_TEST_DIR=/home/claude/rel14/integ/site PB_TEST_PORT=8811 ./run.sh /home/claude/rel14/integ/tests/t_integ_resume.js 300
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const E = require('/home/claude/batch17/END/tests/ea_lib.js');
const sleep = (p, ms) => p.waitForTimeout(ms);
const S = (page) => page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); const s = window.pbLaidSummaryOf(e.id);
  return { id: e.id, from: e.resumedFromId, n: s.n, nOwn: s.nOwn, early: s.early, laidFt: s.laidFt, sessionFt: s.sessionFt, earlierFt: s.earlierFt, far: s.far, marks: Object.keys((e.laid && e.laid.marks) || {}).length,
    log: (e.laid && e.laid.log) || [], pipe: document.getElementById('fpPipeInstalled').value, hint: (document.getElementById('fpLaidHint') || {}).textContent || '', hintShown: !!document.getElementById('fpLaidHint') && !document.getElementById('fpLaidHint').hidden,
    progress: document.getElementById('laidProgress').textContent, rows: JSON.stringify(e.intervalRows), summary: JSON.stringify(e.summary), segments: JSON.stringify(e.segments || null), report: e.reportText || '' }; });
const lockForm = async (page) => {
  await page.click('text=Review & Calculate').catch(() => {}); await sleep(page, 500);
  await page.click('button[onclick="pbLock()"]').catch(() => {});
  for (let i = 0; i < 30; i++) { await sleep(page, 300); if (await page.evaluate(() => !!document.querySelector('#screen-results.active'))) break; await M.dismiss(page); }
};
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'foreman' });
    await page.clock.install({ time: new Date('2026-10-12T07:00:00') });
    await page.reload(); await sleep(page, 1800); await M.dismiss(page);
    page._cdp = await ctx.newCDPSession(page);
    const id1 = await M.lockRun(page, { dist: 200 }); await M.dismiss(page);
    await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = 'J-INT'; return window.__debugSaveRunArchive(); }); await sleep(page, 300);
    // ---- day 1 ----
    await page.clock.fastForward(8 * 3600000); // Mon 15:00
    await page.evaluate(() => pbLaidMark(8)); await sleep(page, 700);
    let s = await S(page);
    check('day 1: laid to 80.0, pre-fill 80 (not a resumed run: as before)', s.laidFt === 80 && s.sessionFt === 80 && s.pipe === '80' && /Filled in from the rows marked laid \(80 ft\)/.test(s.hint) && /^Pipe laid: 80 of 200 ft, last/.test(s.progress));
    await page.fill('#fpForeman', 'Wes'); await page.evaluate(() => pbSaveForemanData()); await sleep(page, 2500); await M.dismiss(page);
    check('day 1: production saved with 80 ft of pipe', await L.waitFor(page, (i) => window.__rpcLog.some(x => x.fn === 'pb_prod_save' && JSON.stringify(x.args).includes('"pipe"') && JSON.stringify(x.args).includes('"qty":80')), 15000));
    await page.evaluate(() => pbGoto('home')); await sleep(page, 300);
    // ---- Tue 06:42: END asks, ended at 80.0 Mon 16:00, Continue Today ----
    await page.clock.fastForward(15 * 3600000 + 42 * 60000);
    await E.openRun(page); await sleep(page, 900);
    check('Tue: "Where Did This Run End?"', (await E.title(page)) === 'Where Did This Run End?');
    await E.fill(page, { pointIdx: 8, day: '2026-10-12', time: '16:00' }); await E.tap(page, 'Save End'); await sleep(page, 1800);
    check('end recorded, Continue Today offered', (await E.title(page)) === 'End Recorded');
    await E.tap(page, 'Continue Today'); await sleep(page, 900);
    check('Continue Today: Resuming This Run', (await E.title(page)) === 'Resuming This Run');
    await M.dismiss(page); await sleep(page, 300);
    await lockForm(page); await M.dismiss(page); await sleep(page, 600);
    s = await S(page);
    check('day 2: a new session resumed from day 1 is on Results (got ' + s.id + ' from ' + s.from + ')', s.id !== id1 && s.from === id1 && (await L.screen(page)) === 'screen-results');
    await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = 'J-INT'; return window.__debugSaveRunArchive(); }); await sleep(page, 300);
    s = await S(page);
    const before = s;
    check('day 2 starts: rows 0.0-80.0 carried in as laid in an earlier session (9 rows), none stamped on this session', s.early.filter(Boolean).length === 9 && s.early[8] && !s.early[9] && s.n === 9 && s.nOwn === 0 && s.marks === 0);
    check('day 2 starts: nothing pre-filled (0 ft this session), progress "Pipe laid: 80 of 200 ft (this session 0 ft)"', s.pipe === '' && !s.hintShown && /^Pipe laid: 80 of 200 ft \(this session 0 ft\)/.test(s.progress));
    check('an earlier row: "Laid earlier", its menu button "Laid in an earlier session" (disabled), next row is 90.0', await page.evaluate(() => {
      const c = document.querySelector('#resultsBody tr[data-laid-idx="3"]:not([data-laid-strip]) > td:nth-child(2)'), b = document.querySelector('button[data-laid-btn="3"]'), nx = document.querySelector('#resultsBody tr.pb-laid-next:not([data-laid-strip])');
      return c.dataset.laidTag === 'Laid earlier' && c.closest('tr').classList.contains('pb-laid-early') && b && b.disabled && b.textContent === 'Laid in an earlier session' && nx && nx.dataset.laidIdx === '9'; }));
    // a swipe back on an earlier row does nothing; the menu way neither
    let p = await L.rowPoint(page, 5); await L.touchDrag(page, p.x, p.y, -150, 2); await sleep(page, 500);
    await page.evaluate(() => pbLaidToggleRow(5)); await sleep(page, 500);
    s = await S(page);
    check('swipe back / Undo on an earlier session\'s row: nothing changes, said so', s.n === 9 && s.marks === 0 && s.log.length === 0 && /laid in an earlier session/.test(await page.evaluate(() => document.getElementById('laidLive').textContent)));
    // lay to 140.0 with a real swipe
    await page.clock.fastForward(4 * 3600000); // Tue 10:42
    p = await L.rowPoint(page, 14); await L.touchDrag(page, p.x, p.y, 160, 4, { steps: 12 }); await sleep(page, 900);
    s = await S(page);
    check('swipe on 140.0 marks only 90.0-140.0 (6 rows) on this session', s.marks === 6 && s.log.length === 1 && s.log[0].keys.length === 6 && s.n === 15 && s.nOwn === 6);
    check('DAY 2 = 60 ft: pre-filled "Feet of pipe installed" is 60 (not 140)', s.sessionFt === 60 && s.pipe === '60');
    check('…with its note: "this session (60 ft; the 80 ft before them were laid in an earlier session)"', s.hintShown && /rows marked laid this session \(60 ft; the 80 ft before them were laid in an earlier session\)/.test(s.hint));
    check('progress line: "Pipe laid: 140 of 200 ft (this session 60 ft), last …"', /^Pipe laid: 140 of 200 ft \(this session 60 ft\), last/.test(s.progress));
    check('grade rows, summary, segments and the report text unchanged by the marks', s.rows === before.rows && s.summary === before.summary && s.segments === before.segments && s.report === before.report);
    check('live status: laidFt 60 (this session), laidToFt 140 / laidTo 140.0 (the run\'s progress)', await L.waitFor(page, (sid) => window.__rpcLog.some(x => x.fn === 'pb_prod_run_status_put' && x.args.p_status.sessionRef === String(sid) && x.args.p_status.laidFt === 60 && x.args.p_status.laidToFt === 140 && x.args.p_status.laidToStation === '140.0'), 20000, s.id));
    // undo from 120.0 removes only this session's 120-140
    await page.evaluate(() => pbLaidUndo(12)); await sleep(page, 700);
    s = await S(page);
    check('undo from 120.0: back to 110.0, 30 ft this session, the earlier rows kept', s.n === 12 && s.sessionFt === 30 && s.pipe === '30' && s.early.filter(Boolean).length === 9);
    await page.evaluate(() => pbLaidMark(14)); await sleep(page, 700);
    // ---- left open: Wed 06:42 END asks again; ended at 140.0 Tue 16:00 ----
    await page.evaluate(() => pbGoto('home')); await sleep(page, 300);
    await page.clock.fastForward(20 * 3600000);
    await E.openRun(page); await sleep(page, 900);
    check('Wed: the resumed session left open is asked about too', (await E.title(page)) === 'Where Did This Run End?');
    await E.fill(page, { pointIdx: 14, day: '2026-10-13', time: '16:00' }); await E.tap(page, 'Save End'); await sleep(page, 1800);
    await E.tap(page, 'Not Today'); await sleep(page, 600); await M.dismiss(page);
    await page.evaluate((i) => pbResumeLastRunResults(), 0); await sleep(page, 900); await M.dismiss(page);
    s = await S(page);
    check('END\'s pre-fill on the resumed session ended later: 60, "less the 80 ft laid in an earlier session" (got ' + s.pipe + ')', s.pipe === '60' && /where the run ended \(140\.0, .*\), less the 80 ft laid in an earlier session: 60 ft/.test(s.hint));
    await page.fill('#fpForeman', 'Wes'); await page.evaluate(() => pbSaveForemanData()); await sleep(page, 2500); await M.dismiss(page);
    check('production for day 2\'s session: 60 ft of pipe (not 140)', await L.waitFor(page, (sid) => window.__rpcLog.some(x => x.fn === 'pb_prod_save' && JSON.stringify(x.args).includes(String(sid)) && /"key":"pipe","qty":60\b/.test(JSON.stringify(x.args))), 15000, s.id)
      && !(await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_save' && /"key":"pipe","qty":140\b/.test(JSON.stringify(x.args))))));
    await page.evaluate(() => pbOpenJobSummary()); await sleep(page, 400); await page.selectOption('#jobSummaryPicker', 'J-INT'); await sleep(page, 600);
    const js = await page.evaluate(() => document.getElementById('jobSummaryContent').innerText.replace(/\s+/g, ' '));
    check('Job Summary: 140.0 ft of pipe installed over the two sessions, no "reported more than measured" flag', /Feet Pipe Installed 140\.0 ft/i.test(js) && !/foremen reported/i.test(js));
    // the session's PDF: the earlier rows say so in the Laid at column
    await page.evaluate(() => { window.__pdfData = null; window.__debugPdfSink = (d) => { window.__pdfData = d; }; });
    await page.evaluate((sid) => pbDownloadArchivePDF(window.__debugGetArchive().findIndex(e => e.id === sid)), s.id);
    for (let i = 0; i < 40 && !(await page.evaluate(() => !!window.__pdfData)); i++) await sleep(page, 250);
    const pdfData = await page.evaluate(() => window.__pdfData); let pdf = '';
    if (pdfData) { const fs = require('fs'), os = require('os'), path = require('path'); const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pbint-')), 'run.pdf'); fs.writeFileSync(f, Buffer.from(pdfData.split(',')[1], 'base64')); pdf = require('child_process').execFileSync('pdftotext', ['-raw', f, '-']).toString().replace(/\s+/g, ' '); }
    check('PDF: rows laid on day 1 read "laid in an earlier session", not "not marked"', /laid in an earlier session/.test(pdf) && (pdf.match(/laid in an earlier session/g) || []).length >= 9);
    errs.push(...page._errors);
    await ctx.close();
  } catch (e) { console.log('TEST ERROR', e); process.exitCode = 1; }
  check('no JS errors' + (errs.length ? ': ' + errs.join(' | ') : ''), !errs.length);
  await browser.close();
})();
