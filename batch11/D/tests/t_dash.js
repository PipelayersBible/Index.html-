// Batch 11 D: Company production (company account only) and its job page with the quick plan editor.
// Zero setup (jobs appear from production alone), no plan = amounts and "Add planned quantities…", plan editor
// rename / add / remove (math renormalizes, reported work of a removed category stays visible), stale-plan
// refusal, unsaved-plan question, offline (last copy with its time), error and empty states, and a crew
// (non-manager) account can't open it by any route.
const T = require('./pd_lib.js'); const { M, check } = T;
(async () => {
  const browser = await M.chromium.launch();
  // ---------- crew account: no way in ----------
  { const { ctx, page } = await T.setup(browser, { extra: { __psrv: T.seedServer() } });
    try {
      await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(400);
      const r = await page.evaluate(() => ({ dash: getComputedStyle(archiveProdDashBtn).display, mine: getComputedStyle(archiveProdMineBtn).display }));
      check('crew: Company production row hidden; My production row shown', r.dash === 'none' && r.mine !== 'none');
      await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(500);
      const md = await T.modal(page);
      check('crew: opening Company production by any route is refused with a plain reason', md && /Only your company account/.test(md.msg) && (await T.screen(page)) !== 'screen-prodDashboard');
      await M.dismiss(page);
      check('crew: the server function was never asked', await page.evaluate(() => !window.__rpcLog.some(x => x.fn === 'pb_prod_company_dashboard')));
      check('no JS errors (crew)', page._errors.length === 0);
    } finally { await ctx.close(); }
  }
  // ---------- individual plan: contractor-plan feature ----------
  { const { ctx, page } = await T.setup(browser, { tier: 'individual', manager: true });
    try {
      await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(500);
      const md = await T.modal(page);
      check('individual plan: Company production needs the Contractor plan', md && /Contractor/.test(md.msg) && (await T.screen(page)) !== 'screen-prodDashboard');
      await M.dismiss(page);
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(400);
      check('individual plan: My production needs the Contractor plan too', (await T.screen(page)) !== 'screen-prodMine');
      await M.dismiss(page);
    } finally { await ctx.close(); }
  }
  // ---------- company account: empty ----------
  { const { ctx, page } = await T.setup(browser, { manager: true });
    try {
      await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(300);
      check('company account: the Company production row is shown', await page.evaluate(() => getComputedStyle(archiveProdDashBtn).display !== 'none'));
      await page.click('#archiveProdDashBtn'); await page.waitForTimeout(900);
      const e = await page.evaluate(() => ({ scr: document.querySelector('.pb-screen.active').id, tab: (document.querySelector('#pbTabBar .pb-tab[aria-current="page"]') || {}).dataset.tab, empty: (document.getElementById('pdEmpty') || {}).textContent || '' }));
      check('empty: says no production yet, and that a job appears on its own (zero setup)', e.scr === 'screen-prodDashboard' && e.tab === 'reports' && /No production yet/.test(e.empty) && /shows up here on its own/.test(e.empty));
    } finally { await ctx.close(); }
  }
  // ---------- company account with crews' production ----------
  const { ctx, page } = await T.setup(browser, { manager: true, extra: { __psrv: T.seedServer() } });
  try {
    await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1000);
    let d = await page.evaluate(() => ({ st: pdStatus.textContent, jobs: [...document.querySelectorAll('#pdJobs .pbp-job')].map(b => b.innerText.replace(/\s+/g, ' ')), sum: pdSummary.innerText.replace(/\s+/g, ' '), bars: document.querySelectorAll('#pdJobs .pbp-bar').length }));
    check('zero setup: every job crews reported on is listed, plus "No job number"', d.jobs.length === 3 && d.jobs.some(j => /Job 24-101/.test(j)) && d.jobs.some(j => /Job 24-202/.test(j)) && d.jobs.some(j => /No job number/.test(j)));
    const j1 = d.jobs.find(j => /Job 24-101/.test(j));
    check('no plan: amounts in their unit, "Add planned quantities to see % complete", no % at all', /Add planned quantities to see % complete/.test(j1) && /Excavation 420 LF/.test(j1) && /Pipe Installed 360 LF/.test(j1) && /Structures 2 EA/.test(j1) && /No % yet/.test(j1) && !/\d%/.test(j1) && d.bars === 0);
    check('today line and who reported today', /Today: Excavation 120 LF · Pipe Installed 100 LF/.test(j1) && /1 reported today/.test(j1));
    check('summary tiles: 3 jobs, 2 reported today', /Jobs 3/.test(d.sum) && /Reported today 2/.test(d.sum));
    check('status: Updated <time>', /^Updated /.test(d.st));
    // job page
    await page.evaluate(() => { const i = [...document.querySelectorAll('#pdJobs .pbp-job')].findIndex(b => /Job 24-101/.test(b.textContent)); document.getElementById('pdJob' + i).click(); }); await page.waitForTimeout(1000);
    let jp = await page.evaluate(() => ({ scr: document.querySelector('.pb-screen.active').id, head: pjHead.innerText, tbl: (document.querySelector('#pjTableSec table') || {}).innerText || '', who: pjWhoSec.innerText, tk: pjTicketsSec.innerText, rec: pjRecentSec.innerText, days: pjDaysSec.innerText, btn: pjEditBtn.textContent }));
    check('job page: header, per-category table with Done / Planned / % / Today / 7 days', jp.scr === 'screen-prodJob' && /Job 24-101/.test(jp.head) && /Elm St water main/.test(jp.head) && /Excavation\s+420 LF\s+Not planned/.test(jp.tbl) && /Today\s+7 days/.test(jp.tbl));
    check('job page: crew hours row (no budget yet)', /Crew hours\s+32 h\s+No budget/.test(jp.tbl));
    check('job page: who reported (name, email, entries) to the company account', /Frank Ortiz/.test(jp.who) && /u1@crew\.test/.test(jp.who) && /Wes Hall/.test(jp.who) && /Today/.test(jp.who));
    check('job page: field-ticket totals for the job (pb_ticket_company_totals)', /Tickets\s*7/.test(jp.tk) && /42\.5/.test(jp.tk) && await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_ticket_company_totals' && x.args.p_job_number === '24-101')));
    check('job page: latest entries and the last 14 days', /Frank Ortiz/.test(jp.rec) && /Excavation 120 LF/.test(jp.rec) && /Today/.test(jp.days));
    check('no plan yet: "Set Up Plan"', /Set Up Plan/.test(jp.btn));
    // ---- plan editor: defaults, rename, add, remove ----
    await page.click('#pjEditBtn'); await page.waitForTimeout(300);
    let names = await page.evaluate(() => [...document.querySelectorAll('#ppRows input[id^=ppName]')].map(i => i.value));
    check('plan editor starts with the six default categories', names.join('|') === 'Demo|Excavation|Pipe Installed|Backfill|Restoration|Structures');
    check('focus moves into the editor (keyboard)', await page.evaluate(() => document.activeElement && document.activeElement.id === 'ppName0'));
    // unsaved question
    await page.fill('#ppName1', 'Trenching');
    await page.evaluate(() => pbGoto('prodDashboard')); await page.waitForTimeout(300);
    let md = await T.modal(page);
    check('leaving with an unsaved plan asks first', md && /changes to this job.s plan are NOT saved/.test(md.msg));
    await T.click(page, '^Cancel$'); await page.waitForTimeout(200);
    check('…Cancel keeps the editor and what was typed', (await T.screen(page)) === 'screen-prodJob' && await page.evaluate(() => ppName1.value === 'Trenching'));
    await page.fill('#ppPlanned1', '1000');
    await page.fill('#ppPlanned2', '800'); await page.fill('#ppWeight2', '');
    // remove Demo (40 LF reported): asks, then removes
    await page.click('#ppRemove0'); await page.waitForTimeout(200);
    md = await T.modal(page);
    check('removing a category with reported work asks, and says the work stays on record', md && /Remove Demo/.test(md.msg) && /40 LF already reported stays on record/.test(md.msg));
    await T.click(page, '^Continue$'); await page.waitForTimeout(200);
    names = await page.evaluate(() => [...document.querySelectorAll('#ppRows input[id^=ppName]')].map(i => i.value));
    check('…Demo removed; typed values kept', names[0] === 'Trenching' && await page.evaluate(() => ppPlanned0.value === '1000' && ppPlanned1.value === '800'));
    await page.click('#ppAddBtn'); await page.waitForTimeout(200);
    const last = names.length;
    await page.fill('#ppName' + last, 'Hydrants'); await page.fill('#ppUnit' + last, 'EA'); await page.fill('#ppPlanned' + last, '4');
    await page.fill('#ppBudget', '400');
    // a bad number is refused before sending
    await page.fill('#ppPlanned3', 'abc'); await page.click('#ppSaveBtn'); await page.waitForTimeout(300);
    check('a bad number: "Not saved" with the reason, nothing sent', await page.evaluate(() => /Not saved/.test((document.getElementById('ppErr') || {}).textContent || '') && !window.__rpcLog.some(x => x.fn === 'pb_prod_plan_set')));
    await page.fill('#ppPlanned3', '');
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1200);
    const ps = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_plan_set').map(x => x.args));
    const cats = ps[0] && ps[0].p_plan.categories;
    check('plan saved: rename keeps the key, removed Demo gone, new Hydrants key, version 0 -> 1', ps.length === 1 && ps[0].p_expect_version === 0 && ps[0].p_expect_uid === 'acctA' && cats.map(c => c.key).join(',') === 'excavation,pipe,backfill,restoration,structures,hydrants' && cats[0].name === 'Trenching' && cats[0].planned === 1000 && cats[5].unit === 'EA' && ps[0].p_plan.budget_hours === 400);
    jp = await page.evaluate(() => ({ prog: pjProgress.innerText.replace(/\s+/g, ' '), segs: [...document.querySelectorAll('#pjProgress .pbp-seg')].map(s => s.style.flex), tbl: (document.querySelector('#pjTableSec table') || {}).innerText || '', btn: pjEditBtn.textContent }));
    // Trenching 420/1000 = 42%, Pipe 360/800 = 45%, Hydrants 0/4 = 0% -> equal: (0.42+0.45+0)/3 = 29%
    check('math: equal over the 3 planned categories -> 29% overall; 42% / 45% / 0%', /29% complete/.test(jp.prog) && /Trenching 42% · 420 \/ 1,000 LF/.test(jp.prog) && /Pipe Installed 45% · 360 \/ 800 LF/.test(jp.prog) && /Hydrants 0% · 0 \/ 4 EA/.test(jp.prog) && jp.segs.length === 3);
    check('unplanned categories show amounts and are left out; removed Demo\'s 40 LF still shown as not in plan', /Backfill 240 LF/.test(jp.prog) && /Demo \(not in this job.s plan\) 40 LF/.test(jp.prog) && /Demo \(not in plan\)/.test(jp.tbl));
    check('budget hours: 32 of 400 h used vs 29% done -> On pace', /On pace/.test(jp.prog) && /32 of 400 budget hours used \(8%\)/.test(jp.prog));
    check('the button now says Edit Plan', /Edit Plan/.test(jp.btn));
    // back to the dashboard: the bar with segments and the overall %
    await page.click('#pjBack'); await page.waitForTimeout(900);
    d = await page.evaluate(() => { const b = [...document.querySelectorAll('#pdJobs .pbp-job')].find(x => /Job 24-101/.test(x.textContent)); return { t: b.innerText.replace(/\s+/g, ' '), segs: b.querySelectorAll('.pbp-seg').length, aria: b.querySelector('.pbp-bar').getAttribute('aria-label') }; });
    check('dashboard: one bar for the job split into 3 planned segments, overall 29% obvious', d.segs === 3 && /29% complete/.test(d.t) && /Overall 29%: Trenching 42%, Pipe Installed 45%, Hydrants 0%/.test(d.aria));
    // weights: Pipe weight 3 only -> not all weighted -> still equal; all weighted -> weighted
    await page.evaluate(() => { const i = [...document.querySelectorAll('#pdJobs .pbp-job')].findIndex(b => /Job 24-101/.test(b.textContent)); document.getElementById('pdJob' + i).click(); }); await page.waitForTimeout(900);
    await page.click('#pjEditBtn'); await page.waitForTimeout(200);
    await page.fill('#ppWeight0', '1'); await page.fill('#ppWeight1', '3'); await page.fill('#ppWeight5', '1');
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1000);
    jp = await page.evaluate(() => pjProgress.innerText.replace(/\s+/g, ' '));
    // (0.42*1 + 0.45*3 + 0*1)/5 = 0.354 -> 35%
    check('weights on every planned category: weighted average (35%), and it says so', /35% complete/.test(jp) && /weighted by your weights/.test(jp));
    // stale editor: someone else saved meanwhile
    await page.click('#pjEditBtn'); await page.waitForTimeout(200);
    await page.evaluate(() => { const s = JSON.parse(localStorage.__psrv); s.plans['c1|24-101'].version = 9; localStorage.__psrv = JSON.stringify(s); });
    await page.fill('#ppName0', 'Dig'); await page.click('#ppSaveBtn'); await page.waitForTimeout(800);
    check('someone else saved meanwhile: "Not saved", changes kept, nothing overwritten', await page.evaluate(() => /Someone else saved this job.s plan meanwhile/.test(ppErr.textContent) && ppName0.value === 'Dig' && JSON.parse(localStorage.__psrv).plans['c1|24-101'].plan.categories[0].name === 'Trenching'));
    await page.click('#ppCancelBtn'); await page.waitForTimeout(200);
    // ---- offline: the last copy with its time; error state ----
    await page.evaluate(() => pbGoto('prodDashboard')); await page.waitForTimeout(800);
    await page.evaluate(() => { localStorage.__rpcMode = 'offline'; }); await page.reload(); await page.waitForTimeout(2200); await M.dismiss(page);
    await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1200);
    d = await page.evaluate(() => ({ st: pdStatus.textContent, n: document.querySelectorAll('#pdJobs .pbp-job').length, t: pdJobs.innerText }));
    check('offline: shows the last copy with its time, says No signal', /No signal\. Showing the copy from /.test(d.st) && d.n === 3 && /Job 24-101/.test(d.t));
    await page.evaluate(() => { const i = [...document.querySelectorAll('#pdJobs .pbp-job')].findIndex(b => /Job 24-101/.test(b.textContent)); document.getElementById('pdJob' + i).click(); }); await page.waitForTimeout(1000);
    check('offline job page: the last copy of the job with its time', await page.evaluate(() => /No signal\. Showing the copy from /.test(pjStatus.textContent) && /Frank Ortiz/.test(pjWhoSec.innerText)));
    await page.evaluate(() => { localStorage.__rpcMode = 'boom'; localStorage.removeItem('acctA:prodCache'); }); await page.reload(); await page.waitForTimeout(2200); await M.dismiss(page);
    await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1200);
    d = await page.evaluate(() => ({ st: pdStatus.textContent, n: document.querySelectorAll('#pdJobs .pbp-job').length }));
    check('error, no copy: "Couldn\'t load. Tap Refresh to try again." and no made-up jobs', /Couldn.t load\. Tap Refresh to try again\./.test(d.st) && d.n === 0);
    await page.evaluate(() => { localStorage.__rpcMode = 'ok'; }); await page.click('#pdRefreshBtn'); await page.waitForTimeout(1000);
    check('Refresh with signal: loads', await page.evaluate(() => document.querySelectorAll('#pdJobs .pbp-job').length === 3 && /^Updated /.test(pdStatus.textContent)));
    // ---- account switch: nothing of the company view stays ----
    await page.evaluate(() => { localStorage.__manager = '0'; });
    await M.loginAs(page, 'b@x.com'); await page.waitForTimeout(1200);
    check('another account signs in: off the company screen, its contents cleared', await page.evaluate(() => document.querySelector('.pb-screen.active').id !== 'screen-prodDashboard' && document.querySelectorAll('#pdJobs .pbp-job').length === 0));
    check('no JS errors', page._errors.length === 0);
    if (page._errors.length) console.log(page._errors);
  } finally { await ctx.close(); }
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
