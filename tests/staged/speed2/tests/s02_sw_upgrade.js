// speed2 #51 bug hunt: a phone on r17.04 (its worker and its kept page) gets this release (new worker + built page).
// The new worker keeps the new page and its parts, the r17.04 page becomes the previous copy, the next open is the new
// build at once, offline too, and an open r17.04 tab is not broken by it.
// env OLD_SITE: folder with the r17.04 index.html + sw.js; NEW_SITE: folder with the new index.html, sw.js, pbx/.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const RIG = path.resolve(__dirname, '../../../bughunt_nov17/offline/rig');
const co = require(RIG + '/co_ok'); const FAKE = fs.readFileSync(RIG + '/fakesb2.js', 'utf8');
const ORIGIN = 'https://app.pipelayersbible.com/';
const HS = require('./httpssite'); const PORT = +(process.env.HTTPS_PORT || 8874);
const SITE = path.join(process.env.PB_OUT || '/tmp', 'swsite3/');
let failed = 0; const ok = (c, w, x) => { console.log((c ? 'PASS ' : 'FAIL ') + w + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) failed++; };
const put = (dir) => { fs.rmSync(SITE, { recursive: true, force: true }); fs.mkdirSync(SITE, { recursive: true }); for (const n of fs.readdirSync(dir)) { const f = path.join(dir, n); if (n === 'pbx') fs.cpSync(f, SITE + 'pbx', { recursive: true }); else if (/^(index\.html|sw\.js)$/.test(n)) fs.copyFileSync(f, SITE + n); } };
(async () => {
  put(process.env.OLD_SITE);
  const S = await HS.start(SITE.replace(/\/$/, ''), PORT);
  const b = await chromium.launch({ proxy: { server: 'direct://', bypass: '*' }, args: HS.chromeArgs(PORT) });
  const ctx = await b.newContext({ viewport: { width: 400, height: 850 }, serviceWorkers: 'allow' });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(co);
  const open = async (wait) => { const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(ORIGIN, { waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(wait || 5000); return p; };
  const build = (p) => p.evaluate(() => window.PB_APP_BUILD).catch(() => null);
  const keys = (p) => p.evaluate(async () => { const o = {}; for (const n of await caches.keys()) o[n] = (await (await caches.open(n)).keys()).map((r) => r.url.replace(/^https:\/\/[^/]+\//, '')); return o; });
  const old = await open(); const B0 = await build(old);
  console.log('old:', B0, JSON.stringify(await keys(old)));
  put(process.env.NEW_SITE);
  const NEWB = fs.readFileSync(SITE + 'index.html', 'utf8').match(/PB_APP_BUILD = '([^']+)'/)[1].replace('r17.04', 'r17.05');
  fs.writeFileSync(SITE + 'index.html', fs.readFileSync(SITE + 'index.html', 'utf8').replace(/PB_APP_BUILD = '[^']+'/, "PB_APP_BUILD = '" + NEWB + "'"));
  fs.writeFileSync(SITE + 'sw.js', fs.readFileSync(SITE + 'sw.js', 'utf8').replace(/PB_SW_BUILD = '[^']+'/, "PB_SW_BUILD = '" + NEWB + "'"));
  // the phone opens the app again: the r17.04 worker answers (network first) and the browser finds the new sw.js
  const p = await open(9000);
  ok((await build(p)) === NEWB, 'next open with signal: the new build', await build(p));
  let k = null; for (let i = 0; i < 40; i++) { k = await keys(p); if (Object.keys(k).some((n) => /^pb-shell-/.test(n) && n.indexOf('r17.04') < 0) && (k['pb-lazy-v1'] || []).length === 4) break; await p.waitForTimeout(1000); }
  console.log('after the update:', JSON.stringify(k), 'worker:', await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { active: r.active && r.active.state, waiting: !!r.waiting, installing: !!r.installing }; }));
  const shell = Object.keys(k).find((n) => /^pb-shell-/.test(n) && n.indexOf('r17.04') < 0);
  ok(!!shell && k[shell].includes('') && k[shell].includes('pb-prev-page'), 'new worker: new page kept, r17.04 page kept as the previous copy', shell);
  ok((k['pb-lazy-v1'] || []).length === 4, 'new worker: the 4 parts kept', k['pb-lazy-v1']);
  ok(Object.keys(k).filter((n) => /^pb-shell-/.test(n)).length === 1, 'the older cache is gone');
  ok((await build(old)) === B0 && old.errs.length === 0, 'the open r17.04 tab still works', old.errs.slice(0, 2));
  const p3 = await open(3000); ok((await build(p3)) === NEWB, 'and the open after that: from the new worker\'s copy', await build(p3)); await p3.close();
  await p.close(); await old.close({ runBeforeUnload: false });
  await ctx.setOffline(true);
  const q = await open(4000);
  ok((await build(q)) === NEWB, 'offline: the new build', await build(q));
  ok(await q.evaluate(() => { try { return !!window.jspdf.jsPDF; } catch (e) { return false; } }), 'offline: jsPDF from the kept part');
  console.log(failed ? 'RESULT: ' + failed + ' failed' : 'RESULT: all passed');
  await b.close(); S.srv.close(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
