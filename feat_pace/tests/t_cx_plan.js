// Batch 27 CONSOLE: Edit project -> Job plan end to end on the company job screen, with the production mock's own server
// (pd_lib: pb_prod_plan_set stores the plan; the dashboard and job detail read it back): edit, save, see it in the bars.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const txt = (p, s) => p.evaluate((q) => { const e = document.querySelector(q); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, s);
(async () => {
  const browser = await M.chromium.launch();
  for (const w of [390, 1280]) {
    const { ctx, page } = await T.setup(browser, { manager: true, width: w, height: 844, extra: { __psrv: T.seedServer() } });
    await page.evaluate(() => pbGotoTab('home')); await T.waitFor(page, () => !!document.querySelector('.pbx-job[data-job="24-101"]'), 10000);
    check(w + ': no plan yet on the card', /No plan yet/.test((await txt(page, '.pbx-job[data-job="24-101"]')) || ''));
    await page.click('.pbx-job[data-job="24-101"]'); await page.waitForTimeout(1800);
    await page.click('#pjCxEdit'); await page.click('#pjCxEdit_plan'); await page.waitForTimeout(400);
    check(w + ': Job plan opens the editor, the tabs step aside', await page.evaluate(() => !!document.getElementById('ppSaveBtn') && document.getElementById('pjCxTabs').hidden));
    // Excavation 1000 LF planned (420 reported), Pipe Installed 800 LF (360 reported)
    const names = await page.evaluate(() => [...document.querySelectorAll('#ppRows input[id^=ppName]')].map(i => i.value));
    const ex = names.indexOf('Excavation'), pi = names.indexOf('Pipe Installed');
    await page.fill('#ppName' + ex, 'Trenching'); await page.fill('#ppPlanned' + ex, '1000'); await page.fill('#ppPlanned' + pi, '800');
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    for (let i = 0; i < 3; i++) { const md = await T.modal(page); if (!md) break; console.log('dialog:', md.title, '|', md.buttons.join(' / ')); await page.click('#pbModalButtons button >> nth=-1'); await page.waitForTimeout(1200); }
    const sent = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_plan_set').length);
    check(w + ': saved to the server once', sent === 1);
    check(w + ': editor closed, tabs back', await page.evaluate(() => !document.getElementById('ppSaveBtn') && !document.getElementById('pjCxTabs').hidden));
    const hero = (await txt(page, '#pjCxHero')) || '';
    check(w + ': the header shows the new plan: Trenching 42%, Pipe Installed 45%, overall 43% (' + hero.slice(0, 160) + ')', /Trenching (≈ \d+ work days? left )?420 \/ 1,000 LF 42%/.test(hero) && /Pipe Installed (≈ \d+ work days? left )?360 \/ 800 LF 45%/.test(hero) && /43% complete/.test(hero));
    check(w + ': the header bar has the two planned segments', await page.evaluate(() => document.querySelectorAll('#pjCxHero .pbx-bar.vB .pbx-seg').length === 2));
    await page.click('#pjBack'); await page.waitForTimeout(1500);
    await page.evaluate(() => pbCxRefresh(true)); await page.waitForTimeout(1500);
    const card = (await txt(page, '.pbx-job[data-job="24-101"]')) || '';
    check(w + ': Home card shows it too: 43%, Trenching 42%, Pipe Installed 45% (' + card.slice(0, 160) + ')', /43%/.test(card) && /Trenching 42%/.test(card) && /Pipe Installed 45%/.test(card));
    check(w + ': no page errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
    await ctx.close();
  }
  await browser.close();
})();
