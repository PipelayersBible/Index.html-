# office3: office and records decisions #30, #31, #32, #34, #35, #36, #37, #38, #39

Base: r17.04 (`/home/claude/index.html-/index.html`, sha256 dc8e0433bb17...). Patches in `patches/` (exact-once `rep()`,
`python3 NN.py in.html out.html`). Each applies alone to r17.04 and all apply in number order; the combined build passes
`node --check` on the main script (combined build sha256 561ea76e194f...). SQL in `sql/` (nothing applied, deployed,
committed or pushed). Tests in `tests/` (see tests/README.md). Rolled-back SQL results in `sql/RESULTS.md`.

Deploy order: SQL 32, 35, 36, 37 first, then the app. The app falls back to the old calls while 32 and 37 are missing,
and says "isn't ready on the company server yet" for 35 and 36.

## What was built

**#30 Responder link before it reaches the server** (patch 01). The emergency panel's line "Responders can open
e.pipelayersbible.com/?XXXX..." now ends "(not on the server yet)" while the server hasn't filed the code (no successful
upload carrying it, and pb_em_view hasn't answered for it). It goes away by itself when the open-permit upload succeeds
or the server answers. Display only.

**#31 Check-ins on the office board** (patch 02). Permit phone: a roster repaint asks the live-permit sender to look
400 ms later (one pending look at a time; it only sends when the status changed). Measured: check-in sent 406 ms after
the tap (was up to 60 s). Office board: while a reported permit has someone inside, it reloads about every 20 s (looks
every 10 s, reloads when its copy is 18 s old); otherwise the old 60 s. Emergencies were already immediate.

**#32 Server-side version check** (sql/32 + patch 03).
- `pb_prod.job_info.info_ver` (new column, 0 for all rows); `pb_prod_job_info_get(job)` returns the details and version;
  `pb_prod_job_info_set(..., p_expect_ver)` refuses a stale save with `{ok:false, code:'pb:changed', now:{...}}`; a save
  that changes nothing makes no new version.
- PMs & supers: version worked out from the permanent `pb_pm.job_pms` rows (rows + ended rows, only grows; new private
  `pb_pm.job_ver`); `pb_job_pms_get` returns `ver`; `pb_job_pms_set(..., p_expect_ver)` refuses with the current list.
