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
const SITE = path.join(process.env.PB_OUT || '/tmp', 'm51site');
const put = (dir, bump) => { fs.rmSync(SITE, { recursive: true, force: true }); fs.mkdirSync(SITE, { recursive: true }); for (const n of fs.readdirSync(dir)) { const f = path.join(dir, n); if (n === 'pbx') fs.cpSync(f, path.join(SITE, 'pbx'), { recursive: true }); else if (/^(index\.html|sw\.js)$/.test(n)) fs.copyFileSync(f, path.join(SITE, n)); } if (bump) { const f = path.join(SITE, 'index.html'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/PB_APP_BUILD = '[^']+'/, "PB_APP_BUILD = '" + bump + "'")); } };
async function measure(S, variantDir) {
  const out = {};
  const dir = fs.mkdtempSync(path.join(process.env.PB_OUT || '/tmp', 'm51prof-'));
  // each open is a fresh browser start on the same phone storage (a phone reopening the app later: the worker starts
  // fresh, so no "just served the copy" window from the previous open carries over)
  const open = async (label) => {
    const ctx = await chromium.launchPersistentContext(dir, { headless: true, viewport: { width: 400, height: 850 }, serviceWorkers: 'allow', proxy: { server: 'direct://', bypass: '*' }, args: HS.chromeArgs(PORT) });
    await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort()); await ctx.addInitScript(co);
    const p = ctx.pages()[0] || await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.goto(ORIGIN, { waitUntil: 'commit', timeout: 180000 }).catch(() => {});
    let home = null;
    try { await p.waitForFunction(() => window.__pbMainInit && document.querySelector('#screen-home.active') && typeof window.pbGoto === 'function', null, { timeout: 180000, polling: 100 }); home = await p.evaluate(() => Math.round(performance.now())); } catch (e) { home = 'timeout'; }
    const fcp = await p.evaluate(() => { const e = performance.getEntriesByName('first-contentful-paint')[0]; return e ? Math.round(e.startTime) : null; }).catch(() => null);
    (out[label] = out[label] || []).push({ home, fcp });
    const hold = S.hang ? 3000 : label.startsWith('cold') ? 70000 : 30000; // let the worker finish what it does behind the page (one bar: a 2.4 MB page takes ~50 s)
    S.hang = false; await p.waitForTimeout(hold);
    await ctx.close();
  };
  S.kbps = KBPS; S.delay = RTT; S.hang = false;
  put(variantDir); await open('cold first open (no worker yet)');
  for (let i = 0; i < REP; i++) await open('reopen, app unchanged');
  for (let i = 0; i < REP; i++) { S.hang = true; await open('reopen, lie-fi (nothing answers)'); }
  for (let i = 0; i < REP; i++) { put(variantDir, 'r99.' + String(i + 10) + ' · 2099-01-01'); await open('first open after a new release'); }
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}
(async () => {
  const S = await HS.start(SITE, PORT);
  const res = {};
  for (const [k, d] of [['r17.04', process.env.OLD_SITE], ['new', process.env.NEW_SITE]]) { res[k] = await measure(S, d); console.log(k, JSON.stringify(res[k])); }
  const med = (a) => { const v = a.map((x) => x.home).filter((x) => typeof x === 'number').sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : 'timeout'; };
  console.log('\n| one bar (' + KBPS + ' kbps, ' + RTT + ' ms), 4x CPU | r17.04 | this release |\n|---|---:|---:|');
  for (const sc of Object.keys(res['r17.04'])) console.log('| ' + sc + ' -> Home | ' + med(res['r17.04'][sc]) + ' ms | ' + med(res.new[sc]) + ' ms |');
  S.srv.close(); process.exit(0);
})().catch((e) => { console.log('ERROR', e && e.stack); process.exit(1); });
