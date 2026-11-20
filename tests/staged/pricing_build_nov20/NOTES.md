# Pricing build (Nov 20 2026) — notes

> **v2 IN PROGRESS (Tommy's Nov 20 decisions).** Server side done and tested locally: `sql/01_pricing_limits.sql` (individual
> $15 a month / $144 a year, plan reading $1 a sheet as a setting, per-company limits table with DIG Civil's row),
> `sql/undo_01_pricing_limits.sql` (proven by `sql/local/run_undo.sh`), `sql/tests/live_t01.sql` rebuilt (local: 14 groups,
> 105 checks pass, plain and block mode). Still to do when this line is here: app patch, app test, website text, the rest of
> this file (sections below are still v1). Old versions are the `*_v1` files.

Everything here is STAGED. Nothing was applied to the server, deployed, committed or pushed. On the live project I ran
SELECT statements only. The SQL was tested on a throwaway local Postgres, not on live.

## 1. What Tommy decided, and what I recommend for the open parts

| | Price | Who counts |
|---|---|---|
| Company plan | **$99 a month**, 5 people included, **$12** each extra person. Yearly = 10 months ($990 + $120 per extra). Founder lock 12 months for a beta that signs before its beta ends. | Every login is a person. The company account (owner login) is free and not counted. Waiting invites count. |
| Individual plan | **$12 a month, $120 a year** (my recommendation inside the $10–15 Tommy gave) | One person, no company |
| Free tier | None | |

Why $12 for the individual: it is the same number as an extra person on a company plan (one price to remember), and the
worst case below fits. At $10 the AI dollar stop would have to drop to $2.00; at $15 it could rise to $3.25.

What an individual gets: New Run, Quick Run, the calculators, Education & Reference, Stats, Jobs, Ask and stake reading
(the screens the app already opens for the individual tier). No company records, permits, reports or plan sets.

## 2. Worst-case math

**Margin I designed for: worst-case usage cost about 30% of the monthly price.** That keeps it under 40% of the money
even on the yearly deal (10 months' money for 12 months' use) with card fees on top.

"Worst case" = every person and the company account at every limit, every day of the month.

**How it is made certain.** Every AI request already reports its real cost to the server (`ai_cost_add`). The staged SQL
keeps a month total per company (or per individual) and stops AI for the rest of the month when the total reaches a
dollar stop. The count limits exist so people see a plain number long before the dollar stop is reached.

Unit costs used (measured where the server logs them):
- Ask question: $0.05 (live log: 3 questions, $0.052 each; 1,183 test runs: $0.032 average, $0.085 at the 90th percentile; the Ask server stops one answer at $0.25 field / $0.30 office / $0.35 analysis).
- Plan sheet: $0.28 (54 sheets read, highest $0.57).
- Stake/photo read, cut sheet read, ticket read: **not logged separately yet**. My estimates: $0.06, $0.15, $0.03. The dollar stop does not depend on these estimates.
- Storage: $0.028 per GB a month (Supabase $0.021 + Backblaze copy $0.007). Bandwidth $0.09 per GB. Server calls $2 per million.
- Email: Resend, already capped at 70 a day for the whole app (`pb_pm.email_budget_take`), so $0 per company. Push: free. SMS: the app sends none (texts open the phone's own Messages).

### Per month, worst case

| | 5 people, $99 | 12 people, $183 | 25 people, $339 | Individual, $12 |
|---|---|---|---|---|
| AI dollar stop (Ask, stake, cut sheet, ticket) — HARD | $22.00 | $44.75 | $87.00 | $2.50 |
| Uploaded-document AI stop — HARD | $4.00 | $4.00 | $4.00 | $0.50 |
| Storage full to its cap — HARD (11 / 18 / 31 / 1.05 GB) | $0.31 | $0.50 | $0.87 | $0.03 |
| Bandwidth: whole storage downloaded twice — not capped | $1.98 | $3.24 | $5.58 | $0.19 |
| Server calls: 100,000 per login — not capped | $1.20 | $2.60 | $5.20 | $0.20 |
| Email, push, SMS | $0 | $0 | $0 | $0 |
| **Worst-case cost** | **$29.49** | **$55.09** | **$102.65** | **$3.42** |
| **Share of the monthly price** | **29.8%** | **30.1%** | **30.3%** | **28.5%** |
| With card fee (2.9% + 30¢) | 33.0% | 33.2% | 33.3% | 33.9% |
| Yearly deal, with card fee | 38.7% | 39.0% | 39.2% | 37.4% |
| Profit left in the worst month (monthly, card) | $66.34 | $122.30 | $226.22 | $7.93 |

If nobody ever hit a dollar stop and every COUNT limit was used at average prices (60 requests a person a month at
$0.055): $16.50 / $39.60 / $82.50 for the companies, so the dollar stops sit above normal heavy use. For the individual
50 requests is about $2.75, so the $2.50 stop is the one that bites.

For comparison, today's live limits in the same worst case: a paid person may make 100 requests a day with no company
cap, about $150 a person a month ($900 for a 5-person company paying $99). An individual may make 200 a month ($10 of
$12). Plan reading allows 1,500 sheets or $300 a month. Document AI allows $20.

Fixed costs are not in the table (Supabase $25 a month; Resend $0 now, $20 when the app outgrows 100 emails a day).

Plan reading is a separate add-on with its own budget (section 3 and decision 2). It is off unless Tommy turns it on.

## 3. Limits chosen (all in `pb_billing.plan_limits()`, one function)

AI requests = Ask questions, stake/photo reads, cut sheet reads, ticket reads.

| | Person on a company plan | Company account (free) | Individual plan |
|---|---|---|---|
| All AI, a day | 25 | 5 | 15 |
| All AI, a month | 150 | 30 | 50 |
| Ask questions a day (analysis inside it) | 8 (3) | 5 (1) | 5 (2) |
| Stake/photo reads a day | 15 | 5 | 10 |
| Cut sheet reads a day | 3 | 1 | 2 |
| Ticket reads a day | 10 | 2 | 3 |
| Strong plan look-ups a day | 2 | 0 | 0 |
| Photo uploads a day | 150 | 20 | 60 |

| Whole company | |
|---|---|
| AI a day | 12 × paid people (60 for 5) |
| AI a month | 60 × paid people (300 for 5, 720 for 12, 1,500 for 25) |
| AI dollar stop a month | $22 + $3.25 × each paid person over 5 |
| Photo/sealed-run/cut-sheet storage | 10 GB + 1 GB × each paid person over 5 (individual: 1 GB) |
| Uploaded documents | 200 AI pages and $4 of AI a month, 10 uploads a day, 1 GB (individual: 30 pages, $0.50, 3 a day, 50 MB) |
| Plan reading (when the add-on is on) | no price on the account: 150 sheets and $45 a month, 3 sets a day. With a price: a third of the price in dollars, sheets = that ÷ $0.28 (so $59 → 69 sheets, $129 → 152 sheets) |

"Paid people" = the seats the company has paid for, never fewer than 5. The company account's use counts inside the
company totals, so it adds nothing to the worst case. Beta companies keep their own counts and get a $30 a month dollar
stop. A signed-in account with no plan can upload 10 photos a day and 0.1 GB (today: 400 a day, no size cap).

## 4. What is staged

### Server: `sql/01_pricing_limits.sql` (one migration)
- **Seat counting: no change needed.** `pb_billing.seats_used` already counts member logins plus waiting invites and never the owner login. The test proves it (5 members + 1 invite + owner = 6).
- **Prices:** new setting `individual_cents` 1200; `pb_billing.prices()`; `pb_plan_prices()` (the price list without a login, for the website or the sign-in screen); the individual price can be changed with the existing setter.
- **AI caps for every path through the `ai` function.** I read the live Ask build (sha b4ad91749f6f, the copy in `/tmp/claude-0/askstate/live_b4ad.js`): every feature (Ask, analysis, stake, cut sheet, ticket, strong plan look-up, the question check) goes through `ai_try_consume`, and every request reports its cost through `ai_cost_add`. So the caps are all in SQL and **no edge function needs a deploy**. Replaced: `ai_daily_limit`, `ai_try_consume` (read-only and beta parts kept word for word, plus the beta dollar stop), `ai_cost_add`, `ai_refund`. New: `pb_billing.ai_pool` (the month total), `ai_who`, `ai_block`.
- **`pb_my_limits(feature)`**: tells the app which limit was reached (this feature today / you today / you this month / company today / company this month / the dollar stop / no plan) with the numbers.
- **Uploads:** `pb_storage_put_ok` now also applies the plan's daily cap and the total size. The storage policies are untouched.
- **Plan reading:** `pb_plans.limits()` lowered; `pb_plans.limits_for(company)`; one line added to `pb_plans_begin`.
- **Documents:** `pb_docs.limits` numbers lowered.
- **Individual plan in pb_billing:** table `pb_billing.individual_accounts` (price copied when it starts, monthly or yearly, paid-through date, 7 grace days). Turning an individual plan on opens the record. `pb_owner_individual_paid` moves it one period (pressing twice does nothing). Not paid 7 days past the date: AI stops by itself. The two individual plans that exist today have no record and are unchanged. Billing (`pb_owner_billing`) lists individual plans.
- **`pb_my_plan`** now carries the price list, and tells a person with no company whether they have an individual plan or a request waiting. **`pb_plan_request`**'s note to Tommy says the price the person was shown.
- Six existing functions are changed by an exact text swap that refuses to run unless it finds the old text exactly once. The local copies those swaps were tested on have the same md5 as live (checked Nov 20: 16 functions match; `ai_daily_limit` differs only by a comment and is replaced in full; the `pb_plans_begin` anchor was checked on live with a SELECT, and its local stand-in is a shortened copy).

### Server tests (rolled back; `raise 'RESULT: ...'`)
- `sql/local/run_local.sh`: fresh local Postgres 16 = billing0's stubs + live definitions + billing0 SQL (what is live now), then the migration **applied twice** (safe to re-run), then `sql/tests/local_t01.sql`. **Result: all 13 groups (93 checks) pass.** `MODE=block` runs the migration inside one rolled-back block: passes.
- Two deliberate breaks (company stop $40, owner 50 a day) each made the test fail, so the checks bite.
- `sql/tests/live_t01.sql`: the same block for the lead to run on live. It ends with an error that starts `RESULT: {`, so everything rolls back. A failed check says `FAIL <n> ...`. **I did not run it on live** (server is read-only for me). It inserts test users, companies and storage rows inside the block.

### App: `patches/01_pricing_app.py` (base: r17.11 master source, md5 c92fb3c3…; 16 exact-once swaps; syntax check passes)
- Home, during the beta, company account: "After the beta: $99 a month for your company and 5 people, $12 a month for each extra person, plus applicable tax. Start your plan before the beta ends and this price is locked for 12 months."
- Beta ended, company account: the price next to **Start Company Plan**. After the tap: "Request sent. You'll get an email with the invoice: $99 a month …" instead of "You'll be contacted to set it up."
- Beta ended, crew member: "Your own plan is $12 a month plus applicable tax." by **My Own Plan**; after the tap: "… how to pay: $12 a month plus applicable tax."
- Removed from a company: the same price in the offer.
- **New:** a signed-in person with no plan sees "No plan yet. Your own plan is $12 a month plus applicable tax …" with **Get My Own Plan**. Stripe is not wired, so this ends in the existing request (`pb_plan_request`) that Tommy answers; no payment screen was invented.
- Settings › What each plan includes: rewritten with both prices, who counts, the real feature lists, "no free plan", and the limits. "Contractor plan" wording is gone.
- Crew Members: "… After the beta: $111 a month for 6 people, plus tax" (beta) or "$12 a month for each person over 5, plus tax" (paid).
- Limit reached: the app asks the server which limit and says it, for example "Your company has used this month's 300 AI requests. It resets on the 1st." or "This month's AI allowance is used up. It resets on the 1st. Everything else still works."
- App owner's Billing: the price line includes the individual price; individual plans that are due are listed with **Paid**.
- All prices in the app come from the server's list; the built-in numbers are only used until it answers.
- Works with the old server: no "No plan" card, old limit message, built-in prices.

### App tests
- `tests/t_price_app.js` (fake server): **42 of 42 pass** on the patched page; 11 fail on the unpatched page. Covers every item above at 390 px, light, one dark check, no page errors. Screenshots in `shots/`.
- Regression on the patched page: t127 billing 40/40, t130 onboarding 70/70, t133 10/10, beta-ended tests b03 and b04 pass, and the Ask / stake-limit / ticket tests give the same output as on the unpatched page. Logs in `tests/out/`. The full regression was not run (shared machine rule).

### Website: `website/pricing_section.md` (draft, not pushed)
Pricing section, the one-line strip, the FAQ answer, and a "not to say" list. `tests/t_website_text.py` checks the numbers match the staged settings and the app text: 9 of 9 pass.

## 5. How the lead applies it
1. Optional proof on live: paste `sql/tests/live_t01.sql` as one query from the main session (or run it on a Supabase branch). Success is an error starting `RESULT: {"checks": "all passed"`.
2. Apply `sql/01_pricing_limits.sql` as one migration. No edge function deploy.
3. App: `python3 patches/01_pricing_app.py <master source> <out>`, bump the build, run `tests/t_price_app.js` (serve the page as cur.html; `PB_URL=… NODE_PATH=/opt/npm-tools/node_modules node tests/t_price_app.js`).
4. Either order works. Server first is better: the limits protect the bill from that moment.
5. Website: put `website/pricing_section.md` into the site by Dec 4 and email both beta owners the price and their end dates (Dec 18 and Dec 19).
6. To undo: re-create the old function texts (`sql/local/stubs2.sql` and `sql/local/base/` hold them; `ai_daily_limit` and `pb_docs.limits` are in `sql/live/`). The two new tables can stay.

## 6. Things to know (not hidden behind the numbers)
- **A dollar stop can be passed by a little.** The cost is reported when a request finishes, so requests already running when the stop is reached still finish (each at most $0.25–$1.00).
- **Bandwidth and plain server calls are not capped.** They are in the table at a heavy guess, not a limit.
- **Plan reading's dollar check happens when a set is added,** using the $0.28 average. A set of unusually costly sheets (highest seen $0.57) could cost about double its budget once.
- **Stake, cut sheet and ticket costs are estimates.** After a few weeks of real use, read `pb_billing.ai_cost` by feature and adjust the counts.
- **I did not read the `docs`, `plans` or email edge functions.** For those I relied on the SQL gates they call (`pb_docs.limits`, `pb_plans_begin`, `pb_pm.email_budget_take`).
- **An individual who stops paying loses AI after 7 days, but the screens stay open** until Tommy presses Off (the app reads the subscription row). Billing lists them as "Not paid · AI off".
- **The storage size check adds one count over the photo table per upload.** Fine today (about 1,500 files); look again past roughly 100,000.
- **New wording is English only.** The Spanish dictionary needs the new lines (about 25 strings in the patch).
- Tommy's own admin account has no company and no plan, so it will see the "No plan yet" card on Home.

## 7. Decisions for Tommy (5)
1. **Individual price: $12 a month, $120 a year?** *Recommend yes.* Same number as an extra person; worst case 28.5%. If you don't decide: staged at $12.
2. **Plan reading price.** The research note's "$49 for 100 sheets" fails your rule (100 sheets cost about $28, 57%). Two ways that pass: (a) **$1 a sheet, charged once** when a set is read (cost $0.28, 28%, and it fits how plan sets arrive: one per job) — needs a small addition so Billing shows sheets read; (b) a monthly add-on where the allowance follows the price by itself, e.g. **$129 a month for 150 sheets** — works with what is staged today. *Recommend (a), and keep plan reading off for customers until it is built.* If you don't decide: it stays off; the caps protect you either way.
3. **The limits in section 3.** They are tight on purpose: 60 AI requests a person a month, shared across the company. Real use so far is about 3 a person a day. *Recommend: start here, loosen after a month of cost data.* If you don't decide: staged as written.
4. **The company account: 5 AI requests a day, 20 photos a day.** An office person who works from the company login all day will hit it. *Recommend keep it:* anyone who needs more gets their own login, which is a paid person. If you don't decide: staged at 5 and 20.
5. **Your own company (DIG Civil) gets the same limits** (300 AI requests a month, $22 stop). You test more than a customer does. *Recommend: leave it under the limits so you feel what customers feel; if it gets in the way, run Make Paid on it with more seats (25 seats = $87 stop).* If you don't decide: same limits as everyone.

## DONE
