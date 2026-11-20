# Office view on a computer (Nov 20)

Role: office view on a computer. Built on a COPY of the r17.11 candidate (`/tmp/claude-0/r1711/src.html`, never edited).
Nothing was committed, pushed or deployed. The server was only read (function definitions, with SELECT); no data read,
nothing written. `_src/index.html` and `index.html` were not touched.

What the critic said (critic_nov19 NOTES.md, H; `shots/c_owner_desktop_records.png`): "Office on a computer is a phone in
the middle of a monitor. Home uses the width. Records is a 560 px column... A super checking four crews wants one table:
crew, job, feet today, report in or not, permit open or not."

## What I built (two patches, stacked, on the candidate)

    python3 patches/p01_today_table.py  /tmp/claude-0/r1711/src.html  s1.html
    python3 patches/p02_records_table.py s1.html                       out.html

Each uses an exact-once `rep()`; the code lives beside them in `patches/ov_today.js`, `ov_records.js`, `ov.css` (the
patch scripts read those files). p02 needs p01. Source page +33 KB (9,343,008 -> 9,376,340 bytes); minified page +26 KB,
+7 KB gzipped.

### 01. "Today": one table across all crews (company accounts, 1024 px and wider)
On the office Home, right under the tiles and above Jobs. One row per crew (its foreman) and job. Ten columns:

| column | what it shows | where it comes from (all existing calls) |
|---|---|---|
| Crew | foreman, and who on the crew sent something today | `pb_prod_company_live` (people, role, linked foreman) |
| Job | job number and name | the run / permit / record; name from `pb_prod_company_dashboard` |
| Runs | "2 active · 1 ended" | `pb_prod_company_live` |
| Laid today | feet marked laid today | same; added up with the app's own `pbLvToday` (the rule Live now uses) |
| Fittings | the count on the signed daily | `pb_daily_get` of today's signed daily (fittings "counted by the app"; MJ kits left out) |
| Permits | open permits, people inside in red, EMERGENCY and "air outside limits" in red | `pb_prod_company_live_permits` |
| Daily | "Signed 2:10 PM" or "Not yet" | `pb_reports_feed`, today only |
| Tickets | field tickets sent today | `pb_reports_feed`, today only |
| Delays | count and hours | `pb_reports_feed`, today only |
| Last sent | newest thing the crew's phones sent | the newest of all the above |

- Foremen who sent nothing today get a grey "Nothing sent today" row (names from `pb_reports_people`, the list Records'
  People filter already loads).
- A click on a row (or Enter on the crew name) opens that crew's detail under the row: every run (who, where, how far,
  last update), each open permit (people inside, last air reading, the emergency line with "This board alerts no one."),
  what was sent today (each one opens the record, the same way a Records row does), and "Open Job 26014".
- Every heading sorts (click again to turn it round); crews with nothing sent stay last.
- The line under "Today" says how fresh it is. It keeps the wording already on the board: "What crews' phones last sent.
  Not live if a phone is offline, and nobody is alerted from here."
