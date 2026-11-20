# Ask state-aware build: eval on ai-next (Nov 20 2026)

## Recommendation: do NOT promote yet. One cheap same-day check first (about $1), then promote if it comes back clean.

- The state work itself passes: **36 of 36** state cases (nw1-26, sa1-10), no wrong state number, no unwanted "Which state?".
- No answer got a fact wrong that the last full run got right, **except web1, and web1 fails the same way on the live build today**
  (tested, see below), so it is not caused by this build.
- But by the letter of the pass rule the score is lower: on the 101 cases both runs share, **75 pass now vs 80 in the last
  full run**. All 10 net losses are answers 2 to 18 words over their word limit. I believe most of that is run-to-run
  noise (these same cases flip in every past run), but I could not prove it inside the $5: the last full run is from
  Nov 16, before the live build b4ad and before the Nov 17-20 library edits, so it is not a same-day comparison.
- The check that settles it: run the 10 too-long cases (and the 9 photo cases not run) on the live build and on this
  build back to back. If live is over the limit about as often, promote. If not, tighten the wording first.

## What is installed
| Slot | Build | Note |
|---|---|---|
| live | `b4ad91749f6f` | untouched |
| next | `66c743680d2f65c948aedbf677a089bc9182a7152bfc2f648e02efb03b9de338` | stamp 1120-1631, repo commit 7e19b1f, `data/ask/b-66c743680d2f.txt`; blob md5 in the database equals the file |

- First build `f452a27f6053` (stamp 1120-1624, commit c1dc549) was on next for the first run, then replaced by the tuned build.
- For one baseline question the live build b4ad was put on next for about a minute, then 66c743680d2f was put back (checked).
- Not done, as told: no promote, KB fix `01_ask_kb_state_fix.sql` not applied, no edge function deployed.
- Inserted: the 10 eval cases sa1-sa10 (`pb_ai.eval_set`).

## Checks before the eval
- The unpatched local source builds **byte for byte** to live b4ad91749f6f (same sha256, stamp 1117-0225). `/home/claude/ask_v24/src` was
  still there; the live source is now kept in `/home/claude/ask_v24/src_b4ad_bak`, and `src` is the patched source.
- Deno tests on the patched source: **36 passed, 0 failed** (before and after the tune).
- `apply_patch.py` on the live source still reproduces the installed source exactly.

## One tune (state.ts)
sa10 failed on the first build: "At what depth is a trench box required?" on a Kentucky job got the federal 5 ft with no word
that Kentucky runs its own OSHA plan. Added: when the job is in a state-plan state, the question is a safety-rule question, and
the library has nothing of that state's near the question, the prompt line tells the model to give the federal rule and add one
line ("This is the federal rule. The library has no Kentucky rule for this question, so confirm with Kentucky's OSHA plan.").
No extra search. The retrieval tool shows it touches none of the other 127 text cases at their own location (California: none).
Staged files updated to match: `src_patch/state.ts`, `src_patch/patched/state.ts`, `tests/state_test.ts`. sa10 re-run: pass.

## Runs and cost
| Run | Build | Cases | Pass | Cost |
|---|---|---|---|---|
| `1120-1625-ai-next-2243` nw+sa | f452a27f6053 | 36 | 35 (sa10) | $2.05 |
| `1120-1631-ai-next-4c2f` sa10 again | 66c743680d2f | 1 | 1 | $0.01 |
| `1120-1632-ai-next-00cf` rest of the full set | 66c743680d2f | 104 | 77 | $2.68 |
| `1120-1639-ai-next-2a76` web1 again | 66c743680d2f | 1 | 0 | $0.04 |
| `1120-1640-ai-next-1e51` web1 on the LIVE build (baseline) | b4ad91749f6f | 1 | 0 | $0.03 |
| **Total** | | | | **$4.81 of $5** |

- The first run cost $2.05, not the planned $0.75: 14 questions cost about 10 cents each because every batch started with
  nothing stored on the model side (a cold start). Past runs show the same thing (Nov 16: 10 such questions, $1.10). Cost per
  question once warm is unchanged: 2.3 cents now, 2.3 cents in the last full run. I started the big run warm to avoid paying it twice.
- Because of that the full set did not fit. **Not run: 9 of the 12 photo questions and the 11 stake reads.** The stake reader
  does not go through the changed code. The 3 photo questions run score the same as before.
- The nw cases and sa1-sa9 ran on the first build; the tune cannot change them (checked with the retrieval tool).

## Scores
New build, every case run: **113 of 140 pass; facts right in 138 of 140** (web1, ph02).
Baseline = last full run, `1116-1351-ai-next-c275` plus its lost batch `1116-1403-ai-next-f6f7` (Nov 16, the build promoted that
day), graded with today's patterns. There has been no full run of b4ad itself. 39 cases have no baseline (nw, sa, cs4, cs5, tr14).

