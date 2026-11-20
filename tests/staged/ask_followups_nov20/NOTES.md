# Ask follow-ups (ask_followups_nov20, Nov 20 2026)

Read-only on the server (SELECTs and reading function code). Nothing applied, deployed, committed or pushed. All staged here.

**Scope was narrowed by the lead part-way:** from the KB list only the Washington trench chunks stay with me; the
"adopts federal" confined space chunks, the 13 unread state plans and the 811 numbers went to other helpers. What I had
already read for those (every state with its source link and quote) is in `raw_findings.md` under "HANDED OVER", so
nobody has to redo it. The app work (state under Ask answers, State pick at set-up, how the app knows the state) is all here.

## Findings, ranked by what a crew or company would feel

1. **The Trench Sloping screen offers a slope Washington does not allow.** Its soil list has "Type A, short-term
   (12 ft or less, 24 hrs or less): 0.5:1" (`src.html:34278`, federal Table B-1 note 2). Washington's Table N-1
   (WAC 296-155-66403) has no short-term note: the reader found "no short-term maximum allowable slope for Type A soil"
   in the current text. On a Washington job the app shows the steeper slope with no warning. Not fixed (trench protection
   wording is Tommy's call, decision 3); the new Ask chunk says so in words. (Read from the code and the rule text; not
   reproduced on a phone.)
2. **The app keeps two separate ideas of "which state", and they can disagree.** 811 dates, the Rules screen and Ask use
   the *job's* state (address / picks / company). The cave-in depth note on a run and under Trench Sloping uses only
   *where the phone is* (`pbHereState`, `src.html:23235`, `:71732`), and when the phone has no fresh location it says
   "This phone doesn't know which state it is in" even on a job whose address says Seattle, WA. Not changed (decision 4).
   (Read from the code: the note never looks at the job.)
3. **A person on the Individual plan had no way to tell the app their state.** The only setting is Settings > Company >
   811 rules state, which they do not have, and the server has nowhere to keep it (`pb_job_state_set` raises
   `not_company_account` / `not_company_member`). So Ask could only ask every new phone. Closed by the Home card (kept on the phone).
4. **A new company is never asked its state.** The setting exists but reads "Not set (California is used)" until someone
   finds it (`src.html:71759`). Closed by the Home card.
5. **Eval ids `wa1`-`wa5` are already used on live** (water questions). My cases are `fwa1`-`fwa5`; with the same ids
   the insert would have skipped silently (`on conflict do nothing`).

## How the app knows the state today (r17.11 source, line numbers in `/tmp/claude-0/r1711/src.html`)

Tommy asked: "The app can generally tell which state the person is in, right?" Mostly yes, for company jobs. Exactly:

| # | Source | Where it comes from | Used by | Kept |
|---|---|---|---|---|
| 1 | State picked for the job on this phone | Locates > Change State (`:71647`, `pbLocSrSet`) | 811 dates, Rules, Ask | phone, then the company server (foremen and office can save it) |
| 2 | State picked for the job by someone in the company | same pick, read back from the server (`pb_state_rules_get`) | same | server |
| 3 | The job's address | New Job "City, State" (prefilled from the company's last job, `:69685`) or the Locates job address; read by `pbSrParse` (`:70917`): "Reno, NV", "..., AZ 85004", "Boise, Idaho" | same | server (job) |
| 4 | The company's state | Settings > Company > 811 rules state (`:71753`); owner, PM, superintendent only | same, when 1-3 give nothing | server |
| 5 | Nothing | California is used for 811 dates (`:70948`, how = "default") | 811 dates only; Ask is never sent this | - |
| 6 | Where the phone is | the photo stamp's street address lookup on Run Setup / Run Results writes the state, good for 12 hours (`:75489`, `:75495`). Needs location permission and signal | ONLY the cave-in depth notes (`:23235`, `:71732`) | phone |
| 7 | Ask (staged ask_state patch) | 1-4, then the newest run on the phone whose job has a state, then the state the person typed when Ask asked | Ask | phone |

Order is first hit wins (`pbSrJob`, `:70939`). The server works the state out again by itself for Ask (job pick, job
address, company state, most company jobs), so Ask does not depend on the phone's copy.

**Gaps, and what closes them**

| Gap | Closed by |
|---|---|
| Company never asked its state | Home card, once (built) |
| Individual plan: no state anywhere | Home card, once, kept on the phone (built) |
| Job with no state in City, State | State field on New Job, only then (built) |
| Ask had to make the person type the state | State pick under that answer; one tap asks again (built) |
| Wrong state not visible | "Answered for Texas." under the answer, with Change (built) |
| Phone location not used by Ask | sent as a last resort before "told" (built; server add-on needed to use it) |
| Cave-in notes ignore the job's state | not changed, decision 4 |
| An Individual's state is lost on a new phone | not closed: needs one small server column; the card simply asks again |
| A crew member whose company has no state and no job open | Ask asks once and keeps it on that phone (ask_state patch); they are not asked on Home (the company account is) |

## What I built

