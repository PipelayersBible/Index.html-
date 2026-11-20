# r17.10 — Simpler sign-up and set-up (live Nov 19, 2026, commit 32248e0)

Tommy (Nov 19): "Everything should be streamlined and as simple and clear as possible. All throughout the app and especially for sign ups / set ups." Also: "I don't think it has a prompt to add the app to their Home Screen when they do their set up."

## What changed
- **Password screen:** the Terms tick (and, for crew, "What your company sees") is on the Set Password screen itself, not a sheet on top. Invite links say "Choose Your Password". After Save there's a short note, no OK box. Both password boxes stay (Tommy's call).
- **Join by text link:** Join Crew goes straight to Home with a note ("You joined … You're on Ray's crew."). No "You're In" sheet.
- **Home Screen step (new):** on iPhone Safari and Android Chrome, after Save Password, Join Crew or a Log In: one sheet. iPhone: Share → Add to Home Screen → Add (with a picture of the Share button), one Done. Android: one-tap Install App when Chrome offers it, else menu steps. Comes after Terms / two-step login / crew notice, before notifications. Never in the Home Screen app or on a computer; once Done, never again (shared with the Home card).
- **Sign-in code for the Home Screen app, every account (Tommy: yes):** Get a Code in the Home Screen step (and the Home card, Settings, Notifications in iPhone Safari); Paste Join Code on Log In in the Home Screen app signs in with one tap. Two-step login still asked after it. No server change (checked live, read-only).
- **Owner's Getting Started:** Text a Join Link opens the link sheet over Home; Add by Email goes to Crew members. Shorter wording.
- **Foreman:** "On my crew" picker has Text a Join Link (a new crew no longer hits "Nobody to pick right now").
- **Forgot password:** scrolls to the email box with the cursor in it.

## Taps (before → after)
| Path | Before | After |
|---|---|---|
| Owner: invite email → first crew text sent | 9 | 6 + Home Screen step |
| Crew invited by email | 7 | 4 |
| Text-link join, Android | 4 | 3 + Home Screen step |
| Text-link join, iPhone | 12 | 10 |
| Foreman adding a pipelayer | 5 | 3 |
| Owner signing in to the Home Screen app | 3 + typing email and password | 3, no typing |

## Kept on purpose
Scanner-proof Continue on email links, an explicit Terms tick, confirmations before removing / cancelling / withdrawing, two-step login, confined space.

## Tests
- New: t_sl1_setpw, t_sl2_a2hs, t_sl3_paths, t_sl4_code (tests/r1710/streamline/tests, suite r1710_plain). t130 and t132 updated for the new flow.
- Full regression on the r17.10 build: 219 pass, 15 skipped, 3 expected golden updates (critic/w4, office/c1_crew, sync/t03_roles: the Crew members wording only, checked word by word).
- Live check: sw.js and the page say r17.10.

## Proposals not built (server side)
Shorter invite / reset email text; an optional email sign-in code instead of a password. See tests/r1710/streamline/NOTES.md.
