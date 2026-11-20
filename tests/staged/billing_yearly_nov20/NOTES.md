# Billing: Monthly / Yearly for individuals + plan sheets read (Nov 20 2026)

Everything here is STAGED. On the live server I ran SELECT statements only. Nothing applied, deployed, committed or pushed.
No Stripe product, price or link was created, and none is needed for this change (see 1).

## 1. How billing works today (verified)
- **There is no checkout, no Stripe integration, no payment link, and no edge function for billing.** Payment is by hand:
  - A person taps a plan button. The app calls `pb_plan_request(p_kind)`. That writes a row in `pb_billing.plan_requests` and a note to Tommy in `pb_support.messages` ("Price shown: $15.00 a month or $144.00 a year, plus tax.").
  - Tommy sees the request in Beta Accounts and taps **Turn On** (`pb_owner_individual_on`). Before this change that **always started a monthly plan** (`individual_open(p_user, 'month')`, hard-coded).
  - Tommy sends the invoice from Stripe himself. The Make Paid form says it: "You send the invoices from Stripe; this records the deal" (`_src/index.html` ~40862).
  - When an invoice is paid he taps **Paid** (`pb_owner_individual_paid`).
- `stripe_customer_id` / `stripe_subscription_id` columns exist in `pb_billing.accounts`, but nothing uses them. 0 billing accounts and 0 individual accounts on live.
- **The server could already record a year** (`individual_accounts.billing_interval`, `year_cents` 14400; `pb_owner_individual_paid(p_user, p_from, p_interval)` takes `'year'`). Three gaps blocked yearly:
  - the app never let the person pick;
  - Turn On always made it monthly;
  - the Paid button never sent the interval.
- **Plan reading is already logged per sheet.** `pb_plans.sheets` has `state = 'done'` and `read_at`, set once by `pb_plans_svc_put`.
  - Nothing moves a sheet out of `done`, and no function deletes sheets or sets (checked every function body on live).
  - Users have no table grants on `pb_plans`.
  - So this table is a reliable "sheets read" record. **No new tracking was needed.**
  - `ai_usage` `plans_strong` is a different thing: Ask questions about the plans, not sheet reading.
- Live today: **DIG Civil Construction, 54 sheets read, all in November** ($15.07 of cost), plus 21 failed (not counted).
  - Individuals cannot add plan sets at all (`pb_plans_begin` refuses with "Plan sets are for company accounts"), so the individuals' count is always 0 today. It is still returned so the screen is right if that ever changes.

## 2. What is built

### Server: `sql/01_yearly_sheets.sql` (one migration; undo: `sql/undo_01_yearly_sheets.sql`)
- `pb_billing.plan_requests.billing_interval` is a new column: nullable, `month` | `year`.
- `pb_plan_request(p_kind)` keeps the **same signature**.
  - New values: `'individual:month'` and `'individual:year'` store the pick. The note to Tommy says "Picked yearly: $144.00 a year, plus tax."
  - `'individual'` and `'company'` work exactly as before, so the old app keeps working.
  - If the person changes their mind while the request waits, the pick is updated (still one row).
- `pb_owner_plan_requests()` adds `interval` to each request.
- `pb_owner_individual_on(p_user, p_interval default null)` replaces the 1-argument version (dropped and recreated, same grants: `authenticated` only).
  - The period used is, in order: the interval passed in, else the person's pick, else monthly (as before).
  - It returns the account.
  - The old app's call `{p_user}` still works.
- `pb_owner_sheets_read()` is new and admin-only (same `admin_ok` gate as the other owner functions). For every company and individual it returns sheets read **this month, last month and in all**, this month's cost, and the same three numbers for everyone together.
  - A sheet counts once, when read. Sheets in a removed set still count.
  - Months are UTC calendar months, the same clock as the billing dates.
- A guard at the top refuses to run unless the 3 replaced functions have the exact md5 I read on live on Nov 20, or are already this file's version. It runs in one transaction, so a failed guard rolls everything back. Applying it twice is safe (tested).
- **Tests (local Postgres 16; the pricing build's replica of live plus the Nov 20 pricing migration; the 3 functions' md5 match live):**
  - `sql/local/run_local.sh`: migration applied twice, then `sql/tests/t01.sql`. **All pass.** It covers requests with and without a pick, changing the pick, company requests unchanged, non-admins refused, Turn On by pick, explicit interval and default monthly, the old call shape, Paid for a year, sheets counts (this month, last month, total, cost, removed set, failed and waiting sheets not counted), and anon cannot execute.
  - `MODE=undo`: undo applied twice; all 3 functions are back to the live md5, and the grants match live.
  - `MODE=live`: the live-shaped file passes and leaves nothing behind.
- `sql/tests/live_t01.sql` (md5 7c6d121d…) is the migration plus checks. It ends with an error on purpose, so it all rolls back. The test data is fake users and a fake company, inside the rollback.

### App: `patches/01_yearly_app.py` (on `_src/index.html` r17.11, md5 3813d6f2…; 26 exact-once swaps; all 22 inline scripts pass `node --check`)
- **What people see.** Every place that offers the individual plan now has two buttons, **Monthly $15** and **Yearly $144 (save $36)**:
  - no plan yet;
  - removed from a company (plus Not Now);
  - beta ended for a crew member. There the buttons read "My Own Plan: Monthly $15" and "My Own Plan: Yearly $144 (save $36)", next to Company Plan.
  - The price line reads "$15 a month, or $144 for a year ($12 a month, save $36), plus applicable tax."
  - After the tap it says back what they picked: "Request sent: yearly, $144 a year ($12 a month), plus applicable tax. You'll get an email with how to pay."
  - Settings › What each plan includes adds "save $36".
  - All the numbers come from the server's price list (the saving is 12 × monthly − yearly).
