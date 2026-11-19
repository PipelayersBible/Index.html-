// askgrade #43: Edit Run Data keeps rod shots that agree as field shots, even within 0.005 ft (and a single shot).
// Engineer's rod, HI from stakes: Start stake 103 / C 5 shot 7.000 (HI 110). End stake 104 / C 6 shot 6.000 + OFF.
//   OFF 0 and 0.003: the shots agree (no discrepancy shown); OFF 0.01: they disagree a little (kept before too);
//   End not shot: one shot. After Lock and Edit Run Data's reload, every shot is still a field shot (not faded), still
//   verifies its point, the HI is still worked out from the stakes (110, not the 110.003 laid-to HI typed in), and the
//   reloaded form calculates the locked rows exactly.
const { L, S, lock } = require('./glib');
(async () => {
  const T = await L(); const p = T.p, fails = [];
  const st = () => T.E(() => ({ pts: ['start', 'end'].map(id => ({ id, shot: getElevVal(id + 'StakeReading'), faded: isPredictedFillMarked(id + 'StakeReading'), verified: pointReadingIsVerified(id) })), hi: computeHI(), mode: activeVal('hiToggle') }));
  for (const off of [0, 0.003, 0.01, null]) {
    const tag = off === null ? 'one shot' : 'OFF ' + off;
    const sc = { rod: 'engineer', hiMode: 'stakes', pipeType: 'PVC SDR 35', startSta: null, dir: 1, runs: [{ sizeIn: 8, wallFt: 0.02, bedding: null, trenchWidth: null, dist: 100, interval: 25, lay: null,
      start: S(103, 5, 7), end: off === null ? S(104, 6) : S(104, 6, +(6 + off).toFixed(3)), hubs: [] }] };
    const A = await T.run(sc); if (A.errors) { fails.push(tag + ': ' + A.errors.join(' | ')); continue; }
    const b = await st();
    const E = await lock(p); if (!E) { fails.push(tag + ': not locked'); continue; }
    const rec = await T.E(() => { const e = getCurrentArchiveEntry(); return { hiSrc: e.hiSrc, hi: e.hi, hiLay: e.hiLay, ver: e.intervalRows.filter(r => r.pointId).map(r => r.pointId + ':' + r.verified).join(' ') }; });
    const C = await p.evaluate(() => window.__g2reload());
    const a = await st();
    console.log(tag + ': record HI ' + rec.hi + (rec.hiLay != null ? ' (lay ' + rec.hiLay + ')' : '') + ', kept shots ' + (rec.hiSrc ? Object.keys(rec.hiSrc.shots).join(',') : 'none') + ' | before ' + JSON.stringify(b) + ' | after ' + JSON.stringify(a));
    b.pts.forEach((x, i) => { const y = a.pts[i];
      if (!x.faded && (y.faded || y.verified !== x.verified || Math.abs(y.shot - x.shot) > 1e-9)) fails.push(tag + ': ' + x.id + ' shot ' + x.shot + ' came back ' + JSON.stringify(y));
      if (x.faded && !y.faded) fails.push(tag + ': ' + x.id + ' predicted reading came back as a shot'); });
    if (Math.abs(a.hi - b.hi) > 1e-9 || a.mode !== b.mode) fails.push(tag + ': HI ' + a.hi + ' (' + a.mode + '), was ' + b.hi + ' (' + b.mode + ')');
    if (C.errors) fails.push(tag + ': reloaded errors ' + C.errors.join(' | '));
    else A.rows.forEach((r, i) => { const c = C.rows[i]; ['pi', 'ri', 'rb', 'rt'].forEach(k => { if (!c || Math.abs(c[k] - r[k]) > 1e-9) fails.push(tag + ': reloaded ' + k + ' at ' + r.st + ': ' + (c && c[k]) + ' vs ' + r[k]); }); });
  }
  await T.done(fails);
})();
