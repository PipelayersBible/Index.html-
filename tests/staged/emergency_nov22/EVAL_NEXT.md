# Paid eval on ai-next: build cdddf51b34db + reply rule v10 + library 3,255 rows (Nov 22 2026)

**Setup on the server (lead).** Slot `next` = `cdddf51b34db`. `teacher_v2@next` = reply rule v10. Library = 3,255 rows, md5 eb8a4923…; live and next share it.
**What I wrote to the server:** eval rows only (`pb_ai.eval_runs`, `pb_ai.eval_results`) for runs `1122-emg-a`, `1122-emg-b` and `1122-emg-148`. Nothing was installed, and the live slot (`1b8514750e72`) and the live prompt row (v9) were not touched.
**Spend: $8 budget; $8.13 counted, $7.88 by the 3 run totals below.** The model cost each answer reports was summed: a $0.75, b $1.60, 148 $5.78.
- **The $8.13 is over the $8 budget.** It includes $0.25 for answers whose ids are not in the 3 run tables; I have not pinned down which answers those are.
- No batch got HTTP 546 or 5xx, and nothing was retried.
- The 12 photo cases each ran in a batch of their own.

## Verdict: **GO**
Recommendation: install `cdddf51b34db` on live, then run `ask_everyday_nov22/sql/32_prompt_row_v10_live.sql`, then smoke-test on live (list at the end). Two follow-ups are listed below; neither blocks the release.

| Check | Result |
|---|---|
| (a) 25 instant emergencies sent through the server (5 from NOTES + 20 from the must-fire list) | **25 / 25** answered instantly ($0) with the right steps: power ×7, "line" (power + gas) ×2, sewer smell → stay out / test / ventilate, Spanish gas / power / cave-in / medical in Spanish with accents |
| (a) 10 look-alikes that must reach the AI | **10 / 10** reached the AI; none was answered with the emergency script. Read by hand: all sensible (laser check, low battery → charge it and bump test, "caved in overnight, no one in it" → no OSHA report for a no-injury cave-in + inspection first, H2S alarm setting) |
| (a) the 5 AI questions from NOTES | **5 / 5 right by hand**: lath → surveyor, no 911; T&M ticket → no 811 or locate; OR cover → 30 in (OAR 333-061-0050); OR trench for water main → 30 in cover first; Spanish stake question answered in Spanish, on topic |
| (b) everyday fixes 27 + review 40 (67) | **61 / 67 by pattern, 64 / 67 by hand**: 3 length only (112–120 words on list answers: T&M ticket, daily report, laser check) |
| (c) the 148 existing | **144 / 148 by server patterns** (lib8 146, q1 143); **146 / 148 by hand** (see below); 0 errors, 0 too long, average 71 words (lib8 71) |

## Failures read by hand
**(a)** 5 failed by pattern; all are fine:
- emg-l1 (laser, 129 words), emg-l6 (hydrant), emg-l9 (cleaning out a cave-in), emg-n7 (T&M), emg-n10 (Spanish stake, 172 words): over 110 words only; content right.
- emg-n9 is a grader false alarm: its line 1 is the 30 in cover; the extra "OSHA 5 ft" line matched my strict pattern.
- Look-alike emg-l6 ("Truck backed over the hydrant") got "call 911 and the water utility if water is flowing". That is the AI's answer, not the emergency script, and it is reasonable.

**(b)** 6 failed by pattern:
- lib-us-evfix-2: the 9:26 it mentions is correctly named as the 1.0 psi time; the answer (4:43) is right. Grader false alarm.
- lib-co-ev40-39, lib-fl-ev40-40, lib-us-evfix-25: length only.
- **lib-us-evfix-4 / -5** ("smells like rotten eggs in the wet well", "sewer gas in the new manhole, is that normal?"): **this is the build working as designed.** They now get the instant confined-space script: stay out, "rotten-egg or sewer smell: everyone out… tested and ventilated…".
  - Neither one gets the gas-company steps any more (the review's finding).
  - But the script doesn't say "hydrogen sulfide / H2S", so the everyday cases' patterns fail. The new library card `osha-pl-h2s-smell-1` is no longer reached for these phrasings.
  - Follow-up 1 below.
- Search fixes seen working: T&M and concrete tickets with no 811 talk; OR / UT / VA / IN / MO cover cards; trench width from D2321 (28.5 in); crew production with no 811 card; the OR trench question says "cover is not a trench safety number".

**(c)** 4 failed by pattern:
- ph02 (photo): read "cut 3.82"; the stake says 3.83. Same miss as lib8 (it is a lib8 failure too); photo reading varies.
- ph07 (photo): "the writing under the ribbon is scribbled out, so it no longer counts". Right; the pattern wants cross / void / scratch / old. Grader miss.
- sw1 (8 in sewer minimum slope, Wildomar CA): "the agency sets it, not confirmed for CA", with no 0.4. Known variance: q1 failed it too, and the everyday helper explains that on a CA job the Ten States cards are hidden on purpose. Not caused by this build.
- wa1 (water main cover, Wildomar CA): "plans / water agency set it; no California-wide number". The everyday helper already flagged this case as possibly wrong: there is no CA state number, and v10 forbids "typical" numbers. This comes from the v10 prompt plus the library, not from this build's code. Lead: update the case (accept "agency / plans set it").
- The same 5 cases got instant answers as on q1 (em1, em2, nw23, nw24, sa4); no new instant answers in the 148.

## Follow-ups (not blockers)
1. Name hydrogen sulfide in the sewer-smell line of the space script (EN + ES), e.g. "Gas alarm, or a rotten-egg or sewer smell (often hydrogen sulfide, H2S): everyone out now…". It needs a new build plus the same text in the app patch. Recommend it with the app release.
2. Eval case wa1: accept "agency / plans set it" under v10.

## Smoke after going live (about $0.30)
"the boom touched the line" (instant power) · "What goes on a time and materials ticket?" FL (no 811) · "How much cover over the water line?" OR (30 in) · "Excavator ran over the lath, who resets it?" (AI, surveyor) · "le pegamos al gas" (instant, Spanish) · "What is the carbon monoxide limit for entering a manhole?" Spokane, WA (35 ppm).
Rollback: build `1b8514750e72`, then `ask_everyday_nov22/sql/39_…_rollback.sql` for the row (v9).

Files: `eval/a.jsonl`, `eval/b.jsonl` (cases), `eval/run_a.sql`, `eval/run_b.sql` (inserts; run 148 was copied from `1122-q-148`), `eval/grade.py` + `grade_a.sql` / `grade_b.sql` (read-only graders).
