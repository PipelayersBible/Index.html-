# Bug hunt findings: grade (core run / grade sheet math), r16.88

(Test rig note: tests in tests/ run against cur.html = index.html + a one-line eval hook added by mkcur.sh; server on port 8862.)

## TOP of pipe uses the nominal size as the true inside diameter  [severity: medium, needs owner decision]
Where: buildCalcInner rowDataForPoint / elevAtStation (`tp = pi + idFt + wt`, `topReading = reading - (idFt + wt)`), with idFt = nominal size from runIdSel and wt = true wall from PB_PIPE_INDEX.
Repro: New Run, pipe type PVC SDR 35, 15 in. Wall auto-fills 0.036 ft (0.437 in, true wall). TOP is shown 1.286 ft above INV. Real pipe: OD 15.3 in (the app's own D3034 table), so TOP is (15.3 - 0.437)/12 = 1.239 ft above INV. The sheet's TOP is 0.048 ft (9/16 in) too high. Same for Ductile Iron 12 in (true ID 12.51: sheet TOP 0.043 ft too LOW), C900 12 in (0.022 ft too high), SDR35 12 in (0.018 ft high). 8 in SDR35 is within 0.007 ft.
Why it's wrong: a crew that shoots TOP to the sheet's number sets the pipe off grade by more than the app's own 0.02 ft tolerance on several common pipes. INV and BOP are right. The app already has the real ODs (pipeOD() in the Pipe Weight module) but the grade sheet does not use them.
Fix: not patched (changes TOP on every sheet: owner call). Suggested: when the run's pipe type + size has a table OD, TOP = BOP + OD; otherwise keep INV + ID + wall.

## Run report PDF: "Inverts, start / end (ft)" shows rod readings, not invert elevations  [severity: medium]
Where: run report PDF at-a-glance strip (~line 49168), `s.startInv` / `s.endInv` = dispPoint(point,'inv') = the INV ROD READING for engineer / architect rods.
Repro: tests/g2.js (any engineer or architect run, download the run PDF). Strip reads `Inverts, start / end (ft)  3'-0 1/2" / 15'-8 7/8"` (engineer run in g1: `7.97 / 6.17`) while the real invert elevations are 2590.31 / 2577.61 (99.79 / 101.59). On screen the same numbers are correctly labelled "Start Rod Reading".
Why it's wrong: the first numbers an inspector reads on the record are labelled as invert elevations in feet but are rod readings (they even fall when the pipe rises).
Fix: patches/01_pdf_inverts.py (tested: yes, tests/t01_pdf_inverts.js)

## Run report PDF says stations start at 0+00 and prints distance as "Sta" even when the run has real stations  [severity: medium]
Where: run report PDF: grade-sheet intro para (~line 49235) and every pbRptSta(distance) use (Laid to, photo captions, timeline, swipe ranges).
Repro: tests/g2.js: run entered with stake stations 12+45.30 -> 10+95.30. The grade table's Station column is right (12+45.30 ... 10+95.30) but the text above it says "Stations are measured from the start of this run (0+00.00 at Start point); the plan's own stationing is not recorded with the run", and the photos are captioned "Angle point · Sta 0+65.25", "End point · Sta 1+50.00" (really 11+80.05 and 10+95.30). "Laid to Sta ..." has the same problem.
Why it's wrong: one evidence document gives two different stations for the same stake, and states the plan stationing is not recorded when it is.
Fix: patches/02_pdf_stations.py (tested: yes, tests/t02_pdf_stations.js)

## Architect's rod: values the AI read from a stake are reported as "changed by hand" (nobody touched them)  [severity: medium]
Where: pbAiReadsNow() (~line 35716): `same` = |now - AI value| < 0.0005 ft. With the Architect's rod the stake elevation and cut/fill go into ft / in / 1-16 boxes, so the app itself rounds them by up to 1/32 in (0.0026 ft).
Repro: tests/g2.js / tests/t03_ai_changed.js: Architect's rod, AI reads stake elevation 2589.06 and cut 2.33; change nothing; lock; run PDF "Values read from stake photos by AI" says "3 values changed by hand after the AI read" and prints "2589.063 (changed)", "2.328 (changed)".
Why it's wrong: the evidence section of the record states the person changed AI readings by hand when they did not (the app rounded them to the rod's 1/16 in). Also inflates the count every time.
Fix: patches/03_ai_changed_arch.py (tested: yes, tests/t03_ai_changed.js)