- The old signatures (`pb_prod_job_info_set` with 5 args, `pb_job_pms_set` with 3) now raise `pb:update_app`.
- App: reads the version right before saving, merges as before (office2 01/02), saves with the version; on `pb:changed`
  merges once more onto what came back and saves again, or shows the clash ("Someone else changed the job name meanwhile
  (now "...")"). PMs: re-applies this manager's own ticks to the list as it is now.

**#34 Locate expiry alert for the office** (patch 04, no server change). `pb_prod_locates_mine` already returns every
open company ticket to managers; the app now asks it for the company account, PMs, supers and managers too.
- Office Home, Needs attention: "3 locate tickets expired or expiring" with each job: ticket and days, "Don't dig on an
  expired ticket until a new one is valid." and Locates buttons per job (red when any is expired or 2 days or less).
- Job cards (Company production / Home): red "811 ticket expired" / "811 ticket: 2 days left", amber up to 7 days.
- **The one expiry function is `pbLocExpiry(ticket)`** (`window.pbLocExpiry`), returning `{ left, lv, text, due }`.
  The Home line and the job-card flag read only that (through `pbLocOfficeRows(jobKey)`). It uses the existing
  `pbLocLeft` / `pbLocLevel` / `pbLocLeftText` / `pbLocDueText`; the state-rules helper (#33) plugs in there.

**#35 Leave Company and handover** (sql/35 + patch 05).
- `pb_crew_leave(p_expect_uid, p_expect_company)`: deletes the caller's own membership row (all the existing removal
  triggers run: the "no longer part of" note with the individual-plan offer, run reports moving, report key rotation,
  PM assignments), ends their crew links now, logs 'leave', pushes the owner. The owner can't leave this way.
- `pb_crew_handover(p_from, p_to, p_expect_uid)` (company account / PM / super / manager): from a foreman who is no
  longer a foreman here to a current foreman: his waiting crew runs (crew_state 'pending', assigned to him) are
  re-assigned with an 'assign' crew action; his still-open links are ended; pipelayers whose link to him ended in the
  last 30 days, are still pipelayers and have no foreman get a new link to the new foreman. Run reports follow the link.
  Logs 'handover', pushes the new foreman. `pb_crew.audit`'s action check gets 'leave' and 'handover'.
- App: Settings shows members "You are in <company> as <role>." and Leave Company (what it does / doesn't do, Stay /
  Leave Company); after leaving the plan and company screens are checked again. Crew members: after removing a foreman,
  "Who takes Rick's crew runs that are waiting for a foreman, and the pipelayers who were on his crew?" with the other
  foremen (Not Now / Hand Over); the line then says what moved and that the new foreman was told.

**#36 First bulk exports** (sql/36 + patch 06). A "Spreadsheets" panel on the job page:
- Production by day (CSV: Job number, Job name, Date, Item, Unit, Quantity, Entries) from `pb_prod_export_days` with the
  same counting rule as the job page and Home (tested live: job 26014 pipe total 1756.0 = the dashboard's). No signal:
  the job page's own last 14 days, file name ends "-phone-copy", and the alert says that is all the phone holds.
- Crew hours for payroll (CSV: Date, Job number, Jobsite, Foreman (signed), Person, Hours, Report version, Signed at)
  from `pb_prod_export_hours`: the signed daily reports' crew lists (the foreman's own numbers), newest version only.
- Both: date range (default last 30 days, at most 400), the app's existing CSV writer (UTF-8 BOM, formula-safe).

**#37 Permit fingerprints** (sql/37 + patch 07). New closed permits carry `"emSecretApart": true`; for them the record
that is backed up, fingerprinted and exported leaves out `permit.emLink.s`, and the backup sends the secret beside it
(`pb_permit_backup(..., p_em_secret)`, which files the link with it and stores nothing). Tested: export JSON SHA-256 =
PDF fingerprint, and the jsonb text of what is sent = the export. Records without the flag (closed before, or by an old
app) are built byte for byte as before: same text, same fingerprint, same server versions, and they keep r16.98's note
about the masked secret. Open-permit snapshots still carry the secret (not records; needed to file the link early).

**#38 Pre-filled production feet** (patch 08). Save Production stores `foreman.prefilled` (e.g. `['feetPipeInstalled',
'feetBackfill']`): boxes still holding the app's number from the laid marks, never typed over. A later Save keeps a box
listed while it holds the same saved number; a box typed over drops out. No list when nothing was pre-filled. Run PDF:
"Each quantity marked "filled by the app" was filled in from the laid marks and saved as filled; the others were typed."
and "60.0 ft (filled by the app from the laid marks)". Records without the list keep the r17.04 wording (no guess).

**#39 Check marks on PDFs** (patch 09). Four glyphs (U+2713, U+2714, U+2717, U+2718) drawn as simple outlines and added
to both embedded PDF fonts (no outlines copied from another font, so no new licence); the coverage list gets them and the
rewrite to "yes"/"no" is gone from the embedded-font path. "Gas test (X) retest Fri, vent (check)" prints as typed
(pdftotext reads the marks back; rendered check: o3_39_direct.pdf). The no-font fallback (built-in PDF font) still
writes words, since it can't draw the marks. Patch 09 needs fontTools when applied; its output is deterministic.

## Test results
- New browser tests (patched build): t_o3_30_31_permit 8/8, t_o3_31_board 3/3, t_o3_32_jobinfo_pms 9/9,
  t_o3_34_36_office 27/27 (light and dark, 400 px), t_o3_35_leave_handover 15/15, t_o3_37_38_39_records 20/20.
  On r17.04 every one of them fails (4, 5, 10, 5 and 14 FAIL lines; checked).
- Rolled-back SQL, live (sql/RESULTS.md): 32 and 37 and 36 all as expected, grants authenticated only (anon false).
- **35's SQL test was not run**: the run was cancelled by the client's confirmation step (the batch contains DELETE and
  DROP CONSTRAINT); nothing ran. `sql/35_test.sql` is ready to run the same way as the others.
- Full regression: see "## Regression" below.

## What's left
- Run sql/35's rolled-back test (above), then review and apply 32, 35, 36, 37.
- Add the six tests to `tests/runner/suites.js` when the patches go into a release.
- #36: the daily-report ZIP per job and date range (the third export in the office2 list) is not built.
- #35: the handover is offered right after the removal only; there is no later "hand over" button (the RPC allows it
  for 30 days after the links ended, so a button on the crew list could come later).
- #31: the office board still polls (no push to the office for check-ins), as decided.

## Shared code touched (for the other helpers)
pbTxRender / pbEmSrvCheck (01), renderRosterList and the board's poll (02), pbCxInfoSave and pbPmJobSave (03),
pbLocHomeAttention, pbLocMineLoad, pbLocBoot, pbCxJobFlags (04), pbCmAct 'remove' and the Settings HTML after the crew
invitation block (05), pbCxOverviewHtml (one line after the Job book row) and downloadCSV (window.pbDownloadCSV) (06),
the closed-permit entry, pbPermitBackupRecord and the permit backup pass (07), pbSaveForemanData and the run PDF's
Foreman production section (08), PB_RPT_FONT and pbPdfSafeFor (09).

## Decisions (with recommendations)
1. **Old app copies and the version check (#32).** The old signatures now refuse with pb:update_app, so an app from
   before this release can't save Job details or PMs & supers until it updates (it shows "Couldn't load. Nothing was
   saved"). That is the only way to stop an old copy overwriting. Recommendation: keep the refusal; beta users update
   within a day, and it only affects these two office saves.
2. **Leave Company for PMs and supers (#35).** As built, any member with a membership row can leave, PMs and supers too.
   Recommendation: keep it (the owner is pushed, and can add them back).
3. **Handover window (#35).** Pipelayers are re-linked only if their link to the removed foreman ended within 30 days and
   they have no foreman now. Recommendation: keep 30 days; add a "Hand over" button on the crew list later if needed.
4. **Crew hours export source (#36).** It uses the signed daily reports' "Crew on site" hours (the foreman's call, per
   #44), not the run crew logs. Recommendation: keep; add the run crew-log hours as a separate column only if payroll asks.
5. **Office locate alert window (#34).** The office sees tickets expired or expiring within 7 days (red at 2 days or
   expired), the same thresholds as the job page. Recommendation: keep; revisit with #33 if a state's tickets are shorter.

## Regression
(filled in below when the run finished)

## DONE
