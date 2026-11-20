# Permit shortener (Nov 19) — resumed after a machine restart

Tommy: "The permit should include only what a permit requires and what the app needs. See what you can do about
shortening it." Then, through the lead: the app is used nationwide, so the permit must be valid everywhere: federal
OSHA plus whatever a state plan adds, by the job's state.

Built on `_src/index.html` r17.10. Two stacked patches, three new tests. Nothing is applied to `_src`, deployed,
committed or pushed. The server was not touched (no server change is needed: the permit record is stored as it is).

## Before / after (phone, 390x844, a fresh form, rig account)

| | Before (r17.10) | After |
|---|---|---|
| Boxes on screen | 42 (31 typing, 11 ticks) | 33 (22 typing or picking, 11 ticks) |
| Boxes that start filled in | 2 (date, 911) + job number when a job is picked | up to 7 (date, start time, 911, how entrants see the permit, job number, jobsite, supervisor) |
| Words | 875 | 485 |
| Height | 8,305 px = 9.8 screens | 4,646 px = 5.5 screens |
| Info folds | 13 | 10 (6 section headings + 4 "More details") |
| Boxes required to lock | 15 | 15 (the same 15) |

(The critic counted 891 words / 10.5 screens with a slightly different account state; same form.)
Screens: `shots/form_before_full.png`, `shots/form_after_full.png` (and `_fold` for the first screen). Numbers:
`tests/m_measure.js` -> `shots/measure.json`; asserted in `tests/t_ps1_form.js`.

Three boxes were added because a rule or an inspector asks for them (meter, its last bump test or calibration, how
entrants see the permit), so the net is 42 - 12 + 3 = 33. All 12 that left the screen are still there behind
"More details"; none was deleted.

## 1. What a permit must contain (sources)

Federal construction rule, 29 CFR 1926.1206 (a)-(p), 16 items. Read Nov 19 2026 at
https://www.law.cornell.edu/cfr/text/29/1926.1206

| Item | 1926.1206 (construction) | 1910.146(f) (general industry) | Cal/OSHA 8 CCR 1955(a) (construction) | Cal/OSHA 8 CCR 5157(f) |
|---|---|---|---|---|
| Space to be entered | (a) | (1) | (1) | (1) |
| Purpose | (b) | (2) | (2) | (2) |
| Date and authorized duration | (c) | (3) | (3) | (3) |
| Entrants, by name or a roster/tracking system | (d) | (4) | (4) | (4) |
| How a rise in air hazard is detected if ventilation stops | (e) | not listed | (5) | not listed |
| Attendant(s) by name | (f) | (5) | (6) | (5) |
| Entry supervisor by name + signature or initials | (g) "each entry supervisor who authorizes entry" | (6) "who originally authorized entry" | (7) | (6) |
| Hazards of the space | (h) | (7) | (8) | (7) |
| Isolation / control measures | (i) | (8) | (9) | (8) |
| Acceptable entry conditions | (j) | (9) | (10) | (9) |
| Test results, tester names or initials, when | (k) | (10) "initial and periodic tests" | (11) | (10) |
| Rescue and emergency services, how to summon | (l) | (11) | (12) | (11) adds services "that can be provided on-site" |
| Communication procedures | (m) | (12) | (13) | (12) |
| Equipment: PPE, testing, communications, alarms, rescue | (n) | (13) | (14) | (13) |
| Other information needed for safety | (o) | (14) | (15) | (14) |
| Other permits (hot work) | (p) | (15) | (16) | (15) |

Sources: 1910.146 https://www.law.cornell.edu/cfr/text/29/1910.146 ; 8 CCR 1955 https://dir.ca.gov/Title8/1955.html ;
8 CCR 5157 https://www.dir.ca.gov/title8/5157.html ; 8 CCR 1953 https://www.dir.ca.gov/title8/1953.html ;
8 CCR 1954 https://dir.ca.gov/Title8/1954.html

