# r1716_final: the r17.16 release candidate with Tommy's Nov 22 answers (Nov 22-23 2026)

Base: `_src/index.html` = LIVE r17.15 · 2026-11-22 (md5 e0eaced9…). Nothing published, committed, pushed, or written to the
server. Server: read-only SELECTs (function texts, privileges) and one edge-function read (crew-join).

## Build
`sh tests/staged/r1716_final/build.sh` -> `work/` (git-ignored). Reproducible (built twice, same md5s).

| file | md5 |
|---|---|
| work/index.src.html (new `_src/index.html`) | **0f613d6c4d95948187c3f9b7bd24ea88** |
| work/build/index.html (publish) | **6a5381a8fcb7caf4e2fb9c405df40057** |
| work/build_hooks/index.html (tests) | 2831d884fadee4c68f354ddf180ca147 |
| work/sw.js (`PB_SW_BUILD = 'r17.16 · 2026-11-23'`) | a772c02fad10bb0d9454fea676dfebbe |

`PB_APP_BUILD = 'r17.16 · 2026-11-23'` (`patches/9_stamp.py`). `work/build/pbx/` = the 4 r17.14 parts + the 4 font files
(copied as in r1715_candidate/build.sh; already live since r17.15).

Patch order (each exact-once):
1. r1716_candidate **Bx**: field_nov22 f1, f4, f5, f6, f7, f8, f9, f10 -> records_nov22 phaseb b3, b8 -> design_nov22 p2
   look_css, look_needs_pick, look_permit_top, look_names_row, look_next_row_dark -> r1716_candidate p2x_station_toggle.
   Step 16 is byte-identical to r1716_candidate/work/Bx/index.src.html with the stamp taken out.
2. billing_nov22 b1, b2, b3, b4, as written.
3. emergency_nov22 p1, p2, **r1716_final/patches/p3_spanish_rows_rb.py** (rebased), p4.
4. `patches/d56_crew_no_company_price.py`  5. `patches/d21_crew_hours_by_day.py`  6. firstweek_web_nov22 `05b_DECISION_72h_links.py`
8. `patches/d22_wa_weekly_talks.py`  (7, decision 12: no change was needed)  9. `patches/9_stamp.py`.

## What I rebased
- **billing b1-b4: no rebase needed.** Every anchor matched once on top of Bx. Check: billing_nov22's own output (candidate A +
  b1-b4) with the 5 look patches + p2x applied afterwards is byte-identical to my step 20 (only the stamp differs). So the
  order doesn't change anything.
- **emergency p3 (Spanish rows): rebased** (`patches/p3_spanish_rows_rb.py`). p3 reads its English keys from PB_AI_MSG. Billing b3
  had already changed two of those messages, so running p3 as written after billing would have filed bad rows:
  1. `plan` now says "(Individual or Company)". Its Spanish now says "(Individual o Compañía)", b3's word, matching
     "Plan: Compañía (activo)".
  2. `daily` is now built when it shows ('You’ve hit today’s limit. ' + the local reset time). It has no fixed English, so
     its exact row is left out. The original would have filed the half-sentence as a key. The "… Emergency? Call 911." pattern
     row still gives that message the Spanish 911 ending.
  Spanish is switched off today. Everything else in p3 is unchanged. p1, p2 and p4 applied as written.
- **emergency p1** pastes `emergency_nov22/src_patch/emergency.ts`, which now carries the H2S words (below). The phone copy and
  the server copy are still one file: `run_cases.mjs` shows phone = server on all 322 phrases.

## Tommy's answers, as built
- **New look: YES** (Bx). **Long titles: at most 2 lines at one size.** Phase 2 already does this (look_css: 24 px,
  `-webkit-line-clamp: 2`, `hyphens: none`). My test checks that a long title takes at most 2 lines and keeps the size of a
  short one. When the page is scrolled, every title shrinks to 19 px together. That is the existing compact header, not
  shrink-to-fit.
- **Start work NOT moved:** the Home markup order is the same id for id as r17.15 (the only new element is field f5's
  `pbAcctLoading` at the top). No look, field or billing patch reorders Home.
- **H2S words (EN + ES)**, in `emergency_nov22/src_patch/emergency.ts` and in its `emergency_nov22.diff` (the same two lines),
  so the app copy is IDENTICAL to the server copy:
  "Gas alarm, or a rotten-egg or sewer smell (often hydrogen sulfide, H2S): everyone out now. …" /
  "Alarma del medidor de gas, u olor a huevo podrido o a drenaje (casi siempre ácido sulfhídrico, H2S): todos afuera ya. …".
  The pre-edit copies are in `server_ask/before_h2s/`. **Matching server build (NOT installed):** `server_ask/b-7aba8d8e9560.txt`,
  sha256 **7aba8d8e9560e782f4504802bd007219350f330309b9eeb70fe5b83044351bf8** (`server_ask/build.sh`. Same steps as
  emergency_nov22/build/build.sh, i.e. make_src.sh + esbuild + seal.py, with PB_BUILD "1123-h2s1". It writes into this folder
  so emergency_nov22/build/b-cdddf51b34db.txt, now live, stays). Built twice, same sha.
  Base check: the old diff + PB_BUILD "1122-emg1" rebuilds cdddf51b34db… exactly, so the new build is live + the two lines.
  **The lead must install it the same day as the app**, the same way as cdddf51b34db (copy to data/ask/, push, net.http_get,
  pb_ai.code_install next -> live). Rollback: cdddf51b34db.
  Note: emergency_nov22/build/build.sh would now build the H2S version too (it deletes build/b-*.txt first). Don't run it to
  rebuild cdddf; its pre-edit inputs are in server_ask/before_h2s/.
