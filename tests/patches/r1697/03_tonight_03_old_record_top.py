import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt tonight 03: a run locked before r16.90 (TOP = INV + size + wall; its record has no odIn) keeps that TOP while
# its own record is on the form (Edit Run Data, Fix a Distance or Hub, Add Interval, the send-back fix, after a restart):
# the app's checks that the form still IS that run compare every row's TOP, so the new OD made every such run "another
# run" (Add Interval and corrections refused, an unchanged re-lock offered Replace and rewrote the TOP column).
# New Run, Resume, Reuse and Duplicate start a new form generation and use the real OD.
rep("""    if (od && (w === null || od / 12 - 2 * w > 0)) return od / 12;""",
    """    if (pbLegacyTopGen !== null && pbLegacyTopGen === pbFormGen) return w === null ? null : idFt + 2 * w; // bughunt: a pre-r16.90 record's own form
    if (od && (w === null || od / 12 - 2 * w > 0)) return od / 12;""")
rep("""  function pbPipeOdIn(type, sizeIn, wFt) {""",
    """  var pbLegacyTopGen = null; // bughunt: the form generation holding a record locked before r16.90 (its TOP = INV + size + wall)
  function pbTopPreOd(entry) { const pi = entry && entry.summary && Array.isArray(entry.summary.pipeInfo) ? entry.summary.pipeInfo : []; return !!entry && entry.kind === 'run' && pi.some(x => x && typeof x.wtFt === 'number' && typeof x.idIn === 'number') && !pi.some(x => x && typeof x.odIn === 'number'); } // had a TOP, and no OD recorded
  function pbPipeOdIn(type, sizeIn, wFt) {""")
# the record says which OD its TOP used only when it used the real one
rep("""      ...((() => { const o = r.point.idFt !== null && r.point.wt !== null ? pbPipeOdFt(r.point.idFt, r.point.wt) : null; return o !== null ? { odIn: Math.round(o * 12 * 1000) / 1000 } : {}; })()), /* r16.90: OD used for TOP */""",
    """      ...((() => { const o = r.point.idFt !== null && r.point.wt !== null && !(pbLegacyTopGen !== null && pbLegacyTopGen === pbFormGen) ? pbPipeOdFt(r.point.idFt, r.point.wt) : null; return o !== null ? { odIn: Math.round(o * 12 * 1000) / 1000 } : {}; })()), /* r16.90: OD used for TOP */""")
rep("""    pbFormGen++;
    if (opts && opts.open) pbOpenNewRun(); else pbResetRunForm();
""", """    pbFormGen++;
    if (opts && opts.open) pbOpenNewRun(); else pbResetRunForm();
    pbLegacyTopGen = !(opts && opts.open) && pbTopPreOd(entry) ? pbFormGen : null; // bughunt: its own form keeps its TOP
""")
open(out, 'w', encoding='utf-8').write(s)
