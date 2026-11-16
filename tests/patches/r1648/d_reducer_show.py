import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:90])
    s = s.replace(old, new)
# the reducers on the form, as words: ', then 8" (0.020 ft wall) after 100.0 ft'
rep("""  window.pbRedAt = pbRedAt;""", """  window.pbRedAt = pbRedAt;
  function pbRedList() { const out = []; for (let n = 1; n <= MAX_SEG; n++) { if (n > 1 && !segIsActive(n)) continue; pbRedHubs(n).forEach(h => { const r = pbRedAt(h, true), at = numVal(h + 'Station'); if (r && at !== null) out.push({ run: n, atFt: at, idIn: Math.round(r.idFt * 12 * 1000) / 1000, wtFt: r.wt, label: getPointLabel(h, 'Reducer') }); }); } return out; }
  function pbRedWords(list, run) { return (list || []).filter(x => x && (run === undefined || x.run === run)).sort((a, b) => a.atFt - b.atFt).map(x => ', then ' + x.idIn + '" ID' + (typeof x.wtFt === 'number' ? ' (' + x.wtFt.toFixed(3) + ' ft wall)' : '') + ' after ' + fmt(x.atFt, 1) + ' ft').join(''); }""")
rep("""<div class="v">${r.point.idFt !== null ? fmt(r.point.idFt*12,2) : '\\u2014'}"</div></div>`""",
    """<div class="v">${r.point.idFt !== null ? fmt(r.point.idFt*12,2) : '\\u2014'}"${escapeHtml(pbRedWords(pbRedList(), (/^seg(\\d+)/.exec(r.point.id) || [0, 1])[1] * 1))}</div></div>`""")
rep("""    lockedEntry.pipeType = pbPtVal();""", """    try { const rl = pbRedList(); if (rl.length) lockedEntry.reducers = rl; else delete lockedEntry.reducers; } catch (e) {} // r16.48
    lockedEntry.pipeType = pbPtVal();""")
rep("""<div class="v">${p.idIn !== null ? fmt(p.idIn,2) + '"' : '\\u2014'}</div></div>`).join('');""",
    """<div class="v">${p.idIn !== null ? fmt(p.idIn,2) + '"' : '\\u2014'}${escapeHtml(pbRedWords(entry.reducers, pipeInfo.length > 1 ? ((/(\\d+)$/.exec(p.label || '') || [0, 1])[1] * 1) : undefined))}</div></div>`).join('');""")
rep("""'wall not recorded')).join('; ');
    R.kv([""", """'wall not recorded') + pbRedWords(e.reducers, pipe.length > 1 ? ((/(\\d+)$/.exec(p.label || '') || [0, 1])[1] * 1) : undefined)).join('; ');
    R.kv([""")
open(out, 'w', encoding='utf-8').write(s)
