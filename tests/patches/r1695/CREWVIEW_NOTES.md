# Crew View: a read-only copy of the locked run on a linked crew member's phone (on r16.94)

Folder: /tmp/claude-0/feat/crewview/ (cur.html = r16.94 + patches, served on port 8872).

## Findings (before building)

### 1. When does a locked run reach the server today?
- **The whole run record already goes up while the run is open, not only at the end.** `pbRrSend()` (r15.1 "PM RUNS",
  around line 63554 of r16.94) sends every run in Records from the last 21 days with `pb_prod_run_record_put` whenever
  its record changes (hash of `pbRrOfficeCopy(e)` + company). A run is in Records (runArchive) from Lock on, so the
  record goes up after Lock. There's nothing that waits for the end (only `pbRfEndHeld`, an end not saved yet, holds it).
- What is sent is `pbRrOfficeCopy(e)`: the full entry, with photo / file data taken out (photos go to run-photos
  separately). That includes `intervalRows` (station, stationFt, bop / inv / top rod readings, sgDisp, elevation,
  labels), `pointInputs`, `runStations`, and `laid` (`marks` per row + the `log` with phone times and account ids).
  So the full grade sheet and the laid marks are already in what's sent.
- **When it is sent**: a 60 s `setInterval` (`pbRrSoon(0)`), the `online` event (7 s), coming back to the app (5 s),
  account load (8 s), Send Report. Nothing nudges it at Lock or at a laid mark, so the first copy can lag up to a
  minute, and a laid mark the same. Offline: nothing is lost; the hash differs from the last one sent (`rrSent`), so the
  next pass after signal returns sends it. That IS the queue (the record lives in Records; the "queue" is "hash differs").
- Only for a company member (`pbProdAccMem.member`), with the account that owns Records. 600 versions / user / day quota
  on the server (`run_record_versions`, insert-only, every change kept).
- The live status (`pb_prod_run_status_put`, queued in `liveStatusQ`) is separate and small: laidFt, laidToFt,
  laidToStation, rowsLaid, totals, job. It is queued at Lock and at each laid mark (`pbLiveNoteRun`).
- Conclusion: no second sync path is needed. The smallest change is to nudge the existing send soon after Lock and after
  each laid mark (hooked where the live status is queued), so the company copy is seconds behind, not a minute.

### 2. Who can open a run's report today?
- `pb_prod.rr_can_open(viewer, company, pipelayer(=author), entry)`: the company's office (`managed_company`), or a
  foreman of that company who is the run's foreman: `run_foreman` (the foreman picked on the run, else the pipelayer's
  open crew link), or the foreman who saved crew production for it (`crewrun_for`).
- `run_foreman` is only non-null when the author is a pipelayer. A run locked by a foreman has no "run foreman": only
  the office opens it today.
- `pb_prod.crew_links (company_id, foreman_id, pipelayer_id, started_at, ended_at, ...)`, one open link per pipelayer
  (`prod_crew_links_one_foreman`).
- "Linked crew" for this feature:
  - run made by a **foreman F**: the pipelayers with an open crew link to F in F's company.
  - run made by a **pipelayer P**: the run's foreman F = `run_foreman(company, P, entry)` (pick, else P's link); the
    linked crew are the other pipelayers with an open link to F. A run P sent "office only" (pick 'none') has no
    foreman, so no crew sees it. F himself already can (rr_can_open).
- Live data seen read-only: 1 open link (foreman 4fc9… -> pipelayer 8cd3…), and that foreman's run 1794857523499.

