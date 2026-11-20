# Declutter, no features removed (staged on r17.10, Nov 19)

Role: declutter. `_src/index.html` was not edited. Nothing committed, pushed, deployed or changed on Supabase (no server
queries were needed: every change is in the page). The Feedback button was not touched. New Run was NOT moved to the top
of the foreman's Home.

Apply: `sh patches/apply_all.sh _src/index.html out.html` (01..03 in order; every `rep()` matches exactly once on r17.10).
Stacks cleanly with `simplify_nov19` (either order), `critic_nov19` and `feedback_btn_nov19` (either order): tried, all apply.

## What a foreman does daily (from the code), and what Home now shows first

Source: the foreman-only blocks on Home, `_src/index.html:4886-4889` (Current job; "Add note · Daily report" bar; "Your crew
right now" cards; toolbox talk), `:47093-47130` (the crew cards: active runs / permits, run reports to approve, permits
closed, on my crew), `:11104` ("the foreman's Daily report is the button under Current job"), and the foreman's own
notification types (`:5129-5145`: "Runs waiting for me", "Crew permit closed", "Run reports sent back"). So the foreman's
day in the app is: crew status, run reports to approve, daily report, notes, permits, tickets, production. Starting a
grade run is the pipelayer's job (Tommy, Nov 19).

## What changed, per role (phone 390x844 and a computer 1440x900)

Screenshots: `shots/before_<role>_*.png` and `shots/after_<role>_*.png` (roles: `pl` pipelayer, `fm` foreman with a crew,
`pm` PM/superintendent, `owner` company account; `_home_fold` = first screen, `_home_full`, `_more_full`,
`_settings_full`, `_desk_home`). Counts: `shots/counts_before.json`, `shots/counts_after.json`, and the table below
(printed by `tests/t_dc1_home.js`).

| Home | height px | buttons on first screen | crew / company cards end at | Jobs heading at | New Run at | text under 14 px | smallest text* |
|---|---|---|---|---|---|---|---|
| pipelayer phone | 1166 → 1120 | 8 → 9 | - | - | 477 → 279 | 9 → 1 | 13 → 14 |
| pipelayer computer | 1110 → 1101 | 13 → 13 | - | - | 439 → 279 | 9 → 1 | 13 → 14 |
| foreman phone | 1672 → 1606 | 11 → 11 | 560 → 525 | - | 878 → 1063 (on purpose) | 15 → 1 | 12.5 → 14 |
| foreman computer | 1599 → 1529 | 12 → 13 | 544 → 515 | - | 843 → 1015 | 15 → 1 | 12.5 → 14 |
| PM / super phone | 1681 → 1688 | 10 → 11 | 583 → 470 | 616 → 503 | in Field tools | 24 → 1 | 12.5 → 14 |
| PM / super computer | 1095 → 1027 | 14 → 14 | 395 → 289 | 429 → 322 | in Field tools | 23 → 0 | 12.5 → 14 |
| owner phone | 1629 → 1634 | 10 → 11 | 583 → 470 | 616 → 503 | in Field tools | 24 → 1 | 12.5 → 14 |
| owner computer | 1095 → 969 | 13 → 14 | 395 → 289 | 429 → 322 | in Field tools | 23 → 0 | 12.5 → 14 |

*The one piece left under 14 px is the small "THE" in the name mark at the top (11 px, part of the logo, not something to read).
The rig has no signal, so the "before" company cards are all dashes; that is exactly the empty case the change is for.

**Pipelayer.** Start work (New Run, Quick Run, Confined Space Permit, New record) now sits right under Current job; his
own rows (My production, Crew runs today) follow. New Run moved from 477 px to 279 px. Second lines shortened so each row
is one or two lines.

