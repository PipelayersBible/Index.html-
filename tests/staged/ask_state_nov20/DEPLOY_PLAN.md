# Deploy plan — Ask always state-aware (for the lead; nothing here has been run)

Order matters: **1 server build → 2 KB fix → 3 app**. Each step is safe on its own except the KB fix, which must not go before the build.

## 0. What is staged
- `src_patch/apply_patch.py` + `src_patch/state.ts`: makes the new Ask source from the live source (build b4ad91749f6f).
  `src_patch/patched/` = the five resulting files; `src_patch/ask_state.diff` = the diff (198 lines) to read.
- `sql/01_ask_kb_state_fix.sql`: 31 guarded KB updates + index reset (no rows added).
- `sql/02_ask_eval_cases_state.sql`: 10 eval cases sa1-sa10.
- `app/ask_state_app.py`: app patch (3 exact-once replacements) for the r17.11 source.
- Tests: `tests/state_test.ts` (Deno, 11 tests), `tests/t_ask_state_app.js` (rig, 9 checks), `tools/run_retrieval.sh`.

## 1. Server build (ai-next first)
```
cp -r /home/claude/ask_v24/src /home/claude/ask_v24/src_b4ad_bak            # keep the live source
python3 tests/staged/ask_state_nov20/src_patch/apply_patch.py /home/claude/ask_v24/src_b4ad_bak /home/claude/ask_v24/src
cp tests/staged/ask_state_nov20/tests/state_test.ts /home/claude/ask_v24/tests/
cd /home/claude/ask_v24 && deno test -A --no-check --config check.deno.json tests/     # expect 36 passed
/home/claude/ask_boot/release.sh "ask_state: chunk jurisdiction filter, job state in first search and prompt"
#  -> prints URL= and SHA=   (this commits and pushes the sealed build file to the app repo, as every Ask release does)
select net.http_get('<URL>');  select pb_ai.code_install('next', <req id>, '<SHA>', '<URL>');
```
Then the eval on `ai-next` (real model, costs money):
```
\i tests/staged/ask_state_nov20/sql/02_ask_eval_cases_state.sql        -- insert 10
select pb_ai.eval_start('ai-next','ask_state nw+sa', array['nw1','nw2','nw3','nw4','nw5','nw6','nw7','nw8','nw9','nw10','nw11','nw12','nw13','nw14','nw15','nw16','nw17','nw18','nw19','nw20','nw21','nw22','nw23','nw24','nw25','nw26','sa1','sa2','sa3','sa4','sa5','sa6','sa7','sa8','sa9','sa10']);
select pb_ai.eval_collect('<run>');   -- every minute or two until the queue is empty
select pb_ai.eval_score('<run>');
```
Cost: 36 questions x about 2 cents = **about $0.75**. Then the full set once on ai-next to confirm California did not move:
`select pb_ai.eval_start('ai-next','ask_state full');` = about 160 active cases, **about $4** (the Nov 20 note measured $3.80 for 150).
Pass rule (the standing one): nothing goes live that scores worse than the last live run. Read the fails by hand: sa1/sa2 fail
if the model does not ask "Which state is the job in?"; sa3-sa6 fail if it asks or names the state when it should not.
If the wording needs tuning, the state lines are in `state.ts stateLines()` (not in the system prompt, so no prompt-override conflict).

Promote: copy the `next` row of pb_ai.code to `live` (as usual). Workers pick it up in a few minutes; `prompt.build` / the log line
show the build, and the log line now has `state`, `state_how`, `state_own`, `state_asked`.
Roll back: install b4ad91749f6f into `next` again the same way (its URL and sha are in pb_ai.code_history, 2026-11-17 02:25) and copy `next` to `live`.
The KB fix in step 2 does not need to be undone for the old build except part B (see below).

## 2. KB fix (only after step 1 is LIVE)
```
\i tests/staged/ask_state_nov20/sql/01_ask_kb_state_fix.sql
```
Expect 31 x "UPDATE 1" (2 state tags, 23 sources back, 6 content), then the check row: state_tags 2, florida_sources_back 3, titles 3, rows = n = 2840.
With the OLD build live this step would hide the bleeding / soil / 811 safety chunks again outside one state. With the new build it changes
nothing for them (the filter no longer reads the source line). Workers pick the edits up as they cold-start.
A KB rebuild from source must carry these edits too (same as the Nov 17-20 batches).

## 3. App (next release, r17.12)
`python3 tests/staged/ask_state_nov20/app/ask_state_app.py <in>.html <out>.html` on the release's working copy (asserts 3 exact-once spots).
Test: serve the page as cur.html, `PB_ROOT=http://127.0.0.1:<port>/ node tests/staged/ask_state_nov20/tests/t_ask_state_app.js` (9 PASS).
The app and the server do not depend on each other's order: the new server works with r17.10/r17.11 (it reads the job address, the picked
job state and the company state itself), and the new app with the old server just sends two fields the old server ignores.

## Optional switch (off): AI_ASK_PLAIN_MIN=2
Edge secret. Adds the best plain-language library chunks when verbatim OSHA text takes all the first places (about 1 question in 4).
Retrieval check: 113 -> 114 of 127. Not needed for the state work; try it on ai-next only with a full eval.
