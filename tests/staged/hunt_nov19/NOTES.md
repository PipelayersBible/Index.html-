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
