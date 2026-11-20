# r17.12 candidate (weekend update), built Nov 20 2026

Nothing published, pushed or applied. The server was not touched. The repo's tests/ goldens are unchanged (updates are in `test_updates/`).

## What is in it (applied in this order on `_src/index.html` r17.11, md5 3813d6f2…)
| # | Patch (copy in `patches/`, byte-identical to the staged file) | Feature |
|---|---|---|
| 1 | `1_01_one_device.py` (one_device_nov20 v3) | 2 devices signed in, 1 in use; lock screen, take-a-place, Log Out = this device |
| 2 | `2_p01_owner_dashboard.py` (ceo_page_nov20) | Owner Dashboard + build/crash usage counts |
| 3 | `3_p_taper.py` + `taper_math.js` (taper_calc_nov20) | Taper & Cone Spacing, Traffic Control category |
| 4 | `4_01_yearly_app.py` (billing_yearly_nov20) | Monthly / Yearly buttons, Turn On Monthly/Yearly, sheets read |
| 5a | `5a_ask_state_app.py` (ask_state_nov20/app) | Ask sends the state. **Needed:** it is NOT in r17.11 (no `pbAskState` in `_src`), and ask_followups is written on top of it. No conflict. |
| 5b | `5b_ask_followups_app.py` (ask_followups_nov20/app) | "Answered for <State>", state pick under the answer, one-time Home card, State field on New Job, phone location as a last resort |
| - | build stamp | `PB_APP_BUILD = 'r17.12 · 2026-11-21'` |

- **Anchors.** Every patch applied exact-once on top of the earlier ones. No anchor had to be changed, and no extra fix patch was needed.
- **Files.**
  - `index.src.html` is the new `_src/index.html` (md5 7d5d8a84…).
  - `build/` is the page to publish (`index.html` md5 dd7a2c55…, plus `pbx/`, the same four parts as r17.11).
  - `build_hooks/` is the test build.
  - `sw.js` is the repo sw.js with `PB_SW_BUILD = 'r17.12 · 2026-11-21'` (md5 15003c23…).
  - `work/s0.html` is the base; `work/s6.html` is the result before the stamp.
- **Rebuild:**

  ```
  cp _src/index.html a; for p in 1_01_one_device 2_p01_owner_dashboard 3_p_taper 4_01_yearly_app 5a_ask_state_app 5b_ask_followups_app; do python3 patches/$p.py a b && mv b a; done
  ```

  Then bump the stamp, and run `python3 tests/r1708/speed2/build/build.py <src> <out> [--hooks]`.

## Test totals
**Feature tests**, on the combined source served as cur.html (port 10400, one browser). Outputs are in `results/`.

| Test | Result |
|---|---|
| one_device `t_1dev.js` | 79/80 as written. The 1 fail is a test change (see below). The updated copy passes; section 9 passes 5/5. |
| ceo `t_ceo.js` | 36/37 as written. The 1 fail is a test change. The updated copy passes 37/37. |
| taper `unit_math.js` + `t_taper_ui.js` | ALL PASS + ALL PASS |
| billing `t_yearly_app.js`, `t127_billing0_v2.js` | all pass (56), 40/40 |
| billing `t98_betaend_v2.js`, `t99_removed_v2.js` (print-only) | Same output as the billing helper's reference. The only difference is "·" vs "," in "Yearly $144, save $36", from the helper's own later version. |
| ask_followups `t_ask_followups_app.js` | 43/43 |
| ask_state `t_ask_state_app.js` | 9/9 |

**Full regression** (`tests/run_all.sh --build <hooks site>/index.html --jobs 2`; the site is `build_hooks/` + sw.js, icons, data):
**210 pass, 12 FAIL, 15 skip (of 237)**. See `results/full_regression_summary.txt`.

- **All 12 failures are expected changes.** No real bug was found.
  - The same 12 pass on an r17.11 hooks build (`results/r1711_same12.log`).
  - On r17.12 with `test_updates/` applied, all 12 pass (`results/r1712_same12_with_updates.log`, run in a sandbox copy of the repo).

