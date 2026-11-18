# Ask knowledge base: safety content audit (2026-11-18)

This was a read-only review. Nothing was written to the database, and nothing was deployed, committed or pushed. The proposed edits are in `/tmp/claude-0/audit/askkb/fixes.sql` and have **not** been applied. Every UPDATE there is guarded so it only changes a chunk if the old phrase is still present. A read-only SELECT confirmed that all 22 old phrases are present in the live rows today.

## Where the library lives (found read-only)
- `pb_ai.kb_chunks (version, ord, lib, chunk jsonb)` holds 2,782 rows. The active version is `b3e91f6c47d2` (`pb_ai.kb_versions.active`). "Chunk N" means `ord` = N.
  - Libraries: app 0-237, field 238-2503, osha 2504-2781.
  - The osha library is eCFR text "current as of 2026-09-30". Appendix B is from a 2025-02-06 snapshot.
- `pb_ai.kb_index` and `pb_ai.kb_index_parts` hold the cached search-index blob. `public.pb_ai_kb_boot()` returns the blob only when `count(kb_index_parts) = kb_index.parts`.
- **How the Nov 17 edits invalidated the blob** (source: r16.77-r16.79 notes): they set `kb_index.parts = 32` while only 2 part rows were stored. With that mismatch, boot returns no blob and workers rebuild the index from rows. `fixes.sql` repeats this step and then runs a check query.
- Today `kb_index` still shows parts=32, saved_at 2026-11-16 13:33, and 2 stored part rows. The worker path that should re-save a rebuilt blob (`pb_ai_kb_index_put`) has not succeeded since Nov 17. Answers are still correct, because workers rebuild from rows on every cold start. See Decision 6.

## Method
I dumped every chunk to a local file with read-only SELECTs, then read in full every chunk on the safety topics listed below. Numbers were checked against primary sources where I could reach them.

Chunks read in full:
- **App:** permit and gas limits 63-70, 224, 225, 234, 235; locates 71-72.
- **Cal/OSHA:** 270-276, 2383-2385.
- **Confined space numbers:** 309-315.
- **Appendices in plain words:** 316-323.
- **Trench crossings and public protection:** 335-339.
- **Overview chunks:** 349-351.
- **Dewatering:** 352-354, 2291, 2497-2498.
- **Heat:**
  - California heat and safety: 376-387.
  - Federal and state heat: 402, 409, 512, 597, 647.
- **Rigging and equipment:** 666-677, 688-693, 1134, 1136, 1198, 2295, 2499-2501.
- **First aid:** 694-753.
- **Tools:** gas monitors, CO and noise 1497-1515; shoring and equipment 1166-1181.
- **Quick reference:** 1909-1920.
- **Traffic control:** 1981-1991, 2306, 2502-2503, 1914.
- **Trench safety:** 1992-2003.
- **811 and locates:**
  - General: 2010-2017.
  - California: 294-304, 2343-2352.
  - Codes and owners: 2490-2491.
  - State spec rows: 2397-2447.
- **Silica:** 351, 972, 1462-1464, 2385.
- **Other:** Greenbook 2370; glossary 765; 1158, 1205, 2117.
- **OSHA library:** spot-checked against the numbers below; 1926.650-652 with Appendices A-F; 1926.1202; 1910.146 App E; 1926.600; 1926.416-417. This library is verbatim eCFR.

Numeric consistency across chunks:

| Fact | Result |
|---|---|
| Ladder within 25 ft at 4 ft deep | Consistent |
| Spoil 2 ft back | Consistent |
| O2 19.5-23.5% | Consistent |
| LEL 10% in confined spaces vs 20% LFL in open excavations | Consistent and explained in chunk 309 |
| H2S 10 ppm | Consistent |
| CO 25 ppm | Consistent except chunk 272 (F01) |
| 5 ft protective-system depth | Consistent, but no chunk mentions Washington's 4 ft (F02-F04) |
| 20 ft engineer depth | Wording varies (F10) |

## Problem chunks

