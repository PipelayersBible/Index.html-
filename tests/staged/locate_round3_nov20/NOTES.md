# Locate round 3 (Nov 20 2026): Renew by, Nevada's last extension, 18 states re-read. Staged, NOT shipped.

Nothing live was touched; `_src/index.html` was not edited; no server change.

- Patch: `patches/p03_locate_renew_by.py` (on top of `locate_form_nov20/…/p01` + `locate_research_nov20/…/p02`; base
  `/tmp/claude-0/r1711/src.html`). 17 exact-once replacements + 10 rows of the state table.
- Test: `tests/t_loc_round3.js` → **ALL PASS 86/86** (Playwright, 390 px, page clock fixed at Mon Jun 1 2026).
- Also run on the p03 page: p02's `t_loc_form_state_rule_p02.js` **64/64**; `t130_staterules.js` with both updaters
  (p01's, then `tests/update_t130_staterules_p03.py`) **all pass**; locate811's `t_loc811_renew_history.js` 30/31 (the
  same one "by design" miss as on p01). The full regression was not run.
- Screens: `out/nevada_last_390.png`, `out/nevada_new_on_file_390.png`, `out/renew_by_ok_390.png`.
- Quotes: `raw_findings.md`. Changed table rows: `out/state_rows_changed.json`.

## Nevada: the answer

**No, work does not have to stop for the 2 days, as long as the new ticket is called in early enough.**

- The old ticket stays good to its own last day. NAC 455.165(1): a notification "is valid to conduct an excavation or
  demolition for 28 calendar days after the date and time that the excavator provided the notification"; each
  extension is "for 28 calendar days". Nothing in NAC 455 or the USA North Nevada handbook says a new ticket closes
  or replaces the old one.
- The new ticket is an ordinary first call. NAC 455.165(4): "…the excavator shall submit a new notification…
  pursuant to the provisions of NRS 455.110"; NRS 455.110(1)(a): "at least 2 working days" and "not more than 28
  calendar days before excavation or demolition is scheduled to commence". So it can be called in up to 28 days
  ahead, while the old one is still running.
- So: **new ticket called at least 2 working days before the last extension runs out = no gap.** Called later than
  that = a gap: the old one is dead and the new one is not good yet. Handbook p.5: "You must have an active ticket
  for the entire duration of your excavation."; p.4: digging before "the legal start date and time" makes the
  excavator liable, and you wait for every operator's positive response "even if the start date and time shown on
  the ticket has passed."
- Not written in so many words anywhere: "you may keep digging on the old ticket after calling a new one". It
  follows from the two rules above. One call to USA North 811 (811, or 800-642-2444) would put a name on it.

## What the patch does

| Where | Now |
|---|---|
| Every open ticket, states with a call-ahead | A **Renew by** date in the dates row. It is the last working day on which a call is still good **before** the expiry day (the named working days, plus one day to spare). |
| Reminder | Amber from 2 days before Renew by (or 7 days before expiry, whichever comes first); red on the Renew-by day and after. Chip: "Renew by Thu Jun 18" → "Renew today" → "Renew now · 4 days left" → "2 days left". Home cards add "— renew by Jun 18". |
| Renewed tickets | No "Can dig from", no "Start work by" (card, chip, Home, Edit form). New tickets keep them. |
| Nevada, ticket on its last extension | Dates row reads **New ticket by** (2 working days + 1 before expiry). A line on the card, from the day of the second renewal. From **14 days** before expiry it is a reminder: "Call in a new ticket now — this ticket can't be renewed again. Latest: Wed Jun 3, or digging stops when this one runs out. You can keep digging on this one until Mon Jun 8." |
| Nevada, gap | If a ticket called in today could not be dug on by the last day: "…A ticket called in today can't be dug on until Wed Jun 3. Stop digging when this one runs out (Tue Jun 2) until then." (red). If the new ticket is already on the job: "Stop digging when this ticket runs out (Tue Jun 2). New ticket NV-NEW can't be dug on until Wed Jun 3. Wait for every utility to respond." |
| Nevada, new ticket on file in time | "This ticket can't be renewed again. New ticket NV-NEW is on file, good from Wed Jun 3. Keep digging on this one until it runs out." The reminder stops. |
| Georgia | **Not touched.** A third renewal still opens the Renew form (tested). Georgia only gets the Renew-by date (3 working days, the app's own row). |
| Rule sheet | One more sentence: what "Renew by" / "New ticket by" is. Nevada's line now has the 84 days and "keep digging on the old ticket until it runs out". |

"New ticket on file" = another open ticket on the same job, called in during the old one's last 28 days, that expires later.

**No lapse, checked:** for every state with a Renew-by line and every expiry day for a year (14,274 pairs), a call on
the Renew-by day is good before the expiry day by the app's own working-day math, and the next working day would be
too late. Hiding the start lines on renewed tickets rests on that.

### Renew by, per state (working days before expiry; the app shows one working day earlier)

| Days | States | Basis |
|---|---|---|
| 2 | MN, AL, KY, CO | center / law names it (round 2 sources) |
| 3 | TN, MS, VA, ME, MA, NH, VT | center / law names it (Dig Safe: 72 hours, not weekends or holidays) |
| 4 | OK | Okie811 guide |
| 3 | DC | D.C. Code 34-2704(g) |
| 2 | WV, UT | WV811 slides (48 hours); Utah Code 54-8a-4(6)(b) (48 hours) |
| 2 / 3 | AZ 2, GA 3 | the app's own table rows (Nov 19); not re-read today |
| 2 | AR, IA, ID, IN, OR, TX, WA | going on = a new notice / update that waits like a first call |
| 3 | LA, MD, MI, NJ | same, with a 3-day wait |
| none | CA, NV, HI | law says by the last day itself ("by the end of the 28th day", "prior to expiration"). Nevada's last extension: New ticket by, 2 days. |
| first-call wait, **not confirmed** | CT 2, DE 3, FL 2, IL 2, KS 2, MO 2, NC 3, NM 2, SC 3, SD 2, WY 2 | no source names a day; the earlier date (decision 2) |
| none | AK, MT, NE, NY, OH, PA, RI, WI, ND | no ticket life in the app (or no wait to count from) |

## The 18 states

| St | Found | Source (opened Nov 20) | App |
|---|---|---|---|
| AR | Notice 2 to 10 full working days; good **20 working days from the notice**; past that "reinitiate the notice procedure" | Ark. Code 14-271-112 (FindLaw, current to Mar 2024) | row filled; Renew by 2 |
| LA | Marks good **20 calendar days from the mark-by time**; then "an additional notice"; wait 48 hours from 7 AM next working day | R.S. 40:1749.13, 40:1749.14 (legis.la.gov) | row filled (counted from the call: early); Renew by 3 |
| MO | Notice ends **11:59 PM, 21 calendar days from the start date** (new Aug 28 2025) | 2025 SB 133 text + RSMo 319.026(7) | life filled. How to go on past 21 days: NOT FOUND |
| SD | Marks valid **21 calendar days from the ticket start date**; no update after 90 days | ARSD 20:25:03:05.01 (the Board's copy) | life filled. Call-ahead: NOT FOUND |
| WV | Ticket good **15 business days**; extend **48 hours** before it expires | WV811 2024 + 2026 slides quoting the law | life filled; Renew by 2. Statute section itself not opened |
| DC | 15 working days from the call; ask for re-marking **3 days** before the end | D.C. Code 34-2704(g); missutility.net | row was right; Renew by 3 |
| HI | 28 calendar days from issue; revalidate "prior to expiration" | HRS 269E-7(b) in the Hawaii Excavator Guide | row was right; no call-ahead |
| ID | Marks 4 weeks; an update is "treated as a new standard ticket: two full business days" | Idaho Guide to Safe Digging 2026-27 | row was right; Renew by 2 |
| AK | No ticket life: "most facility owners consider a ticket expired" after 15 calendar days without digging; remark = 2 more working days | Alaska 811 handbook 2026 | unchanged (no life) |
| NE | No ticket life. Must be able to start within 17 calendar days; a refresh within 14 | Neb. 76-2323(3)(a) | unchanged |
| NY | No ticket life once digging has begun; new request if not started in 10 working days; re-mark if stopped 10 working days | UDig NY manual 2026 | unchanged |
| WI | No ticket life; valid while started within 10 days and not stopped more than 10 | Diggers Hotline guide | unchanged |
| MS | **20 days stands.** Life went 14 → 20 on July 1 2025; the "additional 14 days" page is from July 2023, when a new ticket was 14 too. Renew 3 to 4 working days before | MS811 2025 summary; Miss. Code 77-13-5 (pre-2025 text) | renew line added; Renew by 3 |
| OH | NOT FOUND. The amended sections read (3781.28, 3781.261) have no expiry | codes.ohio.gov | unchanged |
| CT, MT, PA, WY | NOT FOUND (renewal rule, call-ahead) | — | unchanged |

Also from round 2, now in the table: MD, MI, IA renew lines reworded.

## For Tommy to get

| State | What | Where |
|---|---|---|
| Ohio | FAQ "When does an 811 ticket expire in Ohio" and "Understanding HB 227 – Summary Outline (03-18-2026)" PDF | ohio811.org (FAQs; the PDF is under wp-content/uploads/2026/03). OHIO811: 811 or 800-362-2764 |
| Pennsylvania | PA One Call "Excavator / Users Guide" (ticket life, when to renotify) and the current Act 287 text | paonecall.org → Resources. 811 or 800-242-1776 |
| Connecticut | CBYD "Excavator Manual" (renewing a 30-day ticket: how far ahead, new number?) | cbyd.com → Excavators. 811 or 800-922-4455 |
| Montana | MCA 69-4-503 current text (30 days? relocate rule) and the Montana 811 excavator handbook | montana811.org. 811 or 800-424-5555 |
| Wyoming | One-Call of Wyoming excavator handbook (14-business-day renewal: how far ahead?) | onecallofwyoming.com. 811 or 800-849-2476 |
| Missouri | Missouri 811 excavator manual, 2025 or later: what to do past the 21 days | missouri-811.org. 811 or 800-344-7483 |
| South Dakota | SD 811 excavator handbook: how far ahead to update a 21-day ticket | sdonecall.com. 811 or 800-781-7474 |
| West Virginia | The code section behind "15 business days / extend 48 hours before" (WV811 quotes it; I could not open it) | wv811.com. 811 or 800-245-4848 |
| Arkansas | Arkansas 811 handbook: confirm 20 working days is still the law (my text is March 2024) | arkansas811.com. 811 or 800-482-8998 |
| Mississippi | Miss. Code 77-13-5 as amended July 1 2025: is the update window still 3 to 4 working days | ms811.org → Law. 811 or 800-227-6477 |
| Nevada | One sentence from USA North 811: "you can dig on the old ticket until it expires after calling the new one" | 811 or 800-642-2444 |

Phone numbers are from memory, not checked today; 811 from inside the state reaches each center.

## For the lead

1. Stack: r17.11 candidate → p01 → p02 → `p03_locate_renew_by.py`.
2. `t130_staterules.js`: run p01's updater, then `tests/update_t130_staterules_p03.py` (Arkansas is no longer the
   "nothing confirmed" state; the checks move to Pennsylvania).
3. `tests/r1706/staterules/data/state_rules.json` + `build_state_rules.py` still hold the old 10 rows (new ones in
   `out/state_rows_changed.json`, checked `2026-11-20`; t130 expects `2026-11-19` on every row of that file).
4. New English strings: "Renew by", "New ticket by", the chips ("Renew today", "Renew now · …", "New ticket today"),
   the five Nevada lines, "need renewing soon", "— renew by …", the two rule-sheet sentences.
5. Known limits: Renew by counts days, not hours (hence the spare day). The 14-day Nevada reminder and the gap note
   are in the phone only. Mississippi's "not more than 4 working days before" is not enforced (the app's day is
   4 working days before, the first day of the window by the old text).

## Decisions for Tommy

1. **Nevada reminder: 14 days before the last extension runs out** (built; your "extra week" on top of the usual 7)
   or 7? Recommend **14**.
2. **States where no source names a day (CT DE FL IL KS MO NC NM SC SD WY): show Renew by from the first-call wait**
   (built) or show nothing until confirmed? Recommend **as built**: early costs nothing, and it is your "when
   unsure, the earlier date".
3. **One spare working day on every Renew-by date** (built; Oklahoma becomes 5 business days before expiry)?
   Recommend **yes**: tickets expire at an hour, the app only knows the day.
4. **Fill Arkansas, Louisiana, Missouri, South Dakota, West Virginia** from today's sources (built)? Recommend
   **yes**; each uses the earliest reading and is on the "to get" list for a second look.
5. **Mississippi stays at 20 days** (no change)? Recommend **yes**: the 14-day page is older than the 2025 law.

## DONE
