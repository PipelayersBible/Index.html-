# 811 Renew + History: the server half (staged Nov 20 2026, NOT applied)

Follows hunt_nov19 finding 7: the app (r17.10) has 811 **Renew** and **History** built (`feat_locrenew`), the server
never got its half and the SQL was not in the repo. This folder is that half, written against the live server as read
(read-only) on Nov 20, with a rolled-back SQL test and an app test. Nothing was written to the server. No app patch is
needed: the unpatched r17.10 page works with it as is.

## What the app expects (read from `_src/index.html`)

| Where | What |
|---|---|
| 70271 `pbLocCard` | **Renew** shows only when the ticket is open, not expired, and comes with a `renewals` value (not null/undefined). |
| 70319 `pbLocLogHtml` | **History (n)** shows only when the ticket comes with `log_n` > 0. Open and closed tickets. |
| 70264 | Card line: `Renewed <renewed_at>` and `(N times)` when `renewals` > 1. |
| 70185 `pbLocSyncRun` | Saves with `pb_prod_locate_set`, the usual 9 arguments, plus `p_renewed_at` **only when the ticket has a renewal day**. That is every renewal, and also every later Edit / Close / Reopen of a renewed ticket (it carries the day it has). So "p_renewed_at was sent" does not mean "this is a renewal". |
| 70194 | Renewal call not found on the server: marks it "Not accepted… can't take renewals yet" (`pb:no_renew`). Cannot happen once 01 is applied. |
| 70160 | Knows `pb:renew_late`: "It had already expired. 811 only renews a ticket before it expires: call in a new ticket." |
| 70337 `pbLocLogToggle` | `pb_prod_locate_log({p_job_number, p_id})` → `{ok, log: [...], total}`; each row `{action, at, by_name, changes: {field: [old, new]}, called_at, expires_at, renewed_at}`. Actions it words: `added, edited, renewed, closed, reopened, on_file` (anything else reads "Changed"). Fields it words: `ticket_no, called_at, expires_at, renewed_at, note`. History is read each visit, never kept on the phone. |
| 70372 `pbLocRenewSave` | The phone already refuses: renewal before the call-in day, after the old expiry, more than a day in the future, expiry before the renewal or more than 365 days after it. The server repeats each of these. |

So the "is the server ready" switch is simply the two fields on each ticket. No version flag, nothing to turn on in the app.

## What the live server has today (read-only, Nov 20)

