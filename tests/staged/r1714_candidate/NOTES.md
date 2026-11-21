# r17.14 candidate, built Nov 20 2026 (Pacific)

Nothing published, pushed or applied. The server was not touched (no SQL: every change lives in the page).
The repo's tests/ are unchanged (updates are in `test_updates/`, copied by `apply_test_updates.sh`).

## What is in it (applied in this order on `_src/index.html` r17.13, md5 4f2101b2…)
All 17 audit patches stacked with **no anchor changes** (copies in `patches/`). Only behaviour change vs the audit
patches: item 3 (specs 1), job state not known -> strictest crossing rule.

| # | Patch (`patches/`) | What |
|---|---|---|
| 1 | `811/p1_wait_days_confirmed.py` | MN, IA, IN, SD, OK wait 2 -> 3 wd; SC 3 -> 4; Renew-by MN, IA, IN; NV/UT/SC center holidays (wait only); OR source; OHIO811 URL |
| 1 | `811/p2_wait_full_days.py` | "full days" states AR, CO, CT, FL, KS, KY, NE, OR, WA, WY, UT 2 -> 3; NC 3 -> 4; Renew-by CT, OR, WA, AR, NC |
| 1 | `811/p4_rules_hit_line_fills.py` | "Hit a line" section in Rules (all states + 8 state extras); IL 2-hour emergency; 10 blank fields |
| 1 | `811/p5_state_phone_location.py` | 811 state: job, company, phone location, then the CA default |
| – | p3 (CA, NV, NY, OH, IL, NM "not the call day") | **NOT applied**: waiting on Tommy's California ticket |
| 2 | `safety/p1..p5` | injury lines 12 states; trench rows 8 states + CA permit; Rules: Heat / Toolbox talks / First aid / Flaggers; talk schedule line + 5 talks; permit rule MI Part 35 + CA 2026 form note |
| 3 | `specs/1_xing_state_rule.py` (**changed**) | crossing rule by job state; **state not known: water above, at least 2 ft (Texas), labeled "Job state not known — strictest rule used"**, for every sewer/storm/recycled/force-main crossing (was Ten States 18 in) |
| 3 | `specs/2_spec_words.py` | spec books card words; test Details example by type |
| 4 | `survey/s1..s5` | cutsheet LT/RT; "C 4.60"/"CUT 4.60"; stake cut/fill needs C/F letter; slope ft/ft + H:V; Education words + datum/units |
| 5 | `timerecords/01_crew_hours_not_a_timecard.py` | "Job record, not a time card" on daily + run report PDFs |
| + | `spanish/es_injury_lines.py` | Spanish for the 12 new injury lines (5 strings + 1 pattern) |
| 6 | `9_stamp.py` | `PB_APP_BUILD = 'r17.14 · 2026-11-20'`; `sw.js` copy `PB_SW_BUILD = 'r17.14 · 2026-11-20'` |

Rebuild everything: `sh tests/staged/r1714_candidate/build.sh`. Outputs: `index.src.html` (new `_src/index.html`),
`build/` (publish: `index.html` + `pbx/`), `build_hooks/` (test build), `sw.js`. Intermediate files in `work/`;
the 811 change tables in `patches/results/p1_changes.md`, `p2_changes.md`, `p4_changes.md`.

## Tests
@@TESTS@@

## Spanish
Added (dictionary only, PB_ES_ENABLED stays false): the 12 new injury lines (MD, MN, NV, SC, IA exact; AZ, IN, NC, NM,
TN, VT, WY by one pattern). Checked in review mode: `tests/t_es_injury.js` 13/13. The plan name inside the line stays
as the table writes it (e.g. "ADOSH (Arizona state plan)").
Left in English (list for the next Spanish round):
- Crossing warnings (the whole crossing check had no Spanish before either): "Texas rule (TCEQ 290.44): …", "Florida
  rule (62-555.314): …", "Montana rule (DEQ-1 8.8.3): …", "Ten States Standards: … Check <state>’s own rule",
  "Job state not known — strictest rule used: water crosses above the <pipe>, at least 2 ft over it (Texas rule)".
- Documents: "Your state DOT or city spec book (the Greenbook in Southern California), water and sewer district
  standards. Ask answers from them first, for everyone in the company." Test Details placeholders (6 "e.g. …").
- Slope converter: "Feet per foot", "How pipe plans often write it: S = …", "Ratio (horizontal : vertical)", "How
  grading and road plans write side slopes: 2:1 means 2 ft across for 1 ft up or down.", the new help paragraph.
- Education (s5): 12 glossary words and the datum / survey-foot pages.
- Talk schedule line: "State rules: Washington, at least weekly (WAC 296-155-110). California, at least every 10
  working days (8 CCR 1509)."
- Confined space form, California note (Jan 1, 2026 changes).
- English by design today: the state Rules view (Hit a line, Heat, Toolbox talks, First aid, Flaggers, trench rows),
  the Toolbox Talks, and PDFs (the "not a time card" line).

## Decisions for Tommy
@@DECISIONS@@

## DONE
