// a look, not a test: node walk.js [w] [name]
const L = require('./lib');
(async () => {
  const w = +(process.argv[2] || 1440), name = process.argv[3] || 'walk';
  const { b, p } = await L.boot(L.URL, { init: L.co + L.mgr + L.DAY, wait: 3500 });
  await L.waitFn(p, 'pbGoto'); await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(5000);
  await p.screenshot({ path: L.OUT + '/' + name + '_home_' + w + '.png', fullPage: true });
  console.log(JSON.stringify(await p.evaluate(() => ({ dbg: window.__pbOvDebug && window.__pbOvDebug(), txt: (document.getElementById('homeCxToday') || {}).innerText }))));
  await p.evaluate(() => pbGoto('archive')); await p.waitForTimeout(3000);
  await p.screenshot({ path: L.OUT + '/' + name + '_records_' + w + '.png', fullPage: true });
  console.log((await p.evaluate(() => (document.getElementById('rpfList') || {}).innerText)).slice(0, 800));
  console.log('errs', p.errs, 'overflow', await L.overflow(p));
  await b.close();
})();
