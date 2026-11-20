# Harsh critique, round 2 (build r17.10, Nov 19 2026)

Role: harsh critic. Nothing was committed, pushed, deployed or changed on Supabase. `_src/index.html` was not edited.

**How I looked.** Walked `_src/index.html` (r17.10) at 390 px with the Playwright rig as foreman, pipelayer and company
account, at 390x664 (what iPhone Safari actually shows with its bars) and at 1440 px for the office. Read the Nov 17
critique first (disk copies: `/tmp/claude-0/bughunt/critic/CRITIQUE.md`, same text as `/home/claude/proj/critique.md`;
I can't open the Project doc itself from here) and `tests/r1710/streamline/NOTES.md`. Scripts: `t/walk1..4.js`.
Screenshots: `shots/` (names given below). Competitor facts were checked on the web today (links at the end).

**Limits, so nothing here is oversold.** The rig's fake server answers most company lists with nothing, so the
"Loads with signal" / "Couldn't load" lines in my screenshots are partly the rig. I could not sign in to the live app.
I mark those points "rig". Nothing was tried on a real iPhone.

## What the last critique said that is now fixed (not re-reported)
Low-slope check; second rod shot pushed when AI read the stakes; "data looks clean" wording; text join links with no
email; Home Screen step; storage kept (`storage.persist`); cold-open speed (r17.08); daily report now picks up the
job and date from the run in progress; crew can open a read-only copy of the crew's run; support email in Settings.

## STILL wrong from the Nov 17 critique

1. **Release pace got worse, not better.** Nov 17 said "freeze releases" (about 100 in four days). `git log` per day:
   Nov 14: 29, 15: 31, 16: 31, 17: 32, 18: 21, **19: 37**. That is 181 commits in six days, 10 numbered releases
   (r17.01 to r17.10) in about a day. A beta crew's app changes under them several times a shift.
2. **The app kept growing.** 86 screens then, **91 now**; 71,000 lines then, 74,603 now. Nothing was cut or hidden.
3. **Foreman Home still hides the one thing he came for.** At 390x664 the first screen is: Current job, Add note,
   Daily report, "My crew now", three stat tiles. No way to start work is on screen. New Run is at y = 1001 px, a
   screen and a half down (`shots/c_fm_home_fold.png`, `shots/fm_home.png`). 22 of the 56 pieces of text on Home are
   under 14 px (12.5 px sub-labels): unreadable in glare for a 50-year-old.
4. **Start work is still five look-alike rows:** New Run, Quick Run, Log Work Without a Run, Confined Space Permit,
   and "New" (which repeats "Work without a run").
5. **Run Setup is still a wall:** 23 boxes + 6 dropdowns, 53 controls, 3,364 px (was 3,805). The first thing on it is
   a full-width "Import Cutsheet" button (`shots/c_newrun_fold.png`).
6. **A foreman's New Run still fills "Pipelayer name" with the foreman's own name** (`saPipelayer = Tommy Fontaine`
   right above "Foreman: Tommy Fontaine"). A wrong name goes on a record sold as dispute-grade.
7. **"Lock This Run" then "Edit Run Data"** is unchanged. So is the pile of report-like names (Daily report, Run
   report, Management report, Field ticket, Job book entry, My production, Company production, Stats, Records).
8. **The confined space permit is still 42 boxes, 891 words, 8,417 px (10.5 screens)**, and still on for betas.
9. **Entity:** the Terms still name Desert Infrastructure Group (`terms.html:8`). The Nov 17 decision was a new LLC
   before the first paying customer. An owner who looks up the seller finds a construction S-corp.
10. **No phone number anywhere in the app** (Settings has Email Support only). A foreman does not email.
11. **Supabase's login library still loads from a public CDN with a floating version and no integrity check**
    (`_src/index.html:976`, `supabase-js@2`). One line for the bug hunter / security helper.
12. Office first look (rig): six tiles of dashes. A new company's Getting Started card is good, but the dashboard
    under it is still empty tiles until somebody types a plan (`shots/ob/start_light.png`).

## New problems I found this round

A. **The yellow Feedback pill floats over things people must tap.** (Verified by measuring, `t/walk2.js`.)
   - Run Results: it sits on a grade row's Dist. box, the box you tap to mark pipe laid, at every scroll position I
     tried (rows 0.0, 30.0/40.0, 70.0, 100.0) and on Delay, End Run Without Completing and View Report
     (`shots/c_results_pill.png`). A gloved thumb will open Feedback instead of marking pipe.
   - Choose Your Password: on the Terms line (`shots/sl/setpw_crew.png`). Run Setup: on the Notes box.
   - Computer: on the "Signed in as" line of the side menu (`shots/c_owner_desktop.png`).
   **Built: patch 01.**
B. **Bottom of the screen is three layers deep on a working run:** "Run in progress" bar + tab bar + Feedback pill
   (+ a round jump button on Run Setup). On a 664 px screen the grade sheet opens showing 1.5 rows of numbers; the
   first number is 480 px down, under Edit Run Data, Run details, Flagged at Lock, Columns, Zoom, and the stats row
   (`shots/fm_results_fold.png`).
C. **The customer never sees a price.** Home says "Beta · 23 days left" and nothing else. When the beta ends the
   owner gets one button, "Start Company Plan", and then "Request sent. You'll be contacted" (source
   39786-39797). Crew get "Company Plan" / "My Own Plan" and the same line (`shots/c_crew_beta_ended.png` is the
   crew version: the rig's account is not flagged as the company account). No "$99 a month, 5 people", no list of what he gets. Settings >
   "What each plan includes" is stale: it says the contractor plan adds "Confined Space permits, Reports (Records)
   and Management report" (source 5034) and leaves out daily reports, the company board, tickets, plans and Ask.
D. (dropped: a rig effect, not a finding.)
E. **English only.** No Spanish anywhere in the app (0 matches for Español; 3 for "Spanish", all in admin code).
   The join screen makes a pipelayer agree to Terms and read "What your company sees" in English. For confined space,
   OSHA requires training "In both a language and vocabulary that the employee can understand" (29 CFR
   1926.1207(b)(1)). A permit a Spanish-speaking attendant can't read is a weak permit, and a safety manager will say so.
F. **The Home Screen card's steps are in an order nobody can follow.** Step 3: "Open the new icon. Tap Get a Code
   below, then Paste Join Code in the new app." Once the new icon is open, "below" is gone (`shots/ob/a2hs_light.png`).
   The r17.10 sheet has it right. **Built: patch 02.** Also: a sign-in code is pasted with a button called
   "Paste **Join** Code". Fine for a new pipelayer, wrong word for an owner signing in.
G. **Join sheet is about 830 px tall;** the Terms tick and Join Crew are below what a phone shows, and the sheet is
   capped with `100vh`, which on iPhone Safari is taller than the visible screen. Risk (not seen on a real phone):
   Join Crew under Safari's bottom bar. **Built: patch 03** (uses the visible height).
H. **Office on a computer is a phone in the middle of a monitor.** Home uses the width. Records is a 560 px column
   with four filter pills (`shots/c_owner_desktop_records.png`). A super checking four crews wants one table: crew,
   job, feet today, report in or not, permit open or not. "New job" appears twice on the same screen.
I. **Permit PDF reads like the programmer wrote it** (sample from today, `shots/pdf/o3_39_permit-1.png`; wording
   checked in r17.10 source 51028, 29772): "(device time of the server's answer; the server's own received_at is kept
   on the server)", "(as written in the record, on the phone that locked it; its time zone is not written)",
   "(minO2 standard, maxO2 standard, maxLEL standard…)", "rev 76c18c96". The layout is good. The wording makes an
   inspector wonder what is being hedged.
J. **What an inspector asks next and the permit can't answer:**
   - Which gas monitor, and when was it calibrated or bump-tested? The air-test log has O2, LEL, H2S, CO, Other and
     Tester (ids `cpAtmo*`); no instrument box. (Not a listed permit item; it is the first question in an inspection.)
   - How did the entrants see the permit? "The completed permit must be made available at the time of entry to all
     authorized entrants" "by posting it at the entry portal or by any other equally effective means" (29 CFR
     1926.1205(c)). The permit lives on one phone; I found no words in the app about showing it to entrants.
   - A permit can be locked and closed "Completed Normally" with "No air tests recorded" (the sample PDF). The PDF
     does print that in red, which is right, but the headline still says Completed Normally.
