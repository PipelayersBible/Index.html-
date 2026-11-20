// hunt_nov19 SW 01: a release whose PDF parts are new comes down while the signal is bad: the page arrives, the parts
// don't. The phone must not swap its kept page for one whose PDF tools it doesn't have: the next open with no signal
// still makes PDFs. Once the parts can be fetched, the new build is kept and offered as usual.
// env: SRC = the page source (default _src/index.html), SW = the sw.js under test (default the repo's sw.js),
//      HTTPS_PORT (default 9002), PB_OUT (scratch).
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.resolve(__dirname, '../../../..');
const RIG = path.resolve(__dirname, '../../../bughunt_nov17/offline/rig');
const co = require(RIG + '/co_ok');
const HS = require('./httpssite2'); const PORT = +(process.env.HTTPS_PORT || 9002);
const SRC = process.env.SRC || REPO + '/_src/index.html', SW = process.env.SW || REPO + '/sw.js';
const OUT = path.join(process.env.PB_OUT || '/tmp/claude-0/hunt19/out', 'swparts'); const SITE = OUT + '/site/';
const ORIGIN = 'https://app.pipelayersbible.com/';
let failed = 0; const ok = (c, w, x) => { console.log((c ? 'PASS ' : 'FAIL ') + w + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) failed++; };
const stamp = (f, re, v) => fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(re, v));
function build(dir, b, changeParts) { // the page with its parts in pbx/ (as the release build does), stamped b
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  let src = SRC;
  if (changeParts) { src = dir + '/src.html'; fs.writeFileSync(src, fs.readFileSync(SRC, 'utf8').replace('<script type="text/plain" id="pbJsPdfSrc">', '<script type="text/plain" id="pbJsPdfSrc">/* a newer library build */')); }
  cp.execFileSync('python3', [__dirname + '/mkparts.py', src, dir, 'index.html']);
  stamp(dir + '/index.html', /PB_APP_BUILD = '[^']+'/, "PB_APP_BUILD = '" + b + "'");
  fs.copyFileSync(SW, dir + '/sw.js'); stamp(dir + '/sw.js', /PB_SW_BUILD = '[^']+'/, "PB_SW_BUILD = '" + b + "'");
}
const put = (dir) => { fs.rmSync(SITE, { recursive: true, force: true }); fs.cpSync(dir, SITE, { recursive: true }); };
(async () => {
  const B1 = 'r90.01 · 2099-01-01', B2 = 'r90.02 · 2099-01-02';
  build(OUT + '/v1', B1, false); build(OUT + '/v2', B2, true);
  put(OUT + '/v1');
  const S = await HS.start(SITE.replace(/\/$/, ''), PORT);
  const b = await chromium.launch({ proxy: { server: 'direct://', bypass: '*' }, args: HS.chromeArgs(PORT) });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  await ctx.addInitScript(co);
  const open = async (wait) => { const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(ORIGIN, { waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(wait || 5000); return p; };
  const bld = (p) => p.evaluate(() => window.PB_APP_BUILD).catch(() => null);
  const pdf = (p) => p.evaluate(() => { try { return !!window.jspdf.jsPDF; } catch (e) { return false; } }).catch(() => false);
  const lazy = (p) => p.evaluate(async () => (await (await caches.open('pb-lazy-v1')).keys()).map((r) => r.url.replace(/^.*\/pbx\//, ''))).catch(() => []);
  // 1) the phone has release 1: page, worker and the four parts
  let p = await open(6000);
  for (let i = 0; i < 30 && (await lazy(p)).length < 4; i++) await p.waitForTimeout(1000);
  ok((await bld(p)) === B1 && (await lazy(p)).length === 4, 'release 1 is on the phone with its 4 parts', await lazy(p));
  await p.close();
  // 2) release 2 is published (a newer jsPDF part). The phone opens the app: the page comes down, the parts don't.
  put(OUT + '/v2'); S.dropPbx = true;
  p = await open(12000); await p.close();
  p = await open(8000); // one more open: whatever was kept for "the next open" is what runs now
  const running = await bld(p), parts = await lazy(p), newPart = fs.readdirSync(OUT + '/v2/pbx').find((n) => /^jspdf-2/.test(n));
  console.log('after the bad-signal update: running', running, '| has the new part:', parts.includes(newPart));
  await p.close();
  // 3) no signal at all: the app opens and can make a PDF
  await ctx.setOffline(true);
  p = await open(5000);
  const offB = await bld(p), offPdf = await pdf(p);
  ok(!!offB, 'no signal: the app opens (' + offB + ')');
  ok(offPdf, 'no signal: the PDF tools are there (run report, permit PDF, exports work)');
  ok(offB === B1 || parts.includes(newPart), 'the page that runs is one whose parts are on the phone');
  await p.close();
  // 4) signal back and the parts can be fetched: release 2 is kept and runs on a later open, with PDFs, offline too
  await ctx.setOffline(false); S.dropPbx = false;
  p = await open(12000); await p.close();
  p = await open(8000);
  for (let i = 0; i < 20 && (await bld(p)) !== B2; i++) { await p.close(); p = await open(4000); }
  ok((await bld(p)) === B2, 'with signal back, release 2 is kept and runs', await bld(p));
  await p.close(); await ctx.setOffline(true);
  p = await open(5000);
  ok((await bld(p)) === B2 && (await pdf(p)), 'release 2 with no signal: PDFs work');
  console.log(failed ? 'RESULT: ' + failed + ' failed' : 'RESULT: all passed');
  await b.close(); S.srv.close(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
