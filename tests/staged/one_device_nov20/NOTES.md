# One device per login (staged Nov 20, on r17.11)

Tommy (Nov 20): "Can you limit an account to only be signed in to one [device] at a time? And implement your other fixes too."

Base: `/tmp/claude-0/r1711/src.html` (r17.11). Nothing here is live: the server was only read (SELECT, function and edge
function source). Nothing committed, pushed or deployed. The SQL was run on a throwaway local Postgres 16, not on live.

## What is true today (checked on live, read-only)

- Any number of devices can use one login at once. No device registry, no trigger on `auth.sessions`, no pre-request
  check (`pg_db_role_setting` for `authenticator` has no `pgrst.db_pre_request`). Live now: 3 sessions, no login with two.
- Only `pb_onboard_lost_phone` ends sessions (`delete from auth.sessions where user_id = ...`), and a phone signed out that
  way can keep using its access token until it expires (up to its normal hour).
- There is no shared helper the RPCs call: 420 public functions, almost all check `auth.uid()` themselves. So the one
  cheap place that covers all of them is PostgREST's pre-request function, not an edit to each RPC.
- **The company account is already its own login.** `companies.owner_user_id` is never a row in `company_members` (all 3
  companies checked). The office on a computer with the company login and a foreman on his phone with his own login are
  two logins, so they are not affected. PMs and superintendents have their own logins too.

## Design

**Rule: a finished sign-in ends the login's other sessions.** Enforced in the database, so the app cannot skip it.

| Part | Where | What it does |
|---|---|---|
| Takeover | trigger on `auth.sessions` (insert, and `aal` reaching `aal2`) | Deletes the login's other sessions (their refresh tokens go with them, as in lost-phone) and logs why: `other_device`, or `moved` when a Home Screen code was used in the last 3 minutes. |
| Gate | `public.pb_session_gate()` as PostgREST `db-pre-request` | Before every RPC and table request: a signed-in request whose session no longer exists is refused with `pb:signed_out` (HTTP 401, the reason in `details`). One primary-key read, no writes. The app's key, the service key and tokens with no session id pass untouched. |
| Why | `public.pb_session_why(session)` | The signed-out phone asks why, with no account. Answers only `other_device` or `moved`. |
| Check-in | `public.pb_device_seen(...)` | Device id, kind (phone, tablet, computer), the photo stamp's last GPS fix if the phone already has one (rounded to 0.01 degree). Records the sharing flags. |
| Notes | `public.pb_share_notes()`, `public.pb_owner_share_notes()` | Company account: its own people. App owner (same check as Beta Accounts): everyone. One note per login per day, the strongest. 30 days. |
| Tables | schema `pb_auth` (not reachable from the API) | `sessions_log`, `devices`, `allow` (exceptions, empty), `flags`. |

Why this and not the other options:

- **Trigger, not an Auth Hook or an edge function on sign-in.** An edge function on sign-in is called by the app, so a
  changed app could skip it. An Auth Hook works but needs dashboard set-up and runs on every token refresh. The trigger
  fires on every way of signing in (password, invite or reset link, join link, Home Screen code) because each one inserts
  a row in `auth.sessions`; a token refresh does not. `postgres` has TRIGGER and DELETE on `auth.sessions` (checked).
  Anything that goes wrong inside the trigger is caught, so a sign-in is never blocked by it (tested).
- **Pre-request gate, not a check in each RPC.** Deleting the session kills the refresh token at once, but the old
  phone's access token would still work for up to an hour. The gate closes that hour for every RPC and table in one
  place. It also makes lost-phone and Log Out take effect at once.
- **`pb:signed_out` as the refusal.** Every queue in the app already treats it as "nothing was filed, try later" (for
  example `pbSlSync`, src line 24455; the permit backup, 42563). So a refused send is kept, not dropped.
- Supabase's own "single session per user" setting was not used: it needs a paid Auth plan, acts only at the next token
  refresh, gives the old phone no reason, and has no exceptions.

Cases:

- **Two-step login.** The password alone takes nothing over. The takeover happens when the code is entered (`aal2`), so
  someone who only knows the password cannot sign the real person out.
