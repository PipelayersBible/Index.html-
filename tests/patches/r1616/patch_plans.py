import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    n = s.count(a); assert n == 1, (n, a[:80]); s = s.replace(a, b)

# 1. job page row
rep('''      <div class="pb-btn-wrap"><button type="button" class="pb-btn secondary" id="pjRefreshBtn" onclick="pbProdJobLoad()">''',
'''      <div class="pb-tools-group" id="pjPlansRow" hidden><button type="button" class="pb-edu-row pb-tool-row" data-dest="plans" id="pjPlansBtn" onclick="pbPlansOpenFromJob()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Plans</span><span class="sub" id="pjPlansSub">Plan sets Ask can read</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button></div>
      <div class="pb-btn-wrap"><button type="button" class="pb-btn secondary" id="pjRefreshBtn" onclick="pbProdJobLoad()">''')

# 2. the Plans screen
rep('''  <!-- ask_v2: DOCUMENTS (More > Documents, and a row on the job page). The office and foremen add them; individual plan: private. -->''',
'''  <!-- feat_plans (Nov 2026): a job's full plan sets; each sheet is rendered into high-resolution tiles here and read once on the server for Ask -->
  <div class="pb-screen" id="screen-plans">
    <div class="pb-header">
      <p class="pb-eyebrow"><span id="plansJobEyebrow">Job</span><button type="button" class="pb-back" title="Back" aria-label="Back" onclick="pbPlansBack()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-back"/></svg></button></p>
      <h1 class="pb-title">Plans</h1>
    </div>
    <div class="pb-docs-wrap">
      <p class="pb-docs-line" id="plansLine" role="status" aria-live="polite"></p>
      <div class="pb-btn-wrap" id="plansAddWrap" hidden style="padding-left:0;padding-right:0;"><button type="button" class="pb-btn" id="plansAddBtn" onclick="pbPlansPick()">Add Plan Set</button></div>
      <input type="file" id="plansFile" accept="application/pdf" hidden onchange="pbPlansPicked(this)">
      <div class="pb-ai-wait" id="plansWait" hidden style="margin-left:0;margin-right:0;"><span role="status" aria-live="polite"><span class="pb-ai-dot" aria-hidden="true"></span><span id="plansWaitT"></span></span></div>
      <div class="pb-docs-list" id="plansList"></div>
    </div>
  </div>
  <div class="pb-screen" id="screen-planSet">
    <div class="pb-header">
      <p class="pb-eyebrow"><span id="planSetEyebrow">Plans</span><button type="button" class="pb-back" title="Back" aria-label="Back" onclick="pbPlansBack()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-back"/></svg></button></p>
      <h1 class="pb-title" id="planSetTitle">Plan Set</h1>
    </div>
    <div class="pb-docs-wrap">
      <p class="pb-docs-line" id="planSetLine" role="status" aria-live="polite"></p>
      <div class="pb-tools-group" id="planSetList"></div>
    </div>
  </div>
  <div class="pb-screen" id="screen-planSheet">
    <div class="pb-header">
      <p class="pb-eyebrow"><span id="planSheetEyebrow">Plans</span><button type="button" class="pb-back" title="Back" aria-label="Back" onclick="pbPlansBack()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-back"/></svg></button></p>
      <h1 class="pb-title" id="planSheetTitle">Sheet</h1>
    </div>
    <div class="pb-plan-bar"><button type="button" class="pb-btn ghost" id="planPrevBtn" onclick="pbPlanSheetStep(-1)" aria-label="Previous sheet">&lsaquo;</button><button type="button" class="pb-btn ghost" onclick="pbPlanZoom(-1)" aria-label="Zoom out">&minus;</button><span id="planZoomT">Fit</span><button type="button" class="pb-btn ghost" onclick="pbPlanZoom(1)" aria-label="Zoom in">+</button><button type="button" class="pb-btn ghost" id="planNextBtn" onclick="pbPlanSheetStep(1)" aria-label="Next sheet">&rsaquo;</button></div>
    <p class="pb-docs-line" id="planSheetLine" role="status" aria-live="polite" style="margin:0 16px;"></p>
    <div class="pb-plan-view" id="planView"><div class="pb-plan-canvas" id="planCanvas"></div></div>
  </div>
  <!-- ask_v2: DOCUMENTS (More > Documents, and a row on the job page). The office and foremen add them; individual plan: private. -->''')

