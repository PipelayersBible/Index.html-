# Ask library: spec books and installation standards (lib_specs_nov20, Nov 20 2026)

Read-only work. Nothing was applied to the server, deployed, committed or pushed. Everything is staged in this folder.

**In one line:** 48 chunks are staged (41 core, 7 shelf) with 76 eval cases. That is real numbers for 13 state DOT books,
state separation rules for Texas, Florida and Montana, Ten States sewer rules, and 12 maker / standards summaries. It is
**not** "every state": 34 states have nothing new here, and Florida, Nevada and Utah (three of the nine priority states)
have only an edition card because their books would not open.

## Why it stopped where it did
- The web search allowance for this whole session (200 searches, shared by all helpers) ran out. The fetch tool only opens
  links a search has returned, so no new documents could be found after that.
- State spec books are single PDFs of 1 to 4 million characters, read 100,000 characters at a time. Finding one section
  takes 2 to 4 reads per book.
- Three hosts would not open at all: FDOT's file store, NDOT's document links, UDOT's Google Drive folder.

## Coverage

"Numbers" = values read in the book itself today and cited by section.

| State | Book and edition | What is staged | Not read |
|---|---|---|---|
| WA | WSDOT M 41-10, **2027** edition (page headers) | 5 chunks: 7-08 trench/bedding/backfill, 7-04 storm tests, 7-17 sewer tests, 7-09 water, 7-05/18/19 structures | 2-09, jacking |
| TX | TxDOT **2024** | 4 chunks: Items 400/401/402, 460/462/464, 468, 476/465/479. Plus Fort Worth 33 05 10 and the TCEQ 9-foot rule | roadbed density percent (Item 132) |
| CA | Caltrans **2025** (the 2026 page still points to the 2025 book) | 2 chunks: 19-3/19-5 backfill, 61/64/65/66 joints and tests | cover for construction loads |
| OR | Oregon **2024** (bids on or after Dec 1 2023) | 1 chunk of what was new (00406, 00490, video speed). Live or-1..or-3 re-read and agree | - |
| CO | CDOT **2025** | 2 chunks: 206 backfill, 603/604 pipe | 624 |
| AZ | ADOT **2021**; **2027 edition from Jan 4 2027** | 1 chunk, from ADOT's own Construction Manual (medium) | the spec text itself |
| MT | MDT 2025; DEQ-1 2022 | 2 chunks: 603/604; water main rules and separation | 203 density percent |
| ND | NDDOT 2023 | 1 chunk: 714/722/724 | - |
| WY | WYDOT 2021 | 1 chunk: 206/212 | 603 |
| KY | KYTC (edition year not printed in the file) | 2 chunks: 701, 705/706 | 710 |
| GA | GDOT 550 (2015 supplemental) | 1 chunk | 207 lifts and density |
| IA | Iowa DOT 2417 (rev. 10/20/2026) | 1 chunk | 2552, 2503, 2504 |
| IN | INDOT RSP 715-R-809 (09-01-26) | 1 chunk (mandrel share only) | base 715 text |
| OH | ODOT Item 611, **2013 online text** | 1 chunk, marked low / not confirmed | the 2023 book |
| FL | FDOT FY 2026-27 (eff. July 1 2026); FY 2027-28 posted | edition card + Rule 62-555.314 separation | Sections 125, 430, 425 |
| NV | NDOT 2024 | edition card only | everything |
| UT | UDOT (2027 listed) | edition card only | everything |
| Other 34 states + DC | - | nothing new | everything |

National (state "US"): Ten States Standards wastewater 2014 (4 chunks: slopes, manholes, tests, separation);
ASTM C12 clay load factors; DIPRA ductile iron guide (4); PVC Pipe Association sewer guide; Westlake C900 and D3034
guides; JM Eagle JME-07B; ADS TN 2.01; ACPA concrete pipe (2); Contech CMP.

**Asked for and not done:** ASTM D2321 class table, F2648/F2736, C76, AWWA C600/C605/C651/C900/C110/C153 and ASCE 15 as
their own summaries (they appear only as they are restated in the maker guides); the AWWA leakage formula and the
ASTM F1417 air-test time table (not found in a source I could open); backflow / cross-connection; Greenbook, MAG, Clark
County, Denver, NCTCOG, Houston, Austin, Seattle, Portland, Salt Lake, Atlanta, Charlotte, NYC DEP, Chicago MWRD; Diamond
Plastics, US Pipe, Forterra; FHWA FP-24 (three reads missed the sections).

## Findings

1. **Arizona changes spec books on January 4, 2027.** ADOT's page says the 2027 edition applies to all projects
   advertising on and after that date. Source: https://azdot.gov/business/contracts-and-specifications (read today).
2. **Texas is 9 feet, not 10**, for water / sewer separation (30 TAC 217.53(d), 290.44(e)). Florida is 6 feet (3 for storm)
   with 6 or 12 inches at crossings (Rule 62-555.314). The live library answers these with the Ten States 10 ft / 18 in.
3. **The live Ten States chunk (`ten-1`) names ten states in its source and first lines**, so the live state filter hides
   it in the other forty. The staged `std-tenstates-slope-1` replaces it in place (`supersedes`) and names no state.
4. **Live wa-1, wa-2, wa-3 and or-1, or-2, or-3 were re-read against today's books and agree.** The three Washington
   chunks are replaced in place by fuller ones that carry the 2027 edition.
