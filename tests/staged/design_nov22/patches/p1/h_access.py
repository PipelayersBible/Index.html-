# Deeper review, access (PHASE 1):
#  H-2 a "Show" button on Log In's password box and on Set Password (shows both boxes); it switches the box to plain
#      text and back ("Hide"). Never on by itself; going back to the screen leaves it hidden again.
#  H-3 the ALL-CAPS kickers above each title (visually hidden, e.g. "TRENCH SLOPING" over "Trench Sloping") were still
#      read by VoiceOver/TalkBack, so every title was read twice, once in capitals: now display:none (the back button that
#      sits in the same line stays). Matches "ALL CAPS only for the title, EMERGENCY and DO NOT ENTER".
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
EYE = '<button type="button" class="pb-pw-eye" id="%s" aria-pressed="false" aria-label="Show password" onclick="pbPwEye(this, %s)">Show</button>'
p.rep("""<div class="pb-field"><label>Password</label><input type="password" enterkeyhint="go" id="loginPassword" autocomplete="current-password"></div>""",
      """<div class="pb-field pb-pw-field"><label>Password</label><input type="password" enterkeyhint="go" id="loginPassword" autocomplete="current-password">""" + EYE % ('loginPwEye', "['loginPassword']") + """</div>""")
p.rep("""<div class="pb-field"><label>New password (at least 8 characters)</label><input type="password" enterkeyhint="next" id="setPwNew" autocomplete="new-password"></div>""",
      """<div class="pb-field pb-pw-field"><label>New password (at least 8 characters)</label><input type="password" enterkeyhint="next" id="setPwNew" autocomplete="new-password">""" + EYE % ('setPwEye', "['setPwNew','setPwConfirm']") + """</div>""")
p.rep("""  window.pbGoBack = function() {
    if (pbCurrentScreen === 'setPassword') { pbSkipNewPassword(); return; }""",
"""  // design H-2: show / hide the password typed
  window.pbPwEye = function(btn, ids) {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    (ids || []).forEach(id => { const el = document.getElementById(id); if (el) el.type = on ? 'text' : 'password'; });
    btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.textContent = on ? 'Hide' : 'Show'; btn.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
  };
  window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : [];
  window.pbScreenHooks.push(() => { document.querySelectorAll('.pb-pw-eye[aria-pressed="true"]').forEach(b => { if (!b.offsetParent) window.pbPwEye(b, b.id === 'setPwEye' ? ['setPwNew', 'setPwConfirm'] : ['loginPassword']); }); });
  window.pbGoBack = function() {
    if (pbCurrentScreen === 'setPassword') { pbSkipNewPassword(); return; }""")
p.rep("""#pbApp .pb-eyebrow > span:first-child {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}""", """#pbApp .pb-eyebrow > span:first-child {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
#pbApp .pb-screen:not(#screen-home):not(#screen-login) .pb-eyebrow > span:first-child { display: none; } /* design H-3: not read twice by screen readers */
/* design H-2 */
#pbApp .pb-pw-field { position: relative; }
#pbApp .pb-pw-field > input { padding-right: 76px; }
#pbApp .pb-pw-eye { position: absolute; right: 4px; bottom: 2px; min-width: 64px; min-height: 44px; padding: 0 10px; border: 0; background: transparent; color: var(--pb-text); font: 600 15px/1 var(--pb-font, 'Inter', sans-serif); text-decoration: underline; cursor: pointer; }""")
p.save()