# 3. css
rep('''.pb-tool-row[data-dest="askDocs"] { --pb-tool-icon: var(--pb-icon-info); }''',
'''.pb-tool-row[data-dest="askDocs"] { --pb-tool-icon: var(--pb-icon-info); }
.pb-tool-row[data-dest="plans"] { --pb-tool-icon: var(--pb-icon-info); }
#pbApp #pjPlansRow { margin: 12px 0 0 0; }
#pbApp #pjPlansRow[hidden], #pbApp #plansAddWrap[hidden], #pbApp #plansWait[hidden] { display: none; }
#pbApp .pb-plans-rm { margin: 0 0 12px 0; }
#pbApp .pb-plans-open { width: 100%; text-align: left; background: none; border: 0; padding: 0; color: inherit; font: inherit; cursor: pointer; }
#pbApp .pb-plan-bar { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 16px; }
#pbApp .pb-plan-bar .pb-btn { min-width: 48px; width: auto; padding: 8px 14px; font-size: 20px; line-height: 1; }
#pbApp .pb-plan-bar span { min-width: 56px; text-align: center; font-weight: 700; }
#pbApp .pb-plan-view { overflow: auto; -webkit-overflow-scrolling: touch; margin: 8px 0 0 0; height: calc(100vh - 230px); height: calc(100dvh - 230px); background: #fff; border-top: 1px solid var(--pb-divider); }
#pbApp .pb-plan-canvas { position: relative; transform-origin: 0 0; }
#pbApp .pb-plan-canvas img { position: absolute; display: block; user-select: none; -webkit-user-drag: none; }
#pbApp .pb-plan-issue { color: var(--pb-danger, #b3261e); font-weight: 700; }''')

