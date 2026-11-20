# permit_short_nov19 02: the new permit items on the active permit, the record and the PDF; plain PDF wording.
# `python3 02_permit_records_pdf.py in.html out.html` (after 01)
#  - active permit: Gas Meter and How Entrants See This Permit in Permit Details; one line over the roster:
#    "Show this permit to each entrant before they go in." (29 CFR 1926.1205(c))
#  - closeout record + text report + PDF items (n)/(o): the meter, its last bump test or calibration, how the permit
#    was made available; the state rule the permit was built to. A permit saved before this prints "not recorded".
#  - PDF: programmer wording replaced (received_at, "minO2 standard", "its time zone is not written").
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

# helper words (next to the limits text the records already use)
p.rep("  function pbRemindersText(atmo, comm) {",
      "  // permit_short: the gas meter line and plain words for which limits were typed, for the records and the PDF\n"
      "  function pbCpMeterText(p) { const m = p && typeof p.meter === 'string' ? p.meter.trim() : ''; const c = p && typeof p.meterCal === 'string' ? p.meterCal.trim() : ''; return m ? m + (c ? ', last bump test or calibration ' + c : ', bump test or calibration date not recorded') : (c ? 'meter not named, last bump test or calibration ' + c : 'not recorded'); }\n"
      "  function pbCpLimitWords(o) { if (!o || typeof o !== 'object') return ''; const names = { minO2: 'min O2', maxO2: 'max O2', maxLEL: 'max LEL', maxH2S: 'max H2S', maxCO: 'max CO' }; const typed = Object.keys(names).filter(k => o[k] === 'entered').map(k => names[k]); return typed.length ? ' (typed on this permit: ' + typed.join(', ') + '; the rest are the standard values)' : ' (the standard values; none was changed on this permit)'; }\n"
      "  function pbRemindersText(atmo, comm) {")

# active permit: Permit Details
p.rep("""      <div class="pb-summary-item"><div class="k">Equipment Notes</div><div class="v">${escapeHtml(confinedPermit.eqNotes) || '—'}</div></div>\n""",
      """      <div class="pb-summary-item"><div class="k">Equipment Notes</div><div class="v">${escapeHtml(confinedPermit.eqNotes) || '—'}</div></div>
      ${typeof confinedPermit.meter === 'string' ? `<div class="pb-summary-item"><div class="k">Gas Meter</div><div class="v">${escapeHtml(pbCpMeterText(confinedPermit))}</div></div>` : ''}
      ${confinedPermit.permitShown ? `<div class="pb-summary-item"><div class="k">How Entrants See This Permit</div><div class="v">${escapeHtml(confinedPermit.permitShown)}</div></div>` : ''}
""")
# active permit: the line over the roster
p.rep('        <div id="cpRosterList"></div>',
      '        <p class="pb-help cp-show-note" id="cpShowNote" style="margin:0 0 8px 0;">Show this permit to each entrant before they go in.</p>\n        <div id="cpRosterList"></div>')

# text report
p.rep("    lines.push('Equipment provided: ' + (eq.length ? eq.join(', ') : 'None checked') + (p.eqNotes ? ' — ' + p.eqNotes : ''));",
      "    lines.push('Equipment provided: ' + (eq.length ? eq.join(', ') : 'None checked') + (p.eqNotes ? ' — ' + p.eqNotes : ''));\n"
      "    if (typeof p.meter === 'string') lines.push('Gas meter: ' + pbCpMeterText(p));\n"
      "    if (p.permitShown) lines.push('Permit made available to entrants: ' + p.permitShown);")

# closeout record
p.rep("        addlPermits: confinedPermit.addlPermits,\n        limitOrigin: confinedPermit.limitOrigin,",
      "        addlPermits: confinedPermit.addlPermits,\n"
      "        ...(typeof confinedPermit.meter === 'string' ? { meter: confinedPermit.meter, meterCal: confinedPermit.meterCal || '', permitShown: confinedPermit.permitShown || '', ruleState: confinedPermit.ruleState || '' } : {}), /* permit_short: only on permits locked with these boxes */\n"
      "        limitOrigin: confinedPermit.limitOrigin,")
p.rep("'eqNotes', 'addlPermits', 'miscNotes']\n        .forEach(k => {", "'eqNotes', 'addlPermits', 'miscNotes', 'meter', 'meterCal', 'permitShown']\n        .forEach(k => {")

# PDF: plain words
p.rep(" + ' (device time of the server\\u2019s answer; the server\\u2019s own received_at is kept on the server)' : '')",
      " + ' (this phone\\u2019s clock; the company account keeps its own time of receipt)' : '')")
p.rep("return w || (raw ? raw + ' (as entered on the permit; local time, zone not written)' : null); })()], ['Permit locked', pbRptPermitLocked(e) ? pbRptPermitLocked(e) + ' (as written in the record, on the phone that locked it; its time zone is not written)' : null],",
      "return w || (raw ? raw + ' (as entered on the permit, local time)' : null); })()], ['Permit locked', pbRptPermitLocked(e) ? pbRptPermitLocked(e) + ' (the time on the phone that locked it)' : null],")
p.rep(" + (p.limitOrigin ? ' (' + Object.keys(p.limitOrigin).map(k => k + ' ' + p.limitOrigin[k]).join(', ') + ')' : '')],",
      " + pbCpLimitWords(p.limitOrigin)],")
p.rep(" + (p.eqNotes ? '\\n' + p.eqNotes : '')],\n      ['(o)', 'Other information for safety', [p.landmarks ? 'Entrance / landmarks: ' + p.landmarks : '', p.miscNotes ? 'Notes: ' + p.miscNotes : ''].filter(Boolean).join('\\n') || 'none recorded'],",
      " + (p.eqNotes ? '\\n' + p.eqNotes : '') + '\\nGas meter used: ' + pbCpMeterText(p)],\n      ['(o)', 'Other information for safety', [p.landmarks ? 'Entrance / landmarks: ' + p.landmarks : '', p.permitShown ? 'How entrants saw this permit before entry (1926.1205(c)): ' + p.permitShown : '', p.miscNotes ? 'Notes: ' + p.miscNotes : ''].filter(Boolean).join('\\n') || 'none recorded'],")
p.rep("    // --- air\n    R.section('air', 'Atmospheric test log ('",
      "    if (typeof p.ruleState === 'string') { try { R.para(pbCpRuleText(p.ruleState), { size: 9, color: G.MUTED }); } catch (x) {} } /* permit_short: the state rule the form was built to */\n"
      "    // --- air\n    R.section('air', 'Atmospheric test log ('")
p.rep("intro: 'Every recorded event in time order. Times are device times; this record\\u2019s events have no server-received time (the backup records when the closed permit reached the server, shown under Integrity).' + (tl.locked ? ' Permit locked (authorized): ' + tl.locked + ' (as written in the record).' : '') });",
      "intro: 'Every recorded event in time order, by the clock of the phone that recorded it. When the closed permit reached the company account is shown under Integrity.' + (tl.locked ? ' Permit locked (authorized): ' + tl.locked + '.' : '') });")
p.rep("(pbRptPermitLocked(e) ? ' when locked ' + pbRptPermitLocked(e) + ' (as written in the record; its time zone is not written)' : '')",
      "(pbRptPermitLocked(e) ? ' when locked ' + pbRptPermitLocked(e) + ' (the time on the phone that locked it)' : '')")
p.save()
