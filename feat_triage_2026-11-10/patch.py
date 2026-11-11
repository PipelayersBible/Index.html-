#!/usr/bin/env python3
"""r16.22 (Tommy, Nov 10, 5 PM): plan sets send about 3x faster on a phone.
usage: python3 patch.py LIVE_INDEX OUT_HTML

- A sheet was drawn once per tile (17 full-page draws for a 24x36 sheet at 150 dpi). A heavy street sheet took ~10 min
  on an iPhone. Now each tile ROW is drawn once as a full-width strip and the tiles are cut from it: 1 + rows draws
  (5 for 24x36). A strip too big for a phone canvas (~16.7M px) falls back to one draw per tile.
- The tiles of a sheet go up three at a time instead of one after another.
- Time left is the average of the last three sheets, not since the start; time the phone spends asleep or in the
  background doesn't count (that is what made "131 min left" for 8 sheets).
- The wait line says "Preparing sheet p of n" while drawing and "Sending sheet p of n" while uploading.
"""
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90]); s = s.replace(a, b)

# 1. draw once per row
rep('''  async function pbPlansJpeg(page, viewport, x, y, w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
    await page.render({ canvasContext: cx, viewport, transform: [1, 0, 0, 1, -x, -y], background: 'rgba(255,255,255,1)' }).promise;
    const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.85));
    cv.width = cv.height = 0;
    if (!blob) throw new Error('render');
    return blob;
  }
  // one sheet -> [{name, blob}] + its grid
  async function pbPlansRenderPage(pdf, n) {
    const page = await pdf.getPage(n);
    const v1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: PB_PLANS_DPI / 72 });
    const W = Math.floor(vp.width), H = Math.floor(vp.height), g = pbPlansGrid(W, H), files = [];
    const s2 = PB_PLANS_OVERVIEW / Math.max(v1.width, v1.height), vo = page.getViewport({ scale: s2 });
    files.push({ name: 'overview', blob: await pbPlansJpeg(page, vo, 0, 0, Math.ceil(vo.width), Math.ceil(vo.height)) });
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      const x = Math.min(c * (g.tw - g.ov), Math.max(0, W - g.tw)), y = Math.min(r * (g.th - g.ov), Math.max(0, H - g.th));
      files.push({ name: 'r' + r + 'c' + c, blob: await pbPlansJpeg(page, vp, x, y, Math.min(g.tw, W), Math.min(g.th, H)) });
    }
    try { page.cleanup(); } catch (e) {}
    return { grid: g, files };
  }
  window.pbPlansRenderPage = pbPlansRenderPage;
''', '''  async function pbPlansCanvas(page, viewport, x, y, w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
    await page.render({ canvasContext: cx, viewport, transform: [1, 0, 0, 1, -x, -y], background: 'rgba(255,255,255,1)' }).promise;
    return cv;
  }
  async function pbPlansBlob(cv) {
    const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.85));
    cv.width = cv.height = 0;
    if (!blob) throw new Error('render');
    return blob;
  }
  async function pbPlansJpeg(page, viewport, x, y, w, h) { return pbPlansBlob(await pbPlansCanvas(page, viewport, x, y, w, h)); }
  async function pbPlansCut(strip, x, w, h) { /* one tile out of a row strip */
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(strip, x, 0, w, h, 0, 0, w, h);
    return pbPlansBlob(cv);
  }
  // one sheet -> [{name, blob}] + its grid
  // r16.22 (Tommy, Nov 10): each tile ROW is drawn once (a full-width strip) and its tiles are cut out of it: 1 + rows
  // draws for a sheet instead of 1 + rows x cols (5 instead of 17 for 24x36), so a heavy street sheet takes about a third
  // of the time on a phone. A strip bigger than a phone canvas allows (~16.7M px on iOS) falls back to one draw per tile.
  const PB_PLANS_STRIP_MAX = 16000000;
  async function pbPlansRenderPage(pdf, n) {
    const page = await pdf.getPage(n);
    const v1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: PB_PLANS_DPI / 72 });
    const W = Math.floor(vp.width), H = Math.floor(vp.height), g = pbPlansGrid(W, H), files = [];
    const s2 = PB_PLANS_OVERVIEW / Math.max(v1.width, v1.height), vo = page.getViewport({ scale: s2 });
    files.push({ name: 'overview', blob: await pbPlansJpeg(page, vo, 0, 0, Math.ceil(vo.width), Math.ceil(vo.height)) });
    const tw = Math.min(g.tw, W), th = Math.min(g.th, H), byRow = W * th <= PB_PLANS_STRIP_MAX;
    for (let r = 0; r < g.rows; r++) {
      const y = Math.min(r * (g.th - g.ov), Math.max(0, H - g.th));
      const strip = byRow ? await pbPlansCanvas(page, vp, 0, y, W, th) : null;
      for (let c = 0; c < g.cols; c++) {
        const x = Math.min(c * (g.tw - g.ov), Math.max(0, W - g.tw));
        files.push({ name: 'r' + r + 'c' + c, blob: strip ? await pbPlansCut(strip, x, tw, th) : await pbPlansJpeg(page, vp, x, y, tw, th) });
      }
      if (strip) strip.width = strip.height = 0;
    }
    try { page.cleanup(); } catch (e) {}
    return { grid: g, files };
  }
  window.pbPlansRenderPage = pbPlansRenderPage;
''')

