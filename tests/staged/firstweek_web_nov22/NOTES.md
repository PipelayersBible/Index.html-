# First week + website fixes (Nov 21-22 2026, on LIVE r17.14)

Nothing is committed, pushed or deployed. `_src/index.html` is not edited. The server was only read (SELECTs and function
definitions). The website was changed only in the working clone `/tmp/claude-0/website_work`, on a new local branch
`firstweek-nov22` taken from origin/main f13e713. Nothing was committed there. The founder story and "12 years" text are
not added back (the patch has 0 matches for either).

## Checked first: real problems and false alarms

| # | Review point | What I found |
|---|---|---|
| 1 | iPhone steps say "Tap Share at the bottom of Safari" | **Real.** In iOS 26 Safari's default layout, Share is inside the ••• menu. MacRumors' iOS 26 how-to gives the steps as: tap ••• → Share → scroll → Add to Home Screen → leave "Open as Web App" on → Add. The old wording was in 6 places in the app (join sheet, Home card, r17.10 step, Settings › Notifications steps, the notifications card line, the "Copied" button), in Spanish, in the invite email and in the website FAQ. |
| 2 | Crew members see "Your own plan is $15…" when the trial ends | **Real** (pbBetaRender, ended branch). |
| 3 | Login screen is a dead end | **Real.** Both `#trial` and `#start` exist on the site. I linked `#start`, which is the form itself. |
| 4 | "Account In Use" gives no way out | **Real, but the suggested wording was wrong.** On the server (pb_session_gate / pb_device_seen), closing the app does not free the login straight away: it frees 5 minutes after that device last checked in. Logging out there frees it at once. The new text says both. |
| 5 | Join link lasts only 24 h | **True.** `pb_onboard.make_link` uses `interval '24 hours'`. On an expired, used or cancelled link, the joiner had only an OK button. |
| 7 | "Material takeoffs (add-on)" | **Real.** The takeoff code exists (feat_takeoff, via Ask and plan reading), but the app's own plan text says plan reading "isn't turned on yet". So it now says "coming soon". |
| 9 | Edge features missing from the role lists | All verified in the app before listing them: cut sheet import (PDF, paste, scan/photo by AI), Lenker/engineer's/architect's rods, HI cross-check, sealed originals, and `PB_SR` state rules for 51 entries (50 states + DC). |
| 10 | AI limits | Read from `pb_billing.plan_limits()` and `ai_daily_limit` (read-only). Person on a company plan: 25 a day, 8 of them Ask, 150 a month. Company account: 5 a day. Individual plan: 15 a day, 50 a month. Trial: 30 a day per person. These match the app's own Settings text. |
| 16 | Hero screenshot date ("Wednesday, Nov 18") | **Not done.** The date is part of the app's Home header. A retake (tests/website/shots_busy.js) would just show another date, and cropping would cut off the header. |

## What changed: app (5 exact-once patches, `sh apply.sh in.html out.html`)
- **01_a2hs_ios26.py**: one wording everywhere: "Tap **•••**, then **Share**. If you see **Share** already, just tap it." / "Scroll down, tap **Add to Home Screen**, then **Add**. Leave **Open as Web App** on." The r17.10 step now shows a drawn ••• button next to the Share picture (`shots/a2hs_ios_light.png`). The old Spanish entries are replaced with new ones.
- **02_trial_chip_crew_end.py**: the chip now says "Trial" / "Trial ended". The day countdown shows only to the office (company account, PMs/supers); foremen and pipelayers see no trial line. When the trial has ended, a crew member sees only "Your company's trial has ended. Your records are safe. Your office decides what's next." with no price and no buttons. Unchanged: someone who already asked for a plan, someone with their own plan, the company account's offer, a removed member's offer, and the offer for an account with no company.
- **03_login_trial_link.py**: adds "No account yet? Start a free 30-day trial" under Join a Crew, linking to pipelayersbible.com/#start.
- **04_in_use_msg.py**: "This account is in use on another device right now. Log out there, or close the app there and try again in 5 minutes." (Spanish entry updated.)
- **05_join_link_expired.py**: `PB_OB_LINK_HOURS = 24` is now the one constant behind every "24 hours" about join links. An expired, used or cancelled join link now offers **Ask for a New Link**, which opens Messages with "My join link … doesn't work any more. Can you send me a new one?". Sign-in code errors are unchanged.
- **05b_DECISION_72h_links.py** + **sql/DECISION_72h_links.sql**: 72-hour links, NOT in the stack. The SQL is live `make_link` with only the interval changed.
- `invite_email_template.html`: the iPhone lines for Tommy to paste into Supabase › Emails › Invite user. Keep the r17.04 link line as it is.
- Patched pages: `work/index.patched.html` (and `_72h`).

