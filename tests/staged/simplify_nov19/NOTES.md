# Simplify the daily work flows (staged on r17.10, Nov 19)

Role: simplifier. Source read: `_src/index.html` (r17.10). Not edited. Nothing committed, pushed, deployed or changed on
Supabase (no server queries were needed: every change is client-only).

Apply: `sh patches/apply_all.sh _src/index.html out.html` (01..05 in order; every `rep()` must match exactly once).

How I measured: Playwright at 390 x 844 (phone), fake server rig (`tests/rig`), a foreman with a company (`co.js`), a
pipelayer (`co_pl.js`) and an owner/manager (`co.js + mgr.js`). "Taps" are taps on the page; typing is listed apart.
Sign-up / set-up (tests/r1710/streamline) was not touched.

**Short version:** the daily flows are already short. Mark laid is 2 taps, End Run and Send Report is 1 tap with no
confirmation box, the calculators answer as you type with no Calculate button, the daily report is 3 taps plus typing.
The real problems were (1) a foreman's Home pushes New Run off the first screen, (2) one wrong gray number on the permit
form, (3) small retyping and one wasted tap per calculator, (4) two words for the same thing ("sync" and "sent").

## What I built (patches/, with tests)

| # | Patch | What changes | Before | After |
|---|---|---|---|---|
| 01 | `01_home_start_first.py` | Foreman / pipelayer Home: **Start work** (New Run, Quick Run, Log Work Without a Run, Confined Space Permit, New) sits above the three "Yours" rows (My production, My inspections & tests, Crew runs today). Rows moved whole; nothing removed, renamed or hidden. Company Home untouched. | Foreman: New Run starts at 851 px; the first screen ends at the tab bar, 782 px. New Run is **off the first screen**. | New Run at 620 px, whole tile above the tab bar. No scroll to start a run. (Pipelayer: 449 to 265 px.) |
| 02 | `02_permit_co_placeholder.py` | Entry Permit, Maximum CO: the gray hint in the empty box said **35**. A blank box uses **25 ppm** (label, lock code and the locked permit all say 25). Hint now 25. No limit changed. | hint 35, limit 25 | hint 25, limit 25 |
| 03 | `03_permit_job_from_today.py` | Entry Permit "Job number (optional)": with no Current job chosen it takes the one job this phone ran today (the rule the field ticket already uses; two jobs today: left blank). Still marked auto, so leaving an untouched form asks nothing. | typed again | filled in |
| 04 | `04_calc_cursor.py` | Opening an empty simple calculator puts the cursor in its first box: Trench Sloping, Slope / Grade Converter, Tenths ↔ Inches, Bend Offset, Backfill Lift Count, Manhole Rim-to-Invert, Pipe Weight, Manning's. Not when a value is already there, not on Back, not when opened from a run (depth filled in). Left alone on purpose: Confined Space Ventilation, Material Volume, Bedding, Rod Reading, Flush. No scroll, so the competent-person warning above the trench box stays on screen. | Calculators, Trench Sloping, tap the box, type: **3 taps** | **2 taps** |
| 05 | `05_words_sent.py` | 13 strings: "sync / synced" becomes "send / sent" on Home's My production line, the My production screen and Field tickets (Home already says "Not sent" and "Sending the report to the office"). Active permit: the second air-test button "+ Add Test Reading" is now "+ Log Air Test", the same name as the first. Words only. | "What you logged and its sync state", "Sync Now", "All production synced." | "What you logged, and what's sent", "Send Now", "All production sent." |

Evidence for 02: `_src/index.html:8969` (`placeholder="35"` beside the label "blank uses 25 ppm"), `:29632`
(`maxCO: ... : 25`). Test `t_sim3_permit.js` locks a permit with the box blank and reads "CO at most 25 ppm (standard,
field left blank)" on the active permit.

### Tests (tests/, run against the patched page and the r17.10 page as "before")

Run: serve a folder holding `cur.html` (patched) and `base.html` (r17.10 `_src/index.html`), then
`NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html PB_BASE=http://127.0.0.1:<port>/base.html node tests/<test>`.

| Test | Covers | Result |
|---|---|---|
| `t_sim1_home.js` | Foreman, pipelayer, manager Home before/after: same element ids, same things showing, same words; New Run higher and on the first screen for a foreman; New Run and My production still open; Company Home did not move | ALL PASS |
| `t_sim2_calc.js` | Trench Sloping 3 taps before, 2 after; warning still on screen; value kept = no cursor; the 7 other calculators; ventilation / volume / rod left alone; Back = no cursor; opened from a run's Review = depth filled, no cursor | ALL PASS |
| `t_sim3_permit.js` | CO hint 35 before, 25 after; all five gas hints equal the limits; blank CO still locks at 25; EMERGENCY and DO NOT ENTER still on the active permit; both air-test buttons same name and both open the form; job number filled from today's run, marked auto, leaving asks nothing; two jobs today = blank | ALL PASS |
| `t_sim4_words.js` | The reworded strings; no "sync" left on those screens; nothing else on My production changed | ALL PASS |

