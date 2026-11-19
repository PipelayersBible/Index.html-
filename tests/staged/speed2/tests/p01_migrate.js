// speed2 #52 bug hunt 01: Records saved by r17.04 (photos inside the text) is moved to the photo store on the first
// open; every photo stays in the same place with the same bytes, the stored text becomes short, a laid mark after
// that writes no photo again, and a reload reads it all back.
const T = require('./phlib');
(async () => {
  const { page, close } = await T.open();
  let p = await page();
  await T.makeRun(p);
  const seeded = await T.seedOld(p, 12, 120);
  console.log('seeded old-format Records:', JSON.stringify(seeded));
  p = await page(undefined, 1500);
  const before = await T.photoMap(p); // read right after start-up, before the background pass (4 s)
  const s0 = await T.stored(p);
  T.ok(s0.inline > 0 && s0.refs === 0, 'start: Records still in the old format on disk', s0);
  const st = await T.waitSweep(p);
  T.ok(st && st.verified === 'ok', 'background pass stored the photos and the check passed', st);
  const s1 = await T.stored(p);
  T.ok(s1.inline === 0 && s1.refs > 0, 'stored text now refers to the photos (no photo inside)', s1);
  T.ok(s1.chars < s0.chars / 10, 'stored text is short', { before: s0.chars, after: s1.chars });
  const mid = await T.photoMap(p);
  T.ok(T.sameMap(before, mid), 'memory unchanged by the pass (' + T.countPhotos(before) + ' photos)');
  T.ok(st.stored + st.reused === s1.storeKeys, 'one store entry per distinct photo', { stored: st.stored, reused: st.reused, keys: s1.storeKeys });
  // a laid mark now writes only the short text
  await p.evaluate(() => pbResumeLastRunResults()); await p.waitForTimeout(2000);
  const rows = await T.L.rows(p);
  await p.evaluate(() => { window.__ph_puts = 0; const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { if (this.transaction.db.name === 'pb-photos') window.__ph_puts++; return put.apply(this, arguments); }; });
  await T.L.markLaid(p, rows[4]); await p.waitForTimeout(1500);
  const s2 = await T.stored(p);
  T.ok(s2.inline === 0 && s2.chars < s0.chars / 10, 'laid mark saved the short text', s2);
  T.ok(await p.evaluate(() => window.__ph_puts) === 0, 'laid mark wrote no photo again');
  T.ok(await p.evaluate(() => Object.keys((window.__pbRrDebug.run().laid || {}).marks || {}).length) > 0, 'the laid mark is in Records');
  await p.close({ runBeforeUnload: false });
  p = await page();
  const after = await T.photoMap(p);
  T.ok(T.sameMap(before, after), 'after reload: every photo in the same place with the same bytes');
  T.ok(await p.evaluate(() => Object.keys((window.__pbRrDebug.run().laid || {}).marks || {}).length) > 0, 'after reload: the laid mark is there');
  T.ok(!JSON.stringify(after).includes('REF!'), 'no unresolved reference in memory');
  T.ok(p.errs.length === 0, 'no page errors', p.errs.slice(0, 3));
  await close(); T.done();
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