5. **Deflection limits differ by state and Ask should not give one number**: 5 percent in CO, IA, TX (stop work), Ten
   States; 7.5 percent replace in TX, GA, OH; Kentucky pays 50 percent between 5.1 and 9.9 percent.
6. **Equipment over new pipe also differs**: 3 ft (WA), 4 ft (TX; MT, or half the diameter), 48 in (KY), 3 ft or the
   pipe diameter (IA, with construction traffic).

## App accuracy (pipe tables in `_src/index.html`)

No disagreement found. I compared the app's tables with the published standard dimensions as I know them; I could **not**
open a dimension table today (the two maker guides I read carry none), so this is a check, not a fresh source read.

| Where | What | Result |
|---|---|---|
| `_src/index.html:5390`, `:12896` | Ductile iron / C900 ODs (4.80 ... 50.80) | match AWWA C151 |
| `:5391`, `:12897` | SDR 35 ODs 4 to 15 in, and 18 to 48 in | match ASTM D3034 / F679 |
| `:12860-12863` | SDR 35 walls, C900 DR18 walls (OD/18), DI wall + lining | arithmetic checks out |
| `:12871` | Concrete wall B (ID/12 + 1 in) | matches ASTM C76 wall B |
| `:12893` (comment) | says "ASTM F679 (PS46) 18-48 in" | The PVC Pipe Association guide says D3034 has covered 3 to 60 inch since 2024, so F679 is being retired. Comment only; numbers unchanged |
| `:6578` (reference card) | thrust block concrete "2,500-3,000 psi" | DIPRA's guide says at least 2,000 psi. Not a conflict; agencies set it |

The app has no sewer air-test, mandrel or leakage calculator, so there was nothing to check against the test standards.
Not checked: fitting dimensions, the Prinsco corrugated HDPE table, clay ODs.

## What is in this folder
| File | What |
|---|---|
| `data/b01..b09_*.py` | The facts as written down after each read |
| `build.py` | Applies LIBRARY_RULES.md with `lib_kb.Batch`; run it to regenerate everything |
| `specs.jsonl` | 48 chunks (source of truth). 0 errors, 6 length warnings (`specs_report.txt`) |
| `sql/specs_core_00.sql`, `specs_core_precheck.sql`, `specs_shelf_00.sql` | Staged by lib_kb. **Not run** |
| `cases.py`, `cases.jsonl` | 76 eval cases: 42 state (2 or more for each of the 17 states), 34 national; 7 on "not confirmed" answers |
| `sources.csv` | 41 documents, including the ones that would not open |

Free retrieval check (`library_arch_nov20/tools/retr_cases.mjs`): **62 of 69 core cases** get their chunk in the first
search (90%); 7 shelf cases are skipped until the shelf search exists. The 7 misses are retrieval (app how-to chunks
outrank "run equipment over pipe"; general manhole chunks outrank the Ten States card).

## Limits a reader should know
- Every number was read **once**, through the fetch tool's own summary of the page, not by me from the page. The rules ask
  for safety numbers to be read twice. Before loading, someone should open the PDF and check at least: Texas trench
  protection 5 ft (Item 402), Washington shoring 4 ft (7-08.3(1)A), the cover-before-equipment numbers, and the TCEQ
  and Florida separation numbers.
- The ACPA compaction table came through garbled; I matched its rows to the Standard Installation layout. Marked medium.
- Kentucky's file does not print its edition year. Ohio is the 2013 text. Georgia's 550 is a 2015 supplemental.
- Section 6 of the rules (may DOT books be quoted) is open; everything here is summary with section numbers.

## For Tommy to get
Prices are from memory and **not confirmed today** (no search left). Check before buying.

| Document | Where | Rough price |
|---|---|---|
| ASTM D2321 (flexible pipe installation) | astm.org | about $60-75 |
| ASTM F1417 (plastic sewer air test: the time table) | astm.org | about $60-75 |
| ASTM C1479 (RCP installation), C12 (clay), D3034, F2648, F2736, C76 | astm.org | about $60-75 each |
| AWWA C600 (ductile install, leakage formula), C605 (PVC install), C651 (disinfection) | awwa.org store | about $100-140 each for non-members |
| AWWA C900, C110, C153 | awwa.org store | about $100-140 each |
| ASCE 15 (concrete pipe direct design) | asce.org | about $100 |
| Greenbook (SSPWC), current edition | BNi Building News | about $130-170 |
| NCTCOG Public Works Construction Standards | nctcog.org | price not known |
| Free, just would not open here: FDOT eBook FY 2026-27 (fdot.gov/specifications), NDOT 2024 book, UDOT 2025-2027 books, Ten States Water Works 2022, FHWA FP-24 | agency sites | $0 |

## Decisions for Tommy
1. **Load the 41 core chunks now?** Recommend yes, after the spot check above. They add 13 states' real numbers and fix
   the hidden Ten States chunk.
2. **Finish the other 34 states?** Recommend yes, in a fresh session with its own search allowance, most-built states
   first (FL, NY, PA, IL, NC, MI, NJ, VA, TN, MN). About 4 reads a state.
3. **Buy the standards?** Recommend only three: ASTM D2321, ASTM F1417 and AWWA C651. Those are the ones crews ask
   numbers from and that I could not source free.
4. **Florida, Nevada, Utah.** Recommend Tommy (or the lead) downloads those three books by hand and drops the PDFs in the
   repo; they are free and one helper can read them locally in minutes.
5. **Separation answers.** Recommend Ask answers separation from the state's own rule where the library has one
   (TX, FL, MT, CA) and says "Ten States figure; check your state" elsewhere.

## DONE
