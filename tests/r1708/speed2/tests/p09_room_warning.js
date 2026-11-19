// speed2 #54: the "Records is getting large (about 5 MB)" warning. r17.04 warns on the first save of a session as soon
// as the Records text passes 4 MB (it lives in IndexedDB since r16.47, so that is false). The new build warns from the
// browser's own figures: not at 7 MB of Records with plenty of room; yes when the app's storage is 90 % used.
const T = require('./phlib');
const EST = `(()=>{const f=localStorage.getItem('__estFull');if(!f)return;navigator.storage.estimate=async()=>({quota:2e9,usage:2e9*Number(f)});})();`;
const layAndModal = async (p, i) => { await p.evaluate(() => pbResumeLastRunResults()); await p.waitForTimeout(1500); await T.L.clearModals(p); const rows = await T.L.rows(p); await T.lay(p, rows[i]); await p.waitForTimeout(2500); return (await T.F(p).modal()) || ''; };
(async () => {
  const { page, close } = await T.open({ init: EST });
  let p = await page();
  await T.makeRun(p);
  const seeded = await T.seedOld(p, 9, 160);
  console.log('Records text:', (seeded.chars / 1048576).toFixed(1), 'MB');
  p = await page(T.ROOT + 'base.html', 2500);
  const m0 = await layAndModal(p, 2);
  T.ok(/Records Getting Full/.test(m0) && /about 5 MB/.test(m0), 'r17.04: false "getting full" warning', m0.replace(/\s+/g, ' ').slice(0, 110));
  await p.close({ runBeforeUnload: false });
  p = await page(undefined, 800);
  const m1 = await layAndModal(p, 4); // saved in the old format still (before the photos move)
  T.ok(!/Getting Full/.test(m1), 'new build, 7 MB of Records, plenty of room: no warning', m1.replace(/\s+/g, ' ').slice(0, 80));
  await p.evaluate(() => localStorage.setItem('__estFull', '0.9')); await p.close({ runBeforeUnload: false });
  p = await page(undefined, 800);
  const m2 = await layAndModal(p, 6);
  T.ok(/Records Getting Full/.test(m2) && /90% used/.test(m2) && !/5 MB/.test(m2), 'storage 90 % used: warned, in the new words', m2.replace(/\s+/g, ' ').slice(0, 200));
  await T.L.clearModals(p);
  const m3 = await layAndModal(p, 8);
  T.ok(!/Getting Full/.test(m3), 'once per session');
  await p.evaluate(() => localStorage.removeItem('__estFull'));
  await close(); T.done();
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
