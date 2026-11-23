# Ask everyday answers: review verified, library and reply-rule fixes staged (Nov 22 2026)

Nothing was written to the server, committed or pushed. Server use: read-only SELECTs only.

**Where the review came from.** I have no Projects tool in this session, so I could not open the Project doc. I read the full report, Part 1 and "Part 2 – Deeper pass", in the reviewer's own chat (claude.ai chat "Ask app everyday answers review", the exact text it saved to the doc). If the doc was edited after that chat, those edits are not covered here.

**Live state checked (server SELECT, 2026-11-22):**
- Library `b3e91f6c47d2`: 3,247 rows, md5 `f85b4d61df8e54abe6bd391f7317cbd7`. This matches `ask_quality_nov22/work/after_rows.jsonl` row for row.
- Code slot `live` = `1b8514750e72`. Its source is `ask_quality_nov22/work/src_q` (the q3 edit). Note that `work/m_q` in that folder is one edit older, so I rebuilt the search code into `work/m_live`.
- Prompt rows `teacher_v2` and `teacher_v2@next`: row md5 `0dcefa8e…`, reply_rule element md5 `1726f24c…` (v9).

**Scope.** I followed the lead's scope note. I changed library cards and the reply-rule wording only. The search code (state.ts) and the emergency check (emergency.ts and the app's PB_EMG) belong to the other helper. For those findings I only checked them and listed the affected cards below.

## Verified vs false alarm, per finding
| # | Finding | Verdict | Evidence / what I did |
|---|---|---|---|
| P1-1 | Air test card test-2 has half times | **VERIFIED** | test-2 copies Berkeley 02731 **Table 2 (0.5 psig)** word for word (8 in 3:47, 0.760 L) under a "1.0 psi" label. Table 1 (1.0 psig) and American Water Table 2 both give 7:34 / 1.520 L. Fixed: `std-astm-airtest-1` replaces test-2 in place and gives both columns, labelled. |
| P1-2 | Sewer-gas / rotten-egg smell gets the gas-strike script | **VERIFIED** (code, not mine) | Live emergency.ts: all 4 phrasings return `gas`. The app has the same pattern (`_src/index.html:18579`, `:18630`). I added the card `osha-pl-h2s-smell-1`, which can only help once the trigger is fixed. |
| P1-3 | Water main cover: wrong cards / dodge | **VERIFIED** | Live, OR job: first card is the heat rule; no cover number exists for any state. Fixed: national card plus OR (30 in, OAR 333-061-0050(8)(f)), IN (36–60 in by county), UT and VA (no set depth: prevent freezing). |
| P1-4 | Thrust block 6.8 vs 3.4 sq ft | **VERIFIED** | DIPRA Table 8 lists sand at 4,000 psf; ODOT RD250 lists it at 2,000. Both were re-read today. Fixed: new `mfr-dipra-thrust-2` (plan or geotech value first, then the lower value, and say which one was used). Notes added to `mfr-dipra-thrust-1` and thr-1. Reply-rule line added. |
| P1-5 / P2-A | "ticket" pulls in 811 cards | **VERIFIED** (code, state.ts:238 `tickets?` in DIG_TOPIC) | Library side only: business-pm-6 title now uses crew words. "What goes on a T&M ticket?" now ranks it 4th (it was 7th live). Fixing the forced 811 card is code. |
| P1-6 | Sewer air test pulls confined-space cards, plus the competent-person line | Search part: **mostly withdrawn by the reviewer, agreed**. Competent-person line: **VERIFIED** | v9 SAFETY LINE lists "air testing". Fixed in reply rule v10. |
| P1-7 | Minimum slope for 8 in sewer is unsteady | **FALSE ALARM as framed** | On a California job the Ten States cards are hidden **on purpose** (`state.ts:82 tenStatesOnly`), so 0.40% is not available there and "the agency sets it" is the honest answer. On other jobs it is handed first. The real gap is that no California sewer slope card exists (not written). Reply rule now says a number found in the cards leads over a web search. |
| P1-8 | SDR 35 mandrel size only on CA jobs | **VERIFIED** | Added `std-astm-mandrel-1` (SDR 35 and SDR 26, 6–15 in, 5% and 7.5%). |
| P1-9 | DI push-on deflection, 14–30 in: two numbers | **VERIFIED** | DIPRA Table 5 says 3° for 14 in and up (and notes larger pipe may allow more). McWane's chart says 5°. Both cards now say to use 3° without the maker's chart. |
| P1-10 | "fall" / "lifts" word mix-ups | Withdrawn by the reviewer, agreed | - |
| P1-11 | IN, UT, GA, NV DOT pipe numbers "not confirmed" | **VERIFIED, not fixed** | Needs the DOT spec books. Left for the next pass. |
| P2-B | Off-topic own-state card placed first | **VERIFIED** (code, state.ts:175/222, OWN_MIN 0.28) | Not mine. |
| P2-C | Everyday wording sets off the 911 script | **VERIFIED** (code) | 12 phrasings re-run on live emergency.ts: every one fires (lath ran over → open, "down in the trench shooting grade" → space, low-battery meter → space, "caved in overnight, no one in it" → space, …). Not mine. |
| P2-D | "trench" forces trench-safety cards | **VERIFIED** (code, state.ts:237 TRENCH_TOPIC) | The new OR cover card still ranks 3rd on "How deep do we dig the trench for an 8 inch water main" (1st with keywords). |
| P2-E | General cards carry one agency's numbers | **VERIFIED** | Fixed the ones that give a different number: test-1 (Greenbook 4 h, replaced), test-2, test-3 (Greenbook 50–100 mg/L removed), quick-reference-4 (WA / CA), -5 (Iowa notice and ticket life), -12 (Virginia as the source, rebuilt on Ten States 8.8). Cards that only *name* a county as the source of a national (F1417, C600) table were left alone. Reply-rule line added. |
| P2-F | C651-14 cited as current | **PARTLY a false alarm** | The 3 std-awwa-c651 cards already say "a 2023 edition exists and was not read". test-3, testing-water-8 and quick-reference-3 did not; they now carry the same note. ANSI lists C651-23 as the most recent edition. |
| P2-G | Spanish depends on the helper step | Not checked (search code) | - |
| P2-H | Stake glossary formula reads "design minus hub" | **VERIFIED, but it is code** | The text is in `src_q/glossary.ts:17`, not a library card. I left it out of scope. One-line fix for the code owner: write "hub minus design = cut". |
| new | `mfr-dipra-test-1` says a 6 inch main needs about 400 gpm to flush | **FOUND, fixed** | DIPRA Table 9 says 260 gpm at 3.0 ft/s, which is also what the pipe area gives. |
| new | Server eval case `wa1` (Wildomar, CA, cover) requires a number (30/36/42 in) | **Case may be wrong** | I found no California state number. Under v9's "no typical numbers" rule, the right answer may be "the agency sets it". Lead to review. |

