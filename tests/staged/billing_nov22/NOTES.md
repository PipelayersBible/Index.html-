# billing_nov22: Billing and Trial End fixes (staged, nothing applied)

Source: Project doc "Review – Billing and Trial End – 2026-11-22" (27 findings, 3 passes). This chat has no Projects
tool, so I read the review's full text from the chat that wrote it (claude.ai chat "Billing and trial review",
conversation search). I could NOT open claude/Pricing_Plan_Nov20.md, claude/Billing_Plan_and_Decisions_Nov17.md or the
Terms v1.1 draft; where they matter I used what the review quotes from them and the repo copies
(tests/staged/legal_nov19/drafts/*, tests/staged/pricing_build_nov20/website/pricing_section.md).

Live was read only (SELECTs on function text, settings, triggers, counts). Live today: 0 paid accounts, 0 individual
billing rows (2 legacy active individual subscriptions with no billing row), 2 trial companies ending
Fri Dec 18 12:09 PM and Sat Dec 19 2:55 PM Pacific, pb_stage present.

## Findings: verified or not
| # | Verdict | Evidence (live text / app source) |
|---|---|---|
| 1 | Verified | app: Start Company Plan only in the trial-ended branch; live pb_owner_make_paid refused founder once trial_ends_at <= now() |
| 2 | Verified | live state_of: past due at paid_through, read-only at paid_through + 7; account_json marks due 7 days ahead; pb_my_plan had no past-due flag; app "Plan paused" had no reason |
| 3 | Verified | live make_paid: paid_through = period_after(today) with no payment; first invoice never in Billing due |
| 4 | Verified | live account_json: catch-up = extra x seat_cents x months_left, months_left rounds a part month up (Dec 16 -> Dec 15 = 12 x $12 = $144) |
| 5 | Verified | app sent p_seats = today's seats_used on Paid; server stored it as seats_paid |
| 6 | Verified | app Make Paid sent p_seats null, no address / contact / Terms version |
| 7 | Verified | live pb_crew_list: seats = members only, seats_included = fixed 5 |
| 8 | Verified, left as is (decision) | Settings > What each plan includes has no role check |
| 9 | Verified | app: managers get the countdown, then the crew line |
| 10 | Verified (live terms.html 7.3, 7.5, 7.8, 7.9) | not mine: see LEGAL_TEXT_CHANGES.md |
| 11 | Not checked (couldn't open the v1.1 draft here) | the live limits are in pb_billing.plan_limits; replacement text in LEGAL_TEXT_CHANGES.md |
| 12 | Verified | DB TimeZone UTC; state_of / alert / make_paid used current_date (UTC) |
| 13 | Verified | live billing_paid moves one period from paid_through |
| 14 | Partly a false alarm | server already could undo a cancel (pb_owner_billing_state 'active' clears cancel_at), even after the paid time ran out; only the app had no button. Everything else (no edit of email / name / address / seats / interval) verified |
| 15 | Verified | live ai_block / pb_my_limits size the pool by paid_people (seats paid) |
| 16 | Verified | make_paid is the only double-pay flag; individual_open paid_through a period ahead; lapse only stopped AI (app reads subscriptions.status) and Home said "No plan yet" |
| 17 | Verified | trial_ends_at is a clock time; app showed "N days left" only |
| 18 | Verified | live seats_used counts open invites; yearly catch-up used it |
| 19 | Verified | app: after pb_removed_dismiss the "No plan yet" card appeared |
| 20 | Verified | live pb_my_plan gave members of a canceled company "paused" forever |
| 21 | Verified | app text "You'll get an email with the invoice: $99 a month…" |
| 22 | Verified (order form lines 15, 16, 19, 26; website line 28-29; app has no sign-up call) | not mine: LEGAL_TEXT_CHANGES.md |
| 23 | Verified | no plan row in Settings; join messages 'see … in Settings' |
| 24 | Verified | live svc_invite_begin checked only trial_seats_full |
| 25 | Verified | live ai_block / ai_try_consume use the UTC date; app said "resets tomorrow" / "on the 1st" |
| 26 | Verified | 7 places said Contractor (plus the Spanish dictionary keys) |
| 27 | Watch item, not built | |

## What I built
### Server: sql/01_billing.apply.sql (one migration; undo sql/99_undo_01.sql)
- Guards (md5 read today) on all 20 live functions it touches; replaced whole: state_of, account_json, alert_text,
  has_individual, individual_open, individuals_json, pb_owner_make_paid, pb_owner_billing_paid, pb_my_plan,
  pb_plan_request. Patched in place with pb_stage.patch_fn (marker comments, so a second run skips): ai_block,
  pb_my_limits, pb_owner_individual_paid, pb_owner_billing_catchup_paid, pb_owner_billing_state (x2),
  pb_owner_billing (x2), pb_owner_billing_setting_set, pb_crew_list, svc_invite_begin, answer_invitation.
- New settings rows (existing values untouched): billing_tz "America/Los_Angeles", due_offset_days 0,
  catchup_part_month "down" (all settable in pb_owner_billing_setting_set; a made-up time zone is refused).
  grace_days 7 and invoice_ahead_days 7 keep their meaning: read-only 7 days after the due date; sent 7 days ahead.
- New columns: accounts.seats_min, next_interval, invoice_from / sent_on / due / seats / cents / interval;
  individual_accounts.due_on.
- New closed helpers (pb_billing, security definer, revoked from anon/authenticated): tz, today, day_start, due_on,
  lock_on, ind_due_on, catchup_months, pool_people, crew_seats_json, owner_plan_json.
- New owner tools (admin + aal2 checked inside, authenticated only, not anon): pb_owner_billing_invoice_sent,
  pb_owner_billing_restart, pb_owner_billing_edit, pb_owner_billing_next_interval.
- pb_my_plan gives the company account (only) people / request / billing; everyone gets is_owner, ended, company;
  dismissed after Not Now; individual_state for someone with their own plan.
- pb_plan_request: 'company:month' / 'company:year', company account only, message to Tommy says before/after the end,
  the pick and the amount.

### App: patches/b1..b4 on r17.16 candidate A (build.sh -> work/out)
- b1 Home line + Settings > Your plan; pbUsd now writes $1,110.
- b2 Your plan box, Crew members count, crew-admin codes pb:beta_ended / pb:read_only, the two Settings messages.
- b3 AI reset time in the phone's time (4 PM Pacific in winter), Company plan words (incl. Spanish keys), lapsed
  individual closes plan screens + account line "payment due".
- b4 Billing: Invoice Sent, Paid (marks the invoice), Restart From Today, Undo Cancel, Edit Billing, Switch at
  Renewal, catch-up at the yearly rate (joined only), Make Paid with seats / address (state) / contact / Terms
  version and the request's pick, Billing due shows first invoice and sent/not sent, individuals "also in" + Turn Off.
- Old server: the app still works (no is_owner -> one Start Company Plan button sending 'company', generic price).

## Tests
- SQL, local throwaway Postgres 16 (sql/local/run_local.sh): replica = live texts 20 of 20 by md5;
  block_t01 `RESULT: 74 pass, 0 fail [app and owner calls ran as role authenticated]` before and after apply;
  apply x2 + undo x2 with no errors and every function back byte-for-byte; apply inside a DO block works.
  The block includes privilege checks (new helpers closed; new owner tools authenticated-only + security definer;
  no caller-rights function the app can run calls a new helper or state_of; no row policy calls pb_billing).
- App, tests/t_billing.js on the build: ALL PASS (51 checks). On the unfixed candidate A it fails from the first case.
- Full regression: see "Regression" below.

## Apply order (lead, one sitting, after the r17.16 candidate it is built on)
1. Run sql/block_t01.sql on live. Expect `ERROR: RESULT: 74 pass, 0 fail [app and owner calls ran as role authenticated]`.
   It creates throwaway users / companies and always rolls back.
2. Apply sql/01_billing.apply.sql (as-is or inside a DO block; safe twice). It refuses, changing nothing, if any of
   the 20 functions changed on live since Nov 22.
3. Ship the app (b1..b4) the same day: the new Make Paid needs a billing state, so Tommy's r17.15 Make Paid form
   (which sends none) is refused with "Type the billing address with its state" until he has the new app.
4. With the app commit: sh tests/staged/billing_nov22/test_updates/apply.sh (7 goldens + t127), plus the r17.16
   candidate's own test_updates/A (critic/w2, new/a7).
5. Undo: sql/99_undo_01.sql (puts back the exact live texts, drops what 01 added).
md5: 01_billing.apply.sql 5b4c40b1…, 99_undo_01.sql ce373e42…, block_t01.sql 681f288c…, index.src.html a15aae5a…, build/index.html e969ccd5…

## Notes / not done
- Owner Dashboard money still counts a company whose first invoice isn't paid (pb_owner_dashboard not touched).
- crew-admin edge function MESSAGES has no pb:beta_ended / pb:read_only (it falls back to its generic message);
  the new app maps the code itself. Add them to functions/crew-admin/logic.ts next time it is deployed.
- AI day and month stay UTC on the server (8+ functions and the edge count by it); the app now says the real time.
- #27 (owner removing people before Paid day) not built.

## Regression
`tests/run_all.sh --build work/out/build_hooks/index.html --jobs 2` (results/regression.log): pass 211, FAIL 11, skip 15.
- 8 are the intended wording changes, re-run alone after the last build and recorded in test_updates/:
  t99_removed (Not Now hides the line), critic w1 / w3 / w4 ("Company plan (active)"), office a1_ask / a3_stake
  ("It resets at 4 PM today", "Individual or Company"), office b3_owner (company request line), t127_billing0
  (catch-up "joined", Make Paid needs a state). Updated t127 copy: 41 pass, 0 fail on the build.
- critic/w2 and new/a7: fail the same way on the unfixed r17.16 candidate A (results/regression_base_check); the
  candidate already carries their updates (r1716_candidate/test_updates/A). Not mine.
- offline/rig/t10_quota: passed when re-run alone (flaky).
- After the regression I made the owner screen fall back cleanly on an old server (no Invoice Sent button / no
  "due" line without due_on); rebuilt, re-ran t_billing (ALL PASS), t127 copy (41/0), t95, t98 and the 7 goldens
  (identical to test_updates).

## Decisions for Tommy
1. Due date: each invoice is due on the paid-through date (sent 7 days before), read-only 7 days after it. Stripe must
   show that same due date (not "Net 15 from sending"). Recommend: keep, and set the Stripe due date to the period
   start; if he wants Net terms, set `due_offset_days` instead (e.g. 15) so the app and the invoice agree.
2. Yearly catch-up part month rounds down ($110, not $120, for someone added the day after signing). Recommend keep
   (setting `catchup_part_month`).
3. Seats bought above the people in the company become a floor (billed even if fewer join) until Edit Billing changes
   it. Recommend keep; the order form's "People bought at start" says so.
4. Monthly invoices still count open email invites (Nov 20 decision); yearly catch-up counts joined people only.
   Recommend keep for now; revisit if owners complain about paying for invites.
5. AI day stays UTC on the server; the app now says "It resets at 4 PM". Recommend keep until after the first
   invoices (moving it touches 8 server functions and the AI edge function).
6. #8 crew can read the company price in Settings > What each plan includes. Recommend hide the company paragraphs
   from foremen and pipelayers (small app change), since r17.15 took the price off their Home.

## DONE

## Lead (Nov 22 evening)
- block_t01.sql run on LIVE (rolled back): RESULT 74 pass, 0 fail [app and owner calls ran as role authenticated].
- Not applied yet: goes in with r17.16 (app needs to ship the same day). If Tommy picks the new look, rebase b1-b4 on r1716 Bx.
- Decisions 51-56 added to the Nov 22 decisions page.
