# One device per login (staged Nov 20, on r17.11) — version 2, with Tommy's answers

Tommy (Nov 20): "Can you limit an account to only be signed in to one [device] at a time? And implement your other fixes too."
Then: "the first device with the app actively in use should prevent the second [device] from logging in, right?"

Base: `/tmp/claude-0/r1711/src.html` (r17.11). Nothing here is live: the server was only read (SELECT, function and edge
function source). Nothing committed, pushed or deployed. The SQL was run on a throwaway local Postgres 16, not on live.

## Tommy's answers, and where each one is

| Answer | Where |
|---|---|
| Company account: 2 devices | By rule in `pb_auth.allowed()`: the owner login of a company gets 2. Tested (SQL 9p, rig section 1). |
| His own login: 2 devices | By rule: the app owner (`pb_support.admins`) gets 2. `sql/03_allow_examples.sql` also pins `tfontaine@digcivil.com` to 2. **DIG Civil test accounts are not added:** I don't know which logins are tests. The file has the query to list them and the insert to fill in. |
| Keep location in the alert | Kept. The two sentences for the lawyer: `legal/DRAFT_location_sentences_for_lawyer.md`. Not put in the app or website. |
| "Minutes apart": record, don't show | A second device within minutes is now refused, so that event is recorded as `tried_in_use` (count per day) and never shown. The notes show only "far apart" and "back and forth". |
| Keep the open-permit hold | Kept, as part of the new rule: an open permit counts as "in use", so the second sign-in is refused. |
| NEW: refuse the second device while the first is in use | Built. Below. |

## The rule now

**A new sign-in is refused while the login is in use on another device. If the other device is idle, the new sign-in
takes over and the old device is signed out.**

- **In use** = the other device's app checked in during the last 15 minutes (the app checks in when opened, when signal
  returns and every 5 minutes while it is on screen), **or** the login has a confined space permit open (saved to the
  server in the last 2 hours, not closed) on a signed-in device.
- **Refused:** the new device shows "This account is in use on another phone right now. Sign out there first, or try
  again in 15 minutes." and stays on Log In. The first device is not touched and is told nothing.
- **Idle** (lost, dead, left at home, app closed for 15 minutes): the new sign-in goes in; the old device, next time it
  reaches the server, shows "Your account was signed in on another phone, so this phone was signed out. Your saved work
  is kept and will send when you sign in again." once.
- **Longest lock-out:** 15 minutes after the other device was last on screen with signal; 2 hours after the last save of
  an open permit. **No wait at all** after Log Out on the first device or Lost Phone (both end its sessions).
- **Home Screen code** always moves the session, even though Safari was in use seconds ago: the Home Screen app signs in,
  Safari's session is ended as `moved`, Safari says so once. Get a Code says the page will be signed out and names unsent
  work first.
- **Two-step login:** the password alone decides nothing; the rule runs when the code is entered.
- **2 devices** (company account, app owner): a third is refused only while both are in use; otherwise it replaces the
  one idle longest.

## What is true today (checked on live, read-only)

- Any number of devices can use one login at once. No device registry, no trigger on `auth.sessions`, no pre-request
  check. Live now: 3 sessions, no login with two.
- Only `pb_onboard_lost_phone` ends sessions, and a phone signed out that way keeps a working access token for up to an hour.
- There is no shared helper the RPCs call: 420 public functions, almost all check `auth.uid()` themselves.
- **The company account is already its own login.** `companies.owner_user_id` is never a row in `company_members` (all 3
  companies). Office on the company login and a foreman on his own login are two logins and don't affect each other.

## Design

| Part | Where | What it does |
|---|---|---|
| Decide | trigger on `auth.sessions` (insert, and `aal` reaching `aal2`) calling `pb_auth.take_over` | Refuses (marks the new session `in_use`) or takes over (deletes the idle session; its refresh tokens go with it) and logs why: `other_device`, `moved`, `in_use`. |
| Gate | `public.pb_session_gate()` as PostgREST `db-pre-request` | Before every RPC and table request: a request from an ended or refused session is refused with `pb:signed_out` (HTTP 401, the reason in `details`). Two primary-key reads, no writes. The app's key, the service key and tokens with no session id pass. |
| Why | `public.pb_session_why(session)` | The signed-out device asks why, with no account. Answers `other_device`, `moved`, `in_use`; removes a refused session. |
| Check-in | `public.pb_device_seen(...)` | "I'm in use": device id, kind, the photo stamp's last GPS fix if the phone already has one (rounded to 0.01 degree). Records the flags. Clears refused sign-ins left behind. |
| Notes | `public.pb_share_notes()`, `public.pb_owner_share_notes()` | Company account: its own people. App owner: everyone. One note per login per day, 30 days. |
| Tables | schema `pb_auth` (not reachable from the API) | `sessions_log`, `devices`, `allow`, `flags`. Rows older than 120 days go at the login's next sign-in. |

