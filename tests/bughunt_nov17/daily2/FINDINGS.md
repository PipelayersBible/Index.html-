# Foreman daily paperwork, a week in the field (r16.97) -- audit/daily2

Rig: Playwright rig (/home/claude/rig), my copy served on port 8886. Tests in t/ use curT.html / fixT.html, which are
cur.html / fix.html plus ONE test hook line (`window.__dEval`, made by mkT.py) so a test can read runArchive and the daily
draft; nothing else differs. Patches in patches/ apply to the pristine r16.97 index.html, in order (build.sh).

## Second job the same day: the whole crew (and the foreman) start at a full 8 h again, so the day's labor is billed twice  [severity: medium]
Where: pbDpDraft (carries the crew from "his report of" the same day on another job), pbDxHvC / pbDxDayDef (a person with no Crew-log hours shows the full-day default).
Repro: t/t01_twojobs.js. Sign 24-017's daily with Tommy, Joe, Sam at the default 8 h. Open 24-020's daily for the same date: the same three are listed, each at 8 h again (24 h shown, 48 man-hours for the day across the two reports). Same with no signed report: the foreman row is 8 h on both jobs.
Why it's wrong: a foreman who moves the crew to a second job at lunch signs two reports that each pay everyone a full day. Nothing warns him; the boxes look filled in "for" him, and the office copy of each report carries 8 h per person.
Fix: patches/01_second_job_hours.py -- the default for a person with no Crew-log hours is the full day LESS the hours that person already has on his other signed reports for that date (latest version of each, by user id or name), never below 0, with a line under the crew saying why ("Hours already on today's other report(s) are taken off the default."). What he types still wins. (tested: yes, t/t01_twojobs.js)

