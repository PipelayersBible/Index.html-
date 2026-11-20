# State trench rules, starting with Michigan (Nov 20, 2026)

Tommy: "The app should always be aware of the user's state and should automatically give the information appropriate according to that."

Base page: `/tmp/claude-0/r1711/src.html` (r17.11 candidate). Nothing live, `_src/index.html` and the server were not touched.

## What was wrong

Michigan does not use OSHA's Type A / B / C or Appendix B. MIOSHA Part 9 has its own soil list and slope table (Table 1, R 408.40941) and does not adopt the federal appendices (R 408.40901 references only MIOSHA Parts 21 and 45). The app's Trench Sloping calculator answered every state from federal Table B-1, and the state table said of Michigan "we have not checked whether this plan is stricter".

For a Michigan crew that meant answers that are wrong in both directions:

| Soil a Michigan crew would name | Michigan Table 1 | What the app gave (nearest federal pick) | Effect |
|---|---|---|---|
| Saturated granular soil | 2:1 (26°) | Type C 1.5:1 (34°) | app too steep: 10 ft deep = 5 ft short each side |
| Running soil | 3:1 (18°) | Type C 1.5:1 (34°) | app too steep: 10 ft deep = 15 ft short each side |
| Wet granular soil | 1.5:1 (34°) | Type C 1.5:1 | same |
| Previously disturbed soil | 1:1 (45°) | Type B 1:1 | same |
| Firm clay | 2/3:1 (56°) | Type A 0.75:1 or B 1:1 | app flatter than Michigan requires |
| Stiff clay | 1/2:1 (63°) | Type A 0.75:1 | app flatter than Michigan requires |
| Fractured rock | 1/4:1 (75°) | Type B 1:1 | app flatter than Michigan requires |
| Solid rock | 90° | Stable rock, vertical | same |
| Exactly 20 ft | Table 1 still applies | "Engineer Required" | app stricter |
| Over 20 ft | engineer designs the protective system | "Engineer Required" | same |

## Michigan sources (every value)

Part 9 = Mich. Admin. Code R 408.40901 to R 408.40953, last amended effective January 3, 2024 (2023 MR 24).

- Official standard, MIOSHA-STD-1306: https://www.michigan.gov/leo/-/media/Project/Websites/leo/Documents/MIOSHA/Standards/Construction/CS_09/CS_09__03-14-2013.pdf (the file name is old; the cover reads "as effective January 3, 2024")
- Rule by rule (Cornell LII): https://www.law.cornell.edu/regulations/michigan/department-labor-and-economic-opportunity/miosha/general-industry-and-construction-safety-and-occupational-health-standards/construction-safety-and-health-standard/part-9
- MIOSHA's own field card with Table 1 as text, CET-0204 (8/2026): https://www.michigan.gov/leo/-/media/Project/Websites/leo/Documents/MIOSHA/Publications/CET-200s/CET-0204---Excavation-Trenching-Shoring.pdf
- University of Michigan EHS, same table: https://ehs.umich.edu/csp/32-excavation/
- MIOSHA trenching page: https://www.michigan.gov/leo/bureaus-agencies/miosha/topics/excavation-and-trenching

| Value | Rule text | Where |
|---|---|---|
| Slope from more than 5 ft | "The side of an excavation more than 5 feet deep shall be sloped as prescribed in table 1, unless supported as prescribed in this part." | R 408.40941(1) https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-408-40941 |
| Under 5 ft | protected too "when examination of the ground indicates hazardous earth movement may be expected" | R 408.40941(2) |
| Table 1 | Solid rock 90°; Fractured rock 75° (1/4:1); Stiff clay 63° (1/2:1); Firm clay 56° (2/3:1); Previously disturbed soil 45° (1:1); Wet granular soil 34° (1 1/2:1); Saturated granular soil 26° (2:1); Running soil 18° (3:1) | Table 1 of R 408.40941, as printed on MIOSHA CET-0204 and U-M EHS (see the caveat below) |
| Engineer | "Protective systems for use in excavations more than 20 feet in depth must be designed by a registered professional engineer." | R 408.40942(8) https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-408-40942 |
| Support systems | "A support system shall be designed by a qualified person. The design of the support system shall be maintained at the jobsite." | R 408.40942(2) |
| Benching | "the vertical rise shall not be more than 5 feet and the step back shall extend at least to the angle of repose as required by table 1"; in a trench "the height of the lower bench shall not be more than the lesser of 5 feet or width of the trench measured at the bottom" | R 408.40944(2), (3) https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-408-40944 |
| Flatten the slope | for water, silty materials, loose boulders, erosion, deep frost action, slide planes | R 408.40944(1) |
| Mixed soils | each soil cut to its own angle; the slope may not steepen toward the top where soft clay or running soil is in the lower cut | R 408.40932(1) |
| Spoil | "not less than 2 feet from the excavation edge" | R 408.40933(2) https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-408-40933 |
| Ladder | from 48 inches deep; 3 ft above the top; 25 ft of travel at most | R 408.40933(4) (same as federal) |
| Trench box | benching with a box only when its toe is 2 ft or less above the bottom | R 408.40945(2) |
| Inspection | ongoing by a competent person, and after every rainstorm | R 408.40932(4) |
| No federal appendices | references only MIOSHA Parts 21 and 45 | R 408.40901 https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-408-40901 |