Why this way:

- **A trigger, not an edge function or the app.** The app calls an edge function, so a changed app could skip it. The
  trigger fires on every way of signing in (password, invite or reset link, join link, Home Screen code). A fault inside
  it is caught, so it can never break signing in (tested).
- **The refusal is a marked session, not an error.** The auth service gives no clean way to turn a sign-in down from the
  database (raising there shows the person "Database error"). So the sign-in is let through, its session is marked
  `in_use`, the gate refuses everything it asks for, and the app, which checks in a third of a second after signing in,
  shows the message and signs out. The marked session is removed when that device asks why, at the first device's next
  check-in (5 minutes at most) or at the next sign-in.
- **A pre-request gate, not a check in each RPC.** One place covers all 420 functions and every table, and it also makes
  Lost Phone and Log Out take effect at once instead of within the hour.
- **`pb:signed_out` as the refusal.** Every queue in the app already treats it as "nothing was filed, try later"
  (`pbSlSync`, src line 24455; permit backup, 42563), so refused work is kept.
- Supabase's own "single session per user" setting was not used: paid Auth plan, acts only at the next token refresh,
  no reason given to the phone, no "in use" rule, no exceptions.

Other cases:

- **No signal.** A phone with no signal can't check in, so after 15 minutes it counts as idle and another device can
  take the login. The phone keeps working and keeps its unsent work under its account. When signal is back it is signed
  out and told once. After its person signs in again, the work sends under their account. Tested.
- **Lost phone / new phone.** Email login: log in on the new phone (at once if the lost one has been quiet 15 minutes).
  Join-link account: Crew members, Lost Phone, as today; the lost phone is cut off at once. Unsent work on a lost phone
  stays on that phone.
- **Company account and individual plans** follow the same rule; the company account gets 2 devices.

Flags, written by the server:

| Flag | When | Shown |
|---|---|---|
| `far_apart` | after a takeover, the two devices' GPS fixes within the same hour, 10 miles or more apart | "Ray's login was used on two phones 35 miles apart at 9:10 AM on Nov 20." |
| `back_and_forth` | a device that was signed out by another one comes back within 24 hours | "Ray's login went back and forth between two phones 2 times on Nov 20." |
| `tried_in_use` | a sign-in was refused because the login was in use (count per day) | Not shown. In `pb_auth.flags`. |

Shown on Crew members (company account) with "Each person needs their own login.", and in Beta Accounts (app owner).
GPS is sent only when the photo stamp already has a fix under an hour old; the app never asks for location for this.

## What is staged

- `sql/01_one_device.sql`: schema, tables, trigger, functions. Changes no existing object.
- `sql/02_gate_on.sql`: turns the gate on. `sql/03_allow_examples.sql`: Tommy's login; template for test accounts.
- `sql/99_undo.sql`: three parts: gate off; triggers off; remove everything.
- `sql/tests/t01.plpgsql` and `sql/tests/block_t01.sql` (built by `mk.py`): migration + test in one transaction that
  always ends `RESULT: ...` and rolls everything back; the form to run on live. 02 and 03 are not in it.
- `sql/local/`: stubs and `run_local.sh` (throwaway Postgres 16).
- `patches/01_one_device.py`: the app patch (`python3 01_one_device.py in.html out.html`, 7 exact-once swaps).
- `tests/t_1dev.js` with `srv1dev.js`, `fakesb_1dev.js`, `boot_1dev.js`: several browser contexts on one Node "server"
  that applies the same rules as the SQL. `shots/`: 7 screenshots.
- `legal/DRAFT_location_sentences_for_lawyer.md`.
- Edge functions: **no change, no files.** `crew-admin` checks the caller with `auth.getUser(token)`; the others were
  not read one by one.

## Test results

- SQL, local Postgres 16: `RESULT: 43 pass, 0 fail`, as a plain migration (applied twice) and as the rolled-back block
  (nothing left behind). Sessions were inserted as `supabase_auth_admin`. Covers: takeover of an idle session and its
  refresh token; **refused while in use, first device untouched, refused session removed by "why" and by the next
  check-in, taken over after 16 idle minutes**; the gate for live, ended, refused, logged-out and unknown sessions and
  for the app key, service key, no claims, malformed token; grants; Home Screen move; two-step login; 2 devices by rule
  and by exception; **open permit refuses, Lost Phone / Log Out lift it, a permit not saved for 3 hours does not lock**;
  check-in, flags without duplicates, refused tries never in the notes; who can read the notes; a fault in the trigger
  not blocking sign-in; user deletion. 02 and 99 were run locally too.
