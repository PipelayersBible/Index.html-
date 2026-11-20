# build_lib_more.py (lib_more_nov20, 2026-11-20). Run: python3 build_lib_more.py
# Writes lib_more.jsonl, sql/lib_more_00.sql (guarded, NOT applied), sql/lib_more_precheck.sql (SELECT only), lib_more_report.txt
# Every fact below was read on 2026-11-20; the quotes and URLs are in src/dot_notes.md, src/env_notes.md, src/misc_notes.md.
# Nothing here talks to the server.
import sys, json, os
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
from lib_kb import Batch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trims
HERE = os.path.dirname(os.path.abspath(__file__))
B = Batch('lib_more', out_dir=HERE)
_add = B.add
def _tiered(**c):
    c['text'] = trims.apply(c['id'], c['text'].strip())
    c.setdefault('tier', 'core' if len(c['text'].strip()) <= 1200 else 'shelf')
    _add(**c)
B.add = _tiered
D = '2026-11-20'
ECFR = 'eCFR text as shown on law.cornell.edu, read 2026-11-20'
LII = 'https://www.law.cornell.edu/cfr/text/'

def fed(id, title, topic, text, source, url, conf='high', edition=ECFR, effective=None, **kw):
    B.add(id=id, state='US', title=title, topic=topic, text=text, source=source, url=url, checked=D, edition=edition,
          effective=effective, confidence=conf, kind='summary', license='gov-us', **kw)

# =====================================================================================================
# A. DOT / FMCSA for crews (federal). The library had almost nothing here (1 chunk on drug testing, 3 passing CDL mentions).
# =====================================================================================================
T_DOT = 'DOT rules for crew trucks: CDL, medical card, hours of service, inspections, loads'
T_STATE_NOTE = (' These are the federal rules for trucks that cross state lines or carry interstate freight. A truck that never leaves the state '
                'follows that state\'s version, which is usually close but can have different weights or hours, so check with the state.')

fed('fed-fmcsa-cdl-classes-1', 'When a crew truck needs a CDL: the 26,001 lb and 10,000 lb trailer rule (Class A, B, C)', T_DOT,
    'A commercial driver license (CDL) is needed by weight rating, not by what the truck looks like (49 CFR 383.5). '
    'Class A (combination): the truck and trailer together are rated or weigh 26,001 lb or more AND the trailer is rated or weighs more than 10,000 lb. '
    'Class B (heavy straight truck): the single truck is rated or weighs 26,001 lb or more, for example most tandem dump trucks and water trucks. '
    'Class C: smaller vehicles built for 16 or more people including the driver, or hauling placarded hazardous materials. '
    'The rule uses whichever is greater, the rating on the door tag (GVWR) or the real weight. The combination rating (GCWR) is the greater of the maker\'s number on the power unit\'s label or the truck GVWR plus the trailer GVWR. '
    'Worked example: a pickup tagged 14,000 lb GVWR pulling an equipment trailer tagged 14,000 lb is 28,000 lb combined with a trailer over 10,000 lb, so it is a Class A combination. '
    'The same pickup with a 9,900 lb trailer is 23,900 lb and needs no CDL. A 25,999 lb straight truck with a trailer of 10,000 lb or less needs no CDL either. '
    'States issue the license and may add their own rules, and some state exemptions exist, so check the state driver manual.',
    '49 CFR 383.5 (definitions: commercial motor vehicle Groups A, B, C; GCWR; GVWR)', LII + '49/383.5')

fed('fed-fmcsa-cmv-10001-1', 'The 10,001 lb line: when a pickup and trailer becomes a DOT commercial vehicle (no CDL needed)', T_DOT,
    'There are two federal weight lines, and crews mix them up. 26,001 lb is the CDL line. 10,001 lb is the "commercial motor vehicle" line for the safety rules. '
    '49 CFR 390.5 says a commercial motor vehicle is a vehicle "used on a highway in interstate commerce to transport passengers or property" that has a '
    '"gross vehicle weight rating or gross combination weight rating, or gross vehicle weight or gross combination weight, of 4,536 kg (10,001 pounds) or more, whichever is greater". '
    'So a 3/4 ton or 1 ton work pickup pulling a mini excavator or a loaded dump trailer is usually over 10,001 lb combined, even though nobody needs a CDL to drive it. '
    'Above that line the driver and truck come under the federal motor carrier safety rules that use this definition: a medical card (49 CFR 391.45), hours of service (Part 395), '
    'load checks (392.9), daily defect reports and a yearly inspection (Part 396), and a USDOT number on the truck. '
    'A pickup rated under 10,001 lb that pulls nothing, or a light trailer that keeps the total under 10,001 lb, is below the line.' + T_STATE_NOTE,
    '49 CFR 390.5 (definition of commercial motor vehicle, 10,001 lb); 49 CFR 383.5 (26,001 lb CDL line)', LII + '49/390.5')

fed('fed-fmcsa-usdot-number-1', 'Do we need a DOT number (USDOT number) on our pickups and work trucks, even if we only work in state', T_DOT,
    'FMCSA says a company needs a USDOT number when it runs a vehicle in interstate commerce that has a weight rating or weight "of 4,536 kg (10,001 pounds) or more, whichever is greater" '
    '(truck alone or truck plus trailer), or carries placarded hazardous materials. Interstate means trade that crosses a state line, "Between a place in a State and a place outside of such State". '
    'For companies that stay inside one state, FMCSA lists the states that also require a USDOT number for in-state commercial trucks: '
    'AL, AK, AZ, CA, CO, CT, DE, FL, GA, HI, ID, IN, IA, KS, KY, ME, MD, MA, MI, MN, MO, MT, NE, NV, NJ, NY, NC, OH, OK, OR, PA, SC, TX, UT, WA, WV, WI, WY, plus Puerto Rico. '
    'Each of those states sets its own weight line for in-state trucks, so check with the state. A state not on the list may still have its own state number or permit. '
    'The number is free from FMCSA and is tied to the company, not to each truck. The list is from the FMCSA page as updated September 3, 2025.',
    'FMCSA, "Do I Need a USDOT Number?" (page updated 2025-09-03); 49 CFR 390.5', 'https://www.fmcsa.dot.gov/registration/do-i-need-usdot-number',
    edition='FMCSA web page, last updated September 3, 2025')

fed('fed-fmcsa-medical-card-1', 'DOT medical card: who needs one and how often (every 24 months)', T_DOT,
    'A driver of a commercial motor vehicle (10,001 lb or more in interstate commerce, with or without a CDL) must be medically examined and certified by a medical examiner. '
    '49 CFR 391.45 requires a new exam for any driver who has not been certified "during the preceding 24 months". '
    'Some drivers are on a 12 month cycle instead: drivers with insulin-treated diabetes, drivers certified under the alternative vision standard, and drivers in an exempt intracity zone. '
    'A driver whose ability to do the job has been affected by an injury or illness must be examined again before driving, whatever the date on the card. '
    'A medical examiner can also write a card for less than 24 months to watch a condition such as high blood pressure. '
    'So the pipelayer who only drives the 1 ton with the equipment trailer needs a current medical card, not just the CDL drivers.' + T_STATE_NOTE,
    '49 CFR 391.45 (persons who must be medically examined and certified); 49 CFR 390.5', LII + '49/391.45')