Around the permit (not items on it, but the permit has to support them):
- **Made available to entrants.** "The completed permit shall be made available at the time of entry to all authorized
  entrants… by posting it at the entry portal or by any other equally effective means" — 1926.1205(c)
  (https://www.law.cornell.edu/cfr/text/29/1926.1205), 1910.146(e)(3), 8 CCR 1954(c), 8 CCR 5157(e)(3).
- **Supervisor signs before entry.** 1926.1205(b), 8 CCR 1954(b).
- **Duration** no longer than the task needs. 1926.1205(d), 8 CCR 1954(d).
- **Problems met during entry are noted on the permit; cancelled permits kept 1 year.** 1926.1205(f), 8 CCR 1954(f),
  1910.146(e)(6).
- **The gas meter.** "Testing equipment" is one of the equipment items the permit lists ((n) / (13) / (14)). A
  calibration or bump-test DATE is not a listed permit item in any of the four rules. The rules do say the meter must
  be calibrated where they describe testing: "tested, with a calibrated direct-reading instrument" — 1926.1203(e)(2)(iii)
  (https://www.law.cornell.edu/cfr/text/29/1926.1203), 8 CCR 5157(c)(5)(B)3; and equipment must be "maintain[ed]
  properly" — 1926.1204(d) (https://www.law.cornell.edu/cfr/text/29/1926.1204), 8 CCR 1953(a)(4). So: naming the meter
  is on the list; its test date is cheap proof of the "calibrated" duty and the first thing an inspector asks.

### Nationwide: which states differ

OSHA's own adoption table for the construction rule (May 4 2015 final rule;
https://www.osha.gov/stateplans/adoption/standards/2015-05-04 , page last updated Dec 12 2016) lists every state
plan. **Identical:** AK, AZ, CA, CT, HI, IA, IL, IN, KY, MI, MN, NC, NJ, NM, NV, NY, PR, SC, TN, UT, VA, VI, VT, WY.
**Different:** OR, WA. **No entry:** MD. States with no state plan are under federal OSHA directly.

| State | Rule | What differs for the permit | Source |
|---|---|---|---|
| Oregon | OAR 437-002-0146 (one rule for general industry and construction; construction from Mar 1 2015) | (6)(b)(I) asks for "The signature of the original supervisor authorizing entry" — signature, not "signature or initials". (C) "The date, start, and stop times". (P) "Any problems, if any, encountered during the entry" is a permit item. Entrants get "access to the completed permit before entry" (5)(e). Excavation and underground-construction work is excluded except entry into sanitary sewers large enough to enter (2). Keeps cancelled permits 1 year (13). | https://oregon.public.law/rules/oar_437-002-0146 , https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-437-002-0146 |
| Washington | WAC 296-809 (one rule, "applies to all confined spaces") | Same 15 items in a different order (296-809-50004). The testing-equipment item names "equipment capable of detecting an increase in atmospheric hazard levels" if ventilation stops, which is the federal item (e). Permit available at entry (50002(5)); problems noted on the permit (50002(7)); kept 1 year (50006(2)). Uses "a calibrated, direct-reading instrument" (60004(3)(a)). Nothing to add to the form. | https://www.law.cornell.edu/regulations/washington/WAC-296-809-50004 , chapter PDF https://lawfilesext.leg.wa.gov/Law/WACArchive/2024/pdf/WAC%20296%20-809%20%20CHAPTER/WAC%20296%20-809%20%20COMBINEDCHAPTER.pdf |
| California | 8 CCR 1950-1962 (construction), 5157 (general industry) | Construction rule: the same 16 items as federal. | links above |
| Minnesota | old state construction rule gone | Minn. R. 5207.0300-.0304 "[Repealed, 42 SR 1015]"; federal rule applies. | https://www.revisor.mn.gov/rules/5207/version/2020/full |
| Virginia | old state construction rule gone | 16VAC25-140 repealed when the board "adopted federal OSHA's Final Rule for Confined Spaces in Construction", effective Jan 1 2016. | https://register.dls.virginia.gov/details.aspx?id=6687 |
| Maryland | old state rule gone | COMAR 09.12.35 "Regulations .01-.05 repealed effective January 2, 2017 (43:26 Md. R. 1444)". | https://regulations.justia.com/states/maryland/title-09/subtitle-12/chapter-09-12-35 |
| Michigan | Construction Part 35 (R 408.43501-43510, "Adopted and referenced standards") | OSHA's table: identical. I could not open the rule text itself, only its table of contents. | https://www.law.cornell.edu/regulations/michigan/department-labor-and-economic-opportunity/miosha/general-industry-and-construction-safety-and-occupational-health-standards/construction-safety-and-health-standard/part-35 |

**Not checked, said plainly:** I read the rule text for federal, CA, OR and WA only. For the other state plans I
relied on OSHA's adoption table (2016) plus the three repeal notices above; I did not read each state's code, and I
did not check any state's general-industry confined space rule except CA, OR and WA. CT, IL, ME, MA, NJ, NY and VI
plans cover public employees only. The yearly state-table re-check (`tests/r1706/staterules`, recheck_by 2027-11-19)
should carry this table too.

**The union.** One form covers every state: the 16 federal construction items are a superset of the 15
general-industry items, Washington adds nothing, and Oregon adds two things: start and stop times (the form already
has both) and problems met during entry (the closeout PDF already has a "Problems encountered during entry" section
with write-in lines). The only thing the phone cannot give Oregon is a signature. So the form is the same
everywhere and the app says, by the job's state, which rule it follows and, in Oregon, that the supervisor signs the
printed permit. Unknown state: federal, plus the Oregon signature note (it costs one sentence).

How the state is found (`pbCpRuleState`): the site address typed on the permit (the state table's own address
reader, `pbSrMath.parse`), else the job's state from the state rules (`pbSrJobState`: picked, job address, or the
company's state). The state table's last-resort fallback ("CA, default") is not taken as knowledge. The state is kept
on the locked permit (`ruleState`) and printed on its PDF.

## 2. Inventory: every box, choice, notice and paragraph on the form

R = required by a rule (item letter of 1926.1206). A = needed by the app (timer, alarm, roster, block, emergency
script, records). N = neither.

| # | On the form before | Why it is there | After |
|---|---|---|---|
| 1 | Draft band: "Nothing on this form authorizes entry or starts a timer or reminder until you tap Lock…" + draft save line | A (safety notice; draft status) | Kept, 6 words shorter |
| 2 | Review Permit button + "x of 15 required fields filled. Fill in the sections, then tap Review Permit." | N (the review is at the bottom; Lock lists what is missing) | Button hidden; count kept as "x of 15 required boxes filled." |
| 3 | Reuse Last Permit's Hazards & Controls button | A (prefill) | Kept as "Copy From Last Permit" with one line saying which permit; hidden when there is no earlier permit; prefers the last permit for the same space; now also brings equipment ticks and the meter |
| 4 | Fold "What Reuse fills in" (52 words) | N | Removed (the button's line and its result message say it) |
| 5 | Jobsite / project name | A (records, emergency sheet; required to lock) | Kept; prefilled from the current job |
| 6 | Job number (optional) + help line | A (links the permit to the job; also finds the state) | Kept beside Jobsite, help line removed; prefilled as before |
| 7 | Site address + help line | R (l) "means for summoning"; A (911 script; the job's state) | Kept; label "Site address with state (what you'd tell 911)". Never prefilled: a stale address read to 911 is worse than a blank |
| 8 | Entrance location / landmarks (optional) + help line | A (dispatcher script); R (o) when needed | More details |
| 9 | Space identification | R (a) | Kept, first box |
| 10 | Purpose of entry | R (b) | Kept, second box |
| 11 | Sub-headings inside each group ("Space & Purpose", "Authorized Window", "Supervisor & Attendant", "Communication", "Specific Hazards", "Hazards & Controls", "Emergency Procedures", "Additional Notes & Photos") | N (repeat the group title) | Removed, except "Air Testing" and "Equipment On Site" |
| 12 | Start date | R (c) | Kept ("Date"), today |
| 13 | Authorized start time | R (c); A (window banner, check-in marks) | Kept; prefilled with the time now |
| 14 | Authorized end time | R (c); A | Kept; never prefilled (1926.1205(d): no longer than the task) |
| 15 | "End date (filled in automatically)" box | N (the Window line under it says the same) | Hidden |
| 16 | Window line ("Window: Thu Nov 19 7:00 AM → 3:00 PM … OVERNIGHT, time zone") | A (shows exactly what Lock will use) | Kept |
| 17 | "Times are this phone's time (zone)." | N (the Window line names the zone) | Hidden |
| 18 | Fold "About time zones and overnight" | N (the Window line shows both dates and says OVERNIGHT) | Hidden |
| 19 | Entry supervisor name | R (g); A (roster) | Kept; prefilled from the account's name; names from past permits offered |
| 20 | Supervisor initials + "Entered personally by the supervisor named above…" | R (g) | Kept beside the name; one line: The supervisor types the initials: "I reviewed this permit and authorize entry." Never prefilled |
| 21 | Attendant name | R (f); A (roster) | Kept; names offered, never prefilled |
| 22 | Fold "What locking records" | N as a fold | One line at the Lock button: "Locking records the date and time as your authorization. After Lock, only the EMERGENCY number can be changed." |
| 23 | "Routine check-ins between the crew during the entry — not emergency response." | N | Removed |
| 24 | Communication procedures | R (m) | Kept: "How entrants and the attendant stay in contact" |
| 25 | Communication check reminder + "A reminder only. Blank means no reminder, never 0 minutes." | A (timer) | Kept, help line removed (Lock still refuses 0) |
| 26 | (missing) entrants | R (d) | Added one line: "Entrants are checked in by name on the next screen." (the rule's note allows naming the tracking method) |
| 27 | (missing) how the permit is made available to entrants | 1926.1205(c) | Added: a pick-one "How entrants see this permit before they go in" (on this phone / printed and posted / both), default on this phone; and on the active permit "Show this permit to each entrant before they go in." |
| 28 | Fold "Why check these" | N | Replaced by one line: "Tick any that apply (rescuers see this list):" |
| 29 | 6 hazard ticks + an Explain box each | A (emergency sheet's hazard list); helps R (h) | Kept, two to a row, after the three required boxes |
| 30 | Hazards of the space | R (h) | Kept, first in its group |
| 31 | Isolation / control measures | R (i) | Kept |
| 32 | How you'll detect a ventilation failure | R (e) | Kept: "How you'll know if ventilation stops" |
| 33 | Other acceptable entry conditions (optional) | R (j), with the limits | More details |
| 34 | Fold "How the app uses these limits" (88 words) | N as a paragraph; its three warnings matter | One visible line: "Air limits the app checks every test against: O2 19.5 to 23.5%, LEL up to 10%, H2S up to 10 ppm, CO up to 25 ppm." (follows any typed limit). The three warnings sit with the limit boxes: blank uses the standard value and never turns the check off; keep using the meter's own alarm; a blank H2S or CO reading means not measured, never zero |
| 35 | Min O2, Max O2, Max LEL, Max H2S, Max CO (5 boxes with long labels) | R (j); A (alarms, DO NOT ENTER) | More details ("change air limits"); the labels kept word for word (they say where each standard value comes from). The standard limits apply exactly as before when left blank. Fixed: the CO box hinted "35" while a blank used 25 |
| 36 | Air test re-check reminder + 44-word help | A (timer; sets how old a test can be before check-in is blocked) | Kept; help is one line: "Check-in is blocked when the last air test is older than this (20 min if blank)." |
| 37 | (missing) gas meter | R (n) testing equipment | Added: "Gas meter (make, unit number)" |
| 38 | (missing) meter's last bump test or calibration | not a listed item; proof of the calibrated-instrument duty | Added: a date box. Never prefilled or copied |
| 39 | 5 equipment ticks (PPE, testing, communications, alarms, rescue) | R (n) | Kept, two to a row. Not ticked by default: a tick says the gear is there |
| 40 | Equipment notes (optional) | R (n) detail | More details |
| 41 | Additional permits issued (optional) | R (p) | More details |
| 42 | Fold "What the EMERGENCY button does" | N | Removed |
| 43 | Emergency number (dialed by the EMERGENCY button) + help | A (EMERGENCY) ; R (l) | Kept, 911; help is "911 unless this site has its own rescue number." (Lock still refuses a blank) |
| 44 | Rescue / emergency services and how to summon them | R (l) | Kept, first in its group |
| 45 | Fold "About a second contact" | N | Removed |
| 46 | Additional emergency contact number, name (optional) | A (emergency sheet) | More details |
| 47 | Miscellaneous notes, Photos (optional) | R (o) when needed; A (records) | Kept; the Notes & Photos group starts folded |
| 48 | Review Before Locking: window, air limits, reminders, EMERGENCY number | A (what Lock will use) | Kept; air limits in one short line; a Gas meter row added; the list of missing boxes shows as "13 required boxes are still empty. Show Them" until asked for or until a Lock attempt |
| 49 | "Worked out from the fields above by the same rules the locked permit uses. Limits and the window can't be changed after Lock." | N / A | Replaced by the line in row 22 and the rule line: "Permit items: federal OSHA 29 CFR 1926.1206 [and <state rule>]." |
| 50 | Lock & Activate Permit; error list | A | Unchanged |

Where the same items repeat:
- **Active permit** (Permit Details): shows every locked item. Added: Gas Meter, How Entrants See This Permit, and
  the line over the roster. DO NOT ENTER, the EMERGENCY button, the air-limit checks, the check-in blocks and the
  timers are not touched by these patches.
- **Closeout**: unchanged. The closeout record now carries meter, meterCal, permitShown, ruleState.
- **Closeout PDF**: item (n) prints "Gas meter used: …" ("not recorded" on a permit saved before this); item (o)
  prints how entrants saw the permit; a line under the item table names the state rule. Wording below.
- **Emergency sheet / dispatcher script**: unchanged.

### PDF wording replaced

| Before | After |
|---|---|
| "confirmed … (device time of the server's answer; the server's own received_at is kept on the server)" | "confirmed … (this phone's clock; the company account keeps its own time of receipt)" |
| "Permit locked … (as written in the record, on the phone that locked it; its time zone is not written)" | "… (the time on the phone that locked it)" |
| "(as entered on the permit; local time, zone not written)" | "(as entered on the permit, local time)" |
| "(minO2 standard, maxO2 standard, maxLEL standard, maxH2S standard, maxCO standard)" | "(the standard values; none was changed on this permit)" or "(typed on this permit: max CO; the rest are the standard values)" |
| Timeline: "Times are device times; this record's events have no server-received time (the backup records when the closed permit reached the server, shown under Integrity)… (as written in the record)" | "Every recorded event in time order, by the clock of the phone that recorded it. When the closed permit reached the company account is shown under Integrity." |
| Signature block: "(as written in the record; its time zone is not written)" | "(the time on the phone that locked it)" |

Left alone, on purpose: "rev 76c18c96" in the page header and the column heading "device time". Both are shared by
every PDF the app makes (run reports, daily reports, exports); changing them for permits only would make the PDFs
disagree. Proposed as one app-wide wording pass.

## 3. What was built

`patches/apply_all.sh in.html out.html` applies both, in order, to a copy of `_src/index.html`.

- `patches/01_permit_form_short.py` + `patches/01_new_form.html` — the form. Every old box id is kept (so old drafts
  restore and the lock code reads the same boxes). The old markup is checked by md5 before it is swapped, so the
  patch refuses to run on a form someone else changed. No lock rule, required box, limit, timer or check changes.
  - "More details" folds open by themselves whenever a box inside holds a value or an error, so a typed limit or a
    refused one is never hidden (restored draft, Copy From Last Permit, Lock errors, "go to this field").
  - Prefilled values are marked auto the same way the Job number already was: an untouched prefilled form is not
    "typed work" (no draft is made, leaving asks nothing).
- `patches/02_permit_records_pdf.py` — active permit, closeout record, text report, PDF items and wording.

Not built, proposed:
- A "Problems during the entry" box at closeout (1926.1205(f); an Oregon permit item). Today the PDF lists what the
  app recorded and leaves three write-in lines.
- Spanish (critic finding E) and a signature drawn on the phone.
- The app-wide PDF wording pass above.

## 4. Tests

New (run from `tests/staged/permit_short_nov19/tests`, pages built by `mk.sh <dir>` and served on port 9200):

| Test | What it proves | Result |
|---|---|---|
| `t_ps1_form.js` | before/after numbers; all 60 old ids still there; a box or line for each of (a)-(p); safety lines kept; prefill and what is never prefilled; leaving an untouched form asks nothing; folds open on a value and on a Lock error; state rule line for OR, WA, TX; locks with the same 15 required boxes; active permit shows the new items and still shows DO NOT ENTER and the EMERGENCY number | 35 checks, ALL PASS |
| `t_ps2_records.js` | an old saved permit (fixture from the repo's PDF tests) still prints, with "not recorded" and no programmer wording (and the r17.10 page does print that wording); Copy From Last Permit picks the same space, brings the meter but never its test date; supervisor prefill; a new permit through closeout: record, text report and PDF carry the meter, how entrants saw the permit and the Oregon line | 24 checks, ALL PASS |
| `t_ps3_olddraft.js` | a draft saved by r17.10 restores on the new form: every value back, folds open, nothing invented, and it locks | 13 checks, ALL PASS |

Existing permit tests against the patched build, one at a time with `tests/run_all.sh --build … --only … --jobs 1`:
see "Existing tests" below (filled in when the run finished).

## 5. Golden files expected to change

Existing permit tests run one at a time against the patched build (33 runs): **31 pass unchanged**, including
`t103_aireads`, `t104_permitack`, `t112_exportpermit`, `t120_csrecord`, `permit_active_screen.py` (18 PASS),
`t_o3_30_31_permit`, `t_o3_37_38_39_records`, cs2 a1 b1 e1 k1 l1 l2 o1 r1 w1, pdfs t04 t08 t12, safety p2 p2t p3 p4
p5 p6 p7 v1 d2, sync t02, `t_cs_wording`, `t130_staterules`. The full regression was not run (shared machine).

Two golden files differ, both because the screen text they print changed on purpose:

| Golden | Why it changes |
|---|---|
| `tests/expect/bughunt_nov17__critic__w3.js.txt` (line 15) | It prints the whole permit form's text: now the shorter form. |
| `tests/expect/bughunt_nov17__cs2__s1.js.txt` (lines 26-34) | It prints the active permit's text: one new line, "Show this permit to each entrant before they go in." Nothing else moves. |

Update both with `tests/run_all.sh --only 'critic/w3|cs2/s1' --update-golden` after the patches are in the build.
Not in the runner, will need a look: `tests/bughunt_nov17/critic/big.js` reads form helper ids by hand (all still
exist; two are now hidden).

## 6. Decisions for Tommy (5)

1. **Make the gas meter and its last bump test or calibration required to lock?** Built as asked-for, not required:
   the review says "Not entered" in bold and the PDF prints "not recorded". Recommend: yes, require both, after one
   beta crew has used it. (The meter is on the rule's equipment list; the date is not a listed item.)
2. **Oregon signature.** Oregon's rule says signature, not initials. Built: the form and PDF tell an Oregon job to
   print and sign. Recommend: keep that now; add a finger signature on the phone later (the daily report already
   has one).
3. **Hazard tick boxes: keep on the main form or move behind More details?** They are not a rule item (the typed
   "Hazards of the space" is); they feed the list rescuers see. Built: kept, two to a row. Recommend: keep.
4. **Copy From Last Permit now also copies the equipment ticks and the meter name** (never the test date, the
   people, the window or the reminders). Recommend: keep; say no if you want equipment ticked fresh every time.
5. **A "Problems during the entry" box at closeout** (federal 1926.1205(f); an Oregon permit item). Not built
   because it changes the closeout step. Recommend: build it, optional, one line.

## Notes for the lead
- Read-only server check: `pb_permit_backup` does not name permit keys, so the four new keys in the record pass
  through as they are. No SQL, no deploy.
- A blank limit box hinted "35" for CO while a blank used 25 ppm (r17.10 source 8969). Fixed in patch 01 (hint 25).
- The five air-limit labels are kept word for word inside the fold (t104 checks the CO label's Cal/OSHA wording).
- Served pages for the tests: `tests/mk.sh <dir>` then `python3 -m http.server 9200` in that dir; `t_ps2` needs
  `<dir>/hk/` (the audit hooks) and `pdftotext`.

## DONE
