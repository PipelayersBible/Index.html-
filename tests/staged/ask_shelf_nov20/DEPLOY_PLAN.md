# Deploy plan: Ask searches the shelf (for the lead; nothing here has been run on the server)

Order: **0 state-aware build is the base → 1 SQL → 2 load shelf rows → 3 build on ai-next → 4 retrieval check → 5 promote.**
Steps 1 and 2 change nothing for live Ask (the live build never reads the table or calls the function).
The build in step 3 is safe before steps 1-2 too: a missing function or an empty shelf means "no shelf excerpts" and the
request is byte for byte the state-aware build's (tested). The order above just avoids a pointless gap.

## 0. What is staged
- `sql/01_kb_shelf.sql`: table `pb_ai.kb_shelf`, two indexes, `pb_ai.kb_shelf_excerpt`, `public.pb_ai_kb_shelf_search`.
  **Use this instead of `library_arch_nov20/sql/PROPOSED_kb_shelf.sql`** (same table name, two more columns, a different
  search function). If the draft was ever applied, 01 stops and says so; run 03 first.
- `sql/02_test_rolled_back.sql`: 01 plus a test, in one rolled-back transaction, ending in `RESULT: PASS ...`.
- `sql/03_undo_kb_shelf.sql`, `sql/04_check_after_load.sql` (SELECT only).
- `src_patch/apply_patch.py` + `src_patch/shelf.ts`: makes the new source from `/home/claude/ask_v24/src` (the state-aware
  source). `src_patch/ask_shelf.diff` to read; `src_patch/patched/` = the three resulting files.
- `tests/shelf_test.ts` (Deno, 14 tests).

## 1. SQL
```
-- one query, the whole file; expect: ERROR  RESULT: PASS  real_rows_set_aside=0 rows=6 ... grants=service_role_only table=closed user=refused
\i tests/staged/ask_shelf_nov20/sql/02_test_rolled_back.sql
-- then for real
\i tests/staged/ask_shelf_nov20/sql/01_kb_shelf.sql
```
02 keeps nothing (checked locally: 0 tables, 0 functions left). The server is Postgres 17.6; the local test ran on 16.15.
Nothing in the SQL is version-specific, but 02 on the server is the real proof.

## 2. Load the shelf rows
The content helpers' shelf batches, as written by `lib_kb.py` (each is one transaction and safe to run twice). Today:
```
tests/staged/lib_811_nov20/sql/lib_811_dig_shelf_00.sql      tests/staged/lib_811_nov20/sql/lib_811_fed_shelf_00.sql
tests/staged/lib_more_nov20/sql/lib_more_shelf_00.sql        tests/staged/lib_osha_nov20/sql/lib_osha_fed_shelf_00.sql
tests/staged/lib_osha_nov20/sql/lib_osha_sp_shelf_00.sql     tests/staged/lib_specs_nov20/sql/specs_shelf_00.sql
tests/staged/lib_traffic_nov20/sql/traffic_mutcd_shelf_00.sql  tests/staged/lib_traffic_nov20/sql/traffic_tc_shelf_00.sql
```
= 48 chunks in 9 collections (loaded twice locally with these exact files: 48 rows both times). The helpers were still
writing when I ran this; load whatever `*_shelf_NN.sql` files exist when you get here.
Then `\i tests/staged/ask_shelf_nov20/sql/04_check_after_load.sql`: counts by collection; `service_role_can_call = t`,
the other three `f`, `indexes = 3`; three sample searches with the expected first row; `wrong_state_rows = 0`; a timing.
No index rebuild, no worker restart, no `kb_versions` change: shelf rows are live for the next question.

