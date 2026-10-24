// r15.16 feat_r1516: road base Class 2/3/6, Type-then-kind form, asphalt/road base in the tons picker, spoils on the overview. Harness from r15.14 feat_itemmat (owner, Oct 22): material rows under each overview item, hide/show, material + item alerts, "Use the pipe length" box.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_r1516/';
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
  if (fn === 'pb_mat_job') return { data: { job_key: String(args.p_job_number).toLowerCase(), job_number: args.p_job_number, materials: JSON.parse(localStorage.getItem('__mats') || '[]'), pipe_ft: { counted: 0, waiting: 0 }, server_at: new Date().toISOString() }, error: null };
  if (fn === 'pb_mat_save') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); { const L = JSON.parse(localStorage.getItem('__mats') || '[]'); L.push(Object.assign({ id: 'n' + L.length, version: 1, unit: 'LF', fig: { status: 'ok', used: 0, ordered: 0, waiting: 0 }, orders: [], uses: [] }, args.p_material)); localStorage.setItem('__mats', JSON.stringify(L)); } return { data: { ok: true, material: Object.assign({ id: 'm' + Date.now(), version: 1, unit: 'yd³' }, args.p_material) }, error: null }; }
  if (fn === 'pb_mat_tickets') return { data: { lines: [] }, error: null };
  if (fn === 'pb_mat_job_settings') return { data: { settings: localStorage.getItem('__noTrench') ? null : { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, pipe_od_in: 8.625, version: 1 } }, error: null };
  return o(fn, args); }; };
