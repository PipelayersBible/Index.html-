# Streamline sign-up and set-up (staged on r17.09, Nov 19)

Tommy's instruction: "Everything should be streamlined and as simple and clear as possible. All throughout the app and
especially for sign ups / set ups." Plus his priority item: "I don't think it has a prompt to add the app to their Home
Screen when they do their set up."

Source: `/tmp/claude-0/r1709b/src.html` (r17.09 with its build stamp; 01-08 were written on `/tmp/claude-0/r1709/src_latest.html` and apply unchanged, same changes, checked). Not edited. Nothing committed, pushed, deployed, or
changed on Supabase. Every change is client-only.

Apply: `sh patches/apply_all.sh in.html out.html` (runs 01..09 in order; each `rep()` must match exactly once).

Tap counts are taps on a 390 px phone. Typing is listed separately. Taps that Safari or Android need (Share, Add) are counted.
"Step" = the new Home Screen step that Tommy asked for. It is counted where it now appears.

## Path 1: company owner's first time (Tommy's Beta Accounts sends the invite email)

| # | Step | Before | After | What was unneeded or unclear | Fix |
|---|---|---|---|---|---|
| 1 | Tap the link in the email | 1 | 1 | | |
| 2 | "Set Up Your Account", Continue | 1 | 1 | Required (r17.04 scanner-proof) | Kept |
| 3 | Terms sheet over Set New Password: tick + I Agree | 2 | 1 (tick) | A second sheet on top of the screen they came to use | Tick is on the password screen, and Save Password records it (01) |
| 4 | Password, then "Type it again" | typing x2 | typing x2 | Retyping a password they just typed | Decision 1 (not built) |
| 5 | Save New Password | 1 | 1 | Title "Set New Password" for someone who never had one | "Choose Your Password", "Save Password" (01) |
| 6 | "Password Set" box, OK | 1 | 0 | Confirms what they just did | A short note on Home, no tap (01) |
| 7 | Home Screen (iPhone Safari / Android) | passive card, easy to miss | Step: Share, Add to Home Screen, Add + Done | No real prompt during set-up | Home Screen step (08) |
| 8 | Getting Started: Add Crew, then Crew members, then Text a Join Link | 2 | 1 | An extra screen between "Add Crew" and the link | "Text a Join Link" opens the sheet over Home, "Add by Email" goes to Crew members (04) |
| 9 | Name, then Text Join Link | 1 + typing | 1 + typing | | |
| | **Email to first text sent** | **9** | **6** (+ the Home Screen step) | | |

## Path 2: inviting crew

Office side:

| Step | Before | After | Note |
|---|---|---|---|
| Text by link from Home (Getting Started) | 3 (Add Crew, Text a Join Link, Text Join Link) | 2 | 04 |
| Text by link from Crew members | 2 | 2 | r17.09 one-tap Text Join Link kept. Shorter words (05) |
| Invite by email (Crew members) | email + name, Invite Crew Member: 1 | 1 | Heading "Add crew member" is now "Or invite by email" (05) |

Person invited **by email** (email, Continue, Terms, password, Home):

| Step | Before | After |
|---|---|---|
| Link, Continue | 2 | 2 |
| Terms (tick + I Agree, on a sheet) | 2 | 1 (tick on the screen) |
| "What Your Company Sees" Got It (crew roles, a box on a later Home visit) | 1 | 0: shown on the password screen, Save counts as seen (01, decision 2) |
| Password x2, Save | 1 + typing x2 | 1 + typing x2 |
| "Password Set" OK | 1 | 0 (note) |
| **Total taps** | **7** | **4** (+ the Home Screen step on a phone) |

Person invited **by text link**:

| Step | Android before | Android after | iPhone before | iPhone after |
|---|---|---|---|---|
| Tap the link | 1 | 1 | 1 | 1 |
| Step 1 of 2: Copy Join Code, Share, Add to Home Screen, Add, open icon | - | - | 5 | 5 |
| In the Home Screen app: "Join a Crew or Use a Code", then "Paste Join Code" (+ iOS Allow Paste) | - | - | 3 | 2: "Paste Join Code" is on Log In (03) |
| Tick the Terms, Join Crew | 2 | 2 | 2 | 2 |
| "You're In", Start | 1 | 0: Home with a note (02) | 1 | 0 |
| Home Screen step | - | Install App (one tap when Chrome offers it) or menu steps + Done | - | none (already in the Home Screen app) |
| **Total** | **4** | **3** + step | **12** | **10** |