# 4. js
rep('''  // ---- ask_v2: Documents (More › Documents, and a row on the job page) ----''',
r'''  // ---- feat_plans (Nov 2026): plan sets on a job, read by Ask ----
  // The uploading device renders every sheet at 150 dpi into overlapping tiles (about 1568 x 1176 px) plus a small
  // overview, uploads them, and the server reads each sheet once into the job's plan index. A set that stops halfway
  // carries on when the same file is added again (the server answers with the sheets it already has).
  const PB_PLANS_DPI = 150, PB_PLANS_TW = 1568, PB_PLANS_TH = 1176, PB_PLANS_OV = 260, PB_PLANS_OVERVIEW = 1568; // overlap 260 px (1.7 in): a stacked invert label is whole in at least one tile
  const pbPlans = { job: '', sets: [], busy: false, ready: null, poll: null };
  const pbPlansEl = (id) => document.getElementById(id);
  function pbPlansSay(t) { const el = pbPlansEl('plansLine'); if (el) el.textContent = t || ''; }
  function pbPlansWait(t) { const w = pbPlansEl('plansWait'), x = pbPlansEl('plansWaitT'); if (w) w.hidden = !t; if (x) x.textContent = t || ''; }
  // the grid one sheet is cut into (same sums on every device, so a resumed set matches)
  function pbPlansGrid(W, H) {
    const cols = Math.max(1, Math.ceil((W - PB_PLANS_OV) / (PB_PLANS_TW - PB_PLANS_OV))), rows = Math.max(1, Math.ceil((H - PB_PLANS_OV) / (PB_PLANS_TH - PB_PLANS_OV)));
    const tw = Math.ceil((W + (cols - 1) * PB_PLANS_OV) / cols), th = Math.ceil((H + (rows - 1) * PB_PLANS_OV) / rows);
    const tiles = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tiles.push('r' + r + 'c' + c);
    return { dpi: PB_PLANS_DPI, w: W, h: H, cols, rows, tw, th, ov: PB_PLANS_OV, tiles };
  }
  window.pbPlansGrid = pbPlansGrid;
  async function pbPlansJpeg(page, viewport, x, y, w, h) {
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
  async function pbPlansPut(path, blob) {
    for (let k = 0; k < 3; k++) {
      let r = null; try { r = await sbClient.storage.from('plan-sets').upload(path, blob, { contentType: 'image/jpeg', upsert: false }); } catch (e) { r = { error: e }; }
      if (!r || !r.error) return true;
      const m = String((r.error && (r.error.message || r.error.error || r.error.statusCode)) || '');
      if (/exists|duplicate|409/i.test(m)) return true;               // sent before a lost answer
      if (navigator.onLine === false) return false;
      await new Promise((res) => setTimeout(res, 1500 * (k + 1)));
    }
    return false;
  }
  // company accounts only: the office, or a foreman of the company
  function pbPlansCanAdd() {
    try {
      const uid = pbArchiveOwnerUid; if (!uid || uid === 'shared') return false;
      const s = sbCachedSubscription; if (s && s.tier === 'individual' && !s.companyId) return false;
      return !!(window.pbAcOffice(uid) || pbLvIsForeman(uid));
    } catch (e) { return false; }
  }
  function pbPlansSetLine(x) {
    const n = x.pages, rd = x.read, up = x.uploaded, f = x.failed;
    if (x.state === 'ready') return 'Ready · ' + n + ' sheet' + (n === 1 ? '' : 's') + (f ? ' · ' + f + ' couldn’t be read' : '');
    if (x.state === 'reading') return 'Reading · ' + rd + ' of ' + n;
    if (x.state === 'uploading') return 'Sending · ' + up + ' of ' + n;
    return x.state === 'failed' ? 'Failed' : x.state;
  }
  function pbPlansRender() {
    const eb = pbPlansEl('plansJobEyebrow'); if (eb) eb.textContent = pbPlans.job ? 'Job ' + pbPlans.job : 'Tools';
    const add = pbPlansEl('plansAddWrap'); if (add) add.hidden = !pbPlans.job || !pbPlansCanAdd() || pbPlans.busy;
    const list = pbPlansEl('plansList'); if (!list) return;
    if (!pbPlans.sets.length) { list.innerHTML = pbPlans.ready ? '<p class="pb-edu-empty">No plan sets on this job yet.</p>' : ''; return; }
    list.innerHTML = pbPlans.sets.map((x) => '<div class="pb-docs-item" data-id="' + escapeHtml(String(x.id)) + '"><button type="button" class="pb-docs-row pb-plans-open" data-id="' + escapeHtml(String(x.id)) + '" onclick="pbPlanSetOpen(this.dataset.id)"><span class="tx"><span class="name">' + escapeHtml((pbPlans.job ? '' : 'Job ' + (x.job || '') + ' · ') + x.title) +
      '</span><span class="sub"><b' + (x.failed && x.state !== 'reading' ? ' class="bad"' : '') + '>' + escapeHtml(pbPlansSetLine(x)) + '</b></span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>' +
      (x.mine || (typeof window.pbAcOffice === 'function' && window.pbAcOffice(pbArchiveOwnerUid)) ? '<div class="pb-btn-wrap pb-plans-rm" style="padding-left:0;padding-right:0;"><button type="button" class="pb-btn ghost" data-id="' + escapeHtml(String(x.id)) + '" onclick="pbPlansRemove(this.dataset.id)">Remove</button></div>' : '') +
      '</div>').join('');
  }
  async function pbPlansLoad(quiet) {
    const r = pbPlans.job ? await pbDocsRpc('pb_plans_list', { p_job: pbPlans.job }, 'Couldn’t load the plans.') : await pbDocsRpc('pb_plans_my_sets', {}, 'Couldn’t load the plans.');
    if (!r.ok) { pbPlans.ready = false; if (!quiet) pbPlansSay(r.line); return; }
    pbPlans.ready = true; pbPlans.sets = Array.isArray(r.data.sets) ? r.data.sets : [];
    if (!quiet) pbPlansSay('');
    pbPlansRender();
    clearTimeout(pbPlans.poll);
    if (pbCurrentScreen === 'plans' && pbPlans.sets.some((x) => x.state === 'reading' || x.state === 'uploading') && !pbPlans.busy) pbPlans.poll = setTimeout(() => pbPlansLoad(true), 15000);
  }
  window.pbPlansOpenFromJob = function() {
    pbPlans.job = typeof pbPj === 'object' && pbPj && pbPj.job ? String(pbPj.job.job_number || '') : '';
    if (!pbPlans.busy) { pbPlans.sets = []; pbPlans.ready = null; pbPlansSay(''); }
    pbGoto('plans');
  };
  window.pbPlansBack = function() { if (pbHistory.length) pbGoBack(); else pbGotoTab('tools'); };
  window.pbPlansOpenAll = function() { if (!pbPlans.busy) { pbPlans.job = ''; pbPlans.sets = []; pbPlans.ready = null; pbPlansSay(''); } pbGoto('plans'); };
  // one set: its sheets
  const pbPlanV = { set: null, sheets: [], i: 0, zoom: 0, urls: [], obs: null, fit: 1 };
  window.pbPlanSetOpen = async function(id) {
    pbPlanV.set = { id, title: '' }; pbPlanV.sheets = [];
    const t = pbPlansEl('planSetTitle'); if (t) t.textContent = 'Plan Set';
    const l = pbPlansEl('planSetList'); if (l) l.innerHTML = '';
    pbGoto('planSet');
    const line = pbPlansEl('planSetLine'); if (line) line.textContent = 'Loading…';
    const r = await pbDocsRpc('pb_plans_sheets', { p_set: id }, 'Couldn’t load the sheets.');
    if (!r.ok) { if (line) line.textContent = r.line; return; }
    pbPlanV.set = r.data.set; pbPlanV.sheets = (r.data.sheets || []).filter((x) => x.grid && Array.isArray(x.grid.tiles));
    if (t) t.textContent = pbPlanV.set.title || 'Plan Set';
    if (line) line.textContent = pbPlanV.sheets.length ? '' : 'No sheets yet.';
    if (l) l.innerHTML = pbPlanV.sheets.map((x, k) => '<button type="button" class="pb-edu-row pb-tool-row" data-k="' + k + '" onclick="pbPlanSheetOpen(+this.dataset.k)"><span class="tx"><span class="name">' + escapeHtml(x.sheet ? 'Sheet ' + x.sheet : 'Page ' + x.page) + '</span><span class="sub">' +
      escapeHtml(x.title || (x.state === 'done' ? '' : 'Not read yet')) + (x.issues ? ' · <span class="pb-plan-issue">' + x.issues + ' discrepanc' + (x.issues === 1 ? 'y' : 'ies') + '</span>' : '') + '</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>').join('');
  };
  function pbPlanFree() { pbPlanV.urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} }); pbPlanV.urls = []; if (pbPlanV.obs) { try { pbPlanV.obs.disconnect(); } catch (e) {} pbPlanV.obs = null; } }
  async function pbPlanTile(img) {
    if (img.dataset.loaded) return; img.dataset.loaded = '1';
    try {
      const { data, error } = await sbClient.storage.from('plan-sets').download(img.dataset.path);
      if (error || !data) { img.dataset.loaded = ''; return; }
      const u = URL.createObjectURL(data); pbPlanV.urls.push(u); img.src = u;
    } catch (e) { img.dataset.loaded = ''; }
  }
  function pbPlanLayout() {
    const x = pbPlanV.sheets[pbPlanV.i], cv = pbPlansEl('planCanvas'), view = pbPlansEl('planView'); if (!x || !cv || !view) return;
    const g = x.grid, fit = Math.min(1, (view.clientWidth || 360) / (g.w || 5400)); pbPlanV.fit = fit;
    const k = fit * Math.pow(1.6, pbPlanV.zoom);
    cv.style.width = Math.round((g.w || 0) * k) + 'px'; cv.style.height = Math.round((g.h || 0) * k) + 'px';
    cv.querySelectorAll('img[data-x]').forEach((im) => { im.style.left = (+im.dataset.x * k) + 'px'; im.style.top = (+im.dataset.y * k) + 'px'; im.style.width = (+im.dataset.w * k) + 'px'; im.style.height = (+im.dataset.h * k) + 'px'; });
    const z = pbPlansEl('planZoomT'); if (z) z.textContent = pbPlanV.zoom ? Math.round(k / fit * 100) + '%' : 'Fit';
  }
  window.pbPlanSheetOpen = function(k) {
    pbPlanFree(); pbPlanV.i = Math.max(0, Math.min(k, pbPlanV.sheets.length - 1)); pbPlanV.zoom = 0;
    const x = pbPlanV.sheets[pbPlanV.i]; if (!x) return;
    const tt = pbPlansEl('planSheetTitle'); if (tt) tt.textContent = x.sheet ? 'Sheet ' + x.sheet : 'Page ' + x.page;
    const eb = pbPlansEl('planSheetEyebrow'); if (eb) eb.textContent = (pbPlanV.set && pbPlanV.set.title) || 'Plans';
    const ln = pbPlansEl('planSheetLine'); if (ln) ln.innerHTML = escapeHtml(x.title || '') + (x.issues ? ' · <span class="pb-plan-issue">' + x.issues + ' discrepanc' + (x.issues === 1 ? 'y' : 'ies') + ' (ask about them)</span>' : '');
    const pv = pbPlansEl('planPrevBtn'), nx = pbPlansEl('planNextBtn'); if (pv) pv.disabled = pbPlanV.i === 0; if (nx) nx.disabled = pbPlanV.i >= pbPlanV.sheets.length - 1;
    const g = x.grid, cv = pbPlansEl('planCanvas'); if (!cv) return;
    const parts = [];
    for (let r = 0; r < (g.rows || 1); r++) for (let c = 0; c < (g.cols || 1); c++) {
      const id = 'r' + r + 'c' + c; if (!g.tiles.includes(id)) continue;
      const tx = Math.min(c * (g.tw - g.ov), Math.max(0, g.w - g.tw)), ty = Math.min(r * (g.th - g.ov), Math.max(0, g.h - g.th));
      parts.push('<img alt="" loading="lazy" data-path="' + escapeHtml(pbPlanV.set.id + '/p' + x.page + '/' + id + '.jpg') + '" data-x="' + tx + '" data-y="' + ty + '" data-w="' + Math.min(g.tw, g.w) + '" data-h="' + Math.min(g.th, g.h) + '">');
    }
    cv.innerHTML = parts.join('');
    if (pbCurrentScreen !== 'planSheet') pbGoto('planSheet');
    setTimeout(() => {
      pbPlanLayout();
      const view = pbPlansEl('planView'); if (view) { view.scrollTop = 0; view.scrollLeft = 0; }
      try {
        pbPlanV.obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) pbPlanTile(e.target); }), { root: view, rootMargin: '400px' });
        cv.querySelectorAll('img[data-path]').forEach((im) => pbPlanV.obs.observe(im));
      } catch (e) { cv.querySelectorAll('img[data-path]').forEach(pbPlanTile); }
    }, 0);
  };
  window.pbPlanSheetStep = function(d) { window.pbPlanSheetOpen(pbPlanV.i + d); };
  window.pbPlanZoom = function(d) {
    const view = pbPlansEl('planView'); const before = Math.pow(1.6, pbPlanV.zoom);
    pbPlanV.zoom = Math.max(0, Math.min(6, pbPlanV.zoom + d));
    const after = Math.pow(1.6, pbPlanV.zoom), f = after / before;
    const cx = view ? view.scrollLeft + view.clientWidth / 2 : 0, cy = view ? view.scrollTop + view.clientHeight / 2 : 0;
    pbPlanLayout();
    if (view) { view.scrollLeft = cx * f - view.clientWidth / 2; view.scrollTop = cy * f - view.clientHeight / 2; }
  };
  window.pbPlansPick = function() { if (pbPlans.busy) return; const f = pbPlansEl('plansFile'); if (f) { f.value = ''; f.click(); } };
  window.pbPlansPicked = async function(inp) {
    const file = inp && inp.files && inp.files[0]; if (!file) return;
    if (!/pdf$/i.test(file.type || '') && !/\.pdf$/i.test(file.name || '')) { pbPlansSay('Use the plan set PDF.'); return; }
    if (navigator.onLine === false) { pbPlansSay('No signal.'); return; }
    if (!(await pbEnsurePdfjs())) { pbPlansSay('Couldn’t open PDFs on this device.'); return; }
    pbPlans.busy = true; pbPlansRender(); pbPlansSay('');
    let wake = null; try { wake = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch (e) { wake = null; }
    try {
      pbPlansWait('Opening the plan set…');
      const buf = new Uint8Array(await file.arrayBuffer());
      const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf))).map((b) => b.toString(16).padStart(2, '0')).join('');
      const pdf = await pdfjsLib.getDocument(Object.assign({ data: buf.slice(0) }, PB_PV_PDFJS)).promise;
      const n = pdf.numPages;
      const title = String(file.name || 'Plans').replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').slice(0, 200);
      const b = await pbDocsRpc('pb_plans_begin', { p_job: pbPlans.job, p_title: title, p_pages: n, p_sha256: sha }, 'Couldn’t add it.');
      if (!b.ok) { pbPlansSay(b.line); return; }
      const setId = String(b.data.set_id), have = new Set(Array.isArray(b.data.have) ? b.data.have.map(Number) : []);
      if (b.data.existing && b.data.state !== 'uploading') { pbPlansSay('That plan set is already on this job.'); return; }
      for (let p = 1; p <= n; p++) {
        if (have.has(p)) continue;
        pbPlansWait('Sending sheet ' + p + ' of ' + n + '…');
        const { grid, files } = await pbPlansRenderPage(pdf, p);
        for (const f of files) {
          if (!(await pbPlansPut(setId + '/p' + p + '/' + f.name + '.jpg', f.blob))) { pbPlansSay(navigator.onLine === false ? 'No signal. Add the same file again to carry on.' : 'Sheet ' + p + ' didn’t send. Add the same file again to carry on.'); return; }
        }
        const r = await pbDocsRpc('pb_plans_sheet_ready', { p_set: setId, p_page: p, p_grid: grid }, 'Sheet ' + p + ' didn’t send.');
        if (!r.ok) { pbPlansSay(r.line + ' Add the same file again to carry on.'); return; }
      }
      const u = await pbDocsRpc('pb_plans_uploaded', { p_set: setId }, 'Couldn’t finish sending.');
      if (!u.ok) { pbPlansSay(u.line); return; }
      pbPlansSay('Sent. Ask can use each sheet as soon as it’s read.');
      try { pdf.destroy(); } catch (e) {}
    } catch (e) {
      console.error('plans upload', e);
      pbPlansSay('Couldn’t read that PDF.');
    } finally {
      try { if (wake) wake.release(); } catch (e) {}
      pbPlans.busy = false; pbPlansWait(''); pbPlansRender(); pbPlansLoad(true);
    }
  };
  window.pbPlansRemove = async function(id) {
    if (pbPlans.busy) return;
    const ok = await new Promise((res) => pbShowModal('Remove this plan set? Ask stops using it.', [{ label: 'Cancel', onClick: () => res(false) }, { label: 'Remove', primary: true, onClick: () => res(true) }], 'Remove Plans'));
    if (!ok) return;
    const r = await pbDocsRpc('pb_plans_remove', { p_set: id }, 'Couldn’t remove it.');
    if (!r.ok) { pbPlansSay(r.line); return; }
    pbPlansLoad(true);
  };
  // job page row: shown once the server answers, to people who can add plans or when the job has plans
  async function pbPlansJobRow() {
    const row = pbPlansEl('pjPlansRow'); if (!row) return;
    const job = typeof pbPj === 'object' && pbPj && pbPj.job ? String(pbPj.job.job_number || '') : '';
    if (!job || navigator.onLine === false) return;
    const r = await pbPermitRpc('pb_plans_list', { p_job: job }, 15000);
    if (r.error || !r.data || r.data.ok !== true) { row.hidden = true; return; }
    const sets = Array.isArray(r.data.sets) ? r.data.sets : [];
    row.hidden = !(sets.length || pbPlansCanAdd());
    const sub = pbPlansEl('pjPlansSub');
    if (sub) { const ready = sets.filter((x) => x.state === 'ready').reduce((a, x) => a + (x.pages || 0), 0); sub.textContent = sets.length ? (ready ? ready + ' sheet' + (ready === 1 ? '' : 's') + ' ready for Ask' : pbPlansSetLine(sets[0])) : 'Plan sets Ask can read'; }
  }
  window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : [];
  // Tools: a Plans row once the person has plan sets to open (checked quietly, at most every 10 minutes)
  pbPlans.anyKnown = false; pbPlans.anyAt = 0;
  async function pbPlansAnyQuiet() {
    if (Date.now() - pbPlans.anyAt < 600000 || !sbClient || !sbUser || navigator.onLine === false) return;
    pbPlans.anyAt = Date.now();
    const r = await pbPermitRpc('pb_plans_my_sets', {}, 15000);
    const any = !!(r && !r.error && r.data && r.data.ok === true && Array.isArray(r.data.sets) && r.data.sets.length);
    if (any !== pbPlans.anyKnown) { pbPlans.anyKnown = any; try { if (pbCurrentScreen === 'tools') window.pbRenderToolsTab(); } catch (e) {} }
  }
  window.pbPlansAnyKnown = () => !!pbPlans.anyKnown;
  window.pbScreenHooks.push(function(name) {
    if (name === 'plans') { pbPlansRender(); pbPlansLoad(); }
    if (name === 'prodJob') setTimeout(pbPlansJobRow, 0);
    if (name === 'tools') setTimeout(pbPlansAnyQuiet, 0);
    if (name !== 'planSheet') pbPlanFree();
  });
  window.addEventListener('resize', () => { if (pbCurrentScreen === 'planSheet') pbPlanLayout(); });

  // ---- ask_v2: Documents (More › Documents, and a row on the job page) ----''')

