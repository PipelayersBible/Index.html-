const { R, M, E, setup, LINKS, plan } = require('./es_lib.js');
(async () => {
  const browser = await M.chromium.launch();
  const { ctx, page } = await setup(browser, { extra: LINKS });
  console.log('plan', JSON.stringify(await plan(page)), await page.evaluate(() => pbCanOpen('archive')), await page.evaluate(() => pbCanOpen('input')));
  const id = await M.lockRun(page); await M.dismiss(page);
  await page.evaluate(() => pbEndRun()); await page.waitForTimeout(1500); await M.dismiss(page);
  console.log('screen', await E.screen(page));
  console.log('HOME', (await page.evaluate(() => document.querySelector('.pb-screen.active').innerText)).slice(0, 600));
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(1200);
  console.log('ARCH', await E.screen(page), JSON.stringify(await R.modal(page)));
  console.log('errors', JSON.stringify(page._errors));
  await browser.close();
})();
