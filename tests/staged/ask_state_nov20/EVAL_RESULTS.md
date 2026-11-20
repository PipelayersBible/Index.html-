# Ask state-aware build: eval on ai-next (Nov 20 2026)

> ROUND 3 IN PROGRESS (full run of b7ad788e3a62 + price paragraph done: run `1120-1657-ai-next-9e1a` + `1120-1656-ai-next-7043`, 149 cases, 118 pass, facts 147, $4.66; does NOT meet the pass rule by the letter: ng2 lost its numbers, over-length 8 vs live 4 on the 20 same-day cases). Write-up follows.

## Recommendation: do NOT promote today. Run the full set once on the final build `b7ad788e3a62` (about $4.50), then promote if it is clean. I expect it to be.

Why not today: the build now on `next` (b7ad788e3a62) has two changes made after the big run: shorter state wording, and a fix to
the quote checker (the safety net that removes made-up OSHA quotes). Both tested well on 20 questions and 38 code tests, but
the quote checker touches every answer that quotes a rule, and it has not seen the full set. That is the only thing missing.

What round 2 settled (details in "Round 2" below):
- **The length worry is gone.** Same day, same 10 questions: live passes 6 and averages 125 words; the final build passes 6 and
  averages 122. The build before the tune passed 2 and averaged 132, so it did run long and the tune fixed it.
- **Photos: 9 of 9 pass on live and on next.** All 12 photo questions are now run.
- **State cases: 36 of 36**, and the 8 re-run on the final build still pass, a little shorter.
- **web1 (pipe price) fails on live too.** Cause found, fix staged and tested once (works). Separate from this build.
- **tr14 "[quote removed…]" marks:** cause found, fixed in the final build.

Spent: round 1 $4.81 of $5, round 2 $2.85 of $3.

## What is installed
| Slot | Build | Note |
|---|---|---|
| live | `b4ad91749f6f` | untouched |
| next | `b7ad788e3a626dc3b73872048b60911029b0476ea68d5210456b0de4ac6e0fae` | stamp 1120-1647, repo commit 9c575fe, `data/ask/b-b7ad788e3a62.txt`; blob md5 in the database equals the file |

- Builds on next today, in order: `f452a27f6053` (first), `66c743680d2f` (plan-state line; the big run), `b7ad788e3a62` (shorter
  wording + quote checker; final). Each is a sealed file pushed by the release script.
- Twice something on the test side was changed for a minute and put back (checked): the live build on next for one baseline
  question, and the price paragraph on the test prompt row `teacher_v2@next`. Both prompt rows equal their Nov 16 text again.
- Not done, as told: no promote, KB fix `01_ask_kb_state_fix.sql` not applied, no edge function deployed.
- Inserted: the 10 eval cases sa1-sa10 (`pb_ai.eval_set`).
- Staged files now match the final build: `src_patch/apply_patch.py` (adds the guard.ts change), `src_patch/state.ts`,
  `src_patch/patched/state.ts` and `guard.ts`, `tests/state_test.ts`, `tests/guard_quote_test.ts`. Deno: **38 passed** (36 + 2 new).
  `apply_patch.py` on the live source reproduces the installed source exactly.

## Round 2 (after the lead approved up to $3 more)

### 1. Live and next back to back, same day (runs `1120-1643-ai-7c03` + `-ai-9ebc` on live, `1120-1643-ai-next-ac59` on next)
Words per answer; F = over the limit. Facts were right in every one of these answers.

| Case | Limit | Live b4ad | Next before tune (66c7) | Next final (b7ad) |
|---|---|---|---|---|
| dw4 | 160 | 162 F | 209 F | 160 |
| lo1 | 80 | 100 F | 98 F | 81 F |
| loc6 | 90 | 98 F | 111 F | 93 F |
| ng2 | 150 | 172 F | 138 | 150 |
| ng3 | 150 | 138 | 173 F | 170 F |
| st2 | 90 | 84 | 95 F | 77 |
| svy2 | 100 | 100 | 104 F | 111 F |
| svy4 | 100 | 99 | 107 F | 93 |
| tr4 | 150 | 142 | 111 | 129 |
| tr9 | 170 | 155 | 174 F | 153 |
| **Pass / average words** | | **6 / 125** | **2 / 132** | **6 / 122** |

Photo questions not run in round 1 (ph04-ph11, svy3): **9 of 9 pass on live, 9 of 9 on next (66c7)**, similar length.
So live itself fails 4 of these 10 on length today. The Nov 16 baseline made the new build look worse than it is, but the
build before the tune did run about 5% longer: for 7 of the 10 the first search now adds one or two California excerpts
(more to say), and one state line told the model to add the federal rule beside the state rule.

