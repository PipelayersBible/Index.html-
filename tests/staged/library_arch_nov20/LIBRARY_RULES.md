# Ask library rules (library_arch_nov20, Nov 20 2026)

For every helper adding content to Ask's library, and for the lead who loads it. Nothing here is applied to the server.
Everything is staged in `tests/staged/library_arch_nov20/`.

## 0. Content helpers: the short version

1. Write chunks with `lib_kb.py` (this folder). It checks every rule below and refuses to write a batch that breaks one.
   ```python
   import sys; sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
   from lib_kb import Batch
   B = Batch('tc_tx', collection='tc')
   B.add(id='tc-tx-flagger-1', state='TX', tier='core',
         title='Texas flagger rules: training and what the flagger uses',
         topic='Traffic control: flaggers',
         text='Texas uses its own manual, the Texas MUTCD (TMUTCD), on public roads. ...',
         source='Texas MUTCD 2011 Revision 2, Section 6E.01', url='https://...', checked='2026-11-20',
         edition='2011 Revision 2', confidence='high', kind='summary', license='gov-state')
   B.write()
   ```
   You get `tc_tx.jsonl` (the source of truth), `tc_tx_report.txt`, and SQL in `sql/` that nobody runs but the lead.
2. Every chunk has a `state` ("US" for federal or nationwide) and a `tier` ("core" = short answer card, "shelf" = the detail).
3. A state's name appears only in that state's own chunks. A US chunk names no state in its title, source or first 300 characters.
4. Official sources only. Every number has a citation. Nothing invented. What you could not confirm says "not confirmed" in the text.
5. Government law and regulation text may be quoted. Anything copyrighted (811 center handbooks, Greenbook, AWWA, ASTM,
   AASHTO, manufacturer guides) is our own short summary with a citation; quotes of 40 words at most.
6. Write 2 eval cases for every 10 chunks (section 5), checked with `python3 lib_kb.py cases cases.jsonl chunks.jsonl`.

Checks: `python3 lib_kb.py selftest`, `python3 lib_kb.py check file.jsonl [local_kb_copy.json]`.

---

## 1. Capacity: how search works today, where it breaks, what to change

### How it works now (read from the live code and server, Nov 20)
- The whole library is loaded into the memory of each Ask worker and searched there (`ask_v24/src/kb.ts`, `_shared/retrieval.ts`):
  a keyword search (BM25) with the app's own word list, synonyms and boosts. No database search, no embeddings.
- On a cold start a worker asks the server for a saved copy of the search index (`pb_ai_kb_boot`). If there is none it reads
  all rows 500 at a time, builds the index, and saves it for the next worker.
- Live today: 2,840 chunks (app 238, field 2,324, OSHA text 278), about 3.4 MB of text. Server logs today:
  cold start **1.8 s** when it has to build, **0.64 s** from the saved copy. The saved copy is 1.9 MB in 2 parts.