**Foreman.** Order is: Current job, Add note / Daily report, My crew now + crew cards, then "Crew runs today, My
production, My inspections & tests" (Crew runs today moved to first), then Start work, then shortcuts. A crew card with no
number (a dash or 0: "Permits closed", "On my crew", "My crew now") is one short line; a card with a number ("2 Run reports
to approve") stays a card, a third shorter (icon and number on one line). An EMERGENCY card is never shortened. Start work
is in the order a foreman uses it: Confined Space Permit, New record (field ticket, job book, management report), Log Work
Without a Run, then New Run, Quick Run.

**PM / superintendent and owner (Company Home).** The five count cards with nothing to count are short lines, so Jobs
starts 113 px higher on a phone and 107 px higher on a computer. The loose pills (New record, Company production, Company
tickets, My production, inspections) and the dashed "Field tools" row are one "Tools" group: a plain list on a phone, a
row of buttons on a computer. Computer: "New job" was on the screen twice; now once (see look-alikes).

**Everyone: one notice at a time.** Home could stack several yellow notices (spoils, unsigned dailies, add spec books,
plan changes, toolbox talk, turn on notifications, company invitation). Now the first one shows and the rest are named on
one line: "Also: 2 daily reports not signed · Add your spec books  Show". Tapping it shows them all. Never folded, always
shown: anything about unsaved work or photos, a permit not saved / closeout not finished, people still checked in, a dig
ticket about to expire, the unreadable-permit banner, and the beta-ended / plan-paused line. When one of those is up, the
optional ones all go to the "Also" line. (`01_home_layer.py`, `ALWAYS_ATT`.)

**More tab.** "Learn" held Plans and Toolbox Talks, and "Production" held one row. Now: "On the job" (Stats, Plans,
Toolbox Talks, Documents when shown) and "Learn" (Education & Reference, Confined Space Reference). The last group has
"Edit Home shortcuts" and a new "Account & Settings" row (people look for settings under More; the person button at the
top right still works). Nothing is deeper than before: every More row is one tap from the tab.

**Account & Settings.** Preferences, Notifications and Privacy were three cards holding 3 + 1 + 1 things, all about this
phone. Now one Preferences card: 6 cards → 4, foreman 1798 → 1560 px, owner 2082 → 1850 px. Every control keeps its id.
Things used weekly are 2 taps from Home: person button, then Crew members / Add a Pipelayer by Text / Company logo.

## Look-alike items

| Item | Before | After |
|---|---|---|
| "five look-alike Start work rows" | Foreman: New Run, Quick Run, Log Work Without a Run, Confined Space Permit, "New" (whose second line repeated "Work without a run") | "New" is named **New record** (the company Home already called the same sheet that). "Work without a run" is no longer listed a second time inside that sheet when the Home row is on the screen. Still five rows for a foreman (five different things), four for a pipelayer, in the order each role uses them. |
| "New job" twice on a computer | Side menu (an unstyled grey button: its style was written for inside the page and the menu is outside it) and a yellow one beside Jobs | Once: the side menu's button, now the yellow main-button look. A phone (no side menu) keeps the one beside Jobs. |
| Report names | Daily report, Run report, Management report, Field ticket, Job book entry, My production, Company production, Stats, Records | **Not renamed** (they are in about 300 places, PDFs and records included). Proposal in decision 3. |
| Card styles on Company Home | Count cards, pills, a dashed row | Count cards + one list group |

## Patches (built, tested)

- `patches/01_home_layer.py`: Home for every role. One `<style>` and one small script at the end of the page. The script
  only adds classes and moves whole rows; it keeps every id, handler and show/hide rule. It reads the role from what the
  page already decided (company Home on = office; crew cards shown = foreman; otherwise pipelayer / own plan). Also:
  "New" → "New record", three shorter second lines.
- `patches/02_company_home.py`: the "Tools" group, "New job" once on a computer, side-menu button style.
- `patches/03_more_settings.py`: More groups + Account & Settings row; Settings one Preferences card; 14 px second lines.

## Tests

Run: serve a folder holding `cur.html` (patched) and `base.html` (r17.10 `_src/index.html`) on a port, then
`NODE_PATH=/opt/npm-tools/node_modules PB_PORT=<port> node tests/<test>`.

| Test | Covers | Result |
|---|---|---|
| `tests/t_dc1_home.js` | Each role, before vs after: every button on Home before is still there; order by role (foreman: New Run stays below crew cards); empty card = short line, number = card, EMERGENCY never short; "New record" sheet and no duplicate; 8 foreman rows still open their screens; Tools group; Field tools still opens; "New job" 2 → 1 on a computer and opens the form; text 14 px; Feedback still there; no page errors; notices 3 → 1 + "Also" line, tap shows all, dig ticket never folded | ALL PASS (90 checks) |
| `tests/t_dc2_more_settings.js` | More: all rows kept + Account & Settings, groups, opens Settings. Settings: every control kept, 6 → 4 cards, text size / crash switch / push row still work, Crew members 2 taps from Home | ALL PASS (25 checks) |
| `tests/shots.js before\|after` | the screenshots and `counts_*.json` | - |

Existing tests on the patched page (`run_all.sh --build <patched> --jobs 1 --only ...`, 23 tests): see "Regression" below.

## Regression (existing tests that read Home / More / Settings)

REGRESSION_PLACEHOLDER

## Not done, and why

- **Report names** not merged (decision 3).
- **Settings > "What each plan includes"** is stale (critic C); it is wording about plans and price, Tommy's call, not clutter.
- **Run Setup / permit form length**: other helpers (simplify, permit_short).
- **Office table on a computer** (critic H: Records is a phone column on a monitor): a build of its own, 3–5 days.
- I did not hide the foreman's zero crew cards entirely: a zero is information, and each one is still the door to its list.
- Not tried on a real iPhone. Checked in Chromium at 390x844 and 1440x900, light theme; dark theme and Large text checked
  by screenshot (`shots/after_fm_dark.png`, `shots/after_fm_large.png`, `shots/after_owner_dark.png`).

## Decisions for Tommy (my pick first)

1. **Foreman's Start work order: permit, New record, work without a run, then New Run, Quick Run?** Yes. You said New
   Run is rarely the foreman's tool. If you'd rather every role sees the same order, it is one line (`START_FM`).
2. **One notice at a time, the rest on an "Also: ..." line?** Yes. Safety and unsaved-work notices and dig tickets are
   never folded. Say if any other notice should always show (for example "daily reports not signed" for the office).
3. **One word per report.** Proposed, not built: keep "Daily report", "Run report", "Field ticket"; rename "Management
   report" to "Report to the office" (it is a problem report with photos, not a report for managers); "Job book entry" to
   "Job note"; keep "My production" / "Company production"; "Stats" to "My footage". It touches PDFs and old records'
   labels, so it needs your yes first.
4. **"Account & Settings" row on the More tab?** Yes: one row, and it is where people look.
5. **Simplify helper's patch 01 (Start work above the foreman's rows) and this one overlap.** Use this one's order
   (pipelayer: Start work first; foreman: crew first). Both can be applied; this layer decides the order by role.

## DONE
