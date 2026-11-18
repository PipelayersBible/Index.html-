# PDF and record export audit — r16.97 (Nov 17 2026)

Folder: /tmp/claude-0/audit/pdfs/ · port 8882 · pristine copy `index.html`, test copy `cur.html` (= index.html + the `window.__ev` test hook, see mkcur.sh).
Build a patched copy: `./build.sh out.html patches/NN_*.py ...` (applies to index.html, syntax-checks, adds the hook).
Tests: `cd /home/claude/rig && node /tmp/claude-0/audit/pdfs/tests/tNN_*.js` (fails on cur.html) and `PG=<patched>.html node ...` (passes).
Test data: /tmp/claude-0/audit/pdfs/t/arch2a.json etc., made by t/mk1.js and t/mk2.js with real flows in the rig (AI-read stakes, 3 additional runs, correction after lock, added point, laid marks, check shot, break, delay, 40 note photos, production, ended early, resumed).

## Run PDF says photos "are not on this phone" when the same image is attached at two points  [severity: medium]
Where: pbRptRunInto0 (~49478 at-a-glance "Photos"; ~49733 the "Photos not included" loop)
Repro: t/mk1.js (3 additional runs; the junction stake photo used for Run 1 End and Run 2 Start) or tests/t01_dup_photo.js. PDF: "Photos 6 of 9" and "Photos not included (3) ... The run records 9 photos but only 6 are on this phone. Photos are not backed up, so a missing one stays on the phone that took it."
Why it's wrong: R.photo prints one image once (deduped by bytes) but photoCount counts every attachment, so the PDF compares unique images with attachments. All 9 are on the phone; a dispute-grade record claims three are missing and blames another phone.
Fix: patches/01_run_dup_photo_not_missing.py — missing = photoCount minus the photo references the record holds; at a glance "44 (43 different)". (tested: yes, tests/t01_dup_photo.js)

## Run PDF prints every instrument height as "(entered)", also one worked out from a stake rod shot or a benchmark  [severity: medium]
Where: pbRptRunInto0 "Instrument height (HI)" (~49514); buildArchiveEntryComputedFields (~35831) does not keep the HI mode
Repro: tests/t02_hi_source.js — default "Calculate from Stakes", one rod reading 4.36 on the MH-1 stake. PDF: "Instrument height (HI) 107.760 ft (entered)". Nobody typed an HI; it is 103.40 + 4.36. Same on the resumed session (106.451 worked out from the Left off reading).
Why it's wrong: in a dispute the HI's origin matters (a single stake shot means every elevation hangs on that stake). "Entered" tells the reader a surveyed HI was typed in.
Fix: patches/02_run_hi_source_words.py — the record keeps hiMode (stakes / bm / direct) at lock and corrections; the PDF says "(worked out from the rod shot on a run point)", "(worked out from benchmark + backsight)", "(typed: "I know my HI")", or "(how it was set is not recorded)" for older records. (tested: yes, tests/t02_hi_source.js)

## Run "Export for Records": the custodian certificate counts sealed PDFs that are not in the ZIP; failed downloads are silent  [severity: high]
Where: window.pbRrExport (~64620 photos loop, ~64624 seals list/download, ~64638 counts, certificate ¶4 and ¶9)
Repro: tests/t03_export_missing_seal.js (the t108 flow, two seals, the v1 download fails once). ZIP holds 1 sealed PDF; the draft certificate says "consist of 1 run report, N photographs and 2 sealed PDF files" and "earlier sealed PDFs are included in this export"; the manifest gives no hint. Same for a photo whose download fails (dropped silently) and for a pb_run_seals_list error/timeout (seals = [] → "0 sealed PDF files", as if none were ever made).
Why it's wrong: the certificate is drafted for someone to sign under penalty of perjury; it states files exist in the export that are not there, and a signal drop in the field is enough to cause it.
Fix: patches/03_run_export_missing_files.py — counts are the files really in the ZIP; the manifest gets a "NOT IN THIS EXPORT: …" line (missing seal versions, missing photos, or "the list of sealed originals could not be read"); certificate ¶4 says what is missing and ¶9 no longer claims all earlier sealed PDFs are included. (tested: yes, tests/t03_export_missing_seal.js)

