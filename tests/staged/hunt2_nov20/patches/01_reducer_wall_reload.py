# hunt2 01: Edit Run Data / Resume give a mid-run reducer's wall back.
# The record keeps reducers [{run, atFt, idIn, wtFt}] but the loader only restored the fitting text ("12x8"), so the
# wall after the reducer came back as the pipe table's wall (a typed wall was silently replaced: BOP / TOP / subgrade
# after the reducer moved) or blank when the pipe has no table wall (BOP / TOP / SG showed a dash).
from _rep import P
p = P()
p.rep("""    pbXingRestore(entry); /* feat_crossing */
    if (!(opts && opts.open)) {""", """    pbXingRestore(entry); /* feat_crossing */
    try { pbRedRestoreWalls(entry); } catch (e) { console.error(e); } /* hunt2 01 */
    if (!(opts && opts.open)) {""")
p.rep("""  window.pbRedAt = pbRedAt;
""", """  window.pbRedAt = pbRedAt;
  // hunt2 01: the record's reducer walls back on the form (matched by run, size and distance; a wall equal to the pipe
  // table's stays "auto", any other counts as typed, exactly as it was when locked)
  function pbRedRestoreWalls(entry) {
    const list = entry && Array.isArray(entry.reducers) ? entry.reducers : []; if (!list.length) return;
    const used = {};
    for (let n = 1; n <= MAX_SEG; n++) {
      if (n > 1 && !segIsActive(n)) continue;
      const hubs = (n === 1 ? getAllHubPrefixes() : n === 2 ? getAllHub2Prefixes() : getAllHubPrefixesForSeg(n));
      hubs.forEach(h => { try { pbFitBrSync(h); } catch (e) {} });
      pbRedHubs(n).forEach(h => {
        const at = numVal(h + 'Station'), br = Number((document.getElementById(h + 'FitBr') || {}).value), wt = document.getElementById(h + 'RedWT'); if (!wt || at === null) return;
        const k = list.findIndex((x, i) => !used[i] && x && x.run === n && typeof x.atFt === 'number' && Math.abs(x.atFt - at) <= 0.0015 && Math.abs(Number(x.idIn) - br) <= 0.0015); if (k === -1) return;
        used[k] = true; const x = list[k]; if (typeof x.wtFt !== 'number' || !isFinite(x.wtFt)) return;
        let tab = null; try { const L = pbPipeLookup(pbFitLayPipeType(), br); tab = L && L.wallFt ? L.wallFt : null; } catch (e) {}
        wt.value = String(x.wtFt);
        if (tab !== null && Math.abs(tab - x.wtFt) <= 1e-9) wt.dataset.pbAuto = '1'; else delete wt.dataset.pbAuto;
        try { pbRedSync(h); } catch (e) {}
      });
    }
  }
""")
p.save()
