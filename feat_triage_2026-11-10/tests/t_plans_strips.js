// r16.22: plan sheets are drawn once per tile row (strips) and cut into tiles; tiles go up three at a time; time left
// comes from the last three sheets and ignores time asleep. Checks:
//  1. a 36x24 sheet gives the same grid and the same 17 files as before, and every tile's pixels match a direct
//     per-tile draw (the old way) within JPEG tolerance — including the overlap columns and the last (shifted) column/row;
//  2. a sheet whose strip would exceed a phone canvas (100x24 in) still renders, by the per-tile path, with the right grid;
//  3. pbPlansPutAll sends every tile, at most three at once, and reports a failed tile;
//  4. pbPlansEta: figuring → from the last three sheets → under a minute; background time is left out;
//  5. the wait line has both phases (Preparing / Sending) and the build is r16.22.
const { chromium, ORIGIN, check } = require('/home/claude/test/lib.js');
const M = require('/home/claude/test/hunt6/confined/mock5.js'); // Supabase fake (no CDN in the harness)

// a one-page PDF (W x H points) full of coloured rectangles, so every tile has distinct content and sharp edges
function makePdf(W, H, cols, rows) {
  const ops = [];
  const cw = W / cols, ch = H / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const r = ((i * 37 + j * 11) % 100) / 100, g = ((i * 13 + j * 53) % 100) / 100, b = ((i * 71 + j * 29) % 100) / 100;
    ops.push(`${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg ${(i * cw).toFixed(1)} ${(j * ch).toFixed(1)} ${(cw - 6).toFixed(1)} ${(ch - 6).toFixed(1)} re f`);
  }
  ops.push(`0 0 0 RG 4 w 0 0 m ${W} ${H} l S ${W} 0 m 0 ${H} l S`);
  const content = ops.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << >> >>`,
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out).toString('base64');
}

(async () => {
  const browser = await chromium.launch();
  const context = await M.newCtx(browser);
  // on top of the mock5 client: storage uploads take 40 ms and are counted (concurrency is measured there)
  await context.addInitScript(() => {
    const d = Object.getOwnPropertyDescriptor(window, 'supabase');
    window.__up = { active: 0, max: 0, paths: [], fail: null };
    Object.defineProperty(window, 'supabase', { configurable: true, get() { const s = d.get(); return { createClient: (...a) => {
      const c = s.createClient(...a);
      c.storage = { from: (bucket) => ({ upload: async (path) => {
        const U = window.__up; U.active++; U.max = Math.max(U.max, U.active); U.paths.push(bucket + '/' + path);
        await new Promise((r) => setTimeout(r, 40)); U.active--;
        if (U.fail && path.includes(U.fail)) return { data: null, error: { message: 'boom 500' } };
        return { data: { path }, error: null };
      } }) };
      return c;
    } }; }, set() {} });
  });
  const page = await M.open(context);

  const booted = await page.evaluate(async () => {
    // pdf.js lives in the page as text; the app parses it on first use (pbEnsurePdfjs is private) — do the same here
    const libEl = document.getElementById('pbPdfjsLibSrc'), wkEl = document.getElementById('pbPdfjsWorkerSrc');
    if (!libEl || !wkEl) return 'no pdfjs in page';
    if (!window.pdfjsLib) { const s = document.createElement('script'); s.textContent = libEl.textContent; document.head.appendChild(s); }
    if (!window.pdfjsLib) return 'pdfjs did not parse';
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([wkEl.textContent], { type: 'text/javascript' }));
    return 'ok';
  });
  check('pdf.js ready in the test page', booted === 'ok', booted);

  // ---- 1. 36x24 sheet: grid, files, pixels vs a direct per-tile draw
  const r1 = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const pdf = await pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise;
    const t0 = performance.now();
    const { grid: g, files } = await window.pbPlansRenderPage(pdf, 1);
    const ms = performance.now() - t0;
    const page1 = await pdf.getPage(1), vp = page1.getViewport({ scale: 150 / 72 });
    const W = Math.floor(vp.width), H = Math.floor(vp.height), tw = Math.min(g.tw, W), th = Math.min(g.th, H);
    const direct = async (x, y, w, h) => { // the old way: one draw per tile, then the same JPEG
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
      await page1.render({ canvasContext: cx, viewport: vp, transform: [1, 0, 0, 1, -x, -y], background: 'rgba(255,255,255,1)' }).promise;
      const raw = cx.getImageData(0, 0, w, h).data;
      const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.85));
      return { raw, jpg: (await decoded(blob)).data, bytes: blob.size };
    };
    const decoded = async (blob) => { const bm = await createImageBitmap(blob); const cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height; const cx = cv.getContext('2d'); cx.drawImage(bm, 0, 0); return { w: bm.width, h: bm.height, data: cx.getImageData(0, 0, bm.width, bm.height).data }; };
    const blockDiff = (a, b, w, h) => { // worst 32x32-block mean difference across the tile
      let worst = 0; const B = 32;
      for (let by = 0; by < h; by += B) for (let bx = 0; bx < w; bx += B) {
        let s = 0, n = 0;
        for (let y = by; y < Math.min(h, by + B); y++) for (let x = bx; x < Math.min(w, bx + B); x++) { const i = (y * w + x) * 4; s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n += 3; }
        worst = Math.max(worst, s / n);
      }
      return worst;
    };
    const out = { W, H, grid: { cols: g.cols, rows: g.rows, tw: g.tw, th: g.th, ov: g.ov, tiles: g.tiles.length }, names: files.map((f) => f.name), types: files.map((f) => f.blob && f.blob.type), ms, tiles: [] };
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      const x = Math.min(c * (g.tw - g.ov), Math.max(0, W - g.tw)), y = Math.min(r * (g.th - g.ov), Math.max(0, H - g.th));
      const f = files.find((q) => q.name === 'r' + r + 'c' + c); if (!f) { out.tiles.push({ r, c, missing: true }); continue; }
      const d = await decoded(f.blob), ref = await direct(x, y, tw, th);
      const same = d.w === tw && d.h === th;
      out.tiles.push({ r, c, w: d.w, h: d.h, diff: same ? Math.round(blockDiff(d.data, ref.jpg, tw, th) * 10) / 10 : 999, rawDiff: same ? Math.round(blockDiff(d.data, ref.raw, tw, th) * 10) / 10 : 999, bytes: f.blob.size, refBytes: ref.bytes });
    }
    const ov = await decoded(files[0].blob); out.overview = { w: ov.w, h: ov.h };
    try { pdf.destroy(); } catch (e) {}
    return out;
  }, makePdf(2592, 1728, 12, 8));
  check('36x24 sheet: 5400 x 3600 px at 150 dpi', r1.W === 5400 && r1.H === 3600, JSON.stringify([r1.W, r1.H]));
  check('grid 4 x 4, tiles 1545 x 1095, overlap 260', r1.grid.cols === 4 && r1.grid.rows === 4 && r1.grid.tw === 1545 && r1.grid.th === 1095 && r1.grid.ov === 260 && r1.grid.tiles === 16, JSON.stringify(r1.grid));
  check('17 files: overview + r0c0 … r3c3, all JPEG', r1.names.length === 17 && r1.names[0] === 'overview' && r1.names[16] === 'r3c3' && r1.types.every((t) => t === 'image/jpeg'), JSON.stringify(r1.names) + ' ' + JSON.stringify(r1.types));
  check('overview is 1568 px wide', r1.overview.w === 1568 && r1.overview.h > 1000, JSON.stringify(r1.overview));
  // the browser anti-aliases edges a hair differently in a wide strip than in a small canvas (≈0.3% of pixels, edge
  // pixels only), so the JPEGs are near-identical, not byte-identical: 32x32-block means within 4/255, sizes within 3%
  const worst = Math.max(...r1.tiles.map((t) => t.diff)), sizePct = Math.max(...r1.tiles.map((t) => Math.abs(t.bytes - t.refBytes) / t.refBytes * 100));
  const bad = r1.tiles.filter((t) => t.diff > 4 || Math.abs(t.bytes - t.refBytes) > t.refBytes * 0.03);
  console.log('     (worst block diff vs the old way\'s JPEG ' + worst + ', vs its raw pixels ' + Math.max(...r1.tiles.map((t) => t.rawDiff)) + ')');
  check('every tile is the right size', r1.tiles.every((t) => t.w === 1545 && t.h === 1095), JSON.stringify(r1.tiles.filter((t) => !(t.w === 1545 && t.h === 1095))));
  check('every tile cut from a strip matches the old per-tile draw (worst block diff ' + worst + ' ≤ 4, sizes within ' + sizePct.toFixed(1) + '% ≤ 3%)', bad.length === 0, JSON.stringify(bad));
  console.log('     (sheet drawn + cut in ' + Math.round(r1.ms) + ' ms here)');

  // ---- 2. too wide for one strip: falls back to one draw per tile
  const r2 = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const pdf = await pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise;
    const { grid: g, files } = await window.pbPlansRenderPage(pdf, 1);
    const last = files[files.length - 1]; const bm = await createImageBitmap(last.blob);
    try { pdf.destroy(); } catch (e) {}
    return { w: g.w, h: g.h, cols: g.cols, rows: g.rows, tw: g.tw, th: g.th, n: files.length, lastName: last.name, lw: bm.width, lh: bm.height, strip: g.w * Math.min(g.th, g.h) };
  }, makePdf(7200, 1728, 24, 8));
  check('100x24 sheet: strip would be ' + r2.strip + ' px (> 16M) → per-tile path still gives ' + r2.cols + ' x ' + r2.rows + ' tiles', r2.strip > 16000000 && r2.w === 15000 && r2.cols === 12 && r2.rows === 4 && r2.n === 49 && r2.lastName === 'r3c11', JSON.stringify(r2));
  check('its last tile is tile-sized', r2.lw === Math.min(r2.tw, r2.w) && r2.lh === Math.min(r2.th, r2.h), JSON.stringify([r2.lw, r2.lh, r2.tw, r2.th]));

  // ---- 3. three tiles in flight
  const r3 = await page.evaluate(async () => {
    const files = []; for (let i = 0; i < 17; i++) files.push({ name: i ? 'r' + Math.floor((i - 1) / 4) + 'c' + ((i - 1) % 4) : 'overview', blob: new Blob(['x']) });
    const U = window.__up; U.active = 0; U.max = 0; U.paths = []; U.fail = null;
    const ok = await window.pbPlansPutAll('set1/p3/', files);
    const a = { ok, max: U.max, n: U.paths.length, uniq: new Set(U.paths).size, first: U.paths[0], last: U.paths.slice().sort().pop() };
    U.active = 0; U.max = 0; U.paths = []; U.fail = 'r1c2';
    const t0 = performance.now(); const ok2 = await window.pbPlansPutAll('set1/p4/', files); const ms = performance.now() - t0;
    return { a, b: { ok: ok2, tries: U.paths.filter((p) => p.includes('r1c2')).length, ms } };
  });
  check('all 17 tiles sent once, 3 at a time at most (max in flight ' + r3.a.max + ')', r3.a.ok === true && r3.a.n === 17 && r3.a.uniq === 17 && r3.a.max === 3 && r3.a.first === 'plan-sets/set1/p3/overview.jpg' && r3.a.last === 'plan-sets/set1/p3/r3c3.jpg', JSON.stringify(r3.a));
  check('a tile that keeps failing (3 tries) makes the sheet fail, and the other lanes stop', r3.b.ok === false && r3.b.tries === 3, JSON.stringify(r3.b));

  // ---- 4. time left
  const r4 = await page.evaluate(() => {
    const P = window.pbPlansProg, out = {};
    P.total = 10; P.done = 0; P.last = []; P.at = 0; P.hid = 0;
    out.figuring = window.pbPlansEta();
    P.done = 2; P.last = [60000]; out.one = window.pbPlansEta();                 // 8 left x 60 s = 8 min
    P.last = [20000, 40000, 60000]; out.three = window.pbPlansEta();             // 8 x 40 s = 5.3 min
    P.last = [1000]; out.under = window.pbPlansEta();                            // 8 s
    P.last = [10000, 10000, 10000]; P.at = Date.now() - 20000; window.pbPlansProgDone(); out.afterDone = { done: P.done, last: P.last.map((x) => Math.round(x / 1000)), at: P.at };
    // a sheet that took 2 s of work while the phone slept 30 s in the middle counts as 2 s
    P.at = Date.now() - 32000; P.hid = Date.now() - 30000;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange'));
    window.pbPlansProgDone(); out.slept = Math.round(P.last[P.last.length - 1] / 1000);
    out.total = P.total; out.eta = window.pbPlansEta();
    return out;
  });
  check('before the first sheet: figuring time left', r4.figuring === ' · figuring time left', r4.figuring);
  check('one sheet of 60 s, 8 left: about 8 min left', r4.one === ' · about 8 min left', r4.one);
  check('last three 20/40/60 s: about 5 min left', r4.three === ' · about 5 min left', r4.three);
  check('1 s a sheet: under a minute left', r4.under === ' · under a minute left', r4.under);
  check('a finished sheet is added (keeps the last three) and the clock stops', r4.afterDone.done === 3 && r4.afterDone.last.length === 3 && r4.afterDone.last[2] === 20 && r4.afterDone.at === 0, JSON.stringify(r4.afterDone));
  check('30 s asleep in the middle of a sheet is left out of its time (' + r4.slept + ' s)', r4.slept === 2, JSON.stringify(r4));

  // ---- 5. wording + build
  const r5 = await page.evaluate(() => { const src = Array.from(document.scripts).map((s) => s.textContent).join('\n'); return { prep: src.includes("'Preparing sheet ' + p + ' of ' + n + pbPlansEta() + '. Keep the app open.'"), send: src.includes("'Sending sheet ' + p + ' of ' + n + pbPlansEta() + '. Keep the app open.'"), oldLoop: src.includes("for (const f of files) {\n          if (!(await pbPlansPut("), build: (src.match(/PB_APP_BUILD = '([^']+)'/) || [])[1] }; });
  check('wait line: Preparing sheet p of n, then Sending sheet p of n', r5.prep && r5.send && !r5.oldLoop, JSON.stringify(r5));
  check('build r16.22', /^r16\.22 · /.test(r5.build || ''), r5.build);
  check('no page errors', page._errors.length === 0, JSON.stringify(page._errors));
  await browser.close();
})().catch((e) => { console.log('SCRIPT ERROR', e); process.exit(1); });