fed('fed-fmcsa-hos-limits-1', 'Hours of service for truck drivers: 11 hours driving, 14 hour day, 30 minute break, 60/70 hours', T_DOT,
    'Federal hours of service for property-carrying commercial trucks (49 CFR 395.3): '
    '10 hours off first: "A driver may not drive without first taking 10 consecutive hours off duty". '
    '14 hour window: a driver may not drive after 14 consecutive hours from coming on duty. Breaks and time on the job site do not stop that clock. '
    '11 hours driving: "A driver may drive a total of 11 hours" inside the 14 hour window. '
    '30 minute break: no driving once more than 8 hours of driving time have passed without at least a 30 minute interruption; the break can be off duty or on duty not driving (fueling or loading counts). Short-haul drivers are excused from this break. '
    'Weekly: no driving after 60 hours on duty in 7 days (company does not run every day) or 70 hours in 8 days (company runs every day). '
    'Restart: 34 or more consecutive hours off duty resets the 7 or 8 day count. '
    'Bad weather or a wreck nobody could have known about before dispatch allows up to 2 more hours to finish the run (395.1(b)(1)). '
    'These limits stop the driving, not the work: a worker past 14 hours can keep working but cannot drive the commercial truck.' + T_STATE_NOTE,
    '49 CFR 395.3(a)-(c); 49 CFR 395.1(b)(1)', LII + '49/395.3')

fed('fed-fmcsa-hos-shorthaul-1', 'Short-haul exception: no logbook inside 150 air miles (time cards instead)', T_DOT,
    'Most pipe crews do not need a logbook or an electronic log because of the short-haul exception in 49 CFR 395.1(e). '
    'CDL drivers, 395.1(e)(1): no log is needed on a day when the driver stays "within a 150 air-mile radius (172.6 statute miles) of the normal work reporting location", '
    'returns there and is released within 14 consecutive hours, and has at least 10 hours off before the next shift. '
    'Drivers of trucks that do not need a CDL, 395.1(e)(2): stay within 150 air miles and return to the normal reporting location at the end of each shift; '
    'they may not drive after the 14th hour on duty on 5 days of any 7, and may go to the 16th hour on 2 days of the 7. '
    'In both cases the company must keep time records for 6 months that show the time the driver reports, total hours on duty, and the time released each day. '
    'Short-haul drivers are also excused from the 30 minute driving break. The 11 hour driving limit and the 60/70 hour weekly limits still apply. '
    'On a day the driver breaks the exception (goes past the radius or the hours), a regular log is required for that day.' + T_STATE_NOTE,
    '49 CFR 395.1(e)(1) and (e)(2); 49 CFR 395.3(a)(3)(ii)', LII + '49/395.1')

fed('fed-fmcsa-hos-construction-1', 'Construction and utility truck exceptions to hours of service: the 24 hour restart', T_DOT,
    'Two federal hours-of-service exceptions are written for our kind of work. '
    'Construction materials and equipment, 49 CFR 395.1(m): for a driver mainly hauling construction materials and equipment, '
    '"any period of 7 or 8 consecutive days may end with the beginning of any off-duty period of 24 or more successive hours." '
    'So the weekly 60 or 70 hour count restarts after 24 hours off instead of 34. The definition (395.2) covers hauling "to or from an active construction site" '
    '"within a 75 air mile radius of the normal work reporting location of the driver"; a state may set 50 to 75 air miles for moves inside that state, and placarded hazardous materials are not covered. '
    'Utility service vehicles, 395.1(n): the hours-of-service part does not apply at all to drivers of a utility service vehicle, which 395.2 defines as a commercial vehicle used to repair, '
    'maintain or operate utility facilities (water, sewer, gas, power, phone) and "operated primarily within the service area of a utility\'s subscribers or consumers". '
    'That fits a utility\'s own service trucks and contractors doing that repair and maintenance work; whether a truck on new-construction pipe work qualifies is not confirmed here, so ask the state DOT enforcement office before relying on it.',
    '49 CFR 395.1(m), 395.1(n); 49 CFR 395.2 (definitions)', LII + '49/395.1', conf='medium', unconfirmed='whether new-construction pipe crews fit the utility service vehicle definition')

fed('fed-fmcsa-hos-onduty-1', 'Do hours laying pipe count against a driver\'s 14 hours? What "on duty" means', T_DOT,
    'Yes. For a worker who also drives a commercial truck (10,001 lb or more), time spent working in the trench counts as on-duty time. '
    '49 CFR 395.2 says on-duty time "means all time from the time a driver begins to work or is required to be in readiness to work" until relieved. '
    'It lists driving, inspecting or servicing the truck, loading and unloading, time waiting to be dispatched, and "any other work for a motor carrier", plus paid work for anyone else. '
    'The 14 hour rule in 395.3 says a driver may not drive after 14 consecutive hours from coming on duty. '
    'Put together: a pipelayer who clocks in at 6:00 am, lays pipe all day, and is still on the job at 8:00 pm cannot legally drive the equipment truck and trailer back to the yard, '
    'unless the 16 hour short-haul day for non-CDL trucks applies (allowed on 2 days in 7, see 395.1(e)(2)). '
    'Someone else who is inside their hours has to drive, or the truck stays. The weekly 60 or 70 hour count also includes all the trench hours. '
    'Plan long days (shutdowns, tie-ins, night work) with this in mind.' + T_STATE_NOTE,
    '49 CFR 395.2 (on-duty time); 49 CFR 395.3(a)(2); 49 CFR 395.1(e)(2)', LII + '49/395.2')

fed('fed-fmcsa-eld-exempt-1', 'Electronic logs (ELD): which crew trucks do not need one', T_DOT,
    'FMCSA lists the drivers who do not have to use an electronic logging device (ELD): '
    'drivers using the short-haul exception ("Drivers who use the short-haul, timecard exceptions are not required to keep records of duty status (RODS) or use ELDs."); '
    'drivers who have to keep a log on no more than 8 days in any 30 day period (they can use a paper log on those days); '
    'driveaway-towaway operations where the vehicle driven is the thing being delivered; and trucks "manufactured before the model year 2000". '
    'A crew truck that normally stays inside 150 air miles and gets back within the short-haul hours needs time cards, not an ELD. '
    'If that truck goes outside the exception more than 8 days in any 30, it needs an ELD. '
    'The FMCSA page was issued as guidance in 2018 and marked rescinded on March 10, 2022 only because the same rules are in the regulation itself (49 CFR 395.8 and Part 395 Subpart B); the regulation text was not re-read for this chunk.',
    'FMCSA, "Who is exempt from the ELD rule?" (guidance 2018; 49 CFR 395.8(a)(1)(iii))', 'https://www.fmcsa.dot.gov/hours-service/elds/who-exempt-eld-rule',
    conf='medium', edition='FMCSA guidance page, 2018 (rule text: 49 CFR 395.8)')

fed('fed-fmcsa-dvir-1', 'Pre-trip and post-trip truck inspection (DVIR): what the driver must do', T_DOT,
    'Before driving: 49 CFR 396.13 says "Before driving a motor vehicle, the driver shall" "Be satisfied that the motor vehicle is in safe operating condition", '
    'review the last driver vehicle inspection report if one was required, and sign it to show the listed repairs were certified as done. '
    'End of day: 396.11 requires a written report "at the completion of each day\'s work on each vehicle operated" covering at least the service brakes including trailer brake connections, '
    'parking brake, steering, lights and reflectors, tires, horn, wipers, mirrors, coupling devices, wheels and rims, and emergency equipment. '
    'But: "Drivers are not required to prepare a report if no defect or deficiency is discovered by or reported to the driver." So for property-carrying trucks a report is written only when something is wrong. '
    'The company must fix any defect that affects safety before the truck goes out again and certify the repair (or that no repair was needed) on the report, '
    'and keep the report "for three months from the date the written report was prepared." '
    'The report rule does not apply to "a motor carrier operating only one commercial motor vehicle". The trailer is part of the inspection.' + T_STATE_NOTE,
    '49 CFR 396.11(a); 49 CFR 396.13', LII + '49/396.11')

