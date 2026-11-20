# 02 Join Crew goes straight to Home with a short note ("You joined ... You're on Ray's crew.") instead of a
# "You're In" sheet and a Start tap. Usage: python3 02_join_no_youre_in.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
i = p.s.index('  function pbObDone(d) {\n'); j = p.s.index('  const pbObLegal = () =>', i)
p.rep(p.s[i:j], '''  function pbObDone(d) { // streamline 02: no "You're In" sheet and Start tap; a note on Home says it
    pbObClose(); try { pbGotoTab('home'); } catch (e) {}
    window.pbSayDone('You joined ' + (d.company_name || 'the company') + ' as ' + (PB_OB_ROLES[d.role] || 'crew') + '.' + (d.paired_with ? ' You\\u2019re on ' + d.paired_with + '\\u2019s crew.' : ''));
    try { window.pbObA2hsStepSoon && window.pbObA2hsStepSoon('join'); } catch (e) {} // streamline 08
  }
''')
# remember that he chose "Join Here in Safari": the Home Screen step isn't asked again right after he joins
p.rep("  window.pbObJoinHere = function () { if (PB_OB.src) { PB_OB.src.here = true; pbObJoinForm(); } };",
      "  window.pbObJoinHere = function () { if (PB_OB.src) { PB_OB.src.here = true; PB_OB.skippedHome = true; pbObJoinForm(); } };")
p.save()
