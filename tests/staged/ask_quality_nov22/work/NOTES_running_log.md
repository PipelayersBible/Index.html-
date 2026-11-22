# Ask quality pass (Nov 21-22, 2026) - IN PROGRESS (saved early; container may restart)

Tommy (Nov 21): "Look for more ways to streamline the ask process too ... right now I ONLY care about quality."
Base (server SELECT, Nov 21 evening): live build `4776ad1c5afb`, library `b3e91f6c47d2` 3,240 rows md5 `a9e67ec6527df46b665cbc03bdb6ca6c`, shelf 50,
prompt rows `teacher_v2` = `teacher_v2@next` md5 c0aa8fed6c3f15584aa9db8abea0a864 (v8), slot next = 284a80efeee2.
Base files: work/src_base = live 4776 source (= library_consolidate_cs_nov21/work/src_cs_live = t12/src); work/live_rows.jsonl = cs_states after_rows (= live md5 a9e67ec6).

## Harness
- `tools/mk_mjs.sh <src> <out>`: retrieval/state/route as ES modules (esbuild; identical to prior helpers' modules).
- `tools/score.mjs <moddir> <kb.json> <out.json> work/alias.json`: free retrieval check over ALL sets (700 existing core, 204 trench/811 state,
  113 confined space state, 7 cs-states, 127 text) + "would an office-level user be routed to business analysis" per question.

## Scoreboard (free retrieval check)
| Step | existing 700 chunk / facts (P2) | P0 | 204 | 113 | 7 | text127 | office->analysis (of 700) |
|---|---|---|---|---|---|---|---|
| base (live 4776 + live rows) | 650 / 682 | 637 / 676 | 204/204 | 113/113 | 7/7 | 117 | 7 |

## Log
- Baseline reproduced the cs_states numbers exactly.
- Nov 22 early: coordinator's safety review items (top priority). Code patch `src_patch/apply_patch_q.py` (+ `src_patch/emergency.ts`) on work/src_base -> work/src_q:
  S1 emergency.ts: 4 scripts (space / open / gas / power), EN + ES, wider triggers; 38/38 reviewer phrasings fire, 0 false positives on 19 tricky "about" questions;
     on all 1,163 eval questions it fires on 11 (all real emergencies: nicked gas line x6, cave-in x2, heat, bleeding) vs 2 before.
  S2 state named in passing (Oregon Ave, from Texas, company in Utah, Nevada Street) no longer replaces the job state; S3 no-state safety questions ask the state;
  S4 guard fail-safe word-match strip. Deno work/tq: 80 passed, 1 failed by design (kb_next overlay test). Changed test: state_test "We hit a gas line and it's blowing" now expects the instant script.
- S5 office routing: knowledge words keep rule/spec questions out of MODE business analysis (11 misroutes of 24 office knowledge questions -> 0; the 7 eval cases that an office user would have had misrouted -> 0; real analysis questions unchanged, 3 already-missed job-progress questions still miss as on live).
- S6 photo routing: stake / paint / ticket photos with "station", "invert", "IE", "cut" no longer go to the plan reader. S7 tokens: "L/O", "O/S" kept as one token; tab data, positive response, re-mark, hold-down phrases. ("the box" -> trench box tried and dropped: it leaked into bench ranking.)
- Library round 1 (tools/build_lib.py, 26 edits + 3 new): WA CO 35 ppm card (WAC 296-841-20025), power line contact card, gas strike card, CA serious-injury definition + ER wording, federal ER wording, MO 21 days (2025 SB 133), WV 15 business days + 2 ft (WV811 2026), tables, Monday->Thursday on 14 state cards + AZ, stale who/trench lines NV SC MN. lib_kb 0 errors.
- Free check after round 1 + S1-S7: existing 700 chunk 650->649 facts 682->682 (worse: lib-nj-dig-3 chunk only; that question now gets the instant gas script), office->analysis 7->0; 204/113/7 unchanged; new cases_q 38: chunk 22->37, facts 18->38.
- Answers read by hand (step 3): 140 from 1121-lib8-148 + ~40 flagged from 1121-consol-state / cs-state / lib8b-r11 / lib8-fu1. Patterns -> fixes: see "Answer patterns" below.
- S8 answer text (glue split quotes; strip "Line 1:", "(excerpts 2, 6)"; state line no longer asks the model to say "the library does not have"), S9 reply rule v9 (built in + prompt row), S10 reporting forcing (state report card + by-state table).
- Library round 2: report table osha-pl-report-states-1 + 6 state report cards (AZ IN NC NM TN VT, agency pages read 2026-11-21), TN/NC who-card stale lines, CA heat: 3 duplicates retired (cal-2, emp-ca-safety-1/-2) into sp-ca-heat-1/-2 (+ agriculture-only 10-minute cool-down fact, crew-word titles). 30 edits, 10 new, 3 retired -> 3,247 rows. lib_kb 0 errors (5 warnings: agency pages without section numbers, as on the existing NV/SC cards).
- Free check after round 2 (P2): existing chunk 650->651 facts 682->682; P0 chunk 637->637 facts 676->677. Worse: lib-nj-dig-3 (now the instant gas script), lib-us-dig-4 at P0 chunk only (gas strike card replaces the 196 card; facts still in). cases_q 47: chunk 24->46, facts 25->47.
- ai-next: build 3e97a11a1b81 (commit 0738c6a, overlay q1: replace 30, add 10, remove 3; overlay == after rows checked) installed; teacher_v2@next reply_rule -> v9 (row md5 0dcefa8e..., rule md5 1726f24c...; other 4 elements identical to live).
