// r15.10 feat_calcimp (owner, Oct 22): "just use the apps volume calculators and then import the amount(s) directly from those answers"
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_calcimp/';
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
    await page.click('#homeCxNew'); await page.waitForTimeout(400);
    await page.fill('#cxnJob', '26014'); await page.click('#cxnSave');
    await T.waitFor(page, () => !!document.getElementById('ppSaveBtn'), 15000);
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(600);
    await T.waitFor(page, () => { const b = document.getElementById('pjMatAdd'); return b && !b.disabled; }, 15000);
    // ---- concrete: Use a calculator ----
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.selectOption('#pmf_category', 'concrete'); await page.waitForTimeout(300);
    const modes = await page.evaluate(() => [...document.querySelectorAll('input[name="pmfPMode"]')].map(i => i.value + ':' + i.closest('label').innerText.trim()));
    check('Expected amount: Type the total / Use a calculator (' + modes.join(', ') + ')', modes.join('|') === 'amt:Type the total|calc:Use a calculator');
    await page.check('input[name="pmfPMode"][value="calc"]'); await page.waitForTimeout(300);
    check('no length / width / thickness fields', !(await page.$('#pmf_dl')) && !(await page.$('#pmf_dw')) && !(await page.$('#pmf_dt')));
    const btns = await page.evaluate(() => [...document.querySelectorAll('#pmfCi .pbm-ci-btns button')].map(b => b.textContent));
    check('concrete offers Material Volume only (' + btns.join(', ') + ')', btns.join('|') === 'Material Volume');
    check('help says how (' + await txt(page, '#pmfExpHelp') + ')', /Use This Amount/.test(await txt(page, '#pmfExpHelp')));
    await page.fill('#pmf_extra_pct', '5');
    await page.tap('#pmfCiOpen_vol'); await page.waitForTimeout(600);
    check('opens Material Volume with no Leave without saving question', (await scr(page)) === 'screen-volumeCalc' && !(await modal(page)));
    check('band names the material (' + await txt(page, '#pbCiBand') + ')', /Getting an amount for\s*Concrete/i.test(await txt(page, '#pbCiBand') || ''));
    await page.fill('#volRectL', '200'); await page.fill('#volRectW', '24'); await page.fill('#volRectD', '0.5'); await page.tap('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); await page.waitForTimeout(300);
    check('Use This Amount for Concrete under the answer (' + await txt(page, '#ciUse_vol') + ')', /Use This Amount for Concrete/.test(await txt(page, '#ciUse_vol') || '') && /88\.89 yd³ in place/.test(await txt(page, '#ciUse_vol')));
    check('button sits right under the answer box', await page.evaluate(() => { const b = document.getElementById('ciUse_vol'); return b && b.previousElementSibling && b.previousElementSibling.classList.contains('pb-answer-box'); }));
    await page.screenshot({ path: SHOTS + 'calc_band.png' });
    await page.tap('#ciUseBtn_vol'); await page.waitForTimeout(800);
    check('back on the job, form still open', (await scr(page)) === 'screen-prodJob' && !!(await page.$('#pmfForm')) && (await val(page, '#pmf_category')) === 'concrete');
    check('Materials tab still selected', await page.evaluate(() => (document.getElementById('pjCxTab_materials') || {}).getAttribute && document.getElementById('pjCxTab_materials').getAttribute('aria-selected') === 'true'));
    check('list shows Material Volume: Rectangular 88.89 yd³ (' + await txt(page, '#pmfCiList') + ')', /Material Volume: Rectangular 88\.89 yd³ in place/.test(await txt(page, '#pmfCiList') || ''));
    check('Expected = 88.89 + 5% = 93.3 (' + await val(page, '#pmf_expected') + ' | ' + await txt(page, '#pmfExpHelp') + ')', (await val(page, '#pmf_expected')) === '93.3' && /88\.89 yd³ in place \+ 5% = 93\.3 yd³/.test(await txt(page, '#pmfExpHelp')));
    // a second amount
    check('button now says Add another from', /Add another from/.test(await txt(page, '#pmfCi')));
    await page.tap('#pmfCiOpen_vol'); await page.waitForTimeout(600);
    await page.evaluate(() => { document.querySelector('#volShapeToggle button[data-val="cyl"]').click(); }); await page.waitForTimeout(200);
    await page.fill('#volCylDia', '36'); await page.fill('#volCylL', '27'); await page.tap('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); await page.waitForTimeout(300);
    await page.tap('#ciUseBtn_vol'); await page.waitForTimeout(800);
    const li = await page.evaluate(() => [...document.querySelectorAll('#pmfCiList li')].map(l => l.innerText.replace(/\s+/g, ' ')));
    check('two amounts listed (' + li.join(' / ') + ')', li.length === 2 && /Cylindrical/.test(li[1]));
    const e2 = Number(await val(page, '#pmf_expected')); const want = Math.round((88.8889 + Math.PI * 1.5 * 1.5 * 27 / 27) * 1.05 * 10) / 10;
    check('Expected = both + 5% (' + e2 + ' vs ' + want + ') and help says 2 amounts', e2 === want && /2 amounts/.test(await txt(page, '#pmfExpHelp')));
    await page.screenshot({ path: SHOTS + 'form_two.png', fullPage: false });
    await page.tap('#pmfCiDel0'); await page.waitForTimeout(300);
    check('Remove the first: only the cylinder left; Expected follows (' + await val(page, '#pmf_expected') + ')', (await page.$$('#pmfCiList li')).length === 1 && (await val(page, '#pmf_expected')) === String(Math.round(Math.PI * 2.25 * 1.05 * 10) / 10));
    // Back to the Material without using it
    await page.tap('#pmfCiOpen_vol'); await page.waitForTimeout(600);
    await page.tap('#pbCiBack'); await page.waitForTimeout(600);
    check('Back to the Material: same form, nothing added', (await scr(page)) === 'screen-prodJob' && (await page.$$('#pmfCiList li')).length === 1);
    await page.tap('#pmfSave'); await page.waitForTimeout(1200);
    let a = await lastSave(page);
    check('concrete saves Expected ' + (a && a.p_material.expected), a && a.p_material.kind === 'concrete' && Number(a.p_material.expected) === Math.round(Math.PI * 2.25 * 1.05 * 10) / 10);
    // ---- asphalt in tons ----
    await page.evaluate(() => window.pbCxOpenJob('26014', 'materials')); await page.waitForTimeout(1500);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.selectOption('#pmf_category', 'asphalt'); await page.waitForTimeout(300);
    await page.check('input[name="pmfPMode"][value="calc"]'); await page.waitForTimeout(300);
    await page.tap('#pmfCiOpen_vol'); await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('#volShapeToggle button[data-val="rect"]').click()); await page.waitForTimeout(200);
    await page.fill('#volRectL', '200'); await page.fill('#volRectW', '24'); await page.fill('#volRectD', '0.25'); await page.tap('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); await page.waitForTimeout(300);
    await page.tap('#ciUseBtn_vol'); await page.waitForTimeout(800);
    check('asphalt: 44.44 yd³ + 5% × 1.96 = 91.5 tons (' + await val(page, '#pmf_expected') + ' | ' + await txt(page, '#pmfExpHelp') + ')', (await val(page, '#pmf_expected')) === '91.5' && /× 1\.96 t\/yd³ = 91\.5 tons/.test(await txt(page, '#pmfExpHelp')));
    await page.evaluate(() => window.pbMatFormCancel()); await page.waitForTimeout(300);
    // ---- bedding: Add to Expected from Bedding & Shading ----
    await page.evaluate(() => window.pbMatAddExpForm('bed1')); await page.waitForTimeout(400);
    check('Add to Expected: Amount / Use a calculator', (await page.evaluate(() => [...document.querySelectorAll('input[name="pmfAddMode"]')].map(i => i.value).join('|'))) === 'amt|calc');
    await page.check('input[name="pmfAddMode"][value="calc"]'); await page.waitForTimeout(300);
    const bb = await page.evaluate(() => [...document.querySelectorAll('#pmfCi .pbm-ci-btns button')].map(b => b.textContent));
    check('bedding offers Material Volume, Bedding & Shading, Structure Bedding (' + bb.join(', ') + ')', bb.join('|') === 'Material Volume|Bedding & Shading|Structure Bedding');
    await page.tap('#pmfSave'); await page.waitForTimeout(400);
    check('Add with nothing brought back says how (' + await txt(page, '#pmfErr') + ')', /Use This Amount/.test(await txt(page, '#pmfErr') || ''));
    await page.tap('#pmfCiOpen_bs'); await page.waitForTimeout(700);
    check('Bedding & Shading opens with the band for Bedding rock', (await scr(page)) === 'screen-bedShadeCalc' && /Bedding rock/.test(await txt(page, '#pbCiBand') || ''));
    await page.fill('#bsL0', '270'); await page.fill('#bsW0', '3'); await page.fill('#bsT0', '0.5'); await page.waitForTimeout(500);
    check('Use This Amount: 15 yd³ in place (' + await txt(page, '#ciUse_bs') + ')', /15 yd³ in place/.test(await txt(page, '#ciUse_bs') || ''));
    await page.tap('#ciUseBtn_bs'); await page.waitForTimeout(800);
    const tot = await txt(page, '#pmfAddTot');
    check('15 yd³ + 10% = 16.5, new total 66.5 (' + tot + ')', /15 yd³ in place \+ 10% = 16\.5 yd³/.test(tot) && /New total: 66\.5/.test(tot));
    await page.tap('#pmfSave'); await page.waitForTimeout(1200);
    a = await lastSave(page);
    check('saves Expected 66.5 (' + (a && a.p_material.expected) + ')', a && Number(a.p_material.expected) === 66.5);
    // ---- Structure Bedding ----
    await page.evaluate(() => window.pbCxOpenJob('26014', 'materials')); await page.waitForTimeout(1500);
    await page.evaluate(() => window.pbMatAddExpForm('bed1')); await page.waitForTimeout(400);
    await page.check('input[name="pmfAddMode"][value="calc"]'); await page.waitForTimeout(300);
    await page.tap('#pmfCiOpen_sb'); await page.waitForTimeout(700);
    check('Structure Bedding opens with the band', (await scr(page)) === 'screen-beddingCalc' && !!(await page.$('#pbCiBand')));
    await page.evaluate(() => { const b = document.querySelector('#beddingRefToggle button[data-val="inv"]'); if (b) b.click(); });
    await page.fill('#beddingInv', '100'); await page.fill('#beddingDist', '1'); await page.fill('#beddingThk', '0.5'); await page.fill('#beddingPadL', '6'); await page.fill('#beddingPadW', '9'); await page.tap('#screen-beddingCalc button[onclick="pbCalcBedding()"]'); await page.waitForTimeout(300);
    check('Use This Amount under the pad volume (1 yd³) (' + await txt(page, '#ciUse_sb') + ')', /1 yd³ in place/.test(await txt(page, '#ciUse_sb') || ''));
    await page.tap('#ciUseBtn_sb'); await page.waitForTimeout(800);
    check('listed as Structure Bedding: 6 × 9 ft pad (' + await txt(page, '#pmfCiList') + ')', /Structure Bedding: 6 × 9 ft pad/.test(await txt(page, '#pmfCiList') || ''));
    // leaving the calculators for Home drops the form
    await page.tap('#pmfCiOpen_vol'); await page.waitForTimeout(600);
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(800);
    await page.evaluate(() => window.pbCxOpenJob('26014', 'materials')); await page.waitForTimeout(1500);
    check('going Home from the calculator closes the material form', !(await page.$('#pmfForm')));
    // calculators opened normally: no band, no button
    await page.evaluate(() => pbOpenVolumeCalc()); await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('#volShapeToggle button[data-val="rect"]').click()); await page.waitForTimeout(200);
    await page.fill('#volRectL', '10'); await page.fill('#volRectW', '10'); await page.fill('#volRectD', '1'); await page.tap('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); await page.waitForTimeout(300);
    check('Material Volume on its own: no band, no Use This Amount', !(await page.$('#pbCiBand')) && !(await page.$('#ciUse_vol')) && /3\.70 yd³/.test(await txt(page, '#volumeResult')));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
