const { R, M, E, setup, LINKS, plan } = require('./es_lib.js');
(async () => {
  const browser = await M.chromium.launch();
  const { ctx, page } = await setup(browser, { extra: LINKS, clock: '2026-10-20T18:22:00' });
  console.log('plan', JSON.stringify(await plan(page)));
  const id = await M.lockRun(page, { dist: 510 }); await M.dismiss(page);
  await page.clock.fastForward((3 * 60 + 25) * 60000);
  await page.evaluate(() => pbLaidMark(14)); await page.waitForTimeout(800);
  await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(300);
  await page.clock.fastForward((6 * 60 + 39) * 60000);
  await E.openRun(page); await page.waitForTimeout(1200);
  await E.fill(page, { day: '2026-10-20', time: '21:50' }); await E.tap(page, 'Save Where It Ended'); await page.waitForTimeout(2000);
  console.log(JSON.stringify(await R.modal(page)));
  await E.tap(page, 'Continue Today'); await page.waitForTimeout(1500);
  for (let k = 0; k < 4; k++) { const md = await R.modal(page); console.log('modal', JSON.stringify(md)); if (!md) break; await page.evaluate(() => { const b = document.querySelectorAll('#pbModalButtons button'); b[b.length-1].click(); }); await page.waitForTimeout(1000); }
  console.log('screen', await E.screen(page));
  await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(800); await M.dismiss(page);
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(1200);
  console.log('ARCH', await E.screen(page), JSON.stringify(await R.modal(page)));
  console.log('rows', await page.evaluate(() => [...document.querySelectorAll('#archiveList .pb-arch-row')].map(r => r.querySelector('.k').textContent + ' | ' + [...r.querySelectorAll('button')].map(b => b.textContent.trim()).join(',')).join('\n')));
  console.log('resume', await page.evaluate(() => document.getElementById('archiveResumeSection').innerText));
  await page.evaluate(() => { window.__pdfData = null; window.__debugPdfSink = (d) => { window.__pdfData = d; }; });
  await page.evaluate((id) => pbArchiveTap('pbDownloadArchivePDF', id), id); await page.waitForTimeout(3000);
  console.log('pdf', await page.evaluate(() => window.__pdfData ? window.__pdfData.length : null), JSON.stringify(await R.modal(page)));
  console.log('errors', JSON.stringify(page._errors));
  await browser.close();
})();
