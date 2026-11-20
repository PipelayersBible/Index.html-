# Ask library: federal OSHA and state safety programs (lib_osha_nov20, Nov 20 2026)

Read-only work. Nothing was applied to the server, deployed, committed or pushed. Nothing in `_src/index.html` was changed.
Written to `LIBRARY_RULES.md` / `lib_kb.py` (library_arch_nov20): both batches pass the checker with 0 errors.

**In one line:** 146 chunks (82 federal, 64 state) and 223 eval cases are staged. Federal trench, confined space, fall
protection, silica, reporting and the nine interpretation letters were read today. For the states, the rules that really
differ were read in the rule text (CA, WA, OR, MI, MD heat, UT / AK / HI / KY / VA / MI / WA / OR reporting); for the rest
the chunk says plainly what was and was not read. **The shared web-search budget ran out part way through**, so some
states and some federal subparts are marked "not confirmed" instead of guessed.

## What is in the folder

| File | What |
|---|---|
| `kb_fed.py`, `kb_states.py`, `build.py` | The source. `python3 build.py` regenerates everything below. |
| `lib_osha_fed.jsonl` | 82 federal chunks (`osha-pl-*` 73, `osha-loi-*` 9). 72 core, 10 shelf. 68 high, 13 medium, 1 low. |
| `lib_osha_sp.jsonl` | 64 state chunks (`sp-<st>-*`), 27 states. 63 core, 1 shelf. 21 high, 36 medium, 7 low; 34 carry "not confirmed". |
| `sql/lib_osha_*_core_00.sql`, `*_shelf_00.sql`, `*_precheck.sql` | Guarded inserts. **Not applied, not run.** |
| `cases.py`, `cases.jsonl`, `sql/eval_cases_lib_osha.sql` | 223 eval cases (94 federal, 129 state). Pass `lib_kb.py cases`. |
| `retrieval_check.txt` | Free retrieval check result (below). |
| `sources.csv` | 111 documents: title, publisher, URL, edition, licence, which chunks use it. |
| `src/research_log.md`, `src/app_PB_SR_r1711.json` | Raw findings as read; the app's state table as it is in r17.11. |

No source file was downloaded: the shell cannot reach the web, and the fetch tool returns text only. Every row in
`sources.csv` is a page that was read online on 2026-11-20 (or, where the chunk says so, on 2026-11-19 by an earlier helper).

## Coverage: federal

| Subject | Read today | Chunks | Not done |
|---|---|---|---|
| Subpart P excavations 1926.650-.652 | yes (eCFR, osha.gov) | 20 | 1926.651(i) exceptions, bench heights and Appendix C / D tables are images: marked not confirmed |
| Appendices A, B | yes (text) | in the 20 | Table B-1 itself is an image on every page read; values match the app, the existing library text and Cal/OSHA's copy |
| Subpart AA confined spaces 1926.1201-.1213 | yes | 12 | - |
| Subpart M fall protection 1926.501-.503 | yes | 6 | was missing from the library before |
| Silica 1926.1153 | yes | 3 | - |
| Subpart C (1926.20, .21, .32) | yes | 3 (+ General Duty, medium) | OSH Act text not re-read |
| Subpart D first aid, water, toilets, noise | 1926.50 read; .51 / .52 from the 29 CFR text already in the library (eCFR 2026-09-30) | 3 | - |
| Subpart E PPE | library text | 2 | - |
| Subpart G signs / MUTCD | yes | 1 | - |
| Subpart K electrical | 1926.416 / .417 library text | 1 | GFCI 1926.404: shelf, not re-read |
| Subparts N / O / CC equipment, rigging, cranes | 1926.600-.602, 1926.1400 read; 1408 library text | 4 | crane operator / signal person: shelf, not re-read |
| 1904 reporting and recordkeeping | 1904.39 and 1904.7 read | 2 | 300 / 300A / 301 dates (1904.1, .29, .32, .33, .41): shelf, not re-read |
| 1910.147 lockout, 1910.1200 hazcom | 1910.147 read; 1910.1200 library text | 2 | - |
| Heat | OSHA rulemaking page and proposed rule text read | 2 | - |
| Interpretation letters | 9 read | 9 | 5 more found but not opened (below) |
| Lead, fire, scaffolds, concrete, tunnels (Subpart S), asbestos pipe | **not re-read** | 6 (plus GFCI, crane basics, 300 log dates = 9 shelf cards), all "not confirmed" | read and promote |

## Coverage: state plans (22 with private-sector coverage + 6 public-only + territories)

"Rule read" = the state's own rule text or the agency's own page was read today.

