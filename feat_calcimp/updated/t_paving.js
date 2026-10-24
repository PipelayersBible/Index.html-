// r15.6 feat_paving: one Bedding / Shading type with its kind; asphalt (tons) and concrete (yd3) with a total or L x W x thickness. Harness from r15.5 (owner, Oct 21: everything tracked to a cost code; one material split by cost code). Built on r15.4.3 (two pipes silently shared Pipe Installed): the form warns, saving asks, the chip opens Edit. Built on r15.4.1: a material counts from an item counted in EA (Laterals 12 EA) x a length each. Built on r15.4: a material counts from any LF item in the job plan (Laterals), Expected from that item's planned LF.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_paving/';
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
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await page.reload(); await page.waitForTimeout(1500); await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(() => localStorage.setItem('__mats', '[]'));
    await page.click('#homeCxNew'); await page.waitForTimeout(400);
    await page.fill('#cxnJob', '26014'); await page.click('#cxnSave');
    await T.waitFor(page, () => !!document.getElementById('ppSaveBtn'), 15000);
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(600);
    await T.waitFor(page, () => { const b = document.getElementById('pjMatAdd'); return b && !b.disabled; }, 15000);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    const opts = await page.evaluate(() => [...document.querySelectorAll('#pmf_category option')].map(o => o.textContent));
    check('Type: Pipe, Bedding / Shading, Asphalt, Concrete, Fittings, Structures, Other (' + opts.join(', ') + ')', opts.join('|') === 'Pipe|Bedding / Shading|Asphalt|Concrete|Fittings|Structures|Other');
    check('no Which kind for a pipe', !(await page.$('#pmf_bedkind')));
    await page.fill('#pmf_name', 'Bedding rock'); await page.selectOption('#pmf_category', 'bedding'); await page.waitForTimeout(300);
    check('Bedding / Shading shows Which kind: Rock, Sand, Other', (await page.evaluate(() => [...document.querySelectorAll('#pmf_bedkind option')].map(o => o.textContent).join('|'))) === 'Rock|Sand|Other');
    check('and the estimate parts (Used as)', /Used as/.test(await txt(page, '#pmfForm')));
    await page.selectOption('#pmf_bedkind', 'bedding_sand'); await page.waitForTimeout(300);
    check('Type stays Bedding / Shading after picking Sand', (await val(page, '#pmf_category')) === 'bedding' && (await val(page, '#pmf_bedkind')) === 'bedding_sand');
    await page.tap('#pmfSave'); await page.waitForTimeout(1200);
    let a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_save').pop() || {}).args);
    check('saves as bedding_sand, bedding_calc (' + JSON.stringify(a && [a.p_material.category, a.p_material.source, a.p_material.kind]) + ')', a && a.p_material.category === 'bedding_sand' && a.p_material.source === 'bedding_calc' && !a.p_material.kind);
    // a sand preset still works and picks Sand
    await page.evaluate(() => window.pbCxOpenJob('26014', 'materials')); await page.waitForTimeout(1500);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.evaluate(() => [...document.querySelectorAll('.pbm-presets button')].find(b => /Fine sand/.test(b.textContent)).click()); await page.waitForTimeout(300);
    check('Fine sand preset: Bedding / Shading, kind Sand', (await val(page, '#pmf_category')) === 'bedding' && (await val(page, '#pmf_bedkind')) === 'bedding_sand');
    // asphalt preset, worked out from dimensions
    await page.evaluate(() => [...document.querySelectorAll('.pbm-presets button')].find(b => /^Asphalt$/.test(b.textContent.trim())).click()); await page.waitForTimeout(300);
    check('Asphalt preset: name Asphalt, Type Asphalt, no Which kind (' + await val(page, '#pmf_name') + ')', (await val(page, '#pmf_name')) === 'Asphalt' && (await val(page, '#pmf_category')) === 'asphalt' && !(await page.$('#pmf_bedkind')));
    check('asphalt: density 1.96 (verify), waste 5%, Expected in tons', (await val(page, '#pmf_density_tpy')) === '1.96' && (await val(page, '#pmf_extra_pct')) === '5' && /Expected in all \(tons\)/.test(await txt(page, '#pmfForm')));
    check('no estimate parts (Footage from / Used as) for asphalt', !(await page.$('#pmf_footage_cat')) && !/Used as/.test(await txt(page, '#pmfForm')));
    await page.check('input[name="pmfPMode"][value="calc"]'); await page.waitForTimeout(300);
    await page.tap('#pmfCiOpen_vol'); await page.waitForTimeout(600);
    await page.fill('#volRectL', '200'); await page.fill('#volRectW', '24'); await page.fill('#volRectD', '0.25'); await page.tap('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); await page.waitForTimeout(300);
    await page.tap('#ciUseBtn_vol'); await page.waitForTimeout(900);
    const ex = await val(page, '#pmf_expected'), help = await txt(page, '#pmfExpHelp');
    check('Material Volume 200 × 24 × 0.25 ft = 44.44 yd³ + 5% × 1.96 = 91.5 tons (' + ex + ' | ' + help + ')', ex === '91.5' && /44\.44 yd³ in place \+ 5% × 1\.96 t\/yd³ = 91\.5 tons/.test(help));
    await page.screenshot({ path: SHOTS + 'asphalt_form.png', fullPage: false });
    await page.tap('#pmfSave'); await page.waitForTimeout(1200);
    a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_save').pop() || {}).args);
    check('asphalt saves: other / entered / ton / kind asphalt / 1.96 / 5 / 91.5 (' + JSON.stringify(a && a.p_material) + ')', a && a.p_material.category === 'other' && a.p_material.source === 'entered' && a.p_material.unit === 'ton' && a.p_material.kind === 'asphalt' && a.p_material.density_tpy === '1.96' && a.p_material.extra_pct === '5' && a.p_material.expected === '91.5');
    // concrete from the Type list, a typed total
    await page.evaluate(() => window.pbCxOpenJob('26014', 'materials')); await page.waitForTimeout(1500);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.selectOption('#pmf_category', 'concrete'); await page.waitForTimeout(300);
    check('Type Concrete fills the name; Expected in yd³; no density', (await val(page, '#pmf_name')) === 'Concrete' && /Expected in all \(yd³\)/.test(await txt(page, '#pmfForm')) && !(await page.$('#pmf_density_tpy')));
    await page.fill('#pmf_expected', '30'); await page.tap('#pmfSave'); await page.waitForTimeout(1200);
    a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_save').pop() || {}).args);
    check('concrete saves: kind concrete, yd³, 30, no density (' + JSON.stringify(a && a.p_material) + ')', a && a.p_material.kind === 'concrete' && a.p_material.unit === 'yd³' && a.p_material.expected === '30' && a.p_material.density_tpy === '');
    // a plain Other sends kind '' (clears an old kind)
    // Edit an asphalt: Type shows Asphalt
    await page.evaluate(() => { const L = JSON.parse(localStorage.getItem('__mats')); L.forEach(m => { if (m.kind === 'asphalt') { m.expected = 91.5; m.density_tpy = 1.96; m.extra_pct = 5; } }); localStorage.setItem('__mats', JSON.stringify(L)); window.pbCxOpenJob('26014', 'materials'); }); await page.waitForTimeout(2000);
    const aid = await page.evaluate(() => JSON.parse(localStorage.getItem('__mats')).find(m => m.kind === 'asphalt').id);
    await page.evaluate((id) => window.pbMatEdit(id), aid); await page.waitForTimeout(500);
    check('editing the asphalt: Type Asphalt, density 1.96', (await val(page, '#pmf_category')) === 'asphalt' && (await val(page, '#pmf_density_tpy')) === '1.96');
    await page.evaluate(() => window.pbMatFormCancel()); await page.waitForTimeout(300);
    // Add to Expected by dimensions on the asphalt
    await page.evaluate((id) => window.pbMatAddExpForm(id), aid); await page.waitForTimeout(400);
    check('Add to Expected offers Use a calculator for asphalt', !!(await page.$('input[name="pmfAddMode"][value="calc"]')) && !(await page.$('input[name="pmfAddMode"][value="dim"]')));
    await page.check('input[name="pmfAddMode"][value="calc"]'); await page.waitForTimeout(300);
    await page.tap('#pmfCiOpen_vol'); await page.waitForTimeout(600);
    await page.fill('#volRectL', '50'); await page.fill('#volRectW', '24'); await page.fill('#volRectD', '0.25'); await page.tap('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); await page.waitForTimeout(300);
    await page.tap('#ciUseBtn_vol'); await page.waitForTimeout(900);
    const at = await txt(page, '#pmfAddTot');
    check('50 × 24 × 0.25 ft -> 22.9 tons, new total 114.4 (' + at + ')', /= 22\.9 tons/.test(at) && /New total: 114\.4/.test(at));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
