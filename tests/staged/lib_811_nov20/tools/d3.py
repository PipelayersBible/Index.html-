# d3: PA DE DC VA WV MD NJ + Dig Safe states (MA ME NH RI VT) + CT  (sources read 2026-11-20)
def load(S, U):
    # ------------------------------------------------------------------ PENNSYLVANIA
    PA = '73 P.S. 176, 180, 182.10 (Underground Utility Line Protection Law; FindLaw copy, current as of Jan 1, 2026)'
    PAU = 'https://codes.findlaw.com/pa/title-73-ps-trade-and-commerce/pa-st-sect-73-180/'
    S('PA', 'overview', 'the dig law in short (Pennsylvania One Call, PA 811)', """
Pennsylvania's dig law is the Underground Utility Line Protection Law (Act 287 of 1974, as amended by Act 50 of 2017 and Act 127 of 2024), 73 P.S. 176 and after. The Public Utility Commission enforces it through its Damage Prevention Committee. One center: Pennsylvania One Call (PA 811).
Notice: "not less than three nor more than ten business days in advance of beginning excavation." Complex projects: at least ten business days.
The law gives no number of days a ticket lasts. It says to call again if you leave the site for more than two business days (unless you made other arrangements with the owners). Ticket life is not confirmed; go by PA One Call.
Tolerance zone: within eighteen inches of the outside wall or edge of the line. Use prudent techniques there, such as hand-dug test holes or vacuum.
Check the owners' responses (KARL) before digging. If an owner fails to respond you may proceed on the lawful start date, with due care.
Hit a line: tell the owner right away; gas or liquid escaping, call 911.""",
      PA, PAU, ed='Current as of January 1, 2026', conf='medium', unc='ticket life in days')
    S('PA', 'tickets', 'notice 3 to 10 business days, no-response rule, complex projects', """
Pennsylvania notice (73 P.S. 180(2.1)): "not less than three nor more than ten business days in advance of beginning excavation or demolition work." A business day is any day but Saturday, Sunday or a legal holiday, midnight to midnight. The lawful start date is the scheduled start date on the ticket.
The statute sets no ticket life in days; it is not confirmed here. It does require a new notice if you vacate the worksite for more than two business days without other arrangements with the facility owners (clause 14).
No response: if a facility owner "fails to respond to the excavator's timely request," the excavator may proceed, not before the lawful start date and using due care (clause 5). PA One Call's response system (KARL) shows each owner's code, such as "001 Clear" and "003 Field Marked"; "999 Did not respond" is a violation by the owner.
Find an unmarked or wrongly marked line when you arrive: renotify PA One Call; if the owner gives nothing useful within three hours you may proceed with care (clause 20).
Complex projects (more than one locate request, or long schedules): a complex project ticket needs 10 business days' notice and a preconstruction meeting; they are entered through Coordinate PA, as are design notifications.""",
      PA + '; PA One Call presentation to the PUC (Sept 2025)', PAU, ed='Current as of January 1, 2026', conf='medium', unc='ticket life in days')
    S('PA', 'marks', 'tolerance zone 18 inches, prudent techniques, white', """
Pennsylvania tolerance zone (73 P.S. 176): "the horizontal space within eighteen inches of the outside wall or edge of a line or facility."
Inside it (73 P.S. 180(4)): "Within the tolerance zone the excavator shall employ prudent techniques, which may include hand-dug test holes," vacuum excavation or similar devices, to find the exact position of the line.
White (clause 11): use "the color white to mark a proposed excavation work site when exact work site information cannot be provided."
Trenchless work (boring, directional drilling): follow the Common Ground Alliance best practices (clause 11.2).
What is not "excavation work": soft excavation by vacuum, air or water; farm tilling to a depth of less than eighteen inches; minor routine road maintenance less than eighteen inches deep; work up to twenty-four inches below the surface inside a State highway right-of-way.""",
      PA, 'https://codes.findlaw.com/pa/title-73-ps-trade-and-commerce/pa-st-sect-73-176/', ed='Current as of January 1, 2026')
    S('PA', 'damage', 'line hits, emergencies, fines', """
Pennsylvania, line hit (73 P.S. 180(7)-(8), (16)): report any break, leak or damage to the facility owner immediately. If the damage lets flammable, toxic or corrosive gas or liquid escape, immediately notify 911 and the facility owner, take reasonable steps to protect people, and stay on site to tell the responders what happened. File an alleged violation report through PA One Call "not more than thirty days after striking or damaging a facility owner's line."
Emergency: "a sudden or unforeseen occurrence involving a clear and immediate danger to life, property or the environment," including serious breaks in an owner's lines. The 3 to 10 day notice does not apply, but all facility owners must be notified "as soon as possible before, during or after."
Penalties (73 P.S. 182.10): the Public Utility Commission may issue a warning or an administrative penalty of up to $2,500 per violation, and up to $50,000 if the violation causes injury, death or property damage of $25,000 or more. Unpaid penalties or a skipped education program add $100 a day up to $5,000.""",
      PA, 'https://codes.findlaw.com/pa/title-73-ps-trade-and-commerce/pa-st-sect-73-182-10/', ed='Current as of January 1, 2026')

    # ------------------------------------------------------------------ DELAWARE
    DE = '26 Del. C. 802, 803, 805, 806, 808, 810 (Underground Utility Damage Prevention and Safety Act; through 85 Del. Laws c. 345)'
    DEU = 'https://delcode.delaware.gov/title26/c008/sc01/index.html'
    S('DE', 'overview', 'the dig law in short (Miss Utility of Delmarva)', """
Delaware's dig law is the Underground Utility Damage Prevention and Safety Act, 26 Del. C. chapter 8, enforced by the Public Service Commission. Call 811 (Miss Utility of Delmarva).
Notice: "not less than 3 business days, but no more than 12 business days" before work begins.
A ticket "is valid for 12 business days after the day on which the ticket is transmitted." "On the thirteenth day, the ticket will expire, and an update, remark, or new excavation ticket shall be required."
"No excavation may begin until a positive response code of clear or no conflict or marked is received."
Tolerance zone: 24 inches from the outside wall or edge of the line. No mechanized equipment in it except to remove pavement; vacuum excavation is allowed; hand dig.
White line marking is highly recommended when the exact location can't be given.
Hit a line: report it to the owner immediately; dangerous gas or liquid escaping, call 911.""",
      DE, DEU, ed='Delaware Code online, through 85 Del. Laws c. 345')
    S('DE', 'marks', 'tolerance zone 24 inches, no machines, unmarked lines', """
Delaware tolerance zone (26 Del. C. 802): "the horizontal space within 24 inches of the outside wall or edge of a facility." "No mechanized equipment will be allowed within the tolerance zone," except to remove pavement or other hard surface under set conditions. "Vacuum excavation will be permitted within the tolerance zone."
Excavator duties (806): protect the lines, which "shall include but may not be limited to hand digging"; "The excavator shall employ prudent techniques, which may include test holes."
See a line that was not marked (a valve box, meter, pedestal): call it in; the operator "will have a maximum of 2 hours to respond."
Operators answer tickets within 3 business days and mark with the current APWA colors.
Design tickets and meeting tickets (for complex projects) do not allow digging.
A business day is any day but Saturday, Sunday or a legal holiday.""",
      DE, DEU, ed='Delaware Code online, through 85 Del. Laws c. 345')
    S('DE', 'damage', 'line hits, emergencies, fines, exemptions', """
Delaware, line hit (26 Del. C. 806): "Report immediately to the facility owner or facility operator" any break or leak. "Immediately notify 911 and the facility owner or facility operator if damage" lets dangerous gas or liquid escape.
Emergency (802, 806(b)): "a sudden or unforeseen occurrence involving a clear or imminent danger to life, health, or property." Emergency digging skips most of the advance steps, but notify the center "at the earliest practicable moment."
Fines (810): first offense $100 to $1,000; later offenses $200 to $5,000 per violation. Top amounts: $1,000,000 for a violation that causes a death, $500,000 for damage to a structure, $100,000 for other violations. The Attorney General can take the death and structure cases; the Public Service Commission handles the rest.
Exempt (808): digging by the owner of a private residence on their own land (still liable for damage); surface cultivation such as tilling outside rights-of-way and easements. Patch paving up to 12 inches deep and hand-driven non-metal stakes 6 inches or less are not excavation.""",
      DE, DEU, ed='Delaware Code online, through 85 Del. Laws c. 345')

    # ------------------------------------------------------------------ DC
    DC = 'D.C. Code 34-2704 to 34-2709 (through D.C. Law 23-186, Mar. 16, 2021)'
    DCU = 'https://code.dccouncil.gov/us/dc/council/code/titles/34/chapters/27/index.full.html'
    S('DC', 'overview', 'the dig law in short (District One Call, 811)', """
The District of Columbia's dig law is D.C. Code Title 34, Chapter 27. Call 811 (District One Call).
Notice: at least 96 hours and not more than 10 days before work begins, not counting Saturdays, Sundays and legal holidays.
A notice is good for 15 days, not counting weekends and legal holidays. Three days before that ends, or when marks can't be read, ask the one-call center for a re-mark; re-marking is done within 48 hours.
No digging until the one-call center confirms the operators have answered (they have 72 hours).
Marks are within 2 feet of the outermost part of the line. Within 18 inches of it, expose the line by hand digging.
Hit a line: notify the operator immediately; gas or liquid release, also 911. No backfill over a damaged line without the operator's permission.
Fines: $2,500 first violation, $5,000 second, $10,000 third or later.""",
      DC, DCU, ed='D.C. Code online, through D.C. Law 23-186 (2021)')
    S('DC', 'damage', 'hand digging, line hits, emergencies, fines', """
District of Columbia rules near marked lines (D.C. Code 34-2704): operators mark "to within 2 feet from the outermost part of the underground facility." Once the dig comes into the immediate vicinity, within 18 inches of the outermost part of the line, protect it and "expose the underground facility by hand digging."
Line hit (34-2705, 34-2706): notify the operator immediately and allow reasonable time for repair before working near it. If flammable, toxic or corrosive gas or liquid is released, also notify 911. Do not backfill a damaged line without the operator's permission.
Emergency (34-2709): for "imminent danger to life, health, or property" the advance notice is not required if reasonable precautions are taken; notify the operators directly and as soon as possible. Operators mark within 2 hours where practicable.
Fines (34-2707): $2,500 for a first violation, $5,000 for a second, $10,000 for a third or later, brought by the Attorney General. Damage a line without following the notice rules and you owe three times the repair cost.
Routine maintenance such as patch paving inside the old excavation limits and no deeper than 12 inches below the prior grade needs no notice.""",
      DC, DCU, ed='D.C. Code online, through D.C. Law 23-186 (2021)')

    # ------------------------------------------------------------------ VIRGINIA
    VA = 'Va. Code 56-265.17 (2023 amendments); Virginia 811 "Ticket Types" sheet (May 15, 2026)'
    VAU = 'https://law.lis.virginia.gov/vacode/56-265.17/'
    S('VA', 'overview', 'the dig law in short (Virginia 811)', """
Virginia's dig law is the Underground Utility Damage Prevention Act, Va. Code 56-265.14 to 56-265.32, enforced by the State Corporation Commission. One center: Virginia 811.
Wait: operators have 48 hours beginning at 7:00 a.m. the next working day after your locate request, so a Monday request is good Thursday at 7 AM. You may start sooner only when every operator has marked or posted a positive response that allows digging.
A notice is "valid for 15 working days" from 7:00 a.m. the next working day after the request (or the scheduled date, if later). Three working days before it runs out, or when marks can't be read, request an update; Virginia 811 gives an update or re-mark a new request number. A re-mark is good for another 15 working days.
Mark the site boundary in white paint, if practical, when you can't give an exact location.
One request covers no more than one-third of a mile and only what can be dug in 15 working days.
The hand-dig distance (2 feet in section 56-265.24) and fine amounts were not confirmed in this pass.""",
      VA, VAU, ed='Section as amended in 2023 (chs. 299 and 300)', conf='medium', unc='hand-dig distance and fine amounts')
    S('VA', 'tickets', '48-hour wait, 15 working days, updates get a new number, 3-hour rule', """
Virginia timing (Va. Code 56-265.17): no digging until you have confirmed that "each operator has marked its utility lines," has none, or has posted a positive response that lets you proceed. If an operator has not responded, the notification center re-notifies it.
See clear evidence of an unmarked line after the 48 hours (counted from 7:00 a.m. the next working day): contact Virginia 811 again and wait; the operator "shall respond within three hours."
Life: the notice is "valid for 15 working days." Ask for the re-mark three working days before the end or when marks are illegible; the operator re-marks within 48 hours and the re-mark is good for another 15 working days.
Virginia 811's ticket sheet: "An Update or Re-mark will produce a new request number for the area of excavation"; "An Update locate request should be requested on the third working day before the end of the fifteen-day period."
A meeting request is not a ticket to dig on.
Designers have their own notice rule (56-265.17:1).
In an emergency the waiting rules do not apply.""",
      VA, VAU, ed='Section as amended in 2023 (chs. 299 and 300)')

    # ------------------------------------------------------------------ WEST VIRGINIA
    WV = 'W. Va. Code 24C-1-5 (code.wvlegislature.gov)'
    WVU = 'https://code.wvlegislature.gov/24C-1-5/'
    S('WV', 'overview', 'the dig law in short (West Virginia 811)', """
West Virginia's dig law is W. Va. Code Chapter 24C. One center: West Virginia 811.
Notice: "Not less than forty-eight hours, excluding Saturdays, Sundays and federal or state legal holidays," and not more than ten work days before work begins.
Changing the start date or time: tell the one-call system at least 24 hours ahead, not counting weekends and holidays.
The section sets no ticket life in days and no tolerance zone in inches; those are not confirmed here, so go by the ticket and West Virginia 811.
Each equipment operator must be told to avoid damage, "including hand digging, when necessary," to keep a clearance "as may be reasonably necessary" from lines given the reach of the cutting edge, to protect marks and stakes, and to support lines during work and backfill.
Line hit: report it immediately and give the operator reasonable time to repair. An emergency: alert the public and call 911. Damage that is not an emergency: notify the one-call system within 24 hours.
Failing to notify or to report is a misdemeanor with a fine of "not more than $5,000," and you owe the repair cost.""",
      WV, WVU, ed='W. Va. Code as posted Nov 20, 2026 (last act shown: 2006 SB 439)', conf='medium', unc='ticket life and tolerance zone')

    # ------------------------------------------------------------------ MARYLAND
    MD = 'Md. Code, Public Utilities 12-124, 12-125 (FindLaw); Miss Utility Maryland page (missutility.net/maryland)'
    MDU = 'https://www.missutility.net/maryland/'
    S('MD', 'overview', 'the dig law in short (Miss Utility)', """
Maryland's dig law is Public Utilities Article Title 12, Subtitle 1, enforced by the Maryland Underground Facilities Damage Prevention Authority. Call 811 (Miss Utility).
Pick a start date "not sooner than 3 business days after the ticket is initiated" and not later than 12 business days after. Business days are Monday to Friday, 7 AM to 5 PM, not holidays; a ticket taken after hours counts from the next business morning.
"A ticket is valid for 12 business days after the selected start work date." If the work won't be done in that time, "repeat the notification" the same way as the first.
Ticket Check (positive response) is mandatory for owner-members. Check it before digging: 866-821-4226 or online. Code 11 (critical facilities) is not a go-ahead.
Emergency tickets: owners respond within two hours.
The 18-inch hand-dig rule and fine amounts come from the statute, were not re-read today and are not confirmed here.""",
      MD, MDU, ed='Miss Utility page as posted Nov 20, 2026', lic='summary', conf='medium', unc='18-inch rule and fine amounts not re-read')

    # ------------------------------------------------------------------ NEW JERSEY
    NJ = 'N.J.A.C. 14:2-3.1, 3.2, 3.5, 3.6, 4.2, 4.4, 5.2, 6.2 (BPU One-Call rules, 2021 readoption text)'
    NJU = 'https://nj.gov/bpu/pdf/rules/Chapter%202%20One%20Call%20Rules%2010.28.21%20Clean%20Version.pdf'
    S('NJ', 'overview', 'the dig rules in short (New Jersey One Call)', """
New Jersey's dig law is the Underground Facility Protection Act (N.J.S.A. 48:2-73 and after) with rules in N.J.A.C. 14:2, enforced by the Board of Public Utilities. Call 811 (New Jersey One Call).
Notice: "no less than three business days before the beginning of the excavation." Start within 10 business days of the notice.
The notice "shall remain valid for 45 business days from the notification." Digging after that needs a new notification with the normal wait.
Operators must post an electronic positive response within three business days and mark out or tell you they have no lines there.
You may mark the edge of the site in white; it is optional.
Marks are paint, at intervals of 25 feet or less.
Hit a gas, petroleum or hazardous liquid line: "immediately call 911," then the operator, or the One-Call center at 811 if you can't reach the operator.
Fines: $1,000 to $2,500 per day, up to $25,000 for a related series.
The hand-dig distance (2 feet in the statute) was not confirmed in the text read.""",
      NJ, NJU, ed='BPU rule text dated Oct 28, 2021 (readoption proposal)', conf='medium', unc='hand-dig distance; this is the 2021 proposal text, not the current code')
    S('NJ', 'damage', 'line hits, emergencies, fines', """
New Jersey, line hit (N.J.A.C. 14:2-3.6): for a gas, liquid petroleum or other hazardous liquid line, "immediately call 911." Then report the damage to the operator; if you can't reach the operator, "report the damage to the One-Call center at 811 or 1-800-272-1000."
Protect the markout until it "is no longer necessary" (14:2-3.3).
Emergency notices are good only while the emergency lasts (14:2-3.5). Operators must act within one hour of learning of an emergency.
Operators that fail to mark are liable for the excavator's costs, labor, parts, equipment and downtime (14:2-4.2).
Fines (14:2-6.2): "not less than $ 1,000 and not more than $ 2,500 per day for each day the violation continues," and "shall not exceed $ 25,000 for any related series of violations." The Board of Public Utilities enforces.
Routine residential yard and right-of-way maintenance with non-mechanized tools is not "excavation."
Colors follow ANSI Z535.1. This is the Board's 2021 readoption text; later changes were not confirmed.""",
      NJ, NJU, ed='BPU rule text dated Oct 28, 2021 (readoption proposal)', conf='medium', unc='this is the 2021 proposal text, not the current code')

    # ------------------------------------------------------------------ DIG SAFE STATES
    DS = 'Dig Safe Excavator Manual (version Aug 2025; laws table updated 6/5/25) pp. 4-5, 9, 11, 14-19, 25-27, 31'
    DSU = 'https://digsafe.com/data/file_uploads/Dig%20Safe%20Excavator%20Manual%20November%202025.pdf'
    def digsafe(st, name, life, fine, enf, exempt, extra=''):
        S(st, 'overview', 'the dig rules in short (Dig Safe)', f"""
{name} uses Dig Safe as its one-call center (call 811); the {enf} enforces the state's Dig Safe law.
Pre-mark the dig area in white (paint, flags, stakes or whiskers), then call at least 72 hours ahead, not counting weekends and holidays, and not more than 30 days ahead.
Ticket life: {life} In every Dig Safe state a ticket expires if digging does not start within 30 days. Renew with at least 72 hours' notice (weekends and holidays not counted) so there is no gap; if the scope of work changes, get a new ticket instead. Whether a renewal prints a new number is not confirmed.
Tolerance zone: the width of the line plus 18 inches on each side. Hand dig or use vacuum equipment there; no machines until the line is verified. Power equipment may remove pavement only to the depth of the pavement.
Dig Safe only notifies its members. Call non-member owners (often town water and sewer) yourself.
{extra}""", DS, DSU, ed='Manual version August 2025', lic='summary', conf='medium', unc='new ticket number on renewal')
        S(st, 'damage', 'line hits, emergencies, fines, exemptions (Dig Safe)', f"""
{name}, line hit (Dig Safe manual p. 19): "you must immediately call the operator whose facilities have been damaged," even for a scrape to the coating. Gas release: call 911. Electric contact: call the electric operator and the fire department. Not sure whose line it is: call 811. Leave the damaged line exposed.
Emergency: "An emergency is a sudden or unexpected occurrence." Do not ask for an Emergency ticket for a job that is not one. Emergency notice must be given the same day.
Unmarked structure, or something that does not look right: tell Dig Safe before digging there. Marks destroyed before the work is done: call for a re-mark.
Fines in {name} (manual p. 27 table): {fine} Enforced by the {enf}.
Not excavation in {name}: {exempt}
On snow, Dig Safe recommends fluorescent pink for pre-marking so it can be seen.""", DS, DSU, ed='Manual version August 2025', lic='summary', conf='medium')
    digsafe('MA', 'Massachusetts', 'tickets expire 30 days from the day of issue.', '$1,000 for a first offense and $5,000 to $10,000 after that.', 'Department of Public Utilities', 'hand-tool gardening and quarry blasting.')
    digsafe('NH', 'New Hampshire', 'tickets expire 30 days from the day of issue.', '$500 for a first offense and up to $5,000 after that.', 'Department of Energy', 'farm tilling and yard work on residential property with non-mechanized tools.')
    digsafe('VT', 'Vermont', 'tickets expire 30 days from the day of issue.', 'up to $500 for a first offense and up to $5,000 after that.', 'Department of Public Service', 'farm tilling, routine home gardening with hand tools outside easements, and routine public highway maintenance.')
    digsafe('RI', 'Rhode Island', '"tickets do not expire provided that the marks are maintained."', '$350 for a first offense and $2,500 after that.', 'Division of Public Utilities and Carriers', 'moving earth with hand or animal-powered tools, and farm tilling.')
    digsafe('ME', 'Maine', 'tickets expire every 60 days.', 'up to $1,000, or up to $10,000 for a repeat within 12 months (23 M.R.S. 3360-A).', 'Public Utilities Commission', 'tilling and gardening or farm earth work; the statute also has rules for timber harvesting, cemeteries, shoulder grading, quarries and private road grading no deeper than 6 inches.', extra='Maine also has its own damage prevention statute, 23 M.R.S. 3360-A.')
    ME = '23 M.R.S. 3360-A (legislature.maine.gov)'
    S('ME', 'marks', 'statute: 3 business days, 60 days, 18 inches, non-members', """
Maine statute (23 M.R.S. 3360-A): notify the damage prevention system "at least 3 business days but not more than 30 calendar days prior to the commencement of excavation." Mark the proposed dig area before you call. If the work is not completed "60 calendar days after notification," or it grows beyond the first location, notify again.
18-inch rule: an excavator "may not use mechanical means of excavation when excavating within 18 inches of any marked underground facilities" until the lines are exposed. Air vacuum methods are not "mechanical means."
Non-members: you must notify any owner that is not a Dig Safe member "in writing or in person" and wait until it marks or 3 business days pass, whichever is first.
Emergency: take all reasonable steps to notify the system and mark the site, and start within 12 hours of the notice.
Line hit: "immediately notify the affected underground facility operator"; no backfill without that operator's permission; natural gas or hazardous release, call 9-1-1.
The Public Utilities Commission can fine up to $1,000 (up to $10,000 for a repeat within 12 months) and order training.""",
      ME, 'https://legislature.maine.gov/statutes/23/title23sec3360-A.html', ed='Maine Revised Statutes online, read Nov 20, 2026')

    # ------------------------------------------------------------------ CONNECTICUT
    CT = 'R.C.S.A. 16-345-1 to 16-345-9 as described on the PURA "CBYD Current Provisions" page'
    CTU = 'https://portal.ct.gov/PURA/Gas-Pipeline-Safety/Call-Before-You-Dig/CBYD-Current-Provisions'
    S('CT', 'overview', 'the dig rules in short (Call Before You Dig)', """
Connecticut's dig law is Conn. Gen. Stat. 16-345 to 16-359 with regulations R.C.S.A. 16-345-1 to 16-345-9. The Public Utilities Regulatory Authority (PURA) oversees and enforces it. Call 811 (Call Before You Dig, CBYD).
Notice: "at least two full days, excluding Saturdays, Sundays and holidays, but not more than thirty (30) days" before digging.
The app's table gives a 30-day ticket life from the regulation; that and the hand-dig distance were not on the page read today and are not confirmed here.
Forgetting to call is not an emergency. An emergency excavation is one "necessary to correct an emergency involving danger to life, health, or property."
Hit or touch a line: "Immediately and directly report the contact or damage to the affected public utility." For a gas escape or other danger, also alert emergency personnel (911) and keep people away.
Violations can bring a civil penalty from PURA; the amount was not on the page.""",
      CT, CTU, ed='PURA page as posted Nov 20, 2026', conf='medium', unc='ticket life, tolerance zone and penalty amounts')
