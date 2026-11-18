# Office / AI tools bug hunt (r16.88) — findings

Base: /home/claude/index.html-/index.html (r16.88). Patches in patches/, tests in tests/ (run with `cd tests && PAGE=<file> node <test>.js`; server on port 8866; tests/lib.js is the boot helper, tests/fakesb.js adds `window.__fnOverride` for edge functions).

## Beta company adds a plan set: app says "Ask can use each sheet as soon as it's read" although the set is parked  [severity: medium]
Where: pbPlansSendOne / pbPlansPicked / pbPlansResume (plans upload, ~line 18097-18240 of index.html)
Repro: tests/p1_plans.js (pb_plans_uploaded answers {ok:true, parked:true}, as the server does for plan='trial' companies)
Why it's wrong: The server parks a beta company's set (never read until the company pays), and the list row says "Plan reading starts with a paid plan", but the status line right above it says "Sent. Ask can use each sheet as soon as it's read." A beta user waits for something that will not happen. The resumed-upload line has the same problem.
Fix: patches/01_plans_parked_line.py (tested: yes, tests/p1_plans.js)

## Beta ended (closed): a signed daily report is marked "Not accepted" and never sends after the company pays  [severity: high]
Where: pbDlyAnswer (shared by the daily report queue pbDlySync, inspection check-offs, and the job book queue that calls pb_prod_job_item_set); also pbNrCoSync (office "no run" production, pb_prod_company_norun_save)
Repro: tests/d1_betaend_daily.js (server answer copied from the live DB: trigger pb_billing.beta_closed_guard raises 'pb:beta_ended' on insert into pb_daily.reports / pb_prod.job_items / pb_prod.entries / run_records / site_log / tickets; pb_daily_submit turns it into { ok:false, code:'pb:beta_ended' })
Why it's wrong: Home tells the crew "New runs and reports wait on this phone and send once your company starts a plan." Run reports, production, tickets and site-log entries do wait (their queues retry unknown codes), but pbDlyAnswer treats any pb: code as a final refusal: the signed daily report turns red "Not accepted — The server refused it (pb:beta_ended)" and is never tried again. When the company starts its plan the office is missing every daily report signed in between unless each foreman finds and taps Send Again on each one. Job book entries and the office's no-run production entries are refused the same way.
Fix: patches/02_beta_ended_waits.py (tested: yes, tests/d1_betaend_daily.js and tests/d2_betaend_migrate.js for a report an r16.88 phone already marked refused; the no-run and job book branches share the same change but were not driven end to end)

