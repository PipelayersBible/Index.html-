# hunt_nov19 — bug hunt notes (resumed after a machine restart)

Status: IN PROGRESS (resumed hunter). Patches 01-04 + SW_01 and tests t_h01-t_h05 are from the first hunter; being re-verified.
Work dir: /tmp/claude-0/hunt19b (site served on port 9000).

## Re-verified after the restart (each test run against _src/index.html unpatched, then patched)
| test | unpatched | patched |
|---|---|---|
| t_h01 Reload asks about unsaved work (patch 01) | 2 FAIL (quantities and note lost) | all pass |
| t_h02 day crew's open run vs night-shift rule (patch 02) | 3 FAIL (Tue run on Mon report) | all pass |
| t_h03 PDF part retry (patch 03) | 1 FAIL (never retries) | all pass |
| t_h04 worker keeps page until parts (SW_01, sw.js) | 2 FAIL (offline, no PDF tools) | all pass |
| t_h05 update line vs questions/active bar (patch 04) | 6 FAIL (covers Go Back + active bar, 3 phone sizes) | all pass |

All five of the first hunter's fixes confirmed: fail before, pass after.

## Resumed hunt (second hunter), Nov 19 late

### Changed in the first hunter's work
- Patch 02 (night shift vs day crew): the "run still open" window is now 14 h from the shift's first start, not 16 h.
  With 16 h a day crew whose FIRST run of the day started at 2:30 PM and stayed open still had the next morning's 6:15 AM
  run put on the day before (reproduced: t_h02 new case FAILS on 16 h, passes on 14 h). A 6 PM night shift whose first
  run is still open keeps runs up to 8 AM (t_h02 control). The 4-hours-after-last-stop rule is unchanged.

### New patches
- `05_quick_run_home_tab.py` + `t_h06_quick_run_tab.js`: Quick Run and the Confined Space Permits list lit up "More"
  though both are opened from Home > Start work and neither is on More. Now Home. Before: 2 FAIL. After: all pass.

### The three one-liners
1. Quick Run highlights "More": confirmed, fixed (patch 05).
2. Computer Home shows "New job" twice (side menu `#pbxSideNew` + Jobs header `#homeCxNew`): confirmed (1366 px, owner).
   NOT patched here: `staged/declutter_nov19/patches/02_company_home.py` already hides the header one on a computer and
   gives the side-menu button its styling (it had none: a bare 26 px browser button). Don't apply two fixes.
3. supabase-js `@2` floating, no integrity (source line 976; sw.js `PB_SB_URL` line 25): confirmed by
   `t_h07_sbjs_pin.js` (static check, fails today). PROPOSAL only, not patched: (a) this box can't reach jsdelivr to read
   the current file and compute its fingerprint; (b) every test rig answers /supabase-js/ with a fake, which an integrity
   attribute would block, so the rigs must strip the attribute first; (c) sw.js PB_SB_URL has to change in the same
   commit (the worker keeps that exact URL). Steps for the lead are in "Proposals".

### SERVER 01 (found live, read-only; NOT fixed here: needs one migration) — the server's evidence checks and the weather alerts have never run
- What: six service-only functions have EXECUTE for `postgres` only, not `service_role`:
  `pb_seal_check_todo/put`, `pb_photo_check_todo/put`, `pb_wx_due/finish`. The edge functions that call them with the
  service key get **403** and read that as an empty list.
- Evidence (live project, Nov 20 06:10 UTC, all read-only):
  - API log, last 24 h: `POST /rest/v1/rpc/pb_seal_check_todo` 403 x144, `pb_photo_check_todo` 403 x144 (every 10 min),
    `pb_wx_due` 403 x12 (every 15 min, 02:00-04:45 UTC).
  - `pb-seal-check` logs `{"seal_check":0,...,"waiting":0,"photos_checked":0,...}` 142 times a day;
    `weather-alerts` logs `{"runs":0,...,"pushes":0,"sent":0}` every time.
  - Tables: `pb_prod.run_seals` 2 rows, `pb_prod.run_seal_checks` **0 rows ever** (oldest seal waiting since Nov 18
    03:50 UTC); run photos in storage 8, `pb_prod.run_photo_checks` **0 rows ever**; `pb_daily.wx_runs` **0 rows ever**.
  - The admin-log day stamps in the same edge function DO work (3 days stamped): their functions have the grant.
  - `has_function_privilege('service_role', ...)` is false for exactly these six (sql/check_service_grants.sql).
