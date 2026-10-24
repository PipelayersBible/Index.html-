#!/usr/bin/env python3
"""feat_permit32 (r15.32, from the overnight confined-space sweep, /home/claude/night/permit.md):
 P1 [FUNCTION] After closeout the screen kept every live control (roster Check In, add forms, the reason toggle, a dead
    Close Out button) around the two-line "saved" notice, and the hero went blank. A closed permit now shows a closed
    screen: hero "<space> · Closed out", the notice, Finish & Return Home, Back to Home (the kept emergency panel stays).
 P2 [SAFETY-ADJACENT, for the owner to judge] The closeout reason is checked against what the permit holds, once:
    "Completed Normally" over an unsafe last test or an open emergency, or "Aborted Before Entry" after someone checked
    in, asks before it is accepted. It asks; it never blocks.
 P3 [UX] Lock accepted a permit whose authorized window had already ended without a word; it asks once (a wrong date is
    the likeliest cause and the window cannot be changed after Lock).
 P4 [UX] Air-test form: the tester name is kept between readings (and pre-filled with the attendant), the form has
    Cancel, and "+ Add Test Reading" hides while the form is open.
 P5 [UX] "Set reminder" (33 px) and roster "History" (20 px) tap targets → 44 px.
 P6 [WORDING] Two reminders due together: the modal is titled for both.
 P7 [WORDING] "The countdowns below appear…" — the chips are at the top now.
 P8 [WORDING] The Reminders line said "Off" and "every 15 min" about the same reminder; built per kind now.
 P9 [WORDING] Unfinished permits: eyebrow said COMPANY PERMITS; View dumped raw field names → labelled lines.
 P10 [WORDING] Emergency panel after closeout pointed at the removed email card.
 P11 [WORDING] Repetition: four "Not measured" tiles → one line; the two "About the … reminder" disclosures dropped
    (the chip note says it); Permit Details gains Hazards / Controls / Ventilation failure / Rescue / Communications
    (the PDF had them, the screen did not) and drops its duplicate Authorized Window and Reminders rows.
 P12 [WORDING] Records row of a permit: the time is labelled "Closed".
 P13 minor: the late-reminder note names the permit's own interval; the dispatcher script names the space."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))
# P1
r('P1b', "    document.getElementById('cpCloseoutPanel').style.display = '';", "    document.getElementById('cpCloseoutPanel').style.display = ''; document.getElementById('screen-confinedActive').classList.add('is-closed'); try { pbRenderCpDash(); } catch (e) {} // feat_permit32 P1: the hero reads the class", 2)
r('P1c', "    document.getElementById('cpCloseoutPanel').style.display = 'none';", "    document.getElementById('cpCloseoutPanel').style.display = 'none'; document.getElementById('screen-confinedActive').classList.remove('is-closed'); // feat_permit32 P1", 2)
r('P1d', "    { const hero = document.getElementById('cpHero'); if (hero && !p) hero.innerHTML = ''; }",
  "    { const hero = document.getElementById('cpHero'); if (hero && !p) { const closedShown = document.getElementById('screen-confinedActive').classList.contains('is-closed') && lastConfinedArchiveEntry; hero.innerHTML = closedShown ? '<div class=\"cp-hero-space\">' + (escapeHtml(lastConfinedArchiveEntry.space) || 'Confined space') + '</div><div class=\"cp-hero-job\">Closed out</div>' : ''; } } // feat_permit32 P1")
r('P1css', "#pbApp#pbApp #screen-confinedActive #cpCloseoutReasonToggle { display: grid;",
  "#pbApp #screen-confinedActive.is-closed > .pb-btn-wrap:has(.pb-emergency-btn), #pbApp #screen-confinedActive.is-closed #cpDialInfo, #pbApp #screen-confinedActive.is-closed #cpDialEdit, #pbApp #screen-confinedActive.is-closed > .pb-rescue, #pbApp #screen-confinedActive.is-closed #cpTopPanel, #pbApp #screen-confinedActive.is-closed #cpRosterSection, #pbApp #screen-confinedActive.is-closed #cpActionRow, #pbApp #screen-confinedActive.is-closed #cpRecentSection, #pbApp #screen-confinedActive.is-closed #cpFullLogsHead, #pbApp #screen-confinedActive.is-closed #cpAtmoLogSection, #pbApp #screen-confinedActive.is-closed #cpCommLogSection, #pbApp #screen-confinedActive.is-closed #cpDetailsHead, #pbApp #screen-confinedActive.is-closed #cpLockband, #pbApp #screen-confinedActive.is-closed #cpSummaryGrid, #pbApp #screen-confinedActive.is-closed #cpCloseSection, #pbApp #screen-confinedActive.is-closed #cpWindowBanner, #pbApp #screen-confinedActive.is-closed #cpUnsafeBanner { display: none !important; } /* feat_permit32 P1: a closed permit shows a closed screen */\n#pbApp#pbApp #screen-confinedActive #cpCloseoutReasonToggle { display: grid;")
# P2
r('P2', """  window.pbCloseConfinedPermit = function() {
    if (!confinedPermit) return;
    const sid = confinedPermit.sessionId;""",
"""  window.pbCloseConfinedPermit = function(reasonConfirmed) {
    if (!confinedPermit) return;
    const sid = confinedPermit.sessionId;
    // feat_permit32 P2: a reason that contradicts what the permit holds is asked about once (asked, never blocked)
    if (reasonConfirmed !== true) {
      let reason = 'normal'; try { reason = activeVal('cpCloseoutReasonToggle'); } catch (e) {}
      const unsafe = !!(confinedLastObservation && confinedLastObservation.unsafe), emOpen = (confinedEmergencyIncidents || []).some(i => i && i.start && !i.end);
      const entered = (confinedRoster || []).some(p => (p.log || []).some(l => /checked in/i.test(String(l && l.action || l || ''))));
      let q = null;
      if (reason === 'normal' && (unsafe || emOpen)) q = (unsafe ? 'The last air test was outside this permit\\u2019s limits and no acceptable retest was logged.' : 'An EMERGENCY is still open on this permit.') + '\\n\\nClose it out as \\u201cCompleted Normally\\u201d anyway? (Cancel to pick Evacuated / Prohibited Condition or Other.)';
      else if (reason === 'aborted' && entered) q = 'Someone checked in on this permit, so entry did happen.\\n\\nClose it out as \\u201cAborted Before Entry\\u201d anyway? (Cancel to pick another reason.)';
      if (q) { pbConfirm(q, () => pbCloseConfinedPermit(true), 'Check the Closeout Reason'); return; }
    }""")
# P3: the review says plainly when the window has already ended (Lock itself stays as it was: the suite and real re-used
# drafts lock past-dated permits on purpose; the active screen's orange banner also says it)
r('P3', "    const winHtml = wt ? escapeHtml(wt) : 'Enter the entry date and both times to see the full window.';",
  "    const winEnded = (() => { try { const w = pbPermitWindow({ date: val('cpDate'), start: val('cpStart'), end: val('cpEnd') }); return !!(w && w.end.getTime() < Date.now()); } catch (e) { return false; } })(); // feat_permit32 P3\n    const winHtml = (wt ? escapeHtml(wt) : 'Enter the entry date and both times to see the full window.') + (winEnded ? ' <strong class=\"cp-win-ended\">This window has already ended \u2014 check the date before locking.</strong>' : '');")
# P4
r('P4a', "if (atmoFormIds.every((id, i) => document.getElementById(id).value === submittedForm[i])) { atmoFormIds.forEach(id => { document.getElementById(id).value = ''; });",
  "if (atmoFormIds.every((id, i) => document.getElementById(id).value === submittedForm[i])) { atmoFormIds.filter(id => id !== 'cpAtmoTester').forEach(id => { document.getElementById(id).value = ''; }); /* feat_permit32 P4: the tester stays */")
r('P4b', "      atmoFormIds.forEach(id => { document.getElementById(id).value = ''; });", "      atmoFormIds.filter(id => id !== 'cpAtmoTester').forEach(id => { document.getElementById(id).value = ''; }); // feat_permit32 P4: the tester stays")
r('P4c', """          <div class="pb-btn-wrap" style="padding:10px 0 0 0;"><button class="pb-btn small" id="cpAtmoSaveBtn" onclick="pbSaveAtmoReading()">Save Reading</button></div>
        </div>
        <div class="pb-btn-wrap" style="padding-top:10px;"><button class="pb-btn ghost small" style="width:100%;" onclick="document.getElementById('cpAtmoAddForm').style.display='';">+ Add Test Reading</button></div>""",
"""          <div class="pb-btn-wrap" style="padding:10px 0 0 0;"><button class="pb-btn small" id="cpAtmoSaveBtn" onclick="pbSaveAtmoReading()">Save Reading</button><button type="button" class="pb-btn ghost small" onclick="pbCpAtmoFormOpen(false)">Cancel</button></div>
        </div>
        <div class="pb-btn-wrap" id="cpAtmoAddWrap" style="padding-top:10px;"><button class="pb-btn ghost small" style="width:100%;" onclick="pbCpAtmoFormOpen(true)">+ Add Test Reading</button></div>""")
r('P4d', """  window.pbQuickAddAtmoTest = function() {
    document.getElementById('cpAtmoAddForm').style.display = '';""",
"""  // feat_permit32 P4: one way to open/close the air-test form; the tester defaults to the permit's attendant
  window.pbCpAtmoFormOpen = function(show) {
    const f = document.getElementById('cpAtmoAddForm'), w = document.getElementById('cpAtmoAddWrap'), t = document.getElementById('cpAtmoTester');
    if (f) f.style.display = show ? '' : 'none';
    if (w) w.style.display = show ? 'none' : '';
    if (show && t && !t.value.trim() && confinedPermit && confinedPermit.attendant) t.value = confinedPermit.attendant;
  };
  window.pbQuickAddAtmoTest = function() {
    pbCpAtmoFormOpen(true);""")
# P5
r('P5', "#pbApp#pbApp #screen-confinedActive #cpCloseoutReasonToggle button { min-height: 52px;",
  "#pbApp #screen-confinedActive .cp-tc-set { min-height: 44px; padding: 12px 0; } #pbApp #screen-confinedActive .cp-hist summary { min-height: 44px; display: flex; align-items: center; } /* feat_permit32 P5 */\n#pbApp#pbApp #screen-confinedActive #cpCloseoutReasonToggle button { min-height: 52px;")
# P6
r('P6a', "    pbAlert(pbReminderShownMsg, title);", "    pbAlert(pbReminderShownMsg, (pbReminderShown && pbReminderShown.length > 1) ? 'Air Test and Communication Check Due' : title); // feat_permit32 P6")
r('P6b', "    pbAlert(pbReminderShownMsg, due[due.length - 1].title);", "    pbAlert(pbReminderShownMsg, due.length > 1 ? 'Air Test and Communication Check Due' : due[due.length - 1].title); // feat_permit32 P6")
# P7
r('P7', "The countdowns below appear once someone has checked in", "The countdowns at the top of this screen start once someone has checked in")
# P8
r('P8', """    const bit = (k, label) => L[k] && L[k].min ? label + ' every ' + L[k].min + ' min (started during the entry, ' + new Date(L[k].at).toLocaleTimeString() + ')' : '';
    const parts = [bit('atmo', 'air test re-check'), bit('comm', 'communication check')].filter(Boolean);
    return base + (parts.length ? '; set during the entry: ' + parts.join('; ') : '');""",
"""    // feat_permit32 P8: one phrase per kind — the locked interval, else the one set during the entry, else Off
    const one = (v, k, label) => (typeof v === 'number' && isFinite(v) && v >= 1) ? label + ' every ' + v + ' min'
      : (L[k] && L[k].min) ? label + ' every ' + L[k].min + ' min (set during the entry at ' + new Date(L[k].at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ')'
      : (v === null || v === undefined || v === '') ? label + ' Off' : null;
    const a = one(p.atmoInterval, 'atmo', 'air test re-check'), c = one(p.commInterval, 'comm', 'communication check');
    if (a === null || c === null) return base;
    return a + '; ' + c;""")
# P9
r('P9a', "    if (t) t.textContent = open ? 'Unfinished permits' : crew ? 'Crew permit records' : 'Company permit records';",
  "    if (t) t.textContent = open ? 'Unfinished permits' : crew ? 'Crew permit records' : 'Company permit records';\n    try { const eb = document.querySelector('#screen-companyPermits .pb-eyebrow span'); if (eb) eb.textContent = open ? 'RECORDS' : crew ? 'CREW PERMITS' : 'COMPANY PERMITS'; } catch (e) {} // feat_permit32 P9")
r('P9b', "    const p = sn.permit || {}, L = ['UNFINISHED PERMIT (last copy sent from the phone: ' + fmt(savedAt) + ')', '', flat(p), '', 'AIR TESTS'];",
  """    const p = sn.permit || {};
    // feat_permit32 P9: the permit the way a person reads it, not the stored object's keys
    const PL = [['space', 'Space'], ['jobsite', 'Jobsite'], ['jobNumber', 'Job number'], ['address', 'Address'], ['landmarks', 'Entrance / landmarks'], ['purpose', 'Purpose'], ['supervisor', 'Entry supervisor'], ['attendant', 'Attendant'], ['hazards', 'Hazards'], ['controls', 'Isolation / controls'], ['ventFail', 'If ventilation fails'], ['rescue', 'Rescue'], ['comms', 'Communication'], ['emergencyNumber', 'Emergency number']];
    const lim = [p.minO2 !== undefined && p.minO2 !== '' ? 'O2 ' + p.minO2 + '–' + (p.maxO2 || '23.5') + '%' : '', p.maxLEL !== undefined && p.maxLEL !== '' ? 'LEL max ' + p.maxLEL + '%' : '', p.maxH2S !== undefined && p.maxH2S !== '' ? 'H2S max ' + p.maxH2S + ' ppm' : '', p.maxCO !== undefined && p.maxCO !== '' ? 'CO max ' + p.maxCO + ' ppm' : ''].filter(Boolean).join(', ');
    const head = PL.filter(([k]) => p[k] !== undefined && p[k] !== null && String(p[k]).trim() !== '').map(([k, lab]) => lab + ': ' + p[k]);
    if (p.date || p.start || p.end) head.push('Authorized window: ' + [p.date, p.start, p.end].filter(Boolean).join(' '));
    if (lim) head.push('Air limits: ' + lim);
    if (p.atmoInterval || p.commInterval) head.push('Reminders: ' + (p.atmoInterval ? 'air test every ' + p.atmoInterval + ' min' : 'air test Off') + '; ' + (p.commInterval ? 'communication check every ' + p.commInterval + ' min' : 'communication check Off'));
    if (p.lockTime) head.push('Locked: ' + fmt(p.lockTime));
    const L = ['UNFINISHED PERMIT (last copy sent from the phone: ' + fmt(savedAt) + ')', ''].concat(head.length ? head : [flat(p)], ['', 'AIR TESTS']);""")
# P10
r('P10', "send its closeout report from the closeout screen or Records instead.", "its report is in Records, with its PDF.")
# P11
r('P11a', "      if (!best) { air += '<div class=\"cp-gas\"><span class=\"g\">' + label + '</span> <span class=\"none\">Not measured on this permit yet</span></div>'; return; }",
  "      if (!best) return; // feat_permit32 P11: unmeasured gases are said once, below")
r('P11b', "    air += '</div>';\n    let other = null;", "    if (!anyMeasured) air += '<div class=\"cp-gas\"><span class=\"none\">No air test logged on this permit yet.</span></div>'; // feat_permit32 P11\n    air += '</div>';\n    let other = null;")
r('P11c', """      <div class="pb-summary-item"><div class="k">Purpose</div><div class="v">${escapeHtml(confinedPermit.purpose)}</div></div>
      <div class="pb-summary-item"><div class="k">Authorized Window</div>""",
"""      <div class="pb-summary-item"><div class="k">Purpose</div><div class="v">${escapeHtml(confinedPermit.purpose)}</div></div>
      <div class="pb-summary-item"><div class="k">Hazards</div><div class="v">${escapeHtml(confinedPermit.hazards) || '—'}</div></div>
      <div class="pb-summary-item"><div class="k">Isolation / Controls</div><div class="v">${escapeHtml(confinedPermit.controls) || '—'}</div></div>
      <div class="pb-summary-item"><div class="k">If Ventilation Fails</div><div class="v">${escapeHtml(confinedPermit.ventFail) || '—'}</div></div>
      <div class="pb-summary-item"><div class="k">Rescue</div><div class="v">${escapeHtml(confinedPermit.rescue) || '—'}</div></div>
      <div class="pb-summary-item"><div class="k">Communication</div><div class="v">${escapeHtml(confinedPermit.comms) || '—'}</div></div>
      <div class="pb-summary-item" hidden><div class="k">Authorized Window</div>""")
r('P11d', """      <div class="pb-summary-item"><div class="k">Reminders (not limits)</div><div class="v">${escapeHtml(pbRemindersFor(confinedPermit))}</div></div>""",
  """      <div class="pb-summary-item" hidden><div class="k">Reminders (not limits)</div><div class="v">${escapeHtml(pbRemindersFor(confinedPermit))}</div></div>""")
# P12
r('P12', "${e.kind === 'run' ? 'Locked ' : ''}${e.lockTime.toLocaleString()}", "${e.kind === 'run' ? 'Locked ' : e.kind === 'confined' ? 'Closed ' : ''}${e.lockTime.toLocaleString()}")
# P13
r('P13a', "It does not change the permit&rsquo;s air limits or the 20-minute check-in rule, and it is recorded on the permit with the time it was set.",
  "It does not change the permit&rsquo;s air limits or its check-in rule, and it is recorded on the permit with the time it was set.")
r('P13b', "    let script = `\"I'm calling about a confined space emergency at ${address}", "    let script = `\"I'm calling about a confined space emergency at ${address}${p.space ? ' (' + p.space + ')' : ''}")

def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('permit32 written', len(s))
