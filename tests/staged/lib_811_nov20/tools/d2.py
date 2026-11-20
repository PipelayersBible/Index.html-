# d2: UT GA NC NY IL OH MI  (sources read 2026-11-20)
def load(S, U):
    # ------------------------------------------------------------------ UTAH
    UT = 'Utah Code 54-8a-2, -4, -5, -5.5, -7, -8, -12 (as amended by 2024 ch. 369)'
    UTU = 'https://le.utah.gov/xcode/Title54/Chapter8A/C54-8a_1800010118000101.pdf'
    S('UT', 'overview', 'the dig law in short (Blue Stakes of Utah 811)', """
Utah's dig law is Utah Code Title 54, Chapter 8a. One center: Blue Stakes of Utah 811.
Notice: not "less than 48 hours before excavation begins" and not "more than 14 days before." The 48 hours count business days only; business hours are 8 AM to 4 PM, Monday to Friday, not holidays.
A notice is "valid for 21 days from the day on which the notice is given." To keep going, renew at least 48 hours and no more than 7 calendar days before it expires. Blue Stakes gives an update a different ticket number.
Tolerance zone: 24 inches on either side of the outside edge of the mark (or half the marked diameter plus 24 inches from the center).
No power equipment inside the zone until you have found the exact location with hand tools.
Operator did not mark or answer in 48 hours: file a no response notice; the operator then has 4 business hours.
Hit a line: tell the operator right away; gas, electric or danger to life, call 911. No backfill until the operator says so.""",
      UT, UTU, ed='Utah Code as amended by the 2024 General Session (ch. 369)')
    S('UT', 'tickets', 'ticket life 21 days, updates, no-response notice', """
Utah ticket life (54-8a-4(6)): a notice is "valid for 21 days from the day on which the notice is given," and marks are good for no more than 21 calendar days (54-8a-5(3)). If digging will go past that, give a renewal notice at least 48 hours but no more than 7 calendar days before the ticket expires.
Blue Stakes ticket types: New, Update (UPDT), No Response Notice (NRSP), Re-Mark (RMRK), Retransmit (RXMT), Cancel (CNCL). Its ticket field guide says the old ticket number is the "Same number if a New ticket; different if Updated," and each ticket prints an "Update By" date and time. Send the update by that time.
Operators answer through Blue Stakes' electronic positive response system. If an operator has not marked or answered within 48 hours, you may not dig where you know or can see there is an unmarked line until you have filed a no response notice and the operator has arranged to mark. The operator must mark "within four business hours of the association receiving a no response notice."
Very large jobs: an operator that can't mark an extensive excavation in time may "request a meeting at the proposed excavation site."
Colors follow the Common Ground Alliance Uniform Color Code.""",
      'Utah Code 54-8a-4, 54-8a-5 (2024); Blue Stakes of Utah "Ticket Field Explanation"', UTU, ed='Utah Code as amended by the 2024 General Session (ch. 369)')
    S('UT', 'marks', 'tolerance zone 24 inches, hand tools first', """
Utah tolerance zone (54-8a-2): when the size of the line is not marked, "24 inches on either side of the outside edge of the mark." When the diameter is marked, half the marked diameter plus 24 inches on each side of the center.
Hand tools first (54-8a-5.5): an excavator may not use "any power-operated or power-driven excavating or boring equipment within the tolerance zone" unless the exact location of the line has first been determined with hand tools. The operator can waive that, but only in writing or electronically.
The statute has no white-lining requirement; Blue Stakes asks for white marks when the dig area is hard to describe.
Marks follow the Common Ground Alliance Uniform Color Code and Marking Guidelines (the same colors as APWA).
Gardening and tilling private ground do not need a ticket (54-8a-4(1)(b)).""",
      UT, UTU, ed='Utah Code as amended by the 2024 General Session (ch. 369)')
    S('UT', 'damage', 'line hits, emergencies, fines', """
Utah, line hit (54-8a-7): give notice "immediately to the operator." If the damage lets out electricity or gas or puts life in danger, immediately notify "emergency responders, including 911 services." Do not backfill around the damaged line until the operator authorizes it.
Emergency (54-8a-2, -4): "an occurrence or suspected natural gas leak necessitating immediate action" to prevent loss or damage. The advance notice rule does not apply during an emergency, and the fine section does not apply if reasonable precautions are taken.
Fines (54-8a-8): "no greater than $5,000 for each violation," capped at $100,000 for one excavation, plus up to $500 more for not giving notice at all. You also owe the repair cost. The attorney general can bring the case; if not, the operator or excavator can.
Fines do not apply to digging with hand tools on property you own or occupy.
Disputes over damage can go to the Underground Facilities Damage Dispute Board.""",
      UT, UTU, ed='Utah Code as amended by the 2024 General Session (ch. 369)')

    # ------------------------------------------------------------------ GEORGIA
    GA = 'O.C.G.A. 25-9-3, 25-9-4, 25-9-6, 25-9-7, 25-9-8, 25-9-12, 25-9-14 (as printed by Georgia 811, eff. Sept 1, 2022)'
    GAU = 'https://georgia811.com/wp-content/uploads/2025/03/Georgia-Dig-Law_090122.pdf'
    S('GA', 'overview', 'the dig law in short (Georgia 811)', """
Georgia's dig law is the Georgia Underground Facility Protection Act, O.C.G.A. 25-9, enforced by the Public Service Commission. One center: Georgia 811.
Notice: the notice period starts at 7 AM on the first business day after Georgia 811 gets your request and runs at least 2 business days, so a Monday request is good to dig Thursday at 7 AM. A request after 4:30 PM counts as the next business day. You may start early only if every owner has already answered clear or marked.
Check the Positive Response Information System (PRIS) before digging.
A locate request is good for 30 calendar days. Georgia 811 allows a normal ticket to be updated two times (90 days); each update is a new ticket number.
Tolerance zone: the width of the line plus 18 inches on either side.
Hit a line: stop, notify Georgia 811 and the owner; gas or hazardous liquid, call 911.
Fines up to $10,000 per violation.""",
      GA, GAU, eff='2022-09-01')
    S('GA', 'tickets', 'ticket life 30 days, two updates, large projects, PRIS', """
Georgia ticket life (25-9-6(c)): digging may not take place more than 30 calendar days after the ticket's effective date; to keep going, "an additional locate request with appropriate notice must be submitted." The added request can't make the area bigger.
Georgia 811 calls this an Update: "An Update extends the life of an existing Normal ticket. A new ticket will be generated." It can only be sent between the "Updateable On" and "Update By" dates on the ticket, and "a Normal Ticket may be updated a maximum of two times" (90 days in all). A third update needs a reason and is reported to the PSC.
Jobs over 1 linear mile or over 90 days: call 811 and ask for the Large Project team.
PRIS: you are "responsible for being aware of all information timely entered into the PRIS" before you dig. If an owner has not answered, Georgia 811 sends a second request; if there is still no answer by noon that business day you "may proceed" as long as "there is no visible and obvious evidence of the presence of an unmarked underground facility" (25-9-7(e)).
Don't ask for re-marks over and over; an owner can bill up to $100 for one.
Design locate request: owners answer within ten business days; it "shall not be used for excavation purposes."
Emergency tickets: no digging after 7 AM on the third business day after the request.""",
      'O.C.G.A. 25-9-4, 25-9-6, 25-9-7 (eff. Sept 1, 2022); Georgia 811 "Ticket Actions in the Portal" and "Update" guides', GAU, eff='2022-09-01')
    S('GA', 'marks', 'tolerance zone 18 inches, reasonable care, white lining, sewer laterals', """
Georgia tolerance zone (25-9-3): "the width of the underground facility or sewer lateral plus 18 inches on either side of the outside edge."
Inside it (25-9-8): you "shall exercise reasonable care for the protection of the underground facility or sewer lateral." The law lists "hand digging, pot holing, soft digging, vacuum excavation methods, pneumatic hand tools." Other mechanical methods "may be used with the approval of the facility owner or operator."
White lining (25-9-6(b)): when the site can't be described well enough, mark the route in white paint, flags or stakes (or electronically), or set an on-site meeting and tell Georgia 811.
Owners mark with the APWA color code.
Sewer laterals: the sewer owner helps designate laterals up to the edge of the public right of way. If a lateral can't be located, a green triangle is placed at the main pointing toward the property.
Business hours are 7:00 AM to 4:30 PM on business days.""",
      GA, GAU, eff='2022-09-01')
    S('GA', 'damage', 'line hits, emergencies, fines, what is not excavating', """
Georgia, line hit (25-9-8(e)-(f)): you "shall immediately cease such blasting or excavating and notify the UPC and the appropriate facility owner or operator" (the UPC is Georgia 811). Striking a gas or hazardous liquid line: you "shall make an emergency 9-1-1 call."
Emergency (25-9-3, 25-9-12): "a sudden or unforeseen occurrence involving a clear and imminent danger to life, health, or property." The notice wait does not apply, but notify Georgia 811 "as soon as practical."
Extraordinary circumstances such as hurricanes, floods, ice and snow let owners post a later marking date in PRIS.
Fines (25-9-14): the Public Service Commission may set a civil penalty "not exceeding $10,000.00 for each violation." Dig without a ticket and cause damage and you are strictly liable for the repair.
Not "excavating": farm tilling; pavement milling or repair no deeper than the pavement or 12 inches; road maintenance no deeper than 18 inches. Careful hand-tool ("minimally intrusive") digging used alone needs no notice.""",
      GA, GAU, eff='2022-09-01')

    # ------------------------------------------------------------------ NORTH CAROLINA
    NC = 'N.C.G.S. 87-117, 87-120 to 87-127, 87-129 (Article 8A, as amended by S.L. 2025-21)'
    NCU = 'https://www.ncleg.net/EnactedLegislation/Statutes/HTML/ByArticle/Chapter_87/Article_8A.html'
    S('NC', 'overview', 'the dig law in short (NC811)', """
North Carolina's dig law is the Underground Utility Safety and Damage Prevention Act, G.S. Chapter 87, Article 8A (amended in 2025). One center: NC811.
Notice: at least 3 full working days before the start date (10 to 20 for work near underwater lines). Working days are every day but Saturday, Sunday and State holidays.
A notice expires 28 calendar days after the work start date. To keep digging, give a new notice the same way; NC811 calls it an update and it gets a new ticket number.
Check positive response before you dig.
Tolerance zone: 24 inches on each side of the outside edge of the mark, or half the diameter plus 24 inches from the centerline when the size is known.
No mechanized equipment in the zone until you can see the line.
Hit a line: notify NC811 and the operator right away; gas, electricity or danger, call 911 first. No backfill until cleared.""",
      NC, NCU, ed='Statute as amended by Session Law 2025-21')
    S('NC', 'tickets', 'ticket life 28 days, updates, 3-hour notice, size limits', """
North Carolina ticket life (87-122(a)): the notice expires 28 calendar days after the work start date, and "No excavation or demolition may continue after this 28-day period unless" a new notice is given in the same manner as the first. NC811's ticket system treats that as an Update, which "Generates a new ticket number linked to the old one" and must be processed before the "Update By" date (from the ticket software vendor's help page; NC811's own pages would not open).
Size: a notice may cover one parcel, or the lesser of five adjoining parcels or a quarter mile, and only what can be finished in 28 days.
Positive response (87-122(c)): confirm through the system that every operator has answered before you dig. If one has not, you may go ahead only if there are no visible signs of a line (pole, marker, pedestal, meter, valve). If there are signs, send an additional notice; the operator must mark "within three hours from the time the additional notice is received."
You may start before the 3 days are up only when all operators have already answered.
Design notice (87-127): operators answer within 10 working days; it "may not be used for excavation purposes."
Underwater (subaqueous) lines: 10 to 20 full working days' notice.""",
      NC + '; Norfield CENTER LOGiX "Types of Tickets" help page', NCU, ed='Statute as amended by Session Law 2025-21')
    S('NC', 'marks', 'tolerance zone 24 inches, no machines until the line is seen', """
North Carolina tolerance zone (87-117): if the line's diameter is known, half the diameter plus 24 inches on each side of the centerline; if not, 24 inches on each side of the outside edge of the mark; 15 feet each side for underwater lines. This applies to every marked line, not only transmission lines.
Inside the marked zone (87-122(c)): no mechanized equipment "except noninvasive equipment" made to protect the line, until the line has been seen or shown not to be there down to the depth of the dig. Machines may break and remove pavement only, to the depth of the pavement.
Digging alongside a line: expose it at intervals of no more than 50 feet.
Within 24 inches of oil, petroleum, gas transmission or electric transmission lines: only non-mechanized tools, unless the operator agrees in writing and has someone on site.
Premarking: when the dig area can't be clearly identified, "Premarking shall be made with soluble white paint, white flags, or white stakes."
Operators mark with the APWA Uniform Color Code.""",
      NC, NCU, ed='Statute as amended by Session Law 2025-21')
    S('NC', 'damage', 'line hits, emergencies, fines, exemptions', """
North Carolina, line hit (87-126): immediately notify the Notification Center (NC811) and the operator if known, give the operator reasonable time to repair, and do not backfill until authorized. If the damage lets out electricity or gas or endangers life or property, you "shall immediately notify emergency responders, including 911 services," then NC811 and the operator.
Emergency (87-117, 87-125): "An event involving a clear and imminent danger to life, health, or property." No advance notice, but notify NC811 as soon as practicable. Operators make first contact within 3 hours. Calling something an emergency does not remove liability, and a false emergency is a Class 3 misdemeanor.
Penalties (87-129): the Underground Damage Prevention Review Board reviews reports and can recommend training, education and "a civil penalty not to exceed two thousand five hundred dollars ($2,500)"; the Utilities Commission issues the order.
No notice needed (87-124): a single-family homeowner on their own land outside any utility right-of-way; tilling less than 12 inches deep; farm digging on land with no right-of-way; hand-tool locating or probing; pavement milling.""",
      NC, NCU, ed='Statute as amended by Session Law 2025-21')

    # ------------------------------------------------------------------ NEW YORK
    NY = '16 NYCRR Part 753 (DPS booklet; Part 753 dated Feb 21, 2023); Gen. Bus. Law 765 (May 9, 2025)'
    NYU = 'https://dps.ny.gov/system/files/documents/2025/06/ss753-booklet-2025.05.09-update.pdf'
    S('NY', 'overview', 'the dig rules in short (UDig NY, New York 811)', """
New York's dig rules are 16 NYCRR Part 753 ("Code Rule 753") under General Business Law Article 36, enforced by the Public Service Commission. Two centers: UDig NY upstate and New York 811 for New York City and Long Island.
Notice: "at least two but not more than ten working days, not including the date of the call."
There is no ticket expiry date. If you put the start off by more than ten working days, give a new notice.
Do not start until you have heard from "each and every operator" that its lines are marked or that it has none. Use the Automated Positive Response system where there is one.
Tolerance zone: half the known diameter plus two feet on each side of the center line (two feet each side if the size is not known).
Verify the line's exact location before power equipment goes in the zone; gas and liquid petroleum lines must be found with hand-dug test holes.
Hit a line: tell the operator right away; gas, liquid or electric emergency, clear the area and call 911.""",
      NY, NYU, ed='Part 753 as of February 21, 2023; booklet updated May 9, 2025')
    S('NY', 'tickets', 'no ticket expiry, postponements, cancellations, conferences', """
New York notice rules (753-3.1): call "at least two but not more than ten working days, not including the date of the call," before the start date. The rules set no ticket life.
Postponed ten working days or less: "no call to the one-call notification system or operators is required." Postponed more than ten working days: a new notice is needed.
Cancelled job: you "shall promptly communicate the cancellation" to the operators through the one-call system.
Demolition: ask for a pre-demolition conference at least seven working days ahead; operators must attend when asked.
Start of work (753-3.3): only after you have "received notification from each and every operator" that there are no lines or that they are staked and marked. Where it exists you "shall utilize the Automated Positive Response (APR) system."
Design requests are separate and "shall not be a substitute for the notice of intent to perform excavation or demolition."
You must protect and keep the marks until they are no longer needed, and make sure your workers know Part 753 (753-3.15).""",
      NY, NYU, ed='Part 753 as of February 21, 2023; booklet updated May 9, 2025')
    S('NY', 'marks', 'tolerance zone 2 feet, hand-dug test holes, 4-inch rule', """
New York tolerance zone (753-1.2): "the distance of one-half of the known diameter plus two feet" on either side of the designated center line; if the diameter is not known, two feet on either side.
Verify before you dig (753-3.6): where the work area and tolerance zone overlap, you must verify "the precise location, type, size, direction of run and depth" of the line. Gas and liquid petroleum lines must be verified by hand-dug test holes "at one or more points where the work area and tolerance zone overlap." Other lines: hand-dug test holes or another way the operator agrees to.
Power equipment in the zone before that: only to remove pavement or masonry, "but only to the depth of such pavement or masonry," unless the operator agrees in writing.
After the line is verified, no power equipment "closer than four inches in any direction" from it unless the operator agrees in writing (753-3.8).
White (753-3.2): you "shall delineate the work area with white paint, white stakes or other white suitable markings" when needed to identify it.
Colors (753-4.7): yellow gas and petroleum; red electric; orange communications; blue water; green sewer; purple reclaimed water; pink survey; white the excavation site.""",
      NY, NYU, ed='Part 753 as of February 21, 2023; booklet updated May 9, 2025')
    S('NY', 'damage', 'line hits, emergencies, fines', """
New York, line hit or contact (753-3.10): you "shall immediately notify the operator of the facility." Stop digging near it until the operator has repaired it and says you can go on. Do not backfill near the damage until the operator has inspected and repaired it.
Gas, liquid or electrical emergency (753-3.14): get everyone out and "Immediately notify 911 and the operator of the affected facility."
Emergency work (753-1.2, 753-3.1): "Any abnormal condition which presents an immediate danger to life or property." You may start without advance notice but must notify the one-call system "as soon as possible," and "Extreme caution shall be employed."
Fines (General Business Law 765): "up to four thousand three hundred seventy-five dollars for the first violation" and "up to an additional seventeen thousand five hundred dollars for each succeeding violation" within twelve months. The fine does not apply to an excavator who damages a line because the operator failed to follow the rules.
Farm tilling is not "excavation" under Part 753.""",
      NY, NYU, ed='Part 753 as of February 21, 2023; GBL 765 as of May 9, 2025')

    # ------------------------------------------------------------------ ILLINOIS
    IL = '220 ILCS 50/2, 4, 5.1, 5.2, 5.3, 6, 7, 10, 11 (as amended by P.A. 103-614, eff. Jan 1, 2025)'
    ILU = 'https://ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1286'
    S('IL', 'overview', 'the dig law in short (JULIE; Chicago is separate)', """
Illinois's dig law is the Underground Utility Facilities Damage Prevention Act, 220 ILCS 50, rewritten effective January 1, 2025 and enforced by the Illinois Commerce Commission. JULIE is the one-call center everywhere outside the City of Chicago; Chicago runs its own system (811 Chicago).
Notice: "not less than 2 days but no more than 10 days in advance." A "day" skips Saturdays, Sundays, JULIE holidays and the day of the notice.
A normal notice is good for 25 days from the first request. An extension can be asked for from day 20 and adds 25 days.
Pre-mark the dig area in white (black when there is snow on the ground).
Since January 1, 2026: confirm every notified operator has posted a positive response before you dig.
Tolerance zone: one and one-half feet (18 inches) on either side of the outside edge of the marked line.
Hit a line: notify the owner and JULIE right away; gas or hazardous material escaping, call 911.""",
      IL, ILU, eff='2025-01-01')
    S('IL', 'tickets', 'notice good 25 days, extensions, joint meets, emergency requests', """
Illinois notice life (220 ILCS 50/2, 4): a normal notice is "valid for 25 days from the date of the initial request" unless extended. An extension may be requested no earlier than the 20th day and adds 25 days. Extensions "may not be made simply to keep a prior notice open" when no digging is going on. Before asking for an extension you must pre-mark again (Sec. 4(g)).
Positive response (Sec. 5.1, duties from January 1, 2026): operators post a response code by the dig start time; the excavator confirms all have answered. If one has not, the excavator "may proceed after providing a no show or incomplete request through JULIE."
Emergency request (Sec. 6): for "imminent danger to life, health, or property or a utility service outage" needing action within 2 days. There is "a minimum wait time of 2 hours after an emergency request" unless the danger won't allow it; operators answer within 2 hours. An emergency notice expires 10 days after it is made.
Large projects and joint meets (Sec. 5.3): give at least 2 days' notice of a joint meet (5 days for large projects) and not more than 60 days before the planned start.
Planning design requests (Sec. 5.2): operators answer within 10 days.""",
      IL, ILU, eff='2025-01-01')
    S('IL', 'marks', 'tolerance zone 18 inches, hand or vacuum digging, colors, black on snow', """
Illinois tolerance zone (220 ILCS 50/2): where the size of the line is not shown, "one and one-half feet on either side of the outside edge" of the marking; where the diameter is shown, half the diameter plus one and one-half feet on each side.
Inside it (Sec. 4): plan the dig to keep away from lines, use "hand or vacuum excavation methods to the depth of the proposed excavation," and keep watching the excavation by eye until you are clear of the marked line.
Pre-marking is required (Sec. 4(c)); "Electronic white lining may be used when available."
Colors (Sec. 10): proposed excavation "Safety White (Black when snow is on the ground)"; electric red; gas and oil yellow; communications orange; water blue; sewer green; non-potable water and slurry purple; temporary survey pink.
Sewer owners must mark their lines when the dig will go deeper than 7 feet (Sec. 10(b)).
Removing or wrecking marks on purpose can be fined up to $1,000.""",
      IL, ILU, eff='2025-01-01')
    S('IL', 'damage', 'line hits, fines, exemptions', """
Illinois, line hit (220 ILCS 50/7): "immediately notify the affected underground utility facility owner or operator and JULIE," and stop digging near the damage if it threatens life or property. Do not repair, clamp or pinch the line unless the owner tells you to. If gas or other hazardous material is escaping, "the excavator responsible for the excavation or demolition shall call 9-1-1."
Fines (Sec. 11), set by the Illinois Commerce Commission: up to $5,000 per offense for willfully digging without the required notice; up to $2,500 for other willful violations; up to $1,000 for removing marks.
A homeowner who breaks the Act on their own residential property is not fined but still owes for the damage (Sec. 8(d)).
Not "excavation": farm tillage, railroad right-of-way maintenance, surveying without power equipment, roadway surface milling.
The Act lets a home rule city of over 1,000,000 people (Chicago) run its own damage prevention program.""",
      IL, ILU, eff='2025-01-01')

    # ------------------------------------------------------------------ OHIO
    OH = 'OHIO811 Excavator Manual (rev. June 2026) pp. 5-7, 10-17, 20-24, 40; O.R.C. 3781.25 to 3781.32'
    OHU = 'https://oups.org/wp-content/uploads/2026/06/OHIO811_Excavator-Manual_English_June-2026.pdf'
    S('OH', 'overview', 'the dig law in short (OHIO811)', """
Ohio's dig law is O.R.C. 3781.25 to 3781.38 (amended June 9, 2026); complaints go to the Underground Technical Committee at the PUCO. One center: OHIO811. Oil and gas producers answer through a separate group reached by the same call.
Notice: "at least two working days, not including the day of the notification," and "not more than sixteen calendar days before commencing excavation."
The law and the June 2026 manual give no ticket expiry date. Keep the ticket for the whole job and ask for a remark when marks fade.
Premark the dig in white paint unless an exception applies.
Check Positive Response before you go to the job; code 999 means an owner has not answered by the legal start.
Tolerance zone: the width of the line plus 18 inches on each side. Dig there carefully, with a second person watching the bucket.
Hit a line: get everyone safe, stop, notify the utility and OHIO811; anything flammable, toxic or corrosive escaping, call 911.""",
      OH, OHU, ed='Manual revised June 2026', lic='summary')
    S('OH', 'tickets', 'no expiry date, remarks, ticket types, phased projects', """
Ohio tickets (OHIO811 manual, June 2026): the notice window is 2 working days to 16 calendar days before you start. No ticket life or expiry is given in the manual or in O.R.C. 3781.28 as amended June 9, 2026. An Ohio 811 FAQ page on ticket expiry exists but could not be opened, so expiry is not confirmed either way: ask OHIO811 on long jobs.
Remark: when marks are destroyed or removed, contact OHIO811 and "Wait two working days, not including the day of the notification, for the excavation site to be remarked." Do not repaint the locator's marks yourself.
Ticket types named: routine; emergency (by phone only, any hour); design request; Complex Project; and a LATE notice the system sends an owner that missed the deadline.
Large, phased jobs: give the owners written notice of the excavation with projected timelines so marking can be staged.
If an owner wants to be present, give at least one full working day's notice before digging near its line.
Positive Response is strongly advised before every start; the manual says not to assume all owners have answered.""",
      OH, OHU, ed='Manual revised June 2026', lic='summary', conf='medium', unc='whether an Ohio ticket expires')
    S('OH', 'marks', 'tolerance zone 18 inches, spotter, premarking, colors', """
Ohio tolerance zone: the width of the underground line "plus eighteen inches on each side of the facility" (manual p. 16; O.R.C. 3781.25).
Inside it you must work "in a careful, prudent" and nondestructive way: hand digging, pot holing or vacuum excavation. When a machine is used near the zone, have a second person, not the equipment operator, watch the dig, and keep reasonable clearance between the line and the cutting edge.
Premarking in white paint is required unless one of four exceptions applies. For one spot, mark it with white dashes; for a trench, mark the center line with white dashes. White flags or stakes may be used instead.
Colors: white proposed excavation; pink survey; red electric; yellow gas, oil, steam; orange communication; blue potable water; purple reclaimed water and irrigation; green sewers and drains.""",
      OH, OHU, ed='Manual revised June 2026', lic='summary')
    S('OH', 'damage', 'line hits, emergencies, exemptions, complaints', """
Ohio, line hit (manual p. 17): first get everyone to safety, stop work and protect the area. Do not try to repair the line or stop a leak. Notify the utility and OHIO811 as soon as the damage is found, and give the utility reasonable time to repair. If flammable, corrosive, explosive or toxic material is escaping, call 9-1-1. Tell them the location, the kind of line and the depth.
Emergency: "a sudden or unexpected occurrence involving a clear and imminent danger." Emergency notices are by phone only, and only for real emergencies.
Not excavation: farm tilling no deeper than 12 inches; grass seeding tilling to 4 inches; hand-tool work within 12 inches of an exposed utility fitting.
Violations: anyone can file a complaint with the Underground Technical Committee at puco.ohio.gov; the manual warns of "fines or penalties, even if a damage has not occurred." Fine amounts were not confirmed in this pass.""",
      OH, OHU, ed='Manual revised June 2026', lic='summary', conf='medium', unc='fine amounts (O.R.C. 3781.34 to 3781.36)')

    # ------------------------------------------------------------------ MICHIGAN
    MI = 'MCL 460.723, 460.725, 460.726a, 460.727, 460.731, 460.732 (2013 PA 174; compilation through PA 91 of 2026)'
    MIU = 'https://www.legislature.mi.gov/documents/mcl/archive/2026/September/mcl-Act-174-of-2013.pdf'
    S('MI', 'overview', 'the dig law in short (MISS DIG 811)', """
Michigan's dig law is the MISS DIG Underground Facility Damage Prevention and Safety Act, 2013 PA 174 (MCL 460.721 to 460.733), enforced by the Michigan Public Service Commission. One center: MISS DIG 811.
Notice: "at least 72 hours, but not more than 14 calendar days, before the start." Hours on non-business days do not count.
A ticket is "valid for 21 days from the start date," or 180 days when the notice says the work will take longer. Past that, or if digging did not start in time, get a new ticket.
Caution zone: 48 inches on either side of the marks. Before digging there, expose every marked line by soft excavation (hand or vacuum).
Check positive response. No response on a ticket is a reason to stop near there and give additional notice.
Hit a line: notify the owner right away; gas or liquid escaping or danger to life, call 911.""",
      MI, MIU, ed='MCL compilation complete through PA 91 of 2026')
    S('MI', 'tickets', 'ticket life 21 or 180 days, no renewals, additional assistance', """
Michigan ticket life (MCL 460.725): a ticket is "valid for 21 days from the start date," or 180 days if the dig notice says the work will not be done in 21 days. MISS DIG says digging must start within 14 days and be done within 21 days of the Work Legal Start Date, and "If the work has not started within 14 days or is not completed within 21 days, a new ticket is required." There is no renew button: a Retransmit keeps the number but does not add time. For long jobs ask for a Normal 180-Day or Project 180-Day ticket.
Marks destroyed or covered: give notice; the owner re-marks "within 24 hours, excluding all hours on nonbusiness days."
Can't find a marked line inside its approximate location: ask for additional assistance; the owner must respond "within 3 hours" in business hours (7 AM to 5 PM Eastern, business days).
Reason to think there is an unmarked line, including "Lack of a positive response to a ticket": "stop excavation in the immediate vicinity" and give immediate additional notice.
Design ticket (460.726a): information only, "not marking"; it does not replace a dig notice.""",
      MI + '; MISS DIG 811 FAQ and Ticket Types sheet (July 2024)', MIU, ed='MCL compilation complete through PA 91 of 2026')
    S('MI', 'marks', 'caution zone 48 inches, soft excavation, white lining', """
Michigan caution zone (MCL 460.723): "the area within 48 inches of either side of the facility marks." The marks themselves show an approximate location: a strip at least 36 inches wide, or the marked width of the line plus 18 inches on each side.
Before digging in the caution zone (460.725): "expose all marked facilities in the caution zone by soft excavation." Soft excavation means hand digging or vacuum-type methods. Power tools may be used there "only after the facilities are exposed or the precise location of the facilities is established."
Support and brace exposed lines.
White lining: where the site can't be described well enough, mark the work area "with white paint or flags, or both" before you send the ticket.
Colors: white proposed excavation; pink survey; red electric; yellow gas, oil, steam, petroleum; orange communication; blue potable water; purple reclaimed water and irrigation; green sewers and drains.""",
      MI, MIU, ed='MCL compilation complete through PA 91 of 2026')
    S('MI', 'damage', 'line hits, emergencies, fines, exemptions', """
Michigan, line hit (MCL 460.725): "If an excavator contacts or damages a facility, the excavator shall provide immediate notice to the facility owner or facility operator." If flammable, toxic or corrosive gas or liquid escapes, or life is in danger, "call 9-1-1" and take reasonable steps to protect people.
Emergency: "a sudden or unforeseen occurrence" with "clear and imminent danger to life, health, or property." Give prompt emergency notice and do only what the emergency reasonably requires. Owners respond to emergency notices within 3 hours.
Penalties (460.731, 460.732): knowingly damaging a line and not reporting it, or hiding it by backfilling, is a misdemeanor: up to 1 year or a fine up to $5,000. The Public Service Commission can order civil fines up to $5,000 per violation; each day counts separately.
Not excavation: farm work no deeper than 12 inches in a public right-of-way, or 18 inches within 25 yards of a petroleum or natural gas pipeline outside it; replacing a fence post or sign post in place; routine road maintenance to 12 inches.""",
      MI, MIU, ed='MCL compilation complete through PA 91 of 2026', conf='medium')
