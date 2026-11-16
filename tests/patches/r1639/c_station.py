import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)
# The station read goes in the point's Station box (Station mode); its distance is worked out from the Start station.
rep("""    if (dist !== null && p.distField) { const el = document.getElementById(p.distField);""",
    """    const staEl = station && pbStakeAiParseStation(station) !== null ? document.getElementById(prefix + 'StaTxt') : null;
    if (staEl) { const c = staEl.value.trim(); plan.push({ name: 'Station', kind: 'sta', id: staEl.id, val: station, cur: c && pbStakeAiParseStation(c) !== null && Math.abs(pbStakeAiParseStation(c) - pbStakeAiParseStation(station)) > 0.0005 ? c : null }); }
    else if (dist !== null && p.distField) { const el = document.getElementById(p.distField);""")
rep("""        if (x.kind === 'elev') { setOrClearElevField(x.id, x.val, archNow); setPredictedFillMarker(x.id, false); }
        else { const el""", """        if (x.kind === 'elev') { setOrClearElevField(x.id, x.val, archNow); setPredictedFillMarker(x.id, false); }
        else if (x.kind === 'sta') {
          const el = document.getElementById(x.id), w = el && el.closest('.pb-st-wrap');
          if (w && w.dataset.stMode !== 'sta') { const b = w.querySelector('.pb-st-tog button[data-st="sta"]'); if (b) b.click(); }
          if (el) { el.value = x.val; el.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        else { const el""")
open(out, 'w', encoding='utf-8').write(s)
