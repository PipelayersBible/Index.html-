# Bug hunt: tonight's releases (r16.89 -> r16.95), on live build r16.95
Folder /tmp/claude-0/bughunt/tonight/, port 8875. Patches in patches/ apply to r16.95 index.html, in number order.
Tests in t/ (run `cd /home/claude/rig && node /tmp/claude-0/bughunt/tonight/t/<test>.js`; PB_URL overrides the page).
Note: the shared rig's co.js now sets the crew notice to '3' (for a later build); r16.95 checks '2', so every repo test
stops at the crew notice on r16.95. My tests use t/co.js (same as co.js, notice '2').

## Second rod shot: "Lock Without It" sticks to the next Lock, so a run that HAS the second shot is recorded as locked without it  [severity: medium]
Where: pbLock (window._pbAiNo2nd, set by "Lock Without It", cleared only after a record is made, line ~36012)
Repro: t/t_no2nd_stale.js. AI-read stakes, rod shot on Start only, Lock -> One More Rod Shot -> Lock Without It -> "Check the AI Readings" -> Go Back. Shoot the End stake (3.50), Review, Lock -> I Checked Them. The record has aiNo2nd: true.
Why it's wrong: the run report then says "It was locked without a rod shot on a second stake, so the HI cross-check could not test these values" on a run whose two shots WERE cross-checked: a false statement on a sealed record. Any Lock that stops after "Lock Without It" (Go Back on the AI check, Photo Still Processing, Not Locked, job/foreman question cancelled) leaves the flag set for the next Lock in the session, even of a different run.
Fix: patches/01_no2nd_reset.py: pbLock clears the flag unless this call came from "Lock Without It" (opts.ai2nd, which every later re-call carries). (tested: yes, t/t_no2nd_stale.js FAIL before, PASS after)

