// speed2 #52 bug hunt 03: the phone's storage fills up while photos are being moved. The move stops, the photos it
// wrote are removed again (they would only squeeze the Records save), Records stays in the old format and complete, a
// laid mark still saves, and on a later start with room the move finishes. Also: the photo store refuses EVERY write
// (e.g. a full phone from the start): Records keeps saving whole, nothing is lost.
const T = require('./phlib');
const QUOTA = `(()=>{const n=+(localStorage.getItem('__phQuota')||'-1');if(n<0)return;let c=0;const put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(){if(this.transaction.db.name==='pb-photos'&&++c>n){const t=this.transaction;setTimeout(()=>{try{t.abort();}catch(e){}},0);throw new DOMException('The quota has been exceeded.','QuotaExceededError');}return put.apply(this,arguments);};})();`;
(async () => {
  const { page, close } = await T.open({ init: QUOTA });
  let p = await page();
  await T.makeRun(p);
  await T.seedOld(p, 10, 120);
  p = await page(T.ROOT + 'manifest.webmanifest', 0); await p.evaluate(() => localStorage.setItem('__phQuota', '5')); await p.close();
  p = await page(undefined, 1000);
  const before = await T.photoMap(p);
  const st = await T.waitSweep(p);
  T.ok(st && /storage full/.test(st.last) && st.stop, 'move stopped on "storage full"', st && st.last);
  const s1 = await T.stored(p);
  T.ok(s1.inline > 0 && s1.refs === 0, 'Records still whole on disk', s1);
  T.ok(s1.storeKeys === 0, 'what the move wrote was removed again', s1.storeKeys);
  T.ok(T.sameMap(before, await T.photoMap(p)), 'every photo still in memory');
  await p.evaluate(() => pbResumeLastRunResults()); await p.waitForTimeout(2000);
  const rows = await T.L.rows(p);
  await T.lay(p, rows[4]); await p.waitForTimeout(2000);
  const modal = await T.F(p).modal();
  T.ok(!modal || !/Save Failed/.test(modal), 'laid mark saved (no "Save Failed")', modal ? modal.slice(0, 80) : '');
  await p.close({ runBeforeUnload: false });
  p = await page(undefined, 1000);
  const m2 = await T.photoMap(p);
  T.ok(T.sameMap(before, m2), 'after reload (still full): every photo in its place');
  T.ok(await p.evaluate(() => Object.keys((window.__pbRrDebug.run().laid || {}).marks || {}).length) > 0, 'the laid mark is there');
  // refuses every write
  await p.evaluate(() => localStorage.setItem('__phQuota', '0')); await p.close({ runBeforeUnload: false });
  p = await page(undefined, 1000);
  const st0 = await T.waitSweep(p);
  T.ok(st0 && /storage full/.test(st0.last), 'store refusing every write: move stops', st0 && st0.last);
  await p.evaluate(() => pbResumeLastRunResults()); await p.waitForTimeout(2000);
  const rows2 = await T.L.rows(p);
  { const m = await T.F(p).modal(); if (m) { console.log('modal before second mark:', m.slice(0, 160)); await T.L.clearModals(p); } }
  await T.lay(p, rows2[7]); await p.waitForTimeout(2000);
  const s2 = await T.stored(p);
  T.ok(s2.inline > 0 && s2.refs === 0, 'Records saved whole', s2);
  // room again
  await p.evaluate(() => localStorage.removeItem('__phQuota')); await p.close({ runBeforeUnload: false });
  p = await page(undefined, 1000);
  const st2 = await T.waitSweep(p);
  T.ok(st2 && st2.verified === 'ok', 'with room again the move finishes', st2 && st2.last);
  await p.close({ runBeforeUnload: false });
  p = await page();
  T.ok(T.sameMap(before, await T.photoMap(p)), 'final: every photo in its place');
  T.ok((await T.stored(p)).inline === 0, 'final: photos stored apart');
  T.ok(p.errs.filter((e) => !/Save failed|quota/i.test(e)).length === 0, 'no page errors', p.errs.slice(0, 3));
  await close(); T.done();
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