- Supabase limits for an edge function (docs, https://supabase.com/docs/guides/functions/limits): **256 MB memory,
  2 s of CPU per request**, 400 s wall clock on paid plans.

### Where it breaks (measured, `node --max-old-space-size=256 tools/bench.mjs <factor> build|blob`)
The live library was copied N times and run through the live build's own code with memory capped at 256 MB. The test box was
busy, so times are rough (within about 30%); the limits are exact because they are in the code.

| Size | Chunks | Build (first cold start) | Later cold starts | Memory in use | Saved index | Search per question | Words that stop counting |
|---|---|---|---|---|---|---|---|
| today | 2,840 | 0.9 s | 0.1 s | 30 MB | 2 parts | 5-15 ms | none |
| 2x | 5,680 | 1.6 s | 0.35 s | 50 MB | 4 parts | 11-15 ms | none |
| 3x | 8,520 | 2.5 s | 0.3 s | 70 MB | 6 parts | 18-20 ms | none |
| 5x | 14,200 | 3.8 s + 1.8 s to save | 0.4 s | 100 MB | 10 parts | 26-31 ms | 3 ("water") |
| 10x | 28,400 | 7.4 s + 3.3 s | 0.9 s | 166-194 MB | 20 parts | 39-50 ms | 36 ("trench", "water") |
| 15x | 42,600 | 9.8 s + 5.4 s | saved copy refused | 222 MB | 30 parts | 70 ms | 100 ("osha", "cover", "main") |
| 20x | 56,800 | 14.4 s + 7.9 s | cannot be saved | 231 MB | 39 parts (limit 32) | 170 ms | 169 ("ticket", "minimum", "break") |
| 30x | 85,200 | out of memory | - | over 256 MB | - | - | - |

What stops it, in the order you hit them:
1. **CPU time, from about 2x to 3x.** Building the index is pure CPU. At 3x it is about 2.5 s on the test box against a 2 s
   limit, and the build happens again after every library change. I could not test what Supabase does when a worker goes
   past the limit (read-only), so treat 2x as the safe line.
2. **Answer quality, from about 5x.** The scorer gives a word zero weight once more than 4,000 chunks in one library contain
   it (`retrieval.ts:252`, `IDF_REF = 4000`). At 5x "water" stops counting; at 10x "trench" does. Before a word dies its
   weight shrinks, so ranking drifts well before 5x.
3. **The saved index, at about 10x.** The code refuses a saved index over 48 MB unpacked (`kb_codec.ts`, `KB_MAX_JSON`) and
   the server refuses more than 32 parts (`pb_ai_kb_index_put`). Past that every cold start is a full build of 10 s or more.
4. **Memory, between 20x and 30x.** The worker dies.

A second thing to know: more chunks about the same subject (51 states' versions of one rule) crowd each other out of the six
places the first search hands the model. That is a ranking problem, not a size problem, and it is why the state has to be a
filter on the search, not a word in it (already done in the staged build `ask_state_nov20`).

### How big is what Tommy asked for (my estimate, not measured)
| Collection | Rough chunks |
|---|---|
| 811 handbooks and one-call laws, 51 | 1,000-1,500 |
| Federal OSHA construction rules in full (29 CFR 1926, parts of 1910) | 2,000-3,000 |
| State safety programs (the state OSHA plans that cover private crews, the public-sector-only plans, state-only laws; list at osha.gov/stateplans) | 2,000-3,000 |
| MUTCD Part 6 and what it leans on, plus 51 state manuals or supplements | 2,000-2,500 |
| State DOT spec books (earthwork, pipe, structures, traffic), 51, plus big local agencies | 4,000-6,000 |
| Everything else (stormwater permits, pipeline safety, CDL / hours, standards and maker guides as summaries) | 1,500-2,500 |
| **Total new** | **about 13,000-18,000 (5x to 7x today). With every rule in full text: 30x.** |

So the library Tommy asked for does not fit the way search works now. It needs a change before the bulk is loaded.

### Recommended design: a small core in the worker, the deep shelf in Postgres
- **Core (what every worker loads, as today): at most 6,000 chunks.** Today's 2,840 plus short "answer cards": the handful of
  numbers a crew actually asks for, per state and per federal topic. Same search code, same ranking, so the existing eval cases keep
  meaning what they mean. Budget (enforced by `lib_kb.py`): 40 core chunks per state across all collections
  (811: 6, state safety: 10, traffic: 8, specs: 10, permits / licensing / right-of-way: 2 each) = 2,040, plus 1,000 federal
  (OSHA 500, MUTCD 200, other federal 150, standards 100, makers 50). Total 5,880.
- **Shelf (everything else): a table in Postgres with a full-text index, searched on the server.** Regulation text, MUTCD text,
  state supplements, spec book sections, handbook detail. No memory limit, no cold start, no rebuild. This is the same
  method the app already uses for company documents (`public.pb_docs_search`: `tsvector`, the same synonym word groups,
  a state boost), so it is a known quantity here, not a new technology.
  - Staged: `sql/PROPOSED_kb_shelf.sql` (table `pb_ai.kb_shelf`, index, `pb_ai_kb_shelf_search(terms, state, k, collections)`).
    A state's chunks come back only for that state; "US" chunks always. At most 2 per title.
  - Tested on a local Postgres 16 (`tools/pgtest.sh`): 15,000 rows (the size Tommy asked for) **30-160 ms** a search;
    85,000 rows (30x) **0.2-1.0 s**, 224 MB on disk. An Ask answer takes about 6 s, so this is not felt. If 30x is ever
    reached, the first tuning step is to rank only the rows that match the rarest words (noted in the SQL file).
  - Ask uses it in two places (code change, **not built**): (a) the model's own second search (`search_knowledge`,
    `tools.ts:779`) also calls the shelf and merges; (b) the first search calls the shelf at the same time as the in-worker
    search and adds the best 2 shelf hits for the job's state when they score well. One extra database call a question.
- **Not recommended now: embeddings (pgvector).** The extension is available on the project (0.8.2, not installed), but it
  needs an embedding service from another vendor, a key, and a call on every question, and it makes results harder to
  explain. Come back to it only if the eval shows misses that are about wording ("how close can I dig" vs "tolerance
  zone") and that the synonym list cannot fix.
- **Not recommended: one index per state loaded on demand.** It keeps everything in the worker's memory model, needs 52
  saved indexes kept in step, and does nothing for the federal full text, which is the biggest single block.
- **Small fix for the core (code, not built):** make the 4,000 in `retrieval.ts:252` "4,000 or the library's size, whichever
  is larger". Nothing changes below 4,000 chunks per library; above it, common words keep a small weight instead of zero.
  Needs the eval before it ships.

### Migration plan (staged, not applied)
| Step | What | Risk to live Ask |
|---|---|---|
| 0 | Helpers write chunks with `tier` set. The `.jsonl` files are the source; SQL is regenerated from them at any time. | none |
| 1 | Ship the staged state-aware build (`ask_state_nov20`) first. Without it the live build hides general chunks by reading state names in the text. | already planned |
| 2 | Load **core** batches (`sql/<name>_core_NN.sql`) in small groups, free retrieval check after each, until about 6,000. | cold start grows to about 2 s build / 0.4 s saved |
| 3 | Run `sql/PROPOSED_kb_shelf.sql`, then load **shelf** batches (`sql/<name>_shelf_NN.sql`). | none: the live build never reads this table |
| 4 | Build the Ask change that searches the shelf (about 40 lines in `tools.ts` and `ask.ts`), on `ai-next` only. Eval rounds (section 5). | none until promoted |
| 5 | Promote when the stop rule in section 5 is met. | - |
| later | If the shelf search proves as good as the in-worker one, move the core there too and drop the in-worker index. | separate decision |

Until step 4 is live, shelf chunks are stored but Ask cannot see them. That is the honest state: loading 15,000 chunks
improves nothing until the search change ships, and loading them into the core instead would break Ask.

### Loading rules that come from how the server works
- **Rows are never deleted** from `pb_ai.kb_chunks`. The loader reads rows by position (`ord` 0, 500, 1000, ...) and stops
  if the count is off, so a gap breaks every cold start. A replaced chunk is updated in place (`supersedes`).
- Each SQL file is one transaction, under 0.9 MB, and safe to run twice. It fixes the row count in `kb_versions` and drops
  the saved index (it deletes the `kb_index` rows; the old "set parts = 32" trick stops working once a real index has 32 parts).
- Warm workers keep the old library until they restart; a change reaches answers as workers cold-start.

---

## 2. Chunk format

One chunk = one fact family a crew would ask about, in plain sentences. `lib_kb.py` enforces everything in this table.

| Field | Rule |
|---|---|
| `id` | Collection prefix + scope + topic + number, lower case. Table below. At most 80 characters. Never reuse or renumber an id. |
| `state` | Required. `"US"` = federal or true everywhere. Else the two-letter code (`"TX"`, `"DC"`), or up to four joined by commas for one document that covers them (`"KS,MO"`). |
| `tier` | `"core"` = a short answer card every worker loads (at most 1,200 characters, inside the budget in section 1). `"shelf"` = the detail. When unsure: shelf. |
| `title` | At most 120 characters. Says what this chunk answers, in the words a crew would type. **A state chunk's title starts with the state's full name** ("Texas flagger rules: ..."). A US chunk's title names no state. No more than 2 chunks with the same title (Ask shows at most 2 per title). |
| `topic` | At most 100 characters. The same for every state's version of a subject, so it names no state ("Traffic control: flaggers"). Not "first aid" (reserved). |
| `text` | 200 to 1,800 characters; aim for 500 to 1,200 (Ask cuts a chunk at 1,800 when it hands it to the model, and the first search has room for about 9,000 characters in all). A state chunk names its state in the first sentence. Plain sentences: no tables, no HTML, no curly quotes. Units on every number. |
| `source` | The citation a foreman could look up: document, edition, section / table / page. At most 300 characters. |
| `url` | One `https://` link to the page or PDF you actually read. |
| `checked` | The date you read it, `YYYY-MM-DD`. |
| `edition` / `effective` | At least one. Edition as printed ("11th Edition, December 2023", "2024 Standard Specifications"); effective date as `YYYY-MM-DD` if the source gives one. |
| `confidence` | `high` = read in the law, rule or official manual itself and cited by section. `medium` = an official page that restates it (agency FAQ, 811 center page), or an official document without a section cite. `low` = could not confirm in an official source; the text must say "not confirmed" and what to check. (Ask ranks `low` down by 20%.) |
| `kind` | `verbatim` = the official words, copied exactly. `summary` = our words. |
| `license` | `gov-us`, `gov-state`, `gov-local`, or `summary` (our own words about a copyrighted work). Section 3. |
| `supersedes` | Optional: ONE existing chunk id this replaces. The old row is replaced in place. |
| `unconfirmed` | Optional, `"yes"`: something in this chunk is not confirmed. Then confidence is not `high` and the text says what. |
| `note` | Optional: a note for the lead. Not shown to Ask. |

No other fields. (`roles` is for app how-to chunks only.)

### Collections and id patterns
| Prefix | Pattern | Scope | What goes in |
|---|---|---|---|
| `dig-` | `dig-<st>-<topic>-<n>` | state | One-call law and the 811 center's excavator handbook: positive response, marks, tolerance zone, damage steps, penalties. (`dig-<st>` with no suffix is the existing one-card-per-state set, built from the app's own table. Do not reuse those ids.) |
| `osha-` | `osha-1926.501(b)(1)-a` (rule text), `osha-pl-<topic>-<n>` (plain language), `osha-loi-<topic>-<n>` (interpretation letters, directives) | US | Federal OSHA. Only exact 29 CFR text with `kind: verbatim` goes into the server's "OSHA" library, which the model is told it may quote. |
| `sp-` | `sp-<st>-<topic>-<n>` | state | State safety program: state OSHA plan rules that differ from federal, the plain statement "adopts the federal rule" where that is so (with the adopting section), public-sector plans, state-only safety laws. |
| `mutcd-` | `mutcd-<part or chapter>-<topic>-<n>` (`mutcd-6c-taper-1`) | US | Federal MUTCD. |
| `tc-` | `tc-<st>-<topic>-<n>` | state | State MUTCD or supplement, DOT work-zone standards, flagger training rules. |
| `spec-` | `spec-<st>-<agency>-<topic>-<n>` (`spec-tx-dot-bedding-1`) | state | State DOT standard specifications and big local standard specs. |
| `fed-` | `fed-<agency>-<topic>-<n>` | US | Other federal: EPA construction stormwater permit, PHMSA pipeline rules, FMCSA (CDL, hours), FHWA, DOL. |
| `env-`, `lic-`, `row-` | `<prefix>-<st>-<topic>-<n>` | state | State stormwater / dewatering permits; contractor licensing and operator certification; DOT right-of-way and utility permits. |
| `std-` | `std-<org>-<topic>-<n>` | US | Consensus standards (AWWA, ASTM, ASCE, AASHTO, CGA Best Practices, NASSCO, Ten States). **Summary only.** |
| `mfr-` | `mfr-<maker>-<topic>-<n>` | US | Manufacturer and trade association guides. **Summary only.** |

Checked against the live library: no existing id matches any of these patterns. Existing prefixes (`plan-`, `st-`, `emp-`,
`brk-`, `ca-`, `traffic-control-`, `tc-1`, `tc-2`, ...) stay as they are.

### The state rule, and why it is strict
The live Ask build decides "this chunk is another state's" by reading state names (and "WAC", "OAR", "TAC", "F.A.C.",
"NYCRR") in the title, the source line and the first 300 characters. That has hidden general chunks before (bleeding first
aid outside Florida; the trench quick reference in 48 states). The staged build reads the `state` field instead. Chunks must
be right under both:
- State chunk: title starts with the state's name; no other state named in title, source or first 300 characters.
- US chunk: no state named in title, source or first 300 characters. Write "FHWA", not "FHWA, Washington, DC".
- Comparing states ("unlike California...") belongs in neither. Each state's chunk states its own rule and the federal one.

### What makes a good chunk
- Lead with the answer: the state, the number with its unit, and the section it comes from, in the first sentence. Then the conditions.
- Self-contained. The model may see only this chunk. No "see above", no "as noted".
- Use the words crews use next to the official ones ("blue stake", "locates", "trench box / shield").
- One state, one subject, one edition per chunk. Split long sections at natural breaks, and give each piece its own title.
- Where a state simply adopts the federal rule, say exactly that in one core chunk with the adopting section. That one line
  is what lets Ask answer "same as federal in <state>" instead of "the library has nothing".

---

## 3. Copyright and licensing

I am not a lawyer. This is the working rule; the open points are in section 6.

| Source | May we store the words? | How to write it |
|---|---|---|
| Federal law, regulations and federal agency publications (29 CFR, OSHA letters and directives, MUTCD, EPA, PHMSA, FMCSA) | Yes. Works of the US government have no copyright (17 U.S.C. 105). | `verbatim` or `summary`, `license: gov-us`. Quote exactly; never "tidy" a rule. |
| State statutes and administrative code (one-call laws, state OSHA rules, state traffic rules adopted as regulation) | Yes. Text with the force of law is not copyrightable (government edicts doctrine; *Georgia v. Public.Resource.Org*, 2020). | `verbatim` or `summary`, `license: gov-state`. Link the state's own site where it has one. |
| State and local agency publications that are not themselves law: DOT standard specifications, state MUTCD supplements, agency manuals, state OSHA guidance, city standard specs | **Treat as possibly copyrighted.** States and cities can own copyright; section 105 covers only federal works. | `summary` with the citation, plus the exact sentence of a requirement where the wording matters (short quotes). Never whole sections or whole tables. `license: gov-state` / `gov-local`. |
| 811 center excavator handbooks (most centers are private nonprofits) | **No bulk text.** | `summary`, `license: summary`. Facts and numbers with the page; quotes of 40 words at most. Where the handbook restates the statute, cite and quote the statute instead. |
| Greenbook, AWWA, ASTM, AASHTO, ASCE, NASSCO, CGA Best Practices, Ten States Standards | **No.** Sold or licensed works. | `std-`, `summary` only. The specific value needed, the standard and section it comes from, and "read the current edition". Never a table copied out. |
| Manufacturer and trade association guides | **No bulk text.** | `mfr-`, `summary` only. |
| Standards "incorporated by reference" into a regulation | Still the publisher's. A court allowed a nonprofit to post them (*ASTM v. Public.Resource.Org*, D.C. Cir. 2023) as fair use; that reasoning leaned on non-commercial use, and this is a paid app. | Quote the regulation that adopts it; summarize the standard. |

Rules for every `summary`:
- Our own sentences. Facts (a depth, a distance, a number of days) are free to state; the publisher's wording and layout are not.
- At most 40 words per quote, and quotes are under a quarter of the chunk (`lib_kb.py` checks both).
- Always the citation, so the crew can open the real document. Ask's answer should send people to it for anything contractual.
- Never paste a full table from a copyrighted work. Give the rows a crew needs.
- Do not paste PDF text from a copyrighted source into any working file in the repo either.

---

## 4. Quality rules

1. **Primary, official sources only**: the law or rule itself, the agency's own manual, the 811 center's own handbook, the
   standard's publisher, the manufacturer. Law-firm blogs, vendor summaries, training companies, forums and AI answers may
   point you to the source; they are never the source.
2. **Every number is cited** to a section, table or page, and carries its unit. A number you cannot cite does not go in.
3. **Nothing invented, nothing "typical"** passed off as a rule. If the official text was an image, behind a paywall, or
   unclear, say so in the chunk ("Table 1 values not confirmed; read Part 9, Table 1") and set `confidence: low`.
4. **Unconfirmed is marked three ways**: the words "not confirmed" in the text, `unconfirmed: "yes"`, and confidence
   `medium` or `low`. A chunk that is only a placeholder still tells the crew who to ask (agency name, phone or page).
5. **Safety numbers get read twice.** Anything that sets a depth, distance, gas limit, speed, taper or sign spacing: open the
   source a second time and compare digit by digit before `B.write()`.
6. **State what the rule is, not what to decide.** Ask never makes the go / no-go call; chunks should not either.
7. **Editions.** `edition` or `effective` on every chunk. When a new edition is out but not yet adopted (many states are
   still moving to the MUTCD 11th Edition), write what is in force in that state today and name the coming one with its date.
8. **Conflicts.**
   - Federal vs state: both stay, each in its own chunk. The state chunk says which governs on a job in that state.
   - Two official sources disagree (handbook says 2 days, statute says 48 hours): the law wins; the chunk gives the law's
     number, notes the other in one clause, and is `medium`.
   - New chunk vs existing chunk: do not write a second chunk that says something different. Use `supersedes` on the new one,
     or leave a `note` for the lead. `python3 lib_kb.py check file.jsonl <local kb copy>` catches id clashes, not meaning clashes,
     so search the local copy (`tests/staged/ask_state_nov20/work/kb_live2.json`) for your subject before writing.
   - The app's own state table (`tests/r1706/staterules/data/state_rules.json`) feeds the Rules screen and the `dig-<st>`
     cards. If your source disagrees with it, do not quietly differ: report it to the lead so the app and Ask change together.
9. **Updates.** Every chunk carries `checked`. Laws and manuals are re-read once a year (the app table's date is
   2027-11-19) and when an eval or a crew report says something changed. An update is a `supersedes` batch.
10. **Report honestly.** Each batch report lists what was covered, what could not be confirmed, and what was not looked at.

---

## 5. Eval plan

### What exists
- Server: `pb_ai.eval_set` (160 active cases today), `eval_start('ai-next', label, ids)`, `eval_collect`, `eval_score`. A case passes
  when every `must` regex is in the answer, no `mustnot` regex is, and the answer is within `maxwords`.
- Cost, from the server's own records: **$0.021 a text question** on the last full run (Nov 16, 74 text cases, 6.2 s each);
  **$0.031 average** over 14,724 results on `ai-next` in the last 10 days (photo and stake cases cost more). Plan on $0.025.
- Free: the retrieval-only check. For library cases: `node tools/retr_cases.mjs cases.jsonl batch.jsonl ...` (this folder;
  built on `ask_state_nov20`'s state-aware search). It runs the build's own search over a local copy of the live library plus
  your core chunks and reports whether the chunk that holds the answer is in what the model would be handed for a job at
  the case's location. No model calls, seconds to run. Example: `examples/cases_example.jsonl` (2 of 2).

### Tommy's style rule (Nov 20), and where Ask is today
"The answers should be concise and direct. On complicated subjects, it can offer more info and then dive into more details."
- Lead with the direct answer in one or two sentences.
- On a complicated subject, end with one short offer ("Want the details on X?") and go deeper only when asked.

Today, measured on the last full run (Nov 16, 74 text answers): **average 130 words, median 123; 71 of 74 are over 80
words, 41 are over 120.** The prompt already says "most answers are 30 to 80 words, never more than 120"
(`prompts_v2.ts:81`), so the rule is not being followed, and the eval does not catch it because the cases allow 120 to 220
words. The prompt also forbids offers outright ("never offers"), which is the opposite of what Tommy now wants.

**Proposed prompt change** (staged, not applied): `sql/PROPOSED_prompt_concise_next.sql`, built and checked by
`tools/prompt_edit.mjs` (the old paragraph is found exactly once in the live prompt). It replaces the LENGTH paragraph on the
test function only (`teacher_v2@next`), so no build is needed to try it. Old text: `work/prompt_length_old.txt`. New text:

> LENGTH (every answer except an analysis or a takeoff): crews read this on a phone in the field. ANSWER FIRST: the first one
> or two sentences ARE the answer (the number with its unit, the yes or no, the step) and must make sense if the person reads
> nothing else. No lead-in, no restating the question, no rule citation before the answer. Then at most 3 short "- " lines,
> only what they need to act on (the number in the rule, the one exception that matters, who decides). Most answers are 25 to
> 60 words. Never more than 100 words, except: a procedure or "how do I" question gets numbered steps (at most 8 steps, at
> most 170 words), and a by-jurisdiction limits answer gets one line per jurisdiction. Cut background, history, "commonly
> cited", definitions they did not ask for, and anything said twice. A regulation quote is one short clause, after the
> answer, never before it. COMPLICATED SUBJECTS (the full answer has several cases, a table, steps that depend on their site,
> or more than one rule): do not try to fit it all in. Give the short direct answer for their case (or the most common case,
> saying which), then end with ONE short offer that names the deeper part, as a question of 12 words or fewer: "Want the
> details on <that specific part>?" Go deeper only when they say yes or ask; then give that part in full (up to 200 words)
> with no new offer unless there is another real layer. A simple question gets no offer. Never hold safety back behind an
> offer: a life-safety limit, a stop-work condition or a required step is always in the first answer. End with AT MOST ONE
> closing line: the offer, or one question you need answered, or the one "check with" / "libraries don't cover this" line the
> rules above call for; never two of them, and never a generic offer ("I can also...", "let me know if...", "anything
> else?") or a sign-off. On a safety answer the competent-person line stays as the last "- " line and the offer, if there is
> one, comes after it. A follow-up says only what is new or changed. Never give "example" numbers you made up.

What changed: 30-80 words became 25-60; the hard cap 120 became 100; the answer must stand alone in the first two sentences;
the quote goes after the answer; one named offer is allowed on complicated subjects and nowhere else; safety is never held
back. If wording alone does not bring the length down (it has not so far), the next step is a one-line reminder next to the
question itself (`ask.ts`, beside the `JOB STATE` line), which the model follows far more reliably than a rule 80 lines up
in a long prompt. That is a code change; not built.

**Proposed eval change** (staged, tested locally, not applied): `sql/PROPOSED_eval_style.sql` adds `lead` and `complex` to a
case and three checks to the grading. Old cases grade exactly as before.

### How a case is written (helpers)
One JSON object per line, checked by `python3 lib_kb.py cases cases.jsonl chunks.jsonl`:
```json
{"id": "lib-tx-dig-1", "cat": "locate", "q": "How long is my 811 ticket good for?", "where": "Houston, TX", "level": "pipelayer",
 "kind": "simple", "must": ["14 (working|business) days"], "lead": ["14 (working|business) days"], "mustnot": ["28 days"],
 "chunks": ["dig-tx-handbook-1"], "state_strict": true}
```
- `q`: how a crew would type it. Most questions do **not** name the state; the job's `where` supplies it.
- `must`: the facts a right answer contains (number with unit, section number). `lead`: the direct answer, which has to be in
  the first 40 words. `mustnot`: the wrong answers that matter, above all another state's number.
- `kind` sets the word limit: `simple` 70, `rule` 100, `complex` 110 (answer plus one offer; set `"complex": true`), `steps` 170.
- `chunks`: the ids that hold the answer. The free check uses them.
- `state_strict: true`: the loader (`tools/cases_sql.py`) adds a `mustnot` for every other state's name, so an answer that brings up another state fails.
- Two cases per ten chunks, and at least one per state per collection. A third of them on things the library marks "not
  confirmed": the right answer there says so and names who to ask.

### Scoring: one answer passes only if all four hold
1. **Facts**: every `must` is there, and the call returned normally.
2. **Right state**: no `mustnot` hit (another state's number or name); for a state question the state's own figure is the one given.
3. **Concise**: within the word limit for its kind.
4. **Direct**: every `lead` regex is in the first 40 words; a `complex` case ends with one offer of 12 words or fewer; any
   other case does not end with an offer.

Regexes cannot tell a well-put answer from a clumsy one, so each round the lead (or Tommy) also **reads 20 answers** picked
at random, 10 passes and 10 fails, and notes anything the checks missed. Five minutes; it keeps the checks honest.

### Step 1, free, before any paid round
Run every case through the retrieval-only check (`tools/retr_cases.mjs`) at its own location. A case whose `chunks` are not in the first search's
excerpts will fail the paid run too, for a reason that costs nothing to find: fix the title or topic words, add the missing
crew word, or mark it as needing the shelf search. Start paid rounds when at least 85% of core-tier cases pass the free
check. (Shelf-tier cases cannot pass until the shelf search is built; keep them out of rounds until then.)

### Step 2, the loop: rounds of about 100 on `ai-next` (about $2.50 each, approved by Tommy)
**How each round's 100 are picked** (`eval_start('ai-next', 'lib round N', array[...])`; the picker script is not built yet,
the lead picks by this table from the case files and the last round's `eval_score(run)->'fails'`):

| Share | Which | Why |
|---|---|---|
| 35 | Last round's failures, re-asked after the fix. If there are more than 35, safety first, then 811, traffic, specs. If fewer, the rest go to fresh. Round 1 has none: use the cases that were weakest in the free check. | Proves each fix |
| 45 | Fresh cases never asked before. Spread by topic: 811 9, state safety 9, federal OSHA 7, traffic 9, specs 7, other 4. Spread by state: no state more than 3 a round, every state and DC at least once every two rounds, and states that failed more (free check and earlier rounds) drawn up to twice as often. About 7 with no state in the question and the job in a small state; 2 where the question names a different state than the job. | The honest number: Ask has never seen these |
| 15 | The same canaries every round: 10 from today's set (California trench and confined space, grade math, an app how-to, an emergency, a refusal) and 5 new-library safety cases. | Catches what a fix broke |
| 5 | Style probes: complicated subjects (sloping by soil type, taper tables, confined space roles) where the right shape is a short answer plus one offer. | Tommy's style rule |

**After each round**, sort every failure into one cause and fix that cause, not the single case:
- **Content**: the fact is missing or wrong in the library. Fix the chunk (`supersedes`), re-check the source.
- **Retrieval**: the chunk exists but was not handed to the model (the run log lists the excerpts). Fix title / topic words,
  add a synonym, or it is a ranking / state-filter bug for the code.
- **Prompt**: the facts were in front of the model and the answer was still wrong, long, buried, or for the wrong state.
- **Case**: the case itself was wrong (regex too narrow). Fix the case; do not count it either way.

Keep one table, one row per round: fresh pass rate, canaries, wrong-state count, median words, share within the word limit,
share answer-first, failures by cause, cost. That table is how "clearly and greatly improving" is shown, not argued.

### Stop rule: when to move to the one big run
All of these, **two rounds in a row**:
- Fresh cases: at least 41 of 45 pass (90%).
- Canaries: all safety canaries pass; at most 1 other canary fails.
- Wrong state: zero answers anywhere in the round give another state's number.
- Style: at least 95 of 100 within the word limit and answer-first; median 60 words or fewer; style probes 5 of 5.
- The 20 answers read by a person turn up no problem the checks missed.

And a brake: if the fresh pass rate rises less than 5 points over two rounds while it is under 90%, stop paying for rounds.
More rounds will not fix it; look at the cause table for the one thing that dominates (usually retrieval), fix that in
code or content, re-run the free check, then resume.

### Step 3, the big run (once)
Every active case once on `ai-next`: the existing 160 plus the whole new pool. At about 1,500 new cases that is about
1,700 questions, about **$45**. It is run in batches of 200 so a bad start can be stopped. Promote to live only if the big
run holds the stop-rule numbers and the existing cases are no worse than their last run.

### Budget
| | Cost |
|---|---|
| Free retrieval check, as often as wanted | $0 |
| Rounds: expect 6 to 10 at $2.50 | $15-25 |
| Big run, once | about $45 |
| Re-run of the big run's failures after fixes, once | about $5-10 |
| **Recommended cap** | **$100** |

Not checked: whether the eval runner can ask a follow-up in the same conversation (needed to test "they said yes, now go
deeper"). The offer itself is graded; the deeper answer is not, until that is looked at.

---

## 6. Needs Tommy or the lawyer

For the lawyer:
1. **State DOT spec books, state MUTCD supplements and agency manuals**: may the app quote them at length, or summaries with
   short quotes only? This file assumes summaries. A yes would make spec answers much more exact.
2. **811 center handbooks**: is asking the centers for permission worth it? (Many would likely say yes to a safety app; a
   short standard email to 50 centers is cheap.) Until then, summaries only.
3. **Standards the law adopts by reference** (ASTM, AWWA, the Greenbook where a city adopts it): confirm summary-only.
4. **Existing chunks**: the library already has Greenbook (`gb-`, `rsf-`), AWWA and Ten States material written before this
   policy. Someone should read those for long quotes. Not checked here.
5. **Wording Ask uses when it relies on a summary** ("this is a summary; the current edition governs").

For Tommy: the five decisions at the end of `NOTES.md`.
