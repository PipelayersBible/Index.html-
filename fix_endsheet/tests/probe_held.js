const { R, M, E, setup, LINKS, plan } = require('./es_lib.js');
(async () => {
  const browser = await M.chromium.launch();
  const { ctx, page } = await setup(browser, { extra: LINKS });
  const id = await M.lockRun(page); await M.dismiss(page);
  await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101'; return window.__debugSaveRunArchive(); });
  await page.evaluate(() => pbLaidMark(4)); await page.waitForTimeout(500);
  const hasFp = await page.evaluate(() => !!document.getElementById('fpPipeInstalled') && document.getElementById('fpPipeInstalled').offsetParent !== null);
  console.log('fp shown', hasFp);
  if (hasFp) { await page.fill('#fpForeman', 'Wes'); await page.fill('#fpPipeInstalled', '40'); await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(1500); await M.dismiss(page); }
  await page.evaluate(() => pbEndRun()); await page.waitForTimeout(2500); await M.dismiss(page);
  await page.evaluate(() => typeof pbProdSyncNow === 'function' && pbProdSyncNow()); await page.waitForTimeout(3000); await M.dismiss(page);
  console.log('rpcs', await page.evaluate(() => window.__rpcLog.map(x => x.fn).join(',')));
  await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(1500);
  const dump = () => page.evaluate(() => { const s=document.querySelector('.pb-screen.active'); return s.id + '\n' + s.innerText.slice(0,1800) + '\n--\n' + [...s.querySelectorAll('[onclick]')].filter(b=>b.offsetParent).map(b => (b.textContent.trim().slice(0,40)) + ' => ' + b.getAttribute('onclick')).join('\n'); });
  console.log('HOME', await dump());
  await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(2500);
  console.log('PM', await dump());
  console.log('errors', JSON.stringify(page._errors));
  await browser.close();
})();
