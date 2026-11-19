// speed2 #52 bug hunt 07: an older build, and a damaged photo store.
//  - rolled back to r17.04 after the move: it opens Records (separate database, nothing blocks it), shows references
//    where photos were, and a save there keeps them; back on the new build every photo is there again.
//  - one photo missing from the store: Records still opens, only that photo is missing, a save keeps its reference.
//  - the photo store can't be opened at all: "Records Failed to Load" and saving blocked (never "no photos").
const T = require('./phlib');
const BREAK = `(()=>{if(localStorage.getItem('__phBreak')!=='1')return;const o=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n){if(n==='pb-photos')throw new DOMException('broken','UnknownError');return o.apply(this,arguments);};})();`;
(async () => {
  const { page, close } = await T.open({ init: BREAK });
  let p = await page();
  await T.makeRun(p);
  await T.seedOld(p, 3, 90);
  p = await page(undefined, 1000);
  T.ok((await T.waitSweep(p)).verified === 'ok', 'moved');
  const pm0 = await T.photoMap(p);
  await p.close({ runBeforeUnload: false });
  // r17.04
  p = await page(T.ROOT + 'base.html', 4000);
  const old = await p.evaluate(() => ({ failed: /Failed to Load/.test(document.body.innerText), runs: window.__ra().filter((e) => e.kind === 'run').length, refs: (JSON.stringify(window.__ra()).match(/pbph:1:/g) || []).length }));
  T.ok(!old.failed && old.runs === Object.keys(pm0).length, 'r17.04 opens the moved Records', old);
  T.ok(old.refs > 0, 'r17.04 sees references where photos were (shown as missing pictures)', old.refs);
  await p.evaluate(() => pbResumeLastRunResults()); await p.waitForTimeout(2000);
  const rows = await T.L.rows(p); await T.lay(p, rows[3]); await p.waitForTimeout(1500);
  const sOld = await T.stored(p);
  T.ok(sOld.refs === old.refs && sOld.inline === 0, 'r17.04 saved and kept every reference', sOld);
  await p.close({ runBeforeUnload: false });
  p = await page();
  const pm1 = await T.photoMap(p);
  T.ok(T.sameMap(pm0, pm1), 'back on the new build: every photo in its place');
  T.ok(await p.evaluate(() => Object.keys((window.__pbRrDebug.run().laid || {}).marks || {}).length) > 0, 'the laid mark made on r17.04 is there');
  // one photo missing
  const gone = await p.evaluate(async () => { const k = (await window.__pbPhDebug.keys())[0]; await new Promise((ok) => { const r = indexedDB.open('pb-photos', 1); r.onsuccess = () => { const t = r.result.transaction('ph', 'readwrite'); t.objectStore('ph').delete(k); t.oncomplete = () => { r.result.close(); ok(); }; }; }); return k; });
  await p.close({ runBeforeUnload: false });
  p = await page();
  const pm2 = await T.photoMap(p);
  const miss = Object.values(pm2).flat().filter((x) => /REF!/.test(x)).length;
  T.ok(miss > 0 && Object.keys(pm2).length === Object.keys(pm0).length, 'one photo missing: Records opens, only that photo is missing', { missingPlaces: miss });
  T.ok(p.errs.some((e) => /could not be found/.test(e)), 'and it is reported (console / crash note)');
  await p.evaluate(() => window.__save()); await p.waitForTimeout(800);
  const s2 = await T.stored(p);
  T.ok(s2.refs === sOld.refs, 'a save keeps the missing photo\'s reference', s2);
  // store can't be opened
  await p.evaluate(() => localStorage.setItem('__phBreak', '1')); await p.close({ runBeforeUnload: false });
  p = await page();
  const txt = await p.evaluate(() => document.body.innerText);
  T.ok(/Records Failed to Load|Couldn.t load the run Records/.test(txt), 'store unreadable: "Records Failed to Load"');
  const before = await T.stored(p);
  const saved = await p.evaluate(() => window.__save()); await p.waitForTimeout(500);
  const after = await T.stored(p);
  T.ok(saved === false && before.chars === after.chars && after.refs === before.refs, 'saving blocked, nothing overwritten', { saved, before: before.chars, after: after.chars });
  await p.evaluate(() => localStorage.removeItem('__phBreak')); await p.close({ runBeforeUnload: false });
  p = await page();
  T.ok(Object.keys(await T.photoMap(p)).length === Object.keys(pm0).length, 'store readable again: Records opens');
  await close(); T.done();
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
