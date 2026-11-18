import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.90 (owner, Nov 17): CONFINED SPACE PERMIT = A RECORD. The app reports what the permit says; it no longer gives
# orders or judges the space: no EVACUATE siren or wording (a plain red "outside permit limits" notice instead), no
# "Entry Blocked" / "DO NOT ENTER" for readings ("the permit does not allow entry"). Check-in still warns and asks
# "Did they enter anyway?" (good record-keeping). Kept as they were: EMERGENCY call, Text 911, the rescue line
# ("If someone goes down: DO NOT ENTER"), the attendant rule and the open-emergency wording, and the crew's own timers.
U = '\\u2014'
NOTICE = 'OUTSIDE PERMIT LIMITS ' + U + ' Under this permit, entrants exit the space and no one enters until the entry supervisor resolves it and a new reading inside the limits is logged.'
# no siren for an out-of-limit reading (a short buzz where phones support it)
rep("""  function pbPlayAlarm(kind) {
    const ctx = pbGetAudioCtx();""", """  function pbPlayAlarm(kind) {
    if (kind === 'evacuate') { try { if (navigator.vibrate) navigator.vibrate([200]); } catch (e) {} return; } // r16.90: record-only permit: no siren
    const ctx = pbGetAudioCtx();""")
rep("""EVACUATE — Attendant: instruct all entrants to exit the space immediately.""", NOTICE.replace(U, '—'), 4)
rep("""EVACUATE \\u2014 Attendant: instruct all entrants to exit the space immediately.""", NOTICE, 2)
rep("""'EVACUATE \\u2014 Reading Outside Acceptable Range, Not Saved'""", """'Outside Permit Limits \\u2014 Not Saved'""", 2)
rep("""    if (/^EVACUATE/.test(cur)) {""", """    if (/^(EVACUATE|OUTSIDE PERMIT LIMITS)/.test(cur)) {""")
rep("""each sounded EVACUATE""", """each was flagged outside the limits""", 3)
rep("""and sounds EVACUATE when one is outside them.""", """and shows a red notice when one is outside them.""")
rep("""Readings inside these looser limits will NOT raise an alarm or block entry.""", """Readings inside these looser limits will NOT be flagged as outside the limits.""")
rep("""Every fresh-air reading would sound EVACUATE and block entry,""", """Every fresh-air reading would be flagged outside the limits,""")
rep("""'READING OUTSIDE PERMIT LIMITS \\u2014 DO NOT ENTER. EVACUATE: instruct all entrants to exit the space immediately. '""",
    """'READING OUTSIDE PERMIT LIMITS \\u2014 under this permit, entrants exit and no one enters until the entry supervisor resolves it and a new reading inside the limits is logged. '""")
rep("""'OUTSIDE PERMIT LIMITS \\u2014 DO NOT ENTER'""", """'OUTSIDE PERMIT LIMITS \\u2014 PERMIT DOES NOT ALLOW ENTRY'""")
rep("""<span class="pb-home-urgent">OUTSIDE PERMIT LIMITS — DO NOT ENTER</span>""", """<span class="pb-home-urgent">OUTSIDE PERMIT LIMITS — PERMIT DOES NOT ALLOW ENTRY</span>""")
rep("""Reading outside the permit limits &mdash; DO NOT ENTER. See the red banner above.""", """Reading outside the permit limits &mdash; the permit does not allow entry. See the red banner above.""")
rep("""' · <b>outside the limit &mdash; DO NOT ENTER</b>'""", """' · <b>outside the limit &mdash; the permit does not allow entry</b>'""")
rep("""'. Entry stays blocked. Fix it and save again to record it""", """'. Under the permit, no one enters until a new reading inside the limits is logged. Fix it and save again to record it""")
rep("""Entry stays blocked on this permit until a new reading is inside the limits.""", """Under this permit, no one enters until the entry supervisor resolves it and a new reading inside the limits is logged.""")
rep("""'Reading Outside Limits \\u2014 Entry Blocked'""", """'Outside Permit Limits'""")
rep("""'Air Test Unreadable \\u2014 Entry Blocked'""", """'Air Test Unreadable'""")
rep("""'Air Test Time Unclear \\u2014 Entry Blocked'""", """'Air Test Time Unclear'""")
rep("""' \\u2014 outside safe limits'""", """' \\u2014 outside the permit limits'""")
rep("""ENTERED AGAINST BLOCK""", """ENTERED AGAINST PERMIT""", 5)
rep("""entered against a DO NOT ENTER warning""", """entered while the permit did not allow entry""", 3)
rep("""'No emergencies, out-of-range air tests, blocked entries or changes recorded.'""", """'No emergencies, out-of-range air tests, entries against the permit or changes recorded.'""")
# the check-in warning: the permit's rule for air tests; the strong wording stays for the attendant rule and an open emergency
rep("""    pbPlayAlarm('evacuate');
    const buttons = [{ label: 'Yes \\u2014 they\\u2019re inside',""", """    const strong = !!(b.attendant || b.relieve || pbEmergencyOpen()); // r16.90
    const buttons = [{ label: 'Yes \\u2014 they\\u2019re inside',""")
rep("""    pbShowModal(p.name + ' must NOT enter the space.\\n\\n' + b.texts.join('\\n\\n') + '\\n\\nAttendant: keep ' + p.name + ' out of the space.'""",
    """    pbShowModal(p.name + (strong ? ' must NOT enter the space.' : ' isn\\u2019t allowed in under this permit right now.') + '\\n\\n' + b.texts.join('\\n\\n') + '\\n\\nAttendant: keep ' + p.name + ' out of the space.'""")
rep("""'\\n\\nDid ' + p.name + ' enter anyway?', buttons, 'DO NOT ENTER');""", """'\\n\\nDid ' + p.name + ' enter anyway?', buttons, strong ? 'DO NOT ENTER' : 'Permit Does Not Allow Entry');""")
open(out, 'w', encoding='utf-8').write(s)
s = open(out, encoding='utf-8').read()
rep("""unsafe readings, DO NOT ENTER and the permit window stay""", """out-of-limit readings, the entry warnings and the permit window stay""", 3)
rep("""AGAINST A DO NOT ENTER WARNING""", """AGAINST A PERMIT WARNING""", 2)
rep("""AGAINST a DO NOT ENTER warning""", """AGAINST a permit warning""", 1)
open(out, 'w', encoding='utf-8').write(s)
