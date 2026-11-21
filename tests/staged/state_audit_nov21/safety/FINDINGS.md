# Safety by state — findings (Nov 21, 2026; saved by lead from the helper's report)

## Confined space permit, nationwide: OK
All 16 federal items (29 CFR 1926.1206) are on the form; CA 8 CCR 1955 same 16; WA same 15; OR extras covered (start/stop, problems on closeout PDF, print-and-sign note); MI Part 35 adopts 1926.1202-.1212 (R 408.43510); MD no supplement. CA Jan 1 2026: competent person site check (1952(a)(1)), trained/equipped rescue standby (1960(a)) — no change to permit items. Air limits right (O2 19.5-23.5, LEL 10%, H2S 10, CO 25). Gaps: no confined space training record (1926.1207(d), not a permit item); CA H2S limit change unconfirmed.

## Problems, worst first
1. Talk schedule offers "Every 2 weeks" (_src 74932): WA requires weekly crew safety meetings, minutes kept 1 yr (WAC 296-155-110); CA at least every 10 working days (8 CCR 1509(e)).
2. 12 state plans said "report within 8 hours to be safe": MD, MN, NV, SC, IA have own pages/phones, federal 8/24 h; AZ, IN, NC, NM, TN, VT, WY adopt federal (medium confidence).
3. Flagger card rules only for AK, MA: WA all flagging (WAC 296-155-305(6)), OR public roads, most DOTs on own jobs.
4. State Rules screen said nothing about heat.
5. Trench lines "not checked" for AK, HI, NC, TN, VA, IN, SC, MD: all federal 5 ft; SC competent-person training; MD keep slope/box/engineer data on site.
6. CA trench permit line incomplete: annual permit holders notify district office before each new site (341(c)(2)(B)); exemptions for agencies and PUC utilities (341(e)).
7. Permit's CA rule line lacks the 2026 changes.
8. WA foremen need a first-aid card (WAC 296-155-120); CA emergency numbers posted (8 CCR 1512(e)).
9. Permit rule line doesn't name MI Part 35.
10. Talks: TT-031/033 cite 1926.200-203 (now 200-201); TT-032 Class 3 at night is "should" per MUTCD; TT-013 lacks 49 CFR 196.109 (call 911 when gas escapes).
OK: r17.13 injury lines, heat numbers, WA 4 ft, 911 handling, permit retention line.
Not done: IA/VT/WY trench rules; MI Part 9 on hold; IN "unique excavation standard" not found; CA/WA silica, WA 296-880 fall heights, noise, posters; Puerto Rico not in state list.

## Staged (patches/, each applies on r17.13; tests/t_safety_states.js 34 checks pass stacked)
p1_injury_states (12 states), p2_trench_rows (8 states + CA permit line), p3_rules_safety_lines (Heat all states; Toolbox talks CA/WA; First aid CA/WA; Flaggers all states), p4_talks (state line under schedule; TT-050/013/031/033/032), p5_permit_rules (MI Part 35; CA 2026 note on the form only).
r17.13's t_r1713 has one expected change (Iowa line) — updated copy in test_updates/. Full regression not run. New lines English only.
Ask: lib/ 15 cards (lib_kb 0 errors, 3 warnings), 10 eval cases, 10/10 retrieval.

## For Tommy
1. Ship p1-p5 next release (recommend yes).
2. WA: line now; hide "Every 2 weeks" on WA jobs later (recommend).
3. Confined space training record as a crew-profile field — later.
4. Flagger lines from DOT specs shown with "check the current spec" (recommend yes).
5. Get: IOSHA "unique excavation standard" answer; IA, VT, WY excavation rules; CA 8 CCR 1532.3 and WA 296-840 silica rules.

## DONE
