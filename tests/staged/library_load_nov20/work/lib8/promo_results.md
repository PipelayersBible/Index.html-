## lib8 test results (Tommy's $10; $8.15 spent by the reply bodies; failed 546 attempts may add a little)
| Check | lib8 / lib8b | Before (lib7e/f, same cases) | Bar |
|---|---|---|---|
| 148 existing (`1121-lib8-148`, $5.43) | **146 / 148** by the server's patterns; facts 147 / 148; 0 errors | 140 / 148 (live b7ad 117) | all 148: 2 left |
| The 2 misses, read by hand | `cut3` length only (159 / 140 words, content right); `ph02` photo read 3.82 for a 3.83 stake (live and lib7e misread it the same way) | | |
| The fixed items, read by hand | sa10 names Kentucky's plan; sw1's web answer leads with 0.40%; lib-sc-sp-1 has no "[quote removed]"; lib-us-osha-33 says "No ... the bottom box is rated for full depth"; lib-mi-dig-2 gives no other places' numbers; 0 / 148 answers contain "TYPE:" or "I'll check the web" | 2 real misses (sa10, sw1) | met |
| Strictest 12 (`1121-lib8-fu1`) | 11 / 12 on lib8. The miss: Utah's 8-hour reporting card was not retrieved (live code too). Fixed in lib8b and asked twice more: **"Utah requires ... within 8 hours ... stricter than federal OSHA's 24 hours"** | 12 / 12 on lib7 (the card got there by luck) | met on lib8b |
| Follow-through, 27 two-turn cases (`fu1` + `fu2`, $1.20 including the 12) | **27 / 27 stay on the topic, none restart; 25 / 27 give the offered part cleanly** (fu7-04 opens with a go/no-go line; fu7-10 offers items the excerpts do not have) | 27 / 27, 25 delivered (lib7) | met |
| Check round on lib8b (`1121-lib8b-r11`, 49 questions, $0.83): 22 never-sent big-run cases, 14 own-plan trench cases, 10 long ones, 3 new | read by hand: facts right on all 49; **all 14 own-plan states name their plan**; Indiana gets "Indiana's plan can be stricter"; wrong state 0; the 10 long ones drop from a median of 101 words to 76; 3 are still over 100 (AC pipe, dewatering, vacuum-test steps) | | |
| Length | median **65** words (148) and 66 (round), down from 74 and 69 | | ~56: **not met** (closer) |
| Safety line | on 59 of 148 answers (36 on lib7e) | | |

**Go / no-go: GO** for lib8b in this order: card (07), then build d881cb695137, then the prompt row (08), with the 5-question smoke. Every step has a tested rollback: 07/97 on the local copy (its md5 matches the server's), 98 checked read-only on the server, and the build goes back to 8b7042f9dfee.
Not perfect: 2 of the 148 miss by pattern (one length, one photo read); the median is 65 words, not ~56; how-to answers still run past 100 words; and the 20 queued + 8 parked old eval rows were not deleted (the lead needs to do it; the statement is in ROUNDS.md).
**NO-GO only if** the bar is literally "all 148 pass".

## Cost plan for later rounds (today's actual rates on ai-next, warm cache)
- 148 existing: **about $5.50** (photos and how-tos cost more; photo cases fail with 546 in 3-question batches, so run them one per row).
- One round of 100 library questions: **about $2 to $3** ($0.017 to $0.03 each; a cold start adds about $0.10 a question for the first few).
- Follow-through 27 (two turns) + strictest 12: **about $1.20**.
- All three together: **about $9 to $10**. Today's lib8 runs: smoke 0.69 + 148 5.43 + follow-through 1.20 + check round 0.83 = **$8.15**.
