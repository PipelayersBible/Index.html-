# Pricing build (Nov 20 2026) — notes, v2 (Tommy's Nov 20 decisions applied)

Everything here is STAGED. Nothing was applied to the server, deployed, committed or pushed. On the live project I ran
SELECT statements only. The SQL was tested on a throwaway local Postgres, not on live. The first version of every file
I changed is kept beside it as `*_v1` (`NOTES_v1.md`, `sql/01_pricing_limits_v1.sql`, `patches/01_pricing_app_v1.py`, …).

> **v2b (after the lead's first live run of `live_t01.sql`, which failed at check 3h and rolled back).** Cause: live
> `public.ai_usage` has a check that allows six feature names and not `plans_strong`; my local copy of that table had no
> check. Fixed in the migration (the check is widened by one name), in the test (it no longer uses a made-up feature name),
> and in the local replica (it now carries live's constraints and fails the same way without the fix). This also uncovered
> a bug that is live today: see "Strong plan look-ups have never run on live" in section 6. The files from before this
> fix are `sql/01_pricing_limits_v2a.sql` and `sql/tests/live_t01_v2a.sql`.

## 1. The decisions, as built

| | Price | Who counts |
|---|---|---|
| Company plan | **$99 a month**, 5 people included, **$12** each extra person. Yearly = 10 months ($990 + $120 per extra). Founder lock 12 months for a beta that signs before its beta ends. | Every login is a person. The company account (owner login) is free and not counted, with tight limits. Waiting invites count. |
| Individual plan | **$15 a month** billed monthly, or **$144 a year** ($12 a month) billed yearly | One person, no company |
| Plan reading add-on | **$1 a sheet, charged once** when the sheet is read. Questions about the plans later are normal Ask requests. **Off for customers** until Billing can show sheets read. | Company plans only |
| Free tier | None | |
| DIG Civil (Tommy's own company) | Its own high limits; AI stops at **$150 a month** | A row in a per-company settings table, not a company id in code |

What changed from v1: the individual price (was $12 / $120), the plan reading price (was undecided), DIG Civil's own
limits (v1 recommended none), and an undo file. The limits in section 3 are the v1 limits, unchanged.

## 2. Worst-case math

**Margin designed for: worst-case usage cost about 30% of the monthly price**, so it stays under 40% of the money even
on a yearly deal with card fees on top. "Worst case" = every person and the company account at every limit, every day.

**How it is made certain.** Every AI request already reports its real cost to the server (`ai_cost_add`). The staged SQL
keeps a month total per company (or per individual) and stops AI for the rest of the month when the total reaches a
dollar stop. The count limits exist so people see a plain number long before the dollar stop is reached.

Unit costs used (measured where the server logs them):
- Ask question: $0.05 (live log: 3 questions, $0.052 each; 1,183 test runs: $0.032 average, $0.085 at the 90th percentile).
- Plan sheet: $0.28 (54 sheets read, highest $0.57).
- Stake/photo read, cut sheet read, ticket read: **not logged separately yet**. Estimates: $0.06, $0.15, $0.03. The dollar stop does not depend on these.
- Storage $0.028 per GB a month. Bandwidth $0.09 per GB. Server calls $2 per million. Email capped app-wide at 70 a day ($0). Push free. No SMS.

### Per month, worst case

| | 5 people, $99 | 12 people, $183 | 25 people, $339 | Individual, monthly $15 | Individual, yearly $144 ($12 a month) |
|---|---|---|---|---|---|
| AI dollar stop (Ask, stake, cut sheet, ticket) — HARD | $22.00 | $44.75 | $87.00 | $2.50 | $2.50 |
| Uploaded-document AI stop — HARD | $4.00 | $4.00 | $4.00 | $0.50 | $0.50 |
| Storage full to its cap — HARD | $0.31 | $0.50 | $0.87 | $0.03 | $0.03 |
| Bandwidth: whole storage downloaded twice — not capped | $1.98 | $3.24 | $5.58 | $0.19 | $0.19 |
| Server calls: 100,000 per login — not capped | $1.20 | $2.60 | $5.20 | $0.20 | $0.20 |
| **Worst-case cost** | **$29.49** | **$55.09** | **$102.65** | **$3.42** | **$3.42** |
| **Share of the price** | **29.8%** | **30.1%** | **30.3%** | **22.8%** | **28.5%** |
| With card fee (2.9% + 30¢ per charge) | 33.0% | 33.2% | 33.3% | 27.7% | 31.6% |
| Profit left in the worst month, after the card fee | $66.34 | $122.30 | $226.22 | $10.85 | $8.21 |

**Individual, rechecked at $12 a month effective:** the worst month costs $3.42, which is 28.5% of $12 (31.6% with the
one yearly card charge of $4.48). At $15 monthly it is 22.8% (27.7% with the card fee). Both are inside the 30% design and
well under 40%, so the individual limits and the $2.50 stop stay as they were. (In v1, at $12 monthly / $120 yearly, the
same two rows were 33.9% and 37.4%.) Company yearly deals are unchanged from v1: 38.7% / 39.0% / 39.2% with the card fee.

**Plan reading at $1 a sheet:** a sheet costs about $0.28 to read, so 28% (the costliest sheet seen was $0.57 = 57% on
that one sheet). Every sheet read is paid for, so the caps on it (150 sheets, $45 of cost, 3 sets a day per company) are
only a stop against a runaway month. Follow-up questions are Ask requests and sit inside the AI limits above.

**DIG Civil:** not a customer, so no margin. Its most expensive possible month is $150 (AI) + $75 (plan reading) + $20
(document AI, today's number) = **$245**. This month so far it has used $0.16 of AI.

Fixed costs are not in the table (Supabase $25 a month; Resend $0 now, $20 past 100 emails a day).

## 3. Limits (all in `pb_billing.plan_limits()`, one function) — the v1 limits, as Tommy decided

AI requests = Ask questions, stake/photo reads, cut sheet reads, ticket reads.

| | Person on a company plan | Company account (free) | Individual plan | DIG Civil (everyone, incl. its company account) |
|---|---|---|---|---|
| All AI, a day | 25 | 5 | 15 | 300 |
| All AI, a month | 150 | 30 | 50 | 3,000 |
| Ask questions a day (analysis inside it) | 8 (3) | 5 (1) | 5 (2) | 150 (50) |
| Stake/photo reads a day | 15 | 5 | 10 | 200 |
| Cut sheet reads a day | 3 | 1 | 2 | 50 |
| Ticket reads a day | 10 | 2 | 3 | 100 |
| Strong plan look-ups a day | 2 | 0 | 0 | 30 |
| Photo uploads a day | 150 | 20 | 60 | 400 |

| Whole company | Standard | DIG Civil |
|---|---|---|
| AI a day | 12 × paid people (60 for 5) | 2,000 |
| AI a month | 60 × paid people (300 for 5, 720 for 12, 1,500 for 25) | 20,000 |
| **AI dollar stop a month** | $22 + $3.25 × each paid person over 5 | **$150** |
| Photo / sealed-run / cut-sheet storage | 10 GB + 1 GB × each paid person over 5 (individual: 1 GB) | 50 GB |
| Uploaded documents | 200 AI pages and $4 of AI a month, 10 uploads a day (individual: 30 pages, $0.50, 3 a day) | 1,500 pages, $20, 30 a day (what it has today) |
| Plan reading (when the add-on is on) | 150 sheets and $45 of cost a month, 3 sets a day, 150 sheets a set | 250 sheets, $75, 10 sets a day, 250 a set |

"Paid people" = the seats the company has paid for, never fewer than 5. The company account's use counts inside the
company totals. Beta companies keep their own request counts and get a $30 a month dollar stop, 150 photos a day and
10 GB. A signed-in account with no plan can upload 10 photos a day and 0.1 GB.

Three allowances still apply to DIG Civil because they are set in the `ai` edge function, not here: its own daily number
for ticket reads, analysis and strong plan look-ups. The SQL takes the lower of the two.

## 4. What is staged

### Server: `sql/01_pricing_limits.sql` (one migration) and `sql/undo_01_pricing_limits.sql`
- **Seat counting: no change.** `pb_billing.seats_used` already counts member logins plus waiting invites and never the owner login (test 1a).
- **Prices (settings):** `individual_cents` 1500, `individual_year_cents` 14400, `plan_sheet_cents` 100. All three can be changed with the existing Billing setter. `pb_billing.prices()` and `pb_plan_prices()` (no login needed) carry them. The old per-month `plan_reading_cents` setting stays empty and is marked "not used".
- **AI caps for every path through the `ai` function** (`ai_daily_limit`, `ai_try_consume`, `ai_cost_add`, `ai_refund` replaced; `ai_pool`, `ai_who`, `ai_block` new). No edge function deploy.
- **Per-company limits (new in v2):** table `pb_billing.limit_overrides (company_id, limits, note)` and `pb_billing.limits_of(company)`. A row holds only the numbers that differ; no row = the standard limits. Every gate reads through `limits_of`: the AI gates, `pb_my_limits`, photo/storage room, plan reading (`pb_plans.limits_for`) and uploaded documents (`pb_docs.limits_for`, which exists on live and is replaced). **No company id is written in any function.** The migration adds one row, found by owner login `tfontaine@digcivil.com` and name `DIG Civil%` (on live: "DIG Civil Construction", id d01a4a5f…, plan paid, no billing account, 3 members). To change it later: one `update pb_billing.limit_overrides set limits = … where company_id = …`; to remove it: delete the row. Both take effect at once.
- **`public.ai_usage` feature check (new in v2b):** `plans_strong` is added to the allowed names (drop and re-add of `ai_usage_feature_check`; the six old names stay). Without it the gate cannot count a strong plan look-up.
- **`pb_my_limits(feature)`** tells the app which limit was reached, with the numbers.
- **Uploads:** `pb_storage_put_ok` also applies the plan's daily cap and the total size. Storage policies untouched.
- **Plan reading:** the default caps are lowered (was 1,500 sheets / $300 / 20 sets a day). v1's "allowance follows a monthly price" is gone, because the price is now per sheet. The per-company on/off switch is the existing one and is untouched.
- **Documents:** `pb_docs.limits` numbers lowered.
- **Individual plan billing record:** `pb_billing.individual_accounts` copies both prices when the plan starts (`cents` 1500, `year_cents` 14400). Paid moves it one period; a yearly period is $144.00, not 10 months. Not paid 7 days past the date: AI stops by itself. The two individual plans that exist today have no record and are unchanged.
- **`pb_my_plan`** carries the price list. **`pb_plan_request`**'s note to Tommy says the price shown: "$15.00 a month or $144.00 a year, plus tax".
- Seven existing functions are patched by an exact text swap that refuses to run unless it finds the old text exactly once.

### Is it safe to apply on live? Yes, with these facts
- **Additive.** New: 3 settings rows, 3 tables (`ai_pool`, `individual_accounts`, `limit_overrides`), 14 functions. Nothing that exists today is dropped. Two existing things are edited: the note text of one unused setting, and the `ai_usage` feature check, which is widened by one name (every row there today already passes it; the re-add takes a short lock on a 39-row table). It runs in one transaction, and any failed self-check rolls all of it back. Applying it twice is safe (tested).
- **Live matches what it was built against.** I re-read the md5 of the 19 functions the build replaces, patches or leans on, on live today (Nov 20): the same as the local copies, apart from the two known ones (`ai_daily_limit` by a comment, `pb_docs.limits` by line ends), which are replaced in full. None of the new tables or settings exists on live yet.
- **What current users will notice — only the new caps:**
  - The two beta companies (Scorpion Backhoe, Carrillo Underground): request counts unchanged; added: a $30 a month AI dollar stop, 150 photos a day (was 400), 10 GB. Neither has logged any AI cost this month.
  - DIG Civil: its own high limits (section 3). Without its row, Tommy's company account would have dropped to 5 AI requests a day.
  - The two existing individual plans: 15 AI requests a day (was 10), 50 a month (was 200), $2.50 dollar stop.
  - An account with no plan: 10 photos a day and 0.1 GB (was 400 a day). That includes Tommy's separate admin login.
  - DIG Civil only, in practice: strong plan look-ups start working (section 6). Customers have no read plan sets, so nothing changes for them.
  - Storage today is 17 files, 0.009 GB in all, so nobody is near a size cap.
- **Undo file:** `sql/undo_01_pricing_limits.sql` puts back the old text of every replaced or patched function, removes the 3 settings and the new functions, puts the `ai_usage` check back to six names (after deleting any `plans_strong` counts), and keeps the 3 new tables. Proven by `sql/local/run_undo.sh`: migration, then undo twice, and all 17 old functions have their old md5 again (the two named above come back with their **live** md5).
- **Local replica re-synced with live (v2b).** Read from live today: every check constraint and foreign key on the 11 tables the migration and the test write to, and the md5 of 47 functions the local base holds. 40 functions are identical; the other 7 are the known stand-ins (`auth.uid/role/jwt`, `pb_prod.my_company`, `pb_plans_begin`) and the two replaced in full (`ai_daily_limit`, `pb_docs.limits`). The constraints the replica lacked (the `ai_usage` feature and count checks and its user foreign key; role, status, body and message-id checks) are now in `sql/local/stubs2.sql`. Proof it bites: with the constraint fix taken out of the migration, the local run fails with the same `ai_usage_feature_check` error the lead saw.
- **Not proven:** the live run itself. The first live run failed (above); the fixed `sql/tests/live_t01.sql` has not been run on live yet.

### Server tests (rolled back)
- `sql/local/run_local.sh` (fresh local Postgres 16 = what is live now, plus a stand-in DIG Civil): migration applied twice, then the test. **14 groups, 105 checks, all pass.** `MODE=block` (migration inside one rolled-back block) passes. `MODE=live` runs the lead's file itself on the local base: **passes (101 checks)**.
- New group 14: exactly one company has its own limits; its company account and members get 300 a day and the $150 stop; a test company with the same row makes 40 Ask questions from the company account and 100 requests from one member in a day, goes past $22, and stops at $150.10; photos, storage, plan reading and documents follow the row; every other company keeps the standard limits; removing the row puts the standard limits back at once.
- `sql/tests/live_t01.sql` (md5 bcc89520…): ends with an error that starts `RESULT: {`, so everything rolls back. A failed check says `FAIL <n> …`. It inserts test users, companies and storage rows inside the block. On DIG Civil's real people it only reads. I read the triggers it will fire on live (`company_members`, `pb_billing.accounts`, `storage.objects`): none sends email or push.

### App: `patches/01_pricing_app.py` (applies on `/tmp/claude-0/r1711/src.html`, md5 679cf8ad…; 21 exact-once swaps; all 22 inline scripts pass a syntax check)
- Individual price everywhere it is said: "Your own plan is $15 a month, or $144 for a year ($12 a month), plus applicable tax." (beta ended, removed from a company, no plan yet), and after the request: "You'll get an email with how to pay: …".
- Settings › What each plan includes: "Individual plan: $15 a month, or $12 a month billed yearly ($144 a year)." New paragraph: "Plan reading (add-on for company plans): $1 a sheet, charged once when the sheet is read. Questions about your plans after that count as normal Ask requests. It isn't turned on yet: plan sets you add are kept and you can still open the sheets."
- After a plan set is sent while reading is off: "Plan reading for Ask is an add-on on a paid plan: $1 a sheet, charged once."
- App owner's Billing: the price line reads "… · individual $15.00 a month or $144.00 a year · plan reading $1.00 a sheet". The places that said "price not set" now say "$1 a sheet, charged once when read", and that Billing doesn't show sheets read yet. The Make Paid tick box says "Leave it off for customers until Billing shows sheets read."
- Everything else is as in v1 (company price on Home and Crew Members, limit-reached messages, individual plans due with **Paid**). All prices come from the server's list; the built-in numbers are the same and are used until it answers.
- Works with the old server: no "No plan" card, old limit message, built-in prices.

### App tests
- `tests/t_price_app.js` (fake server, 390 px): **44 of 44 pass** on the patched r17.11 page. Screenshots in `shots/`.
- Regression on the patched page: t130 onboarding 70/70, t133 10/10, t127 billing 40/40 **once two wording checks are updated** (it looked for "price not set yet"; unchanged it gives 38/40). `tests/t127_billing0_v2.js` is the copy with those two lines changed.
- Not re-run in v2: b03, b04 and the Ask / stake / ticket comparisons (their logs in `tests/out/` are from v1), and the full regression (shared machine rule).

### Website: `website/pricing_section.md` (draft, not pushed)
Individual $15 a month or $144 a year in the section, the strip and the FAQ; the plan reading line with its price. `tests/t_website_text.py`: 11 of 11 pass (numbers match the staged settings and the app patch).

## 5. What the lead runs, in order
1. **Prove on live (rolled back):** paste the fixed `sql/tests/live_t01.sql` (md5 bcc89520…) as one query. Success = an error starting `RESULT: {"checks": "all passed"` that lists `"own_limits": [{"company": "DIG Civil Construction", "ai_stop_usd": 150.00}]`. Anything starting `FAIL` or `pb_patch:` = stop and apply nothing.
2. **Apply `sql/01_pricing_limits.sql`** as one migration. No edge function deploy.
3. **Check (read only):** `select c.name, o.limits->'company'->'usd_base' from pb_billing.limit_overrides o join public.companies c on c.id = o.company_id;` → one row: DIG Civil Construction, 150. `select public.pb_plan_prices();` → individual_cents 1500, individual_year_cents 14400, plan_sheet_cents 100.
4. **App:** `python3 patches/01_pricing_app.py <r17.11 master source> <out>`, bump the build, serve it as cur.html, then `PB_URL=… NODE_PATH=/opt/npm-tools/node_modules node tests/t_price_app.js` (expect 44 pass).
5. **In `tests/t127_billing0.js`** make the two wording changes shown in `tests/t127_billing0_v2.js` (the "form fields" check and the "Plan Reading On" check), then the usual regression.
6. **Website:** put `website/pricing_section.md` into the site by Dec 4; email both beta owners the price and their end dates (Dec 18 and Dec 19).
7. **If it has to come out:** apply `sql/undo_01_pricing_limits.sql` as one migration. The app keeps working on the old server.

Server first (steps 1–3) is better than app first: the limits protect the bill from that moment, and the app works with either.

## 6. Things to know
- **Plan reading is priced but not sellable yet.** Nothing shows sheets read per company per month, and nothing puts it on an invoice. It is off for every customer now. One trap: a paid company with **no billing account** has plan reading on by default (that is how DIG Civil has it). Make Paid creates the billing account with the tick box off, so always convert a beta with Make Paid, never by setting the plan by hand.
- **Strong plan look-ups have never run on live (a bug that is live today).** When a question is about a job's plans, the `ai` function (build 1117-0225) first counts an ordinary Ask request, then calls `ai_try_consume(…, 'plans_strong', 3)` to see if it may use the stronger model (3 a day, `AI_PLAN_STRONG_PER_DAY`). On live that call always errors, because the `ai_usage` check does not allow the name; the function treats the error as "no", so the question is answered by the normal model and nobody sees an error. There is not one `plans_strong` row in `ai_usage`. Beta companies are not affected (their allowance is 0, so nothing is inserted).
- **After the migration they work, which is a new cost.** A person on a company plan gets 2 a day (DIG Civil 30, the `ai` function's own 3 a day still wins); one look-up may cost up to $1.00 (the function's cap for it). The cost counts toward the company's dollar stop, so the worst case in section 2 does not move; the look-ups are not in the request counts. Only companies with read plan sets can trigger one, and today that is DIG Civil alone. To keep them off instead: set `"plans_strong": 0` for `member` in `pb_billing.plan_limits()`.
- **A dollar stop can be passed by a little.** Cost is reported when a request finishes, so requests already running still finish (each at most $0.25–$1.00). One request is counted at $50 at most.
- **Bandwidth and plain server calls are not capped.** They are in the table at a heavy guess.
- **An override on a beta company** would only change its dollar stop and storage; a beta's request counts stay in `pb_billing.trial_limits`. DIG Civil is a paid company, so its row covers everything.
- **There is no screen for the per-company limits.** Changing DIG Civil's numbers is one SQL update by the lead.
- **Yearly individual plans:** a plan starts monthly when Tommy turns it on. The server can mark a year paid ($144.00), but the Billing screen's Paid button only marks the period it shows, so the first yearly payer needs one SQL call or a small Monthly / Yearly choice in Billing.
- **An individual who stops paying loses AI after 7 days, but the screens stay open** until Tommy presses Off.
- **New wording is English only.** The Spanish dictionary needs the new lines.
- **Stake, cut sheet and ticket costs are estimates.** After a few weeks, read `pb_billing.ai_cost` by feature.
- I did not read the `docs`, `plans` or email edge functions; I relied on the SQL gates they call.

## 7. Decisions for Tommy (3)
1. **DIG Civil's stops: $150 AI + $75 plan reading + $20 documents = $245 a month at the very most.** You said about $150. *Recommend: keep as staged* (the $150 is the AI stop; the other two are separate meters that already exist). If you want $150 all-in, say so and it becomes $100 / $40 / $10.
2. **Yearly individual plans in Billing.** *Recommend: add a Monthly / Yearly choice next to Paid before the first yearly payer* (small). Until then the lead does it with one SQL call.
3. **Build "sheets read" in Billing next**, so plan reading can be turned on for customers at $1 a sheet. *Recommend yes, right after this ships;* until then it stays off.

## DONE
