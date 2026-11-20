# permit_short_nov19 01: the entry permit FORM, shortened. `python3 01_permit_form_short.py in.html out.html`
#  - the form markup is replaced by 01_new_form.html (every old box id kept, so old drafts restore and the lock code
#    reads the same boxes; new: cpMeter, cpMeterCal, cpPosted, cpRulesLine, cpLimitsLine, cpNamesList)
#  - optional boxes sit behind "More details" folds that open by themselves whenever they hold a value or an error
#  - prefill (marked auto, like the Job number): jobsite from the Current job, supervisor from the account's name,
#    start time now; name suggestions from past permits; "Copy From Last Permit" prefers the last permit for the same space
#  - the lock stores meter, meterCal, permitShown, ruleState. No lock rule, limit, timer or check is changed.
import os, sys, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
HERE = os.path.dirname(os.path.abspath(__file__))
new_form = open(os.path.join(HERE, '01_new_form.html'), encoding='utf-8').read()

# --- 1. markup: from the draft band to the active-permit comment
A = '    <div class="cp-draft-band" id="cpDraftBand" role="note">'
B = '  <!-- CONFINED SPACE ACTIVE PERMIT -->'
assert p.s.count(A) == 1 and p.s.count(B) == 1
i, j = p.s.index(A), p.s.index(B)
old = p.s[i:j]
assert hashlib.md5(old.encode()).hexdigest() == 'ba01c56047fa0b76a0f67a20ac8b7e4f', 'the form markup changed since this patch was written: ' + hashlib.md5(old.encode()).hexdigest()
p.s = p.s[:i] + new_form + p.s[j:]

# --- 2. CSS
p.rep('#pbApp #screen-confinedPermit input.pb-cp-auto { color: var(--pb-text-2); font-style: italic; }',
      '#pbApp #screen-confinedPermit input.pb-cp-auto { color: var(--pb-text-2); font-style: italic; }\n'
      '/* permit_short (Nov 19): the shorter permit form */\n'
      '#pbApp #screen-confinedPermit [hidden] { display: none !important; }\n'
      '#pbApp #screen-confinedPermit .cp-ticks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }\n'
      '#pbApp #screen-confinedPermit .cp-ticks > .pb-field { margin: 0; min-width: 0; }\n'
      '#pbApp #screen-confinedPermit .cp-ticks > .pb-field > label { min-height: 44px; }\n'
      '#pbApp #screen-confinedPermit .cp-ticks > .pb-field:has(input[type=checkbox]:checked):has([id$="ExplainWrap"]) { grid-column: 1 / -1; padding-bottom: 8px; }\n'
      '#pbApp #screen-confinedPermit .cp-ticks-head, #pbApp #screen-confinedPermit .cp-entrants-line, #pbApp #screen-confinedPermit .cp-limits-line, #pbApp #screen-confinedPermit .cp-reuse-line { margin: 8px 0 2px 0; font-size: 14px; line-height: 1.45; color: var(--pb-text-2); }\n'
      '#pbApp #screen-confinedPermit .cp-limits-line { color: var(--pb-text); }\n'
      '#pbApp #screen-confinedPermit details.cp-more > .pb-field, #pbApp #screen-confinedPermit details.cp-more > .pb-row { margin-top: 8px; }\n'
      '#pbApp #screen-confinedPermit .cp-review-jump:has(#cpDraftMissing:empty) { display: none; }\n'
      '#pbApp#pbApp #screen-confinedPermit .cp-row-wide { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 0 12px; align-items: end; }\n'
      '#pbApp#pbApp #screen-confinedPermit .cp-row-wide > .pb-field { width: auto; min-width: 0; }')

# --- 3. a fresh form: the new boxes are emptied, then prefilled
p.rep("'cpSupervisor','cpSupervisorInitials','cpAttendant','cpMiscNotes','cpEqNotes','cpAddlPermits','cpAtmoInterval','cpCommInterval'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });",
      "'cpSupervisor','cpSupervisorInitials','cpAttendant','cpMiscNotes','cpEqNotes','cpAddlPermits','cpAtmoInterval','cpCommInterval','cpMeter','cpMeterCal'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });\n"
      "    { const ps = document.getElementById('cpPosted'); if (ps) ps.selectedIndex = 0; } /* permit_short */")
p.rep("    pbCpJobAutoFill(); // clean_c (owner #9): a blank Job number takes the Current job\n",
      "    pbCpJobAutoFill(); // clean_c (owner #9): a blank Job number takes the Current job\n"
      "    try { pbCpPrefill(); } catch (e) { console.error(e); } /* permit_short: what the app already knows */\n")