## Permit closeout PDF promises "The app keeps closed permits indefinitely"  [severity: medium (legal)]
Where: pbRptPermitInto, Closeout table "Permit retention" (~50053)
Repro: t/mkp.js (real permit flow) then tests/t04_permit_retention.js.
Why it's wrong: contradicts the Terms (§9 "Keeping them is your company's responsibility"; §16 "After that we may delete your data") and the Privacy Policy ("While the company's account is open"). A permit that never backed up exists only on one phone. A safety record should not promise retention the service does not give, especially beside the OSHA 1-year rule.
Fix: patches/04_permit_retention_claim.py — "Keeping it for that period is the company's responsibility: the app keeps a closed permit in Records on the phone that made it and, once backed up, in the company account while the account is open (see the Terms). Keep your own copy." (tested: yes, tests/t04_permit_retention.js)

## Daily report Materials calls an ended-early session's bedding/backfill a "whole run" figure  [severity: medium]
Where: pbDlyMaterials basis text (~59088); the run item from pbDlyRunSection has no volume scope
Repro: t/mk2.js (run ended early at 200 of 301 ft, then resumed and finished) + t/mkd.js (daily report from those records) or tests/t05_daily_volume_scope.js. Materials lists Bedding 16.72 yd³ and 11.11 yd³, Backfill 121.35 and 79.92 yd³, every row "(whole run; this run has more than one session, and each session repeats the whole-run figure)".
Why it's wrong: 11.11 / 79.92 are to the stop point (200 of 301 ft), not the whole run. The basis tells the reader two different numbers are the same figure repeated; a reader who adds them bills 27.8 yd³ of bedding for a 16.7 yd³ run.
Fix: patches/05_daily_volume_stop_point.py — the run item carries vol_to_ft / vol_of_ft for a session ended early; its basis reads "(to the stop point only: 200 of 301 ft; a later session's whole-run figure already includes this part, so the two are not added)". (tested: yes, tests/t05_daily_volume_scope.js)

## Job Summary and daily report print a field note's distance as its station ("0+20.00", "Sta 20.0" for a note at Sta 1+70)  [severity: medium]
Where: computeJobSummary fieldNotes (~46988) + pbRptJobInto "Station" column; Job Summary screen; daily delays/other notes "Where" (~59127, ~59136)
Repro: t/mk2.js run starting at Sta 1+50; note 20 ft in. Run PDF: "Sta 1+70.00". Job Summary PDF: "Station 0+20.00"; screen: "20.0"; daily report: "Sta 20.0 · MH-1 to MH-2". tests/t06_note_station.js.
Why it's wrong: the gas-service conflict is located 150 ft away from where it was. Same class of bug the grade hunt fixed in the run PDF (r16.89 grade 02), still in the other documents.
Fix: patches/06_note_station_not_distance.py — one helper pbNoteStaTxt (run stations when the run has them, else distance as a station from 0+00 as before) used by the Job Summary (PDF + screen) and the daily report's note "Where". (tested: yes, tests/t06_note_station.js; daily checked by t/mkd.js: "Sta 1+70.00 · MH-1 to MH-2")

