// speed2 #52 bug hunt 05: photos nothing refers to any more, other readers of the stored text, and two tabs.
//  - every other reader of the stored text (conflict merge, account moves, office tools) still gets the photos inside it;
//    the same text written for another account is stored with references, sharing the photos already there.
//  - deleting a run frees its photos only when NO Records text on the phone (any account) refers to them.
//  - tab B still shows a run that tab A deleted (and whose photos tab A's tidy removed); B saves with "Continue -
//    Overwrite": B writes the photos it holds back first, so the run comes back whole.
const T = require('./phlib');
const UID2 = '00000000-0000-4000-8000-0000000000b2';
(async () => {
  const { page, close } = await T.open();
  let p = await page();
  await T.makeRun(p);
  await T.seedOld(p, 4, 90);
  p = await page(undefined, 1000);
  const st = await T.waitSweep(p);
  T.ok(st && st.verified === 'ok', 'moved', st && st.last);
  const s0 = await T.stored(p);
  // other readers
  const gen = await p.evaluate(async ([U, U2]) => {
    const inline = await window.__ev('pbGetCriticalFor')(U, 'runArchive');
    let n = 0; inline.replace(/"data:image\/[^"]{2000,}"/g, (m) => { n++; return m; });
    const okSet = await window.__ev('pbSetFor')(U2, 'runArchive', inline);
    const back = await window.__ev('pbGetCriticalFor')(U2, 'runArchive');
    const db = await new Promise((ok) => { const r = indexedDB.open('pb-big', 1); r.onsuccess = () => ok(r.result); });
    const raw2 = await new Promise((ok) => { const q = db.transaction('kv').objectStore('kv').get(U2 + ':runArchive'); q.onsuccess = () => ok(q.result); }); db.close();
    return { photosInline: n, refsInStored: (inline.match(/pbph:1:/g) || []).length, okSet, sameBack: back === inline, raw2Refs: (raw2.match(/"pbph:1:/g) || []).length, raw2Inline: (raw2.match(/"data:image/g) || []).length, raw2Len: raw2.length, inlineLen: inline.length };
  }, [T.UID, UID2]);
  T.ok(gen.photosInline === s0.refs && gen.refsInStored === 0, 'a reader of the stored text gets every photo inside it', gen);
  T.ok(gen.okSet && gen.sameBack && gen.raw2Inline === 0 && gen.raw2Refs === s0.refs, 'the same text for another account is stored with references and reads back identical', gen);
  T.ok((await T.stored(p)).storeKeys === s0.storeKeys, 'no photo stored twice', s0.storeKeys);
  // delete the oldest seeded run
  const victim = await p.evaluate(() => { const a = window.__ra(); const runs = a.filter((e) => e.kind === 'run'); return runs[runs.length - 1].id; });
  const pm0 = await T.photoMap(p);
  const uniq = (m, id) => { const mine = new Set(m[id].map((x) => x.split('=')[1])); Object.keys(m).forEach((k) => { if (String(k) !== String(id)) m[k].forEach((x) => mine.delete(x.split('=')[1])); }); return mine.size; };
  console.log('run', victim, 'has', uniq(pm0, victim), 'photos no other run has');
  await p.evaluate(async (id) => { const a = window.__ra(); a.splice(a.findIndex((e) => e.id === id), 1); await window.__save(); }, victim);
  const g1 = await p.evaluate(() => window.__pbPhDebug.gc('now'));
  T.ok(g1 && g1.gone === 0, 'deleted run: its photos kept while another account\'s text refers to them', g1);
  await p.evaluate(async (U2) => { await window.__ev('pbRawDelete')(U2 + ':runArchive'); }, UID2);
  const g2 = await p.evaluate(() => window.__pbPhDebug.gc('now'));
  T.ok(g2 && g2.gone === uniq(pm0, victim), 'then freed: exactly the photos only that run had', g2);
  await p.close({ runBeforeUnload: false });
  p = await page();
  const pm1 = await T.photoMap(p);
  const exp = Object.assign({}, pm0); delete exp[victim];
  T.ok(T.sameMap(exp, pm1), 'every other run keeps every photo');
  // two tabs
  const B = await page();
  const x = await p.evaluate(() => { const runs = window.__ra().filter((e) => e.kind === 'run'); return runs[runs.length - 1].id; });
  await p.evaluate(async (id) => { const a = window.__ra(); a.splice(a.findIndex((e) => e.id === id), 1); await window.__save(); }, x);
  const g3 = await p.evaluate(() => window.__pbPhDebug.gc('now'));
  console.log('tab A deleted run', x, 'and tidied:', JSON.stringify(g3));
  await p.close({ runBeforeUnload: false }); // tab A is done
  let sv = 'pending'; const saving = B.evaluate(() => window.__save()).then((v) => { sv = v; });
  await B.waitForTimeout(1500);
  const m = await T.F(B).modal();
  T.ok(/Another browser tab/.test(m || ''), 'tab B is asked about the other tab\'s save');
  let clicks = 0;
  for (let i = 0; i < 6 && sv === 'pending'; i++) { const mm = await T.F(B).modal(); if (/Another browser tab/.test(mm || '')) { await T.F(B).modalClick('Continue \u2014 Overwrite'); clicks++; } await B.waitForTimeout(1200); }
  await saving; await B.waitForTimeout(800);
  T.ok(sv === true, 'tab B saved', { returned: sv, clicks, modal: ((await T.F(B).modal()) || '').slice(0, 120), errs: B.errs.slice(0, 3) });
  await B.close({ runBeforeUnload: false });
  p = await page();
  const pm2 = await T.photoMap(p);
  T.ok(T.sameMap(pm1, pm2), 'the run tab B kept is back with every photo (' + T.countPhotos(pm2) + ' photos)');
  T.ok(!JSON.stringify(pm2).includes('REF!'), 'no missing photo');
  T.ok(p.errs.length === 0, 'no page errors', p.errs.slice(0, 3));
  await close(); T.done();
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
