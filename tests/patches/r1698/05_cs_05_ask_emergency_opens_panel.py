import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# cs2 05: EMERGENCY on the Ask sheet (shown for "someone collapsed in the manhole" type questions) placed the call but
# left the person on the screen they asked from: the dispatcher script, headcount, address and Text 911 were on the
# permit screen, not shown. After the call hand-off, the permit's emergency panel is opened, as the red shell line does.
rep("""  window.pbAiAskEmergency = function() {
    if (window.pbAskSheetOpen()) window.pbAskSheetClose();
    window.pbTriggerEmergency();
  };""", """  window.pbAiAskEmergency = function() {
    if (window.pbAskSheetOpen()) window.pbAskSheetClose();
    window.pbTriggerEmergency();
    try { if ((confinedPermit || pbClosedEmergencyShown) && pbCurrentScreen !== 'confinedActive') pbShellOpenPermitUrgent('cpEmergencyPanel'); } catch (e) {} // cs2 05: after the call
  };""")
open(out, 'w', encoding='utf-8').write(s)
