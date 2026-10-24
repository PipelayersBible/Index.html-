// Batch 27 CONSOLE updated copy of /home/claude/test/hunt38/D/t_shots.js (cx_shim: the company job page shows all its sections, as before the tabs).
// Batch 11 D: screenshots (390 Normal, 320 Extra Large, 1280 desktop) of Company production, the job page,
// the plan editor and My production, with layout checks: no sideways scroll, no control under 44 px, no cut-off
// button text; at 1280 the dashboards use real columns and readable widths.
const T = require('/home/claude/test/hunt38/D/pd_lib.js'); const { M, check } = T;
require('/home/claude/batch27/CONSOLE/tests/cx_shim.js')(M); // batch 27 CONSOLE: the company job page shows all its sections, as this test expects
const OUT = '/home/claude/batch27/CONSOLE/shots/hunt38/'; // batch 27 copy: its own folder
require('fs').mkdirSync(OUT, { recursive: true });
const PLAN = { 'c1|24-101': { version: 1, job_number: '24-101', plan: { categories: [
  { key: 'demo', name: 'Demo', unit: 'LF', planned: 200 }, { key: 'excavation', name: 'Excavation', unit: 'LF', planned: 1000 }, { key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 800 },
  { key: 'backfill', name: 'Backfill', unit: 'LF', planned: 800 }, { key: 'restoration', name: 'Restoration', unit: 'SY' }, { key: 'structures', name: 'Structures', unit: 'EA', planned: 6 }], budget_hours: 400 } } };
(async () => {
  const browser = await M.chromium.launch();
  for (const [w, xl, tag] of [[390, false, '390'], [320, true, '320xl'], [1280, false, '1280']]) {
    const { ctx, page } = await T.setup(browser, { manager: true, width: w, height: w >= 1024 ? 900 : 860, xl, extra: { __psrv: T.seedServer({ plans: PLAN }) } });
    try {
      const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: OUT + name + '_' + tag + '.png', fullPage: true }); };
      const lay = async (name) => { const l = await T.layout(page); check(tag + ' ' + name + ': no sideways scroll, no control under 44 px, no cut-off button text', !l.hscroll && !l.small.length && !l.clipped.length); if (l.small.length || l.clipped.length || l.hscroll) console.log(JSON.stringify(l)); };
      await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1200);
      await lay('Company production'); await shot('dash');
      if (w >= 1024) {
        const g = await page.evaluate(() => { const a = document.getElementById('pdJob0').getBoundingClientRect(), b = document.getElementById('pdJob1').getBoundingClientRect(), app = document.getElementById('pbApp').getBoundingClientRect(); return { side: Math.abs(a.top - b.top) < 2 && b.left > a.right, app: app.width }; });
        check('1280: job cards in two columns; the app widens for the dashboard (not 560 px)', g.side && g.app > 1000);
      }
      await page.evaluate(() => { const i = [...document.querySelectorAll('#pdJobs .pbp-job')].findIndex(b => /Job 24-101/.test(b.textContent)); document.getElementById('pdJob' + i).click(); }); await page.waitForTimeout(1000);
      await lay('job page'); await shot('job');
      if (w >= 1024) {
        // batch 27 CONSOLE: the company job screen's two columns are the summary (left) and the tabs' panel (right)
        const g = await page.evaluate(() => { const h = document.getElementById('pjCxHero').getBoundingClientRect(), m = document.querySelector('#screen-prodJob .pbx-jobmain').getBoundingClientRect(); return { hw: Math.round(h.width), hr: Math.round(h.right), ml: Math.round(m.left), cols: h.width > 250 && m.left > h.right, tbl: document.querySelector('#pjTableSec table').getBoundingClientRect().width }; });
        check('1280: job page in two columns (summary | tabs) with a wide category table (' + JSON.stringify(g) + ')', g.cols && g.tbl > 500);
      } else check(tag + ': phone keeps one focused column', await page.evaluate(() => { const c = [...document.querySelectorAll('#pjBody .pbp-col')].map(x => x.getBoundingClientRect()); return c.length === 2 && c[1].top >= c[0].bottom - 1; }));
      await page.click('#pjEditBtn'); await page.waitForTimeout(300);
      await lay('plan editor'); await shot('plan');
      // keyboard: Tab from the first name reaches the next field
      await page.focus('#ppName0'); await page.keyboard.press('Tab');
      check(tag + ' keyboard: Tab moves through the editor fields in order', await page.evaluate(() => document.activeElement && /^pp(Planned|Unit)0$/.test(document.activeElement.id)));
      await page.click('#ppCancelBtn'); await page.waitForTimeout(200);
      // My production (this account's own phone entries: one synced run)
      await page.evaluate(() => { localStorage.__manager = '1'; });
      await T.runWithProduction(page, { job: '24-101', exc: '120', pipe: '100', by: 'Frank' }); await page.waitForTimeout(4500);
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(1200);
      await lay('My production'); await shot('mine');
      check(tag + ' no JS errors', page._errors.length === 0);
      if (page._errors.length) console.log(page._errors);
    } finally { await ctx.close(); }
  }
  // a focus ring on a job card (keyboard users)
  { const { ctx, page } = await T.setup(browser, { manager: true, width: 1280, height: 900, extra: { __psrv: T.seedServer({ plans: PLAN }) } });
    try {
      await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1200);
      await page.focus('#pdRefreshBtn'); await page.keyboard.press('Shift+Tab');
      const f = await page.evaluate(() => { const a = document.activeElement; return { id: a.id, ring: getComputedStyle(a).boxShadow }; });
      check('keyboard: Shift+Tab reaches a job card, which shows a focus ring', /^pdJob\d$/.test(f.id) && f.ring && f.ring !== 'none');
      await page.keyboard.press('Enter'); await page.waitForTimeout(800);
      check('keyboard: Enter opens the job', (await T.screen(page)) === 'screen-prodJob');
    } finally { await ctx.close(); }
  }
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