- **Tommy's Billing (Beta Accounts):**
  - Each plan request shows the pick ("wants their own plan, yearly ($144.00 a year)"), with **Turn On Monthly** and **Turn On Yearly**. The person's pick is the solid button.
  - Each individual row says monthly or yearly, and has **Paid** plus **Paid for a Year Instead ($144.00)**, or "…a Month Instead". Both use the server function that is already live.
  - **Plan sheets read** shows on every company card ("54 this month · 3 last month · 57 in all") and once for everyone at the top of Billing due.
  - The due row for a company with plan reading on shows its counts next to "add $1 for each sheet read".
  - The "Billing doesn't show sheets read yet" wording goes away once the server answers.
- **Old server:** no sheets lines and the old wording. Turn On Monthly falls back to the old call. Turn On Yearly says "Yearly needs the billing server update first. Nothing was changed." The request still goes through, and the server reads `individual:year` as a plain individual request.

### App tests (fake server, 390 px, port 10300)
- `tests/t_yearly_app.js` (from the pricing build's `t_price_app.js`, updated for the two buttons): **56 of 56 pass** (`tests/out_t_yearly_app.txt`). Screenshots in `shots/`.
- `t127_billing0_v2.js` (the pricing build's copy): **40 of 40 pass.**
- `t133_onetap_text.js`: all pass. `t130_onboard.js`: see `tests/out_t130.txt`.
- `t98_betaend.js` and `t99_removed.js` (print-only scripts) click the old buttons (`data-plan="individual"`, `data-own="1"`), so they time out on the patched page. `tests/t98_betaend_v2.js` and `t99_removed_v2.js` change only the selector, and their output is right (`out_t98_v2.txt`, `out_t99_v2.txt`).
  - In t99, "line hidden=false" after Not Now is the same on live r17.11: the No plan yet card shows. It is not from this change.

## 3. What Tommy must do
**Nothing in Stripe is required for this change.** You already invoice from Stripe by hand; the app now tells you monthly or yearly. If you want ready-made Stripe prices to invoice from, make these yourself in the Stripe Dashboard (I did not create anything):
1. Product catalog › **+ Add product** › name "Pipelayer's Bible — Individual plan".
2. Add a price: **Recurring, $15.00 USD, Monthly**. Save.
3. On the same product, **+ Add another price**: **Recurring, $144.00 USD, Yearly**. Save.
4. (Later, for plan reading) a product "Plan reading": a **One-off price, $1.00 USD** per unit. On an invoice, set the quantity to the sheets read last month, as shown in Billing.
5. Turn tax on the same way your company invoices are set up (prices are "plus applicable tax").

No price ids go into the app or the server. If online card checkout is ever wanted, that is a separate build.

## 4. Apply order (the lead)
1. **Prove it on live (rolled back):** paste `sql/tests/live_t01.sql` (md5 7c6d121d602e9e0a99aa72a3d3df4630) as one query. Success is an error starting `RESULT: {"checks": "all passed"}`. Anything starting `RESULT: FAIL` or `pb_patch:` means stop.
2. **Apply `sql/01_yearly_sheets.sql`** (md5 bf0fa627ca4bb6af0a7c596e03d14bae) as one migration.
3. **Check (read only):**
   - `select public.pb_owner_sheets_read();` as the admin shows DIG Civil month 54 / total 54 (as of Nov 20).
   - `select pg_get_function_identity_arguments('public.pb_owner_individual_on(uuid,text)'::regprocedure);`
4. **App:** `python3 patches/01_yearly_app.py <_src/index.html> <out>`, bump the build, then `PB_URL=… NODE_PATH=/opt/npm-tools/node_modules node tests/t_yearly_app.js` (expect 56 pass), then the usual regression with the t98/t99 `_v2` copies.
5. **Undo, if needed:** `sql/undo_01_yearly_sheets.sql`. The app keeps working on the old server.

Server first or app first both work; server first is better, so Turn On Yearly works from the first day.

## 5. Things to know
- **Re-uploading the same PDF after removing it reads it again** (`pb_plans_begin` reuses a set only when it is not removed), so those sheets are counted and charged twice. That is rare. Tommy can see it in the counts.
- Sheets read are counted by **calendar month (UTC)**, not by each company's billing period. Invoice last month's number.
- After **Paid for a Year Instead** the row says "Marked paid for the year"; the "monthly" label updates when Billing is opened again.
- The new wording is English only. The Spanish dictionary needs: "Monthly", "Yearly", "save", "Request sent: yearly/monthly…", "My Own Plan:".
- `ai_usage` `plans_strong` is not used for the sheet count, on purpose: it counts questions, not sheets.

## 6. Decisions for Tommy (3)
1. **Turn plan reading on for customers at $1 a sheet now that Billing shows sheets read?** *Recommend: yes, after this ships. Invoice last month's count as shown.*
2. **Should a company's owner see their own sheets-read count** (on their Home or Crew Members), not only you? *Recommend: yes, a later small build, so the $1 a sheet line on their invoice is never a surprise.*
3. **Removed-then-re-added plan sets are read and charged again.** *Recommend: leave it as is for now (rare); if it happens, credit it by hand.*

## DONE
