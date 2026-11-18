# Office week as superintendent / owner (r16.97) — findings

Base: /home/claude/index.html-/index.html (r16.97), copied to /tmp/claude-0/audit/office2/base.html; cur.html = base + patches.
Patches: /tmp/claude-0/audit/office2/patches/NN_*.py (`python3 NN.py in.html out.html`, exact-once replacements, each applies to r16.97 on its own and in number order).
Tests: /tmp/claude-0/audit/office2/t/*.js (`cd /home/claude/rig && PB_URL=http://127.0.0.1:8883/<file> node /tmp/claude-0/audit/office2/t/<test>.js`; exit 1 = FAIL). Rig: co.js + mgr.js (owner/manager), port 8883.
Not repeated: beta accounts, plan requests, AI tools (tests/bughunt_nov17/office), and the earlier hunts' items.

## Two managers editing the same job: saving Job details puts back the other manager's name / City, State  [severity: medium]
Where: pbCxInfoForm / pbCxInfoSave (job page > Edit Job > Job details); server public.pb_prod_job_info_set (no version, always writes name + address + start date)
Repro: t/t01_jobinfo_two_mgrs.js. Manager A renames job 26014 "Sundance Sewer Phase 2" and moves it to "Banning, CA". Manager B, whose laptop loaded the dashboard earlier, opens Job details (it shows the old name), changes only the start date and taps Save: the app sends the old name and old City, State with the new date, and the server writes all three.
Why it's wrong: A's change is silently undone, nobody is told, and because City, State is the job's weather location (feat_jobcity), the weather on the daily reports moves back to the old town too. The office laptop routinely sits on a dashboard loaded hours earlier, so this does not need a race: any stale page does it.
Fix: patches/01_jobinfo_merge.py: the form remembers what it opened with; Save first reads the job's current details from the server; a field B did not touch takes the server's current value, and a field both changed differently stops the save with "Someone else changed the job name meanwhile (now “…”). Check it, then Save again." (tested: yes, t/t01_jobinfo_two_mgrs.js FAIL before, PASS after). Server-side the clean fix is an expect-version on pb_prod_job_info_set (decision below).

## Two managers on the same job's PMs & supers: saving drops the person the other manager just added  [severity: medium]
Where: pbPmJobEdit / pbPmJobSave (job page > PMs & supers); server public.pb_job_pms_set replaces the whole list, no version
Repro: t/t02_pms_two_mgrs.js. B's job page loaded with PM Ann assigned. Manager A adds Superintendent Bob. B taps Change PMs & Supers, ticks Cal, Save: the app sends [Ann, Cal] (the list as B's page loaded it plus Cal) and the server takes Bob off. B is told "Saved. 2 PMs on this job."
Why it's wrong: Bob stops getting the job's alerts and plan changes (material alerts, schedule, missing reports) and nobody knows he was removed; A believes he is on it.
Fix: patches/02_pms_merge.py: Save reads the list again first and applies only B's own changes (who B ticked on, who B took off) to the list as it is now; the line says when someone else's change was kept ("Saved. … Bob Super was added by someone else meanwhile and is kept."). (tested: yes, t/t02_pms_two_mgrs.js FAIL before, PASS after)

## Office run reports list says "Photos stay on the crew's phone" (they have gone to the company since r16.75)  [severity: low]
Where: pbRrListHtml (Home > New run reports, line ~64135)
Repro: t/t03_rr_photos_note.js (opens the office's run report list with one report that has photos and reads the note)
Why it's wrong: since r16.75 every run photo goes to the company with the report and the office's PDF puts them back in (pbRrPhotosUp / pbRrPhotosIn; "Getting N photos…"). The superintendent reading the list is told the opposite, so he phones the foreman for photos the office already has, or tells an inspector there are none.
Fix: patches/03_rr_photos_note.py: "Last 60 days. Photos come with each report and are in its PDF." (tested: yes, t/t03_rr_photos_note.js FAIL before, PASS after)

## Office laptop with no signal (or a page left open overnight): yesterday's numbers are shown as "today"  [severity: medium]
Where: pbProdDashRender ("Reported today", "Today: …", "N reported today"), pbCxRender / pbCxJobCard (Home job cards "N crew members reported today"), pbCxHeroHtml and pbProdJobRender (job page "Today" list and column). The server answers with its own `today`; nothing compares it with the current date.
Repro: t/t04_stale_today.js. Dashboard loaded yesterday (2 crew members reported on 26014, 300 LF pipe that day). This morning there is no signal: Home says "Updated Nov 16, 11:07 PM · 2 crew members reported today" and Company production says "Reported today 1", "Today: Pipe Installed - Main 300 LF", "2 reported today".
Why it's wrong: the morning look at the board is exactly when the super decides who is short or where to send people; with the laptop on a dead hotspot or a page left open overnight he is told yesterday's crew is already out and yesterday's footage is today's. The "Updated <date>" line is small and doesn't undo the word "today".
Fix: patches/04_stale_today.py: pbProdTodayOf(D, j): when the copy's `today` isn't this device's date, its per-day counts (reporters_today, each category's `today`) are shown as nothing reported today; applied on Home, Company production and the job page. (tested: yes, t/t04_stale_today.js FAIL before, PASS after)

## Not patched: seen by reading or on the server (select-only), for the owner
- Office Home never warns about expiring or expired 811 tickets. pbLocHomeAttention returns nothing unless the account is a foreman, and pbCxJobFlags (the office's job cards) has no locate flag. In t/p5_loc.js job 26014 has a ticket that expired yesterday and one with 2 days left: the job's own Locates page shows "Expired … Don't dig until a new ticket is valid", but Home and Company production don't mention either. The super finds out only by opening every job. (Listed as missing feature 1; not built.)
- Locate rules are California's for every job: pbLocHolidays (Cesar Chavez Day), PB_LOC_START = 14 ("Start work by"), PB_LOC_WAIT = 2 and the company-wide locate_days (default 28) are applied to a job whatever its City, State. For a crew in another state the default expiry and the "Start work by … call 811 for a new ticket" line can be wrong. Decision below.
- Server, pb_prod_job_info_set and pb_job_pms_set take no expected version (patches 01/02 work around it on the phone; an older app version still overwrites). pb_prod_plan_set does check the version, but the app's answer to a clash is "Cancel, let the job reload, and make your change again": everything the second manager typed in the plan editor is thrown away.
- A member can't leave a company on their own: pb_crew_svc has no leave step and the app has no Leave button. A worker who quits stays in the company (and keeps seeing the crew view / getting pushes) until the owner removes them.
- pb_daily_prod_day (the daily report's "production from the company" pull) includes entries still inside their 24-hour hold, while the dashboard's cat_sums leaves them out until they count; on the day itself the daily report can show footage the dashboard doesn't have yet. By design of the 24-hour hold, but the two screens disagree for a day with no word.
- Budget hours used = crew hours on production entries only (from runs' crew logs and Work without a run). Equipment hours from daily reports are added on the job page (daily_eq), crew hours typed on a daily report are not, so "112 of 447 budget hours" can be lower than the hours on the signed daily reports.
- Office run report list shows each report's lock time in the office laptop's zone with no zone name (pbRoWhen), while the run report PDF uses the zone the crew's phone recorded: an Arizona/Texas crew's report reads "1:00 PM" in the list and "3:00 PM CST" in the PDF. Nudge "held until" times are likewise office-local while the 9 PM–6 AM quiet hours are the foreman's.
- New daily reports / New run reports "new" is per device (pbDr.seen / rrSeen in this phone's storage): reports the super opened on the laptop are still New on his phone, and a second manager can't tell what the first has already looked at. Run reports have a server reviewed_at; daily reports have none.
- Daily reports tile reads at most 25 jobs (jobs.slice(0, 25)) and builds production lines for the newest 12 reports only; a company with more active jobs silently misses the rest. Not an issue at 3 jobs.
- Job numbers are matched by lower-case + trim only (pb_prod.job_key): "26014", "26-014" and "Job 26014" are three jobs on the dashboard.

## What the office obviously needs and can't do (noted, not built)
1. A company-wide "Locates" view / Home alert: every open ticket across jobs, sorted by expiry, with expired and ≤2-day ones on Home (the data is already per job on the server).
2. Bulk exports for records and billing: a job's production by day and category (CSV) for progress billing, crew and equipment hours by day for payroll/cost reports, and "all daily reports for a job / date range" as one ZIP. Today every export is one document at a time, and the only CSVs (Records, Stats) are this phone's own runs.
3. Shared "reviewed by" on daily reports (who in the office has read which report), like run reports already have.
4. A way to remind a foreman from the office about a missing daily report (the office can fill one in for him, or nudge only on a waiting crew run).
5. Per-job state for 811 rules (ticket life, start window, holidays) taken from the job's City, State.
6. A Leave Company action for members, and a reassign step when a foreman is removed (his open runs, crew links, PM assignments).
7. Plan editor clash handling that keeps the second manager's typing (show both, let him re-apply).
8. Company permits and company tickets filtered by job and date (today: newest 50 at a time, permits not filterable at all).

## DECISIONS FOR THE OWNER
1. Two managers editing at once: patches 01 and 02 fix it on the phone, but an older app copy still overwrites. Recommendation: add an expected version to pb_prod_job_info_set and pb_job_pms_set (same pattern as pb_prod_plan_set / pb_co_equip_save), and have the plan editor keep the second manager's typing on a clash instead of "Cancel and make your change again".
2. 811 rules for jobs outside California. Today every job uses DigAlert's rules (28-day ticket, start within 14 days, 2 working days, CA holidays), and the ticket life is one company-wide number. Recommendation: per-job ticket life and start window, defaulted from the job's City, State (falling back to the company setting), and leave the CA wording off jobs in other states until each state's rule is checked by someone who knows it.
3. Locate alerts for the office. Recommendation: build missing feature 1 (expired / ≤2-day tickets on the office's Home and job cards). Digging on an expired ticket is the office's liability, and today only the foreman's phone warns.
4. A member leaving. Recommendation: a Leave Company button for crew members (the owner is told), and on removal of a foreman a short "who takes his open runs and crew" step.
5. Bulk exports (missing feature 2): decide which first. Recommendation: job production by day/category CSV (progress billing) first, then hours by day (payroll), then the daily-report ZIP per job/date range.

## Regression
Combined build: /tmp/claude-0/audit/office2/cur.html = base.html + patches 01–04 in order; main script passes `node --check`.
Every repo test asked for (t90, t91, t95, t100–t126 present in the repo, all of tests/bughunt_nov17/*: 128 scripts) was copied to regC/ (page = patched) and regB/ (page = r16.97), rewritten to port 8883, and run (runreg.sh; logs in regC.out*/ and regB.out/). Every test that exited non-zero on the patched build was also run on r16.97: 92 scripts, 89 gave the same exit code on both. The 3 that differed were rerun alone: bughunt new/a8 (admin log) and t123 timed out on the r16.97 side under load, and tonight/t_lenker2nd failed once on the patched side and passed twice on both builds when run alone. None of them touch the code the patches change. The many non-zero exits common to both builds are already there in r16.97 or come from the test setup, not from these patches: the grade/* scripts need a `window.__ev` test hook that isn't in r16.97; the critic/new/safety probes are exploration scripts that exit 1 by design or hit the lock-flow prompts r16.90+ added; t100/t101 stop at "no button Lock This Run" on both builds. Note: the first pass lost its web server partway through (background time limit); everything it failed was rerun as above.
My tests: t01, t01b, t02, t03, t04 each exit 1 on base.html and 0 on cur.html.

## DONE
I spent a week as the office (owner / super) on r16.97 at 1280 px and 390 px. I set up jobs (New job, the plan with budgets, PMs & supers, equipment, job details), read the dashboard, job page tabs, run reports, daily reports, locates, inspections, tickets and permits, and checked that the numbers agree from screen to screen (Home card = Company production = job page: all come from pbProdJobView). I also covered empty states, no signal and time zones. I found 4 bugs and each has a patch plus a test that fails before and passes after. Ranked:
(1) Two managers editing the same job's details: a stale page silently puts back the other manager's job name and City, State. The weather location moves back too (patch 01; the server takes no version).
(2) The same for PMs & supers: saving drops the person another manager just added, so his alerts stop with no word (patch 02).
(3) Office laptop with no signal, or a page left open overnight: yesterday's copy says "2 crew members reported today", "Reported today 1" and "Today: Pipe 300 LF" (patch 04).
(4) The office run report list says "Photos stay on the crew's phone" although they have gone to the company since r16.75 (patch 03).
Biggest gaps (not built, decisions above):
- The office never gets an expired or expiring 811 ticket alert. Only the foreman's Home warns, and the office has to open each job.
- The 811 rules are California's for every job, with one ticket life for the whole company.
- There are no bulk exports (production or hours CSV, a daily-report ZIP).
- Daily reports have no shared "reviewed by".
- Members can't leave a company on their own.
Nothing was deployed, applied, committed or written to the database. The SQL was select-only. The repo was not edited.
