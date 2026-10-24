#!/usr/bin/env python3
"""feat_run33 (r15.33, from the overnight pipe-run sweep, /home/claude/night/run.md):
 1 [DATA] Edit Run Data, fix a typo, Lock: a second record of the same run that counts twice in Stats. An un-ended run
   nobody has worked on (no notes, laid marks, crew, corrections, resume links) is now asked Replace / Keep Both / Cancel;
   Replace takes the earlier record out of Records and Stats in the same Lock (and the corrected run keeps its cloud id).
 2 [FUNCTION] After a restart (or once another run was started) the locked run could not be corrected, given an interval
   or edited: the form rebuild of Resume is now pbLoadRunIntoForm(entry); Correct a Distance or Hub, Add Interval and
   Edit Run Data load the record back onto the form first.
"""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))

# ---------------------------------------------------------------- 2: pbLoadRunIntoForm, factored out of Resume
r('F2a', """    // Added points are carried whether or not they were given a label;
    // plain interval rows (no label, not added) are rebuilt from the interval.
    const realRows = entry.intervalRows.filter(r => r.label || r.addedTime);""",
"""    if (!pbNewRunGuardPassed && pbNewRunNeedsAnswer({}, () => pbNewRunAfterAnswer(() => { const j = runArchive.indexOf(entry); if (j !== -1) pbResumeIncompleteRun(j); }))) return; // crew-sweep2: ask first
    const additionalRunNums = pbLoadRunIntoForm(entry, { open: true }).additionalRunNums; /* feat_run33 (2) */
    window._pbResumingFromEntryId = entry.id;
    window._pbResumingFromLabel = pbResumedFromLabel(entry);
    window._pbResumeFormKey = pbFormStateKey(); /* feat_run33 (9): the form as Resume left it (nothing new typed yet) */
    pbAlert((entry.rodUnit === 'lenker'
      ? 'Elevations are pre-filled from the earlier run' + (entry.stoppedAtStation ? ' \\u2014 ' + entry.stoppedAtStation + ' is where you left off' : '') + '. Check them, then Lock to continue it.'
      : 'Elevations are pre-filled from the earlier run \\u2014 shoot ONE fresh rod reading at any point below' + (entry.stoppedAtStation ? ' (' + entry.stoppedAtStation + ' is where you left off)' : '') + ' to reestablish today\\u2019s HI. The rest will fill in automatically once that\\u2019s in.')
      + (additionalRunNums.length ? ' This run\\u2019s additional run(s) have been carried over too.' : ''), 'Resuming This Run'); /* feat_run33 (9): a Lenker run has no rod readings or HI */
    pbGoto('input');
  };
  // feat_run33 (2): the run form rebuilt from a locked record: rod, distances, intervals, pipe, points and hubs (stake
  // data, labels, photos), job info and pipe layout. Resume calls it with { open: true } (New Run first, as before).
  // Without it the form is emptied in place and then holds the record as if it had just locked it: a correction can read
  // it, Edit Run Data shows it, and an unchanged Lock is asked "Already Locked" instead of making a second record.
  function pbLoadRunIntoForm(entry, opts) {
    // Added points are carried whether or not they were given a label;
    // plain interval rows (no label, not added) are rebuilt from the interval.
    const realRows = entry.intervalRows.filter(r => r.label || r.addedTime);""")
r('F2b', """    if (!pbNewRunGuardPassed && pbNewRunNeedsAnswer({}, () => pbNewRunAfterAnswer(() => { const j = runArchive.indexOf(entry); if (j !== -1) pbResumeIncompleteRun(j); }))) return; // crew-sweep2: ask first
    pbFormGen++;
    pbOpenNewRun();""",
"""    pbFormGen++;
    if (opts && opts.open) pbOpenNewRun(); else pbResetRunForm();""")
r('F2g', """      const labelEl = document.getElementById(prefix + 'Label');
      if (labelEl && rec.label) labelEl.value = rec.label;""",
"""      const labelEl = document.getElementById(prefix + 'Label');
      if (labelEl && rec.label) labelEl.value = rec.label; else if (labelEl && !(opts && opts.open)) labelEl.value = ''; /* feat_run33 (2): the record's own form: a blank label stays blank (Resume keeps its "Hub" default) */""")
