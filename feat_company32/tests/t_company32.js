// feat_company32 (r15.32) regression: flipped from the overnight company probes (/home/claude/night/company/p0*.js).
//  C3 waiting count agrees everywhere (Home 2 = job hero 2 = Waiting badge 2 = summary 2)
//  C4 material chip prints the real share, never the alert threshold
//  C1 Save Plan carries the required inspections (and the Overview row keeps them)
//  C5 "Work without a run" panel only on the Production tab
//  C6 foreman tile is "Runs need production"; C7/C9 manager gets one pulse; company Home hides the Current job card
const C = require('./clib.js'); const { M, check } = C;
(async () => {
  const browser = await M.chromium.launch();
  try {
    { const { ctx, page } = await C.setup(browser, { who: 'company' });
      await page.evaluate(() => pbGotoTab('home')); await C.waitFor(page, () => document.querySelectorAll('#homeCxJobs .pbx-job').length > 0, 10000); await page.waitForTimeout(1500);
      check('C9 company Home: no field "Current job" card', !(await C.shown(page, 'homeCurrentJob')) && !(await C.shown(page, 'homeFmPulse')));
      const flags = await C.txt(page, '#homeCxJobs .pbx-job[data-job="24-101"] .pbx-flags');
      check('Home card: 2 waiting on foremen', /2 waiting on foremen/.test(flags || ''), flags);
      await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(3000);
      await page.evaluate(() => pbCxTab('waiting')); await page.waitForTimeout(400);
      const hero = await page.evaluate(() => [...document.querySelectorAll('#pjCxHero .pbx-flag')].map(f => f.textContent.trim()));
      const badge = await C.txt(page, '#pjCxTab_waiting'), sum = await C.txt(page, '#pjCxWaitSum');
      check('C3 job page agrees with Home: 2 waiting (hero, badge, summary)', hero.some(f => /2 waiting on foremen/.test(f)) && /Waiting 2/.test(badge || '') && /2 waiting:/.test(sum || ''), JSON.stringify([hero, badge, sum]));
      check('C3 nothing says 3 waiting', !hero.some(f => /3 waiting/.test(f)) && !/3/.test(badge || '') && !/3 waiting/.test(sum || ''));
      check('C11 waiting note names the pipelayer', /Nudge the pipelayer or the assigned foreman/.test((await C.txt(page, '#pjCxWaitNote')) || ''));
      // C5 panel per tab
      const on = {};
      for (const t of ['overview', 'waiting', 'materials', 'equipment', 'production']) { await page.evaluate((tt) => pbCxTab(tt), t); await page.waitForTimeout(400); on[t] = await C.shown(page, 'pjNoRunWrap'); }
      check('C5 "Work without a run" only on Production', !on.overview && !on.waiting && !on.materials && !on.equipment && on.production, JSON.stringify(on));
      // C10 equipment note
      await page.evaluate(() => pbCxTab('equipment')); await page.waitForTimeout(400);
      const eq = await C.screenText(page);
      check('C10 equipment note names where the hours come from', /hours foremen enter for their pipelayers’ runs \(My crew now\) and the office enters on run reports/.test(eq) && !/Enter Production\)\./.test(eq));
      // C4 material chip (job Overview rows)
      await page.evaluate(() => pbCxTab('overview')); await page.waitForTimeout(600);
      const ov = await page.evaluate(() => [...document.querySelectorAll('#pjCxHero .pbx-matrow')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
      const pvc = ov.find(r => /C900/.test(r)) || '', rock = ov.find(r => /crushed rock/.test(r)) || '';
      check('C4 PVC chip: "All of what’s ordered used" at 108%', /All of what’s ordered used/.test(pvc), pvc);
      check('C4 crushed rock chip: 83% of ordered used', /83% of ordered used/.test(rock), rock);
      check('C4 no chip prints the alert threshold "80%"', !ov.some(r => /80% of ordered used/.test(r)), ov.join(' | '));
      // C1 plan save keeps inspections
      const before = await page.evaluate(() => JSON.parse(localStorage.getItem('__psrv')).plans['c1|24-101'].plan.inspections);
      check('seed: the plan has required inspection counts', !!before && Object.keys(before).length > 0, JSON.stringify(before));
      await page.evaluate(() => window.pbProdPlanEdit()); await page.waitForTimeout(800);
      await page.click('#ppMore0 > summary'); await page.waitForTimeout(200);
      await page.fill('#ppCostCode0', '02-050');
      await page.evaluate(() => window.__rpcLog.length = 0);
      await page.click('#ppSaveBtn'); await page.waitForTimeout(2500);
      const set = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_plan_set').pop() || {}).args);
      check('Save Plan sent (cost code 02-050)', !!set && set.p_plan.categories[0].cost_code === '02-050');
      check('C1 p_plan carries the inspections', !!set && JSON.stringify(set.p_plan.inspections) === JSON.stringify(before), JSON.stringify(set && set.p_plan.inspections));
      const after = await page.evaluate(() => JSON.parse(localStorage.getItem('__psrv')).plans['c1|24-101'].plan.inspections);
      check('C1 the saved plan still has them', JSON.stringify(after) === JSON.stringify(before), JSON.stringify(after));
      await page.evaluate(() => pbCxTab('overview')); await page.waitForTimeout(500);
      check('C1 Overview inspections row is not "None set up"', !/None set up/.test(await C.text(page, 'pjInspRow') || ''), await C.text(page, 'pjInspRow'));
      check('no page errors (company)', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
    { const { ctx, page } = await C.setup(browser, { who: 'foreman' });
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(3500);
      const tile = await C.text(page, 'homeFmWait');
      check('C6 foreman tile is "Runs need production" (not "Waiting on you · Nothing waiting")', /Runs need production/.test(tile || '') && !/Waiting on you|Nothing waiting/.test(tile || ''), tile);
      check('no page errors (foreman)', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
    { const { ctx, page } = await C.setup(browser, { who: 'manager' });
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(3500);
      const t = await C.screenText(page); const n = (re) => (t.match(re) || []).length;
      check('C7 manager sees one pulse: "active runs" once, "active permits" once', n(/active runs?/g) === 1 && n(/active permits?/g) === 1, 'runs x' + n(/active runs?/g) + ' permits x' + n(/active permits?/g));
      check('C7 the company pulse stays, the crew pulse is hidden', !(await C.shown(page, 'homeFmPulse')) && await C.shown(page, 'homeCxLive'));
      check('no page errors (manager)', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
  } catch (e) { check('script ran', false, e && e.stack); }
  await browser.close();
})();