- Why it matters: the app tells the office "The server checks each new sealed copy within about 10 minutes" and the
  export's record note (source ~66838) says the server "re-reads the file and computes its own SHA-256, and obtains
  time-stamp tokens ... from" outside services. Privacy lists DigiCert and FreeTSA. None of that has happened for
  any sealed original or run photo so far; and no weather alert has ever been sent.
- Fix (staged, not applied): `sql/01_grant_service_checks_NOT_APPLIED.sql` (six GRANTs; each function still checks
  `pb_push.is_service()` inside). Check before/after: `sql/check_service_grants.sql`.
- Follow-up proposal: `pb-seal-check` and `weather-alerts` should log a failure (and `pb_prod.note_error`) when the
  todo RPC answers non-200, instead of counting it as "0 waiting". That is how this stayed hidden.

### Client vs live server check (read-only)
- Every `pb_*` RPC name in the page (262 names) exists on the server with EXECUTE for signed-in users, except one:
  `pb_prod_locate_log` (the 811 ticket "History" list) does not exist, and the live `pb_prod_locate_set` has no
  `p_renewed_at` parameter and sends no `renewals` / `log_n`. The app hides Renew and History until the server sends
  those fields, so nobody sees a broken button: the 811 **Renew** and **History** features (feat_locrenew) are built
  in the app but their server half was never applied, and its SQL is not in the repo. Not a bug a crew sees; a
  finished feature that isn't live. (Until then: Edit the ticket and type the new expiry.)
- Push outbox (all time): 58 notifications, 10 sent, 48 given up; 46 of those are `no_device` (the person never turned
  notifications on / never added the app to the Home Screen), 2 are `http_400` from the push service. Not a bug; it
  backs Tommy's Home Screen step priority.
- Sentry: no real crash reports in 90 days (only "Test report from Settings"). `pb_prod.pass_errors`: empty. Cron
  jobs: none failing. pg_net calls: all 2xx.
- `docs` edge function 403 x3 / `pb_docs_can_manage` 404 x3: that is the app's own `probe` call (no doc id), by
  design; noisy but harmless.
- Argument names too: each of the 216 RPC call shapes in the page (name + the `p_*` names it sends) was matched on the
  live server against the functions' parameter names and defaults: all match (one query, read-only). The only
  conditional extra is `p_renewed_at` on `pb_prod_locate_set` (the dormant Renew above).

### Regression checks of the staged patches against the repo's own tests (patched page 01-05 + patched sw.js)
- r1708/speed2 `s01_sw_shell.js` (real worker, HTTPS): 23/23 PASS with the patched worker and page.
- r1706/daily3 `t02_night_shift.js` 12/12 PASS, `t06_last_run_crew.js` 9/9 PASS (patch 02 at 14 h).
- Sweep of all 91 screens as foreman and as owner at 390 px: no page errors, no sideways scroll.
- Trench Sloping boundaries (0, blank, negative, 4.9, 5, 19.94-19.999, Type A short-term at 12 / 12.01, Type A with
  vertical lower part at 8 / 8.01 / 12 / 12.01, rock): all answers match OSHA Table B-1 / Figure B-1.1. No finding.
- Home Screen step sheet on 390x844, 360x640, 320x568 (iPhone and Android): Done / Get a Code always reachable.