# --- 4. helpers
p.rep("  const HAZARD_KEYS = [\n", r"""  // permit_short (Nov 19). Prefill what the app already knows, marked auto exactly like the Job number above (an
  // untouched auto value is not typed work: no draft, no Leave question). Initials, the attendant, the address and the
  // meter's test date are never prefilled: each is a statement about today, made by a person.
  function pbCpAutoSet(id, val) {
    const el = document.getElementById(id); val = String(val || '').trim();
    if (!el || !val || el.value.trim() !== '') return;
    el.value = val; el.dataset.cpAuto = val; el.classList.add('pb-cp-auto');
    if (!el.dataset.cpAutoWired) { el.dataset.cpAutoWired = '1'; el.addEventListener('input', () => { el.classList.remove('pb-cp-auto'); delete el.dataset.cpAuto; }); }
  }
  function pbCpAutoClear(id) { const el = document.getElementById(id); if (el) { el.classList.remove('pb-cp-auto'); delete el.dataset.cpAuto; } }
  function pbCpPastPermits() { try { return runArchive.filter(e => e && e.kind === 'confined' && e.permit); } catch (e) { return []; } }
  // Copy From Last Permit: the last permit for the SAME space when there is one, else the last permit.
  function pbCpReuseSource() {
    const all = pbCpPastPermits(); if (!all.length) return null;
    const sp = pbCpVal('cpSpace').toLowerCase();
    return (sp && all.find(e => String(e.space || '').trim().toLowerCase() === sp)) || all[0];
  }
  function pbCpNames() {
    const out = [], add = (n) => { n = String(n || '').trim(); if (n && !out.some(x => x.toLowerCase() === n.toLowerCase())) out.push(n); };
    try { add(pbRfMyName(pbArchiveOwnerUid)); } catch (e) {}
    pbCpPastPermits().slice(0, 12).forEach(e => { add(e.permit.supervisor); add(e.permit.attendant); (e.roster || []).forEach(r => add(r && r.name)); });
    return out.slice(0, 30);
  }
  function pbCpPrefill() {
    ['cpJobsite', 'cpSupervisor'].forEach(pbCpAutoClear);
    let cj = null; try { cj = typeof window.pbCurJobGet === 'function' ? window.pbCurJobGet() : null; } catch (e) { cj = null; }
    if (cj && cj.name) pbCpAutoSet('cpJobsite', cj.name);
    let me = ''; try { me = pbRfMyName(pbArchiveOwnerUid) || ''; } catch (e) { me = ''; }
    pbCpAutoSet('cpSupervisor', me);
    const st = document.getElementById('cpStart'); if (st && !st.value) { const n = new Date(); st.value = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); }
    const dl = document.getElementById('cpNamesList'); if (dl) dl.innerHTML = pbCpNames().map(n => '<option value="' + escapeHtml(n) + '"></option>').join('');
    document.querySelectorAll('#screen-confinedPermit details.cp-more').forEach(d => { d.open = false; });
    pbCpShortSync();
  }
  // The rule the permit is built to. Every state plan but Oregon and Washington adopted the federal construction rule
  // word for word (OSHA's adoption table, 2015-05-04 final rule); California's 8 CCR 1955 is the same 16 items.
  // Checked 2026-11-19; sources in tests/staged/permit_short_nov19/NOTES.md. Re-check with the yearly state table.
  const PB_CP_RULES = { checked: '2026-11-19', fed: '29 CFR 1926.1206', states: {
    CA: { name: 'California', cite: '8 CCR 1955' },
    OR: { name: 'Oregon', cite: 'OAR 437-002-0146(6)(b)', sign: true },
    WA: { name: 'Washington', cite: 'WAC 296-809-50004' } } };
  window.PB_CP_RULES = PB_CP_RULES;
  // The job's state: the site address first, then the state rules' own answer for the job (picked, address, company).
  // '' when nothing says (the state table's own fallback is not taken as knowledge).
  function pbCpRuleState(addr, jobNumber) {
    let c = ''; try { c = window.pbSrMath.parse(addr) || ''; } catch (e) { c = ''; }
    if (!c) { try { const s = window.pbSrJobState(jobNumber || ''); if (s && s.how !== 'default') c = s.code; } catch (e) { c = ''; } }
    return c;
  }
  function pbCpRuleText(code) {
    const s = code && Object.prototype.hasOwnProperty.call(PB_CP_RULES.states, code) ? PB_CP_RULES.states[code] : null;
    let t = 'Permit items: federal OSHA ' + PB_CP_RULES.fed + (s ? ' and ' + s.name + ' ' + s.cite : '') + '.';
    if (s && s.sign) t += ' ' + s.name + ' asks for the supervisor’s signature, not initials: print the permit and have the supervisor sign it.';
    else if (!code) t += ' State not known (add it to the site address). In Oregon the supervisor also signs the printed permit.';
    return t;
  }
  window.pbCpRuleText = pbCpRuleText; window.pbCpRuleState = pbCpRuleState;
  // Folds never hide a value or an error; the air-limit line, the Copy button and the rule line say what is true now.
  function pbCpShortSync() {
    const scr = document.getElementById('screen-confinedPermit'); if (!scr) return;
    scr.querySelectorAll('details.cp-more').forEach(d => {
      if (d.open) return;
      const has = [...d.querySelectorAll('input, textarea, select')].some(el => el.getAttribute('aria-invalid') === 'true' || (el.type === 'checkbox' ? el.checked : (String(el.value || '').trim() !== '' && !pbCpJobIsAuto(el))));
      if (has) d.open = true;
    });
    const ll = document.getElementById('cpLimitsLine');
    if (ll) { const v = (id, d) => { const n = numVal(id); return n !== null ? n : d; }; ll.textContent = 'Air limits the app checks every test against: O2 ' + v('cpMinO2', 19.5) + ' to ' + v('cpMaxO2', 23.5) + '%, LEL up to ' + v('cpMaxLEL', 10) + '%, H2S up to ' + v('cpMaxH2S', 10) + ' ppm, CO up to ' + v('cpMaxCO', 25) + ' ppm.'; }
    const src = pbCpReuseSource(), rw = document.getElementById('cpReuseWrap'), rl = document.getElementById('cpReuseLine');
    if (rw) rw.style.display = src ? '' : 'none';
    if (rl && src) { let when = ''; try { when = new Date(src.lockTime).toLocaleDateString(); } catch (e) {} rl.textContent = 'From ' + (src.space || 'the last space') + (when ? ', ' + when : '') + ': hazards, controls, air limits, equipment, gas meter and rescue plan. Check each one for this space.'; }
    const rr = document.getElementById('cpRulesLine'); if (rr) rr.textContent = pbCpRuleText(pbCpRuleState(pbCpVal('cpAddress'), pbCpVal('cpJobNumber')));
  }
  const HAZARD_KEYS = [
""")

