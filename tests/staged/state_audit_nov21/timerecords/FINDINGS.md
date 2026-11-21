# Time records / wage law by state — findings (Nov 21, 2026; saved by lead from the helper's report)

## Worst first
1. The signed daily report PDF reads like a time card: per person First in / Last out / Hours, foreman signs (_src 65384-65388); hours default from the crew day with no meal deducted (62683). CA Wage Order 16 §6 requires start/stop/meal records; Donohue v. AMN (Cal. 2021): records showing missed/short meals = presumptive evidence. Run report crew log (52374) same. STAGED (optional, PDF text only): patches/01_crew_hours_not_a_timecard.py — adds "Job record, not a time card: meal and rest breaks are not shown here."
2. Live Terms say nothing about payroll/time clocks; the "Not a time clock" §3.8 exists only in drafts (v1.1, v1.2).
3. "Crew hours for payroll" still named "payroll" (69840, 69848). IL public works needs daily start AND end on certified payroll (820 ILCS 130/5).
4. Ask cards wrong for prevailing-wage jobs: emp-state-or-3 (OR public works: OT after 8 h/day, 10 on 4-10, weekends/holidays; travel/shop count) and emp-state-wa-3 (WA public works: OT after 8 h/day unless signed project 4-10, max 10 h; WAC 296-127-022). CA/NY/MA/NV public works not checked. Need supersedes edits.
5. Camp v. Home Depot is 2022 (84 Cal.App.5th 638), CA Supreme Court review pending (argument set, no decision as of Aug 21 2026). Settled: meal periods can't be rounded (Donohue). Federal allows neutral rounding (29 CFR 785.48(b)). Feature should never round.
6. Daily OT/premium states: CA (>8 1.5x, >12 2x, 7th day), AK (>8, 4+ employees), NV (>8 in 24 h if paid < $18), CO (>12), KY (7th day), PR (>8), plus public-works daily OT.
7. MN break law changed Jan 1 2026 (15 min paid per 4 h, 30 min meal for 6+ h, damages).
8. Photo stamps carry GPS + time of identifiable workers: notice duties CT (Oct 1 2026), NJ, CA. GPS time clock would add to it.
9. Don't build a biometric clock (IL BIPA, TX, WA, CO since July 1 2025).
10. Retention: NJ, NY, HI 6 yrs; IL public works 5 after last payment; AZ, TX 4; federal 3 payroll / 2 time cards.

## Existing features that look like time records
| Feature | Looks like time record? | Verdict |
|---|---|---|
| Crew & Equipment Log check in/out per person (25479+) | Yes, no meals | Risky on PDF; patch 01 |
| Daily report Crew Today signed hours (65384) | Yes, strongly | Risky; patch 01 |
| "Crew hours for payroll" CSV (69834-69882) | Offered for payroll | Rename (open decision) |
| Break button (52338) | Possibly | Labeled not a time clock — OK |
| Run timestamps / time per pipe | Indirectly | OK with Terms §3.8 |
| Production crew man-hours | No | OK |

## State matrix (key items; NC = not checked this round)
Daily OT: CA, AK, NV(<$18), CO(>12), PR; 7th day CA, KY. Meal: CA (30 by 5th h, 2nd by 10th, premium), CO, CT, DE, IL (20 by 5th h), ME, MA, MN (2026), NV, NH, NY, ND, OR, RI, TN, WA, WV, PR. Rest: CA, CO, KY, MN, NV, OR, WA (10 min/4 h; MN 15). Show-up: CA, DC, MA, NH, NJ, NY, RI (NC). Prevailing wage all jobs w/ portals: CA eCPR, IL monthly portal (start/end, last-4 SSN), WA L&I monthly (full SSN), MA, NY. No state PW: AL, AZ, AR, FL, GA, ID, IN, IA, KS, KY, LA, MS, NE, NH, NC, ND, OK, SC, SD, UT, WV, WI. Retention ≥ 6 yrs to cover NJ/NY/HI.
(Full per-state table with minimum wages is in the helper transcript; minimum wages change yearly — re-pull when building.)

## Requirements for the future time-sheet feature
1. Record: worker, classification(s), job, cost code; every work start/stop and meal start/stop (server + device clock); rests given/missed; waivers; travel/shop; show-up; per diem; who entered/edited with original + history; worker daily e-signed attestation (meals, rests, injury); foreman approval; source.
2. Rules engine by job state + city (then company, then phone), dated rule versions shared with Ask emp-state cards: daily/weekly OT, double time, 7th day, public-works OT when job marked prevailing wage, meal/rest deadlines with alerts, premiums (CA, PR, MN, CO, WA), city minimum wage, sick-leave accrual, NO rounding.
3. Never prefill hours; suggestions must be confirmed; show typed vs defaulted.
4. Retention ≥ 6 years, kept after cancellation, exportable, locked against deletion; public works 3 yrs after job (IL 5).
5. Exports: WH-347 (2025 layout), CA DIR eCPR, WA L&I, IL IDOL portal, payroll CSV, union fringe by member/classification. Full SSN (WA) encrypted, office-only.
6. Worker "my hours" screen + copy on request (CA 21 days).
7. State crew notice before first use; GPS at punch only; no biometrics.
8. Gate: insurance, lawyer, Terms change first.

## For Tommy
1. Rename "Crew hours for payroll" → "Crew hours by day" (recommend yes).
2. Ship patch 01 "not a time card" note on daily and run PDFs (recommend yes, next release).
3. Get Terms §3.8 "Not a time clock" live before out-of-state marketing (lawyer).
4. Lawyer + insurance: do signed daily-report hours expose customers or Tommy under CA meal/record rules?
5. Before building time sheets: which certified-payroll states first customers work in.

## DONE
