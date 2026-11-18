# Bug hunt findings: area "new" (r16.84 to r16.88)

Test rig notes: tests live in /tmp/claude-0/bughunt/new/t/. `mk.js` builds a locked run with a bend and a wye. `dbg.html` is the
r16.88 index.html plus one test-only line (window.__ra / __save / __cur) made by the snippet in t/instrument.py. Run a test with
`cd /home/claude/rig && PG=dbg.html node /tmp/claude-0/bughunt/new/t/<test>.js` (PG=fix.html for the patched build).

## Fittings counted twice on a resumed run (daily report + job Materials)  [severity: high]
Where: pbFitCount (r16.86), used by pbFitCountRender, pbDlyRunSection/pbDlyMaterials, pbMatFitCountedHtml
Repro: t/a3.js (and t/f01_fitresume.js). Run with a bend at 62 ft and a wye at 189 ft. Mark laid past the bend, End Run Without
Completing at 70 ft, resume it (a new session entry with resumedFromId). The new session's pbFitCount returns the bend again
("marked laid (1 of 2)") before anything is laid in that session; the job Materials block shows "2 x AP 22.5 Bend" for one bend,
and the second day's daily report lists the bend again as used. Also: a session ended short with NO laid marks counts every
fitting on the run, including the ones past the stop point (the wye at 189 ft on a run stopped at 70 ft), and the resumed session
then counts those again when they are laid.
Why it's wrong: pbLaidSummary().laid is non-null for rows laid in an EARLIER session (S.early), and pbFitCount treats those as laid
in this session. Footage is per session (sessionFt) but fittings and MJ kits are repeated per session, so material quantities on
daily reports and the job's "Already counted" box are too high.
Fix: patches/01_fit_resume.py (tested: yes, t/f01_fitresume.js fails on dbg.html, passes on fix.html). A session counts only its own rows: not rows an earlier session laid, not rows past its stop point; a resumed session whose earlier session used laid marks stays in "laid only" mode.

## Daily "Export for Records": the draft custodian certificate states things the export does not contain  [severity: medium]
Where: pbRpfDailyExp (r16.84)
Repro: t/exp.js with cases nosig / chainfail / photofail (`PG=dbg.html node t/exp.js nosig`), test t/f02_export.js
(a) Report with no stored signature image: paragraph 10 still says "the signature image is included as signature.png"; there is no
    such file in the ZIP.
(b) The report is version 2 (supersedes v1) and the fetch of v1 fails (timeout, pb:busy, signal drop mid-export): the loop just
    breaks, the ZIP has no earlier/ folder, and paragraph 9 says "The Service shows no earlier version of this daily report."
    Same if a report ever has more than 30 earlier versions: the 31st on are dropped but p9 says "the earlier versions are included".
(c) The report has photos but they cannot be downloaded (pb_daily_report_photo fails): they are silently left out, the certificate
    says "0 photographs" and the app says "Export Ready".
Why it's wrong: this is the document a custodian signs under penalty of perjury; a signal hiccup makes it state that no earlier
version exists, or that a signature image / the photographs are in the export when they are not.
Fix: patches/02_export_truth.py (tested: yes, t/f02_export.js: 4 of 5 checks fail on dbg.html, all pass on fix.html). (a) p10 only claims signature.png when it is there; (b) an unreadable earlier version stops the export ("Not Exported... Try again with signal"), and the loop reads up to 300 versions; (c) photos listed but not downloaded are counted in the certificate, named in the manifest and shown in the Export Ready message. Note: prod has 5 daily reports today, all with a signature and version 1, so (a) needs a row without an image; (b) and (c) only need a failed request.

## Check shot on an architect (ft-in) rod: the phone keypad can't type ft-in, and common ft-in forms aren't read  [severity: medium]
Where: pbCsOpen (input #pbCsRod has inputmode="decimal" for every rod unit), pbCsParse (r16.86)
Repro: t/a6.js architect (screenshot t/cs_architect.png), t/f03_csinput.js
(a) The field is labelled "Rod reading (ft-in, e.g. 7-3 1/2, or decimal feet)" but is inputmode="decimal". On an iPhone that keypad
    has only digits and a point: no dash, space, slash or quote, so the ft-in reading the label asks for cannot be typed. (Android's
    decimal pad has no "/" or quote either.) An architect-rod crew can only enter decimal feet, which their rod does not show.
(b) pbCsParse returns null for "7-3-1/2" and 7' 3-1/2" (the usual way to write it), and for 4.36' / "4.36 ft". With a target on the
    row the live line stays blank and Save answers "Type the rod reading first." though a reading is typed.
(c) An inches-only entry is read as feet: 94" -> 94 ft, 3 1/2" -> 3 ft 0 1/2 in.
(d) Pressing Enter twice (or Enter then Save) while the first save is still writing saves the same shot twice (two rows in the run
    PDF): save() never checks that it is already running.
Why it's wrong: the check shot is the one place the pipe's grade is verified; on an architect rod it is unusable as labelled on a
phone, and unreadable input gets a misleading message.
Fix: patches/03_cs_input.py (tested: yes, t/f03_csinput.js: fails on dbg.html, passes on fix.html). Architect rod gets the full keyboard (inputmode="text"); the reader takes 7-3-1/2, 7' 3-1/2", 4.36', 4.36 ft, inches-only as inches, refuses a /0 fraction; unreadable text says so; a second Enter is ignored while saving. (The keypad itself was checked by attribute only: headless Chromium has no on-screen keyboard.)

## Check shot: 1/4 in off shows "0.02 ft LOW" as OFF grade while "On grade (0.02 ft low)" is the tolerance  [severity: low]
Where: pbCsResult / PB_CS_TOL (r16.86)
Repro: in the console pbCsResult(-0.0208).txt -> "0.02 ft LOW (1/4\")" (ok:false); pbCsResult(-0.02).txt -> "On grade (0.02 ft low)".
On an architect rod (targets to 1/16 in, readings to 1/8 in) a 1/4 in miss is 0.0208 ft, so it is flagged Off Grade and printed in
the run PDF as "0.02 ft LOW" under the sentence "On grade = within 0.02 ft". Seen live in t/a6.js architect with 7.86 typed.
Why it's wrong: the same printed number (0.02 ft) is both on grade and off grade; the code comment says the tolerance is "0.02 ft
(about 1/4 in)", so a 1/4 in shot was meant to pass. OWNER DECISION: the fix judges the shot on the value it prints (rounded to
0.01 ft), which lets 0.0208 to 0.0249 ft pass. If the strict 0.0200 is wanted instead, print three decimals for these.
Fix: patches/04_cs_tolerance.py (tested: yes, last check in t/f03_csinput.js)

