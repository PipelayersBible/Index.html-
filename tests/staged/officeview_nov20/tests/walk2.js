// a look at the Today table: widths, an open row; node walk2.js [w]
const L = require('./lib');
(async () => {
  const w = +(process.argv[2] || 1280);
  const { b, p } = await L.boot(L.URL, { init: L.co + L.mgr + L.DAY, wait: 3500 });
  await L.waitFn(p, 'pbGoto'); await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(5000);
  console.log(JSON.stringify(await p.evaluate(() => { const s = document.querySelector('#homeCxToday .ov-scroll'), t = document.getElementById('ovTable'); return { sc: s.clientWidth, tw: t.scrollWidth, sw: s.scrollWidth }; })));
  await p.click('#ovOpen1'); await p.waitForTimeout(500);
  await p.locator('#homeCxToday').screenshot({ path: L.OUT + '/today_open_' + w + '.png' });
  console.log(await p.evaluate(() => document.querySelector('.ov-detail').innerText));
  console.log('errs', p.errs, 'overflow', await L.overflow(p));
  await b.close();
})();