## 3. Build (ai-next first)
The base is the state-aware source in `/home/claude/ask_v24/src`. If the length-tuning helper changed it since, the patch
still applies as long as its 11 exact-once spots are intact; if one is not, it stops and names it.
```
cp -r /home/claude/ask_v24/src /home/claude/ask_v24/src_before_shelf
python3 tests/staged/ask_shelf_nov20/src_patch/apply_patch.py /home/claude/ask_v24/src_before_shelf /home/claude/ask_v24/src
cp tests/staged/ask_shelf_nov20/tests/shelf_test.ts /home/claude/ask_v24/tests/
cd /home/claude/ask_v24 && ASK_BASE=/home/claude/ask_v24/src_before_shelf deno test -A --no-check --config check.deno.json tests/ 2>&1 | grep -v '^{"ai"' | tail -5
#   expect 52 passed (38 existing + 14 new). ASK_BASE makes one test prove an empty shelf leaves the request unchanged.
/home/claude/ask_boot/release.sh "ask_shelf: deep library searched in Postgres, excerpts beside the core hits"
select net.http_get('<URL>');  select pb_ai.code_install('next', <req id>, '<SHA>', '<URL>');
```
Bundle size checked with release.sh's esbuild flags: 300.5 KB before, 304.1 KB after.

## 4. Retrieval check on ai-next
Free:
- `04_check_after_load.sql` again (step 2).
- The log line of every Ask now has `"shelf": n` (how many shelf excerpts went to the model). Ask one of the questions
  below on ai-next and look for `shelf: 1` or `2`.
- Locally, any time, no server: `tools/run_shelf_check.sh` (needs `tools/pg_up.sh` first). Today: answer chunk in the first
  excerpts 432 -> 444 of 535 cases, shelf-only cases 0 -> 12 of 14, 0 cases worse, 0 core excerpts pushed out.

Paid (after the helpers' cases are in `pb_ai.eval_set` via `library_arch_nov20/tools/cases_sql.py`):
```
-- the 14 cases whose answer is ONLY on the shelf (they cannot pass without this build) + the 12 that have it in both
select pb_ai.eval_start('ai-next', 'ask_shelf', array['lib-in-dig-1','lib-in-dig-2','lib-in-dig-3','lib-us-fed-22','lib-us-fed-25','lib-ca-lic-1','lib-ca-lic-2',
  'lib-us-mfr-13','lib-us-mfr-14','lib-us-mfr-15','lib-us-mfr-16','lib-us-mfr-17','lib-us-mfr-18','lib-us-mfr-19',
  'lib-ca-dig-1','lib-ca-dig-2','lib-ga-dig-1','lib-ga-dig-2','lib-nc-dig-1','lib-ny-dig-3','lib-pa-dig-1','lib-pa-dig-3','lib-nm-dig-2','lib-nm-dig-3','lib-us-fed-17','lib-us-std-10']);
select pb_ai.eval_collect('<run>');  select pb_ai.eval_score('<run>');
```
26 questions x about 2.5 cents = **about $0.65**. Expect `lib-in-dig-1` and `lib-us-mfr-14` to depend on the model's own
search (the free check says the first search does not hand them over; see NOTES). Then the usual full set once on ai-next
(about $4): the shelf only ever ADDS excerpts, so what to watch is answer length and an answer leaning on an off-topic shelf
excerpt, not missing facts. Pass rule as always: nothing goes live that scores worse than the last live run.

## 5. Promote, and how to back out
Promote: copy the `next` row of `pb_ai.code` to `live` as usual.
Back out, fastest first:
1. Edge secret `AI_ASK_SHELF=off`: no shelf calls at all, no build needed (workers pick it up as they restart).
2. Install the previous build into `next`, copy to `live` (the state-aware build; its row is in `pb_ai.code_history`).
3. `sql/03_undo_kb_shelf.sql` drops the function and the table. Safe with either build live. The rows are not lost: the
   `.jsonl` files are the source and the batch SQL can be run again after 01.

## Knobs (all in `shelf.ts`, top of file)
`SHELF_FIRST`: `k` 2 excerpts, `chars` 700 each, `margin` 0.05 (how close to the best core hit a shelf excerpt must be),
`minCover` 0.3, `ms` 1200 (give up after). `SHELF_TOOL`: 2 excerpts of 1,200 for the model's own search.
In the SQL: `v_cap` 5000 (rows picked by the rarest words) and the 400-row limit before the costly ranking.
