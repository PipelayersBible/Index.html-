import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# beta audit 01: an expired or already-used INVITE link (the beta owner's or a crew member's) said "If you were resetting
# your password, tap Forgot password". The invited person isn't resetting anything and stops there. Supabase's error link
# carries no type, so the words now cover both: set your password with Forgot password and the email the invite went to.
rep("""pbAlertAfterOpen('That email link has expired or was already used. If you were resetting your password, tap \\u201cForgot password?\\u201d on the Log In screen to get a new link.', 'Link Expired');""",
    """pbAlertAfterOpen('That email link has expired or was already used. To set your password, tap \\u201cForgot password?\\u201d on Log In and enter the email the invite (or reset) went to. A new link comes by email.', 'Link Expired'); /* beta audit 01: invites too */""")
open(out, 'w', encoding='utf-8').write(s)