## What I staged
- `cards/ask_everyday.jsonl`: 12 cards. **lib_kb: 0 errors, 0 warnings** (`lib_kb.py check` against the live copy; selftest OK).
  - New (8): `std-astm-mandrel-1`, `std-tenstates-watercover-1`, `spec-or-oha-watercover-1`, `spec-in-idem-watercover-1`, `spec-ut-ddw-watercover-1`, `spec-va-vdh-watercover-1`, `osha-pl-h2s-smell-1`, `mfr-dipra-thrust-2`.
  - Replacing a card in place (4): `std-astm-airtest-1` ← test-2; `std-awwa-c600-hydro-1` ← test-1 (the one clear hydro card); `mfr-dipra-test-1` and `mfr-dipra-thrust-1` (same ids).
- `cards/legacy_edits.jsonl`: 10 exact-once edits to old-format cards that lib_kb cannot check. My checker ran the same text rules: length, no curly quotes, no state named in the first 300 characters. Cards: test-3, quick-reference-3/-4/-5/-8/-12, testing-water-8, pipe-ductile-iron-5, thr-1, business-pm-6 (title only).
- `sql/20_precheck.sql`, `sql/21_load.sql`, `sql/91_rollback.sql`: one guarded transaction. It goes from 3,247 rows (md5 f85b4d61…) to **3,255 rows (md5 eb8a4923f3ff410be0f19b7014e7c92d)**: 11 rows changed in place, 8 added at ord 3247–3254, kb_versions.n fixed, saved index dropped.
  - Tested on my own local Postgres 16 (`tools/local_test.sh`, port 55493, stopped afterwards). The load works, a second run says "already applied", the loaded rows equal `work/after_rows.jsonl`, rollback returns exactly to f85b4d61, a second rollback says "already rolled back", and the load refuses to run if any live row has changed.
