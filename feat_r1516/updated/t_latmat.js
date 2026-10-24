// r15.4 (owner, Oct 21): a material counts from any LF item in the job plan (Laterals), Expected from that item's planned LF.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_latmat/';
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
    await page.fill('#ppPlanned' + pi, '3000');
    await page.click('#ppAddBtn'); await page.waitForTimeout(200);
    const li = await page.evaluate(() => document.querySelectorAll('#ppRows input[id^=ppName]').length - 1);
    await page.fill('#ppName' + li, 'Laterals'); await page.fill('#ppUnit' + li, 'LF'); await page.fill('#ppPlanned' + li, '300');
    check('a custom plan item says foremen enter it with each run', /Foremen enter it with each run/.test(await page.evaluate((i) => document.getElementById('ppRow' + i).textContent, li)));
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(600);
    await T.waitFor(page, () => { const b = document.getElementById('pjMatAdd'); return b && !b.disabled; }, 15000);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    const opts = await page.evaluate(() => [...document.querySelectorAll('#pmf_footage_cat option')].map(o => o.value + ':' + o.textContent));
    check('Footage from: Pipe Installed (first) and Laterals (' + opts.join(', ') + ')', opts[0] === 'pipe:Pipe Installed' && opts.some(o => /^laterals:Laterals$/.test(o)));
    await page.evaluate(() => ((re) => { const c = document.getElementById('pmf_category'); if (c.value !== 'bedding') { c.value = 'bedding'; c.dispatchEvent(new Event('change')); } const s = document.getElementById('pmf_bedkind'); const o = [...s.options].find(x => re.test(x.textContent)); s.value = o.value; s.dispatchEvent(new Event('change')); })(/Fine sand/)); await page.waitForTimeout(300);
    await page.selectOption('#pmf_footage_cat', 'laterals'); await page.waitForTimeout(400);
    const yd = Math.round(300 * 3 * 0.5 / 27 * 1.15 * 10) / 10;
    check('fine sand on Laterals: Expected = 300 LF × 3 × 0.5 ÷ 27 × 1.15 = ' + yd + ' (' + await page.inputValue('#pmf_expected') + ' | ' + await txt(page, '#pmfExpHelp') + ')', (await page.inputValue('#pmf_expected')) === String(yd) && /300 LF \(Laterals planned\)/.test((await txt(page, '#pmfExpHelp')) || ''));
    await page.screenshot({ path: SHOTS + 'footage_from.png' });
    await page.tap('#pmfSave'); await page.waitForTimeout(1200);
    const a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_save').pop() || {}).args);
    check('saved with footage_cat laterals (' + JSON.stringify(a && a.p_material) + ')', a && a.p_material.footage_cat === 'laterals' && a.p_material.source === 'bedding_calc');
    // the list as the server sends it: an 8in on Pipe Installed and a 3in on Laterals -> no split note; the 3in says Laterals
    await page.evaluate(() => { localStorage.setItem('__mats', JSON.stringify([
      { id: 'a1', name: '8in SDR 35', category: 'pipe', source: 'pipe_footage', unit: 'LF', expected: 3000, alert_pct: 80, version: 1, footage_cat: null, orders: [], uses: [], fig: { status: 'ok', used: 100, ordered: 0, waiting: 0 } },
      { id: 'a2', name: '3in SDR 35', category: 'pipe', source: 'pipe_footage', unit: 'LF', expected: 300, alert_pct: 80, version: 1, footage_cat: 'laterals', orders: [], uses: [], fig: { status: 'ok', used: 40, ordered: 0, waiting: 0 } }])); });
    await page.evaluate(() => { window.pbCxOpenJob('26014', 'materials'); }); await page.waitForTimeout(2500);
    const sec = await txt(page, '#pjMatSec');
    check('8in on Pipe Installed + 3in on Laterals: no "Split unknown"; the 3in says Laterals (' + sec.slice(0, 260) + ')', !/Split unknown/.test(sec) && /Counts Laterals footage/.test(sec));
    await page.evaluate(() => { const m = JSON.parse(localStorage.getItem('__mats')); m[1].footage_cat = null; localStorage.setItem('__mats', JSON.stringify(m)); window.pbCxOpenJob('26014', 'materials'); }); await page.waitForTimeout(2500);
    check('both on Pipe Installed: one short line that says to pick its own item in Footage from', /8in SDR 35 and 3in SDR 35 share the Pipe Installed footage/.test(await txt(page, '#pjMatSec')) && /Tap Shares footage on one/.test(await txt(page, '#pjMatSec')));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