r('F2c', """    pbLayRestoreFromEntry(entry); // Batch 9: same pipe laying length and adjustments
    window._pbResumingFromEntryId = entry.id;
    window._pbResumingFromLabel = pbResumedFromLabel(entry);
    pbAlert('Elevations are pre-filled from the earlier run \\u2014 shoot ONE fresh rod reading at any point below' + (entry.stoppedAtStation ? ' (' + entry.stoppedAtStation + ' is where you left off)' : '') + ' to reestablish today\\u2019s HI. The rest will fill in automatically once that\\u2019s in.' + (additionalRunNums.length ? ' This run\\u2019s additional run(s) have been carried over too.' : ''), 'Resuming This Run');
    pbGoto('input');
  };""",
"""    pbLayRestoreFromEntry(entry); // Batch 9: same pipe laying length and adjustments
    if (!(opts && opts.open)) {
      // The record's own form, not a resume: its retained check points and HI come back too, and the form is marked as
      // the one that locked this record (same checks as right after Lock).
      const L = entry.pipeLayout; if (L && Array.isArray(L.retained)) window._pbLayout.retained = pbLayClone(L.retained); window._pbLayout.keep = pbLayKeepOf(entry);
      if (entry.hi !== null && entry.hi !== undefined && entry.rodUnit !== 'lenker') { const hb = document.querySelector('#hiToggle button[data-val="direct"]'); if (hb) hb.click(); setElevFieldValue('hiDirect', entry.hi, arch); }
      pbFormFresh = false; pbFormEdited = null;
      pbLaySetOwner(entry.id);
      pbLastLockedEntryId = entry.id; pbLastLockedFormGen = pbFormGen; pbLastLockedFields = pbFormFingerprint('screen-input'); pbLastLockedPhotos = pbRunFormPhotos();
      window._pbLayIgnoreDetach = true;
      try { const c = buildCalc(); if (c && !(c.errors && c.errors.length)) { lastCalc = c; pbLastLockedCalc = c; } } catch (e) { console.error(e); } finally { window._pbLayIgnoreDetach = false; }
    }
    return { additionalRunNums };
  }
  // The form does not hold ENTRY (the app restarted, another run was started or resumed since): rebuilt from the record
  // when that loses nothing. Not over this run's own form edited after Lock (today's refusal names that), nor over a run
  // typed on the form that is not kept as a draft. True when the form was rebuilt.
  function pbLoadRunForCorrection(entry) {
    try {
      if (!entry || entry.kind !== 'run' || !runArchive.includes(entry) || pbLayOldRule(entry)) return false;
      if (pbLastLockedEntryId === entry.id && pbLastLockedFormGen === pbFormGen) return false;
      if (window._pbResumingFromEntryId || pbCorrectionsSaving) return false;
      if (hasUnsavedRunData() && !pbFormIsSavedLockedRun() && !pbRdFormWork()) return false;
      pbLoadRunIntoForm(entry);
      return true;
    } catch (e) { console.error(e); return false; }
  }
  // Edit Run Data: the form with THIS run on it. After a restart (or once another run was started) it is rebuilt from
  // the record first; a run typed on the form but not locked is asked about.
  window.pbEditRunData = function() {
    if (pbRefuseWhileCorrectionSaving()) return;
    const entry = getCurrentArchiveEntry();
    const holds = !!entry && pbLastLockedEntryId === entry.id && pbLastLockedFormGen === pbFormGen;
    if (!entry || entry.kind !== 'run' || holds || window._pbResumingFromEntryId || pbLayOldRule(entry)) { pbGoto('input'); return; }
    const go = () => { try { pbLoadRunIntoForm(entry); } catch (e) { console.error(e); } pbGoto('input'); };
    if (hasUnsavedRunData() && !pbFormIsSavedLockedRun() && !pbRdFormSaved()) {
      const rdMine = pbRd.formUid !== null && pbRd.formUid === pbRd.account();
      pbShowModal(rdMine && pbRd.state === 'saved' ? 'The run form has a run that is not locked. Its draft is saved on this phone (' + pbDraftWhen(pbRd.savedAt) + '). Opening this run\\u2019s data replaces it on the form.' : 'The run form has a run that was typed in but not locked, so it is not saved anywhere. Opening this run\\u2019s data empties the form, and that run would be lost.', [
        { label: 'Cancel' },
        { label: 'Open This Run', primary: true, danger: !(rdMine && pbRd.state === 'saved'), onClick: go }
      ], 'Run Not Saved');
      return;
    }
    go();
  };""")
r('F2d', """onclick="pbGoto('input')"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-pencil"/></svg>Edit Run Data</button>""",
"""onclick="pbEditRunData()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-pencil"/></svg>Edit Run Data</button>""")
r('F2e', """    document.getElementById('correctDistanceReason').value = '';
    const entry = getCurrentArchiveEntry();
    if (!entry || !pbFormHoldsLockedRun(entry)) {""",
"""    document.getElementById('correctDistanceReason').value = '';
    const entry = getCurrentArchiveEntry();
    if (entry && !pbFormHoldsLockedRun(entry)) pbLoadRunForCorrection(entry); /* feat_run33 (2): after a restart, the record comes back onto the form */
    if (!entry || !pbFormHoldsLockedRun(entry)) {""")
r('F2f', """    const entry = getCurrentArchiveEntry();
    if (entry && (!lastCalc || !lastCalc.segments) && pbLayOldRule(entry)) { errEl.textContent = 'An interval can’t be added to this run. ' + PB_LAY_OLD_RULE_NOTE + ' Nothing was added.'; errEl.style.display = ''; return; } // bughunt Oct 19 (4)
    if (!entry || !lastCalc || !lastCalc.segments) {
      errEl.textContent = 'Can\\'t add an interval right now \\u2014 reopen this run from a fresh Lock to enable it.';""",
"""    const entry = getCurrentArchiveEntry();
    if (entry && (!lastCalc || !lastCalc.segments) && pbLayOldRule(entry)) { errEl.textContent = 'An interval can’t be added to this run. ' + PB_LAY_OLD_RULE_NOTE + ' Nothing was added.'; errEl.style.display = ''; return; } // bughunt Oct 19 (4)
    if (entry && (!lastCalc || !lastCalc.segments || !pbCalcDescribesEntry(lastCalc, entry))) pbLoadRunForCorrection(entry); /* feat_run33 (2): the grade line comes back from the record */
    if (!entry || !lastCalc || !lastCalc.segments) {
      errEl.textContent = 'Can\\'t add an interval right now \\u2014 this run\\u2019s grade line isn\\u2019t loaded (the run form holds another run). Lock or clear that run, then open this one again.';""")