| State | Trench | Confined space | Heat | Reporting | Fall | Programs / training |
|---|---|---|---|---|---|---|
| CA | rule read (1541, 1541.1); permit 341 not re-read | 1950 read; items from Nov 19 | rule read (3395) | rule read (342); 330(h) not read | rule read (1670) | 1509 / 3203 **not read** |
| WA | rule read (4 ft; June 2026 plan rule) | Nov 19 read | L&I page read | rule read | titles only | in heat chunk (APP) |
| OR | rule read (0096) + adoption | Nov 19 read | rule read; Tables 1-2 not | rule read | rule read (1501) | not read |
| MI | Part 9 (earlier helper today); Table 1 from MIOSHA card | Part 35 **not opened** | none found | rule read | not read | not read |
| MD | supplement to 1926.651 exists, **not read** | supplement exists, **not read** | rule read (COMAR 09.12.32) | not read | - | - |
| MN | fact sheet (earlier helper) | repealed, federal | not read | not read | - | MNOSHA page read (AWAIR, committees, PPE) |
| VA | not unique (OSHA page) | federal since 2016 | DOLI page read: no rule yet | statute read | - | unique list read |
| NV | not unique (OSHA page) | not unique | agency guidance read | not read | - | NRS 618.983 read |
| UT | app table / adoption table | adoption table | none found | rule read (8 h, any serious injury) | - | - |
| AK | adopts by reference (8 AAC 61.1010 read) | same | none found | statute read (8 h) | - | - |
| HI | not unique (OSHA page) | not unique | none found | rule read ($25,000 property damage) | - | - |
| KY | 803 KAR 2:415 (earlier helper) | - | - | rule read (changed Feb 3 2026) | listed, not read | - |
| NM | identical (OSHA page) | identical | agency page + draft read: proposed only | identical | identical | - |
| AZ, TN, NC | not unique (OSHA / agency pages) | not unique | not read | not read | AZ has a state rule, not read | NC list read |
| SC | competent-person definition (agency PDF) | - | - | not read | - | - |
| IN | "a unique excavations standard" per OSHA, **not found** | - | - | - | - | - |
| IA, VT, WY | **not read** (one honest placeholder each) | | | | | |
| CT, IL, ME, MA, NJ, NY | federal OSHA covers private crews (OSHA page); public-sector rules not read | | | | | |
| PR, VI, other territories | one federal-scope chunk; PR OSHA's rules not read | | | | | |

`lib_kb.py` has no code for Puerto Rico or the Virgin Islands, so the territories sit in a US chunk (`osha-pl-territories-1`).

## Findings that matter to a crew (ranked)

1. **Washington: a competent person must stay on site and a written trench work plan is required since June 1, 2026**
   (WAC 296-155-655(13), WSR 26-09-113). Read in the rule and the adoption notice. The app's state table already says this.
   New for the app: **walkway guardrails from 4 ft** in Washington (296-155-655(12)); the library and Education say 6 ft.
2. **Reporting times differ in at least five plans and the app / library carry only the federal 8 and 24 hours**:
   California 8 hours for any serious injury (8 CCR 342); Washington 8 hours for a hospitalization (WAC 296-27-031);
   Utah 8 hours for any "disabling, serious, or significant injury" (R614-1-5); Alaska 8 hours for a hospitalization,
   amputation or eye loss (AS 18.60.058); Hawaii adds property damage over $25,000 (HAR 12-52.1-1). Kentucky's old
   72 hours is gone: 803 KAR 2:181 now simply applies 29 CFR 1904 (effective Feb 3 2026).
3. **Michigan is its own rule** (Part 9): confirmed again; chunk values for Table 1 still rest on MIOSHA's card, not the
   standard's own page (same caveat as michigan_nov20).
4. **Heat: nothing changed federally** (no final rule; last step Oct 30 2025). Maryland's numbers are heat index
   (80 / 90 / 100), Oregon's are heat index (80 / 90), Washington's and California's are air temperature. Virginia: law
   passed, standard due by May 1 2028, advisory panel met Oct 15, Oct 29 and Nov 12 2026. New Mexico: still proposed
   (fourth motion to reschedule the hearing, Aug 11 2026). Nevada: no temperature trigger; job hazard analysis for
   employers with more than 10 employees.
5. **South Carolina writes training into the trench competent person definition**; **Indiana is said by OSHA to have
   "a unique excavations standard"** that I could not find. Both need a human look before the app says "federal" there.