Tests, all run on the patched page (`results/`):
- Unchanged and passing: t130 (69 PASS), t_sl4_code, t99 (identical to expect), t133.
- Failing only on the intended text changes, with updated copies in `test_updates/tests/`: t98 (new expect), t95 (expect: the foreman's line is now hidden), t128 (`/Trial ended/`, 48/48), t_sl2_a2hs (new steps + ••• picture, 42 PASS).
- New `tests/t_fw_trial.js`: trial line for 7 roles/states, Log In link, expired link sheet. ALL PASS, no page errors.

## What changed: website (`web/website-firstweek-nov22.patch` against origin/main; changed files in `web/changed/`; reproducible with `web/edit_index.py` + `web/edit_pages.py`)
- **Price** (quick answers, trial box, FAQ #q-cost, FAQ "after 30 days", JSON-LD): $99/month for the company and 5 people, $12 per extra person, plus tax; 30-day free trial with no card; individual $15/month or $144/year. The JSON-LD offers are now 99 USD/month (UnitPriceSpecification) plus a 15 USD individual offer. The "beta / pricing is being set" text is gone.
- Takeoffs say "coming soon".
- **Hero**: the headline is now the job ("Grade sheets, confined space permits and daily reports on your crew's phones. Works with no signal."). The big logo and tagline are removed from the hero; the name stays in the header. The screenshot now shows on phones (230 px). "Open the app" is replaced by a small **Sign in** link in the header on every page (icon-only Call button under 420 px so it fits on one line; it still wraps at 320 px) and in every footer.
- The role lists gain the edge features. Three new FAQs ("Bigger than 6 people?", "Does it work in my state?", "What does the AI do…") are on the page and in the JSON-LD. The iPhone FAQ uses the ••• steps.
- Under the trial box on all 13 tool/guide/use-case pages: "Pipelayer? Send this page to your foreman or super. Text it or email it." (sms: and mailto: links with the page's canonical URL).
- Trial form: a "State you work in" select (optional), sent as `state`. When the server returns `fields`, the page says "Check the marked field and send again.", marks the field and focuses it. Tested in `web/test_form_fields.js` (5 PASS).
- Footer on every page: "© 2026 Desert Infrastructure Group". Grade calculator tables get `tabindex="0" role="region" aria-label`.
- Screenshots in `shots/`: `web_before_*` and `web_after_*` at phone 390 and desktop 1280, top and full page, plus the tool page's trial box; `web_after_header_360.png`; `web_after_form_fields.png`. No sideways scroll at either width, no page errors.

## Edge function trial-request (staged in tests/website/edge/trial-request and in `edge/`; diff `edge/trial-request.diff`; NOT deployed)
- `state` is optional and checked against the 50 states, DC and "More than one state". It goes in Thomas's email and is stored as "State: X" at the top of the message, so there is no SQL change. Stored messages are cut to 2,000 characters, the column limit.
- Confirmation email to the requester: what happens next, (909) 435-5250, links to the free tools, Reply-To Thomas. It is sent only after the row is stored, so the database's 5-an-hour/200-a-day limits apply. It repeats nothing the person typed, so the form can't be used to send a stranger a message. `TRIAL_CONFIRM=0` turns it off.
- `deno test --no-check`: 54 PASS (35 before). The old test file already failed type checking at line 55 before my change, so `--no-check` is needed for both.
- Order is safe either way: the live function (v1) ignores `state`, so the site can go first.
- To deploy: `supabase functions deploy trial-request --no-verify-jwt` (files index.ts, logic.ts).

## Left / not done
- "Beta" still appears in the app in "Beta Results", in the join messages `pb:beta_ended` / `pb:trial_seats` ("The company's beta is full"), and on the owner pages.
- The website's own tests (`tests/website/test_site.js`, `test_seo_pages.js`) still assert the old decisions ("no pricing anywhere", offers price "0", the hero phone hidden on phones, the old tagline). They need updating when this ships; I did not change them.
- The Spanish for "Open as Web App" (written as "Abrir como app web") is not checked against iOS's Spanish menu. The new Spanish lines still need the fluent review.
- The trench-sloping tool tables have the same `.tbl-wrap` without tabindex (not in the review).

## Decisions for Tommy
1. **Join links: 24 h or 72 h?** Recommendation: **72 h.** Crews often get the text at night or on a weekend. Apply 05b + the SQL together. The cost is that an unused link holds a seat for 3 days unless cancelled.
2. **One contact email for the site and the Terms.** The site uses tfontaine@ and the Terms/Privacy use admin@. Recommendation: **admin@pipelayersbible.com** everywhere official (Terms, footer, JSON-LD), with Thomas's phone as the personal line. That is a one-line sed on the site.
3. **City in the footer/legal text?** I left it out. Recommendation: add it only if Desert Infrastructure Group wants a public city on the site; the Terms already name the company.
4. **Trial link from Log In: #start (the form) or #trial (price + steps)?** Built as **#start**, since it takes fewer taps. Switch to #trial if you'd rather people see the price first.
5. **Ended trial, PMs/supers who aren't the company account** now see the crew line ("Your office decides what's next"). Recommendation: keep it, since the company account is the one who pays.

## DONE