## Crossing clearance still uses the old TOP (INV + nominal size + wall), not the real OD: a too-close crossing over DI shows "Clear"  [severity: high]
Where: pbXingInfo (line ~11901, `top: inv + idf + wt`), used by the crossing card's live line, Check Before Locking, the Review crossing list, the record/PDF crossing lines (pbXingInfo -> 11982, 49523)
Repro: t/t_xing_od.js. 12" Ductile Iron run (OD 13.20", wall 0.029 ft), a gas crossing at 2+50 whose BOP is 12.2" above the old TOP. Real clearance to the pipe's real top is 11.70" (under the 12" minimum); the card says "Clear: bottom of the gas will be 1.02 ft above the top of your pipe" and Check Before Locking says nothing.
Why it's wrong: r16.90 moved every TOP on the grade sheet to BOP + real OD but missed the crossing check, so the clearance is measured to a pipe top that isn't there. For DI (and DIPS HDPE) the real top is 0.43-0.51" higher than the old formula on 8-12" pipe, so clearance is overstated and a crossing under its minimum (or a Title 22 water/sewer separation) passes as clear. (C900/SDR 35 err the safe way.) The crossing's own numbers then disagree with the TOP on the grade sheet.
Fix: patches/02_xing_true_od.py: our TOP at a crossing = INV - wall + the OD recorded for that run (summary.pipeInfo[].odIn, which Review and Lock now carry); a record without odIn (locked before r16.90) keeps the old formula so it matches its own grade sheet. (tested: yes, t/t_xing_od.js FAIL before, PASS after)

## Runs locked before r16.90 that are still open: Add Interval and Fix a Distance/Hub refused, and an unchanged re-lock silently rewrites the TOP column  [severity: high]
Where: pbCalcDescribesEntry / pbFormHoldsLockedRun (compare every row's `top` string with a fresh calc), now computed with pbInvToTopFt (real OD); pbLoadRunIntoForm
Repro: t/t_oldrec.js (lock a 15" SDR 35 run, then make its record what r16.89 would have locked: TOP = INV + 15" + wall, no odIn; restart = New Run, back to its Results). Seen during the probe (t/p_addiv.js): Add Interval -> "Another run has been calculated since this one was locked ... Nothing was added." The same check guards Fix a Distance or Hub (pbCorrectFormMsg refusal), the laying-space switch and the send-back fix. Edit Run Data -> Review -> Lock with nothing typed -> Replace: the new record's TOP column moved by 0.05 ft on every row (INV-TOP 1.29 -> 1.24), no word to anyone.
Why it's wrong: every run locked on r16.89 or earlier with a size whose TOP changed (SDR 35 10-48", C900, DI, IPS types) and still open after tonight's update (multi-day runs are normal) no longer counts as "the same run" as its own record, so the crew can't add an interval or fix a station on it in the field. If they re-lock instead, the locked numbers change under a sealed record with nothing saying why, and a crew laying to TOP would see different readings than yesterday's printed / crew-view sheet.
Fix: patches/03_old_record_top.py: a record without odIn (locked before r16.90) keeps INV + size + wall while ITS OWN form is loaded (pbLoadRunIntoForm's record branch sets pbLegacyTopGen for that form generation; New Run, Resume, Reuse and Duplicate start a new generation and use the real OD), and the re-locked record still carries no odIn so it stays on that basis. Added interval rows match the run's other rows. (tested: yes, t/t_oldrec.js FAIL before (both asserts), PASS after)
Note (pre-existing, r16.94 too, not fixed): Edit Run Data after a restart, then Lock with nothing changed, asks "Locked Once Already ... Replace" rather than "Nothing has changed" (t/ctl_oldrec.js on r1694.html).

## Second rod shot prompt on a Lenker rod run: "Add a Rod Shot" does nothing and every AI-read Lenker run is recorded "locked without a second rod shot"  [severity: medium]
Where: pbLock, r16.90 second-shot block (`hc.candidates.length < 2`, target `tgt + 'StakeReading'`)
Repro: t/t_lenker2nd.js. Lenker rod, two AI-read stakes, Review, Lock: "One More Rod Shot ... only one stake has a rod shot ... Shoot the rod on MH-2 and type the reading". There is no stake rod reading field on a Lenker run (startStakeReading / endStakeReading don't exist), so "Add a Rod Shot" goes to Run Setup and focuses nothing; the only way on is "Lock Without It", which writes aiNo2nd and the report line "It was locked without a rod shot on a second stake, so the HI cross-check could not test these values".
Why it's wrong: a Lenker run has no HI and no HI cross-check (computeHiCrossCheck always has 0 candidates), so the prompt asks for something the form cannot take, the button is dead, and the sealed report blames the crew for skipping a check that doesn't exist for their rod. Same block, any rod: with a typed/benchmark HI and no stake shot it says "only one stake has a rod shot" when none has.
Fix: patches/04_second_shot_lenker.py: no second-shot prompt on a Lenker run; the wording counts the shots ("no stake has a rod shot" / "only one stake ..."). (tested: yes, t/t_lenker2nd.js FAIL before, PASS after; t/t_no2nd_stale.js and repo t119 still pass)

## Rod Units & Grade Math page still says TOP = INV + pipe ID + wall, which is no longer what the grade sheet does  [severity: low]
Where: reference page, item data-edu-id="top-top-of-pipe" (line ~6125)
Repro: t/t_refpage.js (reads the item). 15" SDR 35, INV 100.00, wall 0.437": the page's formula gives TOP 101.286; the grade sheet (r16.90) gives 101.239 (BOP + 15.30" OD).
Why it's wrong: since r16.90 the box is "Pipe size" (nominal) and TOP = BOP + the pipe's real OD. A foreman checking a TOP by hand with the app's own reference gets a number 0.05 ft off (15" SDR 35; 0.04 ft on 12" DI) and concludes the app is wrong, or the reverse.
Fix: patches/05_refpage_top.py: the item says TOP = BOP + OD (INV − wall + OD), that the app uses the real OD for the pipe type and size (15" SDR 35 = 15.30"), size + 2 walls when it has none, and the reading equivalent. (tested: yes, t/t_refpage.js FAIL before, PASS after)

## Low-slope note can say a slope is "flatter than" a minimum it rounds up to or past ("0.07% ... flatter than ... 0.067%")  [severity: low]
Where: buildCalc, r16.94 low-slope warning text (`Math.abs(s.slopePct).toFixed(2)`)
Repro: t/t_lowslope_txt.js: 27" SDR 35, 301 ft at 0.066%: "0.07% from MH-1 to MH-2 is flatter than the usual minimum for 27" sewer (0.067%, Ten States Standards)." Same for any slope within 0.005% under a 2-decimal minimum (0.396% on 8" reads "0.40% ... (0.40%)").
Why it's wrong: the note contradicts itself, so a crew reads it as an app error and ignores the check that exists to catch a misread cut.
Fix: patches/06_lowslope_digits.py: the slope is shown with as many decimals (up to 4) as it takes to be below the minimum. (tested: yes, t/t_lowslope_txt.js FAIL before, PASS after)

## Crew view shipped without telling crew members that other crew members now see their runs  [severity: medium (privacy notice)]
Where: pbCrewNoticeCheck (the one-time "What Your Company Sees" notice, version '2' from r16.91); r16.95 crew view (pb_prod_crew_view_list / _get, live on the server)
Repro: t/t_crewnotice.js: a pipelayer who saw the r16.91 notice gets nothing new on r16.95; the notice text names only "your company". Since r16.95, the other pipelayers linked to his foreman see his runs from the last 36 h on their own phones, with his name, the grade numbers and the phone time each row was marked laid (CREWVIEW_NOTES "Privacy").
Why it's wrong: the notice is the app's statement (legal review, CA SB 947) of who sees a worker's records; it now understates it, and the crew-notice re-show mechanism exists exactly for a change like this. The repo already has an unreleased r16.96 test (t126_noticeack.js) that expects a crew-view line, so this is known to be coming, but r16.95 is live without it.
Fix: patches/07_crew_notice_crewview.py: one sentence added ("Crew members linked to the same foreman see a read-only copy of your runs from the last day and a half: the grade numbers, when each row was marked laid, and your name.") and the notice version bumped to '3' so everyone sees it once. If r16.96's version lands first, drop this patch. (tested: yes, t/t_crewnotice.js FAIL before, PASS after)

## Record-only permit: one EVACUATE-era order left in the "reading did NOT save" alert  [severity: low]
Where: pbSaveAtmoReading, unsafe reading whose save failed (line ~30476): "... your entered values are still in the form below. Try saving again once the space is evacuated."
Repro: t/t_cs_wording.js (finds the text in the page script; reaching it live needs a storage failure during an out-of-limit reading).
Why it's wrong: r16.90 made the permit a record (no EVACUATE orders; "under this permit, entrants exit ..."); this alert still tells the crew the space is to be evacuated, the one place the old wording survived. Emergency call / Text 911 / rescue line are untouched by this.
Fix: patches/08_cs_saved_wording.py: "Try saving it again." (tested: yes, t/t_cs_wording.js FAIL before, PASS after)

## Second rod shot prompt shows the stake's name HTML-escaped ("Shoot the rod on 6&quot; LAT &amp; MH")  [severity: low]
Where: pbLock, r16.90 second-shot prompt (`escapeHtml(getPointLabel(...))` inside a pbShowModal message, which is set as textContent)
Repro: t/t_2nd_label.js: End label `6" LAT & MH`, AI-read stakes, one rod shot, Lock -> "Shoot the rod on 6&quot; LAT &amp; MH and type the reading".
Why it's wrong: inch marks and "&" are common in stake/line labels; the prompt that names the stake to shoot shows entity garbage instead.
Fix: patches/09_second_shot_label.py: the label is passed as text. (tested: yes, t/t_2nd_label.js FAIL before, PASS after on fix2.html = patches 01-09)

## Checked, no bug found (or not tonight's)
- TOP by hand (INV to TOP; wall from the pipe index): SDR 35 8" 8.16 in (OD 8.40 - 0.24), 15" 14.863, 24" 24.142; C900 12" 12.467; DI 12" 12.857; concrete 24" 27.0 (24 + 2x3 - 3, same as before); corrugated 12" 13.35 (same as before); clay 8" and "Other" fall back to size + wall (9.062 on 8" clay). The app matches all of these. Grade rows, reading warnings, Lenker, backfill displacement, materials od_in and the record's odIn all go through pbInvToTopFt / pbPipeOdFt. The crossing check was the only TOP left on the old formula (finding 2).
- Confined space: no siren, no EVACUATE or "Entry Blocked" left for readings. The pbAlertKeepingEvacuate regex matches the new notice. Check-in warnings, the Did-they-enter question, EMERGENCY and Text 911 are unchanged. The only leftover is finding 8.
- Crew view server (read the applied SQL and the helper functions): same company only, "office only" runs are excluded (pick_of 'none' -> rr_foreman null), the viewer's own runs are refused, only whitelisted fields go out. Quota: the busiest user-day on record is 28 versions against the 600 limit. A nudge that lands during a send is dropped (pbRr.busy), and the 60 s tick picks the change up. The server skips identical records by md5. No duplicate versions.
- New Run folds: errors in folded fields open More (aria-invalid observer, pbGoToField). No sideways scroll at 390 px. Dark mode reads fine.
- Repo t123 fails 3 checks on r16.95 itself: the repo copy now expects r16.96 behaviour. t124 and others need the crew notice at '2' (the shared rig's co.js now sets '3').

## Regression
Repo t101-t124, t90, t91, t95 against cur.html (r16.95) and fix.html (all patches 01-09), port 8875, copies in reg/cur and reg/fix (runner reg/run.sh, single test reg/one.sh; co/co_pl wrappers in t/ set the notice version for the build under test):
every test exits 0 on both, `errs []` throughout. t123's 3 FAIL lines (r16.96 expectations) are the same on both builds. t124 is ALL PASS on both. t118/t119/t109 were re-run after patch 09: pass.
All my tests (t/t_*.js) FAIL on cur.html and PASS on fix.html.

## DONE
Ranked by severity:
1. [high] Crossing clearance still measures to INV + nominal + wall (patch 02). On DI and DIPS HDPE, a crossing under its minimum clearance or the Title 22 separation shows "Clear". This is a utility-strike risk.
2. [high] Runs locked before r16.90 and still open after the update (patch 03). Add Interval and Fix a Distance or Hub are refused ("another run has been calculated"), and an unchanged re-lock silently rewrites the record's whole TOP column.
3. [medium] Second-shot "Lock Without It" sticks to the next Lock (patch 01). A run that was cross-checked gets a false "locked without a second rod shot" line on its sealed report.
4. [medium] Second-shot prompt on Lenker runs (patch 04). There is no field to go to, so "Add a Rod Shot" does nothing, and every AI-read Lenker run is recorded as skipping the check.
5. [medium] The crew notice doesn't say that crew members now see each other's runs (patch 07; r16.96 work in the repo already covers this, so drop patch 07 if that ships first).
6. [low] Rod Units reference still shows the old TOP formula (patch 05).
7. [low] Low-slope note can say "0.07% is flatter than 0.067%" (patch 06).
8. [low] The second-shot prompt shows the stake name HTML-escaped (patch 09).
9. [low] One "once the space is evacuated" order is left on the permit (patch 08).
Patches 01-09 apply in order to r16.95 index.html, `node --check` is clean, and the repo regression is unchanged.
