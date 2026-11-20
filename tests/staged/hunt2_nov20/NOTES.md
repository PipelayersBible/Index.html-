# hunt2_nov20 — bug hunt round 2 notes

Status: IN PROGRESS. Work dir: scratchpad/h2 (ports 9400-9449). Source: _src/index.html r17.10.
(Round 1 = ../hunt_nov19; not redone.)

## Log
- started; reading round 1 + rigs.
- Item 1 reducer reload: REPRODUCED and fixed. patches/01_reducer_wall_reload.py + tests/t_r01_reducer_reload.js
  (hook page). Worse than the old note said: with a pipe that HAS a table wall, a typed reducer wall is silently
  replaced by the table wall on Edit Run Data (SDR 35 12->8, typed 0.05: BOP after the reducer 10.55 -> 10.52, and a
  second Lock records it). Clay (no table wall): BOP/TOP/SG dash on the reducer AND every row after it. Base FAIL 4, patched PASS.
- Item 1 independent grade re-check: tests/grade3/ (myref.js = my own first-principles math, mygen.js = my own
  scenarios incl. fill stakes, flat, 20-100 % steep, 2,000-9,000 ft, inverts below zero, 2-12 ft runs, station text
  both directions, stepped starts, reducers; run3.js drives the real form). Seeds 0-479: 480 scenarios, 20,458 rows,
  ~235,000 values (INV/BOP/TOP/SG elevations, rod readings, shown text in 0.01 ft and ft-in-1/16, station text,
  slopes %, HI, every interval mark present): **0 math mismatches** at 0.0005 ft. The 4 flagged seeds (221, 390, 401,
  437) are my generator typing a rod reading for an invert ABOVE the instrument; the app refuses those ("can't be
  negative"), correctly. Two app conventions I had to adopt (both stated in the app, not bugs): a Run N "step" is
  bottom-of-pipe to bottom-of-pipe; top of pipe = BOP + the pipe's real OD (ASTM D3034 values checked by hand; a
  blank pipe type is shown as "PVC SDR 35 (auto)" and treated as that). No metric mode exists in the app.
- Item 2 (round 1's open item) BUILT: patches/02_missing_photo_notice.py + tests/t_p02_missing_photo_notice.js (hook
  page). Records banner "N photos are missing from this phone" (tap: which records; sent photos are still with the
  company), one line on the run's Results, and a "Photo missing from this phone" picture wherever a lost photo would
  draw. Base: 4 FAIL; patched: all pass (light + dark checked by screenshot).
- Item 6a BUILT: patches/03_permit_started_last_night.py + tests/t_c03_permit_last_night.js (hook page; 7 clock
  cases). Asked only when the typed window has not started AND the same times one day earlier are running now.
  Base: 5 FAIL; patched: all pass. "Entry Supervisor Decides" still shows once.
- Item 6b STAGED (not deployed): edge/patch_seal_check.py -> edge/pb-seal-check/index.ts (full file, from the repo
  copy tests/edge/pb-seal-check/index.ts whose todo/log lines I checked against live v8) + pb-seal-check/test_refused.ts
  (deno; live code 4 FAIL, staged all pass). edge/patch_weather_alerts.py (exact-once edits for the LIVE logic.ts +
  index.ts; the live source is not in the repo) + weather-alerts/logic_excerpt.ts / test_refused.ts (excerpt 3 FAIL,
  patched all pass). A refused call is logged with console.error {"error":"rpc_refused",...}; pb-seal-check answers
  500 instead of 204 then; a refused cron-secret read is logged too (it used to be silent).
  Live check Nov 20 07:49 UTC after round 1's GRANTs: run_seal_checks 2 of 2, run_photo_checks 8, wx_runs still 0
  (weather only runs ~4 PM / 6 PM company time).
