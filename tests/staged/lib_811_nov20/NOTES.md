# lib_811_nov20: 811 / one-call / damage prevention library (Nov 20 2026)

Read-only work. Nothing applied to the server, nothing deployed, the app not patched. Every source was opened on Nov 20 2026
through the page reader (it returns short quoted fragments; long quotes in chunks are joined from them).

## What is here
- `lib_811_dig.jsonl`: **121 state chunks, all 50 states + DC** (written with `library_arch_nov20/lib_kb.py`, 0 errors).
  Ids `dig-<st>-<overview|tickets|marks|damage|penalties>-1`. Each state's `overview` chunk carries
  `supersedes: dig-<st>`, so it replaces the old one-card-per-state row in place (no duplicate card).
  NOTE for the lead: the old card also had a trench-protection line from the app table; the new overview does not
  (that belongs to the `sp-` collection). If no `sp-` chunk covers a state yet, keep the old card until one does.
- `lib_811_fed.jsonl`: 5 nationwide chunks: 49 CFR 196 (2), CGA best practices 5.19/5.20, APWA color code, 811 in winter/snow.
- 117 core (answer cards, 1,200 characters or less; at most 5 per state, budget is 6) and 9 shelf.
- `sql/`: staged guarded SQL from lib_kb.py (core, shelf, precheck). NOT applied.
- `cases_811.jsonl`: **180 eval cases** (3 to 5 per state + 4 nationwide; 18 on "not confirmed" facts). `lib_kb.py cases`: 0 errors.
  Free retrieval check (`retr_report.txt`): **159 of 177 core cases get their chunk in the first search (90%)**; 168 of 177
  have every must-fact in the excerpts. The 18 misses: "what's the fine" questions pull app how-to chunks first (CA, NV, PA,
  SC, IA); "how close can I dig" in states whose number is unconfirmed (MD, CT, KS); a few where the old `dig-<st>` card
  (still in the local copy; it goes away when superseded) takes the slot.
