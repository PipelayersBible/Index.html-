const R = require('/home/claude/batch29/ROLES/tests/roles_lib.js'); const { M } = R;
(async () => {
  const browser = await M.chromium.launch();
  const { ctx, page } = await R.setup(browser, { uid: 'acctP', role: 'pipelayer', extra: { __psrv: { entries: {}, plans: {}, links: [{ foreman: 'acctF', pipelayer: 'acctP', by: 'acctP', started: new Date(Date.now()-86400000).toISOString() }] } } });
  const id = await M.lockRun(page); await M.dismiss(page);
  await page.evaluate(() => pbLaidMark(3)); await page.waitForTimeout(500);
  console.log('sub', await page.evaluate(() => JSON.stringify(localStorage.getItem('acctP:cachedSubscription'))));
  await page.evaluate(() => pbEndRun()); await page.waitForTimeout(1500);
  for (let k = 0; k < 6; k++) { const md = await R.modal(page); console.log('modal', JSON.stringify(md)); if (!md) break; await page.evaluate(() => { const b = document.querySelectorAll('#pbModalButtons button'); b[0].click(); }); await page.waitForTimeout(1200); }
  console.log('screen', await page.evaluate(() => (document.querySelector('.pb-screen.active')||{}).id));
  
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(1200);
  console.log('archive screen', await page.evaluate(() => (document.querySelector('.pb-screen.active')||{}).id));
  console.log('archive text', (await page.evaluate(() => document.querySelector('.pb-screen.active').innerText)).slice(0, 2500));
  await page.evaluate(() => { const b=[...document.querySelectorAll('#archiveList button')].find(x=>x.textContent.trim()==='View'); b.click(); }); await page.waitForTimeout(400);
  console.log('view shown', await page.evaluate(() => { const p=document.querySelector('#archiveList pre'); return p && getComputedStyle(p).display + ' ' + p.textContent.length + ' ' + p.textContent.slice(0,200); }));
  console.log('pdfReady', await page.evaluate(() => typeof pdfLibReady==='function' && pdfLibReady()));
  await page.evaluate(() => { window.__pdfData = null; window.__debugPdfSink = (d) => { window.__pdfData = d; }; });
  await page.evaluate(() => { const b=[...document.querySelectorAll('#archiveList button')].find(x=>x.textContent.trim()==='Download PDF'); b.click(); }); await page.waitForTimeout(3000);
  console.log('pdf', await page.evaluate(() => window.__pdfData ? window.__pdfData.length : null), JSON.stringify(await R.modal(page)));
  console.log('errors', JSON.stringify(page._errors));
  await browser.close();
})();