### 1. Ask library: Washington trench (2 chunks, insert only)
`sql/kb_followups.py` generates everything; re-run it to regenerate.
- `plan-wa-trench-1` Washington trench rules: protective system unless all stable rock, or under 4 ft and the competent
  person finds no sign of a cave-in (WAC 296-155-657(1)(a)); written trench work plan since June 1, 2026 and when it is
  not needed; competent person stays on site; daily inspections; ladder at 4 ft / 25 ft, spoil 2 ft, air test over 4 ft,
  2 ft below a shield, engineer over 20 ft.
- `plan-wa-trench-2` Washington sloping, Table N-1: stable rock vertical, Type A 3/4:1, B 1:1, C 1 1/2:1, under 20 ft; **no
  short-term Type A slope**; tells the crew to pick plain Type A in the app's Trench Sloping screen on a Washington job.
- Sources, all the Code Reviser's current text, read Nov 20 (quotes in `raw_findings.md`):
  [296-155-657](https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-657.htm),
  [296-155-66403](https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-66403.htm),
  [296-155-655](https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-655.htm),
  [WSR 26-09-113](https://lawfilesext.leg.wa.gov/law/wsr/2026/09/26-09-113.htm).
  The federal short-term note (Table B-1 note 2) is quoted in the app's own Education page (`src.html:6945`).
- `sql/01_ask_kb_followups.sql`: insert only, at the next ord numbers of KB version `b3e91f6c47d2`; skipped if either id
  exists or the version is gone; row count and index reset as in the Nov 18-20 batches. Checked on live today
  (read-only): version current, n = rows = 2840, max ord 2839, both ids free.
- `sql/01_ask_kb_followups_test.sql`: same statements in a block that checks and rolls back. **Not run** (it writes inside a transaction).
- `sql/02_ask_eval_cases_followups.sql`: 5 cases `fwa1`-`fwa5` (depth, written plan, short-term slope, competent person
  on site, and the same slope question on a Texas job that must NOT get Washington's answer).

**Chunk format and id scheme (for the helpers adding the other states)** — also at the top of `kb_followups.py`:
`{"id","url","text","title","topic","source","confidence","state"}`.
- `id` = `plan-<st>-<subject>-<n>` (`plan-wa-trench-1`); 811 = `dig-<st>`. The ask_state build reads the state from the
  id AND from `state`; set both.
- `state` = two letters; `"KS,MO"` for two; `"US"` for a general chunk whose title names a state.
- Title starts with the state's name and names only that state; topic names no state.
- Text under 2,600 characters. Until the ask_state build is live, the title, the source line and the first 300
  characters must name no other state (the live build still filters on those). The generator asserts all of this.
- Insert only; edits to old chunks go in their own guarded file. Check eval ids against live first.

### 2. App (`app/ask_followups_app.py`, 11 exact-once spots, applies after `ask_state_app.py`)
- **"Answered for Texas."** under an Ask answer: 13 px grey line above the "AI answer" line. On the newest answer it has
  **Change**: a state list; the pick becomes the open job's state (same as Change State on Locates), else the
  company's / the person's own state, and the line reads "Answered for Texas. Next answers: Nevada." No question is
  re-sent. A crew member with no job open gets the line without Change. No line when the server sends no state
  (today's live build), or says the state did not matter (`used: false`, server add-on below).
- **When Ask had to ask "Which state is the job in?"**: a state list sits under that answer. One tap saves the state and
  asks the same question again. Typing the state still works.
- **Home card, once**: "Which state does your company work in?" (company account, only when the server says the company
  has none) or "Which state do you work in?" (Individual plan). A state list, **Use Arizona** when the phone already
  knows where it is or the last job says, and **Not Now** (never shown again on that phone; Ask still asks when needed).
  Company: saved as the company's state (the same value as Settings > Company). Individual: kept on the phone.
  Crew members are not asked. Screenshot: `work/home_state_card_390.png`.
- **New Job**: a State field appears only when City, State has no state the app can read (empty, "Main St yard").
  Left alone it says "Texas (company state)". A pick is saved as that job's state. Not required. `work/new_job_state_390.png`.
- **Ask also sends where the phone is** (`state_how: "here"`) when nothing else says, before the "told" state.

New English strings (need Spanish): "Answered for {State}.", "Next answers: {State}.", "Change", "Pick the state",
"State for your answers", "Pick a state", "Another state", "Use {State}", "Not Now" (exists), "Which state does your
company work in?", "Which state do you work in?", "For 811 rules, trench rules and Ask answers. A job in another state
uses its own.", "State", "{State} (company state)", "No state in City, State. Pick it so 811 rules, trench rules and Ask
answers fit this job."

### 3. Server add-on (`server/ask_state_addon.py`, 3 exact-once spots on the ask_state source; diff: `server/ask_state_addon.diff`)
The ask_state source is already in `/home/claude/ask_v24/src` (since 08:24 today), so this is a patch on top of it.
- The reply's state gains `used` (true when the question changes by state, or the job state's own chunks were handed to
  the model). With it, "Answered for Texas." shows only where the state mattered. Without it the line shows on every
  answer that has a state, pipe math included.
- `state_how: "here"` is accepted (after the last job on the phone, before "told"); the prompt line says "where this phone is".
- The app and the server do not need each other: the app shows nothing against today's live build; the staged
  ask_state build without the add-on ignores "here" and shows the line on every answer.

## Tests run
| What | Result |
|---|---|
| App rig, one browser: `tests/t_ask_followups_app.js` (individual, company account, foreman; Home card, New Job, Ask line, Change, the asked case, 390 px) | ALL PASS 43/43 |
| ask_state's own app test on my page (`ask_state_nov20/tests/t_ask_state_app.js`) | ALL PASS (9) |
| Existing Ask rig test `bughunt_nov17/office/a1_ask.js` on my page | same output, no page errors |
| Onboarding regression `tests/t130_onboard.js` on my page (Home, Getting Started, join flows) | ALL PASS |
| Deno, ask_state source + add-on: the 36 existing tests + 1 new (`server/followups_test.ts`) | 37 passed, 0 failed |
| Retrieval, `tools/run_retrieval.sh` (uses the nationwide and ask_state tools; output in `work/retrieval.txt`) | below |

Not run: the live-model eval (costs money; 5 questions is about 10 cents), the SQL test block, the full regression
(`run_all.sh`, shared machine). `used: false` itself has no Deno test (the request harness is inside ask_state's test file); the
six exact-match checks there cover `used: true`, and the add-on updates them.

**Retrieval before / after (first search only; does not judge the written answer)**
| Check | Before | After |
|---|---|---|
| 8 Washington cases, build live today (`retr.mjs`): right chunk found, no Washington chunk on a Texas job | 2 of 8 | 5 of 8 |
| Nationwide's own 22 cases | 17 | 17 |
| 5 eval cases, staged ask_state build: every needed fact in front of the model | 4 of 5 | 5 of 5 |
| All 127 text eval cases, staged build | 113 | 113, none worse |
| 127 cases x 52 locations, staged build | 846 better, 8 worse | 848 better, the same 8 (by design) |

The 3 still missing on the build live today (depth, short-term slope, competent person on site) are the known case:
federal text takes all six places; the staged ask_state build adds the Washington chunk beside it (checked for all four questions).

## Apply steps (for the lead)
1. **KB**, any time (safe with the live build and with ask_state): run `sql/01_ask_kb_followups_test.sql`, expect
   `RESULT: PASS rows 2840 -> 2842`; then `sql/01_ask_kb_followups.sql` (INSERT 0 2, check row new_chunks 2, n = rows).
   If other helpers' batches go first, ords and counts just move on; if the KB version changes, set `VERSION` in
   `kb_followups.py` and re-run it. Then `sql/02_ask_eval_cases_followups.sql` (INSERT 0 5) and
   `select pb_ai.eval_start('ai-next','fwa', array['fwa1','fwa2','fwa3','fwa4','fwa5']);`.
2. **Server add-on**, before the ask_state build is released (or as the next build):
   `python3 tests/staged/ask_followups_nov20/server/ask_state_addon.py /home/claude/ask_v24/src /home/claude/ask_v24/tests`,
   copy `server/followups_test.ts` into `/home/claude/ask_v24/tests/`, then
   `cd /home/claude/ask_v24 && deno test -A --no-check --config check.deno.json tests/` (expect 37 passed).
3. **App** (r17.12): `python3 tests/staged/ask_state_nov20/app/ask_state_app.py in.html a.html && python3 tests/staged/ask_followups_nov20/app/ask_followups_app.py a.html out.html`.
   Test: serve `out.html` as `cur.html`, `PB_ROOT=http://127.0.0.1:<port>/ node tests/staged/ask_followups_nov20/tests/t_ask_followups_app.js` (43 PASS).
   Add the Spanish strings above.

## Limits
- An Individual's state lives on the phone only. A new phone asks again (one tap).
- A company person who is not office or foreman cannot save a job's state for the company (server rule); their pick stays on their phone, as with Change State on Locates today.
- New Job does not force a state. A job with no address state and no company state still leaves Ask to ask once.
- Home card placement: under the notices, above the Company Home. Not checked in dark mode or Spanish.
- The Washington chunks summarize; I did not read Part N's benching figures or timber tables.

## Decisions for Tommy (5)
1. **Show "Answered for Texas." on every answer, or only when the state mattered?** Recommend only when it mattered
   (needs the small server add-on, built). On pipe math it is noise.
2. **Home card for the state: ship it?** Recommend yes. One pick, once; company accounts with no state and Individual
   plans only. Alternative is leaving it to Ask to ask.
3. **Trench Sloping on a Washington job: hide or flag "Type A, short-term"?** Recommend a one-line flag ("Not in
   Washington's table; use Type A 0.75:1") rather than hiding it. Not built: it is trench protection wording.
4. **Cave-in depth notes: use the job's state when the phone has no location?** Recommend yes, job state first, then the
   phone's location, and keep "strictest rule (4 ft)" only when neither is known. Today a Seattle job with no GPS fix gets
   "this phone doesn't know which state". Not built: safety wording.
5. **Keep an Individual's state on the server too** (one small column, so a new phone does not ask again)? Recommend
   yes, low priority.

## DONE
