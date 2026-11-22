# records_nov22 Phase B: server parts ready for live (lead, one sitting)

Scope: `_patchfn` helper, B3, B9, B5, B8. NOT here: A9 server rule, B6, B7 (still the old files in `../`).
Nothing was applied or written to live. Live was read only (SELECTs), Nov 22 2026.

## Apply order and md5

Run each **test block first**. It must raise an error whose message starts `RESULT:` and says `0 fail`. Then run the
apply file. Each apply file is plain SQL with no begin/commit and no top-level SELECT. It runs as-is, or pasted inside
`do $X$ begin ... end $X$;`, and it is safe to run twice.

| # | test block (expect) | apply file | md5 (apply file) | undo |
|---|---|---|---|---|
| 1 | `block_t01.sql` → `RESULT: 14 pass, 0 fail` | `01_patchfn.apply.sql` | `d1e55e53befd58bd5d753739cfea356c` | `99_undo_01.sql` (last) |
| 2 | `block_t02.sql` → `RESULT: 29 pass, 0 fail [app calls ran as role authenticated]` | `02_b3.apply.sql` | `4adaec84e8228fa175003d8a478f9480` | `99_undo_02.sql` |
| 3 | `block_t03.sql` → `RESULT: 46 pass, 0 fail [...]` | `03_b9.apply.sql` | `b626d417db55f00bf4b99dddf09b8c8d` | `99_undo_03.sql` |
| 4 | `block_t04.sql` → `RESULT: 22 pass, 0 fail [...]` | `04_b5.apply.sql` | `eb2bfae5eec49d13c1a78a294d4a22e2` | `99_undo_04.sql` |
| 5 | `block_t05.sql` → `RESULT: 22 pass, 0 fail [...]` | `05_b8.apply.sql` | `edfb72b59b74767587ef1cb198378826` | `99_undo_05.sql` |

- Undo in reverse order: 05, 04, 03, 02, then 01. `99_undo_01` refuses while 02's saved text is still waiting to be
  restored.
- Undo md5s: 01 `5ad18002…`, 02 `f189e96e…`, 03 `84016d7b…`, 04 `5d60db32…`, 05 `31dccd7a…`.
- Block md5s: t01 `63f247cf…`, t02 `f8dc7691…`, t03 `51789117…`, t04 `4e9c38ac…`, t05 `b6ef16e1…`.
- Block tNN contains apply 01..NN, so it passes before or after the earlier items are applied. Every block also passes
  when re-run after its own item is applied (checked locally).
- If the note says `[app calls ran as postgres, not authenticated]`, `SET ROLE authenticated` was not allowed. The app
  RPCs then ran as postgres, which is still valid for every security-definer RPC.
- Rebuild the blocks after any edit with `python3 src/mk.py`. The blocks are generated from the apply files, the undo
  files and `src/t0N.plpgsql`.
- Each block is one DO statement. It creates throwaway auth users, two companies, members and a manager. It always ends
  with `raise exception 'RESULT…'`, so nothing is kept, and pushes/emails queued through pg_net roll back too.
- Blocks t03 and t04 run `TRUNCATE` on `pb_prod.talks_given`, `pb_tickets.photos` and the new `talk_versions` to prove
  the guard. The guard refuses it, and the lock lasts only for the block (well under a second). Live has 0 talks and 1
  ticket photo.

## Verified on live (read-only, Nov 22 2026)
- `pb_safety.drop_open_on_close()` md5 = `06bf4e0e338276c9d73f8a5e6a0879d3`. The live text has CRLF line ends. Its delete
  statement appears exactly once (count 1). This is the only live function that is replaced. 02 replaces it whole,
  behind an md5 guard that saves the exact live text for the undo. No other in-scope item patches a live function.
- Every function the files call exists with that exact signature:
  - `pb_daily.permanent()` (raises `pb:daily_history_is_permanent`)
  - `pb_prod.versions_locked()` (`pb:permanent`)
  - `pb_audit.direct_write()`
  - `pb_prod.note_error(text,text,text)`
  - `pb_prod.managed_company(uuid)`
  - `pb_prod.member_name_or_null(uuid,uuid)`
  - the app RPCs the tests call: `pb_permit_open_put`, both `pb_permit_backup` 3- and 4-arg, `pb_talk_give`,
    `pb_daily_submit` (SECURITY INVOKER: runs under RLS as authenticated), `pb_daily_report_photo_put`,
    `pb_daily_event_photo_put`, `pb_daily_event_review`, `pb_ticket_save` (4-arg), `pb_prod_run_record_put`.
- Column lists match: `pb_daily.events` has 26 columns. The guard freezes 20 of them and lets 6 change (status,
  reviewed_at, reviewed_by, review_rev, changed_after_review, superseded_at).
