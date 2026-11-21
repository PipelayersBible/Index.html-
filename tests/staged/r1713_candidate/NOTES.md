# r17.13 candidate, built Nov 20 2026

Nothing published, pushed or applied. The server was not touched (no SQL for this update: the 811 rules, the injury
lines and the trench rules all live in the page). The repo's tests/ goldens are unchanged (updates are in `test_updates/`).

## What is in it (applied in this order on `_src/index.html` r17.12, md5 25c08a20…)
| # | Patch (`patches/`) | What |
|---|---|---|
| 1 | `1_811_state_fixes.py` | 811 state table: NC, IL, VA, PA, LA, OK, MN, FL, MO, KY rows fixed (table below). GA and ND untouched. |
| 2 | `2_safety_by_state.py` | "Report a serious injury" by state (Rules view, Job Book safety form, confined space emergency panel); Heat Illness talk wording; Washington 4 ft walkway guardrails |
| 3 | `3_trench_job_state.py` | Trench Sloping + cave-in notes follow the JOB's state (then the phone; never the company's); Washington: no short-term Type A + a line saying so; MN / KY trench lines confirmed. **Michigan left out (on hold).** |
| 4 | `4_spanish.py` | Spanish dictionary entries (PB_ES_ENABLED stays false) |
| 9 | `9_stamp.py` | `PB_APP_BUILD = 'r17.13 · 2026-11-20'` |

Rebuild everything: `sh tests/staged/r1713_candidate/build.sh` (absolute paths). Outputs:
`index.src.html` (new `_src/index.html`), `build/` (publish: `index.html` + `pbx/`), `build_hooks/` (test build),
`sw.js` (`PB_SW_BUILD = 'r17.13 · 2026-11-20'`), `site_hooks/` (the regression site).

## 1. 811 changes (state, field, old, new, source)
Every source was read by tests/staged/lib_811_nov20 on Nov 20 2026 (quotes in its chunks / raw_findings). Each row's
`sources` in the page carries the link, and `checked` is now 2026-11-20.