Existing tests on the patched page (`run_all.sh --only`, one at a time): see "Regression subset" at the end.

Golden files expected to change (not updated): `tests/expect/bughunt_nov17__critic__w1.js.txt`, `...critic__w3...`,
`...critic__w4...` (they print Home top to bottom: the order of the Yours rows and Start work, and "sync state"),
`...cs2__s1...` ("Add Test Reading"), `...sync__t03_roles...` ("sync state" / "Sync Now").

Limit of 04: tested in Chromium. On an iPhone the keyboard only comes up by itself when the cursor is placed during the
tap; Trench Sloping opened from a Home shortcut reads the saved soil type first, so there the box may get the cursor
without the keyboard (one tap, as today). Needs a look on a real iPhone. No way to make it worse than today.

## The flows, step by step

### 1. A run: start, lay, check, end, report

| Step | Taps / typing | Unneeded or unclear | Fix |
|---|---|---|---|
| Home to Run Setup | 1 tap (New Run). For a foreman it was below the first screen: scroll first | New Run hidden under crew cards and Yours rows | **Built (01)** |
| Run Setup, common run | Job number + jobsite (kept from the last run), pipe size (1 pick), 2 stake photos or 3 numbers per stake, rod reading x2. More settings stays closed. | Already cut down in r16.95 (t123). Nothing to remove. | None |
| Review & Calculate, then Lock This Run | 2 taps. Lock is at the bottom of "Check Before Locking" (about 1,600 px), under the Backflow and Deep Trench warnings | The scroll is the point: it takes you past the warnings | **Leave.** A Lock button pinned to the bottom of the screen would look simpler and let a foreman lock without seeing the trench warning. Not recommended. |
| "Which Job Is This Run On?" | Only asked when no job number was typed and no Current job is chosen | Fine | None |
| Mark pipe laid | 2 taps: the distance, then "Mark laid to here". No confirmation. | Nothing | None |
| Check shot | Same menu: distance, "Check shot" | Nothing | None |
| Copy a reading | Tap the number, then Copy Number / Copy With Context | Nothing | None |
| End the run | 1 tap: End Run and Send Report. Lands on Home with the report card (View Report, Save PDF, Add a note for the office). No box. | Nothing | None |
| Edit Run Data | 1 tap from Run Results, opens the form with Cancel / Review & Calculate | Nothing | None |
| Run report PDF | View Report or Save PDF: 1 tap from Results or from the Home card | Nothing | None |
| Words | Home tile "New Run: Start a new pipe run calculation", screen title "Run Setup", "Quick Run: Basic grade calculations" | Three names around one thing (New Run / Run Setup / pipe run calculation) | Proposed (decision 4) |

### 2. Calculators

| Step | Taps / typing | Unneeded or unclear | Fix |
|---|---|---|---|
| Open app to an answer | Calculators tab, pick one, tap the first box, type: 3 taps. From a Home shortcut: 2 taps. | The tap into the first box | **Built (04)**: 2 taps, or 1 from a shortcut |
| Calculate | None: the answer shows as you type | Nothing | None |
| Defaults | Trench soil remembers the last one used (per account). Bend angle 22.5, Manning n 0.013, lift 0.30. | Sensible | None |
| Last values | Kept while the app stays open; cleared when the app is closed | Fine for a calculator; a kept depth from yesterday would be a wrong-answer risk on the trench one | Leave |
| The list | 15 calculators in 5 groups with jump buttons; search is on More, not on Calculators | A search box on Calculators would save a scroll | Proposed, small |

### 3. Daily report, notes, tickets, hours

| Step | Taps / typing | Unneeded or unclear | Fix |
|---|---|---|---|
| Home to Daily report | 1 tap. Job number filled in from today's run, date is today | Nothing | None |
| Narrative, then "Next: Hours & Sign" | typing + 1 tap. Runs, materials, crew (8 h), attached reports fill themselves | Nothing | None |
| Sign & Send | "Your full name" typed the first time (after that it is kept from the last signed report), 1 tap | First time: the app already knows the account's name (Run Setup shows "Foreman: Tommy Fontaine (your account)") | Proposed, not built: it is a signature (decision 2) |
| Add note | 1 tap from Home, sheet with note, photo, reminder, Save | Nothing | None |
| Field ticket | Home, New, Field ticket: 2 taps. Take Photo / Read Ticket With AI fills the rest. Job number filled from today's run | "New" on Home lists "Work without a run", which is also its own Home tile right above it | Proposed (decision 3) |
| Clock in / out | **There is no time clock in the app.** Hours are on the daily report (Crew Today). The run's Break button says itself that it "is for the run's stats, not a time clock" (`_src/index.html:45809`) | Nothing to simplify | None |

### 4. Confined space permit (presentation only; no step or warning removed)

