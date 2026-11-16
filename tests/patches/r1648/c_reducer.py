import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:90])
    s = s.replace(old, new)

# 1. the calc: a reducer hub changes the pipe (ID and wall) from that point on, within its run
rep("""  function getPointWT(prefix) { const n = segNumFromPrefix(prefix); return n ? numVal('seg' + n + 'WT') : numVal('runWT'); }""",
"""  function getPointWT(prefix) { const r = pbRedAt(prefix, true); if (r) return r.wt; const n = segNumFromPrefix(prefix); return n ? numVal('seg' + n + 'WT') : numVal('runWT'); }
  // r16.48: reducers. A hub whose fitting is a Reducer with its "reduces to" size picked: the pipe from that point on (in
  // the same run) is that size, with the wall typed under it or the pipe index's. inclusive = the reducer's own point
  // counts (the pipe leaving it); not = the pipe arriving at it (a fitting's own main size).
  function pbRedHubs(n) { try { return (n === 1 ? getAllHubPrefixes() : n === 2 ? getAllHub2Prefixes() : getAllHubPrefixesForSeg(n)).filter(h => { const on = document.getElementById(h + 'FitOn'), t = document.getElementById(h + 'FitType'), b = document.getElementById(h + 'FitBr'); return on && on.checked && t && t.value === 'reducer' && b && b.value; }); } catch (e) { return []; } }
  function pbRedAt(prefix, inclusive) {
    const p = String(prefix || ''); if (/^(seg\\d+)?start$/.test(p)) return null;
    const n = segNumFromPrefix(p) || (/^seg(\\d+)/.exec(p) ? Number(/^seg(\\d+)/.exec(p)[1]) : 1), hubs = pbRedHubs(n); if (!hubs.length) return null;
    const at = /end$/.test(p) ? numVal(distanceFieldIdForRun(n)) : numVal(p + 'Station'); if (at === null) return null;
    let best = null, bestAt = -Infinity;
    hubs.forEach(h => { const hs = numVal(h + 'Station'); if (hs === null) return; if ((hs < at - 1e-6 || (inclusive && h === p)) && hs >= bestAt) { bestAt = hs; best = h; } });
    if (!best) return null;
    const br = Number((document.getElementById(best + 'FitBr') || {}).value); if (!(br > 0)) return null;
    let wt = numVal(best + 'RedWT'); if (wt === null) { try { const L = pbPipeLookup(pbFitLayPipeType(), br); wt = L ? L.wallFt : null; } catch (e) { wt = null; } }
    return { hub: best, idFt: br / 12, wt };
  }
  window.pbRedAt = pbRedAt;""")
rep("""  function getPointIdFt(prefix) {
    const n = segNumFromPrefix(prefix);""", """  function getPointIdFt(prefix) {
    { const r = pbRedAt(prefix, true); if (r) return r.idFt; } // r16.48: after a reducer
    return pbPointIdFtIn(prefix);
  }
  function pbPointIdFtIn(prefix) { // the pipe arriving at a point (a reducer's own main size)
    { const r = pbRedAt(prefix, false); if (r) return r.idFt; }
    const n = segNumFromPrefix(prefix);""")
# fittings use the pipe arriving at the hub
rep("""  function pbFitBrMain(prefix) { try { const f = getPointIdFt(prefix);""", """  function pbFitBrMain(prefix) { try { const f = pbPointIdFtIn(prefix);""")
rep("""    let id = null; try { const f = getPointIdFt(prefix); id = f === null ? null : f * 12; } catch (e) { id = null; }
    const brNeed""", """    let id = null; try { const f = pbPointIdFtIn(prefix); id = f === null ? null : f * 12; } catch (e) { id = null; }
    const brNeed""")
rep("""      let id = null; try { const f = getPointIdFt(prefix); id = f === null ? null : f * 12; } catch (e) {}
      const pipe = pbFitLayPipeType();""", """      let id = null; try { const f = pbPointIdFtIn(prefix); id = f === null ? null : f * 12; } catch (e) {}
      const pipe = pbFitLayPipeType();""")

# 2. the hub card: under a reducer, the pipe after it (size from "Reduces to", wall auto or typed)
rep("""      + '<div class="pb-field pb-fit-angw" id="' + prefix + 'FitAngW" style="display:none;">""",
    """      + '<div class="pb-red-after" id="' + prefix + 'RedW" style="display:none;"><p class="pb-red-line" id="' + prefix + 'RedLine"></p><div class="pb-field"><label for="' + prefix + 'RedWT">Wall after this point</label><div class="pb-unitbox"><input type="number" step="0.001" min="0" inputmode="decimal" enterkeyhint="next" id="' + prefix + 'RedWT" autocomplete="off" placeholder="auto"><span class="pb-unit" aria-hidden="true">ft</span></div></div></div>'
      + '<div class="pb-field pb-fit-angw" id="' + prefix + 'FitAngW" style="display:none;">""")
rep("""    sel.value = cur && Array.from(sel.options).some(o => o.value === cur) ? cur : '';
  }""", """    sel.value = cur && Array.from(sel.options).some(o => o.value === cur) ? cur : '';
    pbRedSync(prefix);
  }
  // r16.48: the reducer's "after this point" line and its wall (the pipe index's, until typed)
  function pbRedSync(prefix) {
    const w = document.getElementById(prefix + 'RedW'), t = document.getElementById(prefix + 'FitType'), sel = document.getElementById(prefix + 'FitBr'), on = document.getElementById(prefix + 'FitOn');
    if (!w || !t || !sel) return;
    const show = !!(on && on.checked && t.value === 'reducer' && sel.value);
    w.style.display = show ? '' : 'none'; if (!show) return;
    const wt = document.getElementById(prefix + 'RedWT'), ln = document.getElementById(prefix + 'RedLine');
    let L = null; try { L = pbPipeLookup(pbFitLayPipeType(), Number(sel.value)); } catch (e) {}
    if (wt && (wt.value === '' || wt.dataset.pbAuto === '1')) { const v = L && L.wallFt ? String(L.wallFt) : ''; if (wt.value !== v) wt.value = v; if (v) wt.dataset.pbAuto = '1'; else delete wt.dataset.pbAuto; }
    if (ln) ln.textContent = 'Pipe after this point: ' + sel.value + '" ID' + (wt && wt.value ? ', ' + wt.value + ' ft wall' + (wt.dataset.pbAuto === '1' ? ' (auto)' : '') : '');
  }
  document.addEventListener('input', (ev) => { const m = ev.target && ev.target.id && /^(.*)RedWT$/.exec(ev.target.id); if (m) { if (ev.isTrusted !== false) delete ev.target.dataset.pbAuto; pbRedSync(m[1]); try { scheduleHiCascade(); } catch (e) {} } }, true);""")
rep("""#pbApp#pbApp #screen-input .pb-rs-slope:empty { display: none; }""", """#pbApp#pbApp #screen-input .pb-rs-slope:empty { display: none; }
#pbApp#pbApp #screen-input .pb-red-after { grid-column: 1 / -1; margin: 0 0 8px 0; padding: 8px 10px; border: 1px solid var(--pb-divider); border-radius: 8px; }
#pbApp#pbApp #screen-input .pb-red-after .pb-red-line { margin: 0 0 6px 0; font-weight: 600; color: var(--pb-text); }
#pbApp#pbApp #screen-input .pb-red-after .pb-field { margin: 0; max-width: 50%; }""")
open(out, 'w', encoding='utf-8').write(s)