### 2. Tightened wording (Tommy, Nov 20: concise and direct)
In `state.ts stateLines()` only: "lead with the direct answer", the federal rule beside the state rule is "one short clause",
"the state must not make the answer longer: its rule takes the place of a general point", and "at the usual short length" on
the quiet line. Re-run on the final build (run `1120-1648-ai-next-1b75`): the table above, plus 8 state cases, all pass and
all the same length or shorter (nw14 177 to 159, nw15 133 to 121, nw18 126 to 114, nw26 138 to 131, nw6 120 to 108,
sa7 131 to 124, sa10 158 to 157; nw17 131 to 140, limit 210).
Not done: the second half of Tommy's rule ("on complicated subjects offer more info, then dive in"). That belongs in the main
Ask prompt, changes every answer, and needs its own full run. See decisions.

### 3a. web1: live Ask stopped looking up a price
- Not the code. I opened the Nov 15 build (which searched, 7 of 7) and the live build: the Ask prompt, the web-search rule and
  the web tool switch are the same text, and the six excerpts the question gets are unchanged in the library.
- What is left is the model's own choice. The prompt says "search the web only when … it needs something current", and never
  names prices, so it now reads the pipe weight and pressure class from the library and says "call your supplier".
- **Fix staged: `sql/03_ask_web_price_prompt.sql`** (one paragraph added to the prompt row: prices and stock go to web search,
  give the range with sources and age, say it is not a quote). Tried once on the test row (run `1120-1652-ai-next-b074`):
  searched, gave $279.80 to $605.40 with sources. Then taken off again. Needs a full run before live, because it changes the
  main prompt for every answer; it can ride along with the full run of the final build.

### 3b. tr14: "[quote removed…]" in the middle of a sentence
- Cause: the quote checker only looked at quotes of 20 characters or more, and found them by pairing quote marks. A short
  quoted phrase first ("20 feet or less", 15 characters) was skipped, so the pairing slipped by one: the text BETWEEN two
  real quotes was judged as a quote, not found in the OSHA text, and replaced by the mark. The real quotes went unchecked.
  It can happen in any answer that has a short quoted phrase before a long one. Live has it.
- Fix (in the final build, `guard.ts`): quote marks are paired at any length, an inch mark (8") is not taken for a quote, and
  only quotes of 20+ characters are checked, as before. Two new tests (`tests/guard_quote_test.ts`): the tr14 sentence comes
  through whole, and a made-up OSHA quote is still removed, also after a short quote and an inch mark. tr14 re-run: clean.

### Round 2 cost
| Run | Slot / build | Cases | Cost |
|---|---|---|---|
| `1120-1643-ai-7c03`, `1120-1643-ai-9ebc` | live b4ad | 19 | $1.24 |
| `1120-1643-ai-next-ac59` | next 66c7 | 19 | $1.07 |
| `1120-1648-ai-next-c73c` tr14 | next b7ad | 1 | $0.02 |
| `1120-1648-ai-next-1b75` 10 long + 8 state | next b7ad | 18 | $0.40 |
| `1120-1652-ai-next-b074` web1 with the price paragraph | next b7ad | 1 | $0.13 |
| **Round 2 total** | | | **$2.85 of $3** |

## Decisions for Tommy
1. **Full run of the final build, then promote?** Recommend yes (about $4.50 with the cold start). Pass rule for it: no fact
   wrong that live gets right, and no more over-length answers than live gets the same day.
2. **Price paragraph (`03_ask_web_price_prompt.sql`) in that same run?** Recommend yes, on the test row first.
3. **"Offer more detail" style rule in the main Ask prompt?** Recommend a separate round after this one, so its effect can be told apart.

# Round 1 (the first $5)

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

## Scores (round 1, build 66c743680d2f)
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
| web1 "current price of 8 in C900 DR18" | No web search, so no price ("call your supplier"). Failed twice on the new build. Passed 7 of 7 before Nov 17. | **No.** The live build b4ad gives the same no-search answer today (run 1120-1640). The first search hands the model the same six excerpts in both builds. Round 2 found the cause (not the code, see 3a). Live has this problem now. |
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

## Other things seen
- web1 and tr14: followed up in round 2 (3a, 3b above).
- Cold starts cost about 9 cents a question for the first few questions of a run. Budget future full runs with about $1.20 on top,
  or start with one question and launch the rest right after it.

## To promote later
Copy the `next` row of `pb_ai.code` to `live` (DEPLOY_PLAN step 1 is otherwise done; the Deno count is now 38). Roll back as in DEPLOY_PLAN. The KB fix
(step 2) still waits until this build is live.

## DONE
