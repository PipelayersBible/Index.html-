// Batch 27 CONSOLE updated copy of /home/claude/bughunt_oct19/fix_app/tests/t_cover_undo.js (cx_shim: the company job page shows all its sections, as before the tabs).
// Bughunt Oct 19 (7): undo "Already counted" (server fix 02_cover_undo.sql: pb_prod_crew_covered / pb_prod_crew_uncover).
//  A. company account, job page: "Marked already counted by <name> at <time>", Undo only where can_undo; confirm first
//     (Cancel sends nothing); Undo calls pb_prod_crew_uncover(id, reason, expect_uid) and says the result; the list reloads.
//  B. refusals said plainly: window over, not allowed, covered by the foreman's entry; no signal: nothing sent.
//  C. the server has no pb_prod_crew_covered yet (live today): nothing of it shows, no Undo, the job page works.
//  D. a foreman, My production: "Runs you marked already counted" with Undo; and with the function missing: nothing.
//  E. pb_prod_crew_covered there but pb_prod_crew_uncover missing: Undo says so plainly and is hidden afterwards.
const M = require('/home/claude/bughunt_oct19/fix_app/tests/crew_lib.js');
require('/home/claude/batch27/CONSOLE/tests/cx_shim.js')(M); // batch 27 CONSOLE: the job page's sections all shown, as this test expects
const iso = (d) => new Date(Date.now() + d).toISOString();
const ACC_MGR = { member: true, companyId: 'co1', manager: true, role: null, serverAt: '__ISO-60000__', at: '__NOW-60000__', seq: 0 };
const ROW = (id, extra) => Object.assign({ id, job_number: 'J-1', work_date: '2026-10-18', pipelayer: 'Pat Pipelayer', by_name: 'Fred Foreman', marked_at: iso(-3 * 3600000), note: null, automatic: false, items: [{ key: 'pipe', qty: 40, unit: 'LF' }], can_undo: true, why_not: null, undo_until: iso(13 * 86400000) }, extra || {});
const LIST = (rows, acct) => ({ company_account: acct !== false, server_at: iso(0), undo_days: 14, covered: rows });
const MISSING = { __error: 'Could not find the function public.pb_prod_crew_covered(p_job_number) in the schema cache' };
const MISSING_U = { __error: 'Could not find the function public.pb_prod_crew_uncover(p_entry_id, p_expect_uid, p_reason) in the schema cache' };
const JOBANS = (cov, unc) => ({ pb_prod_access: 'access_manager', pb_prod_company_dashboard: 'dash', pb_prod_company_links: 'links_dash', pb_prod_job_detail: 'job', pb_ticket_company_totals: 'tickets', pb_prod_crew_covered: cov, pb_prod_crew_uncover: unc });
const modal = (page) => page.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); return ov && getComputedStyle(ov).display !== 'none' ? { title: document.getElementById('pbModalTitle').textContent, msg: document.getElementById('pbModalMessage').textContent } : null; });
const clickModal = (page, label) => page.evaluate((l) => { const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => x.textContent.trim() === l); if (b) b.click(); return !!b; }, label);
const calls = (page, fn) => page.evaluate((f) => window.__rpcCalls.filter(x => x === f).length, fn);
async function jobPage(browser, cov, unc) {
  const ctx = await M.ctxWith(browser, { store: { 'acctA:prodAccess': ACC_MGR }, answers: JOBANS(cov, unc) });
  const page = await M.open(ctx); await page.waitForTimeout(2500); await M.dismiss(page);
  await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1200);
  await page.evaluate(() => pbOpenProdJob(0)); await page.waitForTimeout(1800);
  return { ctx, page };
}
const sec = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? e.innerText : ''; }, id);
(async () => {
  const browser = await M.chromium.launch();
  try {
    // ---- A ----
    { const { ctx, page } = await jobPage(browser, LIST([ROW('c1'), ROW('c2', { pipelayer: 'Sam Pipelayer', automatic: true, can_undo: false, why_not: 'pb:covered_by_entry' })]), { ok: true, id: 'c1', crew_status: 'pending', counted: false });
      const t = await sec(page, 'pjCoveredSec'); console.log('A', JSON.stringify(t));
      M.check('A: the job page lists "Marked already counted by Fred Foreman at <time>"', /Marked already counted by Fred Foreman at /.test(t) && /Pat Pipelayer/.test(t));
      M.check('A: Undo only on the row this account may undo', await page.evaluate(() => !!document.getElementById('pjUncover0') && !document.getElementById('pjUncover1')));
      M.check('A: the automatic one says how to undo it instead', /take the foreman.s own entry for that run off the totals/.test(t));
      await page.click('#pjUncover0'); await page.waitForTimeout(300);
      const m1 = await modal(page);
      M.check('A: Undo asks first (Undo Already Counted)', m1 && m1.title === 'Undo Already Counted' && /Pat Pipelayer/.test(m1.msg) && /recorded/.test(m1.msg), m1);
      await clickModal(page, 'Cancel'); await page.waitForTimeout(400);
      M.check('A: Cancel sends nothing', await calls(page, 'pb_prod_crew_uncover') === 0);
      await page.click('#pjUncover0'); await page.waitForTimeout(300);
      await clickModal(page, 'Undo'); await page.waitForTimeout(1200);
      const m2 = await modal(page);
      M.check('A: pb_prod_crew_uncover was called once', await calls(page, 'pb_prod_crew_uncover') === 1);
      M.check('A: the result is said ("waits for a foreman again")', m2 && /Undone/.test(m2.msg) && /waits for a foreman again/.test(m2.msg), m2);
      await M.dismiss(page); await page.waitForTimeout(300);
      M.check('A: the list is asked again after the undo', await calls(page, 'pb_prod_crew_covered') >= 2);
      M.check('A: no page errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
      await ctx.close(); }
    // ---- B ----
    for (const [code, re] of [['pb:undo_window_over', /more than 14 days/], ['pb:not_allowed', /Only the company account, or the foreman who marked it/], ['pb:covered_by_entry', /foreman.s own production/]]) {
      const { ctx, page } = await jobPage(browser, LIST([ROW('c1')]), { __error: code });
      await page.click('#pjUncover0'); await page.waitForTimeout(300); await clickModal(page, 'Undo'); await page.waitForTimeout(1000);
      const m = await modal(page); console.log('B', code, m && m.msg);
      M.check('B: ' + code + ' is said plainly, and that nothing changed', m && re.test(m.msg) && /Nothing was changed/.test(m.msg), m);
      await ctx.close();
    }
    { const { ctx, page } = await jobPage(browser, LIST([ROW('c1')]), { ok: true, id: 'c1', crew_status: 'pending', counted: false });
      await page.click('#pjUncover0'); await page.waitForTimeout(300); await ctx.setOffline(true); await clickModal(page, 'Undo'); await page.waitForTimeout(800);
      const m = await modal(page); console.log('B offline', m && m.msg);
      M.check('B: no signal: "No signal. Nothing was changed", nothing sent', m && /No signal/.test(m.msg) && /Nothing was changed/.test(m.msg) && await calls(page, 'pb_prod_crew_uncover') === 0);
      await ctx.close(); }
    // ---- C ----
    { const { ctx, page } = await jobPage(browser, MISSING, MISSING_U);
      const r = await page.evaluate(() => ({ sec: !!document.getElementById('pjCoveredSec'), undo: !!document.querySelector('[id^="pjUncover"]'), who: (document.getElementById('pjWhoSec') || {}).textContent || '' }));
      console.log('C', JSON.stringify(r));
      M.check('C: function missing on the server: no section, no Undo', !r.sec && !r.undo);
      M.check('C: the job page itself works as before', /Pat Pipelayer/.test(r.who));
      await page.evaluate(() => pbProdJobLoad()); await page.waitForTimeout(1200);
      M.check('C: and it isn’t asked again on every load once known missing', await calls(page, 'pb_prod_crew_covered') === 1);
      M.check('C: no page errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
      await ctx.close(); }
    // ---- D ----
    for (const missing of [false, true]) {
      const ctx = await M.ctxWith(browser, { answers: { pb_prod_access: 'access_foreman', pb_prod_crew_waiting: 'waiting', pb_prod_crew_links: 'links_foreman', pb_prod_edits_waiting: 'edits', pb_prod_crew_mine: 'mine_empty', pb_prod_crew_covered: missing ? MISSING : LIST([ROW('c9', { by_name: 'Me Foreman' })], false) } });
      const page = await M.open(ctx); await page.waitForTimeout(2500); await M.dismiss(page);
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(1800);
      const t = await sec(page, 'pmCoveredSec'), undo = await page.evaluate(() => !!document.getElementById('pmUncover0')), claim = await page.evaluate(() => !!document.getElementById('pmClaim0'));
      console.log('D', missing, JSON.stringify(t));
      if (!missing) M.check('D: a foreman sees "Runs you marked already counted" with Undo, below his crew lists', /Runs you marked already counted/.test(t) && /Marked already counted by Me Foreman at /.test(t) && undo && claim);
      else M.check('D: function missing: nothing of it shows; the crew lists are as before', !t && !undo && claim);
      M.check('D: no page errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
      await ctx.close();
    }
    // ---- E ----
    { const { ctx, page } = await jobPage(browser, LIST([ROW('c1')]), MISSING_U);
      await page.click('#pjUncover0'); await page.waitForTimeout(300); await clickModal(page, 'Undo'); await page.waitForTimeout(1000);
      const m = await modal(page); console.log('E', m && m.msg);
      M.check('E: uncover missing on the server: said plainly, nothing changed', m && /isn.t on the company server yet/.test(m.msg));
      await M.dismiss(page); await page.waitForTimeout(300);
      M.check('E: and Undo is hidden afterwards', await page.evaluate(() => !document.getElementById('pjUncover0')));
      await ctx.close(); }
  } finally { await browser.close(); }
})();
