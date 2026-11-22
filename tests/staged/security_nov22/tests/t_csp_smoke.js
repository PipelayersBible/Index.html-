// security_nov22: CSP smoke test. Serves a build folder (arg 1) on port 10755, opens it with the fake server rig, and checks:
// no CSP violations while the app starts, moves between screens, loads jsPDF and makes a PDF, activates pdf.js (blob
// worker) and renders a page, loads Supabase/Sentry/OSM/cdnjs URLs; and that a host NOT in the policy is blocked.
// node tests/staged/security_nov22/tests/t_csp_smoke.js <build folder with index.html (built with p01 + p99)>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const dir = process.argv[2]; const PORT = 10755;
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(PORT);
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 850 }, serviceWorkers: 'block' });
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(__dirname, '../../../rig/fakesb.js'), 'utf8') }));
  await ctx.route(/^https:\/\/(?!127\.0\.0\.1)/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null', headers: { 'Access-Control-Allow-Origin': '*' } }));
  const p = await ctx.newPage(); const cons = []; const errs = [];
  p.on('console', m => { if (/CSP-VIOLATION|Refused to|Content Security Policy/i.test(m.text())) cons.push(m.text()); });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(6000);
  ok(await p.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')), 'policy meta present in the built page');
  ok(await p.evaluate(() => Array.isArray(window.__cspV)), 'violation logger present (test build)');
  ok((await p.evaluate(() => window.__cspV)).length === 0, 'no violation at start-up (inline scripts, handlers, styles, fonts)', await p.evaluate(() => window.__cspV));
  // move around: every bottom tab and a few screens through the app's own navigation
  for (const s of ['calculators', 'records', 'more', 'settings', 'home', 'quickrun', 'dailyReport', 'confined']) { try { await p.evaluate((n) => { try { window.pbGoto && window.pbGoto(n); } catch (e) {} }, s); } catch (e) {} await p.waitForTimeout(700); }
  await p.waitForTimeout(2500); // jsPDF is pulled in ~1.5 s after load
  const pdf = await p.evaluate(async () => { try { const J = window.jspdf && window.jspdf.jsPDF; if (!J) return 'no jsPDF'; const d = new J(); d.text('CSP test', 10, 10); d.addImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'PNG', 10, 20, 5, 5); const bl = d.output('blob'); return bl.size > 500 ? 'ok' : 'small'; } catch (e) { return 'ERR ' + e.message; } });
  ok(pdf === 'ok', 'jsPDF loaded (inline script injection) and made a PDF with an image', pdf);
  const pj = await p.evaluate(async () => {
    try {
      const libEl = document.getElementById('pbPdfjsLibSrc'), wkEl = document.getElementById('pbPdfjsWorkerSrc');
      for (const el of [libEl, wkEl]) if (!el.textContent && el.getAttribute('data-pb-src')) el.textContent = await window.pbLazyText(el.getAttribute('data-pb-src'));
      if (!window.pdfjsLib) { const s = document.createElement('script'); s.textContent = libEl.textContent; document.head.appendChild(s); }
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([wkEl.textContent], { type: 'text/javascript' }));
      const J = window.jspdf.jsPDF; const d = new J(); d.text('pdf.js page', 10, 10); const buf = d.output('arraybuffer');
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; const pg = await doc.getPage(1);
      const vp = pg.getViewport({ scale: 1 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; const t = await pg.getTextContent();
      return t.items.map(i => i.str).join('');
    } catch (e) { return 'ERR ' + e.message; }
  });
  ok(/pdf\.js page/.test(pj), 'pdf.js activated with its blob worker and read a page', pj);
  const conn = await p.evaluate(async () => { const out = {}; for (const u of ['https://rogfassochneycezecxa.supabase.co/rest/v1/x', 'https://rogfassochneycezecxa.supabase.co/storage/v1/object/x', 'https://rogfassochneycezecxa.supabase.co/functions/v1/x',
      'https://o4512143154806784.ingest.us.sentry.io/api/1/envelope/', 'https://nominatim.openstreetmap.org/reverse?format=jsonv2', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.5.141/cmaps/x.bcmap', 'data/', 'https://evil.example.com/steal']) {
      try { await fetch(u, { method: 'GET' }); out[u] = 'ok'; } catch (e) { out[u] = 'blocked'; } } return out; });
  ok(Object.entries(conn).filter(([u]) => !/evil/.test(u)).every(([, v]) => v === 'ok'), 'Supabase REST/storage/functions, Sentry, OSM, cdnjs and the page folder are reachable', conn);
  ok(conn['https://evil.example.com/steal'] === 'blocked', 'a host not in the policy is blocked (connect-src works)', conn['https://evil.example.com/steal']);
  const ws = await p.evaluate(() => new Promise(res => { try { const w = new WebSocket('wss://rogfassochneycezecxa.supabase.co/realtime/v1/websocket'); setTimeout(() => { res('created'); try { w.close(); } catch (e) {} }, 300); } catch (e) { res('ERR ' + e.message); } }));
  ok(ws === 'created', 'Realtime websocket to Supabase allowed', ws);
  const imgs = await p.evaluate(async () => { const t = (src) => new Promise(res => { const i = new Image(); i.onload = () => res('ok'); i.onerror = () => res('err'); i.src = src; }); return [await t('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), await t(URL.createObjectURL(await (await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')).blob()))]; });
  ok(imgs.join() === 'ok,ok', 'data: and blob: images load (photos, stamps)', imgs);
  const v = (await p.evaluate(() => window.__cspV)).filter(x => !/evil\.example\.com/.test(x));
  ok(v.length === 0, 'no CSP violations in the whole run (except the deliberate blocked host)', v);
  ok(errs.filter(e => /Content Security|unsafe-eval|Refused/i.test(e)).length === 0, 'no page errors from the policy', errs.slice(0, 5));
  console.log('violations seen:', JSON.stringify(await p.evaluate(() => window.__cspV)));
  console.log(fail ? 'CSP SMOKE: ' + pass + ' pass, ' + fail + ' FAIL' : 'CSP SMOKE: all ' + pass + ' pass');
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL crashed', e.message); process.exit(1); });