## Night shift: the daily opened after midnight is the NEW day, with "No runs on this job this day"  [severity: medium]
Where: pbOpenDailyReport (day = pbFmOpenDay = the company's today), pbDlyRunsOf (a run belongs to the day it STARTED).
Repro: t/t02_nightshift.js. Clock 19:00 Mon Nov 16 (Pacific). Start a run on 24-017, crew in, 120 ft entered, End Run at 03:30 Tue. Tap Daily report at 03:45: it opens Tue Nov 17, "Runs & Production · 0 -- No runs on this job this day", foreman 8 h. The shift's run, crew and footage sit on Monday's report, which he has to find by changing the date.
Why it's wrong: the end of a night shift is exactly when the foreman does the daily. The screen he gets is an empty report for the wrong date that he can sign and send (8 h foreman, no production), and Monday's real report stays unsigned.
Fix: patches/02_night_shift_day.py -- when the daily is opened without a date before noon, and a run on this phone started yesterday and ended today (or is still open), and yesterday's report for that job isn't signed yet, it opens on yesterday with that job, and says so ("Opened on Mon, Nov 16: your shift's run started then. Change the date for today's report."). Opening with a date (from a reminder, Records, etc.) is unchanged. (tested: yes, t/t02_nightshift.js)

## Crew Today / Equipment on Site: the remove X sits 6 px from the "+" hours button and removes the person on one tap, with no undo; Refresh doesn't bring him back  [severity: medium]
Where: pbDxCrewRow / equipment row (dp-x button), window.pbDpRemove (and its feat_dailyfill / feat_crew8 wrappers that add the row to rfGone / meGone).
Repro: t/t03_undo_remove.js. At 390 px the "More, Joe Laborer" button spans x 275-309 and "Remove Joe Laborer" x 315-359 (same row, same height). One tap on the X: Joe and his hours are gone, no question asked. Refresh (or reopening) does not refill him from the run's Crew log, because the removal is remembered (rfGone). Same for the foreman's own row (meGone) and for an equipment piece (its X is beside the Unused "+").
Why it's wrong: with gloves, a tap aimed at "+" to add half an hour lands on X often enough. The person silently drops off the signed report and the office copy (no hours = not paid / not billed) and the foreman has no way to see what happened or get it back except retyping the name and hours.
Fix: patches/03_remove_undo.py -- removing a crew or equipment row shows an "Removed Joe Laborer. Undo" bar for 8 s (44 px button); Undo puts the row back where it was, with the hours he typed, and clears the remembered removal. (tested: yes, t/t03_undo_remove.js)

## Production corrected on a run after the daily was signed: the daily and the office copy keep the old number, and nothing says so  [severity: medium]
Where: pbSaveForemanData (run production) / pbDlyBuild + the signed card in pbDlyRender (the day's records are pulled in again, but only compared with what is on screen right before signing, never with the signed version).
Repro: t/t04_changed_after_sign.js. Run on 24-017, 100 ft pipe entered, daily signed and sent (office copy: Pipe Installed 100 LF). Later that evening the foreman fixes the run's production to 90 ft (Save Production; the run and the company's production now say 90). Open the daily for that day: "Signed report ... Sent to the company (v1)", no hint that the run now says 90. The office has a signed daily saying 100 LF and a production record saying 90 LF for the same run.
Why it's wrong: "numbers match between the run, the daily and the office copy" fails silently. The foreman thinks he fixed it; the office sees two different footages and the signed one is wrong. The app already has the comparison (pbDlyPulledText / the "Changed: ..." list it shows before signing) but never runs it against the signed report.
Fix: patches/04_changed_since_signed.py -- when a signed (not amended-in-progress) day is opened, the freshly pulled records are compared with the latest signed version's (runs, crew hours, materials, inspections, permits, toolbox talks); if they differ, a warning sits above Add an Amendment: "The day's records changed after you signed (runs, materials). The company has the signed version. Add an Amendment so it matches." (tested: yes, t/t04_changed_after_sign.js)

## The daily report never shows the day's Job Book safety events (near miss, first aid, incident, stop work)  [severity: medium, NOT patched (owner decision on where it goes)]
Where: pbDlyCollect (the snapshot's sections: runs, other_prod, crew, materials, delays, inspections, permits, talks). Nothing reads the Job Book store (pbJb, kinds issue / rework / safety).
Repro: I confirmed this by reading pbDlyCollect and grepping every daily-report function for pbJb/jobbook (the only hit is the "Add Rework" button on a failed inspection). Job Book > Safety > Add Safety Event "Incident", date today, job 24-017. Open the daily for 24-017 today: there's no safety section, nothing under Needs attention, and nothing in the PDF or the office copy.
Why it's wrong: the brief's "hazards" on the daily covers only confined-space permits. A foreman who logs a stop-work or an incident in the Job Book signs a "dispute-grade" daily for that day that doesn't mention it. Job Book rework hours are also missing (only run-note Rework is pulled in).
Why no patch: it needs a new snapshot section (`safety_events`), plus screen, PDF, Needs-attention line and office views. pb_daily_submit stores the snapshot as given, but the office-side readers and the export certificate list sections by name. That's a design change, not a one-line fix. Suggested: pull Job Book safety (and rework) entries whose date (or created day) is the report day and job into a read-only "Safety & rework (Job Book)" block; Incident and Stop work also go under Needs attention.

## Friction: where a foreman gives up (noted, not built)
Tap counts are from driving the screens at 390 px (t/w2, w8, w10, w12):
- **Daily routine, end of day: about 5 taps plus the narrative.** Home > Daily report (1), type the narrative (1 + typing), Next: Hours & Sign (1), Sign & Send (1), Sign Report (1). The name is filled in from his last signed report. Add 1 or 2 for weather: Get Weather, and "Work for the day is over" if it's before the forecast day ends. The end-of-day part is fine.
- **During the day it's heavy. The crew has to be re-entered on EVERY run.** A new run starts with an empty Crew & Equipment Log (t/w12). Each person takes: open Production & Crew, + Add Laborer..., type the name, pick the Type, Add and Check In. That's about 4-5 taps plus typing, so 12-15 taps for a 3-person crew on every run, and more on a 3-run day. This is where a foreman gives up. Then Crew Today falls back to "8 h each", which is the default the office gets. Suggested fix: "Same crew as last run" (one tap) on a new run's log, offering the previous run's people still checked in; or chips of today's crew names.
- **Production & Crew is the last card on the Results screen, below "End Run and Send Report" / "End Run Without Completing".** He scrolls past the two run-ending buttons every time he adds a person. Suggested: move the card above "Finish this run", or put a Crew button on the laid-progress bar beside Break.
- **The narrative is required to sign** ("Write the narrative first"). On a plain production day the report already says everything. Suggested: offer a one-tap starter line built from the day ("Laid 100 LF 8" on 24-017, Start to End; crew 3, 8.5 h; no delays.") that he can edit.
- **Glove targets:** the equipment Running / Down / Unused -/+ steppers are 24 px wide, the crew -/+ are 34 px, and the Rental checkbox is 22 px (t/w10 lists them). The crew X sits 6 px from + (patched as finding 3, with an undo, but the spacing is still tight).
- **"Add note" from Home files the note under the Current job with no way to change it on the sheet.** On a two-job day, notes taken after the move land on the morning job. Suggested: make the job line a picker of today's jobs.
- **Quick Production (work without a run):** typed "Crew man-hours 24" shows on the daily as "On runs: Crew man-hours (typed) 24 h". It isn't on runs, and it sits next to Crew Today rows that default to 8 h each. The office can't tell whether it's the same labor counted twice. Suggested: fold the typed man-hours into Crew Today (or say "already included / not included").
- **Night shift:** a run that starts before midnight and another started after midnight in the same shift land on two different days' reports (a run belongs to the day it starts). Patched only the opening day (finding 2); the split itself is an owner decision (below).

## Checked and found working (no bug filed)
- Numbers match across run, daily screen, signed snapshot (office copy) and daily PDF on a normal day (t/w8): 100 ft run; Excavation 110 / Pipe 100 / Backfill 90 LF / 1 EA; crew 8.5 h each from the Crew log; CAT 320 8.5 h running; materials 100 LF pipe, bedding 5.56 yd³, backfill 55.02 yd³.
- Run-note Delay (Waiting on inspector, 1 h) carries through to the daily screen ("1 entry · 1 h"), the signed events (hours 1, cid rn:...) and the PDF (t/w14).
- With no signal: sign v1, amend it (hours 8.5 -> 8, with a reason) while still offline, then signal comes back. v1 goes first, v2 goes with supersedes = v1's server id, and both end up "sent" (t/w9).
- Crew in Eastern time with the company on Pacific (t/w13): the report date, run times and signed time are consistent and labelled with their zone.
- Quick Production (work without a run): footage, pipe size and production reach the daily's Runs & Production and Materials (t/w7). Wording is noted under friction.
- 390 px, light and dark: no sideways scroll on the daily (scrollWidth 390). Dark mode reads fine (out/w10_daily_dark.png).
- Toolbox talks, inspections and permits use the company's day like the runs do; nothing found.

## Regression
The repo tests t101-t124, t126, t90, t91 and t95, plus every test in tests/bughunt_nov17/*/ (t_*, t0*, f0*; 47 files including the new office2/ and pdfs/ folders), ran against cur.html (r16.97) and fix.html (patches 01-04) on port 8886. Runner: reg/run.sh; logs in reg/cur and reg/fix; summaries in reg/cur_summary.txt, reg/fix_summary.txt, reg/bh_cur.txt and reg/bh_fix.txt.
- Repo tests: every one exits 0 on both builds, with `errs []` throughout. The first pass ran both builds at once, and t103, t106, t108, t110 and t115 timed out waiting for elements under that load. Re-run one at a time (reg/rr_*.txt), all five pass on both builds.
- bughunt_nov17 tests: the results (exit code and PASS/FAIL counts) are identical on cur and fix. Several of them FAIL or exit 1 on BOTH builds. Those are other helpers' tests for fixes not shipped in r16.97 (or ones tied to their own pages), so my patches didn't cause them.
- My tests t/t01-t04 FAIL on curT.html and PASS on fixT.html (all four patches combined).

## DECISIONS FOR THE OWNER
1. **Breaks and crew pay.** A run's Break (r16.88) takes the time out of the pace stats only. The crew stays checked in, so the daily and the office copy pay the crew through a 30-minute lunch logged as a Break. Should a Break also come off Crew-log hours (or be listed on the daily as "lunch 30 min")? Today the daily doesn't mention breaks at all.
2. **Hours between runs.** Crew-log hours are run-time only: everyone is checked out automatically when a run ends. On a 2-run day with setup, travel or a gap in between, Crew Today's "auto" hours are less than the day worked, and the office copy carries those lower numbers. Keep it this way (the foreman edits), or use first check-in to last check-out for people on consecutive runs?
3. **Second job the same day (patch 01).** I take the hours already on his other signed report(s) off the 8 h default. The alternative is to default to this job's run span. Pick one.
4. **Night shift (patch 02).** I only fixed which day the daily OPENS on. Decide whether a shift's runs started after midnight belong to the shift's start day (one report per shift) or stay on the calendar day (two reports).
5. **Job Book safety events and rework on the daily (finding 5).** These need a new snapshot section, and the office views and export need to know about it.
6. **Extra-work tickets with customer signature don't exist.** "Extra work" is an entry under Delays & Extra Work with hours and photos, and the office can mark it "T&M ticket sent". Nobody on site can sign it. If customer sign-off on extra work is wanted, it's a new feature: a signature pad and the customer's name on the entry, carried to the PDF.
7. **Crew carry-over to a new run** (friction 2) is the single biggest tap saver in the day. Should a new run offer the last run's crew?

## DONE
Ranked:
1. (medium) **Second job the same day double-pays the crew.** Both reports start everyone at 8 h. Patch 01 takes off hours already on today's other signed report(s). Tested in t01.
2. (medium) **Daily opened after a night shift is the wrong, empty day** ("No runs on this job this day"), which the foreman can sign. Patch 02 opens the shift's day. Tested in t02.
3. (medium) **Production corrected after signing leaves the signed daily and office copy wrong, silently.** Patch 04 warns on the signed card and points to Add an Amendment. Tested in t04.
4. (medium) **Remove X 6 px from the "+" hours button deletes a person on one gloved tap, with no undo and no refill.** Patch 03 adds an 8 s Undo. Tested in t03.
5. (medium, not patched) **Job Book safety events and rework never reach the daily.** Owner decision.

Everything else I checked held up across the run, the daily, the signed snapshot and the PDF, including flaky-signal sign/amend ordering and time zones. The main thing a foreman will give up on is re-entering the crew on every run (12-15 taps per run). Then Crew Today falls back to 8 h defaults, and those defaults (wrong on two-job days, blind to breaks and gaps) are what the office pays from. Patches: /tmp/claude-0/audit/daily2/patches/01-04 (build.sh applies them in order to r16.97 and syntax-checks the result); tests in /tmp/claude-0/audit/daily2/t/.
