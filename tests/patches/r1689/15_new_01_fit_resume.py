import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt (Nov 17): fittings were counted again on every later session of a resumed run (rows laid in an earlier session
# read as laid), and a session ended short with no laid marks counted the fittings past its stop point. A session now
# counts only its own part of the run: never the rows an earlier session laid, never rows past where it stopped.
rep("""    const anyLaid = !!(S && S.laid && S.laid.some(t => t !== null && t !== undefined));
    const by = new Map(); let total = 0, joints = 0, planned = 0;
    rows.forEach((r, i) => {
      const f = pbFitOf(entry, r); if (!f) return; planned++;
      if (anyLaid && !(S.laid[i] !== null && S.laid[i] !== undefined)) return;""",
"""    const early = (S && Array.isArray(S.early)) ? S.early : [];
    let anyLaid = !!(S && S.laid && S.laid.some((t, i) => t !== null && t !== undefined && !early[i])); // this session's own marks
    if (!anyLaid && entry && entry.resumedFromId !== undefined && entry.resumedFromId !== null) { try { anyLaid = pbLaidEarlier(entry).times.size > 0; } catch (e) {} } // an earlier session used laid marks: so does this one
    let cap = null; try { cap = pbLaidStopCap(entry); } catch (e) { cap = null; }
    const by = new Map(); let total = 0, joints = 0, planned = 0;
    rows.forEach((r, i) => {
      const f = pbFitOf(entry, r); if (!f) return;
      if (early[i]) return; // laid (and counted) in an earlier session of this run
      planned++;
      if (anyLaid && !(S.laid[i] !== null && S.laid[i] !== undefined)) return;
      if (!anyLaid && cap !== null && Number(r && r.stationFt) > cap + 0.005) return; // ended short, no laid marks: not past the stop""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
