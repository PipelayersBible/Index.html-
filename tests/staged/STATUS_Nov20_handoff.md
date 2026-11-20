# Status, Nov 20 2026 ~10 AM — what's live, what's staged, what's next

## Live today
- **App r17.11** (commit 02b6e71). Contents:
  - Bug fixes from hunt rounds 1–2.
  - Shorter nationwide permit, with the gas meter and calibration, how entrants see the permit, and the last-night question.
  - Home by role, with swipeable notices that rotate every 3 s.
  - Feedback in the top bar on every screen.
  - Run Setup folds and the Reuse Pipe Settings button.
  - Office Today table with live fittings and gray "Nothing sent today" rows.
  - Records table on computers.
  - Prices shown in the app.
  - 811: state rules on the Renew form, Renew by dates, a Nevada new-ticket reminder 7 days ahead plus a gap note, and Oregon at 30 days. Start lines are hidden on renewed tickets.
  - Words ("send" instead of "sync"); Spanish built in but hidden (PB_ES_ENABLED=false; #es-review link works).
- **Server, Nov 20:**
  - Service grants for seal and photo checks and weather alerts.
  - 811 Renew + History.
  - Ask KB: 811 for all 50 states + DC, plus the safety entries.
  - Pricing and cost limits, with the DIG Civil override; strong plan look-ups now work.
  - Live fittings in the status.
  - State-aware Ask build b7ad788e3a62 promoted, with the price paragraph on the live prompt.
  - KB state fix.
  - Empty Ask shelf table pb_ai.kb_shelf + pb_ai_kb_shelf_search (only next builds read it).
- **Website:** published Nov 20, with the visitor FAQ, the legal wording fixes and the trench depth guide.

## Tommy's direction (Nov 20)
- No more one-release-a-week: beta fixes go in immediately once feedback starts. "Everything we're working on is intended to be put into this weekend's update."
- Ask: concise and direct; on complicated subjects, offer more and go deeper only if asked. Test rounds of about 100 until clearly better, then the big run. Total test spend under $50 (about $15 spent by ~10 AM).
- Copyrighted material (811 center handbooks, state DOT spec books, paid standards): summaries only.
- Devices:
  - Every login stays signed in on up to 2 devices; only one may be IN USE at a time (5 min idle); no sign-in while the account is in use; a 3rd device is refused.
  - A device holding an open permit keeps priority.
  - Safari and the Home Screen app count as one device.
  - All DIG Civil logins are Tommy's test accounts and get the override.
  - Refused attempts and sharing signals are tracked silently, never shown to users. Location is kept in the flags; the privacy sentence goes to the lawyer.
- He needs an **app-owner admin place** to track potential account sharing and anything else an app company should watch. Not started yet.
- Pricing: Individual $15/mo or $144/yr; company $99 for 5 people + $12 each extra, company account free; plan reading $1 a sheet (off until Billing shows sheets read).
- Georgia: don't guess. Tommy is calling Georgia 811 (reminder set with the questions).
- Time sheets: future, HCSS-style, auto-fill everything (Project doc claude/Future_Timesheets_Plan.md).

## Staged for the weekend update (folders under tests/staged/)
- `one_device_nov20`: being reworked to the 2-device / one-in-use / 5-min rule. Apply the app patch first, then the SQL.
- `renewby_nov20` p04: already in r17.11. Illinois is now 25 working days; one call to JULIE confirms it.
- `ask_followups_nov20`: "Answered for <State>", a one-time state-pick Home card, a State field on New Job, and the Washington trench chunks.
- `michigan_nov20`: per-state trench rules (Michigan Part 9 Table 1, Washington with no short-term Type A). HOLD until someone checks Michigan Table 1 by eye against page 5 of the MIOSHA Part 9 PDF.
- `library_load_nov20`: library merge, load to next only, and the 100-question rounds (ROUNDS.md has the latest).
- `ask_shelf_nov20`: shelf patch for the Ask build (next).
- Library collections: lib_811_nov20, lib_osha_nov20, lib_traffic_nov20, lib_specs_nov20, lib_more_nov20 (each has NOTES.md with app-accuracy lists and "For Tommy to get").
  - The 811 library found app state-table errors in NC, IL, VA, PA, GA, LA, AR, OK, ND, MN, FL, MO and KY.
  - The OSHA library found stricter injury-reporting rules in CA, WA, UT, AK and HI.
  - Traffic found a wrong CA sign spacing in live Ask (chunks ord 1914 and 1984) and stale OSHA cites in TT-031/033.
  - lib_more found two emergency questions that miss first aid in the first search.
- Proposed, not built:
  - taper/cone calculator;
  - a "report a serious injury" line by state;
  - heat talk wording (heat index for OR/MD);
  - a Washington walkway guardrail note (4 ft);
  - a Michigan trench note.

## Open questions for Tommy
- Taper/cone spacing calculator: build?
- Show refused sign-in attempts in the admin view only (yes, per Nov 20).
- Load the library to live after the rounds pass.

## Release steps (since r17.08)
- Source is `_src/index.html`. Patch a copy, bump PB_APP_BUILD (in `_src`) and PB_SW_BUILD (sw.js) together.
- Build with `python3 tests/r1708/speed2/build/build.py <src> <outdir>` (`--hooks` gives the test build).
- Full regression: `tests/run_all.sh --build <hooks>/index.html --jobs 2 --out <dir>`.
- Publish `index.html` + `pbx/` + `sw.js` + `_src/index.html` in one commit.
- Server applies: push the files, `net.http_get` the raw GitHub URL at the commit, check `md5(content)`, run the rolled-back test first, then `apply_migration` with a DO block.
