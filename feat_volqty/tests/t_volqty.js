// r15.11 feat_volqty (owner, Oct 22: "There should be a quantity option for the volume calculators too"). Harness from r15.10 feat_calcimp (owner, Oct 22): "just use the apps volume calculators and then import the amount(s) directly from those answers"
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_volqty/';
const NEWJOB = () => {
  const orig = window.__rpc, jk = (n) => String(n || '').trim().toLowerCase().slice(0, 60);
  window.__rpc = async (fn, args) => {
    if (fn === 'pb_prod_job_create') {
      window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
      if (localStorage.getItem('__noJobCreate') === '1') return { data: null, error: { message: 'Could not find the function public.pb_prod_job_create(p_address, p_expect_uid, p_job_number, p_plan, p_project_name, p_start_date) in the schema cache' } };
      if ((localStorage.getItem('__rpcMode') || 'ok') === 'offline') return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      const me = (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
      if (args.p_expect_uid !== me) return { data: null, error: { message: 'pb:wrong_account' } };
      if (localStorage.getItem('__manager') !== '1') return { data: null, error: { message: 'pb:not_company_account' } };
      const srv = JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}'), co = localStorage.getItem('__company') || 'c1', k = jk(args.p_job_number);
      if (!k) return { data: null, error: { message: 'pb:bad_job' } };
      const p = srv.plans[co + '|' + k], e = Object.values(srv.entries || {}).find(x => x.company === co && jk(x.record && x.record.jobNumber) === k);
      if (p || e) return { data: null, error: { message: 'pb:job_exists ' + ((p && p.job_number) || e.record.jobNumber) } };
      srv.plans[co + '|' + k] = { plan: args.p_plan, version: 1, job_number: String(args.p_job_number).trim() }; localStorage.setItem('__psrv', JSON.stringify(srv));
      const info = JSON.parse(localStorage.getItem('__jinfo') || '{}'); info[k] = { project_name: args.p_project_name || null, address: args.p_address || null, start_date: args.p_start_date || null }; localStorage.setItem('__jinfo', JSON.stringify(info));
      return { data: { ok: true, job_key: k, job_number: String(args.p_job_number).trim(), version: 1, plan: args.p_plan }, error: null };
    }
    const r = await orig(fn, args);
    if (fn === 'pb_prod_company_dashboard' && r && r.data && Array.isArray(r.data.jobs)) { const info = JSON.parse(localStorage.getItem('__jinfo') || '{}'); r.data.jobs.forEach(j => Object.assign(j, info[j.job_key] || { project_name: null, address: null, start_date: null })); }
    return r;
  };
};
async function setup(browser, opts) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: opts.height || 844 }, isMobile: true, hasTouch: true });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(M.mockInit); await ctx.addInitScript(T.RPC); await ctx.addInitScript(NEWJOB);
  await ctx.addInitScript(([mg, ex]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctA', email: 'a@x.com' })); localStorage.setItem('lastKnownUserId', 'acctA'); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem('acctA:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' }));
    if (mg) localStorage.setItem('__manager', '1');
    for (const k in ex || {}) localStorage.setItem(k, typeof ex[k] === 'string' ? ex[k] : JSON.stringify(ex[k]));
  }, [opts.manager !== false, Object.assign({ __psrv: T.seedServer() }, opts.extra || {})]);
  const page = await M.open(ctx); await M.dismiss(page); await page.waitForTimeout(1200);
  await page.evaluate(() => pbGotoTab('home')); await T.waitFor(page, () => document.querySelectorAll('#homeCxJobs .pbx-job').length > 0 || !document.documentElement.classList.contains('pb-cx'), 10000);
  return { ctx, page };
}
const scr = (p) => p.evaluate(() => document.querySelector('.pb-screen.active').id);
const vis = (p, s) => p.evaluate((q) => { const e = document.querySelector(q); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, s);

const txt = (p, s) => p.evaluate((q) => { const e = document.querySelector(q); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, s);
const calls = (p, fn) => p.evaluate((f) => window.__rpcLog.filter(x => x.fn === f), fn);
const val = (p, s) => p.inputValue(s);
const MATMOCK = () => { const o = window.__rpc; window.__rpc = async (fn, args) => {
  const L = JSON.parse(localStorage.getItem('__mats') || '[]');
  if (fn === 'pb_mat_job') return { data: { job_key: String(args.p_job_number).toLowerCase(), job_number: args.p_job_number, materials: L, pipe_ft: { counted: 0, waiting: 0 }, server_at: new Date().toISOString() }, error: null };
  if (fn === 'pb_mat_save') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); const p = args.p_material; let m = p.id ? L.find(x => x.id === p.id) : null;
    if (m) Object.assign(m, { expected: Number(p.expected), version: m.version + 1 }); else { m = Object.assign({ id: 'n' + L.length, version: 1, fig: { status: 'ok', used: 0, ordered: 0, waiting: 0 }, orders: [], uses: [], archived: false }, p); L.push(m); }
    localStorage.setItem('__mats', JSON.stringify(L)); return { data: { ok: true, material: m }, error: null }; }
  if (fn === 'pb_mat_tickets') return { data: { lines: [] }, error: null };
  if (fn === 'pb_mat_job_settings') return { data: { settings: null }, error: null };
  return o(fn, args); }; };
