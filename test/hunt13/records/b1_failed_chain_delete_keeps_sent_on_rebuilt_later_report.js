// Pass-11 review B1 (regression test, records pass 12). Chain A -> B -> C. C was emailed + marked SENT with the report text it had stored
// (stored by an earlier app build: its text differs from what this build would write).
// Deleting A fails to save. Before pass 11 C was not touched at all; now the failed
// delete REBUILDS C's report text (new text) and puts SENT back on it.
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
const st = (page, id) => page.evaluate((id) => { const e = window.__debugGetArchive().find(x => x.id === id); return { sent: e.sent, rt: e.reportText }; }, id);
const toggle = async (page, id) => { await page.evaluate((id) => pbArchiveTap('pbToggleArchiveSent', id), id); await page.waitForTimeout(500); await L.dismiss(page); };
(async () => {
  const browser = await L.chromium.launch();
  const uid = 'uRvB1';
  const page = await L.newPage(browser, uid);
  const A = await L.lockRun(page, {});
  L.check('setup: A ended early', await endIncompleteAt(page, '30.0'));
  const B = await resume(page, A);
  L.check('setup: B ended early', await endIncompleteAt(page, '60.0'));
  const Cid = await resume(page, B);
  await page.evaluate(() => { pbGoto('home', false, true); pbOpenArchive(); }); await page.waitForTimeout(300);
  // C's stored report as an earlier build wrote it (one wording difference), then emailed + SENT.
  await page.evaluate((id) => { const e = window.__debugGetArchive().find(x => x.id === id); e.reportText = e.reportText + '\n(old build footer line)'; }, Cid);
  const stale = (await st(page, Cid)).rt;
  await toggle(page, Cid);
  L.check('setup: C SENT on its stored report', (await st(page, Cid)).sent === true);
  await L.failSaves(page);
  await page.evaluate((id) => pbArchiveTap('pbDeleteArchiveEntry', id), A); await page.waitForTimeout(300);
  await page.click('#pbModalButtons button:has-text("Continue")').catch(() => {}); await page.waitForTimeout(1500);
  await L.dismiss(page); await page.waitForTimeout(300); await L.dismiss(page);
  await L.okSaves(page);
  L.check('setup: delete failed, A still in Archive', await page.evaluate((id) => window.__debugGetArchive().some(x => x.id === id), A));
  const c = await st(page, Cid);
  console.log('C sent:', c.sent, ' C report unchanged:', c.rt === stale);
  L.check('a delete that failed to save leaves C (two sessions away) exactly as it was: same report, SENT', c.rt === stale && c.sent === true);
  L.check('C is never SENT on a report other than the one emailed', !(c.sent === true && c.rt !== stale));
  // Control: the same delete, saved this time, rebuilds C's report from the chain without A: C is no longer SENT.
  await page.evaluate((id) => pbArchiveTap('pbDeleteArchiveEntry', id), A); await page.waitForTimeout(300);
  await page.click('#pbModalButtons button:has-text("Continue")').catch(() => {}); await page.waitForTimeout(1500);
  await page.click('#pbModalButtons button:has-text("Keep")').catch(() => {}); await page.waitForTimeout(300); await L.dismiss(page);
  const c2 = await st(page, Cid);
  L.check('control: a delete that saves rebuilds C\'s report and clears SENT', !(await L.archive(page, uid)).some(e => e.id === A) && c2.rt !== stale && c2.sent === false && c2.rt === await page.evaluate((id) => window.__debugBuildRunReportFromEntry(window.__debugGetArchive().find(x => x.id === id)), Cid));
  L.check('no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
  await browser.close();
})();
