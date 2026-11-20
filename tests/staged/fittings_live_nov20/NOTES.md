# Fittings fill in during the day (office Today table) — Nov 20

Tommy: "Put the fittings column into this upcoming update" / "The app should automatically fill out the fittings it can."

Built on a COPY of the r17.11 candidate (`/tmp/claude-0/r1711/src.html`, which already has the office Today table from
`tests/staged/officeview_nov20` p01). Nothing committed, pushed, deployed or applied. The live server was only read
(function definitions, md5s, the table's columns and triggers). `_src/index.html` and `index.html` were not touched.

## What is here

    python3 patches/p01_live_fittings_phone.py   /tmp/claude-0/r1711/src.html  s1.html     # the phone
    python3 patches/p02_today_fittings_idle.py   s1.html                       out.html    # the office table (reads patches/fl.css)

Exact-once `rep()` in both. Source page +6.7 KB (9,379,032 -> 9,385,693 bytes); minified hooks build +4.2 KB.

### 1. The phone sends the fittings laid so far (p01)
The live status every crew phone already sends for a run (`pbLiveStatusOf` -> `pb_prod_run_status_put`) gets one small
field when the run has fittings on it:

    "fit": { "n": 3, "of": 5, "tw": 2, "b": 1, "s": 0, "o": 0 }

`n` laid, `of` on this session's part of the run, then by type: `tw` tees and wyes, `b` bends, `s` manholes/structures,
`o` everything else (reducers, couplings, valves...).
- It is the daily report's own "counted by the app" rule (`pbFitCount`): fittings on rows marked laid this session.
  One difference: a run still in progress with nothing marked laid says 0 (the daily, made after the run is ended,
  counts them all when the crew never used laid marks; the live count does the same once the run is ended).
- A run with no fittings sends exactly what it sends today (no field, same hash, no extra send).
- The app has no "manhole" fitting type (the types are Wye, Tee, Bend, Reducer, Coupling, Other). `s` counts an "Other"
  fitting whose name reads manhole / MH / structure / catch basin / inlet / vault / cleanout.
- Old server: `pb_prod.clean_status` builds the stored status from a fixed list of fields, so today's server simply
  drops `fit` (read on the live function; nothing rejects unknown fields; the status stays far under the 4,000-byte check:
  503 characters in the test, the largest live status today is 769 bytes).

### 2. The server keeps it (sql/, STAGED, not applied)
- `sql/01_live_fittings.sql`: `pb_prod.clean_status` keeps `fit`, checked by a new helper `pb_prod.whole(jsonb, integer)`:
  whole JSON numbers 0 to 500 only (no text, decimals, negatives, true/false). No `n`: no `fit` at all. `of` below `n`:
  dropped. Types that do not add up to `n`: dropped (the count stays). Anything else inside `fit`: dropped.
- **The company board needs no change.** `pb_prod.live_row` returns the stored status whole, and both board reads
  (`pb_prod_company_live`, `pb_prod_crew_live`) go through it, so `fit` comes back as soon as it is stored. The test
  proves it end to end (a crew member puts, the owner reads).
- Conventions: `clean_status` stays what it is on live (plain `STABLE` sql function, `search_path ''`, NOT security
  definer, no grants: only the security-definer `pb_prod_run_status_put` calls it). The helper is `IMMUTABLE`,
  `search_path ''`, execute revoked from public / anon / authenticated, like `pb_prod.num`. The new `clean_status` text
  keeps the live function's Windows line ends so the undo is byte for byte.
- `sql/99_undo.sql`: the Nov 20 body back (md5 `5abdc95eeee058254eac882811861605`) and the helper removed.
- `sql/02_test.sql`: rolled back, ends `raise exception 'RESULT: ...'`. 24 checks: the whitelist (kept, text / decimal /
  negative / over cap / true-false / huge / not an object / no count / types not adding up / "of" too low / extras),
  an old phone's status unchanged, the functions' kind and grants, then put as a crew member and read as the company
  account (with fit, with junk fit, a newer status replacing the count).
- `sql/00_replica_local.sql` + `sql/_live_clean_status_nov20.sql`: a local stand-in (live function bodies copied
  read-only; `check_before_apply.sql` gives the same four md5s locally as on live, so the copies are exact).

Run locally (throw-away Postgres 16): before apply the test fails at the missing helper; after apply
`RESULT: PASS 24/24`, 0 rows left; body of 01 + test in one transaction: `PASS 24/24` and the before-check unchanged;
after `99_undo.sql` the before-check matches live again. `check_before_apply.sql` was also run on LIVE (read-only) on
Nov 20: all four values match.

### 3. The Today table (p02)
- **Fittings** shows the phones' count until the daily is signed: `3` with "so far" under it. Hover: "3 of 5 fittings on
  today's runs marked laid, as the crew's phones last sent. 1 tee/wye, 1 bend, 1 manhole/structure." Once the daily is
  signed, the signed number shows (as before), hover "Counted by the app on the signed daily report."
- Only today's runs count (a run left open since yesterday is listed but not counted), the same rule as "Laid today".
- The opened row lists each run's "fittings 2 of 4 laid" and one line "Fittings laid today: 3 of 5 (1 tee/wye, 1 bend,
  1 manhole/structure)".