K. **Ask is the loudest thing in the tab bar** (gold outline, every screen) while New Run is a screen and a half
   down. Quick Run lights up the "More" tab though it is opened from Home.

## The six people

**1. Foreman, 50, gloves, glare, one bar.** Buttons are big enough (0 small targets on Home and Run Results). He
still quits at Home: nothing to start work on the first screen, dashes in five tiles, 12.5 px grey labels. If he
finds New Run he meets 53 controls. If he gets to the grade sheet, it is good: huge numbers. Then his thumb hits
Feedback. What he would say: "Where do I start, and why is it asking me all this?"

**2. Pipelayer with a text link.** Android: link, name, tick, Join Crew. Good. iPhone: about 10 taps with a code
copied between two apps; it is as short as Apple allows, but it is the step most likely to need the foreman standing
next to him. The first thing he reads is a grey box listing everything the company can see about him, in English,
then a legal tick. His Home is better than the foreman's, but New Run is still at the bottom edge of the first screen
under "Current job", "My production" and "Crew runs today" (`shots/c_pl_home_fold.png`).

**3. Owner deciding on $99.** In ten minutes he sees: a Getting Started card (good), then empty tiles, then nothing
that says what this costs or what he gets. The value (grade sheet → footage → run report → daily) only shows after a
crew lays pipe with it, which is not in the first ten minutes. There is no sample job to look at. He quits when: the
foreman says "I'm not typing all that"; the beta ends and the app says "you'll be contacted"; he asks who the seller
is; or he already pays for Raken/HeavyJob and this is a second daily.

