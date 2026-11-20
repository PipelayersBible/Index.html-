# 811 renewal rules, state by state (research, Nov 20 2026). Nothing shipped, nothing live touched.

Tommy, Nov 20: "Dig into finding out for sure how it works in those states… Try to find out for sure if they get a
new number or not. Early is better. Nevada has a limit for two but what are contractors expected to do if a project
runs longer than that?"

Every source below was opened on **Nov 20 2026**. Quotes are the exact words as the page reader returned them (it
returns short fragments; long sentences are joined from its fragments). `C` = confirmed by a quote in "Sources and
quotes". `NF` = not found in a primary source in this pass (not the same as "no"). Working quotes: `raw_findings.md`.

Built: `patches/p02_locate_ren_research.py` (on top of `locate_form_nov20/patches/p01_locate_state_rule.py`),
`tests/make_test.py` → `tests/t_loc_form_state_rule_p02.js`: **ALL PASS 64/64** on `/tmp/claude-0/r1711/src.html` + p01 + p02.

## The short answers

1. **Nevada, after two renewals: a brand-new ticket. Confirmed in the regulation itself.** NAC 455.165(4): "An
   excavator may not request more than two extensions… the excavator shall submit a new notification to the
   association for operators pursuant to the provisions of NRS 455.110." So one ticket lasts at most 28 + 28 + 28 =
   84 days, then the job gets a new ticket like any first call: new number, the usual 2 working days' notice, fresh
   marks. The USA North Nevada handbook says the same ("A ticket can only be renewed two times… shall submit a new
   ticket") and has **no** project / long-term ticket. To have no gap, the new ticket has to be called in 2 working
   days before the second renewal runs out. The app's block after two is right; p02 adds the "2 working days" to the message.
2. **Georgia has the same two-renewal limit** (not in the app): "a Normal Ticket may be updated a maximum of two
   times" (90 days). Past that Georgia 811 has a **Large Project** ticket (over 1 mile or over 90 days).
3. **New number, confirmed in the center's own words** in: MN, IN, GA, TN, VA, UT, NC (NC from the ticket-software
   vendor's page; NC811's own pages returned "not found" today), SC (for a Remark). **"Get a new ticket / new notice"
   confirmed** (a new ticket has its own number) in: IA, MI, NJ, OR, WA, and NV / CA / CO / ND once a ticket has run
   out. **Not written anywhere I could open:** TX, FL, OK, CT, ME (Texas comes closest: an update is "issued as
   Update tickets" worded "Update – (previous ticket number)"). Only a call to those centers would settle them; the
   form takes the same number typed again, so nothing breaks either way.
   **The staged form is wrong for GA, VA, UT, IA, MI** (keeps the old number). p02 fixes that.
4. **Dig-day states: no source says a renewal's life starts on the call day with no wait. Where it is written, the
   wait applies again** (MN in so many words; MD, IA, MI because going on means a new notice under the first-call
   rule). So the real expiry is the app's date or a few days later, never earlier. The app's early date stands
   ("early is better"). What the app does not show is the other end: the renewal has to be called in early enough
   (48 hours to 4 business days before expiry, by state) or there is a gap between the old ticket and the new one.

## The 51 states

Columns: renewal name at the center · new number? · call how long before expiry · renewed life starts from · notice
wait again? · max renewals, and after · large / long project option.

| St | Renewal name | New number? | Call before expiry | Renewed life from | Wait again? | Max / after | Large-project option |
|---|---|---|---|---|---|---|---|
| AL | Renew (law) `C` | NF | 2 working days `C` | NF | NF | NF | NF |
| AK | NF | NF | NF | no ticket life in the app's table | NF | NF | NF |
| AZ | "marks refreshed" `C` | NF | NF here (table: 2 working days) | NF | NF | NF | NF |
| AR | NF | NF | NF | NF | NF | NF | NF |
| CA | Renew `C` | NF (USA North sample ticket: same number, revisions 000/001/002) | by the end of day 28 `C` | NF (first ticket: 28 days from issuance `C`) | NF | no max found; expired = stop, new ticket `C` | NF (continual-excavation ticket for farms/flood control exists, not read) |
| CO | Update; also Relocate/Refresh `C` | NF | 2 business days `C` | NF | NF | NF; expired = new ticket `C` | Multiple Day tickets, Meet `C` |
| CT | NF | NF | NF | NF | NF | NF | NF |
| DE | Update / Remark (names only) `C` | NF | NF | NF | NF | NF | NF |
| DC | NF | NF | NF | NF | NF | NF | NF |
| FL | "renew a standard ticket" `C` | NF | NF | NF (law: 30 days after the info is given `C`) | NF | NF | NF |
| GA | Update `C` | **Yes** `C` | between the "Updateable On" and "Update By" dates printed on the ticket `C` | 30 days from the update (reader's summary, not a quote) | NF | **2 (90 days)** `C`; a third needs a reason and is reported to the PSC | **Large Project** (over 1 mile or 90 days), call 811 `C` |
| HI | NF | NF | NF | NF | NF | NF | NF |
| ID | NF | NF | NF | NF | NF | NF | NF |
| IL | "extension notice" (law) `C` | NF | NF | NF | NF | NF | large-project advance notice, planning only `C` |
| IN | Extension `C` | **Yes** `C` | NF | NF | **Yes**: members get 2 full working days `C` | NF | Joint Meet is not a legal ticket `C` |
| IA | none: "request a new locate ticket" `C` | new ticket `C` | before it runs out (days NF) | first-call rule: 25 days from the end of the 48 hours `C` | **Yes** (new request) `C` | none | Parent Ticket `C` |
| KS | Update `C` | NF | NF | "any subsequent updates": 20 days after the excavation start date `C` | NF | "excessive unnecessary updates: possible fines" `C` | NF |
| KY | Remarking request `C` | NF | 2 working days before each 21 days `C` | NF | NF | none ("each" 21-day period) `C` | sites over 5,000 ft by agreement `C` |
| LA | NF | NF | NF | NF | NF | NF | NF |
| ME | Renew `C` | NF | 72 hours, not weekends/holidays `C` | NF ("expire every 60 days") | NF | no cap; don't renew month after month with no digging `C` | none found |
| MD | "repeat the notification" (law) `C`; Update (Delmarva811) | NF | NF | first-call rule: 12 business days after the chosen start date `C` | **Yes**: start date 3+ business days after it is entered `C` | NF | NF |
| MA | Renew `C` | NF | 72 hours `C` | NF ("every 30 days from the date of issue") | NF | no cap `C` | none found |
| MI | none: "a new ticket is required" `C` | new ticket `C` (a Retransmit keeps the number `C`, but does not extend) | NF | first-call rule: 21 days from the Work Legal Start Date `C` | **Yes** (new ticket) | none | **Normal 180-Day / Project 180-Day** tickets `C` |
| MN | Update `C` | **Yes** `C` | 48 hours, not weekends/holidays `C` | 14 days from the Update's own start date `C` | **Yes** `C` | "Only one (1) remark/extend life of ticket is allowed per ticket", then update/correct `C` | **Meet ticket**, good up to 6 months with an agreed schedule `C` |
| MS | Update `C` | **No**, unless marks must be redone: then "A new ticket # will be issued" `C` | 3 working days `C` | "additional 14 calendar days" (from when: NF) `C` | NF | NF | NF |
| MO | NF | NF | NF | NF | NF | NF | NF |
| MT | NF | NF | NF | NF | NF | NF | NF |
| NE | NF | NF | NF | NF | NF | NF | NF |
| NV | Extension (law) / Renew (handbook) `C` | NF | by the end of day 28 `C` | "extended for 28 calendar days" `C` (from which day: not said) | none stated | **2**, then a **new ticket** under NRS 455.110 `C` | **none** in the handbook |
| NH | Renew `C` | NF | 72 hours `C` | NF | NF | no cap `C` | none found |
| NJ | none: "a new notification" `C` | new notice `C` | NF | 45 business days from the notification `C` | **Yes** (must meet the first-call rule, 3 business days) `C` | none | NF |
| NM | Relocate request; wide area: "reaffirmation" `C` | NF | NF | NF | NF | repeat relocates "only if justified" `C` | **Wide-area ticket** after a conference, reaffirmed every 15 working days `C` |
| NY | NF (no ticket life) | NF | NF | NF | NF | NF | NF |
| NC | Update `C*` | **Yes** `C*` | before the "Update By" date on the ticket `C*` | NF | NF | NF | NF |
| ND | after expiry "get a new ticket" `C`; respot / modify are "update tickets" `C` | NF | NF | NF | NF | third locate with no digging: excavator pays `C` | "no such thing as a Blanket Ticket"; meet request `C` |
| OH | NF | NF | NF | NF | NF | NF | staged large-area projects by written schedule (ORC 3781.28(E), June 9 2026) `C` |
| OK | Update: "Extend" or "Re-Mark" `C` | NF | 4 business days `C` | "extends the ticket by another 14 days" (from when: NF) | operators have 48 hours to respond `C` | no cap; unreasonable requests can cost `C` | large project (over 90 days), pre-excavation meeting `C` |
| OR | none: "a new locate request" `C` | new ticket `C` | NF | 45 days from submission `C` | **Yes** (new request, 2 business days) | none | NF |
| PA | NF | NF | NF | NF | NF | NF | NF |
| RI | none needed: "tickets do not expire provided that the marks are maintained" `C` | – | – | – | – | – | – |
| SC | Extension (more time) / Remark (new marks) `C` | Remark: **Yes** `C`; Extension: NF | "at any time during the life of the notice" `C` | NF | Remark: operators get 3 full working days `C` | none; expired = new request `C` | **Large Project** (over 90 days): planning meeting, phases with their own dates `C` |
| SD | NF | NF | NF | NF | NF | NF | NF |
| TN | Update `C` | **Yes** `C` | 3 working days `C` | NF | NF | none; stop updating when digging is done `C` | NF |
| TX | Update / Update & Remark `C` | NF in so many words ("issued as Update tickets", "Update – (previous ticket number)") | NF; if the last ticket is over 30 days old, a new ticket `C` | NF | **Yes**: "sent with a two-business day notice" `C` | none | longer life by written agreement with the operator (16 TAC 18.3(f)) `C` |
| UT | Update (UPDT) `C` | **Yes** ("different if Updated") `C` | by the "Update By" time on the ticket `C`; law: 48 hours to 7 days (p01) | 21 days from the old expiry (law, p01) | no | NF | NF |
| VT | Renew `C` | NF | 72 hours `C` | NF | NF | no cap `C` | none found |
| VA | Update `C` | **Yes** `C` | on the third working day before the 15 run out `C` | another 15 working days (exact start NF) | members answer by 7 AM, third working day `C` | NF | Meeting request (not a ticket to dig on) `C` |
| WA | none: "additional notice" (law) `C` | new notice `C` | NF | 45 days from the notice `C` | **Yes** (2 to 10 business days) `C` | none | must "confer with facility operators" on large projects `C` |
| WV | NF | NF | NF | NF | NF | NF | NF |
| WI | NF (no ticket life) | NF | NF | NF | NF | NF | NF |
| WY | NF | NF | NF | NF | NF | NF | NF |

`C*` North Carolina: nc811.org's manual, FAQ and "life of a ticket" pages all returned "Page not found" on Nov 20.
The quote is from Norfield's help page for CENTER LOGiX (the ticket software); the page does not name NC811, but it
describes the 3-Hour ticket, the 3-day wait and "every 28 days under 2025 law", which is North Carolina.

Not reached at all in this pass (rows are NF, not "no"): AK AR CT DC HI ID LA MO MT NE NY PA SD WV WI WY. Ohio's own
FAQ page "When does an 811 ticket expire in Ohio" exists but could not be opened from here.

## Sources and quotes (all seen Nov 20 2026)

- **NV** NAC 455.165, https://www.leg.state.nv.us/nac/NAC-455.html : (1) valid "for 28 calendar days after the date
  and time that the excavator provided the notification"; (2) may ask "to extend the period… by an additional 28
  calendar days"; (3) "…shall be deemed to be extended for 28 calendar days."; (4) "An excavator may not request more
  than two extensions of the period… If the excavator needs additional time… beyond the period afforded by the
  original notification and the subsequent extensions, the excavator shall submit a new notification to the
  association for operators pursuant to the provisions of NRS 455.110." NAC 455.115(1)(b): "Only the area that can
  reasonably be excavated or demolished within 14 calendar days…". Handbook p.5,
  https://usanorth811.org/assets/PDF/Nevada-2025-Handbook.pdf : "A ticket can only be renewed two times." …"the
  excavator shall submit a new ticket as specified in NAC 455.165."; p.3 "As work in one excavation site nears
  completion, contact 811 to get a ticket for your next excavation site".
- **MN** GSOC Handbook 2026, https://gopherstateonecall.org/wp-content/uploads/GSOCHandbook2026.pdf : p.34 "The ticket
  is valid for 14 calendar days from the start date and time stated on the ticket"; p.44 "You must notify GSOC at
  least 48 hours (excluding weekends and holidays) before the expiration date and time on the current ticket."; p.45
  "All Update tickets will have a new GSOC ticket number, the original ticket number will be included on the ticket
  for reference." "All Update tickets must have a start date and time at least 48 hours after the Update ticket is
  processed."; p.46 "Only one (1) remark/extend life of ticket is allowed per ticket."; p.35 "For large or long-term
  projects, GSOC encourages you to file a Meet ticket."; p.57 "If the project will exceed 6 months, a new ticket must
  be sought prior to the expiration of the 6-month period."
- **GA** https://georgia811.com/wp-content/uploads/2024/07/Ticket-Actions-in-the-Portal.pdf : "An Update extends the
  life of an existing Normal ticket. A new ticket will be generated." "Please be reminded that a Normal Ticket may be
  updated a maximum of two times." https://www.georgia811.com/wp-content/uploads/2023/05/Update-5.1.23.pdf : may only
  be updated "between the Updateable On date and the Update By date listed on the ticket"; Large Project: "dial 811 to
  speak to the Large Project team".
- **IN** https://indiana811.org/wp-content/uploads/2025/01/FAQs-About-Indiana-811.pdf : "An Extension is required when
  the markings from the previous ticket are still visible." "The requestor is issued a new ticket number, and the
  Members have two full working days to respond." "A Joint Meet does not meet the minimum legal requirements of a locate request."
- **TN** https://www.tenn811.com/law : "only valid for 15 calendar days from the start date indicated on the ticket";
  "you must call in at least 3 working days before the expiration date"; "at which time you would be given a new
  ticket number". https://www.tenn811.com/faq : "Once you have completed digging, do not continue to update the ticket."
- **VA** https://va811.com/wp-content/uploads/2026/05/Ticket-Types-5-15-26.pdf : "An Update or Re-mark will produce a
  new request number for the area of excavation"; "An Update locate request should be requested on the third working
  day before the end of the fifteen-day period."; "The markings for a Normal locate request are valid for 15 working
  days beginning at 7:00 AM the next working day". https://va811.com/?p=16173 : "tickets will remain open for 15
  working days following the stated date of work."
- **UT** https://dev.bluestakes.org/pdfs/Ticket_Field_Explanation.pdf : "Old Ticket—The original locate request ticket
  number. Same number if a New ticket; different if Updated."; "Ticket Type—New (NEW), Update (UPDT), No Response
  Notice (NRSP), Re-Mark (RMRK), Retransmit (RXMT), Cancel (CNCL)."; "Update By—Date/time by which Excavator must
  submit an Update request if excavation work will extend beyond…". https://www.bluestakes.org/ufaq-category/excavators/ :
  "A request expires 21 calendar days from the day it was submitted."
- **NC** https://norfield.freshdesk.com/support/solutions/articles/150000213509-center-logix-types-of-tickets :
  "Updates extend tickets beyond their initial expiration." "Generates a new ticket number linked to the old one."
  "Required every 28 days under 2025 law." "Must be processed before the 'Update By' date."
- **SC** https://sc811.com/wp-content/uploads/2026/05/Excavator-Manual-2026.pdf : p.9 "A Normal locate request is
  valid for 15 working days from its start time." "Once the request expires, a new locate request must be submitted
  before work can continue."; pp.16-17 "An Extension can be submitted at any time during the life of the notice."
  "Extending a ticket does not refresh paint markings;"; p.17 Remark: "the system generates a new ticket… provides a
  new ticket number and expiration date for the notice." "Operators have three full working days to respond to a
  Remark." Large Project FAQ, https://sc811.com/wp-content/uploads/2026/04/Large-Project-FAQ_Final-Version-for-Website.pdf :
  "Each phase is established with its own start and end dates." "As long as work is completed within that time frame, no updates are required."
- **IA** https://iowaonecall.com/wp-content/uploads/2024/08/iaoc-excavator-manual-2024.pdf : p.32 "shall be valid for
  twenty-five (25) calendar days beginning on the day the forty-eight-hour period concludes." "If an excavation will
  continue for periods longer than twenty-five (25) days, the excavator will be required to notify the Iowa One Call
  Notification Center and request a new locate ticket."; p.16 "…large, extensive, and/or complicated proposed excavation sites via one 'Parent Ticket.'"
- **MI** https://missdig811.org/get-started/i-want-to-dig/faq.html : "Digging needs to start within 14 days and be
  completed within 21 days of the Work Legal Start Date." "If the work has not started within 14 days or is not
  completed within 21 days, a new ticket is required." Ticket types,
  https://missdig811.org/cm/dpl/downloads/content/1091/Ticket_Types_7-24-2024.pdf : Normal 180-Day: "Jobs taking over
  21 days of digging to complete; may be placed by MISS DIG 811 operators or external plus users."; Project 180-Day:
  "Larger jobs with over 21 days of digging to complete." Ticket actions,
  https://www.missdig811.org/cm/dpl/downloads/content/1091/Selective_Ticket_Actions_11-21-25.pdf : "Retransmitting a ticket does not change the ticket number."
- **MD** Pub. Util. 12-124 / 12-125 (https://codes.findlaw.com/md/public-utilities/md-code-public-util-sect-12-124/ ,
  …sect-12-125/): "A ticket is valid for 12 business days after the selected start work date"; start date "not sooner
  than 3 business days after the ticket is initiated"; "A person shall repeat the notification required under § 12-124
  of this subtitle if the person: has not completed or will not complete the excavation or demolition within the time
  period authorized by the ticket". https://www.missutility.net/maryland/ : "Ticket life in Maryland is twelve (12)
  full business days beginning on the Select Start Date."
- **NJ** N.J.A.C. 14:2-3.1, https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-14-2-3-1 : "shall remain valid
  for 45 business days from the notification"; "Any excavation or demolition continuing after the 45 business days
  shall require a new notification".
- **OR** https://digsafelyoregon.com/resources/faq/ : "The Excavator is required to submit a new locate request if
  excavation exceeds 45 calendar days from the date the original ticket was submitted."
- **WA** RCW 19.122.030, https://app.leg.wa.gov/RCW/default.aspx?cite=19.122.030 : (6)(c) markings "expire forty-five
  calendar days from the date that the excavator provided notice to a one-number locator service. For excavation
  occurring after that date, an excavator must provide additional notice to a one-number locator service."; (2) "must
  take reasonable steps to confer with facility operators".
- **TX** https://intercom.help/texas-811/en/articles/10141135-submitting-an-update-or-update-remark : Update "Used to
  extend the life of the ticket to stay in compliance with Texas Administrative Code Chapter 18."; "Update – (previous
  ticket number)"; "Both ticket types are issued as Update tickets and sent with a two-business day notice."; "If the
  most recent ticket is over 30 days old, a new ticket must be created." 16 TAC 18.3(e),
  https://www.law.cornell.edu/regulations/texas/16-Tex-Admin-Code-SS-18-3 : "the excavator shall refresh the ticket by
  giving the notice described in subsection (a)." "A request to refresh shall be limited to the area yet to be excavated."
- **OK** https://okie811.org/wp-content/uploads/2026/07/2026-Excavator-Guide-Digital-.pdf : p.6 "A ticket expires 14
  calendar days after the excavation start date."; p.19 "If work extends beyond 14 days or if marks are destroyed, an
  updated ticket is required." "This update should be made at least 4 business days before the original ticket
  expires." "Facility operators have 48 hours (excluding weekends and holidays) to respond."
- **MS** https://www.ms811.org/wp-content/uploads/2023/07/Portal-Update.pdf : "extend an existing ticket for an
  additional 14 calendar days."; "Always update at least 3 working days prior to expiration to prevent a gap in
  ticket coverage."; "A new ticket # will be issued." (only when the marks must be redone).
- **AL** Ala. Code 37-15-4(d) (2022), https://law.justia.com/codes/alabama/2022/title-37/chapter-15/section-37-15-4/ :
  "shall be valid for a period of 20 working days from the proposed starting date given for excavation."; renew "at
  least two working days" before it expires.
- **CO** handbook, https://a-us.storyblok.com/f/1021538/x/160e66dfe5/excavator-handbook.pdf : p.21 "Locate marks are
  only valid for thirty (30) days from the ticket's due date"; "shall notify Colorado 811 at least two (2) business
  days" before; "A new ticket must be processed after this time has expired".
- **KS** K.S.A. 66-1804(c), https://ksrevisor.gov/statutes/chapters/ch66/066_018_0004.html : "shall be valid for 20
  calendar days after the excavation start date" (and "any subsequent updates"). KCC/Kansas 811 2023 slides: "Excessive unnecessary updates for 811 requests – possible fines".
- **KY** KRS 367.4911, https://law.justia.com/codes/kentucky/chapter-367/section-367-4911/ : "Locate requests are
  valid for twenty-one (21) calendar days from the day of the initial request."; "request remarking two (2) working
  days in advance of the expiration of each twenty-one (21) day period".
- **ND** handbook (2020 copy), https://cms7files.revize.com/cityofhoracend/Departments/Building%20Permits%20and%20Inspections/811%20-%20ND%20One%20Call%20-%20Locate%20Request%20Handbook%20(2020).pdf :
  p.11 "The ticket is valid for 21 calendar days from the start time stated on the ticket."; p.7 "your ticket is
  invalid. At that point you need to contact the ND One Call Center again and get a new ticket for that job."; p.23 "there is no such thing as a 'Blanket Ticket.'"
- **NM** 18.60.5 NMAC, https://www.srca.nm.gov/parts/title18/18.060.0005.html : 13(B)(4) "The locate markings shall be
  valid for 15 working days from the end of the advance notice period."; 10(B)(1) "such relocate request shall be
  limited to the area yet to be excavated only."; 11(E) "shall request reaffirmation of the wide area locate ticket every 15 working days."
- **CA** Gov. Code 4216.2, https://codes.findlaw.com/ca/government-code/gov-sect-4216-2/ : (e) "A ticket shall be
  valid for 28 days from the date of issuance. If work continues beyond 28 days, the excavator shall renew the
  ticket… by the end of the 28th day."; (i) "If a ticket obtained by an excavator expires but work is ongoing, the
  excavator shall immediately cease excavation, and get a new ticket". Sample ticket: https://usanorth811.org/images/pdfs/Northern-California-Ticket-Example.PDF
- **Dig Safe (ME MA NH RI VT)** manual Nov 2025, https://digsafe.com/data/file_uploads/Dig%20Safe%20Excavator%20Manual%20November%202025.pdf
  p.11: "In Massachusetts, New Hampshire, and Vermont, tickets expire every 30 days from the date of issue." "In
  Maine, tickets expire every 60 days." "In Rhode Island, tickets do not expire provided that the marks are
  maintained." "Remember, the utility locators must respond to mark each time you renew a ticket."
  https://www.digsafe.com/faqs : renew with "at least 72 hours notice in MA, ME, NH, RI, and VT (not including
  weekends or holidays)… so that you always have an active ticket for your excavation site."
- **FL** https://sunshine811.com/ticket-types : "When you need to renew a standard ticket, do not include any areas
  that are finished." Fla. Stat. 556.105(1)(c): "valid for 30 calendar days after the date such information is provided".
- **IL** 220 ILCS 50/4(g), https://www.ilga.gov/Documents/legislation/ilcs/documents/022000500K4.htm : "the 25-day
  expiration date of the original notice"; "pre-mark prior to requesting any subsequent extension notice".
- **AZ** https://azcc.gov/customer-assistance/call-before-you-dig-(az-811) : "if your project exceeds 15 working days, call 811 to have your marks refreshed."
- **DE/MD** Delmarva811 2024 slides, https://depsc.delaware.gov/wp-content/uploads/sites/54/2025/01/2024-DELMARVA811-Presentation.pdf : "Maintain a valid ticket - UPDATE."
- **OH** ORC 3781.28 (eff. June 9 2026), https://codes.ohio.gov/ohio-revised-code/section-3781.28/6-9-2026 : notice
  "at least two working days… but not more than sixteen calendar days"; no expiry in this section.

## Where the app's rules are wrong or thin, by these findings

1. **Renew keeps the old number in GA, VA, UT, IA, MI.** The centers say a new number (GA, VA, UT) or a new ticket
   (IA, MI). Fixed in p02.
2. **Georgia: two updates at most** (90 days). Not in the app. Not built: what the form should say after the second
   is a decision (below).
3. **Nevada message** did not say when to call the new ticket. p02: "…Call in a new ticket at least 2 working days
   before this one runs out, and add it here."
4. **State table lines to reword** (`PB_SR`, text only, no date changes; not built): MD has no renew line ("Repeat the
   notice before the 12 business days run out"); MI none ("Past 21 days, get a new ticket. Long jobs: ask MISS DIG
   for a 180-day ticket"); IA says "Ask for a remark if needed" (should be "Past 25 days, request a new ticket");
   GA (two updates, then Large Project); SC (Extension any time before expiry; a Remark gets a new number); VA life
   counts "beginning at 7:00 AM the next working day" / from the scheduled work date, the app counts from the call
   (earlier, so safe); NV add the 84-day total.
5. **Recheck, not proven wrong:** Mississippi (the center's update adds 14 calendar days; the app's life is 20);
   Ohio (law amended June 9 2026; the app says no expiry; Ohio 811 has an FAQ on expiry I could not open).
6. **Dig-day states: no change.** Nothing found puts a renewed ticket's expiry earlier than the app's date.

## Changes to the staged Renew form (p01)

Built in `patches/p02_locate_ren_research.py` (3 exact-once replacements, applies after p01):

1. `PB_LOC_REN`: add `GA`, `IA`, `MI`, `VA` as new-number states; `UT` becomes `{ exp: 1, no: 1 }`.
2. Nevada's two-renewal message gains "at least 2 working days before this one runs out" (taken from the state's own notice row).
3. Utah's rule sheet line: "The app counts a renewal from the old expiry. It asks for the new ticket number."

Test: `python3 tests/make_test.py ../locate_form_nov20/tests/t_loc_form_state_rule.js tests/t_loc_form_state_rule_p02.js`
then `PB_URL=http://127.0.0.1:<port>/cur.html NODE_PATH=/opt/npm-tools/node_modules node tests/t_loc_form_state_rule_p02.js`
(cur.html = r17.11 candidate + p01 + p02) → **ALL PASS 64/64** (58 of p01's, 2 reworded, 6 new: Utah / Georgia /
Virginia / Michigan / Iowa ask for the number; the list of new-number states). p01's own test was not run on a
p02 page; two of its checks (Nevada wording, Utah saving with no number) no longer fit, so use the p02 test instead. No other suite was run.

Proposed, not built:
- Georgia's two-update limit (decision 3).
- A "Renew by <day>" line on the ticket in the states where the center sets a deadline (decision 5).
- The table rewording in item 4 above.

New English strings: "at least 2 working days before this one runs out", "It asks for the new ticket number."

## Decisions for Tommy

1. **Ask for the new ticket number in Georgia, Virginia, Utah, Iowa and Michigan too** (built, p02)? Recommend
   **yes**: their own centers say the update gets a new number or that a new ticket is needed.
2. **Nevada after two renewals: keep the block, with the new wording** (built)? Recommend **yes**. The regulation
   leaves one way forward, a new ticket, and Nevada has no project ticket. 84 days per ticket at most.
3. **Georgia's two-update limit: stop the third renewal like Nevada?** Recommend **yes, next release**, worded
   "Georgia allows two updates on a ticket. Call Georgia 811 for a new ticket or a Large Project ticket." One call to
   Georgia 811 first: their page says what happens on a third update (it is reported), not plainly what to do instead.
4. **Dig-day states: keep the early date** (life from the renewal day, no wait added)? Recommend **yes**. Where it is
   written (MN, MD, IA, MI) the real date is later, never earlier.
5. **Show a "Renew by" day on the ticket** where the center names one (MN 48 hours; AL, KY 2 working days; CO 2
   business days; TN, MS, VA 3 working days; OK 4 business days; Dig Safe states 72 hours; GA / UT / NC the "Update
   By" date printed on the ticket)? Recommend **yes, next release**: a renewal called in on the last day is the one
   real way a crew ends up digging between tickets, and the reminders today only count down to the expiry.

Still open, needs a phone call to the center rather than more reading: whether TX, FL, OK, CT and ME print a new
number on an update / renewal.

## DONE
