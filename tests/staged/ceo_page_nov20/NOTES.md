# Owner Dashboard (Tommy's "CEO page") — staged Nov 20 2026, on r17.11

Nothing here is live. The server was only read (SELECTs). Plan with every metric and why: `PLAN.md`.

## What it is
Settings > App > **Owner Dashboard** (right under Beta Accounts; same app-owner-only rule). One full-screen page,
computer-first, one column on a phone, follows the app's light/dark colors, no new libraries (bars are plain HTML).
One server call: `pb_owner_dashboard(p_days)` (7 / 30 / 90 days, remembered on that computer).

1. **Needs your attention** — worst first: Now (red) / Soon (amber) / FYI, words on every line, not only color. Shows 6,
   "Show All N" for the rest. Safety first, then security, reliability, money, costs, legal, people, growth, Ask.
   Rules: permit open 8+ h; emergency notice in 7 days; backup/off-site problem (same check as the daily backup email);
   sealed run or run photo no longer matches its fingerprint; past due / read-only; renewal within 7 days; beta ends within
   7 days or ended unpaid; AI money at 80% / 100% of the month's stop; sharing signals (when live); logins on 3+ devices;
   811 ticket expired and not closed; plan sets stuck reading 2+ h; crash reports doubled week on week; pushes / emails
   that gave up; server errors; old builds still writing the old run table; weather alert failures; state rules past
   re-check; unread feedback; website beta requests; quiet companies; Ask answers waiting.
2. **Headline numbers** — MRR (+ a year), companies (paid / beta), people in the app this week / today, feet laid,
   AI cost this month, "left after AI" (and hosting, once a number is set).
3. **Money** — each company with plain status (Beta · 5 days left / Paid / Past due / Read-only / Paid · no billing set
   up) and $/month; revenue split; "if every beta paid today"; seats used vs paid; renewals in 30 days; founder price end
   dates; Stripe and sales-tax note.
4. **Costs** — AI $ per day (bars), by feature with $ per use, by company, each company's/individual's month-to-date AI
   money against its stop (meters, from `pb_billing.ai_pool` and the same limits the server enforces); storage by
   bucket + database size; plan sheets read; emails this month by kind; pushes sent/failed.
5. **Growth and use** — people per day (bars), today/7/30, companies active; work per day (runs, feet, daily reports,
   production entries, permits, plan sets); sign-ups, invites sent/accepted, join links made/used, **time to first
   record** (median hours from sign-up to first run / report / entry); **gone quiet** (no app 7–60 days) and whole
   companies quiet; screens used most.
6. **Account sharing and security** — sharing signals by kind (7 / 30 days), logins with the most signals, Show Events
   (reads `pb_owner_share_events`). Says **Not live yet** until `pb_auth.flags` exists (one_device_nov20). Works today:
   logins on 3+ devices now (`auth.sessions`), two-step adoption + company accounts/PMs without it, members removed,
   refused crew actions, billing actions, admin access log.
7. **Reliability** — backup + off-site copy, seal/photo checks, **crashes per day**, **app builds in use**, server jobs
   (weather alerts, 811 reminders, order-by alerts, PM email) last run / failures, server errors, plan sets stuck, push
   sign-ups alive, emails failed/waiting.
8. **Safety and legal** — open confined space permits with hours open, emergency notices, permits started; 811 open /
   expiring / expired-not-closed; delays/standby/incidents counts; reports to management (count only — never the text);
   unread feedback; website requests; Terms accepted by version; logins with no Terms record; state rules to re-check.
9. **Ask** — questions per day, cost per question, knowledge build; answers to improve by reason + newest 5 questions.
10. **Not tracked yet** — one honest card (below).

Privacy: the page never gets feedback text, management-report text, locations or tokens (tested). Names/emails are the
same ones Beta Accounts already shows Tommy.