### 3. Is there a read-only viewer already?
- The office's run viewer (`pbRrOpen` / `pbRrCrewOpen`, `pb_prod_company_run_get` / `pb_prod_crew_run_record`) opens
  the record and shows the report as text / PDF (`pbRrView`), with production and setup forms. It is not a grade sheet
  with big numbers, and its RPCs are office / foreman only (crew can't call them).
- The Results grade sheet (`renderResultsTable`) is tied to the current entry and editing (row menus, notes, laid
  swipe). Not reusable as-is. Reused instead: its column labels (`PB_RS_COLS`, the person's own column pick
  `pbRsColsShown`), the row key (`pbLaidKey`), the station helper (`pbStRowStaFn`), the row strip names
  (`pbRowStripName`), and the laid band look (`pb-laid` classes style). A small read-only table is drawn from those.

## Design
- Server (sql/01_crew_view.sql):
  - `pb_prod.rr_crew_can_view(viewer, company, author, entry)`: `rr_can_open(...)` OR (viewer is a pipelayer of that
    company, not the author, with an open crew link to the run's foreman as defined above, that foreman still a
    foreman of the company). Same company always (my_company = run's company).
  - `public.pb_prod_crew_view_list()`: runs in the viewer's company locked in the last 36 h, not deleted, not the
    viewer's own, that `rr_crew_can_view` allows; newest first, max 20; light rows (who, job, label, times, version).
  - `public.pb_prod_crew_view_get(p_id uuid)`: one run's grade sheet, only whitelisted fields (job, labels, rod unit,
    stations, the grade rows' numbers and labels, laid marks per row: no log, no account ids, no notes, no photos, no
    production, no report text). Refuses `pb:not_your_crew` / `pb:not_found` / `pb:removed`.
  - Both SECURITY DEFINER, `set search_path to ''`, execute for authenticated only.
- Phone (patches/01_crewview.py):
  - Send: `pbLiveNoteRun` (called at Lock and at each laid mark / undo) nudges `pbRrSoon(4000)` via `window.pbRrNudge`.
  - Home: a "Crew Runs Today" button for a crew member of a company (role pipelayer or foreman, not the office), in
    the Home tools area. Opens a screen listing runs (who, job, start → end, laid so far, updated time).
  - Tap a run: read-only grade sheet: header "Read-only copy from <name>'s phone, updated <time>", big numbers (Dist.,
    the person's own picked columns), the real station, laid rows banded "Laid 10:42", Next row tagged. No menus,
    no swipe, no editing.
  - Offline / stale: the list and each sheet opened are cached per account (`pbSetFor(uid,'crewView')`, newest 12
    sheets). With no signal it shows the last copy with "Last copy fetched <time> (no signal)". Refresh button.
  - Refusal (`pb:not_your_crew`) shows "Only the run's crew, its foreman and the office can open it." and drops the cache
    entry.

## Server test (rolled back) - run Nov 18 04:30 UTC with the Supabase execute_sql tool
`sql/01_crew_view_test.sql` (creates the 3 functions with EXECUTE inside a DO block, acts as each user with
`set_config('request.jwt.claims', ...)` + `set local role authenticated`, then `raise exception 'RESULT: %'`). Live
data: foreman F 4fc9… (run 1794857523499, locked Nov 16 19:32 UTC, 18 rows, 18 laid marks), pipelayer P 8cd3… with an
open crew link to F, PM e4a0…, outsider X (random uuid, no company). Result:
```
RESULT:  canP_F=true canX_F=false canP_otherAuthor=false canPM_P=true canF_P=true
| P.list=1 P.list.hasF=true P.list.hasOwn=false P.get.who=Brandon Jones rows=18 marks=18
  row1={"bop": "10.33", "inv": "10.25", "top": "9.34", "label": "Sta 0+25", "sgDisp": "—", "pointId": "hub0", "station": "10.0",
        "elevation": "82.80", "stationFt": 10, "layoutKind": "mid", "layoutExact": "", "layoutShort": "Mid"}
  keys=completed,endLabel,id,incomplete,intervalRows,jobNumber,jobsite,kind,laid,lockTime,pointInputs,rodUnit,runEndTime,runStations,startLabel
  hasLog=false bytes=4788 P.getOwn=pb:not_your_crew P.callCheck=denied
| X.list=0 X.get=pb:not_your_crew
| PM.list=1
| F.list=0 F.getOwn=pb:not_your_crew F.getP=ok rows=26
```
Afterwards `select count(*) from pg_proc where proname in (...)` = 0: nothing was kept.
Notes: the list window is 36 h, so this run drops out of the list after Nov 18 07:32 UTC (the check still allows a get).
`rr_crew_can_view` is not callable by users (revoked; only the two RPCs use it). Own runs are never listed or served
(the phone has them; restore exists for a lost phone).

## What changed (patches/01_crewview.py, applies to r16.94 index.html; then `node --check` of the main script: OK)
1. **Send nudge**: in `pbLiveNoteRun`, right after a NEW live status is queued (Lock, laid mark / undo, End, check shot,
   laid move), `window.pbRrSendSoon()` -> `pbRrSoon(4000)`. The existing send (`pbRrSend`, `pb_prod_run_record_put`,
   hash-diff queue, offline-safe, all its account / company / quiet-rule checks) does the rest. No second sync path.
   - Found during the build: `window.pbRrNudge` already exists (feat_rrnudge, the office's "Nudge foreman" button,
     defined later in the file), so the hook is named `pbRrSendSoon`. A first version named pbRrNudge was silently
     overridden; t124 A1/A2 caught it.
   - The anonymous-report quiet rule (`pbAuthBackgroundOk`, 30-120 s after an anonymous report call) still applies
     (privacy design); then the send goes on the next minute tick as before. t124 sets `__pbAuthQuietMs=0`.
2. **Home tile** "Crew runs today" in the "Yours" group (`#homeCrewView`, under My production), shown for a company
   member whose role is pipelayer or foreman and who isn't the office (`pbCvAllowed`, from the server-checked
   `pb_prod_access` answer). Shown/hidden from `pbNavMineSync`. When the phone learns the account is no longer such a
   member, the kept copies are wiped.
3. **Screen `crewView`** (tab Home): the list (who · job, start to end · laid of total ft, Open/Ended · updated time),
   tap a run for the read-only sheet: yellow line "Read-only copy from <name>'s phone, updated <time>" + "You can't
   change it or mark laid here. It updates when their phone has signal."; job / jobsite / start -> end; "Run open · N of
   M rows laid"; table Dist. (with the real station "Sta 1+60.00" and "Laid 8:46 PM" / "Next" under it), then the
   viewer's own column pick from Results (`pbRsColsShown`, default BOP + INV) in 26 px bold tabular numbers; row strips
   for Start / hubs / End names; laid rows striped like Results, the Next row highlighted. No buttons, inputs or menus
   in the sheet. Refresh button (52 px), auto-refresh every 60 s while open and online, and on `online`.
4. **Offline / stale**: list and sheets kept per account (`pbSetFor(uid,'crewView')`; sheets of listed runs + the 12
   newest). No signal: "No signal. This is the list as of <time>." / "No signal. Showing the last copy fetched, <time>."
   A refusal (`pb:not_your_crew` / not_found / removed) or a run gone from the list drops the kept copy.
5. CSS scoped to `#screen-crewView`, app tokens only (light + dark checked, screenshots tests/cv_light.png,
   cv_dark.png, cv_offline.png). 390 px: no sideways page scroll; list rows ~100 px, buttons 52 px.

## Privacy (for the privacy policy)
New: a **pipelayer linked to a foreman (open crew link) can now see, on his own phone, the runs locked in the last 36 h
by that foreman, and by the other pipelayers whose run goes to that foreman** (the run's picked foreman, else their crew
link). A foreman (and the office) could already open those runs; the office/foreman access is unchanged.
What the crew member sees and keeps on his phone (until the run leaves the list, he leaves the crew, or 12 newer
copies): the author's **name**, job number, jobsite, start/end labels, lock time, open/ended, the grade rows (distance,
station, BOP / INV / TOP / subgrade / elevation readings, row labels such as hub names and fitting/layout short labels),
and **when each row was marked laid** (the phone's time), plus the record's last-updated time, distance and laid feet.
Not shown or sent to him: photos, field notes, the laid history (who marked, undo log, account ids), production, crew
hours, report text, corrections, check shots, AI reads, emails, or anything of runs "sent to the office only".
Nothing new is collected: the record already went to the company (r15.1); the change is who can read part of it.
Suggested policy line: "Crew members linked to a foreman can see a read-only copy of that crew's runs from the last day
and a half (grade numbers and when rows were marked laid, with the name of the person who ran it) on their own phone."

## Tests
- tests/t124_crewview.js (rig fake Supabase; `PB_URL` overrides the URL): **ALL PASS** (27 checks): A foreman locks ->
  `pb_prod_run_record_put` in 4.5 s carrying 33 rows with stations and BOP/INV, no photo data; a laid mark -> sent again
  in 4.0 s with the laid marks. B linked pipelayer: tile, list, read-only line, all 33 rows, 2 laid + Next, readings
  match, 26 px numbers, nothing editable, 390 px fit; offline shows the last copy with its time, also after the
  in-memory copy is dropped (from storage). C refused get -> nothing shown, copy dropped; empty list for a non-linked
  user; no tile for the office or a non-member. D dark mode: no errors.
- Repo regression against cur.html on port 8872 (copies in tests/reg/, pointed at http://127.0.0.1:8872/cur.html, their
  screenshots / PDFs / zips redirected to tests/out/ so other agents' files aren't overwritten): **t101-t122, t90, t91,
  t95: all exit 0, `errs []` in every one**; t104 prints its expected `cpError: 15 things to fix...` line. (t95 first hit
  ERR_CONNECTION_REFUSED because the background http server reached its 30-min limit; rerun after restarting the
  server: pass.) Logs: tests/out/*.log.
- Baseline check: the same 25 tests against unpatched r16.94 (tests/base/, tests/outb/): all exit 0, and with ids,
  hashes and clock times masked the outputs match line for line. The only differences are new run ids, photo SHA paths,
  seal fingerprints and times (t101, t102, t108, t110, t120).

## Things the owner should know
- **Server first**: apply sql/01_crew_view.sql before shipping the patch. Without it the tile still shows and the
  screen says "The company server isn’t ready for this yet." (missing function). The send nudge works either way.
- Quota: a record version per change (insert-only `run_record_versions`, 600 / user / day). The nudge (4 s debounce)
  can split marks that the 60 s tick used to group into one version. A normal day of laid marks stays far under 600.
- The anonymous-report quiet rule can hold the send for 30-120 s after an anonymous report call. That's by design;
  the send then goes on the next minute tick.
- Not done in this version (as asked): no editing and no laid marking from the copy, no push to crew phones when a run
  locks, a run's own author doesn't see it in the list (he has it on his phone, and Restore Runs covers a lost phone).
  Runs sent "office only" are never shown to crew.
- The 36 h window is in SQL (`pb_prod_crew_view_list`). Change that one interval to widen or narrow it.

## DONE
Summary: A locked run already went to the company as its whole record (grade rows with stations and rod readings,
plus laid marks) from Lock on, through `pb_prod_run_record_put`. It was sent on a 60 s timer and queued offline
(hash-diff). The one change to sending: a nudge (`window.pbRrSendSoon`), so the copy goes up about 4 s after Lock and
after every laid mark / end / check shot. Measured in t124: 4.5 s and 4.0 s. The hook could not be called
`pbRrNudge`: a function of that name already exists (the office's nudge-foreman button) and silently replaced it.
New server functions in sql/01_crew_view.sql (`pb_prod.rr_crew_can_view`, `pb_prod_crew_view_list`,
`pb_prod_crew_view_get`): SECURITY DEFINER, `search_path ''`, the access check in SQL, grade sheet fields only.
Allowed: the office, the run's foreman, and pipelayers with an open crew link to the run's foreman (the foreman who
locked it, or the pipelayer's picked / linked foreman). Same company only. Never your own run, never "office only" runs.
Tested in a rolled-back DO block against live data: linked pipelayer gets the foreman's 18 rows and 18 marks, and no
laid log; an outsider gets nothing; the PM and the foreman see what they could before; nothing was kept.
Phone: Home > "Crew runs today" (pipelayer / foreman members, not the office), a list, and a read-only big-number grade
sheet with the real stations, laid rows striped with "Laid <time>", a Next row, and "Read-only copy from <name>'s phone,
updated <time>". The last copy is kept per account and shown offline with "No signal. Showing the last copy fetched,
<time>". A refusal or a run leaving the list drops the copy. Works at 390 px, light and dark.
t124 passes (27 checks) and the repo regression (25 tests) passes, with output identical to r16.94 apart from ids
and times. The privacy note above lists what a crew member can now see.
