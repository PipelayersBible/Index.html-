# Ask — always state-aware (ask_state_nov20, Nov 20 2026)

Read-only on the server (SELECTs and reading function code). Nothing deployed, written, committed or pushed. Everything is staged in this folder.

**In one line:** Ask now works out the job's state once, for every question, and uses it in the first search, the model's own
second search and the prompt. A library chunk's state comes from the chunk itself, so general and federal chunks show in every
state and a state's chunks show only there. On a job outside California the first search puts every needed fact in front of the
model for about 99 of 127 eval questions, up from about 85. No question got worse in any state.

## What I checked first (so the numbers below mean something)
- **Live Ask code = `/home/claude/ask_v24/src`.** `ai` and `ai-next` are only loaders; the build is stored sealed in `pb_ai.code`
  (live and next are both `b4ad91749f6f`). I opened the sealed build file from the repo with the project's own key file and it
  matches a fresh build of the local source byte for byte (apart from the build stamp).
- **Local KB copy = live.** 2,840 rows; md5 of id/title/topic/source/text per 100-row bucket matches live for all 29 buckets
  (`tools/mkkb2.py`). App-chunk roles were read from live too.
- **Eval set:** 190 rows = 127 text questions + 12 photo questions + 51 stake reads. Only the 127 text questions use the library
  search, so those are what the retrieval check runs (`tools/cases_all.json`). 67 of them come from the Nov 14 local file, so a
  few `must` patterns may be a little older than live (tr1 is one).

## What was wrong (live build), ranked by what a crew would feel
1. **Outside California, Ask usually did not get the state's own rule on the first search.** The state was never in the search
   or the prompt, only used to throw chunks away. Example: `node tools/evalret.mjs q "How long is my 811 ticket good for?" TX`
   → before: one general chunk, the other five thrown away; after: the Texas chunk (14 working days) plus five general ones.
2. **A person with no company jobs had no state at all.** The state came only from the address of the company job picked in the
   app, else "the state most of the company's jobs are in" (`ask.ts:302-306`). A solo user, or a company with no addresses, got
   no filtering and no state: every state's chunks mixed, California-heavy.
3. **The filter read the source line and the first 300 characters** (`ask.ts:529`), so a general chunk that cites one state's
   manual vanished in the other 49. The Nov 20 edits un-hid 25 of them by shortening their source lines; about 135 more were
   still hidden on a typical job (`node tools/juris.mjs`: TX 165 come back, CA 135, WA 173).
4. **West Virginia chunks passed on Virginia jobs** (the name test matched "Virginia" inside "West Virginia"), and DC was not a
   place at all (no filtering on a DC job).
5. **The model's second search was not state-filtered** (`tools.ts:779`): it could pull any state's chunk.

## What I built (staged, tested)
**Server** — `src_patch/state.ts` (new) + `src_patch/apply_patch.py` (exact-once patch of ask.ts, tools.ts, retrieval.ts, one
line of index.ts). Diff to read: `src_patch/ask_state.diff` (198 lines). Patched files: `src_patch/patched/`.
- **Which state** (first hit wins): a state the question names (or an 811 center that belongs to one state: MISS DIG, DigAlert…)
  → the state the app sends for the open job → the job's state on the server (picked for the job, else its address, ZIP codes
  and full names understood) → a state named in the last 3 questions → the company's state → the last job on the phone / the
  state the person told Ask → where most company jobs are. The server reads the picked and company states itself
  (`pb_state_rules_get`, live since r17.06), so **it works with today's app before any app release**.
- **Chunk jurisdiction**: explicit `state` field if the chunk has one ("TX", "KS,MO", "US" = general), else its id
  (`dig-tx`, `st-wa`, `emp-state-va-2`, `plan-mi-…`, `ca-…`), else a topic that names one or two states, else a title that
  *starts* with a state. Never the source or the text. A title that only mentions a state as an example
  ("21A base (Virginia VDOT)") stays general. Result: 481 of the 2,840 chunks belong to a state, 2,359 are general.
- **First search**: general excerpts are exactly what the plain search gives once other states' chunks are out; the job state's
  own chunks for the question (at most 2) are **added**, so nothing general is pushed out.
- **Prompt**: one `JOB STATE:` line. For most questions it says "use it only if the answer changes by state, otherwise do not
  mention it". For state-dependent ones: lead with the state's rule, federal beside it, never another state's number, and if
  the library has nothing for the state say so and name who to check with. For the 21 state-plan states it tells the model to
  search once more with the state's name. **No state known**: asks one short question ("Which state is the job in?") only when
  the answer changes by state; never for plain questions or emergencies; and no single state's chunks are handed over.
- The reply and the log line now carry the state used (`state`, `state_how`, `state_own`, `state_asked`).
- The old `otherStateOnly` is left in place, unused, so the old tests still run.

