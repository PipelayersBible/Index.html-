# one-time tightening of build_lib_more.py so the most-asked answer cards fit the 1,200 character core limit. exact-once replacements.
p='/home/claude/index.html-/tests/staged/lib_more_nov20/build_lib_more.py'
s=open(p).read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70]); s=s.replace(a,b)
# shorter shared tails
rep("(' These are the federal rules for trucks that cross state lines or carry interstate freight. A truck that never leaves the state '\n                'follows that state\\'s version, which is usually close but can have different weights or hours, so check with the state.')",
    "(' These are the federal (interstate) rules. A truck that never leaves the state follows that state\\'s version, which is usually close: check with the state.')")
rep("(' These are the numbers in EPA\\'s own permit. Most states write their own construction stormwater permit, usually close to this one, and the state permit is the one that governs there.')",
    "(' These are EPA\\'s own permit numbers. Most states issue their own permit, usually close to this, and the state permit governs there.')")
rep("(' These numbers are from the 2014 edition. A 2023 edition exists and was not read, so whether it changed any of them is not confirmed. '\n             'The spec and the water agency name the edition and can be stricter; state health rules also apply.')",
    "(' From the 2014 edition; a 2023 edition exists and was not read, so any change there is not confirmed. The spec, the water agency and state health rules govern.')")