## Run PDF records a 4-ft depth flag as "trench 5 ft or deeper" (and the Job Summary says "5 ft or deeper")  [severity: medium (safety record)]
Where: pbRptRunInto0 alerts (~49494); pbRptJobInto alert (~50265)
Repro: t/mk2.js — phone state unknown, so r16.79 flags at 4 ft (caveFt 4); deepest cut 3.83 ft. Run PDF: "WARNING: trench 5 ft or deeper indicated by stake data. A protective system is required (OSHA 29 CFR 1926.652)." Job Summary: "had a trench depth flag (5 ft or deeper)". tests/t07_depth_words.js.
Why it's wrong: the record states the stake data showed a 5 ft+ trench when it showed about 4.3 ft, and cites the federal rule when the app applied Washington's. The Results screen and Records chip already use the run's caveFt; the PDFs did not follow r16.79.
Fix: patches/07_depth_flag_threshold_words.py — the run PDF prints pbDepthFlagText(e) (the run's own rule and state wording); the Job Summary says "4 or 5 ft or deeper, by the rule each run used" when any run used 4 ft. (tested: yes, tests/t07_depth_words.js)

## Permit PDF's "check it yourself" always fails: the JSON export masks the responder-link secret that the fingerprint includes  [severity: high (evidence)]
Where: pbRptIntegrity "To check it yourself" (~49330) vs window.pbExportRecordJSON (pbEmMaskSecret, ~49303)
Repro: t/mkp.js permit (every locked permit gets an emLink) → tests/t08_permit_verify_note.js: SHA-256 of record-confined-….json = e7705ca0…, PDF fingerprint = 286b3309…. The PDF says the export "writes the exact text that is hashed. Compute its SHA-256 … and compare."
Why it's wrong: anyone (opposing counsel, an inspector) who follows the printed procedure on an untouched permit gets a mismatch and concludes the record was altered. The server's backup keeps the secret, so record_sha256 still equals the fingerprint; only the phone export differs.
Fix: patches/08_permit_verify_masked_secret.py — for a permit whose record holds the secret, the Integrity section says the export masks it, the mismatch is expected, and to compare with the server's record_sha256 (listed by Export for Records). (tested: yes, tests/t08_permit_verify_note.js). See DECISIONS: the better fix is a verifiable export.

## Run PDF says pre-filled production feet were "typed by the foreman"  [severity: low]
Where: pbRptRunInto0 "Foreman production" intro (~49667); prefill in pbLaidPrefill / pbLaidPrefillMore (~45219)
Repro: t/mk2.js typed only "Feet of pipe installed" = 100; the app pre-filled Excavated and Backfill from the laid marks; Save Production stored all three. PDF: "Quantities typed by the foreman … Excavated 100.0 ft … Backfill 100.0 ft". tests/t09_foreman_prefill.js.
Why it's wrong: the record states a person typed numbers the app filled in; the record does not keep which boxes were typed.
Fix: patches/09_foreman_prod_prefill_words.py — "Quantities saved by the foreman … can be pre-filled by the app from the laid marks; the record does not say which boxes were typed and which were left as pre-filled." (tested: yes, tests/t09_foreman_prefill.js)

## AI-read section says "None changed by hand after the AI read" after a correction moved an AI-read hub  [severity: low]
Where: pbRptRunInto0 "Values read from stake photos by AI" intro (~49646)
Repro: t/mk2.js: AI read the angle point at 2+12; after lock the hub was corrected to 2+14 and became an elevation point. The section still prints Station AI read 2+12 / Locked 2+12 and "None changed by hand after the AI read." tests/t10_ai_after_lock.js.
Why it's wrong: the sentence is only true up to the lock; in a dispute about a misread stake it reads as "nobody touched these values".
Fix: patches/10_ai_reads_after_lock_words.py — "None changed by hand between the AI read and the lock." plus, when the run has corrections, "The Locked column is the value at lock: N correction(s) made after lock … may have changed a point listed here." (tested: yes, tests/t10_ai_after_lock.js)

## Resumed session's run PDF prints the whole run's backfill/bedding with no scope, beside the earlier session's partial figure  [severity: low]
Where: pbVolumeScopeNote (~35657), used by the run PDF, the report text and Records
Repro: t/mk2.js. Earlier session PDF: "Est. backfill 79.9 cu yd (to the stop point, 200.0 of 301.0 ft)". Resumed session PDF: "Est. backfill 121.3 cu yd (calculated estimate)" — two records of one 301 ft run that add to 201 cu yd. tests/t11_resumed_volume.js.
Why it's wrong: since r16.89 (grade 07) the resumed record carries the whole-run volume on purpose, but nothing on it says so; time already says "this session / all sessions", volumes do not.
Fix: patches/11_resumed_volume_scope.py — "(whole run, all sessions: it already includes the part an earlier session's record counts, so the two are not added)". (tested: yes, tests/t11_resumed_volume.js)

## Daily report Permits table: the close-out time is printed bare under the emergency times  [severity: low]
Where: pbDlyPdfInto permits table "Status" cell (~62301)
Repro: t/mkd.js (permit with one emergency): "EMERGENCY declared 1x / Nov 17 11:19 PM PST to Nov 17 11:20 PM PST / Nov 17 11:20 PM PST" — the last line is the close-out but reads as a second emergency. tests/t12_daily_permit_closed.js.
Fix: patches/12_daily_permit_closed_label.py — "Closed out <time>". (tested: yes)

## Seen, not patched (low, or needs a choice)
- User-typed ✓/✔ and ✗/✘ are silently rewritten "yes"/"no" in every PDF (pbPdfSafeFor ~50414). "Compaction test ✗ retest Fri" prints "Compaction test no retest Fri" — the meaning flips, with no "?" page note. See decisions.
- Architect's rod run: the AI table shows AI read 103.400 / Locked 103.401, 3.610 / 3.609 (the form keeps 1/16"), next to "None changed by hand". No line explains the rounding (t/mkr.js ROD=architect).
- Architect check shot: readings 7'-11 1/4" vs target 7'-8 15/16" (2 5/16") print the result as "0.19 ft LOW (2 1/4")".
- Daily report front: "Crew hours: Laborer 0 h, Operator 0 h" (Crew log only) next to "Crew on site 1 person, 8 h" (the foreman's list). Two different sources under similar labels.
- Daily report: "Pulled in … (again right before signing)" is printed on an unsigned draft too.
- Permit closeout PDF says "Backup status could not be checked when this PDF was made" while the emergency PDF made from the same record a second later says "Not backed up yet".
- Work entered without a run PDF (pbNrPdf ~67130) skips pbPreflightPdfImages: a truncated photo can embed as a broken image instead of the "could not be read" placeholder, and full-size originals make big files.
- Narrow "Point" column on the grade sheet breaks long point names mid-word ("Capistr / ano"); text is kept, just ugly.
- Run Export for Records downloads every photo twice (once for the ZIP, once inside pbRrPdfDoc); slow on field signal, no wrong output.
- "PDF library didn't load — check your connection" alerts are dead text (jsPDF is bundled); harmless.

## Checked and found right (so nobody redoes it)
- Run PDF numbers against the record: inverts = stake − cut (99.79 = 103.40 − 3.61), INV rod = HI − invert, BOP = INV − wall, TOP = BOP + true OD, subgrade = BOP + bedding; stop station 3+50 = 1+50 + 200; laid-to station; check shot LOW/HIGH sign and 3/4"; correction before/after values; break length; delay hours; 3 additional runs' reducer steps.
- Station vs distance columns on the run PDF (both printed, labelled); device time vs server time labelled everywhere looked at.
- Permit PDF: out-of-limit test flagged with each gas vs its limit; roster in/out times; emergency declared/ended/duration; "the app cannot know whether the call connected"; "no automatic emergency notification to the company" (true: no push kind for emergencies).
- Anonymous report: no name/time/ID, creation date zeroed, file name report-anonymous.pdf, photos not stamped.
- Daily Export for Records already reports missing photos and refuses on an unreadable earlier version; permit export says permit photos are not included.
- Offline: jsPDF and the PDF font are bundled; every PDF here was made with Supabase answering null. Accented names (Hernández, Ñúñez), ½ and ° print in the embedded font.
- File names: archive-<kind>-<id>.pdf, crew-run-<job>-<id>.pdf, daily-report-<job>-<date>.pdf, job-summary-<job>.pdf, emergency-incident-<id>.pdf, records-<job>-<id>.zip — all sensible.
- Plan takeoff / bid summary PDFs: not in the app build (no generator found); not audited.

## Regression (combined patches 01–12, pall.html = ./build.sh pall.html patches/[01]*.py)
- Repo set: t101–t126, t90, t91, t95 and tests/bughunt_nov17/* (87 files, copies in regress/tests with ports pointed at 8882), run 4 at a time on baseline r16.97 and then on the combined patches. Results in regress/ex_base.txt, regress/ex_patched.txt, logs in regress/out_*.
- 18 tests fail the same way on baseline and patched (they need other folders' test hooks such as `__dbg`, or another lib port): not caused by these patches.
- 11 tests differed in the parallel run. Every one was a load failure (Target crashed / page.goto timeout / "no button Lock This Run" with 8 GB nearly full). Run one at a time on the patched page, all 11 exit 0; outputs match baseline apart from hashes and times (t108, t102, t117, t110 diffed).
- Audit tests t01–t12: all FAIL on cur.html (baseline), all PASS on pall.html. Job Summary, bulk Records Export and CSV also built without errors on pall.html.
- Syntax: build.sh runs node --check on the main script for every patched build.

## DECISIONS FOR THE OWNER
1. **Permit fingerprints that nobody outside can check (finding 08).** Today the phone export masks the responder-link secret, the fingerprint and the server's record_sha256 include it. Patch 08 only tells the truth about it. Options: (a) keep as patched (verification goes through Export for Records / record_sha256); (b) stop putting the secret in the backed-up permit record at all (keep it in its own column) and leave it out of the canonical form for new permits, so the JSON export, the PDF and the server all agree; (c) export the unmasked text to company members only. Recommendation: (b) for new permits plus patch 08's wording for old ones; needs a server change, so not done here.
2. **Pre-filled production (finding 09).** Wording is patched. If the office needs to prove which numbers a foreman actually typed, record it: save a `prefilled: ['feetExcavated', …]` list with the production entry and print it. Recommendation: add it (small, client-only, new records only).
3. **✓ / ✗ in typed notes.** The PDF turns them into "yes"/"no", which can flip a note's meaning. Options: print "[check]"/"[x]", or add the two glyphs to the embedded font subset. Recommendation: add the glyphs to the font (keeps what was typed); "[check]"/"[x]" as a stop-gap.
4. **HI on older records (finding 02).** Records locked before the patch print "(how it was set is not recorded)". Recommendation: accept; do not guess from the data.
5. **Export for Records with a missing sealed original (finding 03).** Patched to tell the truth. Alternative: refuse to build the ZIP until every listed seal downloads. Recommendation: keep the patch (a partial export with a clear "NOT IN THIS EXPORT" line is more useful in the field than none), but have the alert say so too.

## DONE
Audited the run report PDF (record and office copy, ended-early, resumed, 3 additional runs, 43 photos, correction after lock, added point, laid marks, check shot, break, delay, AI-read stakes, architect and Lenker rods), the run Export for Records ZIP (manifest and custodian certificate), the confined space permit closeout and EMERGENCY incident PDFs (out-of-limit test, entrant inside, emergency resolved), the foreman daily report with its attached run and permit reports, the Job Summary, the bulk Records Export, the Records CSV and the JSON export. Ranked:
1. (high) 03: run Export for Records certificate counts sealed PDFs and photos that are not in the ZIP when a download fails; silent.
2. (high) 08: every permit's printed "check it yourself" procedure fails, because the JSON export masks the responder-link secret the fingerprint includes. An untouched permit looks altered.
3. (medium) 01: run PDF says photos "are not on this phone" when one image is attached at two points.
4. (medium) 07: a run flagged at the 4 ft rule is recorded as "trench 5 ft or deeper" (and in the Job Summary).
5. (medium) 06: Job Summary (PDF and screen) and daily report give a field note's distance as its station (0+20.00 for Sta 1+70).
6. (medium) 05: daily Materials calls an ended-early session's partial volume a "whole run" figure, so it gets added on top of the real one.
7. (medium) 02: every HI is printed "(entered)", including ones worked out from a stake shot or benchmark.
8. (medium, legal) 04: permit PDF promises "The app keeps closed permits indefinitely", which the Terms contradict.
9. (low) 11 resumed-session volume has no scope; 10 AI section says "None changed by hand" after a correction; 09 pre-filled production called "typed"; 12 daily permit close-out time unlabelled.
Every fix is a separate patch in patches/ (applies to r16.97 index.html) with a test in tests/ that fails before and passes after. Nothing was deployed, committed or written to the database.