**App** — `app/ask_state_app.py` (3 exact-once spots, for the r17.11 source `/tmp/claude-0/r1711/src.html`). The request now
carries `ctx.state` + `ctx.state_how`: the open job's state (Change State on Locates / company pick / address), else the
company's, else the newest run on the phone whose job has a state, else the state the person gave when Ask asked. The app's
own "California when nothing says" fallback is **not** sent. When Ask asks "Which state?" and the person answers, the phone
keeps it, so it asks once, not every conversation.

**KB** — `sql/01_ask_kb_state_fix.sql` (generated by `sql/gen_kb_fix.py`, guarded, **apply only after the new build is live**):
- the proper fix for the safety entries: the **23 shortened source lines go back to the full citation** (Florida DOH Stop the
  Bleed card, Iowa One Call manual, "as adopted in WAC 296-155", California Gov. Code). With the new filter they no longer hide anything;
- `state = CA` on the two Greenbook trench-repair chunks (rsf-1, rsf-2) whose topic and title don't say California;
- content found by Tommy's rule (below): Arkansas / Louisiana / Montana 811 chunk titles; "Blue Stake" for Arizona and Utah.

**Eval cases** — `sql/02_ask_eval_cases_state.sql`: 10 cases sa1-sa10 (no state → asks; no state + plain question → does not
ask; math on a Texas job → no "Texas"; West Virginia vs Virginia; MISS DIG asked from Ohio; Kentucky trench).

## Tests run
| What | Result |
|---|---|
| Deno, patched source: `tests/state_test.ts` (11 new) + the 25 existing Ask tests | 36 passed, 0 failed |
| App rig (Playwright, one browser): `tests/t_ask_state_app.js` | 9 of 9 PASS |
| Existing Ask rig test `bughunt_nov17/office/a1_ask.js` on the patched page | same output as before, no page errors |
| Bundle of the patched source builds (esbuild, same flags as release.sh) | 299 KB (live 289 KB) |
| Retrieval eval, 127 cases at their own location | below |
| Strict check, 127 cases × 52 locations | below |

Not run: the live-model eval (costs money, needs the build on ai-next). Command and cost are in `DEPLOY_PLAN.md`
(about $0.75 for the 36 state cases, about $4 for the full set).

## Before / after (retrieval only: are the case's `must` facts in the first excerpts?)
`tools/run_retrieval.sh` (10 s). Before = live build. After = staged build. This does not judge the written answer, and it
leaves out the quick "intent" step that adds search words in production, so absolute numbers run low; the comparison holds.

**Each case at its own eval location (127 cases):** every fact found: **94 → 112** (live KB) → **113** with the KB fix. Worse: 0.
The table is live build + live KB → staged build + KB fix.

| Location | Cases | Before → after | | Location | Cases | Before → after |
|---|---|---|---|---|---|---|
| CA | 95 | 79 → 84 | | TX | 7 | 5 → 7 |
| WA | 5 | 2 → 5 | | OR | 3 | 1 → 3 |
| FL | 2 | 0 → 2 | | CO | 2 | 1 → 2 |
| MI | 2 | 1 → 2 | | MN | 1 | 0 → 1 |
| AZ | 2 | 0 → 1 (with KB fix) | | AR | 1 | 0 → 1 |
| NV 2, TN 1, ID 1 | | unchanged, all found | | OH 2, GA 1 | | unchanged 1 of 2, 0 of 1 (see "not location") |