- `pb_safety.permits` has no `open_*` columns yet.
- `report_photos_report_id_fkey` = `... ON DELETE CASCADE`.
- None of the 7 tables has a trigger, except `open_permits`, which has 2 emergency-link triggers (left alone).
- Every new name is free: schema `pb_stage`, `pb_daily.events_guard`, `pb_daily.record_delete_guard`,
  `pb_prod.talk_version_keep`, `pb_prod.talk_versions`, `public.pb_prod_run_versions`, and all trigger names.
- Writers of the 7 tables. I searched every function body for insert/update/delete/truncate on them and for dynamic
  `execute … delete`, and checked cron jobs, FKs and repo edge code. The only writers are the app paths listed in
  `03_b9.apply.sql`. The only delete is the close-out drop. `pb.allow_permit_delete` is referenced only by the permit
  guard itself: no delete-job flow exists in SQL.
- Data on live now: events 1, event_reviews 1, report_photos 1, ticket photos 1, talks 0, open permits 0, permits 0.
  Run versions: 140 across 9 runs, max 29 per run, max 26 KB each. The B8 caps will not bite today.

## What each test checks
- **t01 (14)**
  - pb_stage is closed to the API.
  - `count_in_fn` finds the live delete piece once.
  - `patch_fn` replaces one piece, saves the old text, and refuses 0 or 2+ matches.
  - `restore` puts back the exact text.
  - `guard` refuses changed text, passes the right text, and passes again on a second run.
  - The live drop_open md5 is still the one read Nov 22.
  - Undo 01 drops pb_stage, or refuses while 02 is in.
- **t02 (29)**
  - B3 with an r17.16 open snapshot (phoneAt +90 s): open save ×2, first_saved_at set 3 h back, close-out through
    the live `pb_permit_backup`. Then on the permit: open_saves 2, first seen 3 h before, last save time, fingerprint,
    clock +90 s, open row dropped, and the permit filed as before (company, closed_at, version 1).
  - Re-sending the same backup answers `same`. A changed one (4-arg call) becomes version 2 with the proof untouched.
    An open save after close answers `closed`.
  - An r17.15 snapshot (no phoneAt) keeps everything except the clock.
  - A broken phoneAt still closes, still keeps the proof and still drops the row.
  - A permit closed with no open snapshot leaves the columns empty.
  - Smoke (app paths, below).
  - Undo 02 puts back the exact live text (md5), and the next close-out behaves as before.
- **t03 (46)**
  - B9: 11 guard triggers, plus admin-log and no-truncate triggers on all 7 tables, and the FK no longer cascades.
  - App paths as role authenticated:
    - daily with a delay entry
    - daily photo and delay photo uploads, plus a re-send that answers `again`
    - office review
    - amended daily (old entry superseded, new one `new` + changed_after_review, history row, photo carried over)
    - amendment photo copied
    - review of the amended entry
    - talk save + edit
    - open permit saved twice, then the close-out drop goes through the guard, and the delete permission does not
      leak afterwards
    - ticket with photo, saved twice
  - Console writes (as postgres) are refused: hours, text of a superseded entry, un-superseding, entry delete, photo
    update/delete (delay, daily, ticket), deleting a report that has photos (no longer silently takes them), review
    history update/delete, talk delete, open permit delete, truncate.
  - Review fields still change from the console.
  - `pb.allow_record_delete = on` lets an owner flow delete.
  - The admin log has the writes.
  - Smoke.
  - Undo 03 removes every trigger, restores CASCADE and drops the guard functions. A console delete works again.
- **t04 (22)**
  - B5: the table is closed to the API, and the backfill covers every talk.
  - Through the app RPC: new talk → 1 version; edit → 2, and v1 keeps one attendee; same save → `same`, nothing new;
    void → 3. Every row is kept whole.
  - A console edit without a version bump is kept as its own row.
  - Versions cannot be updated, deleted or truncated.
  - Re-running 04 adds no duplicates.
  - Smoke.
  - Undo 04: saves still work, no new versions, the kept ones stay.
- **t05 (22)**
  - B8 grants: authenticated may call it; anon and PUBLIC may not.
  - Run saved v1/v2 through the app RPC, plus a removal event with its reason and an office setup change.
  - Who gets the history:
    - Company account: 2 versions with records and md5, the removal reason and the setup change.
    - Listed manager: ok.
    - The foreman who sent the run: `pb:not_company_account`.
    - Another company's owner: refused.
    - Wrong uid: `pb:wrong_account`.
    - Signed out: `pb:signed_out`.
    - Unknown run: `pb:not_found`.
  - 41 more saves (43 in all): all 43 listed with md5, the newest 40 carry their record.
  - Same record re-sent → `same`.
  - Smoke.
  - Undo 05 drops the function.
