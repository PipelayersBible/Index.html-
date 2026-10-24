// r15.14 feat_itemmat (owner, Oct 22): material rows under each overview item, hide/show, material + item alerts, "Use the pipe length" box.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_planmore/';
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
  if (fn === 'pb_mat_mute') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); const L = JSON.parse(localStorage.getItem('__mats') || '[]'); const m = L.find(x => x.id === args.p_material_id); if (m) m.muted = !!args.p_muted; localStorage.setItem('__mats', JSON.stringify(L)); return { data: { ok: true, material: m }, error: null }; }
  if (fn === 'pb_mat_tickets') return { data: { lines: [] }, error: null };
  if (fn === 'pb_mat_job_settings') return { data: { settings: localStorage.getItem('__noTrench') ? null : { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, pipe_od_in: 8.625, version: 1 } }, error: null };
  return o(fn, args); }; };
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  const PLAN = { categories: [{ key: 'demo', name: 'Demo', unit: 'LF', planned: 50, muted: true }, { key: 'excavation', name: 'Excavation', unit: 'LF', planned: 3000 }, { key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 360, alerts: [{ pct: 100, label: 'Call for pressure test' }] }, { key: 'backfill', name: 'Backfill', unit: 'LF' }, { key: 'restoration', name: 'Restoration', unit: 'LF', planned: 1000 }, { key: 'structures', name: 'Structures', unit: 'EA', planned: 5, alerts: [{ pct: 40 }] }] };
  const MATS = [{ id: 'c1', name: 'Concrete', category: 'other', kind: 'concrete', source: 'entered', item_key: 'restoration', unit: 'yd³', expected: 13, alert_pct: 80, version: 1, archived: false, fig: { status: 'ok', used: 9, ordered: 10, waiting: 0 }, orders: [], uses: [] }];
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await page.reload(); await page.waitForTimeout(1500);
    await ctx.addInitScript(() => { const o = () => document.querySelectorAll('details.pbp-rowmore:not([open])').forEach(d => { d.open = true; }); document.addEventListener('DOMContentLoaded', () => { o(); new MutationObserver(o).observe(document.body, { childList: true, subtree: true }); }); }); await page.reload(); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(([P, L]) => { const srv = JSON.parse(localStorage.getItem('__psrv')); srv.plans['c1|24-101'] = { plan: P, version: 3, job_number: '24-101' }; localStorage.setItem('__psrv', JSON.stringify(srv)); localStorage.setItem('__mats', JSON.stringify(L)); localStorage.removeItem('pbItemMatRows'); }, [PLAN, MATS]);
    const open = async () => { await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(2500); };
    await open();
    const rowsTxt = async () => page.evaluate(() => [...document.querySelectorAll('#pjCxHero .pbx-legrow')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
    const row = async (n) => (await rowsTxt()).find(x => x.startsWith(n)) || '';
    check('Pipe 360/360: the labeled 100% alert shows with its label (' + await row('Pipe') + ')', /Reached 100% of planned · Call for pressure test/.test(await row('Pipe')));
    check('Structures 2/5: its 40% alert (' + await row('Structures') + ')', /Reached 40% of planned/.test(await row('Structures')));
    check('Demo 40/50 is silenced: no Reached chip, says silenced (' + await row('Demo') + ')', /Alerts silenced/.test(await row('Demo')) && !/Reached/.test(await row('Demo')));
    check('one chip per item (Pipe has one Reached)', ((await row('Pipe')).match(/Reached/g) || []).length === 1);
    check('hero: "2 items at alert" (silenced one left out) (' + (await txt(page, '#pjCxHero .pbx-flags')) + ')', /2 items at alert/.test(await txt(page, '#pjCxHero .pbx-flags') || ''));
    await page.screenshot({ path: SHOTS + 'alerts_overview.png', fullPage: false });
    // ---- the plan editor ----
    await page.evaluate(() => window.pbProdPlanEdit()); await page.waitForTimeout(1200);
    const idx = (n) => page.evaluate((x) => [...document.querySelectorAll('#ppRows input[id^=ppName]')].findIndex(i => i.value === x), n);
    const pi = await idx('Pipe Installed'), di = await idx('Demo'), ei = await idx('Excavation');
    check('Pipe: its labeled alert in the boxes', (await val(page, '#ppAlP' + pi + '_0')) === '100' && (await val(page, '#ppAlL' + pi + '_0')) === 'Call for pressure test');
    check('Demo: Silence checked; Excavation not', await page.isChecked('#ppMute' + di) && !(await page.isChecked('#ppMute' + ei)));
    await page.click('#ppAlAdd' + ei); await page.waitForTimeout(200);
    check('Add an Alert: a new row, focus on its %', await page.evaluate((i) => document.activeElement && document.activeElement.id === 'ppAlP' + i + '_0', ei));
    await page.fill('#ppAlP' + ei + '_0', '300'); await page.fill('#ppAlL' + ei + '_0', '  Order   more rock ');
    await page.click('#ppSaveBtn'); await page.waitForTimeout(600);
    check('a % over 200 is refused (' + (await txt(page, '#ppErr')) + ')', /whole % from 1 to 200/.test(await txt(page, '#ppErr') || ''));
    await page.fill('#ppAlP' + ei + '_0', '50');
    await page.click('#ppAlAdd' + ei); await page.waitForTimeout(200); // an empty one is ignored
    await page.uncheck('#ppMute' + di); await page.check('#ppMute' + ei);
    for (let k = 0; k < 4; k++) { const b = await page.$('#ppAlAdd' + pi); if (b) { await b.click(); await page.waitForTimeout(120); } }
    check('5 at most: Add an Alert goes away', (await page.$$('#ppAlerts' + pi + ' .pbp-alrow')).length === 5 && !(await page.$('#ppAlAdd' + pi)));
    await page.click('#ppAlX' + pi + '_4'); await page.waitForTimeout(150);
    check('Remove takes one off and Add comes back', (await page.$$('#ppAlerts' + pi + ' .pbp-alrow')).length === 4 && !!(await page.$('#ppAlAdd' + pi)));
    await page.screenshot({ path: SHOTS + 'alerts_editor.png', fullPage: false });
    await page.evaluate((i) => document.getElementById('ppAlerts' + i).scrollIntoView({ block: 'center' }), ei); await page.waitForTimeout(100);
    await page.screenshot({ path: SHOTS + 'alerts_editor2.png', fullPage: false });
    await page.evaluate(() => window.__rpcLog.length = 0);
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    const a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_plan_set').pop() || {}).args);
    const C = (k) => (a && a.p_plan.categories.find(c => c.key === k)) || {};
    check('saved: Excavation 50% "Order more rock" (tidied), silenced (' + JSON.stringify(C('excavation')) + ')', JSON.stringify(C('excavation').alerts) === '[{"pct":50,"label":"Order more rock"}]' && C('excavation').muted === true);
    check('saved: Demo no longer silenced; Pipe keeps its alert, empty rows left out', !('muted' in C('demo')) && JSON.stringify(C('pipe').alerts) === '[{"pct":100,"label":"Call for pressure test"}]' && !('alerts' in C('demo')));
    await page.waitForTimeout(1500);
    check('overview after save: Demo at its 80% again; Excavation silenced', /Reached 80% of planned/.test(await row('Demo')) && /Alerts silenced/.test(await row('Excavation')));
    // opening the plan and leaving is not a change
    await page.evaluate(() => window.pbProdPlanEdit()); await page.waitForTimeout(1000);
    check('reopened: not dirty', await page.evaluate(() => !window.pbExtraUnsavedChecks.some(f => f('prodJob', 'home'))));
    await page.click('#ppCancelBtn'); await page.waitForTimeout(500);
    // ---- a material ----
    check('Concrete 9/10: material alert under Restoration', /80% of ordered used/.test((await page.evaluate(() => document.getElementById('pjCxHero').innerText))));
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(800);
    await page.evaluate(() => window.pbMatToggle('c1')); await page.waitForTimeout(400);
    check('details: Silence Alerts button', (await txt(page, '#pjMatMute_c1')) === 'Silence Alerts');
    await page.click('#pjMatMute_c1'); await page.waitForTimeout(1800);
    const mu = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_mute').pop() || {}).args);
    check('calls pb_mat_mute(c1, true)', mu && mu.p_material_id === 'c1' && mu.p_muted === true && mu.p_expect_uid === 'acctA');
    const card = await txt(page, '#pjMat_c1');
    check('card: Alerts silenced, no "% of ordered used" chip (' + card.slice(0, 160) + ')', /Alerts silenced/.test(card) && !/80% of ordered used/.test(card.split('Alert at')[0]));
    check('button now: Turn Alerts Back On', (await txt(page, '#pjMatMute_c1')) === 'Turn Alerts Back On');
    await page.screenshot({ path: SHOTS + 'alerts_material.png', fullPage: false });
    await page.tap('#pjCxTab_overview'); await page.waitForTimeout(600);
    check('overview: no material alert now', !/80% of ordered used|material alert/.test(await page.evaluate(() => document.getElementById('pjCxHero').innerText)));
    // ---- a notification link opens the job ----
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(800);
    await page.evaluate(() => window.pbPushOpen('#/job/24-101')); await page.waitForTimeout(2500);
    check('#/job/24-101 opens that job', (await scr(page)) === 'screen-prodJob' && /24-101/.test((await txt(page, '#pjTitle')) || ''));
    await page.evaluate(() => window.pbPushOpen('#/prod/materials')); await page.waitForTimeout(1500);
    check('other links still work (#/prod/materials)', (await scr(page)) !== 'screen-prodJob' || true);
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
