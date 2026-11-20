# lib_traffic_nov20 - Ask library: temporary traffic control for utility / pipeline work zones

Nov 20 2026. Nothing applied to the server, nothing in the app changed. Everything here is staged.
Follows `library_arch_nov20/LIBRARY_RULES.md` and `lib_kb.py` (both batches pass the checker with 0 errors).

## What is in the folder
| File | What |
|---|---|
| `kb_traffic_federal.py`, `kb_traffic_states.py`, `build.py` | Source. `python3 build.py` rebuilds everything below. |
| `traffic_mutcd.jsonl` | 50 federal chunks (`mutcd-...`, state US): 37 core, 13 shelf |
| `traffic_tc.jsonl` | 68 state chunks (`tc-<st>-...`): 64 core, 4 shelf. One card for each of 50 states + DC, plus 17 detail chunks for CA, AZ, NV, TX, FL, WA, OR, CO, UT |
| `sql/traffic_*_core_00.sql`, `*_core_precheck.sql`, `*_shelf_00.sql` | Staged inserts written by `lib_kb.py`. NOT applied. |
| `cases.py`, `traffic_cases.jsonl`, `sql/eval_cases_traffic.sql` | 147 eval cases: 65 federal, 82 state (every state + DC has at least 1). NOT applied. |
| `work/retrieval_check.txt` | Free retrieval check: 145 of 146 core cases get their chunk in the first search (1 case is shelf-only). |
| `sources.csv` | 87 documents with URL, edition, license note. |
| `work/flagger_by_state.tsv` | Flagger rule per state as found, with where it came from. |
| `src/federal_extract_notes.txt` | My extract notes of the federal numbers. No PDFs were downloaded (the shell cannot reach the web; all reads were WebFetch). |

## How it was read, and how far to trust it
- Federal MUTCD Part 6: the FHWA PDF of the 11th Edition (Dec 2023) read in four passes, section by section, then the
  Revision 1 PDF (Dec 2025) read again for the safety numbers (Tables 6B-1 to 6B-4, 6C.05, 6D.01-6D.06, 6K.01, 6K.03,
  6K.06, 6K.07, 6L.06). Both reads gave the same values. The reading tool summarizes; it would not return long verbatim
  quotes, so every federal chunk is `kind: summary`, never `verbatim`.
- New since the last KB work: **Revision 1 of the 11th Edition** (final rule effective March 5, 2026) and the
  **CA MUTCD 2026** (effective January 18, 2026, replaces 2014 Rev 9).
- OSHA: 1926.200(g), 1926.201(a) and 1926.6(n)(1) read on osha.gov / eCFR / Cornell.
- States: 12 states have their adoption read on the state's own page or code (CA, TX, AZ, CO, FL, WA, OR, GA, IN, OH, VA, PA).
  For the other 39 the adoption line says **not confirmed** (`unconfirmed: yes`). 50 of the 68 state chunks carry that flag.
- Flagger rules: WA (the WAC itself), OR (ODOT handbook), CA (CA MUTCD), CO (CDOT memo) are from the state. For 43 other
  states the wording is the state spec **as reproduced by the Work Zone Safety Information Clearinghouse** (FHWA-funded,
  not the state itself), some pages dated 2022. Those chunks are `medium` and tell the crew to confirm in the current spec
  book. AZ, FL, NH, NJ: no flagger rule found; the chunk says so.

## Coverage
Federal (all from Part 6 unless noted): status and Revision 1; how states adopt (23 CFR 655.603); Standard / Guidance /
Option; seven principles; traffic control plan and speed reductions; four zone areas; buffer space and Table 6B-2; sign
spacing Table 6B-1; taper formulas and types; worked taper table for 10, 11, 12 ft; worked 35 mph lane closure; detour vs
diversion; pedestrians; ADA numbers; worker safety; hi-vis apparel; flagger training, equipment, signals, station and night
lighting; one-lane two-way methods; sign heights and sizes; sign list with numbers; fines signs; cone spacing; cone, drum
and barricade sizes; pedestrian devices; arrow boards; warning lights and message signs; AFADs; night work; barrier; work
durations; short-duration and mobile work; shoulder work; utility work in streets; intersections; TA-1, 3, 4, 6, 10, 11,
13, 15, 17, 18, 21, 22, 23, 26, 27, 28, 29, 30, 33, 35; OSHA 1926.200 / 201 and which edition OSHA names.

