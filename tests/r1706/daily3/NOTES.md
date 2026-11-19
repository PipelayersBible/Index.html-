# daily3: daily report decisions #44-#50 (staged on r17.04)

Tommy's answers (Nov 18) for the daily report, built and staged here. Nothing is applied, deployed or committed.

| # | Decision | What was built |
|---|---|---|
| 44 | Break stays off the daily's hours (the foreman decides) | No change. The new default below does not take a Break off. |
| 45 | Crew hours default: 8 h, unless the crew's first start to last stop that day is more than 8 h; then that | patch 02 |
| 46 | Second job the same day: keep r17.00's way | Kept; works on top of the new default (tested) |
| 47 | Night shift: runs started after midnight stay with the shift's report | patch 01 |
| 48 | Job Book near misses, incidents, stop-work on that day's daily and its PDF; plus a company-side search | patches 03, 04; sql/01 |
| 49 | Customer signature on extra work (field tickets) | patch 05; sql/02 |
| 50 | New run offers the last run's crew in one tap | patch 06 |

## How to build and apply

    tests/staged/daily3/build.sh /tmp/somewhere      # patches 01-06 on index.html (r17.04), node --check, hooked copy
    # -> /tmp/somewhere/site/index.html (the release) and /tmp/somewhere/serve/hk/curT.html (for the tests)

Patches are `python3 patch.py in.html out.html`, exact-once anchors, in this order: 01 (night shift) is first because
02 uses its `pbDlyRunDay`. Each one also applies alone on r17.04 except 02 (needs 01 for the night shift; without it,
it falls back to the start day) and 05/06 (independent).

SQL (apply with the release, either order; both rolled-back tested live, see Tests):
- `sql/01_safety_search.sql`: `public.pb_jb_safety_search(...)` + a partial index. SECURITY DEFINER, `search_path ''`,
  execute revoked from public/anon, granted to authenticated. Managers only (`pb_prod.managed_company`).
- `sql/02_customer_signed.sql`: `pb_daily.event_json` adds `customer_signed` and `amended_after_signature` (read from
  the signed report's own snapshot; no new column, `events_store` untouched). Grants unchanged.
The app works before the SQL is applied: the search says "The company server isn't ready for this search yet", the Home
tile stays hidden, and the office list shows no signature tag (the key is missing, so it says nothing).

## What was built

### #47 Night shift (patch 01)
- A run's report day (`pbDlyRunDay`): runs on this phone (any job), in start order. A run that starts before noon
  (company zone) belongs to the day before when that day's shift is still going: it starts no more than 4 h after the
  shift's last stop, or while one of the shift's runs is still open. Once the shift's report for that run's job was
  signed (signed before the run started), a later run starts the new day as before. Memoized per archive/report state.
- Used everywhere the daily decides "runs of this day": the runs it pulls in (and so the crew log, materials, run notes,
  the crew fill, the "changed after signed" check), the jobs list for a day, r17.00's open-on-the-shift's-day, and the
  missing-reports list. The open note now says "your shift started then, and its runs after midnight are on this report".
  The PDF's runs source line says the rule.

### #45 / #46 Crew hours default (patch 02)
- Everyone's box on Crew Today starts at the crew's day: 8 h, or first start to last stop when that is longer (to the
  half hour, at most 24). First start / last stop = this phone's runs reported on that day (any job, so a two-job day is
  one day; a night shift crosses midnight), the crew's check-ins/outs on them, his crew's runs, an office fill-in's runs.
- Before, a person on the Crew log got his logged run time (setup, travel and gaps dropped). The logged time is still
  on the signed report (`log_h`), the snapshot gets `crew_today.day_default {hours, first_start, last_stop, rule}`.
- A line under Crew Today says why: "Hours start at the crew's day: first start 7:00 AM to last stop 5:30 PM, 10.5 h.
  Change any box that is wrong." (or "Hours start at 8 h ..."). "Auto" after an edit goes back to the default.
- #46 unchanged in logic: default less the hours on his other signed report(s) that day. With the day now being the
  whole day across jobs, the two reports add up to the crew's day (tested: 12 h day, 24-017 signed Joe 9 / foreman 10.5,
  24-020 defaults Joe 3 / foreman 1.5).
- Equipment keeps its own default (unchanged).

