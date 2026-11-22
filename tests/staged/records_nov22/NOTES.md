# records_nov22 — "No Signal and Lost Work" + "Records That Hold Up" (Nov 21 reviews): verified, fixed, staged

Base: `_src/index.html` LIVE r17.14 (md5 25adfdd9…, commit 0ab8421). Nothing applied, committed, deployed or written to the server.
Server work was read-only (SELECTs, function/trigger/edge-function reads). SQL was tested on a scratch local Postgres 16
replica (`sql/local/replica.sql` + `sql/local/tests.sql`), and every piece the migrations replace in a live function
was checked read-only on the live server to occur exactly once.

- Build PHASE A: `sh tests/staged/records_nov22/build.sh` → `candidate/index.src.html` (new _src), `candidate/build/`
  (publish), `candidate/build_hooks/` (tests), `candidate/sw.js` (r17.15 · 2026-11-22).
- PHASE A test: `tests/t_records_a.js` (33 checks, PASS/FAIL; needs a --hooks build). Result: `results/t_records_a.txt`.
- Full regression: `results/full_regression.log`, `results/regression/summary.txt` (see "Regression" below).

## Verified vs false alarms

| item | verdict | evidence |
|---|---|---|
| A1 Not sent leaves out runs, run photos, permits | TRUE | `pbUnsentGroups` (_src 72309) had daily/checks/photos/tickets/locates/jobbook/attachments/run *reports* only. A run locked offline showed nothing on Home / Log Out. |
| A2 delete of a run that never reached the company: plain "can't be undone" | TRUE | `pbDeleteArchiveEntry` 50571; permits: only a note (`pbPermitDeleteNote` 43252), never blocked. |
| A3 false "run with no cloud copy — Tap Retry Sync" | TRUE (cause) / PARTLY FALSE (remedy) | `pbSyncRunToSupabase` 39981 returned 'failed' for no-signal tries; `processOnePending…` 36347 counted them; 5 → `cloudSyncFailed` → Home line 15139. But the table is NOT unused: Ask's `my_runs` tool (`pb_ai_my_runs`, tools.ts in the Ask source) reads `public.runs` for individual accounts (9 rows, last Nov 16). So: not retired; no-signal tries no longer count. |
| A4 21-day window | TRUE + 3 more | `PB_RR_DAYS=21` 66812 / `pbRrSend` 68100. Also: the sent list was trimmed to 300 ids (a run past 300 looked unsent for ever); simply dropping the window would have (a) sent every old run to a company the person just joined, (b) resent runs whose photos were cleared from the phone (speed2 #52, placeholders), (c) re-hashed every photo of every run each minute. All handled (below). |
| A4b daily attachment 14-day give-up | TRUE | `firstTry` was set before the RPC, so 14 days in a dead zone dropped it. |
| A5 link account Log Out | TRUE | wrapper 68040 only explained; logged out with unsent work. |
| A6 persist() result ignored | TRUE | 42782. |
| A7 "delete old runs" advice | TRUE | Records moved to IndexedDB in r16.47 (`pbBigKey` = runArchive only); the 5 MB store holds the rest. |
| A8 office-filled daily says "SIGNED BY [typed name]" | TRUE + 2 | banner 65408 (green), foreman's statement, and the narrative headed "Foreman's narrative / Typed by the foreman before signing". The name was a free box. |
| A9 removal reason | TRUE | app sent `p_reason: null` (68783); server stores null. |
| A10 Exhibit 1 undated, permit ¶9 wrong | TRUE | `PB_EXHIBIT` constant; only CLOSED permits are backed up (`pbPermitBackupRecord`), so "during entry and at close-out" was false. |
| B1 permit/daily/ticket photos in localStorage | NOT RE-RUN (code agrees) | review's T2 (12 photos → Storage is full) not reproduced here; code keeps them in localStorage stores. Daily/event photos do reach the server (`pb_daily.event_photos`/`report_photos` hold base64). |
| B2 permit photos never leave the phone | TRUE | `pbPermitBackupRecord` 43204 strips `photos`, keeps a count. |
| B3 open-permit proof deleted at close | TRUE | `pb_safety.drop_open_on_close` (AFTER INSERT on permits) deletes the `open_permits` row (first_saved_at, saves, last sha) although `pb_permit_open_put` says open snapshots are "kept forever". |
| B5 toolbox talks overwritten | TRUE | `pb_talk_give` UPDATEs in place (version+1), no versions table. |
| B6 foreman's later daily refused | TRUE | `pb_daily_submit` returns `pb:office_filled`. |
| B7 removed member's runs refused at once | TRUE | `pb_prod_run_record_put`: `my_company` null → `pb:not_company_member`; no removal history exists (`company_members` row is deleted). |
| B8 no versions export | TRUE | only `pb_prod_run_record_put` / `pb_prod_run_setup_save` touch the versions tables. |
| B9 tables outside the admin log | TRUE | no `zz_pb_audit` / no-change trigger on events, event_photos, report_photos (+ ON DELETE CASCADE), event_reviews, talks_given, open_permits, pb_tickets.photos. No app function or cron deletes from them except drop_open_on_close. |
| B10 OSHA reporting fields | TRUE | no such fields in the Job Book safety events. |

## PHASE A — ready (r17.15 candidate; 7 patches, each exact-once, in this order)

1. `a1a4_runs_unsent.py` — A1 + A4 + A4b. Not sent counts "run records" (company hasn't accepted the current version),
   "run photos" (owed) and "permits not backed up" — on Home, Log Out, Lock This Phone, switch-company warning, See What's
   Waiting. Runs go at any age when: locked in the last 21 days, OR locked after he joined this company
   (`pbProdAccMem.joinedAt`), OR this company already has a version; never when its photos were cleared from the phone.
   Sent list no longer trimmed for runs still in Records. A cheap per-run fingerprint (`rrSig`, photos by length+tail)
   remembers "accepted, photos and all", so the photo-hashing office copy runs only for changed runs (≤30 a pass, ≤12 per
   Home render). Daily attachments give up 14 days after the server first *answered*.
2. `a2_delete_guard.py` — run not accepted: "This run has NOT reached your company. Deleting it deletes the only copy."
   (Keep It / Delete Anyway) then the usual confirm repeats it; photos still owed: not deleted. Permit not backed up and
   closed < 1 year ago: "Back It Up First" (OSHA 1926.1205(f)), except a company manager; > 1 year: the strong warning.
3. `a3_legacy_sync_offline.py` — a legacy copy try that never reached the server is 'offline' (no try used); on 'online'
   the owed pass runs and runs marked "no cloud copy" are retried quietly (5 at a time); Retry Sync with no signal says so.
4. `a5a6a7_logout_keep_storage.py` — A5 link account: Log Out and Lock This Phone blocked while Not sent ("Not Sent Yet", See What's
   Waiting / Stay Logged In). A6 `window.pbStoreKept`; Home's Not sent line adds "Add to Home Screen so this phone keeps
   your work." (not kept, not the Home Screen app); Settings + Home Screen step: "Don't delete the app icon while anything
   shows Not sent." A7 advice by store: Records → free space on the phone; small store → photos on unsent daily
   reports/tickets/permits, "Deleting runs won't help".
5. `a8_office_fill_pdf.py` — office fill signs with the member-record name (box filled + read-only; refuses with "Set
   your name first" if none); snapshot `office_fill.by_name/by_account/by_uid`; PDF banner (amber) "FILLED IN BY THE
   OFFICE (NAME, ACCOUNT) FOR FOREMAN NAME. NOT SIGNED BY THE FOREMAN.", rows "Signed by the foreman: No", office
   statement, "Narrative (written by the office)". Old office fills print "(typed)".
6. `a9_run_remove_reason.py` — Delete Run asks "Why is it being deleted?"; empty → stays open with the error; reason sent.
7. `a10_exhibit_dates.py` — `pbExhibit(first,last)`: dated parts (clock difference, photo re-hash/no delete, sealed PDFs
   Nov 16, server check + outside time stamps, admin log — Nov 17 2026) say "Since …", "(so not for the Records made
   before that date)", or "This did not apply to these Records: … began on …". Permit ¶9: "each time the closed permit
   was backed up".

Then `9_stamp.py` (r17.15 · 2026-11-22). `jscheck.py` syntax-checks every inline script.

## PHASE B — staged (apply order)

Server files in `sql/` (each with an undo; `_patchfn.sql` = exact-once function patcher, refuses if the piece isn't
there exactly once). Local results: all PASS (`sql/local/tests.sql`).

1. `_patchfn.sql` (helper schema pb_stage).
2. `b3_permit_first_seen.sql` — copy open_first_saved_at / open_last_saved_at / open_saves / open_last_sha256 /
   open_clock_ahead_s onto pb_safety.permits before the open row is dropped. + app `patches/phaseb/b3_open_phoneat.py`
   (open snapshot carries phoneAt, added after the change hash). Local: PASS (saves 7, first seen 3 h earlier, +89 s).
3. `b9_audit_guards.sql` (after b3) — zz_pb_audit on the 7 tables; events: only review fields change; event/report/
   ticket photos + event reviews insert-only; talks/open permits no direct delete (`pb.allow_record_delete` for owner
   flows; b3's drop sets it); report_photos FK CASCADE → plain. Local: PASS.
4. `b5_talk_versions.sql` — pb_prod.talk_versions (insert-only) filled by trigger + backfill. Local: PASS.
5. `b8_run_versions_export.sql` — `pb_prod_run_versions(run, uid)` manager-only: versions (newest 40 with records),
   events (incl. removal reasons), setup changes. Local: PASS. App half staged: `patches/phaseb/b8_export_versions.py` (history.json +
   versions/run-vN.json in Export for Records; applies on the candidate, syntax OK). Still to do: "Changes after the run" page on the office PDF.
6. `a9_run_remove_reason.sql` — server refuses an empty reason. ONLY after r17.15 is live (older phones send null).
7. `b6_daily_keep_both.sql` — the foreman's later signed daily is kept beside the office fill (answer `office_filled:
   true`). Pieces checked live (CRLF). App follow-up: office list shows both; Fill In warns the PM.
8. `b7_removed_grace.sql` — pb_prod.member_removals (trigger on company_members delete) + run_record_put accepts runs
   locked before the removal for 14 days. App follow-up: pb_prod_access must expose the grace so the phone keeps trying.

Not built (plan only, bigger app work):
- B1 photo store: daily/delay/inspection/permit/ticket photos → the IndexedDB `pb-photos` store keyed by SHA (reuse
  pbPhPut/pbPhGetMany); the localStorage stores keep `pbph:1:<sha>` refs; a photo leaves the phone once the server has it
  (daily/event photos: server already keeps base64); then raise PB_TK_UNSYNCED_MAX. Migration on first load, per store.
- B2 permit photos: upload like run photos (insert-only bucket `permit-photos/<uid>/<permit>/<sha>.jpg`, server re-hash
  like run_photo_checks, off-site copy in pb-offsite), backup record keeps refs instead of stripping.
- B4 "who did it" on permits: stamp `sbUser.email` + uid on Lock, each air test, EMERGENCY start/end and close-out; PDF
  "Phone signed in as ___"; optional drawn entry-supervisor signature at Lock (daily signature pad). Touches the permit
  merge code (tabs/devices) — needs its own careful pass.
- B10 Job Book incident: "Reported to OSHA/state: when, by whom, ref #" fields + "entered [server time]" on the PDF.

## Not now (decisions / plan for Tommy)
Trench protection block on deep runs; locate check (marks photos, positive response, pothole, line hit); outside time
stamps for permits and dailies; off-site retention of dailies/permits for 4 years; legal hold / whole-job export;
individual-plan run backup; 2000 px originals; GPS on permit photos.

## Regression (hooks build of PHASE A, `--jobs 2`)
Full run (`results/regression/summary.txt`): pass 207, FAIL 15, skip 15 of 237 (live r17.14 on Nov 20: 220 / 2 fails).
Then fixed and re-run (`results/rerun*`, `results/base_rerun_r1714.log`):
- BUG found by the run, FIXED: t102_seal, t108_export, t110_clockpdf, sync/repo_t102, sync/t01_photos_retry — a run
  changed in memory but not yet saved was taken as unchanged (the fingerprint cache was per Records save). The send pass,
  delete and Log Out now work the fingerprint out fresh; Home keeps the per-save cache. All 5 pass now.
- FIXED: offline/t12_killend[1.5s] — the new retry on 'online' logged "Supabase run sync failed: Failed to fetch" as an
  error; a no-signal try now logs a warning. Passes.
- EXPECTED wording/line changes (update goldens with `--update-golden --only ...` when shipping): critic/w3 + offline/
  t02_day + offline/t13_queues (Home Not sent line + "Add to Home Screen so this phone keeps your work."; headless Chrome
  doesn't grant persist), critic/w4 (Settings "Don't delete the app icon…" line, page taller), offline/t01_kill (Home now
  shows "Not sent · 1 run record" for the run the fake server never accepted), offline/t10_quota (A7 advice).
- NOT this change: new/f06_breakend fails on live r17.14 too today (timeout under load); offline/t09_bigweek prints storage
  usage 2 MB instead of 3 MB (rounded browser estimate; less storage, and one send pass with 41 runs took 252 ms vs 428 ms
  on r17.14).
- PHASE A test `tests/t_records_a.js`: 35 PASS, 0 FAIL (`results/t_records_a.txt`).
- Lock This Phone on a no-email account is blocked the same way as Log Out (added after the full run; t130/t132/t133
  re-run: pass).

Final candidate md5: index.src.html 99efa91d…, build/index.html 6dd54bf6…, build_hooks/index.html 9d484abb….

## Decisions for Tommy (≤6)
1. Old runs (A4): send any run not accepted if locked in the last 21 days, after the person joined this company, or
   already at this company — never old runs from before he joined. **Recommend: as built.**
2. Permit delete (A2): block only when not backed up AND closed < 1 year ago (managers exempt). **Recommend: as built**
   (a backed-up permit is kept in the account, which meets the 1-year rule).
3. Legacy runs table (A3): keep (Ask's my_runs reads it for individual plans) or move my_runs to run_records and retire
   it. **Recommend: keep for now; retire with the individual-plan run backup.**
4. Office fill vs foreman (B6): keep both, or the foreman's replaces the office's. **Recommend: keep both, foreman's
   shown first.**
5. Removed member grace (B7): 14 days for runs locked before removal. **Recommend: yes, runs first; dailies later.**
6. A9 server rule goes live only after r17.15 is on phones (≥ a week). **Recommend: yes.**

## DONE