| Step | Taps / typing | Unneeded or unclear | Fix |
|---|---|---|---|
| Home to a new permit | 1 tap. "Reuse Last Permit's Hazards & Controls" is at the top | Nothing | None |
| The form | 14 required boxes, all six sections open, about 8,300 px | Long, but every required box is a safety item. | Leave |
| Job number | Typed again after a run on the same job | Retyping | **Built (03)** |
| Maximum CO | Gray hint 35, real default 25 | Wrong number on a safety box | **Built (02)** |
| Lock & Activate, "Entry Supervisor Decides", I Understand | 2 taps | Required | Kept |
| Active permit | EMERGENCY and "DO NOT ENTER" first, then Log Air Test / Log Check, then the roster with Check In | Good order | None |
| Air test | "+ Log Air Test" at the top, "+ Add Test Reading" lower down: two names for one thing | Naming | **Built (05)** |
| Getting back to it | Home shows "Open Active Permit" in Current Work: 1 tap | Nothing | None |
| Closeout | Reason (4 buttons), Close Out Permit | Required | Kept |

### 5. Office / company screens

| Screen | What I saw | Fix |
|---|---|---|
| Company Home (board) | Live now, 5 count cards, Jobs, then links. With no signal the 5 cards are all dashes with "Loads with signal" | Proposed: one line "No signal. Showing what this phone has." in place of five dash cards. Small. |
| Crew members | Text a Join Link first, then invite by email (streamlined in r17.10) | None |
| Records | Type / Date / Job / People filters, Refresh | None |
| Account & Settings | One screen, no sub-levels except Crew members, Company logo, Beta Results, Push notifications. About 2 screens tall | "Push notifications: Not available in this copy of the app" is unclear. Proposed: "Works at app.pipelayersbible.com" |

### 6. Home and navigation

| What | Before | Fix |
|---|---|---|
| Foreman Home, first screen | Current job, Add note / Daily report, My crew now, three count cards, "Nothing in progress", My production, My inspections. **No New Run.** | **Built (01)** |
| Foreman with nobody on his crew yet | Four crew cards (about 300 px) of dashes and zeros | Proposed (decision 1): one line "On my crew: nobody yet. Add crew" until someone is linked |
| After End Run | Report card + "Not sent" card + crew cards push New Run to about 1,250 px (before) | 01 takes 230 px off. The rest is real information. |
| Tabs | Home, Calculators, More, Records, Ask | Clear |
| "Current job: None chosen" | Stays "None chosen" even after a run was locked on a job today | Proposed (decision 5) |

### 7. Words

Built in 05 (13 strings). Still there, proposed as a second pass because they touch many golden files:

- "sync" in about 25 more strings (Records: "Retry Sync", "Sync not confirmed", "Waiting to sync", "Production sync is paused").
- "the company server" / "the server" in about 150 messages. A crew thinks "the office". Most are error messages
  ("The company server isn't ready for this yet"); a few are evidence wording ("Server time", "Server received") that
  should stay exact.
- "session" for a resumed run ("This session only") reads as tech; "this shift" or "today's part" would be plainer.
  Needs Tommy's word for it.
- Permit: "Atmospheric Test Log" / "Latest Air Readings" / "air test": the buttons are now the same; the headings are not.

## Looked simpler, would hide something: not done

- A pinned Lock This Run button (skips the backflow / deep-trench warnings).
- Closing the permit form's sections by default (hides required safety boxes).
- Keeping calculator values after the app is closed (yesterday's trench depth giving today's slope).
- Hiding the foreman's crew cards whenever the numbers are zero (a zero is information when he has a crew; only the
  no-crew case is proposed).
- Auto-focusing the Confined Space Ventilation calculator (the keyboard would cover the "not an OSHA number" text).

## Decisions for Tommy

1. **Foreman with no crew linked: one line instead of four crew cards?** Recommend yes. Not built: "Run reports to
   approve" may count more than crew, so it needs your rule.
2. **Daily report "Your full name": fill in the account's name the first time?** Recommend yes (it is already filled
   from the last signed report every time after the first). Not built because it is the signature line.
3. **Home "New" tile: drop "Work without a run" from it** when the "Log Work Without a Run" tile is right above it?
   Recommend yes.
4. **One name for a run's set-up.** Home says "New Run", the screen says "Run Setup", the tile says "pipe run
   calculation". Recommend "New Run" as the screen title and "Grade sheet for a pipe run" under the tile. Your call on
   the words.
5. **Set Current job by itself** to the job of the first run locked today, when none is chosen? Recommend yes: the
   daily report, ticket and (with 03) the permit already work it out; the Home card is the only place that still says
   "None chosen".

## Regression subset

`tests/run_all.sh --build <patched page> --only 't116_|t120_|t103_|t104_|t124_|t131_|t109_' --jobs 1`: **8 of 8 pass**
(t103_aireads, t104_permitack, t109_crewnotice, t116_quickwork, r_t116_quickwork, t120_csrecord: output matches golden;
t124_crewview 26 PASS; t131_trench20 PASS). The full regression was not run (shared machine). The five golden files
listed above were not run; they are expected to differ only in the ways listed.

## DONE
