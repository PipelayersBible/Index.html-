import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# cs2 03: record-only permit (r16.90) leftovers.
# (a) the Reference page still promised an "automatic evacuation alarm" (removed in r16.90: a red notice and a short buzz).
rep("""This app's automatic evacuation alarm checks every reading against the permit's limits — any limit left blank uses the app's alarm defaults (""",
    """The permit compares every reading you log with its limits and shows a red notice when one is outside them (it does not sound an alarm) — any limit left blank uses the app's defaults (""")
# (b) "Did they enter anyway? Yes": the title still said "block", and the reading-only case still gave the app's order.
#     The strong wording stays for the attendant rule, no attendant outside, and an open emergency (owner, r16.90).
rep("""'Entered Against Block');""", """'Entered Against Permit');""")
rep("""Get them out as soon as it is safe \\u2014 do not go in after them.'""", """' + pbAgainstExitText(newLogEntry)""", 2)
rep("""  // " — ENTERED AGAINST PERMIT (...)" for a roster log row, or ''.""",
    """  // cs2 03: what follows "entered while the permit did not allow entry": the app's own order only for the attendant
  // rule / no attendant outside / an open emergency; for a reading, what the permit says, and the rescue line.
  function pbAgainstExitText(l) {
    return /attendant|emergency/i.test(String(l && l.reason || '')) ? 'Get them out as soon as it is safe \\u2014 do not go in after them.'
      : 'Under this permit, entrants exit the space. If someone goes down, do not go in after them \\u2014 call for trained rescue.';
  }
  // " — ENTERED AGAINST PERMIT (...)" for a roster log row, or ''.""")
open(out, 'w', encoding='utf-8').write(s)
