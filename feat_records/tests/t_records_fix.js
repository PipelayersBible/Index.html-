// feat_records (r15.32): R1 Job Summary says where a deleted session's hours went; R2 a superseded session says it was
// continued (Records row + Jobs page), the later one says what it resumes; R3 Home and Records use the same words for a run
// whose cloud copy failed; R4 the delete warning tells two same-label sessions apart and does not invent corrections;
// R5 the Job Summary notes table fits 390 px; R6 one status line on a saved-only report row; R7 "Records" on the Jobs page.
// Data: the night sweep's realistic set (feat_records/tests/data/storage.json; h_rec.js re-seeds it).
const H = require('/home/claude/feat_records/tests/h_rec.js'); const { L } = H;
const rowOf = (page, id) => page.evaluate((id) => { const A = window.__debugGetArchive(); const i = A.findIndex(e => e.id === id); return document.querySelectorAll('#archiveList .pb-arch-row')[i].innerText.replace(/\s+/g, ' '); }, id);
(async () => {
  const browser = await L.chromium.launch();
  const page = await H.seeded(browser, { time: new Date('2026-10-21T13:20:00Z') });
  const I = await H.ids(page);
  // R2: the resumed pair in Records
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(400);
  const b1 = await rowOf(page, I.B1), b2 = await rowOf(page, I.B2);
  L.check('R2: the superseded session says "continued in a later session" (not "(incomplete)")', /continued in a later session/.test(b1) && !/\(incomplete\)/.test(b1), b1);
  L.check('R2: the later session says what it resumes (label, lock date, where it stopped)', /resumes CB-4 → CB-5, locked 10\/20\/2026/.test(b2), b2);
  // R7 + R2 on the Jobs page
  await page.evaluate(() => pbOpenJobs()); await page.waitForTimeout(400);
  await page.evaluate(() => { const b = [...document.querySelectorAll('#screen-jobs button, #screen-jobs .pb-review-item')].find(x => /26020/.test(x.textContent)); if (b) b.click(); }); await page.waitForTimeout(400);
  const jobs = await H.txt(page, '#screen-jobs');
  L.check('R7: the Jobs page says Records, never "Reports on this phone"', !/your Reports/.test(jobs) && /Records/.test(jobs), jobs.slice(0, 300));
  L.check('R2: the Jobs page lists the earlier session as "Continued later", not "Ended early"', /Continued later/.test(jobs) && !/Ended early/.test(jobs), jobs.slice(0, 400));
  // R6: the saved-only report row
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(300);
  const rrow = await rowOf(page, I.R);
  L.check('R6: the saved-only report row carries one short status line', /Saved only — nothing was sent yet\./.test(rrow) && !/Send it from My Management Reports/.test(rrow), rrow);
  // R3: a run marked Sent whose cloud copy failed: Home uses the Records words
  await page.evaluate(async (id) => { const e = window.__debugGetArchive().find(x => x.id === id); e.cloudSyncFailed = true; await window.__debugSaveRunArchive(); pbOpenArchive(); }, I.A1); await page.waitForTimeout(400);
  await page.evaluate((id) => pbArchiveTap('pbToggleArchiveSent', id), I.A1); await page.waitForTimeout(600); await L.dismiss(page);
  await page.evaluate(() => pbGoto('home', false, true)); await page.waitForTimeout(700);
  const att = await H.txt(page, '#homeAttentionList');
  L.check('R3: Home says "no cloud copy … Retry Sync", not "NOT sent", for a run that was emailed', /with no cloud copy/.test(att) && /Retry Sync/.test(att) && !/NOT sent/.test(att), att);
  // R5: Job Summary notes table fits the phone
  await page.evaluate(() => { pbOpenJobSummary(); const p = document.getElementById('jobSummaryPicker'); p.value = '26014'; renderJobSummary(); }); await page.waitForTimeout(400);
  const fit = await page.evaluate(() => { const t = document.querySelector('#jobSummaryContent table.pb-notes-fixed'); if (!t) return { t: false }; const r = t.getBoundingClientRect(); const note = t.querySelector('tbody td:last-child'); const nr = note.getBoundingClientRect(); return { t: true, right: Math.round(r.right), noteRight: Math.round(nr.right), w: window.innerWidth, noteText: note.textContent.trim() }; });
  L.check('R5: the notes table and its Note cell end inside the 390 px screen [' + JSON.stringify(fit) + ']', fit.t && fit.right <= fit.w && fit.noteRight <= fit.w && fit.noteText.length > 0);
  // R4: deleting the earlier session: the warning names which session, and no invented corrections
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(300);
  await page.evaluate((id) => pbArchiveTap('pbDeleteArchiveEntry', id), I.B1); await page.waitForTimeout(400);
  let m = await H.modal(page);
  L.check('R4: the delete warning says it is an earlier session, names the later one with its lock date, and says what is kept; no "corrections"', !!m && /earlier session of CB-4 → CB-5 \(locked 10\/21\/2026\)/.test(m.msg) && /keeps this one’s time and crew hours/.test(m.msg) && !/corrections/.test(m.msg), m && m.msg);
  await H.clickBtn(page, /Delete|Continue/); await page.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) { m = await H.modal(page); if (!m) break; await H.clickBtn(page, /Keep in Stats|Continue|OK/); await page.waitForTimeout(600); }
  // R1: Job Summary 26020 after the deletion
  await page.evaluate(() => { pbOpenJobSummary(); const p = document.getElementById('jobSummaryPicker'); p.value = '26020'; renderJobSummary(); }); await page.waitForTimeout(400);
  const js = await H.txt(page, '#jobSummaryContent');
  const lab = (js.match(/Laborer Hours ([\d.]+) hr/) || [])[1], rate = (js.match(/Footage \/ Man-Hour ([\d.]+) ft/) || [])[1];
  L.check('R1: the hours grid says the 1.5 h from the deleted session is counted in the rate (Laborer ' + lab + ' h, rate ' + rate + ')', /\+ 1\.5 h of crew time from a deleted earlier session: counted in Footage \/ Man-Hour, not in the hours above/.test(js) && lab === '1.0' && Math.abs(200 / Number(rate) - 2.5) < 0.01, js.slice(0, 600));
  L.check('no JS errors', page._errors.length === 0, page._errors.join(' | '));
  await browser.close();
})();
