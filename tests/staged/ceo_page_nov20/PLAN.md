# Owner Dashboard ("CEO page") — plan (Nov 20 2026, on r17.11)

Who it is for: Tommy, the app owner, only. Same gate as Beta Accounts (`pb_support.admin_ok`: the login is in
`pb_support.admins`, and it used its two-step code if it has one). Nothing here is shown to companies or crews.

How it is built: one server function `public.pb_owner_dashboard(p_days)` returns everything as one JSON; the app draws
it. One round trip, nothing fetched from outside services, works on a computer and a phone, dark mode, no new libraries
(bars are plain HTML/CSS).

Data facts read from live (read-only, Nov 20): 3 active companies (1 paid with no billing row = DIG Civil, 2 betas),
9 logins, 1 with two-step on, `pb_billing.accounts` empty, `pb_billing.ai_cost` has 1 day, `pb_billing.ai_pool` empty,
`pb_billing.usage` since Nov 16, `auth.audit_log_entries` empty (Supabase is not writing failed sign-ins there),
`pb_auth` not live yet (one_device_nov20), no crash data on our server (crash reports go straight from phones to Sentry).

Legend: **[built]** in this folder, **[new data]** the data does not exist yet; how to start is in NOTES.md.

## 0. Needs your attention (top of page, worst first)
A short list, each line one plain sentence + where to go. Built server-side so it is the same everywhere. [built]
- Confined space permit open more than 8 hours (pb_safety.open_permits) — red.
- Emergency notice sent in the last 7 days (pb_safety.em_notices) — red.
- Backup or off-site copy problem (pb_backup.health(), the same check the daily email uses) — red.
- A sealed run or run photo no longer matches its fingerprint (run_seal_checks / run_photo_checks, matches = false) — red.
- Paid company past due / read-only (pb_billing.accounts via state_of) — red; renewal in the next 7 days — amber.
- Beta ending in 7 days, or ended without being made paid — amber.
- A company or individual at 80% / 100% of its monthly AI dollar stop (pb_billing.ai_pool vs plan_limits) — amber/red.
- Sharing signals in the last 7 days (pb_auth.flags, when live) — amber.
- 811 ticket expired but not closed, or expiring in 2 days (pb_prod.locates) — amber.
- Plan sets stuck "reading" more than 2 hours (pb_plans.sets) — amber. (Live today: 3 sets stuck since Nov 11.)
- New feedback not read (pb_support.messages status new), new beta sign-up requests (trial_requests) — amber.
- Pushes failing (pb_push.outbox given up in 7 days) / most phone push subscriptions dead — amber. (Live: 50 of 52 dead.)
- Emails that gave up (pb_pm.email_outbox given_up_at) — amber.
- Server errors logged (pb_prod.pass_errors, last 7 days) — amber.
- State rules past their re-check date (pb_prod.state_rules.recheck_by) — amber.
- Old app builds still writing the old tables (pb_prod.legacy_write_days in 7 days) — amber.
- Weather alert runs failing (pb_daily.wx_runs.failed) — amber.
- Ask answers marked "not right" waiting (pb_ai.gaps status new) — info.

## 1. Money
Why: is the business paying for itself, and what money is about to move.
- Companies by status: beta (days left), beta ended, paid active, past due, read-only, canceled; seats used vs paid. [built]
- MRR (monthly plans + yearly / 12), ARR = MRR × 12, from pb_billing.accounts (base + extra seats + plan reading). [built]
- If every live beta converted at today's seats: "beta pipeline" $/month. [built]
- Individual plans: count, MRR. [built]
- Renewals in the next 30 days (paid_through), founder price locks and when they end. [built]
- Paid without a billing row (DIG Civil today) shown as "paid, no billing set up" — not counted in MRR. [built]
- Sales tax: the billing state on each account; a reminder line that tax is not collected by the app. [built: note]
- Stripe: not connected (columns exist, empty). Later: payments, failed cards, churn reasons. [new data]

## 2. Costs and margin
Why: AI and storage are the only costs that grow with use; a single heavy user can eat a company's $99.
- AI spend: today, this month, last 30 days by day (bar chart), by feature, by company (pb_billing.ai_cost, user → company). [built]
- Month-to-date pool spend vs each company's dollar stop (beta $30, paid $22 + $3.25 per extra person, individual
  $2.50, overrides from limit_overrides), sorted by % used. [built]
- Gross margin estimate this month = MRR − AI this month − fixed hosting (setting, default shown as "not set"). [built, fixed cost is a decision]
- Storage GB by bucket (storage.objects) vs Supabase plan size. [built]
- Plan reading: sheets read this month, cost at $0.28 a sheet. [built]
- Emails this month by kind (pb_pm.email_budget) vs the Resend free/paid cap. [built]
- Pushes sent / given up (pb_push.outbox). [built]
- Edge function errors and invocations: only in Supabase logs (Management API), not in the database. [new data]

