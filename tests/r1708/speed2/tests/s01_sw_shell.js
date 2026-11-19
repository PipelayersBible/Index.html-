// speed2 #51 bug hunt: the app opens from the phone's own copy; "New version ready - Reload"; never stranded.
// Real service worker on the routed https origin (like offline/rig/t07_sw.js). SITE = a folder with index.html, sw.js
// (and pbx/ when the page is a build); env SITE_SRC overrides where those come from (default: the PB_SITE folder).
//  1 first open: network, worker installs, the page and its lazily loaded parts are kept
//  2 reopen while the server takes 8 s / never answers: the kept copy opens at once
//  3 a new build published: the open shows the kept build, the worker stores the new one behind it, the page shows the
//    line; Reload shows the new build; an app left open gets the line on 'shell-check' (back to the foreground)
//  4 Reload with typing not saved asks first
//  5 a broken build published: Reload -> the page doesn't start -> "Open the Previous Version" -> the good build again,
//    and it stays (the broken page is never stored again); a fixed build is offered again; "Load the Newest Version"
//  6 offline: opens, and pdf.js (a lazily loaded part when the page is a build) starts offline
//  7 terms.html is not answered with the app
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const RIG = path.resolve(__dirname, '../../../bughunt_nov17/offline/rig');
const co = require(RIG + '/co_ok');
const FAKE = fs.readFileSync(RIG + '/fakesb2.js', 'utf8');
const ORIGIN = 'https://app.pipelayersbible.com/';
const SITE = path.join(process.env.PB_OUT || '/tmp', 'swsite2/');
const FROM = process.env.SITE_SRC || process.env.PB_SITE;
let failed = 0;
const ok = (c, w, x) => { console.log((c ? 'PASS ' : 'FAIL ') + w + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) failed++; };
fs.rmSync(SITE, { recursive: true, force: true }); fs.mkdirSync(SITE, { recursive: true });
for (const n of ['index.html', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png', 'terms.html', 'privacy.html']) if (fs.existsSync(path.join(FROM, n))) fs.copyFileSync(fs.realpathSync(path.join(FROM, n)), SITE + n);
for (const n of ['terms.html', 'privacy.html', 'manifest.webmanifest', 'icon-192.png']) if (!fs.existsSync(SITE + n)) fs.copyFileSync(path.resolve(__dirname, '../../../..', n), SITE + n); // the site's other files
if (fs.existsSync(path.join(FROM, 'pbx'))) fs.cpSync(fs.realpathSync(path.join(FROM, 'pbx')), SITE + 'pbx', { recursive: true });
const BUILT = fs.existsSync(SITE + 'pbx');
const page0 = fs.readFileSync(SITE + 'index.html', 'utf8');
const stamp = (h) => (h.match(/PB_APP_BUILD = '([^']+)'/) || [])[1];
const publish = (build, broken) => {
  let h = page0.replace(/PB_APP_BUILD = '[^']+'/, "PB_APP_BUILD = '" + build + "'");
  if (broken) { const i = h.indexOf('let pbCounter'); h = h.slice(0, i) + 'let pbCounter = = 0;' + h.slice(i + 'let pbCounter'.length); }
  fs.writeFileSync(SITE + 'index.html', h);
};
const net = { delay: 0, hang: false, hits: [] };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 850 }, serviceWorkers: 'allow' });
  await require(RIG + '/../../../rig/env').applyClock(ctx);
  await ctx.route(ORIGIN + '**', async (r) => {
    const u = new URL(r.request().url()); const n = u.pathname.replace(/^\//, '') || 'index.html'; net.hits.push(n);
    if (n === 'index.html' && net.hang) return; // lie-fi: never answers
    if (n === 'index.html' && net.delay) await new Promise((x) => setTimeout(x, net.delay));
    const f = SITE + n; if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }).catch(() => {});
    r.fulfill({ status: 200, contentType: n.endsWith('.js') ? 'application/javascript' : n.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream', headers: { 'cache-control': 'no-cache' }, body: fs.readFileSync(f) }).catch(() => {});
  });
  await ctx.route(/supabase-js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: FAKE }));
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(co);
  const open = async (url, wait) => {
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
    const t0 = Date.now(); await p.goto(url || ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => p.errs.push('goto ' + e.message.slice(0, 80)));
    p.dcl = Date.now() - t0; await p.waitForTimeout(wait === undefined ? 4000 : wait); return p;
  };
  const build = (p) => p.evaluate(() => window.PB_APP_BUILD || null).catch(() => null);
  const line = (p) => p.evaluate(() => { const l = document.getElementById('pbUpdateLine'); return l && l.style.display !== 'none' ? l.innerText.replace(/\s+/g, ' ').trim() : null; }).catch(() => null);
  const waitLine = async (p, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const l = await line(p); if (l) return l; await p.waitForTimeout(300); } return null; };
  const caches = (p) => p.evaluate(async () => { const out = {}; for (const n of await caches.keys()) out[n] = (await (await caches.open(n)).keys()).map((r) => r.url.replace(/^https:\/\/[^/]+\//, '')); return out; });
  const B0 = stamp(page0);
  console.log('page under test:', B0, BUILT ? '(a build: lazily loaded parts in pbx/)' : '(source page)');

  // 1
  let p = await open();
  await p.waitForTimeout(3000);
  const c1 = await caches(p);
  const shell = Object.keys(c1).find((n) => /^pb-shell-/.test(n));
  ok(!!shell && c1[shell].includes(''), 'first open: the page is kept', c1);
  if (BUILT) ok((c1['pb-lazy-v1'] || []).length === 4, 'first open: the 4 lazily loaded parts are kept', c1['pb-lazy-v1']);
  await p.close();
  // 2
  net.delay = 8000; let p2 = await open(undefined, 1500);
  ok(p2.dcl < 3000 && (await build(p2)) === B0, 'reopen while the server takes 8 s: the kept copy at once', { ms: p2.dcl });
  await p2.close(); net.delay = 0;
  net.hang = true; p2 = await open(undefined, 1500);
  ok(p2.dcl < 3000 && (await build(p2)) === B0, 'reopen on lie-fi (never answers): the kept copy at once', { ms: p2.dcl });
  await p2.close(); net.hang = false;
  // 3
  publish('r99.01 · 2099-01-01');
  p = await open(undefined, 500);
  ok((await build(p)) === B0, 'new build published: this open shows the kept build');
  const l3 = await waitLine(p, 60000);
  ok(/New version ready/.test(l3 || ''), 'the line shows once the worker stored the new build (the check left hanging by the lie-fi open does not block it)', l3);
  await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => {}), p.click('#pbUpdateReload')]); await p.waitForTimeout(3000);
  ok((await build(p)) === 'r99.01 · 2099-01-01' && !(await line(p)), 'Reload: the new build, no line', await build(p));
  const c3 = await caches(p); ok((c3[shell] || []).some((u) => /pb-prev-page/.test(u)), 'the previous copy is kept for recovery');
  publish('r99.02 · 2099-01-02');
  await p.waitForTimeout(31000); // the worker checks at most every 30 s
  await p.evaluate(() => navigator.serviceWorker.controller.postMessage({ pb: 'shell-check' }));
  ok(/New version ready/.test((await waitLine(p, 20000)) || ''), 'an app left open gets the line when it comes back to the foreground');
  // 4
  await p.evaluate(() => { pbGoto('home'); }); await p.waitForTimeout(500);
  await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1200);
  await p.evaluate(() => { for (const [id, v] of [['startStakeElev', '100'], ['totalDist', '120']]) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } });
  await p.waitForTimeout(400);
  await p.click('#pbUpdateReload'); await p.waitForTimeout(800);
  const m4 = await p.evaluate(() => { const o = document.getElementById('pbModalOverlay'); return o && getComputedStyle(o).display !== 'none' ? o.innerText.replace(/\s+/g, ' ') : null; });
  ok(/NOT been saved/.test(m4 || '') && (await build(p)) === 'r99.01 · 2099-01-01', 'Reload with typing not saved asks first', (m4 || '').slice(0, 90));
  await p.close({ runBeforeUnload: false });
  // 5 a broken build
  p = await open(undefined, 6000); // shows r99.02 (stored behind the last open)
  publish('r99.03 · 2099-01-03', true);
  await p.waitForTimeout(31000);
  await p.evaluate(() => navigator.serviceWorker.controller.postMessage({ pb: 'shell-check' }));
  ok(/New version ready/.test((await waitLine(p, 20000)) || ''), 'a broken build is offered like any other (the worker can\'t tell)');
  await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => {}), p.click('#pbUpdateReload')]);
  await p.waitForTimeout(10000);
  const wd = await p.evaluate(() => { const e = document.getElementById('pbOldPhone'); const pv = document.getElementById('pbOldPhonePrev'); return { shown: !!e && e.style.display === 'block', prev: !!pv && pv.style.display === 'block', started: !!window.__pbMainInit }; });
  ok(wd.shown && wd.prev && !wd.started, 'the broken build doesn\'t start: the watchdog offers "Open the Previous Version"', wd);
  await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => {}), p.click('#pbOldPhonePrev')]); await p.waitForTimeout(5000);
  ok((await build(p)) === 'r99.02 · 2099-01-02', 'previous version: the good build again', await build(p));
  ok(!(await line(p)), 'no "New version" line on that open');
  await p.close({ runBeforeUnload: false });
  p = await open(undefined, 8000);
  ok((await build(p)) === 'r99.02 · 2099-01-02', 'next open: still the good build (the server still has the broken one)');
  await p.waitForTimeout(3000);
  ok(!(await line(p)), 'the broken page is not offered again');
  publish('r99.04 · 2099-01-04');
  await p.waitForTimeout(31000);
  await p.evaluate(() => navigator.serviceWorker.controller.postMessage({ pb: 'shell-check' }));
  ok(/New version ready/.test((await waitLine(p, 20000)) || ''), 'a fixed build is offered');
  await p.close();
  publish('r99.05 · 2099-01-05');
  p = await open(ORIGIN + '?pbfresh=1', 3000);
  ok((await build(p)) === 'r99.05 · 2099-01-05', '"Load the Newest Version" (?pbfresh=1): the newest build from the network', await build(p));
  await p.close();
  // 6 offline
  await ctx.setOffline(true);
  p = await open(undefined, 3000);
  ok(!!(await build(p)), 'offline: the app opens', await build(p));
  const pdfjs = await p.evaluate(async () => { try { const r = await (0, eval)('typeof pbEnsurePdfjs') ; return r; } catch (e) { return e.message; } });
  const pdfOk = await p.evaluate(async () => { const libEl = document.getElementById('pbPdfjsLibSrc'); if (libEl && !libEl.textContent && libEl.getAttribute('data-pb-src')) { try { const t = await window.pbLazyText(libEl.getAttribute('data-pb-src')); return t.length > 100000; } catch (e) { return 'ERR ' + e.message; } } return libEl && libEl.textContent.length > 100000; });
  ok(pdfOk === true, 'offline: pdf.js is at hand (lazily loaded part from the phone\'s copy)', { pdfOk, pdfjs });
  const jsOk = await p.evaluate(() => { try { return !!(window.jspdf && window.jspdf.jsPDF); } catch (e) { return 'ERR ' + e.message; } });
  ok(jsOk === true, 'offline: jsPDF works', jsOk);
  await p.close(); await ctx.setOffline(false);
  // 7
  p = await ctx.newPage(); await p.goto(ORIGIN + 'terms.html', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800);
  const t7 = await p.evaluate(() => ({ app: !!window.PB_APP_BUILD, title: document.title }));
  ok(!t7.app, 'terms.html opens the terms, not the app', t7);
  await p.close();
  console.log(failed ? 'RESULT: ' + failed + ' failed' : 'RESULT: all passed');
  await b.close(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
