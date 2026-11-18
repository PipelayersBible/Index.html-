// Perf rig: Chromium + CPU throttling (CDP) + server-side network shaping (srv.js), real service worker on
// https://app.pipelayersbible.com/<variant>/ (mapped to 127.0.0.1:PORT, default 8884).
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http');
const FAKE = fs.readFileSync(__dirname+'/../../rig/fakesb.js', 'utf8');
const CO = require(__dirname+'/../../rig/co');
const PORT = +process.env.PERF_PORT || 8884;
const ORIGIN = 'https://app.pipelayersbible.com';
const P = {};
P.net = (q) => new Promise((ok, no) => http.get('http://127.0.0.1:' + PORT + '/__net?' + q, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => ok(JSON.parse(d))); }).on('error', no));
P.log = (clear) => new Promise((ok, no) => http.get('http://127.0.0.1:' + PORT + '/__log' + (clear ? '?clear=1' : ''), (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => ok(JSON.parse(d))); }).on('error', no));
P.NET = { fast: 'kbps=0&rtt=0', weak: 'kbps=400&rtt=400', hang: 'hang=1' };
// what the page records about itself (times relative to navigation start)
const MARKS = `(function(){
  window.__pf={lt:[],fcp:null,home:null,acct:null,dcl:null};
  try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__pf.lt.push([Math.round(e.startTime),Math.round(e.duration)]))).observe({type:'longtask',buffered:true});}catch(e){}
  try{new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(e.name==='first-contentful-paint')window.__pf.fcp=Math.round(e.startTime);})).observe({type:'paint',buffered:true});}catch(e){}
  document.addEventListener('DOMContentLoaded',()=>{window.__pf.dcl=Math.round(performance.now());});
  const iv=setInterval(()=>{try{
    if(!window.__pf.acct&&Array.isArray(window.pbAccountLoadHooks)&&!window.__pfHooked){window.__pfHooked=1;window.pbAccountLoadHooks.push(()=>{window.__pf.acct=Math.round(performance.now());});}
    if(!window.__pf.home&&typeof window.pbGoto==='function'&&document.readyState!=='loading'){const h=document.getElementById('screen-home');const b=h&&[...h.querySelectorAll('button,[role=button],a')].find(x=>x.offsetParent&&/New Run/.test(x.textContent));if(b){window.__pf.home=Math.round(performance.now());}}
    if(window.__pf.home&&window.__pf.acct)clearInterval(iv);
  }catch(e){}},50);
})();`;
P.launch = async (o = {}) => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY || 'direct://', bypass: '*' }, args: ['--host-resolver-rules=MAP app.pipelayersbible.com 127.0.0.1:' + PORT + ', MAP cdn.jsdelivr.net 127.0.0.1:' + PORT + ', MAP *.supabase.co 127.0.0.1:' + PORT + ', MAP * ~NOTFOUND', '--ignore-certificate-errors-spki-list=coLUDdYP7UvBwb8Nbdy3Rut8dtM0+q8TvIYI77qrTbU=', '--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 400, height: 850 }, ignoreHTTPSErrors: true, serviceWorkers: o.sw === false ? 'block' : 'allow', deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  // no ctx.route at all: Playwright turns the HTTP cache off when any route is set, and warm loads need it
  await ctx.addInitScript(CO + (o.init || '') + MARKS);
  return { b, ctx };
};
P.page = async (ctx, cpu) => {
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  const cdp = await ctx.newCDPSession(p); p.cdp = cdp;
  if (cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await cdp.send('Performance.enable');
  return p;
};
P.cpu = (p, rate) => p.cdp.send('Emulation.setCPUThrottlingRate', { rate });
// open url, wait for interactive home (or timeout); returns timings
P.open = async (p, url, timeout = 180000) => {
  const t0 = Date.now(); let err = null;
  try { await p.goto(url, { waitUntil: 'commit', timeout }); } catch (e) { err = e.message.slice(0, 80); }
  try { await p.waitForFunction(() => window.__pf && window.__pf.home, null, { timeout, polling: 200 }); } catch (e) { err = err || 'no home ' + e.message.slice(0, 40); }
  const wall = Date.now() - t0;
  const pf = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0] || {}; return Object.assign({}, window.__pf, { respStart: Math.round(n.responseStart || 0), respEnd: Math.round(n.responseEnd || 0), xfer: n.transferSize, sw: !!navigator.serviceWorker && !!navigator.serviceWorker.controller, ltN: window.__pf.lt.length, ltSum: window.__pf.lt.reduce((a, x) => a + x[1], 0), ltMax: Math.max(0, ...window.__pf.lt.map((x) => x[1])) }); }).catch((e) => ({ evalErr: e.message.slice(0, 80) }));
  delete pf.lt; pf.wall = wall; if (err) pf.err = err; return pf;
};
P.heap = async (p) => { const m = await p.cdp.send('Performance.getMetrics'); const g = (n) => (m.metrics.find((x) => x.name === n) || {}).value; return { jsHeapMB: Math.round(g('JSHeapUsedSize') / 1e5) / 10, nodes: g('Nodes') }; };
P.lt = (p) => p.evaluate(() => { const a = window.__pf.lt; window.__pf.lt = []; return { n: a.length, sum: a.reduce((s, x) => s + x[1], 0), max: Math.max(0, ...a.map((x) => x[1])) }; });
P.swReady = (p) => p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (!r) return 'noreg'; await navigator.serviceWorker.ready; for (let i = 0; i < 100 && !(await caches.keys()).length; i++) await new Promise((o) => setTimeout(o, 200)); return { ctl: !!navigator.serviceWorker.controller, caches: await caches.keys() }; });
P.ORIGIN = ORIGIN;
module.exports = P;
