# trims.py: tightening applied to the finished chunk text by build_lib_more.py so the most-asked answer cards fit the 1,200 character
# "core" limit (lib_kb.py). Each pair must match exactly once in that chunk's text. '*' applies to every chunk that contains the phrase.
ALL = [
 (" These are the federal rules for trucks that cross state lines or carry interstate freight. A truck that never leaves the state follows that state's version, which is usually close but can have different weights or hours, so check with the state.",
  " These are the federal (interstate) rules. A truck that never leaves the state follows that state's version, usually close: check with the state."),
 (" These are the numbers in EPA's own permit. Most states write their own construction stormwater permit, usually close to this one, and the state permit is the one that governs there.",
  " These are EPA's own permit numbers. Most states issue their own permit, usually close to this, and the state permit governs there."),
 (" These numbers are from the 2014 edition. A 2023 edition exists and was not read, so whether it changed any of them is not confirmed. The spec and the water agency name the edition and can be stricter; state health rules also apply.",
  " From the 2014 edition; a 2023 edition exists and was not read, so any change there is not confirmed. The spec, the water agency and state health rules govern."),
]
T = {
'fed-fmcsa-cmv-10001-1': [
 ("There are two federal weight lines, and crews mix them up. ", "Two federal weight lines get mixed up. "),
 (" A pickup rated under 10,001 lb that pulls nothing, or a light trailer that keeps the total under 10,001 lb, is below the line.", ""),
 ("So a 3/4 ton or 1 ton work pickup pulling a mini excavator or a loaded dump trailer is usually over 10,001 lb combined, even though nobody needs a CDL to drive it. ", "So a 1 ton pickup pulling a mini excavator is usually over 10,001 lb combined, with no CDL needed. ")],
'fed-fmcsa-hos-limits-1': [
 (" Breaks and time on the job site do not stop that clock.", " Breaks do not stop that clock."),
 ("; the break can be off duty or on duty not driving (fueling or loading counts). Short-haul drivers are excused from this break. ", " (off duty, or on duty not driving). Short-haul drivers are excused. "),
 ("Bad weather or a wreck nobody could have known about before dispatch allows up to 2 more hours to finish the run (395.1(b)(1)). ", "Unexpected bad weather or traffic allows up to 2 more hours (395.1(b)(1)). "),
 ("These limits stop the driving, not the work: a worker past 14 hours can keep working but cannot drive the commercial truck.", "The limits stop the driving, not the work.")],
'fed-fmcsa-hos-shorthaul-1': [
 ("Most pipe crews do not need a logbook or an electronic log because of the short-haul exception in 49 CFR 395.1(e). ", "Most pipe crews need no logbook because of the short-haul exception, 49 CFR 395.1(e). "),
 ("In both cases the company must keep time records for 6 months that show the time the driver reports, total hours on duty, and the time released each day. ", "The company keeps time records for 6 months (time in, time out, total hours each day). "),
 ("Short-haul drivers are also excused from the 30 minute driving break. ", ""),
 ("On a day the driver breaks the exception (goes past the radius or the hours), a regular log is required for that day.", "On a day the driver goes past the radius or the hours, a regular log is required.")],
'fed-fmcsa-hos-onduty-1': [
 (" It lists driving, inspecting or servicing the truck, loading and unloading, time waiting to be dispatched, and \"any other work for a motor carrier\", plus paid work for anyone else. ", " It includes driving, servicing the truck, loading, and \"any other work for a motor carrier\". "),
 ("Someone else who is inside their hours has to drive, or the truck stays. The weekly 60 or 70 hour count also includes all the trench hours. Plan long days (shutdowns, tie-ins, night work) with this in mind.", "Someone inside their hours has to drive, or the truck stays. The weekly 60 or 70 hour count includes the trench hours too.")],
'fed-fmcsa-hos-construction-1': [
 (" (water, sewer, gas, power, phone)", ""),
 ("; a state may set 50 to 75 air miles for moves inside that state, and placarded hazardous materials are not covered. ", "; a state may set 50 to 75 air miles for in-state moves. ")],
'fed-fmcsa-dvir-1': [
 ("review the last driver vehicle inspection report if one was required, and sign it to show the listed repairs were certified as done. ", "review the last inspection report if one was required, and sign it. "),
 (" covering at least the service brakes including trailer brake connections, parking brake, steering, lights and reflectors, tires, horn, wipers, mirrors, coupling devices, wheels and rims, and emergency equipment. ", " covering at least brakes (including trailer brake connections), steering, lights, tires, horn, wipers, mirrors, coupling devices, wheels and emergency equipment. "),
 (" So for property-carrying trucks a report is written only when something is wrong. ", " "),
 ("The company must fix any defect that affects safety before the truck goes out again and certify the repair (or that no repair was needed) on the report, and keep the report", "The company must fix safety defects before the truck goes out again, certify it on the report, and keep it"),
 (" The report rule does not apply to \"a motor carrier operating only one commercial motor vehicle\".", "")],
'fed-phmsa-fuel-cans-1': [
 ("Fuel a crew carries for its own saws, pumps and plates is a \"material of trade\". Under 49 CFR 173.6 a material of trade moved by truck is not subject to the rest of the hazardous materials rules (no placards, no shipping papers) if it stays inside these limits. ", "Fuel a crew carries for its own saws and pumps is a \"material of trade\": under 49 CFR 173.6 no placards or shipping papers are needed inside these limits. "),
 (" Containers must be closed, secured against moving, and marked with the common name of what is inside (\"gasoline\").", " Cans must be closed, secured and marked \"gasoline\".")],
'fed-epa-cgp-who-1': [(" A long pipeline trench adds up: width of the disturbed strip times the length.", " A long trench adds up: width disturbed times length.")],
'fed-epa-cgp-stabilization-1': [("Three field rules from EPA's 2022 Construction General Permit that crews get written up for. ", "Three field rules from EPA's 2022 Construction General Permit. ")],
'fed-epa-cgp-inspections-1': [
 ("Sites that drain to sensitive waters (impaired for sediment or nutrients, or high-quality waters) must inspect every 7 days and also within 24 hours of such a storm (Part 4.3). ", "Sites draining to sensitive waters inspect every 7 days and within 24 hours of such a storm (Part 4.3). "),
 ("Fewer inspections are allowed for stabilized areas (twice in the first month, then monthly), in arid areas in the dry season or drought (monthly, plus after storms), and while the ground is frozen (Part 4.4). ", "Fewer are allowed for stabilized areas, arid areas in the dry season, and frozen ground (Part 4.4). "),
 ("What the inspection found has a clock too: a control that needs a new installation or a significant repair must be done within 7 calendar days of finding it; a simple fix (routine maintenance) by the close of the next business day (Part 5.2.1). Inspection reports are kept for at least 3 years after coverage ends.", "Fixes have a clock: a new or replaced control or a significant repair within 7 calendar days; routine maintenance by the close of the next business day (Part 5.2.1).")],
'fed-epa-cgp-dewatering-1': [
 ("Run the pump discharge through a sediment control (dewatering bag, weir tank, sediment basin, or a well-vegetated area) and keep it from eroding the ground where it lands. ", "Run the discharge through a sediment control (dewatering bag, weir tank, basin or thick vegetation) and do not let it erode where it lands. "),
 ("If the inspection finds a sediment plume, sheen, foam or a deposit at the outfall, the permit says to act right away: stop or reduce the discharge, fix the cause, and start pumping again only after the fix (Part 5.2.2). ", "If it shows a plume, sheen or foam, stop or cut the discharge right away and fix the cause before pumping again (Part 5.2.2). "),
 ("Water that smells of fuel or solvent, or has a sheen before treatment, is not ordinary trench water: stop pumping and call the office, because contaminated groundwater needs its own permit or disposal.", "Water that smells of fuel or has a sheen is not ordinary trench water: stop pumping and call the office."),
 (" Many cities also require a permit to pump into their storm drain or sewer.", "")],
'osha-loi-acpipe-class-1': [
 ("OSHA letter of interpretation, May 29, 2007, on tapping and tying in to asbestos-cement (AC, transite) water pipe under the construction asbestos standard, 29 CFR 1926.1101. ", "OSHA letter of May 29, 2007 on tapping and tying in to asbestos-cement (AC, transite) water pipe under 29 CFR 1926.1101. "),
 ("OSHA said AWWA's work practices for AC pipe \"are generally compliant with OSHA's Asbestos Standard for construction\". ", ""),
 ("Required methods in the standard include wet methods, HEPA vacuums and prompt cleanup and bagging of waste; high-speed abrasive disc saws without controls, compressed air and dry sweeping are prohibited. ", "Required: wet methods, HEPA vacuums, prompt cleanup and bagging of waste. Prohibited: high-speed abrasive disc saws without controls, compressed air, dry sweeping. "),
 ("OSHA also rejected the idea that the standard does not apply when exposure is below the limit: a consultant", "Being under the exposure limit does not exempt the work: a consultant"),
 ("State rules can be stricter and some states require a licensed asbestos contractor.", "State rules can be stricter.")],
'fed-epa-acpipe-neshap-1': [
 ("160 square feet on other components, or 35 cubic feet where it could not be measured. ", "or 160 square feet on other components. "),
 (" State and local air agencies run this program and often have lower thresholds and their own notice forms.", " State and local air agencies often have lower thresholds."),
 ("AC pipe in good shape is treated as non-friable until it is crumbled, sanded, sawn or ground; breaking it up is what makes it regulated waste. ", "")],
'fed-epa-acpipe-bursting-1': [(", which bring record and deed-notice type duties for the owner. ", ". "),
 (" Abandoning an AC main in place without breaking it is a different case and is commonly allowed by owners.", "")],
'fed-epa-spill-report-1': [
 ("Oil means diesel, gasoline, hydraulic oil, motor oil and the like. There is no gallon minimum: a sheen on a creek, a ditch that runs to a creek, a lake or a storm drain that leads to them is enough. ", "Oil means diesel, gasoline, hydraulic and motor oil. There is no gallon minimum: a sheen on a creek, a lake, or a ditch or storm drain that leads to one is enough. "),
 ("On the job: stop the source (shut the machine down, close the valve), keep it out of inlets and water with absorbent booms, pads or a dirt berm, call the foreman and the office, then make the calls. ", "On the job: stop the source, keep it out of inlets and water with booms, pads or a dirt berm, and call the foreman and the office. "),
 ("Most states also require a call to the state spill line, often for spills on the ground above a set number of gallons even with no water involved, and the project stormwater plan will list the numbers. A blown hydraulic hose over dirt, cleaned up with the soil dug out and disposed of properly, is normally not a federal report, but check the state rule. Never wash a spill down with water or cover it with dirt and walk away.", "Most states also require a call to the state spill line, often for spills on dry ground over a set number of gallons. Never wash a spill down or bury it.")],
'fed-epa-spcc-1': [
 ("For a pipe crew this usually comes up at the company yard, or on a long job with a fuel tank farm. Below the line, good practice is the same anyway: double-wall or contained tanks, away from inlets and water, with a spill kit at the fueling spot. ", "For a pipe company this usually comes up at the yard. "),],
'fed-usace-nwp-2026-1': [(", where spoil can and cannot be piled, timing windows for fish, and keeping equipment out of the water", ", where spoil can go, and fish timing windows"),
 (" States add their own water quality certification and stream permits.", "")],
'fed-dol-certified-payroll-due-1': [(" (names, classifications, rates, hours, deductions, fringe payments)", "")],
'std-awwa-c651-methods-1': [
 (" Only for mains kept clean and dry during laying. ", " "),
 ("; if the slug falls below 50 mg/L, stop, move the feed point and bring it back to 100 mg/L. ", "; if it falls below 50 mg/L, stop and bring it back to 100. "),
 ("Large mains that can be entered may be sprayed with 200 mg/L for 30 minutes (Sec. 4.6). Operate every valve and hydrant while the strong chlorine is in the line. Then flush until the chlorine is back to normal system level, dechlorinate the flush water before it reaches a storm drain or stream, and take bacteriological samples.", "Then flush to normal system chlorine, dechlorinate the flush water before it reaches a drain or stream, and take bacteriological samples.")],
'std-awwa-c651-bact-1': [
 ("A high plate count (HPC over 500 per mL) also means more flushing. Use a sample tap such as a corporation stop with a copper gooseneck, not a hydrant or a hose, and bottles from the lab with the chlorine neutralizer in them. ", ""),
 (" Do not tie in or open the valves to customers until the lab results are back and the water agency releases the main.", " No tie-in or service until the agency releases the main.")],
'row-ca-encroachment-1': [(": utility trenches and bores, potholing, driveways, surveys, traffic control set up on the highway, even tree trimming. ", ": trenches, bores, potholing, driveways, surveys, even tree trimming. "),
 ("; an incomplete package restarts the wait, so plan months, not weeks", "; an incomplete package restarts the wait"),
 (" (the permit gives the notice time)", ""), ("City and county streets are separate: each city or county issues its own encroachment or excavation permit.", "City and county streets need the city or county permit instead.")],
'env-tx-cgp-1': [(" TCEQ held a stakeholder meeting on June 9, 2026 to start the 2028 renewal. A pipe subcontractor usually works under the general contractor's SWP3: find out who the operators are and which controls are yours.", " TCEQ began work on the 2028 renewal in June 2026.")],
'std-awwa-c651-repairs-1': [
 ("AWWA C651-14 treats tie-ins and repairs differently from a whole new main. ", ""),
 ("If the main was shut down and depressurized but kept from contamination, disinfect the exposed pipe and the reachable inside surfaces and all new parts with 1 percent chlorine, flush about three pipe volumes until the water runs clear, and take a set of samples downstream; the main may go back in service before the results come back. ", "If the main was shut down and depressurized but kept clean: 1 percent chlorine on the exposed pipe, reachable inside surfaces and new parts, flush about three pipe volumes until clear, and take a sample set downstream; it may go back in service before results. "),
 ("If dirty water got into the main (the trench flooded over the open pipe), disinfect it like a new main where practical and get passing samples before service unless the water agency allows otherwise. ", "If dirty water got in, disinfect like a new main where practical and get passing samples before service. "),
 (" A 1 percent solution is roughly 1 part of fresh 5 to 8 percent household bleach to 4 to 7 parts water; mix it fresh.", "")],
'row-tx-uir-1': [(" (the city, water district, MUD or utility company)", ""), (" (depth, casing, bore versus open cut, distance from pavement)", "")],
'row-fl-utility-permit-1': [("The UAM sets the depth of cover, where open cuts are allowed and where a bore is required, restoration, and traffic control. ", "")],
}
def apply(cid, text):
    for a, b in ALL:
        if a in text: assert text.count(a) == 1; text = text.replace(a, b)
    for a, b in T.get(cid, []):
        assert text.count(a) == 1, (cid, text.count(a), a[:60]); text = text.replace(a, b)
    return text