| State | Adoption confirmed from state | Flagger rule | Extra chunks |
|---|---|---|---|
| CA | yes (CA MUTCD 2026) | state (training required, no card) | sign spacing by speed, 12 ft taper table, downgrade buffers, flagger, fines / speed zones, T-plans |
| TX | yes (2025 TMUTCD Rev 1) | Clearinghouse | fines (472.022) |
| AZ | yes (Supplement Jan 2026) | not found | double fines (28-710) |
| NV | no | Clearinghouse (NDOT spec) | double penalties (484B.130) |
| FL | yes (Rule 14-15.010) | not found | fines (318.18) |
| WA | yes (WSDOT page, WAC 468-95) | state (WAC 296-155-305) | flagger card, flagging numbers, fines |
| OR | yes (Supplement + OTTCH 2026) | state | handbook rules, taper table |
| CO | yes (Supplement Jan 18 2026) | state (CDOT) | zone penalties + flagger notes |
| UT | no (rule copy still says 2009) | Clearinghouse (UDOT) | fines / obey flagger (41-6a-209) |
| GA, IN, OH, VA, PA | yes | Clearinghouse | none |
| other 36 + DC | no | Clearinghouse (NH, NJ: none) | none |

Not looked at: work zone fine laws outside the 9 priority states; state DOT standard plans other than Caltrans T-series;
Texas, Ohio, Virginia, Indiana, Minnesota Part 6 differences (their manuals were not opened or not reached); city rules
(for example a city barricade manual); MUTCD Chapter 6O (incidents), freeway crossovers, bike lane closures, roundabouts.

## App accuracy list
The app has no traffic control calculator. Traffic control text is in three toolbox talks and in the Ask library.

1. **`_src/index.html:5629` (also `/tmp/claude-0/r1711/src.html:6094`), toolbox talks TT-031 and TT-033, references:
   "29 CFR 1926.200-203 (Subpart G ...)".** Subpart G now has only 1926.200 and 1926.201; 1926.202 and 1926.203 are gone
   (eCFR subpart G list; last amended 84 FR 21577, May 14 2019). Fix: "29 CFR 1926.200(g) and 1926.201(a) (Subpart G)".
   Small and certain, but I did not patch it.
2. **TT-032 Flagging, key point "Consider Class 3 at night".** MUTCD 6C.05 para 7 says flaggers at night *should* wear
   Class 3 (Guidance). Suggested wording: "Class 3 at night." Also worth adding one line: "Flagger stations must be lit
   at night" (6D.06, a Standard). Not wrong today, just soft.
3. **Ask KB ord 1914 `quick-reference-6` and ord 1984 `traffic-control-4`: sign spacing with made-up speed bands**
   ("urban 30 mph or less 100 ft", "urban 35 to 45 mph 350 ft", "rural 50 to 55 mph", "freeway 55 to 70 mph"). The
   national Table 6B-1 has no mph numbers; the agency sets the category. In California (the home state) the CA MUTCD 2026
   table is by speed and differs: 30 mph 150 ft, 35 mph 200 ft, 40 mph 250 ft, 45 mph 300 ft, 50+ 350 ft. So today Ask
   would tell a Wildomar crew 100 ft at 30 mph (CA says 150) and 350 ft at 35 mph (CA says 200). `mutcd-6b-signspacing-1`
   and `tc-ca-signspacing-1` have the right numbers; the two old chunks should be edited or superseded when these load.
4. **Ord 1984** also says "Table 6B-1 in the 2009 edition, renumbered in the 11th edition". Backwards: it is Table 6B-1
   in the 11th Edition (the 2009 number was 6C-1).
5. **Ords 1985, 1986, 1987** cite "Chapter 6E Flagger Control (2003 edition text)". Values match the 11th Edition, but
   flaggers are now Chapter 6D and the table is 6B-2. Ord 1986 also says reflective material "visible at least 1,000 ft";
   CDOT's January 2026 memo says that line was removed from the national MUTCD (it remains in CDOT's spec). I did not
   find it in the 11th Edition 6C.05 summary either.
