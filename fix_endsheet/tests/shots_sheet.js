// 390 px screenshots of "Where Did This Run End?" (owner's case: Tue 6:22 PM start, laid to 140.0 at 9:47 PM, Wed 4:26 AM)
// and the report routes. Usage: SHOT_TAG=base|fix node shots_sheet.js (inside run.sh)
const { R, M, E, setup, LINKS } = require('./es_lib.js');
const OUT = '/home/claude/fix_endsheet/shots/', TAG = process.env.SHOT_TAG || 'fix';
(async () => {
  const browser = await M.chromium.launch();
  const { ctx, page } = await setup(browser, { extra: LINKS, clock: '2026-10-20T18:22:00', width: 390, height: 844, dpr: 2 });
  await M.lockRun(page, { dist: 510 }); await M.dismiss(page);
  await page.clock.fastForward((3 * 60 + 25) * 60000); await page.evaluate(() => { for (let i = 1; i <= 14; i++) pbLaidMark(i); }); await page.waitForTimeout(1500);
  await page.evaluate(() => pbGoto('home')); await page.clock.fastForward((6 * 60 + 39) * 60000);
  await E.openRun(page); await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + TAG + '_1_sheet.png' });
  const m = await page.evaluate(() => { const r = (id) => { const el = document.getElementById(id); if (!el) return null; const b = el.getBoundingClientRect(); return { h: Math.round(b.height), w: Math.round(b.width), fs: getComputedStyle(el).fontSize, vis: b.height > 2 }; };
    const row = document.querySelector('.pb-fx-st-row'), day = document.querySelector('.pb-fx-days button'), btn = document.querySelector('#pbModalButtons button');
    const bb = (el) => el ? { h: Math.round(el.getBoundingClientRect().height), fs: getComputedStyle(el).fontSize } : null;
    const dlg = document.getElementById('pbModalDialog').getBoundingClientRect();
    return { point: r('pbEaPoint'), day: r('pbEaDay'), time: r('pbEaTime'), row: bb(row), dayBtn: bb(day), btn: bb(btn), dlg: { top: Math.round(dlg.top), h: Math.round(dlg.height) }, vh: innerHeight, scrollW: document.documentElement.scrollWidth }; });
  console.log('METRICS ' + JSON.stringify(m));
  if (TAG === 'fix') {
    await page.evaluate(() => { const b = [...document.querySelectorAll('.pb-fx-st-row')].find(x => /^200\.0/.test(x.textContent)); b.scrollIntoView({ block: 'center' }); b.click(); }); await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + 'fix_2_changed_point.png' });
    await page.evaluate(() => { document.querySelector('.pb-fx-more').open = true; const d = document.getElementById('pbModalDialog'); d.querySelectorAll('*').forEach(x => { if (x.scrollHeight > x.clientHeight + 4) x.scrollTop = x.scrollHeight; }); }); await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + 'fix_3_help_open.png' });
    await E.fill(page, { pointIdx: 14, day: '2026-10-20', time: '21:50' }); await E.tap(page, 'Save End'); await page.waitForTimeout(1800);
    await page.screenshot({ path: OUT + 'fix_4_saved.png' });
    await E.tap(page, 'Not Today'); await page.waitForTimeout(1200);
    await page.screenshot({ path: OUT + 'fix_5_home_report.png' });
    await page.evaluate(() => document.getElementById('homeRunReportView').click()); await page.waitForTimeout(1200);
    await page.screenshot({ path: OUT + 'fix_6_view_report.png' });
  }
  console.log('errors', JSON.stringify(page._errors));
  await browser.close();
})();
