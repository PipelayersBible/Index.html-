// owner, Oct 21: a material's Expected in all fills itself in from the plan's length and the trench numbers; r15.3.1: the job screen stops redrawing itself (iPhone taps were lost).
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_matexp/';
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
  if (fn === 'pb_mat_job') return { data: { job_key: String(args.p_job_number).toLowerCase(), job_number: args.p_job_number, materials: [], pipe_ft: { counted: 0, waiting: 0 }, server_at: new Date().toISOString() }, error: null };
  if (fn === 'pb_mat_save') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); return { data: { ok: true, material: Object.assign({ id: 'm' + Date.now(), version: 1, unit: 'yd³' }, args.p_material) }, error: null }; }
  if (fn === 'pb_mat_tickets') return { data: { lines: [] }, error: null };
  if (fn === 'pb_mat_job_settings') return { data: { settings: localStorage.getItem('__noTrench') ? null : { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, pipe_od_in: 8.625, version: 1 } }, error: null };
  return o(fn, args); }; };
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await page.reload(); await page.waitForTimeout(1500); await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.click('#homeCxNew'); await page.waitForTimeout(400);
    await page.fill('#cxnJob', '26014'); await page.click('#cxnSave');
    await T.waitFor(page, () => !!document.getElementById('ppSaveBtn'), 15000);
    const pi = await page.evaluate(() => [...document.querySelectorAll('#ppRows input[id^=ppName]')].findIndex(i => /Pipe Installed/.test(i.value)));
    await page.fill('#ppPlanned' + pi, '1200'); await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    const churn = await page.evaluate(() => new Promise(res => { let n = 0; const mo = new MutationObserver(ms => { n += ms.length; }); mo.observe(document.getElementById('screen-prodJob'), { childList: true, subtree: true, characterData: true }); setTimeout(() => { mo.disconnect(); res(n); }, 4000); }));
    check('the job screen holds still (no redraws while nothing changes): ' + churn + ' changes in 4 s', churn === 0);
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(800);
    check('Materials tab opens on one tap', await page.evaluate(() => document.getElementById('pjBody').dataset.cxtab === 'materials'));
    await page.tap('#pjCxTab_overview'); await page.waitForTimeout(500);
    check('…and back to Overview on one tap', await page.evaluate(() => document.getElementById('pjBody').dataset.cxtab === 'overview'));
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(500);
    await T.waitFor(page, () => { const b = document.getElementById('pjMatAdd'); return b && !b.disabled; }, 15000);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(500);
    const val = (s) => page.inputValue(s), help = () => txt(page, '#pmfExpHelp');
    check('pipe: Expected in all = the plan\'s 1,200 LF (' + await val('#pmf_expected') + ', ' + await help() + ')', (await val('#pmf_expected')) === '1200' && /1,200 LF \(Pipe Installed planned\)/.test(await help()));
    await page.evaluate(() => ((re) => { const c = document.getElementById('pmf_category'); if (c.value !== 'bedding') { c.value = 'bedding'; c.dispatchEvent(new Event('change')); } const s = document.getElementById('pmf_bedkind'); const o = [...s.options].find(x => re.test(x.textContent)); s.value = o.value; s.dispatchEvent(new Event('change')); })(/Coarse sand/)); await page.waitForTimeout(400);
    const yd = Math.round(1200 * 3 * 0.5 / 27 * 1.15 * 10) / 10;
    check('coarse sand (bedding): 1,200 × 3 × 0.5 ÷ 27 × 1.15 = ' + yd + ' yd³ (' + await val('#pmf_expected') + ' | ' + await help() + ')', (await val('#pmf_expected')) === String(yd) && /3 ft × 0.5 ft ÷ 27 × 1.15/.test(await help()));
    await page.screenshot({ path: SHOTS + 'exp_sand.png' });
    await page.check('input[name="pmfBasis"][value="weight"]'); await page.waitForTimeout(400);
    const dens = Number(await val('#pmf_density_tpy')), tn = Math.round(1200 * 3 * 0.5 / 27 * 1.15 * dens * 10) / 10;
    check('in tons, by its density ' + dens + ': ' + tn + ' (' + await val('#pmf_expected') + ')', (await val('#pmf_expected')) === String(tn));
    await page.fill('#pmf_trench_width_ft', '4'); await page.waitForTimeout(200);
    const tn4 = Math.round(1200 * 4 * 0.5 / 27 * 1.15 * dens * 10) / 10;
    check('typing a trench width updates it live: ' + tn4 + ' (' + await val('#pmf_expected') + ')', (await val('#pmf_expected')) === String(tn4));
    await page.fill('#pmf_expected', '150'); await page.fill('#pmf_trench_width_ft', '3.5'); await page.waitForTimeout(200);
    check('his own amount (150) stays when the numbers change; help says how to go back', (await val('#pmf_expected')) === '150' && /Your own amount/.test(await help()));
    await page.fill('#pmf_expected', ''); await page.click('#pmf_name'); await page.waitForTimeout(200);
    const tn35 = Math.round(1200 * 3.5 * 0.5 / 27 * 1.15 * dens * 10) / 10;
    check('cleared: fills in again (' + tn35 + ')', (await val('#pmf_expected')) === String(tn35));
    await page.check('input[name="pmfUse"][value="shading"]'); await page.waitForTimeout(400);
    const o = 8.625 / 12, sh = Math.round(1200 * (3.5 * (o + 1) - Math.PI * o * o / 4) / 27 * 1.15 * dens * 10) / 10;
    check('shading (job OD 8.625 in, 1 ft over): ' + sh + ' (' + await val('#pmf_expected') + ')', (await val('#pmf_expected')) === String(sh));
    await page.check('input[name="pmfUse"][value="bedding"]'); await page.waitForTimeout(300);
    await page.fill('#pmf_bed_thick_ft', '.5'); await page.fill('#pmf_extra_pct', '15.'); await page.waitForTimeout(200);
    await page.tap('#pmfSave'); await page.waitForTimeout(1200);
    const add = await page.evaluate(() => (window.__rpcLog.filter(x => /^pb_mat_(save|set|put|add)/.test(x.fn)).pop() || {}));
    check('Add Material sends the filled-in amount (' + JSON.stringify(add.args && (add.args.p_material || add.args).expected) + ')', !!add.fn && JSON.stringify(add.args).includes(String(tn35)));
    check('".5" and "15." typed: sent as 0.5 and 15 (the server refuses ".5") (' + JSON.stringify(add.args && add.args.p_material) + ')', add.args && add.args.p_material.bed_thick_ft === '0.5' && add.args.p_material.trench_width_ft === '3.5' && add.args.p_material.extra_pct === '15');
    await page.waitForTimeout(800); if (await page.$('#pmfCancel')) { await page.tap('#pmfCancel'); await page.waitForTimeout(300); } await T.waitFor(page, () => { const b = document.getElementById('pjMatAdd'); return b && !b.disabled; }, 15000);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    check('the form says only the name is needed', /Only the name is needed/.test((await txt(page, '#pmfQuick')) || ''));
    await page.fill('#pmf_name', 'Screened sand'); await page.selectOption('#pmf_category', 'bedding'); await page.waitForTimeout(300); await page.selectOption('#pmf_bedkind', 'c:bedding_sand'); await page.waitForTimeout(300);
    await page.fill('#pmf_expected', '40'); await page.tap('#pmfSave'); await page.waitForTimeout(1200);
    const q = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_save').pop() || {}).args);
    check('just a name and an amount: saved (' + JSON.stringify(q && q.p_material) + ')', q && q.p_material.name === 'Screened sand' && q.p_material.expected === '40' && !(await page.$('#pmfErr')));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