- **Smoke, in t02–t05 after the change.** These are the r17.15 app calls:
  - open permit save + close-out (row dropped)
  - toolbox talk save + edit
  - daily report save with its delay entry
  - run record save

## Changes from the staged `../*.sql` (why)
- **01:** adds `pb_stage.guard` / `restore` / `fn_backup`, the same pattern as security_nov22's pb_sec. The undo now
  restores the exact live text instead of a hand-typed copy. `patch_fn` gains an optional `p_tag`; existing 3-arg calls
  still work. Don't also run the old `../_patchfn.sql`: it would add a second 3-arg overload and make calls ambiguous.
- **02:** md5-guarded. The clock calculation has its own exception block, so a bad phoneAt no longer loses the copy of
  the other four fields (in the staged file one bad cast skipped the whole copy).
- **03:**
  - Refuses unless 02 is in.
  - FK re-added `NOT VALID` then `VALIDATE`; `drop constraint if exists`, so it can run twice.
  - Adds no-TRUNCATE triggers on the 7 tables.
  - Revokes EXECUTE on the guard functions.
- **04:** versions keyed (talk, version, row md5) instead of (talk, version), so a console edit that doesn't bump the
  version is still kept. Adds the admin log on `talk_versions`.
- **05:**
  - Byte cap: records ride along only while the newest-first total is ≤ 20 MB (worst case before was 40 × 2.5 MB).
  - Adds `bytes`, `removed_at` and `removed_reason` to the answer.
  - Null run id → `pb:not_found`.

## Risks
- **B9 is the only item that can refuse a write.** Every app writer was read and exercised in t03. Anything not covered
  would be a write path outside the app: console, SQL editor, service-key scripts, or a future delete-job/delete-account
  flow. Those now get `pb:history_is_permanent` and must set `pb.allow_record_delete = 'on'` for their own transaction.
  That is the intent; it is the same pattern as permits today.
- **B9 + undo 02 without undo 03:** close-outs still succeed, but the open row can't be dropped. This is logged in
  `pb_prod.pass_errors` and the row stays. Undo in reverse order.
- **Locks while applying 03:** `CREATE TRIGGER` / FK re-add briefly takes SHARE ROW EXCLUSIVE on the 7 tables and
  `pb_daily.reports`. They are tiny (≤ 1 row each), so it takes milliseconds.
- **B9 does not guard `pb_daily.reports` against DELETE.** A report with no photos and no entries can still be deleted
  in the console (logged by its existing zz_pb_audit). That is out of scope; flag it for a later pass.
- **Edge functions and other repos were not deployed or read beyond this repo.** A service-key script that deletes from
  these tables would now be refused. None was found.
- **Live is Postgres 17; local testing was on 16.** Nothing used is version-specific.

## The app before and after r17.16 (B3/B8 app parts in `../../patches/phaseb/`)

Applying all five now **cannot break the live r17.15 app**:
- None of them changes an RPC's arguments or answers.
- B9 refuses no write that the app makes (t03 exercises every one).
- B5 runs inside the talk save without changing its answer.
- B8 is a new function r17.15 never calls.

| | r17.15 (now) | r17.16 (B3/B8 app parts) |
|---|---|---|
| B3 | Open snapshots have no `phoneAt`. The permit gets first seen / last save / saves / fingerprint; `open_clock_ahead_s` stays null. Nothing in the app reads the new columns. | `b3_open_phoneat.py` adds `snap.phoneAt` after the change hash, so an unchanged permit never re-sends. The clock difference is then kept too. If r17.16 ships before 02 is applied, `phoneAt` simply sits in the snapshot, harmlessly. |
| B9 | No visible change. Direct console edits are refused and logged. | Same. |
| B5 | No visible change; every talk save is kept as a version. | Same. Showing "entered on" / version history is a later app follow-up. |
| B8 | Never called. | `b8_export_versions.py`: Export for Records adds `history.json` + `versions/run-vN.json` for the company account or a manager. For anyone else, or if 05 isn't applied yet (the RPC errors), the manifest says the history couldn't be read and the export goes on as before. Works in either order. |

Not yet in either: the permit certificate line "server first received this open permit at …" (it needs
`pb_reports_permit_versions` to return the new columns), and the office PDF page "Changes after the run".

## Files
- `0N_*.apply.sql`, `99_undo_0N.sql`, `block_t0N.sql` (generated).
- `src/` holds `mk.py`, `t0N.plpgsql` and the shared `_decl` / `_prelude` / `_fixtures` / `_smoke` / `_tally`.
- `local/replica.sql` is a schema replica built from the live DDL and live function text; leaf helpers are stubbed.
- `local/run_local.sh` and `local/run_local.out`: last run, all blocks 0 fail; each apply ×2 + undo ×2 clean; all five
  in order then undone leaves nothing; each apply file also runs wrapped in a DO block.

## DONE