- No signal: the last saved copy shows, with "Copy from 2:30 PM. No signal." (the board's own saved copy, plus the
  table's part saved the same way, per account). If the saved copy is from an earlier day it says which day.
- No new server call. One extra ask of an existing function: `pb_reports_feed` with from = to = today and types
  daily / ticket / event, at most once a minute while the office Home is open on a computer, plus `pb_daily_get` once
  per signed daily of today (at most 8). A phone never makes these asks (tested).

### 02. Records is a full-width table on a computer (company accounts)
Same rows, same filter chips above, same click-to-open as the list. Columns: When, Type, Record, Job, By, Status. Every
heading sorts; a "Find in these rows" box narrows what is on screen and says "2 of 8 shown". Records (and the older All
reports page) now take the wide page (up to 1200 px) instead of the 560 px column; everything else on Records keeps a
readable width. Narrow the window to a phone width and the list comes back.

### 03. Phone and field accounts: unchanged
Everything hangs off the company-account switch the app already has (`html.pb-cx`) plus the 1024 px width. Tested
against the unpatched candidate: company account at 390, and foreman and pipelayer at 390 and 1440, read the same,
row for row.

## Screenshots (`shots/`)
- `ov1_home_1440.png`, `ov1_home_1280.png`: office Home with the Today table.
- `ov1_today_open_1280.png`: a crew's row opened.
- `ov1_offline_1280.png`: no signal, the saved copy with its time (also shows an emergency and air outside limits).
- `ov2_records_1440.png`, `ov2_records_1280.png`: Records as a table.
- `ov3_company_home_390.png`, `ov3_company_records_390.png`: the company account on a phone, as before.

## Tests
New, in `tests/` (see `tests/README.md`; they use `tests/rig` and one fake company day in `lib.js`):

| test | checks | result |
|---|---|---|
| `t_ov1_today.js` | 1440 and 1280: table on Home, uses the width, fits, nothing off the side; every number matches the fake server data (260 ft, 2 active · 1 ended, 2 inside in red, 2 tickets, daily signed 2:10, 3 fittings, 1 delay 1.5 h, yesterday's daily and a closed permit not counted); one feed ask with the function's existing arguments; sorting; the row detail; emergency / bad air; Open job; no signal shows the saved copy with its time | 36 pass |
| `t_ov2_records.js` | 1440 and 1280: one table across the page, 8 rows matching the server data, no cut-off status chip, sort by job / who / when, find box, click and keyboard open a row, narrowing to 390 brings the list back | 22 pass |
| `t_ov3_phone_field.js` | company at 390; foreman and pipelayer at 390 and 1440: no tables, no extra server ask, same text and same Records rows as the unpatched candidate | 23 pass |

t_ov1 and t_ov2 also pass on the minified hooks build.

Existing office tests, one at a time (`tests/run_all.sh --build <hooks build> --jobs 1 --only ...`), against a hooks
build of the patched page (`python3 tests/r1708/speed2/build/build.py <page> <outdir> --hooks`, the repo's non-test
files copied in first, then the candidate's sw.js / legal pages over them): **28 of 28 pass**: t124_crewview,
t128_betaresults, r1706/office3 (all 6), bughunt_nov17/office b1-b7, c1, d1, d2, m1, n1, s1, t1, x1, and office2 (all 5).
After the last small change (the no-signal line) I rebuilt and re-ran 7 of them (b3, c1, s1, x1, office3 34_36 and
37_38_39, office2 t04): all pass. Not run: the Ask, stake and plans tests of the office suite (a1-a4, p1-p3), and the
rest of the regression (shared machine; the lead runs it).

## Golden files expected to change
None. The golden-judged office tests (b1, b3, b6, c1, m1, n1, s1, t1, x1) match their goldens on the patched build. The
rig runs at 400 px wide, where neither patch draws anything. If a test outside the office set measures page size, it
will see the +26 KB.

## Limits and things to know (checked, not guessed)
1. **Tested on the rig only.** I could not sign in to the live app. The fake answers follow the live functions'
   definitions, which I read on the server (`pb_prod_company_live`, `pb_prod.live_row`, `pb_prod_company_live_permits`,
   `pb_reports_feed`, `pb_prod.rpf_item`, `pb_daily_list`, `pb_prod_company_dashboard`). Worth one look with a real
   company account before it ships.
2. **Fittings only show after the daily is signed.** The live status a phone sends has no fittings in it
   (`pb_prod.clean_status` keeps a fixed list of fields; fittings is not one). Before signing the cell is "–".
3. **Delays show once the daily is signed** (the feed's delay rows belong to a signed daily: `pb_daily.events.report_id`).
   Site notes ("Add note") are not in the table: the office can only read them one job at a time (`pb_prod_job_site_log`).
4. **Rows are keyed by the foreman's name.** The live board gives a pipelayer's foreman as a name, and
   `pb_prod_company_live_permits` gives a permit's holder as a name (`who`), not ids. Two foremen with the same name in
   one company would share a row. Records sent today (daily, tickets, delays) are matched by the sender's id.
5. **Between 1024 and 1279 px wide** the Today table is wider than its box and scrolls sideways inside the box
   (the page itself does not). It fits from 1280 up.
6. **Only Records became a table.** The lists opened from the Home tiles (Live now, Run reports, Daily reports, Delays,
   Material alerts, Waiting on foremen) are still card lists capped at 860 px (`#screen-cxList .pbx-rows`), and Crew
   members and Company permit records are still the phone column. Records already holds runs, dailies, permits,
   inspections, delays and tickets in one table with a type filter, so I stopped there.
7. **English only.** The new headings and lines are not in the candidate's Spanish dictionary.
8. The app hides any line that only says "No signal." when offline (its banner says it once). The table's line leads
   with the copy's time so it stays on screen; the test checks that it is visible.

## Proposed, not built (each needs a server change, so I did not do it)
- **Fittings live, per crew:** add a fittings-laid count to the status the phone already sends
  (`pbLiveStatusOf` on the phone, one more field in `pb_prod.clean_status`). Then the Fittings column fills during the
  day instead of after the daily.
- **Permit holder's id** in `pb_prod_company_live_permits` (one more field), so a permit is matched to its crew by id.
- **One function for the table** (say `pb_prod_company_today(p_today)`): crews, runs, permits, today's daily, tickets,
  delays and site notes in one answer, including delays and notes before the daily is signed. Today the office page
  stitches four answers together.

## Decisions for Tommy (5)
1. **Ship the Today table on the office Home for computers?** Recommend yes. It is the one thing the critic said a
   super wants, it adds no server work, and a phone never sees it.
2. **Fittings column: keep it though it is blank until the daily is signed?** Recommend keep it, and add the fittings
   count to the phone's live status in the next server round so it fills during the day. If you'd rather not show a
   mostly empty column until then, it is one line to drop.
3. **Show foremen who sent nothing today as grey rows?** Recommend yes: "who hasn't reported" is half of what a super
   looks for. Drop them if you think it reads as calling people out.
4. **Records as a table on a computer?** Recommend yes. Next in line, if beta offices ask: the same table treatment for
   "Run reports to approve" and "Daily reports".
5. **Should a tablet held sideways (1024 px and up) get the table too?** It does now, with the table scrolling
   sideways inside its box below 1280. Recommend leaving it; say so if you want tablets to keep the card layout.

## DONE
