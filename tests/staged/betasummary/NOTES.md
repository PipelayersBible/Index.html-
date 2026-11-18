# Beta Results: one-page summary for the company owner (staged Nov 18 2026)

Nothing here is applied to the live database, deployed, committed or pushed. Live SQL used only read-only selects and
rolled-back DO blocks that end in `raise exception 'RESULT: ...'`.

## What it is
When a company's beta is near its end (7 days or less) or has ended, the company account and its PMs / superintendents
get a **Beta Results** button on Home. It is also always in **Settings > Company**, and the app owner has it on every
company card in **Settings > Beta Accounts**. It opens a sheet with the numbers from the company's own records, an
optional notes box, and **Make PDF**. The PDF is one page, uses the app's report PDF path (pbRptMake: same header,
company logo or name, fonts, footer with fingerprint and "Exported by"), and opens in the app's PDF viewer (Download / Share).

Reading never checks the company's status or billing state, so it still works after the beta has ended and the company
is closed (writes refused) or even marked inactive.

## Files
- `sql/01_beta_summary.sql`: `public.pb_company_beta_summary(p_company uuid default null) returns jsonb`.
  SECURITY DEFINER, STABLE, `set search_path to ''`, `revoke all ... from public, anon`, `grant execute ... to authenticated`.
- `sql/tests/t01.plpgsql` (test body), `mk.py` (builds `live_t01.sql` with the function inlined, GRANT/REVOKE dropped
  because the SQL client cancels blocks containing them), `live_t01_result.txt` (the live result).
- `patches/01_beta_results.py`: `python3 patches/01_beta_results.py in.html out.html` (exact-once `rep()` with asserts).
  Applies cleanly to the repo's r17.01 `index.html` and to the r17.02 candidate `/tmp/claude-0/b0/cur2.html` (the real base).
  The biggest script block of both outputs passes `node --check`. PB_APP_BUILD not bumped (release step).
- `tests/t128_betaresults.js`: Playwright, rig style of t127 (tests/rig co.js, mgr.js, co_pl.js, fakesb.js, `window.__rpcOverride`).
  Finds the rig at `tests/rig` (works from `tests/` or from this staged folder). To ship it: copy to `tests/t128_betaresults.js`
  and add it to `runner/suites.js` (main).
- `test_updates/`: golden and test updates for the 4 existing tests whose screen text now includes Beta Results (see Tests).
- `tests/results/`: test logs, the suite summary, a sample PDF (`beta_results_company.pdf`), the 600-character-notes PDF, 390 px screenshots light/dark.

## Who may call the RPC
| Caller | Result |
|---|---|
| Company account (companies.owner_user_id), no id or its own id | its company (any status) |
| PM / superintendent (company_members.role = 'pm') | their company |
| App admin (`pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal')`, two-step if enrolled) | any company, by id |
| Foreman, pipelayer, other company's owner or PM | `pb:not_allowed` |
| Not signed in | `pb:not_signed_in`; unknown id: `pb:no_company` |

## The window
- Beta company: `companies.created_at` to `least(trial_ends_at, now())`. An ended beta stops at its end date, so work
  logged after the end is not counted.
- Paid company: the last 30 days (31 calendar days counting today).
- Dates are taken in the company's time zone (`pb_pm.settings.tz`), UTC when it has none. The PDF says which.

## What each number means and where it comes from
All counts are for the one company and the window above. Removed run records (`removed_at`), voided entries/items and
superseded daily entries are never counted.

**The work**
| Label | Source |
|---|---|
| Pipe laid (run reports) | `sum(pb_prod.run_records.laid_ft)` where `coalesce(work_date, locked_at date)` in the window |
| Pipe installed (foreman production) | `sum(pb_prod.items.qty)` where `category_key = 'pipe'`, not voided, `work_date` in the window (shown only if > 0) |
| Runs locked | count of those run_records with `locked_at` (each locked session is one record) |
| Days with work logged | distinct work dates over run_records, pb_prod.entries, pb_prod.site_log and pb_daily.reports |
| Crew on the app | people of the company now (`company_members`) who used the app (`pb_billing.usage`) or sent a run, run note or daily report in the window, of all members; with foremen / pipelayers / PMs-supers by current role. The company login is not counted. |

