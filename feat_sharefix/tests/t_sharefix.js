// r15.4.3 (owner, Oct 21: two pipes silently shared Pipe Installed): the form warns, saving asks, the chip opens Edit. Built on r15.4.1: a material counts from an item counted in EA (Laterals 12 EA) x a length each. Built on r15.4: a material counts from any LF item in the job plan (Laterals), Expected from that item's planned LF.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_sharefix/';
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
    await page.evaluate(() => localStorage.setItem('__mats', JSON.stringify([{ id: 'a1', name: '8in SDR 35', category: 'pipe', source: 'pipe_footage', unit: 'LF', expected: 3000, alert_pct: 80, version: 1, footage_cat: null, orders: [], uses: [], fig: { status: 'ok', used: 0, ordered: 0, waiting: 0 } }])));
    await page.click('#homeCxNew'); await page.waitForTimeout(400);
    await page.fill('#cxnJob', '26014'); await page.click('#cxnSave');
    await T.waitFor(page, () => !!document.getElementById('ppSaveBtn'), 15000);
    await page.click('#ppAddBtn'); await page.waitForTimeout(200);
    const li = await page.evaluate(() => document.querySelectorAll('#ppRows input[id^=ppName]').length - 1);
    await page.fill('#ppName' + li, 'Laterals'); await page.fill('#ppUnit' + li, 'EA'); await page.fill('#ppPlanned' + li, '14');
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(600);
    await T.waitFor(page, () => { const b = document.getElementById('pjMatAdd'); return b && !b.disabled; }, 15000);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.fill('#pmf_name', '3in SDR 35'); await page.waitForTimeout(200);
    const w = await txt(page, '#pmfShareWarn');
    check('a 2nd pipe on Pipe Installed: the form warns right away (' + w + ')', /8in SDR 35 already counts Pipe Installed/.test(w || '') && /A different pipe\? Pick its own item/.test(w || ''));
    await page.screenshot({ path: SHOTS + 'share_warn.png' });
    await page.tap('#pmfSave'); await page.waitForTimeout(500);
    const md = await page.evaluate(() => ({ t: document.getElementById('pbModalTitle').textContent, m: document.getElementById('pbModalMessage').textContent, b: [...document.querySelectorAll('#pbModalButtons button')].map(b => b.textContent) }));
    check('saving asks first: Pick Its Own Item / Share It (' + JSON.stringify(md.b) + ')', md.t === 'Same Footage' && /already counts Pipe Installed/.test(md.m) && md.b.includes('Pick Its Own Item') && md.b.includes('Share It'));
    check('…nothing saved yet', !(await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_mat_save'))));
    await page.evaluate(() => [...document.querySelectorAll('#pbModalButtons button')].find(b => b.textContent === 'Pick Its Own Item').click()); await page.waitForTimeout(300);
    check('Pick Its Own Item: back at Footage from', await page.evaluate(() => document.activeElement && document.activeElement.id === 'pmf_footage_cat'));
    await page.selectOption('#pmf_footage_cat', 'laterals'); await page.waitForTimeout(300);
    check('on Laterals: the warning is gone', !(await page.$('#pmfShareWarn')));
    await page.fill('#pmf_each_ft', '70'); await page.tap('#pmfSave'); await page.waitForTimeout(1200);
    const a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_save').pop() || {}).args);
    check('saved on Laterals × 70 ft, no question (' + JSON.stringify(a && a.p_material) + ')', a && a.p_material.footage_cat === 'laterals' && a.p_material.each_ft === '70');
    // already sharing (made before this fix): the chip opens Edit at Footage from
    await page.evaluate(() => { localStorage.setItem('__mats', JSON.stringify([
      { id: 'a1', name: '8in SDR 35', category: 'pipe', source: 'pipe_footage', unit: 'LF', expected: 3000, alert_pct: 80, version: 1, footage_cat: null, orders: [], uses: [], fig: { status: 'split_unknown', used: null, ordered: 0, waiting: 0 } },
      { id: 'a2', name: '3in SDR 35', category: 'pipe', source: 'pipe_footage', unit: 'LF', expected: 980, alert_pct: 80, version: 1, footage_cat: null, orders: [], uses: [], fig: { status: 'split_unknown', used: null, ordered: 0, waiting: 0 } }])); window.pbCxOpenJob('26014', 'materials'); }); await page.waitForTimeout(2500);
    check('"Shares footage" is a button', await page.evaluate(() => [...document.querySelectorAll('#pjMat_a2 button.pbm-chip')].some(b => /Shares footage/.test(b.textContent))));
    await page.evaluate(() => [...document.querySelectorAll('#pjMat_a2 button.pbm-chip')][0].click()); await page.waitForTimeout(400);
    check('tapping it opens 3in SDR 35 at Footage from, with the warning', (await page.inputValue('#pmf_name')) === '3in SDR 35' && await page.evaluate(() => document.activeElement && document.activeElement.id === 'pmf_footage_cat') && !!(await page.$('#pmfShareWarn')));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