| State | Field | Old | New | Source |
|---|---|---|---|---|
| NC | tol_in | null | 24 | G.S. 87-117(22) and 87-122(c): tolerance zone for every marked line (as amended by S.L. 2025-21) |
| NC | tol_text | 24 inches applies only to oil, gas transmission and electric transmission lines (no mechanized digging). | 24 inches each side of the outside edge of the mark (half the diameter + 24 inches from the centerline when the size is known). No machines in it until you see the line. Within 24 inches of oil, gas transmission or electric transmission lines: hand tools only. | G.S. 87-117(22) and 87-122(c): tolerance zone for every marked line (as amended by S.L. 2025-21) |
| IL | tol_in | null | 18 | 220 ILCS 50/2, 4, 5.1, 10: tolerance zone, positive response (from Jan 1, 2026), black on snow |
| IL | tol_text | null | 18 inches each side of the outside edge of the marks (half the diameter + 18 inches when the size is shown). Hand or vacuum dig inside it. | 220 ILCS 50/2, 4, 5.1, 10: tolerance zone, positive response (from Jan 1, 2026), black on snow |
| IL | white_text | Pre-mark the dig area. | Pre-mark the dig area in white (black when snow is on the ground). | 220 ILCS 50/2, 4, 5.1, 10: tolerance zone, positive response (from Jan 1, 2026), black on snow |
| IL | note | null | Illinois: since Jan 1, 2026, check that every operator has posted a positive response before you dig. | 220 ILCS 50/2, 4, 5.1, 10: tolerance zone, positive response (from Jan 1, 2026), black on snow |
| VA | notice | null | 3 wd: Operators have 48 hours, starting 7 AM the next working day. A Monday call is good Thursday at 7 AM. Start sooner only if every operator has marked or cleared. | Va. Code 56-265.17: 48 hours from 7:00 a.m. the next working day |
| PA | notice | null | 3 wd: Call at least 3 and not more than 10 business days before digging (at least 10 for complex projects). | 73 P.S. 180(2.1), (11), (14): notice 3 to 10 business days, white marks, call again after 2 business days away |
| PA | start | null | 10 wd: Call no more than 10 business days before work starts. | 73 P.S. 180(2.1), (11), (14): notice 3 to 10 business days, white marks, call again after 2 business days away |
| PA | renew | null | The law sets no ticket life. Call again if you leave the site for more than 2 business days. | 73 P.S. 180(2.1), (11), (14): notice 3 to 10 business days, white marks, call again after 2 business days away |
| PA | white | null | conditional | 73 P.S. 180(2.1), (11), (14): notice 3 to 10 business days, white marks, call again after 2 business days away |
| PA | white_text | null | Mark the site in white when the exact site can’t be given. | 73 P.S. 180(2.1), (11), (14): notice 3 to 10 business days, white marks, call again after 2 business days away |
| PA | note | We could not confirm Pennsylvania’s wait or ticket life. Check Pennsylvania 811. | Pennsylvania’s law sets no ticket life. Check Pennsylvania 811 for your ticket’s dates. | 73 P.S. 180(2.1), (11), (14): notice 3 to 10 business days, white marks, call again after 2 business days away |
| LA | tol_in | null | 18 | La. R.S. 40:1749.14 (Acts 2026, No. 902): marked location = width + 18 inches each side |
| LA | tol_text | null | The line’s width plus 18 inches on either side. | La. R.S. 40:1749.14 (Acts 2026, No. 902): marked location = width + 18 inches each side |
| LA | note | We could not confirm Louisiana’s tolerance. Check Louisiana 811. | null | La. R.S. 40:1749.14 (Acts 2026, No. 902): marked location = width + 18 inches each side |
| OK | renew | Give a new notice to keep digging. | Update the ticket (Extend, or Re-Mark if marks are gone) at least 4 business days before it expires. Each adds 14 days. | OKIE811 Excavator Guide, Feb 2026 (Extend / Re-Mark 4 business days ahead; 63 O.S. 142.6 two feet each side) |
| OK | tol_in | null | 24 | OKIE811 Excavator Guide, Feb 2026 (Extend / Re-Mark 4 business days ahead; 63 O.S. 142.6 two feet each side) |
| OK | tol_text | null | 2 feet either side of the line. Hand dig only until the line is exposed. Machines may remove pavement only. | OKIE811 Excavator Guide, Feb 2026 (Extend / Re-Mark 4 business days ahead; 63 O.S. 142.6 two feet each side) |
| MN | white | null | required | Gopher State One Call Handbook 2026 (white marks "without exception") |
| MN | white_text | null | Pre-mark the dig area in white, without exception. Electronic white marks count from Jan 1, 2026. | Gopher State One Call Handbook 2026 (white marks "without exception") |
| FL | white | null | conditional | Fla. Stat. 556.109 (emergency) and 556.114(3) (white premarking), 2025 |
| FL | white_text | null | Pre-mark in white (paint, stakes or flags) when the site can’t otherwise be identified. | Fla. Stat. 556.109 (emergency) and 556.114(3) (white premarking), 2025 |
| FL | emergency | null | Emergency (clear danger to life or property, or loss of vital service): tell Sunshine 811 or the operator as early as you can. | Fla. Stat. 556.109 (emergency) and 556.114(3) (white premarking), 2025 |
| MO | note | null | Line unmarked or marked wrong: tell Missouri 811. The owner must contact you or mark it within 2 hours. | RSMo 319.026 (Aug 28, 2025): unmarked or wrong marks, 2 hours |
| KY | tol_text | null | Hand-dig or use nonintrusive means inside the tolerance zone. Machines only for pavement, rock and material more than 12 inches from the line, with a spotter. | KRS 367.4911: second notice; hand-dig or nonintrusive in the tolerance zone |
| KY | note | null | Operator didn’t answer in time: send a second notice. | KRS 367.4911: second notice; hand-dig or nonintrusive in the tolerance zone |

Not changed, and why:
- **Georgia:** Tommy is calling Georgia 811.
- **North Dakota:** the 48-hour wait and the 24-inch hand-dig number come only from a 2020 ND One Call handbook copy
  hosted by a city, not a current official source. Left as "could not confirm" (decision 2).