- Item 5 (sign-in code): server read (pb_onboard_handoff_make, pb_onboard_svc claim/handoff, pb_onboard.find/refusal,
  crew-join logic.mjs, all read-only): single use (used_at set under a row lock; a second claim inside 2 min gets
  pb:link_busy), 15 min expiry, a newer code cancels the older, 5 codes/hour, typed 6-character codes behind the
  global wrong-code brake. Two-step login: asked by the app after the code sign-in (t_sl4 covers; re-run below).
  BUG fixed: a used / too-old / replaced SIGN-IN code showed the JOIN LINK words ("Links last 24 hours. Ask whoever
  sent it ... someone else did"). patches/04_signin_code_words.py + tests/t_s04_signin_code_words.js: base 3 FAIL,
  patched all pass.
  Seen in server code, not a crew-facing bug: (a) "new-phone link" (pb_onboard_lost_phone) deletes the old account's
  sessions but leaves a still-live sign-in code of that account usable for its last minutes; the old account is out of
  the company by then, so it reaches no company data. (b) two-step login is enforced by the server only for Tommy's
  admin functions (pb_owner_*, pb_support*: aal2 checked); for company data the app asks for the code but the server
  would accept a one-factor session (true for password logins too; no RLS policy mentions aal). Proposal below.
- Item 4 (offline): the Nov 17 offline rig already covers kill at Lock / End / Break, lost answers, two tabs, storage
  full, a clock that is BEHIND (t11), the daily-report and ticket queues (t13). New here: a clock that is AHEAD when
  the run is locked, then corrects itself before End Run: the run ended and reached the company (3 record puts), but
  its report said "Total time on run: -1920h 0m". patches/05_no_negative_run_time.py +
  tests/t_o05_clock_ahead_run_time.js (offline rig; needs PB_SITE): base 2 FAIL, patched all pass. Stats/rates already
  skip such a run (they need a time > 0), so only the words were wrong.
  Server side (read-only): saves that two phones can make to the same thing carry an expected version / client id
  (pb_prod_save, daily, tickets, job items); the only server rule that compares a phone time (pb_talk_plan_set) caps
  it at now + 5 min. No finding.
- Item 3 (roles / server, read-only, Nov 20): 214 tables in 20 app schemas: every one has row security on, none is
  readable or writable by a signed-out caller, and none in the pb_* schemas has a policy (all access is through
  functions). 311 public functions a signed-in user can call: every one is SECURITY DEFINER with a pinned
  search_path, and every one reaches an identity check (auth.uid()/role/jwt) directly or through a helper, except the
  6 meant for signed-out use (anonymous report x4, pb_em_view responder link, pb_onboard_peek) — checked by a
  recursive query over the function bodies (4 levels). Beta seats live: 7 = the company account + 6 people; the
  app's words say the same ("plus 6 people"). Join links and email invites are counted together when someone
  actually joins, so the cap holds; an email invite is not refused for live join links (pb_billing.trial_seats_full
  ignores them), so a link made earlier can later answer "beta is full". No owner-transfer exists for a company
  (only Tommy's "Hand Over" admin action, aal2-checked).

## What is in this folder
| file | what | test (fails on r17.10, passes patched) |
|---|---|---|
| `patches/01_reducer_wall_reload.py` | Edit Run Data / Resume give a mid-run reducer's wall back | `tests/t_r01_reducer_reload.js` (hook page, `PG=`) |
| `patches/02_missing_photo_notice.py` | the phone says when a photo can't be found (Records banner, line on the run, "Photo missing" picture) | `tests/t_p02_missing_photo_notice.js` (hook page, `PB_URL=`) |
| `patches/03_permit_started_last_night.py` | "Did This Window Start Last Night?" at permit Lock | `tests/t_c03_permit_last_night.js` (hook page, `PG=`) |
| `patches/04_signin_code_words.py` | a used / old / replaced sign-in code gets its own words | `tests/t_s04_signin_code_words.js` (`PB_URL=`) |
| `patches/05_no_negative_run_time.py` | a run never shows a negative time | `tests/t_o05_clock_ahead_run_time.js` (offline rig: `PB_ROOT`, `PB_SITE`, `PG`) |
| `tests/grade3/` | independent grade re-check (`myref.js`, `mygen.js`, `run3.js FROM TO`) | 480 scenarios, 0 math mismatches |
| `edge/patch_seal_check.py`, `edge/pb-seal-check/` | staged edge function + deno test (NOT deployed) | `test_refused.ts` |
| `edge/patch_weather_alerts.py`, `edge/weather-alerts/` | exact-once edits for the live weather-alerts files + excerpt test (NOT deployed) | `test_refused.ts` |
| `sql/check_*.sql` | the read-only server checks, to re-run | |
| `apply_all.sh` | page patches 01-05 in order | |

Apply: `sh apply_all.sh <in index.html> <out index.html>`. All anchors match r17.10 `_src/index.html` exactly once.
Checked: applies on top of round 1 (`../hunt_nov19/apply_all.sh`) in either order with the same result, and after each
of critic / declutter / feedback_btn / legal / permit_short / simplify / spanish _nov19's patches. `node --check` passes
on the patched page's main script. New crew-facing strings (patches 02-05) are English only: the Spanish helper's
dictionary needs them added.
Edge functions: deploy is the lead's call. pb-seal-check: diff `edge/pb-seal-check/index.ts` against the live v8 first
(I built it from the repo copy). weather-alerts: fetch the live `logic.ts` + `index.ts` (get_edge_function), run
`patch_weather_alerts.py`; it stops if any line no longer matches.
Nothing committed, pushed, deployed or changed on the server (SELECTs and function/edge-function reads only).

## Final run (r17.10 `_src/index.html` + patches 01-05, Nov 20)
- My tests: t_r01, t_p02, t_c03, t_s04, t_o05: all pass (each fails on unpatched r17.10, counts above).
- grade3 seeds 0-119 on the patched page: 5,097 rows, 60,585 values, 0 mismatches (0-479 unpatched: 0 math mismatches).
- Repo tests on the patched page: grade2 t01-t04 PASS; askgrade t_g40, t_g43 PASS; r1710 t_sl4_code all pass (two-step
  login is still asked after a code sign-in); speed2 photo tests p01_migrate, p02_kill, p03_quota, p05_gc_tabs,
  p08_clear all pass (p07 rollback needs the r17.04 page, which is not on this machine: not run); a daytime permit
  locks and takes a reading with no extra question.
- Not re-run: the full regression (shared machine; the lead runs it).

## Summary for the lead (ranked by what a crew / company would feel)
1. **Patch 01: Edit Run Data and Resume swapped a typed reducer wall for the table wall** (or blanked it): bottom of
   pipe, top of pipe and subgrade after the reducer moved (0.03 ft in the test) with nothing on screen saying so, and
   locking again recorded it. Real, reproduced, fixed.
2. **Patch 03 (built as approved): "Did This Window Start Last Night?"** at permit Lock, night crews only.
3. **Patch 02 (round 1's open item): the phone now says when a photo is missing**, where, and that sent photos are
   still with the company.
4. **Patch 04: sign-in code errors** told people "Links last 24 hours. Ask whoever sent it" for a code they made
   themselves that lasts 15 minutes. Easy to hit on the r17.10 Home Screen step.
5. **Edge functions (staged)**: a refused database call is now an error in the log, not "0 waiting".
6. **Patch 05: "Total time on run: -1920h 0m"** after the phone's clock corrected itself mid-run.
7. **Grade math: clean.** 480 of my own scenarios against my own math, 0 mismatches.
8. **Server (read-only): clean** at the level checked (row security, function grants, identity checks, sign-in code
   rules, expiry times match the app's words: join links 24 h, invitations 7 days, sign-in codes 15 min).

## Proposals (not built)
- Two-step login on the server: for an account that has it on, company functions could refuse a one-factor session
  (today only Tommy's admin functions do; the app asks, the server does not insist). Needs a server change and a
  careful rollout (offline phones, the code prompt timing). Not urgent: the same is true of password logins.
- "New-phone link" could also cancel that account's live sign-in code (one line in pb_onboard_lost_phone).
- Email invites could count live join links the way join links count invites (pb_billing.trial_seats_full), so a link
  handed out earlier never answers "beta is full" later.
- Spanish: add the new strings of patches 02-05 to the Spanish helper's dictionary.

## Decisions for Tommy
1. Ship patch 01 (reducer wall) in the next release? **Recommend yes**: it is the only one here that changes a grade number.
2. Permit question wording: "Did This Window Start Last Night?" with "Yes, Last Night" / "No, Tonight". **Recommend as built.**
3. Missing-photo words: "N photos are missing from this phone ... Photos that were already sent are still with your company. Photos that were never sent can't be brought back." **Recommend as built** (plain and true).
4. Deploy the two edge-function changes (errors instead of "0 waiting"; pb-seal-check answers 500 when refused)? **Recommend yes**, with the next server change.
5. Make the server insist on two-step login for company data when the account has it on? **Recommend later, as its own small project** (not a quick switch).

## DONE