# 2. three tiles in flight at once
rep('''  // company accounts only: the office, or a foreman of the company
  function pbPlansCanAdd() {''', '''  // r16.22: a sheet's tiles go up three at a time
  async function pbPlansPutAll(prefix, files) {
    let i = 0, ok = true;
    const lane = async () => { while (ok && i < files.length) { const f = files[i++]; if (!(await pbPlansPut(prefix + f.name + '.jpg', f.blob))) ok = false; } };
    await Promise.all([lane(), lane(), lane()]);
    return ok;
  }
  window.pbPlansPutAll = pbPlansPutAll;
  // company accounts only: the office, or a foreman of the company
  function pbPlansCanAdd() {''')
rep('''        pbPlansWait(pre + 'Sending sheet ' + p + ' of ' + n + pbPlansEta() + '. Keep the app open.');
        const { grid, files } = await pbPlansRenderPage(pdf, sheetPages[p - 1]); // r16.18: plan-size pages only
        for (const f of files) {
          if (!(await pbPlansPut(setId + '/p' + p + '/' + f.name + '.jpg', f.blob))) return { net: true, stop: navigator.onLine === false ? 'No signal. It carries on by itself when you’re back online.' : 'Sheet ' + p + ' didn’t send. It tries again by itself.' };
        }
        const r = await pbDocsRpc('pb_plans_sheet_ready', { p_set: setId, p_page: p, p_grid: grid }, 'Sheet ' + p + ' didn’t send.');
        if (!r.ok) return { net: true, stop: r.line + ' It tries again by itself.' };
        pbPlansProg.done++;''', '''        pbPlansProg.at = Date.now(); pbPlansProg.hid = 0;
        pbPlansWait(pre + 'Preparing sheet ' + p + ' of ' + n + pbPlansEta() + '. Keep the app open.');
        const { grid, files } = await pbPlansRenderPage(pdf, sheetPages[p - 1]); // r16.18: plan-size pages only
        pbPlansWait(pre + 'Sending sheet ' + p + ' of ' + n + pbPlansEta() + '. Keep the app open.');
        if (!(await pbPlansPutAll(setId + '/p' + p + '/', files))) return { net: true, stop: navigator.onLine === false ? 'No signal. It carries on by itself when you’re back online.' : 'Sheet ' + p + ' didn’t send. It tries again by itself.' };
        const r = await pbDocsRpc('pb_plans_sheet_ready', { p_set: setId, p_page: p, p_grid: grid }, 'Sheet ' + p + ' didn’t send.');
        if (!r.ok) return { net: true, stop: r.line + ' It tries again by itself.' };
        pbPlansProgDone();''')

# 3. time left from the last three sheets; asleep/background time doesn't count
rep('''  const pbPlansProg = { total: 0, done: 0, start: 0 };
  async function pbPlansProgStart(files) {
    pbPlansProg.total = 0; pbPlansProg.done = 0; pbPlansProg.start = Date.now();
    for (const f of files) { try { const d = await pdfjsLib.getDocument(Object.assign({ data: new Uint8Array(await f.arrayBuffer()) }, PB_PV_PDFJS)).promise; pbPlansProg.total += d.numPages; try { d.destroy(); } catch (e) {} } catch (e) {} }
    pbPlansProg.start = Date.now();
  }
  function pbPlansEta() {
    const P = pbPlansProg; if (P.done < 2 || !P.total) return ' · figuring time left';
    const left = Math.max(0, P.total - P.done) * (Date.now() - P.start) / P.done / 60000;
    return left < 1 ? ' · under a minute left' : ' · about ' + Math.round(left) + ' min left';
  }''', '''  // r16.22: time left = sheets left x the average of the last three sheets; time asleep or in the background doesn't count
  const pbPlansProg = { total: 0, done: 0, at: 0, hid: 0, last: [] };
  async function pbPlansProgStart(files) {
    pbPlansProg.total = 0; pbPlansProg.done = 0; pbPlansProg.at = 0; pbPlansProg.hid = 0; pbPlansProg.last = [];
    for (const f of files) { try { const d = await pdfjsLib.getDocument(Object.assign({ data: new Uint8Array(await f.arrayBuffer()) }, PB_PV_PDFJS)).promise; pbPlansProg.total += d.numPages; try { d.destroy(); } catch (e) {} } catch (e) {} }
  }
  function pbPlansProgDone() {
    const P = pbPlansProg; P.done++;
    if (P.at) { P.last.push(Math.max(0, Date.now() - P.at)); if (P.last.length > 3) P.last.shift(); }
    P.at = 0;
  }
  document.addEventListener('visibilitychange', () => {
    const P = pbPlansProg;
    if (document.visibilityState === 'hidden') { if (P.at) P.hid = Date.now(); }
    else if (P.hid) { P.at += Date.now() - P.hid; P.hid = 0; }
  });
  function pbPlansEta() {
    const P = pbPlansProg; if (!P.last.length || !P.total) return ' · figuring time left';
    const per = P.last.reduce((a, b) => a + b, 0) / P.last.length;
    const left = Math.max(0, P.total - P.done) * per / 60000;
    return left < 1 ? ' · under a minute left' : ' · about ' + Math.round(left) + ' min left';
  }
  window.pbPlansEta = pbPlansEta; window.pbPlansProg = pbPlansProg; window.pbPlansProgDone = pbPlansProgDone;''')

# 4. build
rep("PB_APP_BUILD = 'r16.21 · 2026-11-10'", "PB_APP_BUILD = 'r16.22 · 2026-11-10'")
open(sys.argv[2], 'w', encoding='utf-8').write(s); print('ok')