rep("""  PB_DESTINATIONS.push({ id: 'talks',""","""  PB_DESTINATIONS.push({ id: 'plans', label: 'Plans', sub: 'Plan sets for your jobs', cat: 'reference', gate: 'aiAsk', screen: 'plans', words: 'plans plan set sheets drawings blueprints prints improvement plans profile sheet', open: () => window.pbPlansOpenAll() }); /* feat_plans */
  PB_SCREEN_TABS.plans = 'tools'; PB_SCREEN_TABS.planSet = 'tools'; PB_SCREEN_TABS.planSheet = 'tools';
  if (!PB_INDIVIDUAL_SCREENS.includes('plans')) PB_INDIVIDUAL_SCREENS.push('plans', 'planSet', 'planSheet');
  PB_DESTINATIONS.push({ id: 'talks',""")
rep("""(d.id !== 'askDocs' || (pbDocsCanAdd() && window.pbDocsReady()))); // ask_v2""","""(d.id !== 'askDocs' || (pbDocsCanAdd() && window.pbDocsReady())) && (d.id !== 'plans' || (typeof window.pbPlansAnyKnown === 'function' && window.pbPlansAnyKnown()))); // ask_v2; feat_plans""")
open(out, 'w', encoding='utf-8').write(s)
print('ok2')
