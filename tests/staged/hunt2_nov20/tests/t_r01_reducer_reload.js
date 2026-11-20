// hunt2 01: Edit Run Data gives a mid-run reducer's wall back (hook page: PG=<hook page> PB_ROOT=http://127.0.0.1:PORT/).
// A) Vitrified Clay 27" -> 24" with a typed wall (no table wall): rows after the reducer keep BOP / TOP / SG after reload.
// B) PVC SDR 35 12" -> 8" with a TYPED wall that is not the table's: reload must not swap in the table wall.
// C) the same with the table (auto) wall: stays auto and equal.
const g = require('../../../r1707/askgrade/tests/glib.js');
const fails = []; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails.push(m); };
const S = g.S;
const mk = (type, size, to, wall, typed) => ({ seed: 0, rod: 'engineer', pipeType: type, hiMode: 'direct', hiDirect: 110, startSta: null, dir: 1, staEntry: 'dist',
  runs: [{ n: 1, sizeIn: size, wallFt: 0.1, wallAuto: true, bedding: 0.5, trenchWidth: 3.5, dist: 200, interval: 25, lay: null,
    start: S(105, 5), hubs: [Object.assign(S(104.5, 5), { station: 100, reducer: { toIn: to, wallFt: wall, wallTyped: typed } })], end: S(104, 5) }] });
const key = r => r.rows.map(x => [x.st, x.d.bop, x.d.inv, x.d.top, x.d.sg].join('|')).join('\n');
(async () => {
  const T = await g.L();
  const one = async (name, sc, expectWall, expectAuto, typed) => {
    let a = await T.run(sc);
    // the driver's synthetic input is not a keystroke, so the app keeps the box as "auto": mark it typed the way typing does
    if (typed) a = await T.p.evaluate((w) => window.__ev("(function(){const h=pbRedHubs(1)[0],e=document.getElementById(h+'RedWT');e.value='" + w + "';delete e.dataset.pbAuto;pbRedSync(h);__g2settle();return __g2calc();})()"), typed);
    if (a.errors) { ok(false, name + ': calc errors ' + a.errors); return; }
    const after = a.rows.filter(r => r.st > (sc.runs.length > 1 ? 682.51 : 100));
    ok(after.length > 0 && after.every(r => r.d.bop !== '—' && r.d.top !== '—'), name + ': before Lock, rows after the reducer show BOP and TOP');
    const rec = await g.lock(T.p); ok(!!rec, name + ': locked');
    const b = await T.p.evaluate(() => window.__g2reload());
    ok(!b.errors && key(a) === key(b), name + ': after Edit Run Data every row shows the same BOP / INV / TOP / SG' + (b.errors ? ' (errors ' + b.errors + ')' : ''));
    if (!b.errors && key(a) !== key(b)) { const A = key(a).split('\n'), B = key(b).split('\n'); const i = A.findIndex((x, i) => x !== B[i]); console.log('   first difference: locked  ' + A[i] + '\n                     reloaded ' + B[i]); }
    if (expectWall !== undefined) {
      const w = await T.p.evaluate(() => window.__ev("(function(){const h=pbRedHubs(1)[0],e=document.getElementById(h+'RedWT');return {v:e.value,auto:e.dataset.pbAuto==='1'};})()"));
      ok(Number(w.v) === expectWall && w.auto === expectAuto, name + ': the reducer wall box shows ' + expectWall + (expectAuto ? ' (auto)' : ' (typed)') + ' — got ' + JSON.stringify(w));
    }
    // locking the reloaded form again keeps the same reducer in the record
    const rec2 = await g.lock(T.p);
    const red = await T.p.evaluate(() => window.__ev('JSON.stringify(getCurrentArchiveEntry().reducers||null)'));
    ok(/"wtFt":[0-9.]+/.test(red), name + ': a second Lock still records the reducer wall ' + red);
  };
  await one('A clay 27->24 typed wall', g.gen(25, { rod: 'architect' }));
  await one('B SDR35 12->8 typed 0.05', mk('PVC SDR 35', 12, 8, 0.05, true), 0.05, false, 0.05);
  const tab = await T.p.evaluate(() => window.__ev("pbPipeLookup('PVC SDR 35',8).wallFt"));
  await one('C SDR35 12->8 table wall', mk('PVC SDR 35', 12, 8, tab, false), tab, true);
  // D) Resume (end short at 150 ft, past the reducer, then Resume): the resumed form keeps the typed wall too
  {
    const p = T.p; await T.run(mk('PVC SDR 35', 12, 8, 0.05, true));
    await p.evaluate(() => window.__ev("(function(){const h=pbRedHubs(1)[0],e=document.getElementById(h+'RedWT');e.value='0.05';delete e.dataset.pbAuto;pbRedSync(h);__g2settle();})()"));
    const E = await g.lock(p), k = E.rows.findIndex(r => !r.hub && r.st === 150);
    await p.evaluate(i => window.__g2laid(i), k); await p.waitForTimeout(1200); await g.modals(p);
    const es = await p.evaluate(() => window.__g2endShortOpen(150)); await p.waitForTimeout(1500); await g.modals(p); await p.waitForTimeout(800); await g.modals(p);
    await p.evaluate(() => window.__g2resume()); await p.waitForTimeout(2500); await g.modals(p); await p.waitForTimeout(1000); await g.modals(p);
    const w = await p.evaluate(() => window.__ev("(function(){const h=pbRedHubs(1)[0];if(!h)return null;const e=document.getElementById(h+'RedWT');return {v:e.value,auto:e.dataset.pbAuto==='1',scr:pbCurrentScreen};})()"));
    ok(es && w && Number(w.v) === 0.05 && !w.auto, 'D Resume past the reducer: the resumed form has the typed 0.05 wall — got ' + JSON.stringify(w));
  }
  await T.done(fails);
})();