fed('fed-fmcsa-annual-inspection-1', 'Annual DOT inspection: every truck AND trailer, proof on the vehicle', T_DOT,
    '49 CFR 396.17: "Every commercial motor vehicle must be inspected as required by this section." In a combination each unit counts on its own: '
    '"the tractor, semitrailer, and the full trailer (including the converter dolly if so equipped) must each be inspected." '
    'A commercial vehicle may not be used unless each part of it "has passed an inspection in accordance with the terms of this section at least once during the preceding 12 months" '
    'and "documentation of such inspection is on the vehicle." The proof can be the inspection report itself or a sticker or decal showing the inspection date, '
    'who did it, the vehicle it belongs to, and that it passed. '
    'What crews miss: the equipment trailer and the tilt-deck need their own inspection and their own sticker, not just the truck. '
    'This applies from the 10,001 lb commercial vehicle line, not only to CDL trucks. A roadside officer will ask for the sticker or report on both units.' + T_STATE_NOTE,
    '49 CFR 396.17(a)-(c); 49 CFR 396.21', LII + '49/396.17')

fed('fed-fmcsa-cargo-check-1', 'Hauling the excavator: stop and check chains and binders in the first 50 miles, then every 3 hours or 150 miles', T_DOT,
    'When hauling equipment, pipe or plates, the driver has to stop and check the chains, binders and straps. 49 CFR 392.9: a commercial truck may not be driven unless the cargo is "properly distributed and adequately secured", '
    'and the "tailgate, tailboard, doors, tarpaulins, spare tire and other equipment used in its operation" are secured, and nothing blocks the driver\'s view or movement. '
    'The driver must make sure of that before driving, then "Inspect the cargo and the devices used to secure the cargo within the first 50 miles after beginning a trip" and adjust or add tie-downs as needed. '
    'After that, re-check whenever the driver changes duty status, or the truck "has been driven for 3 hours", or "has been driven for 150 miles, whichever occurs first." '
    'For a crew this means: after loading the excavator, pipe, plates or a trench box, stop within the first 50 miles (chains and binders settle), and again at the fuel stop. '
    'Heavy equipment over 10,000 lb has its own tie-down rule (49 CFR 393.130: at least four tie-downs, see the library chunk on tying down equipment).',
    '49 CFR 392.9(a)-(b); 49 CFR 393.130', LII + '49/392.9')

fed('fed-fhwa-size-weight-1', 'Federal truck weight limits: 80,000 lb gross, 20,000 single axle, 34,000 tandem', T_DOT,
    'On the Interstate system and reasonable access to it, 23 CFR 658.17 sets the weight limits a state must allow without a special permit: '
    '"The maximum gross vehicle weight shall be 80,000 pounds." One axle: 20,000 pounds. "The maximum gross weight on tandem axles is 34,000 pounds." '
    'Groups of axles must also meet the bridge formula, W = 500 x (LN / (N - 1) + 12N + 36), where W is the weight allowed on the group, L is the distance in feet between the outer axles of the group, and N is the number of axles. '
    'Two sets of tandems may each carry 34,000 lb when the first and last axles are at least 36 ft apart. '
    'Anything heavier, such as a large excavator on a lowboy, moves on a state overweight permit, and the permit sets the route, the hours and the escorts. '
    'States also have their own limits on state and local roads, bridge postings, and seasonal (frost) load limits, which can be lower. '
    'Axle weights are what get a dump truck ticketed: a truck can be under its gross and still be over on the rear tandem if the load sits too far back.',
    '23 CFR 658.17(a)-(e)', LII + '23/658.17')

fed('fed-phmsa-fuel-cans-1', 'Hauling gas cans and diesel on the crew truck: the materials of trade rule', T_DOT,
    'Fuel a crew carries for its own saws, pumps and plates is a "material of trade". Under 49 CFR 173.6 a material of trade moved by truck is not subject to the rest of the hazardous materials rules '
    '(no placards, no shipping papers) if it stays inside these limits. Gasoline (a Class 3 flammable liquid, Packing Group II): each container no more than "30 L (8 gallons)". '
    'All materials of trade on the truck together: no more than "200 kg (440 pounds)" gross weight. "For gasoline, a packaging must be made of metal or plastic" and meet the OSHA safety can rules '
    '(29 CFR 1910.106(d)(2) or 1926.152(a)(1)) or DOT packaging rules. Containers must be closed, secured against moving, and marked with the common name of what is inside ("gasoline"). '
    'The driver "must be informed of the presence of the hazardous material" and of these limits. '
    'Diesel: a liquid with a flash point at or above 100 F "may be reclassed as a combustible liquid" (173.150(f)(1)), and the hazardous materials rules "do not apply to a material classed as a combustible liquid in a non-bulk packaging" (173.150(f)(2)). '
    'A large diesel transfer tank is bulk packaging and has marking and placard rules. The gallon size where a tank becomes bulk is in 49 CFR 171.8 and was not confirmed for this chunk, so check before buying a tank.',
    '49 CFR 173.6 (materials of trade); 49 CFR 173.150(f) (combustible liquids)', LII + '49/173.6', conf='medium',
    unconfirmed='the gallon figure that separates non-bulk from bulk packaging (49 CFR 171.8) was not read')

# =====================================================================================================
# B. Environmental (federal): EPA Construction General Permit, asbestos-cement pipe, spills, SPCC, Corps permits, finds
# =====================================================================================================
T_CGP = 'Stormwater on the job: construction general permit, SWPPP, inspections, dewatering'
CGP_SRC = 'EPA 2022 Construction General Permit, as modified April 2025'
CGP_URL = 'https://www.epa.gov/system/files/documents/2025-04/2022-cgp-permit-as-modified.pdf'
CGP_ED = '2022 CGP as modified (effective April 8, 2025); expires February 16, 2027'
CGP_TAIL = (' These are the numbers in EPA\'s own permit. Most states write their own construction stormwater permit, usually close to this one, and the state permit is the one that governs there.')

fed('fed-epa-cgp-who-1', 'How big a job needs a stormwater permit and SWPPP: 1 acre. And where EPA\'s own permit applies', T_CGP,
    'Federal rule of thumb: a job that will disturb one or more acres of land needs stormwater permit coverage before dirt moves, and so does a smaller job that is part of a larger common plan '
    '(a phase of a subdivision, for example) that will disturb an acre or more in total (EPA 2022 Construction General Permit, Part 1.1.2). A long pipeline trench adds up: width of the disturbed strip times the length. '
    'In most states the state environmental agency issues the permit, with its own name, forms and fees. EPA\'s own permit (the CGP) is used only where EPA is the permitting authority (Part 1.1.3, Appendix B): '
    'all of Massachusetts, New Hampshire, New Mexico, the District of Columbia, Puerto Rico and the Pacific territories, plus Indian country in most states and many federal facilities and lands of exclusive federal jurisdiction. '
    'On an EPA job the Notice of Intent goes in "At least 14 calendar days before commencing construction activities." '
    'The 2022 CGP expires at 11:59 pm on February 16, 2027. EPA proposed a 2027 CGP on August 3, 2026; as of EPA\'s page dated November 17, 2026 it was not final. '
    'On a tribal or federal job in any state, ask which permit covers the site before assuming it is the state one.',
    CGP_SRC + ', Parts 1.1.2, 1.1.3, 1.4.3, Appendix B; EPA proposed 2027 CGP page (updated 2026-11-17)', CGP_URL, edition=CGP_ED)