- **Decision 56:** `d56`. A signed-in foreman or pipelayer of a company (companyRole 'foreman' / 'pipelayer', and not
  `is_owner` in pb_my_plan) does not see these in Settings › What each plan includes:
  - the Company plan $99 / 5 people / $12 / yearly paragraph
  - the plan-reading add-on price ($1 a sheet, company plans only. Not named in the decision; it's a company price, so I hid it too)
  - "The company account: 5 a day." and "A company shares 60 a month for each person on its plan."

  They see "Company plan: your company pays for it." instead. Managers (PMs / supers), the company account, people with no
  company and signed-out phones see everything as before. The Individual price and the per-person / individual AI limits show
  for everyone. Re-checked whenever prices fill and whenever the box opens.
  **Is Ask the leak? No.** The Ask server code (`src_q` + diff) has no plan price. The `PRICE` table in ask.ts is AI-model
  token cost. The library rows (`ask_quality_nov22/work/after_rows.jsonl`, 3,247 rows) and reply rule v10 have none. The
  only "$99" hit is an earned-value example ($99,000). Ask has no tool that reads billing.
  **Where the price lives server-side:** `pb_billing.prices()` (settings table, defaults 9900 / 5 / 1200 / 10 / …). It is
  returned to EVERY member by `public.pb_my_plan` ('prices' key) and by `public.pb_plan_prices()`. So a crew member can still
  see it in the raw network answer. That's display-only hiding, which is fine because the price is public on the website.
  Server not changed.
- **Decision 21:** `d21`. Renamed on the office job page's Spreadsheets button ("Crew hours by day"), the sheet title and the
  done-message title ("Crew Hours by Day"), and the file name `crew-hours-by-day-<job>-<from>-to-<to>.csv`. The column headings
  never said payroll. The server function `pb_prod_export_hours` and the legal "check them against your time records before
  you run payroll" sentence stay.
- **Decision 11 (72-hour join links):** app = firstweek 05b (`PB_OB_LINK_HOURS = 72`, used by the Text It message, the invite
  sheet and the expired-link message). Server: `sql/11_join_links_72h.apply.sql`. It guards `pb_onboard.make_link` (live md5
  ed3b2cf7…, saved to pb_sec.fn_backup), and live make_link changes only in `v_exp` (now + 72 hours); the 30-a-day and
  10-waiting limits stay. make_link is the only place a join link's end time is set (the app's pb_onboard_link_make and the
  lost-phone replacement both go through it). Undo: `sql/99_undo_11.sql` (pb_sec.restore). Test: `sql/tests/block_t11.sql`
  (begin; apply; DO block as role authenticated with JWT claims; always raises RESULT; rollback). Checks: 72 h for a company
  account link and a foreman link, a 30-hour-old link still live and still holding its trial seat, a 73-hour-old one expired,
  limits unchanged, anon can't call, make_link not callable from the API, undo brings back the live text and 24 h.
  **Local throwaway Postgres 16** (`sql/local/run_local.sh`; replica built from the live texts read today, and the replica's
  make_link has the live md5): `RESULT: 13 pass, 0 fail [app calls ran as role authenticated]`, before and after apply x2 +
  undo; nothing kept (`results/sql_block_t11_local.txt`). NOT applied, NOT run on live.
  Side effect: an unused link holds a trial seat and a waiting-link slot for 3 days instead of 1 (Cancel frees it).
  Outside the app: the website FAQ still says "lasts 24 hours" (firstweek_web_nov22/web/changed/index.html lines 358, 626).
- **Decision 12:** no app change needed. The app already uses one official address everywhere: Settings › Email Support
  (mailto + label), `PB_BILL_CONTACT` (Your plan "Questions about your bill"), and the Spanish table. It is the only
  @pipelayersbible.com address in the page. No other email or phone is in the app; Tommy's phone isn't in the app.
  No live database function contains an email. Terms/Privacy not touched (they already use admin@ only). Outside the app:
  the trial-request edge diff (firstweek) sends from reports@ / to tfontaine@. Those are sender/recipient addresses, not
  contact lines.
- **Decision 22:** `d22`. "Washington job" = the state of the foreman's Current job as the app knows it (window.pbSrJobState:
  picked on the phone, the job address, else the company state; the California fallback doesn't count).
  - On a WA job the How often list has only "Every week".
  - A schedule already set to every 2 weeks keeps working. It shows "Every 2 weeks" greyed out plus one line: "Washington
    job: talks are weekly there. This changes to every week the next time you change the schedule."
  - Any schedule change (days, how often, queue, random pick) saves it as weekly.
  - Other states are unchanged.

