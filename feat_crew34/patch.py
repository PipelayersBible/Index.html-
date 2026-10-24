#!/usr/bin/env python3
"""feat_crew34 (r15.34, from the overnight CREW-side sweep, /home/claude/night/crew.md), applied on r15.33's m1533.html:
 1 [DATA]     Equipment hours typed on "Enter production for this run" were dropped: pbLvRender refused to redraw while a box
              had focus, so the job's pieces never appeared and the total box he typed in was removed by the deferred redraw
              on Save. Now the form redraws with the caret kept (what was typed lives in pbLv.form), and a total typed before
              the plan landed becomes an "Other equipment" row. The report screen keeps the caret across its redraw too.
 2 [FUNCTION] A run report with no production could not be approved ("Enter at least one quantity."); the way out filed a 0.
              With every box empty, Approve asks once and approves without filing an entry; the tile and the crew view then
              stop counting that run as needing production.
 3 [DATA]     Production for a run with no job number was filed to no job without a word: the form gets a Job number box
              (the company's jobs as choices) and Save refuses an empty one.
 4 [WORDING]  "Your work today" lists the work only (hours have their own line); the form says "Crew hours (h)" like every
              list; the crew-link dialogs and the pipelayer's notification rows no longer promise the batch 12 world.
 5 [UX]       "Run reports to approve" rows carry the run's distance, feet marked laid and when it ended.
 6 [UX]       After Save the run stays open in the card; My production › Today / Earlier list the crew-run entries, and the
              empty text is not shown while there are some.
 7 [UX]       Home: the "Crew runs" row only while a run is in progress; saving production from My crew now also approves
              that session's sent, unreviewed report (as the report screen's Approve does).
 +            The jobs' "Your work today" (scope) refreshes after a claim / edit / approve action finishes."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))

# ---- 1 [DATA] redraw under someone typing, caret kept ----
r('1a', "    if (pbLv.form && document.activeElement && el.contains(document.activeElement) && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) { pbLv.dirty = true; return; } // never under someone typing\n    pbLv.dirty = false;\n    const h = pbLvHtml(); pbSetHtml(el, h);",
  "    const keep = pbLv.form ? pbFocusKeep(el) : null; /* feat_crew34 1: redraw under someone typing too (what was typed lives in pbLv.form), the caret kept */\n    pbLv.dirty = false;\n    const h = pbLvHtml(); pbSetHtml(el, h); pbLvKeepFix(keep, 'pmLive'); pbFocusBack(keep);")
r('1b', "  window.pbLvRender = pbLvRender;",
  "  window.pbLvRender = pbLvRender;\n  // feat_crew34 1: a redraw that replaces a focused box gives the new box the focus and the caret back\n  function pbFocusKeep(el) { const ae = document.activeElement; return ae && ae.id && el.contains(ae) && /^(INPUT|TEXTAREA)$/.test(ae.tagName) ? { id: ae.id, pos: ae.selectionStart, key: ae.dataset.key || '' } : null; }\n  function pbFocusBack(keep) { if (!keep) return; const n = document.getElementById(keep.id); if (!n) return; try { n.focus({ preventScroll: true }); if (keep.pos != null) n.setSelectionRange(keep.pos, keep.pos); } catch (e) {} }\n  window.pbFocusKeep = pbFocusKeep; window.pbFocusBack = pbFocusBack;\n  // the form's boxes are numbered by row (data-key = the row): a redraw that adds the plan's rows moves the focus with its row, and the total box's number moves to Other equipment\n  function pbLvKeepFix(keep, pre) { const F = pbLv.form; if (!keep || !keep.key || !F) return; const k = F.rows.findIndex(r => r.key === keep.key); if (k >= 0) keep.id = pre + 'Q' + k; else if (keep.key === PB_ROLES_EQ_KEY && F.eq) { const o = F.eq.rows.findIndex(r => r.key === 'eq_other'); if (o >= 0) keep.id = pre + 'E' + o; } }")
r('1c', "function pbEqApplyRows(F) { if (F && F.eq) F.rows = F.rows.filter(r => r.key !== PB_ROLES_EQ_KEY); } // the total is the pieces' sum",
  "function pbEqApplyRows(F) { if (!F || !F.eq) return; const t = F.rows.find(r => r.key === PB_ROLES_EQ_KEY); if (t && String(t.qty || '').trim() && !F.eq.rows.length) F.eq.rows.push({ key: 'eq_other', qty: String(t.qty).trim(), idle: '', down: '' }); /* feat_crew34 1: a total typed before the plan landed stays, as Other equipment */ F.rows = F.rows.filter(r => r.key !== PB_ROLES_EQ_KEY); } // the total is the pieces' sum")
r('1d', "    if (st && st.textContent !== s) st.textContent = s;\n    pbSetHtml(body, h);\n  }",
  "    if (st && st.textContent !== s) st.textContent = s;\n    const keep = pbFocusKeep(body); pbSetHtml(body, h); pbLvKeepFix(keep, 'cxRunLive'); pbFocusBack(keep); /* feat_crew34 1: the plan's redraw keeps the caret */\n  }")

# ---- 2 [FUNCTION] approve a report with no production ----
r('2a', "      await window.pbLvFormSave();\n      if (pbLv.form && pbLv.form.cid === cid) {",
  "      const F = pbLv.form, blank = F.rows.every(r => !String(r.qty || '').trim()) && !(F.eq && F.eq.rows.some(r => String(r.qty || r.idle || r.down || '').trim())); // feat_crew34 2: nothing entered: approve without filing an entry\n      if (blank) {\n        if (btn) { btn.disabled = false; btn.textContent = 'Approve Report'; }\n        pbShowModal('No production entered for this run. Approve the report anyway? Nothing is counted for it.', [{ label: 'Cancel' }, { label: 'Approve Without Production', primary: true, onClick: async () => { pbLv.form = null; const b = document.getElementById('cxRunApproveBtn'); if (b) { b.disabled = true; b.textContent = 'Approving…'; } await window.pbRrReviewed(); } }], 'Approve Report');\n        return;\n      }\n      await window.pbLvFormSave();\n      if (pbLv.form && pbLv.form.cid === cid) {")
r('2b', "    if (!open && !mine) { pbLvFormOpen(L.pi, L.ri); }",
  "    if (!open && !mine) { if (x.reviewed_at) return '<p class=\"pbx-note\" id=\"cxRunNoProd\">No production was entered for this run. If there is some, enter it from My crew now (My production).</p>'; /* feat_crew34 2: approved without production */ pbLvFormOpen(L.pi, L.ri); }")
r('2c', "  window.pbRfOpen = function(i) {",
  "  // feat_crew34 2/7: this session's report, as the list last read it: approved (so the run no longer waits for production), or approved now after production was entered from My crew now\n  window.pbRfApproved = function(pid, sref) { const L = pbRf.uid === pbArchiveOwnerUid ? pbRf.list : null; return !!(L && L.some(x => x && x.reviewed_at && String(x.pipelayer_id) === String(pid) && String(x.entry_id) === String(sref))); };\n  window.pbRfApproveFor = async function(pid, sref) {\n    const uid = pbArchiveOwnerUid, L = pbRf.uid === uid ? pbRf.list : null; if (!L) return;\n    const x = L.find(y => y && !y.reviewed_at && !y.sent_back_at && String(y.pipelayer_id) === String(pid) && String(y.entry_id) === String(sref)); if (!x) return;\n    const r = await pbPermitRpc('pb_prod_run_report_review', { p_id: x.id, p_expect_uid: uid }, 20000);\n    if (!(r && !r.error && r.data && r.data.ok) || pbRf.uid !== uid || !pbRf.list) return;\n    pbRf.list.forEach(y => { if (y.id === x.id) y.reviewed_at = r.data.reviewed_at; });\n    try { window.pbRenderHome(); } catch (e) {}\n  };\n  window.pbRfOpen = function(i) {")
r('2d', "        else if (!r.mine && !r.theirs && !pbLvRuns()[pbLvCid(c.id, r.session_ref)]) wait++;",
  "        else if (!r.mine && !r.theirs && !pbLvRuns()[pbLvCid(c.id, r.session_ref)] && !(typeof window.pbRfApproved === 'function' && window.pbRfApproved(c.id, r.session_ref))) wait++; /* feat_crew34 2: approved without production: not waiting */")

r('1e', "<input id=\"pmLiveQ' + k + '\" type=\"text\" inputmode=\"decimal\" autocomplete=\"off\" value=\"' + escapeHtml(r.qty) + '\" oninput=\"pbLvTyped(' + k + ', this.value)\">",
  "<input id=\"pmLiveQ' + k + '\" data-key=\"' + escapeHtml(r.key) + '\" type=\"text\" inputmode=\"decimal\" autocomplete=\"off\" value=\"' + escapeHtml(r.qty) + '\" oninput=\"pbLvTyped(' + k + ', this.value)\">")

# ---- 3 [DATA] the job number box when the run has none ----
r('3a', "        + F.rows.map((r, k) => '<div class=\"pb-field\"><label for=\"pmLiveQ' + k + '\">'",
  "        + (F.job ? '' : '<div class=\"pb-field\"><label for=\"pmLiveJob\">Job number</label><input id=\"pmLiveJob\" type=\"text\" list=\"pmLiveJobList\" maxlength=\"60\" autocomplete=\"off\" value=\"' + escapeHtml(F.jobTyped || '') + '\" oninput=\"pbLvJobTyped(this.value)\"><datalist id=\"pmLiveJobList\">' + (typeof pbNrJobs === 'function' ? pbNrJobs(pbArchiveOwnerUid) : []).map(j => '<option value=\"' + escapeHtml(j.n) + '\">' + escapeHtml(j.site || '') + '</option>').join('') + '</datalist><p class=\"pb-help\">This run has no job number, so its production would count toward no job.</p></div>') /* feat_crew34 3 */\n        + F.rows.map((r, k) => '<div class=\"pb-field\"><label for=\"pmLiveQ' + k + '\">'")
r('3b', "    if (!uid || uid === 'shared' || pbProd.uid !== uid || !st || pbProd.failed) { F.err = 'Production sync is paused on this phone, so this can’t be saved right now. Nothing was changed.'; pbLv.form = F; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); pbLvRender(); return; }",
  "    if (!uid || uid === 'shared' || pbProd.uid !== uid || !st || pbProd.failed) { F.err = 'Production sync is paused on this phone, so this can’t be saved right now. Nothing was changed.'; pbLv.form = F; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); pbLvRender(); return; }\n    if (!F.job) { const j = String(F.jobTyped || '').trim(); if (!j) { F.err = 'Enter the job number: this run has none, so its production would count toward no job.'; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); pbLvRender(); return; } F.job = j; } // feat_crew34 3")
r('3c', "  window.pbLvFormCancel = function() {",
  "  window.pbLvJobTyped = function(v) { if (pbLv.form) pbLv.form.jobTyped = String(v); }; // feat_crew34 3\n  window.pbLvFormCancel = function() {")
r('3d', "h = h.replace(/(id|for)=\"pmLive/g, '$1=\"cxRunLive')", "h = h.replace(/(id|for|list)=\"pmLive/g, '$1=\"cxRunLive')")

# ---- 4 [WORDING] ----
r('4a', "m.key !== PB_PROD_HOURS_KEY) : [];", "String(m.key).charAt(0) !== '_') : []; /* feat_crew34 4: the work only; hours have their own line */")
r('4b', "label: 'Crew man-hours (h)'", "label: 'Crew hours (h)'")
r('4c', "Your new runs then wait for any foreman (you get reminders to assign them or send them to the company). You can pick a foreman again any time.",
  "Your runs then show in no foreman’s crew view until a foreman adds you (or you pick one again). You can pick a foreman any time.")
r('4d', "Their new runs then wait for any foreman. Runs already assigned to you stay assigned.", "Their runs then leave your crew view; production you already entered for their runs stays.")
r('4e', "<span class=\"sub\">Pipelayer reminders and foreman assignments</span>", "<span class=\"sub\">Foreman: pipelayers’ runs assigned or held for you</span>")
r('4f', "const p = await pbCrewPushLocal(uid); el.checked = p.on !== false;",
  "const p = await pbCrewPushLocal(uid); el.checked = p.on !== false;\n    { await pbProdAccessFor(uid); const row = el.closest('label'); if (row) row.hidden = !pbLvIsForeman(uid); } /* feat_crew34 4: the reminder is the foreman's */")

r('4g', "    try { if (pbCurrentScreen === 'prodMine') pbRolesMine(); } catch (e) { console.error(e); }\n  }\n  window.pbRolesApply = pbRolesApply;",
  "    try { if (pbCurrentScreen === 'prodMine') pbRolesMine(); } catch (e) { console.error(e); }\n    try { if (pbCurrentScreen === 'notifications') pbCrewPushRender(); } catch (e) { console.error(e); } /* feat_crew34 4: the crew reminder row follows the role */\n  }\n  window.pbRolesApply = pbRolesApply;")

# ---- 5 [UX] report rows tell the runs apart ----
r('5', "+ '<span class=\"pbx-row-s\">' + pbCxE([x.who, 'sent ' + pbRfWhen(x.sent_at) + (x.sent_how === 'auto' ? ' (automatically)' : '')].join(' · ')) + '</span>'",
  "+ '<span class=\"pbx-row-s\">' + pbCxE([x.who, 'sent ' + pbRfWhen(x.sent_at) + (x.sent_how === 'auto' ? ' (automatically)' : '')].join(' · ')) + '</span>'\n        + (x.distance_ft != null || x.laid_ft != null || x.ended_at ? '<span class=\"pbx-row-s\">' + pbCxE([x.distance_ft != null ? pbRoFt(x.distance_ft) + ' run' : '', x.laid_ft != null ? pbRoFt(x.laid_ft) + ' marked laid' : '', x.ended_at ? 'ended ' + pbRfWhen(x.ended_at) : ''].filter(Boolean).join(' · ')) + '</span>' : '') /* feat_crew34 5 */")

# ---- 6 [UX] the just-saved run stays open; My production lists crew-run entries ----
r('6a', "const waiting = runs.filter(r => r !== cur && r.ended && !r.mine && !r.theirs && !pbLvRuns()[pbLvCid(p.id, r.session_ref)]); // r15.1: ended, nobody entered production: shown open\n      const others = runs.filter(r => r !== cur && !waiting.includes(r));",
  "const noProd = (r) => typeof window.pbRfApproved === 'function' && window.pbRfApproved(p.id, r.session_ref); /* feat_crew34 2: approved without production */\n      const waiting = runs.filter(r => r !== cur && r.ended && !r.mine && !r.theirs && !pbLvRuns()[pbLvCid(p.id, r.session_ref)] && !noProd(r)); // r15.1: ended, nobody entered production: shown open\n      const fresh = runs.filter(r => r !== cur && !waiting.includes(r) && pbLv.justSaved === pbLvCid(p.id, r.session_ref)); // feat_crew34 6: the one just saved stays open\n      const others = runs.filter(r => r !== cur && !waiting.includes(r) && !fresh.includes(r));")
r('6b', "waiting.map(r => pbLvRunHtml(p, r, pi, runs.indexOf(r), false) + pbLvProdHtml(p, r, pi, runs.indexOf(r), false)).join('') + '</div>' : '')",
  "waiting.map(r => pbLvRunHtml(p, r, pi, runs.indexOf(r), false) + pbLvProdHtml(p, r, pi, runs.indexOf(r), false)).join('') + '</div>' : '')\n        + (fresh.length ? '<div class=\"pbp-livewait\" id=\"pmLiveFresh' + pi + '\"><p class=\"pbp-h4\"><strong>Entered just now</strong></p>' + fresh.map(r => pbLvRunHtml(p, r, pi, runs.indexOf(r), false) + pbLvProdHtml(p, r, pi, runs.indexOf(r), false)).join('') + '</div>' : '') /* feat_crew34 6 */")
r('6c', "    pbProdForce = true; pbProdSyncSoon(0);\n    pbLvRender();\n  };",
  "    pbLv.justSaved = F.cid; // feat_crew34 6: stays open in the card until he leaves the screen\n    if (pbCurrentScreen === 'prodMine' && typeof window.pbRfApproveFor === 'function') window.pbRfApproveFor(F.pid, F.sref).catch(() => null); // feat_crew34 7: entered from My crew now: the sent report is approved too, as the report screen does\n    pbProdForce = true; pbProdSyncSoon(0);\n    pbLvRender();\n  };")
r('6d', "window.pbScreenHooks.push((name) => { if (name === 'prodMine') { pbLvRender(); pbLvLoad(pbArchiveOwnerUid, { force: true }).catch(() => null); } });",
  "window.pbScreenHooks.push((name) => { if (name === 'prodMine') { pbLv.justSaved = null; pbLvRender(); pbLvLoad(pbArchiveOwnerUid, { force: true }).catch(() => null); } });")
r('6e', "    if (tl) tl.innerHTML = tod.length ? '<ul class=\"pbp-entries\">' + tod.map(pbProdEntryHtml).join('') + '</ul>' : '<p class=\"pbp-dim pbp-none\">Nothing entered today yet.</p>';\n    if (el) el.innerHTML = old.length ? '<ul class=\"pbp-entries\">' + old.map(pbProdEntryHtml).join('') + '</ul>' : '<p class=\"pbp-dim pbp-none\">None.</p>';",
  "    if (tl) tl.innerHTML = tod.length || crewTod.length ? '<ul class=\"pbp-entries\">' + tod.map(pbProdEntryHtml).join('') + crewTod.map(pbLvMineRowHtml).join('') + '</ul>' : '<p class=\"pbp-dim pbp-none\">Nothing entered today yet.</p>'; /* feat_crew34 6: his entries for his crew's runs too */\n    if (el) el.innerHTML = old.length || crewOld.length ? '<ul class=\"pbp-entries\">' + old.map(pbProdEntryHtml).join('') + crewOld.map(pbLvMineRowHtml).join('') + '</ul>' : '<p class=\"pbp-dim pbp-none\">None.</p>';")
r('6f', "      : !shown.length ? pbRolesEmptyText('mine')", "      : !shown.length && !crewAll.length ? pbRolesEmptyText('mine')")
r('6g', "      : waiting.length ? waiting.length + ' run session' + (waiting.length === 1 ? '' : 's') + ' not synced yet'",
  "      : waiting.length + crewWait ? (waiting.length + crewWait) + ' run session' + (waiting.length + crewWait === 1 ? '' : 's') + ' not synced yet'")
r('6h', "    const earlier = pbProd.st ? pbProdEarlierSendable() : [];",
  "    const earlier = pbProd.st ? pbProdEarlierSendable() : [];\n    const crewAll = pbProd.uid === uid ? Object.values(pbLvRuns()).filter(x => x && x.rec && Array.isArray(x.items)).sort((a, b) => (b.at || 0) - (a.at || 0)) : [], crewTod = crewAll.filter(x => x.rec.workDate === today), crewOld = crewAll.filter(x => x.rec.workDate !== today).slice(0, 40), crewWait = crewAll.filter(x => (pbLvStateOf(x) || {}).k === 'wait').length; // feat_crew34 6")
r('6i', "  window.pbProdMineRender = function() {",
  "  // feat_crew34 6: a row for a crew-run entry (My crew now) under Today / Earlier, with the same chips as the card\n  function pbLvMineRowHtml(x) {\n    const s = pbLvStateOf(x) || { k: 'wait', label: '' }, plan = pbLvPlanObj(x.rec.jobNumber);\n    return '<li class=\"pbp-mine-row\" data-cid=\"' + escapeHtml(x.cid) + '\"><span class=\"pbp-ehead\">' + escapeHtml((x.name || 'Crew') + '’s run · ' + pbProdJobLabel(x.rec.jobNumber) + ' · ' + pbProdDayText(x.rec.workDate)) + '</span>'\n      + '<span class=\"pbp-eq\">' + escapeHtml(pbCrewQty(x.items, plan)) + '</span>' + pbRolesHoursHtml(x.items, plan) + '<span class=\"pb-chip ' + (s.k === 'ok' ? 'ok' : s.k === 'refused' ? 'notsent' : 'saved') + ' pbp-state\" data-state=\"' + s.k + '\">' + escapeHtml(s.label) + '</span></li>';\n  }\n  window.pbProdMineRender = function() {")

# ---- 7 [UX] Home doors (the safe part) ----
r('7', "if (names === null || names.length) out.push({ id: 'crewRuns'", "if ((names === null || names.length) && live > 0) out.push({ id: 'crewRuns' /* feat_crew34 7: only while a run is in progress; ended runs have the tile and the report list */")

# ---- smaller note: the jobs' "Your work today" refreshes after a claim / edit / approve lands ----
r('N1', "if (out.changed) setTimeout(() => pbCrewLoad(uid, { force: true }).catch(() => null), 0);",
  "if (out.changed) setTimeout(() => { pbCrewLoad(uid, { force: true }).catch(() => null); if (pbCurrentScreen === 'prodMine') Promise.resolve(window.pbProdScopeLoad()).catch(() => null); /* feat_crew34: the jobs' sums too */ }, 0);")

def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s)
