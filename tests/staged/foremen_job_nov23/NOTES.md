# foremen_job_nov23: "Foremen on this job" (Tommy approved Nov 23 2026)

Base: `_src/index.html` = LIVE r17.16 · 2026-11-23 (md5 0f613d6c…). **Nothing was applied to the server, published, committed
or pushed.** Live Supabase was only read (SELECTs: function texts, table shapes, grants, default privileges).

## What it is
A new card on the office job page, right under "PMs & supers on this job", same look and same rules:
- Folded row **"Foremen on this job"** with the names (or "None assigned"). Open it: each foreman, email, "since <day>",
  and **Assign Foremen** / **Change Foremen**. Change = tick boxes of every foreman in the company, Save / Cancel.
- Also in **Edit Job** (right after "PMs & supers"): **Foremen** — "Which foremen are on this job". Opens the same editor.
- Only on the Overview tab (hidden on Waiting / Materials / … like PMs & supers).
- Who may change it (mirrors PMs & supers, `pb_job_pms_set`): the company account and managers can **add**; the company
  account, PMs and supers can **take anyone off**; another manager (a listed manager who isn't a PM) can take only
  themselves off (their other boxes are greyed with a one-line note). Only people who are a **foreman of the company now**
  can be picked. Up to 20 per job.
- A foreman who is made a pipelayer/PM or removed from the company comes off every job by himself (trigger), like PMs.
  A stale row shows "No longer a foreman".
- **Offline: the same as PMs & supers** — not kept on the phone (it holds email addresses), so it loads with signal;
  with no signal it says "Loads with signal." and Change says "No signal. Assigning foremen needs signal."
  (Small extra over PMs: a job page opened with no signal says "Loads with signal." instead of "Loading…". The PM card
  still says "Loading…" there; not changed.)
- Two managers at once: same version check as PMs (`pb:changed`): this person's ticks are applied on top of the list as
  it is now and "X was added by someone else meanwhile and is kept." Plain-word refusals for every server code.
- Spanish lines for all 22 new strings (Spanish stays off).

## Files
| Part | File |
|---|---|
| Server | `sql/01_job_foremen.sql` (source) → `sql/apply/01_job_foremen.apply.sql` (run on live), `sql/tests/block_t01.sql` (rolled-back test), both made by `sql/tests/mk.py` from `sql/tests/t01.plpgsql` |
| Undo | `sql/undo/99_undo_01.sql` |
| Local test DB | `sql/local/replica_tables.sql` + `live_defs.json` (21 live function texts, verbatim) + `replica_after.sql` → `make_replica.py` → `replica.sql`; `run_local.sh`; `with_messaging.sh` + `bridge_messaging.sql` (messaging test on a DB with this applied) |
| App | `patches/f1_job_foremen.py` + `patches/f1/foremen.js`; `build.sh` (stacks on `_src/index.html`; `BASE=<file>` for another base) |
| Test | `tests/t_foremen.js` (rig, fake server acting like the SQL) |
| Messaging | edited in place in `tests/staged/messaging_nov22` (see below); pre-edit copies in `messaging_before/` |
| Results | `results/sql_local.txt`, `results/t_foremen.txt`, `results/shots/`, `results/full_regression.log`, `results/regression/` |

Build md5 (`sh build.sh`): work/index.src.html `3132f03c6dcbcf62c9d4cda3fab9b0f9`, work/build/index.html `4af8807b6c0e2e9f3ffa8c909f8f9268`.

## Server (sql/01_job_foremen.sql)
- New table **`pb_pm.job_foremen`** (same columns as `pb_pm.job_pms`: one row per assignment, ended not deleted,
  unique while open; end reasons unassigned / not_foreman / left_company). Row security on, no policies, no grants:
  only the functions read it. No-delete / no-truncate triggers (`pb_pm.permanent`, as job_pms).
- **`public.pb_job_foremen_get(text)`** and **`public.pb_job_foremen_set(text, uuid[], uuid, integer)`**: SECURITY
  DEFINER, `search_path=''`, EXECUTE for `authenticated` only (revoked from PUBLIC and anon). Same checks, lock, version
  and audit as the PM pair. Private helpers `pb_pm.company_foremen`, `job_foremen_state`, `job_foremen_ver`,
  `foreman_role_sync` (not callable from the API).
- Trigger **`company_members_foreman_sync`** on `public.company_members` (after delete / update of role, company_id).
- Changed live object: **`pb_pm.audit` check `audit_action_check`** also allows `'job_foremen'` (one audit trail).
- **No live function is replaced.** Guard at the top refuses (nothing changes) if what it builds on is missing, the
  audit check isn't the Nov 23 text, or `pb_prod.is_foreman_of` changed (md5 58f30a56…).
- RLS/grants checked in the test: both app functions callable by authenticated, not anon/PUBLIC; helpers not callable;
  all six definer with empty search_path; table closed; schema pb_pm closed; and (the permission lesson) every function
  called by a policy on companies / company_members / job_foremen / audit is executable by authenticated. No new policy.

## Apply order (lead; nothing done)
1. Read-only check on live: `select md5(pg_get_functiondef('pb_prod.is_foreman_of(uuid,uuid)'::regprocedure))` =
   `58f30a56c0fb2ffe9d284109025d054a` (the apply file checks it anyway).
2. Run `sql/tests/block_t01.sql` on live as postgres. It must end with **`ERROR: RESULT: 25 pass, 0 fail [app calls ran as
   role authenticated]`**. It inserts throwaway users/companies (plan paid, active) and rolls everything back.
3. Apply `sql/apply/01_job_foremen.apply.sql` (one transaction).
4. **Before messaging_nov22's 01** if both go the same day (so its test block runs 3t1-3t6; it works either way).
5. Release the app with `patches/f1_job_foremen.py` (`sh build.sh`; on top of messaging too, both orders apply), (no test changes needed:
   `test_updates/` is empty; `tests/t_foremen.js` can be added to the suite if wanted). The app can go first: until step 3 the card says
   "Assigning foremen isn’t ready on the company server yet."

## Undo
`sql/undo/99_undo_01.sql`: drops the two app functions, the helpers and the trigger. **Keeps** the assignments table
(re-applying 01 brings the lists back). Puts the audit check back to the live text only if no `job_foremen` audit row
exists (audit rows are permanent); otherwise leaves it wider and says so. Part 2 (commented) drops the table too.
App: ship without f1 (the card simply isn't there).

## Messaging (tests/staged/messaging_nov22, not live)
Job-chat membership for foremen is now, by the first rule that has anyone:
1. **listed on the job page's Foremen list** → only those; 2. else the old signs (open inspection items, assigned crew
runs, office-filled dailies, 120 days) → those; 3. else foremen who worked the job in the last 120 days. An office add
still keeps a person in. Chat info says which: new wording for 2: "No foremen are listed on the job page, so foremen with
open inspections, crew runs or dailies on this job are in." Messaging works without this server part (it checks for
the table). Details in messaging_nov22/NOTES.md "Nov 23 update".