- **Home Screen app vs Safari on one iPhone** are two devices (separate storage). The r17.10 code hand-off moves the
  session: the Home Screen app signs in, Safari's session is ended as `moved` (no dead session left), Safari says "Your
  account is now signed in in the Home Screen app..." once. Get a Code now says the page will be signed out, and names
  unsent work first. No change to `crew-join` or `pb_onboard_svc`: the trigger reads `pb_onboard.links.used_at`, which
  the `handoff` step stamps before the session is made.
- **No signal.** The old phone keeps working signed in. Its unsent work stays under its account. When signal is back it
  is signed out and told once. After the person signs in again, the work sends under their account (every send carries
  `p_expect_uid`). Tested.
- **Lost phone / new phone.** Email login: log in on the new phone; that ends the lost phone's session. Join-link
  account: Crew members, Lost Phone, as today (it already ends the sessions and makes a new link); with the gate the lost
  phone is cut off at once instead of within the hour. Work not sent from the lost phone stays on that phone.
- **SAFETY, confined space.** A login with a permit open right now (saved to the server in the last 12 hours, not closed)
  is not cut off by a sign-in elsewhere: both work until the permit closes, then the next check-in ends the older one.
  If the permit phone has had no signal for the whole entry the server cannot know; the phone then gets the message plus
  "A confined space permit is open on this phone. Sign in again now...". The permit keeps working on the phone either way.
- **Company account and individual plans** follow the same rule (tested for the company account). Exceptions go in
  `pb_auth.allow (user_id, devices)`.

Sharing flags (nothing blocked), written at check-in:

| Flag | When | Note shown |
|---|---|---|
| `far_apart` | the two devices' GPS fixes within the same hour, 10 miles or more apart | "Ray's login was used on two phones 35 miles apart at 9:10 AM on Nov 20." |
| `back_and_forth` | a device that was signed out by another one comes back within 24 hours | "Ray's login went back and forth between two phones 2 times on Nov 20." |
| `minutes_apart` | the old device checked in less than 15 minutes before the new sign-in | "Ray's login was used on a phone and a computer 4 minutes apart at 9:10 AM on Nov 20." |

A Home Screen move and a sign-in on the same device raise nothing. Shown on Crew members (company account) and in Beta
Accounts (app owner). GPS is sent only when the photo stamp already has a fix under an hour old; the app never asks for
location for this.

## What is staged

- `sql/01_one_device.sql`: schema, tables, trigger, functions. Safe to run twice. Changes no existing object.
- `sql/02_gate_on.sql`: turns the gate on (`alter role authenticator set pgrst.db_pre_request`, reload).
- `sql/99_undo.sql`: three parts: gate off; triggers off; remove everything.
- `sql/tests/t01.plpgsql`: the test body. `sql/tests/block_t01.sql` (built by `mk.py`): migration + test in one
  transaction that always ends `RESULT: ...` and rolls everything back; the form to run on live. 02 is not in it.
- `sql/local/`: stubs and `run_local.sh` (throwaway Postgres 16).
- `patches/01_one_device.py`: the app patch (`python3 01_one_device.py in.html out.html`, 7 exact-once swaps).
- `tests/t_1dev.js` with `srv1dev.js`, `fakesb_1dev.js`, `boot_1dev.js`: rig tests, several browser contexts on one
  Node "server" that applies the same rules as the SQL. `shots/`: 5 screenshots.
- Edge functions: **no change needed**, no files. `crew-admin` checks the caller with `auth.getUser(token)`; the others
  were not read one by one.

## Test results

- SQL, local Postgres 16: `RESULT: 35 pass, 0 fail`, both as a plain migration (applied twice) and as the rolled-back
  block (nothing left behind). Sessions were inserted as `supabase_auth_admin`, the role the auth service uses. Covers:
  takeover and refresh token removal; the gate for a live, ended, logged-out and unknown session and for the app key,
  service key, no claims and a malformed token; grants; why; Home Screen move; two-step login; an allowed exception;
  check-in and all three flags with no duplicates; who can read the notes; the permit hold; a fault in the trigger not
  blocking sign-in; user deletion. 02 and 99 were run locally too.
