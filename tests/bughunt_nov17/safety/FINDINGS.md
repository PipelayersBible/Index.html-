# Bug hunt findings: safety (confined space permits + foreman daily report)
Base: /home/claude/index.html-/index.html (r16.88). Tests run with `cd /tmp/claude-0/bughunt/safety/t && NODE_PATH=/opt/npm-tools/node_modules node <test>.js` against http://127.0.0.1:8863/.
(cur.html = index.html + a one-line `window.__dbg` test hook made by mkcur.py; fixed.html = all patches applied + the same hook.)

## Unfinished Permits view: outside-limit air tests are not marked, times are raw UTC, emergency number never shown  [severity: medium]
Where: pbOpenSnapText() (about line 40641), used by Records > Unfinished permits (pbCompanyPermitsRender, mode 'open')
Repro: t/p2.js (lock a permit, log O2 19.4 / LEL 11 / H2S 12 / CO 30, render the snapshot text). Output line:
  `o2: 19.4 | lel: 11 | h2s: 12 | co: 30 | tester: Tess | time: 2026-11-18T01:43:18.150Z | order: 1794966198150 | by: mwlgixe4bh9p63`
Why it's wrong: This is the screen the office opens when a phone is lost or dead during an entry. A reading outside the permit's limits is listed exactly like a good one (every other view of a permit marks it OUTSIDE ACCEPTABLE RANGE), the time is UTC ISO text (reads as 1:43 the next day for a 5:43 PM test in California) next to internal fields (order, by), and the permit's emergency number is never printed because the code looks for `emergencyNumber` while the permit stores `emergencyDialNumber`.
Fix: patches/01_unfinished_permit_text.py (tested: yes, t/p2t.js: FAIL on cur.html, PASS on fixed.html; a reading exactly at the limits, O2 19.5 / LEL 10 / H2S 10 / CO 25, stays unmarked)

## Daily report: a permit's hazardous reading that never reached the log is not counted (permit reads clean)  [severity: high]
Where: pbDlyPermitsFrom() / pbDlyPermitSection() (about line 58861); shown by pbDlyRender ("Permits"), pbDlyPermitAlerts ("Needs attention"), and the daily PDF's permit table
Repro: t/p3.js. Lock a permit with job 24-017. Enter O2 16 with LEL blank and Save: the app sounds EVACUATE, latches DO NOT ENTER, and keeps the reading on the permit as an unlogged hazard (the record is refused because LEL is required). Close the permit as Evacuated. Open the daily for that job and day: the permit line says "0 air tests" with no OUTSIDE RANGE and there is no "Needs attention" line. Same while the permit is still open. The permit's own report and PDF do show the 16% reading.
Why it's wrong: The daily counts outside-range tests from atmoLog only and ignores permit.unloggedHazards (readings refused as a record or whose save failed). The signed daily, which the office reads, shows a permit with an evacuation-level reading as having nothing outside range.
Fix: patches/02_daily_unlogged_hazards.py (tested: yes, t/p3.js: FAIL on cur.html, PASS with FILE=fixed.html). Adds an optional `unlogged` dep to the pure permit core, so tests/t_permit_core.mjs keeps working; signed snapshots gain an optional `air_unlogged` field on a permit item.