const SPMOCK = () => { const o = window.__rpc; window.__rpc = async (fn, args) => { if (fn === 'pb_mat_spoils') { const v = localStorage.getItem('__spoils'); return { data: v ? JSON.parse(v) : null, error: null }; } return o(fn, args); }; };
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  const PLAN = { categories: [{ key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 400, planned_auto: true }, { key: 'restoration', name: 'Restoration', unit: 'LF', planned: 1000 }] };
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await ctx.addInitScript(SPMOCK); await page.reload(); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate((P) => { const srv = JSON.parse(localStorage.getItem('__psrv')); srv.plans['c1|24-101'] = { plan: P, version: 3, job_number: '24-101' }; localStorage.setItem('__psrv', JSON.stringify(srv)); localStorage.setItem('__mats', '[]');
      localStorage.setItem('__spoils', JSON.stringify({ status: 'ok', estimate: true, swell_pct: 25, ft: 510, bank_yd3: 68, loose_yd3: 85, haul_loose_yd3: 85, loads: 9, truck_yd3: 10 })); }, PLAN);
    await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(2500);
    const sp = await txt(page, '#pjItemSpoils');
    check('overview: "Spoils to haul ≈ 85 yd³ loose ≈ 9 loads" after the items, Inspections last (r15.22) (' + sp + ')', /Spoils to haul/.test(sp || '') && /≈ 85 yd³ loose/.test(sp) && /≈ 9 loads/.test(sp) && await page.evaluate(() => { const r = [...document.querySelectorAll('#pjCxHero .pbx-legrow')]; return r[r.length - 2].id === 'pjItemSpoils' && r[r.length - 1].id === 'pjInspRow'; }));
    await page.screenshot({ path: SHOTS + 'spoils_row.png', fullPage: false });
    await page.evaluate(() => { localStorage.setItem('__spoils', JSON.stringify({ status: 'needs_width', ft: 510 })); window.pbCxOpenJob('24-101', 'overview'); }); await page.waitForTimeout(2500);
    check('spoils without a width says so (' + await txt(page, '#pjItemSpoils') + ')', /Needs the trench width/.test(await txt(page, '#pjItemSpoils') || ''));
    // the form: Type first, kind, then the name
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(800);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    check('no Presets row', !(await page.$('.pbm-presets')));
    check('Type comes before the Material name', await page.evaluate(() => !!(document.getElementById('pmf_category').compareDocumentPosition(document.getElementById('pmf_name')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    await page.selectOption('#pmf_category', 'roadbase'); await page.waitForTimeout(400);
    const rk = await page.evaluate(() => [...document.querySelectorAll('#pmf_basekind option')].map(o => o.textContent));
    check('Road base > Which kind: Class 2, Class 3, Class 6 (' + rk.join(', ') + ')', rk.join('|') === 'Class 2|Class 3|Class 6');
    check('Class 2 Road Base, tons, density 2, waste 5', (await val(page, '#pmf_name')) === 'Class 2 Road Base' && (await val(page, '#pmf_density_tpy')) === '2' && (await val(page, '#pmf_extra_pct')) === '5' && /Expected in all \(tons\)/.test(await txt(page, '#pmfForm')));
    await page.selectOption('#pmf_basekind', 'base_class6'); await page.waitForTimeout(400);
    check('Class 6: the name follows', (await val(page, '#pmf_name')) === 'Class 6 Road Base' && (await val(page, '#pmf_basekind')) === 'base_class6');
    await page.check('input[name="pmfPMode"][value="calc"]'); await page.waitForTimeout(300);
    check('road base: Use a calculator offers Material Volume', !!(await page.$('#pmfCiOpen_vol')));
    await page.tap('#pmfCiOpen_vol'); await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('#volShapeToggle button[data-val="rect"]').click());
    await page.fill('#volRectL', '100'); await page.fill('#volRectW', '27'); await page.fill('#volRectD', '1'); await page.fill('#volQty', '1');
    await page.tap('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); await page.waitForTimeout(300);
    const wt = await page.evaluate(() => [...document.querySelectorAll('#pbWt-volume .pb-wt-pick button .pb-wt-n')].map(b => b.textContent));
    check('the tons picker has Asphalt and Road base (' + wt.join(', ') + ')', wt.includes('Asphalt (hot mix)') && wt.includes('Road base (Class 2 / 3 / 6)'));
    await page.evaluate(() => [...document.querySelectorAll('#pbWt-volume .pb-wt-pick button')].find(b => /Road base/.test(b.textContent)).click()); await page.waitForTimeout(300);
    check('100 yd³ of road base ≈ 200 tons in place (' + (await txt(page, '#pbWtOut-volume') || '').slice(0, 120) + ')', /100\.00 yd³ × 2 t\/yd³/.test(await txt(page, '#pbWtOut-volume') || ''));
    await page.tap('#ciUseBtn_vol'); await page.waitForTimeout(900);
    check('back in the form: 100 yd³ + 5% × 2 = 210 tons (' + await val(page, '#pmf_expected') + ')', (await val(page, '#pmf_expected')) === '210');
    await page.selectOption('#pmf_item_key', 'restoration');
    await page.tap('#pmfSave'); await page.waitForTimeout(1500);
    const m = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_save').pop() || {}).args);
    check('saved: other / entered / ton / kind base_class6 / density 2 / 210 / under Restoration (' + JSON.stringify(m && m.p_material) + ')', m && m.p_material.kind === 'base_class6' && m.p_material.category === 'other' && m.p_material.unit === 'ton' && String(m.p_material.density_tpy) === '2' && String(m.p_material.expected) === '210' && m.p_material.item_key === 'restoration');
    // bedding kinds
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.selectOption('#pmf_category', 'bedding'); await page.waitForTimeout(300);
    await page.selectOption('#pmf_bedkind', 'p:pea'); await page.waitForTimeout(300);
    check('Pea gravel: name, density 1.4, says to verify', (await val(page, '#pmf_name')) === 'Pea gravel (1/4" rock)' && (await val(page, '#pmf_density_tpy')) === '1.4' && /1\.40 tons per yd³ to start\. Verify with your supplier/.test(await txt(page, '#pmfForm')));
    await page.selectOption('#pmf_bedkind', 'c:bedding_sand'); await page.waitForTimeout(300);
    check('Other sand: kind changes, the typed name stays', (await val(page, '#pmf_bedkind')) === 'c:bedding_sand');
    await page.evaluate(() => window.pbMatFormCancel());
    // asphalt still 1.96
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.selectOption('#pmf_category', 'asphalt'); await page.waitForTimeout(300);
    check('asphalt: 1.96 tons per yd³, no Which kind', (await val(page, '#pmf_density_tpy')) === '1.96' && !(await page.$('#pmf_basekind')) && !(await page.$('#pmf_bedkind')));
    await page.screenshot({ path: SHOTS + 'form_top.png', fullPage: false });
    await page.evaluate(() => window.pbMatFormCancel());
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
