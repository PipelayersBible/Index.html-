# Ask searches the shelf (ask_shelf_nov20, Nov 20 2026)

Read-only on the server (three SELECTs: function grants, the `pb_docs_search` code, the Postgres version). Nothing applied,
deployed, committed or pushed. `/home/claude/ask_v24/src` was not edited: I worked on a copy and staged a patch.

**In one line:** the missing piece is built. The deep library sits in a Postgres table and Ask asks it once per question,
for the job's state plus federal, and puts up to 2 short excerpts after the core ones, in the room the core excerpts leave
free. Nothing the state-aware build sends is ever dropped, and the 9,000-character limit, the prompt, the tools and the
model are unchanged.

## What I built
| File | What |
|---|---|
| `sql/01_kb_shelf.sql` | Table `pb_ai.kb_shelf` (`id`, `chunk` as `lib_kb.py` writes it; state, collection and the search text are worked out from the chunk), GIN index on the generated `tsvector`, `public.pb_ai_kb_shelf_search`. Replaces `library_arch_nov20/sql/PROPOSED_kb_shelf.sql`. |
| `sql/02_test_rolled_back.sql` | 01 plus a test in one rolled-back transaction, ends `RESULT: PASS ...` |
| `sql/03_undo_kb_shelf.sql`, `sql/04_check_after_load.sql` | Undo; SELECT-only check after loading |
| `src_patch/shelf.ts` (115 lines, new) + `src_patch/apply_patch.py` | The Ask change: 24 lines added and 6 replaced in `ask.ts` and `tools.ts` (11 exact-once spots) on top of the state-aware source. Diff: `src_patch/ask_shelf.diff`. |
| `tests/shelf_test.ts` | 14 Deno tests |
| `tools/pgtest.sh`, `tools/run_shelf_check.sh` | Local Postgres 16 test (SQL test, loader, speed, undo); free retrieval check on the real shelf chunks |
| `DEPLOY_PLAN.md` | SQL, load, ai-next, retrieval check, promote, back out |

## How it works
- **Who can call it.** The Ask function talks to the database with the service-role key (`index.ts:85`, `admin`), the same
  way it loads the core library (`pb_ai_kb_boot`, `pb_ai_kb_page`: SECURITY DEFINER, `search_path ''`, execute for
  `service_role` only; read from the live server). The shelf search is made the same way. Signed-in users, anon and public
  cannot call it; nobody but the table owner can read the table (row security on, no policies, no grants). Tested as each role.
- **State.** The call carries the job's state from the state-aware build. A state's chunks come back only for that state,
  "US" chunks always, a two-state chunk ("KS,MO") in both. No state known: federal only. Ask checks the state again on
  what comes back.
- **Ranking.** `websearch_to_tsquery` per word group (Ask's own groups: each typed word with its synonyms, the same ones it
  sends to the company-document search), `ts_rank_cd` with the title weighted heaviest, times how much of the question the
  chunk covers, times a title boost, times 1.25 for the job state's own chunk, times 0.8 for confidence "low". At most 2 per
  title. Ask sends how much each word matters (how rare it is in the core library), so "mandrel" counts for more than "pipe".
