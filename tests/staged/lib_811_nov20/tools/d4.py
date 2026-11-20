# d4: the rest: KS TN AL NE MO IN KY ID AK NM MN SC OK IA LA MS SD WY HI ND AR MT WI  (sources read 2026-11-20)
def load(S, U):
    # ---------------- KANSAS
    KS = 'K.S.A. 66-1804 (ksrevisor.gov, as amended eff. Jan 1, 2024)'
    S('KS', 'overview', 'the dig law in short (Kansas 811)', """
Kansas's dig law is the Kansas Underground Utility Damage Prevention Act, K.S.A. 66-1801 to 66-1816, enforced by the Kansas Corporation Commission. One center: Kansas 811.
Notice: "at least two full working days but not more than 20 calendar days before the scheduled excavation start date."
The notice, or any update, is "valid for 20 calendar days after the excavation start date" (changed from 15 days on January 1, 2024). Ticket only what you can reasonably finish in that time. To go on, update the notice.
Do not make repeated remark requests unless the cause was out of your control; the Commission has warned of fines for needless updates.
Whiteline the dig area when the operator asks for it.
Pre-engineered and permitted projects still need the notice before digging starts.
The tolerance zone (24 inches in K.S.A. 66-1802) and fine amounts were not re-read today and are not confirmed here.""",
      KS, 'https://ksrevisor.gov/statutes/chapters/ch66/066_018_0004.html', eff='2024-01-01', conf='medium', unc='tolerance zone and fine amounts')
    # ---------------- TENNESSEE
    TN = 'T.C.A. 65-31-106 (FindLaw copy, current as of Jan 2, 2024); Tennessee 811 law page and FAQ'
    S('TN', 'overview', 'the dig law in short (Tennessee 811)', """
Tennessee's dig law is the Underground Utility Damage Prevention Act, T.C.A. 65-31-101 and after, with an Enforcement Board at the Tennessee Public Utility Commission. One center: Tennessee 811.
Notice: "at least three (3) working days prior to the actual date of excavation" and not more than ten full working days ahead.
A ticket is good for "fifteen (15) calendar days from the actual date specified to start." To keep digging, give a new notice at least three working days before the fifteenth day runs out; Tennessee 811 says you are then "given a new ticket number." When the digging is done, stop updating.
Mark the dig area "with white paint, or by electronic white lining" unless an exception applies (for example the ticket gives a precise location).
A property owner using non-mechanized tools on their own property is exempt.
Within 100 feet of the edge of a street or highway, if an operator fails to locate in time the excavator is authorized to proceed.
The tolerance zone (24 inches in 65-31-108) and penalty amounts were not re-read today and are not confirmed here.""",
      TN, 'https://codes.findlaw.com/tn/title-65-public-utilities-and-carriers/tn-code-sect-65-31-106/', ed='FindLaw copy current as of January 2, 2024', conf='medium', unc='tolerance zone and penalty amounts')
    # ---------------- ALABAMA
    AL = 'Ala. Code 37-15-2, -4, -4.1, -4.2, -6, -8, -9, -10 as amended by 2026 SB205 (enrolled), effective Jan 1, 2027'
    ALU = 'https://alison.legislature.state.al.us/files/pdf/SearchableInstruments/2026RS/SB205-enr.pdf'
    S('AL', 'overview', 'the dig law in short (Alabama 811)', """
Alabama's dig law is Ala. Code Title 37, Chapter 15, with the Underground Damage Prevention Authority enforcing it. One center: Alabama 811. A 2026 rewrite (SB205) takes effect January 1, 2027; the notice and ticket-life numbers below are the same before and after.
Notice: "at least two but not more than 10 working days prior to the start of the proposed excavation" (demolition or blasting: 2 working days to 30 calendar days).
An excavation notice is "valid for a period of 20 working days from the proposed starting date" (demolition 30). Renew at least two working days before it expires.
Premark the route or edges of the dig in white unless that would get in the way of traffic.
Operators post a positive response; you may start early once all of them have.
From January 1, 2027 the tolerance zone is the width of the line plus 18 inches on either side: find marked lines by noninvasive methods and keep 18 inches between any line and the cutting edge.
Hit a line: notify the operator immediately.""",
      AL, ALU, eff='2027-01-01')
    S('AL', 'marks', 'tolerance zone 18 inches from 2027, noninvasive digging, large projects', """
Alabama tolerance zone under the 2026 law (SB205, in force January 1, 2027): "The width of the underground facility plus 18 inches on either side of the outside edge" (37-15-2). The tolerance zone under the law in force before that date was not confirmed.
Excavator duties (37-15-8): "Determine the location of any marked underground facility utilizing noninvasive methods of excavation" (hand digging, pot holing, soft digging, vacuum excavation); "Maintain a clearance of at least 18 inches between any underground facility and the cutting edge"; when crossing a line in the zone use reasonable care to find its depth.
Find an unmarked line after notice: you "shall not begin excavating until an additional notice is made."
White is for the excavator's premarks only.
Design or survey locate request: the operator answers within five working days; it can't be used to dig.
Complex or large projects (planned past 40 working days, five or more crews at once, or many requests for one job): give notice at least five working days before a pre-excavation planning meeting and work to an agreed locate schedule. An operator may require this process.""",
      AL, ALU, eff='2027-01-01', conf='medium', unc='tolerance zone before Jan 1, 2027')
    S('AL', 'damage', 'line hits, fines, exemptions (2027 law)', """
Alabama, line hit (37-15-9): notify the operator "immediately upon discovery of such damage" and allow reasonable time for repairs. If flammable, corrosive, explosive or toxic material is leaking, immediately report to the operator or the One-Call system and to law enforcement and the fire department (call 911).
Emergency excavation: work "required to eliminate an imminent danger to life, health, property, or the environment." No civil penalty for a violation during an emergency unless it was willful or malicious.
Civil penalties (37-15-10, as amended effective January 1, 2027): first violation up to $500 per incident or training or both; second within 12 months up to $1,000; third within 12 months up to $3,000 plus training; gross negligence or willful noncompliance up to $10,000 per incident. Complaints must be made within 30 days of the known occurrence.
No notice needed: plowing less than 12 inches deep for farming; digging on your own property or easement where no one else has lines. A property owner using hand tools on their own property is outside the hand digging rules.""",
      AL, ALU, eff='2027-01-01')
    # ---------------- NEBRASKA
    NE = 'Neb. Rev. Stat. 76-2321, 76-2323, 76-2326 and State Fire Marshal summary (One-Call Notification System Act)'
    S('NE', 'overview', 'the dig law in short (Nebraska 811)', """
Nebraska's dig law is the One-Call Notification System Act, Neb. Rev. Stat. 76-2301 to 76-2334. Since September 1, 2024 the State Fire Marshal investigates complaints and the Underground Excavation Safety Committee sets penalties. One center: Nebraska 811.
Notice: the app's table has 2 full business days and not more than 10 business days; operators must respond "no later than two business days after receipt of a dig ticket."
Do not call in an area where digging can't reasonably start "within seventeen calendar days after the ticket start date."
Marks must be "within 18 inches on either side of the marking, plus one half of the width of the underground facility." Hand dig inside that strip.
Hit a line: "the excavator shall immediately notify the center." Do not hide the damage or repair the line without the operator's OK.
Penalties: up to $10,000 per day per event for pipeline and fiber optic violations (cap $500,000); up to $5,000 per day per event for other utilities (cap $50,000).
Farm tilling and gardening for seeding are not excavation.
How long a ticket lasts once digging has started was not confirmed.""",
      NE, 'https://sfm.nebraska.gov/sites/default/files/doc/1.%20Nebraska%20One%20Call%20Act.pdf', ed='State Fire Marshal copy of the Act, with changes effective Sept 1, 2024', conf='medium', unc='ticket life after work starts; notice window not re-read')
    # ---------------- MISSOURI
    MO = 'RSMo 319.026 (revisor.mo.gov, effective Aug 28, 2025)'
    S('MO', 'overview', 'the dig law in short (Missouri 811)', """
Missouri's dig law is the Underground Facility Safety and Damage Prevention Act, RSMo 319.010 to 319.050 (amended August 28, 2025). One center: Missouri 811.
Notice: "at least two working days, but not more than ten working days, before the expected date" of starting.
You may work in the area on the notice, while the marks can be seen, until the "notice of intent to excavate expiration date" printed on the ticket; the number of days is not in this section and is not confirmed here. If you can't start within ten working days, make a relocate request before digging. Marks unusable: ask the center for a remark.
White lining (paint, stakes, whiskers) may be used when the site can't be clearly described.
Find a line unmarked or marked wrong: notify the center; the owner must contact you or mark it correctly within two hours.
Hand or soft digging "shall be used as a best practice when possible"; no hand-dig distance is given in this section.
Hit a line: notify the center. Gas or hazardous liquid pipeline release: "immediately contact 911." Do not hide or repair damage without the owner's OK.""",
      MO, 'https://revisor.mo.gov/main/OneSection.aspx?section=319.026', eff='2025-08-28', conf='medium', unc='ticket life in days; tolerance zone')
    # ---------------- INDIANA
    IN = 'Ind. Code 8-1-26-16 (FindLaw copy, current as of Jan 1, 2026); Indiana 811 FAQ (Dec 11, 2024)'
    S('IN', 'overview', 'the dig law in short (Indiana 811)', """
Indiana's dig law is Ind. Code 8-1-26, enforced by the Indiana Utility Regulatory Commission. One center: Indiana 811.
Notice: "at least two (2) full working days but not more than ten (10) calendar days before the commencement of the work." Work may start at 7 a.m. on the next working day after the two full working days, or sooner if every operator has posted an electronic positive response. (The Indiana 811 FAQ says 20 calendar days for the earliest call; the statute copy read says 10.)
A notice "expires at 11:59 p.m. prevailing time twenty (20) days after the date the notice is received." Not finished: send a new locate request and wait for the operators to mark before going on. Indiana 811 calls it an Extension when the old marks can still be seen: you get a new ticket number and members get two full working days.
White lining is required when you can't give an address, legal description or highway location.
Since January 1, 2025 every member must use Positive Response. No answer after two full working days: ask for an Additional (2nd) Notice.
A Joint Meet is not a ticket to dig on.
Damaging a pipeline after not calling or not white lining can bring a civil penalty up to $10,000.
The tolerance zone was not confirmed today.""",
      IN, 'https://codes.findlaw.com/in/title-8-utilities-and-transportation/in-code-sect-8-1-26-16/', ed='FindLaw copy current as of January 1, 2026', conf='medium', unc='tolerance zone; earliest call (10 vs 20 calendar days)')
    # ---------------- KENTUCKY
    KY = 'KRS 367.4911 (Justia copy, effective Jan 1, 2022)'
    KYU = 'https://law.justia.com/codes/kentucky/chapter-367/section-367-4911/'
    S('KY', 'overview', 'the dig law in short (Kentucky 811)', """
Kentucky's dig law is the Underground Facility Damage Prevention Act, KRS 367.4901 to 367.4917. One center: Kentucky 811.
Notice: "not less than two (2) full working days nor more than ten (10) full working days prior to commencing work."
"Locate requests are valid for twenty-one (21) calendar days from the day of the initial request." Ask for remarking two working days before each 21-day period ends, or sooner if the marks are gone or the plan changes.
One request may not cover more than 5,000 feet unless you and the operator agree.
Mark the edges of the dig yourself when an operator asks or the area can't be described.
Operator did not respond in time: "the excavator shall submit a second notice." If there is still nothing one working day later, an excavator who followed the law is not liable for damage to lines that would have been located (not true for certain gas and hazardous liquid pipelines).
Inside the tolerance zone, "hand-dig or use nonintrusive means." Machines are allowed for pavement, rock, and material more than 12 inches in any direction from the located line, with a watcher.
Hit a line: stop and notify the operators; flammable, toxic or corrosive escape, call 911.""",
      KY, KYU, eff='2022-01-01')
    S('KY', 'damage', 'second notice, unmarked lines, line hits', """
Kentucky, when things go wrong (KRS 367.4911): an operator has not marked or answered by the end of the two working days: send a second notice to the center. No response within one working day after that second notice: an excavator who has complied in full is not liable for damage to the lines that would have been located, except for negligence or intentional misconduct, and except for certain gas and hazardous liquid pipelines.
Find a line that was not marked: notify a notification center immediately; the operator has six business hours to identify it.
Damage a line: "cease excavation or demolition activities and notify all affected operators." If it creates a safety concern for the public or the crew, notify the public safety agencies. If flammable, toxic or corrosive gas or liquid escapes, stop work and call 911.
Inside the tolerance zone "hand-dig or use nonintrusive means to avoid damage to the underground facility."
Penalty amounts are in KRS 367.4917 and were not confirmed in this pass; the Public Service Commission enforces for gas and hazardous liquid lines.""",
      KY, KYU, eff='2022-01-01', conf='medium', unc='penalty amounts; tolerance zone width in inches')
    # ---------------- IDAHO
    ID = 'Idaho Guide to Safe Digging 2026-27 (Damage Prevention Board, DOPL) pp. 4, 7, 9-12, 15-20, 29-36; Idaho Code 55-2201 to 55-2212'
    IDU = 'https://dopl.idaho.gov/wp-content/uploads/2026/04/DAM-ID-Guide-to-Safe-Digging-26_27.pdf'
    S('ID', 'overview', 'the dig law in short (Digline and north Idaho 811 centers)', """
Idaho's dig law is Idaho Code Title 55, Chapter 22, with the Damage Prevention Board hearing violations. Three centers answer 811: Dig Safe North Idaho 811 (Boundary, Bonner, Kootenai counties), North Idaho 811 (Benewah, Shoshone) and Digline (all other counties).
Notice: "not less than two (2) business days nor more than ten (10) business days before the scheduled date."
Marks you keep up are good for "no longer than four (4) consecutive weeks following the date of notification." If work has not started within three weeks, give notice again. An Update request extends an active ticket.
Pre-mark the path of the dig in white paint.
Do not dig "until all known facilities have been marked." Marks missing: send a Second request.
Tolerance zone: 24 inches from the outside edges of the line; find the line by hand digging there.
Hit a line: notify the owner and the one-number service; danger, call 911 and clear the area. Report the damage to the Board.""",
      ID, IDU, ed='2026-27 guide; statutes and rules in it current as of July 1, 2024', lic='gov-state')
    S('ID', 'tickets', 'ticket types, hand dig rule, emergencies, fines, exemptions', """
Idaho ticket types (Guide to Safe Digging pp. 9-10): Emergency, Priority, Standard, Meet request (large project footprint: meet in two business days or as set, locates two business days after), Design request (maps in up to seven business days), Second request (marks missing), Update request (extends the expiry of an active ticket).
Hand dig rule (Idaho Code 55-2207): "Determine by hand digging, in the area twenty-four (24) inches or less from the facilities," the exact location. A vacuum pothole does not show fittings, so hand dig the rest of the zone too.
Emergency: exempt from the notice time, but give notice at least two hours before starting where you can; owners try to reach you within one hour and arrive within two.
Damaged lines must not be buried until repaired.
Penalties: training for a first violation; up to $1,000 for a second and up to $5,000 for later ones within 18 months. A homeowner's first failure to call on their own lot may get a written warning.
No ticket needed: digging less than 15 inches deep on private property outside recorded easements, and farm tilling under 15 inches.""",
      ID, IDU, ed='2026-27 guide; statutes and rules in it current as of July 1, 2024', lic='gov-state')
    # ---------------- ALASKA
    AK = 'Alaska 811 Excavator Handbook (2026) pp. 2-3, 6-8, 13-22; AS 42.30.400 to 42.30.490'
    AKU = 'https://cdn.pelicancorp.com/pdfs/26-ak811-excavator-handbook.pdf'
    S('AK', 'overview', 'the dig law in short (Alaska 811, Alaska Digline)', """
Alaska's dig law is AS 42.30.400 to 42.30.490. One center: Alaska 811 (Alaska Digline).
Notice: "at least two but not more than 15 working days" before digging. Remote locations: at least 10 but not more than 20 working days.
The law sets no ticket expiry. The handbook says most owners treat a ticket as expired if more than 15 calendar days pass before digging starts (20 in remote places). Marks gone from weather, construction or vandalism: ask for a remark, give the old dig number, and plan on another 2 working days.
Mark the dig area in white; "Black paint may be used when snow is on the ground."
No digging until each line is field marked. Lines there but not located: call for a second request.
Tolerance zone: the width of the line plus 2 feet on either side (30 inches for lines more than 10 feet deep). Hand dig or vacuum within 24 inches of a marked line.
Hit a line: notify the utility and the one-call system right away; danger, clear out and call 911.
Fines: $50 to $1,000 for each offense that causes or adds to damage.""",
      AK, AKU, ed='2026 handbook', lic='summary', conf='medium')
    S('AK', 'tickets', 'ticket types, emergencies, exemptions', """
Alaska ticket types (Alaska 811 handbook p. 6): Standard, Standard Remote, Emergency, and Design Planning. A design or planning request only gives you the owners' contacts; you then contact each owner yourself. A site meet can be asked for on a large or complicated project, and large jobs should be called in as a sequence of sections. Each phase of a new building is a separate request.
A remark request is not the same as an update of the ticket.
Emergency: a condition that is "a clear and present danger to life, health, or property, or an unplanned service interruption." Emergency requests are handled at once; leave a callback number. In an emergency the excavator must notify each operator immediately (AS 42.30.400(c)). Calling in a false emergency can be penalized.
Not excavation: "tilling of the soil less than 12 inches in depth for agricultural purposes." An operator and an excavator may waive the notice and locate rules by written agreement for set areas and times.
Members do not locate private lines, such as a line from a house to a garage.
Alaska Digline does not enforce the law; a court sets the civil penalty.""",
      AK, AKU, ed='2026 handbook', lic='summary', conf='medium')
    # ---------------- NEW MEXICO
    NM = '18.60.5 NMAC sections 7, 8, 10, 11, 12, 13, 15, 16, 17 (Public Regulation Commission, srca.nm.gov)'
    NMU = 'https://www.srca.nm.gov/parts/title18/18.060.0005.html'
    S('NM', 'overview', 'the dig rules in short (NM811)', """
New Mexico's dig law is the Excavation Damage to Pipelines and Underground Utility Lines Act (NMSA 62-14) with rule 18.60.5 NMAC, enforced by the Public Regulation Commission's pipeline safety bureau. One center: NM811.
Notice: 2 working days, not counting the day you call; operators must mark "within two full working days from the effective date of the ticket."
Marks are good for 15 working days from the end of the notice period. Marks gone with no offsets: stop and ask for a relocate, only for the part still to dig, and say why.
Jobs longer than 15 working days: ask for a wide area conference at least two working days ahead, write a work plan signed by all, and reaffirm the wide area ticket every 15 working days.
Pre-mark in white: it shows the actual dig, not the limits of construction.
Before digging, check that every operator has marked or cleared. If one has not, call for a warning locate.
Within 18 inches either side of a mark, expose the line first by non-mechanical means or vacuum.
Hit a line: stop, call 911 if needed, the operator and 811, secure the site, and stay until released.""",
      NM, NMU, ed='18.60.5 NMAC as posted Nov 20, 2026')
    S('NM', 'damage', 'no-response, 18 inches, line hits, emergency locates', """
New Mexico rules on site (18.60.5.15 and .16 NMAC): before you dig, determine that all lines have been marked or cleared. If an operator has not marked or given a positive response, call for a warning locate; operators should respond "ideally within two hours." The rule does not say you may dig without a response.
Within "18 inches either side of a marking made by a UFO" (an operator), expose the line "by non-mechanical means or mechanical vacuum excavation methods" before machine work. Potholing or vacuum work done only to expose or find lines does not itself need a locate request.
Damage: "stop excavating immediately," call 911 if appropriate, the operator and 811, and secure the site. Do not "leave the scene until authorized" by an emergency responder or the operator, unless you tried and could not reach them and the site is secured.
Emergency locates are marked as soon as practical, ideally within 2 hours; the emergency notice is good until the emergency is over or 48 hours, whichever is longer.
Commission staff can shut down a dig that is not in compliance. Willful violations carry the penalties in NMSA 62-14-8; amounts were not confirmed.
Design and bid locates are separate ticket types; no relocates or extensions on them.""",
      NM, NMU, ed='18.60.5 NMAC as posted Nov 20, 2026', conf='medium', unc='penalty amounts (NMSA 62-14-8)')
    # ---------------- MINNESOTA
    MN = 'Gopher State One Call Handbook 2026 pp. 14-28, 33-46, 76, 84; Minn. Stat. ch. 216D'
    MNU = 'https://gopherstateonecall.org/wp-content/uploads/GSOCHandbook2026.pdf'
    S('MN', 'overview', 'the dig law in short (Gopher State One Call)', """
Minnesota's dig law is Minn. Stat. chapter 216D, enforced by the Minnesota Office of Pipeline Safety. One center: Gopher State One Call (GSOC).
Notice: at least 48 hours, not counting the day you file, weekends and holidays, and not more than 14 calendar days ahead.
A ticket is good for 14 calendar days from the start date and time on it (up to six months when a marking schedule is agreed and written down). To go past 14 days, file an Update at least 48 hours (weekends and holidays not counted) before it expires; an Update gets a new ticket number and its own 48-hour wait.
White marks are required: "without exception." Electronic white marks count from January 1, 2026.
Check GSOC's positive response before you dig. "Not Yet Responded" and no marks: contact that operator directly.
Hand dig zone: 2 feet (24 inches) from each side of the line. Hand tools or vacuum only there.
Hit a line: notify the owner right away; gas or liquid escaping, call 911. Never bury a damaged line.""",
      MN, MNU, ed='2026 Handbook', lic='summary', conf='medium')
    S('MN', 'tickets', 'ticket types, updates, meet tickets, exemptions', """
Minnesota ticket types (GSOC Handbook 2026 pp. 33-46): Normal; Emergency; Meet (required for a dig of one mile or more; the meet is at least 48 hours after you contact GSOC); Owner Inquiry, Planning (operators have 15 working days), Design/Pre-Con Meet and Boundary Survey, none of which allow digging; and Correction, Cancellation and Update.
Updates: "All Update tickets will have a new GSOC ticket number," with the old number shown for reference, and the handbook says "Only one (1) remark/extend life of ticket is allowed per ticket."
Meet tickets last 14 calendar days, or up to six months with a written schedule that lists the meet date, who came, a sketch, and the next meetings. Past six months, get a new ticket first.
Emergency: "a condition that poses a clear and immediate danger to life or health" or a major loss of property. Scheduling problems and customer demands are not emergencies. Operators try to reach you within one hour and are on site within three when needed.
No ticket needed: farm tilling or planting shallower than 18 inches; gardening shallower than 12 inches. Homeowners and farmers must call for anything else.""",
      MN, MNU, ed='2026 Handbook', lic='summary', conf='medium')
    # ---------------- SOUTH CAROLINA
    SC = 'SC811 Excavator Manual 2026 pp. 9-23, 27-35; S.C. Code 58-36-10 to 58-36-120'
    SCU = 'https://sc811.com/wp-content/uploads/2026/05/Excavator-Manual-2026.pdf'
    S('SC', 'overview', 'the dig law in short (SC811)', """
South Carolina's dig law is the Underground Facility Damage Prevention Act, S.C. Code Title 58, Chapter 36. One center: SC811.
Wait: operators "have three full working days to mark," not counting the day you call.
A normal request is good for 15 working days from its start time. Send an Extension any time before it runs out; an Extension does not refresh the paint. Marks gone: send a Remark, which makes a new ticket with a new number and gives operators three full working days. Once a request has expired you need a new one.
Pre-mark in white paint, flags or stakes when the site can't be clearly identified.
Before digging, verify that every operator has answered in Positive Response. No answer and no sign of a line: you may proceed. Signs of a line: request a No Show; the operator has three hours.
Tolerance zone: 24 inches on either side of the mark plus half the diameter if known. No machines there until you can see the line; machines may remove pavement only.
Hit a line: notify SC811 and the operator right away; danger or a release, call 911 first.""",
      SC, SCU, ed='2026 Excavator Manual', lic='summary', conf='medium')
    S('SC', 'tickets', 'ticket types, large projects, emergencies, complaints', """
South Carolina ticket types (SC811 Excavator Manual 2026): Normal; Design (operators have 15 full working days; no digging on it); Emergency; Large Project; Subaqueous (underwater: 10 working days' notice, tolerance zone 15 feet either side).
Large Project: a job expected to take more than 90 days, or that meets the highway, development or utility size tests. Notify the center at least 30 days before starting; a planning meeting is held within 15 days; each phase gets its own start and end dates and needs no updates while work stays inside them.
Emergency: "any sudden or unforeseen event that requires immediate action." Notify SC811 and the operators as soon as practicable; operators make contact within three hours. Calling it an emergency does not remove liability for damage.
Bad weather: ice or snow can be an extraordinary circumstance that lets an operator post Code 110 with a later marking date.
Complaints: file with the Attorney General's Office within 45 days of the incident. Fine amounts are not in the manual and were not confirmed.""",
      SC, SCU, ed='2026 Excavator Manual', lic='summary', conf='medium', unc='fine amounts')
    # ---------------- OKLAHOMA
    OK = 'OKIE811 Excavator Guide (Feb 2026; law text as of Nov 1, 2025) pp. 6, 10-19, 24-39; 63 O.S. 142.6'
    OKU = 'https://okie811.org/wp-content/uploads/2026/07/2026-Excavator-Guide-Digital-.pdf'
    S('OK', 'overview', 'the dig law in short (OKIE811)', """
Oklahoma's dig law is the Underground Facilities Damage Prevention Act, 63 O.S. 142.1 to 142.13 (last amended November 1, 2024). The Corporation Commission enforces it for oil and gas pipelines. One center: OKIE811.
Notice: at least 48 hours before digging, not counting the day you call, Saturdays, Sundays and legal holidays. Demolition: 7 business days.
"Notice shall expire fourteen (14) calendar days from the excavation start date." To keep going, update the ticket (Extend, or Re-Mark if marks are gone) at least 4 business days before it expires; operators get 48 hours to respond.
A ticket covers no more than 500 linear feet in a city or town, or one linear mile outside.
White line the dig area before you call.
Check positive responses before starting. Operator missing: send a Second Notice.
Approximate location: a strip two feet on either side of the line. Only hand digging there until the line is exposed; machines may remove pavement only.
Hit a line: notify the operator and OKIE811 immediately; gas escaping, leave and call 911. Hold the backfill until repairs are done.""",
      OK, OKU, ed='Excavator Guide, February 2026', lic='summary', conf='medium')
    S('OK', 'tickets', 'ticket types, large projects, emergencies, exemptions', """
Oklahoma ticket types (OKIE811 Excavator Guide 2026 pp. 16-19): Normal; Emergency; Demolition (7 business days, after permits); Design Survey (operators have 14 calendar days; "No excavation may take place on a design or survey notice"); Pre-Excavation Meeting request for large projects (file 14 or more days ahead); Re-Mark / Extend, both add 14 days; Second Notice when an operator missed its response or the locate is incomplete.
Large project: over the ticket size limits or expected to last more than 90 days.
"Watch and protect": if an operator has posted that response, do not dig within ten feet of its marks without its person there (63 O.S. 142.6).
Emergency: an "unavoidable situation that poses a danger to life, health, or property." Digging "may begin immediately, providing reasonable precautions are taken," and operators must be told promptly. A false emergency can make you pay the response costs.
Exempt: farm cultivation; a person digging on their own property, unless in an easement or right-of-way or working for hire.
A repeat willful violator can be barred by court order from excavating. Fine amounts are not in the guide and were not confirmed.""",
      OK, OKU, ed='Excavator Guide, February 2026', lic='summary', conf='medium', unc='fine amounts')
    # ---------------- IOWA
    IA = 'Iowa One Call Excavator Manual (July 2024) pp. 2, 12-19, 32-46, 54-56; Iowa Code ch. 480'
    IAU = 'https://iowaonecall.com/wp-content/uploads/2024/08/iaoc-excavator-manual-2024.pdf'
    S('IA', 'overview', 'the dig law in short (Iowa One Call)', """
Iowa's dig law is Iowa Code chapter 480; the Attorney General enforces it. One center: Iowa One Call.
Notice: "at least forty-eight hours prior to the commencement" of digging, not counting the notice day, weekends and legal holidays.
A ticket is "valid for twenty-five (25) calendar days beginning on the day the forty-eight-hour period concludes." There is no renewal: for a longer job, request a new locate ticket before the old one runs out. You can't dig on another excavator's ticket.
Use white paint, flags or stakes to show the dig area unless it is clearly defined or you used electronic white-lining.
Operators must post a positive response within the 48 hours. Check the Electronic Positive Response System before starting; if one is missing, contact the operator or Iowa One Call.
Tolerance zone: 18 inches on either side of the line. Hand-dig test holes there; no machinery other than accepted methods such as vacuum excavation.
Hit a line: tell the operator as soon as practical and do not backfill until it has looked; gas or liquid escaping, call 911.""",
      IA, IAU, ed='Excavator Manual published July 2024', lic='summary', conf='medium')
    S('IA', 'tickets', 'ticket types, fines, farm exemption', """
Iowa ticket types (Iowa One Call manual pp. 15-19): Regular locate; Emergency locate; Dig-In notice (reports damage or contact; it does not create a locate ticket); Joint meet (a preconstruction meeting for complex sites, which can stand in for white-lining); Design information request (maps for designers); Design locate request (available after a five working day wait). Large sites can be planned on one Parent Ticket that the system splits into smaller tickets.
Emergency: "a condition where there is clear and immediate danger to life or health" or loss of essential service. You may start at once with reasonable care and must notify the center as soon as practical. Falsifying an emergency can be penalized.
Civil penalties (Iowa Code 480.6): gas or hazardous liquid pipelines, up to $10,000 per violation per day, capped at $500,000; other lines, up to $1,000 per day, capped at $20,000.
Normal farming is not excavation, but ripping deeper than 15 inches is not "normal farming." Homeowners are not exempt.
Operators do not locate for depth.""",
      IA, IAU, ed='Excavator Manual published July 2024', lic='summary', conf='medium')
    # ---------------- LOUISIANA
    LA = 'La. R.S. 40:1749.14 (legis.la.gov; last amended by Acts 2026, No. 902, eff. Aug 1, 2026); R.S. 40:1749.13'
    S('LA', 'overview', 'the dig law in short (Louisiana 811)', """
Louisiana's dig law is the Underground Utilities and Facilities Damage Prevention Law, R.S. 40:1749.11 to 1749.27 (amended effective August 1, 2026). One center: Louisiana 811.
Notice (R.S. 40:1749.13): at least 48 hours and not more than 120 hours ahead, not counting weekends and holidays; the wait runs from 7:00 a.m. on the next working day after you call.
Marks are good "as long as visible, but not longer than twenty calendar days, including weekends and holidays," from the mark-by time. Marks gone or work not done in time: give another notice to the center. Forestry, farm and marine digging: up to 30 calendar days. A notice designated a large project with a written agreement: 90 calendar days.
Operators must give a positive response through the center by the mark-by time. Bad weather extends the mark-by time; the operator must tell you first.
The marked location is the width of the line "plus eighteen inches on either side."
Marks use the APWA color code.
An excavator who called and followed the law is immune from civil liability to an operator that did not join the center or did not mark, unless the excavator was negligent.
Fine amounts and the damage steps were not confirmed in this pass.""",
      LA, 'https://legis.la.gov/legis/Law.aspx?d=169745', eff='2026-08-01', conf='medium', unc='fine amounts and damage reporting steps')
    # ---------------- MISSISSIPPI
    MS = 'Mississippi 811 "2025 Excavation Law Amendments Summary" (HB 1191, effective July 1, 2025); MS811 Portal Update guide'
    S('MS', 'overview', 'the dig law in short (Mississippi 811)', """
Mississippi's dig law is Miss. Code 77-13-1 and after, amended by HB 1191 effective July 1, 2025. One center: Mississippi 811 (MS811).
Ticket life went "from 14 to 20 calendar days" for Normal, Emergency, Impending Emergency, Short Notice and Design tickets. Update at least 3 working days before a ticket expires so there is no gap. (MS811's older portal guide says an update adds 14 calendar days; whether that is now 20 is not confirmed.)
The wait before digging was not on the page read and is not confirmed here: go by the dig date on your ticket.
Tolerance zone: 18 inches plus one-half of the diameter of the line when the diameter is shown at the marks, measured from the outside edge of the marks. Use non-invasive methods there (hand digging, vacuum), support the line, and keep machines a safe distance away.
Pre-mark in white unless you own the property and described it clearly, or you drew the dig area on the web portal map after MS811's short training.
Emergency tickets: operators respond within 2 hours, and you must name a contact who will be on site.
Large projects (can't be finished in 20 calendar days): optional preconstruction meeting and a signed agreement before work.""",
      MS, 'https://ms811.org/wp-content/uploads/2025/04/2025-Excavation-Law-Amendments-Summary.pdf', eff='2025-07-01', lic='summary', conf='medium', unc='wait before digging; days added by an update')
    # ---------------- SOUTH DAKOTA
    SD = 'SDCL 49-7A-5 and 49-7A-8 as amended by 2026 Senate Bill 9 (enrolled)'
    S('SD', 'overview', 'the dig law in short (South Dakota 811)', """
South Dakota's dig law is SDCL chapter 49-7A, with the One-Call Notification Board writing the rules. One center: South Dakota 811.
Notice (49-7A-5, 2026 Senate Bill 9): "at least forty-eight hours prior to the commencement of the excavation." The 48 hours start at 12:01 a.m. the day after you send the notice and skip Saturdays, Sundays and state legal holidays.
Operators mark within "eighteen inches horizontally from the exterior sides of the underground facilities."
Keep "a minimum horizontal clearance of eighteen inches" between the marked line and the cutting edge of any machine. If you must dig closer than 18 inches, expose the line first with hand tools or an approved noninvasive method, then protect and support it before using the machine again.
How long a ticket lasts, the damage steps and the fine amounts were not in the text read and are not confirmed here: go by the ticket and South Dakota 811.""",
      SD, 'https://mylrc.sdlegislature.gov/api/Documents/300764.pdf', ed='2026 Senate Bill 9, enrolled', conf='medium', unc='ticket life, damage steps, fine amounts')
    # ---------------- WYOMING
    WY = 'Wyo. Stat. 37-12-302 (Counsel Stack copy, 2026)'
    S('WY', 'overview', 'the dig law in short (One-Call of Wyoming)', """
Wyoming's dig law is the Wyoming Underground Facilities Notification Act, Wyo. Stat. 37-12-301 to 37-12-307. One center: One-Call of Wyoming (811).
Notice: "at least two (2) full business days, but not more than fourteen (14) business days prior to any excavation."
A job that runs longer than 14 business days needs the notice given again for each following 14 business day period.
Mark the dig area before the locator comes, unless one operator can find the site from the address, there was a site meeting, or it is an emergency.
Operators mark "within twenty-four (24) inches horizontally" of the outside of the line, in APWA colors, within two full business days.
Reasonable care is always required, and it calls for hand or soft digging where needed to protect the line.
Hit or touch a line: notify the operator and the center immediately. Gas or hazardous liquid released: call 911 first. Do not hide damage or repair it without authorization. In a dispute the excavator has to prove reasonable care.
If the operator missed its deadline or marked wrong, an excavator who used reasonable care is not liable.
Penalty amounts were not confirmed.""",
      WY, 'https://law.counselstack.com/statute/wy/37-12-302', ed='Statute copy read Nov 20, 2026', conf='medium', unc='penalty amounts')
    # ---------------- HAWAII
    HI = 'HRS 269E-7 (capitol.hawaii.gov)'
    S('HI', 'overview', 'the dig law in short (Hawaii One Call Center)', """
Hawaii's dig law is HRS chapter 269E, under the Public Utilities Commission. One center: the Hawaii One Call Center (811).
Notice: "at least five working days but not more than twenty-eight calendar days prior to commencing excavation," except in an emergency.
The center issues an inquiry identification number that "shall remain valid for not more than twenty-eight calendar days from the date of issuance." Ask to revalidate it before it expires; you must hold a valid number for the whole time you are digging.
No notice is needed on private property owned only by the excavator where no operator has lines.
The center notifies the operators the same day.
The tolerance zone, hand-dig rule, damage steps and fine amounts are in other sections (269E-12 to 269E-14) that were not read in this pass and are not confirmed here.""",
      HI, 'https://data.capitol.hawaii.gov/hrscurrent/Vol05_Ch0261-0319/HRS0269E/HRS_0269E-0007.htm', ed='HRS current edition online, read Nov 20, 2026', conf='medium', unc='tolerance zone, damage steps, fine amounts')
    # ---------------- NORTH DAKOTA
    ND = 'N.D.C.C. 49-23-04 (Counsel Stack copy, 2026); ND One Call Locate Request Handbook (2020 copy) pp. 7-13, 21, 31-48'
    S('ND', 'overview', 'the dig law in short (North Dakota One Call)', """
North Dakota's dig law is N.D.C.C. chapter 49-23. One center: North Dakota One Call (811).
Notice: the handbook says "at least 48 hours (excluding weekends and holidays)" before digging.
A ticket is good for 21 calendar days from the start time on it. The law says an excavator "may not use a location more than twenty-one days" after the planned dig date without arrangements with the operators; if no digging happened in the first 21 days, ask for a relocate first. After expiry, get a new ticket. There is no blanket ticket.
One request covers at most three city blocks in town, or four quarter sections or five linear miles in the country.
Show the site with white marking, digital white lining or project staking.
Operators mark a strip two feet on either side of the line. Dig by hand within 24 inches of a located line.
Emergency: call 911 first, then the utility, then the center.
Hit a line: notify the operator promptly; danger, call 911 and keep people away. Knowing of damage and not reporting it, or backfilling over it, is a class A misdemeanor. Civil penalty up to $25,000.
Farm work shallower than 18 inches and gardening shallower than 12 inches are not excavation.""",
      ND, 'https://law.counselstack.com/statute/nd/49-23-04', ed='Statute copy read Nov 20, 2026; handbook 2020', conf='medium')
    # ---------------- ARKANSAS
    S('AR', 'overview', 'the dig law in short (Arkansas 811)', """
Arkansas's dig law is the Arkansas Underground Facilities Damage Prevention Act, Ark. Code 14-271-101 and after. One center: Arkansas 811.
Notice (14-271-112): "at least two (2), but not more than ten (10), full working days before commencing" the dig.
The notice is "effective for a period of twenty (20) working days from the date that the notice was given." Work not finished or marks gone: "reinitiate the notice procedure," which means calling it in again with the normal wait.
The tolerance zone, white lining rule, damage steps and fine amounts were not read in this pass and are not confirmed here. Until they are: hand dig or vacuum to find any marked line before a machine works near it, and if you hit a line call the owner, and 911 if gas or liquid is escaping.""",
      'Ark. Code 14-271-112 (FindLaw copy, current as of Mar 28, 2024, as quoted in tests/staged/locate_round3_nov20/raw_findings.md)', 'https://codes.findlaw.com/ar/title-14-local-government/ar-code-sect-14-271-112/', ed='FindLaw copy current as of March 28, 2024', conf='medium', unc='tolerance zone, white lining, damage steps, fine amounts')
    # ---------------- MONTANA
    S('MT', 'overview', 'not confirmed yet: what to check with Montana 811', """
Montana's dig law is Mont. Code Title 69, Chapter 4, Part 5 (underground facility protection). One center: Montana 811.
None of Montana's numbers could be opened in an official source in this pass, so they are not confirmed: the wait before digging, how long a ticket lasts, the tolerance zone and the fines. Do not use another state's numbers.
What to do: call 811 or go online at montana811.org before any digging, start only on or after the dig date printed on the ticket, check that every utility on the ticket has marked or cleared, and ask Montana 811 how long the ticket is good for on a long job.
The federal rule applies everywhere for pipelines: use one-call first, wait for the marks, dig with care, report any pipeline damage to the operator, and call 911 if gas or hazardous liquid is released (49 CFR 196).""",
      'Mont. Code 69-4-501 to 69-4-530 (not opened); 49 CFR 196.103 to 196.109', 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-D/part-196', ed='Not confirmed; federal rule current to Oct 22, 2026', conf='low', unc='all state numbers')
    # ---------------- WISCONSIN
    WI = 'Wis. Stat. 182.0175(1), (2), (2m), (3) (docs.legis.wisconsin.gov)'
    WIU = 'https://docs.legis.wisconsin.gov/statutes/statutes/182/0175/2?up=1'
    S('WI', 'overview', 'the dig law in short (Diggers Hotline)', """
Wisconsin's dig law is Wis. Stat. 182.0175. One center: Diggers Hotline (811). A Public Service Commission panel hears complaints.
Notice: "not less than 3 working days before the start of nonemergency excavation." Working days are days other than Saturday, Sunday and legal holidays.
There is no set ticket life. Give a new notice if the dig does not start "within 10 days of the scheduled start date," if marks are destroyed or covered, or if work stops for more than 10 days.
Keep "an estimated minimum clearance of 18 inches" between a marked, unexposed line and the cutting edge of the machine. Once the line is exposed the clearance can drop to twice the machine's limit of control or 12 inches, whichever is greater.
Owners mark within 3 working days in the ANSI uniform colors.
Before backfilling, inspect any line you exposed. If a line may be damaged, notify the owner immediately and do not backfill until it has been inspected. Gas or liquid that may endanger life: call 911.
Emergency: take all reasonable precautions and notify owners as promptly as possible.
Fine amounts were not confirmed.""",
      WI, WIU, ed='Wisconsin Statutes online, read Nov 20, 2026', conf='medium', unc='fine amounts')