# --- 5. Copy From Last Permit: same space first; equipment and the meter come too (never the meter's test date)
p.rep("    const lastPermit = runArchive.find(e => e.kind === 'confined' && e.permit);\n    if (!lastPermit) { pbAlert('No previous permit found to reuse from.'); return; }",
      "    const lastPermit = pbCpReuseSource(); /* permit_short: the last permit for the same space, else the last permit */\n    if (!lastPermit) { pbAlert('No previous permit found to reuse from.'); return; }")
p.rep("    document.getElementById('cpComms').value = p.comms || '';\n    // Matched by IDENTITY",
      "    document.getElementById('cpComms').value = p.comms || '';\n"
      "    ['PPE', 'Test', 'Comm', 'Alarm', 'Rescue'].forEach(k => { const el = document.getElementById('cpEq' + k); if (el && typeof p['eq' + k] === 'boolean') el.checked = p['eq' + k]; });\n"
      "    if (typeof p.eqNotes === 'string') document.getElementById('cpEqNotes').value = p.eqNotes;\n"
      "    if (typeof p.meter === 'string' && p.meter) document.getElementById('cpMeter').value = p.meter; // the bump test date is never carried: it is today's check\n"
      "    // Matched by IDENTITY")
p.rep("    pbRenderPermitReview();\n    pbAlert('Pulled in hazards, controls, gas limits, rescue info and the EMERGENCY number from the permit for '",
      "    pbRenderPermitReview(); pbRenderPermitGroups(); pbCpShortSync();\n    pbAlert('Pulled in hazards, controls, gas limits, equipment, gas meter, rescue info and the EMERGENCY number from the permit for '")

# --- 6. the lock keeps the new items
p.rep("      attendant: document.getElementById('cpAttendant').value.trim(),\n      // UX batch 1 (UX-25/28)",
      "      attendant: document.getElementById('cpAttendant').value.trim(),\n"
      "      meter: pbCpVal('cpMeter'), meterCal: pbCpVal('cpMeterCal'), permitShown: pbCpVal('cpPosted'), /* permit_short: the gas meter, its last bump test or calibration, how entrants see the permit */\n"
      "      ruleState: pbCpRuleState(pbCpVal('cpAddress'), pbCpVal('cpJobNumber')), /* '' when the job's state is not known */\n"
      "      // UX batch 1 (UX-25/28)")

# --- 7. review: the meter
p.rep("      ['EMERGENCY button dials', numErr ? '<strong>' + escapeHtml(numErr) + '</strong>' : escapeHtml(num)]\n",
      "      ['EMERGENCY button dials', numErr ? '<strong>' + escapeHtml(numErr) + '</strong>' : escapeHtml(num)],\n"
      "      ['Gas meter', val('cpMeter').trim() ? escapeHtml(val('cpMeter').trim() + (val('cpMeterCal') ? ', last bump test or calibration ' + val('cpMeterCal') : ', no bump test or calibration date entered')) : '<strong>Not entered. Add the meter and its last bump test or calibration date.</strong>']\n")

