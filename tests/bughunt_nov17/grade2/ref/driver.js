// In-page driver (evaluated inside the app's closure through window.__ev, see mkcur.sh): fills the New Run form
// from a scenario the way a person would (toggles clicked, boxes typed, hubs / runs added with the app's own buttons),
// lets the HI / step cascades settle, then returns buildCalc()'s rows, the display strings, stations and volumes.
(function () {
  window.__g2fill = function (sc) {
    pbOpenNewRun({ ask: false });
    const ev = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
    const setv = (id, v) => { const el = document.getElementById(id); if (!el) throw new Error('no field ' + id); el.value = v === null || v === undefined ? '' : String(v); ev(el, 'input'); ev(el, 'change'); };
    const setE = (id, v) => { if (v === null || v === undefined) return; if (document.getElementById(id) && !document.getElementById(id + '_ft')) { setv(id, String(Math.round(v * 1e6) / 1e6)); setPredictedFillMarker(id, false); return; } setElevFieldValue(id, v, isArch()); setPredictedFillMarker(id, false); const el = document.getElementById(id) || document.getElementById(id + '_ft'); if (el) ev(el, 'input'); };
    const tog = (id, val) => { const b = document.querySelector('#' + id + ' button[data-val="' + val + '"]'); if (!b) throw new Error('no toggle ' + id + '=' + val); if (!b.classList.contains('active')) b.click(); };
    try { setv('saJobNumber', '24-017'); setv('saJobsite', 'Test Sewer'); } catch (e) {}
    tog('rodToggle', sc.rod);
    if (sc.rod !== 'lenker') {
      tog('hiToggle', sc.hiMode);
      if (sc.hiMode === 'direct') setE('hiDirect', sc.hiDirect);
      if (sc.hiMode === 'bm') { setE('bmElev', sc.bmElev); setE('bmBS', sc.bmBS); }
    }
    const pt = document.getElementById('runPipeType'); pt.value = sc.pipeType; ev(pt, 'change');
    const sizeSel = (n) => n === 1 ? 'runIdSel' : 'seg' + n + 'IdSel';
    const fillPoint = (pid, p) => {
      if (p.mode === 'step') { tog(pid + 'ModeToggle', 'elev'); return; }
      tog(pid + 'ModeToggle', p.mode);
      if (p.mode === 'stake') { setE(pid + 'StakeElev', p.stakeElev); const cf = document.getElementById(pid + 'CutFill'); cf.value = p.cf; ev(cf, 'change'); setE(pid + 'CutFillVal', p.cfVal); if (p.shot !== null && p.shot !== undefined) setE(pid + 'StakeReading', p.shot); }
      else { if (p.elev !== null && p.elev !== undefined) setE(pid + 'Elev', p.elev); if (p.elevReading !== null && p.elevReading !== undefined) setE(pid + 'ElevReading', p.elevReading); }
    };
    const staTxtOn = sc.startSta !== null && sc.startSta !== undefined;
    sc.runs.forEach((run, i) => {
      const n = i + 1, P = n === 1 ? '' : 'seg' + n;
      if (n === 2) pbAddReducerSegment(); else if (n > 2) pbAddSeg(n);
      const ss = document.getElementById(sizeSel(n)); ss.value = String(run.sizeIn); ev(ss, 'change');
      if (!run.wallAuto) setv(n === 1 ? 'runWT' : P + 'WT', run.wallFt);
      if (run.bedding !== null) setv(n === 1 ? 'runBedding' : P + 'Bedding', run.bedding);
      if (run.trenchWidth !== null) setv(n === 1 ? 'runTrenchWidth' : P + 'TrenchWidth', run.trenchWidth);
      setv(n === 1 ? 'totalDist' : P + 'TotalDist', run.dist);
      if (run.lay && run.lay.on) { const ids = pbLayIds(n); document.getElementById(ids.use).checked = true; ev(document.getElementById(ids.use), 'change'); setv(ids.len, run.lay.len); const d = document.getElementById(ids.div); d.value = run.lay.div; ev(d, 'change'); }
      else { setv(n === 1 ? 'interval' : P + 'Interval', run.interval); const ids = pbLayIds(n); const u = document.getElementById(ids.use); if (u && u.checked) { u.checked = false; ev(u, 'change'); } }
      if (n === 1 && staTxtOn) { setv('startStaTxt', pbStFmt(sc.startSta)); }
      fillPoint(n === 1 ? 'start' : 'seg' + n + 'start', run.start);
      if (run.start.mode === 'step') setE(n === 2 ? 'reducerStep' : 'seg' + n + 'Step', run.start.step);
      run.hubs.forEach(h => {
        if (n === 1) pbAddHub(); else if (n === 2) pbAddHub2(); else pbAddHubN(n);
        const hid = pbStHubs(n).slice(-1)[0]; h.id = hid;
        if (staTxtOn && sc.staEntry === 'sta' && n === 1) { pbStSetMode(hid, 'sta', true); setv(hid + 'StaTxt', pbStFmt(sc.startSta + sc.dir * h.station)); }
        else setv(hid + 'Station', h.station);
        fillPoint(hid, h);
        if (h.reducer) {
          const on = document.getElementById(hid + 'FitOn'); on.checked = true; ev(on, 'change');
          const t = document.getElementById(hid + 'FitType'); t.value = 'reducer'; ev(t, 'change');
          const br = document.getElementById(hid + 'FitBr'); if (![...br.options].some(o => o.value === String(h.reducer.toIn))) { const o = document.createElement('option'); o.value = String(h.reducer.toIn); o.textContent = h.reducer.toIn + '"'; br.appendChild(o); }
          br.value = String(h.reducer.toIn); ev(br, 'change');
          if (h.reducer.wallTyped) setv(hid + 'RedWT', h.reducer.wallFt);
        }
      });
      const eid = n === 1 ? 'end' : 'seg' + n + 'end';
      if (n === 1 && staTxtOn && sc.staEntry === 'sta') { pbStSetMode('end', 'sta', true); setv('endStaTxt', pbStFmt(sc.startSta + sc.dir * run.dist)); }
      fillPoint(eid, run.end);
    });
    if (staTxtOn && sc.staEntry !== 'sta') { pbStDirSet(1, sc.dir); }
    __g2settle();
  };
  window.__g2settle = function () {
    for (let k = 0; k < 3; k++) { try { updateReducerDerived(); } catch (e) {} for (let n = 3; n <= MAX_SEG; n++) { if (segIsActive(n)) try { updateSegDerived(n); } catch (e) {} } runHiCascade(); }
    clearTimeout(hiCascadeTimer); clearTimeout(reducerCascadeTimer);
  };
  window.__g2rec = function () { const e = getCurrentArchiveEntry(); if (!e || e.kind !== 'run') return null; const f = pbStRowStaFn(e); return { id: e.id, hi: e.hi, rows: e.intervalRows.map(r => ({ st: r.stationFt, pi: r.piFt, bop: r.bop, inv: r.inv, top: r.top, sg: r.sgDisp, hub: r.pointId })), sta: e.intervalRows.map(f), vol: e.volumeYd3, bed: e.beddingVolumeYd3 }; };
  window.__g2reload = function () { const e = getCurrentArchiveEntry(); pbLoadRunIntoForm(e); __g2settle(); return __g2calc(); };
  window.__g2review = function () { pbReview(); };
  window.__g2lock = function () { pbLock(); };
  window.__g2laid = function (idx) { return pbLaidApply(currentRunArchiveId, idx, true, true, 'test'); };
  window.__g2endShortOpen = function (ft) { pbToggleEndIncomplete(); const s = document.getElementById('endIncompleteStation'); const o = [...s.options].find(o => o.getAttribute('data-station-ft') === String(ft)); if (!o) return false; s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); pbEndRunIncomplete(); return true; };
  window.__g2resume = function () { const i0 = runArchive.findIndex(x => x === getCurrentArchiveEntry()); window.pbResumeIncompleteRun(i0); return i0; };
  window.__g2leftOff = function () { const all = ['start'].concat(getAllHubPrefixes()); for (let n = 2; n <= MAX_SEG; n++) if (segIsActive(n)) all.push(...getAllHubPrefixesForSeg(n)); const h = all.find(x => /Left off/i.test(getPointLabel(x, ''))) || null; return h ? { id: h, mode: activeVal(h + 'ModeToggle'), elev: getElevVal(h + 'Elev'), screen: pbCurrentScreen } : { id: null, screen: pbCurrentScreen, labels: all.map(x => x + ':' + getPointLabel(x, '')) }; };
  window.__g2shot = function (id, v) { const arch = isArch(); setElevFieldValue(id + 'ElevReading', v, arch); setPredictedFillMarker(id + 'ElevReading', false); __g2settle(); return __g2calc(); };
  window.__g2flip = function () { pbFlipRunDirection(); __g2settle(); return __g2calc(); };
  window.__g2calc = function () {
    const c = buildCalc();
    if (c.errors && c.errors.length) return { errors: c.errors };
    lastCalc = c;
    const fake = { runStations: pbStCapture(c), intervalRows: c.rows.map(r => ({ stationFt: r.station, pointId: r.hubId })) };
    const staFn = pbStRowStaFn(fake);
    let vol = null, bed = null; try { vol = computeCutFillVolume(c); } catch (e) { vol = { err: String(e) }; } try { bed = pbBeddingVolume(c); } catch (e) { bed = { err: String(e) }; }
    return {
      rod: c.rodUnit, hi: c.hi, hiLay: c.hiLay, total: c.totalDist,
      points: c.points.map(p => ({ id: p.id, st: p.station, pi: p.pi, rd: p.reading, wt: p.wt, idFt: p.idFt })),
      rows: c.rows.map(r => ({ st: r.station, pi: r.pi, bp: r.bp, tp: r.tp, sg: r.sg, ri: r.invReading, rb: r.bopReading, rt: r.topReading, rs: r.sgReading, hub: r.hubId,
        d: { bop: dispRow(r, 'bop', c), inv: dispRow(r, 'inv', c), top: dispRow(r, 'top', c), sg: dispRow(r, 'sg', c), elev: c.rodUnit !== 'lenker' ? fmt(r.pi, 2) : null }, sta: staFn({ stationFt: r.station, pointId: r.hubId }) })),
      warn: c.warnings.map(w => w.type + ': ' + w.text), notes: c.capabilityNotes,
      vol: vol && { yd3: vol.volumeYd3, inc: vol.volumeIncomplete, cut: vol.totalCut, fill: vol.totalFill, err: vol.err }, bed: bed && { yd3: bed.yd3 !== undefined ? bed.yd3 : bed.beddingVolumeYd3, inc: bed.incomplete !== undefined ? bed.incomplete : bed.beddingVolumeIncomplete, err: bed.err },
      runStations: fake.runStations
    };
  };
})();