**Caught and logged in the field** (rows that are 0 are left out; "Nothing logged in this period." if all are 0)
| Label | Source |
|---|---|
| Check shots taken on laid pipe, N off grade by more than 0.02 ft | `run_records.record->'checkShots'` entries with a numeric `rod`; off grade uses the app's own rule (pbCsResult): \|diff\| rounded to 0.01 ft > 0.02 ft |
| HI discrepancies flagged | `record->'warnings'` type `hi-minor` / `hi-serious` (put on the run when it was locked) |
| Backflow flagged (invert falls the wrong way) | warnings `backflow` / `backflow-all` |
| Low slope flagged | warnings `low-slope` |
| Other grade sheet checks flagged | warnings `typo`, `same-station`, `layout` (photo advice and `unverified` are not counted) |
| Utility conflicts logged, N damaged | `pb_prod.site_log` kind `utility`; damaged = `data.damaged = 'yes'` |
| Rework logged, hours | site_log kind `rework`, `data.hours` |
| Delays logged on runs, hours | site_log kind `delay`, `data.hours` (the app fills hours from start/end times) |
| Equipment breakdowns logged, hours down | site_log kind `equip` with `data.breakdown = 'yes'`, `data.down` |
| Delays and standby on daily reports, hours | `pb_daily.events` kind `delay` / `standby`, `superseded_at is null`, `hours` |
| Inspections recorded (failed, partial) | `pb_daily.checks` with `done_at` in the window; `result` fail / partial |
| Permit air readings outside the permit limits | latest `pb_safety.permit_versions.record` of each permit closed (or first backed up) in the window: `atmoLog[]` O2/LEL/H2S/CO compared with that permit's own `permit.minO2/maxO2/maxLEL/maxH2S/maxCO` (app defaults 19.5/23.5/10/10/25 when missing). Only numeric values are judged. |

**Paperwork** (rows that are 0 are left out)
| Label | Source |
|---|---|
| Run reports sent to the office | run_records with `sent_at` |
| Run reports reviewed | run_records with `reviewed_at` |
| Daily reports signed | `pb_daily.reports` with `signed_at`, current version only (an amendment replaces the one it supersedes) |
| Confined-space permits closed | `pb_safety.permits.closed_at` in the window |
| Extra work logged on daily reports, hours | `pb_daily.events` kind `extra` |
| Photos attached | `run_records.photo_count`; plus `pb_daily.checks.photo_count` and `pb_daily.events.photo_count` |
| Sealed run report copies stored | `pb_prod.run_seals` with `sealed_at` in the window (each sealed version counts) |
| Stake photos read by AI | `public.ai_usage` feature `stake`, people of the company |
| Days the crew used the app | distinct `pb_billing.usage.day` for people of the company |

**Notes** (the super types them; optional, 600 characters, kept on the phone as a draft per company): printed under
"Superintendent's notes" (or "Project manager's notes" / "Notes" for the company login), with the line "Written by the
person who made this PDF, in their own words. Any estimate here is theirs, not counted by the app." Empty notes print
three blank lines to write on.

**Footer statement** (on the PDF): "Made <date> from <Company>'s own records in The Pipelayer's Bible, <from> to <to>
(<time zone>). Counts are what the crew logged and what the app recorded. The app does not estimate time or money saved."
The page footer also carries "from the company's records, <from> to <to>", the generated time, SHA-256 of the numbers +
notes, the app build and the account that made it.

## Left out, and why
- **Hours saved.** Never computed or claimed (legal review 03 section 4.6: no time-saved number without a before/after study).
  The super's own estimate goes in his notes, labelled as his.
- **"Second rod shots".** r16.90 asks for a rod shot on a second stake at lock, but the record keeps it only as an ordinary
  stake reading (and `aiNo2nd` when declined). There is no separate "second shot taken" field to count honestly.
- **Crossing conflicts / under-clearance.** Worked out on the phone at display time; the record keeps the crossings, not
  the verdict. Counting them would mean re-implementing the clearance math on the server.
- **Grade warnings beyond `record.warnings`.** Only warnings stored at lock count; nothing is recomputed.
- **Permit emergencies declared.** In the record, but not "caught in the field" and not something to put on a sales handout
  without Tommy saying so.
- **Text gas values** ("bad", blanks) are not judged (the app flags them separately); only numbers count.
- **AI money, plan sets, feedback counts, screen views**: Tommy's pricing data, not the crew's work (still on Beta Accounts).
- No words like "prevented", "saved", "accurate", "tamper-proof". The sealed row says "Sealed run report copies stored"
  (legal review 03 row 3 cautions against absolute seal wording; "tamper-evident" was in the brief, dropped to be safe).

