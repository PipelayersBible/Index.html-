# r17.12 — One device in use, Owner Dashboard, Taper & Cone calculator, Yearly plan, Ask state (live Nov 20, 2026, commit ec2e22f)

Published Nov 20 ~2:55 PM. Build stamp `r17.12 · 2026-11-20` in the page and in `sw.js`.

## What changed
- **One device in use per login, two signed in.** A login can stay signed in on 2 devices (phone + tablet), but only one is
  in use at a time.
  - The other device shows "In use on your other device (phone/tablet/computer)" with a countdown. It unlocks by itself
    5 minutes after the first one goes idle, with no sign-in.
  - A device with an open confined space permit keeps the login. Work saved on a locked device waits and sends when it unlocks.
  - A 3rd device is told it is signed in on two devices. It gets one button per device ("Sign Out the Tablet (used 6 min ago)") and Cancel.
  - A new sign-in while the login is in use is refused: "Try again in 5 minutes."
  - The lock screen has Try Now, Log Out and Emergency: Call 911.
  - **Log Out now signs out this device only.**
  - The Crew members sharing note and the Beta Accounts sharing block are gone.
  - The app stays silent until the server part is applied.
- **Owner Dashboard** (Settings › App, app owner only). One page shows:
  - what needs attention, worst first;
  - MRR, companies, people and feet laid;
  - money, AI and storage costs, growth and use;
  - account sharing (switches on when one-device is live);
  - reliability, safety and legal, and Ask.
  - The app now counts the build in use and crashes (a usage count only; details stay in Sentry).
  - Without the server function, the page says it "isn't set up on the server yet".
- **Taper & Cone Spacing calculator** (Calculators › new Traffic Control category). It gives:
  - taper length, cones and spacing, buffer, flagger station, and advance warning signs;
  - MUTCD 11th Edition minimums;
  - the California and Alaska city sign spacing rules, and a Massachusetts note;
  - "Not a traffic control plan" at the top.
  - It works offline.
- **Monthly / Yearly for the individual plan.** Every place that offered "My Own Plan" now has **Monthly $15** and
  **Yearly $144, save $36**. After a tap, the app says back what was picked.
  - Tommy's Billing shows the pick, with Turn On Monthly / Turn On Yearly and "Paid for a Year Instead".
  - It also shows plan sheets read per company.
  - It works on the old server; Turn On Yearly says it needs the server update.
- **Ask knows the state.**
  - The app sends the job's state, the company's, the last job's, where the phone is, or what the person told Ask.
  - "Answered for Texas." shows under the answer, with Change on the newest one.
  - When Ask has to ask which state, it shows a state list.
  - A one-time Home card asks for the state: a company account with no state, or an Individual plan.
  - A State field on New Job shows only when City, State has no state.

## Tests
- Feature tests on the combined page all pass:
  - one device 80/80, Owner Dashboard 37/37, taper 58 unit + UI all pass;
  - yearly 56/56, billing 40/40, t98/t99 v2 output right;
  - Ask follow-ups 43/43, Ask state 9/9.
- 2 test updates were needed. The one-device "no sharing words" check also matched the Owner Dashboard's admin-only
  `pb_owner_share_events` call. The dashboard test looked for the build number r17.11.
- Full regression (hooks build, 2 at a time): **210 pass, 12 fail, 15 skipped (of 237).** The same 12 pass on r17.11.
  All 12 are the expected changes:
  - new plan buttons (t98, t99, t_b04, b1_beta, b3_owner);
  - the new calculator (w1, w4);
  - the build usage count (t95);
  - the new start-up calls `pb_device_seen` / `pb_state_rules_get` (s1_smoke, t00b, t02_day, t03_roles).
  - With the updated tests and goldens, all 12 pass.

## Notes
- English only for the new words. The Spanish dictionary needs them before Spanish is switched on.
- Patches: `tests/staged/r1712_candidate/patches/` (1 → 5b). None needed changes to apply together.

## Live, Nov 20
- App: commit ec2e22f; live sw.js says r17.12 · 2026-11-20. 13 updated tests pass on the release build after the stamp change.
- Server applied (each rolled-back test first): Owner Dashboard (17 checks pass), Billing yearly + sheets read (all pass),
  one device 01 + 03 (68 pass; trim job present; overrides = DIG Civil Construction + tfontaine@digcivil.com).
- NOT yet: one-device gate 02 (planned ~6 PM, after phones have r17.12), Ask follow-ups server add-on (goes with the next Ask build).
- Ask live = 4a5c84ce8242 (live b7ad + follow-ups add-on + abbreviation-cut fix), promoted Nov 20 ~3:05 PM. Rollback b7ad788e3a62 (commit 9c575fe).
- Ask live = 8b7042f9dfee + library 3,236 rows + shelf 47 + reply rule v7d (Nov 20 evening). Rollback steps in tests/staged/library_load_nov20/promotion/PROMOTION.md.
- One-device gate ON Nov 20 18:31 PT (pgrst.db_pre_request = public.pb_session_gate), after the first r17.12 check-in. Anon RPC + app page checked; no gate errors in logs. Undo: one_device_nov20/sql/99_undo.sql part 1.
- Ask live = d881cb695137 (lib8) + reply rule v8, Nov 20 ~7:05 PM.
