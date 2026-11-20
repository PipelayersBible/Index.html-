# Renew-by deadlines, state by state (Nov 20 2026). Staged, NOT shipped.

Tommy: "we need to find the renew by deadlines."

Nothing live was touched; `_src/index.html` was not edited; no server change.

- Patch: `patches/p04_locate_renew_by_sources.py`, on top of `locate_round3_nov20/patches/p03_locate_renew_by.py`
  (base used: `/tmp/claude-0/r1711/src.html`, which already holds p01 + p02 + p03). 3 exact-once replacements + 11 rows.
- Test: `tests/t_renewby_p04.js` → **ALL PASS 41/41** (Playwright, 390 px, page clock Mon Jun 1 2026).
- Round 3's own test on the p04 page, after `tests/update_t_loc_round3_p04.py` (the two pinned tables): **86/86**.
  Not run: the full regression, t130_staterules, p02's test (none of them names Illinois or South Carolina).
- Quotes: `raw_findings.md`. Changed rows: `out/state_rows_changed.json`. Screens: `out/il_tickets_390.png`,
  `out/rule_sheet_de_390.png`.

## The short answer

**No state on the list has a law or center page that names "renew X days before expiry" in so many words.** What the
sources do say falls in four groups:

| Group | States | What the app does after p04 |
|---|---|---|
| Going on = a **new notice / new ticket**, which waits like a first call (the source says so) | CT 2, MO 2, NC 3, NM 2 | Same Renew-by date as before; no longer marked "not confirmed" |
| The law gives a **window** | IL: extension from the 20th day to the 25th | Renew by = 3 working days before the end (day 21 or 22), inside the window |
| **Any time before it expires** (center manual) | SC | No Renew-by line; the 7-day and 2-day expiry reminders stay (same as CA, HI, NV) |
| **NOT FOUND**: the source has a renewal but names no day | DE 3, FL 2, KS 2, SD 2, WY 2 | First-call wait kept (the earlier date). Rule sheet now adds "Not confirmed with the 811 center." |
| No ticket life at all | OH, PA (confirmed); MT (not read) | No Renew-by line (unchanged) |

So the dates on tickets change in two states only: **South Carolina** (line gone) and **Illinois** (ticket life is
25 working days, not 25 calendar days: see below).

"Does the renewed ticket start before the old one expires?" is answered only for IL (the 25 more days are added to
the old end date), SC (an Extension keeps the number and adds 15 working days; the manual does not say from when)
and the new-ticket states (the new ticket is its own ticket; nothing says it closes the old one). Everywhere else:
NOT FOUND.

## State by state

