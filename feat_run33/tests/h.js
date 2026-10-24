// Shared helpers for the overnight "pipe run" probes (390 px wide, like a phone).
const L = require('/home/claude/test/lib.js');
const fs = require('fs');
const SHOTS = '/home/claude/feat_run33/tests/shots/'; fs.mkdirSync(SHOTS, { recursive: true });
async function newPage390(browser, uid, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, timezoneId: 'America/Denver' });
  await context.addInitScript(([u, tier]) => { localStorage.setItem('lastKnownUserId', u); localStorage.setItem(u + ':cachedSubscription', JSON.stringify({ tier, status: 'active' })); }, [uid, opts.tier || 'individual']);
  const page = await L.newPage(browser, uid, context);
  page._consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') page._consoleErrors.push(m.text()); });
  return page;
}
const fill = (page, id, v) => page.evaluate(([id, v]) => { const el = document.getElementById(id); if (!el) throw new Error('no field ' + id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
const shot = (page, name, full) => page.screenshot({ path: SHOTS + name + '.png', fullPage: !!full });
const screen = (page) => page.evaluate(() => { const s = document.querySelector('.pb-screen.active'); return s ? s.id.replace('screen-', '') : null; });
const errText = (page) => page.evaluate(() => { const e = document.getElementById('inputError'); return e && e.style.display !== 'none' ? e.innerText : ''; });
const reviewText = (page) => page.evaluate(() => (document.getElementById('reviewSummaryGrid').innerText + '\n' + document.getElementById('reviewContent').innerText));
const resultsRows = (page) => page.evaluate(() => Array.from(document.querySelectorAll('#resultsBody tr[data-laid-idx]:not([data-laid-strip])')).map(tr => Array.from(tr.querySelectorAll('td')).slice(1).map(td => td.innerText.trim())));
const overflow = (page) => page.evaluate(() => { const w = document.documentElement.clientWidth; const bad = []; document.querySelectorAll('.pb-screen.active *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.right > w + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.pb-table-wrap')) bad.push(el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).split(' ')[0] + ' right=' + Math.round(r.right)); }); return { scrollW: document.documentElement.scrollWidth, w, bad: bad.slice(0, 12) }; });
const smallTargets = (page) => page.evaluate(() => { const out = []; document.querySelectorAll('.pb-screen.active button, .pb-screen.active a, .pb-screen.active input[type=checkbox], .pb-screen.active summary').forEach(el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; if (getComputedStyle(el).visibility === 'hidden') return; if (r.height < 44 || r.width < 44) out.push(((el.innerText || el.getAttribute('aria-label') || el.title || el.id || el.tagName).trim().slice(0, 40)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }); return out; });
// A Lenker run: start/end inverts, distance, interval; optional stats; returns the archive id after Lock.
async function lockLenker(page, { start = '100.00', end = '99.00', dist = 100, interval = 10, wt = '0.3', id = '10', stats = false, job = 'JOB-N', type = 'PVC Sch 40', beforeReview = null } = {}) {
  await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
  await page.click('#rodToggle button[data-val="lenker"]'); await page.waitForTimeout(100);
  await page.fill('#startElev', start); await page.fill('#endElev', end); await page.fill('#totalDist', String(dist)); await page.fill('#interval', String(interval));
  await page.fill('#runWT', wt); await page.selectOption('#runIdSel', id);
  if (stats) { await page.check('#saEnableToggle'); await page.fill('#saJobNumber', job); await page.selectOption('#statsType', type); }
  if (beforeReview) await beforeReview(page);
  await page.waitForTimeout(200);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
  if (await screen(page) !== 'review') return null;
  await page.click('button[onclick="pbLock()"]');
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => document.querySelector('#screen-results.active') !== null)) break; }
  await page.waitForTimeout(400); await L.dismiss(page);
  return page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
}
const entry = (page, id) => page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); return e ? JSON.parse(JSON.stringify(e, (k, v) => k === 'photos' ? undefined : v)) : null; }, id);
module.exports = { L, fs, SHOTS, newPage390, fill, shot, screen, errText, reviewText, resultsRows, overflow, smallTargets, lockLenker, entry };
