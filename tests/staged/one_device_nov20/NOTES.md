# One device in use per login, two signed in (staged Nov 20, on r17.11) — version 3, PART DONE

**State when work stopped (usage limit): the server part (SQL) is finished and tested locally for Tommy's final rule.
The app patch and the browser tests are still the earlier version and do NOT match it yet. Do not ship the app patch
as it is.** Nothing here is live; the server was only read.

## Tommy's final rule (Nov 20, 9:44 and after)

1. Every login may stay signed in on **2 devices** (phone + tablet). A 3rd sign-in is refused while both are signed in;
   it can sign one of them out and take its place.
2. Only **one of the two may be in use at a time**. In use = that device's app checked in during the last **5 minutes**,
   or it holds the login while a confined space permit is open (saved in the last 2 hours, not closed).
3. The other signed-in device shows a plain "in use on your other device" screen and unlocks by itself, no sign-in.
4. A sign-in on a new device while the login is in use: refused, "try again in 5 minutes".
5. Home Screen code replaces the Safari page that made it (one of the two places, not both).
6. All DIG Civil logins and Tommy's login: an override, set per company.
7. Refused sign-ins and sharing signals: **tracked, never shown to users or company accounts**; only for Tommy's
   app-owner admin screen (another helper builds the screen).

## DONE: server (`sql/`), tested on a throwaway local Postgres 16

`RESULT: 65 pass, 0 fail`, as a plain migration applied twice and as the rolled-back block (`sql/tests/block_t01.sql`,
nothing left behind). 02 and 99 were run locally too.

| File | What |
|---|---|
| `sql/01_one_device.sql` | Schema `pb_auth`, trigger on `auth.sessions`, functions. Changes no existing object. |
| `sql/02_gate_on.sql` | Turns the pre-request gate on. |
| `sql/03_overrides.sql` | DIG Civil company + `tfontaine@digcivil.com`: 5 devices, usable at the same time. |
| `sql/99_undo.sql` | Gate off; triggers off; remove everything. |
| `sql/tests/t01.plpgsql`, `block_t01.sql` (built by `mk.py`), `sql/local/` | Test, the rolled-back live form, local runner. |

How it works:

- **Sign-in** (trigger, every way of signing in): refused as `in_use` if another device has the login in use; refused
  as `full` if already on 2 devices; otherwise allowed and nobody is signed out. A refused sign-in is a marked session
  that the gate refuses; it is cleared when the device asks why, or within 10 minutes. A fault in the trigger never
  blocks a sign-in (tested). Two-step login: decided when the code is entered.
