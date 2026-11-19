// speed2 #51/#53 measurement (not pass/fail): opening the app on one bar, r17.04 (its page + worker) vs this release
// (built page + new worker). Real HTTPS server (ETag/304 and gzip like GitHub Pages), index.html and pbx/* shaped to
// KBPS with RTT ms before each answer; 4x CPU slowdown. "home" = ms from navigation start until the app's Home is up
// (main script started, Home screen active). Shared 2-core box: numbers carry noise; each scenario runs REP times.
// env OLD_SITE / NEW_SITE (folders with index.html, sw.js, pbx/); args: [kbps=400] [rtt=400] [rep=2]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const HS = require('./httpssite'); const co = require(path.resolve(__dirname, '../../../bughunt_nov17/offline/rig/co_ok'));
const KBPS = +process.argv[2] || 400, RTT = +process.argv[3] || 400, REP = +process.argv[4] || 2, PORT = +(process.env.HTTPS_PORT || 8875);
const ORIGIN = 'https://app.pipelayersbible.com/';
// the two variants run turn about (old, new, old, new ...) so the box's changing load hits both alike
const V = [{ name: 'r17.04', dir: process.env.OLD_SITE, port: PORT }, { name: 'new', dir: process.env.NEW_SITE, port: PORT + 1 }];
const put = (v, bump) => { const SITE = v.site; fs.rmSync(SITE, { recursive: true, force: true }); fs.mkdirSync(SITE, { recursive: true }); for (const n of fs.readdirSync(v.dir)) { const f = path.join(v.dir, n); if (n === 'pbx') fs.cpSync(f, path.join(SITE, 'pbx'), { recursive: true }); else if (/^(index\.html|sw\.js)$/.test(n)) fs.copyFileSync(f, path.join(SITE, n)); } if (bump) { const f = path.join(SITE, 'index.html'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/PB_APP_BUILD = '[^']+'/, "PB_APP_BUILD = '" + bump + "'")); } };
async function open(v, label, hang) {
  const S = v.S; S.kbps = KBPS; S.delay = RTT; S.hang = !!hang;
  const ctx = await chromium.launchPersistentContext(v.prof, { headless: true, viewport: { width: 400, height: 850 }, serviceWorkers: 'allow', proxy: { server: 'direct://', bypass: '*' }, args: HS.chromeArgs(v.port) });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort()); await ctx.addInitScript(co);
  const p = ctx.pages()[0] || await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(ORIGIN, { waitUntil: 'commit', timeout: 180000 }).catch(() => {});
  let home = null;
  try { await p.waitForFunction(() => window.__pbMainInit && document.querySelector('#screen-home.active') && typeof window.pbGoto === 'function', null, { timeout: 180000, polling: 100 }); home = await p.evaluate(() => Math.round(performance.now())); } catch (e) { home = 'timeout'; }
  const fcp = await p.evaluate(() => { const e = performance.getEntriesByName('first-contentful-paint')[0]; return e ? Math.round(e.startTime) : null; }).catch(() => null);
  ((v.out[label] = v.out[label] || [])).push({ home, fcp });
  console.log(v.name, label, JSON.stringify({ home, fcp }));
  const hold = hang ? 3000 : label.startsWith('cold') ? 70000 : 30000; // let the worker finish what it does behind the page (one bar: the page takes ~30-50 s)
  S.hang = false; await p.waitForTimeout(hold);
  await ctx.close();
}
(async () => {
  for (const v of V) { v.site = path.join(process.env.PB_OUT || '/tmp', 'm51site-' + v.name); v.prof = fs.mkdtempSync(path.join(process.env.PB_OUT || '/tmp', 'm51prof-')); v.out = {}; put(v); v.S = await HS.start(v.site, v.port); }
  for (const v of V) await open(v, 'cold first open (no worker yet)');
  for (let i = 0; i < REP; i++) for (const v of V) await open(v, 'reopen, app unchanged');
  for (let i = 0; i < REP; i++) for (const v of V) await open(v, 'reopen, lie-fi (nothing answers)', true);
  for (let i = 0; i < REP; i++) for (const v of V) { put(v, 'r99.' + String(i + 10) + ' · 2099-01-01'); await open(v, 'first open after a new release'); }
  const med = (a) => { const x = a.map((y) => y.home).filter((y) => typeof y === 'number').sort((p, q) => p - q); return x.length ? x[Math.floor((x.length - 1) / 2)] + (x.length > 1 ? ' (' + x.join(', ') + ')' : '') : 'timeout'; };
  console.log('\n| one bar (' + KBPS + ' kbps, ' + RTT + ' ms per answer), 4x CPU, ms to a usable Home | r17.04 | this release |\n|---|---:|---:|');
  for (const sc of Object.keys(V[0].out)) console.log('| ' + sc + ' | ' + med(V[0].out[sc]) + ' | ' + med(V[1].out[sc]) + ' |');
  for (const v of V) { v.S.srv.close(); fs.rmSync(v.prof, { recursive: true, force: true }); }
  process.exit(0);
})().catch((e) => { console.log('ERROR', e && e.stack); process.exit(1); });
