// speed2 #52 bug hunt 08: "clear phone copies of photos already sent to the company".
// Runs 40, 80 and 120 days old; the first two had their photos sent (this phone's upload log), the third never did.
//  - 60 days (default): only the 80-day run's photos are offered; 30 days: the 40-day run's too; never the unsent run,
//    never the open run; "Never" offers nothing.
//  - a save that fails puts everything back.
//  - cleared: each photo becomes "Photo kept by your company" (with its fingerprint), the record fingerprint (rev) is
//    unchanged, the PDF still has a picture in each place, the original photos leave the photo store, and it stays so
//    after a reload.
const T = require('./phlib');
const DAY = 86400000;
const FULL = `(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,k){if(window.__full&&this.transaction.db.name==='pb-big'){const t=this.transaction;setTimeout(()=>{try{t.abort();}catch(e){}},0);throw new DOMException('quota','QuotaExceededError');}return put.apply(this,arguments);};const si=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__full&&String(v).length>200)throw new DOMException('quota','QuotaExceededError');return si.apply(this,arguments);};})();`;
(async () => {
  const { page, close } = await T.open({ init: FULL });
  let p = await page();
  await T.makeRun(p);
  await T.seedOld(p, 3, 90, 40 * DAY);
  p = await page(undefined, 1000);
  T.ok((await T.waitSweep(p)).verified === 'ok', 'moved');
  const runs = await p.evaluate(() => window.__ra().filter((e) => e.kind === 'run').map((e) => ({ id: e.id, days: Math.round((Date.now() - new Date(e.lockTime)) / 86400000), ended: !!(e.completed || e.incomplete) })));
  console.log('runs:', JSON.stringify(runs));
  const [cur, r40, r80, r120] = runs.map((r) => r.id);
  // the upload log: the 40- and 80-day runs' photos reached the company; the open run's too (it must still be kept)
  await p.evaluate(async ([U, ids]) => {
    const done = {};
    for (const e of window.__ra().filter((x) => ids.includes(x.id))) {
      const walk = (v) => { if (typeof v === 'string') { if (v.length > 2000 && /^data:image\//.test(v)) done[window.__ev('pbRrPhotoPath')(U, e.id, window.__ev('pbPhotoSha')(v))] = Date.now(); return; } if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v).forEach(walk); };
      walk(e);
    }
    localStorage.setItem(U + ':rrPhotosUp', JSON.stringify(done));
  }, [T.UID, [cur, r40, r80]]);
  const scan = () => p.evaluate(() => window.__pbPhClear.scan());
  let sc = await scan();
  T.ok(sc.days === 60 && sc.count === 2, 'default 60 days: only the 80-day run\'s 2 photos', sc);
  await p.evaluate(() => pbGoto('archive')); await p.waitForTimeout(1500);
  const banner = () => p.evaluate(() => { const b = document.getElementById('archivePhClearBtn'); return b && !b.hidden ? b.innerText.trim() : null; });
  T.ok(/2 sent photos can leave this phone/.test(await banner() || ''), 'Records offers it', await banner());
  await p.evaluate(() => pbSetPhClearDays(30)); await p.waitForTimeout(1500);
  sc = await scan();
  T.ok(sc.count === 4, '30 days: the 40-day run\'s photos too (never the unsent 120-day run, never the open run)', sc);
  T.ok(/4 sent photos/.test(await banner() || ''), 'banner follows the setting', await banner());
  await p.evaluate(() => pbSetPhClearDays('never')); await p.waitForTimeout(1200);
  T.ok((await scan()).count === 0 && (await banner()) === null, '"Never": nothing offered');
  await p.evaluate(() => pbSetPhClearDays(30)); await p.waitForTimeout(1200);
  const before = await T.photoMap(p);
  const fp0 = await p.evaluate((ids) => ids.map((id) => window.pbRptFingerprintOf(window.__ra().find((e) => e.id === id))), [r40, r80, r120]);
  // a save that fails
  await p.evaluate(() => { window.__full = true; });
  await p.evaluate(() => window.__pbPhClear.now()); await p.waitForTimeout(1500);
  const mf = await T.F(p).modal();
  T.ok(T.sameMap(before, await T.photoMap(p)), 'save failed: every photo put back', (mf || '').replace(/\s+/g, ' ').slice(0, 90));
  await p.evaluate(() => { window.__full = false; }); await T.L.clearModals(p);
  await p.waitForTimeout(500); await T.L.clearModals(p);
  const keys0 = (await T.stored(p)).storeKeys;
  // clear, through the banner
  await p.click('#archivePhClearBtn'); await p.waitForTimeout(1200);
  T.ok(/already with your company/.test(await T.F(p).modal() || ''), 'asks first', ((await T.F(p).modal()) || '').replace(/\s+/g, ' ').slice(0, 140));
  await T.F(p).modalClick('Clear Phone Copies'); await p.waitForTimeout(3000);
  T.ok(/Cleared 4 photos/.test(await T.F(p).modal() || ''), 'cleared 4', ((await T.F(p).modal()) || '').replace(/\s+/g, ' ').slice(0, 100));
  await T.L.clearModals(p);
  const after = await T.photoMap(p);
  const changed = (id) => before[id].filter((x, i) => x !== after[id][i]).length;
  T.ok(changed(r40) === before[r40].length && changed(r80) === before[r80].length, 'every photo of the two sent runs replaced', { r40: changed(r40), r80: changed(r80) });
  T.ok(changed(r120) === 0 && changed(cur) === 0, 'the unsent run and the open run untouched');
  const info = await p.evaluate(async (ids) => { const out = []; for (const id of ids) { const e = window.__ra().find((x) => x.id === id); const un = await window.__ev('pbPreflightPdfImages')([e], () => {}); const doc = window.__ev('pbRptMakeSafe')(e, { unreadable: un }); const b = new Uint8Array(doc.output('arraybuffer')); let t = ''; for (let i = 0; i < b.length; i += 65536) t += String.fromCharCode.apply(null, b.subarray(i, i + 65536)); out.push({ fp: window.pbRptFingerprintOf(e), images: (t.match(/\/Subtype\s*\/Image/g) || []).length, cleared: (e._phoneCleared || []).length }); } return out; }, [r40, r80, r120]);
  T.ok(info[0].fp === fp0[0] && info[1].fp === fp0[1] && info[2].fp === fp0[2], 'record fingerprints (rev) unchanged');
  T.ok(info[0].images === 2 && info[1].images === 2 && info[0].cleared === 2, 'PDF still has a picture in each place; the run lists what was cleared', info);
  const keys1 = (await T.stored(p)).storeKeys, distinct = new Set(Object.values(after).flat().map((x) => x.split('=')[1])).size;
  T.ok(keys1 === distinct, 'the photo store holds exactly the photos Records still has: the originals left (the failed try\'s pictures too)', { before: keys0, after: keys1, distinct });
  T.ok((await scan()).count === 0 && (await banner()) === null, 'nothing more offered');
  await p.close({ runBeforeUnload: false });
  p = await page();
  T.ok(T.sameMap(after, await T.photoMap(p)), 'after reload: as cleared');
  T.ok(p.errs.length === 0, 'no page errors', p.errs.slice(0, 3));
  await close(); T.done();
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
