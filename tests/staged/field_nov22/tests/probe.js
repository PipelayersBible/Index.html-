// probe: node probe.js <url> [w] [h] -> opens a locked active run and runs PROBE js (env) in the page
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs');
const co = require(R + 'co_fm'), F = require(R + 'flow'), mk = require(R + 'mkrun');
module.exports = async function open(url, w, h, opts = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: w || 360, height: h || 740 }, deviceScaleFactor: opts.dsf || 1, serviceWorkers: 'block', hasTouch: !!opts.touch, isMobile: !!opts.touch });
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(R + 'fakesb.js', 'utf8') }));
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(co);
  if (opts.init) await ctx.addInitScript(opts.init);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const H = F(p); p.H = H;
  if (opts.run !== false) {
    await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1000); await H.f('saJobNumber', '24-017');
    await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
    await mk(p, opts.dist || 100);
    await H.click('Lock This Run'); await p.waitForTimeout(800);
    for (let i = 0; i < 4; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt.includes('Lock Without It') ? 'Lock Without It' : bt[bt.length - 1]); await p.waitForTimeout(1000); }
    await p.waitForTimeout(800);
  }
  return { b, ctx, p, H };
};
if (require.main === module) (async () => {
  const { b, p } = await module.exports(process.argv[2], +process.argv[3], +process.argv[4]);
  const code = fs.readFileSync(process.argv[5] || '/dev/stdin', 'utf8');
  console.log(JSON.stringify(await p.evaluate(code), null, 1));
  await b.close();
})();