- **Illinois 25 working days:** confirmed by the statute text (220 ILCS 50/2: "valid for 25 days from the date of the
  initial request"; "'Day' does not include holidays recognized by JULIE, Saturdays, Sundays, and the day of the actual
  notice"). Already in r17.12, so unchanged.
- **Oregon 30 days, Arkansas, Louisiana wait/life:** already right in r17.12 (lib_811's list was written against an older table).
- **Mississippi:** wait still unconfirmed. **Dig Safe states:** numbers agree; only the manual date differs.
- renewby_nov20's call list (DE, FL, KS, SD, WY, IL, MO, NC, NM, CT, MT, PA): its patch p04 is already in r17.11; nothing new to build. The phone calls are still open.
- `tests/r1706/staterules/data/state_rules.json` (t130's data file) still holds older rows, as before (it never got the r17.07+ rows either).

## 2. Safety wording
(a) **Report a serious injury** (`pbInjuryLine(code)`, `pbInjuryState(jobNumber)`): job's state first, then the company's.
| State | Line says | Source |
|---|---|---|
| Federal (and CT, IL, MA, ME, NJ, NY: private crews are federal) | OSHA 1-800-321-6742: 8 h death; 24 h hospital stay, amputation, lost eye | 29 CFR 1904.39 |
| CA | Cal/OSHA 8 h for any serious injury or illness, or a death | 8 CCR 342 |
| WA | L&I 1-800-423-7233: 8 h death or any hospital stay; 24 h amputation / eye | WAC 296-27-031 |
| UT | Utah OSHA 801-530-6901: 8 h death or any serious injury | R614-1-5 |
| AK | Alaska OSH: 8 h death, hospital stay, amputation, eye | AS 18.60.058 |
| HI | HIOSH 808-586-9102: 8 h death; 24 h hospital, amputation (fingertips), eye, property damage over $25,000 | HAR 12-52.1-1 |
| OR | Oregon OSHA: 8 h death or catastrophe; 24 h hospital, amputation (fingertips), eye | OAR 437-001-0704 |
| MI | MIOSHA 1-800-858-0397 (death, 8 h); 1-844-464-6742 (24 h) | R 408.22139 |
| VA | VOSH: 8 h / 24 h | Va. Code 40.1-51.1 |
| KY | Kentucky OSH or OSHA: 8 h / 24 h (old 72 h gone) | 803 KAR 2:181 (Feb 3 2026) |
| Other state plans (AZ, IA, IN, MD, MN, NC, NM, NV, SC, TN, VT, WY) | plan name + federal times + "We haven't checked X's own rule: report within 8 hours to be safe." | not read (strictest wins) |
| State not known | federal times + "Some states want 8 hours for any serious injury. ... report within 8 hours to be safe." | |
Shown: Rules view (new section after OSHA, with "Call 911 first."), Job Book > new safety event (under its note),
confined space emergency panel (top of Send Incident Report; the permit's site state, then the job's / company's).

(b) **Heat Illness talk (TT-036):** "a written rest-break schedule from 90°F (Oregon)" added to the state line; new key points:
Oregon and Maryland use the heat index, Washington and California the air temperature; Nevada has no temperature trigger
(written heat hazard analysis, more than 10 workers). Reference adds Nevada R131-24. Numbers unchanged.

(c) **Washington 4 ft walkways:** TT-046 and TT-066 ("Washington: from 4 ft", WAC 296-155-655(12)), and the Washington
trench line of the state table (shows in Rules for Washington and under Trench Sloping).

(d) **Trench by the job's state:** `pbTrenchWhere()` = current job (picked for it / its address), else where the phone is,
else not known. Not the company's state: a Texas company with no job state would otherwise get 5 ft where "not known"
gives the strictest 4 ft. Used by the Trench Sloping calculator, the note under its answer, and the run's deep-trench
flag (`pbCaveTrig`, which before used only the phone). Washington job: the 0.5:1 short-term Type A option is removed and
a line reads "Washington rule (WAC 296-155 Part N) · Same slopes as OSHA's table, but no short-term Type A (0.5:1). Use
Type A 0.75:1. Your competent person decides on site. State from the current job." Not known: "The job's state isn't
known (no state on the job, no phone location) ... Washington: from 4 ft." Michigan Table 1 is NOT in (on hold).

## 3. Spanish (PB_ES_ENABLED = false)
+124 strings, +61 patterns in `pbI18nDict` (round-trip checked). Covered: lock screen, two-devices sheet and its
buttons, signed-out notices, Taper & Cone Spacing (screen, options, answers, state notes, sources), Monthly / Yearly
buttons and the crew's request-sent and price lines, the Home state card, "Answered for", the State field on New Job, the
injury lines, the Washington trench line and the "not known" note. Left in English on purpose: Owner Dashboard and the
app owner's billing admin lines (owner only), the 811 Rules view's state texts (that view was never translated), the
Toolbox Talks (never translated), state names. Word choices follow spanish2_nov20/glossary.md; not yet read by a fluent
person in the trade.

## Tests
**New feature test** `tests/t_r1713.js` (one browser, 390 px): **ALL PASS (39 checks)** on the source and on the minified
build (`results/t_r1713_on_build.txt`). It checks every changed 811 row, GA / ND untouched, the dates (VA Mon Jun 1 call
-> dig Thu Jun 4; PA dig Thu, latest start Jun 15, no expiry), the injury line for WA, CA, TX, NY, IA, UT, HI, AK, KY and
"not known", job state before company state, the Rules view section (fits 390 px), the Job Book safety form on a WA job,
the emergency panel line, the talks, and Trench Sloping / the note / `pbCaveTrig` for: nothing known (federal list, 4 ft),
WA job with the phone in TX (WA rule, no short-term Type A, 4 ft), TX job with the phone in WA (federal, 5 ft), company
state only (stays "not known").

**r17.12 feature tests re-run on r17.13 in Spanish** (used to collect the missing Spanish): t_ask_followups_app 43/43,
t_ask_state_app all pass, t_yearly_app all pass, t_taper_ui all pass before the new Spanish; with it, 4 checks fail only
because the test reads the painted Spanish text (e.g. it expects "From your company." and sees "De su compañía.").

**Spanish screen test** (`spanish2_nov20/tests/t_es_screens.js`, all 5 sets, Spanish switched on in a copy):
r17.13 and r17.12 fail the same checks (16 / 14 / 14 / 12 / 9: leftover English from r17.11 features such as the
feedback button's label and the permit's gas meter lines); r17.13 has more text in Spanish (p1 1372 vs 1370, p2b 392 vs
385), nothing worse. `results/es_screens_r1713_vs_r1712.txt`.

**Full regression** (`tests/run_all.sh --build <site>/index.html --jobs 2`; site = `build_hooks/` + sw.js, icons,
manifest, data, terms/privacy; recreate it as in r17.12): **2 FAIL of 237**, the rest pass or skip as on r17.12
(`results/full_regression_summary.txt`, wall 46 min).
| Test | Verdict |
|---|---|
| r1706/staterules/t130_staterules.js | **Expected change.** PA now has its 3-business-day wait (canDig Fri Nov 20 -> Wed Nov 25), so the "nothing confirmed" checks move to Montana; the trench "not known" note has new words. Updated copy in `test_updates/` passes on r17.13: "t130 done: all pass". |
| bughunt_nov17/new/f06_breakend.js | **Not this release.** Fails the same way on the r17.12 build run now (`results/f06_r1712`); passed on r17.12 earlier today. It moves a run 21 h back from the wall clock and types an end time 90 min after the start as HH:MM; run in the evening (start + 90 min crosses midnight) the end lands on the start's date, before the start, and is refused. A clock-dependent test; re-run it in the morning. |
No real bug found.

**Test updates:** `sh tests/staged/r1713_candidate/apply_test_updates.sh` (absolute root) copies 1 file:
`tests/r1706/staterules/tests/t130_staterules.js`.

## Release steps
1. Publish `build/index.html` -> `index.html`, `build/pbx/`, `sw.js` -> `sw.js`, `index.src.html` -> `_src/index.html` in one commit; run `apply_test_updates.sh`.
2. Check the live page and sw.js say r17.13.

**Server SQL: none.** No apply order and no rolled-back tests for this update. (The Ask library has its own 811 / OSHA
chunks in lib_811_nov20 and lib_osha_nov20, still staged separately; this update does not load them.)

## Not done / follow-ups
- North Dakota (decision 2). Georgia waits on Tommy's call. Michigan Table 1 on hold.
- `pbDepthFlagText` (the saved run's deep-trench sentence) still says "The phone didn't know which state the job is in"
  for runs flagged with nothing known; left as is so old records read the same.
- The other state plans' injury-reporting rules (AZ, IA, IN, MD, MN, NC, NM, NV, SC, TN, VT, WY) were not read: the app
  says "report within 8 hours to be safe" for them.
- Pre-existing Spanish leftovers from r17.11 (feedback button label, permit gas meter lines, price notes) are still English.

## Decisions for Tommy (5)
1. **Ship r17.13 now?** Recommend yes: every 811 change is from the law or the 811 center's current rules, and the
   safety lines only ever point to the stricter time.
2. **North Dakota: use the 2020 handbook's "48 hours, hand dig within 24 inches" now, or wait for the current handbook?**
   Recommend wait (left unchanged); one look at ndonecall.com's current handbook settles it.
3. **Unread state plans say "report within 8 hours to be safe."** Recommend keeping it (strictest wins) until each plan's
   rule is read; the alternative is to show only the federal 8 / 24 hours there.
4. **Trench depth never uses the company's state** (only the job's state, then the phone). Recommend keeping it: with no
   job state, "not known" gives Washington's 4 ft, which is never less strict than any company state.
5. **Washington short-term Type A: removed from the list on a Washington job, with a line saying why** (instead of
   leaving it with a warning). Recommend as built: the slope is not in Washington's table at all.

## DONE
