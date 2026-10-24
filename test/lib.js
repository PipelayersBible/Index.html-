let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); }
const ORIGIN = ('http://localhost:' + (process.env.PB_TEST_PORT || 8765) + '/app.html');
// A failed check prints *** FAIL *** AND sets a failing exit code, so automation can't miss it.
const check = (l, c) => { console.log((c ? 'OK  ' : '*** FAIL ***') + ' - ' + l); if (!c) process.exitCode = 1; };
async function newPage(browser, uid, ctx) {
  const context = ctx || await browser.newContext({ viewport: { width: 400, height: 900 } });
  const page = await context.newPage();
  page.on('dialog', d => d.accept());
  page._errors = []; page.on('pageerror', e => page._errors.push(e.message));
  if (!ctx) await context.addInitScript((u) => { localStorage.setItem('lastKnownUserId', u); localStorage.setItem(u + ':cachedSubscription', JSON.stringify({tier:'individual',status:'active'})); }, uid);
  await page.goto(ORIGIN); await page.waitForTimeout(600);
  page._ctx = context;
  return page;
}
async function lockRun(page, { dist = 100, stats = false } = {}) {
  await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
  await page.click('#rodToggle button[data-val="lenker"]');
  await page.fill('#startElev','100.00'); await page.fill('#endElev','99.00'); await page.fill('#totalDist', String(dist)); await page.fill('#interval','10');
  await page.fill('#runWT','0.3'); await page.selectOption('#runIdSel','10');
  if (stats) { await page.check('#saEnableToggle'); await page.fill('#saJobNumber','JOB-AUD'); await page.selectOption('#statsType','PVC Sch 40'); }
  await page.click('text=Review & Calculate'); await page.waitForTimeout(400);
  await page.click('button[onclick="pbLock()"]');
  // Another tab may have saved the archive since this tab loaded it; the app
  // then asks before overwriting. Accept it, as a person would.
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    if (await page.evaluate(() => /Conflicting Edit/.test((document.getElementById('pbModalTitle')||{}).textContent || '') && getComputedStyle(document.getElementById('pbModalOverlay')).display !== 'none')) { await page.click('button:has-text("Overwrite")'); page._sawConflict = true; }
    if (await page.evaluate(() => document.querySelector('#screen-results.active') !== null)) break;
  }
  await page.waitForSelector('#screen-results.active'); await page.waitForTimeout(400);
  return page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
}
const hold = (page, name) => page.evaluate((n) => { window.__debugSaveHold = { promise: new Promise(r => { window[n] = r; }) }; }, name);
// Only ever answers a VISIBLE modal — clicking the buttons of an already-closed dialog would re-run its action.
const dismiss = (page) => page.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); if (!ov || getComputedStyle(ov).display === 'none') return; const b = document.querySelectorAll('#pbModalButtons button'); if (b.length) b[b.length-1].click(); });
const archive = (page, uid) => page.evaluate((u) => JSON.parse(localStorage.getItem(u + ':runArchive') || '[]'), uid);
const failSaves = (page) => page.evaluate(() => { window._o = window._o || localStorage.setItem.bind(localStorage); localStorage.setItem = (k, v) => { if (k.includes('runArchive')) throw new Error('sim'); return window._o(k, v); }; });
const okSaves = (page) => page.evaluate(() => { if (window._o) localStorage.setItem = window._o; });
module.exports = { chromium, ORIGIN, check, newPage, lockRun, hold, dismiss, archive, failSaves, okSaves };