- `sources.csv` (74 documents), `raw_findings.md` (working quotes for the first 15 states; later states' quotes are in the chunks).
- `tools/build.py`, `tools/d1.py..d5.py` (the chunk text, the source of truth), `tools/cases.py`.

## Coverage
| St | Chunks | Which | Confidence | Not confirmed (said so in the chunk) |
|---|---|---|---|---|
| AK | 2 | overview, tickets | medium | - |
| AL | 3 | overview, marks, damage | high/medium | tolerance zone before Jan 1, 2027 |
| AR | 1 | overview | medium | tolerance zone, white lining, damage steps, fine amounts |
| AZ | 4 | overview, tickets, marks, damage | high/medium | new ticket number on refresh; SB 1137 effective date |
| CA | 5 | overview, tickets, marks, damage, penalties | high | - |
| CO | 4 | overview, tickets, marks, damage | medium | new ticket number on an update |
| CT | 1 | overview | medium | ticket life, tolerance zone and penalty amounts |
| DC | 2 | overview, damage | high | - |
| DE | 3 | overview, marks, damage | high | - |
| FL | 4 | overview, tickets, marks, damage | high | - |
| GA | 4 | overview, tickets, marks, damage | high | - |
| HI | 1 | overview | medium | tolerance zone, damage steps, fine amounts |
| IA | 2 | overview, tickets | medium | - |
| ID | 2 | overview, tickets | high | - |
| IL | 4 | overview, tickets, marks, damage | high | - |
| IN | 1 | overview | medium | tolerance zone; earliest call (10 vs 20 calendar days) |
| KS | 1 | overview | medium | tolerance zone and fine amounts |
| KY | 2 | overview, damage | high/medium | penalty amounts; tolerance zone width in inches |
| LA | 1 | overview | medium | fine amounts and damage reporting steps |
| MA | 2 | overview, damage | medium | new ticket number on renewal |
| MD | 1 | overview | medium | 18-inch rule and fine amounts not re-read |
| ME | 3 | overview, damage, marks | high/medium | new ticket number on renewal |
| MI | 4 | overview, tickets, marks, damage | high/medium | - |
| MN | 2 | overview, tickets | medium | - |
| MO | 1 | overview | medium | ticket life in days; tolerance zone |
| MS | 1 | overview | medium | wait before digging; days added by an update |
| MT | 1 | overview | low | all state numbers |
| NC | 4 | overview, tickets, marks, damage | high | - |
| ND | 1 | overview | medium | - |
| NE | 1 | overview | medium | ticket life after work starts; notice window not re-read |
| NH | 2 | overview, damage | medium | new ticket number on renewal |
| NJ | 2 | overview, damage | medium | hand-dig distance; this is the 2021 proposal text, not the current code; this is the 2021 proposal text, not the current code |
| NM | 2 | overview, damage | high/medium | penalty amounts (NMSA 62-14-8) |
| NV | 4 | overview, tickets, marks, damage | high/medium | fine amounts (NRS 455.170) |
| NY | 4 | overview, tickets, marks, damage | high | - |
| OH | 4 | overview, tickets, marks, damage | high/medium | whether an Ohio ticket expires; fine amounts (O.R.C. 3781.34 to 3781.36) |
| OK | 2 | overview, tickets | medium | fine amounts |
| OR | 4 | overview, tickets, marks, damage | medium | ticket life 30 vs 45 days: the official rule text with the 2026 change was not opened; ticket life 30 vs 45 days: official current rule text not opened; fine amounts (ORS 757.993) |
| PA | 4 | overview, tickets, marks, damage | high/medium | ticket life in days; ticket life in days |
| RI | 2 | overview, damage | medium | new ticket number on renewal |
| SC | 2 | overview, tickets | medium | fine amounts |
| SD | 1 | overview | medium | ticket life, damage steps, fine amounts |
| TN | 1 | overview | medium | tolerance zone and penalty amounts |
| TX | 4 | overview, tickets, marks, damage | high/medium | new ticket number on an update |
| US | 5 | fed-phmsa-excavator-196-1, fed-phmsa-excavator-196-2, std-cga-tolerance-zone-1, std-apwa-color-code-1, std-onecall-winter-snow-1 | high/medium | - |
| UT | 4 | overview, tickets, marks, damage | high | - |
| VA | 2 | overview, tickets | high/medium | hand-dig distance and fine amounts |
| VT | 2 | overview, damage | medium | new ticket number on renewal |
| WA | 4 | overview, tickets, marks, damage | high | - |
| WI | 1 | overview | medium | fine amounts |
| WV | 1 | overview | medium | ticket life and tolerance zone |
| WY | 1 | overview | medium | penalty amounts |

Depth by state. Full (statute or current handbook read for all five subjects): CA, AZ, TX, FL, WA, OR, CO, UT, GA, NC, NY, IL, OH,
MI, PA, NV, DE, DC, AL (2027 law), ID, AK, NM, MN, SC, OK, IA, KY, ME. Partial (one section or one page read): VA, WV, MD, NJ,
MA, NH, VT, RI, CT, KS, TN, NE, MO, IN, LA, MS, SD, WY, HI, ND, WI. Thin: AR (another helper's quote only), **MT (nothing
confirmed; the chunk says so)**.

Not done (honest list):
- The shared web-search budget ran out part way through, so no new documents could be found after that; only links already
  known could be opened. That is why the partial states stop where they do.
- Fine amounts not confirmed: NV, OR, OH, KY, NM, SC, OK, LA, SD, WY, HI, WI, VA, KS, TN, CT, MD, MT, AR.
- Tolerance zone not confirmed: WV, MO, KS, TN, IN, CT, HI, AR, MT, MD (18 in not re-read), VA (2 ft not re-read), KY (width).
- Handbooks not read at all (only the law): CA (DigAlert / USA North CA), AZ, TX, FL, WA, UT, GA, NC, NY, IL, MI, PA and most
  partial states. Ticket-type lists exist only where a handbook was read (NV, CO, OH, MN, SC, OK, IA, ID, AK, UT, IN, MS).
- CGA Best Practices: only 5.19 and 5.20 were read. Whole-guide summary not done.
- 16 TAC ch. 18 (Texas) was read as amended Feb 12 2018, the latest amendment the pages show; not checked against the Texas Register for later changes.
- New Jersey text is the BPU's 2021 readoption proposal, not the current code.

## App accuracy: where the app's table disagrees with what was read
All in the one-line state table `PB_SR`, `_src/index.html:69847` (same rows in `tests/r1706/staterules/data/state_rules.json`).
Not patched. Ranked by how much a crew would feel it.

1. **Oregon ticket life: app says 45 days; the center's 2026 Addendum says 30 days since Jan 8 2026.** "from 45 days to 30 days"
   (OAR 952-001-0010(23)), https://digsafelyoregon.com/wp-content/uploads/2026/03/2026-Addendum-to-the-Oregon-Standards-Manual_Final.pdf .
   Older rule copies (Justia to June 2025, Cornell) and the center's FAQ still say 45. If 30 is right the app's expiry is 15
   days LATE, which is the dangerous direction. Needs one call to Oregon 811 (decision 1).
2. **North Carolina tolerance zone: app says "24 inches applies only to oil, gas transmission and electric transmission" and fills no number.**
   G.S. 87-117(22) (amended S.L. 2025-21): the tolerance zone for every marked line is 24 in each side of the mark's outside
   edge (or half the diameter + 24 in). The transmission-line rule is a separate, stricter one. Set tol_in 24.
3. **Illinois: no tolerance zone in the app.** 220 ILCS 50/2: "one and one-half feet on either side of the outside edge". Set 18.
   Also missing: positive response check required since Jan 1 2026; extension can be asked from day 20; pre-mark black on snow.
4. **Virginia: no wait in the app.** Va. Code 56-265.17: 48 hours beginning 7:00 a.m. the next working day.
5. **Pennsylvania: no wait in the app.** 73 P.S. 180(2.1): 3 to 10 business days (10 for complex projects). Ticket life still unconfirmed.
6. **Georgia: no wait in the app.** O.C.G.A. 25-9-3(2), 25-9-6: notice period from 7 AM the next business day, at least 2 business days.
7. **Louisiana and Arkansas rows are empty.** LA R.S. 40:1749.13/.14 (Acts 2026 No. 902): 48 to 120 hours, marks 20 calendar days
   from mark-by time, 18 in. AR 14-271-112: 2 to 10 full working days, good 20 working days (the round-3 helper has both).
8. **Oklahoma**: app renew text "Give a new notice"; the center's 2026 guide: Extend or Re-Mark at least 4 business days before
   expiry. No tolerance in the app: 63 O.S. 142.6, two feet either side, hand digging.
9. **North Dakota**: no wait in the app (handbook: 48 hours not counting weekends and holidays); no tolerance (24 in hand dig).
10. **Minnesota**: white marking shows as blank; the 2026 handbook says required "without exception".
11. **Florida**: white lining blank (556.114(3): required when the site can't otherwise be identified); emergency blank (556.109).
12. **Missouri**: add "unmarked or wrong marks: owner must respond in 2 hours" (RSMo 319.026, Aug 28 2025). Ticket life still unconfirmed.
13. **Mississippi**: tolerance and 20 days agree; the wait is still unconfirmed.
14. **Kentucky**: add the second-notice rule and "hand-dig or nonintrusive in the tolerance zone" (KRS 367.4911).
15. **Dig Safe states**: the app cites the Oct 2024 manual; the current one is Aug 2025. Numbers agree.
16. Agree with the app, re-read today: CA, AZ, NV, TX, FL (wait, life, tolerance), WA, CO, UT, MI, NY, OH (no expiry found), DE, DC,
    IN, IA, KS, KY, TN, AL, ID, AK, NM, SC, WY, HI, WI, SD, WV, NJ, MD, ME, MA, NH, VT, RI.
(Already reported by locate_research_nov20 and not repeated: new ticket numbers in GA/VA/UT/IA/MI, Georgia's two updates, Nevada's two renewals.)

## For Tommy to get (could not be opened, or sit behind a login)
1. **Oregon**: the current official text of OAR 952-001-0010 (Oregon Secretary of State, secure.sos.state.or.us/oard, chapter 952) or
   one call to Oregon 811 (811 / digsafelyoregon.com): "is ticket life 30 or 45 days now?"
2. **Montana**: Mont. Code 69-4-501 to 69-4-530 (leg.mt.gov) and the Montana 811 "Excavator Handbook" (montana811.org).
3. **Arkansas**: Arkansas 811 excavator handbook (arkansas811.com) and Ark. Code 14-271-101 to -115.
4. **California**: DigAlert "California Excavation Manual" (digalert.org) and USA North 811 "California Excavation Handbook" (usanorth811.org).
5. **Texas**: Texas811 "Damage Prevention / Excavator Manual" (texas811.org) and Tex. Util. Code ch. 251 text; confirm 16 TAC 18 has no change since 2018 (rrc.texas.gov).
6. **Handbooks for**: Arizona 811, Sunshine 811 (Florida "Excavation Guide"), Washington 811 / UTC "Digging Booklet", Blue Stakes of Utah,
   Georgia 811, NC811 (its pages returned "not found"), UDig NY / New York 811, JULIE "Excavator Handbook", MISS DIG 811, PA One Call "Excavator's Manual" (login for KARL), Virginia 811, Kansas 811, Tennessee 811 (law PDF is on Google Drive), Kentucky 811, Missouri 811, Nebraska 811, Louisiana 811, MS811, SD 811, One-Call of Wyoming, Hawaii One Call, ND One Call (current edition; only a 2020 copy was found), Diggers Hotline, WV811, CBYD (Connecticut), NJ One Call, Miss Utility (MD/DE/DC).
7. **Common Ground Alliance Best Practices, current version** (free download with sign-up at commongroundalliance.com): whole guide, for summaries.
8. **Phone calls only a person can make** (from the earlier research, still open): do TX, FL, OK, CT, ME print a new number on a renewal; Ohio: does a ticket expire.

## Decisions for Tommy
1. **Oregon: change the app from 45 to 30 days now?** Recommend **yes, before the phone call**: an early expiry costs a re-call; a late one puts a crew on an expired ticket.
2. **Load these chunks to Ask and let each state's new overview replace the old one-line card?** Recommend **yes**, after the lead's check, with the trench line kept somewhere (note above).
3. **Fix the app table rows in the accuracy list (NC, IL, VA, PA, GA, LA, AR, OK, ND, MN, FL)?** Recommend **yes, next release**; all are from the law or the center's current handbook, cited above.
4. **Montana: leave it saying "not confirmed" until the statute is read?** Recommend **yes**; do not borrow a neighbor's numbers.
5. **Who gets the handbooks?** Recommend Tommy (or the lead with a fresh search budget) downloads the list in "For Tommy to get" items 2 to 6; the priority-state handbooks (CA, TX, AZ, FL) first, since those add ticket types and positive-response steps the statutes don't spell out.

## DONE
