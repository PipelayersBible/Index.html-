// Batch 27 CONSOLE updated copy of /home/claude/batch11/D/tests/t_s4.js (cx_shim: the company job page shows all its sections, as before the tabs).
// Batch 11 D, review 1: S4 (work added by hand, every segment labelled or a compact row, editor marks categories no
// run field feeds), N4 (weights ignored note), S6 (a manager takes an entry off the totals from the job page),
// S5 (dashboard copies capped at about 300 KB per account).
const T = require('/home/claude/batch11/D/tests/pd_lib.js'); const { M, check } = T;
require('/home/claude/batch27/CONSOLE/tests/cx_shim.js')(M); // batch 27 CONSOLE: the job page's sections all shown, as this test expects
const PLAN = { 'c1|24-101': { version: 1, job_number: '24-101', plan: { categories: [
  { key: 'demo', name: 'Demo', unit: 'LF', planned: 200 }, { key: 'excavation', name: 'Excavation', unit: 'LF', planned: 1000 }, { key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 800 },
  { key: 'backfill', name: 'Backfill', unit: 'LF', planned: 800 }, { key: 'restoration', name: 'Restoration', unit: 'LF', planned: 900 }, { key: 'structures', name: 'Structures', unit: 'EA', planned: 6 }] } } };
const openJob = async (page) => { await page.evaluate(() => { const i = [...document.querySelectorAll('#pdJobs .pbp-job')].findIndex(b => /Job 24-101/.test(b.textContent)); document.getElementById('pdJob' + i).click(); }); await page.waitForTimeout(1000); };
(async () => {
  const browser = await M.chromium.launch();
  for (const [w, xl] of [[390, false], [320, true], [1280, false]]) {
    const { ctx, page } = await T.setup(browser, { manager: true, width: w, xl, extra: { __psrv: T.seedServer({ plans: PLAN }) } });
    try {
      await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1200);
      // batch 27 CONSOLE: the company account's Production details draw the batch 27 bar (variant B) and say every % in words
      const b = await page.evaluate(() => {
        const card = [...document.querySelectorAll('#pdJobs .pbp-job')].find(x => /Job 24-101/.test(x.textContent)), bar = card.querySelector('.pbx-bar.vB');
        const legs = [...card.querySelectorAll('.pbp-legend .pbp-leg')].map(l => l.innerText.replace(/\s+/g, ' '));
        const big = parseFloat(getComputedStyle(card.querySelector('.pbp-overall .pb-stat-v')).fontSize), small = Math.max(...[...card.querySelectorAll('.pbp-legend .pbp-leg')].map(l => parseFloat(getComputedStyle(l).fontSize)));
        return { n: bar ? bar.querySelectorAll('.pbx-seg').length : 0, legs, big, small, hs: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      check(w + (xl ? ' XL' : '') + ': six segments; every category says its % or Done in words (' + JSON.stringify(b.legs) + ')', b.n === 6 && b.legs.length === 6 && b.legs.every(t => /\d+%|Done/.test(t)));
      check(w + (xl ? ' XL' : '') + ': the overall % stays the largest number; no sideways scroll', b.big > b.small * 1.5 && !b.hs);
    } finally { await ctx.close(); }
  }
  const { ctx, page } = await T.setup(browser, { manager: true, extra: { __psrv: T.seedServer({ plans: PLAN }) } });
  try {
    await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1200);
    await openJob(page);
    // the plan editor marks what crews' runs fill in, and what is filled in by hand
    await page.click('#pjEditBtn'); await page.waitForTimeout(300);
    const marks = await page.evaluate(() => [...document.querySelectorAll('#ppRows .pbp-prow')].map(r => r.querySelector('input[id^=ppName]').value + ': ' + r.querySelector('.pbp-rowhas').textContent));
    check('editor (batch 12 D2: Demo is on the run now, as batch 12\'s t_s4 says): Demo and Excavation both "Filled in from crews\' runs"', /^Demo: .*Filled in from crews. runs/.test(marks[0]) && /^Excavation: .*Filled in from crews. runs/.test(marks[1]));
    check('N4: no weights -> no note', await page.evaluate(() => ppWeightNote.hidden));
    await page.fill('#ppWeight1', '2'); await page.waitForTimeout(150);
    let note = await page.evaluate(() => ({ hidden: ppWeightNote.hidden, t: ppWeightNote.textContent }));
    check('N4: a weight on only some planned categories -> "Weights are ignored for now" (1 of 6)', !note.hidden && /Weights are ignored for now/.test(note.t) && /1 of 6/.test(note.t));
    for (const i of [0, 2, 3, 4, 5]) await page.fill('#ppWeight' + i, '1');
    await page.waitForTimeout(150);
    check('N4: every planned category weighted -> note gone', await page.evaluate(() => ppWeightNote.hidden));
    await page.click('#ppCancelBtn'); await page.waitForTimeout(200);
    await page.evaluate(() => { const m = document.getElementById('pbModalOverlay'); if (getComputedStyle(m).display !== 'none') { const b = [...document.querySelectorAll('#pbModalButtons button')].pop(); b.click(); } });
    // add Demo by hand
    let jp = await page.evaluate(() => ({ sec: !!document.getElementById('pjManualSec'), first: pmanCat.value, unit: pmanUnit.value, date: pmanDate.value }));
    check('job page: "Add work done by hand", Demo first, its unit and today filled in', jp.sec && jp.first === 'demo' && jp.unit === 'LF' && jp.date === await page.evaluate(() => window.__pdDay(0)));
    await page.click('#pmanAddBtn'); await page.waitForTimeout(300);
    check('nothing typed: "Not added" with the reason, nothing sent', await page.evaluate(() => /Not added/.test((document.getElementById('pmanMsg') || {}).textContent || '') && !window.__rpcLog.some(x => x.fn === 'pb_prod_manual_add')));
    await page.fill('#pmanQty', '120'); await page.fill('#pmanNote', 'Saw-cut and haul'); await page.click('#pmanAddBtn'); await page.waitForTimeout(1500);
    const ma = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_manual_add').map(x => x.args));
    check('Add sends one manual entry: demo 120 LF, today, attributed (expect uid), a manual: id', ma.length === 1 && ma[0].p_category_key === 'demo' && ma[0].p_qty === 120 && ma[0].p_unit === 'LF' && /^manual:[A-Za-z0-9_-]{6,80}$/.test(ma[0].p_client_entry_id) && ma[0].p_expect_uid === 'acctA' && ma[0].p_job_number === '24-101');
    jp = await page.evaluate(() => ({ msg: (document.getElementById('pmanMsg') || {}).textContent || '', prog: pjProgress.innerText.replace(/\s+/g, ' '), rec: pjRecentSec.innerText.replace(/\s+/g, ' ') }));
    check('…the job shows it: Demo 160 / 200 LF (80%), "Added by hand" in the latest entries with Undo', /Added: Demo 120 LF/.test(jp.msg) && /Demo 80% · 160 \/ 200 LF/.test(jp.prog) && /Added by hand/.test(jp.rec) && /Saw-cut and haul/.test(jp.rec) && /Undo/.test(jp.rec));
    // Undo = a voiding version
    await page.evaluate(() => { const b = [...document.querySelectorAll('#pjRecentSec button')].find(x => x.textContent.trim() === 'Undo'); b.click(); }); await page.waitForTimeout(200);
    let md = await T.modal(page);
    check('Undo asks first and says the history keeps it', md && /off the company totals/.test(md.msg) && /stays in the history/.test(md.msg));
    await T.click(page, '^Undo It$'); await page.waitForTimeout(1500);
    jp = await page.evaluate(() => ({ prog: pjProgress.innerText.replace(/\s+/g, ' '), rec: pjRecentSec.innerText.replace(/\s+/g, ' ') }));
    check('…undone: Demo back to 40 / 200 LF, the entry shows "Taken off totals" (not removed)', /Demo 20% · 40 \/ 200 LF/.test(jp.prog) && /Taken off totals/.test(jp.rec) && await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_void')));
    // S6: a manager takes a crew entry off the totals
    await page.evaluate(() => { const b = [...document.querySelectorAll('#pjRecentSec button')].find(x => x.textContent.trim() === 'Take Off Totals'); b.click(); }); await page.waitForTimeout(200);
    md = await T.modal(page);
    check('manager: "Take Off Totals" on a crew entry asks first, naming it', md && /Take .* off the company totals\?/.test(md.msg));
    await T.click(page, '^Take It Off$'); await page.waitForTimeout(1500);
    check('…it is off the totals and marked', await page.evaluate(() => (pjRecentSec.innerText.match(/Taken off totals/g) || []).length === 2));
    // S5: the copies kept for offline stay under ~300 KB; a copy bigger than that is never kept
    await page.evaluate(() => pbGoto('prodDashboard')); await page.waitForTimeout(500);
    const c1 = await page.evaluate(() => { const r = localStorage.getItem('acctA:prodCache'); const o = JSON.parse(r); return { n: r.length, keys: Object.keys(o) }; });
    check('S5: one cache store per account, under 300 KB, with the dashboard and the job', c1.n < 300000 && c1.keys.includes('dash') && c1.keys.includes('job:24-101'));
    await page.evaluate(() => { localStorage.__bigJobs = '1'; }); await page.click('#pdRefreshBtn'); await page.waitForTimeout(2000);
    const c2 = await page.evaluate(() => { const r = localStorage.getItem('acctA:prodCache'); const o = JSON.parse(r); return { n: r.length, keys: Object.keys(o), dashJobs: o.dash ? o.dash.data.jobs.length : -1 }; });
    check('S5: a 600-job dashboard (~400 KB) is shown but not kept; the store stays under 300 KB', c2.n < 300000 && await page.evaluate(() => document.querySelectorAll('#pdJobs .pbp-job').length === 600) && c2.dashJobs !== 600);
    check('no JS errors', page._errors.length === 0);
    if (page._errors.length) console.log(page._errors);
  } finally { await ctx.close(); }
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