| | Same 101 cases, last full run | Same 101 cases, new build |
|---|---|---|
| Pass | 80 | 75 |
| Facts right | 100 | 99 (web1) |
| Over the word limit | 20 | 24 |
| Average words (98 text cases) | 121.5 | 119.1 (48 longer, 48 shorter) |
| Cost | $2.55 | $2.63 |

Per case: `id new/old words new/old/limit` (P pass, F fail, - not in the baseline).

breaks: brk1 P/P 145/122/150; brk2 P/P 119/128/150; brk3 P/P 123/116/140; brk4 P/P 130/103/150; nw25 P/- 156/-/190; nw26 P/- 138/-/210
calosha: co1 P/P 98/102/140; co2 P/P 158/119/180
confined: cs1 P/P 127/144/170; cs2 P/F 125/189/170; cs3 P/P 128/144/170; cs4 P/- 193/-/220; cs5 P/- 142/-/220; nw18 P/- 126/-/220; nw19 P/- 94/-/200; nw20 P/- 152/-/200; nw21 P/- 142/-/200
cutsheet: cut3 F/F 154/147/140
dewater: dw3 P/P 124/125/140; **dw4 F/P 162/157/160**
emergency: em1 P/P 76/76/120; em2 P/P 110/94/120; nw23 P/- 147/-/220; nw24 P/- 148/-/220
equipment: eq4 F/F 169/180/150; eq5 F/F 173/183/140
fitting: th1 P/P 144/134/200; th2 P/F 103/147/120
general: gn1 P/P 101/101/140; gn2 P/P 108/121/140; gn3 F/F 116/121/110; gn4 P/P 85/132/150; gn5 P/P 108/109/140; nw13 P/- 120/-/200
geometry: geo1 P/P 94/99/100; geo2 P/P 96/95/120; geo3 P/F 110/123/110
gonogo: ng1 P/F 127/152/150; **ng2 F/P 154/146/150**; **ng3 F/P 163/150/150**; ng4 F/F 170/163/150
hydrant: hy1 P/P 84/88/110; hy2 F/F 143/142/140
locate: **lo1 F/P 88/72/80**; lo2 F/F 86/85/80; lo3 F/F 133/153/130; lo4 P/P 107/105/140; lo5 P/P 72/120/130; lo6 P/P 94/103/120; lo7 P/P 135/104/160; loc5 F/F 111/107/90; **loc6 F/P 96/79/90**; nw1 P/- 68; nw2 P/- 107; nw3 P/- 73; nw4 P/- 109; nw5 P/- 147; nw6 P/- 120; nw7 P/- 128; nw8 P/- 106; nw9 P/- 97; nw10 P/- 83; nw11 P/- 117; nw12 P/- 83 (limits 170-190)
math: pm1 P/P 68/88/110; pm2 P/P 61/72/120; pm3 P/P 52/67/100; pm4 P/P 83/58/130; pm5 P/P 89/82/140; pm6 P/P 47/42/80; pm7 P/P 80/88/150
photo (3 of 12): ph01 P/P 55/52/120; ph02 F/F 42/33/120 (reads 3.82, wants 3.83, same as before); ph03 P/P 57/49/120
sewer: sw1 P/P 140/124/160; sw2 P/P 96/129/150; sw3 P/P 174/203/220; sw4 P/P 116/109/170; sw5 P/P 83/95/160; sw6 P/P 82/87/130
spec: gb1 P/P 94/101/150; gb2 P/P 96/99/160; gb3 P/P 106/93/170; gb4 P/P 102/98/170
stakes: st1 F/F 125/127/120; **st2 F/P 100/73/90**; st3 P/P 102/78/110; st4 P/P 105/104/130; st5 P/P 95/89/110; st6 P/F 93/118/110; st7 P/P 110/103/110
state: sa1 P 92/120; sa2 P 88/120; sa3 P 116/170; sa4 P 76/220; sa5 P 148/170; sa6 P 70/120; sa7 P 131/190; sa8 P 96/190; sa9 P 118/170; sa10 P 158/190 (tuned build)
survey: **svy2 F/P 103/90/100**; **svy4 F/P 118/91/100**
testing: ct1 P/P 111/121/150; ct2 P/P 73/90/160; ct3 P/P 115/103/150; ct4 P/P 78/93/120
tiein: tie4 P/P 162/176/180; tie5 P/F 177/202/180; tie6 F/F 161/195/150
traffic: tc3 P/P 96/104/120; tc4 P/P 120/99/120; tc5 P/P 116/110/120
trench: nw14 P/- 177/-/190; nw15 P/- 133/-/200; nw16 P/- 117/-/170; nw17 P/- 131/-/210; nw22 P/- 124/-/190; tr1 P/P 175/160/200; tr2 P/P 143/133/180; tr3 P/P 160/155/160; **tr4 F/P 161/146/150**; tr5 P/P 121/117/130; tr6 P/P 134/156/170; tr7 P/P 194/164/220; tr8 P/P 99/101/150; **tr9 F/P 181/160/170**; tr10 P/P 126/103/140; tr11 F/F 167/183/150; tr12 F/F 167/203/150; tr13 F/F 172/193/140; tr14 F/- 182/-/180
water: wa1 P/P 142/125/180; wa2 P/P 136/130/200; wa3 P/P 82/138/200; wa4 P/P 196/177/230; wa5 P/P 110/119/170; wa6 P/P 85/72/110
web: **web1 F/P 96/136/160**; web2 P/P 149/151/170