## Manager on a new phone: Two-step login and Admin Access Log never appear on the open Settings screen  [severity: low]
Where: pbMfaRender (r16.85) and pbAdminLogRender (r16.84) read pbProdAccMem once, 500 ms after Settings opens
Repro: t/a9.js "mgr slow access" / t/f05_mgrsettings.js: owner account, no saved access answer on the phone yet (first login on
the device), pb_prod_access takes 4 s (weak signal). Open Settings right away: both boxes are empty and stay empty however long
Settings stays open; they only appear after leaving Settings and coming back.
Why it's wrong: the owner is told to turn on two-step login in Settings, opens it straight after signing in, and it is not there.
Fix: patches/05_mgr_settings_refresh.py (tested: yes, t/f05_mgrsettings.js fails on dbg.html, passes on fix.html)

## A break left running when the run is ended later: the ended run stays "On Break" and records a break that outlasts the run  [severity: medium]
Where: finalizeRunEndInner / pbRunLastActivity (run end) vs entry.onBreak (r16.88); pbBreakPaint and the active-bar provider
Repro: t/a12.js (and t/f06_breakend.js). Tap Break, put the phone away, go home. Next day the app asks "Where Did This Run End?";
answer 70.0, yesterday, a time 30 min after the break began, Save End. The run is now ended (Mon 10:38 PM) but entry.onBreak is
still set: Home shows "On break - 1200 min - End", the ended run's Results is covered by the On Break card, and End Break then
saves a break from Mon 10:08 PM to Tue 6:09 PM. The run PDF prints "Breaks (1, 1200 min)" on a run whose elapsed time is 1h 29m,
with the break ending 19.5 hours after the run did. The end question also accepts an end time BEFORE the break began (the break
start is not counted as activity).
Why it's wrong: the run record (evidence) shows a break that ran long after the run ended, and an ended run can't be read until
somebody taps End Break.
Fix: patches/06_break_run_end.py (tested: yes, t/f06_breakend.js: fails on dbg.html at the first check, all 6 pass on fix.html). Ending a run closes its open break at the run end time (rolled back with the end if the save fails); a break start/end counts as run activity, so an end time before it is refused; an ended run is never covered or listed as "On break", and its stats stop an open break at the run end (covers records r16.88 already saved that way).

## Looked at, not reported as bugs (for whoever picks this up)
- Break started on run A, then another run opened: the "On break" bar only follows the current run, so A's break keeps running
  unseen until A's Results is opened again (same behaviour as the existing delay pause). With patch 06 it at least ends with the run.
- The "Laid to 40.0 (2 rows) - Undo" toast stays visible for a few seconds on top of the solid break cover (Undo is refused).
- At 320 px the Break button overflows the stats bar by 8 px on a resumed run (5 columns). Fine at 360 and 390.
- Daily export reads at most 6 photos per site-log event (pbDaEvPhotos limit made for the PDF); patch 02 now names any that are
  listed but missing.
- Permit export: p9 says "one stored version" when the server returns zero versions. Prod has no permits at all today.
- Check shots keep their old target after Edit Run Data / Fix a Distance changes the row; the PDF prints each shot with the target
  it was judged against, so the record is still true.
- Lenker rod, break stats math (Avg./Current time), break across restart, offline save of break / check shot / joint type, admin
  log with 100 entries at 390 px, quick-work tile and fold, office clock section: all behaved.
- Existing tests t110 to t117 still pass on the build with all six patches (copies in t/reg/).

## DONE
Six confirmed bugs in the r16.84 to r16.88 features, each with a patch in patches/ (apply in order to the r16.88 index.html; `./mkfix.sh`
builds fix.html with all six and syntax-checks it) and a test in t/ that fails on r16.88 and passes patched: (1) high: fittings and
MJ kits counted again on every later session of a resumed run, and past the stop point on a run ended short, in the daily report
and the job's Materials box; (2) medium: the daily Export for Records certificate claims a signature image, "no earlier version"
or "0 photographs" when those were simply missing or failed to download; (3) medium: check shots on an architect rod use the
digits-only keypad so ft-in can't be typed on a phone, plus unread ft-in forms, inches read as feet and a double save; (4) low,
needs the owner's call: a 1/4 in miss prints "0.02 ft LOW" as off grade while 0.02 ft is the stated tolerance; (5) low: a manager's
two-step login and admin log boxes never appear if Settings is opened before the access answer arrives on a new phone; (6) medium:
a break left running when the run is ended later keeps the ended run covered and records a break that outlasts the run. Nothing
in the repo was edited, nothing was deployed, and the database was only read.