- **Excerpts.** At most 700 characters each on the first search (1,200 on the model's own search). A longer chunk is cut to
  the run of whole sentences that holds the most of the question's words.
- **First search.** The shelf call starts at the same moment as the company-document search, so it adds no wait (it gives up
  after 1.2 s). A shelf excerpt goes in only if it covers the question about as well as the best core hit, and only in the
  room left inside the 9,000 characters. A shelf excerpt of the job state's own rule counts as "the library has this
  state's rule" for the `JOB STATE` line.
- **The model's own search** (`search_knowledge`): up to 2 shelf excerpts inside the same 5 places and 7,000 characters,
  listed after the core ones. An "osha" search asks the shelf for the OSHA collection only; an "app" search does not ask it.
- **Failure.** Function missing, error, timeout or empty shelf: no shelf excerpts, and the request is byte for byte the
  state-aware build's (tested against the un-patched source). Off switch: edge secret `AI_ASK_SHELF=off`.

## Tests run
| What | Result |
|---|---|
| Deno, patched source: 14 new + the 38 existing Ask tests | 52 passed, 0 failed |
| SQL test on an empty local Postgres 16, and again with real rows loaded | `RESULT: PASS` both times; nothing left behind; real rows untouched |
| The SQL test with the state filter removed, and with execute granted to signed-in users | `RESULT: FAIL` both times (the test does catch them) |
| Loader: the helpers' 8 real shelf batch files (`lib_kb.py` SQL), run twice | 48 chunks, 9 collections, both times |
| Speed, 127 eval questions asked as Ask asks them (`work/pgtest.txt`) | 15,000 rows: median 19 ms, slowest 41 ms. **85,000 rows: median 52 ms, 95th percentile 89 ms, slowest 108 ms** (243 MB with indexes) |
| Undo | 0 tables, 0 functions left |
| Bundle with release.sh's esbuild flags | builds, 300.5 KB -> 304.1 KB |

Speed, honestly: the box was shared and busy. Two runs of the final SQL at 85,000 rows gave a slowest search of 189 and
108 ms; the median was 52 ms both times. Ranking every matching row instead (the earlier draft's way) took median 138 ms, slowest 861 ms.
The fast way picks rows by the rarest words first: at 15,000 rows it returns exactly what ranking everything returns
(127 of 127); at 85,000 the best excerpt is the same for 117 of 127.

## Retrieval check on the real shelf chunks (free, `tools/run_shelf_check.sh`, output in `work/shelf_check.txt`)
The helpers' 535 library cases with a known answer chunk, each at its own location; core = live library + the helpers' 427
new core chunks; shelf = their 48 shelf chunks.
- Answer chunk in the first search's excerpts: **432 -> 444 of 535**.
- The 14 cases whose answer is only on the shelf: **0 -> 12 of 14**.
- Cases that got worse: **0**. Core excerpts pushed out: **0**. Another state's chunk handed over: **0**.
- The model's own search finds the shelf chunk for 20 of the 26 cases that have one.
- A shelf excerpt is added on 152 of 535 questions (28%); on 23 there was no room.

Still missing after the shelf:
1. `lib-in-dig-1` "How long is my 811 ticket good for?" (Indianapolis). The new Indiana overview card,
   `dig-in-overview-1`, is tier "shelf" in the 811 batch; the other 50 overview cards are tier "core". On the shelf it
   covers under half of this question, while core chunks (among them the old `dig-in` card) cover all of it, so it is
   not added. Looks like a slip in `lib_811_nov20`; as a core card it would be found like the other states'.
2. `lib-us-mfr-14` glued PVC joint at 50 degrees: the chunk is third on the shelf for that wording. A content / title fix.

## Findings, ranked
1. **A first version that gave shelf excerpts a guaranteed place made 8 answers worse** (it pushed the answer's core chunk
   out to make room). Measured, then changed: shelf excerpts now use only the free room. That is why "worse" is 0.
2. **"Covers most of the question" alone lets off-topic excerpts in.** With only 48 chunks on the shelf, the best shelf
   chunk for "How many days before we dig do I have to call 811?" is one about marks under snow. The rule "at least as good
   as the best core hit" keeps the count down, but 28% of questions still get a shelf excerpt, and some of those are
   neighbours of the subject, not the answer. They cost room nobody was using and about 350 input tokens (about $0.001)
   when added. Whether they distract the model is not tested (no model calls). The eval on ai-next is where that shows.
3. **The earlier draft SQL and this one cannot both be applied** (same table name). 01 refuses if the draft's table is there.
   `LIBRARY_RULES.md` section 1 still names the draft file and the draft's function arguments; the lead should point it here.
4. **Exact 29 CFR text on the shelf is handed over marked "OSHA VERBATIM"** (ids like `osha-1926.651(j)(2)-a`, kind
   verbatim), so the model may quote it and the existing quote check applies. Plain-language OSHA cards, interpretation
   letters and MUTCD text are not marked. Today's 10 shelf `osha-` chunks are all plain-language cards, so this path has
   only been unit-tested.

## Not done / limits
- Nothing run on the server; no model calls. The written answers with shelf excerpts are untested.
- Speed is from a local Postgres 16 with generated rows (the live library copied 30 times and re-labelled by state); the
  server is 17.6 and the real shelf will have different word spread.
- The first search uses the question as typed; the quick "intent" words the core search also gets are not sent to the shelf.
- The model's web search and the company-document search are untouched.
- The base may still move (length tuning in `/home/claude/ask_v24/src`). The patch is exact-once and stops if a spot changed.
- The round picker and the "4,000" fix in `retrieval.ts` (from `library_arch_nov20`) are not part of this.

## Decisions for Tommy (5)
1. **Put this on ai-next now?** Recommend yes, right after the state-aware build, with the 26-question check (about $0.65)
   and the usual full set (about $4). It cannot remove anything the model sees today.
2. **Shelf excerpts only in free room (built), or a guaranteed place?** Recommend free room. A guaranteed place handed
   over no more of the shelf-only answers and made 8 other cases worse. Look again if the eval shows many "no room"
   misses (23 of 535 questions here).
3. **How readily to add a shelf excerpt?** Built: when it covers the question about as well as the best core hit (28% of
   questions). A stricter rule that also weighs the title adds about half as often but hands over 2 fewer of the
   shelf-only answers. Recommend the built rule for the first eval, then tighten if answers get longer or wander.
4. **Let Ask quote exact OSHA rule text that lives on the shelf?** Recommend yes: same rule as the core OSHA library, and
   the quote check covers it. It is what makes "federal OSHA in full" on the shelf worth loading.
5. **Indiana's new 811 overview card is marked "shelf"; the other 50 states' are "core".** Recommend the lead has the 811
   batch changed to "core" for it (one word in one chunk) before loading.

## How to run
- `tools/pg_up.sh` then `tools/pgtest.sh` (about 3 minutes) and `tools/run_shelf_check.sh` (`DUMP=1` lists what was added);
  `tools/pg_down.sh rm` when done.
- Deno tests: `DEPLOY_PLAN.md` step 3. Local copy: `cd work && ASK_BASE=$PWD/src_base deno test -A --no-check --config /home/claude/ask_v24/check.deno.json tests/`.
- After changing `sql/01_kb_shelf.sql`: `python3 tools/gen_test_sql.py` (keeps 02 in step).

## DONE
