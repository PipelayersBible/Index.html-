# 09 (Tommy's answer #5, Nov 19): every account, not only no-email ones, gets a one-time sign-in code for the iPhone
# Home Screen app instead of typing email and password there: "Get a Code" in the Home Screen step (08), on the Home
# card, in Settings and on Notifications (iPhone Safari); "Paste Join Code" on the Home Screen app's Log In (03). After
# a code sign-in, two-step login is still asked for an account that has it (pbMfaCheck, called at once as well as by
# the screen hook). "Signed In" + OK becomes a note. No server change: pb_onboard_handoff_make and crew-join's signin
# already take any signed-in account (checked read-only against the live project, Nov 19).
# Usage: python3 09_code_for_every_account.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
# --- the Home Screen step (08): the code for everyone on iPhone
p.rep("""      const link = pbObIsLink(sbUser);
      h += '<ol class="pbob-ol" id="pbObA2hsSteps">' + (link ? '<li>Tap <strong>Get a Code</strong> below, then <strong>Copy Code</strong>.</li>' : '')""",
      """      const link = pbObIsLink(sbUser);
      h += '<ol class="pbob-ol" id="pbObA2hsSteps"><li>Tap <strong>Get a Code</strong> below, then <strong>Copy Code</strong>.</li>'""")
p.rep("""        + '<li>Open the new icon' + (link ? ' and tap <strong>Paste Join Code</strong>.' : ' and log in.') + '</li></ol>'
        + (link ? '<div id="pbObA2hsCode"><button type="button" class="pb-btn secondary" id="pbObA2hsCodeBtn" onclick="pbObA2hsCode()" style="width:100%;min-height:52px;">Get a Code</button><p class="pbob-dim" style="margin:6px 0 0;">Your account has no email or password, so the new app signs in with this code.</p></div>' : '');""",
      """        + '<li>Open the new icon and tap <strong>Paste Join Code</strong>.</li></ol>'
        + '<div id="pbObA2hsCode"><button type="button" class="pb-btn secondary" id="pbObA2hsCodeBtn" onclick="pbObA2hsCode()" style="width:100%;min-height:52px;">Get a Code</button><p class="pbob-dim" id="pbObA2hsWhy" style="margin:6px 0 0;">' + (link ? 'Your account has no email or password, so the new app signs in with this code.' : 'The new app signs in with this code: no typing your email and password.') + '</p></div>';
      if (!link) pbMfaFactor().then(f => { const w = document.getElementById('pbObA2hsWhy'); if (f && w) w.textContent += ' Two-step login still asks for its code.'; }).catch(() => {}); // streamline 09""")
# --- the Home card
p.rep("""Open the new icon. ' + (link ? 'Tap <strong>Get a Code</strong> below, then <strong>Paste Join Code</strong> in the new app.' : 'Log in there.') + '</li></ol>'""",
      """Open the new icon. Tap <strong>Get a Code</strong> below, then <strong>Paste Join Code</strong> in the new app.</li></ol>'""")
p.rep("""      + '<div class="pb-pc-act">' + (link ? '<button type="button" class="pb-btn small" id="homeA2hsCode" onclick="pbObHandoff()">Get a Code</button>' : '') + '<button""",
      """      + '<div class="pb-pc-act">' + '<button type="button" class="pb-btn small" id="homeA2hsCode" onclick="pbObHandoff()">Get a Code</button>' + '<button""")
# --- Settings / Notifications: a no-email account anywhere (as before); any account in iPhone Safari
p.rep("      const show = !!(sbUser && pbObIsLink(sbUser));",
      "      const show = !!(sbUser && (pbObIsLink(sbUser) || (pbObIosVer() > 0 && !pbObStandalone()))); // streamline 09")
# --- the code sign-in: a note instead of "Signed In" + OK; two-step login asked right away for an account that has it
p.rep("""    if (switched) { pbGoto('home', true); pbObSheet('<h2 data-pbob-focus tabindex="-1">Signed In</h2><p>You’re signed in as ' + escapeHtml(pbObIsLink(user) ? pbObDisplay(user) : (user.email || 'your account')) + '.</p><div class="pbob-btns"><button type="button" class="pb-btn" onclick="pbObClose()">OK</button></div>', 'Signed in'); }""",
      """    if (switched) { window.pbObClose(); pbGoto('home', true); window.pbSayDone('Signed in as ' + (pbObIsLink(user) ? pbObDisplay(user) : (user.email || 'your account')) + '.'); try { window.pbMfaCheck(); } catch (e) {} } // streamline 09""")
p.save()
