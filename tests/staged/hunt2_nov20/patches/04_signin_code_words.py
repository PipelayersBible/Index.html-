# hunt2 04: a sign-in code that is used up or too old said the JOIN LINK words.
# r17.10 gave every account "Get a Code" for the iPhone Home Screen app (works once, 15 minutes). Pasting it a second
# time, or after 15 minutes (easy: Get a Code, then find Share > Add to Home Screen, then open the icon), showed
# "This link has expired. Links last 24 hours. Ask whoever sent it for a new one." / "This link was already used ...
# If you didn't use it, tell them: someone else did." Nobody sent it and it lasts 15 minutes.
# Now a sign-in code gets its own words. Join links keep theirs.
# Usage: python3 04_signin_code_words.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""    const r = await pbObInvoke(Object.assign({ action: 'signin' }, key));
    if (!r.ok) { pbObErrSheet(r.code, 'Can’t Sign In'); return; }
""", """    const r = await pbObInvoke(Object.assign({ action: 'signin' }, key));
    if (!r.ok) { // hunt2 04: a sign-in code's own words (it was made by this person, works once, lasts 15 minutes)
      pbObErrSheet(r.code, 'Can’t Sign In');
      const again = ' Get a new code where you’re already signed in (in Safari: Settings, Get a Code).';
      const own = { 'pb:link_expired': 'That code is too old. A sign-in code lasts 15 minutes.' + again, 'pb:link_used': 'That code was already used. A sign-in code works once.' + again, 'pb:link_revoked': 'A newer code replaced that one. Use the newest code.' + again, 'pb:link_busy': 'That code is being used right now. Wait 2 minutes and try again.' }[r.code];
      const t = document.getElementById('pbObErrText'); if (own && t) t.textContent = own;
      return;
    }
""")
p.save()
