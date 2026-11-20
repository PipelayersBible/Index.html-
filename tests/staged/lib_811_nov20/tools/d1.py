# d1: CA AZ NV TX FL WA OR CO  (sources read 2026-11-20; see ../sources.csv and ../raw_findings.md)
def load(S, U):
    # ------------------------------------------------------------------ CALIFORNIA
    CA = 'Cal. Gov. Code 4216, 4216.2, 4216.3, 4216.4, 4216.6 (FindLaw copy, current as of Jan 1, 2026)'
    S('CA', 'overview', 'the dig law in short (USA North 811, DigAlert)', """
California's dig law is Government Code 4216 to 4216.24. Two centers answer 811: USA North 811 (north and central) and DigAlert (south).
Mark the dig area in white first: the law says the excavator "shall delineate the area to be excavated" before calling.
Call at least 2 working days and not more than 14 calendar days before digging. Working days are Monday to Friday, 7 AM to 5 PM, not holidays, and the call day does not count.
Do not dig until every operator on the ticket has marked or answered through electronic positive response.
A ticket is good for 28 days from issue; renew by the end of day 28. If it expires while work goes on, stop and get a new ticket.
Tolerance zone: 24 inches on each side of the field mark. Inside it, find the line with hand tools before using power equipment.
Hit a line: call the operator right away; call 911 if gas or hazardous liquid is escaping; tell the 811 center within 48 hours.""",
      CA, 'https://codes.findlaw.com/ca/government-code/gov-sect-4216-2/', ed='Current as of January 1, 2026')
    S('CA', 'tickets', 'ticket life, renewal, no-response, high priority lines', """
California ticket rules (Gov. Code 4216.2, 4216.3). Notice: at least 2 working days, not more than 14 calendar days ahead. A ticket "shall be valid for 28 days from the date of issuance."
If work goes past 28 days, renew online or by calling 811 "by the end of the 28th day." If the ticket expires while work is ongoing you must "immediately cease excavation, contact the regional notification center, and get a new ticket," and wait again for the operators.
You may not start until all operators listed on the ticket have marked, given location information, or said they have no lines there. Every operator must post an electronic positive response before the legal start date and time. If one does not, tell the 811 center (4216.3(d)).
Marks faded or gone: stop in that area and ask the center for remarks; the operator has 2 working days, not counting the request day.
High priority lines (gas over 60 psig, petroleum, pressurized sewage, 60 kV or more electric, hazardous materials): if you will dig within 10 feet, the operator sets an onsite meeting and you may not dig until it is done.
Farms and flood control can get an "area of continual excavation" ticket; that is not for pipeline construction crews.""",
      CA, 'https://codes.findlaw.com/ca/government-code/gov-sect-4216-2/', ed='Current as of January 1, 2026')
    S('CA', 'marks', 'tolerance zone 24 inches, hand tools, white delineation', """
California tolerance zone: "24 inches on each side of the field marking placed by the operator" (Gov. Code 4216(u)).
Before using any power-driven digging or boring equipment inside the zone you must "determine the exact location of the subsurface installations in conflict with the excavation using hand tools" (4216.4(a)(1)). A hand tool is one that "uses human power and is not powered by any motor, engine, hydraulic, or pneumatic device."
Exceptions in 4216.4(a)(2): a vacuum excavator may be used if you told the 811 center you intend to use one and the operator agrees; power equipment may remove existing pavement only if no known line is in the pavement.
Can't find the line by hand digging: ask the operator for more information; the operator must answer within one working day.
Treat every line as live: the law says to "presume all subsurface installations to be active."
White: delineate means "to mark in white the location or path of the proposed excavation." An operator may wait to mark until the area is delineated.
Operators mark known abandoned lines with an A inside a circle. Nonpressurized sewer lines, storm drains and drain lines are not "subsurface installations" under this law, so they may not be marked.""",
      CA, 'https://codes.findlaw.com/ca/government-code/gov-sect-4216-4/', ed='Current as of January 1, 2026')
    S('CA', 'damage', 'emergencies and what to do when a line is hit', """
California, line hit or found damaged (Gov. Code 4216.4(c)): 1) Call 911 right away if the damage is to a gas or hazardous liquid line and there is an "escape of any flammable, toxic, or corrosive gas or liquid" (also for high priority lines). 2) Call the operator right away for any damage, even a nick or scraped coating. 3) Notify the regional 811 center within 48 hours.
Keep people away, do not try to fix or pinch the line, do not cover it up.
Emergency digging: the 2 working day notice does not apply in an emergency, defined as "a sudden, unexpected occurrence, involving a clear and imminent danger, demanding immediate action" to prevent loss of life, health, property or essential public services (4216(f)). Call 811 for an emergency ticket as soon as you can.
An expired ticket or marks you can no longer see are not emergencies: stop and call for a renewal or remark.""",
      CA, 'https://codes.findlaw.com/ca/government-code/gov-sect-4216-4/', ed='Current as of January 1, 2026')
    S('CA', 'penalties', 'fines and who enforces', """
California fines for breaking the dig law (Gov. Code 4216.6(a)): a negligent violation, up to $10,000; a knowing and willful violation, up to $50,000; a knowing and willful violation that damages a gas or hazardous liquid line and lets flammable, toxic or corrosive gas or liquid escape, up to $100,000.
Who enforces: the Contractors State License Board for contractors; the Public Utilities Commission for gas, electric and water corporations; the State Fire Marshal for hazardous liquid pipelines; local boards for local agencies; and the Underground Safe Excavation Board ("Dig Safe Board") for everyone else, since July 1, 2020. The Attorney General or a district attorney can also sue.
On top of fines, the excavator can owe the repair cost and other damages. A contractor's license can be on the line with the CSLB.
The Board also investigates near misses and damages reported to it.""",
      'Cal. Gov. Code 4216.6 (california.public.law copy, section updated Jan 1, 2025)', "https://california.public.law/codes/ca_gov't_code_section_4216.6", ed='Section as updated January 1, 2025')

    # ------------------------------------------------------------------ ARIZONA
    AZ = 'A.R.S. 40-360.21 to 40-360.28 (azleg.gov; statute copy in Southwest Gas "Arizona Dig Law" booklet, rev. Aug 2017)'
    S('AZ', 'overview', 'the dig law in short (Arizona 811)', """
Arizona's dig law is A.R.S. 40-360.21 to 40-360.32, enforced by the Arizona Corporation Commission. One center: Arizona 811.
Mark the dig area with white lining before you call (40-360.22(C)); a person digging on a single-family home lot is excused.
Operators must mark "as promptly as practicable, but not later than two working days." Working days skip Saturday, Sunday, legal holidays and the Friday after Thanksgiving.
You may not start "before the location and marking are complete or the excavator is notified that marking is unnecessary."
Marks are good for 15 working days from the date of marking. If work goes on, give notice at least 2 working days before they run out.
Within 24 inches of a marked line, expose it carefully with hand tools and support it.
Hit a line: tell the operator right away; gas or hazardous material, also call 911. Leave the hole open until the operator arrives.
Fine: up to $5,000 per violation.""",
      AZ, 'https://azleg.gov/ars/40/00360-22.htm', ed='Statute as posted on azleg.gov, read Nov 20, 2026')
    S('AZ', 'tickets', 'marks good 15 working days, renewals, large projects (2026 law)', """
Arizona ticket life: "The marking required by subsection B of this section is valid for fifteen working days from the date of the marking" (A.R.S. 40-360.22(J)). To keep digging past that, notify "at least two working days before the end of the validity period." The Corporation Commission's page says to call 811 "to have your marks refreshed." Whether the refresh gets a new ticket number is not confirmed.
Landlords (apartment communities, mobile home parks) get up to 10 working days to mark their own lines.
Operators answer through the interactive positive response system; check it before digging.
If an operator can't finish marking in time it must tell you promptly and send someone to the site.
A line is not abandoned until the operator tells you it is: "the excavator shall not treat the underground facility as abandoned until the excavator has received notification."
New in 2026 (SB 1137, Laws 2026 ch. 147): for a large project, notify the one-call center "not less than 15 business days or 21 calendar days" before the start to set a coordination meeting, with a phased ticket plan agreed in the system. The effective date was not confirmed in the summary read.""",
      'A.R.S. 40-360.22 (azleg.gov); 2026 SB 1137 House summary; azcc.gov AZ 811 page', 'https://azleg.gov/ars/40/00360-22.htm', ed='Statute as posted on azleg.gov, read Nov 20, 2026', conf='medium', unc='new ticket number on refresh; SB 1137 effective date')
    S('AZ', 'marks', 'careful digging within 24 inches, white lining', """
Arizona has no section called "tolerance zone." The rule is in the definition of "carefully" (A.R.S. 40-360.21): within 24 inches of a marked facility, the facility is "carefully exposed with hand tools, and the uncovered facility is supported and protected."
Having the marks "does not excuse any person making any excavation from doing so in a careful and prudent manner" (40-360.23(A)).
If you find a line that was not marked or was marked wrong, tell the operator (40-360.23(B)).
White lining: you "shall clearly and carefully mark with white lining the area that is requested to be excavated" (40-360.22(C)).
Marking colors follow the Commission's color code (A.A.C. R14-2-106), the same as the national APWA colors.
Landscape irrigation lines 2 inches or smaller are not "underground facilities" under this law, and private lines past the meter are not marked by the utility.""",
      AZ, 'https://www.swgas.com/1409223424748/Arizona-Dig-Law.pdf', ed='Statute text as printed in the Aug 2017 booklet; 40-360.22 checked on azleg.gov Nov 20, 2026', conf='medium')
    S('AZ', 'damage', 'line hits, emergencies, fines, exemptions', """
Arizona, line hit (A.R.S. 40-360.24): gas or hazardous material line damaged: "immediately notify the underground facilities operator and 911 or the local emergency response agency." Any other damage: tell the operator right away and do not try to repair it. "The excavation shall be left open until the arrival of representatives of the underground facilities operator."
Fines (40-360.28): "a civil penalty in an amount not to exceed five thousand dollars," and the violator owes the repair cost (40-360.26) and the other side's attorney fees if it loses (40-360.27).
The fine section does not apply (40-360.28(F)): during "an emergency which involves danger to life, health or property" if reasonable precautions are taken; to farm operations and resource extraction; to hand-tool gardening or tilling on your own lot.
There is no depth below which you may dig without calling.""",
      AZ, 'https://www.swgas.com/1409223424748/Arizona-Dig-Law.pdf', ed='Statute text as printed in the Aug 2017 booklet; fine amount also on azcc.gov, Nov 20, 2026', conf='medium')

    # ------------------------------------------------------------------ NEVADA
    NVH = 'USA North 811 Nevada Excavation Handbook (rev. Jan 2025) pp. 3-8, 21; NRS 455.110; NAC 455.165'
    S('NV', 'overview', 'the dig law in short (USA North 811)', """
Nevada's dig law is NRS 455.080 to 455.180 with rules in NAC 455. One center: USA North 811.
Call at least 2 working days (7 AM to 5 PM, not weekends or holidays, call day not counted) and not more than 28 calendar days before digging.
Mark the dig area in white first.
Wait for every operator: the handbook says excavators "are required by law to wait until all operators" have given a positive response, even if the start time on the ticket has passed.
A ticket is good for 28 calendar days from the date and time of the notification. It can be extended twice, 28 days each; after that the regulation requires a new notification (NAC 455.165). That is 84 days at most on one ticket.
Hand tools only within 24 inches on either side of the outside of the line.
Hit a line: notify the operator right away; in an emergency also 911.""",
      NVH, 'https://usanorth811.org/assets/PDF/Nevada-2025-Handbook.pdf', ed='Handbook revised January 2025; NAC 455 revised Aug 2026', lic='summary')
    S('NV', 'tickets', 'ticket types, two renewals, what to do after', """
Nevada ticket life (NAC 455.165): good "for 28 calendar days after the date and time that the excavator provided the notification." You may ask to extend by another 28 calendar days, and "An excavator may not request more than two extensions." If more time is needed after the original and both extensions, "the excavator shall submit a new notification" under NRS 455.110, which means a new ticket with the normal 2 working days' wait. Call it in at least 2 working days before the second renewal runs out so there is no gap. Renew by the end of day 28 and only if the marks are still clear.
Ticket only the area you can reasonably dig within 14 calendar days (NAC 455.115).
Ticket types in the USA North handbook: locate request; Renewal; Re-Mark (marks gone or unclear); No Response (an operator did not answer; you can resend every hour); Next Job Phase (copies the last ticket for the next section); Pothole ticket; Damage or Exposed notice; Emergency.
A ticket should cover no more than half a mile. There is no project or long-term ticket.
Designers should not open locate tickets for design; use the Project Design lookup to get operator contacts.""",
      'NAC 455.165, 455.115 (leg.state.nv.us, rev. Aug 2026); USA North 811 Nevada Excavation Handbook (Jan 2025) pp. 5-8', 'https://www.leg.state.nv.us/nac/NAC-455.html', ed='NAC 455 as revised August 2026')
    S('NV', 'marks', 'hand tools within 24 inches, white marking, positive response', """
Nevada hand dig rule, from the USA North handbook (p. 4): "Use hand tools only to expose and determine the facility's exact location, when digging within 24 inches on either side of the outside diameter" of the line. Report any contact, scrape, dent or nick to the operator.
White marking (p. 3): "Delineate the excavation site on paved surfaces with white spray chalk, water-based UV paint, or an equivalent non-permanent marking medium." On dirt use white flags, stakes or whiskers.
Marks follow the APWA uniform color code.
Positive response: check Electronic Positive Response at usanorth811.org/epr before digging. If a member has not answered by the legal start time, send a No Response notification naming the member; if there is still nothing after an hour you may send it again each hour.
Operators have 2 working days to mark, or a time you both agree to (NRS 455.130).""",
      NVH, 'https://usanorth811.org/assets/PDF/Nevada-2025-Handbook.pdf', ed='Handbook revised January 2025', lic='summary')
    S('NV', 'damage', 'emergencies and line hits', """
Nevada, line hit: the excavator "shall immediately notify the operator" of the damaged line (handbook p. 6, from NRS 455). USA North 811 takes Damage or Exposed notices and can give the operator's emergency number. If there is danger, call 911.
Emergency digging: an emergency is "a sudden, unexpected occurrence that involves clear and imminent danger" (NRS 455.090). The excavator must tell the local public service agencies or 911 and the operator, and take reasonable steps to protect the lines. Send an Emergency notification to the center.
Fine amounts are not in the handbook and were not confirmed from NRS 455.170 in this pass; the Public Utilities Commission of Nevada enforces the law.""",
      NVH, 'https://usanorth811.org/assets/PDF/Nevada-2025-Handbook.pdf', ed='Handbook revised January 2025', lic='summary', conf='medium', unc='fine amounts (NRS 455.170)')

    # ------------------------------------------------------------------ TEXAS
    TX = '16 TAC ch. 18 (Railroad Commission; sections as amended eff. Feb 12, 2018); Tex. Util. Code ch. 251'
    S('TX', 'overview', 'the dig laws in short (Texas811)', """
Texas has two layers: Utilities Code chapter 251 (the one-call law for all lines) and Railroad Commission rule 16 TAC chapter 18 for pipelines (gas, hazardous liquid, CO2). Call 811 or use the Texas811 portal.
Notice: at least 48 hours before digging, not counting weekends and legal holidays, and not more than 14 days ahead.
Ticket life: 14 working days for pipeline locates unless you and the operator agree otherwise in writing. Not done: refresh the ticket for the area still to dig. Texas811 sends updates with a 2 business day notice.
Tolerance zone for pipelines: half the pipe diameter plus at least 18 inches on each side.
Wait for a positive response (marks, "all clear" or "no conflict"). None: give a second notice; if there is still none after 4 hours you may begin.
Hit a pipeline: notify the operator through 811 within 1 hour, call 911 for a release, and file a damage report with the Railroad Commission within 30 days.""",
      TX, 'https://www.rrc.texas.gov/media/ap2ck4pb/chapter18-all-effective-feb12-2018.pdf', ed='16 TAC ch. 18 as in effect Feb 12, 2018 (latest amendment shown)')
    S('TX', 'tickets', 'ticket life 14 working days, refresh, second notice', """
Texas pipeline locate tickets (16 TAC 18.1, 18.3, 18.4): a line locate ticket lasts 14 working days unless the excavator and operator agree to something else in writing. A working day is "Every day that is not a Saturday, a Sunday, or a legal holiday." When the work is not finished, "the excavator shall refresh the ticket by giving the notice," limited to the area still to be dug.
Texas811 calls this an Update (or Update and Remark): it is "sent with a two-business day notice," and "If the most recent ticket is over 30 days old, a new ticket must be created." Whether an update prints a new ticket number is not confirmed.
No positive response by the start time: you "shall not begin excavating until a second notice is given." If "there is no positive response within four hours, the excavator may begin excavating" (18.4(e)-(f)). Report the second call, and any operator that still did not answer, to the Railroad Commission through TDRF (18.11(d)).
Protect the marks from the day you start until they are no longer needed (18.4(g)).""",
      '16 TAC 18.1, 18.3, 18.4, 18.11 (eff. Feb 12, 2018); Texas811 help article "Submitting an Update or Update & Remark"', 'https://www.law.cornell.edu/regulations/texas/16-Tex-Admin-Code-SS-18-4', ed='Sections as amended effective February 12, 2018', conf='medium', unc='new ticket number on an update')
    S('TX', 'marks', 'tolerance zone 18 inches plus half the pipe, hand digging, white lining', """
Texas tolerance zone for pipelines (16 TAC 18.2): "Half the nominal diameter of the underground pipeline plus a minimum of 18 inches on either side" of the outside edge. The one-call law itself sets no zone for water, sewer, power or telecom; Texas811 teaches 18 inches for those.
Inside the zone, use reasonable care (18.10): hand digging where practical, soft digging, vacuum excavation, pneumatic hand tools.
White lining (18.3): required "When an excavation site cannot be clearly identified and described on a line locate ticket." Mark it before you call and before the locator comes.
Marks use the APWA color code and are spaced no more than 20 feet apart.
Positive response: the operator marks the line or gives an "all clear" or "no conflict."
The pipeline rule does not cover digging that goes no deeper than 16 inches (18.1(d)); tilling deeper than 16 inches is covered.""",
      '16 TAC 18.1, 18.2, 18.3, 18.6, 18.8, 18.10 (Railroad Commission, eff. Feb 12, 2018)', 'https://www.rrc.texas.gov/media/ap2ck4pb/chapter18-all-effective-feb12-2018.pdf', ed='16 TAC ch. 18 as in effect Feb 12, 2018')
    S('TX', 'damage', 'pipeline hits: 1 hour notice, 911, 30-day report, fines', """
Texas, pipeline hit (16 TAC 18.4(h), 18.11): notify the operator through the notification center (811) "at the earliest practical moment but not later than one hour following the damage incident." You "shall not cover the exposed pipeline without approval of the operator."
If the damage releases flammable, toxic or corrosive gas, hazardous liquid or carbon dioxide, "promptly report the release to appropriate emergency response authorities by calling 911."
File a Texas Damage Reporting Form (TDRF) with the Railroad Commission "within 30 days of the incident." The operator files one too.
Fines (18.12 guideline tables): typical penalties include $2,000 for not filing the TDRF and $2,500 for not notifying the center or for not using reasonable care in the tolerance zone, with add-ons of $5,000 to $25,000 for aggravating factors.
Emergency: a situation that endangers life, health or property, or where a service outage forces immediate action; call 811 for an emergency ticket.""",
      '16 TAC 18.4, 18.11, 18.12 (Railroad Commission, eff. Feb 12, 2018)', 'https://www.law.cornell.edu/regulations/texas/16-Tex-Admin-Code-SS-18-11', ed='Sections as amended effective February 12, 2018')

    # ------------------------------------------------------------------ FLORIDA
    FL = 'Fla. Stat. ch. 556 (2025): 556.102, 556.105, 556.107, 556.108, 556.109, 556.114, 556.116'
    FLU = 'https://flsenate.gov/Laws/Statutes/2025/Chapter556/All'
    S('FL', 'overview', 'the dig law in short (Sunshine 811)', """
Florida's dig law is chapter 556, the Underground Facility Damage Prevention and Safety Act. One center: Sunshine 811.
Notice: "not less than 2 full business days before beginning any excavation" (10 full business days for underwater work).
A ticket is valid for 30 calendar days. Not finished: give another notice for the part still to dig.
Tolerance zone: 24 inches from the outer edge of either side of the marked line. Inside it, "use increased caution": hand dig, pothole, soft dig or vacuum.
You must check the positive responses before you dig.
Pre-mark in white when the site can't otherwise be identified.
Hit a line: "immediately notify the member operator"; if gas or a hazardous substance escapes, call 911.
Citations are $500 plus court costs, $2,500 for hazardous material pipelines.""",
      FL, FLU, ed='2025 Florida Statutes')
    S('FL', 'tickets', 'ticket life 30 days, positive response, no-show rule', """
Florida ticket life (556.105(1)(c)): the information is valid for 30 calendar days. If the work is not finished, 556.114(2) says to "provide a subsequent notice to the system" for only the area still to be dug. Sunshine 811 says: "When you need to renew a standard ticket, do not include any areas that are finished."
Operators must post a positive response within 2 full business days (10 for underwater). The excavator must verify the positive responses before digging (556.105(9)(c)).
If an operator has not marked in the time allowed, the excavator may go ahead using reasonable care and detection equipment or other acceptable means to find the lines (556.105(6)(a)). If you can see there is a line there and it is not marked and has no positive response, contact the operator. No demolition until lines are marked or removed.
High-priority lines (556.116): gas and hazardous liquid pipelines the operator calls critical. If you will dig within 15 feet of one and the operator told you so, give the operator your start date and time before digging.
Design help: an operator answers a design request within 20 business days after its fee is paid (556.112).""",
      FL, FLU, ed='2025 Florida Statutes')
    S('FL', 'marks', 'tolerance zone 24 inches, soft digging, premarking', """
Florida tolerance zone (556.102): 24 inches from the outer edge of either side of the marked underground facility.
Inside the zone the excavator must "use increased caution to protect underground facilities" (556.105(5)(c)). The law lists hand digging, pot holing, soft digging and vacuum excavation. Any mechanized equipment in the zone must be supervised by the excavator.
Premarking (556.102, 556.114(3)): outline the dig with "white paint, white stakes, or other similar white markings." It is required when the site can't otherwise be identified, unless both sides agree otherwise or it would get in the way of traffic or people walking.
Operators mark with the APWA Uniform Color Code for Utilities (556.105(10)).
Business days are Monday to Friday, not the listed holidays.""",
      FL, FLU, ed='2025 Florida Statutes')
    S('FL', 'damage', 'line hits, emergencies, fines, exemptions', """
Florida, line hit (556.105(12)): "immediately notify the member operator" of any contact or damage. If gas or another regulated hazardous substance escapes, "immediately report the contact or damage by calling the 911 emergency telephone number." Stop digging that could do more damage until it is repaired. Incidents with high-priority lines go to Sunshine 811 and the State Fire Marshal within 24 hours.
Emergency (556.109): "a clear and present danger to life or property," escaping substances, or loss of vital service. Notify the system or operator as early as you can. Calling in a false emergency is an infraction.
Fines (556.107): "$500 plus court costs for each infraction"; $2,500 plus court costs for violations involving hazardous material pipelines; up to $50,000 for a high-priority line incident (556.116). Fire marshals, fire chiefs, police and code officers can write the citation.
Exempt (556.108): an owner digging on a single-family lot "only up to a depth of 10 inches"; normal farm work off rights-of-way; surveying and pest control 18 inches or less.""",
      FL, FLU, ed='2025 Florida Statutes')

    # ------------------------------------------------------------------ WASHINGTON
    WA = 'RCW 19.122.020, .030, .031, .040, .050, .053, .055, .070 (through Laws 2025 c 292)'
    WAU = 'https://lawfilesext.leg.wa.gov/law/RCWPDF/RCW%20%2019%20%20TITLE/RCW%20%2019%20.122%20%20CHAPTER/RCW%20%2019%20.122%20%20COMBINEDCHAPTER.pdf'
    S('WA', 'overview', 'the dig law in short (Washington 811)', """
Washington's dig law is RCW 19.122, enforced by the Utilities and Transportation Commission (UTC).
Mark the boundary of the dig "with white lining or, when necessary, white pin flags," then call 811.
Notice: "not less than two full business days and not more than 10 full business days" before the work-to-begin date.
Since January 1, 2026 you "may not commence excavation until the excavator has received positive response" from every operator with lines in the area.
Marks expire 45 calendar days after you gave notice; to dig after that, give a new notice.
Marks are accurate to within 24 inches of the outside of the line on both sides. Find the exact location before digging there: hand digging when practical, vacuum or air tools.
Hit a line: tell the operator and 811, call 911 if it is an emergency, don't bury it, and report the damage to the UTC within 45 days.""",
      WA, WAU, ed='RCW as amended through Laws of 2025 chapter 292')
    S('WA', 'tickets', 'marks last 45 days, positive response, large projects', """
Washington ticket rules (RCW 19.122.030): notice 2 to 10 full business days before the work-to-begin date, unless you and the operators agree otherwise in writing. A business day is "any day other than Saturday, Sunday, or a legal local, state, or federal holiday."
Markings "expire forty-five calendar days from the date that the excavator provided notice." For digging after that, "an excavator must provide additional notice to a one-number locator service." There is no renewal: it is a new ticket with the normal wait.
The excavator must keep the marks accurate for 45 days or the length of the job, whichever is shorter.
Positive response is required since January 1, 2026: no digging until every operator has answered.
Large project means "a project that exceeds seven hundred linear feet." On large projects or multiple sites you must take reasonable steps to confer with the operators before each phase.
Design locating is for planning only and can't be used to dig.""",
      WA, WAU, ed='RCW as amended through Laws of 2025 chapter 292')
    S('WA', 'marks', '24-inch accuracy, precise location, white lining', """
Washington does not use the words "tolerance zone." Operators must mark with "reasonable accuracy," which means "location within twenty-four inches of the outside dimensions of both sides of an underground facility" (RCW 19.122.020).
The excavator must "Determine the precise location of underground facilities" that have been marked and use safe and careful methods, which the law lists as "hand digging when practical," vacuum excavation and pneumatic hand tools (19.122.040).
Directional boring: physically expose the marked lines you will cross; no blind boring.
White lining can be "any white paint, flags, stakes, whiskers, or other locally accepted method" (19.122.020).
Marks follow the current APWA color code.
Plan the work to keep damage and interference low, and keep the marks for the life of the job.""",
      WA, WAU, ed='RCW as amended through Laws of 2025 chapter 292')
    S('WA', 'damage', 'line hits, emergencies, fines, exemptions', """
Washington, line hit (RCW 19.122.050, .053): notify the operator and the one-number locator service (811). If the damage causes an emergency, call 911 too. Do not bury a damaged line until it is repaired or relocated. Report the damage to the UTC "within forty-five days of the damage event."
Emergency (19.122.020, .031): "any condition constituting a clear and present danger to life, health, or property," or certain unplanned outages. No white lining or advance notice needed, but notify 811 "at the earliest practicable opportunity."
Fines: up to $1,000 for a first violation and up to $5,000 for each later one within 3 years (19.122.070); up to $25,000 per violation if you break the law and damage a gas or hazardous liquid line (19.122.055).
No ticket needed (19.122.031): digging less than 12 inches deep on private noncommercial property by the owner or occupant; farm tilling less than 12 inches in an easement or 20 inches outside one; road and ditch maintenance less than 6 inches below original grade; bar holes less than 12 inches. The damage rules still apply.""",
      WA, WAU, ed='RCW as amended through Laws of 2025 chapter 292')

    # ------------------------------------------------------------------ OREGON
    ORS_ = 'OAR 952-001-0010, -0050, -0070, -0090 (Oregon Utility Notification Center); 2026 Addendum to the Oregon Standards Manual (Mar 12, 2026)'
    S('OR', 'overview', 'the dig rules in short (Oregon 811)', """
Oregon's dig rules are ORS 757.542 to 757.562 and OAR chapter 952, written by the Oregon Utility Notification Center (Oregon 811).
Pre-mark the dig area in white, then call at least 2 full business days and not more than 10 business days before digging.
Do not start until you have "received a response from each operator of underground facilities in the area."
Ticket life: the Center's 2026 Addendum says the rule was changed "from 45 days to 30 days," effective January 8, 2026. Older copies of the rule and the Center's own FAQ page still say 45 calendar days. Until you confirm with Oregon 811, plan on 30 days. Past ticket life, call in a new locate request.
Tolerance zone: 24 inches around the outside of the line on all sides. Use hand tools or other non-invasive methods there.
Hit a line: tell the operator right away; gas or hazardous liquid release, call 911. Don't bury it without the operator's OK.""",
      ORS_, 'https://digsafelyoregon.com/wp-content/uploads/2026/03/2026-Addendum-to-the-Oregon-Standards-Manual_Final.pdf', ed='2026 Addendum, last updated March 12, 2026', eff='2026-01-08', conf='medium', unc='ticket life 30 vs 45 days: the official rule text with the 2026 change was not opened')
    S('OR', 'tickets', 'ticket life changed to 30 days in 2026 (was 45), no renewals', """
Oregon ticket life: the 2026 Addendum to the Oregon Standards Manual (Oregon Utility Notification Center, March 12, 2026) lists a change to OAR 952-001-0010(23) that shortens ticket life "from 45 days to 30 days," effective January 8, 2026. Copies of the rule dated through mid-2025 read "the 45 calendar day period after an excavator provides notice," and the Center's FAQ page still said 45 on Nov 20, 2026. The official current rule text was not confirmed in this pass, so treat 30 days as the safe number and ask Oregon 811.
There is no renewal. The rule says not to keep digging after ticket life ends "unless you re-notify the Center" (0090): that is a new locate request with the normal 2 full business days' notice.
Do not start more than 10 business days after the notice without re-notifying.
Keep the marks for the life of the job or of the ticket, whichever is shorter. Marks gone: stop and ask the Center for a remark.
There is no legal "priority" locate. Less than 2 business days' notice is only for emergencies (0060).""",
      ORS_, 'https://digsafelyoregon.com/wp-content/uploads/2026/03/2026-Addendum-to-the-Oregon-Standards-Manual_Final.pdf', ed='2026 Addendum, last updated March 12, 2026', eff='2026-01-08', conf='medium', unc='ticket life 30 vs 45 days: official current rule text not opened')
    S('OR', 'marks', 'tolerance zone 24 inches, non-invasive methods, pre-marking', """
Oregon tolerance zone: "the area within 24 inches surrounding the outside dimensions of all sides of an underground facility" (OAR 952-001-0010).
Inside it you must "Employ hand tools or other non-invasive methods" to find the exact location of the line (0090(3)). The 2026 Addendum says non-invasive methods now include "hand digging, air cutting, vacuum excavation, and hydro vacuum excavation."
Directional drilling: watch the drill head and back reamer by eye as they pass through the tolerance zone.
Give the lines the side and bottom support they need.
Pre-marking in white is required by rule 0040 unless an exemption applies.
If you find a line where the operator said there was none, tell the Center before going on and use extreme care.
If an operator requires its own monitor at a critical line, don't start without the monitor or the operator's OK.
2026 change: work inside a meter box or vault that does not dig below its base no longer needs a ticket.""",
      'OAR 952-001-0010, -0040, -0090 (oregon.public.law / Justia copies); 2026 Addendum to the Oregon Standards Manual', 'https://oregon.public.law/rules/oar_952-001-0090', ed='Rule copies current to mid-2025; 2026 Addendum dated March 12, 2026', conf='medium')
    S('OR', 'damage', 'line hits, emergencies, exemptions', """
Oregon, line hit (OAR 952-001-0090(6)): notify the operator immediately. For an emergency, or a release of gas or hazardous liquid from a pipeline, call 911 and take reasonable steps to keep the public safe. You "must not bury damaged underground facilities without the consent of the operator."
Emergency (0010): "an occurrence involving an immediate danger, demanding prompt action to prevent loss of life" or to limit property damage, or to keep essential public services or customer service on, as decided by the emergency agency or the operator.
Not "excavation," so no ticket: sidewalk, road and ditch maintenance less than 12 inches deep that does not lower the original grade or ditch flow line; farm tilling on private land outside recorded utility easements.
Fine amounts are set in ORS 757.993 and were not confirmed in this pass; the Public Utility Commission enforces.""",
      'OAR 952-001-0010, -0090 (oregon.public.law / Justia copies, current to mid-2025)', 'https://oregon.public.law/rules/oar_952-001-0090', ed='Rule copies current to mid-2025', conf='medium', unc='fine amounts (ORS 757.993)')

    # ------------------------------------------------------------------ COLORADO
    COH = 'Colorado 811 Excavator Handbook (last update Nov 2022) pp. 5-23, 27-45; C.R.S. 9-1.5-103'
    COU = 'https://a-us.storyblok.com/f/1021538/x/160e66dfe5/excavator-handbook.pdf'
    S('CO', 'overview', 'the dig law in short (Colorado 811)', """
Colorado's dig law is C.R.S. 9-1.5-101 to 9-1.5-108, with the Underground Damage Prevention Safety Commission hearing violations. One center: Colorado 811.
Notice: "at least two (2) full business days prior to any excavation," not counting the call day.
Marks are good for 30 days from the ticket's due date, or until you can't see them, whichever is first. To go on, notify Colorado 811 at least 2 business days before the 30 days end; once it has run out you need a new ticket.
Tolerance zone: the width of the line plus 18 inches on each side. Use non-destructive digging there (hand or vacuum).
Check that every member on the ticket has posted a positive response before you dig. If one has not by the locate-by date, send an Excavator Re-Notification first.
Hit a line: stop, notify 811 and the operator right away; gas release, clear the area and call 911.""",
      COH, COU, ed='Handbook last updated November 2022', lic='summary', conf='medium')
    S('CO', 'tickets', 'ticket types, 30-day marks, updates', """
Colorado ticket types (Colorado 811 handbook pp. 6-13): Normal (2 full business days ahead); Multiple Day (encouraged for jobs over 1,000 linear feet in populated areas); Emergency; Damage; Non-Compliance (you are asking for a response in less than 2 full business days); Excavator Re-Notification (a member did not answer or the locate is incomplete); Relocate/Refresh (marks no longer visible); Meet; Cancel; Engineering and Subsurface Utility Engineering (design only, never for digging; owners answer within 10 business days).
Life: "Locate marks are only valid for thirty (30) days from the ticket's due date" or until no longer visible. The excavator "shall notify Colorado 811 at least two (2) business days" before that ends, and "A new ticket must be processed after this time has expired."
An Update Lite can be used on a ticket processed in the last 30 calendar days when nothing on it changes.
Emergency tickets: members answer within 1 hour in business hours, 2 hours after hours.
Meets: if a member is 15 minutes late with no contact, send a Re-Notification.
Whether an update gets a new ticket number is not confirmed.""",
      COH, COU, ed='Handbook last updated November 2022', lic='summary', conf='medium', unc='new ticket number on an update')
    S('CO', 'marks', 'tolerance zone 18 inches, non-destructive digging, positive response', """
Colorado tolerance zone: the "width of underground facility plus 18" on each side" (handbook p. 18; C.R.S. 9-1.5-103).
Inside it: "Use non-destructive means to excavate within the tolerance zone (e.g., hand digging, vacuum excavation)." Power equipment there can damage the line.
Pre-marking the dig area in white paint is "highly recommended"; the statute calls for white marks on a hard surface when the area can't be described.
Owners must mark with the APWA color code.
Positive response: "verify the positive responses of all listed facility owner/operator members" before you dig. If a member has not responded by the locate-by date, "submit an Excavator Re-Notification before proceeding with excavation."
Marks gone or unclear: ask for a Relocate/Refresh rather than guessing.""",
      COH, COU, ed='Handbook last updated November 2022', lic='summary', conf='medium')
    S('CO', 'damage', 'line hits, emergencies, fines, exemptions', """
Colorado, line hit (handbook pp. 7, 21): stop digging and notify Colorado 811 and the operator immediately. Gas release: "evacuate the area immediately and call 911," then 811 and the operator. A Damage ticket reports a damaged or accidentally exposed line.
Emergency ticket: when "immediate excavation is necessary to prevent the loss of life" or serious damage. Say what the emergency is and any hazards on site. They can be filed any hour.
Fines (handbook p. 40, Safety Commission table, highest in each tier): minor violations $250 for a first up to $5,000 for a fourth; moderate $1,000 up to $25,000; major $5,000 up to $75,000. The statute also sets a civil penalty for failing to notify or damaging a line.
Not covered: routine farm and ranch work; landscape maintenance that disturbs no more than 12 inches by hand or 4 inches by machine. A homeowner on their own lot is exempt from the penalties, not from calling.""",
      COH, COU, ed='Handbook last updated November 2022', lic='summary', conf='medium')