# ---------------------------------------------------------------- 1: Replace / Keep Both / Cancel on an edited re-Lock
r('F1a', """  window.pbLock = async function(opts) {
    if (!lastCalc) return;""",
"""  // feat_run33 (1): the earlier record of the run this form locked can be replaced by a corrected Lock when nothing has
  // been built on it: not ended, no notes, laid marks, crew, corrections or production, not part of a resume chain, saved.
  function pbReplaceablePriorRun(prior) {
    try {
      if (!prior || prior.kind !== 'run' || !runArchive.includes(prior) || !pbLastPersistedEntryIds.has(prior.id)) return false;
      if (prior.runEndTime || prior.completed || prior.incomplete || statsLoadFailed) return false;
      if ((prior.fieldNotes || []).length || Object.keys(pbLaidMarks(prior)).length || (prior.crewLog || []).length || (prior.correctionHistory || []).length || (prior.unplacedEvidence || []).length) return false;
      if (prior.resumedFromId !== undefined && prior.resumedFromId !== null) return false;
      if (prior.resumedIntoId !== undefined && prior.resumedIntoId !== null) return false;
      if (runArchive.some(o => o !== prior && o.kind === 'run' && o.resumedFromId === prior.id)) return false;
      if (pbUnsavedResumeOf(prior.id) || pbResumeFormOpenFor(prior.id) || pbDeletingEntryIds.has(prior.id)) return false;
      if (typeof pbProd !== 'undefined' && pbProd && pbProd.st && pbProd.st.ids) { const cid = pbProd.st.ids[String(prior.id)], it = cid && pbProd.st.items && pbProd.st.items[cid]; if (it && it.h && !it.voided) return false; } /* its production was already sent to the company (same test as pbProdAfterRunDeleted) */
      return true;
    } catch (e) { return false; }
  }
  // Replace: the earlier record's Stats entry goes with it (one save under the Stats lock; a pass that has not recorded
  // it yet never will). False when Stats did not save.
  async function pbReplacedRunStatsOut(prior) {
    const ownerAtTap = statsLogOwnerUid;
    return withStatsLogLock(async () => {
      if (statsLogOwnerUid !== ownerAtTap) return false;
      pendingLockRetries.forEach(p => { if (p.entryId === prior.id) p.statsStatus = 'done'; });
      const removed = statsLog.filter(s => s.entryId === prior.id);
      if (!removed.length) return true;
      statsLog = statsLog.filter(s => !removed.includes(s));
      const ok = await saveStatsLog();
      if (ok === false) statsLog = statsLog.concat(removed.filter(x => !statsLog.includes(x)));
      return ok !== false;
    });
  }
  window.pbLock = async function(opts) {
    if (!lastCalc) return;""")
r('F1b', """    if (!(opts && opts.sameFormOk) && pbFormFromBoot && pbFormFresh && pbLastLockedEntryId === null) {""",
"""    // feat_run33 (1): Edit Run Data, a typo fixed, Lock again: the earlier record of the same run would stay in Records
    // and Stats (counted twice). While nothing has been built on it, ask: Replace it, or Keep Both (another run).
    if (!(opts && opts.sameFormOk) && !(opts && opts.replaceAnswered) && pbLastLockedEntryId !== null && pbFormGen === pbLastLockedFormGen && pbFormFingerprint('screen-input') !== pbLastLockedFields) {
      const prior = runArchive.find(e => e.id === pbLastLockedEntryId && e.kind === 'run');
      if (prior && pbReplaceablePriorRun(prior)) {
        const again = (x) => pbLock(Object.assign({}, opts || {}, { replaceAnswered: true }, x));
        pbShowModal('This form already locked ' + prior.startLabel + ' \u2192 ' + prior.endLabel + ' at ' + prior.lockTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '. Replace that record with these corrected numbers (it leaves Records and Stats' + (prior.sent === true ? '; its report was already sent' : '') + '), or keep both if this is another run?', [
          { label: 'Cancel' },
          { label: 'Keep Both', onClick: () => again({}) },
          { label: 'Replace', primary: true, onClick: () => again({ replacePriorId: prior.id }) }
        ], 'Locked Once Already');
        return;
      }
    }
    if (!(opts && opts.sameFormOk) && pbFormFromBoot && pbFormFresh && pbLastLockedEntryId === null) {""")
r('F1c', """    const lockedEntry = runArchive[0];
    if (opts && opts.shorterOk) pbShorterAnswered.add(lockedEntry.id + '|' + Math.round(calc.totalDist * 1000)); // End Run doesn't ask again""",
"""    const lockedEntry = runArchive[0];
    // feat_run33 (1): Replace — the earlier record leaves Records in the same save that adds this one; the corrected run
    // keeps its cloud row (same client id) and its start time. Re-checked now: the record may have changed meanwhile.
    let replaced = null, replacedAt = -1, replacedOwnIds = null;
    if (opts && opts.replacePriorId) {
      const prior = runArchive.find(e => e.id === opts.replacePriorId && e.kind === 'run');
      if (prior && prior !== lockedEntry && pbReplaceablePriorRun(prior)) {
        replaced = prior; replacedAt = runArchive.indexOf(prior);
        runArchive.splice(replacedAt, 1); pbDeletingEntryIds.add(prior.id);
        replacedOwnIds = { clientRunId: lockedEntry.clientRunId, runStartTime: lockedEntry.runStartTime };
        if (prior.clientRunId) lockedEntry.clientRunId = prior.clientRunId;
        if (prior.supabaseId) lockedEntry.supabaseId = prior.supabaseId;
        if (prior.runStartTime) lockedEntry.runStartTime = prior.runStartTime;
      }
    }
    if (opts && opts.shorterOk) pbShorterAnswered.add(lockedEntry.id + '|' + Math.round(calc.totalDist * 1000)); // End Run doesn't ask again""")
