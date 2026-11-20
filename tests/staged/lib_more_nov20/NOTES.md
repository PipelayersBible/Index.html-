# Ask library: "everything else" (lib_more_nov20, Nov 20 2026)

Read-only work. Nothing was written to the server, deployed, committed or pushed. Everything here is staged.
Rules followed: `tests/staged/library_arch_nov20/LIBRARY_RULES.md` and `lib_kb.py` (as they stood at 08:50 on Nov 20).

**In one line:** the live library was already broad (2,840 chunks), so most of the topics in my brief were covered. The one
real hole was DOT rules for crew trucks (almost nothing). I staged 37 chunks (DOT, EPA stormwater permit, asbestos-cement
pipe, spills, disinfection, permits, getting paid), 56 eval cases, and found two existing library answers that are a
standard-edition behind and two emergency questions that the first search misses.

## 1. What was missing (how I decided what to build)

Looked at: live `pb_ai.kb_chunks` (version b3e91f6c47d2, 2,840 rows) by library / topic / id prefix, a keyword count for 120
subjects, the real-question log `pb_ai.gaps` (12 rows), and `pb_ai.eval_set` (200 rows by category).

Real questions logged (topics only): meal and rest breaks on long shifts (2), form geometry for a curb corner (2), reading
a stake or stake abbreviation from a photo (5), why storm manholes hold water at the bottom (1, still open), and 2 photo
follow-ups. The log is too small to rank topics by, so the ranking below is my judgment of how often a crew or office asks.