## 3. Growth and use
Why: are crews actually using it in the field, and who has gone quiet (the churn that is coming).
- New logins per day (auth.users), companies started (companies.created_at). [built]
- Active people today / 7 days / 30 days (pb_billing.usage distinct users), active companies 7 days. [built]
- Daily active people, 30-day bar chart. [built]
- Work done per day: runs sent (pb_prod.run_records), feet laid, daily reports (pb_daily.reports), production entries
  (pb_prod.entries), permits (pb_safety.permits), Ask questions (public.ai_usage teacher/analysis). [built]
- Invites sent / accepted / refused (pb_crew.audit), join links made / used (pb_onboard.links). [built]
- Time to first value: per login, hours from sign-up to the first run sent or report filed; median. [built]
- Gone quiet: people active in the past who have not opened the app in 7+ days, by company. [built]
- Screens used most (pb_billing.usage scr:*), features (AI features). [built]
- Spanish switch: when PB_ES_ENABLED goes on, count `lang:es` usage events. [new data — one pbTrack line]

## 4. Account sharing and security
Why: one $99 company shared by 15 people is lost money; a stolen owner login is a data breach.
- Sharing signals (pb_auth.flags via pb_owner_share_events): tried while in use, tried on a 3rd device, took a place,
  far apart, back and forth — counts by kind (7/30 days), worst logins, newest list. Shows "not live yet" until the
  one_device_nov20 SQL is applied. [built]
- Logins with 3+ live sessions now (auth.sessions) — works today, before pb_auth. [built]
- Two-step adoption: logins with a verified factor; company accounts and PMs without it listed. [built]
- Members removed, invites refused (pb_crew.audit), admin access log entries (pb_audit.admin_log), Beta Accounts
  actions (pb_billing.events). [built]
- Failed sign-ins: auth.audit_log_entries is empty on this project; Supabase keeps them in Auth logs only. [new data]

## 5. Reliability
Why: a crew that loses a run record stops trusting the app on day one.
- Last backup (pb_backup.runs), off-site copy last run and health (offsite_runs, offsite_health). [built]
- Seal checks / photo checks: count, mismatches. [built]
- Weather alert runs, 811 reminder runs, order-by runs, PM digest runs (wx_runs, locate_runs, orderby_runs, digest_runs):
  last run, failures. [built]
- Push subscriptions alive vs dead; push and email outboxes given up. [built]
- Server errors (pb_prod.pass_errors). [built]
- Old builds still writing the old tables (legacy_write_days / legacy_rpc_days). [built]
- App builds in use: which build each person is on. [new data — patch built: one `build:r17.11` usage count per day]
- Crashes per day: Sentry gets them; our server does not. [new data — patch built: a `crash` usage count when the
  crash reporter sends one; respects "Send crash reports" off]
- Uptime: no monitor in the database. A Sentry uptime monitor on pipelayersbible.com is the cheap answer. [new data]
- Plan sets stuck reading. [built]

## 6. Safety and legal signals
Why: this is the part that could hurt someone or end the company.
- Open confined space permits right now, hours open, company (pb_safety.open_permits). [built]
- Emergency notices (em_notices) and refused emergency links (em_refused), 30 days. [built]
- 811 tickets expired and not closed, expiring in 3 days (pb_prod.locates). [built]
- Delays / standby / incidents logged (pb_daily.events kinds, pb_prod.site_log kinds). [built: counts by kind]
- Management reports (pb_reports.reports): count only, never the text (they can be anonymous and belong to the company). [built]
- Feedback (pb_support.messages) by status; beta sign-up requests (trial_requests) by status. [built]
- Terms accepted by version vs the version the app shows (1.0 now, 1.1 drafted). [built]
- State rules re-check dates. [built]
- Entered against a block (permit entry when the meter said no): not stored on the server today. [new data]

## 7. Ask quality
Why: a wrong Ask answer about trench protection is the single biggest legal exposure in the app.
- Questions per day (ai_usage teacher + analysis), cost per question (ai_cost teacher usd / n). [built]
- Gaps (pb_ai.gaps): new / done, by reason (low retrieval, model said not in KB, "not right"), newest 5 questions. [built]
- States asked about: not stored per question. [new data — Ask edge function can add a `state` to gaps/ai_cost]
- Thumbs up/down: only "not right" exists today (gaps source not_right). [built as count]

## Not doing (and why)
- No calls to Sentry/Resend/Stripe from the page: keys would have to be on the phone. Server-side copies are the way.
- No per-person location on this page beyond what pb_owner_share_events returns (privacy wording is with the lawyer).