fed('fed-epa-cgp-inspections-1', 'How often the SWPPP inspection is due: every 7 days, or 14 days plus after a 0.25 inch rain', T_CGP,
    'Under EPA\'s 2022 Construction General Permit the site picks one inspection schedule (Part 4.2): '
    'either "At least once every seven (7) calendar days", or once every 14 calendar days plus within 24 hours of a storm of 0.25 inches or more in 24 hours (or snowmelt that causes a discharge). '
    'Sites that drain to sensitive waters (impaired for sediment or nutrients, or high-quality waters) must inspect every 7 days and also within 24 hours of such a storm (Part 4.3). '
    'Fewer inspections are allowed for stabilized areas (twice in the first month, then monthly), in arid areas in the dry season or drought (monthly, plus after storms), and while the ground is frozen (Part 4.4). '
    'The inspector must be a "qualified person": for projects covered on or after February 17, 2023, someone who has passed EPA\'s construction inspection course and exam or holds a current equivalent certification (Parts 4.1, 6.3). '
    'What the inspection found has a clock too: a control that needs a new installation or a significant repair must be done within 7 calendar days of finding it; a simple fix (routine maintenance) by the close of the next business day (Part 5.2.1). '
    'Inspection reports are kept for at least 3 years after coverage ends.' + CGP_TAIL,
    CGP_SRC + ', Parts 4.1 to 4.4, 5.2.1, 6.3', CGP_URL, edition=CGP_ED)

fed('fed-epa-cgp-stabilization-1', 'Stabilization deadline (14 days), silt fence clean-out at half height, concrete washout', T_CGP,
    'Three field rules from EPA\'s 2022 Construction General Permit that crews get written up for. '
    'Stabilization (Part 2.2.14): where earth work has stopped for good, or will sit idle for 14 or more days, start stabilizing right away (seed and mulch, blanket, rock, pavement) and finish '
    '"as soon as practicable, but no later than 14 calendar days" after starting, on sites with 5 acres or less disturbed at one time. '
    'Sites with more than 5 acres open at once, and sites draining to sensitive waters, get 7 calendar days. '
    'Perimeter controls (Part 2.2.3): silt fence, wattles and berms go in before the dirt work upslope; remove built-up sediment '
    '"before it has accumulated to one-half of the above-ground height of any perimeter control." '
    'Concrete washout (Part 2.3.4): wash chutes, pumps and tools only into a "leak-proof container or leak-proof and lined pit"; never onto the ground, into a storm drain inlet, a ditch or the trench. '
    'Let it harden and haul it off. Paint, form oil and curing compound wash water are handled the same way.' + CGP_TAIL,
    CGP_SRC + ', Parts 2.2.3, 2.2.14 (Table 2), 2.3.4', CGP_URL, edition=CGP_ED)

fed('fed-epa-cgp-dewatering-1', 'Pumping the trench out to a ditch or storm drain: what to check (daily, no foam, no sheen, 50 NTU)', T_CGP,
    'Pumping water out of a trench or excavation to a ditch, creek or storm drain (dewatering) is a regulated discharge under EPA\'s 2022 Construction General Permit. '
    'What the water must look like (Part 2.4): "Do not discharge visible floating solids or foam", and the discharge must not cause "a visible sheen on the water surface". '
    'Run the pump discharge through a sediment control (dewatering bag, weir tank, sediment basin, or a well-vegetated area) and keep it from eroding the ground where it lands. '
    'Inspection (Part 4.3.2): the dewatering operation is inspected "once per day on which the discharge occurs." '
    'If the inspection finds a sediment plume, sheen, foam or a deposit at the outfall, the permit says to act right away: stop or reduce the discharge, fix the cause, and start pumping again only after the fix (Part 5.2.2). '
    'Sites that pump to sensitive waters must also sample the dewatering discharge for turbidity against a benchmark of 50 NTU (Part 3.3). '
    'Water that smells of fuel or solvent, or has a sheen before treatment, is not ordinary trench water: stop pumping and call the office, because contaminated groundwater needs its own permit or disposal.'
    + CGP_TAIL + ' Many cities also require a permit to pump into their storm drain or sewer.',
    CGP_SRC + ', Parts 2.4, 3.3, 4.3.2, 5.2.2', CGP_URL, edition=CGP_ED)

fed('fed-epa-cgp-paperwork-1', 'SWPPP paperwork for the office: NOI, plan on site, records 3 years, termination in 30 days', T_CGP,
    'Office checklist from EPA\'s 2022 Construction General Permit. '
    'Before work: write the stormwater pollution prevention plan (SWPPP) before filing the Notice of Intent (Part 7.1), and file the NOI "At least 14 calendar days before commencing construction activities" (Part 1.4.3). '
    'During work: keep a current SWPPP "at the site or at an easily accessible location" so it can be shown to an inspector (Part 7.3); update it when the controls or the plan change. '
    'Use a qualified inspector (EPA course and exam, or an equivalent current certification, for projects covered on or after February 17, 2023; Part 6.3). '
    'Log every corrective action and close it within the permit\'s deadlines (7 calendar days for a new or replaced control or significant repair). '
    'Records: keep inspection reports and the corrective action log "for at least three (3) years" after coverage ends (Parts 4.7.4, 5.4.4). '
    'After work: file the Notice of Termination "within 30 calendar days after any one of the conditions in Part 8.2 occurs", for example the site is finally stabilized or another operator has taken over (Part 8.4). '
    'A pipe subcontractor is often a co-operator or works under the general contractor\'s SWPPP: get that in writing and know which controls are yours to maintain.' + CGP_TAIL,
    CGP_SRC + ', Parts 1.4.3, 6.3, 7.1, 7.3, 4.7.4, 5.4.4, 8.4', CGP_URL, edition=CGP_ED)

T_AC = 'Asbestos-cement (AC, transite) pipe: federal rules for cutting, removing and bursting'
fed('osha-loi-acpipe-class-1', 'OSHA on tapping, cutting or removing asbestos-cement water pipe: Class II work, no "below the limit" exemption', T_AC,
    'OSHA letter of interpretation, May 29, 2007, on tapping and tying in to asbestos-cement (AC, transite) water pipe under the construction asbestos standard, 29 CFR 1926.1101. '
    'A competent person must classify the work. OSHA said removal of AC pipe "is normally Class II asbestos work." It can be Class III only when it is repair or maintenance work that disturbs a small amount, '
    'no more than fits in one glove bag or waste bag. If it is not clear, the employer "should assume the higher class applies." '
    'OSHA said AWWA\'s work practices for AC pipe "are generally compliant with OSHA\'s Asbestos Standard for construction". '
    'Required methods in the standard include wet methods, HEPA vacuums and prompt cleanup and bagging of waste; high-speed abrasive disc saws without controls, compressed air and dry sweeping are prohibited. '
    'In practice that means a snap cutter or a wet hand method, never a dry cut-off saw. '
    'Training: Class III workers need training that "shall take at least 16 hours" in the usual case; Class II workers need training with hands-on practice for the material and method. '
    'OSHA also rejected the idea that the standard does not apply when exposure is below the limit: a consultant "was in error when he stated that when an activity is below the PEL it is exempt". '
    'State rules can be stricter and some states require a licensed asbestos contractor.',
    'OSHA Standard Interpretation, May 29, 2007 (29 CFR 1926.1101(b), (g), (k)(9), (o)(4))', 'https://www.osha.gov/laws-regs/standardinterpretations/2007-05-29',
    edition='OSHA letter of interpretation dated May 29, 2007')