r('F1d', """    const lockSaveOk = await saveRunArchive();
    // Another account signed in while this saved (its Records may not have loaded
    // yet): nothing more for this run may go to that account's storage.""",
"""    const lockSaveOk = await saveRunArchive();
    if (replaced) {
      pbDeletingEntryIds.delete(replaced.id);
      if (lockSaveOk) {
        pendingLockRetries.forEach(p => { if (p.entryId === replaced.id) p.everCommitted = true; }); /* gone on purpose: the next pass drops its follow-through */
        const statsOk = await pbReplacedRunStatsOut(replaced);
        if (!statsOk) { const ft = statsLog.filter(s => s.entryId === replaced.id).reduce((a, s) => a + (s.footage || 0), 0);
          pbShowModal('The earlier record was replaced, but Stats didn\\u2019t save, so its ' + ft.toFixed(0) + ' ft is still counted there. Storage may be full \\u2014 free up space if you can, then try again.', [
            { label: 'Leave It' },
            { label: 'Try Again', primary: true, onClick: async function pbReplacedStatsRetry() { if (!(await pbReplacedRunStatsOut(replaced))) pbShowModal('Stats still didn\\u2019t save; the earlier record\\u2019s footage is still counted.', [{ label: 'Leave It' }, { label: 'Try Again', primary: true, onClick: pbReplacedStatsRetry }], 'Stats Save Failed'); } }
          ], 'Stats Save Failed'); }
      } else {
        // Nothing saved: the earlier record stays exactly as it was (its own cloud id back on this one).
        if (!runArchive.includes(replaced)) runArchive.splice(Math.min(replacedAt, runArchive.length), 0, replaced);
        if (replacedOwnIds) { lockedEntry.clientRunId = replacedOwnIds.clientRunId; delete lockedEntry.supabaseId; lockedEntry.runStartTime = replacedOwnIds.runStartTime; }
        replaced = null;
      }
    }
    // Another account signed in while this saved (its Records may not have loaded
    // yet): nothing more for this run may go to that account's storage.""")

# ---------------------------------------------------------------- 3: the strip over a Start/End row names the point as typed
r('F3a', """          ${r.label ? `<span class="pb-sta-sub ${staSubClass}" style="display:inline; margin:0;">${escapeHtml(r.label)}</span>` : ''}""",
"""          ${r.label ? `<span class="pb-sta-sub ${staSubClass}" style="display:inline; margin:0;">${escapeHtml(pbRowStripName(entry, r))}</span>` : ''}""")
r('F3b', """  function renderResultsTable(entry) {
    { const w = document.getElementById('adjustEndTimeWrap');""",
"""  // feat_run33 (3): what the strip over a row says. A Start/End row (r.label is its role) names the point as typed —
  // "Start — MH-12 IE OUT" — and a reducer's rows say which run they belong to: "End — Reducer", "Run 2 Start".
  function pbRowStripName(entry, r) {
    if (!r || (r.label !== 'start' && r.label !== 'end')) return r ? r.label : '';
    const id = r.pointId || '', m = /^seg(\\d+)(start|end)$/.exec(id);
    const role = (m ? 'Run ' + m[1] + ' ' : '') + (r.label === 'start' ? 'Start' : 'End');
    let name = '';
    if (m) { const pi = entry && entry.pointInputs ? entry.pointInputs[id] : null; name = pi && pi.label ? pi.label : ''; }
    else name = r.label === 'start' ? (entry && entry.startLabel) || '' : (entry && entry.endLabel) || '';
    name = String(name).trim();
    return !name || /^(Run \\d+ )?(Start|End)$/i.test(name) ? role : role + ' \\u2014 ' + name;
  }
  function renderResultsTable(entry) {
    { const w = document.getElementById('adjustEndTimeWrap');""")

# ---------------------------------------------------------------- 4: INV / TOP on screen at 390 px (note buttons stack; Subgrade after TOP)
r('F4a', """    head.innerHTML = `<th>Note</th><th>Sta.</th><th>BOP</th>` + (showSgCol ? `<th>Subgrade</th>` : '') + `<th>INV</th><th>TOP</th>` + (showElevCol ? `<th>Elevation</th>` : '');""",
"""    head.innerHTML = `<th>Note</th><th>Sta.</th><th>BOP</th><th>INV</th><th>TOP</th>` + (showSgCol ? `<th>Subgrade</th>` : '') + (showElevCol ? `<th>Elevation</th>` : ''); /* feat_run33 (4): the optional column after the three the crew reads */""")
r('F4b', """        ${pbCopyCell(r.bop, 'bop', idx)}
        ${showSgCol ? pbCopyCell(r.sgDisp || '', 'sg', idx) : ''}
        ${pbCopyCell(r.inv, 'inv', idx)}
        ${pbCopyCell(r.top, 'top', idx)}""",
"""        ${pbCopyCell(r.bop, 'bop', idx)}
        ${pbCopyCell(r.inv, 'inv', idx)}
        ${pbCopyCell(r.top, 'top', idx)}
        ${showSgCol ? pbCopyCell(r.sgDisp || '', 'sg', idx) : ''}""")