- Reply rule v10 (`prompt/reply_rule_v10.txt`, diff in `prompt/v9_to_v10.diff`, rule md5 `8592bba509bd17d059db9915fcd4ec4d`). Four changes:
  1. "air testing" becomes "air monitoring / gas testing".
  2. No safety line on pipe air, water, pressure or mandrel tests.
  3. A number from one agency in a general card is not "the stricter rule" on other jobs.
  4. A number found in the cards leads over a web search, and when inputs differ the answer says which value it used.
  - SQL: `sql/30_prompt_row_v10_next.sql` (test row, guarded on the v9 rule md5), `32_…_live.sql` (only after the eval), `39_…_rollback.sql`.
- Eval cases (lib_kb case format, 0 errors): `cases/cases_review40.jsonl` (the review's 40 questions with its right answers) and `cases/cases_fixes.jsonl` (27: every fixed answer, plus the review's test questions 1–20). For the server, convert with `library_arch_nov20/tools/cases_sql.py`. `cases/kw.json` holds keywords like the helper step's; they are my approximation.
- `sources.csv`: 15 documents, all read 2026-11-22.

## Free retrieval check (`tools/retr.mjs`: live search code 1b8514750e72, no model calls)
| Set | Live library | Staged library |
|---|---|---|
| review 40, raw / with keywords: right card handed | 35 / 34 | **37 / 38** |
| 27 fix cases, raw / with keywords: right card handed | 10 / 14 | **24 / 27** |
| test-2 (half air test times) handed | 2–4 questions | **0** |
| existing sets (700 core, 204 trench/811, 113 confined space, 7, 47 q, 51 reporting, text127) | 651 / 682 facts … | **same, 0 worse** (an alias test-1/2 → new ids is needed for one case; `work/alias_everyday.json`) |

What is still missing in the staged library:
- Math questions: "facts" fails on these because the number is worked out, not looked up.
- `lib-ca-evfix-14` (concrete ticket): blocked by code A.
- `lib-oh-evfix-24` (crew production): blocked by code B.
- `lib-us-evfix-25` (laser): blocked by code C. All three pass once the keywords are in, except where code forces the wrong card.

**Cards to test together with the search and emergency code fixes:**
- `business-pm-6` and `lib-fl-ev40-40`, `-evfix-13`, `-evfix-14` (A).
- `spec-or-oha-watercover-1` and `std-tenstates-watercover-1` with `lib-or-evfix-6`, `lib-or-ev40-38` (B, D).
- `osha-pl-h2s-smell-1` with `lib-us-evfix-4` / `-5`: these cases cannot pass until the emergency check lets the question through (C, P1-2).
- `lib-us-evfix-25` / `-26` (C).
- `lib-oh-evfix-24` (B).

**Paid eval (lead):** load 21 on next, plus row v10 on `teacher_v2@next`, then ask the 67 cases. At about $0.025 each that is about $1.70.

## Not done / for Tommy to get
- IN, UT, GA, NV DOT pipe numbers.
- The Indiana county cover table values.
- A California water main cover number and a California sewer slope source.
- C900 bending radius by maker.
- A general card on jetting backfill: I found no official national source; installation-embedment-9 and gb-4 cover "only if the spec allows".
- AWWA C651-23 (paid): to confirm whether the 25 mg/L, 24 h and 16 h numbers changed.

## Decisions for Tommy
1. **Load the library change (sql/21_load.sql) after a next-slot eval.** Recommend: yes. It fixes a wrong air test number crews would use to pass or fail a line, and adds the water main cover answers.
2. **Reply rule v10 on the test row first, then live.** Recommend: yes. It stops "Your competent person decides on site" from appearing on pipe air and water tests and stops Greenbook numbers from becoming the rule in other states.
3. **Server eval case wa1** (California cover must give 30/36/42 in): change it to accept "agency / plans set it" unless someone finds a California rule. Recommend: change it.
4. **Buy AWWA C651-23** (price not checked) so the disinfection cards can be confirmed against the current edition. Recommend: yes, low priority.

## DONE

## Lead: applied Nov 22 evening
- Library 21_load applied: 3,255 rows, md5 eb8a4923… (rollback 91_rollback.sql).
- Prompt row teacher_v2@next = v10. Live row still v9.
- Build cdddf51b34db installed on slot next (with the emergency/search fixes). Eval on ai-next running (emergency_nov22/EVAL_NEXT.md).
