import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt (Nov 17): a break still running when the run is ended (the next-day "Where Did This Run End?" question, or any
# end that doesn't pass through the covered Results screen) ends WITH the run, at the run's end time. Before: the ended
# run stayed "On Break", its Results stayed covered, and End Break saved a break running long past the run's end.
# - the end closes the open break (undone with the end if the save fails);
# - a break's start / end counts as activity, so an end time before it is refused like one before a laid mark;
# - an ended run is never covered or shown as "On break" (records already saved that way by r16.88), and its stats
#   stop the open break at the run's end.
rep("""'_statsDurationSynced', '_statsFootageSynced', 'reportSendWanted', 'rfWho' /* feat_runflow P1; review S3 */].forEach(k => { endUndo.fields[k] =""",
    """'_statsDurationSynced', '_statsFootageSynced', 'reportSendWanted', 'rfWho' /* feat_runflow P1; review S3 */, 'onBreak', 'breaks' /* bughunt: an open break ends with the run */].forEach(k => { endUndo.fields[k] =""")
rep("""        entry.runEndTime = now.getTime();
        if (typeof endAt === 'number') entry.endTimeEntered = true; else delete entry.endTimeEntered;""",
    """        entry.runEndTime = now.getTime();
        if (entry.onBreak && entry.onBreak.start) { // bughunt: the break ends with the run, at the run's end
          const ob = entry.onBreak; delete entry.onBreak;
          if (entry.runEndTime > ob.start) entry.breaks = (Array.isArray(entry.breaks) ? entry.breaks : []).concat([{ start: ob.start, end: entry.runEndTime, by: ob.by || null, endedBy: 'run-end' }]).slice(-200);
        }
        if (typeof endAt === 'number') entry.endTimeEntered = true; else delete entry.endTimeEntered;""")
rep("""    try { Object.values(pbLaidMarks(entry)).forEach(v => { if (typeof v === 'number' && isFinite(v) && v > t && v <= Date.now()) t = v; }); } catch (e) {} /* fix_stopq: a pipe marked laid is work on the run, whenever it was */""",
    """    try { Object.values(pbLaidMarks(entry)).forEach(v => { if (typeof v === 'number' && isFinite(v) && v > t && v <= Date.now()) t = v; }); } catch (e) {} /* fix_stopq: a pipe marked laid is work on the run, whenever it was */
    try { (Array.isArray(entry.breaks) ? entry.breaks.map(b => b && b.end) : []).concat(entry.onBreak ? [entry.onBreak.start] : []).forEach(v => { if (typeof v === 'number' && isFinite(v) && v > t && v <= Date.now()) t = v; }); } catch (e) {} /* bughunt: so is a break tapped on it */""")
rep("""if (entry && entry.onBreak && entry.onBreak.start) L.push([entry.onBreak.start, now || Date.now()]); return L; }""",
    """if (entry && entry.onBreak && entry.onBreak.start) L.push([entry.onBreak.start, (entry.completed || entry.incomplete) && typeof entry.runEndTime === 'number' ? Math.max(entry.runEndTime, entry.onBreak.start) : (now || Date.now())]); return L; }""")
rep("""    const e = pbCurrentScreen === 'results' ? getCurrentArchiveEntry() : null, b = e && e.kind === 'run' ? e.onBreak : null;
    let el = document.getElementById('pbBrk');""",
    """    const e = pbCurrentScreen === 'results' ? getCurrentArchiveEntry() : null, b = e && e.kind === 'run' && !(e.completed || e.incomplete) ? e.onBreak : null; /* bughunt: an ended run is never covered */
    let el = document.getElementById('pbBrk');""")
rep("""    const e = getCurrentArchiveEntry(); if (!e || e.kind !== 'run' || !e.onBreak) return null;
    const m = Math.max(0, Math.floor((Date.now() - e.onBreak.start) / 60000));""",
    """    const e = getCurrentArchiveEntry(); if (!e || e.kind !== 'run' || !e.onBreak || e.completed || e.incomplete) return null;
    const m = Math.max(0, Math.floor((Date.now() - e.onBreak.start) / 60000));""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
