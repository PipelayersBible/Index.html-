// In-app interaction costs on a throttled CPU (network fast; these are CPU/storage bound).
// usage: node inapp.js <variant> <cpu>   ->  JSON on stdout
const P = require('./perf'); const L = require(__dirname+'/../offline/rig/lib'); const F = require(__dirname+'/../../rig/flow');
const PL = require(__dirname+'/../../rig/co_pl');
const V = process.argv[2] || 'base', CPU = +process.argv[3] || 4, URL = P.ORIGIN + '/' + V + '/';
const NRUNS = +process.env.NRUNS || 30, NPHOTOS = +process.env.NPHOTOS || 200;
const out = { V, CPU }; const T0 = Date.now(); const step = (n) => console.error(Math.round((Date.now() - T0) / 1000) + 's ' + n);
// time one synchronous UI action until the next frame is painted, plus long tasks in that window
const tap = (p, fnSrc) => p.evaluate(async (src) => {
  window.__pf.lt = []; const t0 = performance.now();
  (0, eval)('(' + src + ')')();
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const dt = performance.now() - t0; await new Promise((r) => setTimeout(r, 300));
  const lt = window.__pf.lt; return { ms: Math.round(dt), ltSum: lt.reduce((a, x) => a + x[1], 0), ltMax: Math.max(0, ...lt.map((x) => x[1])) };
}, fnSrc.toString());
// an async action: total time until its promise settles + long tasks within (and 1.5 s after)
const act = (p, fnSrc) => p.evaluate(async (src) => {
  window.__pf.lt = []; const t0 = performance.now();
  let r; try { r = await (0, eval)('(' + src + ')')(); } catch (e) { r = 'ERR ' + e.message; }
  const dt = performance.now() - t0; await new Promise((ok) => setTimeout(ok, 1500));
  const lt = window.__pf.lt; return { ms: Math.round(dt), ltSum: lt.reduce((a, x) => a + x[1], 0), ltMax: Math.max(0, ...lt.map((x) => x[1])), r: typeof r === 'object' ? undefined : r };
}, fnSrc.toString());
const setv = (p, id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); if (!e) return 'no ' + id; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, String(v)]);
async function buildRun(p) {
  await p.evaluate(() => { const lr = [...document.querySelectorAll('#screen-input button')].find((b) => b.textContent.trim() === "Engineer's Rod"); lr && lr.click(); });
  await setv(p, 'saJobNumber', '24-017'); await setv(p, 'saJobsite', 'Test Sewer');
  await setv(p, 'runBedding', 0.5); await setv(p, 'runTrenchWidth', 3); await setv(p, 'runWT', 0.08);
  await p.evaluate(() => { const e = document.getElementById('runIdSel'); e.value = [...e.options].find((o) => o.text.trim() === '8"').value; e.dispatchEvent(new Event('change', { bubbles: true })); });
  await setv(p, 'startStakeElev', 100); await setv(p, 'startCutFillVal', 5); await setv(p, 'startStakeReading', 4.8);
  await setv(p, 'endStakeElev', 99); await setv(p, 'endCutFillVal', 5); await setv(p, 'endStakeReading', 5.8);
  await setv(p, 'totalDist', 450); await setv(p, 'interval', 10);
  for (let h = 0; h < 4; h++) {
    await p.evaluate(() => pbAddHub()); await p.waitForTimeout(200);
    await p.evaluate((h) => { const b = document.querySelector('#hub' + h + 'ModeToggle button[data-val="elev"]'); b && b.click(); try { pbStSetMode('hub' + h, 'dist'); } catch (e) {} }, h);
    await setv(p, 'hub' + h + 'Station', 90 * (h + 1)); await setv(p, 'hub' + h + 'Elev', (95 - 0.4 * (h + 1)).toFixed(2));
  }
  await p.waitForTimeout(500);
}
(async () => {
  await P.net(P.NET.fast + '&maxage=600');
  const { b, ctx } = await P.launch({ sw: false });
  let p = await P.page(ctx, CPU); const H = F(p);
  out.load_empty = await P.open(p, URL); delete out.load_empty.xfer;
  await p.waitForTimeout(2000);
  step('out.heap_home'); out.heap_home = await P.heap(p);
  step('out.newRun'); out.newRun = await tap(p, () => { [...document.querySelectorAll('#screen-home button,#screen-home [role=button]')].find((x) => x.offsetParent && /New Run/.test(x.textContent)).click(); });
  await p.waitForTimeout(800);
  step('await'); await buildRun(p);
  out.typeField = await tap(p, () => { const e = document.getElementById('hub2Elev'); e.value = '94.10'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  step('out.review'); out.review = await tap(p, () => { [...document.querySelectorAll('button')].find((x) => x.offsetParent && x.textContent.trim() === 'Review & Calculate').click(); });
  await p.waitForTimeout(1200);
  out.rows = (await L.rows(p)).length;
  const fm = await H.modal(); if (fm) out.reviewModal = fm.slice(0, 120);
  await p.evaluate(() => { window.__rpcArgs = []; });
  step('await'); await L.lock(p);
  out.lockedRows = (await L.rows(p)).length;
  // laid marks, empty Records (one run)
  step('out.laid_empty'); out.laid_empty = [];
  for (const i of [3, 7, 11]) out.laid_empty.push(await act(p, `() => window.pbLaidMark(${i})`));
  // one mark through the real UI: row tap -> sheet -> "Mark laid to here"
  const rows = await L.rows(p);
  step('out.laid_ui_empty'); out.laid_ui_empty = await p.evaluate(async (d) => { window.__pf.lt = []; const t0 = performance.now(); const e = [...document.querySelectorAll('#screen-results [aria-label]')].find((e) => e.getAttribute('aria-label').startsWith('Distance ' + d + ' ')); e.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return { sheetMs: Math.round(performance.now() - t0) }; }, rows[14]);
  await p.waitForTimeout(400); { const bs = await H.modalBtns(); const m = bs.find((x) => /^Mark laid/.test(x)); out.laid_ui_btns = bs.join('|').slice(0, 200); if (m) await H.modalClick(m); else await p.keyboard.press('Escape'); }
  // the sheet for the crew view (what the foreman's phone sends)
  await p.waitForTimeout(3000);
  step('const'); const rec = await p.evaluate(() => { const a = (window.__rpcArgs || []).filter((x) => x[0] === 'pb_prod_run_record_put').pop(); return a ? a[1].p_record : null; });
  // ---- Records: NRUNS runs with NPHOTOS photos (~350 KB each, like the app's 0.82 JPEGs) ----
  await P.cpu(p, 1); // building the test data is not what is measured
  const big = await p.evaluate(async ([NR, NP]) => {
    const uid = '00000000-0000-4000-8000-000000000001', key = uid + ':runArchive';
    const db = await new Promise((ok, no) => { const r = indexedDB.open('pb-big', 1); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const get = () => new Promise((ok, no) => { const t = db.transaction('kv', 'readonly'); const q = t.objectStore('kv').get(key); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
    const arr = JSON.parse(await get()); const run = arr.find((e) => e.kind === 'run');
    // photo variants: noisy canvases -> JPEG data URLs of ~350 KB
    const variants = []; for (let v = 0; v < 6; v++) { const c = document.createElement('canvas'); c.width = 1280; c.height = 960; const g = c.getContext('2d'); const im = g.createImageData(1280, 960); for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() * 255) | 0; im.data[i] = n; im.data[i + 1] = (n + v * 40) & 255; im.data[i + 2] = 128; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); let q = 0.5, d = c.toDataURL('image/jpeg', q); while (d.length > 380000 && q > 0.1) { q -= 0.05; d = c.toDataURL('image/jpeg', q); } variants.push(d); }
    let ph = 0;
    for (let i = 1; i <= NR; i++) { const c = JSON.parse(JSON.stringify(run)); c.id = run.id - i * 3600000 * 5; c.lockTime = new Date(c.id).toISOString(); c.completed = true; c.runEndTime = c.id + 3600000; c.photos = []; const n = Math.round(NP * i / NR) - ph; for (let k = 0; k < n; k++) c.photos.push({ url: variants[(ph + k) % 6], name: 'Photo ' + (k + 1), added: c.id + k * 60000 }); ph += n; c.photoCount = n; arr.push(c); }
    const s = JSON.stringify(arr); await new Promise((ok, no) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(s, key); t.oncomplete = ok; t.onerror = () => no(t.error); }); db.close();
    return { entries: arr.length, photos: ph, MB: Math.round(s.length / 1e5) / 10, photoKB: Math.round(variants[0].length / 1000) };
  }, [NRUNS, NPHOTOS]);
  out.records = big;
  await P.cpu(p, CPU);
  await p.close();
  p = await P.page(ctx, CPU); const H2 = F(p);
  step('records built'); out.load_big = await P.open(p, URL); delete out.load_big.xfer;
  await p.waitForFunction(() => window.__pf.acct, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(3000);
  out.load_big.acct = await p.evaluate(() => window.__pf.acct);
  out.heap_big = await P.heap(p);
  await p.evaluate(() => pbResumeLastRunResults()); await p.waitForTimeout(3000);
  out.laid_big = [];
  for (const i of [19, 23, 27]) out.laid_big.push(await act(p, `() => window.pbLaidMark(${i})`));
  // a quick double: two marks 300 ms apart (each tap)
  out.laid_big_burst = await act(p, `async () => { const a = window.pbLaidMark(29); await new Promise(r => setTimeout(r, 300)); const b = window.pbLaidMark(31); return String(await a) + String(await b); }`);
  out.heap_after_marks = await P.heap(p);
  // open Records
  step('marks done'); out.openRecords = await tap(p, () => { pbGoto('archive'); });
  await p.waitForTimeout(1500);
  out.recordsRows = await p.evaluate(() => document.querySelectorAll('#archiveList .pb-arch-row, .pb-rec-row, [data-rec-id]').length);
  // search typing: 6 keystrokes, each fires input
  out.searchKeys = await p.evaluate(async () => { window.__pf.lt = []; const el = document.getElementById('archiveSearchBox'); const t0 = performance.now(); const word = 'Sewer!'; for (let i = 1; i <= word.length; i++) { el.value = word.slice(0, i); el.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 120)); } await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 400))); const lt = window.__pf.lt; const res = { ms: Math.round(performance.now() - t0), ltSum: lt.reduce((a, x) => a + x[1], 0), ltMax: Math.max(0, ...lt.map((x) => x[1])) }; el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); return res; });
  // run report PDF (the open run, with its photos run is the first big run)
  await p.evaluate(() => { const J = window.jspdf && window.jspdf.jsPDF; if (J) J.API.save = function () { window.__pdfDone = (window.__pdfDone || 0) + 1; return this; }; });
  out.pdf_run = await act(p, `async () => { const id = window.__pbRrDebug.run().id; await window.pbArchiveTap('pbDownloadArchivePDF', id); for (let k = 0; k < 600 && !window.__pdfDone; k++) await new Promise(r => setTimeout(r, 50)); return 'saved:' + (window.__pdfDone || 0); }`);
  out.pdf_photos = await act(p, `async () => { window.__pdfDone = 0; const id = window.__pbRrDebug.run().id - 2 * 3600000 * 5; await window.pbArchiveTap('pbDownloadArchivePDF', id); for (let k = 0; k < 1200 && !window.__pdfDone; k++) await new Promise(r => setTimeout(r, 50)); return 'saved:' + (window.__pdfDone || 0)  }`);
  step('pdf done'); out.heap_end = await P.heap(p);
  out.storageMB = await p.evaluate(async () => { const e = await navigator.storage.estimate(); return Math.round(e.usage / 1e6); });
  out.errs = p.errs.slice(0, 4);
  await b.close();
  // ---- crew view on the pipelayer's phone ----
  if (rec) {
    const W = ['station', 'stationFt', 'pointId', 'label', 'bop', 'inv', 'top', 'sgDisp', 'elevation', 'addedTime', 'layoutShort', 'layoutExact', 'layoutKind'];
    const sheet = { id: rec.id, kind: 'run', lockTime: rec.lockTime, jobNumber: rec.jobNumber, jobsite: rec.jobsite, startLabel: rec.startLabel, endLabel: rec.endLabel, rodUnit: rec.rodUnit, runStations: rec.runStations, intervalRows: rec.intervalRows.map((r) => { const o = {}; W.forEach((k) => { if (r[k] !== undefined && r[k] !== null) o[k] = r[k]; }); return o; }), laid: { marks: (rec.laid || {}).marks || {} } };
    const RID = 'aaaaaaaa-1111-4111-8111-000000000124', UPD = new Date(Date.now() - 5 * 60000).toISOString();
    const init = PL + `;(function(){window.__cvList={ok:true,runs:[{id:'${RID}',who:'Brandon Jones',job_number:'24-017',jobsite:'Test Sewer',label:'MH-1 to MH-2',locked_at:new Date().toISOString(),updated_at:'${UPD}',ended:false,version:3,distance_ft:450,laid_ft:150}],server_at:new Date().toISOString()};
     window.__cvGet=${JSON.stringify({ ok: true, id: RID, who: 'Brandon Jones', updated_at: UPD, version: 3, ended: false, sheet })};
     Object.assign(window.__rpcOverride,{pb_prod_crew_view_list:()=>window.__cvList,pb_prod_crew_view_get:(a)=>window.__cvGet});})();`;
    const { b: b2, ctx: c2 } = await P.launch({ sw: false, init });
    const q = await P.page(c2, CPU);
    out.load_pipelayer = await P.open(q, URL); delete out.load_pipelayer.xfer;
    await q.waitForTimeout(2500);
    out.crewList = await act(q, `async () => { document.getElementById('homeCrewView').click(); for (let k = 0; k < 200 && !document.querySelector('#cvRun0'); k++) await new Promise(r => setTimeout(r, 25)); return document.querySelector('#cvRun0') ? 'ok' : 'none'; }`);
    out.crewSheet = await act(q, `async () => { document.getElementById('cvRun0').click(); for (let k = 0; k < 200 && !document.querySelector('#cvTable tr.cv-row'); k++) await new Promise(r => setTimeout(r, 25)); return document.querySelectorAll('#cvTable tr.cv-row').length + ' rows'; }`);
    out.crewErrs = q.errs.slice(0, 3);
    await b2.close();
  } else out.crew = 'no record sent';
  console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.log(JSON.stringify(out, null, 1)); console.error('FATAL', e.message); process.exit(1); });