## Tests (results/)
| test | result |
|---|---|
| jscheck | scripts ok |
| field t_field.js | 39 PASS, 0 FAIL |
| design t_design_p2.js | 32 PASS, 0 FAIL |
| records/phase B t_phaseb.js (r1716_candidate) | 25 PASS, 0 FAIL |
| billing t_billing.js | 51 PASS, 0 FAIL |
| billing t127 (updated) / t95 / t98 | 41 PASS (verify run) / match golden / match golden (regression) |
| emergency run_cases.mjs (phone vs server emergency.ts) | 191 must-fire, 126 must-not, 5 either: ALL OK |
| emergency t_emergency_ui.js | 25/25 ok |
| NEW tests/t_decisions.js (56, 21, 11, 12, 22, H2S, 2-line titles) | 33 PASS, 0 FAIL |
| NEW tests/t_fw_trial_72h.js (firstweek t_fw_trial, 24 -> 72) | 10 PASS, 3 FAIL: #9 (72 h) passes; #2, #6 fail the same way on billing_nov22's own build (billing b1's new trial-line words; the firstweek test predates billing; not in run_all) |
| SQL block_t11 (local) | 13 pass, 0 fail |

### Full regression (`results/full_regression.log`, `results/regression/`): pass 208, FAIL 14, skip 15 (of 237)
Every failure is explained. 13 are intended changes, with the updated expected output staged in `test_updates/` and
verified. 1 is the known time-of-day flake.
| test | why | staged update |
|---|---|---|
| critic/w1 | look (Feedback size) + billing ("Company plan (active)") | 3-way merge of candidate B + billing goldens = this run's output |
| critic/w2 | field F1/F8 + look | candidate B golden (identical) |
| critic/w3 | look (permit top) + billing words | candidate B golden with "Company plan (active)" = this run's output |
| critic/w4 | billing words | billing golden (identical) |
| new/a7 | field F1 + look | candidate B golden (identical) |
| office/a1_ask | billing ("resets at 4 PM") + emergency ("Not an emergency? Send to Ask") | 3-way merge of billing + emergency goldens = this run's output (the H2S words fall outside what the golden keeps) |
| office/a3_stake, office/b3_owner, t99_removed | billing | billing goldens (identical) |
| t127_billing0.js | billing (catch-up "joined", Make Paid needs a state) | billing's updated test |
| t130_onboard.js | decision 11: "works once, for 72 hours" | test updated (24 -> 72) |
| r1710/streamline/tests/t_sl3_paths.js | decision 11: invite sheet "Works once, for 72 hours." | test updated |
| r1706/office3/tests/t_o3_34_36_office.js | decision 21: button "Crew hours by day", file crew-hours-by-day-… | test updated |
| new/f06_breakend | **known flake (time of day)**: re-run alone, same TimeoutError waiting for #pbEaTime; fails the same way on the LIVE r17.15 build at the same hour (22:39 PST) | none |

### Test updates: `sh test_updates/apply.sh` (with the release commit). `sh test_updates/verify.sh` runs them on a copy of tests/
against this build: **13 of 13 pass** (`results/test_updates_verify.log`). Replaces r1716_candidate/test_updates/B,
billing_nov22/test_updates, emergency_nov22/test_updates and field_nov22/test_updates: apply only this folder's.
Files: 9 goldens (critic w1-w4, new a7, office a1_ask / a3_stake / b3_owner, t99_removed) + t127_billing0.js, t130_onboard.js,
r1710/streamline/tests/t_sl3_paths.js, r1706/office3/tests/t_o3_34_36_office.js.

## Release steps (lead, one sitting)
1. Server billing: billing_nov22 sql (block_t01 then 01_billing.apply.sql), as in billing_nov22/NOTES.md.
2. Server join links: run `sql/tests/block_t11.sql` (expect ERROR: RESULT: 13 pass, 0 fail [app calls ran as role
   authenticated]), then `sql/11_join_links_72h.apply.sql`. Undo `sql/99_undo_11.sql`.
3. Ask build `server_ask/b-7aba8d8e9560.txt` -> data/ask/, install 7aba8d8e… on next, smoke the sewer-smell question in
   EN + ES, then live.
4. App: work/build/index.html -> index.html, work/build/pbx/* -> pbx/, work/sw.js -> sw.js, work/index.src.html ->
   _src/index.html, `sh tests/staged/r1716_final/test_updates/apply.sh`; one commit. (Website FAQ "24 hours" separately.)

## Needs Tommy
1. Decision 56: I also hid the plan-reading price ($1 a sheet, company plans) from foremen/pipelayers. Recommend keep hidden
   (it's a company price). The price is still in the server answer every member gets (display-only hiding). Recommend leave it
   (the price is public on the website).
2. Decision 22 wording: "Washington job: talks are weekly there. This changes to every week the next time you change the
   schedule." Recommend OK.
3. Decision 11: an unused link now holds a trial seat for 3 days. Recommend OK (Cancel frees it); website FAQ needs "72 hours".

## DONE
