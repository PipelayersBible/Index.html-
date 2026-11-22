// BEFORE/AFTER screenshots: node shots.js <page url> <prefix: before|after>  -> ../shots/<prefix>_<screen>[_dark].png
// Phone 390x844, deviceScaleFactor 2, foreman with a company (rig co_fm), light; Home also dark.
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs');
const co = require(R + 'co_fm'), F = require(R + 'flow'), mk = require(R + 'mkrun'), E = require(R + 'env');
const URL0 = process.argv[2], PFX = process.argv[3] || 'before', OUT = __dirname + '/../shots/';
async function page(dark) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light', serviceWorkers: 'block' });
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(R + 'fakesb.js', 'utf8') }));
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort()); // the live build's Google fonts are blocked here anyway (and offline on a job)
  await ctx.addInitScript(co);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(3000);
  return { b, p };
}
const shot = async (p, name, full) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.screenshot({ path: OUT + PFX + '_' + name + '.png', fullPage: !!full, clip: full ? { x: 0, y: 0, width: 390, height: Math.min(h, 2600) } : undefined }); console.log('shot', name); };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  { const { b, p } = await page(true); await shot(p, 'home_dark', true); await b.close(); }
  const { b, p } = await page(false); const H = F(p);
  await shot(p, 'home', true);
  // Run Setup, just opened (the rod type is the choice still to make)
  await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1200);
  await H.f('saJobNumber', '24-017').catch(() => {});
  await shot(p, 'runsetup', true);
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(400);
  await mk(p, 100);
  await H.click('Lock This Run'); await p.waitForTimeout(800);
  for (let i = 0; i < 4; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt.includes('Lock Without It') ? 'Lock Without It' : bt[bt.length - 1]); await p.waitForTimeout(1000); }
  await shot(p, 'results', true);
  // a calculator: Trench Sloping with a depth typed
  await p.evaluate(() => pbGoto('trenchCalc')); await p.waitForTimeout(700);
  await p.evaluate(() => { const i = [...document.querySelectorAll('#screen-trenchCalc input')].find(x => x.offsetParent && x.type !== 'hidden'); if (i) { i.value = '8'; i.dispatchEvent(new Event('input', { bubbles: true })); } }); await p.waitForTimeout(500);
  await shot(p, 'calculator', true);
  // Entry Permit form
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
  await p.evaluate(() => pbOpenConfinedPermitForm()); await p.waitForTimeout(1200);
  for (let i = 0; i < 2; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt[bt.length - 1]).catch(() => {}); }
  await shot(p, 'permit', true);
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
  await p.evaluate(() => pbGotoTab('reports')); await p.waitForTimeout(1200);
  await shot(p, 'records', true);
  console.log('errs', p.errs.slice(0, 3)); await b.close();
})();
