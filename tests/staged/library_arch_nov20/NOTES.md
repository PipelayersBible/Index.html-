# Ask library: architecture and rules (library_arch_nov20, Nov 20 2026)

Read-only on the server (SELECTs, function code, logs). Nothing applied, deployed, committed or pushed. Everything is staged here.

**In one line:** the library Tommy asked for is 5 to 7 times today's (30 times with every rule in full text), and Ask's search
breaks between 2 and 10 times. So: a small core of answer cards stays in the worker (cap 6,000 chunks), the deep library goes
in a Postgres table searched on the server, and every helper writes chunks through one checker so the files are consistent.

## What is in this folder
| File | What | State |
|---|---|---|
| `LIBRARY_RULES.md` | The rules: capacity and design, chunk format, copyright, quality, eval plan, lawyer list | written |
| `lib_kb.py` | Checks chunks and eval cases, writes guarded SQL. `python3 lib_kb.py selftest` passes | built, tested |
| `tools/bench.mjs`, `work/bench.txt` | Capacity test of the live search code at 1x to 30x | run |
| `sql/PROPOSED_kb_shelf.sql` | Shelf table, full-text index, search function | tested on local Postgres only |
| `sql/PROPOSED_prompt_concise_next.sql`, `tools/prompt_edit.mjs` | Tommy's "concise and direct" rule as a prompt edit for `ai-next` | checked against the live prompt text; not applied, not evaluated |
| `sql/PROPOSED_eval_style.sql` | Eval grades answer-first and the offer rule | tested on local Postgres only |
| `tools/retr_cases.mjs`, `tools/cases_sql.py`, `examples/cases_example.jsonl` | Free retrieval check for library cases; case loader | run on 2 example cases (2 of 2) |
| `tools/pgtest.sh` | Runs all the SQL above on a throwaway local Postgres 16 | run at 15,000 and 85,000 rows |

## Findings, ranked
1. **Ask cannot hold the library as asked.** Whole library sits in each worker's memory. Measured with the live code at a
   256 MB cap (`work/bench.txt`): build time passes the 2 s CPU limit at about 3x (2.5 s); common words start scoring zero at
   5x ("water") and 10x ("trench") because of a fixed 4,000 in `retrieval.ts:252`; the saved index is refused past about 10x
   (48 MB cap in `kb_codec.ts`, 32-part cap in `pb_ai_kb_index_put`); out of memory at 30x. Live today: 2,840 chunks, cold
   start 1.8 s built / 0.64 s saved (server log, Nov 20).
2. **Answers are about twice as long as the prompt allows, and the eval does not notice.** Last full run (Nov 16, 74 text
   answers): average 130 words, median 123, 71 of 74 over 80, 41 over 120. The prompt says 30-80, never over 120
   (`prompts_v2.ts:81`). Eval cases allow 120-220. The prompt also bans offers, the opposite of Tommy's Nov 20 rule.
3. **Rows can never be deleted from the library table.** The loader reads by position and refuses a count mismatch, so a
   gap breaks every cold start. `lib_kb.py` replaces in place (`supersedes`) and its SQL checks for gaps.
4. **The "set parts = 32" step used to drop the saved index stops working if an index ever has 32 parts**, and a shrinking
   index leaves old parts behind so the saved copy is never used again (`pb_ai_kb_boot` compares the part count). Not biting
   today (2 parts). `lib_kb.py` SQL deletes the index rows instead.
5. **Shelf search works at the size needed.** Same method as the company-document search already live (`pb_docs_search`).
   Local test: 15,000 rows 30-160 ms; 85,000 rows 0.2-1.0 s.
6. **Measured eval cost:** $0.021 a text question (Nov 16 run); $0.031 average over 14,724 results including photos.

## Built vs proposed
- **Built and tested locally:** `lib_kb.py`, the bench, the shelf SQL, the eval-style SQL, the prompt edit file, the free
  retrieval check, the case loader.
- **Proposed, not built:** the Ask code that searches the shelf (about 40 lines, `tools.ts:779` and the first search in
  `ask.ts`); the 4,000 fix in `retrieval.ts`; a per-question length reminder beside `JOB STATE`; the round picker script.
- **Not tested:** anything on the real server; what Supabase does when a worker passes 2 s of CPU; the new prompt wording
  against the model; whether the eval runner can ask a follow-up (needed to grade "they said yes, now go deeper").
- **Estimates, not measurements:** the size of the requested library (13,000-18,000 chunks) and the big-run cost (about $45).

## Until the shelf search is built
Shelf chunks can be written and loaded, but Ask cannot see them. Only core chunks change answers. Helpers should put the
numbers crews ask for in core cards first (40 per state, 1,000 federal) and the detail on the shelf.

## Decisions for Tommy (5)
1. **Core + shelf, or load everything the old way?** Recommend core + shelf. Loading everything into the worker breaks Ask
   somewhere between 2x and 10x; the shelf has no ceiling and uses a method already live in the app.
2. **Build the shelf search in Ask now?** Recommend yes, next, on `ai-next`. Without it most of the new library is stored but unused.
3. **Tighter answers: try the new LENGTH wording on `ai-next`?** Recommend yes, with the eval-style change, in round 1. If
   answers are still long, add the one-line reminder next to the question (small code change).
4. **Copyright: summaries only for 811 center handbooks, state DOT spec books and paid standards until the lawyer answers?**
   Recommend yes. Ask the lawyer the five points in `LIBRARY_RULES.md` section 6; a yes on DOT spec books would make spec answers much more exact.
5. **Eval budget.** Rounds of 100 at $2.50 are approved. Recommend a $100 cap in total: 6-10 rounds, one big run (about $45), one re-run of its failures.

## DONE
