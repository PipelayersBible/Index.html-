# The Pipelayer's Bible: Design, Organization & Follow-Through Audit
Build checked: **r17.14 · 2026-11-21** (the build live at app.pipelayersbible.com, repo `main` @ c9ae314)
Method: ran the build in Playwright at phone size (400×850), light and dark mode, signed in as **foreman**, **pipelayer**, **manager/company** and **individual** (test rig `tests/rig/co_fm`, `co_pl`, `co+mgr`). I opened all 92 screens and walked these flows end to end: Run Setup → Review → Lock → Results → End Run, Quick Run, Daily report, Entry Permit form, field ticket, check-off, management report, calculators, Records, Ask, Settings, Edit Shortcuts.

**Ground rules for every fix below**
- **Don't remove features.** Everything here is moved, merged, restyled, prefilled or cleaned up. Nothing gets deleted, except 4 screens nobody can reach (see C-4).
- Keep Thomas's standing rules: short help text, no novels, red = danger, ALL CAPS only for the title, EMERGENCY and DO NOT ENTER, the Feedback button stays on every screen, and a calculator answers as you type.
- No backend was connected (offline rig), so screens that load server data were judged on their empty, offline and layout states, not on live data.
- Priority tags: **P1** = a person will be confused, or the app fails to do what they'd expect. **P2** = looks or feels off, slows people down. **P3** = polish, or a "pleasant surprise" add.

---

## A. App-wide design system (fix once, every screen improves)

**A-1 (P1) Yellow means too many things.** Brand yellow is used for the primary button, the selected state of every segmented toggle, the Feedback pill, step-number badges, the active tab and some list icons. The eye can't find the one thing to tap. On Run Setup, "Read All Stake Photos" (big yellow, mid-form) competes with "Review & Calculate". Crew members has two full-width yellow buttons.
→ Use solid yellow for **one primary action per screen** only. Selected toggle segments: dark fill (near-black, white text; inverted in dark mode) or a yellow outline. Step badges: neutral. Feedback pill: neutral outline (see A-2). Secondary AI buttons ("Read All Stake Photos", "Read Stake w/ AI", "Read Ticket With AI"): outline style with a small sparkle icon.