## Avg. time per pipe reads too fast after any gap over 60 min (lunch): the gap's time is dropped but its pipe is still counted  [severity: low]
Where: pbLaidStats() (~line 44299): `ms` skips a gap > PB_LS_GAP between two mark times, but `sticks` still counts the rows marked at the end of that gap.
Repro: tests/t04_laidstats.js: rows marked laid at 10:00, 10:20, 12:00, 12:20 (one pipe each, 20 min a pipe). Avg. time shows 13m 20s (40 min / 3 pipes) instead of 20m 00s (40 min / 2 pipes).
Why it's wrong: every lunch or long stop makes the crew's time per pipe look better than it was; the more stops, the bigger the error (and this number feeds the foreman's pace).
Fix: patches/04_laidstats_gap.py (tested: yes, tests/t04_laidstats.js)

## Check shot: a reading typed in inches only (7", 7 1/2") is taken as FEET  [severity: low]
Where: pbCsParse() (~line 12071): the ft-in pattern makes the foot mark optional, so `7"` matches as 7 ft and `7 1/2"` as 7 ft 0-1/2 in; `0.5"` is refused.
Repro: tests/t05_csparse.js, or on a locked Architect's-rod run: row menu > Check shot, type `7 1/2"` on a row whose target is 3'-0": the sheet says "4.04 ft LOW" and saves it (the 5 ft sanity stop does not catch it).
Why it's wrong: a number the person explicitly marked as inches is recorded on the run (and its PDF) as feet, giving a wrong off-grade result.
Fix: patches/05_csparse_inches.py (tested: yes, tests/t05_csparse.js)

## Run report PDF: the laid log gives a station up to 0.05 ft off the row it marked  [severity: low]
Where: pbLaidApply0() stores `to: String(row.station)` (the 1-decimal label, e.g. "65.3" for a hub at 65.25); the report's laid log / timeline print pbRptStaTxt(x.to).
Repro: tests/t06_laidlog.js: hub at 65.25 ft, mark laid to it, run PDF: "Laid to Sta 0+65.25" but two lines lower "Marked laid to Sta 0+65.30" and in the timeline "Rows marked laid to Sta 0+65.30": a station with no row on the sheet.
Why it's wrong: the same event has two different stations in one evidence document (any point not on a 0.1 ft: hubs, joints, added points).
Fix: patches/06_laidlog_station.py (tested: yes, tests/t06_laidlog.js). New marks keep the exact distance (`ft`) in the log; the report uses it, and for older logs finds the row by its label.

## A resumed run loses its backfill estimate: "Est. backfill: unavailable (missing data)"  [severity: medium]
Where: computeCutFillVolume() (~line 22037): any point not in Survey Stake mode sets allStaked = false, which blocks the whole volume. Resume adds the app's own "Left off" hub (pbRsStopHub, feat_stophub Nov 1) as an Invert Elevation point with no stake, so every run resumed from a stop between points has no backfill volume.
Repro: tests/t07_resume_volume.js: 400 ft run, 3 stakes, trench width 3 ft: locked estimate 155.5 cu yd. End it short at 200 ft (77.8 cu yd, right), Resume, shoot the Left off point, Lock: the record's volumeYd3 is null and the PDF says "Est. backfill unavailable (missing data)" although nothing is missing.
Why it's wrong: the finished run's record (the one the office reads) has no backfill number, only because of a point the app itself inserted. The ground there is known the same way it is for every interval row: straight line between the stakes on each side.
Fix: patches/07_volume_unstaked_between.py (tested: yes, tests/t07_resume_volume.js). An unstaked point that has staked ground of its own run on both sides no longer blocks the estimate (a run whose Start or End has no stake still shows "unavailable"). Note for the owner: this also gives an estimate when a hub typed as an invert sits between two stakes; say if that should stay "unavailable".

## Smaller things seen, not patched  [severity: low]
- Run report PDF, corrected hub: a stake hub corrected to a typed elevation ("now set directly by elevation instead of a stake shot") still prints Source = "Stake" in bold on the grade sheet (pbRptRowSource / pbRowIsStake). Seen in tests/g4.js output (tests/g4.txt). The corrections table does record the change.
- Run report PDF: "Instrument height (HI) 107.760 ft (entered)" when the HI was worked out from a stake shot, not typed.
- Run report PDF, Lenker rod: the columns are headed "BOP rod / INV rod / TOP rod" but hold elevations (the check-shot section does say so; the grade sheet does not).
- toArch(-0.001) prints `-0'-0"` (a reading a hair under zero); dispRow hides negatives, so only free-standing uses could show it.
- The Dist. label on screen is 1 decimal (a hub at 188.75 ft shows 188.8; an added point at 86.37 shows 86.4) while its Sta line and the PDF show 2 decimals. Not a grade error (0.05 ft along the pipe), but two added points 0.06 ft apart show the same label.

## Checked by hand and found correct (no bug)
8 in SDR35, 0.40 %, 450 ft, angle point + wye, stations 1+50.25 to 6+00.25 (tests/g1.js): HI, INV / BOP / TOP readings, elevations, slopes, station labels all match hand math. Architect's rod with a fill stake, a ft-in stake reading, stations running down and a 9.6 % slope (g2). Lenker rod, C900 12 in, bedding and trench width: subgrade, bedding volume 5.56 cu yd and backfill 52.57 cu yd match (g3). After lock: added interval, distance correction 450 to 455, hub correction (g4). Flip a run: rows mirror exactly (g6). End short at 200 ft (volume clipped right), Resume with a fresh shot: new HI and all readings right (g7). Repo tests t115 / t117 give the same output with all 7 patches applied (tests/out_*).

## DONE
Core grade math (HI, INV/BOP/TOP readings and elevations, slopes, stations, all three rod units, corrections, flip, end-short, resume, bedding and backfill volumes) checked out against hand calculations in seven realistic runs: no wrong INV or BOP number was found. The one grade-sheet number that is off is TOP on pipes whose real inside diameter is not the nominal size (up to 0.05 ft on 15 in SDR35 and 12 in ductile iron): reported, not patched, owner decision. Seven bugs are fixed with a patch and a failing-then-passing test each (patches/01-07, tests/t01-t07): the run PDF labelled rod readings as invert elevations; the run PDF printed distance as "Sta" and said stationing was not recorded on runs that have real stations; Architect's-rod runs reported untouched AI stake values as "changed by hand"; Avg. time per pipe read too fast after a lunch gap; a check shot typed in inches was taken as feet; the PDF laid log gave a station up to 0.05 ft off; and a resumed run lost its backfill estimate because of the app's own Left off point. All seven patches apply together to r16.88 (build.sh pall.html patches/0*.py), pass node --check, and nothing under the repo was touched.