**Caveat on Table 1.** In the official PDF and on every legal site, Table 1 is a picture, and this machine could not open pictures from those sites (downloads are blocked; only text fetches work). The eight rows come from MIOSHA's own card CET-0204 (dated 8/2026) and match the University of Michigan's copy row for row. A MIOSHA fatality report also puts wet sand at 34° (https://www.cdc.gov/niosh/FACE/pdfs/15mi117.pdf), which agrees. I did not see page 5 of the standard itself. Someone should look at that page once before this ships (decision 1).

## How the app knows the state (found)

- `PB_STATE_RULES` (`PB_SR`, the 51-row table from r17.05/r17.06): `pbSrMath.row(code).trench = { ft, text }`.
- `pbSrJobState(jobNumber)` gives `{ code, how }`: `phone`/`picked` (chosen for the job), `address` (parsed from the job's address), `company` (Settings, Company), `default` (California, not knowledge).
- `pbHereState()`: the state from the phone's last location lookup, good for 12 hours.
- The permit uses `pbCpRuleState` (address, then job state). The run's deep-trench flag (`pbCaveTrig`) and the note under the Trench Sloping answer used only `pbHereState()`.

## Built (staged, not shipped)

`patches/01_trench_state_rules.py` (exact-once replacements; `patches/apply_all.sh in.html out.html`).

1. **Per-state rule table `PB_TRENCH_RULES`** next to the federal `TRENCH_SLOPES`. A row either replaces the soil list (`soils`, `engOver`, the words for the warning) or removes federal options the state does not have (`drop`). No row = the federal calculator, untouched. Adding a state is adding a row.
2. **Michigan row.** Soil list is Table 1's eight soils. Same answer boxes and wording as today (Max Allowable Slope, Horizontal Offset Each Side, Required Top Width, the diagram), with "Michigan rule (MIOSHA Part 9), Table 1" under the slope. The red warning and its Details quote Part 9 instead of Appendix A/B. Over 20 ft: "Engineer Required", no slope, no diagram, with R 408.40942(8) quoted. At exactly 20 ft Table 1 still answers (the rule says "more than 20 feet") and the engineer sentence is shown under it.
3. **A line at the top says which rule is used and why**: "Michigan rule (MIOSHA Part 9). Michigan has its own soil list and slopes. It does not use OSHA's Type A, B and C. State from the current job." One button, "Use Federal OSHA Table", for when the state is wrong; it switches back with "Use Michigan Rule" and resets every time the calculator opens.
4. **The state** (`pbTrenchWhere`): the current job (picked for it, or in its address), else where the phone is, else the company's state. Nothing known = federal table, as today. The note under the answer now uses the same state and says where it came from.
5. **Washington row** (small, certain): Washington's Table N-1 has no short-term Type A slope, so the 0.5:1 option is not offered there. Everything else is the federal table.
6. **State table**: Michigan, Minnesota and Kentucky trench lines confirmed with sources (were "not checked"). Michigan's depth is stored as 5 ft.

Not changed: federal states, the 20 ft federal logic, saved federal soil, the run's deep-trench flag.

## Tests

`tests/t_mi1_trench_state.js` (one browser, about 2 minutes): **66 checks, all pass.**
`PB_URL=http://127.0.0.1:98xx/cur.html PB_BASE=http://127.0.0.1:98xx/base.html NODE_PATH=/opt/npm-tools/node_modules node tests/t_mi1_trench_state.js`

- State not known and Texas: federal list, no rule line; every federal soil at 10 ft with a 3 ft bottom (rock 0 / A 7.50 / short-term A 5.00 / B 10.00 / C 15.00 ft offset; tops 3, 18, 13, 23, 33 ft); 19.9 ft keeps the slope; 20 and 25 ft "Engineer Required" with OSHA's note. Texas answer and note are word for word the same as the page before the patch.
- Michigan: the eight Table 1 rows at 10 ft (offsets 0, 2.50, 5.00, 6.67, 10.00, 15.00, 20.00, 30.00 ft; angles 90, 75, 63, 56, 45, 34, 26, 18); firm clay 6 ft = exactly 4.00 ft; 20 ft answers; 20.1 and 25 ft "Engineer Required" citing R 408.40942(8) and never Table B-1; a run point at 20.04 ft opens at 20.1 ft; switch to federal and back; a Michigan soil is never saved as the federal last soil; fits 390 px; no page errors.
- Job beats phone: job picked as Michigan with the phone in Ohio = Michigan; job in Ohio with the phone in Michigan = federal. Company state only = Michigan, and the line says so.
- Washington: no short-term Type A; a saved short-term choice falls back to Type B; the rest federal.
- State table rows for Michigan, Minnesota, Kentucky; unchecked plans and Washington's 4 ft untouched.

Existing tests on the patched page: `tests/t131_trench20.js` PASS; `tests/r1706/staterules/tests/t130_staterules.js` all pass. The full regression was not run (shared machine).

Screenshot: `shots/mi_stiff_10ft.png`.

## Other state plans (quick check)

| State | Sloping table | Differences found | Source | Built |
|---|---|---|---|---|
| California | 8 CCR 1541.1 App. B Table B-1: same four slopes, same short-term Type A (12 ft), same engineer note over 20 ft | none in the calculator's answers. Permit for 5 ft or deeper (8 CCR 341) is already in the app | https://dir.ca.gov/Title8/1541_1b.html | nothing needed |
| Washington | WAC 296-155-66403 Table N-1: same slopes, engineer over 20 ft | **no short-term Type A row**; protection from 4 ft (already in the app) | https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-66403.htm | yes |
| Oregon | adopts 29 CFR 1926.650, .651, .652 and Appendices A to F | none in the tables. OAR 437-003-0096 (underground installations) not read | https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-437-003-0001 | nothing needed |
| Minnesota | adopts 1926.651 and .652 | none stated by MNOSHA | https://www.dli.mn.gov/sites/default/files/pdf/fact_trenching_excavation.pdf | state table line |
| Kentucky | 803 KAR 2:415 adopts 29 CFR 1926 Subpart P; only definitions added | none | https://apps.legislature.ky.gov/law/kar/titles/803/002/415/ | state table line |

Not checked (still "not checked" in the state table): AK, HI, IN, IA, MD, NC, SC, TN, VT, VA, WY. Most adopt federal construction rules word for word, but I did not read them.

## Known limits and follow-ups (proposed, not built)

- The run's deep-trench flag (`pbCaveTrig`, `pbDepthFlagText`) still uses only the phone's location and federal wording. In Michigan it flags at 5.0 ft with OSHA's sentence. Correct enough (Michigan is "more than 5 feet"), but it should use the job's state and name Part 9.
- A calculator opened from an old run's row uses the current job's state, not that run's.
- The note under the answer says "5 ft or more" for Michigan at exactly 5.0 ft; Michigan's rule starts above 5 ft. Slightly strict on purpose.
- Washington's 20 ft message still quotes OSHA's Table B-1 note 3; Washington's Table N-1 note 2 says the same thing.
- Michigan's last soil is remembered only until the app is closed.
- Education and Ask still explain Type A/B/C only. A Michigan crew asking Ask about sloping gets the federal answer.
- Spanish: the new Michigan and Washington strings have no dictionary entries (Spanish is switched off).
- `tests/r1706/staterules/data/state_rules.json` should get the same three trench rows so the data file and the page agree.

## Decisions for Tommy (5)

1. **Look at Table 1 once before this ships.** Open page 5 of the MIOSHA Part 9 PDF and compare the eight rows to the list above. I recommend shipping only after that look, since the table is a picture I could not open.
2. **Which state wins: the job or the phone?** Built: current job first, then where the phone is, then the company's state. I recommend keeping it; an office person checking a Michigan job from Ohio gets Michigan.
3. **Company state as a last fallback.** A Michigan company on an Ohio job with no job state and no location gets Michigan's table (steeper for clay than OSHA allows). The line says "State from your company's state". I recommend keeping it but would accept "federal unless the job or the phone says Michigan".
4. **Keep the "Use Federal OSHA Table" button in Michigan?** I recommend yes: it is the only quick fix when the state is wrong.
5. **Exactly 20 ft in Michigan.** Built to the rule's words: Table 1 answers at 20.0 ft, engineer above. If you want the same behavior as everywhere else (engineer at 20 ft), it is a one-number change. I recommend following the rule.

## DONE
