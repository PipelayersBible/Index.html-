# 03 The iPhone Home Screen app opens on Log In: a "Paste Join Code" button right there (one tap instead of
# "Join a Crew or Use a Code" then "Paste Join Code"), matching what the join and code screens tell people to tap.
# Shorter words on the code screen and the Home Screen card. Usage: python3 03_paste_on_login.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep('<div class="pb-btn-wrap" id="loginJoinWrap">',
      '<div class="pb-btn-wrap" id="loginPasteWrap" hidden><button type="button" class="pb-btn" id="loginPasteBtn" onclick="pbObPasteNow()">Paste Join Code</button></div><!-- streamline 03 -->\n    <div class="pb-btn-wrap" id="loginJoinWrap">')
p.rep("'<p>In the Home Screen app, tap <strong>Log In</strong>, then <strong>Join a Crew or Use a Code</strong>, then <strong>Paste Join Code</strong> (or type the code). It works once, for 15 minutes. Don’t send it to anyone: it signs in to your account.</p>'",
      "'<p>In the Home Screen app, tap <strong>Paste Join Code</strong> (or type the code). It works once, for 15 minutes. Don’t send it to anyone: it signs in to your account.</p>'")
p.rep("'It opens in one tap, works without signal, and on iPhone notifications only work from there.'",
      "'One tap to open, works with no signal, and notifications work there.'")
p.rep("(link ? 'Sign in there with a code: tap <strong>Get a Code</strong> below, then in the new app Log In › Join a Crew or Use a Code › Paste Join Code.' : 'Log in there with your email and password.')",
      "(link ? 'Tap <strong>Get a Code</strong> below, then <strong>Paste Join Code</strong> in the new app.' : 'Log in there.')")
p.rep("  window.pbObParse = pbObParse;", """  window.pbObParse = pbObParse;
  window.pbObPasteNow = function () { window.pbObOpenCode(); window.pbObPaste(); }; // streamline 03: one tap (the tap lets the phone read the clipboard)
  function pbObPasteRow() { const w = document.getElementById('loginPasteWrap'); if (w) w.hidden = !(pbObIosVer() > 0 && pbObStandalone() && !sbUser); }
  window.pbScreenHooks.push((name) => { if (name === 'login') pbObPasteRow(); });
  setTimeout(pbObPasteRow, 0);""")
p.save()