- Rig, patched r17.11: `t_1dev.js` sections 1 to 6, **72 checks, all pass, no page errors** (run whole once, then
  section 1 again after one expectation was corrected).
  1. Phone 2 is refused while phone 1 is in use (message, back on Log In, phone 1 untouched, try recorded). 16 minutes
     later phone 2 gets in; phone 1 is told once, not again after a restart; flags; notes on Crew members and Beta
     Accounts; a crew member sees none; company account on 2 devices, a fourth refused.
  2. The old phone learns it from a refused token refresh; a plain Log Out shows nothing.
  3. No signal: the phone keeps working and keeps its unsent record, is told when signal returns, and the record sends
     once under the right account after signing in again; back-and-forth flag and note.
  4. Home Screen code: not refused, session moved, Safari told, no flag.
  5. Server part not installed: nothing changes, no errors.
  6. Open permit refuses even when its phone has been quiet; Log Out on phone 1 lets phone 2 in at once.
- Existing tests on the patched page: `r1710/streamline/tests/t_sl4_code.js` all pass, the updated `t130_onboard.js`
  ALL PASS, `t107_mfa.js` clean (`t126_noticeack.js` clean on version 1, not re-run). The full regression was not run.

**Not tested:** the gate inside real PostgREST and the trigger inside the real auth service (only the functions, with the
claims and the role those services use). Step 2 below is the first live check.

## Apply steps (the lead)

1. **Release the app patch first.** It is silent while the server part is missing (section 5). This order matters more
   now: a phone on an older app never checks in, so it counts as idle 15 minutes after its sign-in and can be taken over
   while in use.
2. Run `sql/tests/block_t01.sql` on live. Expect `RESULT: 43 pass, 0 fail`. It holds a lock on `auth.sessions` for about
   a second and leaves nothing. A note in the result says if a part could not run there.
3. Run `sql/01_one_device.sql`, then `sql/03_allow_examples.sql` (fill in the test accounts).
4. `select public.pb_session_gate();` must return with no error. Run `sql/02_gate_on.sql`. Straight after, open the app
   signed in and signed out: both must load.
5. Check with a test login on two browsers: the second is refused with the message; sign out on the first, the second
   gets in at once. `select * from pb_auth.sessions_log order by started_at desc limit 5`.
6. If anything looks wrong: `sql/99_undo.sql` part 1 (gate off, instant), then part 2.

Goldens: tests that print the Crew members screen or the Get a Code sheet will differ by the new sentence and the hidden
note box. Not updated.

## Risks

- **The gate runs on every API request.** If it were missing or not runnable by a role, every request for that role
  would fail. Granted to everyone, tested for `anon`, `authenticated`, `service_role`, `authenticator`; undo is one statement.
- **"In use" is what the app reports.** A phone with no signal, or with the app closed for 15 minutes, counts as idle.
  Two people can still take turns on one login 15 minutes apart; that is what the two shown flags are for.
- **A permit phone with no signal for the whole entry** has not saved the permit to the server, so the server cannot
  hold the login for it. If someone else then signs in, the permit phone is signed out when signal returns and its
  message adds "A confined space permit is open on this phone. Sign in again now...". The entry on the phone is not interrupted.
- **A reset or invite link is a sign-in too.** Someone who taps "Forgot password?" on a new phone while their old phone
  is in use is refused until the old one is quiet or signed out.
- **A refused sign-in exists for up to 5 minutes** before it is cleared. The gate refuses its API requests, but photo
  uploads (storage) and edge functions that only ask the auth service who the caller is would accept it in that window.
  The same hour-long gap applies to photo uploads from a session that was taken over.
- **Location:** the check-in stores a rounded last fix per device and the company sees "35 miles apart". The Privacy
  Policy and crew notice don't say this yet (drafts in `legal/`).

## Decisions for Tommy

1. **15 minutes** as the "in use" window, and 2 hours for an open permit. Shorter locks people out less but lets a
   second person in sooner. *Recommend 15 minutes and 2 hours as staged.*
2. **Which DIG Civil logins are test accounts?** Needed to finish `03_allow_examples.sql`. Company owner logins are
   already 2 by rule.
3. **Refused tries: show them?** They are the clearest sign of sharing now ("Ray's login was tried on a second phone
   while in use, 3 times on Nov 20"). You said record silently for "minutes apart", so they are not shown. *Recommend
   showing them in Beta Accounts only.* Not built.
4. **Turn the note on for companies before the lawyer answers?** *Recommend the server and the rule go live now, and the
   Crew members note waits for the crew-notice sentence* (drop one hook in the patch; I can stage that).

## DONE