| Rank | Topic in the brief | Live library before | What I did |
|---|---|---|---|
| 1 | DOT for crews (CDL, hours, inspections, hauling) | **Hole.** 0 chunks on hours of service, logs, DVIR, USDOT number, medical card, annual inspection; CDL only in passing | 14 chunks |
| 2 | Stormwater / SWPPP / dewatering discharge | Concepts yes (about 10 chunks), California permit yes; **no federal permit numbers** (inspection days, 14-day stabilization, daily dewatering check) | 5 federal chunks + Texas |
| 3 | Water main disinfection and bac-T | Well covered (17 titled chunks) but partly on the 2005 edition of AWWA C651 | 3 chunks from the 2014 edition + Florida's state rule; 2 conflicts reported (section 3) |
| 4 | Asbestos-cement pipe | 4 chunks, general ("trained workers, wet methods"); no thresholds, no bursting answer | 3 chunks |
| 5 | Spills and fuel storage | No reporting number, no SPCC line | 2 chunks |
| 6 | Permits (encroachment / right of way) | Only inside California patch chunks | 3 states (CA, TX, FL) |
| 7 | Prevailing wage / certified payroll | Heavily covered (all 50 states + federal) | 1 chunk (the 7-day deadline was missing) + Miller Act |
| 8 | Getting paid (liens, prelim notices) | **None** | Federal Miller Act + California prelim notice |
| 9 | Testing (hydro, air, mandrel, vacuum) | Well covered, formula right (L = S x D x sqrt(P) / 148,000) | Eval cases only |
| 10 | Survey and grade | Well covered (about 130 chunks + the app's formula chunks) | Eval cases only, computed with the app's own formulas |
| 11 | Equipment, lifting, rigging, trench boxes | Covered (about 60 chunks + OSHA crane text) | Eval cases only |
| 12 | First aid and emergencies | Covered (60 chunks) | Eval cases only; 2 retrieval misses found (section 3) |
| 13 | Pipe, joints, fittings, tapping | Covered | Eval cases only |
| - | Unexpected finds (bones, artifacts), Corps stream permits | None | 1 chunk each |

## 2. What is staged (none applied)

| File | What |
|---|---|
| `build_lib_more.py` + `trims.py` | Source of the chunks. `python3 build_lib_more.py` regenerates everything and runs the library checker. |
| `lib_more.jsonl` | **37 chunks**: 33 core (answer cards, 1,200 characters or less), 4 shelf. Checker: 0 errors. |
| `sql/lib_more_core_00.sql` | Guarded insert of the 33 core chunks. Not applied. |
| `sql/lib_more_core_precheck.sql` | SELECT only. Equivalent check run on live today: 0 of these ids exist, 2,840 rows, max ord 2839. |
| `sql/lib_more_shelf_00.sql` | The 4 shelf chunks. Needs `pb_ai.kb_shelf`, which does not exist on the server yet, so Ask cannot see these until the shelf is built. |
| `cases_new.jsonl` | 38 eval cases whose answers are in the new chunks (all 13 new subjects, 3 or more each for the main ones). |
| `cases_existing.jsonl` | 18 eval cases on subjects already in the live library (testing 4, survey math 5, equipment 3, emergency 3, pipe and taps 3). Can be run today. |
| `sources.csv` | 37 documents read, with URL, edition and licence note. |
| `src/*.md` | The exact quotes each fact came from. |
| `work/retrieval_check_*.txt` | Output of the free retrieval check. |

Chunks by id:
- DOT (14): `fed-fmcsa-cdl-classes-1`, `-cmv-10001-1`, `-usdot-number-1`, `-medical-card-1`, `-hos-limits-1`, `-hos-shorthaul-1`,
  `-hos-construction-1`, `-hos-onduty-1`, `-eld-exempt-1`, `-dvir-1`, `-annual-inspection-1`, `-cargo-check-1`,
  `fed-fhwa-size-weight-1`, `fed-phmsa-fuel-cans-1`.
- Stormwater (6): `fed-epa-cgp-who-1`, `-inspections-1`, `-stabilization-1`, `-dewatering-1`, `-paperwork-1` (shelf), `env-tx-cgp-1`.
- Asbestos-cement pipe (3): `osha-loi-acpipe-class-1`, `fed-epa-acpipe-neshap-1`, `fed-epa-acpipe-bursting-1`.
- Spills, streams, finds (4): `fed-epa-spill-report-1`, `fed-epa-spcc-1`, `fed-usace-nwp-2026-1`, `fed-achp-discovery-1` (shelf).
- Disinfection (4): `std-awwa-c651-methods-1`, `-bact-1`, `-repairs-1`, `spec-fl-dep-main-disinfection-1`.
- Permits (3): `row-ca-encroachment-1`, `row-tx-uir-1`, `row-fl-utility-permit-1`.
- Office (3): `fed-dol-certified-payroll-due-1`, `fed-law-miller-act-1` (shelf), `lic-ca-prelim-notice-1` (shelf).

**Id prefixes.** The brief gave me env-, dot-, eq-, survey-, emp-, field-. The checker only accepts the collections in
LIBRARY_RULES.md, so I used those: DOT went under `fed-fmcsa-` / `fed-fhwa-` / `fed-phmsa-`, EPA under `fed-epa-`, state
stormwater under `env-<st>-`, state highway permits under `row-<st>-`, AWWA under `std-awwa-`. Two do not fit cleanly and
need the architecture helper's call: `lic-ca-prelim-notice-1` (there is no collection for state payment and lien law) and
`osha-loi-acpipe-class-1` (an OSHA letter, which is the OSHA helper's collection; check for a clash with their batch).

**Marked "not confirmed" in the text (9 chunks, confidence medium):** whether a new-construction pipe crew counts as a
"utility service vehicle" for hours of service; the gallon size where a fuel tank becomes "bulk"; the 55-gallon container
rule for SPCC; the terms of the 2026 Corps utility-line permits; review times for TxDOT and FDOT permits; and whether the
2023 edition of AWWA C651 changed the 2014 numbers (3 chunks).

## 3. Findings (ranked by what a crew would feel)

**F1. Two emergency questions miss the first-aid chunks in the first search (live library, today).**
`node tools/retr_cases.mjs ../lib_more_nov20/cases_existing.jsonl` (in `library_arch_nov20`):
- "Guy is confused and stumbling and its 100 out. What do I do?" returns grade-math and app chunks; the heat stroke chunks
  (`first_aid-16`, `first_aid-19`) are not in the six, and none of the must-facts (911, cool him) are in the excerpts.
- "Trench wall caved in on a guy up to his waist. Should we jump in and dig him out?" returns OSHA shoring appendix text;
  `first_aid-13` (buried worker response) and `first_aid-2` (don't become the second victim) are not returned.
The chunks exist and are right. The cause looks like the first-aid topic being ranked down unless the question is
recognized as an injury; these two are worded the way a crew would word them and are not recognized. This is the free
check of the first search only: the model can search again by itself, so the written answer may still be right. Not
verified with a paid run. Both are in `cases_existing.jsonl` (`lib-us-em-1`, `lib-us-em-2`).

**F2. The library gives the 2005 bac-T rule as the rule.** `test-3` says "two sets at least 24 hours apart". AWWA C651-14
(Sec. 5.1.1) gives two options: a second set at least 16 hours after the first, or the main sits 16 hours and two sets are
taken 15 minutes apart. `testing-water-10` already says later editions differ; `test-3` and `quick-reference-3` do not.
Source: the C651-14 text (see sources.csv). Staged chunk `std-awwa-c651-bact-1` carries the 2014 rule. I did not write a
replacement for `test-3`; per the rules this is a note for the lead (a small `supersedes` edit).

**F3. The library's flushing velocity is the 2005 number.** `quick-reference-3` says "Flush at about 2.5 ft per second
(8 inch about 390 gpm)". C651-14 Sec. 4.4.2 says 3.0 ft per second or more before chlorinating. Same fix as F2.
Neither F2 nor F3 could be checked against the current 2023 edition (paywalled, see "For Tommy").

**F4. DOT: the on-duty rule is the one crews get wrong.** Trench hours count toward a driver's 14-hour day
(49 CFR 395.2, 395.3), so a pipelayer who starts at 6 am cannot legally drive a truck and trailer over 10,001 lb combined
back to the yard at 8:30 pm, unless the 16-hour day for non-CDL short-haul trucks applies (2 days in 7). The library had
nothing on this. If Tommy builds timesheets (claude/Future_Timesheets_Plan.md), this is a natural warning to add.

**F5. The federal stormwater permit runs out on February 16, 2027** and the replacement was still only proposed on
EPA's page dated November 17, 2026. The staged chunk says so; it needs a re-read in February.

**F6. The one open real question ("why do storm manholes hold water at the bottom") has an answer in the library**
(`drains-types-14`, sumps) but the first search returned OSHA confined-space text instead. I did not build a chunk:
there is no library collection for general field knowledge, and the fix is a retrieval one (crew wording in the title).

## 4. App accuracy

The app has no pressure-test, leakage, disinfection or DOT calculators, so there was little to compare. Checked and found
consistent with sources:
- Flush / Flow Rate (`_src/index.html:5908`, formula 29.83 x C x d squared x sqrt(P)): standard hydrant flow formula; nothing to change.
- Toolbox talk TT-045 Pressure and Air Testing (`_src/index.html:5629`, the talks library): "Never air test PVC pressure
  pipe" and the C600 / C605 references are consistent with the library.
- Survey math eval cases were computed with the app's own formulas (HI = known elevation + rod; 0.35 ft = 4-3/16 in).

Worth changing, small and not safety-critical:
- TT-044 Dewatering says only "Discharge water where the plan says ... in line with environmental rules". The EPA permit
  has concrete checks a crew can do (no foam, no sheen, daily look at the outfall). Proposed one added key point; not patched.
- TT-048 Fire and Fueling says "keep spill kits on site" but gives no number to call. Proposed: add the National Response
  Center number (1-800-424-8802) for a spill that reaches water; not patched.
- TT-036 Heat Illness lists state numbers (California, Washington, Oregon, Maryland). **Not checked by me**: heat rules
  belong to the OSHA / state plan helper.

## 5. Eval

Free retrieval check (no AI calls), run from `library_arch_nov20`:

| Cases | Result |
|---|---|
| `cases_new.jsonl` with the staged core chunks added | 34 of 34 get their chunk in the first search (4 more are shelf cases, skipped) |
| `cases_existing.jsonl` on the live library | 14 of 18; the 4 misses are F1 (2), a manhole vacuum test question and a trench-box question whose facts were found in other chunks |

Three chunk titles were reworded in crew language after the first pass (30 of 34) to get there. No paid eval was run.
The rules ask for 2 cases per 10 chunks; there are 38 for 37 chunks. Eight cases are on things marked "not confirmed" or
where the right answer is "no".

## 6. Not done / not checked

- State stormwater permits beyond Texas (California was already there); 48 states remain. State DOT permits beyond CA, TX, FL.
- State CDL and in-state hours-of-service differences (the `lic-` collection): none written.
- State health-department disinfection rules beyond Florida.
- 49 CFR 393.130 (equipment tie-downs) is already in the library; my fetch of the rule failed, so it was not re-verified.
- The EPA permit PDF was read to character 200,000 of 317,823 (Parts 1 to 8); the appendices after that were not read
  except Appendix B, which was read separately.
- Several rules were read on mirrors (law.cornell.edu, findlaw, california.public.law) because the official sites were not
  reachable from here. The text is the government's; the mirror may lag.
- Lien law for states other than California.

## For Tommy to get

1. **AWWA C651-23, Disinfecting Water Mains** (current edition; store.awwa.org, paid). I could only read the 2014 edition
   from a town's posted copy. Needed to settle F2 and F3.
2. **AWWA C600-23** (ductile iron installation and testing) and **AWWA C605-21** (PVC), same store. The library's leakage
   formula comes from utilities quoting these, not from the standards themselves.
3. **The 2026 Corps nationwide permit text for utility lines** (Federal Register, January 8, 2026, document 2026-00121,
   free on govinfo.gov but too large to read here). Needed for the acreage limits at stream crossings.
4. **A state DOT permit example from a real job** (the approved Caltrans or TxDOT permit with its conditions), if he has
   one: the notice-before-starting times are in the permit, not on the agency pages.

## Decisions for Tommy (5)

1. **Load the 33 core chunks?** Recommend yes, DOT first. They are short, federal, and fill a hole crews hit every day.
2. **Fix the two emergency retrieval misses (F1) before more library goes in?** Recommend yes: it is a ranking change, not
   content, and it is safety. Confirm with one paid run of the two cases first (about 5 cents).
3. **Buy AWWA C651-23 (and C600-23, C605-21)?** Recommend yes. Disinfection and pressure testing are asked on every water
   job and the library is currently one or two editions behind on two numbers.
4. **Where do "getting paid" rules live?** Lien and notice law has no collection. Recommend adding one (for example
   `pay-<st>-`) rather than stretching `lic-`, and then doing the 10 biggest states.
5. **Add the driver-hours warning to timesheets when they are built?** Recommend yes, as a plain note ("over 14 hours on
   duty: this person should not drive the truck and trailer"), not a block.

## DONE