- `pb_prod.locates` (16 columns, 1 row: the beta company's job 26014 ticket), `locate_sends`, `locate_runs`. Row
  security on, **no policies, no grants**: like the other pb_prod tables they are reached only through
  `SECURITY DEFINER` functions that check the caller's company (`pb_prod.locate_company`: company account, managers, PMs, foremen; pipelayers get `pb:foremen_only`).
- `public.pb_prod_locate_set` (9 arguments), `pb_prod_locates`, `pb_prod_locates_mine`; every ticket list is built by
  `pb_prod.locate_json` (also inside `pb_prod_job_detail` and `pb_prod_foreman_scope`).
- No `pb_prod_locate_log`, no `renewed_at` / `renewals`, no history table. Nothing ever deletes a ticket row.
- Expiry reminders (`locate_sends`) are keyed by the expiry date, so a renewed ticket gets fresh 7 / 2 / 0-day reminders with no change.

## The SQL (staged) — `sql/01_locate_renew_history.sql`

Additive. One transaction. sha256 `51a7d495bcfef1d46b8e11f943845f67f9f93093c388ac87e6eb69bd5c5cbcac`.

1. `pb_prod.locates` + `renewed_at date`, `renewals integer not null default 0` (+ two checks).
2. `pb_prod.locate_log`: one row per add / edit / renewal / close / reopen: who (`by_user`), when, the action, the ticket
   as it was left (number, called, expires, renewed, closed, version), `expires_was` (old expiry) and
   `changes` (`{"expires_at": [old, new], ...}`). Written by a **trigger on pb_prod.locates**, so any way a ticket
   changes is recorded, including a direct fix in SQL (then `by_user` is empty and the row also lands in
   `pb_audit.admin_log` through the usual `zz_pb_audit` trigger). **Permanent**: update, delete and truncate raise
   `pb:permanent` (the existing `pb_prod.versions_locked`). Row security on, no policy, no grants (the house pattern:
   only the company-checked functions read it; the hunt2 "214 tables, anon_reach 0" check stays true).
3. The ticket already on file gets one **"On file"** row (as last saved, by whom, when).
4. `pb_prod.locate_json` + `renewed_at`, `renewals`, `log_n` → the app shows Renew and History everywhere tickets load.
5. `pb_prod_locate_set` with a 10th argument `p_renewed_at`. The 9-argument function **stays** (same name, arguments,
   grants) and hands over to the new one with no renewal day, so plain saves and older builds are untouched. Two
   functions, no defaults: the API picks by the argument names sent, exactly like the live `pb_permit_backup`
   3 / 4-argument pair (office3 #37). Rules added:
   - a save is a **renewal** only when `p_renewed_at` is later than the renewal day on file (so the app's Edit of a
     renewed ticket, and a retry of the same renewal, are not counted twice);
   - `pb:renew_late` when the renewal day is after the expiry on file; `pb:bad_date` for renewal before call-in, more
     than a day ahead, expiry before the renewal; the one-year limit now runs from the renewal day (a long job renewed
     for the 14th time is not refused);
   - an earlier renewal day is a correction (logged "edited", not counted);
   - 60 changes a day per ticket, then `pb:quota` (history is permanent; a stuck or hostile phone can't fill it).
6. `pb_prod_locate_log(p_job_number, p_id)`: newest first, 50 at most, with `total`. Same people as `pb_prod_locates`.
   Another company's ticket, or the wrong job number, reads `pb:not_found`.

All three public functions: `SECURITY DEFINER`, `search_path ''`, `revoke all from public, anon`, `grant execute to
authenticated, service_role` (the ACL the sibling locate functions have). The trigger function is granted to nobody.

"Expired" is not a history row: it is a date passing, nobody changed anything. The card already says "Expired … Don't dig".

Other files: `sql/check_before_apply.sql`, `sql/check_after_apply.sql` (read-only, expected values in the header),
`sql/99_undo.sql` (puts the two old function bodies back byte for byte and removes the new calls; keeps the columns
and the history), `sql/00_replica_local.sql` (local stand-in only).

## Tests

**SQL, rolled back — `sql/02_test.sql`** (ends with `raise exception 'RESULT: ...'`, so nothing is kept; finds its own
company, foreman, PM, pipelayer and other-company member). Run on a throw-away local Postgres 16 holding the live
table and the live function bodies (md5 of the replica's `pb_prod_locate_set` and `locate_json` = live:
`c7a8851c…`, `be944855…`), three ways: after 01 applied; 01 + test in one transaction; 01 applied through a
fetch-style DO block with the checksum. Each time:

`RESULT: PASS 49/49 | company d01a4a5f job 26014 pm t pipelayer t other-company t | history rows before 1 written here 76 |`

and afterwards the table still held only the one "On file" row. It covers: add / edit through the old call; renewal
(count, dates, version, history row with old → new expiry); retry not double counted; old-call edit keeps the renewal;
Edit carrying the day is not a renewal; correction; second renewal; late renewal refused and nothing logged; late-sent
renewal accepted; five bad-date cases; a 360-day-old ticket renewed; stale version; close / reopen rows; add + renew in
one save; lists carry the fields; every ticket has history; owner, PM read; pipelayer, other company, no company,
signed out, wrong account all refused; update / delete / truncate of history refused; the 60-a-day cap; grants (signed
in yes, anon no), table unreachable, definer + search_path, exactly two overloads. Also checked by hand as the real
`authenticated` role with named arguments (9 and 10), `anon` → permission denied, and a direct SQL edit → "edited" row
with no name + an admin_log row.

Not tested against the real API layer or Postgres 17 (live): the first live run is the rolled-back test below.

**App — `tests/t_loc811_renew_history.js`** (Playwright, 390 px, unpatched `_src/index.html`, a fake server in the page
that follows the same rules as 01). `ALL PASS 31/31`:
- today's server: no Renew, no History, history call never made, Edit / Mark Closed as before;
- server with 01: Renew on the open ticket, none on the expired one ("Don't dig until a new ticket is valid");
  History (1) "On file · … · Maria Office · Called in Oct 31, expires Nov 23"; Renew form "Renew ticket A2611-501 /
  Now expires Mon Nov 23", today + California's 28 days prefilled; one save with `p_renewed_at`; card "Renewed Nov 20",
  "28 days left"; History (2) "Renewed · Test Foreman · Expires Nov 23 → Dec 18"; second renewal "(2 times)"; an Edit
  after it is logged Edited, not counted; server refusal (`pb:renew_late`) shown as "Not accepted" with Fix and Send
  Again / Discard; no signal → "Waiting to send", sent when back; History with no signal → "Loads with signal.";
  closed tickets keep History; no sideways scroll; no page errors.
- Screenshots: `out/renew_form_390.png`, `out/history_390.png`, `out/locates_390.png`.
- Run: `PB_URL=http://127.0.0.1:<port>/cur.html NODE_PATH=/opt/npm-tools/node_modules node tests/t_loc811_renew_history.js` (cur.html = a copy of `_src/index.html`).

## How the lead applies it

1. Run `sql/check_before_apply.sql` (read-only). All values must match its header; the two md5s prove the live
   functions are still the ones 01 was written against.
2. Dry run on live, nothing kept: one `execute_sql` call holding `begin;`, then the body of 01 **without its own
   `begin;` / `commit;` lines**, then the whole of 02. Expect `ERROR: RESULT: PASS 49/49 …` (the error is the
   rollback; this is the "one transaction" run done locally). Afterwards `check_before_apply.sql` must still match.
3. Push the commit, then fetch and apply the reviewed file (the SQL is 17 KB; this avoids pasting it):
   `select net.http_get('https://raw.githubusercontent.com/<owner>/<repo>/<commit>/tests/staged/locate811_nov20/sql/01_locate_renew_history.sql');`
   → note the request id, then `apply_migration` (name e.g. `locate_renew_history_nov20`) with:
   ```sql
   do $m$
   declare s text;
   begin
     select r.content into s from net._http_response r where r.id = <request id> and r.status_code = 200;
     if s is null then raise exception 'not fetched'; end if;
     if encode(sha256(convert_to(s, 'UTF8')), 'hex') <> '51a7d495bcfef1d46b8e11f943845f67f9f93093c388ac87e6eb69bd5c5cbcac' then raise exception 'not the reviewed file'; end if;
     s := regexp_replace(s, '^(begin|commit);[ \r]*$', '', 'gn'); -- the migration is one transaction already
     execute s;
   end $m$;
   ```
   (This exact block, checksum included, was run locally against the replica.) If the file is edited, recompute the sha256.
4. Run `sql/check_after_apply.sql`, then 02 once more on its own (still rolls back) → `PASS 49/49`.
5. On a phone: open Locates on job 26014 → the ticket shows **History (1)**. Add a ticket → **Renew** is on it.
   If a save says "can't find the function" in the first seconds, the API hasn't re-read the functions yet: `notify pgrst, 'reload schema';`.
6. Rename this folder's SQL `…_APPLIED_nov20.sql` as the other releases do. No app release is needed; a release note line is ("811 tickets: Renew and History").

Undo: `sql/99_undo.sql` (tested locally: both function bodies return to today's md5, Renew / History disappear, history rows stay).

## Ticket life by state (task 4)

The app already has a sourced 51-row table (`PB_SR`, r17.05/06, `tests/r1706/staterules/data/state_rules.json`, checked
Nov 19 2026) and Renew uses it: new expiry = the state's ticket life counted from the renewal day
(`pbLocExpFor(renewal day)`), blank with "Enter the new expiry 811 gave you" in the 13 states with no confirmed life
(AK AR LA MO MT NE NY OH PA RI SD WI WV). **No new table is needed and none was built.** The server does not compute
dates at all; it stores what the phone sends, so the state rules stay in one place. Gaps, all in the app's Renew form:

1. **States where there is no renewal, only a new ticket.** The table's own "renew" line says so for CT, FL, IN, ME,
   MN, NC, NJ, OK, OR, TN, WA ("call in again" / "give a new notice"), and Texas811 files an update as a ticket
   remarked "Update – (previous ticket number)" (https://www.texas811.org/faq), i.e. the old number is the *previous*
   one. The Renew form keeps the ticket number and cannot change it, and it does not show the state's renew line
   (that line is only in the Rules view, 70676). A foreman there has to know to use Edit, or Add Dig Ticket and close
   the old one. The server takes a number change in a renewal already (history shows "Ticket old → new").
2. **Utah**: a renewal runs 21 days *from the day the previous notice expires*, and may be given no sooner than 7
   days and at least 48 hours before that (Utah Code 54-8a-4(6), https://le.utah.gov/xcode/Title54/Chapter8A/C54-8a-S4_2024050120240501.html).
   The app counts 21 days from the renewal day: up to 7 days too early, never too late, and the date can be typed.
   Virginia ("a remark adds 15 working days", partial source) is the same kind of case.
3. **Nevada**: two renewals at most, then a new ticket (USA North 811 Nevada handbook, in the table). The server now
   counts renewals; the app shows "(2 times)" but does not warn on a third.
4. **States whose life counts from the first legal dig day** (AL, CO, IA, KS, MD, MI, MN, NC, ND, NM, OK, SC, TN, …):
   on a renewal the app adds the notice wait again before counting the life. Whether a renewed ticket gets that wait
   again is not confirmed per state; the result can be a few days longer than a strict count from the renewal day. The
   date 811 gives is the one to type. Not verified state by state.
5. Florida: "valid for 30 calendar days after the date such information is provided" (Fla. Stat. 556.105(1)(c),
   https://m.flsenate.gov/statutes/556.105) matches the table.

Proposed (not built): in the Renew form, show the state's "renew" line under the dates and add the ticket number as
an editable box ("New number from 811? Type it."). Small app patch, no server change.

Seen while testing, cosmetic: a renewed ticket's card still shows "Can dig from / Start work by" counted from the
original call-in day (`out/history_390.png`).

## Risks

- **Two overloads of `pb_prod_locate_set`.** Any later change to the save rules goes in the 10-argument one; the
  9-argument one is only a hand-over. The by-name pick is proven live by `pb_permit_backup`, but this pair has not met
  the real API yet (step 2 / 5 above is where it does).
- **History is permanent.** A ticket with history can't be deleted (foreign key + locked rows). Nothing deletes
  tickets today; a future "delete company data" job would have to drop the lock on purpose, as for the other
  permanent tables.
- **A second renewal dated the same day** as the first is not counted (same renewal day = an edit). It is still in
  History as "Edited · Expires a → b".
- **`pb:quota` wording.** The 60-changes-a-day refusal shows the app's existing text "Too many tickets for now (40
  open on a job, 200 a day)". Rare; the text could mention it in a later release.
- **By whom.** `by_user` is the signed-in account that saved. A ticket fixed directly in SQL shows no name in History
  (true: nobody in the company did it) and is in the admin log.
- Tested on local Postgres 16 with a stand-in for `pb_prod.member_name`; live is 17.6. The rolled-back live run is the real check.
- The migration locks `pb_prod.locates` for an instant (1 row today).

## Decisions for Tommy

1. **Switch Renew + History on now?** Recommend **yes**: additive, 49/49 + 31/31, undo file ready, no app release.
2. **History can never be edited or deleted** (not even by you from the dashboard without removing the lock).
   Recommend **yes**: it is the record that a ticket was valid, and renewed, on the day you dug.
3. **Who reads History**: the same people who see the tickets (company account, managers, PMs, foremen; not
   pipelayers). Recommend **keep it that way**.
4. **States where "renewing" means a new ticket number** (FL, WA, OR, TX updates, …): add the state's renew line and
   an editable ticket number to the Renew form in the next app release? Recommend **yes** (small patch, proposed above).
5. **Nevada's two-renewal limit / Utah's 7-day window**: warn in the Renew form, or leave it to the state line from
   #4? Recommend **leave it to the state line**; no extra warnings.

## DONE