r('F4c', """/* a folded cutsheet question always keeps its question in view; the dialog scrolls if the screen is short */""",
"""/* feat_run33 (4): on a phone the two note buttons stack, so Sta · BOP · INV · TOP fit without a sideways scroll */
@media (max-width: 430px) {
  #pbApp#pbApp #screen-results #resultsTable:not(.pb-zoom) td:first-child > .pb-notebtn { display: flex; margin: 0 0 4px 0; }
  #pbApp#pbApp #screen-results #resultsTable:not(.pb-zoom) td:first-child > .pb-notebtn + .pb-notebtn { margin-left: 0; }
  #pbApp#pbApp #screen-results #resultsTable:not(.pb-zoom) td:first-child { padding-top: 4px; padding-bottom: 4px; }
  #pbApp#pbApp #screen-results #resultsTable:not(.pb-zoom) td:first-child > .pb-notebtn { height: 40px; font-size: 18px; } /* lead: 4+40+4+40+4 = 92 px rows, not 112 */
}
/* feat_run33 (5): a long point name never grows the Home card past two lines */
#pbApp #homeWork .pb-home-tile .name { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
/* feat_run33 (18): the hub's title line repeats its two fields while the card is open; it is for the collapsed card */
#pbApp#pbApp #screen-input .pb-hub-card:not(:has(> .pb-body[style*="none"])) .pb-hub-ident { display: none; }
/* feat_run33 (18): the AI privacy line once per form (the Start card), not under every point */
#pbApp#pbApp #screen-input :is(.pb-section.end, .pb-hub-card) .pb-ai-stake .pb-ai-privacy { display: none; }
/* a folded cutsheet question always keeps its question in view; the dialog scrolls if the screen is short */""")

# ---------------------------------------------------------------- 5: point labels capped like the other short fields
r('F5', """<input type="text" enterkeyhint="next" id="${prefix}Label" placeholder="e.g. MH-4 or stake 12">""",
"""<input type="text" enterkeyhint="next" id="${prefix}Label" maxlength="80" placeholder="e.g. MH-4 or stake 12">""")

# ---------------------------------------------------------------- 6: half joints (12.5, 6.25 ft) need the decimal keypad
r('F6a', """step="1" id="interval" value="10" inputmode="numeric\"""", """step="0.5" id="interval" value="10" inputmode="decimal\"""")
r('F6b', """<input type="number" enterkeyhint="next" step="1" id="seg""", """<input type="number" enterkeyhint="next" step="0.5" id="seg""", 4)
r('F6c', """Interval" value="10" inputmode="numeric\"""", """Interval" value="10" inputmode="decimal\"""", 5)
r('F6d', """step="1" id="qrInterval" value="10" """, """step="0.5" id="qrInterval" value="10" """)

# ---------------------------------------------------------------- 7: Review shows the hubs (the numbers being checked); the pressed button looks pressed
r('F7a', """    lastCalc = calc;
    reviewShowAllHubs = false;""",
"""    lastCalc = calc;
    reviewShowAllHubs = calc.points.filter(p => !(p.id === 'start' || p.id === 'end' || /^seg\\d+(start|end)$/.test(p.id))).length <= 8; // feat_run33 (7): hubs shown unless there are many""")
r('F7b', """        <button class="pb-btn ${showAllHubs ? '' : 'ghost'} small" onclick="pbSetReviewHubsVisible(true)">Show All Hubs (${hubCount})</button>
        <button class="pb-btn ${showAllHubs ? 'ghost' : ''} small" onclick="pbSetReviewHubsVisible(false)">Show None</button>""",
"""        <button class="pb-btn ${showAllHubs ? 'ghost' : ''} small" aria-pressed="${showAllHubs ? 'true' : 'false'}" onclick="pbSetReviewHubsVisible(true)">Show All Hubs (${hubCount})</button>
        <button class="pb-btn ${showAllHubs ? '' : 'ghost'} small" aria-pressed="${showAllHubs ? 'false' : 'true'}" onclick="pbSetReviewHubsVisible(false)">Hide Hubs</button>""")

