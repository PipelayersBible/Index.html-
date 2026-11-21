# Specs / permits / utilities by state — findings (Nov 21, 2026; saved by lead from the helper's report)

## Worst first
1. WRONG: the water/sewer crossing check uses California's rule (water 1 ft above, labeled "Title 22") in every state (_src 12726-12764, 13807, 13857). TX: water above, 2 ft over gravity sewer, 6 in over pressure-rated (30 TAC 290.44(e)(4)(B), eff 12/21/2023) — a TX sewer 20 in under water shows "Clear" today. FL: 6 in above (12 preferred) or 12 in below; 12 in either way for force mains/reclaimed (62-555.314(2), eff 2/26/2025). MT 18 in (DEQ-1 8.8.3). Most others 18 in (Ten States 38.32). FIX STAGED: patches/1_xing_state_rule.py (+ tests/t_xing_state.js, 15 checks).
2. MISSING: no test types for air test, manhole vacuum, bac-T, leakage; server functions (pb_insp_add, pb_insp_edit, pb_prod_insp_required, pb_prod.clean_insp, pb_daily.insp_fail_push) refuse other types. Proposed (server + app).
3. MISSING: tracer-wire / locatable-pipe laws (CO, IN, WV, NE, MN; 49 CFR 192.321(e) for plastic gas). Ask cards staged: lib/sa_locatable.jsonl (6, lib_kb 0 errors, 6/6 retrieval). Proposed: "Tracer wire tested" on the closeout checklist.
4. Minor: "Add your spec books" card names only the Greenbook; test Details example "Hydrostatic 150 psi" for every type. FIX STAGED: patches/2_spec_words.py.
5. Unconfirmed: low-slope warning uses Ten States minimums everywhere (labeled; TX has its own table in an image).
6. MISSING feature: job permits list (encroachment, ROW, street, dewatering: number, expiry, conditions). Proposed.
7. MISSING feature: SWPPP inspection item (EPA CGP: every 7 days, or 14 + within 24 h of 0.25 in rain; keep 3 yrs). Proposed.
8. MISSING: pipe types PVC SDR 26, C905, polypropylene, RCP classes. Proposed only.
9. Ask: live chunks separation-cover-marking-1/2 cite Virginia in the source line (state filter hides them elsewhere); covered by std-tenstates-separation-1.
10. OK: no hidden trench width/bedding/cover/frost/test-pressure/mandrel defaults; no licensing claims; pipe ODs/walls match standards.

## Decisions (lead notes)
- Patch 1 in next release: yes (under-warns in TX today).
- Job state unknown: helper used Ten States 18 in; Tommy's standing rule is strictest → lead to switch unknown to 2 ft (TX) at integration, labeled "job state not known — strictest rule".
- New test types: yes (server + app). Permits list / SWPPP: later.

## For Tommy
1. Texas TCEQ 217.53 minimum-slope table PDF.
2. FDOT, NDOT, UDOT spec books (free downloads).
3. Only if crews ask: ASTM F1417, AWWA C651.
4. Before marketing in a new state: confirm its separation rule (state vs Ten States).
5. Re-read CO 9-1.5-103 and NE 76-2320.02 to confirm those cards.

## DONE
