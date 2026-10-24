// A ends early; its report (text P) is emailed and marked SENT. A is resumed as B (Locked):
// A's report gains "resumed in a follow-up entry" (P') and keeps SENT (deliberate; the hash
// is moved to P' by pbRebuildLinkedReport). The resume was a mistake: B is deleted. A's report
// goes back to P, exactly the text that was emailed, yet A is now NOT SENT (hash is of P').
// Before the pass-10 rebind, the same delete kept SENT. VARIANT=reload: reload between the
// Resume and the delete.
const L = require('/home/claude/test/lib.js');
async function endIncompleteAt(page, label) {
  await page.evaluate(() => { document.getElementById('endIncompletePanel').style.display = 'none'; pbToggleEndIncomplete(); }); await page.waitForTimeout(120);
  await page.evaluate((lab) => { const s = document.getElementById('endIncompleteStation'); s.selectedIndex = Array.from(s.options).findIndex(o => o.textContent.trim() === lab); }, label);
  await page.evaluate(() => pbEndRunIncomplete()); await page.waitForTimeout(900); await L.dismiss(page);
}
const state = (page, id) => page.evaluate((id) => { const e = window.__debugGetArchive().find(x => x.id === id); return { sent: e.sent, rt: e.reportText }; }, id);
(async () => {
  const browser = await L.chromium.launch();
  const uid = 'uP11p1' + (process.env.VARIANT || '');
  let page = await L.newPage(browser, uid);
  const A = await L.lockRun(page, {});
  await endIncompleteAt(page, '30.0');
  await page.evaluate(() => { pbGoto('home', false, true); pbOpenArchive(); });
  await page.evaluate((id) => pbArchiveTap('pbToggleArchiveSent', id), A); await page.waitForTimeout(500); await L.dismiss(page);
  const s0 = await state(page, A);
  L.check('setup: A marked SENT', s0.sent === true);
  await page.evaluate((id) => pbArchiveTap('pbResumeIncompleteRun', id), A); await page.waitForTimeout(500); await L.dismiss(page);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
  await page.click('button[onclick="pbLock()"]'); await page.waitForTimeout(1200); await L.dismiss(page);
  const B = await page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  const s1 = await state(page, A);
  L.check('setup: after Resume, A shows SENT with the "resumed" line', s1.sent === true && s1.rt !== s0.rt && B !== A);
  // VARIANT=remarked (control): Mark Not Sent, then Mark Sent on the report WITH the "resumed" line.
  // The pre-Resume text no longer counts as sent, so deleting B must clear SENT.
  if (process.env.VARIANT === 'remarked') {
    await page.evaluate(() => { pbGoto('home', false, true); pbOpenArchive(); });
    for (let k = 0; k < 2; k++) { await page.evaluate((id) => pbArchiveTap('pbToggleArchiveSent', id), A); await page.waitForTimeout(500); }
  }
  if (process.env.VARIANT === 'reload') { await page.reload(); await page.waitForTimeout(1500); await L.dismiss(page); }
  await page.evaluate(() => { pbGoto('home', false, true); pbOpenArchive(); }); await page.waitForTimeout(300);
  await page.evaluate((id) => pbArchiveTap('pbDeleteArchiveEntry', id), B); await page.waitForTimeout(300);
  await page.click('#pbModalButtons button:has-text("Continue")').catch(() => {}); await page.waitForTimeout(1500);
  await page.click('#pbModalButtons button:has-text("Keep")').catch(() => {}); await page.waitForTimeout(500); await L.dismiss(page);
  const arch = await L.archive(page, uid);
  L.check('setup: B deleted', !arch.some(e => e.id === B));
  const s2 = await state(page, A);
  console.log('A sent after delete:', s2.sent, ' stored:', arch.find(e => e.id === A).sent);
  L.check('setup: A\'s report is back to exactly the text that was emailed', s2.rt === s0.rt);
  if (process.env.VARIANT === 'remarked') L.check('control: A, marked not sent and re-marked on the "resumed" report, is NOT SENT after B is deleted', s2.sent === false);
  else L.check('A, whose report again reads exactly as emailed, keeps SENT', s2.sent === true);
  L.check('no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
  await browser.close();
})();