## Tests
### SQL, live rolled-back (Nov 18, project rogfassochneycezecxa): PASS
`sql/tests/live_t01.sql` (comment lines stripped when sent). Inside the block: the function is created, 2 companies,
6 users, runs (one removed, one in another company, one dated today), check shots, warnings, run notes, seals, an
inspection item with fail/partial/pass checks (inserted as the foreman so the real triggers run), signed daily report
+ amendment, daily events (one superseded), a closed permit with 4 readings, usage and AI rows. Checks 1-25 all passed:
owner and super get identical numbers; super with id; foreman, pipelayer, other owner, other PM refused; admin gets the
same numbers by id, refused with no id; unknown id `pb:no_company`; no user `pb:not_signed_in`; every number above;
**beta ended 4 days ago: writes are refused (`pb:beta_ended`) but the owner and the super still read it**, the window
stops at the end date and today's run drops out (260.5 to 250.5 ft); **company status inactive: owner and super still
read it**, foreman still refused; paid: last 30 days. Function flags: SECURITY DEFINER, STABLE, search_path "".
Ended in the RESULT exception; afterwards the function, test companies and test users do not exist on live.
Not tested live: the GRANT/REVOKE lines (the client cancels blocks containing them). After a real apply, check
`has_function_privilege('anon', 'public.pb_company_beta_summary(uuid)', 'execute')` = false and `'authenticated'` = true.

### Browser, t128_betaresults.js: 48 PASS, 0 FAIL on the r17.02 candidate + patch, and 48/48 on r17.01 + patch
Fails (crashes) on the unpatched page, as it should. Covers: company account with 5 days left sees the Home button; 20 days
left: no Home button but the Settings row; ended beta (dark): Home button, sheet says Beta ended with the beta dates,
one-page PDF with the blank notes lines; superintendent (3 days left): Home button, Settings row, "Superintendent's notes"
in the sheet and PDF; foreman and pipelayer: no Home button, no Settings row, RPC never called; server not set up (no
answer, or PGRST202): "Beta Results isn't set up on the server yet. Nothing was changed." with no PDF button; server
refusal message; Beta Accounts card button asks for that company by id; RPC called with no id for the caller's own
company; zero rows left out; no time-saved number; no em-dash in sheet or PDF; 390 px light and dark: nothing runs off
the side; dark card with light text; PDF (pdftotext + pdfinfo): one page, file name, banner, rows, the notes word for word,
the own-words label, the footer statement with the date range; 600-character notes with every row present still one
page (a second, tighter layout is used automatically when the first would spill); no page errors.

### Repo suite: tests/run_all.sh --build <patched r17.02 candidate>
Ran the whole suite (`tests/run_all.sh --build /tmp/claude-0/bs/cur.html`, site files copied next to it; 210 entries,
5 workers, 14 min 38 s): **187 pass, 7 FAIL, 1 XPASS, 15 skip** (`tests/results/suite_summary.txt`). Every difference is explained:
- **Same on the unpatched r17.02 candidate** (checked by running them on cur2.html): `grade2/ref/run.js`, `grade2/ref/run_lock.js`
  fail and `grade2/tests/t04_step_exact.js` XPASSes. These come from r17.02's grade fix (goldens/xfail list not updated yet), not from this patch.
- **Intended text additions** (the new Beta Results row / buttons appear in the screen text the tests compare):
  `t95_beta.js`, `office/b3_owner.js` (Beta Accounts cards gain "Beta Results"), `critic/w4.js` (Settings > Company gains the row),
  and `beta/t_b04_ownerended.js` (it requires exactly one button on the owner's ended-beta line; the line now also has Beta Results).
  The character diff of each golden is only the inserted "Beta Results" text. Updated goldens and a one-line fix for t_b04 are in
  `test_updates/` (copy `test_updates/expect/*.txt` into `tests/expect/`, run `python3 test_updates/01_t_b04.py tests/bughunt_nov17/beta/t_b04_ownerended.js`).
- **Timing wobble**: `new/a4.js` printed ~901 s where the golden has ~900 s; it passed on the rerun.
- Rerun with the test updates applied (temp copy of tests/): t95, b3_owner, w4, t_b04, a4 all pass; only the two r17.02 grade2/ref goldens still differ.

## Decisions for Tommy
1. **Foremen who are also listed as managers.** The Home/Settings entry follows the app's "manager" check, but the server
   only answers the company login and PMs/supers. A foreman marked as a report manager would see the button and get
   "Beta Results is for the company account and its PMs and superintendents." *Recommendation: keep it PM/super only.*
2. **Zero rows.** Rows that are 0 are left out of "Caught" and "Paperwork" so the page stays short and doesn't read
   "0 permits". *Recommendation: keep; the footer says it counts only what was logged.*
3. **Using a super's notes in marketing.** The PDF is his own handout. If you ever quote his notes, the testimonial
   consent steps in legal review 03 section 6 apply. *Recommendation: no change in the app; just don't reuse quotes without asking.*
4. **Paid companies get "last 30 days".** A company made paid has no stored beta end date any more. *Recommendation: fine
   for now; if you want the original beta window after Make Paid, store the trial end on the billing account at Make Paid.*
5. **Wording "Caught and logged in the field".** It is factual (counts of what was flagged or logged), never "prevented".
   *Recommendation: keep it.*

## DONE
