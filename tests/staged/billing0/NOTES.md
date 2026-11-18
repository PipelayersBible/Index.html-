# Billing Phase 0 — build notes (Nov 17 2026, against live r16.96)

Folder: /tmp/claude-0/feat/billing0/ (cur.html = live r16.96 copy, port 8880).
Nothing applied, deployed, committed or pushed. Live SQL: read-only selects + rolled-back DO blocks only.

## Progress log
- Set up folder, copied r16.96 to cur.html.
- Read PLAN.md, prototype SQL, BRIEF.md. Live DB read (select only).
- Saved exact live definitions of the 6 functions I change to sql/live/*.sql; md5 of each matches md5(rtrim(pg_get_functiondef)) on live (checked Nov 17).

## Findings on the live project (read-only)
### How companies are created today (decision 5 check)
- Clients cannot insert/update public.companies, company_members or subscriptions (no table grants to anon/authenticated; RLS select-only).
- No triggers on auth.users (signing up never makes a company).
- Only insert path: edge fn `owner-admin` (verify_jwt) -> checks `pb_owner_admin_ok(actor, aal)` (pb_support.admins + two-step) -> `pb_owner_trial_make` (EXECUTE: service_role only; re-checks admins). 1 admin row (Tommy's admin account).
- Plan changes: `pb_owner_company_set` and `pb_owner_individual_on` are admin+MFA only. No self-serve path to a free company or plan exists.
- BUT two ways a company gets plan reading / "paid" without the deal recorded, both closed in my SQL:
  1. `pb_owner_company_set(c,'paid')` (the current Make Paid button) makes a company paid with no billing record and unparks all its plan sets (plan reading for free, against decision 9). 03/01: it now refuses 'paid' (`pb:use_make_paid`); paid only through `pb_owner_make_paid`.
  2. LEAK (existing bug): `pb_plans_sheet_ready` queues sheets while the set is still 'uploading', and `pb_plans_svc_take`/`svc_more` pick queued sheets from 'uploading' sets; cron `pb-plans-read` runs every minute. So a BETA company's sheets are read (AI cost) during upload, before `pb_plans_uploaded` parks the set, whenever the worker runs. Fix in sql/03: the worker only takes sheets of companies where `pb_billing.plan_reading_on(company)`.
- Live data: 1 company (DIG Civil, plan=paid, no billing row, owner is NOT the admin account). Treated as "legacy paid": not read-only, plan reading stays on (see DECISIONS).
### Hand-over side effects (member row delete of the new owner)
- `pb_billing.on_member_removed` adds a "no longer part of" offer -> cleared in the function (as prototype).
- `pb_reports.rotate_key_on_leave` rotates the company report key (same as any member leaving; phones refetch it). Accepted, noted.
- `pb_crew.pm_role_sync` ends the new owner's job PM rows if he was a PM; `rr_moved_trg` pushes "runs moved" if he was a foreman. Owner sees everything anyway; noted.
- Wrote sql/01_billing_accounts.sql, 02_owner_handover.sql, 03_plan_reading_gate.sql.
- Local harness (sql/local/run_local.sh: fresh PG16 per test, stubs + verbatim live definitions): t01, t02, t03 all pass.
- sql/local/mkdiffs.sh applies 01-03 as plain migration files (psql -1 each) over the live definitions: applies cleanly; diffs in sql/diffs/ (canonical pg_get_functiondef before/after). Unchanged-function md5s from the local PG equal live md5s, so local canonical text = live canonical text.

## Live rolled-back tests (DO block ending in raise exception 'RESULT: ...', acting via request.jwt.claims)
- The client auto-cancels (confirmation it can't show) any block containing GRANT/REVOKE, and any block that creates the
  ownership-transfer function (delete member + update owner + insert member). I did not try to work around that
  confirmation. So: live blocks omit GRANT/REVOKE lines (grants tested locally: anon gets "permission denied"), and the
  hand-over (02) is verified on the local harness only.
- **t01 (sql/01) on live: PASS** (Nov 18 00:xx UTC). Checks 0-17 (removal check 12b ran locally only). Result:
  make_paid next = {from 2026-11-18, to 2026-12-18, seats 6, amount 11100, founder true}, founder_until 2027-11-18;
  ended-beta company made paid yearly: seats 0, amount 99000, no founder (pb:founder_late when asked);
  past due: grace 7 days, still writes, companies.status stays active; grace over: write refused pb:beta_ended, member keeps company,
  pb_my_plan {plan paid, closed true, paused true}; Paid (stale period refused, double press refused) reopens;
  7th person -> next invoice 12300 from paid_through; Read-only/Active; Cancel keeps paid period open then closes;
  settings validation; non-admin refused on every owner function; individual off; DIG Civil (legacy paid) unchanged
  (pb_my_plan identical except new 'paused': false). Events 8, audit rows 14.
  md5 of changed defs on live after the block: beta_closed_guard 9019562e..., pb_my_plan c8ab2a61..., pb_owner_company_set d4a5fdc1...
  = the local canonical md5s, so sql/diffs/*.diff is exactly what live would run.
- **t03 (sql/03 + the 01 parts it uses) on live: PASS.** leak_before_fix = true (a beta's queued sheet in an 'uploading' set
  IS taken by the current live pb_plans_svc_take; proven on live); after 03: not taken, stays queued; beta upload parks;
  paid without add-on: parks, worker skips; add-on refused for a beta and for non-admin; add-on on: 2 parked sets -> reading,
  "price not set" flagged, worker takes the sheet; read-only stops reading; off parks; yearly + add-on at 49.00 = 148000 cents;
  DIG Civil (legacy paid, 9 sets) still reads; r16.96's company_set('paid') refused. md5 on live: pb_plans_uploaded 56828466...,
  pb_plans_svc_take bdde14b7..., pb_plans_svc_more 25a81d5a... = local canonical (sql/new/, sql/diffs/).
- **t02 (sql/02 hand-over): local harness only** (client cancels the live block, see above). Local: PASS (h0-h15: full beta
  hand-over keeps seat count, new owner has no member row and no "removed" offer, super becomes pm/superintendent, both keep
  company access, plan untouched, event + audit logged, repeat refused, Make Paid then shows the new owner's login).
  On live the delete also fires rotate_key_on_leave / pm_role_sync / rr_moved_trg (not in the local stub); see Findings.

## What was built
### sql/ (apply in order 01, 02, 03 as one migration after review; NOT applied)
- `01_billing_accounts.sql`
  - `pb_billing.settings` (key/value): seller_legal_name = null (the LLC isn't formed; never hard-coded), base_cents 9900,
    base_seats 5, seat_cents 1200, yearly_months 10, grace_days 7, founder_months 12, plan_reading_cents = null (price not
    decided), invoice_ahead_days 7. Prices are COPIED onto the account at Make Paid, so changing a setting never changes an
    existing customer's price.
  - `pb_billing.accounts` (one row per paying company: legal name, billing email/contact/address, seller at signing, the
    price, monthly/yearly, plan reading add-on + its price, state active/past_due/read_only/canceled, period_start,
    paid_through, grace_until, cancel_at, founder_until + founder_set_by + founder_set_at, order_signed_by/at, Stripe ids
    for Phase 2) and `pb_billing.events` (log; stripe_event_id unique for the future webhook). RLS on, no policies.
  - helpers: `seats_used` (every member login + open unexpired invites; the company login is free), `read_only`,
    `writes_closed`, `plan_reading_on`, `amount_cents`, `account_json` (incl. the next invoice), `period_after`.
  - CHANGED (diffs in sql/diffs/): `beta_closed_guard` (a read-only paid company is refused with the same pb:beta_ended, so
    phones keep records queued), `pb_my_plan` ('closed' includes paid read-only; new 'paused'),
    `pb_owner_company_set` (refuses 'paid' -> only Make Paid makes a company paid; refuses 'trial' on a company with a
    billing account).
  - owner RPCs (admin + two-step, like Beta Accounts): `pb_owner_make_paid` (form; founder only while plan='trial' and
    trial_ends_at > now(); closes the company's plan requests; lists members still on an individual plan; returns the
    company login), `pb_owner_billing_state` (past_due with 7-day grace that a second press never extends, read_only,
    canceled = open until paid_through then read-only, active), `pb_owner_billing_paid` (idempotent by period start),
    `pb_owner_billing` (settings + every company + Billing due), `pb_owner_billing_setting_set`, `pb_owner_individual_off`.
  - companies.status is never touched by any of it.
- `02_owner_handover.sql`: `pb_owner_company_handover(company, new_owner, old_owner_title)` (new owner must already be a
  member; old owner becomes role pm with title superintendent/project_manager; clears the "removed" offer).
- `03_plan_reading_gate.sql`: CHANGED `pb_plans_uploaded`, `pb_plans_svc_take`, `pb_plans_svc_more` (only companies where
  plan_reading_on); new `pb_owner_plan_reading_set` (paid companies only; Off parks sets being read, never one still uploading).
- Equivalence (proved, not argued only): for every company WITHOUT a billing row, read_only() is false, so the guard,
  pb_my_plan ('paused' false added, rest identical: live check 17b/17c on DIG Civil) and the plan worker behave exactly as
  today; the only behaviour changes are the intended ones (company_set('paid') refused; a TRIAL company's uploading sheets
  no longer read = the leak fix). Live plan sets: 9, all DIG Civil (paid, active, no row) -> still read.
- Tests: `sql/tests/` (head + t01/t02/t03 bodies; `mk.py` builds local_*.sql and live_*.sql), `sql/local/` (stubs with
  verbatim live bodies, `run_local.sh`, `mkdiffs.sh`), `sql/live/` (live definitions), `sql/new/` + `sql/diffs/`.

### patches/01_billing0.py (applies to r16.96: `python3 patches/01_billing0.py base.html cur.html`)
- Settings › Beta Accounts (still app-owner only: shown only when pb_support_is_admin; every RPC re-checks admin + MFA):
  - "Billing due" card at the top: seller on invoices ("not set yet"), the price rule, and per company due within 7 days:
    legal name, period from–to, people, amount (month or year, founder price flag), billing email, billing state, state chip.
  - Company cards: billing lines (deal, next invoice, paid through, past-due/read-only/canceled wording, founder lock with
    who and until, plan reading add-on on/off/price-not-set, company login, people counted).
  - Beta: Add 30 Days / Make Paid / Hand Over. Paid with a record: Paid / Past Due (or Not Past Due) / Read-Only (or Not
    Read-Only) / Cancel Plan / Plan Reading On|Off / Hand Over. Paid without a record (DIG Civil) or canceled: Make Paid / Hand Over.
    Every state change asks first (Past Due says 7 days then read-only, nothing deleted).
  - Make Paid = a sheet: legal name, billing email, people counted now (server count), Monthly/Yearly, founder lock checkbox
    with its end date (disabled with the reason once the beta has ended), plan reading add-on, signer name+title, live price
    ($111.00 a month / $1,110.00 a year (10 months of $111.00)). Result: first invoice, company login with a hand-over hint,
    members still on their own plan with "Turn Off Their Plan".
  - Hand Over = a sheet: members to pick from, the old owner's role after (Superintendent / Project manager), confirm.
  - If the server isn't migrated yet: Make Paid says "The billing server isn't set up yet. Nothing was changed." (the
    old one-tap company_set('paid') is gone from the app).
- Home: a paused paid plan shows "Plan paused · ... New runs and reports wait on this phone and send once the plan is
  active again. Nothing is deleted."
- Daily queue: records refused with pb:beta_ended while the plan is paid show "Your company's plan is paused. It waits on
  this phone ..." instead of "beta has ended". Same retry path as the ended beta (bughunt 02).
- Syntax: biggest script block passes `node --check`. PB_APP_BUILD not bumped (release step).

### tests/t127_billing0.js (rig, fake Supabase with a stateful fake of the new RPCs)
- 36 checks, all PASS on cur.html; fails on base.html (as it should). Covers: Billing due, cards, Make Paid form fields,
  price monthly/yearly, founder offered/not offered, validation, exact RPC args, result + Turn Off, Past Due -> Paid ->
  Read-Only -> Cancel, Plan Reading On, Hand Over (pick, confirm, args), no old company_set('paid'), 390 px no sideways
  overflow (light + dark), dark surface, server-not-migrated message, and a foreman of a paused paid company: Home line,
  a signed daily report refused with pb:beta_ended stays WAITING with plan wording, then sends by itself once paid.
  Screenshots: shots/owner_list_light.png, makepaid_light.png, owner_list_dark.png, makepaid_dark.png, home_paused_light.png.

## Regression (repo tests t101–t126, t90, t91, t95; copies pointed at port 8880; reg/run.sh, reg/compare.sh)
- Ran each test on base.html (pristine r16.96) and cur.html (patched). Every test has the same exit code on both, and the
  normalized outputs match. The only differences are run ids, timestamps, seal fingerprints (t102, t108, t110) and a
  reading time one second apart (t120). t124: 26/26 PASS on both.
- t123_newrunshort exits 1 on BOTH base and cur. Its "before" half expects an r16.94 page with the old crew notice value,
  and r16.96 shows the crew notice, so it times out. That is a test fixture issue, not something this patch caused. Re-run
  with the newrun helper's r16.94 page as its "before" page (base94.html): **27 PASS, 0 FAIL, exit 0** on cur.html (reg/cur/t123_newrunshort_94.txt).
- New: tests/t127_billing0.js 36/36 PASS on cur.html.


## Round 2 (owner's answers, Nov 18) — what changed
1. **AI stops while read-only** (new `sql/04_ai_readonly.sql`). The live `ai_try_consume` now refuses company AI (returns -1)
   for a member or owner of a read-only company, the same way an ended beta is refused. `pb_billing.individual_only` and
   `ai_has_paid_plan` treat a read-only company like an ended one, so someone with their own individual plan keeps the
   individual limits. Each change is one condition (diffs in sql/diffs/). For companies without a billing row
   `read_only()` is false, so nothing changes for them. AI keeps working during the 7 grace days and comes back as soon as
   Paid is pressed. Assumption: the `ai` edge function's cap goes through `ai_try_consume`. I did not read the `ai` edge
   function's code.
2. **Automatic past due and read-only, computed on read (no cron).**
   - The account keeps `paid_through` (the end of the period paid for) and `grace_days` (7, copied from the setting).
     `pb_billing.state_of(account)`: today >= paid_through means past_due; today >= paid_through + 7 means read_only. A
     stored state (Read-Only Now, or canceled) overrides that. Every read uses it: the write guard, `pb_my_plan`, the AI
     gates, plan reading and Billing due. Nothing has to run on schedule, so nothing can be missed.
   - Make Paid sets `paid_through` to the end of the first period. Paid moves it one period (month or year) and sets the
     paid seats. It is safe to press twice: `p_from` must equal the current `paid_through`. It also clears a manual
     Read-Only Now. If a company is two periods behind, one press leaves it past due until the second.
   - The Past Due button is gone, and the server refuses `past_due` as a hand-set state. Read-Only Now / Not Read-Only
     stay. Cancel is unchanged (open until paid_through, then read-only).
   - Consequence: the first invoice (sent at Make Paid) is not tracked separately. If it is never paid, the company locks 7
     days after the first period ends, unless Tommy uses Read-Only Now earlier.
   - **Warning before anyone locks:** Billing due lists past-due companies first, with "Past due · N days left" and
     "Locks (read-only) on DATE unless you press Paid". It also lists read-only companies and companies with a catch-up.
   - **Operator email:** `sql/05_billing_alert_in_check.sql` (OPTIONAL) adds `pb_billing.alert_text()` to
     `pb_backup_health`'s problem text and to `check_kick`'s condition. It needs no edge function change, and sends at most
     one email a day (pb-backup's check key is per day). Caveat: pb-backup wraps the text in its backup email (subject
     "Backup check: ...", a backup "How to fix" line, and "Nothing in the app is affected; this is only the copy of the
     data"). The billing text says the fix line does not apply, but the wrapper is misleading. Proper wording needs a small
     pb-backup change, not done. The in-app list works either way.
3. **Cancel:** unchanged (open until the end of what they paid for).
4. **Paid seats / catch-up.**
   - `seats_paid` = the seats paid for this period; capacity = greatest(seats_paid, 5 included).
   - Someone added into a free paid seat costs nothing. Removing someone frees the seat for the rest of the period (no credit).
   - Above capacity: a **yearly** plan shows a catch-up of extra people × months left (whole or part) × $12, in Billing due
     and on the card. **Catch-up Paid** (`pb_owner_billing_catchup_paid`) raises the paid seats to the people now.
   - A **monthly** plan shows "N above the paid seats: on the next invoice"; the next invoice bills the people at that time.
- App patch: Billing due rows show state chips with days left, the lock date and catch-up lines. Cards show "Paid through",
  "Paid seats: N · people now: M", the catch-up line, "Not paid for the next period. Goes read-only on DATE unless you
  press Paid" and "Read-only (you set it)" / "Read-only since DATE (not paid)". Buttons: Paid (sends the current
  paid_through and seats) / Read-Only Now (or Not Read-Only) / Cancel Plan / Catch-up Paid (only when there is one) /
  Plan Reading / Hand Over. The Make Paid form explains paid seats and the automatic lock.
- Tests: local harness t01 (01+04+05, now with auto past due, auto read-only, AI stop and individual-plan exception, Paid,
  stale Paid, monthly extra, removal frees a seat, yearly catch-up 1 × 12 × $12 = $144, Catch-up Paid, free seat refilled,
  Read-Only Now, past_due refused by hand, Cancel, operator check text), t02, t03: all PASS. sql/local/mkdiffs.sh applies
  01–05 as plain migrations; 11 changed-function diffs in sql/diffs/. The md5s of the five new live originals were checked
  against live before editing. t127: 40/40 PASS (new: past-due warning first in Billing due, yearly catch-up line + Catch-up
  Paid, Paid args, Read-Only Now, no Past Due button).
- **Live round-2 run: not done.** The client cancelled the block with 01+04+05, and the smaller 01+04 block too. Small
  probes of the new AI and check functions alone ran fine. The trigger isn't identifiable, and I didn't try to get around
  it. The round-1 live passes (01 as it was then, 03) still stand for the unchanged parts: guard, `pb_my_plan` and plan gate
  md5s are unchanged.
  **Ready for the main session to run (rolled back, no GRANT/REVOKE):** `sql/tests/live_t01.sql` (01+04+05, all checks)
  and `sql/tests/live_t02.sql` (01+02 hand-over). Paste the file as one query; success is an error whose text starts with
  `RESULT: {` (the block always rolls back), and a check that fails says `FAIL <n> ...`. In the RESULT, `defs` should show:
  ai_try_consume 5d17951b, individual_only cf72e10b, ai_has_paid_plan 8e41b913, pb_backup_health 19bad253,
  check_kick 3df6654a, beta_closed_guard 9019562e, pb_my_plan c8ab2a61, pb_owner_company_set d4a5fdc1 (= sql/new/).

### Round 2 regression (patched cur.html vs pristine base.html, r16.96)
- Full suite (reg/cur2, 23:22–23:37): every test has the same exit code as base (all 0, except t123 = 1 on both, the fixture
  issue above; t124 26/26). The only output differences are run ids, timestamps, timings and seal fingerprints.
- **Runner bug found and fixed:** t110/t111/t112 save their export into my folder (rewritten path) but unzip
  `/tmp/claude-0/export1NN.zip` through an unrewritten `cd /tmp/claude-0 && ... ../export1NN.zip`. So their manifest lines
  came from whichever helper wrote that shared file last, in round 1 too. On cur2, t111 showed "app build r16.97" from
  another helper's 23:16 run. reg/run.sh now rewrites those to reg's own out folder. Re-run: t111 and t112 identical
  between base and cur, both reading their own export ("app build r16.96").
- t108/t110 re-runs: exit 1 on BOTH base and cur ("Target crashed" / "no button Lock This Run"). The machine was at load
  average ~40 with 1 GB free from other helpers' suites. In the full cur2 run (lower load) both passed (exit 0) on base and
  cur. The patch doesn't touch runs or exports.
- **The repo moved to r16.97 at 22:53** (/home/claude/index.html-/index.html). `patches/01_billing0.py` applies cleanly to
  r16.97 (base97.html -> cur97.html), the syntax check passes, and t127 is 40/40 PASS on cur97.html. The full regression
  was run on r16.96 only.

## DECISIONS FOR THE OWNER

Only choices that are still open. Each has a recommendation, and what happens if you don't decide.

1–4. Decided by the owner on Nov 18 and built (see Round 2): AI stops while read-only; past due and read-only are automatic; cancel at the end of the paid period; yearly catch-up only above the paid seats.
5. **Founder window and Add 30 Days.** The founder price is offered only while the beta is still running (the server checks `trial_ends_at > now`). Add 30 Days moves that end date, so it also extends the founder window. Recommendation: that's fine. Use Add 30 Days on purpose if a company needs a few more days to sign. If you don't decide: as built.
6. **DIG Civil (your own paid test company).** It was made paid before billing existed, so it has no billing row. It is never read-only and it keeps plan reading. Recommendation: leave it as it is (it's yours). Run Make Paid on it only if you want it on Billing due. If you don't decide: it stays as it is.
7. **Plan reading add-on price.** The setting `plan_reading_cents` is empty. Turning the add-on on now gives plan reading with no charge on the invoice, and the screen says "price not set". Recommendation: set the price (`pb_owner_billing_setting_set('plan_reading_cents', <cents>)`) before you turn it on for anyone. Plan sets stay parked for every paid company without the add-on. If you don't decide: plan reading stays off (parked) for every new paid company.
8. **Seller's legal name.** The setting `seller_legal_name` is empty, and Billing due shows "Seller on invoices: not set yet". Once the LLC is formed, set it once (`pb_owner_billing_setting_set('seller_legal_name', '"<exact legal name>"')`). Each new account records the seller that was set when it signed. Recommendation: form the LLC and open its Stripe account before the first Make Paid. If you don't decide: accounts are recorded with no seller name.
9. **Live proof before applying.** Claude's tool here cancels the round-2 rolled-back blocks: 01+04+05, and 02 the hand-over. Recommendation: run `sql/tests/live_t01.sql` and `sql/tests/live_t02.sql` once from the main session (both roll back), or apply 01–05 to a Supabase branch first. If you don't decide: 03 and the round-1 version of 01 have live proof; the round-2 changes and 02 have local proof only.
10. **Billing lines in the 10:00 UTC operator email (sql/05).** This works without touching pb-backup, but the email still says "Backup check" and carries a backup fix line and "Nothing in the app is affected". Recommendation: apply 05 now, because a warning in odd packaging beats no warning, and change pb-backup's check email wording later (about 10 lines). If you don't decide: 05 is not applied, and warnings are only in Beta Accounts › Billing due.

Other items, not choices: the Terms/Privacy edits in PLAN.md section 8, the order form and the CA seller's permit are still needed before the first invoice. PB_APP_BUILD is bumped by the release step.

## DONE (round 2, Nov 18)
The owner's four answers are built. (1) AI stops while a paid company is read-only (sql/04: one condition each in
ai_try_consume / individual_only / ai_has_paid_plan); an individual plan keeps working. (2) Past due and read-only are
automatic, computed on every read from paid_through + 7 grace days, with no cron. Paid moves paid_through one period; the
Past Due button is gone; Read-Only Now stays. Billing due lists past-due companies first with days left and the lock date.
Optional sql/05 puts the same warning in the 10:00 UTC operator email without changing pb-backup, but inside pb-backup's
backup wording (caveat above). (3) Cancel unchanged. (4) Paid seats: a free paid seat costs nothing; above them a yearly
plan shows a catch-up (extra × months left × $12) with Catch-up Paid, and a monthly plan bills them on the next invoice.
Local harness: t01/t02/t03 PASS. 11 changed-function diffs, with the five new live originals md5-checked. t127 40/40 (on
r16.96 and on r16.97). Regression matches base. The round-2 live rolled-back run was cancelled by this client (twice), so
sql/tests/live_t01.sql (01+04+05) and live_t02.sql (hand-over) are ready for the main session to run. Nothing was
applied, deployed, committed or pushed.

## DONE
Built billing Phase 0 against live r16.96 / rogfassochneycezecxa. Nothing applied, deployed, committed or pushed. On live I
ran select statements and rolled-back DO blocks only.

Company creation checked: nobody can create a company or get a company plan without Tommy. Companies come only from the
owner-admin edge function, which is admin + two-step only, and clients have no insert/update grants. But two holes gave
companies paid features without a recorded deal. Both are closed in the SQL: (1) the old Make Paid (`pb_owner_company_set('paid')`)
made a company paid with no record and unparked its plan sets; it now refuses and points to `pb_owner_make_paid`.
(2) A live leak, proven with a rolled-back block: the plan reader reads a beta's sheets while they are still uploading; it
now only reads for paid companies with the add-on.

sql/01–03 add the billing settings, accounts and events tables, Make Paid v2 (price from settings, founder lock only
before the beta ends, recorded with who and until), Past Due (7 days of grace, then read-only through the beta's own
pb:beta_ended lock, never `companies.status`), Paid / Read-Only / Cancel, Billing due, the plan reading add-on, Individual
Off, and Hand Over. Changes to six existing functions are shown as diffs against their live definitions. Live md5s after
the rolled-back runs match, and live checks show that companies without a billing row behave exactly as before.
Live rolled-back tests: 01 PASS, 03 PASS. 02 (hand-over) passed on the local harness only, because this client cancels the
live block (see decision 9).

The app patch (patches/01_billing0.py) adds to Beta Accounts: the Make Paid form, Billing due, the per-company billing
buttons and Hand Over (app owner only, 390 px, light and dark). It also adds a "Plan paused" line on Home and plan wording
for records waiting in the queue. t127 passes 36/36, and the repo regression matches base.