## Daily report: weather for one day lands on another day's report (and is cached there) when the date or job is changed while it loads  [severity: medium]
Where: window.pbDlyWeather() and pbDlyWeatherCached() (about line 58984-59012)
Repro: t/d4.js. Open the daily (today): the weather lookup starts (it can take up to 30 s on a weak signal). Before it answers, change Report date to yesterday. When the answer for TODAY arrives it is written into the view and into the phone's cache under YESTERDAY's key (`24-017|2026-11-16 => K2026-11-17`), and shown as yesterday's weather. Because the answer is "complete", Update Weather is disabled ("Full day recorded"), so the wrong day's weather is what gets signed. The same happens when the job number is changed.
Why it's wrong: After the await both functions read pbDlyView.job / pbDlyView.date again instead of the job and date the request was made for. A signed daily report can carry another day's (or another job's) weather with nothing on screen to show it.
Fix: patches/03_daily_weather_race.py (tested: yes, t/d4.js: FAIL on cur.html, PASS with FILE=fixed.html; the late answer is still cached, under its own day, and the day now shown gets its own lookup)

## Close Out Permit closes an active permit on one tap, with no confirmation, and it can't be reopened  [severity: low]
Where: window.pbCloseConfinedPermit() (about line 31536), the "Close Out Permit" button at the bottom of the Active Permit screen
Repro: t/p7.js. Lock a permit, log a good air test, nobody checked in (crew out of the hole between entries, or before the first entry). Tap Close Out Permit once: the permit is closed and filed at once. A confirmation is only asked when someone is still checked in, or when the reason contradicts the record.
Why it's wrong: Closing is permanent (there is no reopen, and the limits and window can't be re-used without filling a new permit). A stray thumb on the last button of a long screen ends the permit, stops its reminders and takes it off the live board while the crew may still be working under it.
Fix: patches/04_closeout_confirm.py (tested: yes, t/p7.js: FAIL on cur.html, PASS with FILE=fixed.html). Note for the owner: this adds one tap to every normal closeout, so it is a judgment call; any existing test that closes a permit with nobody inside needs one extra modal click.

## Checked and found correct (no bug)
- Limits at the boundary: O2 exactly 19.5 and exactly 23.5, LEL exactly 10, H2S exactly 10, CO exactly 25 are within limits; 19.4 / 23.6 / 10.1 / 10.5 / 25.5 raise EVACUATE, the red banner and the entry block (t/p1.js). Custom limits behave the same (min O2 20: 20 ok, 19.99 out; max CO 35: 35 ok, 35.1 out) (t/p5.js).
- A blank H2S/CO after an outside reading does not clear it (banner stays, PDF row says NOT CLEARED); the banner and the entry block survive a reload (t/p4.js).
- Wording: the lock screen says "The entry supervisor decides whether entry is safe, not this app"; the status block says "Logged readings, not an entry approval" and "Clock check only, not an entry decision". No text found that says the app allows or approves entry.
- Closeout with someone inside asks first; the permit report text and the permit PDF mark outside-range tests and count them (t/p5.js, t/d2.js).
- Daily report: sign, send (pb_daily_submit arguments match the server function), amendments in a chain, an amendment signed while the previous one is still waiting, retry after no signal, and the PDF (t/d3.js). pb_daily_submit / pb_permit_backup / pb_permit_open_put / pb_permit_due_set signatures on the server match what the app sends (read-only check).
- 390 px: no horizontal overflow on the Active Permit screen (t/v1.js).

## Not confirmed (worth a look, no patch)
- pbDlyServerCheck() reads pbDlyView.job after its await, like the weather bug; a job change while pb_daily_list is out could show "Already signed on another phone" on the wrong job. Could not reproduce in the rig in the time available.
- Entry freshness (pbEntryBlockReason) uses permit.atmoInterval only, so with a "late" reminder of 60 min and no interval on the permit, entry still needs a test under 20 min old while the chip says "Re-test in 45 min". It errs on the safe side.
- A permit locked with no job number never appears on any daily report (the daily is per job).

## DONE
Four confirmed bugs, each with a patch and a test that fails before and passes after (patches apply in order 01-04 to the r16.88 index.html; `sh apply_all.sh` builds patched.html and fixed.html; the patched script passes `node --check`). The worst is in the daily report: a hazardous air reading that never reached the permit's test log (refused as a record, or its save failed) was not counted, so the signed daily showed that permit with nothing outside range (02, high). The others: the Unfinished Permits view listed outside-limit tests like good ones, in UTC, without the emergency number (01, medium); the daily's weather could land on and be cached for another day or job when the date was changed during the lookup (03, medium); Close Out Permit closed a permit on one tap with no way back (04, low, a judgment call for the owner). The core limit checks, banners, entry block, retest timers, roster, closeout, permit PDF and the daily's sign/send/amend path all behaved correctly under test, including readings exactly at the limits. Nothing in the repo was touched; nothing was written to the server.
