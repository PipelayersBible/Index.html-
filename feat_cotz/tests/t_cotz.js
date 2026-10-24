// r15.14 feat_itemmat (owner, Oct 22): material rows under each overview item, hide/show, material + item alerts, "Use the pipe length" box.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_cotz/';
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
  if (fn === 'pb_company_settings_get') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); const S = JSON.parse(localStorage.getItem('__cosettings') || '{"tz":"America/Chicago","digest_time":"06:00","owner_copies":true,"tz_set":false}'); return { data: Object.assign({ ok: true, company_id: 'c1', is_owner: localStorage.getItem('__notOwner') !== '1', server_at: new Date().toISOString() }, S), error: null }; }
  if (fn === 'pb_pm_settings_set') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); const S = JSON.parse(localStorage.getItem('__cosettings') || '{"tz":"America/Chicago","digest_time":"06:00","owner_copies":true,"tz_set":false}'); if (args.p_tz) S.tz = args.p_tz; if (args.p_digest_time) S.digest_time = args.p_digest_time; if (args.p_owner_copies !== null && args.p_owner_copies !== undefined) S.owner_copies = args.p_owner_copies; S.tz_set = true; localStorage.setItem('__cosettings', JSON.stringify(S)); return { data: { ok: true, tz: S.tz, digest_time: S.digest_time + ':00', owner_copies: S.owner_copies }, error: null }; }
  if (fn === 'pb_mat_tickets') return { data: { lines: [] }, error: null };
  if (fn === 'pb_mat_job_settings') return { data: { settings: localStorage.getItem('__noTrench') ? null : { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, pipe_od_in: 8.625, version: 1 } }, error: null };
  return o(fn, args); }; };
(async () => {
  const browser = await M.chromium.launch({ args: [] });
  const errs = [];
  try {
    // the owner's phone is on Pacific time (the test browser's zone)
    const ctx0 = await browser.newContext({ timezoneId: 'America/Los_Angeles', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx0.close();
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await page.reload(); await page.waitForTimeout(3500);
    page.on('pageerror', e => errs.push(String(e)));
    const set = async () => page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_pm_settings_set').pop() || {}).args);
    const phone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const s = await set();
    check('first load, nothing saved: the phone sets the company time zone (' + phone + ') with nothing else touched', s && s.p_tz === phone && s.p_digest_time === null && s.p_owner_copies === null && s.p_expect_uid === 'acctA');
    await page.evaluate(() => pbGoto('settings')); await page.waitForTimeout(800);
    const row = await txt(page, '#settingsCoTimeRow');
    check('Settings › Company: the Time zone row shows it and the email time (' + row + ')', /Time zone/.test(row || '') && /morning email 6:00 AM/.test(row || '') && /Edit/.test(row || ''));
    check('says it came from the phone', /Set from this phone/.test(await txt(page, '#settingsCoTime') || ''));
    await page.screenshot({ path: SHOTS + 'cotz_row.png', fullPage: false });
    await page.click('#settingsCoTimeRow'); await page.waitForTimeout(300);
    check('Edit: time zone, email time, copies; focus on the zone', await page.evaluate(() => document.activeElement && document.activeElement.id === 'settingsCoTz') && (await val(page, '#settingsCoTz')) === phone && (await val(page, '#settingsCoTime2')) === '06:00' && await page.isChecked('#settingsCoCopies'));
    await page.selectOption('#settingsCoTz', 'America/Denver'); await page.selectOption('#settingsCoTime2', '05:30'); await page.uncheck('#settingsCoCopies');
    await page.screenshot({ path: SHOTS + 'cotz_edit.png', fullPage: false });
    await page.evaluate(() => window.__rpcLog.length = 0);
    await page.click('#settingsCoTimeSave'); await page.waitForTimeout(800);
    const a = await set();
    check('Save: Mountain, 5:30, copies off', a && a.p_tz === 'America/Denver' && a.p_digest_time === '05:30' && a.p_owner_copies === false);
    check('row shows the new values, Saved', /Mountain time · morning email 5:30 AM/.test(await txt(page, '#settingsCoTimeRow') || '') && /Saved/.test(await txt(page, '#settingsCoTime') || ''));
    // reload: saved -> the phone does not set it again
    await page.evaluate(() => window.__rpcLog.length = 0); await page.reload(); await page.waitForTimeout(3500);
    check('next load: nothing set again', !(await set()));
    // the Crew screen no longer repeats it
    await page.evaluate(() => window.pbOpenCrewMembers()); await page.waitForTimeout(1500);
    check('Crew screen: no Job alerts editor (it lives in Settings)', await page.evaluate(() => { const s = document.getElementById('crAlerts'); return !s || s.hidden; }));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