const lastSave = (p) => p.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_save').pop() || {}).args);
const modal = (p) => p.evaluate(() => { const m = document.querySelector('.pb-modal-overlay, #pbModal, .pb-modal'); return !!(m && m.offsetParent !== null && getComputedStyle(m).display !== 'none'); });
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await page.reload(); await page.waitForTimeout(1500); await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(() => localStorage.setItem('__mats', JSON.stringify([{ id: 'bed1', name: 'Bedding rock', category: 'bedding_rock', source: 'bedding_calc', basis: 'volume', unit: 'yd³', expected: 50, alert_pct: 80, trench_width_ft: 3, bed_thick_ft: 0.5, density_tpy: 1.4, extra_pct: 10, use_as: 'bedding', version: 2, archived: false, orders: [], uses: [], fig: { status: 'ok', ordered: 0, used: 0, waiting: 0 } }])));
    const calc = async () => { await page.tap('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); await page.waitForTimeout(300); };
    // ---- Material Volume on its own ----
    await page.evaluate(() => pbOpenVolumeCalc()); await page.waitForTimeout(500);
    check('Quantity field, starts at 1, above Calculate', (await val(page, '#volQty')) === '1' && await page.evaluate(() => { const q = document.getElementById('volQty'), b = document.querySelector('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); return !!(q.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }));
    await page.fill('#volRectL', '10'); await page.fill('#volRectW', '10'); await page.fill('#volRectD', '1'); await calc();
    check('quantity 1: 3.70 yd³, no "each"', /3\.70 yd³/.test(await txt(page, '#volumeResult')) && !/each/.test(await txt(page, '#volumeResult')));
    await page.fill('#volQty', '6');
    check('changing Quantity marks the answer out of date', await page.evaluate(() => window.pbCalcIsStale('volumeCalc')));
    await calc();
    let t = await txt(page, '#volumeResult');
    check('quantity 6: 22.22 yd³, "Volume × 6", "6 × 3.70 yd³ each" (' + t.slice(0, 120) + ')', /Volume × 6/.test(t) && /22\.22 yd³/.test(t) && /6 × 3\.70 yd³ each/.test(t));
    await page.evaluate(() => document.querySelector('#volUnitToggle button[data-val="ft3"]').click()); await page.waitForTimeout(200);
    check('unit toggle keeps the quantity: 600.00 ft³', /600\.00 ft³/.test(await txt(page, '#volumeResult')));
    await page.evaluate(() => document.querySelector('#volUnitToggle button[data-val="yd3"]').click());
    for (const bad of ['0', '2.5', '-3']) { await page.fill('#volQty', bad); await calc(); check('quantity ' + bad + ' is refused (' + await txt(page, '#volumeResult') + ')', /Quantity: a whole number, 1 or more/.test(await txt(page, '#volumeResult'))); }
    await page.fill('#volQty', ''); await calc();
    check('blank quantity counts as 1', /3\.70 yd³/.test(await txt(page, '#volumeResult')) && !/each/.test(await txt(page, '#volumeResult')));
    await page.evaluate(() => document.querySelector('#volShapeToggle button[data-val="cyl"]').click()); await page.waitForTimeout(200);
    await page.fill('#volCylDia', '24'); await page.fill('#volCylL', '4'); await page.fill('#volQty', '10'); await calc();
    check('cylinder 24 in × 4 ft × 10 = 4.65 yd³ (' + (await txt(page, '#volumeResult')).slice(0, 80) + ')', /4\.65 yd³/.test(await txt(page, '#volumeResult')));
    await page.screenshot({ path: SHOTS + 'volqty.png', fullPage: false });
    await page.evaluate(() => document.querySelector('#volShapeToggle button[data-val="rect"]').click());
    // ---- into a material ----
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(800);
    await page.click('#homeCxNew'); await page.waitForTimeout(400);
    await page.fill('#cxnJob', '26014'); await page.click('#cxnSave');
    await T.waitFor(page, () => !!document.getElementById('ppSaveBtn'), 15000);
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(600);
    await T.waitFor(page, () => { const b = document.getElementById('pjMatAdd'); return b && !b.disabled; }, 15000);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.selectOption('#pmf_category', 'concrete'); await page.waitForTimeout(300);
    await page.check('input[name="pmfPMode"][value="calc"]'); await page.waitForTimeout(300);
    await page.tap('#pmfCiOpen_vol'); await page.waitForTimeout(600);
    await page.fill('#volRectL', '4'); await page.fill('#volRectW', '4'); await page.fill('#volRectD', '1.5'); await page.fill('#volQty', '6'); await calc();
    check('Use This Amount carries the total (5.33 yd³) (' + await txt(page, '#ciUse_vol') + ')', /5\.33 yd³ in place/.test(await txt(page, '#ciUse_vol') || ''));
    await page.tap('#ciUseBtn_vol'); await page.waitForTimeout(800);
    check('listed as Material Volume: Rectangular × 6, 5.33 yd³ (' + await txt(page, '#pmfCiList') + ')', /Material Volume: Rectangular × 6 5\.33 yd³ in place/.test(await txt(page, '#pmfCiList') || ''));
    check('Expected 5.33 + 5% = 5.6 (' + await val(page, '#pmf_expected') + ')', (await val(page, '#pmf_expected')) === '5.6');
    await page.evaluate(() => window.pbMatFormCancel()); await page.waitForTimeout(300);
    // ---- Structure Bedding ----
    await page.evaluate(() => window.pbMatAddExpForm('bed1')); await page.waitForTimeout(400);
    await page.check('input[name="pmfAddMode"][value="calc"]'); await page.waitForTimeout(300);
    await page.tap('#pmfCiOpen_sb'); await page.waitForTimeout(700);
    check('Structure Bedding has Quantity (structures this size), 1', (await val(page, '#beddingQty')) === '1' && /Quantity \(structures this size\)/.test(await txt(page, '#screen-beddingCalc')));
    await page.evaluate(() => { const b = document.querySelector('#beddingRefToggle button[data-val="inv"]'); if (b) b.click(); });
    await page.fill('#beddingInv', '100'); await page.fill('#beddingDist', '1'); await page.fill('#beddingThk', '0.5'); await page.fill('#beddingPadL', '6'); await page.fill('#beddingPadW', '9'); await page.fill('#beddingQty', '3');
    await page.tap('#screen-beddingCalc button[onclick="pbCalcBedding()"]'); await page.waitForTimeout(300);
    t = await txt(page, '#beddingVolBox');
    check('pad 6 × 9 × 0.5 × 3 structures = 3.00 yd³ (' + t + ')', /3\.00 yd³/.test(t) && /× 3 structures/.test(t));
    await page.tap('#ciUseBtn_sb'); await page.waitForTimeout(800);
    check('listed as Structure Bedding: 6 × 9 ft pad × 3 (' + await txt(page, '#pmfCiList') + ')', /Structure Bedding: 6 × 9 ft pad × 3 3 yd³ in place/.test(await txt(page, '#pmfCiList') || ''));
    check('3 yd³ + 10% = 3.3, new total 53.3 (' + await txt(page, '#pmfAddTot') + ')', /New total: 53\.3/.test(await txt(page, '#pmfAddTot') || ''));
    await page.evaluate(() => window.pbMatFormCancel());
    await page.evaluate(() => window.pbOpenBeddingCalc()); await page.waitForTimeout(400);
    await page.fill('#beddingQty', '1.5'); await page.tap('#screen-beddingCalc button[onclick="pbCalcBedding()"]'); await page.waitForTimeout(300);
    check('a bad structure quantity says so', /Quantity: a whole number, 1 or more/.test(await txt(page, '#beddingResult')));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
