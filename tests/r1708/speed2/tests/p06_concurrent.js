// speed2 #52 bug hunt 06: two Records writes at the same time, each with photos the store doesn't have yet (so both
// wait on the store between photos). Each text must be stored with references and read back exactly as given.
const T = require('./phlib');
(async () => {
  const { page, close } = await T.open();
  let p = await page();
  await T.makeRun(p);
  const r = await p.evaluate(async () => {
    const mk = (seed, n) => { const out = []; const cv = document.createElement('canvas'); cv.width = cv.height = 220; const g = cv.getContext('2d'); let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let k = 0; k < n; k++) { const im = g.createImageData(220, 220); for (let i = 0; i < im.data.length; i += 4) { im.data[i] = rnd() * 255; im.data[i + 1] = rnd() * 255; im.data[i + 2] = rnd() * 255; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); out.push(cv.toDataURL('image/jpeg', 0.6)); } return out; };
    const text = (ph, tag) => JSON.stringify([{ id: tag, kind: 'run', lockTime: new Date().toISOString(), note: 'x"y', photos: ph, more: { a: ph[1], b: [ph[2], 'plain'] } }]);
    const A = text(mk(11, 6), 1), B = text(mk(97, 6), 2);
    const UA = '00000000-0000-4000-8000-0000000000c1', UB = '00000000-0000-4000-8000-0000000000c2';
    const [okA, okB] = await Promise.all([window.__ev('pbSetFor')(UA, 'runArchive', A), window.__ev('pbSetFor')(UB, 'runArchive', B)]);
    const backA = await window.__ev('pbGetCriticalFor')(UA, 'runArchive'), backB = await window.__ev('pbGetCriticalFor')(UB, 'runArchive');
    const db = await new Promise((ok) => { const q = indexedDB.open('pb-big', 1); q.onsuccess = () => ok(q.result); });
    const raw = async (k) => new Promise((ok) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => ok(q.result); });
    const rawA = await raw(UA + ':runArchive'), rawB = await raw(UB + ':runArchive');
    return { okA, okB, sameA: backA === A, sameB: backB === B, refsA: (rawA.match(/"pbph:1:/g) || []).length, refsB: (rawB.match(/"pbph:1:/g) || []).length, inlineA: (rawA.match(/"data:/g) || []).length, inlineB: (rawB.match(/"data:/g) || []).length };
  });
  T.ok(r.okA && r.okB, 'both writes reported success', r);
  T.ok(r.sameA && r.sameB, 'each text reads back exactly as given', r);
  T.ok(r.refsA === 8 && r.refsB === 8 && r.inlineA === 0 && r.inlineB === 0, 'each stored with references only', r);
  await close(); T.done();
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