fed('fed-epa-acpipe-neshap-1', 'EPA asbestos rule for AC pipe jobs: the 260 ft line, 10 working day notice, keep it wet', T_AC,
    'EPA\'s asbestos air rule (the Asbestos NESHAP, 40 CFR Part 61 Subpart M) can apply to a job that removes or breaks up asbestos-cement (AC, transite) pipe. '
    'The amounts that trigger the full notice and work-practice rules in 40 CFR 61.145 are "At least 80 linear meters (260 linear feet) on pipes", '
    '160 square feet on other components, or 35 cubic feet where it could not be measured. '
    'Above the line, written notice goes to the air agency "At least 10 working days before asbestos stripping or removal work or any other activity begins". '
    'Work practices: "Adequately wet the material and ensure that it remains wet until collected and contained", and no visible dust to the outside air. '
    'EPA describes the normal way to take out AC pipe as open trench: expose it, and it is "wet-cut into 6- and 8-foot sections using a snap cutter or similar tool", wrapped, and hauled to a landfill that takes asbestos waste. '
    '"All ACWM must be kept adequately wet and sealed in leak-tight containers." '
    'AC pipe in good shape is treated as non-friable until it is crumbled, sanded, sawn or ground; breaking it up is what makes it regulated waste. '
    'A short tie-in on one stick is normally under the 260 ft line, but OSHA\'s worker rules apply at any length. State and local air agencies run this program and often have lower thresholds and their own notice forms.',
    '40 CFR 61.145(a), (b)(3), (c); EPA notice 84 FR 26852 (June 10, 2019)', LII + '40/61.145', conf='medium')

fed('fed-epa-acpipe-bursting-1', 'Pipe bursting asbestos-cement pipe: EPA has not approved it as an alternative (2019 notice)', T_AC,
    'Pipe bursting or reaming an old asbestos-cement (AC, transite) main breaks the pipe into fragments and leaves them in the ground. '
    'In its Federal Register notice of June 10, 2019 (84 FR 26852) EPA said it "neither approved pipe bursting nor pipe reaming as AWPs to replace A/C pipe" (AWP means alternative work practice). '
    'EPA said bursting or reaming more than the threshold amount of AC pipe has to follow the Asbestos NESHAP, including the standards for an active asbestos waste disposal site (40 CFR 61.154) '
    'and, where the broken pipe is left in the ground, the standards for an inactive site (40 CFR 61.151), which bring record and deed-notice type duties for the owner. '
    'In the same notice EPA approved one trenchless method, "close tolerance pipe slurrification (CTPS)", which grinds the old pipe into a wet slurry that is pumped out and disposed of as asbestos waste; '
    'it was approved on May 30, 2019 with required inspections, wetting, sampling and landfill disposal. '
    'So before bidding or starting a burst on an AC main, get the owner\'s and the air agency\'s position in writing. Some states have their own written policy on AC pipe bursting. '
    'Abandoning an AC main in place without breaking it is a different case and is commonly allowed by owners.',
    'EPA, Notice of Final Approval: Alternative Work Practice Standard for Asbestos Cement Pipe Replacement, 84 FR 26852 (June 10, 2019)',
    'https://www.govinfo.gov/content/pkg/FR-2019-06-10/html/2019-12085.htm', edition='84 FR 26852, June 10, 2019', effective='2019-06-10')

T_SPILL = 'Fuel and oil on the job: spill reporting and fuel storage rules'
fed('fed-epa-spill-report-1', 'Fuel or oil spill that reaches water: call the National Response Center, 1-800-424-8802', T_SPILL,
    'Federal rule (40 CFR Part 110, the "sheen rule"): an oil discharge to water must be reported when it is a harmful quantity, which EPA explains as oil that '
    '"violates state water quality standards, causes a film or sheen on the water\'s surface" or "leaves sludge or emulsion beneath the surface". '
    'Oil means diesel, gasoline, hydraulic oil, motor oil and the like. There is no gallon minimum: a sheen on a creek, a ditch that runs to a creek, a lake or a storm drain that leads to them is enough. '
    'The person in charge must notify the National Response Center "immediately after he or she has knowledge of the discharge": "1-800-424-8802 or 1-202-267-2675", staffed 24 hours by the Coast Guard. '
    'On the job: stop the source (shut the machine down, close the valve), keep it out of inlets and water with absorbent booms, pads or a dirt berm, call the foreman and the office, then make the calls. '
    'Most states also require a call to the state spill line, often for spills on the ground above a set number of gallons even with no water involved, and the project stormwater plan will list the numbers. '
    'A blown hydraulic hose over dirt, cleaned up with the soil dug out and disposed of properly, is normally not a federal report, but check the state rule. Never wash a spill down with water or cover it with dirt and walk away.',
    'EPA, 40 CFR Part 110 Discharge of Oil regulation FAQ ("When must I report an oil discharge to NRC?")',
    'https://www.epa.gov/faqs/search/topics/40-cfr-part-110-discharge-oil-regulation-304551/topics/qapp-339598', edition='EPA FAQ page read 2026-11-20 (rule: 40 CFR Part 110)')

fed('fed-epa-spcc-1', 'When a yard or job site needs an SPCC plan: more than 1,320 gallons of oil in tanks and drums', T_SPILL,
    'EPA\'s Spill Prevention, Control and Countermeasure (SPCC) rule, 40 CFR Part 112, generally applies to a site that stores oil and has a '
    '"total aggregate capacity of aboveground oil storage containers greater than 1,320 gallons" and that "Has the potential to discharge oil in quantities that may be harmful into navigable waters or adjoining shorelines." '
    'Oil includes diesel, gasoline, hydraulic and motor oil, and used oil. Count the capacity of the containers, not what is in them today: a 1,000 gallon diesel tank plus a 500 gallon tank is 1,500 gallons and is over the line. '
    'A covered site needs a written SPCC plan, secondary containment for bulk containers (a double-wall tank or a dike or tub that holds the contents), regular inspections, and trained people. '
    'An engineer must certify the plan if "total oil storage capacity exceeds 10,000 gallons"; at or below that the owner may be able to self-certify. '
    'For a pipe crew this usually comes up at the company yard, or on a long job with a fuel tank farm. Below the line, good practice is the same anyway: double-wall or contained tanks, away from inlets and water, with a spill kit at the fueling spot. '
    'Which small containers count toward the 1,320 gallons (EPA\'s rule text counts containers of 55 gallons and up) was not confirmed from the rule text for this chunk.',
    'EPA Region 9 SPCC compliance fact sheet (September 2025); 40 CFR Part 112', 'https://www.epa.gov/system/files/documents/2025-11/spcc-compliance-factsheet_0.pdf',
    conf='medium', edition='EPA fact sheet, September 2025', unconfirmed='the 55 gallon minimum container size for counting capacity (40 CFR 112.1) was not read in the rule text')

