// Chain A -> B -> C (each ended early, then resumed). A had a distance correction, so B's and
// C's reports list it under CORRECTION HISTORY "from an earlier session". C is emailed + marked
// SENT. A is deleted (the delete warns its corrections leave the later run's history). The
// delete rebuilds only A's direct neighbour B: C's stored report text (what Send Email sends and
// what SENT is bound to) still lists A's correction, while C's live report/PDF no longer does.
const C_ = require('/home/claude/test/hunt/corrections/common.js'); const L = C_.L;
async function endIncompleteAt(page, label) {
  await page.evaluate(() => { document.getElementById('endIncompletePanel').style.display = 'none'; pbToggleEndIncomplete(); }); await page.waitForTimeout(120);
  const ok = await page.evaluate((lab) => { const s = document.getElementById('endIncompleteStation'); s.selectedIndex = Array.from(s.options).findIndex(o => o.textContent.trim() === lab); return s.selectedIndex >= 0; }, label);
  await page.evaluate(() => pbEndRunIncomplete()); await page.waitForTimeout(900); await L.dismiss(page);
  return ok;
}
async function resume(page, id) {
  await page.evaluate(() => { pbGoto('home', false, true); pbOpenArchive(); });
  await page.evaluate((id) => pbArchiveTap('pbResumeIncompleteRun', id), id); await page.waitForTimeout(500); await L.dismiss(page);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
  await page.click('button[onclick="pbLock()"]'); await page.waitForTimeout(1200); await L.dismiss(page);
  return page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
}
const st = (page, id) => page.evaluate((id) => { const e = window.__debugGetArchive().find(x => x.id === id); return { sent: e.sent, rt: e.reportText, live: window.__debugBuildRunReportFromEntry(e) }; }, id);
(async () => {
  const browser = await L.chromium.launch();
  const uid = 'uP11p2';
  const page = await L.newPage(browser, uid);
  const A = await L.lockRun(page, {});
  const err = await C_.correctDist(page, 1, 90);
  const a0 = await page.evaluate((id) => (window.__debugGetArchive().find(x => x.id === id).correctionHistory || []).length, A);
  L.check('setup: A has a distance correction (' + (err || 'no error') + ')', a0 === 1);
  L.check('setup: A ended early', await endIncompleteAt(page, '30.0'));
  const B = await resume(page, A);
  L.check('setup: B ended early', await endIncompleteAt(page, '60.0'));
  const Cid = await resume(page, B);
  let c = await st(page, Cid);
  L.check('setup: C\'s report lists A\'s correction from an earlier session', /CORRECTION HISTORY \(1\)/.test(c.rt) && /from an earlier session/.test(c.rt));
  await page.evaluate(() => { pbGoto('home', false, true); pbOpenArchive(); }); await page.waitForTimeout(300);
  await page.evaluate((id) => pbArchiveTap('pbToggleArchiveSent', id), Cid); await page.waitForTimeout(500); await L.dismiss(page);
  L.check('setup: C marked SENT', (await st(page, Cid)).sent === true);
  // Control: a delete whose save fails changes nothing on C (its report and SENT go back).
  const cBefore = await st(page, Cid);
  await L.failSaves(page);
  await page.evaluate((id) => pbArchiveTap('pbDeleteArchiveEntry', id), A); await page.waitForTimeout(300);
  await page.click('#pbModalButtons button:has-text("Continue")').catch(() => {}); await page.waitForTimeout(1500);
  await L.dismiss(page); await page.waitForTimeout(300); await L.dismiss(page);
  await L.okSaves(page);
  const cFail = await st(page, Cid);
  const bFail = await st(page, B);
  L.check('a delete that failed to save leaves B\'s stored report listing A\'s correction (rebuilt with A back)', bFail.rt === bFail.live && /CORRECTION HISTORY \(1\)/.test(bFail.rt));
  console.log('failed delete: C sent', cFail.sent, 'rt same', cFail.rt === cBefore.rt, 'A on disk', (await L.archive(page, uid)).some(e => e.id === A), 'A in mem', await page.evaluate((id) => window.__debugGetArchive().some(x => x.id === id), A));
  L.check('control: a delete that failed to save leaves C SENT with its sent report, and A in the Archive', cFail.sent === true && cFail.rt === cBefore.rt && (await L.archive(page, uid)).some(e => e.id === A));
  await page.evaluate((id) => pbArchiveTap('pbDeleteArchiveEntry', id), A); await page.waitForTimeout(300);
  await page.click('#pbModalButtons button:has-text("Continue")').catch(() => {}); await page.waitForTimeout(1500);
  await page.click('#pbModalButtons button:has-text("Keep")').catch(() => {}); await page.waitForTimeout(500); await L.dismiss(page);
  const arch = await L.archive(page, uid);
  L.check('setup: A deleted', !arch.some(e => e.id === A));
  c = await st(page, Cid);
  console.log('C stored report lists correction:', /CORRECTION HISTORY/.test(c.rt), ' live report lists it:', /CORRECTION HISTORY/.test(c.live), ' C sent:', c.sent);
  L.check('C\'s stored report (what is emailed) matches its rebuilt report after A is deleted', c.rt === c.live);
  L.check('C is not shown SENT on a report that now differs from what was sent', !(c.sent === true && c.rt !== c.live));
  await page.reload(); await page.waitForTimeout(1500); await L.dismiss(page);
  c = await st(page, Cid);
  L.check('after reload: C\'s stored report still matches its rebuilt report', c.rt === c.live);
  L.check('no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
  await browser.close();
})();
