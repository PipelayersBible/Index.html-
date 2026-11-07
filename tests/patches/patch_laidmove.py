import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    n = s.count(a); assert n == 1, (n, a[:80]); s = s.replace(a, b)

# 1. call it in the correction, after rows and notes are settled
rep("""    const coveredOff = pbSaveCoveredNotesWaiting(entry, notesWaiting, plainMoves, waitingOff);
""", """    const coveredOff = pbSaveCoveredNotesWaiting(entry, notesWaiting, plainMoves, waitingOff);
    const laidMoved = pbLaidRekeyAfterCorrection(entry, preRefs.intervalRows || [], calc); // feat_laidmove
""")
rep("""    pbMoveNotesWaiting(entry, notesWaiting, plainMoves); // saved: what still waits for a moved point follows it
""", """    pbMoveNotesWaiting(entry, notesWaiting, plainMoves); // saved: what still waits for a moved point follows it
    if (laidMoved) { try { Promise.resolve(pbLiveNoteRun(entry)).catch(e => console.error(e)); } catch (e) { console.error(e); } } // feat_laidmove: the live status shows the moved laid footage
""")
# 2. the function, next to pbManualStationAfter
rep("""  function pbManualStationAfter(oldRows, calc, stationFt) {""", """  // ==== feat_laidmove (owner, Nov 7 2026: B03) ====
  // A distance or hub correction moves the laid marks with what was laid. A point (hub, Start/End, an added point)
  // keeps its mark wherever it is corrected to; a plain row's mark goes to the same distance into its own run (like
  // its notes). Laid past the corrected end of its run = laid to that run's end. Laying is always from the start, so a
  // row left unmarked before a laid one (a hub corrected past unlaid rows, or back behind laid ones) is laid too, with
  // the time of the next laid row. Rows laid in an earlier session stay theirs. True when the marks changed.
  function pbLaidRekeyAfterCorrection(entry, oldRows, calc) {
    const L = entry && entry.laid;
    if (!L || !L.marks || typeof L.marks !== 'object' || !Object.keys(L.marks).length || !calc || !Array.isArray(calc.points)) return false;
    const rows = Array.isArray(entry.intervalRows) ? entry.intervalRows : [];
    const keyOf = new Map(rows.map(r => [pbLaidKey(r), r]));
    const nm = {}, put = (k, t) => { if (typeof nm[k] !== 'number' || t < nm[k]) nm[k] = t; };
    oldRows.forEach(r => {
      const k = pbLaidKey(r), t = L.marks[k];
      if (typeof t !== 'number' || !Number.isFinite(t)) return;
      if (r.pointId && keyOf.has(k)) { put(k, t); return; } // the point itself, where it is now
      const f = Number(r.stationFt); if (!Number.isFinite(f)) return;
      const own = pbPlainOwnStart(oldRows, f), p = own ? calc.points.find(pt => pt.id === own.pointId) : null;
      const ft = p ? Math.round((f - own.stationFt + p.station) * 1e6) / 1e6 : f;
      const end = pbPlainRunEnd(oldRows, calc, f);
      if (ft > end + 0.005) { // past its run's corrected end: laid to that end
        const m = own && /^seg(\\d+)start$/.exec(own.pointId || ''), endId = m ? 'seg' + m[1] + 'end' : 'end';
        const er = rows.find(x => x.pointId === endId); if (er) put(pbLaidKey(er), t);
        return;
      }
      const hit = rows.find(x => !/^seg\\d+start$/.test(x.pointId || '') && Math.abs(Number(x.stationFt) - ft) < 0.005) || rows.find(x => Math.abs(Number(x.stationFt) - ft) < 0.005);
      if (hit) put(pbLaidKey(hit), t);
    });
    let E = null; try { E = entry.resumedFromId !== undefined && entry.resumedFromId !== null ? pbLaidEarlier(entry) : null; } catch (e) { E = null; }
    const early = (r) => !!E && E.reach !== null && Number(r.stationFt) <= E.reach + 0.005;
    let nextT = null;
    for (let i = rows.length - 1; i >= 0; i--) { // no gaps before a laid row
      const r = rows[i]; if (early(r)) continue; const k = pbLaidKey(r);
      if (typeof nm[k] === 'number') nextT = nextT === null ? nm[k] : Math.min(nextT, nm[k]);
      else if (nextT !== null) nm[k] = nextT;
    }
    const a = JSON.stringify(Object.keys(L.marks).sort().map(k => [k, L.marks[k]])), b = JSON.stringify(Object.keys(nm).sort().map(k => [k, nm[k]]));
    if (a === b) return false;
    entry.laid = { ...L, marks: nm, log: Array.isArray(L.log) ? L.log.slice() : [] };
    return true;
  }
  window.__pbLaidRekey = pbLaidRekeyAfterCorrection;
  function pbManualStationAfter(oldRows, calc, stationFt) {""")
open(out, 'w', encoding='utf-8').write(s)
print('ok')