fed('fed-usace-nwp-2026-1', 'Creek, ditch and wetland crossings: Corps of Engineers nationwide permits were reissued for 2026', 'Working in or near streams and wetlands: Corps permits',
    'Laying pipe across a stream, a wetland or some ditches is work in "waters of the United States" and needs authorization from the U.S. Army Corps of Engineers under the Clean Water Act (Section 404), '
    'usually through a nationwide permit (NWP) that the owner or engineer obtains before the job. '
    'The nationwide permits were reissued in 2026: the Corps published them in the Federal Register on January 8, 2026 ("The 56 reissued and one new nationwide permit in the final action"). '
    '"The nationwide permits in this action take effect March 15, 2026." "The 2021 permits are set to expire March 14, 2026." '
    'What this means on the job: the crossing has a permit with conditions that the crew has to follow, such as the limits of disturbance at the crossing, how the trench is backfilled and the bank restored, '
    'where spoil can and cannot be piled, timing windows for fish, and keeping equipment out of the water. Ask for the permit and its conditions before working at a crossing, and do not widen the work area on your own. '
    'A job permitted under the 2021 permits that was not finished may need its authorization checked against the 2026 permits; the terms of the 2026 utility line permits were not read for this chunk and are not confirmed here. '
    'States add their own water quality certification and stream permits.',
    'U.S. Army Corps of Engineers news release, January 8, 2026 (2026 nationwide permits; 91 FR, Jan. 8, 2026)',
    'https://www.mvk.usace.army.mil/Media/News-Releases/Article/4373633/us-army-corps-of-engineers-announces-publication-of-2026-nationwide-permits/',
    conf='medium', edition='2026 Nationwide Permits', effective='2026-03-15', unconfirmed='terms and acreage limits of the 2026 utility line nationwide permits were not read')

fed('fed-achp-discovery-1', 'Bones, artifacts or old foundations in the trench: stop and call it in', 'Unexpected finds in the trench: human remains and artifacts',
    'If the bucket turns up bones that could be human, a burial, arrowheads or other artifacts, old bottles and foundations, or anything that looks like an archaeological site: '
    'stop digging at that spot, keep people and equipment off it, do not move or pocket anything, and call the foreman, who calls the owner or inspector. Possible human remains also means a call to the police or the county coroner or medical examiner. '
    'On a job with federal money, a federal permit or federal land, the project went through historic review (Section 106), and 36 CFR 800.13 covers a find after construction has started: '
    'the federal agency must "make reasonable efforts to avoid, minimize or mitigate adverse effects" and, once construction is under way, notify the state or tribal historic preservation officer, affected tribes and the Advisory Council within 48 hours of the discovery; they have 48 hours to respond. '
    'Many projects have a written "inadvertent discovery plan" in the permit or specs that names who to call: ask for it at the preconstruction meeting. '
    'State law usually has its own stop-work rule for human remains. For example the California Health and Safety Code, section 7050.5, says "there shall be no further excavation or disturbance of the site" until the county coroner has decided, '
    'and the coroner calls the Native American Heritage Commission within 24 hours if the remains may be Native American. Work can usually go on elsewhere on the job while the spot is checked.',
    '36 CFR 800.13(b) (post-review discoveries); Cal. Health and Safety Code 7050.5(b)-(c) as an example of state law',
    'https://codes.findlaw.com/cfr/title-36-parks-forests-and-public-property/cfr-sect-36-800-13/', conf='medium',
    edition='36 CFR Part 800 as shown on codes.findlaw.com, read 2026-11-20')

# =====================================================================================================
# C. Office: certified payroll timing, Miller Act
# =====================================================================================================
fed('fed-dol-certified-payroll-due-1', 'Certified payroll deadline on federal jobs: 7 days after payday, keep 3 years', 'Prevailing wage paperwork: certified payroll and payment bonds',
    'On Davis-Bacon (federally funded or assisted) construction, each contractor and subcontractor turns in a weekly certified payroll with a signed statement of compliance. '
    '29 CFR 3.4 sets the deadline: the statement is delivered "within 7 days after the regular payment date of the payroll period". The 7 days run from the regular payday for that week, not from the end of the work week. '
    'It goes to the agency\'s representative at the site; if there is none, it is mailed or sent another reliable way to the agency contracting for or financing the work, inside the same 7 days. '
    'On most jobs the subcontractor sends it up through the prime contractor, who is responsible for all tiers, and many agencies now require their own online system. '
    'Records: the certified payrolls are kept for 3 years after all the work on the prime contract is completed, and the contractor keeps its own payroll records (names, classifications, rates, hours, deductions, fringe payments) for the same time. '
    'A week with no work on the job is commonly reported as a "no work" payroll so the numbering stays continuous; check what the agency wants. '
    'State prevailing wage jobs have their own forms and deadlines (see the state chunks in the library).',
    '29 CFR 3.4 (submission of weekly statements and preservation and inspection of weekly payroll records)', LII + '29/3.4')

fed('fed-law-miller-act-1', 'Not getting paid on a federal job: the Miller Act payment bond (90 day notice, 1 year to sue)', 'Prevailing wage paperwork: certified payroll and payment bonds',
    'You cannot lien federal property. Instead the Miller Act (40 U.S.C. 3131 to 3134) makes the prime contractor post a payment bond "Before any contract of more than $100,000 is awarded" for a federal construction job '
    '(the acquisition regulations set the working threshold higher; the library\'s bonds chunk gives $150,000). '
    'Who can claim: subcontractors and suppliers who dealt directly with the prime, and second-tier subs and suppliers who dealt with a first-tier subcontractor. Third tier and below are generally not covered. '
    'First tier (contract with the prime): no notice is needed; a claimant who "has not been paid in full within 90 days after the day on which the person did or performed the last of the labor" or furnished the last material may sue on the bond. '
    'Second tier (contract with a subcontractor, none with the prime): must give "written notice to the contractor within 90 days" of its last labor or material, stating the amount and who the work was done for, '
    'sent "by any means that provides written, third-party verification of delivery to the contractor" (certified mail or a delivery service with a receipt). '
    'Deadline to sue for everyone: the suit "must be brought no later than one year after the day on which the last of the labor was performed" or material supplied. Punch-list and warranty work may not extend that date. '
    'A waiver of these rights signed before the work is done is void. Get the bond copy from the contracting officer at the start of the job. For a real claim, use a construction attorney: the dates are strict.',
    '40 U.S.C. 3131(b), 3133(b)(1), (b)(2), (b)(4), (c) (U.S. Code 2023 edition)',
    'https://www.govinfo.gov/content/pkg/USCODE-2023-title40/html/USCODE-2023-title40-subtitleII-partA-chap31-subchapIII.htm', edition='U.S. Code, 2023 edition')

# =====================================================================================================
# D. Consensus standard, OUR SUMMARY ONLY: AWWA C651 (2014 edition read; a 2023 edition exists and was not read)
# =====================================================================================================
T_651 = 'Disinfecting new water mains and repairs (AWWA C651): doses, sampling, cut-ins'
C651_URL = 'https://thebluemountains.ca/sites/default/files/2023-05/ANSI%20AWWA%20C651-14%20Disinfecting%20Water%20Mains.pdf'
C651_ED = 'ANSI/AWWA C651-14 (effective Feb. 1, 2015); a C651-23 edition exists and was not read'
C651_TAIL = (' These numbers are from the 2014 edition. A 2023 edition exists and was not read, so whether it changed any of them is not confirmed. '
             'The spec and the water agency name the edition and can be stricter; state health rules also apply.')
def std(id, title, text, source):
    B.add(id=id, state='US', title=title, topic=T_651, text=text + C651_TAIL, source=source, url=C651_URL, checked=D, edition=C651_ED,
          confidence='medium', kind='summary', license='summary', unconfirmed='whether the 2023 edition changed these numbers')

