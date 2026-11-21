# Ask promotion package: lib7 (Nov 20 evening), built on live 4a5c84ce8242

## What goes live
| Step | Thing | Exact value |
|---|---|---|
| 1 | Ask build (code slot `live`) | **SEE "Final build" BELOW** (the build on `ai-next` when this package was closed) |
| 2 | Prompt row `teacher_v2` | the text of `teacher_v2@next` (reply rule v7c, md5 of the reply_rule element `8f15b056e6af17964b77a85456b10a18` = `src_patch/reply_rule.txt`) via `02_prompt_row_promote.sql` |
| 3 | Library rows (`pb_ai.kb_chunks`, version b3e91f6c47d2) | `04_library_core.sql`: +396 chunks, 68 replaced in place (the staged library incl. ask_followups' Washington rows as `sp-wa-trench-*`) |
| 4 | Shelf rows (`pb_ai.kb_shelf`), optional | `05_library_shelf.sql` (47 chunks; the shelf code is in the build and does nothing while the table is empty) |

The build lays the staged library over the live rows in memory ONLY on `ai-next` (overlay rev lib7d). On `live` it reads the library tables, so **step 3 is what puts the
library live**; without it, live gets the code changes (strictest rule, continuation, 20 ft, checker fix, reply rule) on today's 2,840-row library. Steps 1-2 can go first;
step 3 can follow on its own. After step 3 the overlay on `ai-next` replaces rows with identical content (no effect).

## Order and checks
1. **Build**: `select net.http_get('<URL>');` then `select pb_ai.code_install('live', <req id>, '<full sha>', '<URL>');` (expect `installed live <sha12> (...)`).
   Smoke: 3 questions with `pb_ai.eval_post('ai', ...)` (pm1, tr12, nw14 as done for 4a5c); the reply's `prompt.build` must show the new stamp.
2. **Prompt row**: run `02_prompt_row_promote.sql`; its first select must say `next_has_v7c = true, live_unchanged = true`.
3. **Library**: run `03_library_precheck.sql` (SELECT only). Expect `already_there = 0`, `to_replace_found = 68`, rows = max_ord + 1, and the last select
   `ids_same = true, texts_same = true, rows_2840 = true`. Then `04_library_core.sql` (one transaction; its own checks raise on an ord gap, duplicate id or a wrong n).
   After: `select n from pb_ai.kb_versions where active` = 3236; Ask workers rebuild the index on the next cold start.
4. Optional: `05_library_shelf.sql`.

## Rollback
- Build: `pb_ai.code_install('live', <req of a fresh http_get of the 4a5c URL>, '4a5c84ce824227f0447551840b4864d166def577edd08965e8d895b7dc64195a',
  'https://raw.githubusercontent.com/PipelayersBible/Index.html-/57230c81f66a233ca88da3695ae03f883aa1093b/data/ask/b-4a5c84ce8242.txt')`; one step further back: b7ad788e3a62 (commit 9c575fe).
- Prompt row: `92_prompt_row_rollback.sql` (rebuilds the 17:20 text from the row's own first two elements; guarded by its md5 bbe7c4599587734e6727895da4f2e8d9).
- Library: `94_library_rollback.sql` (puts the 68 replaced rows back by ord from the copy the set was built on, deletes ords >= 2840, row count, index reset; raises unless 2,840 rows).
- Shelf: `delete from pb_ai.kb_shelf;` (it is empty today).
- Test cases: `delete from pb_ai.eval_set where not active and cat like 'lib%';` (inactive library cases only).

## Not in this package (decisions / later)
- Pattern fixes for 4 existing eval cases (`06_eval_pattern_fixes.sql`): the case was wrong, not the answer; each one is documented in ROUNDS.md. Apply only if you want the server grader to agree with the hand-read.
