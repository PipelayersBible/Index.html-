import sys
src,out=sys.argv[1],sys.argv[2]; s=open(src,encoding='utf-8').read()
def rep(a,b):
    global s; n=s.count(a); assert n==1,(n,a[:70]); s=s.replace(a,b)
# 1. a resumed run's form is kept as a draft once something is typed on it
rep("""      return pbFormFresh && !window._pbResumingFromEntryId && hasUnsavedRunData({ fieldsOnly: true }) && !pbFormIsSavedLockedRun();""",
"""      const rs = !!window._pbResumingFromEntryId; /* feat_r1612 (B10): a resumed run with something typed on it is kept too */
      if (rs && window._pbResumeFormKey && pbFormStateKey() === window._pbResumeFormKey) return false;
      return (rs || pbFormFresh) && hasUnsavedRunData({ fieldsOnly: true }) && !pbFormIsSavedLockedRun();""")
rep("""      photoCount, cutsheet: cs && cs.aiText.length < 200000 ? cs : null, st: pbStDraftSnap(), pa: pbPiAAutoIds(), pt: pbPtAuto() }; /* feat_results2: st; feat_pipeauto: pa */""",
"""      photoCount, cutsheet: cs && cs.aiText.length < 200000 ? cs : null, st: pbStDraftSnap(), pa: pbPiAAutoIds(), pt: pbPtAuto(), /* feat_results2: st; feat_pipeauto: pa */
      rs: window._pbResumingFromEntryId ? { from: window._pbResumingFromEntryId } : undefined }; /* feat_r1612 (B10): the run this form continues */""")
# 2. hubs already on the form (a resumed run's own) are reused, in order
rep("""  function pbRdApply(d) {""", """  function pbRdApply(d, reuse) {""")
rep("""    Object.keys(d.hubs || {}).map(Number).sort((x, y) => x - y).forEach(n => {
      (d.hubs[n] || []).forEach(h => {
        if (n === 1) pbAddHub(); else if (n === 2) pbAddHub2(); else pbAddHubN(n);
        const list = pbRdHubList(n), id = list[list.length - 1];""",
"""    Object.keys(d.hubs || {}).map(Number).sort((x, y) => x - y).forEach(n => {
      const have = reuse ? pbRdHubList(n).slice() : [];
      (d.hubs[n] || []).forEach((h, i) => {
        let id = have[i];
        if (!id) { if (n === 1) pbAddHub(); else if (n === 2) pbAddHub2(); else pbAddHubN(n); const list = pbRdHubList(n); id = list[list.length - 1]; }""")
# 3. restoring a resumed run's draft: the run is continued again, then the draft's values go on top
rep("""    if (d.startedAt && runArchive.some(e => e && e.kind === 'run' && e.runStartTime === d.startedAt)) {""",
"""    const rsE = d.rs && d.rs.from !== undefined && d.rs.from !== null ? runArchive.find(e => e && e.kind === 'run' && e.id === d.rs.from) : null; /* feat_r1612 (B10) */
    if (d.rs && (!rsE || !rsE.incomplete || pbLiveResumeOf(rsE) || pbUnsavedResumeOf(rsE.id))) {
      pbShowModal('The run this draft continued was already finished or continued, so it can\\u2019t be continued again.', [
        { label: 'Keep Draft' },
        { label: 'Discard Draft', primary: true, onClick: () => pbRd.remove(a, id) }
      ], 'Run Already Continued');
      return false;
    }
    if (!rsE && d.startedAt && runArchive.some(e => e && e.kind === 'run' && e.runStartTime === d.startedAt)) {""")
rep("""    pbRd.restoring = false;
    pbResetRunForm(); // the run on the form now (a saved draft) is kept
    pbRd.restoring = true;
    let ok = true;
    try { pbRdApply(d); } catch (e) { ok = false; console.error('Run draft restore failed:', e); } finally { pbRd.restoring = false; }""",
"""    pbRd.restoring = false;
    if (rsE) { // feat_r1612 (B10): continued exactly as Resume does (its form, the Left off point), quietly
      pbRd.restoring = true;
      try {
        pbLoadRunIntoForm(rsE, { open: true });
        const lo = (() => { try { return window.pbRsStopHub(rsE); } catch (e) { console.error(e); return null; } })();
        window._pbResumingFromEntryId = rsE.id; window._pbResumingFromLabel = pbResumedFromLabel(rsE);
        try { setTimeout(() => window.pbRsEarlyFold(rsE), 0); } catch (e) {}
        try { setTimeout(() => window.pbRsxResumeFold(rsE, lo), 0); } catch (e) {}
        window._pbResumeFormKey = null;
      } catch (e) { console.error(e); }
    } else pbResetRunForm(); // the run on the form now (a saved draft) is kept
    pbRd.restoring = true;
    let ok = true;
    try { pbRdApply(d, !!rsE); } catch (e) { ok = false; console.error('Run draft restore failed:', e); } finally { pbRd.restoring = false; }""")
open(out,'w',encoding='utf-8').write(s); print('ok')