# --- 8. typed work: the meter counts (both lists)
p.rep("    const fields = ['cpJobsite','cpJobNumber','cpAddress','cpLandmarks','cpSpace','cpPurpose','cpHazards','cpControls','cpVentFail','cpConditions','cpRescue','cpComms','cpSupervisor','cpSupervisorInitials','cpAttendant','cpMiscNotes','cpEqNotes','cpAddlPermits'];",
      "    const fields = ['cpJobsite','cpJobNumber','cpAddress','cpLandmarks','cpSpace','cpPurpose','cpHazards','cpControls','cpVentFail','cpConditions','cpRescue','cpComms','cpSupervisor','cpSupervisorInitials','cpAttendant','cpMiscNotes','cpEqNotes','cpAddlPermits','cpMeter'];")
p.rep("  const PB_PD_FIELDS = ['cpJobsite','cpJobNumber','cpAddress','cpLandmarks','cpSpace','cpPurpose','cpHazards','cpControls','cpVentFail','cpConditions','cpRescue','cpComms','cpSupervisor','cpSupervisorInitials','cpAttendant','cpMiscNotes','cpEqNotes','cpAddlPermits'];",
      "  const PB_PD_FIELDS = ['cpJobsite','cpJobNumber','cpAddress','cpLandmarks','cpSpace','cpPurpose','cpHazards','cpControls','cpVentFail','cpConditions','cpRescue','cpComms','cpSupervisor','cpSupervisorInitials','cpAttendant','cpMiscNotes','cpEqNotes','cpAddlPermits','cpMeter'];")

# --- 9. shorter progress words; folds
p.rep("dm.textContent = (reqAll - totalMiss) + ' of ' + reqAll + ' required fields filled. Fill in the sections, then tap Review Permit.';",
      "dm.textContent = (reqAll - totalMiss) + ' of ' + reqAll + ' required boxes filled.';")
p.rep("+ ' — Lock will list them too.' : 'Every required field has something in it. Review it before locking.';",
      "+ '.' : 'Every required box is filled. Check the review at the bottom, then lock.';")
p.rep("    document.querySelectorAll('#screen-confinedPermit [aria-invalid=\"true\"]').forEach(el => { const d = el.closest('details.cp-group'); if (d) d.open = true; });",
      "    document.querySelectorAll('#screen-confinedPermit [aria-invalid=\"true\"]').forEach(el => { for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; }); /* permit_short: a More details fold too */")
p.rep("document.querySelectorAll('#screen-confinedPermit details.cp-group').forEach(d => { d.open = true; }); }\n    pbRenderPermitGroups();\n  });\n  pbRenderPermitGroups();",
      "document.querySelectorAll('#screen-confinedPermit details.cp-group').forEach(d => { d.open = d.id !== 'cpGroupNotes'; }); } /* permit_short: the optional Notes & Photos group starts folded */\n    pbRenderPermitGroups();\n    try { pbCpShortSync(); } catch (e) { console.error(e); }\n  });\n  pbRenderPermitGroups();\n"
      "  { const f = document.getElementById('screen-confinedPermit'); if (f) { const go = () => { try { pbCpShortSync(); } catch (e) { console.error(e); } }; f.addEventListener('input', go); f.addEventListener('change', go); go(); } }")
# --- 10. the review: no long list on a form nobody has asked to check yet; the air limits in one short line
p.rep("""        ? '<div class="cp-miss-head">Still missing or to fix (' + missingAll.length + ') — tap one to go to it:</div>'""",
      """        ? (!pbCpShowMissing && !totalFix) ? '<div class="cp-miss-head">' + missingAll.length + ' required ' + (missingAll.length === 1 ? 'box is' : 'boxes are') + ' still empty.</div><button type="button" class="pb-btn ghost small" id="cpShowMissingBtn" onclick="pbCpReviewPermit()">Show Them</button>' /* permit_short */
        : '<div class="cp-miss-head">Still missing or to fix (' + missingAll.length + ') — tap one to go to it:</div>'""")
p.rep("""      ['App air limits', escapeHtml(pbLimitsText(lim)) + (bad ?""",
      """      ['App air limits', escapeHtml((() => { const n = Object.keys(lim.limitOrigin).filter(k => lim.limitOrigin[k] === 'entered').length; return 'O2 ' + pbMinO2(lim) + ' to ' + pbMaxO2(lim) + '%, LEL up to ' + pbMaxLEL(lim) + '%, H2S up to ' + pbMaxH2S(lim) + ' ppm, CO up to ' + pbMaxCO(lim) + ' ppm (' + (n ? n + ' typed on this permit, the rest standard' : 'standard values') + ')'; })()) + (bad ?""")
p.save()