## Files
| File | What |
|---|---|
| `sql/01_owner_dashboard.sql` (md5 c084a365…) | Adds `public.pb_owner_dashboard(integer)` (granted to authenticated, refuses anyone but the app owner via `pb_support.admin_ok`, i.e. with the two-step code when the login has one) and `pb_support.dash_uc()` (helper, not callable from the API). Changes nothing else. Reads `pb_auth.flags` only if it exists (dynamic SQL), so it can go before or after one_device. |
| `sql/tests/block_t01.sql` (md5 e29fee2e…) | ONE query for the live SQL editor: the migration + read-only checks on live data; ends with `RESULT: {...}` so it all rolls back. Inserts nothing. |
| `sql/99_undo.sql` | Drops the two functions. |
| `sql/tests/local_t01.sql`, `sql/local/*` | Local Postgres 16 test (stand-ins copied from live definitions): **50 pass**; live block on the same base: **16 pass**, also with a `pb_auth.flags` in the one_device shape; migration and undo each run twice. `bash sql/local/run_local.sh`. |
| `patches/p01_owner_dashboard.py` (md5 92720a73…) | App patch on `_src/index.html` r17.11 (md5 3813d6f2…), 5 exact-once swaps; all inline scripts pass `node --check`. |
| `tests/t_ceo.js` | Browser test, fake server = the real function's output (`sql/local/dump.json`): **37 pass, 0 fail**. Owner sees the row and page; others don't (and no server call); attention order; MRR math; meters; sharing not-live and live + Show Events; server part missing; refused; 7-day switch; Escape; no sideways scroll at 1280 and 390; title and X on one line on a phone; build count; crash counted once, not counted with crash reports off. |
| `shots/` | Computer (dark and light) and phone screenshots. |

## Apply order
1. Paste `sql/tests/block_t01.sql` as one query. Success = an error starting `RESULT: {"checks": "all passed (…)"`
   with today's attention list. Anything else: stop.
2. Apply `sql/01_owner_dashboard.sql` as one migration. No edge function deploy.
3. Ship the app patch with the next update (the page says "isn't set up on the server yet" if the app goes first).
4. Nothing to do when one_device goes live: the sharing card switches itself on.
Undo: `sql/99_undo.sql` (the app then shows the "not set up" line; nothing else breaks).

## What the live data says today (read Nov 20, for the first look)
- 3 plan sets stuck in "reading" since Nov 11 (`pb_plans.sets`).
- 1 811 ticket expired Nov 5 and not closed.
- 51 of 53 push sign-ups are dead; 48 of 58 pushes gave up (most look like Tommy's own test phones — worth one look).
- 5 of 9 logins have no Terms acceptance record (likely made before acceptances were recorded in r16.84; check that
  the next sign-in asks them).
- Median time from sign-up to first record: ~398 hours (2 of 9 logins have one).
- DIG Civil (Tommy's test company) has the $150 AI override and is paid with no billing row, so it is left out of MRR.

## Data that is missing, and how to start collecting it
| Missing | Start |
|---|---|
| App build each person is on | **Built in the patch**: one `build:r17.11` usage count per open (`pbTrack`), stored by the existing `pb_usage_add`. |
| Crashes per day | **Built in the patch**: a `crash` usage count each time the crash reporter accepts a new error (so "Send crash reports" off = not counted). Details stay in Sentry. |
| Account sharing | one_device_nov20 (`pb_auth.flags`). Page is ready. |
| Failed sign-ins | `auth.audit_log_entries` is empty on this project. Supabase keeps them in Auth logs only: a small scheduled edge function could copy failed-login counts per day into a table. |
| Edge function errors / invocations | Only in Supabase logs (Management API). Same route: a nightly copy into a table. |
| Uptime | A Sentry uptime monitor on pipelayersbible.com (no app change). |
| Card payments, failed cards, churn reasons | Stripe (columns exist, empty). |
| Which state each Ask question is about | The `ai` edge function can add the answered-for state to `pb_billing.ai_cost` or a small daily count. |
| Permit entries made against a meter warning | Not sent to the server today; the permit backup could carry a count. |
| Spanish use | When `PB_ES_ENABLED` goes on, `pbTrack('lang:es')`; the function already counts `lang:es`. |
| Hosting cost for "left after AI" | Set `pb_billing.settings` key `owner_fixed_month_cents` (a number). Until then the page says "hosting not set". |

## Decisions for Tommy
1. **Leave DIG Civil (your test company) out of every number?** Recommend yes: add a setting listing test companies
   and skip them in the dashboard's counts (small follow-up; today it only stays out of MRR).
2. **Monthly hosting cost** for "left after AI": recommend entering your real Supabase + Resend + domain total once.
3. **Copy failed sign-ins and edge function errors into the database nightly?** Recommend yes after one_device is live
   — it is the only way the page can show them without putting keys on a phone.
4. **"Gone quiet" = 7 days without opening the app.** Recommend 7 for now (crews work weekdays); 14 if it is noisy.
5. **Emergency lines name the company and the date, not the worker or the space.** Recommend keeping it that way
   (you call the company; the company has the details).

## DONE