**Every case asked in every state** (Tommy's rule: is any location worse?). Full table: `work/perstate.txt` (`node tools/perstate.mjs`, 3 min).

| Job in | Every fact found, before → after (of 127) |
|---|---|
| California | 94 → 103 |
| Washington | 86 → 104 |
| CO, MI, NV | 85-87 → 101 |
| CT FL GA ME MA NH TX HI NC VT UT OR | 84-88 → 100 |
| AR IL KS LA MO NJ ND OH PA AL AK IA MD VA WY AZ | 84-86 → 99 |
| DE ID MS MT NE NY OK RI SD WV WI IN KY MN NM SC TN | 84-85 → 98 |
| DC | 98 → 98 (the old build did not filter DC at all) |
| No state known | 98 → 97 (by design: no single state's numbers; Ask asks) |

Strict check, 6,604 case × location pairs: **846 better, 8 worse**. All 8 are "no state known" or DC, on 4 questions that are
about one state's own rule (DigAlert / USA North ticket, Washington marks, blue stake, City of Wildomar). That is intended:
with no state Ask no longer hands over one state's numbers.

## Cases that did worse because of the location → why, and what was done
| Case | Where | Why | Fix |
|---|---|---|---|
| nw12 "How long is an 811 ticket good for?" | AR (also LA, MT) | Those three 811 chunks had a different title ("811 center and what to check"), so they ranked 65th | Title fixed in the KB SQL; also found without it now |
| nw5 "How long are the blue stake marks good for?" | AZ | "blue stake" matched survey stakes; the Arizona chunk never said Blue Stake | KB SQL adds it for Arizona and Utah (source: queencreekaz.gov "Arizona 811 (Formerly Arizona Blue Stake)") |
| brk2 "12 hours today, what breaks" | TX | The Texas chunk says "no state break law", shares few words with the question | State's own chunk is now added when its title is about the same subject |
| nw14 / nw17 trench depth, written plan | WA | Six places all federal text (weighted up for rule questions) | Washington's own chunk is judged against the best plain-language hit, not the federal text |
| nw19 "which confined space rule in Washington" | WA | found before, lost in my first version (too long to fit after five federal chunks) | State chunks get their place first; fixed before staging |
| tr1, tr10, sw3, lo7 (general questions) | every state but CA | Not a state problem: the plain first search is weak for these everywhere (federal appendix tables or app fitting tables take all six places). California only looks better because it has 95 chunks of its own that now get added | General library has the answers (trench-safety-3, test-2, lt-1). Optional switch staged, off: `AI_ASK_PLAIN_MIN=2` adds the best plain-language chunks (113 → 114; fixes tr10 and tr1, not sw3 / lo7). Needs the live eval to judge. |
| tc3, tc4 (taper length), nw22 (soil from photo) | AZ, OH, GA | Not location: the answer is worked out from a formula / the wording misses the chunk in every state | none |

## Content still missing, by state (what Tommy's rule points at next)
- **State OSHA plan rules.** Own-rule chunks exist for California (deep), Michigan trench, Oregon and Washington confined space.
  - Trench: **Washington has no chunk of its own** (4 ft is only inside its 811 and spec cards). Unread: AK HI IN IA KY MD MN NC SC TN VT VA WY.
  - Confined space: the app's own permit table says every plan but Oregon and Washington adopted the federal rule; the library
    has no one-line chunk saying so for the other 18 plan states, so the model can only say "the library has nothing for <state>".
  - Lockout, silica, fall protection, traffic control by state: nothing. Fall protection has no federal text either.
- **811 numbers not confirmed** (same gaps as the app's table; text scan of the 51 chunks): wait AR GA LA MS MT ND PA VA;
  ticket life AR LA MT NY OH PA SD WV WI; tolerance zone AL AR CT HI IL IN KS KY LA MO MT NJ ND OK TN VA WV.
- **Spec books in depth**: only CA, WA, OR, UT, IA, AZ (MAG), NV (Clark County), Kansas City metro. Every other state has one card naming its books.
- **Breaks**: 20 states have a dedicated chunk; the other 31 have the line inside their employment chunk (found now, e.g. Texas).
- **DC** has no spec card (`st-dc`).
- California has 95 state chunks; a typical state has 7. That gap is the size of the remaining work.

## Not done / limits
- The written answers were not tested (no model calls). The `JOB STATE` wording is the main risk; the 10 `sa` cases are there to catch it.
- `loc-6` and `loc-10` (811 marks, written from Southern California experience) are left general: they label what is California.
- The model's web search is not state-aware beyond the prompt line.
- Greenbook chunks stay California-only (as the existing v28 test expects).
- No "Texas rules" label on the answer yet (the reply carries the state; the app does not show it).

## Decisions for Tommy (5)
1. **Ship the server change?** Recommend yes, after the lead runs the eval on ai-next (about $4.75 total). It needs no app release.
2. **When nothing says which state: ask once and remember (built), or ask for the state at sign-up?** Recommend both: ship what
   is built now, and add one "State" pick to company / solo setup later so Ask never has to ask.
3. **Show the state on the answer** ("Answered for Texas")? Recommend yes: it lets a crew catch a wrong state at a glance. Small app change, not built.
4. **What content next?** Recommend: a Washington trench chunk and a one-line "adopts the federal rule" chunk for each plan
   state that does (trench and confined space), then the 13 unread plans, then the unconfirmed 811 numbers together with the app's table.
5. **Plain-language chunks beside federal text** (`AI_ASK_PLAIN_MIN=2`, changes about 1 question in 4)? Recommend trying it on ai-next with the full eval, separately from this release.

## How to run
- `tools/run_retrieval.sh` — the retrieval eval (before / after / every location).
- `node tools/evalret.mjs q "<question>" TX` — what the first search hands the model, before and after.
- `node tools/juris.mjs` (`LIST=TX`, `BACK=TX`) — which chunks change between the old and new filter.
- Deno tests: see `DEPLOY_PLAN.md` step 1. App test: step 3.

## DONE
