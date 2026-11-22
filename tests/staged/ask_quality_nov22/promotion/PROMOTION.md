# Ask promotion package: ask_quality q1 (safety review fixes, routing, answer text, reply rule v9, library) - Nov 21-22 2026

Live now (server SELECT, Nov 21 evening): code slot `live` = `4776ad1c5afb`, library `b3e91f6c47d2` **3,240 rows, md5 `a9e67ec6527df46b665cbc03bdb6ca6c`**,
shelf 50 (not touched), prompt row `teacher_v2` md5 `c0aa8fed6c3f15584aa9db8abea0a864` (reply rule v8). Nothing here has been applied to live.
Live table constraints carried by the local test copy: pkey (version, ord), CHECK (ord >= 0), chunk CHECK, lib CHECK, FK -> kb_versions. Renumbering goes through ord + 1000000.

## What goes live (order 1 -> 2 -> 3 -> 4)
| Step | Thing | Exact value |
|---|---|---|
| 1 | Precheck (SELECT only) | `20_precheck.sql`: expect rows 3240, max_ord 3239, kb_n 3240, all_md5 `a9e67ec6527df46b665cbc03bdb6ca6c`, touched_ok 33, new_ids_there 0. |
| 1b | Rolled-back live test | `21t_live_test.sql` (one DO block: load body -> md5 -> rollback body -> md5 -> RAISE; nothing stays written). Expected: `ERROR: ASK QUALITY ROLLBACK TEST OK: before 3240 / a9e67ec6527df46b665cbc03bdb6ca6c, after load 3247 / f85b4d61df8e54abe6bd391f7317cbd7, after rollback 3240 / a9e67ec6527df46b665cbc03bdb6ca6c`. Any FAIL: stop. |
| 2 | Library, one guarded transaction | `21_load.sql`: changes 30 rows in place, deletes 3 retired cards (cal-2, emp-ca-safety-1, emp-ca-safety-2), renumbers the survivors 0..3236, adds 10 cards at 3237..3246 -> **3,247 rows, md5 `f85b4d61df8e54abe6bd391f7317cbd7`**, kb_versions.n 3247, saved index dropped. Runs only on md5 a9e67ec6...; second run "already applied". Then `20_precheck.sql` again: 3247 / f85b4d61... / new_ids_there 10. |
| 3 | Ask build (slot `live`) | **`1b8514750e72253b20f38f12eb21f9a2d7e118a128fd5294f884d5bd042e259c`**, `https://raw.githubusercontent.com/PipelayersBible/Index.html-/7d5209a9f0d05b11f531e26e02d2a80eadae3f86/data/ask/b-1b8514750e72.txt` (4776 source + `src_patch/apply_patch_q.py`, **empty overlay**). Same code as ai-next `9c38a478964d` (installed on slot next; it carries the library change as overlay q3). |
| 4 | Prompt row `teacher_v2` | `32_prompt_row_v9_live.sql`: replaces only the reply_rule element (v8 -> v9, `src_patch/reply_rule_v9.txt`, md5 1726f24c5639b197e9dbabd586bec5f2); guarded by the v8 row md5 c0aa8fed...; returns the new row md5 and rule md5. The same statement ran on `teacher_v2@next` (result row md5 0dcefa8e293bf1e4ba3c8f50a17be622; the other 4 elements compared equal to live). |

Install step 3: `select net.http_get('<URL>');` then `select pb_ai.code_install('live', <req id>, '<sha256 above>', '<URL>');` (expect `installed live 1b8514750e72 (...)`).

**Order:** library first (it drops the saved index, so the first cold start rebuilds it with the new tokenizer). The new build on the old library works
(no report table to force; everything else is code). The old build on the new library works (new cards found by normal search). Row v9 works with either build.

**Rollback, each step on its own:** library -> `91_rollback.sql` (guarded on f85b4d61...; back to 3240 / a9e67ec6... exactly; tested);
build -> `4776ad1c5afb` (`https://raw.githubusercontent.com/PipelayersBible/Index.html-/ca2e7dceb7a9bc231fbab0299ca4010a7f9a2b9c/data/ask/b-4776ad1c5afb.txt`,
sha256 `4776ad1c5afb9203d9e11e12eb57531da62ce666756078032723c639d349db24`); row -> `92_prompt_row_v8_rollback.sql` (puts the v8 reply_rule element back; guarded on the v9 rule md5).

**App (separate, the lead integrates):** `app_patch/p_emergency_app.py` on `_src` r17.14 (e85bf91): same emergency triggers and 4 scripts (EN/ES) on the phone,
checked before the plan check; "Emergency? Call 911." on the no-plan / limit / no-signal / timeout / busy / unavailable messages. Test: `node app_patch/t_emergency_app.js <patched.html>` (20 checks + every inline script parses). Not shipped.