std('std-awwa-c651-methods-1', 'Chlorinating a new water main: tablet, continuous feed and slug doses and hold times (AWWA C651-14)',
    'AWWA C651-14 gives three main ways to disinfect a new main. '
    'Tablet method (Sec. 4.3): calcium hypochlorite tablets glued in the top of each pipe as it is laid, for a dose of 25 mg/L; fill slowly, no faster than 1 ft per second; hold at least 24 hours, or 48 hours when the water is colder than 41 F; '
    'a free chlorine residual of at least 0.2 mg/L must still be found at every sample point at the end. Only for mains kept clean and dry during laying. '
    'Continuous feed (Sec. 4.4): first flush the main at 3.0 ft per second or more, then refill while feeding chlorine for 25 mg/L throughout; hold 24 hours; at least 10 mg/L free chlorine must remain at the end. '
    'Slug method (Sec. 4.5): move a slug of water dosed to 100 mg/L slowly down the main so every part of the wall sees it for at least 3 hours; if the slug falls below 50 mg/L, stop, move the feed point and bring it back to 100 mg/L. '
    'Large mains that can be entered may be sprayed with 200 mg/L for 30 minutes (Sec. 4.6). '
    'Operate every valve and hydrant while the strong chlorine is in the line. Then flush until the chlorine is back to normal system level, dechlorinate the flush water before it reaches a storm drain or stream, and take bacteriological samples.',
    'AWWA C651-14, Sections 4.3, 4.4, 4.5, 4.6 (our summary; facts only)')

std('std-awwa-c651-bact-1', 'Bac-T samples on a new water main: two sets, 16 hours, every 1,200 ft (AWWA C651-14)',
    'After final flushing, AWWA C651-14 (Sec. 5.1) requires two sets of bacteriological samples that both pass, taken one of two ways. '
    'Option A: take a first set, then take a second set at least 16 hours later. '
    'Option B: let the flushed main sit for at least 16 hours with no water use, then take two sets at least 15 minutes apart with the sample taps left running and without flushing the main first. '
    'Where to sample: a set for every 1,200 ft of new main, plus one at the end of the line and at least one from each branch longer than one pipe length. '
    'If trench water or a lot of dirt got into the main during laying, sample about every 200 ft. '
    'If a sample fails: flush and sample again; if it still fails, chlorinate again by the continuous feed or slug method and repeat until both sets pass. '
    'A high plate count (HPC over 500 per mL) also means more flushing. '
    'Use a sample tap such as a corporation stop with a copper gooseneck, not a hydrant or a hose, and bottles from the lab with the chlorine neutralizer in them. '
    'Older specs written on the 2005 edition ask for two sets 24 hours apart. Do not tie in or open the valves to customers until the lab results are back and the water agency releases the main.',
    'AWWA C651-14, Sections 5.1.1, 5.1.4, 5.1.6 (our summary; facts only)')

std('std-awwa-c651-repairs-1', 'Disinfecting a cut-in, repair or final tie-in: 1 percent chlorine swab and the 20 ft rule (AWWA C651-14)',
    'AWWA C651-14 treats tie-ins and repairs differently from a whole new main. '
    'Final connection to the existing main (Sec. 4.10): tie-in piping up to one pipe length, generally 20 ft or less, may be sprayed or swabbed inside with at least a 1 percent chlorine solution just before it goes in. '
    'A longer connection must be set up above ground, disinfected and pass bacteriological samples before it is installed. '
    'Repairs (Sec. 4.11): if the main stayed under pressure and the leak was controlled (a clamp on a live main), swab or spray the parts with 1 percent chlorine and flush; no samples are needed. '
    'If the main was shut down and depressurized but kept from contamination, disinfect the exposed pipe and the reachable inside surfaces and all new parts with 1 percent chlorine, '
    'flush about three pipe volumes until the water runs clear, and take a set of samples downstream; the main may go back in service before the results come back. '
    'If dirty water got into the main (the trench flooded over the open pipe), disinfect it like a new main where practical and get passing samples before service unless the water agency allows otherwise. '
    'Keep the trench pumped below the pipe while it is open. A 1 percent solution is roughly 1 part of fresh 5 to 8 percent household bleach to 4 to 7 parts water; mix it fresh.',
    'AWWA C651-14, Sections 4.10, 4.11, 5.1.2 (our summary; facts only)')

# =====================================================================================================
# E. State chunks: stormwater permit (env), right-of-way permits (row), state rules (spec, lic)
# =====================================================================================================
B.add(id='env-tx-cgp-1', state='TX', title='Texas construction stormwater permit TXR150000: 1 acre, small and large sites, SWP3',
      topic=T_CGP, checked=D, confidence='high', kind='summary', license='gov-state',
      text='Texas issues its own construction stormwater permit through TCEQ: the Construction General Permit, TXR150000. The current permit took effect March 5, 2023 and "expires on March 5, 2028." '
           'It covers construction that discharges stormwater to surface water in the state and will "disturb an acre or more of soil", including smaller sites that are part of a larger common plan. '
           'Small sites: "Small construction activities which disturb at least 1 but less than 5 acres" need a stormwater pollution prevention plan (Texas calls it the SWP3) and a signed site notice posted at the site; no Notice of Intent is filed with the state. '
           'Large sites: "Large construction activities which disturb 5 or more acres" need the SWP3, a Notice of Intent filed online through STEERS (or with an electronic reporting waiver), and the large-site notices posted. '
           'In every case operators must "develop and implement a Stormwater Pollution Prevention Plan (SWP3) prior to commencing construction." '
           'Sites under 1 acre that are not part of a larger plan are "not regulated by this general permit", though the city may have its own rules. '
           'TCEQ held a stakeholder meeting on June 9, 2026 to start the 2028 renewal. A pipe subcontractor usually works under the general contractor\'s SWP3: find out who the operators are and which controls are yours.',
      source='TCEQ, Stormwater General Permit for Construction Activities (TXR150000), page modified 2026-11-16',
      url='https://www.tceq.texas.gov/permitting/stormwater/construction/index', edition='TXR150000, 2023 permit', effective='2023-03-05')

T_ROW = 'Working in the state highway right of way: encroachment and utility permits'
B.add(id='row-ca-encroachment-1', state='CA', title='California state highway encroachment permit (Caltrans): form TR-0100, CEPS, 60 days',
      topic=T_ROW, checked=D, confidence='high', kind='summary', license='gov-state',
      text='In California, any work in, under or over a state highway right of way needs a Caltrans encroachment permit before it starts: utility trenches and bores, potholing, driveways, surveys, traffic control set up on the highway, even tree trimming. '
           'The law treats "any tower, pole, pole line, pipe, pipeline, fence, billboard, stand or building" placed in the right of way as an encroachment. '
           'How to apply: the Standard Encroachment Permit Application, form TR-0100, with plans and traffic control, goes to the Caltrans district the job is in. '
           'Caltrans says "Effective January 1, 2025, you will be required to submit all permit applications through CEPS", its online Encroachment Permit System. '
           'Time: under Streets and Highways Code section 671.5, Caltrans must approve or deny a complete application "within 60 calendar days"; an incomplete package restarts the wait, so plan months, not weeks. '
           'Cost: a deposit at submittal, then actual review and inspection time at the Standard Hourly Rate, $181 per hour effective January 1, 2026. '
           'On the job: keep the permit and approved plans on site, call the Caltrans inspector named on the permit before starting (the permit gives the notice time), and follow its work hours and lane closure charts. '
           'City and county streets are separate: each city or county issues its own encroachment or excavation permit.',
      source='Caltrans Encroachment Permits program page; Streets and Highways Code 671.5(a); read 2026-11-20',
      url='https://dot.ca.gov/programs/traffic-operations/ep', edition='Caltrans web page, 2026 (hourly rate effective 2026-01-01)')