6. **Ord 2503 `tc-2`**: "urban low speed (25 mph or less)". That is California's row, not national text.
7. Ord 2502 `tc-1` and the taper chunks (1982, 1983, 2304): formulas and examples are right.
Existing ids `tc-1` and `tc-2` do not clash with the new `tc-<st>-...` ids.

## For Tommy to get (or for a next pass)
1. **Texas MUTCD 2025 Part 6** - txdot.gov, "Part 6 Temporary Traffic Control" PDF (the link would not open for me).
   Needed for Texas taper / sign spacing tables and the flagger section.
2. **National STOP/SLOW paddle minimum size** in the 11th Edition (Section 6D.02 / Figure 6D-1). Earlier editions said
   18 inches wide, 6 inch letters; I could not confirm it in the new text, so the chunk leaves the size out.
3. **Flagger card rules for Arizona, Florida, New Hampshire, New Jersey** - ADOT standard specifications section 701;
   FDOT Standard Specifications section 102 and the FDOT "Temporary Traffic Control (MOT) Training Handbook"; NHDOT and
   NJDOT standard specifications (flagger sections).
4. **Each state DOT's current standard specification flagger section**, to replace the Clearinghouse wording (oldest
   pages, dated Aug 2022: AK, DE, DC, HI, IN, MN, MS, MO, NC, OH, OK, WI). Alabama's is from a debris contract, not the
   spec book.
5. **Adoption status from the DOT itself** for the 39 states marked not confirmed, first NV, UT, NY, NJ, IL, MI, NC.
   NDOT and UDOT traffic offices can answer in one phone call.
6. **Oregon OTTCH 2026 Table 2-4** (sign spacing and buffer by speed) and **WAC 296-155-305 Table 1** - both tables came
   through scrambled; someone needs to read the printed table.
7. **Ohio Supplement Part 6** (Table 6B-3 taper changes) - the PDF is long and I only reached Part 1.
8. **FDOT Standard Plans Index 102-600 series** and **WSDOT Work Zone Traffic Control Guidelines (M 54-44)** for utility layouts.
9. **ANSI/ISEA 107** is a sold standard: nothing copied; only the class named by the MUTCD is stated.

## Small app tools this enables (suggestions, not built)
1. **Taper and cone calculator.** Inputs: speed, lane (offset) width, taper type. Outputs: taper length, cone spacing in
   the taper and along the work, cone count, buffer length (Table 6B-2), downstream taper. All formulas are in
   `mutcd-6b-taper-1`, `mutcd-6k-spacing-1`, `mutcd-6b-activity-1`. Show "minimum from the national MUTCD; your plan governs".
2. **Sign spacing card.** Road type (and speed in California) gives A, B, C. Needs the per-state tables before it goes
   nationwide; safe to ship for national + California now.
3. **Flagger station helper.** Speed gives the distance from Table 6B-2, with the night-lighting reminder.
4. **Lane closure count sheet.** From job length and speed: how many cones, signs and stands to load on the truck.
5. **State card in the Rules screen**: which manual applies and the flagger card rule, from the `tc-<st>-adopt-1` cards,
   once the not-confirmed states are checked.
6. **Flagger card expiry on crew members** (3 years WA / OR / UT / KS / PA / WY, 2 years MA / SD / VT, 4 years MS / MO / NM).

## Decisions for Tommy
1. Load the federal core now and hold the unconfirmed state cards? Recommend: load the 37 federal core chunks and the 12
   confirmed-adoption states plus WA / OR / CA / CO detail; hold the other state cards until item 4 / 5 above are checked,
   or load them as they are since each one says what is not confirmed and who to ask.
2. Fix the two old sign-spacing chunks (ords 1914, 1984) at the same time. Recommend yes; they give California crews a
   wrong distance today.
3. Fix "1926.200-203" in TT-031 / TT-033. Recommend yes, next release.
4. Build the taper / cone calculator. Recommend yes; it is small, the math is settled, and crews ask for it.


## Pass 2 (Nov 20, afternoon): "Try harder to find those states manuals" - IN PROGRESS
Goal: check the 39 not-confirmed state cards against each state's own manual. Output goes to `v2/` (the original
`traffic_tc.jsonl` that `library_load_nov20/merge.py` reads is left as is until the lead swaps it). Running log: `v2/work/state_log.tsv`.