Got better (6, all were too long, now inside the limit): cs2, th2, geo3, ng1, st6, tie5.
Failing in both runs (14, all only too long, plus ph02): cut3, eq4, eq5, gn3, hy2, lo2, lo3, loc5, ng4, st1, tie6, tr11, tr12, tr13.

## Every regression, read by hand (11)
| Case | What happened | Caused by this build? |
|---|---|---|
| web1 "current price of 8 in C900 DR18" | No web search, so no price ("call your supplier"). Failed twice on the new build. Passed 7 of 7 before Nov 17. | **No.** The live build b4ad gives the same no-search answer today (run 1120-1640). The first search hands the model the same six excerpts in both builds. Something since Nov 16 (the Nov 17 build or the library edits) changed it. Live has this problem now. |
| tr4 ladders, 161 words (limit 150) | Now leads with California's rule (Title 8 §1541(c)), then federal. All facts right. | Likely yes: the state's own rule is now in front of the model, one more line. Better content, 11 words over. |
| tr9 box 2 ft off the bottom, 181 (170) | Says Title 8 1541.1 tracks federal. Before it said "no Cal/OSHA text found". | Partly. Both versions carry a California line. Past runs: 136 to 202 words, passed 6 of 10. |
| ng3 "can I sign the permit", 163 (150) | Now cites Title 8 sections 1954, 1955, 1959. Before: "the app has no Cal/OSHA excerpt". | Likely yes (California chunk added). Better content, 13 over. |
| ng2 O2 20.1 / LEL 3%, 154 (150) | Same rule answer, names Title 8 Article 37. No go/no-go call given. | Unclear. Past runs up to 161 words, passed 5 of 8. |
| lo1 sewer paint color, 88 (80) | Green; adds "In California, hand dig or vacuum within 24 inches". | Unclear. Past runs 72 to 108 words, passed 3 of 7. |
| loc6 "FO" on marks, 96 (90) | Fiber optic, orange; adds the 24 in zone with Gov Code 4216.4. | Unclear. Past runs 79 to 103, passed 3 of 5. |
| st2 "F. 8 11", 100 (90) | 8.11 ft, right. One extra line on what fill is measured to. No state in it. | No sign of it. Past runs 73 to 108, passed 4 of 7. |
| svy2 nail, 10' and CL COL, 103 (100) | Same answer. No state in it. | No sign of it. Past 82 to 123, passed 3 of 5. |
| svy4 same on a sewer job, 118 (100) | Same answer. No state in it. | No sign of it. Past 91 to 112, passed 2 of 4. |
| dw4 groundwater options, 162 (160) | Same answer, 2 words over. No state in it. | No sign of it. Past 156 to 179, passed 2 of 5. |

No regression gives a wrong number, another state's number, a safety verdict, or asks "Which state?" when it should not.

## The 36 state cases (the point of the build)
- nw1-nw26: all pass. Texas 14 working days, Florida 30 days, Arizona 15 working days, Washington 45 days and trench at 4 ft,
  Michigan Part 9, Oregon 437-002-0146, Washington 296-809, Minnesota and Nevada breaks. Arkansas (no confirmed ticket life in
  the library) says so and sends them to Arkansas 811 instead of borrowing a number.
- sa1, sa2 (no state): gives what is the same everywhere, ends with "Which state is the job in?". sa3-sa5: no question asked.
  sa4 (cave-in) is the instant on-phone emergency answer. sa6 (math on a Texas job): no "Texas". sa7/sa8: West Virginia and
  Virginia each get their own break rule. sa9: MISS DIG from Ohio answers Michigan's 21 days. sa10: pass after the tune.
- nw cases have never been run on the live build, so there is no before-number for them from the model, only the retrieval check in NOTES.md.

## Other things seen (not from this build)
- **Live Ask no longer looks up a price on the web for web1.** Worth its own look.
- tr14 (new case, 20 ft Type B): the answer has two "[quote removed: not found in the OSHA text the app has]" marks in the
  middle of a sentence. That is the quote checker, unchanged code. Reads badly.
- Cold starts cost about 9 cents a question for the first few questions of a run. Budget future eval runs with about $1.20 on top.

## To promote later
Copy the `next` row of `pb_ai.code` to `live` (DEPLOY_PLAN step 1 is otherwise done). Roll back as in DEPLOY_PLAN. The KB fix
(step 2) still waits until this build is live.

## DONE