| Fix | Chunk | Topic | What's wrong | Correct statement and source | Severity |
|---|---|---|---|---|---|
| F01 | 272 | Cal/OSHA PELs | Says "the app's permit defaults (... CO 35)" and that a California company "may set CO to 25". This contradicts chunks 64, 234, 309, 315 and 1511, which say the app uses 25. The Nov 17 edit missed this chunk. | App default is CO 25. Cal/OSHA PEL is 25 ppm (8 CCR 5155 Table AC-1). https://www.dir.ca.gov/Title8/5155.html | HIGH |
| F02 | 2443 | Washington state row | The KB has no Washington trench rules at all. The app already uses 4 ft for WA (Nov 17), so on a WA job Ask contradicts the app. | Protective system at 4 ft unless stable rock, or under 4 ft with no indication of cave-in (WAC 296-155-657(1)(a)): https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-657.htm. New since June 1, 2026 (WAC 296-155-655(13), WSR 26-09-113): competent person on site whenever trench work is going on, a written trench excavation work plan, and training before entry: https://lawfilesext.leg.wa.gov/law/wsr/2026/09/26-09-113.htm | HIGH |
| F03 | 1912 | Quick reference: trench numbers | 5 ft is presented as universal. | Add: Washington 4 ft; California permit at 5 ft (sources as F02 and 8 CCR 341). | HIGH |
| F04 | 1992 | Trench safety: protective system | Same problem: 5 ft with no state caveat. | Same as F03, plus "your competent person and company program decide". | HIGH |
| F05 | 381 | Cal/OSHA serious-injury reporting | "Serious" is defined as hospital care over 24 hours. That test is outdated: AB 1805 removed it. This also contradicts chunk 274, which is correct. | Inpatient hospitalization of any length for other than observation or diagnostic testing, amputation, loss of an eye, or serious permanent disfigurement (Labor Code 6302(h); 8 CCR 330(h), 342). https://www.dir.ca.gov/title8/342.html (secondary confirmation: https://open-exam-prep.com/study-guides/ca-hvac-contractor/cal-osha-legal-safety/accident-reporting-enforcement) | MEDIUM |
| F06 | 2002 | Other excavation rules | (1) Reads as permission to dig after 24 hours without locates. (2) Says walkways are needed only at 6 ft or deeper. | 1926.651(l): walkways are required wherever employees or equipment cross; guardrails are required when the walkway is 6 ft or more above the lower level. 1926.651(b)(2)'s 24-hour clause does not override state one-call law. https://www.ecfr.gov/current/title-29/section-1926.651 | MEDIUM |
| F07 | 271 | Title 8 vs Subpart P | "Protective system at 5 ft unless stable rock or a competent person finds no cave-in potential below 5 ft" can be read as a competent-person waiver at 5 ft or deeper. | The waiver applies only under 5 ft (1926.652(a)(1)(ii); 8 CCR 1541.1(a)). https://www.ecfr.gov/current/title-29/section-1926.652 | MEDIUM |
| F08 | 2370 | Greenbook trench ladders | Says ladders extend 2 ft above the trench. That conflicts with the 3 ft ladder rule (and chunk 1998). | Side rails at least 3 ft above the landing (29 CFR 1926.1053(b)(1); 8 CCR 1675). https://www.ecfr.gov/current/title-29/section-1926.1053. I could not see the Greenbook text itself. | MEDIUM |
| F09 | 668 | Rigging inspection | The wire-rope removal criteria are attributed to OSHA, but they are ASME B30.9's. | OSHA 1926.251(c)(4)(iv): more than 10% broken wires in 8 diameters. https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.251 | LOW |
| F10 | 1912 (also 1992, 1995 vs 224, 316) | 20 ft engineer threshold | "20 ft or deeper" in some chunks, "deeper than 20 ft" in others. | Rule text: Table B-1 note 3 says "greater than 20 feet"; Figure B-1 covers "20 feet or less". OSHA's trenching page says 20 ft or greater. Align on "plan on an engineer at 20 ft". https://www.osha.gov/trenching-excavation | LOW |
| F11 | 316 | Table B-1 in words | Says Table B-1 is not in the OSHA library. It now is (chunk 2655). | Remove the stale note. | LOW |
| F12 | 322 | Appendix A soil tests | Says silt and gravel are Type C. Appendix A and chunk 1994 put angular gravel, silt, silt loam and sandy loam in Type B. | Appendix A (b) definitions. https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926SubpartPAppA | LOW |
| F13 | 972 | Milling and paving noise | Gives 85 dBA as the requirement. | OSHA construction limit is 90 dBA for 8 hours (1926.52); 85 dBA is NIOSH's recommendation. https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.52 | LOW |
| F14-F17 | 1500, 309, 64, 234 | CO limits | "Cal/OSHA 25 ppm, the strictest in the US" is a superlative I cannot verify. | "Lower than federal OSHA (50) and NIOSH (35)". | LOW |
| F18 | 721 (vs 301) | Electric contact | 50 ft stand-back here, 35 ft in chunk 301. | Give both and use the larger distance where possible. | LOW |
| F19 | 753 (also 702) | OSHA reporting | Federal times only. | Add California's 8 hours for any serious injury (8 CCR 342). | LOW |
| F20 | 2383 | Cal/OSHA trench permit | Says the permit is annual only. | 8 CCR 341 allows an annual or a project permit (chunk 270 is correct). https://www.dir.ca.gov/title8/341.html | LOW |
| F21 | 718 | H2S | Attributes the IDLH value to OSHA. | 100 ppm IDLH is a NIOSH value. https://www.cdc.gov/niosh/idlh/7783064.html | LOW |
| F22 | 2349 | California dig rules | Tolerance zone is "24 in from the outside edge" in every case. | Gov Code 4216(u): 24 in from a single mark (treated as centerline), or from each outside-edge mark when the width is shown. https://california.public.law/codes/ca_gov't_code_section_4216 | LOW |