# cmv-10001
rep("There are two federal weight lines, and crews mix them up. ","Two federal weight lines get mixed up. ")
rep(" A pickup rated under 10,001 lb that pulls nothing, or a light trailer that keeps the total under 10,001 lb, is below the line.","")
# hos-limits
rep(" Breaks and time on the job site do not stop that clock.", " Breaks do not stop that clock.")
rep("; the break can be off duty or on duty not driving (fueling or loading counts). Short-haul drivers are excused from this break. ", " (off duty, or on duty not driving). Short-haul drivers are excused. ")
rep("Bad weather or a wreck nobody could have known about before dispatch allows up to 2 more hours to finish the run (395.1(b)(1)). ", "Unexpected bad weather or traffic allows up to 2 more hours (395.1(b)(1)). ")
rep("These limits stop the driving, not the work: a worker past 14 hours can keep working but cannot drive the commercial truck.", "The limits stop the driving, not the work.")
# shorthaul
rep("Most pipe crews do not need a logbook or an electronic log because of the short-haul exception in 49 CFR 395.1(e). ", "Most pipe crews need no logbook because of the short-haul exception, 49 CFR 395.1(e). ")
rep("In both cases the company must keep time records for 6 months that show the time the driver reports, total hours on duty, and the time released each day. ", "The company keeps time records for 6 months (time in, time out, total hours each day). ")
rep("Short-haul drivers are also excused from the 30 minute driving break. The 11 hour driving limit and the 60/70 hour weekly limits still apply. ", "The 11 hour driving limit and the 60/70 hour weekly limits still apply. ")
rep("On a day the driver breaks the exception (goes past the radius or the hours), a regular log is required for that day.", "On a day the driver goes past the radius or the hours, a regular log is required.")
# onduty
rep(" It lists driving, inspecting or servicing the truck, loading and unloading, time waiting to be dispatched, and \"any other work for a motor carrier\", plus paid work for anyone else. ", " It includes driving, servicing the truck, loading, and \"any other work for a motor carrier\". ")
rep(" Someone else who is inside their hours has to drive, or the truck stays. The weekly 60 or 70 hour count also includes all the trench hours. '\n    'Plan long days (shutdowns, tie-ins, night work) with this in mind.'", " Someone inside their hours has to drive, or the truck stays. The weekly 60 or 70 hour count includes the trench hours too.'")
# dvir
rep(" covering at least the service brakes including trailer brake connections, '\n    'parking brake, steering, lights and reflectors, tires, horn, wipers, mirrors, coupling devices, wheels and rims, and emergency equipment. '", " covering at least brakes (including trailer brake connections), steering, lights, tires, horn, wipers, mirrors, coupling devices, wheels and emergency equipment. '")
rep(" So for property-carrying trucks a report is written only when something is wrong. ", " ")
rep("The company must fix any defect that affects safety before the truck goes out again and certify the repair (or that no repair was needed) on the report, '\n    'and keep the report", "The company must fix safety defects before the truck goes out again, certify it on the report, '\n    'and keep it")
rep(" The report rule does not apply to \"a motor carrier operating only one commercial motor vehicle\". The trailer is part of the inspection.", " The trailer is part of the inspection.")
rep("review the last driver vehicle inspection report if one was required, and sign it to show the listed repairs were certified as done. ", "review the last inspection report if one was required, and sign it. ")
# cgp-inspections
rep("Fewer inspections are allowed for stabilized areas (twice in the first month, then monthly), in arid areas in the dry season or drought (monthly, plus after storms), and while the ground is frozen (Part 4.4). ", "Fewer are allowed for stabilized areas, arid areas in the dry season, and frozen ground (Part 4.4). ")
rep("What the inspection found has a clock too: a control that needs a new installation or a significant repair must be done within 7 calendar days of finding it; a simple fix (routine maintenance) by the close of the next business day (Part 5.2.1). '\n    'Inspection reports are kept for at least 3 years after coverage ends.'", "Fixes have a clock: a new or replaced control or a significant repair within 7 calendar days; routine maintenance by the close of the next business day (Part 5.2.1).'")
rep("Sites that drain to sensitive waters (impaired for sediment or nutrients, or high-quality waters) must inspect every 7 days and also within 24 hours of such a storm (Part 4.3). ", "Sites draining to sensitive waters inspect every 7 days and within 24 hours of such a storm (Part 4.3). ")
# cgp-dewatering
rep("Run the pump discharge through a sediment control (dewatering bag, weir tank, sediment basin, or a well-vegetated area) and keep it from eroding the ground where it lands. ", "Run the discharge through a sediment control (dewatering bag, weir tank, basin or thick vegetation) and do not let it erode where it lands. ")
rep("If the inspection finds a sediment plume, sheen, foam or a deposit at the outfall, the permit says to act right away: stop or reduce the discharge, fix the cause, and start pumping again only after the fix (Part 5.2.2). ", "If it shows a plume, sheen or foam, stop or cut the discharge right away and fix the cause before pumping again (Part 5.2.2). ")
rep("Water that smells of fuel or solvent, or has a sheen before treatment, is not ordinary trench water: stop pumping and call the office, because contaminated groundwater needs its own permit or disposal.'\n    + CGP_TAIL + ' Many cities also require a permit to pump into their storm drain or sewer.'", "Water that smells of fuel or has a sheen is not ordinary trench water: stop pumping and call the office.'\n    + CGP_TAIL")
# acpipe-class
rep("OSHA said AWWA\\'s work practices for AC pipe \"are generally compliant with OSHA\\'s Asbestos Standard for construction\". '\n    ", "")
rep("Required methods in the standard include wet methods, HEPA vacuums and prompt cleanup and bagging of waste; high-speed abrasive disc saws without controls, compressed air and dry sweeping are prohibited. ", "Required: wet methods, HEPA vacuums, prompt cleanup and bagging of waste. Prohibited: high-speed abrasive disc saws without controls, compressed air, dry sweeping. ")
rep("OSHA letter of interpretation, May 29, 2007, on tapping and tying in to asbestos-cement (AC, transite) water pipe under the construction asbestos standard, 29 CFR 1926.1101. ", "OSHA letter of May 29, 2007 on tapping and tying in to asbestos-cement (AC, transite) water pipe under 29 CFR 1926.1101. ")
rep("OSHA also rejected the idea that the standard does not apply when exposure is below the limit: a consultant", "Being under the exposure limit does not exempt the work: a consultant")
rep("State rules can be stricter and some states require a licensed asbestos contractor.", "State rules can be stricter.")
# spill
rep("Oil means diesel, gasoline, hydraulic oil, motor oil and the like. There is no gallon minimum: a sheen on a creek, a ditch that runs to a creek, a lake or a storm drain that leads to them is enough. ", "Oil means diesel, gasoline, hydraulic and motor oil. There is no gallon minimum: a sheen on a creek, a lake, or a ditch or storm drain that leads to one is enough. ")
rep("On the job: stop the source (shut the machine down, close the valve), keep it out of inlets and water with absorbent booms, pads or a dirt berm, call the foreman and the office, then make the calls. ", "On the job: stop the source, keep it out of inlets and water with booms, pads or a dirt berm, and call the foreman and the office. ")
rep("Most states also require a call to the state spill line, often for spills on the ground above a set number of gallons even with no water involved, and the project stormwater plan will list the numbers. '\n    'A blown hydraulic hose over dirt, cleaned up with the soil dug out and disposed of properly, is normally not a federal report, but check the state rule. Never wash a spill down with water or cover it with dirt and walk away.'", "Most states also require a call to the state spill line, often for spills on dry ground over a set number of gallons. Never wash a spill down or bury it.'")
# c651 methods / bact
rep(" Only for mains kept clean and dry during laying. ", " ")
rep("Large mains that can be entered may be sprayed with 200 mg/L for 30 minutes (Sec. 4.6). '\n    'Operate every valve and hydrant while the strong chlorine is in the line. Then flush until the chlorine is back to normal system level, dechlorinate the flush water before it reaches a storm drain or stream, and take bacteriological samples.'", "Then flush to normal system chlorine, dechlorinate the flush water before it reaches a drain or stream, and take bacteriological samples.'")
rep("; if the slug falls below 50 mg/L, stop, move the feed point and bring it back to 100 mg/L. ", "; if it falls below 50 mg/L, stop and bring it back to 100. ")
rep("'A high plate count (HPC over 500 per mL) also means more flushing. '\n    'Use a sample tap such as a corporation stop with a copper gooseneck, not a hydrant or a hose, and bottles from the lab with the chlorine neutralizer in them. '\n    ", "")
rep(" Do not tie in or open the valves to customers until the lab results are back and the water agency releases the main.", " No tie-in or service until the agency releases the main.")
open(p,'w').write(s)