## Local test (`tools/local_test.sh`, log `work/local_test.log`; private Postgres 16 at /var/lib/postgresql/aq_pg port 55481, snapshot live_3240_a9e6.dump = live md5)
precheck 3240 / a9e67ec6 / touched 33 / new 0; 21t -> `ASK QUALITY ROLLBACK TEST OK ...`, copy unchanged after; load -> 3247 / f85b4d61, kb_versions 3247 {app 238, osha 278, field 2731}, index rows 0;
load again "already applied"; **loaded rows = work/after_rows.jsonl row for row** (= what the free check and the ai-next overlay used); 21t on the loaded state refuses;
rollback -> 3240 / a9e67ec6 exactly; rollback again "already rolled back"; load refuses on a changed live row; rollback refuses on a changed result.

## Smoke after promotion (6 questions, about $0.60 cold)
1. "What is the carbon monoxide limit for entering a manhole?" Spokane, WA -> 35 ppm (WAC 296-841-20025), stricter than federal 50.
2. "We're on Oregon Ave. At what depth do we need a trench box?" Spokane, WA -> Washington 4 ft (the street name must not switch the state).
3. "How much cover do we need over our 8 inch water main?" office level -> a normal Ask answer (log `mode` teacher, not analysis).
4. "One of my guys went to the ER, do I have to call OSHA?" Fresno, CA -> admitted = Cal/OSHA within 8 hours; ER only for observation/tests is not by itself serious.
5. "we hit a gas line" (any job) -> the instant gas script (local, no model call): upwind, no sparks, 911 then the gas company.
6. "If I call in my locate Monday morning, when is the first day I can dig?" Tucson, AZ -> Thursday.

## Results on ai-next (same prompt-row change as step 4). Spend **$7.96** of $20 (reply bodies)
| Run | Build | Result |
|---|---|---|
| `1122-q-smoke` (8) | q1 3e97a11a1b81 | 8 / 8 right: WA CO 35 ppm; Oregon Ave on a WA job -> Washington 4 ft; CA ER -> admitted = 8 h; AZ Monday -> Thursday; L/O = line only; TN TOSHA 1-800-249-8510; "we hit a gas line" -> instant gas script; Spanish trench -> instant Spanish script |
| `1122-q-148` (the 148 core cases, same ids as `1121-lib8-148`) | q1 | **143 / 148** by the server's patterns (lib8 on the same ids: 146 / 148). The 5: nw23 + nw24 (instant scripts' wording: "pressure" missing, "backfill it" inside a "do not") -> script text fixed in q2; sa5 (no-state ladder question asked "which state") -> fixed in q3; ct4 (pattern: answer said "1 1/2 hours"); sw1 (no web search this time; said the slope is set by the agency, not confirmed). Re-asked on q3: nw23, nw24, sa5, ct4 all pass -> **147 / 148 effective**. Median 64 words (lib8 64.5); "library / excerpts" words 4 -> 0; "Line 1:" 1 -> 0; competent-person line 57 = 57. |
| `1122-q-new` (45: cases_q + office routing) | q1 | Read by hand: 43 right. Monday -> Thursday 14 / 14 (+AZ in smoke); WA CO / H2S; power and gas national cards; MO 21 days; WV 15 business days + 2 ft (says "not confirmed in the statute text"); state named in passing 3 / 3 keep the job state; tokens/synonyms 7 / 7; reporting 8 / 8 (AK 8 h; AZ IN NC TN VT state agency + phone); office knowledge questions answered as normal Ask with the state line. Issues: q-gas-1 ("nicking a gas service ... not leaking") got the instant gas script -> fixed in q2 (negated leak words); q-rep-wy said "Wyoming's deadline isn't confirmed" -> table line fixed in q2. |
| `1122-q3-check` (24) | q3 9c38a478964d | All right. AR / IL 811 wait: no raw statute quote as line 1; Detroit: "federal OSHA's 5 ft ... is stricter"; no-state trench box -> federal minimum + "some states set a stricter rule" + "Which state is the job in?"; no-state ladders -> no state question; nicked service, no leak -> AI answer (operator first, 911 only if escaping); 8 trench / 811 / cs state cases from the earlier sets: right state, no other state named; Spanish power contact -> instant Spanish script. |

## APPLIED Nov 21 ~9:05 PM PT (lead)
Rolled-back live test OK (3240/a9e67ec6 -> 3247/f85b4d61 -> 3240/a9e67ec6). 21_load applied (3247, f85b4d61). Build live 1b8514750e72. Prompt row v9 (row md5 0dcefa8e, rule md5 1726f24c).
Smoke 6/6: WA CO 35 ppm; Oregon Ave on WA job -> 4 ft WA; office cover question -> teacher mode; CA ER -> admitted = 8 h; "we hit a gas line" -> instant gas script (local); AZ Monday -> Thursday.
Rollback: 91_rollback.sql, 92_prompt_row_v8_rollback.sql, reinstall build 4776ad1c5afb.