- **`pb_device_seen(...)`** (the app's check-in) answers `state: active` (this device has the login) or
  `state: locked` with `other` (phone, tablet, computer), `wait_s`, `permit`. A device takes the login only when the
  other has not checked in for 5 minutes and no permit holds it.
- **`pb_session_gate()`** (PostgREST pre-request, every RPC and table request): refuses with `pb:signed_out` (HTTP 401)
  and `details` = `other_device`, `moved`, `ended`, `in_use`, `full` (hint: `phone|<epoch last used>,tablet|<epoch>`), or
  `locked` (hint: `<other kind>|<seconds until idle>|<1 if a permit holds it>`). The app's queues already treat
  `pb:signed_out` as "nothing filed, try later", so a locked device keeps its work.
- **`pb_session_take_slot(session, pick)`**: a sign-in refused as `full` signs one of the two devices out (pick 1 = used
  last, 2 = the one before) and becomes a normal session. Called with the app's own key. Refused while the login is in use.
- **`pb_session_why(session)`**: answers `other_device`, `moved`, `in_use`, `full`; removes a refused session.
- **Home Screen code**: never refused; ends the page that made it as `moved` and hands the login to the new session.
- **Log Out / Lost Phone** end the sessions, so the other device is free at once and there is no lock-out (tested, also
  with a permit open).
- **Overrides**: `pb_auth.allow (user_id, devices, one_at_a_time)` per login, `pb_auth.company_allow (company_id,
  devices, one_at_a_time)` per company (owner login and every member, now and later). The login's own row wins.

### For the admin-screen helper: the event log

Table **`pb_auth.flags`**, one row per event, never shown to users. Not reachable from the API directly; read it through
**`public.pb_owner_share_events(p_days default 90, p_limit default 200)`** (same check as Beta Accounts:
`pb_support.admin_ok`). It returns `{ok, events: [...]}`, newest first.

| Column | In the RPC row | Meaning |
|---|---|---|
| `id`, `at` | `id`, `at` | When it happened. |
| `user_id` | `user_id`, `who`, `email` | The login. `who` = the name its company uses, "Company account" for an owner login, else the email. |
| `company_id` | `company_id`, `company` | The login's company when it happened; null for a login with none. |
| `kind` | `kind` | `tried_in_use` (sign-in refused, login in use), `tried_full` (refused, already on 2 devices), `took_place` (then signed one device out), `far_apart`, `back_and_forth`. |
| `kind_a`, `kind_b` | `device_a`, `device_b` | Devices involved: phone, tablet, computer. For `took_place`, `device_a` is the one signed out. |
| `miles`, `minutes` | same | `far_apart`: distance, and minutes between the two GPS fixes. |
| `n` | `n` | `back_and_forth`: switches that day (one row per login per day). |
| `detail` | `detail` | Session ids. |

`far_apart` is recorded only when the two fixes are 10+ miles apart and too far to drive in the time between them
(over 90 mph), so one person with a phone and a tablet does not trip it. Location is sent only when the photo stamp
already has a fix; it is stored rounded to 0.01 degree.

## NOT DONE

1. **App patch (`patches/01_one_device.py`) is still version 2.** It has to change to:
   - check in every 90 seconds while on screen (now 5 minutes), and read `state` / the `locked` and `full` refusals;
   - the lock screen ("In use on your other device (phone). You can use this one when that one has been idle for 5
     minutes.", countdown from `wait_s`, Try Now, Log Out; not shown offline or over a live permit on this device;
     unlocks by itself and kicks the queues);
   - the "already signed in on two devices" screen with one button per device (calls `pb_session_take_slot` with the
     app's own key by plain fetch, then reloads) and Cancel;
   - the refused message with "5 minutes" (it says 15);
   - **remove** the Crew members note and the Beta Accounts block (they call `pb_share_notes` /
     `pb_owner_share_notes`, which no longer exist; the calls fail quietly, but the code is dead and the hidden box stays).
   What is still right in it: device id, GPS only from the photo stamp, the signed-out message shown once, the Get a
   Code warning, silence when the server part is missing.
2. **Browser tests (`tests/t_1dev.js`, `srv1dev.js`) are version 2** (15-minute takeover, notes). They passed 72 checks
   for that version only. Needed: A active then B locked; A idle 5 minutes then B unlocks without sign-in; third device
   refused and takes a place; permit priority; offline queue; Home Screen code.
3. **`03_overrides.sql` not checked against live:** I did not confirm that `name ilike 'DIG Civil%'` matches exactly one
   company and that the email matches one login. The file ends with a query that shows what it matched. The values (5
   devices, usable at once) are my reading of "the same override as my own login".
4. **Not tested anywhere:** the gate inside real PostgREST and the trigger inside the real auth service. The live block
   also creates `pg_temp` helper functions; if live refuses that, the block fails before testing and changes nothing.
5. Legal: `legal/DRAFT_location_sentences_for_lawyer.md` was written for version 2 (company sees the distance). Now only
   the app owner sees it, so the crew-notice sentence is no longer needed and the Privacy Policy sentence should say
   "we", not "your company account". Not rewritten.
6. `old_v2/` holds the version 2 SQL and test for reference. `shots/` are version 2 screens.

## Apply order (this weekend), once the app patch is finished

1. Finish and test the app patch (items 1 and 2). Release the app first: it must be silent while the server part is
   missing, and phones on the old app never check in, so they would never hold the login.
2. Run `sql/tests/block_t01.sql` on live. Expect `RESULT: 65 pass, 0 fail`. Rolls itself back.
3. Run `sql/01_one_device.sql`, then `sql/03_overrides.sql` (read its last result).
4. `select public.pb_session_gate();` must return with no error. Run `sql/02_gate_on.sql`. Open the app signed in and
   signed out at once: both must load.
5. Two browsers on a test login outside DIG Civil: the second is refused while the first is open; five minutes after
   closing the first, the second signs in and both stay signed in.
6. Wrong: `sql/99_undo.sql` part 1 (gate off, instant), then part 2.

**If the app patch cannot be finished this weekend:** steps 2 and 3 can still go live safely on their own without
step 4. Then sign-ins are refused by the rule, but a refused or second device gets no screen explaining it (its
requests just fail quietly until step 4 and the new app). I would not do that; ship server and app together.

## Risks (server part)

- The gate runs on every API request; if it were missing or not runnable by a role, every request for that role would
  fail. Granted to everyone and tested for all four API roles; undo is one statement.
- "In use" is what the app reports: a phone with no signal or with the app closed for 5 minutes counts as idle.
- A permit phone with no signal for the whole entry has not saved the permit, so the server cannot hold the login for it.
- Photo uploads (storage) and edge functions are not covered by the gate: a locked or refused device could still use
  them. The lock screen in the app is what stops normal use there.
- A reset or invite link is a sign-in too and is refused while the login is in use elsewhere.

## DONE
