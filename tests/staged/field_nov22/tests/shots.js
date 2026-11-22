// BEFORE/AFTER shots at 360x740: node shots.js <url> <before|after>  -> ../shots/<prefix>_<name>.png
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs');
const co = require(R + 'co_fm'), F = require(R + 'flow'), mk = require(R + 'mkrun');
const URL0 = process.argv[2], PFX = process.argv[3] || 'before', OUT = __dirname + '/../shots/';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(R + 'fakesb.js', 'utf8') }));
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(co);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const H = F(p);
  const shot = async (n) => { await p.waitForTimeout(400); await p.screenshot({ path: OUT + PFX + '_' + n + '.png' }); console.log('shot', n); };
  await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1000); await H.f('saJobNumber', '24-017');
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
  await mk(p, 100);
  await H.click('Lock This Run'); await p.waitForTimeout(800);
  for (let i = 0; i < 4; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt.includes('Lock Without It') ? 'Lock Without It' : bt[bt.length - 1]); await p.waitForTimeout(1000); }
  await p.waitForTimeout(800);
  await shot('results_active');
  await p.evaluate(() => pbLaidMark(0)); await p.waitForTimeout(700);
  await shot('laid_toast');
  await p.setViewportSize({ width: 360, height: 640 }); await p.waitForTimeout(400);
  await p.evaluate(() => pbLaidMark(2)); await p.waitForTimeout(700);
  await shot('laid_toast_640');
  await p.setViewportSize({ width: 360, height: 740 });
  await p.evaluate(() => pbOpenSettings()); await p.waitForTimeout(900);
  await p.evaluate(() => { const e = document.getElementById('settingsLegal'); if (e) e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300);
  await shot('settings');
  console.log('errs', p.errs.slice(0, 3));
  await b.close();
})();