# ---------------------------------------------------------------- 8: Review says each fact once
r('F8a', """    html += `<div class="pb-review-item"><span class="k">Rod Unit</span><br>${calc.rodUnit.charAt(0).toUpperCase()+calc.rodUnit.slice(1)}${calc.hi!==null ? ' — HI ' + fmt(calc.hi,3) + ' ft' : ''}</div>`;""",
"""    html += `<div class="pb-review-item"><span class="k">Rod Unit</span><br>${calc.rodUnit.charAt(0).toUpperCase()+calc.rodUnit.slice(1)}</div>`; /* feat_run33 (8): the HI is in the grid */""")
r('F8b', """${escapeHtml(calc.points[0].label)} → ${escapeHtml(calc.points[calc.points.length-1].label)}, ${fmt(calc.totalDist,1)} ft, ${escapeHtml(pbLayIntervalWords(calc))}, ${realHubCount} hub(s)</div>`;""",
"""${escapeHtml(calc.points[0].label)} → ${escapeHtml(calc.points[calc.points.length-1].label)} · ${escapeHtml(pbLayIntervalWords(calc))} · ${realHubCount === 0 ? 'no hubs' : realHubCount === 1 ? '1 hub' : realHubCount + ' hubs'}</div>`; /* feat_run33 (8): the distance is in the grid */""")
r('F8c', """    html += `<div class="pb-review-item"><span class="k">Pipe</span><br>${reviewRunStarts.map(r => (reviewMultiRun ? r.label + ': ' : '') + 'WT ' + fmt(r.point.wt,3) + ' ft \\u00b7 ID ' + (r.point.idFt !== null ? fmt(r.point.idFt*12,2) : '\\u2014') + '"').join('<br>')}</div>`;
""", "")
r('F8d', """      html += `<div class="pb-review-item"><span class="k">${roleLabel} — ${escapeHtml(p.label)}</span><br>Station ${fmt(p.station,1)}""",
"""      html += `<div class="pb-review-item"><span class="k">${roleLabel}${p.label && p.label !== roleLabel ? ' — ' + escapeHtml(p.label) : ''}</span><br>Station ${fmt(p.station,1)}""")
# 18: the Bedding tiles only say what was entered (a trench width alone is not bedding)
r('F8e', """    const anyBeddingData = runStarts.some(r => (r.point.bedding !== null && r.point.bedding !== undefined) || (r.point.trenchWidth !== null && r.point.trenchWidth !== undefined));
    const beddingTiles = runStarts.map(r =>
      `<div class="pb-summary-item"><div class="k">${multiRun ? r.label + ' \\u2014 ' : ''}Bedding Thickness</div><div class="v">${(r.point.bedding !== null && r.point.bedding !== undefined) ? fmt(r.point.bedding,2)+' ft' : '\\u2014'}</div></div>""",
"""    const anyBeddingData = runStarts.some(r => (r.point.bedding !== null && r.point.bedding !== undefined) || (r.point.trenchWidth !== null && r.point.trenchWidth !== undefined));
    const anyBeddingThickness = runStarts.some(r => r.point.bedding !== null && r.point.bedding !== undefined); /* feat_run33 (18): no thickness anywhere = no bedding tiles, only the trench width */
    const beddingTiles = runStarts.map(r =>
      `${anyBeddingThickness ? `<div class="pb-summary-item"><div class="k">${multiRun ? r.label + ' \\u2014 ' : ''}Bedding Thickness</div><div class="v">${(r.point.bedding !== null && r.point.bedding !== undefined) ? fmt(r.point.bedding,2)+' ft' : '\\u2014'}</div></div>` : ''}""")
r('F8f', """      <div class="pb-summary-subhead">Bedding</div>
      ${beddingTiles}
      <div class="pb-summary-item"><div class="k">Total Bedding Volume</div>""",
"""      <div class="pb-summary-subhead">${anyBeddingThickness ? 'Bedding' : 'Trench'}</div>
      ${beddingTiles}
      ${anyBeddingThickness ? `<div class="pb-summary-item"><div class="k">Total Bedding Volume</div>""")
r('F8g', """(beddingVolumeIncomplete ? 'unavailable — missing data' : 'not recorded')}</div></div>` : ''}
    `;""",
"""(beddingVolumeIncomplete ? 'unavailable — missing data' : 'not recorded')}</div></div>` : ''}` : ''}
    `;""")

# ---------------------------------------------------------------- 10: flags raised by a correction are not "Flagged at Lock"
r('F10', """<span>Flagged at Lock (' + ws.length + ')</span>""",
"""<span>' + ((entry.correctionHistory || []).length ? 'Flags after correction (' : 'Flagged at Lock (') + ws.length + ')</span>""")

# ---------------------------------------------------------------- 11: one section is not "All 1 sections"
r('F11', """text: `All ${realSegments.length} section${realSegments.length === 1 ? '' : 's'} of pipe in this run are backflowing — invert falls the whole way from Start to End, when it should rise if the crew is starting at the low point. Would you like to flip the run?` });""",
"""text: realSegments.length === 1 ? 'This run\\u2019s one section of pipe is backflowing \\u2014 invert falls from Start to End, when it should rise if the crew is starting at the low point. Would you like to flip the run?' : `All ${realSegments.length} sections of pipe in this run are backflowing — invert falls the whole way from Start to End, when it should rise if the crew is starting at the low point. Would you like to flip the run?` }); /* feat_run33 (11) */""")

# ---------------------------------------------------------------- 12: an interval longer than the run gets a word
r('F12', """      else if (interval < 0.1) segErrors.push(pbErrAt(cfg.runLabel + ': interval of ' + interval + ' ft is far finer than any real measurement \\u2014 check for a typo (0.1 ft minimum).', cfg.intervalId));""",
"""      else if (interval < 0.1) segErrors.push(pbErrAt(cfg.runLabel + ': interval of ' + interval + ' ft is far finer than any real measurement \\u2014 check for a typo (0.1 ft minimum).', cfg.intervalId));
      else if (totalDist !== null && totalDist > 0 && interval > totalDist) segCapabilityNotes.push(cfg.notePrefix + 'Interval (' + interval + ' ft) is longer than the run (' + totalDist + ' ft): the sheet will have no interval rows between its points.'); /* feat_run33 (12) */""")