- Rig, patched r17.11: `t_1dev.js` sections 1 to 5, 67 checks, all pass, no page errors.
  1. Two phones on one login: the second sign-in ends the first; the first is told once at its next server contact, not
     again after a restart; flags recorded; notes on Crew members and Beta Accounts; a crew member sees none; the company
     account on a computer does not sign Ray's phone out.
  2. The old phone learns it from a refused token refresh; a plain Log Out shows nothing.
  3. No signal: the phone keeps working, keeps its unsent record, is told when signal returns, and the record sends once
     under the right account after signing in again; back-and-forth flag.
  4. Home Screen code: session moved, Safari told, no flag.
  5. Server part not installed: nothing changes, no errors.
- Existing tests on the patched page: `t_sl4_code.js` all pass, `t126_noticeack.js` clean; see the end of this file for
  `t130_onboard.js`.

**Not tested:** the gate inside real PostgREST (only the function, with the claims PostgREST sets), and the trigger
inside the real auth service. The first live check is step 3 below.

## Apply steps (the lead)

1. Release the app patch first (it is silent while the server part is missing: section 5).
2. Run `sql/tests/block_t01.sql` on live. Expect `RESULT: 35 pass, 0 fail`. It holds a lock on `auth.sessions` for about a
   second and leaves nothing. A note in the result says if a part could not run there.
3. Run `sql/01_one_device.sql`. From now a new sign-in ends the login's other sessions. Check with a test login on two
   browsers: sign in on the second, then `select * from pb_auth.sessions_log order by started_at desc limit 5`.
4. `select public.pb_session_gate();` must return with no error. Then run `sql/02_gate_on.sql`. Straight after, open the
   app signed in and signed out: both must load. The first browser from step 3 must now show the message.
5. If anything looks wrong: `sql/99_undo.sql` part 1 (gate off, instant), then part 2.
6. Optional: `insert into pb_auth.allow (user_id, devices, note) values (...)` for any login that needs two devices.

Goldens: tests that print the Crew members screen or the Get a Code sheet will differ by the new sentence and the hidden
note box. Not updated.

## Risks

- **The gate runs on every API request.** If the function were missing or not runnable by a role, every request for
  that role would fail. It is granted to everyone and tested for `anon`, `authenticated`, `service_role`,
  `authenticator`; undo part 1 is one statement.
- **Permit phone with no signal** (above): it is signed out when signal returns. The entry itself is not interrupted.
- **Photo uploads** go through the storage API, which the gate does not cover. An ended session's access token can still
  upload a photo for up to an hour; the record that points to it is refused.
- **The old phone learns late.** Until it next reaches the server it looks signed in and keeps saving work on the phone.
  That work sends only after its person signs in there again.
- **Location.** The check-in stores a rounded last fix per device, and the company sees "35 miles apart". The Privacy
  Policy and the crew notice ("What your company sees") do not mention this yet.
- **Flags can be innocent:** a foreman who logs in on the office computer while his phone is in his pocket gets a
  "minutes apart" note. Notes say what happened, not that anyone shared.
- A login with two-step login and a sign-in still waiting for its code keeps that half-finished session, as today.

## Decisions for Tommy

1. **Company account: one device or two?** Staged: one, like everyone. The owner on the office computer and on his own
   phone with the company login would sign each other out. *Recommend two for the company account only* (it is free, not
   a paid seat, and its daily limits are low). One row per company account in `pb_auth.allow`, or I change the default.
2. **Location in the sharing flag: keep or drop?** *Recommend keep, but only after the Privacy Policy and crew notice get
   one sentence.* Until then, drop the two GPS arguments from the check-in (one line in the patch); the other two flags
   still work.
3. **"Minutes apart" notes: show them or only record them?** *Recommend record only* and show "far apart" and "back and
   forth", which are much harder to explain away.
4. **Permit hold: keep?** A login with an open permit can be on two devices until the permit closes. *Recommend keep.*
5. **Your own login** (app owner, phone and computer): *recommend an exception of 2* in `pb_auth.allow`.

## DONE