## Beta line on Home goes stale: "Beta · 3 days left" a week after the beta ended; "Beta ended" stays after the company pays  [severity: medium]
Where: pbBetaRender / pbPlanLoad (r16.66 block, "the plan: beta days left, or ended")
Repro: tests/b2_beta_stale.js
Why it's wrong: The plan is read from the server once per sign-in / app start (pbAccountLoadHooks) and the line prints the server's days_left number as it was then. A phone with no signal at start-up, or an app left open for days (installed PWAs resume, they don't restart), keeps showing the old count: "3 days left" when the beta ended a week ago and reports have stopped going to the company; and after the owner taps Add 30 Days / Make Paid the crew still sees "Beta ended … Company Plan / My Own Plan". trial_ends_at is in the same answer, so the days can be worked out on the phone, and the plan can be asked again when the app comes back to the front.
Fix: patches/03_beta_line_fresh.py (tested: yes, tests/b2_beta_stale.js)

## Beta Accounts (app owner): "Make Paid" does nothing — its confirmation opens behind the sheet; "Not Changed" alerts are hidden too  [severity: high]
Where: pbOwnerOpen (Settings > Beta Accounts); CSS .pb-fb (z-index 60) vs .pb-modal (z-index 50)
Repro: tests/b4_owner_modal.js (checks what is on top at the confirmation button's position; screenshot shots/b3_owner_modal.png)
Why it's wrong: The Beta Accounts sheet sits at z-index 60 and the app's modal at 50, so the "Switch this company to paid?" question (and the "Not changed. Check signal and try again." alert for Add 30 Days / Turn On / Make Paid failures) is drawn under the sheet. The owner taps Make Paid and nothing appears to happen; the company stays on the beta (its parked plan sets never start reading, its crew keeps the "Beta ended" state) unless he closes the sheet and finds the question waiting underneath. The existing test t95 clicks through the DOM, so it didn't see this.
Fix: patches/04_owner_modal_on_top.py (tested: yes, tests/b4_owner_modal.js)

## Feedback sheet (beta users) covers the app's dialogs — an alert or alarm raised while it is open is hidden  [severity: high]
Where: CSS .pb-fb z-index 60 (r16.66 Feedback sheet, pbFeedbackOpen) vs #pbModalOverlay z-index 50
Repro: tests/b5_feedback_modal.js
Why it's wrong: Same cause as the Beta Accounts bug, but it reaches every beta user: the Feedback pill is on every screen (the active confined-space permit included), and its sheet is drawn above pbShowModal / pbAlert. The help sheet's own comment states the rule ("Below the app's dialogs (z-index), so an alarm or EVACUATE dialog still shows on top"); the Feedback sheet breaks it. A dialog raised by a timer or another phone while someone is typing feedback (a permit reminder, a "saved in another tab" warning, a sync alert) sits unseen under the sheet until it is closed. Not reproduced with a real permit alarm (safety area), only with an ordinary app alert.
Fix: patches/04_owner_modal_on_top.py (same one-line change: .pb-fb to z-index 48) (tested: yes, tests/b5_feedback_modal.js, tests/b4_owner_modal.js; tests/b6_shot.js checks the sheet still covers the tab bar)

## Stake photo read refused for the daily limit (or plan / login): the photo just taken is dropped from the point  [severity: low]
Where: pbStakeAiRead (the `!r.ok` branch: only "net" codes keep the photos)
Repro: tests/a4_stake_limit.js (ai answers 429 daily_limit; then 403; then 401)
Why it's wrong: When the AI is down or there is no signal the stake photos are kept on the point ("The photos are kept on this point") and go into the run report. When the answer is "You've hit today's limit" (30 stake reads a day on a beta, 15 on an individual plan), "not on your plan" (an ended beta) or "log in", the photo the foreman just took at the stake is thrown away and he is told "Nothing on this point was changed": he types the numbers by hand and the run report has no stake photo unless he walks back and takes it again with the point's own photo button.
Fix: patches/05_stake_limit_keeps_photo.py (tested: yes, tests/a4_stake_limit.js)

## Ask: Retry on a "Not finished" card with no signal makes the question card vanish  [severity: low]
Where: pbAiAsk (retry path: the unfinished card is spliced out before the new request starts and never put back when that request fails before any words arrive)
Repro: tests/a2_retry.js (a streamed answer is cut off -> "Not finished… Retry"; signal drops; tap Retry)
Why it's wrong: The card with the question and its Retry button is removed, the status says "No signal… nothing was sent", and if the box has since been cleared or used for something else the question is gone: the person has to remember and retype it once back in signal.
Fix: patches/06_ask_retry_keeps_card.py (tested: yes, tests/a2_retry.js)

## Beta Accounts: a beta company with no end date shows "Beta · null days left"  [severity: low]
Where: pbOwnerOpen list (left is null when trial_ends_at is null)
Repro: tests/b3_owner.js ("No date Co")
Why it's wrong: The server treats a trial with no end date as already ended (pb_billing.company_of: coalesce(trial_ends_at, now()) <= now()), so its crew is in the ended state while the owner's list shows a live-looking "Beta · null days left".
Fix: patches/07_owner_null_days.py (tested: yes, tests/b7_owner_null.js)

## Plan sheet viewer with no signal: an empty grid, no words, and it stays empty when signal comes back  [severity: low]
Where: pbPlanTile / pbPlanSheetOpen (plan set viewer)
Repro: tests/p3_viewer_offline.js (screenshot shots/p2_offline.png)
Why it's wrong: A sheet's tiles are downloaded when it is opened. With no signal (a trench, a vault) the viewer shows empty tile boxes under the app's general banner "No signal · showing what's saved on this phone" (nothing of a plan sheet is saved on the phone), with no way to try again. Each failed tile is only retried when it scrolls out and back into view, so the sheet stays blank after signal returns until the person leaves and reopens it. The same happens when a download fails with signal (then there are no words at all).
Fix: patches/08_plan_viewer_offline.py (tested: yes, tests/p3_viewer_offline.js)

## Not patched: seen on the server or by reading only (for the owner to decide)
These were not reproduced in a browser test and have no patch here. Server items were read from the live database with select-only queries; nothing was changed.
- Server, plan requests: `pb_my_plan.requested` is true for an open request of either kind, and nothing ever closes a "company" request (`pb_owner_company_set` to paid doesn't mark it done). So after someone taps Company Plan the My Own Plan button is gone for good, the owner's "Plan requests" list keeps "wants a company plan" forever, and if that person is later removed from the company the removed-member card shows "Request sent" with no My Own Plan / Not Now buttons (it can't be dismissed).
- Server, `pb_owner_individual_on`: when the person already has a subscriptions row it is overwritten with tier 'individual' whatever it was (a 'contractor' row would be downgraded).
- Crew members screen on a beta company: the header says "N members (your plan includes 5)" (`pb_crew.seats_included()` = 5) while the beta allows the company account plus 6 people (the pb:trial_seats message). Seen in tests/c1_crew.js with a fixture.
- AI limit words: every 429 reads "You've hit today's limit. It resets tomorrow." The server also answers that way for an individual plan's 200-a-month cap and for a beta's plan questions (limit 0), where "tomorrow" is wrong. The `ai` function's source was not read, so the exact status for those cases is unconfirmed.
- Notification type switches (pbPushSetPref / pbPushPrefsFlush): when the server refuses a change the pending change is dropped and the switch goes back, but the line still says "On." / "Off. You won't get these on any phone." Read only: push settings can't be opened in the test rig (they need the real https address).
- Read All Stake Photos: a photo refused for the plan or the login is counted under "couldn't reach the AI (signal)". Read only.
- Same z-index cause as the Feedback sheet, outside this area: Home's "Add note" sheet (`.dx-sheetwrap`, z-index 8800) is also above the app's dialog (50). Not tested.
- Stake read that comes back with nothing sure at Start or End still says "Read from the photo. Check the outlined boxes" because only the default point label was filled (tests/a3_stake.js, "garbage-json"). Cosmetic.

## Checked and found working (no bug)
Crew members (invite, the four roles, manager on/off, PM <-> superintendent, resend, remove, withdraw, pb:trial_seats message: tests/c1_crew.js); loss of manager access drops the company copies once the server refuses (tests/x1_access.js); Ask error lines for 401/403/429/5xx/no signal and the local emergency answer with no signal (tests/a1_ask.js); stake read with AI down / garbage / not a stake / odd values (tests/a3_stake.js); field ticket AI read errors (tests/t1_ticket.js); job materials list, Record Use validation, Ask takeoff -> Job Materials (tests/m1_mat.js); plan set upload and viewer, zoom, next/previous (tests/p2_viewer.js); beta line states and the removed-member card (tests/b1_beta.js, repo t95/t98/t99 rerun on the patched build); 390 px overflow checks on every screen opened above (none found). After a closed beta the run-report, production, ticket and site-log queues were read and do wait and retry on pb:beta_ended; only the queues in the "Beta ended (closed)" finding refuse.

## How to apply
`./build.sh` applies patches/01..08 in order to index.html (r16.88) -> cur.html and syntax-checks the main script. Each patch also applies on its own. Every listed test exits 1 on index.html and 0 on cur.html (`cd tests && PAGE=index.html node <t>.js` vs `PAGE=cur.html`). Repo tests t90, t91, t95, t98, t99, t103 were rerun against cur.html with no change in their output.

## DONE
Office side and AI tools, r16.88: 8 confirmed bugs, each with a patch and a test that fails before and passes after. The two that matter most: (1) once a beta is closed the server answers pb:beta_ended, and the daily report / job book / office no-run queues treat that as a final refusal, so signed daily reports turn "Not accepted" and never send after the company pays, although Home promises they wait and send (patch 02); (2) the Feedback and Beta Accounts sheets sit above the app's dialog layer, so the owner's Make Paid confirmation opens unseen behind the sheet (the button appears dead) and any alert raised while a beta user has Feedback open is hidden (patch 04, one CSS number). Also fixed: a beta company's plan set is parked but the app says Ask will read it (01); the Home beta line shows a stale days-left count and doesn't follow an extension or a paid plan until the app restarts (03); a stake photo is dropped when the read is refused for the daily limit, plan or login (05); Ask's Retry card vanishes when retried with no signal (06); "Beta · null days left" in Beta Accounts (07); the plan sheet viewer stays blank after signal returns (08). Nothing was committed, deployed or written to the database; the repo was not edited. Push notification settings could only be read, not run, in the rig. Server-side items are listed under "Not patched".