# ---------------------------------------------------------------- 13: "12+50" in a Station box
r('F13', """        if (station === null) { segErrors.push(pbErrAt('A hub' + (getPointLabel(id, '') ? ' (' + getPointLabel(id, '') + ')' : '') + ' is missing its station distance.', id + 'Station')); return; }""",
"""        if (station === null) { const stEl = document.getElementById(id + 'Station'), typed = !!(stEl && stEl.validity && stEl.validity.badInput);
          segErrors.push(pbErrAt('A hub' + (getPointLabel(id, '') ? ' (' + getPointLabel(id, '') + ')' : '') + (typed ? '\\u2019s Station box holds something that isn\\u2019t a plain number \\u2014 a station like 12+50 goes in as feet from this run\\u2019s start (1250).' : ' is missing its station distance.'), id + 'Station')); return; } /* feat_run33 (13) */""")

# ---------------------------------------------------------------- 14: 15" and 21" (SDR 35 / RCP storm) in the Pipe ID list
r('F14', """  const PIPE_SIZES = [4,6,8,10,12,18,24,30,36,42,48];""", """  const PIPE_SIZES = [3,4,6,8,10,12,15,18,21,24,27,30,36,42,48]; /* feat_run33 (14) */""")

# ---------------------------------------------------------------- 15: the stop picker says what to do and how far the pipe is marked laid
r('F15a', """        <div class="pb-field"><label>Stopped at which interval?</label><select id="endIncompleteStation"></select></div>""",
"""        <div class="pb-field"><label>Stopped at which interval?</label><select id="endIncompleteStation"></select><p class="pb-help" id="endIncompleteLaid" style="margin:4px 0 0 0;" hidden></p></div>""")
r('F15b', """    sel.innerHTML = entry ? entry.intervalRows.map(r => `<option value="${escapeHtml(pbRowKey(r))}" data-station-ft="${escapeHtml(String(r.stationFt))}">${escapeHtml(r.station)}${r.label ? ' (' + escapeHtml(r.label) + ')' : ''}${r.layoutShort ? ' \\u00b7 ' + escapeHtml(r.layoutShort) : ''}</option>`)""",
"""    sel.innerHTML = '<option value="" disabled>Tap to choose the last station laid</option>' + (entry ? entry.intervalRows.map(r => `<option value="${escapeHtml(pbRowKey(r))}" data-station-ft="${escapeHtml(String(r.stationFt))}">${escapeHtml(r.station)}${r.label ? ' (' + escapeHtml(r.label) + ')' : ''}${r.layoutShort ? ' \\u00b7 ' + escapeHtml(r.layoutShort) : ''}</option>`)""")
r('F15c', """</option>`).join('') : '';
    sel.selectedIndex = -1; // nothing chosen until the person picks: a tap on End Here never records the Start by default
  }""",
"""</option>`).join('') : '');
    sel.selectedIndex = 0; /* feat_run33 (15): the hint shows; nothing chosen until the person picks (a tap on End Here never records the Start by default) */
    { const el = document.getElementById('endIncompleteLaid'); if (el) { let S = null; try { S = entry ? pbLaidSummary(entry) : null; } catch (e) { S = null; } el.hidden = !(S && S.n); el.textContent = S && S.n ? 'Pipe is marked laid to ' + S.laidTo + ' ft.' : ''; } }
  }""")
r('F15d', """    const opt = sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
    if (!entry) { pbRunGoneAlert(); return; }
    if (!opt) { pbAlert('Select where the run stopped first.', 'Select a Stop Point'); return; }""",
"""    const opt = sel && sel.selectedIndex >= 0 && sel.options[sel.selectedIndex].value ? sel.options[sel.selectedIndex] : null; /* feat_run33 (15): the hint is not a choice */
    if (!entry) { pbRunGoneAlert(); return; }
    if (!opt) { pbAlert('Select where the run stopped first.', 'Select a Stop Point'); return; }""")

# ---------------------------------------------------------------- 16: Home run cards
r('F16a', """              + '<span class="pb-home-line">Ended early' + (x.stoppedAtStation ? ' at ' + pbHomeEsc(String(x.stoppedAtStation)) : '') + ', started ' """,
"""              + '<span class="pb-home-line">Ended early' + (x.stoppedAtStation ? ' at ' + pbHomeEsc(String(x.stoppedAtStation)) + (/^[\\d.]+$/.test(String(x.stoppedAtStation)) ? ' ft' : '') : '') + ', started ' """)
r('F16b', """      const job = pbHomeJobOf(entry), saved = pbLastPersistedEntryIds.has(entry.id);
      return (job ? '<span class="pb-home-line">' + pbHomeEsc(job.text) + '</span>' : '<span class="pb-home-line">Run in progress</span>')
        + (saved ? '<span class="pb-chip saved">Saved on this phone</span>'""",
"""      const job = pbHomeJobOf(entry), saved = pbLastPersistedEntryIds.has(entry.id);
      let laid = ''; try { const S = pbLaidSummary(entry); if (S.n) laid = '<span class="pb-home-line">' + pbHomeEsc(pbLaidProgressText(S)) + '</span>'; } catch (e) {} /* feat_run33 (16): how far the pipe is marked laid */
      return (job && !pbHomeJobIsCurrent(job) ? '<span class="pb-home-line">' + pbHomeEsc(job.text) + '</span>' : (job || laid) ? '' : '<span class="pb-home-line">Run in progress</span>') + laid
        + (saved ? '<span class="pb-chip saved">Saved on this phone</span>'""")