### #48 Job Book safety on the daily (patch 03)
- New snapshot section `safety_events {source, items[]}`: the job's Job Book safety events dated that day (all five
  kinds; a night shift's events after midnight up to the shift's last stop go with the shift). With signal the job's
  list is loaded again (merged the Job Book's way, higher version wins); without, the phone's copy plus entries not sent
  yet ("saved on this phone, not sent yet").
- Screen: a "Safety (Job Book)" card (left out when none). Incident and Stop work also show under Needs attention (card
  and PDF). PDF: "Safety events (Job Book)" section + a line in the summary. Before signing, a change is named
  ("safety events (Job Book)"); on a signed day, a later change gets r16.98's "changed after you signed" warning.
- The office copy is the same snapshot and the same PDF builder, so it shows there too.

### #48 Company search (patch 04, sql/01)
- Office Home tile "Safety events" (count of the last 30 days; hot when an Incident or Stop work is in the last 7).
- Screen "Safety events": Job (jobs that have events), Type (the five kinds, any number), From / To (default the last
  90 days), Who (logged by, or a name under People involved). Newest first, 50 a page, Show More. Each row: kind, date,
  time, job, what happened, what was done, people, logged by, open/closed, photos, and Open Job Book (Safety tab; Back
  returns to the search with its filters). No signal: the last search kept on the phone, with its time.
- Foremen get "The company account, managers and PMs search safety events" (server refuses them too).

### #49 Customer signature on extra work (patch 05, sql/02)
- An Extra work entry (one he typed, not one from run notes) gets "Customer Signs": a full-screen sheet with what is
  signed (reason, detail, hours, crew, equipment, photos, job, day), "By signing, you confirm this extra work was done as
  described above.", a pad, Customer name (required), Title (optional), Sign / Cancel.
- Stored with the entry (`cust_sig`): name, title, ISO time, the phone's zone, the drawn PNG (600x200) and its SHA-256,
  and the SHA-256 of the entry as signed (jsonb text form, like the app's other fingerprints). Kept in the daily's draft
  (critical store), so it works with no signal and survives a closed app; it goes to the company inside the signed
  daily report (snapshot `events[].cust_sig`, covered by the report's fingerprint), like the entry's photos.
- A signed entry is a record: no Change or Remove (Remove explains why). Amend keeps every signed version on the entry
  (`prior[]`, with its signature, at most 5) and the changed entry needs a new signature; an unchanged "amend" is refused.
  Removing a machine from the day does not touch a signed entry. An amendment of the daily keeps the signatures.
- Ticket PDF (on the entry, and on the signed daily's card): Extra Work Ticket with the work, the signature image, who /
  title / when, the fingerprint check, earlier signed versions, integrity section. The daily PDF: "Customer: signed by
  ..." in the entries table, and a "Customer signatures" block with each image and earlier versions.
- Size guard: signing the daily is held if the signatures pass 240 KB (the server takes snapshots up to 400 KB).
- Office Delays & extra work list: "Customer signed · Pat Owner" / "No customer signature" (after sql/02).

### #50 Last run's crew (patch 06)
- On a run that hasn't ended, the Crew & Equipment Log shows "Last run (today): Joe Laborer, Sam Operator, Mini Ex #4"
  and a 48 px "Same Crew as Last Run (3)". One tap adds everyone from this phone's previous run who isn't on this run
  yet (type, category, Rental mark kept), checked in now, in one save (reverted if the save fails). Works offline.

## Tests

Browser tests (tests/, verdict style, `tests/run.sh http://127.0.0.1:PORT/hk/ OUTDIR` against a build's serve folder (logs, PDFs and 390 px light/dark screenshots of the last run in tests/out/);
they use the daily2 audit helpers, 390 px, light and dark screenshots, offline steps, PDF text via pdftotext):

| test | checks | result |
|---|---|---|
| t01_crew_default.js | 8 h on a short day (Joe logged 2 h); 10.5 h first start to last stop; the line; typed 9 h wins; log_h and day_default on the signed report; #46 second job 12-9=3 / 12-10.5=1.5; offline same; 390 light/dark | 13 PASS |
| t02_night_shift.js | 00:30 run (same job) and 03:30 run (other job) on the shift's day; offline opens Mon on the last run's job with the note; Mon 24-017 has both runs (160 LF); crew day 19:00-05:00 = 10 h; Tue has none; signed; PDF lists both runs and the rule; a run after the signed report goes to Tue; afternoon run own day; 390 light/dark | 12 PASS |
| t03_safety_daily.js | card: today's near miss + stop work only; done/people; Needs attention; offline: phone's copy + unsent First aid; sign offline; snapshot 3 events in order; PDF section, Needs attention, rows, unsent mark; sent with signal; event after signing -> "changed after you signed"; 390 light/dark | 12 PASS |
| t04_safety_search.js | Home tile; opens screen; first search; job filter list; filters sent; result fields; chips; Open Job Book on Safety + Back keeps filters; Show More; offline last search; server without the function; 390 light/dark | 15 PASS |
| t05_customer_signature.js | sheet content; needs drawing and name; offline: stored with entry (name, title, time, zone, PNG, SHA-256s) and in the stored draft; record (no Change/Remove, Amend); Remove refused; ticket PDF text + image; Amend keeps signed version, unchanged amend refused; re-sign; daily signed offline keeps both; daily PDF signatures + earlier version + fingerprint; signed card ticket PDF; sent with signal; daily amendment keeps it; office tags; foreman can't open the search; 390 light/dark | 26 PASS |
| t06_last_run_crew.js | first run no offer; offer names 3 and when; 48 px; one tap adds 3 with type/category/Rental, checked in, offline; offer gone; only who is missing; not on an ended run; 390 light/dark | 9 PASS |

The daily2 audit suite (t01 two jobs, t02 night shift, t03 undo, t04 changed after signing) passes on this build.

SQL, rolled back (function + DO block in one query, ends in `raise exception 'RESULT: ...'`; checked afterwards that
neither function change nor any test row was left):
- `sql/t01_safety_search_test.sql`: `RESULT: PASS  all=3 job1=2 kinds=2 range=1 who(people)=1 page=1/3 jobs=2
  badkind=pb:bad_kind baddates=pb:bad_dates wronguid=pb:wrong_account foreman=pb:not_company_account otherco=1
  anon=pb:signed_out` (void and non-safety rows left out, other company isolated, grants: no anon, authenticated yes).
- `sql/t02_customer_signed_test.sql` (a foreman signs through the real `pb_daily_submit`, the office reads
  `pb_daily_events_list`): `RESULT: PASS  submit=true/ events=3 e1=Pat Owner/Owner's rep e2=null e3=true/null`
  (no PNG in the list; every older event still reads).

Full regression on this build (`tests/run_all.sh --build <build>/site/index.html --jobs 2`, 212 entries): pass 190, FAIL 6,
xfail 1 (the known grade2 one), skip 15. Summary in `test_updates/regression_summary.txt`. The 6:
- 3 intended changes, new expected files in `test_updates/expect/` (copy into tests/expect/ with the release):
  `critic/w1.js` (the screen list has `screen-safetySearch`), `office/s1_smoke.js` (the RPC list has
  `pb_jb_safety_search`, called by the Home tile), `safety/d2.js` (the runs' source line now says the night shift rule).
- 2 fail the same way on the live r17.04 build (checked on it today): `safety/p6.js` (permit window date: the golden
  says Nov 18, today is Nov 19) and `offline/rig/t10_quota.js` (one extra "Save failed (room)" console line).
- 1 timing: `cs2/s1.js` failed in the 2-worker run (permit window "Not started"), passes alone on this build and on live.
The daily2 suite (two jobs, night shift, undo, changed after signing) passes.

## Found, not mine (pre-existing)
- A daily built with signal and signed with none shows "The day's records changed since you opened this report.
  Changed: other crews' production." once: `pbDlyOtherProd`'s source text differs with and without signal ("could not
  be loaded" vs "not loaded (no signal...)"), and the pre-sign check compares the whole pulled-in text. One extra tap,
  but it reads like something changed. Fix: keep that source line the same (my safety section already does). Seen in
  t05 (the test signs twice when it shows).

## What's left
- The server's own missing-reports list (`pb_daily_missing`) and crew members' runs (`pbFmCrewRunsFor`, keyed by the
  pipelayer's `workDate`) still use the calendar day; a night shift can show Tuesday "missing" on the office side or a
  pipelayer's after-midnight run on Tuesday. Needs the same rule server-side (run records have start/end).
- The customer's signature reaches the company only with the signed daily (decision 1 below).
- Job Book rework hours are still not on the daily (only run-note rework); not asked for.
- The ticket PDF is saved on the phone; a Share to the customer is not built (decision 2).

## Decisions for Tommy (recommendations)
1. **Send a signed ticket to the company right away** (before the daily is signed), so the office sees it the same hour
   and it isn't lost with a phone. Recommend: yes, as a small follow-up (one RPC + a queue like the Job Book's).
2. **Give the customer a copy on the spot**: a Share button on the ticket (text or email the PDF from the phone).
   Recommend: yes; it's the PDF that already exists.
3. **Night shift window**: a run before noon within 4 h of the shift's last stop stays with the shift. Recommend: keep
   4 h / noon; a crew that works past noon after a night start is rare, and the foreman can still pick the date.
4. **Equipment hours default**: leave machines on their own default (logged / 8 h less down), not the crew's day.
   Recommend: leave it.
5. **Safety on the daily**: all five Job Book kinds are listed; only Incident and Stop work go under Needs attention.
   Recommend: keep (first aid and property damage still show, without the red flag).

## DONE