### Checked and found correct
- **Excavation basics:** OSHA 1926.651/652 numbers, 25 ft ladder, 2 ft spoil, 4 ft atmosphere testing, 20% LFL.
- **Appendices:** Appendix A soil types (except F12); Appendix B slopes, benches, the 3.5 ft vertical lower portion and the 18 in rule; Appendix C/D load limits (240/100 lb per ft, 20,000 lb equipment) and the D cylinder ratings; 2 ft below a shield.
- **Confined spaces:** Subpart AA definitions (10% LFL, 19.5/23.5% O2), test order, continuous monitoring, the >5 ft vertical retrieval device, 1-year permit retention, rescue evaluation, alternate procedures; 1910.146 App E (CO 35 sewer alarm).
- **California:**
  - Cal/OSHA PELs: CO 25/200; H2S 10/15/50.
  - Article 37 (1950-1962), confirmed updated effective Jan 1, 2026: https://ohsonline.com/articles/2026/01/07/california-updates-confined-space-rules-for-construction.aspx
  - Gov Code 4216 timing: 2 working days, 14 days, 28 days.
  - Tolerance zone 24 in; high-priority definition (60 psig / 60 kV, with no 6 in clause).
  - Nonpressurized sewer and storm exclusion; working-day definition.
  - Penalties.
  - 3395 heat rule: 80/95 F triggers, 1 qt per hour, 5-minute cool-down, 14-day observation; the 10-minute rest at 95 F applies to agriculture only.
- **Iowa:** 48 hours, 18 in, ticket valid 25 days after the wait (https://iowaonecall.com/excavators/).
- **Traffic (MUTCD):** taper formulas, sign spacing, buffer table, cone spacing and heights. The 11th edition is noted in chunks 1981 and 2502.
- **Equipment and electrical:** 1926.600(a)(6) and 1926.1408 power-line distances; the excavator exclusion in 1926.1400(c)(2).
- **Silica:** Table 1 entries.
- **Noise:** 1926.52 table.
- **Heat:**
  - Washington, Oregon and Maryland heat triggers.
  - Federal heat rule: not final (chunk 402). This matches a Sept 2026 status report: https://insights.lockton.com/workers-comp-trends-to-watch/sept-2026/heat-regulation-accelerates-at-state-level-federal-rulemaking-remains-uncertain
- **First aid:** the library is consistent with its cited sources and carries "don't be the second victim" framing throughout.
- **Framing:** "competent person / entry supervisor / company program decides" is present in nearly all trench and confined-space chunks. Chunks 116 and 2157 say Ask never decides safe-to-enter.

### Not verified
- The Caltrans plate-thickness table in chunk 338.
- MUTCD 11th-edition paddle size and table numbers. Chunks 1985-1987 cite 2003-edition text, but the values match what I know of the 2009 and 11th editions.
- The exact wording of 8 CCR 1541(g) and 1541(l).
- Iowa's mark-life figures (5/10 working days) in chunks 2014 and 1690.

## DECISIONS FOR THE OWNER
1. **Washington rules (F02-F04).** Approve the wording. Also decide whether the app should surface the new WA requirements (competent person always on site; written trench work plan) next to the Nov 17 4 ft change.
2. **20 ft threshold.** The Trench Sloping calculator (chunk 224) still gives a slope at exactly 20 ft, with a warning. Decide whether 20 ft should already require an engineer (the conservative reading, which matches OSHA's guidance) or stay as is (the rule text says "greater than 20 ft").
3. **State 811 numbers.** The 50 state rows (2397-2446) deliberately give no notice period, ticket life or tolerance zone ("check the current rules"). Only California and Iowa have numbers. Decide whether to keep that safe deferral or add a verified per-state table. Adding one is a larger research job and must be re-checked yearly.
4. **Lockout gap.** The only lockout content is 1926.416/417 (electrical tags). There is no plain-language chunk on hazardous energy for bypass pumps, lift stations or pump isolation before entry (1926.1207 isolation). Decide whether to add one.
5. **Superlatives (F14-F17).** These touch two chunks edited on Nov 17 (64, 234). They are optional wording fixes.
6. **Index blob re-save.** No worker has saved a fresh blob since Nov 16 (parts still 32 vs 2 rows). That is harmless but costs a full rebuild on every cold start. Check the `kb_blob_saved` / `kb_blob_save_failed` lines in the Ask function logs.
   - Note: the put RPC deletes and re-inserts `kb_index` only on part 0. Old part rows above the new count are never deleted. That is fine today (count 2 → 2) but worth a cleanup if the blob ever shrinks.
7. **Rebuild from source.** Like the Nov 17 edits, these edits live only in the DB rows. A KB rebuild from source (`/home/claude/kb_add/*.py`, `ask_boot/seal_kb.py`) would revert them unless they are carried into the source.
8. **When edits take effect.** Warm Ask workers keep their in-memory index. Edits reach answers only as workers cold-start; I did not redeploy anything.

## DONE
