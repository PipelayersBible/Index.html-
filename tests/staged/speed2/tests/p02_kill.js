// speed2 #52 bug hunt 02: the phone dies (browser SIGKILLed) in the middle of moving photos to the photo store, at
// three different moments: while photos are being written, right as the short text is being saved, and just after.
// Every start must show every photo in its place, and the move must finish on a later start.
const T = require('./phlib');
const os = require('os'), fs = require('fs'), path = require('path');
(async () => {
  const dir = fs.mkdtempSync(path.join(process.env.PB_OUT || os.tmpdir(), 'prof-'));
  let B = await T.open({ dir });
  let p = await B.page();
  await T.makeRun(p);
  const seeded = await T.seedOld(p, 40, 160);
  console.log('seeded old-format Records:', JSON.stringify(seeded));
  p = await B.page(undefined, 800);
  const before = await T.photoMap(p);
  console.log('photos in Records:', T.countPhotos(before));
  const triggers = [
    ['while photos are written (10 stored)', (st) => st && st.stored >= 10],
    ['as the short text is saved', (st) => st && st.last === 'stored' && !st.verified],
    ['right after a start, with nothing left to move', (st) => true],
  ];
  for (const [name, hit] of triggers) {
    let st = null; const t0 = Date.now();
    while (Date.now() - t0 < 120000) { st = await p.evaluate(() => window.__pbPhDebug.stat()).catch(() => null); if (hit(st)) break; if (st && /nothing to store/.test(st.last)) break; await p.waitForTimeout(st && st.stored >= 8 ? 5 : 100); }
    console.log('kill ' + name + ':', JSON.stringify(st && { stored: st.stored, reused: st.reused, last: st.last, verified: st.verified }));
    await B.kill();
    B = await T.open({ dir });
    p = await B.page(undefined, 1200);
    const disk = await T.stored(p);
    const m = await T.photoMap(p);
    T.ok(T.sameMap(before, m), 'after the kill ' + name + ': every photo in its place', disk);
    T.ok(!(await p.evaluate(() => !!document.querySelector('#pbModalOverlay') && /Failed to Load/.test(document.body.innerText))), 'no "Records Failed to Load"');
  }
  const st = await T.waitSweep(p);
  const disk = await T.stored(p);
  T.ok(disk.inline === 0 && disk.refs > 0, 'the move finished on a later start', Object.assign({ last: st && st.last, verified: st && st.verified }, disk));
  await p.close({ runBeforeUnload: false });
  p = await B.page();
  T.ok(T.sameMap(before, await T.photoMap(p)), 'final reload: every photo in its place');
  T.ok(p.errs.length === 0, 'no page errors', p.errs.slice(0, 3));
  await B.close(); fs.rmSync(dir, { recursive: true, force: true });
  T.done();
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