## Results
| What | Result |
|---|---|
| Local replica: live function md5s | 21 of 21 match live |
| `block_t01` (local Postgres 16) | **RESULT: 25 pass, 0 fail** [app calls ran as role authenticated]; nothing kept |
| apply x2 / real save as authenticated / undo / re-apply | no errors; undo removes functions + trigger, keeps the row, live functions still the live md5; re-apply: list back; block_t01 again on the applied state 25/0 |
| mutation check (tests can fail) | grant revoked → 10 fail; set made SECURITY INVOKER → 14 fail; trigger dropped → 3 fail |
| messaging block_t01 | 79/0 (stub DB), **80/0 with this applied for real** (3t6 = the real save), 74/0 without the table; t02 14, t03 4, t04 5; apply x2 + undo clean |
| messaging app rig `t_msg.js` | 57/57 pass (B9d, B9e new) |
| `tests/t_foremen.js` | **26/26 pass** (placement, card + Overview only, load, list, edit ticks 44 px+, save on version, someone else's add kept, pb:changed retry, owner_only / not_foreman words, manager locks + note, none / nobody to pick, no signal both ways, server not ready, Edit Job menu, PMs untouched, Spanish, 400/360 px no sideways scroll, no page errors) |
| Full regression (`tests/run_all.sh --build work/build_hooks/index.html --jobs 2`) | **pass 222, flaky 0, FAIL 0, skip 15 (of 237)**: no golden changed, so `test_updates/` holds no file (only a README). f06_breakend passed this time. |

## Where foremen assignment would matter (NOT changed; for later)
All of these key off PMs/supers (`pb_pm.job_alert_recipients`) or guess foremen from recent work:
- **811 ticket alerts** `pb_prod.locate_recipients` → `pb_prod.locate_foremen`: foremen with entries in 14 days or who
  made the ticket. Listed foremen would be the obvious add.
- **Weather alerts** `pb_daily.wx_people` → `pb_daily.wx_foremen`: foremen (and crew-link foremen) who worked it recently.
- **Pipelayer escalation / nudges** `pb_prod.up_chain` (used by `pb_nudge_send`, `pb_nudge_list`): a pipelayer with no
  crew link goes to the foreman picked on his runs (60 days). Could fall back to the job's listed foremen.
- **Job alerts** (`job_alert_recipients` and its users: materials `pb_mat.recipients`, `pb_prod.safety_push`,
  `pb_daily.insp_fail_push`, `pb_daily.events_push`, `pb_safety.em_notify` (its PM part), `pb_pm.job_alert_push`,
  `pb_pm.digest_build`, `pb_pm_email_claim`, `pb_daily.missing_push_pass`): PMs/supers/owner only. Foremen not added.
- **Job recreated** (`pb_prod_job_create`) ends the job's PM rows ("job_recreated"); foremen rows are not ended.
- **Owner/office dashboard** (`pb_prod_company_dashboard`) shows a PM count per job; no foreman count.
- **Pickers**: crew-run "assign to foreman" and inspection-item foreman pickers could list the job's foremen first.
- `pb_daily.missing_days` (dailies not signed) is about who actually worked; leave it.

## Decisions for Tommy (plain words, each with a recommendation)
1. **Who can change the list** — built the same as PMs & supers: the office and managers can add; the owner, a PM or a
   super can take anyone off; other managers only themselves. *Recommend: keep.*
2. **Up to 20 foremen per job.** *Recommend: keep* (PMs are 10; a big job can have many crews).
3. **Job deleted and made again with the same number**: the PM list starts over, the foreman list stays. *Recommend:*
   start the foreman list over too (a one-line server change to job create, done separately).
4. **Should listed foremen get the job's 811 ticket and weather alerts?** Today those go to foremen who worked the job
   recently. *Recommend: yes, add listed foremen to both* (next server change). Keep job/material alerts for PMs & supers.
5. **Pipelayer nudges with no crew pairing**: go to the job's listed foremen when there's no other foreman? *Recommend: yes, later.*
6. **Can a foreman see which jobs he's listed on?** Not today (the job page is office-only). *Recommend:* later, put his
   listed jobs first in his job list / pickers. Not needed for Messages, which already uses the list.
7. **Messages rule order** (list first, then the old signs, then "worked it in 120 days"). *Recommend: keep as built.*

## DONE