6. **Maryland has state supplements to the federal excavation and confined space rules** (MOSH's own list). Not read.

## App accuracy list

Line numbers are `/tmp/claude-0/r1711/src.html` (r17.11 candidate). Nothing patched.

| # | Where | What the app says | What I found | Source |
|---|---|---|---|---|
| 1 | State table `PB_SR`, line 70869, `trench` rows for AK, HI, NC, TN, VA | "State OSHA plan... we have not checked whether this plan is stricter" (`ft: null`) | Excavation is not among these plans' unique standards: AK "adopted all federal OSHA standards... by reference" (8 AAC 61.1010(c) includes 1926.652); TN lists no construction difference; NC's state-specific list has no excavation rule; HI and VA unique lists have none. Could read "uses the federal rule: 5 ft", medium confidence (agency / OSHA pages, not each state's code). | osha.gov/stateplans/AK, /HI, /VA, /TN; labor.nc.gov/north-carolina-state-specific-standards |
| 2 | Same table, SC | "not checked" | Federal text, plus the competent person "must have specific training in... soils analysis, the use of protective systems". Depth stays 5 ft. | osha.llr.sc.gov "SC 1926 standard modifications" |
| 3 | Same table, IN, MD, IA, VT, WY | "not checked" | Keep as is. IN: OSHA says a unique excavation standard exists (not found). MD: a MOSH supplement to 1926.651 exists (not read). IA, VT, WY: not read. | osha.gov/stateplans/IN; labor.maryland.gov/labor/mosh/moshspecific.shtml |
| 4 | Same table, MI / MN / KY | "not checked" | Already fixed in the staged michigan_nov20 patch; nothing new. | - |
| 5 | Same table, WA row | 4 ft; written plan and competent person on site from June 1 2026 | Correct. Could add: guardrails on trench walkways from 4 ft. | WAC 296-155-655(12), (13) |
| 6 | Same table, CA `permit` | Permit for 5 ft or deeper (8 CCR 341), emergency repair exempt | 8 CCR 1539 does point to 341; 341 itself not re-read today. No disagreement found. | dir.ca.gov/Title8/1539.html |
| 7 | `PB_CP_RULES`, line 30038 | CA 8 CCR 1955; OR signature; WA 296-809-50004; all others federal | No disagreement found. Two open points: MOSH lists a Maryland supplement to 1926.1201-1213 (not read), and OSHA's Michigan page lists "Confined Spaces" as differing in construction while OSHA's 2016 adoption table says identical (Part 35 not opened). Neither is confirmed to change a permit item. | moshspecific page; osha.gov/stateplans/MI |
| 8 | Trench Sloping `TRENCH_SLOPES`, line 34198; option list line 9031 | rock 90, A 0.75:1 (53), short-term A 0.5:1 (63, 12 ft / 24 h), B 1:1 (45), C 1.5:1 (34); short-term refused over 12 ft; engineer at 20 ft or deeper | Matches Appendix B. "Short term" = open 24 hours or less; 12 ft limit confirmed. The table's heading is "less than 20 feet" and the figures say "20 feet or less", so the app's engineer message at exactly 20.0 ft is on the strict side; fine. | law.cornell.edu Appendix B to Subpart P |
| 9 | Heat toolbox talk, line 6094 ("State heat rules...") | "shade up from 80 F ... high-heat steps from 90 F (Washington, Oregon, Maryland) or 95 F (California) ... rest at least 10 minutes every 2 hours from 90 F and 15 minutes every hour from 100 F (Washington, Maryland)" | Numbers are right. Two wording gaps: Oregon and Maryland count **heat index**, Washington and California count air temperature (the talk says only "F"); and Oregon also requires a written rest-break schedule at a heat index of 90 (it is left out of the rest-break list). Nevada (job hazard analysis, no trigger) is not mentioned. | OAR 437-002-0156; COMAR 09.12.32; lni.wa.gov/HeatSmart; 8 CCR 3395 |
| 10 | Injury reporting | The app has no reporting screen (only library text) | If one is ever added it must be by state: see finding 2. | - |
| 11 | Existing library chunks | `plan-mi-trench-1`, `plan-or-confined-1`, `plan-wa-confined-1`, `plan-trench-depth-1` (ask_nationwide_nov20) | The new `sp-mi-trench-1`, `sp-or-confined-1`, `sp-wa-confined-1` say the same things with more detail. They do not contradict; the lead may want `supersedes` so there is one card per subject. `plan-trench-depth-1` lists 13 plans as unread: after this batch AK, HI, NC, TN, VA, SC can be named. | - |

## Eval

- 223 cases: 94 federal, 129 state (every state-plan difference written up has at least 2). All pass `lib_kb.py cases`.
  Each case's must-facts were checked against the text of its own chunk (0 misses).
- Free retrieval check (`library_arch_nov20/tools/retr_cases.mjs`, state-aware search, no AI calls):
  **169 of 223 get their chunk in the first search; 208 of 223 have every must-fact in what the model would be handed.**
  The 54 chunk misses are mostly federal questions where the existing 29 CFR text or app chunks fill the six places
  first (the fact is still there in 39 of them). The 15 where the fact is missing are the ones to look at:
  mainly state reporting ("how long to report" pulls the federal 1904 text ahead of the state card in CA, WA),
  Maryland heat ("when do the heat rules start"), Nevada OSHA-10, and a few confined space questions.
  Run: `node tools/retr_cases.mjs ../lib_osha_nov20/cases.jsonl ../lib_osha_nov20/lib_osha_fed.jsonl ../lib_osha_nov20/lib_osha_sp.jsonl`.
- No model-graded eval was run (it costs money and writes to the server).

## Not done, said plainly

- **Search budget ran out.** Not read at all: Iowa, Vermont, Wyoming, Puerto Rico; OSHA's own pages for UT, NC, MD, MN.
  Not read for any state unless the table above says so: silica differences, state fall protection text (WA 296-880
  sections, AZ, KY), state first aid / training rules, state heat rules beyond CA, WA, OR, MD, NV, NM, VA.
- Nine federal cards sit on the shelf marked "not confirmed" (lead, fire, GFCI, scaffolds, cranes basics, concrete,
  tunnels, asbestos pipe, 300 / 300A dates). They are standard numbers but were not re-read today.
- Interpretation letters found but not opened: 2007-12-19 (staying in a trench box while a load is lowered),
  2003-10-23 (hydro-vac to locate), 2002-06-24 (fall protection at trenches 6 ft or deeper), 1995-08-10 (crossings),
  2009-10-13 (excavations nobody enters), 2025-01-03 (permit-required confined space).
- Cal/OSHA 341 (permit), 330(h) (serious injury), 1509 / 3203 (IIPP), 1532.3 (silica), 5157 were not read today.

## For Tommy to get (or for a helper with search budget)

Nothing here is behind a paywall. These are the documents that would not open or were not reached:

1. **MIOSHA Part 9, page with Table 1** (still an image): "MIOSHA-STD-1306, Construction Safety Standard Part 9,
   Excavation, Trenching and Shoring", michigan.gov/leo MIOSHA standards page. One look at the table settles the Michigan slopes.
2. **MIOSHA Construction Part 35, Confined Space in Construction** (R 408.43501-43510), same site.
3. **Indiana's excavation standard**: ask IOSHA (in.gov/dol) which rule OSHA means by "a unique excavations standard".
4. **Maryland MOSH supplements** to 29 CFR 1926.651 and 1926.1201-1213: linked from labor.maryland.gov/labor/mosh/moshspecific.shtml.
5. **Washington chapter 296-880 WAC**, section 296-880-30005 (construction fall protection heights) and
   **WAC 296-62-095 to -09560** section text (heat), app.leg.wa.gov.
6. **Oregon OAR 437-002-0156 Tables 1 and 2 and Appendix A** (rest-break minutes), osha.oregon.gov Division 2 Subdivision J PDF.
7. **Cal/OSHA 8 CCR 341, 330(h), 1509, 3203, 1532.3**, dir.ca.gov/title8.
8. State OSHA rule pages for **Iowa (875 IAC), Vermont (VOSHA), Wyoming, Puerto Rico (PR OSHA)**, and each plan's
   injury-reporting rule for AZ, NV, NC, SC, TN, MN, MD, IN.

## Decisions for Tommy (5)

1. **Load the 135 core chunks now?** Recommend yes for the federal batch (72) and the states read in the rule text
   (CA, WA, OR, MI, MD, UT, AK, HI, KY, VA reporting); hold the 7 "low" placeholders (IA, VT, WY, IN, MI confined space,
   CA IIPP, WA fall) until someone reads the rules, or load them knowing they only say "not confirmed, ask the agency".
2. **Reporting times by state in the app.** Five plans are stricter than the federal 8 / 24 hours. Recommend adding a
   "report a serious injury" line to the state Rules screen from these chunks, starting with CA, WA, UT, AK, HI.
3. **Update the state table's "not checked" trench rows** for AK, HI, NC, TN, VA to "uses the federal rule, 5 ft" and add
   South Carolina's training line. Recommend yes, marked medium (agency pages, not each code), with the yearly re-check.
4. **Heat talk wording.** Recommend one small edit: say "heat index" for Oregon and Maryland and add Oregon to the
   rest-break line. Numbers stay.
5. **Finish the unread states.** Recommend one more pass with a fresh search budget: Iowa, Vermont, Wyoming, Puerto Rico,
   Indiana's excavation standard, Maryland's supplements, and the eight unread federal subjects. About 40 page reads.

## DONE