Working days before expiry. The app shows one working day earlier than the number (round 3's spare day).

| St | Verdict | What the source says (opened Nov 20) | Link | App |
|---|---|---|---|---|
| CT | CONFIRMED: new ticket, 2 full days. No "renewal" exists in the rule. | R.C.S.A. 16-345-4(d): "A ticket given pursuant to subsection (a) of this section shall expire at the end of thirty (30) days from the date such ticket is given to the clearinghouse." (a)(1): "at least two full days, excluding Saturdays, Sundays and holidays". No renewal provision in the section. | [16-345-4](https://d1tvxue8o4w0fl.cloudfront.net/regulation/connecticut-administrative-code/title-16-public-service-companies/excavation-near-underground-utility-facilities/section-16-345-4-responsibilities-of-excavators-and-responsible-parties) | Renew by 2 (named) |
| DE | NOT FOUND (call-ahead for an update) | 26 Del. C. 802(19): "A ticket is valid for 12 business days after the day on which the ticket is transmitted"; "On the thirteenth day, the ticket will expire, and an update, remark, or new excavation ticket shall be required." 806(a)(2): "not less than 3 business days, but no more than 12 business days". | [Del. Code](https://delcode.delaware.gov/title26/c008/sc01/index.html) | Renew by 3, not confirmed |
| FL | NOT FOUND (call-ahead for a renewal) | 556.105(1)(c): "Information provided by an excavator is valid for 30 calendar days after the date such information is provided to the system." No renewal sentence in the section. Sunshine 811: "When you need to renew a standard ticket, do not include any areas that are finished." No day named. | [556.105](https://m.flsenate.gov/statutes/556.105), [ticket types](https://sunshine811.com/ticket-types) | Renew by 2, not confirmed |
| IL | CONFIRMED (a window, not a call-ahead): day 20 to day 25, **working days** | 220 ILCS 50/2: "An extension request may be made no earlier than the 20th day from the initial normal notice request or latest extension request." "An extension request shall extend the expiration of the initial normal notice request or latest extension request by 25 days." "valid for 25 days from the date of the initial request". "'Day' does not include holidays recognized by JULIE, Saturdays, Sundays, and the day of the actual notice." | [50/2](https://codes.findlaw.com/il/chapter-220-utilities/il-st-sect-220-50-2/), [ILGA](https://ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1286) | Life 25 **working** days; Renew by 2 |
| KS | NOT FOUND (call-ahead for an update) | K.S.A. 66-1804(c): "The notice of intent to excavate or any subsequent updates shall be valid for 20 calendar days after the excavation start date". (a): "at least two full working days but not more than 20 calendar days before the scheduled excavation start date". | [66-1804](https://ksrevisor.gov/statutes/chapters/ch66/066_018_0004.html) | Renew by 2, not confirmed |
| MO | CONFIRMED by a utility's summary, not by the center: new ticket, 2 working days | 319.025.1: "shall have an operational life ending at 11:59 p.m. twenty-one consecutive calendar days from the start date of work." No renewal in the law. Ameren Missouri (Aug 7 2025): "If work continues beyond that period, even if marks are still visible, a new 811 ticket is required." | [SB 133](https://www.senate.mo.gov/25info/pdf-bill/tat/SB133.pdf), [Ameren](https://ameren.mediaroom.com/2025-08-07-Changes-to-Missouri-law-prioritize-safe-digging) | Renew by 2 (named) |
| NC | CONFIRMED: new notice, 3 full working days | G.S. 87-122(a): "Notice given pursuant to this subsection shall expire 28 calendar days after the work start date." No work after that unless the person "provides a subsequent notice which shall be provided in the same manner as the original notice required by this subsection." Original: "no less than three full working days before the proposed commencement date". | [Art. 8A](https://www.ncleg.net/EnactedLegislation/Statutes/HTML/ByArticle/Chapter_87/Article_8A.html) | Renew by 3 (named) |
| NM | CONFIRMED (center book is from 2019): new locate, 2 working days | 18.60.5.13(B)(4): "The locate markings shall be valid for 15 working days from the end of the advance notice period." NM811 book p.19: "An excavator is not permitted to request a relocate for failure to complete the work in 15 working days." "This will require a new standard locate and the excavator may only make a request for the scope of work remaining." | [NMAC](https://regulations.justia.com/states/new-mexico/title-18/chapter-60/part-5/section-18-60-5-13), [NM811 book](https://www.prc.nm.gov/wp-content/uploads/2021/06/NM811_ENG_Pipleline_Safety_book_2019.pdf) | Renew by 2 (named) |
| SC | CONFIRMED: no call-ahead, any time before it expires | SC811 Excavator Manual 2026 p.16: "An Extension can be submitted at any time during the life of the notice." Web Tickets Manual: "the locate notice number will remain the same"; "This action will extend the notice for an additional 15 working days". S.C. Code 58-36-60(B), in force May 22 2026: "This subsequent notice only extends the commencement date and does not require operators to re-mark facilities". Marks gone: a Remark, new number, "Operators have three full working days to respond to a Remark." | [manual](https://sc811.com/wp-content/uploads/2026/05/Excavator-Manual-2026.pdf), [web manual](https://sc811.com/wp-content/uploads/2026/07/Excavator-Web-Tickets-Manual_Update-5-2026-1.pdf), [58-36-60](https://scstatehouse.gov/code/t58c036.php) | No Renew-by line |
| SD | NOT FOUND (call-ahead for an update) | ARSD 20:25:03:05.01: valid "not for more than 21 calendar days from the start date on the ticket." "An excavator may not update current tickets after 90 calendar days have elapsed from the start date of the original ticket." A proposed rule would make that 63 days. | [Board copy](https://boardsandcommissions.sd.gov/bcuploads/Proposed%20Rule%20-%20Update%20Tickets.pdf), [proposal](https://rules.sd.gov/detail?Id=830) | Renew by 2, not confirmed |
| WY | NOT FOUND (call-ahead). The law does name the renewal. | Wyo. Stat. 37-12-302(c): "If an excavation on a single project lasts more than fourteen (14) business days, the excavator shall give notice at least once each succeeding fourteen (14) business day period." (d): "The operator shall respond no later than two (2) full business days after receipt of the notice." | [37-12-302](https://law.counselstack.com/statute/wy/37-12-302) | Renew by 2, not confirmed |
| OH | CONFIRMED: no ticket expiry, so nothing to renew | OHIO811 Excavator Manual June 2026 p.12: "Record the number and keep it for the duration of your excavation, or longer, when applicable." Marks destroyed (p.16): "Wait two working days, not including the day of the notification, for the excavation site to be remarked." | [manual](https://oups.org/wp-content/uploads/2026/06/OHIO811_Excavator-Manual_English_June-2026.pdf) | No line (unchanged) |
| PA | CONFIRMED: no ticket life in the law | 73 P.S. 180(2.1): "Notification shall be not less than three nor more than ten business days in advance of beginning excavation or demolition work." (14): "If an excavator removes its equipment and vacates a work site for more than two business days, to renotify the One Call System". | [73 P.S. 180](https://codes.findlaw.com/pa/title-73-ps-trade-and-commerce/pa-st-sect-73-180/) | No line (unchanged; row still empty, see lead note 4) |
| MT | NOT FOUND | The statute pages (mca.legmt.gov) and montana811.org could not be opened. | — | No line (unchanged) |

### Illinois: the app's ticket life was 10 days short

The Illinois law counts "days" without weekends, JULIE holidays or the day of the notice. So "valid for 25 days" is
25 working days (about 35 calendar days), and the extension cannot be asked for before the 20th working day.
With the old row (25 calendar days) the app would have shown "Renew by" around working day 14, when JULIE cannot take
an extension yet, and "Expired" about 10 days early. p04 changes the Illinois life to 25 working days from the
request; the Renew-by day is then working day 21 or 22 for every call day in a year (tested). I could not open
JULIE's own pages (illinois1call.com) to see it said in their words: on the call list.

## What the patch does

1. Renew-by table: `CT 2, IL 2, MO 2, NC 3, NM 2` join the named list. `SC` joins "by the last day itself" (no line).
   `DE, FL, KS, SD, WY` stay on the first-call wait.
2. Rule sheet: for those five, one more sentence after the Renew-by sentence: "Not confirmed with the 811 center."
   Their renew line ends "The app's Renew-by date uses the first-call wait: no source names a day."
3. State rows (renew line, sources, day checked) for the 11 states; Illinois ticket life 25 working days.
4. Ohio, Pennsylvania, Montana, Georgia rows untouched.

## For Tommy to get / call

Phone numbers: 811 from inside the state reaches each center. The long numbers below were NOT checked today, except
Wyoming's, Connecticut's and North Carolina's (each on a page read today).

| State | Center | Phone | Ask exactly this |
|---|---|---|---|
| Delaware | Delmarva 811 (Miss Utility of Delmarva) | 811 / 800-282-8555 | "A ticket is good 12 business days. To update it with no gap, how many business days before it expires must I call? Does the update start when the old one ends, or the day I call?" |
| Florida | Sunshine 811 | 811 / 800-432-4770 | "My ticket is good 30 calendar days. To renew with no gap, how many business days before day 30 must I call? Is the renewal a new ticket number, and can I dig on the old one until it expires?" |
| Kansas | Kansas 811 | 811 / 800-344-7233 | "A ticket is good 20 calendar days after the start date. How many working days before it expires must I request the update? Does the update's 20 days start on the day I call or on the old expiry?" |
| South Dakota | South Dakota 811 | 811 / 800-781-7474 | "Marks are good 21 days from the start date. How far ahead of day 21 must I update: 48 hours? Does the update get a new number? Is the update cap 90 days or 63 now?" |
| Wyoming | One-Call of Wyoming | 811 / 800-849-2476 | "The law says give notice again every 14 business days. How many business days before the 14 are up must I renew, and can I keep digging while the utilities respond to the renewal?" |
| Illinois | JULIE | 811 / 800-892-0123 | "Is a ticket good 25 business days, and can I ask for the extension from the 20th business day? If I ask on day 22, do I keep working without waiting?" |
| Missouri | Missouri 811 | 811 / 800-344-7483 | "Past 21 days, is it a brand-new ticket (2 working days' notice), and can I dig on the old one until 11:59 PM of day 21?" |
| North Carolina | NC811 | 811 / 800-632-4949 | "What is the 'Update By' date on a 28-day ticket: 3 full working days before it expires?" |
| New Mexico | NM811 | 811 / 800-321-2537 | "Is it still true (2019 book) that after 15 working days I need a new standard locate for the remaining work, 2 working days ahead, and no relocate?" |
| Connecticut | Call Before You Dig | 811 / 800-922-4455 | "After 30 days is it a new ticket with 2 full days' wait, or is there a renewal? Can I dig on the old ticket until it expires?" |
| Montana | Montana 811 | 811 / 800-424-5555 | "Does a locate ticket expire (30 days?), and how far ahead do I request a new one or a relocate?" Also: the text of MCA 69-4-503. |
| Pennsylvania | Pennsylvania 811 | 811 / 800-242-1776 | "Is there any ticket life, or is the ticket good as long as I don't leave the site for more than 2 business days?" |

## Could not reach

The page reader in this session only opens addresses a search has returned, and direct download is blocked. Not
opened: cbyd.com, illinois1call.com, kansas811.com, missouri-811.org, nm811.org, sdonecall.com,
onecallofwyoming.com, montana811.org, ohio811.org (FAQ and the Ticket Life Committee minutes), mca.legmt.gov.
nc811.org answers "Page Not found" on every page tried (FAQ, life of a ticket, both 2026 Remote Ticket Entry guides).

## For the lead

1. Stack: … → p03 → `p04_locate_renew_by_sources.py`.
2. `locate_round3_nov20/tests/t_loc_round3.js` pins the two tables: run `tests/update_t_loc_round3_p04.py` on it
   (86/86 after). `t_renewby_p04.js` reads round 3's harness through relative paths (`../../..` = `tests/`).
3. `tests/r1706/staterules/data/state_rules.json` + `build_state_rules.py` still hold the old rows; the 11 new ones
   are in `out/state_rows_changed.json` (checked `2026-11-20`).
4. Not built, found on the way: Pennsylvania's row is empty but the law is plain (notice 3 to 10 business days, no
   ticket life). Filling it would move t130's "nothing confirmed" state again, so I left it.
5. Illinois: the app still counts a renewal from the day you renew (25 working days from that day). The law adds
   25 days to the old end date, so the app's date is the earlier one. Illinois "no more than 10 days before" is also
   working days; the row keeps calendar days (earlier).
6. Missouri and New Mexico: the rule sheet still says "The app counts a renewal from the day you renew" although
   the renew line says "new ticket" (they are not in the new-number table `PB_LOC_REN`). Wording only.
7. New English strings: "Not confirmed with the 811 center.", "The app's Renew-by date uses the first-call wait:
   no source names a day.", and the 11 renew lines.
8. A Kansas Gas Service 2026 blog says tickets are "only valid for 14 calendar days"; the statute says 20. Row kept.

## Decisions for Tommy

1. **South Carolina: no Renew-by date** (built), because SC811 says an Extension can go in any time before the
   ticket expires, or keep the old 3-working-day date as a cushion? Recommend **as built**; the 7-day and 2-day
   reminders still fire.
2. **Illinois: 25 working days** (built) instead of 25 calendar days? Recommend **yes**: it is the law's own
   definition of "day", and the old date told crews to renew before JULIE can take it. One call to JULIE settles it.
3. **Delaware, Florida, Kansas, South Dakota, Wyoming: keep the first-call wait and say "not confirmed"** (built)
   until you have called? Recommend **yes**: the earlier date costs nothing.
4. **Missouri on a utility's word** (Ameren: "a new 811 ticket is required") until Missouri 811 confirms?
   Recommend **yes**; the date does not change either way.

## DONE