## Path 3: a foreman adding pipelayers

| Step | Before | After |
|---|---|---|
| Home "On my crew", which opens "Add to your crew" | 1 | 1 |
| The list only shows people already in the company ("Nobody to pick right now" for a new crew). The link was only in Settings: Back, Settings, "Add a Pipelayer by Text" | 3, and you had to know where it was | 0: "Not in the list? Text them a join link." + **Text a Join Link** in the list (06) |
| Text a Join Link (in the sheet), Text Join Link | 1 | 2 |
| **Total** | **5** | **3** |

The Settings row stays the same.

## Path 4: Log In, Forgot password, Home Screen hand-off code

| Step | Before | After | Fix |
|---|---|---|---|
| Log In: email, password, Log In | 1 + typing x2 | same | Legal line kept |
| Forgot password?: panel opens at the bottom, email filled in if typed | 2 + 1 tap into the field | 2: scrolls into view, cursor in the email box (or on Send Reset Link if the email is filled in) | 07 |
| Hand-off code (no-email account) to the Home Screen app: Get a Code, Copy, Log In "Join a Crew or Use a Code", Paste Join Code, "Signed In" OK | 5 | 3: "Paste Join Code" is on the Home Screen app's Log In, and a note replaces the OK box | 03, 09 |
| **Email account (owner, PM) signing in to the iPhone Home Screen app** | tap Email, type it, tap Password, type it, Log In: 3 taps + typing x2 | Get a Code, Copy Code (in Safari), then Paste Join Code: 3 taps, no typing. Two-step login is still asked when the account has it. | 09 (Tommy's #5) |

## Path 5: first-use prompts stacked on top of each other

| Situation | Before | After |
|---|---|---|
| Invite/reset link | Continue screen, then Terms sheet over Set New Password, then OK box, then crew notice box on a later Home visit, then a passive Home Screen card | Continue screen, then one screen (password, Terms tick, crew notice for crew roles), then a note (no tap), then the Home Screen step (Done) |
| Order | Terms sheet and Set New Password competed. The crew notice was skipped while the OK box was up. | Terms first, then two-step login code if on (unchanged, z-index above), then the crew notice, then the Home Screen step, then notifications (only a Home card, asked on tap) |
| Join by text link | Join sheet (Terms + notice), then You're In, then Home | Join sheet, then Home + note, then the Home Screen step (Android) |
| MFA | Asked after login when enrolled | Unchanged (required) |
| Destructive confirmations (remove, cancel link, withdraw, lost phone), scanner-proof Continue, confined space | | Unchanged |

## What I built (patches/, stacked in order)

1. `01_setpw_one_screen.py`: The Terms tick is on the Set Password screen instead of a sheet over it. The tick shows only when the Terms aren't agreed yet (same check as the sheet). Save refuses without the tick and records the agreement only after the password is saved (`pbTermsPend` and `pb_terms_accept`, queued with no signal like the sheet). A Terms sheet already up when the screen opens is folded into the screen. For a crew member who hasn't seen it, "What your company sees" shows on the screen too, and Save marks it seen and sends `pb_notice_ack` (same keys as Got It). Invite: "Choose Your Password". Button: "Save Password". After Save: a note, "Password set. You're signed in as x." (`#pbSayDone`, role=status, 7 s, tap to hide) instead of an OK box. `pbSayDone` is a small new helper.
2. `02_join_no_youre_in.py`: Join Crew closes the sheet and goes to Home with the note "You joined X as Pipelayer. You're on Ray's crew." The "You're In" sheet and Start button are gone.
3. `03_paste_on_login.py`: In the iPhone Home Screen app, signed out, Log In shows a primary **Paste Join Code** button. One tap opens the code screen and pastes. If nothing was copied, it says "Nothing to paste. Type the 6-letter code instead." The code screen and Home Screen card say "tap Paste Join Code" instead of "Log In › Join a Crew or Use a Code › Paste Join Code". The card's first line is shorter.
4. `04_getting_started.py`: Getting Started step 1 has "Text a Join Link" (sheet over Home; the crew list loads behind it so the foreman picker still works) and "Add by Email". The "Three steps..." line is gone. Step 3 is one line.
5. `05_crew_words.py`: One line under Text a Join Link on Crew members. "Or invite by email" heading. One-line intro on the link sheet.
6. `06_foreman_picker_link.py`: A foreman's "Add to your crew" list has "Text a Join Link" (`pbObCanFmLink`: foreman member, not a manager).
7. `07_forgot_focus.py`: Forgot password? scrolls into view and puts the cursor where it's needed.
9. `09_code_for_every_account.py` (**Tommy's answer #5**): every account gets the one-time code for the iPhone Home Screen app, not only no-email ones.
   - **Where it shows:** "Get a Code" in the Home Screen step (iPhone), on the Home card, and in Settings and Notifications in iPhone Safari. No-email accounts get it everywhere, as before. Email accounts on a computer don't get it.
   - **Words:** the step says "Open the new icon and tap Paste Join Code". For an email account: "no typing your email and password", plus "Two-step login still asks for its code" when the account has two-step login on.
   - **After a code sign-in:** two-step login is asked at once (`pbMfaCheck`; the screen hook asks it too). "Signed In" + OK becomes a note.
8. `08_a2hs_step.py` (**Tommy's priority item**): Adding to the Home Screen is a step at the end of set-up, on iPhone Safari and Android Chrome only. It never shows in the Home Screen app or on a computer.
   - **When it opens:** after Save Password (invite or reset), after Join Crew, and after a Log In (an owner's first sign-in on a phone, or anyone on a new phone).
   - **Order:** it waits until nothing else is up: Terms, two-step code, crew notice, other boxes, a live permit. It shows only on Home, and gives up after 2 minutes. The Home card stays as the reminder.
   - **iPhone:** one sheet with the 3 steps and a drawing of the Share button, plus one **Done**. A no-email account gets "Get a Code" and "Copy Code" right in the sheet, because the Home Screen app starts signed out.
   - **Android:** **Install App** when Chrome fires `beforeinstallprompt` (Chrome's own install bar is held back for it). Otherwise, the ⋮ menu steps.
   - **Done:** ends it for good using the same `pbObA2hs:<uid>` key as the Home card, so the card goes too. Accepting Install, or Chrome's `appinstalled`, also sets the key.
   - **After "Skip: Join Here in Safari":** it isn't asked again right after the join (decision 4). The Home card still offers it.

Offline: nothing new needs signal except Get a Code (shows the usual "No signal..." line). The join, link and Terms
paths behave as before with no signal: t130 section 6 passes.

## Server check for 09 (read-only, nothing changed)

Checked against the live project on Nov 19 with read-only queries:
- **`public.pb_onboard_handoff_make`:** any signed-in account. It checks only `auth.uid()` and the limit of 5 an hour.
- **`public.pb_onboard_svc`:** the `claim` and `handoff` steps only need the account to have an email. Every account has one; no-email accounts have the hidden crew address.
- **Edge function `crew-join` (live version 1, same as `staged/onboard2/functions`):** `signin` makes a magic-link hash for that email with `generateLink`, which sends no email.
- **`pb_link`:** the only server function that checks it is `pb_onboard_lost_phone`.

**No server change is needed.** A code sign-in is a one-factor (aal1) session. The app asks for the two-step code before the account is used, the same as after a password login.

## Proposed, not built (and why)

- **Drop "Type it again"**: Tommy said keep both password boxes. Not built.
- **Getting Started above the Home Screen card on a new company's Home:** the card pushes Getting Started below the fold. With the new step and Done, the card is gone after set-up, so I left the layout alone.
- **Server:** shorter invite/reset email text and a "Set Up Your Account" button (Supabase auth email templates). Optional passwordless email sign-in (magic code) for email accounts (auth config). Neither is built.
- **The join screen's long "What your company sees" text:** kept word for word (legal, crew notice v3).

## Tests

New, in `tests/staged/streamline/tests/` (they use `tests/boot_ob.js`, `obsrv.js`, `rig/fakesb.js` by relative path):

| Test | Covers | Result on the patched page |
|---|---|---|
| `t_sl1_setpw.js` | tick on the screen (light/dark, 390 px), Save refused without it, Terms recorded once, note instead of a box; crew notice on the screen and acked; reset with Terms agreed (no tick); sheet folded in | 33 PASS |
| `t_sl2_a2hs.js` | iPhone Safari step after Save (light/dark, Share picture, Get a Code + one Done), Done sets the shared key and hides the card, not asked again; standalone: none; computer: none; Android after Join: menu steps; Android with `beforeinstallprompt`: Install App one tap; iPhone link account: Get a Code, then code, then Copy; order Terms, then crew notice, then step; Skip-in-Safari not re-asked; Android Log In | all PASS |
| `t_sl4_code.js` (09) | email account: Get a Code in the step, the Home card and Settings (iPhone Safari); the copied code + Paste Join Code in the Home Screen app signs in to the owner's account, with a note and no box; two-step login: "Two-step login still asks" line, then "Enter Your Code" after the code sign-in, and the app's code finishes it; computer, email account: no button; no-email account: button anywhere | 16 PASS |
| `t_sl3_paths.js` | Paste Join Code on Log In (Home Screen app only; empty clipboard), Join to Home + note, Forgot focus, Getting Started link sheet + foreman picker loaded + Add by Email, foreman picker link, pipelayer can't, Crew words | all PASS |

Run: `NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node <test>`. I served the patched page (01-09 on r1709b) with `python3 -m http.server 8962`, and re-ran every test there.

Existing tests against the patched page (one browser at a time):

| Test | Result |
|---|---|
| t129_taplink.js | all pass |
| t133_onetap_text.js | all pass |
| t132_setpw_stay.js | 10 FAIL as expected: it ticks the Terms on the old sheet and reads the "signed in" words from a box. The updated copy `test_updates/t132_setpw_stay.js` (diff in `t132.diff`: tick `#setPwTerms`, read `#pbSayDone`) has **all pass**. |
| t130_onboard.js | fails at `#pbObStartBtn` (the You're In sheet is gone), as expected. The updated copy `test_updates/t130_onboard.js` (diff in `t130.diff`: read the note, no Start tap; section 11 reads the "Signed in as" note, 09) has **ALL PASS**. |
| run_all `--only` t95_beta, t105_terms, t107_mfa, t109_crewnotice, t114_mfacrew, t126_noticeack (--jobs 1) | pass (goldens match) |

`test_updates/` holds symlinks to boot_ob.js, obsrv.js, fakesb_ob.js and rig/fakesb.js so the copies run in place.
To adopt them, copy the two files over `tests/t130_onboard.js` and `tests/t132_setpw_stay.js`.

## Golden files expected to change (not updated)

- `tests/expect/bughunt_nov17__critic__w4.js.txt`
- `tests/expect/bughunt_nov17__office__c1_crew.js.txt`
- `tests/expect/bughunt_nov17__sync__t03_roles.js.txt`

All three print the Crew members screen. Two changes are from 05: "No email needed. They tap the link and they're in." and "Or invite by email" (was "Add crew member"). They also differ already on r17.09 itself: "Invite Crew Member" and "Your company". I checked: after mapping those strings, nothing else differs.

No other golden contains the changed words. Possible risk: a golden test that logs in, or saves a password, with an iPhone or Android user agent would now see the Home Screen step. I found none (grep of tests/ for phone UAs plus login/join).

## Decisions for Tommy (answered Nov 19)

1. Drop "Type it again": **no, keep both password boxes.** Not built.
2. "What your company sees" on the password screen counts as seen: **keep** (built, 01).
3. Home Screen step after every Log In on a phone, once per account per phone: **keep** (built, 08).
4. No Home Screen step right after "Skip: Join Here in Safari": **keep** (built, 08).
5. A one-time code for email accounts in the Home Screen app: **yes.** Built in 09 with no server change; two-step login is still asked.

Nothing is left open.

## DONE