**4. Super / PM in the office.** Home board is fine on a monitor. Everything past it is phone-width. No one table of
today across crews, no export of a week. Company production says about itself "Not live if a phone is offline, and
nobody is alerted from this board" — honest, and also the reason he won't rely on it.

**5. Safety manager / Cal/OSHA inspector.** Likes: 1926.1206 items listed (a)–(p), limits printed, red "No air
tests recorded", CO at 25 ppm, trench rule by state, backed-up copy. Distrusts: English only; no gas-monitor
identity; a 10-screen form on a phone (they know nobody reads it); programmer wording in the PDF; a one-person
vendor named after a construction company; AI ("Ask") one tap from a permit, even with its warning.

**6. Competitor's product manager.** What they'd list as missing: time cards with payroll export (Raken, HeavyJob);
cost-coded labor and equipment hours to accounting (HeavyJob "Export to payroll and accounting"); native App Store /
Play Store apps (Fieldwire: "Web, iOS, and Android"); plan markup, tasks and punch lists pinned to sheets (Fieldwire);
integrations of any kind (0 in the app: no QuickBooks/Sage/Viewpoint export); Spanish; a sales and support team.
Price: Raken is listed at $23 and $59 per user a month with a 3-user minimum; Fieldwire Pro about $39–54 per user;
HeavyJob is quote-only. $99 for 5 people (about $20 each) is under all of them, so price is not the fight.
**The real edge, and they can't copy it fast:** stake photo → grade sheet with a rod reading for every stick, working
with no signal, and the footage and run report falling out of it with no typing. Nobody on that list helps the man
holding the rod. Everything else in the app is a thinner copy of something they already sell.

## Feature bloat: cut or hide for the beta
Hide behind a per-company switch, off by default: Ask, Plans, Toolbox Talks, Education & Reference, Stats, Job book,
"New" tile, My Shortcuts editor, inspections & tests, locates, material alerts, Beta Results until the last week.
Keep on: New Run, Quick Run, calculators, run report, daily report, crew invites, the company board.
Confined space: keep for Tommy's own company; for betas make it opt-in per company.