- The page reads `fit` as strictly as the server keeps it (whole numbers 0 to 500, types must add up), so nothing odd
  from a phone can show.
- With today's server (no `fit` stored yet) the column behaves exactly as in officeview: blank until the daily.
- No new server call.

### 4. The grey "Nothing sent today" row, and the side menu
- The row is now the foreman's name and ONE line across the nine empty columns ("Nothing sent today", small ring, italic),
  muted text on a soft grey band, half the height of a working row. No dashes. Light and dark both tested for contrast
  (5.6 : 1 light, 5.2 : 1 dark).
- **Side menu "white below 900 px": that was the picture, not the app.** The menu is `position: fixed; top: 0; bottom: 0`
  (it always fills the window). The old screenshot was a "full page" capture, which stretches the page to 1,340 px but
  leaves a fixed menu at the 900 px window height. The test now scrolls to the bottom of the page and checks the menu
  covers the window top to bottom, and the new pictures are taken with a tall window instead. No CSS change was needed.

## Pictures (`shots/`)
`fl_before_{1440,1280}_{light,dark}.png` (the candidate, same fake day), `fl_after_{1440,1280}_{light,dark}.png`,
`fl_open_1280_{light,dark}.png` (a crew's row opened).

## Tests
@@TESTS@@

## How to apply the SQL (the lead; exact steps)
Apply the SQL BEFORE the app update goes out (see "Order" below). Project `rogfassochneycezecxa`.
1. `execute_sql` with `sql/check_before_apply.sql` (read-only). All values must match its header. If
   `clean_status_md5` differs, stop: the live function changed since Nov 20; re-stage from the new body.
2. Dry run, nothing kept: ONE `execute_sql` call holding `begin;` + the body of `sql/01_live_fittings.sql` without its
   own `begin;` / `commit;` + `sql/02_test.sql`. Expect `ERROR: RESULT: PASS 24/24` (the error is the rollback). Then
   step 1 again: still the same values. (The test's two status rows would queue a "started a run" push for a foreman
   through the `prod_run_status_push` trigger; the queue row is undone by the same rollback, before the 5-minute sender
   runs, so nobody is notified.)
3. `apply_migration`, name `live_fittings_nov20`, query = the body of `sql/01_live_fittings.sql` without its `begin;` /
   `commit;` (a migration is its own transaction). Send the file's bytes as they are: the `clean_status` text has
   Windows line ends on purpose.
4. `execute_sql` with `sql/check_after_apply.sql`: `keeps_fit` = the six numbers, the four booleans `true`.
5. `sql/02_test.sql` once more on its own: `RESULT: PASS 24/24` (still rolls back).
6. Rename `01_live_fittings.sql` to `..._APPLIED_nov20.sql` as the other releases do.

Undo: `sql/99_undo.sql` (body without begin/commit, as a migration). Tested locally: the before-check md5s return.

**Order.** Either order is safe (the old server drops the field; the old app never sends it). SQL first is better: a
phone that sends a run's count to the old server remembers "sent" and only sends that run again when something on it
changes (the next row marked laid), so counts sent before the SQL would show up one mark late.

## Things to know (checked)
1. **Tested on the rig and a local Postgres only.** Worth one look with a real crew phone and the company account.
2. **Phones must have the update.** A phone on r17.10 sends no count; its crew's Fittings stays blank until the daily.
3. **The count is per phone session, "this session's fittings".** A run resumed today counts only today's part (the
   earlier session's fittings were counted then), the same as the daily.
4. **The signed daily counts only the runs on the signer's own phone** (`pbDlyRunSection` reads that phone's runs).
   If a foreman signs and the pipelayers ran the runs, the daily can say 0 while the phones said 5. The table then keeps
   the phones' 5, marked "on runs" (decision 2).
5. **officeview's `t_ov1_today.js` has one line to update** when both ship: its Pat Ochoa check expects ten cells of
   dashes (`pat[2] === 'Nothing sent today' && pat.slice(3).every(c => c === '–')`); the row is now two cells
   (`pat[1] === 'Nothing sent today' && pat.length === 2`). Its other 35 checks pass on this page.
6. **English only**: "so far", "on runs", "Nothing sent today" and the hover lines are not in the Spanish dictionary.
7. The foreman's crew board (`pb_prod_crew_live`) now also receives `fit` in each status; the foreman's screens do not
   show it yet.

## Decisions for Tommy (4)
1. **Ship it in this update?** Recommend yes, SQL first. It is one small field on a call the phone already makes; the
   old server and old phones ignore it.
2. **Daily signed with no fittings counted, but the crew's phones counted some: which number shows?** Built: the
   phones' count stays, marked "on runs". Recommend keeping that; otherwise the cell would drop from 5 to 0 the moment a
   foreman signs for a crew whose pipelayers ran the runs. The stricter reading ("signed number, always") is a one-line change.
3. **Manholes/structures.** The app has no manhole fitting type, so they only count when someone picks "Other" and
   names it. Recommend leaving it for now; adding "Manhole / structure" to the fitting types is a separate, small change
   if you want them counted properly.
4. **A run with fittings but no rows marked laid, still in progress: 0 so far** (not "all of them"). Recommend this: a
   live count that jumps to the full plan before any pipe is in the ground would mislead the office. Once the run is
   ended it follows the daily's rule.