B.add(id='row-tx-uir-1', state='TX', title='Texas state highway utility permit: the TxDOT UIR system and notice of proposed installation',
      topic=T_ROW, checked=D, confidence='medium', kind='summary', license='gov-state',
      text='In Texas, putting a utility line in, under or across a state highway right of way goes through TxDOT\'s Utility Installation Review (UIR) system. '
           'TxDOT describes UIR as "a web-based system that automates the submission, review, approval, inspection, and post-construction processing" of '
           '"utility installation requests on the state right of way (ROW)". TxDOT calls the request a notice of proposed installation (NOPI). '
           'The utility owner (the city, water district, MUD or utility company), not the pipe contractor, is the applicant: it files the request with plans in UIR, and the TxDOT district reviews and approves it. '
           'The rules for where and how a line can go (depth, casing, bore versus open cut, distance from pavement) are in TxDOT\'s Utility Accommodation Rules and its Utility Manual. '
           'For the crew: do not start in TxDOT right of way without the approved request in hand; keep a copy on site; give the district office the advance notice the approval calls for; and build what was approved, since changes go back through UIR. '
           'Review times and the exact notice period before starting were not confirmed from the TxDOT pages read for this chunk; get them from the approval and the district utility coordinator. '
           'County roads and city streets have their own permits.',
      source='TxDOT Utility Installation Review (UIR) help pages, About UIR; read 2026-11-20',
      url='https://apps3.dot.state.tx.us/apps/UIRPROv2/UIR_HELP/TxDOT/About_UIR.htm', edition='TxDOT UIR online help, read 2026-11-20',
      unconfirmed='review time and the start-of-work notice period')

B.add(id='row-fl-utility-permit-1', state='FL', title='Florida state road utility permit (FDOT): the Utility Accommodation Manual',
      topic=T_ROW, checked=D, confidence='medium', kind='summary', license='gov-state',
      text='In Florida, utility work in a state road right of way needs an FDOT utility permit. Rule 14-46.001 of the state administrative code says its purpose is to '
           '"regulate the location and manner for installation and adjustment of utility facilities" on FDOT right of way, and that FDOT issues permits for the '
           '"construction, alteration, operation, relocation, removal, and maintenance of utilities." '
           'The rule adopts the FDOT Utility Accommodation Manual (UAM), "2017 edition", effective July 30, 2017. FDOT says utilities must be installed '
           '"in accordance with the 2017 Utility Accommodation Manual (UAM)", the permit and any agreement with the department. '
           'The UAM sets the depth of cover, where open cuts are allowed and where a bore is required, restoration, and traffic control. '
           'The permit is issued to the utility owner (FDOT calls it the utility/agency owner, UAO); the contractor works under it. '
           'For the crew: have the approved permit and plans on site, give the notice before starting that the permit states, and follow the permit\'s lane closure and restoration conditions. '
           'How to file (FDOT\'s online permitting site) and the review time were not confirmed from the pages read for this chunk; the FDOT district utility office will say. '
           'County and city roads have their own right-of-way permits.',
      source='Fla. Admin. Code R. 14-46.001 (amended 7/30/2017); FDOT Utilities FAQ; read 2026-11-20',
      url='https://www.law.cornell.edu/regulations/florida/Fla-Admin-Code-Ann-R-14-46-001', edition='FDOT Utility Accommodation Manual, 2017 edition',
      effective='2017-07-30', unconfirmed='how to file online and the review time')

B.add(id='spec-fl-dep-main-disinfection-1', state='FL', title='Florida bac-T rule for new water mains: two samples on separate days, 6 hours apart',
      topic=T_651, checked=D, confidence='high', kind='summary', license='gov-state',
      text='Florida sets its own sampling rule for new and altered public water mains in Rule 62-555.340 of the state administrative code (Department of Environmental Protection). '
           'Disinfection must follow "AWWA Standard C651, C652, or C653" (C651 is the one for water mains). '
           'Then, at each sampling location, the rule requires "a total of at least two samples - each taken on a separate day and taken at least six hours apart from the other sample(s)". '
           'If any sample shows total coliform, sampling goes on "until two consecutive samples at each sampling location show the absence of total coliform." '
           'The sampling locations are the ones called for in the AWWA standard (for mains: along the line at set spacing, at the end, and on branches). '
           'So in this state the two sets cannot both be pulled the same day, even though the 2014 edition of AWWA C651 has an option for two sets 15 minutes apart after the main sits 16 hours. '
           'The main cannot be placed in service until the department or county health unit clears it based on the results. '
           'The rule text read was last amended August 28, 2003; check with the permitting office for any newer requirement in the construction permit.',
      source='Fla. Admin. Code R. 62-555.340 (amended 8-28-03); read 2026-11-20',
      url='https://www.law.cornell.edu/regulations/florida/Fla-Admin-Code-Ann-R-62-555-340', edition='Rule 62-555.340 as amended 8-28-03', effective='2003-08-28')

B.add(id='lic-ca-prelim-notice-1', state='CA', title='California 20-day preliminary notice: protecting the right to get paid (private and public jobs)',
      topic='Getting paid: preliminary notices, liens and stop payment notices', checked=D, confidence='high', kind='summary', license='gov-state',
      text='In California a subcontractor or supplier keeps its right to a mechanics lien, a stop payment notice or a payment bond claim by giving a preliminary notice early in the job. '
           'Private jobs (Civil Code 8204): the notice is due "not later than 20 days after the claimant has first furnished work" on the job. '
           'A late notice still helps, but then the lien, stop payment notice or bond claim only covers work "performed within 20 days prior to the service of the preliminary notice" and after it. So every day late is money that can no longer be secured. '
           'Public works (Civil Code 9300): before giving a stop payment notice or making a payment bond claim, the claimant gives preliminary notice to "The public entity." and "The direct contractor to which the claimant provides work." '
           'Two groups do not have to give it on public works: "A laborer is not required to give preliminary notice", and neither is a claimant with a direct contract with the direct (prime) contractor. '
           'So a pipe sub hired by the general contractor on a city job is exempt, but its pipe supplier and its own subs are not. Public property cannot be liened; the stop payment notice and the payment bond are the remedies there. '
           'Office habit that works: send the notice by certified mail on every job in the first week, before there is any problem. For a real claim, the later deadlines are strict: use a construction attorney.',
      source='Cal. Civil Code 8204 and 9300 (as shown on california.public.law); read 2026-11-20',
      url='https://california.public.law/codes/ca_civ_code_section_8204', edition='California Civil Code as shown 2026-11-20',
      note='No library collection exists for state payment / lien law; filed under lic- for now. The architecture helper should say where it belongs.')

if __name__ == '__main__':
    live = json.load(open(os.path.join(HERE, '../ask_nationwide_nov20/work/kb_live.json')))
    ex = {c['id'] for l in live.values() for c in l}
    B.write(existing_ids=ex)
    n = [len(c['text']) for c in B.chunks]
    print('chunks', len(n), 'text chars min/avg/max', min(n), sum(n) // len(n), max(n))