## Top 10 changes, ranked
| # | Change | Why | Size |
|---|---|---|---|
| 1 | **Stop releasing daily.** One build a week to betas, a one-line "what changed". | 181 commits in 6 days. A grade tool has to be the same tool tomorrow. | No code |
| 2 | **Foreman Home: New Run / Continue Run as the first big button.** Tiles below, shown only when they have a number. | The first screen has nothing to start work with. | 1 day |
| 3 | **Run Setup: show job, pipe size, start stake, rod shot, end stake. Everything else under More.** Leave Pipelayer name empty on a foreman's phone. | 53 controls before a number. | 2–4 days |
| 4 | **Get the Feedback pill off the grade sheet, password, setup and permit screens.** | It covers the mark-laid box. | Built (01) |
| 5 | **Tell the owner the price and what he gets,** in the app, from day one of the beta, and fix "What each plan includes". | Today the answer to "what does it cost" is "you'll be contacted". | Half a day + Tommy's call |
| 6 | **Spanish for the join screen, the crew notice, the grade sheet labels and the permit.** | Crews; and a permit people can't read. | 1–2 weeks |
| 7 | **Hide the bloat for betas** (list above). | 91 screens, one person supporting them. | 2–3 days |
| 8 | **A real office table on a computer:** today by crew (feet, report in, permit open), click through to the record. | The PM persona has a phone column on a monitor. | 3–5 days |
| 9 | **Permit: add the gas monitor (make/serial, last calibration), a "show this permit to entrants" step, plain PDF wording.** | The first three things an inspector asks. | 2–3 days |
| 10 | **Seller and support:** the LLC name in the Terms before anyone pays; a phone or text number in Settings. | Trust. | Paperwork + one row |

## What I built (tested) vs proposed
Built, in `patches/` (apply in order with `sh patches/apply_all.sh in.html out.html`; each `rep()` matches exactly once on r17.10):
- `01_feedback_pill_off_work_screens.py`: no pill on Choose Your Password, Run Setup, Review, Run Results, Entry
  Permit; bottom-right on a computer. Feedback stays on Home and every other screen, and in Settings.
- `02_home_screen_card_order.py`: the iPhone Home Screen card's steps in the order the r17.10 sheet uses.
- `03_join_sheet_dvh.py`: sheets capped to the visible height (old phones keep the old rule). Not seen on a real iPhone.

Test: `tests/t_cr1_pill.js`: **19 pass on the patched page; 8 fail on r17.10 as it is** (the 8 things the patches
change). Also re-ran on the patched page: `t95_beta` (matches its golden) and `t130_onboard` (ALL PASS).
No golden file contains the changed card words (grep).

Proposed only: everything else in the top 10.

## Bugs tripped over (one line each, for the bug hunter)
- Quick Run opened from Home highlights the "More" tab.
- Computer layout: "New job" twice on Home (side menu and Jobs header).
- `supabase-js@2` from jsdelivr, floating version, no integrity attribute (source 976).

## Decisions for Tommy (my pick first)
1. **Feedback pill off the working screens** (patch 01)? Yes. It stays on Home and in Settings.
2. **Show the price in the app during the beta** ("$99 a month, 5 people, $12 each extra")? Yes. An owner who has to
   ask is an owner who assumes it's expensive. (You said no price on the website for now; this is inside the app, to
   people already using it.)
3. **One release a week for beta companies?** Yes, starting when the first outside company is on.
4. **Hide Ask, Plans, Talks, Education, Stats, Job book for beta companies unless they ask?** Yes.
5. **Spanish: do it before outside crews, or after the first beta?** Before, at least the join screen and the permit.

## Sources
- Raken plans and prices: https://www.projectmanager.com/blog/what-is-raken
- HCSS HeavyJob features (pricing by quote): https://softwareconnect.com/construction-management/hcss-heavyjob
- Fieldwire features and prices: https://makerstack.co/reviews/fieldwire-review/
- 29 CFR 1926.1205(c): https://www.law.cornell.edu/cfr/text/29/1926.1205
- 29 CFR 1926.1207(b)(1): https://www.law.cornell.edu/cfr/text/29/1926.1207

## DONE