**A-2 (P1) The header is overcrowded and inconsistent.** Back button + icon + title + star + Feedback all share one row. The result: titles wrap to 2–3 lines ("Confined Space Ventilation", "Rod Reading → Elevation", "Report an App Problem", "My Management Reports"), the Feedback pill shrinks its own font to fit (it's a different size on almost every screen), and "Company per-mit records" gets hyphenated mid-word.
→ One header spec for all screens:
  - Row 1: back arrow · title (single line, ellipsis; turn `hyphens` off on headings) · Feedback.
  - Feedback becomes a fixed-size neutral icon button (speech bubble + "?"), the same size everywhere. It stays on every screen as decided, just quieter.
  - Move the calculator "★ Add to Home" star and the Education "Add to Home" button into the page body, as the first row under the header (small "☆ Add to Home" chip), or into a ⋯ menu.
  - Fix the font size: never auto-shrink.

**A-3 (P1) Back button missing or inconsistent.** No back arrow on: Run Results, Run Setup (has Cancel instead), Quick Run, Management report, Report Receipt, Education & Reference, Calculators hub, Active Permit. Active Permit also uses a different (outlined) Feedback and a smaller title.
→ Every pushed screen gets a back arrow. Tab roots (Home, Calculators, More, Records, Ask) get none. Run Setup keeps "Cancel" as its back control, styled like the back arrow position. Active Permit: same header as everything else. The EMERGENCY button already dominates, so the header doesn't need to differ.

**A-4 (P1) The bottom tab highlights the wrong tab.** Opening Daily report, Work without a run, Field tickets, Job book, Locates, Crew members or Check off **from Home** lights up **Records**. Crew runs today lights up Home. Company logo lights Records. Plans lights More.
→ Rule: the highlighted tab = the tab you came from (keep it in the history stack). Fall back to the screen's "home tab" only on a deep link.

**A-5 (P2) Cards inside cards inside cards.** Run Setup nests Job & Pipe card → Job details panel → fields, three containers deep. Inspection Check-off puts some fields in a card and the rest outside it. Bedding & Shading's "Add Section" button butts right up against the card above. The Settings Preferences card has no inner padding (the Appearance and Text-size toggles touch the card border).
→ Max 2 levels: section card → fields. Inner groups become a plain sub-heading with a hairline divider, not another box. Use one spacing scale (4/8/12/16/24) and 16px card padding everywhere.

**A-6 (P2) Three different button styles for the same weight of action.** Grey filled ("Refresh", "Work Without a Run", "Add Photo", "Add Talks"), white outlined ("Refresh" again on other screens, "Save PDF"), and rounded outline chips, all for secondary actions. Run Notes tiles are grey filled while the same weight of action elsewhere is outlined.
→ Three tiers only: Primary (yellow, one per screen), Secondary (white with 1px border), Tertiary (text link). Destructive = red text on Secondary. "Clear Calculation" in Quick Run is harmless, so it shouldn't be red; make it Tertiary.

**A-7 (P1) "Couldn't load / Loads with signal" repeated in every tile.** Offline foreman Home shows "Loads with signal" four times. Manager Home shows it on five tiles plus "Couldn't load" twice. Company production stacks "Couldn't load the live board." right against the "Permits" heading with no spacing.
→ One thin offline banner under the header ("Offline: showing what this phone has. Updates when you have signal."), with tiles showing "–" or their last-known value and a small "as of 6:12 AM" stamp. Pull-to-refresh on list screens replaces the big standalone "Refresh" buttons (keep a small refresh icon in the section header for people who don't know pull-to-refresh).

**A-8 (P2) Empty states that are just a Refresh button.** Job book, Locates, Crew runs today, Company tickets, Inspections & tests (company), Company permit records, App problems, Management inbox, Job (prodJob), Documents Review, Plan Set and Company (cxList) are blank pages with a Refresh button and nothing else.
→ Every empty state = icon + one line saying what will show here + the primary action if one exists. Examples: Job book: "No entries for this job yet." [+ New entry]. Locates: "No 811 tickets on this job." [+ Add ticket]. Crew runs today: "None of your crew has started a run today."

**A-9 (P2) Help text creep (breaks the Oct 28 declutter rule).** Long explanations are back on: Entry Permit top (3 lines before the first field), Quick Run ("Fall is positive…", "Enter three of the four values…", "How far apart the rows…"), Backfill Lift Count (4-line paragraph inside the card), Pipe Weight, Report an App Problem (2 paragraphs + a 4-line box), Ask (5-line privacy paragraph under the button), Stats, Manage Stats, Company permit records, App problems, Safety events.
→ Cut each to ≤1 short line or a small ⓘ link. The AI privacy notice appears under every AI button (twice on Run Setup, again on Ask and tickets). Show it once per account (first AI use, with "Got it") and after that as a small "ⓘ How AI is used" link.

**A-10 (P2) Red used for non-danger.** The Confined Space reference "Full standard text" (plain regulation text) sits in a red alarm box. Ventilation's "Not an OSHA number" disclaimer and Trench Sloping's "OSHA's table" note are red too. Meanwhile a real run warning ("Flagged at Lock: Backflow") on Run Results is plain grey text.
→ Red only for danger or blocking problems. Disclaimers and reference notes: neutral or blue info style. Run warnings follow the Nov 4/5 color rules (red = must act, yellow = check), and Backflow gets at least yellow, matching how loud "Trench 4 ft or Deeper" is.

**A-11 (P2) Truncated values in fields.** Run Setup: Foreman dropdown shows "Tommy Font", Pipelayer shows "Tommy Fontaine" cut off, Pipe type shows "PVC SDR 35 (au". Ventilation ACH dropdown: "Enter the ACH from the job's ventilatio".
→ Foreman/Pipelayer each get a full row, or show first name + last initial. Pipe type: drop "(auto)" from the visible label and show a tiny "auto" tag instead. Long select placeholders: shorten ("Pick ACH").

**A-12 (P2) Fonts load from Google's servers.** `fonts.googleapis.com` (Inter, Oswald, IBM Plex Mono) isn't cached by `sw.js`, so offline (the normal jobsite case) the app falls back to system fonts and looks different. It also sends every user's IP to Google.
→ Self-host the three font files (subset, woff2) next to index.html and precache them in sw.js.

**A-13 (P3) Title style mix.** Calculator screens have a tiny ALL-CAPS kicker above the title in the DOM ("BEDDING & SHADING", "NEW RUN", "LOCKED RESULT") while other screens don't. Check the Spanish build too, since the kicker text shows in innerText. Keep ALL CAPS only for the app title, EMERGENCY and DO NOT ENTER, per the decision.

---

## B. Navigation & information architecture

**B-1 (P1) Records vs Reports: two screens doing the same job.** Records (archive) has filters All/Date/Job/People/📱. Reports (reportsAll) has Date/Type/Job/People/Status and the same "No reports yet" list. The phone icon-only chip on Records means nothing to a new user.
→ One Records screen with filter chips: Type · Date · Job · People · Status · "On this phone" (text label, not just an icon). Point every "Reports" entry at it.

**B-2 (P1) Three ways into the same production data.** Home "My production" (a long stack: Work Without a Run, Send Now, My crew now, crew permits, My crew, claims, Today, Earlier, Your jobs, Field tickets), Home "Log Work Without a Run", and "Crew runs today" all overlap. "Work Without a Run" appears as a Home row *and* as a button inside My production.
→ Split My production into clear tabs: **Today** (what I logged + Send Now) · **My crew** (crew runs, crew permits, crew list, Add to My Crew) · **Jobs** (your jobs, field tickets). Keep the Home row "Log Work Without a Run" and drop the duplicate button inside My production (or the reverse, but not both).

**B-3 (P2) Foreman Home is long and unordered.** On a 6-inch screen a foreman sees status tiles first, and "Start work" begins below the fold. After ending a run, the same report shows twice: the "Sending the report to the office…" card **and** a "Needs Attention · Not sent" row.
→ Order: Current job → Needs attention (one merged card per item: "Run 24-017 · Sending… / Not sent · View · Save PDF") → Start work → Crew & production → Shortcuts. Status tiles shrink to one compact row of counts.

**B-4 (P2) Manager Home vs Company production repeat the same job list** with different layouts (Home: category grid with wrapping labels like "Excavation -\nMain"; Company production: clean table rows).
→ Use the Company production table layout (label · % · qty) on Home cards too. Home shows the top 3 jobs needing attention + "All jobs ›".

**B-5 (P3) Daily report / Job book / Locates / Plans / Field tickets each ask for the job separately.** See C-1. Once prefilled from the current job, add a small job switcher in the header ("Job 24-017 ▾") so they all behave the same.

**B-6 (P3) Account button vs Settings.** The round person icon in the header and "Account & Settings" in More go to the same place. Fine to keep both, but the icon should show initials ("TF") so it reads as "me".

---

## C. Follow-through: things a person expects the app to just know

**C-1 (P1) The job doesn't follow you.** After a run on job 24-017 is ended, Home goes back to "Current job: None chosen". Then Daily report, Add note, Entry Permit, Field ticket, Plans and Work without a run all open with an empty Job number. The "Choose job" sheet says "No jobs listed yet" even though a run was just done on 24-017.
→ Keep the decided meaning of Current Job (whatever is active), but add **"Last job used today"** as the default everywhere a job number is asked: prefill it, and list every job used on this phone (and from the company list) in the Choose sheet. A foreman finishing a run and tapping Daily report should land on 24-017 with today's run already listed.

**C-2 (P1) Dates and times not auto-filled.** Field ticket (Date, Time), Inspection check-off (Date, Time, **Time zone blank**), Safety events filter, New job start date and Entry Permit date (shows blank on the form, though permit dates were decided to fill in automatically) all start blank or blank in some paths.
→ Default every "when did this happen" field to now and the phone's/company's time zone. The person only edits it if it's wrong.

**C-3 (P1) End Run and Send Report gives no clear "done".** Tapping it jumps straight to Home with a card that says "Sending the report to the office…". The person doesn't know who it went to, or whether it got there.
→ Show a one-second confirmation ("Sent to Brandon Jones ✓" or "Saved, will send when you have signal"), and change the Home card text when sending finishes ("Sent to Brandon · 7:02 PM"). If it's still waiting, say so and keep it under Needs attention only.

**C-4 (P2) Dead / orphaned screens.** `screen-calcCatGrade`, `calcCatPipe`, `calcCatTrench` (titled "Safety"), `calcCatStructures` exist in the HTML with older descriptions, but nothing navigates to them (only CSS references). `pdfView` redirects to Notifications when opened directly. `confinedHub` shows two tiles with **blank grey icon squares** (missing icon CSS) when reached.
→ Remove the 4 calcCat screens and their CSS after a final grep. Fix confinedHub's icons (or route its one remaining entry straight to the permit, as Home already does).

**C-5 (P2) Run labels are generic.** The "Continue Run" row and the Sending card say "Start → End". Without station labels the person can't tell runs apart.
→ Use "Job 24-017 · 0+00 → 1+00 · 40 / 100 ft laid". Fall back to the job number + start time.

**C-6 (P2) Run Results wording.** "Current time 5s" is actually elapsed time, so call it "Elapsed". The column header "Dist." while Run Setup says "Station": pick one per run (show station when one was entered, otherwise distance), consistent with the report.

**C-7 (P2) Run Setup asks for things it could know.** The AI notice is repeated under Start and End points. Cut/fill amount sits on its own row next to a Cut/Fill dropdown.
→ Put Stake elev · Cut/Fill · Amount on one row (Cut/Fill as a small two-segment toggle C | F). Show the AI notice once.

**C-8 (P2) Management report: "Your company's Management inbox (not confirmed yet)" in orange as the first thing the person reads.** It sounds like an error.
→ "To: Management" in plain text. Show the not-confirmed note only if it's still unconfirmed when they tap Send.

**C-9 (P3) Ticket form shows fields for every ticket type.** Concrete selected still shows Supplier *and* Company (sub).
→ Show only the fields for the selected type (Concrete: supplier, mix, PSI, slump, water, truck; Sub: company, hours, description).

---

## D. Screen-by-screen notes (not covered above)

| Screen | Issue | Fix |
|---|---|---|
| Home (all roles) | Footer "Signed in as tester@example.com — contract…" truncated | Two lines, or move into Account |
| Run Setup | Floating "⌄" scroll button covers fields | Hide when keyboard is open, or replace with a sticky "Review & Calculate" bar once the required fields are filled |
| Run Setup | "Import Cutsheet" pill floats alone above the cards | Put it inside Step 2 header as "Import" link next to "Read All Stake Photos" |
| Check Before Locking | Long list of plain-text lines ("Station 0.0 · Rod readings (ft): BOP 9.88 · INV 9.80 · TOP 9.18 · Invert elevation 95.000 ft") | Small table per point: Station · BOP · INV · TOP · Elev, same look as the grade sheet |
| Which Job modal | Says "No jobs on this phone yet. Type the job number." then label "Or type the job number" | One line only |
| Run Results | "Run details" summary, warnings and Columns/Zoom are all separate full-width blocks before the grade sheet | Collapse warnings into one "2 flags ▾" row; Columns + Zoom become icons on the grade-sheet header |
| Run Results | "View Report" grey and "Save PDF" outlined at the bottom, different weights for equal actions | Both Secondary |
| Quick Run | Results card only appears after input. Fine, but there's no back arrow | Add back (A-3) |
| Entry Permit | Field label "Attendant" sits right under the supervisor help line with no gap, reads as one paragraph | 12px gap above every label; help text styled smaller/grey |
| Entry Permit | Top: badge + 2 paragraphs + counter | Badge "Draft · not active" + counter only; the "Nothing here allows entry…" line moves to a ⓘ |
| Active Permit | Empty white card above "Review & Close Permit" (seen with no permit data; verify with a real permit) | Remove or hide when empty |
| Active Permit | "Reminders only…" disclaimer floats between the danger box and the roster | Move under the reminder ⓘ links it describes |
| Daily report | Job/Date fields jammed against the header stripe (no top padding) | Standard 16px top padding |
| Daily report | Opening from Home highlights Records | A-4 |
| Check off | Empty white bar at top (item title missing when opened without an item; verify in real flow). Notes box is half width | Full-width notes; always show the item being checked |
| Records | Phone-icon chip unlabeled | B-1 |
| Stats | Filters, two empty cards, 4 share/download buttons, a destructive section, all on one screen | Filters as chips; "Share / Download ▾" single button with the 3 options; Manage Stats → behind ⋯ |
| Calculators hub | Section chips row cuts off ("Pipe…") with no scroll hint | Fade edge on the right, or wrap to two lines |
| Calculators | Titles wrap 2–3 lines with icon + star in header | A-2 |
| Bedding & Shading | "Add Section" button touching card above | 12px gap; make it a Tertiary "+ Add another size" link |
| Pipe Weight | "Enter in feet" link floats under one field, centered | Small unit toggle (in \| ft) inside the field label row |
| Construction Calculator | "Tape" heading with nothing under it until used | Hide the heading until there's a tape value |
| Education & Reference | "Add to Home" button in the header, no back arrow | A-2 / A-3 |
| Confined Space reference | Regulation text in red alarm box | A-10 |
| Toolbox Talks | "State rules: Washington…, California…" shown when the job's state is unknown | Show only the rule for the job's state; when unknown, say "Set the job's state to see its rule" (matches Nov 20 "silently apply the job's state rule") |
| Crew members | Two yellow primaries | "Text a Join Link" primary; "Invite Crew Member" Secondary |
| Settings | Preferences card has no padding; "Your crew" uses a tiny circle icon unlike the other section icons | A-5; use the people icon |
| Ask | Ask tab's selected state is a solid yellow pill, unlike the other tabs' light highlight | Same selected style for all 5 tabs (Ask can keep its outline when not selected) |
| Edit Shortcuts | Sticky Cancel/Save bar sits on top of the list above the tab bar; list continues under it | Add bottom padding equal to the bar height so the last item is reachable |
| Manager Home | "Your company" placeholder instead of the company name when offline | Cache and show the last-known company name |
| Manager Home | Job card category labels wrap mid-name ("Excavation -\nMain") | B-4 table layout |
| Management inbox | "About anonymous reports" link not aligned with the content (no left padding) | Standard padding |
| Company permit records | Title hyphenated "per-mit" | A-2 (`hyphens:none` on headings) |
| Individual plan | Opening a contractor-only screen pops a "Subscription Required" modal that stays on top while the screen changes underneath | Block the navigation instead: stay on the current screen and show the modal there |

---

## E. Pleasant surprises worth adding (small effort, big "it just knows")
1. **Daily report auto-builds itself**: today's runs, permits, delays, crew and equipment from the last report are already filled when it opens (the decision exists; make sure the first screen shows them, not just a blank Narrative box).
2. **"Same as yesterday" button** on daily report crew/equipment.
3. **Calculator → run handoff**: Bend Offset, Structure Bedding and Rod → Elevation results get a "Use in current run" button when a run is active.
4. **Copy result**: long-press (or a small copy icon) on any calculator result copies it, formatted ("6′ 3 5/16″").
5. **Permit prefill from the job**: site address from the job's City/State, attendant suggestions from today's crew, hazards from the last permit on the same space ID.
6. **Remember last calculator inputs** per calculator (soil type, pipe material, compaction %).
7. **One-tap "Call foreman"** on a pipelayer's Home when a run is sent back ("Fix It").
8. **"Where did that go?" toasts**: after any save, show "Saved to Records ›" with a link, so people learn where things live.
9. **Haptic tick** (where supported) on locking a run, logging an air test and checking someone in or out.
10. **Next-row big-number mode** reachable straight from the Home "Continue Run" row (long-press).

---

## F. Suggested order of work
1. A-1, A-2, A-3, A-4, A-6: header, buttons, yellow, back, tab highlight. One CSS/structure pass; touches every screen, no feature changes.
2. C-1, C-2, C-3: job and date prefill, send confirmation. The biggest "it follows through" wins.
3. A-7, A-8, A-9, A-10: offline banner, empty states, help-text cut, red cleanup.
4. B-1, B-2, B-3, B-4: Records merge, My production tabs, Home order.
5. Section D table, then section E.
6. A-12 fonts and C-4 dead screens (housekeeping).

Before shipping step 1, post before/after screenshots of Home, Run Setup, Run Results, a calculator and the Entry Permit for Thomas to approve the look (his standing rule for visual work).