### Patch 06 (new) — a photo the phone's photo store has lost went to the company as text, uncounted
- `06_office_copy_missing_photo.py` + `t_h08_missing_photo_office_copy.js` (hook page). Reproduced: a locked run with
  two stake photos; both entries deleted from the `pb-photos` store; app reopened. The record then holds
  `pbph:1:<fingerprint>` where the photos were (r17.08's designed behaviour for a missing photo). The copy of the run
  sent to the company (`pbRrOfficeCopy`, re-sent whenever a run of the last 21 days changes) carried those two
  references as plain text, with `photosLeftOut: 0` and no photo list. The office would see a run with no photos and
  nothing saying two are missing. Before: 2 FAIL. After: all pass (never sent as text; counted as left out).
- Not fixed, proposed: (a) nobody is told on the phone that a photo is missing (only a console / crash note);
  (b) the same thing happens to EVERY photo if the app is ever rolled back below r17.08 (the old build doesn't know
  the references): for the days of the rollback the office copies of the last 21 days' runs would be re-sent without
  photos (server keeps older versions; they heal on the next forward release). Reasoned from the code, not run.
  r17.08's notes list the rollback risk only as "missing pictures on the phone". Avoid rolling back below r17.08.

### Reproduced, not patched (proposals)
- **Permit written after midnight for a window that began before midnight** (`tests/x_permit_after_midnight_probe.js`):
  at 12:30 AM, Date = today (the default), Start 10:00 PM, End 2:00 AM. The app takes it as TONIGHT 10 PM to tomorrow
  2 AM, locks without a question, and the active permit shows "OUTSIDE THIS PERMIT'S AUTHORIZED WINDOW ... The window
  has not started yet ... Check-ins made now are marked in the record." A night crew re-issuing a permit after
  midnight gets every check-in flagged unless they think to set the date back a day. (Written before midnight, the
  same times work: "Nov 19, 10:00 PM → Nov 20, 2:00 AM".) Proposal: at Lock, when the window hasn't started but the
  same times one day earlier contain "now", ask once: "Did this window start last night (Thu 10:00 PM)?" Yes / No.
  Not built: it adds a question to the permit, Tommy's call.
- **supabase-js pin** (one-liner 3): steps for the lead: pick the exact version jsdelivr serves for `@2` today, put
  `@x.y.z` + `integrity="sha384-..."` on the tag (source line 976), change `PB_SB_URL` in sw.js to the same URL in the
  same commit, and make the rigs' `/supabase-js/` route strip nothing (a routed `fulfill` body fails the integrity
  check, so the test build must drop the attribute: one line in tests/release_build.sh `--hooks`). `t_h07_sbjs_pin.js`
  is the check.

### Seen in the code only (NOT reproduced; listed so nobody re-finds them, not as findings)
- Toolbox talks: `pbTtAdopt` stamps `rndAt` with the UTC date (`toISOString().slice(0,10)`, source ~72477) while the
  rest uses the company's date; after 4 PM Pacific that is tomorrow's date. Possible effect: a random "next talk"
  adopted from the server in the evening is not re-picked after it is given that same evening.
- Runs older than 21 days that never reached the company are not sent unless Send Report was tapped (by design,
  "offline audit 03"); Records shows them as Not sent.

## Summary for the lead (ranked)
1. **SERVER 01 (live now): sealed-original checks, photo checks and weather alerts have never run.** Six GRANTs
   missing. Staged SQL + check query in `sql/`. Needs Tommy's OK to apply (server change).
2. **Patch 01** Reload asks before losing unsaved work (quantities, notes, permits) — iPhone has no other question.
3. **Patch 02** (now 14 h) a day crew's next-morning runs no longer land on yesterday's daily report.
4. **SW_01 + patch 03** PDFs after an update on bad signal: the phone keeps a page whose PDF tools it has; a failed
   PDF-tool read is retried.
5. **Patch 06** a photo missing from the phone's store is counted, not sent to the company as text.
6. **Patch 04** the "New version ready" line no longer covers a question's button or the active bar.
7. **Patch 05** Quick Run / permit list light up Home, not More.
8. Proposals: permit-after-midnight question; supabase-js pin; tell the user when a photo is missing; edge functions
   should log a refused RPC instead of "0 waiting". 811 Renew/History: built in the app, server half never applied.

Apply: `sh apply_all.sh <in index.html> <out index.html> [<in sw.js> <out sw.js>]` (page patches 01-06 in order; SW_01
on sw.js). All anchors match r17.10 `_src/index.html` exactly once; no anchor is shared with the other Nov 19 helper
folders (grep checked). Tests: `tests/t_h01`..`t_h08` (t_h02 and t_h08 need a hook page: `node tests/mkhk.js in out`;
t_h03 needs `python3 tests/mkparts.py in <dir> b.html`; t_h04 is the HTTPS worker test; t_h07 is a static check that
fails until the pin is done). Final run on r17.10 + 01-06 + SW_01: t_h01-t_h06, t_h08 all pass; unpatched each fails.
Nothing committed, pushed, deployed or changed on the server.

## Decisions for Tommy
1. Apply the six server GRANTs now? **Recommend yes, today**: the app and the Privacy page already say these checks happen.
2. Night-shift rule: a run left open counts for 14 hours from the shift's first run. **Recommend yes.**
3. Permit written after midnight: add one "Did this window start last night?" question at Lock? **Recommend yes** (night crews only see it).
4. Pin the login library to an exact version with a fingerprint? **Recommend yes**, next release (needs the small test-rig change).
5. 811 Renew + History are finished in the app but not on the server: finish and switch on, or remove the dormant code? **Recommend finish** (crews renew tickets every few weeks).

## DONE