r('F16c', """  function pbHomeJobOf(o) {
    if (!o) return null;""",
"""  // feat_run33 (16): the job the Current job card above the run card already names (the chosen job, else the run's own
  // when no open permit names another): the run card does not repeat it.
  function pbHomeJobIsCurrent(job) {
    try {
      if (!job || document.documentElement.classList.contains('pb-cx')) return false; /* the company Home has no Current job card */
      const pick = typeof window.pbCurJobGet === 'function' ? window.pbCurJobGet() : null;
      if (pick) { const pj = pbHomeJobOf({ jobNumber: pick.job_number, jobsite: pick.name || '' }); return !!pj && pj.key === job.key; }
      const permitJob = confinedPermit ? pbHomeJobOf(confinedPermit) : null;
      return !permitJob || permitJob.key === job.key;
    } catch (e) { return false; }
  }
  function pbHomeJobOf(o) {
    if (!o) return null;""")

# ---------------------------------------------------------------- 17: architect's rod — one message per field
r('F17', """      return pbErrAt(where + ': ' + pbArchInchMsg(p.inches), p.id + '_in');
    });
    return Object.assign({}, res, { errors: (res && res.errors ? res.errors : []).concat(msgs) });""",
"""      return pbErrAt(where + ': ' + pbArchInchMsg(p.inches), p.id + '_in');
    });
    // feat_run33 (17): the point's "data is incomplete" message says the same thing less exactly; the inches message stands alone
    const probFields = probs.map(p => prefixes.find(x => p.id.startsWith(x) && document.getElementById(x + 'Label'))).filter(Boolean).map(x => pbPointFieldFor(x, 'pi'));
    const kept = (res && res.errors ? res.errors : []).filter(e => !(/invert\\/stake data/.test(e) && pbErrTags.some(t => t.msg === e && probFields.includes(t.field))));
    return Object.assign({}, res, { errors: kept.concat(msgs) });""")

# ---------------------------------------------------------------- 9: a Lenker resume is told plainly; the form says it is a resume; leaving a resume nothing was typed on
r('F9a', """    if (!skipUnsavedCheck && leavingRunBuilder && name !== 'input' && name !== 'review' && name !== 'cutsheetImport' && hasUnsavedRunData() && !pbFormIsSavedLockedRun()) {""",
"""    if (!skipUnsavedCheck && leavingRunBuilder && name !== 'input' && name !== 'review' && name !== 'cutsheetImport' && window._pbResumingFromEntryId && window._pbResumeFormKey && pbFormStateKey() === window._pbResumeFormKey && hasUnsavedRunData() && !pbFormIsSavedLockedRun()) {
      // feat_run33 (9): a resume with nothing new typed: the earlier session is saved, nothing here is lost
      pbConfirm('Nothing new has been typed for this resume \\u2014 the earlier session is saved in Records, and Finish Run on Home brings this form back. Leave it?', () => { pbFormEditsLeft(); pbGoto(name, isBack, true); }, 'Leave the Resume?', { no: 'Keep Editing', yes: 'Leave' });
      return;
    }
    if (!skipUnsavedCheck && leavingRunBuilder && name !== 'input' && name !== 'review' && name !== 'cutsheetImport' && hasUnsavedRunData() && !pbFormIsSavedLockedRun()) {""")
r('F9b', """  function pbHomeRunDraft() {
    try {
      if (!hasUnsavedRunData() || pbFormIsSavedLockedRun()) return false;""",
"""  function pbHomeRunDraft() {
    try {
      if (window._pbResumingFromEntryId && window._pbResumeFormKey && pbFormStateKey() === window._pbResumeFormKey) return false; /* feat_run33 (9): a resume nothing was typed on is the Finish Run card, not a draft */
      if (!hasUnsavedRunData() || pbFormIsSavedLockedRun()) return false;""")
r('F9c', """    } else if (full) {
      bad = true;
      html = '<span class="pb-chip draft">Not saved as a draft</span><span class="pb-rd-line" id="runDraftFull">' + pbDraftEsc(pbRdFullWords()) + '</span>';
    }""",
"""    } else if (full) {
      bad = true;
      html = '<span class="pb-chip draft">Not saved as a draft</span><span class="pb-rd-line" id="runDraftFull">' + pbDraftEsc(pbRdFullWords()) + '</span>';
    } else if (window._pbResumingFromEntryId) {
      // feat_run33 (9): the form holds a resume: say which run, and that Lock continues it
      const re = runArchive.find(x => x && x.kind === 'run' && x.id === window._pbResumingFromEntryId);
      if (re) html = '<span class="pb-chip draft">Resuming</span><span class="pb-rd-line">' + pbDraftEsc('Resuming ' + re.startLabel + ' \\u2192 ' + re.endLabel + (re.stoppedAtStation ? ' (stopped at ' + re.stoppedAtStation + ')' : '') + ' \\u2014 Lock to continue it.') + '</span>';
    }""")

def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('run33 written', len(s))
