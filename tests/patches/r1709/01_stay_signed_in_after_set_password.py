#!/usr/bin/env python3
# r17.09: after an invite or reset link's Save New Password, the phone STAYS signed in (it used to log out and make the
# person type the new password a third time on Log In). Cancel still logs the link's sign-in out, as before.
# A link left open after the password WAS saved (the app closed before it finished) is now simply kept, not logged out.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 1. Save New Password ends signed in: the link's marker goes (as a password login removes it), Home opens.
rep("""  function pbEndResetAfterSave(email) {
    const invite = pbUrlAuth.type === 'invite';
    pbEndResetSignedOut(email,
      invite ? 'Password set \\u2014 log in with your new password.' : 'Password changed \\u2014 log in with your new password.',
      'Your new password is set. This phone now logs out so you log in with it, and that closes the app',
      'Password Set');
  }""",
"""  function pbEndResetAfterSave(email) {
    // r17.09: the phone stays signed in with the account whose password was just set (no third typing on Log In).
    const invite = pbUrlAuth.type === 'invite';
    pbForgetLinkSignIn(); // finished: a signed-in account like any other from here
    pbRecoveryUserId = null;
    pbClearSetPasswordForm();
    if (pbCurrentScreen === 'setPassword') { pbGoto('home', true, true); try { pbSharedAfterLogin(); } catch (e) {} }
    pbAlertAfterOpen((invite ? 'Password set. You\\u2019re signed in' : 'Password changed. You\\u2019re signed in') + (email ? ' as ' + email : '') + ' \\u2014 use this password next time you log in.', 'Password Set');
  }""")

# 2. A link left open whose password was already saved: kept signed in (only an unfinished one is logged out).
rep("""      if (await pbLinkHeldElsewhere(m)) { pbLinkLeftChecked = true; return; } // still being finished in another tab
""",
"""      if (await pbLinkHeldElsewhere(m)) { pbLinkLeftChecked = true; return; } // still being finished in another tab
      if (m.set) { pbLinkLeftChecked = true; pbForgetLinkSignIn(); return; } // r17.09: password saved: the sign-in is kept
""")

# 3. The wait notice no longer says saving the password logs out.
rep("""' \\u2014 setting the password logs this phone out.\\n\\nSet New Password waits""",
    """' \\u2014 Set New Password would take over this screen.\\n\\nSet New Password waits""")

open(out, 'w', encoding='utf-8').write(s)
print('ok')