| Test | Why it changed |
|---|---|
| t98_betaend, t99_removed | They click the old `data-plan="individual"` / `data-own="1"` buttons and time out. Only the selector changes (as in the billing helper's _v2 copies). New goldens. |
| beta/t_b04_ownerended | The crew sees Company Plan + My Own Plan: Monthly $15 + My Own Plan: Yearly $144, save $36. |
| office/b1_beta | The same buttons, and "save $36" in the price line. |
| office/b3_owner | "Turn On Monthly / Turn On Yearly", and `{p_interval:'month'}` sent. The modal text is cut at 600 characters, so "14 runs · 63 photos" drops off the end (it is still on the page). |
| critic/w1, critic/w4 | New `screen-taperCalc`, the Traffic Control chip, and the Taper & Cone Spacing row. |
| t95_beta | The usage report now carries `build:rNN.NN` (Owner Dashboard). |
| office/s1_smoke, offline/rig/t00b, sync/t03_roles, offline/rig/t02_day | New start-up calls `pb_device_seen` (one device) and `pb_state_rules_get` (Home state card). t02_day's "server calls while offline" counts from launch, so 20 → 22 are the two start-up calls, not calls made offline. |

**Feature test updates:**
- `t_1dev` section 9's "no sharing words" regex matched `pb_owner_share_events`. That is the Owner Dashboard's admin-only Show Events call, meant for exactly this. The regex is narrowed to `pb_owner_share_notes`.
- `t_ceo` looked for `build:r17.11`. It now accepts any build.

**To apply the test updates** (with the release commit, from the repo root):
`sh tests/staged/r1712_candidate/apply_test_updates.sh`. It copies `test_updates/tests/**` over `tests/`: 3 scripts, 2 staged tests and 11 goldens.

Not run: the feature tests against the minified build (the regression covers the minified page), Spanish mode, dark-mode screens of the new cards.

## Server apply order, all features combined
The app can go first for every feature: each one is silent or says "not set up" without its server part.
one_device's notes require the **app first**.

0. **Release r17.12:**
   - publish `build/index.html` → `index.html`, `build/pbx/`, `sw.js` → `sw.js`, and `index.src.html` → `_src/index.html`, in one commit;
   - apply the test updates;
   - check that the live page and sw.js say r17.12.
1. **One device** (`one_device_nov20/sql/`):
   - Run `tests/block_t01.sql` and expect `RESULT: 68 pass, 0 fail` (it rolls back).
   - Then `01_one_device.sql`, and check that `cron.job` has one `pb-auth-flags-trim` row.
   - Then `03_overrides.sql`. Its last result should be 1 company, 1 login.
   - Check: `select public.pb_session_gate();` should give no error.
   - Then `02_gate_on.sql`, and open the app signed in and signed out: both should load.
   - Then the two-browser check from its NOTES (a test login outside DIG Civil).
   - Undo: `99_undo.sql` part 1 (instant), then part 2.
2. **Owner Dashboard** (`ceo_page_nov20/sql/`):
   - Run `tests/block_t01.sql`. Success is an error starting `RESULT: {"checks": "all passed`.
   - Then `01_owner_dashboard.sql`.
   - It reads `pb_auth.flags` only if it exists, so it is safe before or after step 1. After step 1, the sharing card switches on by itself.
   - Undo: `99_undo.sql`.
3. **Billing yearly** (`billing_yearly_nov20/sql/`):
   - Run `tests/live_t01.sql` (md5 7c6d121d…). Success is an error starting `RESULT: {"checks": "all passed"}`.
   - Then `01_yearly_sheets.sql` (md5 bf0fa627…). Its guard refuses unless the 3 functions still have their Nov 20 md5.
   - Check: `select public.pb_owner_sheets_read();`.
   - Undo: `undo_01_yearly_sheets.sql`.
4. **Ask follow-ups.**
   - **Server add-on:**
     - Run `python3 tests/staged/ask_followups_nov20/server/ask_state_addon.py /home/claude/ask_v24/src /home/claude/ask_v24/tests`.
     - Dry run done here: it applies cleanly to today's `/home/claude/ask_v24/src`. Confirm that folder is the source of live build b7ad788e3a62 (with the price paragraph).
     - Copy `server/followups_test.ts` into the tests folder, then run deno test (expect 37 passed).
     - Release to ai-next, run a short eval, then promote.
     - Until this ships, "Answered for <State>" shows on every answer that has a state, pipe math included. When the live build sends no state, nothing shows.
   - **KB** (any time):
     - Run `sql/01_ask_kb_followups_test.sql` (expect `RESULT: PASS rows N -> N+2`).
     - Then `01_ask_kb_followups.sql`, then `02_ask_eval_cases_followups.sql` (fwa1–fwa5).
     - If other library batches changed the KB version, set `VERSION` in `kb_followups.py` and regenerate first.

## Decisions for Tommy (5)
1. **Ship the Ask server add-on with this update, so "Answered for Texas." shows only when the state mattered?** Recommend yes.
   Without it, the line also shows on pipe-math answers, as soon as the live Ask build returns a state.
2. **Log Out is now "this device only", with no "sign out everywhere"** (approved Nov 20). Recommend keeping it. Lost phone = the office's Lost Phone.
3. **Spanish:** the new words (lock screen, dashboard, taper, Monthly/Yearly, state card) are English only. Recommend shipping now,
   with Spanish strings before PB_ES_ENABLED goes on.
4. **Order this weekend:** recommend app first, then one-device SQL, then dashboard, then yearly, then the Ask add-on, one at a
   time with each block test first. Do not turn the gate on (02) until the r17.12 app has been out for a few hours, so phones
   have the lock screen before refusals start.
5. **Washington short-term Type A slope and cave-in notes by job state** (ask_followups decisions 3 and 4) are NOT in this
   update. Recommend a small follow-up, since both are trench protection wording.

## DONE
