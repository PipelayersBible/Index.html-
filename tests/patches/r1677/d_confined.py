import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.77 (legal review): the permit is a record of the entry; the app never decides an entry is safe.
rep("Use The Pipelayer's Bible permit system for every entry.", "Fill out a permit for every entry: on paper or in The Pipelayer's Bible. The entry supervisor decides if entry is safe.")
rep("outside this permit\\u2019s acceptable range \\u2014 conditions are not safe to enter, regardless of whether that reading was ever saved.",
    "outside this permit\\u2019s limits, regardless of whether that reading was ever saved. Entry stays blocked on this permit until a new reading is inside the limits.")
rep("'Unsafe Reading \\u2014 Entry Blocked'", "'Reading Outside Limits \\u2014 Entry Blocked'")
rep("outside this permit\\u2019s acceptable range \\u2014 conditions are not safe to enter. Log a new, acceptable reading first.",
    "outside this permit\\u2019s limits. Log a new reading inside the limits first.")
rep("html += '<span class=\"pb-home-urgent\">UNSAFE — DO NOT ENTER</span>';", "html += '<span class=\"pb-home-urgent\">OUTSIDE PERMIT LIMITS — DO NOT ENTER</span>';")
rep("text: 'UNSAFE \\u2014 DO NOT ENTER', go: 'Open'", "text: 'OUTSIDE PERMIT LIMITS \\u2014 DO NOT ENTER', go: 'Open'")
rep("<div class=\"cp-st-bad\">UNSAFE reading in effect &mdash; DO NOT ENTER.", "<div class=\"cp-st-bad\">Reading outside the permit limits &mdash; DO NOT ENTER.")
rep("tx.textContent = 'UNSAFE READING \\u2014 DO NOT ENTER. EVACUATE:", "tx.textContent = 'READING OUTSIDE PERMIT LIMITS \\u2014 DO NOT ENTER. EVACUATE:")
# CO: Cal/OSHA PEL 25 ppm (8 CCR 5155 Table AC-1), stricter than NIOSH 35 and federal OSHA 50
rep("Maximum CO (ppm) — blank uses 35 ppm, the NIOSH recommended limit, stricter than the OSHA limit of 50 ppm",
    "Maximum CO (ppm) — blank uses 25 ppm, the Cal/OSHA limit (stricter than NIOSH’s 35 and federal OSHA’s 50)")
rep("(typeof p.maxCO === 'number' && p.maxCO !== 35) ? p.maxCO : ''", "(typeof p.maxCO === 'number' && p.maxCO !== 25) ? p.maxCO : ''")
rep("if (cm !== null && cm > 35) loose.push('maximum CO ' + cm + ' ppm is above the usual 35 ppm'); }",
    "if (cm !== null && cm > 25) loose.push('maximum CO ' + cm + ' ppm is above the Cal/OSHA limit of 25 ppm'); }")
rep("maxCO: numVal('cpMaxCO') !== null ? numVal('cpMaxCO') : 35,", "maxCO: numVal('cpMaxCO') !== null ? numVal('cpMaxCO') : 25,")
rep("function pbMaxCO(p) { return p && typeof p.maxCO === 'number' ? p.maxCO : 35; }", "function pbMaxCO(p) { return p && typeof p.maxCO === 'number' ? p.maxCO : 25; }")
rep("lim('cpMaxCO', 'CO max', 35, ' ppm'", "lim('cpMaxCO', 'CO max', 25, ' ppm'")
# Lock & Activate: one acknowledgment
rep("  window.pbRrSealPass = pbRrSealPass;",
    """  window.pbRrSealPass = pbRrSealPass;
  // r16.77 (legal review): Lock & Activate Permit says once who decides an entry
  { const o = window.pbLockConfinedPermit; let ack = false;
    if (typeof o === 'function') window.pbLockConfinedPermit = function(a, b) {
      if (a === undefined && b === undefined && !ack) {
        pbShowModal('The entry supervisor decides whether entry is safe, not this app. The permit records the readings, the people and the checks. It doesn\\u2019t replace atmospheric testing, training, a competent person or your company\\u2019s program.', [{ label: 'Cancel' }, { label: 'I Understand', primary: true, onClick: () => { ack = true; try { o.call(window); } finally { setTimeout(() => { ack = false; }, 0); } } }], 'Entry Supervisor Decides');
        return;
      }
      return o.apply(this, arguments);
    }; }""")
rep("CO 35 ppm is the NIOSH recommended limit (8-hour time-weighted average), stricter than the OSHA PEL of 50 ppm (1926.55 Table 1).",
    "CO 25 ppm is the Cal/OSHA PEL (8-hour time-weighted average, 8 CCR 5155 Table AC-1) and the app\'s default; NIOSH recommends 35 ppm and the federal OSHA PEL is 50 ppm (1926.55 Table 1).")
open(out, 'w', encoding='utf-8').write(s); print('ok')
