# r17.09 — Stay signed in, Invite Crew Member, one-tap Text Join Link (live Nov 19, 2026, commit 02a56e5)

All three changes were asked for by Tommy on Nov 19.

## What changed
- **Stay signed in after setting a password.** After Save New Password from an invite email or a Forgot password email, the phone stays signed in and goes to Home: "Password set. You're signed in as … — use this password next time you log in." Before, it logged out and the person had to type the password a third time on Log In. Cancel still logs the email link's sign-in out. A link whose password was already saved, where the app closed before finishing, is now kept signed in instead of logged out.
  - iPhone: a person who sets the password in Safari and then opens the Home Screen icon still signs in once there (iOS keeps the two separate). r17.10 adds a sign-in code for this.
- **Crew members screen.** The big button says **Invite Crew Member**; the list heading says **Your company**.
- **Text a Join Link is one tap on a phone.** The button says **Text Join Link**. One tap makes the link and opens Messages with it filled in. The card stays below with the code to read out, Text It Again, Share and Copy Link, in case Messages didn't open. On a computer it still says Make Join Link.

## Tests
- New: t132_setpw_stay (invite and reset: no sign-out, Home, marker cleared, still signed in after reopening; left-open link with the password saved), t133_onetap_text (iPhone: one tap opens Messages with the link; computer: unchanged).
- Full regression on the r17.09 build: 216 pass. The run was split in two by a container restart (82 + 136). The only differences were the 2 expected golden updates for the new wording (critic/w4, office/c1_crew).
- Live check: sw.js and the page say r17.09; the page has "Invite Crew Member".

## Notes
- Removing someone already asked for confirmation ("Remove from Company" in red, "Keep in Company"); nothing changed there.
- Patches: tests/patches/r1709/01–03.
