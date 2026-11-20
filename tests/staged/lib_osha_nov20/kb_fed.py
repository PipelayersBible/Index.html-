# lib_osha_nov20 / kb_fed.py - federal OSHA chunks (ids osha-pl-*, osha-loi-*). Imported by build.py. Nothing here touches the server.
# Every "high" chunk was read on 2026-11-20 at the URL given, or matches the 29 CFR text already in the Ask library
# (eCFR as of 2026-09-30, lib "osha"). Chunks marked unconfirmed were NOT re-read (the shared web-search budget ran out):
# they sit on the shelf tier and say so in their text.
D = '2026-11-20'
ECFR = 'https://www.ecfr.gov/current/title-29/section-'
OSHA = 'https://www.osha.gov/laws-regs/regulations/standardnumber/'
SUBP = 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926/subpart-P'
SUBAA = 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926/subpart-AA'
LOI = 'https://www.osha.gov/laws-regs/standardinterpretations/'
ED_READ = 'eCFR current text, read 2026-11-20'
ED_LIB = 'eCFR as of 2026-09-30 (the 29 CFR text already in the Ask library)'
NOTREAD = ' The numbers in this card were not checked against the rule text on 2026-11-20, so read the section before you rely on them.'

T_EXC = 'Trench and excavation rules (OSHA Subpart P)'
T_CS = 'Confined space rules (OSHA Subpart AA)'
T_FALL = 'Fall protection around trenches, holes and manholes'
T_REC = 'Injury reporting and OSHA recordkeeping'
T_HEAT = 'Heat illness rules'
T_SIL = 'Silica dust rules (OSHA 1926.1153)'
T_GEN = 'General jobsite safety duties and training (OSHA Subpart C)'
T_HLTH = 'Jobsite health: first aid, water, toilets, noise'
T_PPE = 'Personal protective equipment (OSHA Subpart E)'
T_EQ = 'Equipment, vehicles, rigging and cranes'
T_ELEC = 'Electrical safety and lockout'
T_MISC = 'Other OSHA construction rules'
T_SP = 'State safety plans: who enforces and what differs'
T_LOI = 'OSHA interpretation letters on trenches and manholes'

FED = []
def F(id, title, topic, text, src, url, ed=ED_READ, conf='high', tier='core', unc=None, eff=None, kind='summary'):
    c = dict(id=id, state='US', tier=tier, title=title, topic=topic, text=' '.join(text.split()), source=src, url=url, checked=D,
             edition=ed, confidence=conf, kind=kind, license='gov-us')
    if unc: c['unconfirmed'] = unc
    if eff: c['effective'] = eff
    FED.append(c)

# ------------------------------------------------------------------ Subpart P (excavations), full
F('osha-pl-exc-scope-1', 'What OSHA counts as an excavation and a trench', T_EXC,
  """OSHA's excavation rules are 29 CFR 1926 Subpart P (1926.650 to 1926.652 plus Appendices A to F). An excavation is "any man-made cut,
  cavity, trench, or depression in an earth surface, formed by earth removal." A trench is "a narrow excavation (in relation to its length)
  made below the surface of the ground." Protective system means a way to protect people from cave-ins, from material that could fall or roll
  from the face or into the excavation, or from the collapse of nearby structures: sloping, benching, shoring or a shield (trench box).
  A registered professional engineer means one registered in the state where the work is done. The three sections: 1926.650 scope and
  definitions, 1926.651 the specific rules (utilities, ladders, air, water, spoil, inspections), 1926.652 protective systems. State safety
  plans can be stricter, so check the job's state.""",
  '29 CFR 1926.650(a)-(b)', SUBP)
F('osha-pl-exc-competent-1', 'Competent person for trenching: who it is and what they must do', T_EXC,
  """In Subpart P a competent person is "one who is capable of identifying existing and predictable hazards in the surroundings, or working
  conditions which are unsanitary, hazardous, or dangerous to employees, and who has authorization to take prompt corrective measures to
  eliminate them" (1926.650(b)). Both parts count: knowing the hazards and having the authority to stop work. The rule gives this person
  these jobs: classify the soil with at least one visual and one manual test (Appendix A); inspect the excavation, the area around it and the
  protective system every day before work, as needed during the shift, and after every rainstorm (1926.651(k)(1)); pull people out when there
  are signs of a possible cave-in, a failing system or bad air (1926.651(k)(2)); watch water removal equipment (1926.651(h)(2)); design ramps
  used only by people (1926.651(c)(1)); and decide whether a trench under 5 ft needs protection (1926.652(a)(1)(ii)).""",
  '29 CFR 1926.650(b), 1926.651(c)(1), (h)(2), (k), 1926.652(a)(1)(ii)', SUBP)
F('osha-pl-exc-utilities-1', 'Underground utilities before and during digging: the OSHA rule', T_EXC,
  """29 CFR 1926.651(b): (1) estimate where sewer, telephone, fuel, electric, water and other underground lines are before opening the
  excavation. (2) Contact the utility owners within the local response times, tell them about the work and ask them to mark their lines. If
  they cannot answer within 24 hours (or a longer period set by state or local law) or cannot find the exact spot, the employer may go ahead
  with caution, using detection equipment or another acceptable way to find the lines. (3) When digging gets close to the estimated spot, find
  the exact location by safe and acceptable means. OSHA has said hand digging and vacuum excavation are such means (interpretation of
  10/23/2003). (4) While the excavation is open, protect, support or remove the lines as needed. The 811 notice time, ticket life and
  tolerance zone come from state law, not from OSHA.""",
  '29 CFR 1926.651(b)(1)-(4)', OSHA + '1926/1926.651')
F('osha-pl-exc-access-1', 'Ladders and ways out of a trench: 4 ft deep, 25 ft of travel', T_EXC,
  """29 CFR 1926.651(c)(2): "A stairway, ladder, ramp or other safe means of egress shall be located in trench excavations that are 4 feet
  (1.22 m) or more in depth so as to require no more than 25 feet (7.62 m) of lateral travel for employees." So from 4 ft deep, nobody in the
  trench is more than 25 ft along the trench from a way out. Inside a trench box the ladder goes in the box. The ladder stays in: OSHA told an
  employer in 2009 that pulling the ladder out after entry and having people outside ready to lower it is not a "safe means of egress".
  Ramps: a ramp used only by people is designed by a competent person; a ramp used by equipment is designed by a competent person qualified
  in structural design (1926.651(c)(1)). Ladder rules are in 1926.1053: side rails 3 ft above the landing.""",
  '29 CFR 1926.651(c)(1)-(2); OSHA interpretation 2009-03-17', SUBP)
F('osha-pl-exc-traffic-loads-1', 'Traffic vests, suspended loads and equipment near the edge of a trench', T_EXC,
  """Three short rules in 29 CFR 1926.651. (d) Traffic: employees exposed to public vehicular traffic "shall be provided with, and shall
  wear, warning vests" or other garments marked with or made of reflectorized or high-visibility material. (e) Falling loads: "No employee
  shall be permitted underneath loads handled by lifting or digging equipment." People stand away from a truck being loaded or unloaded; the
  driver may stay in a cab that gives enough protection. (f) Mobile equipment: when equipment works next to an excavation or has to approach
  the edge and the operator does not have a clear and direct view of the edge, use a warning system such as barricades, hand or mechanical
  signals, or stop logs. In practice: nobody under the bucket or the pipe, and a spotter or stop log when the operator cannot see the edge.""",
  '29 CFR 1926.651(d), (e), (f)', OSHA + '1926/1926.651')
F('osha-pl-exc-air-1', 'Bad air in a trench: when OSHA requires testing', T_EXC,
  """29 CFR 1926.651(g)(1)(i): where oxygen deficiency (less than 19.5 percent oxygen) or a hazardous atmosphere "exists or could reasonably
  be expected to exist, such as in excavations in landfill areas or excavations in areas where hazardous substances are stored nearby, the
  atmospheres in the excavation shall be tested before employees enter excavations greater than 4 feet (1.22 m) in depth." (ii) Keep people
  out of air under 19.5 percent oxygen and other hazardous atmospheres, with ventilation or respirators. (iii) Ventilate so flammable gas
  stays at or under 20 percent of its lower flammable limit. (iv) When controls are used, test as often as needed to be sure the air stays
  safe. (g)(2) Where bad air exists or may develop, rescue gear (breathing apparatus, a harness and line, or a basket stretcher) is readily
  available and attended when in use. Note the trench number is 20 percent of the LFL; the confined space rule uses 10 percent.""",
  '29 CFR 1926.651(g)(1)-(2)', SUBP)
F('osha-pl-exc-water-1', 'Water in the trench: when you can work in it', T_EXC,
  """29 CFR 1926.651(h)(1): "Employees shall not work in excavations in which there is accumulated water, or in excavations in which water
  is accumulating, unless adequate precautions have been taken to protect employees against the hazards posed by water accumulation." The
  rule says the precautions vary but could include special support or shield systems, water removal to control the level, or a safety harness
  and lifeline. (h)(2) If pumps or other water removal equipment control the water, a competent person monitors the equipment and the
  operation. (h)(3) If the dig cuts off natural drainage, use diversion ditches, dikes or other means to keep surface water out; after heavy
  rain a competent person inspects. OSHA's letter of March 23, 1992 says added shoring and pumping may not always be enough: it depends on
  the site. Water also changes the soil: submerged or freely seeping soil is Type C.""",
  '29 CFR 1926.651(h)(1)-(3); OSHA interpretation 1992-03-23', SUBP)
F('osha-pl-exc-adjacent-1', 'Digging next to buildings, walls, sidewalks and pavement', T_EXC,
  """29 CFR 1926.651(i) covers the stability of adjacent structures. Where the stability of adjoining buildings, walls or other structures
  is endangered by the excavation, provide support systems such as shoring, bracing or underpinning. Digging below the base or footing of a
  foundation or retaining wall is limited to cases the rule lists, such as a support system that protects the structure, stable rock, or a
  registered professional engineer's decision that the structure will not be affected. Sidewalks, pavements and similar structures are not
  undermined unless a support system protects people from their collapse. Surcharge from structures also matters for sloping: Appendix B
  sends structure loads back to this paragraph. The exact wording of the listed cases was not confirmed on 2026-11-20 (only the paragraph
  headings were read), so read 1926.651(i) before relying on an exception.""",
  '29 CFR 1926.651(i)(1)-(3)', SUBP, conf='medium', unc='yes')
F('osha-pl-exc-spoil-1', 'Spoil pile and materials: at least 2 ft back from the edge', T_EXC,
  """29 CFR 1926.651(j)(2): "Employees shall be protected from excavated or other materials or equipment that could pose a hazard by
  falling or rolling into excavations. Protection shall be provided by placing and keeping such materials or equipment at least 2 feet (.61
  m) from the edge of excavations, or by the use of retaining devices that are sufficient to prevent materials or equipment from falling or
  rolling into excavations, or by a combination of both if necessary." (j)(1) also requires protection from loose rock or soil that could
  fall or roll from the face: scale it off, or use barricades or other protection. The 2 ft covers the spoil pile, pipe, fittings, tools and
  equipment. Spoil and equipment near the edge are also a surcharge load: the competent person may have to flatten the slope (Appendix B).""",
  '29 CFR 1926.651(j)(1)-(2)', SUBP)
F('osha-pl-exc-inspect-1', 'Daily trench inspections by the competent person', T_EXC,
  """29 CFR 1926.651(k)(1): "Daily inspections of excavations, the adjacent areas, and protective systems shall be made by a competent
  person for evidence of a situation that could result in possible cave-ins, indications of failure of protective systems, hazardous
  atmospheres, or other hazardous conditions. An inspection shall be conducted by the competent person prior to the start of work and as
  needed throughout the shift. Inspections shall also be made after every rainstorm or other hazard increasing occurrence. These inspections
  are only required when employee exposure can be reasonably anticipated." (k)(2): when the competent person finds such evidence, "exposed
  employees shall be removed from the hazardous area until the necessary precautions have been taken to ensure their safety." Federal OSHA
  does not require the inspection to be written down, but a written daily log is the usual proof.""",
  '29 CFR 1926.651(k)(1)-(2)', SUBP)
F('osha-pl-exc-crossing-1', 'Crossing over a trench: walkways and guardrails', T_EXC,
  """29 CFR 1926.651(l): "Walkways shall be provided where employees or equipment are required or permitted to cross over excavations.
  Guardrails which comply with 1926.502(b) shall be provided where walkways are 6 feet (1.8 m) or more above lower levels." So people do
  not jump a trench: if they have to cross, there is a walkway, and at 6 ft or more it has guardrails (top rail 42 inches plus or minus 3
  inches, able to take 200 pounds). Some state plans use a lower height or add a width, so check the job's state.""",
  '29 CFR 1926.651(l); 1926.502(b)(1), (b)(3)', SUBP)
F('osha-pl-exc-protect-5ft-1', 'The 5 ft rule: when a trench needs a protective system', T_EXC,
  """29 CFR 1926.652(a)(1): "Each employee in an excavation shall be protected from cave-ins by an adequate protective system" except when
  (i) the excavation is made entirely in stable rock, or (ii) it is "less than 5 feet (1.52m) in depth and examination of the ground by a
  competent person provides no indication of a potential cave-in." So: 5 ft or deeper always needs sloping, benching, shoring or a shield
  unless it is all stable rock. Under 5 ft needs it too if the competent person sees any sign the ground could move. Under 5 ft is not an
  automatic pass: someone competent has to look. Depth is taken where the person is: OSHA's letter of September 30, 2004 says an average
  depth cannot be used and protection is "required at each point where the excavation is 5 feet or deeper." State plans can be stricter.""",
  '29 CFR 1926.652(a)(1)(i)-(ii); OSHA interpretation 2004-09-30', SUBP)
F('osha-pl-exc-options-1', 'Ways to design trench protection, and when an engineer is needed', T_EXC,
  """29 CFR 1926.652(b) sloping and benching, four options: (1) slope no steeper than 1 1/2 horizontal to 1 vertical (34 degrees), the Type
  C slope, with no soil classification needed; (2) classify the soil and use Appendices A and B; (3) written tabulated data approved by a
  registered professional engineer; (4) a design by a registered professional engineer. 1926.652(c) shoring, shields and other systems, four
  options: (1) Appendices A, C and D; (2) the manufacturer's tabulated data, with any deviation approved in writing by the manufacturer; (3)
  other tabulated data; (4) a registered engineer's design. Tabulated data and engineered designs are in writing and a copy stays at the
  jobsite while the system is built. Appendix B and the appendix tables stop at 20 ft: deeper than 20 ft, sloping or benching is designed by
  a registered professional engineer.""",
  '29 CFR 1926.652(b)(1)-(4), (c)(1)-(4); Appendix B to Subpart P', SUBP)
F('osha-pl-exc-install-1', 'Installing and removing shoring; digging below the bottom of the support', T_EXC,
  """29 CFR 1926.652(d): materials and equipment used for protective systems are free of damage or defects; a competent person examines
  damaged material and it is pulled from service until evaluated. (e)(1) Members of a support system are securely connected; systems are
  installed and removed so people are protected from cave-ins and from being struck; members are not overloaded; removal starts at the bottom
  and works up, and backfilling goes along with removal. (e)(2)(i): "Excavation of material to a level no greater than 2 feet (.61 m) below
  the bottom of the members of a support system shall be permitted, but only if the system is designed to resist the forces calculated for
  the full depth of the trench, and there are no indications while the trench is open of a possible loss of soil from behind or below the
  bottom of the support system." (f) No one works on a sloped or benched face above other people unless those below are protected.""",
  '29 CFR 1926.652(d), (e)(1)-(2), (f)', SUBP)
F('osha-pl-exc-shield-1', 'Trench boxes (shields): the OSHA rules', T_EXC,
  """29 CFR 1926.652(g)(1): a shield is not loaded beyond what it was designed for; it is installed so it cannot move sideways if the trench
  wall lets go; people are protected from cave-ins when getting in and out of the box; and no one is inside the box while it is being
  installed, removed or moved vertically. (g)(2): "Excavations of earth material to a level not greater than 2 feet (.61 m) below the bottom
  of a shield shall be permitted, but only if the shield is designed to resist the forces calculated for the full depth of the trench, and
  there are no indications while the trench is open of a possible loss of soil from behind or below the bottom of the shield." Appendix B:
  when the box sits in the vertical lower part of a sloped trench, it extends at least 18 inches above the top of the vertical side. Use the
  box by its manufacturer's tabulated data and keep that data at the jobsite (1926.652(c)(2)).""",
  '29 CFR 1926.652(g)(1)-(2), (c)(2); Appendix B to Subpart P', SUBP)
F('osha-pl-exc-appa-1', 'OSHA soil types A, B and C in plain words', T_EXC,
  """Appendix A to Subpart P. Type A: cohesive soil with an unconfined compressive strength of 1.5 tons per square foot (tsf) or more, such
  as clay, silty clay, sandy clay, caliche and hardpan. Soil is never Type A if it is fissured, subject to vibration from traffic or pile
  driving, previously disturbed, or part of a layered system that dips into the excavation at 4 horizontal to 1 vertical or steeper. Type
  B: cohesive soil above 0.5 tsf but under 1.5 tsf; granular cohesionless soils such as angular gravel, silt and loams; previously disturbed
  soil unless it is Type C; soil that would be Type A but is fissured or vibrated; dry rock that is not stable. Type C: cohesive soil at 0.5
  tsf or less; granular soils including gravel, sand and loamy sand; submerged soil or soil with water freely seeping; submerged rock that
  is not stable. Stable rock is natural solid mineral that can be cut with vertical sides and stay intact. Most trench work along existing
  utilities is previously disturbed soil: Type B at best.""",
  '29 CFR 1926 Subpart P Appendix A (b)', 'https://www.law.cornell.edu/cfr/text/29/appendix-A_to_subpart_P_of_part_1926')
F('osha-pl-exc-appa-2', 'How the competent person classifies soil: visual and manual tests', T_EXC,
  """Appendix A (c): each soil and rock deposit is classified by a competent person as Stable Rock, Type A, Type B or Type C, based on at
  least one visual and at least one manual analysis. A layered system is classified by its weakest layer (a layer can be classed on its own
  when a more stable layer lies under a less stable one). If conditions change, such as rain or water, the competent person looks again and
  reclassifies. Manual tests in (d)(2): Plasticity: roll moist soil into a thread 1/8 inch thick; if a 2 inch length holds without tearing,
  the soil is cohesive. Thumb penetration: Type A soil (about 1.5 tsf) can be dented by the thumb but only penetrated with very great
  effort; Type C soil (about 0.5 tsf) can be penetrated several inches by the thumb. Pocket penetrometer or hand shearvane. Dry strength
  and drying tests tell granular soil from fissured clay. Test a fresh, undisturbed sample right after it is dug. A photo cannot classify
  soil.""",
  '29 CFR 1926 Subpart P Appendix A (c)(1)-(5), (d)(2)', 'https://www.law.cornell.edu/cfr/text/29/appendix-A_to_subpart_P_of_part_1926')
F('osha-pl-exc-appb-1', 'OSHA maximum slopes for trenches by soil type (Table B-1)', T_EXC,
  """Appendix B to Subpart P, Table B-1, maximum allowable slopes (horizontal to vertical) for excavations less than 20 ft deep: stable
  rock, vertical (90 degrees); Type A, 3/4 to 1 (53 degrees); Type B, 1 to 1 (45 degrees); Type C, 1 1/2 to 1 (34 degrees). Short-term
  exception: a Type A excavation open 24 hours or less and 12 ft or less deep may be sloped 1/2 to 1 (63 degrees). Each side is cut back,
  so top width = bottom width + 2 x depth x the ratio: a 10 ft deep Type B trench with a 3 ft bottom is 23 ft across the top. The actual
  slope may never be steeper than the table. If there are signs of distress, cut the slope back at least 1/2 horizontal to 1 vertical
  flatter than the table. With surcharge loads (spoil, equipment, traffic) the competent person decides how much flatter. Over 20 ft deep a
  registered professional engineer designs the slope. The app's Trench Sloping calculator uses these numbers.""",
  '29 CFR 1926 Subpart P Appendix B (b), (c)(2)-(3), Table B-1 and its notes', 'https://www.law.cornell.edu/cfr/text/29/appendix-B_to_subpart_P_of_part_1926')
F('osha-pl-exc-appb-2', 'Benching and combination cuts under OSHA Appendix B', T_EXC,
  """Appendix B figures, all for excavations 20 ft or less. Type A: simple slope 3/4 to 1; benched excavations held to an overall 3/4 to
  1; a trench 8 ft or less deep may have an unsupported vertical lower portion up to 3 1/2 ft high; from more than 8 ft to 12 ft deep the
  vertical lower portion is still 3 1/2 ft at most and the slope above it is 1 to 1. Type B: simple slope 1 to 1; benching allowed within
  an overall 1 to 1 (the figures allow benching only in cohesive Type B soil). Type C: simple slope 1 1/2 to 1; the figures show no
  benching for Type C. In any soil, when the lower portion is vertical and is supported or shielded, the support or shield extends at
  least 18 inches above the top of the vertical side, and the slope above it follows the soil type. Layered soils: each layer is cut to
  its own slope. Bench step heights are pictures in the rule and are not confirmed here; look at the figure before cutting benches.""",
  '29 CFR 1926 Subpart P Appendix B, Figures B-1.1 to B-1.4', 'https://www.law.cornell.edu/cfr/text/29/appendix-B_to_subpart_P_of_part_1926',
  conf='medium', unc='yes')
F('osha-pl-exc-appcdef-1', 'OSHA excavation Appendices C, D, E and F: what each one is for', T_EXC,
  """Subpart P has six appendices. A: soil classification. B: sloping and benching. C: timber shoring for trenches, used after the soil is
  classified under Appendix A. D: aluminum hydraulic shoring for trenches: "information that can be used when aluminum hydraulic shoring
  is provided as a method of protection" where the employer does not have manufacturer's tabulated data. E: alternatives to timber shoring
  (pictures of hydraulic shoring, trench jacks, trench shields). F: selection of protective systems, "a graphic summary of the requirements
  contained in subpart P for excavations 20 feet or less in depth": a flow chart that starts with whether the excavation is all stable rock
  and whether it is under 5 ft with no sign of cave-in. The tables in C and D are for trenches up to 20 ft deep. The table values were not
  checked on 2026-11-20 (they are images on the pages read); use the tables in the rule or the manufacturer's data on site.""",
  '29 CFR 1926 Subpart P Appendices C, D, E, F', SUBP, conf='medium', unc='yes')

# ------------------------------------------------------------------ Subpart AA (confined spaces in construction), full
F('osha-pl-cs-scope-1', 'When the construction confined space rule applies, and when it does not', T_CS,
  """29 CFR 1926 Subpart AA (1926.1201 to 1926.1213, in effect since August 3, 2015) protects employees doing construction work at a site
  with one or more confined spaces. The rule's own examples include manholes, sewers, storm drains, pits, vaults, tanks, lift stations and
  pipe. It does not apply to construction work regulated by Subpart P (excavations), Subpart S (underground construction, caissons,
  cofferdams and compressed air) or Subpart Y (diving) (1926.1201(b)). So an open trench is under the excavation rule, but a manhole, a
  vault or the inside of a pipe is a confined space even when it sits in an excavation. Where another OSHA rule also covers a hazard in the
  space, follow both (1926.1201(c)). Maintenance work that is not construction is under the general industry rule, 29 CFR 1910.146.""",
  '29 CFR 1926.1201(a)-(c); OSHA Confined Spaces in Construction FAQ', SUBAA)
F('osha-pl-cs-defs-1', 'Confined space, permit space and hazardous atmosphere: the OSHA definitions', T_CS,
  """29 CFR 1926.1202. A confined space (1) is large enough and so configured that an employee can bodily enter it, (2) has limited or
  restricted means for entry and exit, and (3) is not designed for continuous employee occupancy. A permit-required confined space has one
  or more of: a hazardous atmosphere or the potential for one; material that could engulf an entrant; walls that converge inward or a floor
  that slopes down to a smaller cross-section so a person could be trapped or asphyxiated; or any other recognized serious safety or health
  hazard. Hazardous atmosphere means: flammable gas, vapor or mist over 10 percent of its lower flammable limit (LFL); combustible dust at
  or above its LFL; oxygen below 19.5 percent or above 23.5 percent; a substance above its OSHA dose or permissible exposure limit; or any
  other condition immediately dangerous to life or health. Entry happens when any part of the body breaks the plane of the opening.""",
  '29 CFR 1926.1202 (definitions)', SUBAA)
F('osha-pl-cs-first-steps-1', 'Before work starts: finding and marking permit spaces', T_CS,
  """29 CFR 1926.1203(a): "Before it begins work at a worksite, each employer must ensure that a competent person identifies all confined
  spaces in which one or more of the employees it directs may work, and identifies each space that is a permit space" by looking at the
  space and testing as needed. (b) If there is a permit space, tell exposed employees by posting danger signs or another equally effective
  way; a sign reading "DANGER--PERMIT-REQUIRED CONFINED SPACE, DO NOT ENTER" or similar wording satisfies the sign requirement. Also tell
  the employees' representatives and the controlling contractor where each permit space is and what the danger is. (c) An employer who
  decides its people will not enter takes effective measures to keep them out. (d) An employer who decides its people will enter has a
  written permit space program, kept at the site and available to employees.""",
  '29 CFR 1926.1203(a)-(d)', SUBAA)
F('osha-pl-cs-altproc-1', 'Alternate procedures and reclassifying a permit space', T_CS,
  """29 CFR 1926.1203(e)(1): an employer may use the shorter alternate procedures only when it can show that all physical hazards in the
  space are eliminated or isolated through engineering controls so the only hazard is an actual or potential hazardous atmosphere, and that
  continuous forced air ventilation alone is enough to keep the space safe, backed by monitoring data, with the determination written
  down and available to each entrant. (e)(2) Then: make it safe to remove the cover; guard the opening at once; test the air before
  entry "with a calibrated direct-reading instrument, for oxygen content, for flammable gases and vapors, and for potential toxic air
  contaminants, in that order"; no hazardous atmosphere while anyone is inside; continuous forced air ventilation; continuous monitoring;
  get out at once if a hazard shows up; a safe way in and out; and a written certification with the date, the location and the signature
  of the person certifying. (g) A permit space may be reclassified as non-permit only when a competent person finds no atmospheric hazard
  and every other hazard eliminated or isolated without entry, and documents it.""",
  '29 CFR 1926.1203(e)(1)-(2), (g)', SUBAA)
F('osha-pl-cs-employers-1', 'Host employer, controlling contractor and entry employer duties', T_CS,
  """29 CFR 1926.1202 and 1926.1203(h). Host employer: the employer that owns or manages the property where the construction work is
  taking place. Controlling contractor: the employer with overall responsibility for construction at the worksite. Entry employer: any
  employer who decides that an employee it directs will enter a permit space. Before entry, the host employer gives the controlling
  contractor what it knows: where each permit space is, its hazards, and precautions others have used. The controlling contractor gets that
  information, passes it to each entity entering the space and to any other entity whose work could create a hazard in the space. Each
  entry employer gets the information and tells the controlling contractor its permit program and the hazards it expects. The controlling
  contractor and entry employers coordinate when more than one entity works in the space at once or when work outside could create a hazard
  inside. After entry they debrief. With no controlling contractor, the host employer or the employer who arranges the work does that job
  (1926.1203(i)).""",
  '29 CFR 1926.1202; 1926.1203(h)(1)-(5), (i)', SUBAA)
F('osha-pl-cs-program-1', 'What a permit space program has to cover', T_CS,
  """29 CFR 1926.1204. Each entry employer must: (a) prevent unauthorized entry; (b) identify and evaluate the hazards before entry; (c)
  set the procedures for safe entry: acceptable entry conditions, a chance for entrants to watch the testing, isolating the space, purging,
  flushing or ventilating, monitoring that warns in time to get out if ventilation fails, barriers against traffic and pedestrians, and
  checking that conditions stay acceptable; (d) provide at no cost, maintain and make sure people use: testing and monitoring equipment,
  ventilation, communications, PPE, lighting, barriers, ladders, and rescue equipment; (e) test and monitor; (f) "Provide at least one
  attendant outside the permit space" for the whole entry; (h) name who has each role and train them; (i) have procedures to summon rescue,
  rescue entrants and prevent unauthorized people from attempting a rescue; (m) review entry operations when the program may not have
  protected people; (n) review the program with the cancelled permits within 1 year after each entry (one yearly review can cover all).""",
  '29 CFR 1926.1204(a)-(n)', 'https://www.law.cornell.edu/cfr/text/29/1926.1204')
F('osha-pl-cs-monitor-1', 'Air testing order and continuous monitoring in a permit space', T_CS,
  """29 CFR 1926.1204(e). Test before entry is authorized. Test in this order: "oxygen first, then combustible gases and vapors, then toxic
  gases and vapors." Then monitor continuously where entrants are working, unless the employer can show continuous monitoring equipment is
  not commercially available or periodic monitoring is enough; then monitor periodically, often enough to be sure conditions stay
  acceptable. Give entrants or their representative the chance to watch the testing, re-test in front of any entrant who asks because the
  first test may have been inadequate, and give them the results right away. Where an engulfment hazard cannot be isolated, such as a sewer
  that can flood, provide an early-warning system that continuously watches for the hazard and alerts entrants and attendants in time to
  get out. Limits: oxygen 19.5 to 23.5 percent, flammables at or under 10 percent of the LFL. Hydrogen sulfide and carbon monoxide limits
  come from the exposure limit tables, not from Subpart AA.""",
  '29 CFR 1926.1204(e)(1)-(6); 1926.1202', 'https://www.law.cornell.edu/cfr/text/29/1926.1204')
F('osha-pl-cs-permit-1', 'The entry permit: the 16 items and how long to keep it', T_CS,
  """29 CFR 1926.1206 lists what the permit identifies: (a) the space; (b) the purpose of entry; (c) the date and authorized duration;
  (d) the entrants, by name or by a roster or tracking system; (e) how a rise in air hazard is detected if ventilation stops; (f) each
  attendant by name; (g) each entry supervisor by name, with the signature or initials of each supervisor who authorizes entry; (h) the
  hazards of the space; (i) the isolation and control measures; (j) the acceptable entry conditions; (k) test results with the tester's
  name or initials and when; (l) rescue and emergency services and how to summon them; (m) communication procedures; (n) equipment: PPE,
  testing, communications, alarms, rescue; (o) other information needed for safety; (p) other permits, such as hot work. 1926.1205: the
  supervisor signs before entry; the completed permit is available to entrants at entry, by posting at the portal or another equally
  effective way; the duration is no longer than the task needs; problems met during entry are noted on the permit; and "The entry employer
  must retain each canceled entry permit for at least 1 year."  A permit can be suspended instead of cancelled.""",
  '29 CFR 1926.1205(a)-(f); 1926.1206(a)-(p)', 'https://www.law.cornell.edu/cfr/text/29/1926.1206')
F('osha-pl-cs-training-1', 'Confined space training: who, when and the records', T_CS,
  """29 CFR 1926.1207. (a) The employer trains each employee whose work is regulated by the standard, at no cost, in a language and
  vocabulary the employee understands, so the employee has the understanding, knowledge and skills for the assigned duties, including the
  hazards of the permit space and how they are isolated or controlled. (b) Training happens before the employee is first assigned duties,
  before there is a change in assigned duties, whenever a change in permit space operations brings a hazard the employee was not trained on,
  and whenever there is evidence of a deviation from entry procedures or that the employee's knowledge is inadequate. (c) The training
  establishes proficiency. (d) Training records show the employee's name, the trainer's name and the dates of training, and are kept for
  the period the employee works for the employer. Roles to train: entrants, attendants, entry supervisors, and the employer's own rescue
  team if it has one.""",
  '29 CFR 1926.1207(a)-(d)', SUBAA)
F('osha-pl-cs-roles-1', 'Duties of entrants, attendants and entry supervisors', T_CS,
  """29 CFR 1926.1208 to 1926.1210. Entrants know the hazards and the signs of exposure, use the equipment properly, keep in contact with
  the attendant, alert the attendant at any warning sign or prohibited condition, and get out fast when ordered, when an alarm sounds or
  when they notice a warning sign. Attendants know the hazards and the behavioral effects of exposure, keep an accurate count of entrants,
  stay outside the space until relieved by another attendant, keep in contact with entrants, watch conditions inside and outside, order
  evacuation when needed, summon rescue as soon as entrants may need help getting out, keep unauthorized people away, do non-entry rescue
  as the employer's procedure says, and take on no duty that interferes. Entry supervisors know the hazards,
  check that the permit is complete and tests are done before signing, verify rescue services are available and can be reached, remove
  unauthorized people, end the entry and cancel or suspend the permit when required, and check conditions when responsibility is handed
  over. One person can be supervisor and attendant, or supervisor and entrant, if trained and equipped for each role (OSHA FAQ).""",
  '29 CFR 1926.1208, 1926.1209, 1926.1210; OSHA Confined Spaces in Construction FAQ', SUBAA)
F('osha-pl-cs-rescue-1', 'Confined space rescue: retrieval lines and rescue services', T_CS,
  """29 CFR 1926.1211. (a) An employer who names a rescue service evaluates whether it can respond in time for the hazards and is able to
  do the rescue, picks one that can, tells it the hazards, gives it access to the spaces to plan and practice, and has it agree to notify
  the employer right away when it is unavailable. (b) An employer's own rescue team gets PPE and training, first aid and CPR with at least
  one member currently certified, and a practice rescue at least once every 12 months. (c) "Non-entry rescue is required unless the
  retrieval equipment would increase the overall risk of entry or would not contribute to the rescue of the entrant." Each entrant wears a
  chest or full body harness with a retrieval line attached at the center of the back near shoulder level or above the head; the other end
  is attached to a mechanical device or fixed point outside so rescue can begin as soon as needed. "A mechanical device must be available
  to retrieve personnel from vertical type permit spaces more than 5 feet (1.52 meters) deep." Calling 911 is not a rescue plan unless
  that service has been evaluated and has agreed.""",
  '29 CFR 1926.1211(a)-(d)', SUBAA)
F('osha-pl-cs-vs-gi-1', 'Construction confined space rule compared with general industry 1910.146', T_CS,
  """OSHA's FAQ on Subpart AA lists five ways the construction rule goes beyond the general industry rule (29 CFR 1910.146): (1) more
  detailed rules for coordinating when several employers are at the site; (2) a competent person evaluates the site and identifies
  confined spaces, including permit spaces; (3) continuous atmospheric monitoring whenever possible; (4) continuous monitoring of
  engulfment hazards, for example an upstream warning in a storm sewer where a storm could cause flash flooding; (5) a permit may be
  suspended instead of cancelled when conditions change, and the space is brought back to the permit's entry conditions before re-entry.
  Which rule applies depends on the work: building new or upgrading (construction) is Subpart AA; maintenance is 1910.146. OSHA says an
  employer doing both kinds of work in confined spaces meets its duty by following Subpart AA. The permit item lists are nearly the same:
  16 items in 1926.1206 against 15 in 1910.146(f).""",
  'OSHA Confined Spaces in Construction FAQ; 29 CFR 1926.1206; 29 CFR 1910.146(f)', 'https://www.osha.gov/confined-spaces-construction/faq',
  ed='OSHA FAQ page, read 2026-11-20')

# ------------------------------------------------------------------ Subpart M (fall protection)
F('osha-pl-fall-6ft-1', 'The 6 ft fall protection rule in construction', T_FALL,
  """29 CFR 1926.501(b)(1): "Each employee on a walking/working surface (horizontal and vertical surface) with an unprotected side or edge
  which is 6 feet (1.8 m) or more above a lower level shall be protected from falling by the use of guardrail systems, safety net systems,
  or personal fall arrest systems." (b)(15) is the catch-all with the same 6 ft for surfaces not otherwise addressed. (b)(6) ramps, runways
  and other walkways: guardrails at 6 ft or more. (a)(2): the employer first determines that the surface is strong enough to hold the
  people on it. Training: each employee who might be exposed to fall hazards is trained by a competent person, and the employer keeps a
  written certification record (1926.503). Some state plans use a different height, so check the job's state.""",
  '29 CFR 1926.501(a)(2), (b)(1), (b)(6), (b)(15); 1926.503', OSHA + '1926/1926.501')
F('osha-pl-fall-excavation-1', 'Fall protection at the edge of excavations, wells, pits and shafts', T_FALL,
  """29 CFR 1926.501(b)(7): "(i) Each employee at the edge of an excavation 6 feet (1.8 m) or more in depth shall be protected from
  falling by guardrail systems, fences, or barricades when the excavations are not readily seen because of plant growth or other visual
  barrier; (ii) Each employee at the edge of a well, pit, shaft, and similar excavation 6 feet (1.8 m) or more in depth shall be protected
  from falling by guardrail systems, fences, barricades, or covers." So an ordinary open trench that everyone can see does not need a
  guardrail along its edge under federal OSHA, but a hidden one does at 6 ft, and a well, pit, shaft, manhole excavation or bore pit 6 ft
  or deeper needs a guardrail, fence, barricade or cover. Crossings: 1926.651(l) requires a walkway where people cross, with guardrails at
  6 ft or more. Protecting the public around an open excavation is usually a contract, traffic control or local code matter on top of
  this.""",
  '29 CFR 1926.501(b)(7)(i)-(ii); 1926.651(l)', OSHA + '1926/1926.501')
F('osha-pl-fall-holes-covers-1', 'Holes and covers: manhole openings, plates and marked covers', T_FALL,
  """29 CFR 1926.501(b)(4): protect each employee from falling through holes more than 6 ft above lower levels with personal fall arrest,
  covers or guardrails; protect from tripping in or stepping into or through holes with covers; and protect from objects falling through
  holes with covers. 1926.502(i) covers: (1) covers in roadways and vehicular aisles support at least twice the maximum axle load of the
  largest vehicle expected to cross; (2) all other covers support at least twice the weight of the employees, equipment and materials that
  may be on them at one time; (3) "All covers shall be secured when installed so as to prevent accidental displacement by the wind,
  equipment, or employees." (4) Covers are color coded or marked with the word "HOLE" or "COVER". Cast iron manhole covers and steel
  grates used on streets are exempt from the marking rule. A sheet of plywood laid loose over an open manhole frame does not meet this.""",
  '29 CFR 1926.501(b)(4)(i)-(iii); 1926.502(i)(1)-(4)', OSHA + '1926/1926.502')
F('osha-pl-fall-guardrail-1', 'Guardrail numbers: 42 inches and 200 pounds', T_FALL,
  """29 CFR 1926.502(b): the top edge of the top rail is 42 inches, plus or minus 3 inches, above the walking or working level. Midrails,
  when used, go midway between the top rail and the walking level. The guardrail system can take, without failure, a force of at least 200
  pounds applied within 2 inches of the top edge in any outward or downward direction. Toeboards used for falling object protection are
  at least 3 1/2 inches high and take 50 pounds (1926.502(j)). These are the numbers for a guardrail on a trench walkway, around a shaft
  or pit, or on a bridge over an excavation.""",
  '29 CFR 1926.502(b)(1)-(3), (j)(2)-(3)', OSHA + '1926/1926.502')
F('osha-pl-fall-pfas-1', 'Personal fall arrest numbers: 5,000 lb anchor, 6 ft free fall', T_FALL,
  """29 CFR 1926.502(d). Anchorages for personal fall arrest are independent of any anchorage used to support or suspend platforms and
  hold at least 5,000 pounds per employee attached, or are designed and installed under a qualified person with a safety factor of at least
  two (d)(15). The system limits the arresting force on a body harness to 1,800 pounds, is rigged so the employee cannot free fall more
  than 6 feet or contact a lower level, and brings the employee to a complete stop within a deceleration distance of 3.5 feet (d)(16).
  "The employer shall provide for prompt rescue of employees in the event of a fall or shall assure that employees are able to rescue
  themselves" (d)(20). Inspect the system before each use and remove damaged parts (d)(21). A fall arrest harness and lanyard is not the
  same as a confined space retrieval harness and line; each has its own rule.""",
  '29 CFR 1926.502(d)(15), (d)(16), (d)(20), (d)(21)', OSHA + '1926/1926.502')
F('osha-pl-fall-objects-1', 'Protection from falling objects on a jobsite', T_FALL,
  """29 CFR 1926.501(c): when an employee is exposed to falling objects, the employer has each employee wear a hard hat and does one of
  these: (1) puts up toeboards, screens or guardrail systems to keep objects from falling from higher levels; (2) puts up a canopy and
  keeps objects far enough from the edge that they would not go over if knocked; or (3) barricades the area where objects could fall,
  keeps employees out of it, and keeps objects back from the edge. For trench work the matching excavation rules are the 2 ft setback for
  spoil, pipe and tools (1926.651(j)(2)) and no one under a load handled by lifting or digging equipment (1926.651(e)).""",
  '29 CFR 1926.501(c)(1)-(3); 1926.651(e), (j)(2)', OSHA + '1926/1926.501')

# ------------------------------------------------------------------ Subpart C
F('osha-pl-gen-program-1', 'The basic OSHA duties on every construction job (1926.20)', T_GEN,
  """29 CFR 1926.20(b): (1) "It shall be the responsibility of the employer to initiate and maintain such programs as may be necessary to
  comply with this part." (2) "Such programs shall provide for frequent and regular inspections of the job sites, materials, and equipment
  to be made by competent persons designated by the employers." (3) Machinery, tools, material or equipment that does not comply is not
  used: it is tagged or locked as unsafe or physically removed. (4) "The employer shall permit only those employees qualified by training or
  experience to operate equipment and machinery." 1926.20(f): PPE and training duties are owed to each employee, and each employee not
  given PPE or not trained can be a separate violation. Federal OSHA does not require a written safety program for construction in
  general, but several state plans do (written programs, safety committees), so check the job's state.""",
  '29 CFR 1926.20(b)(1)-(4), (f)(1)-(2)', OSHA + '1926/1926.20')
F('osha-pl-gen-training-1', 'OSHA training duty for construction workers (1926.21)', T_GEN,
  """29 CFR 1926.21(b)(2): the employer instructs each employee in the recognition and avoidance of unsafe conditions and in the
  regulations that apply to the employee's work environment, to control or eliminate hazards or other exposure to illness or injury. This
  is the general training rule behind toolbox talks. Specific rules add their own training: excavation (competent person), confined space
  (1926.1207, before first assignment, with records), fall protection (1926.503, with a written certification), silica (1926.1153(i)),
  hazard communication (1910.1200(h)), powered industrial trucks (1910.178(l)). Federal OSHA does not require an OSHA 10-hour card; some
  states and some owners do. Training has to be in a language the worker understands for the confined space rule (1926.1207(a)), and OSHA
  applies the same idea to other training.""",
  '29 CFR 1926.21(b)(2); 1926.1207(a); 1926.503', ECFR + '1926.21', ed=ED_LIB)
F('osha-pl-gen-competent-qualified-1', 'Competent person, qualified person, authorized person: the OSHA definitions', T_GEN,
  """29 CFR 1926.32. (f) Competent person: one who is capable of identifying existing and predictable hazards in the surroundings or
  working conditions which are unsanitary, hazardous, or dangerous to employees, and who has authorization to take prompt corrective
  measures to eliminate them. (m) Qualified: one who, by possession of a recognized degree, certificate, or professional standing, or who
  by extensive knowledge, training, and experience, has successfully demonstrated the ability to solve or resolve problems relating to the
  subject matter, the work, or the project. (d) Authorized person: a person approved or assigned by the employer to perform a specific type
  of duty or to be at a specific location on the jobsite; (i) designated person means the same. Federal OSHA issues no competent person
  card: the employer designates the person, and the test is knowledge plus authority to fix or stop.""",
  '29 CFR 1926.32(d), (f), (i), (m)', OSHA + '1926/1926.32')
F('osha-pl-general-duty-1', 'The General Duty Clause: hazards with no specific OSHA rule', T_GEN,
  """Section 5(a)(1) of the Occupational Safety and Health Act requires each employer to furnish employment and a place of employment
  free from recognized hazards that are causing or are likely to cause death or serious physical harm to employees. OSHA uses this clause
  where it has no specific standard. Heat is the main example for outdoor crews: there is no final federal heat standard, so federal heat
  citations are written under this clause. State plans have their own version of the clause. The wording of the Act was not re-read on
  2026-11-20; it is unconfirmed here only in that sense.""",
  'OSH Act of 1970, Section 5(a)(1) (29 U.S.C. 654)', 'https://www.osha.gov/heat-exposure/rulemaking', ed='OSH Act of 1970; OSHA heat page read 2026-11-20',
  conf='medium', unc='yes')

# ------------------------------------------------------------------ Subpart D
F('osha-pl-health-firstaid-1', 'First aid on the job: when a trained person must be on site', T_HLTH,
  """29 CFR 1926.50. (b) Arrange for prompt medical attention before the project starts. (c) "In the absence of an infirmary, clinic,
  hospital, or physician, that is reasonably accessible in terms of time and distance to the worksite", a person with a valid first aid
  certificate (American Red Cross or equivalent that can be shown on paper) is available at the worksite. (d) First aid supplies are easy
  to reach; the kit is in a weatherproof container with individually sealed packages and is checked before it goes out and at least weekly.
  (e) Have equipment to get an injured person to a doctor or hospital, or a way to call an ambulance. (f) Where 911 is not available, post
  the phone numbers of doctors, hospitals or ambulances. Where 911 is available but does not get the caller's location automatically, post
  the latitude and longitude of the worksite or other location information. (g) Where eyes or body may be exposed to corrosive materials,
  provide quick drenching or flushing facilities in the work area.""",
  '29 CFR 1926.50(a)-(g)', OSHA + '1926/1926.50')
F('osha-pl-health-water-toilets-1', 'Drinking water and toilets on a construction site', T_HLTH,
  """29 CFR 1926.51. (a) An adequate supply of potable water in all places of employment; portable containers close tightly and have a
  tap; no dipping; containers are marked and used for nothing else; no common drinking cup. (c) Toilets, Table D-1: 20 employees or less,
  1; 20 or more, 1 toilet seat and 1 urinal per 40 workers; 200 or more, 1 toilet seat and 1 urinal per 50 workers. Under temporary field
  conditions at least one toilet facility is available. The toilet table does not apply to mobile crews that have transportation readily
  available to nearby toilets (c)(4). (f) Washing facilities where people handle paints, coatings, herbicides, insecticides or other
  harmful contaminants. OSHA sets no number of quarts of water per hour; the state heat rules do.""",
  '29 CFR 1926.51(a), (c), (f)', ECFR + '1926.51', ed=ED_LIB)
F('osha-pl-health-noise-1', 'Noise limits in construction: 90 dBA for 8 hours', T_HLTH,
  """29 CFR 1926.52, Table D-2, permissible noise exposure (dBA, slow response): 8 hours at 90; 6 hours at 92; 4 hours at 95; 3 hours at
  97; 2 hours at 100; 1 1/2 hours at 102; 1 hour at 105; 1/2 hour at 110; 1/4 hour or less at 115. Impulsive or impact noise should not
  exceed 140 dB peak. When levels exceed the table, use feasible engineering or administrative controls first; if they do not bring the
  level down, provide and use hearing protection. Where levels exceed the table, a continuing, effective hearing conservation program is
  required (1926.52(d)(1)). 1926.101: ear protection is provided and used where levels cannot be reduced; ear inserts are fitted by a
  competent person; plain cotton is not acceptable. Saws, breakers, vac trucks and compactors are commonly over 90 dBA.""",
  '29 CFR 1926.52(a)-(e), Table D-2; 1926.101(a)-(c)', ECFR + '1926.52', ed=ED_LIB)

# ------------------------------------------------------------------ Silica
F('osha-pl-silica-basics-1', 'Silica rule basics for construction: limits and Table 1', T_SIL,
  """29 CFR 1926.1153 covers respirable crystalline silica in construction, except where exposure stays below 25 micrograms per cubic
  meter as an 8-hour average under any foreseeable conditions. Action level: 25. Permissible exposure limit (PEL): 50 micrograms per cubic
  meter, 8-hour average. The employer has two ways to comply: follow Table 1 fully for the task (the listed tool, water or vacuum control
  and the listed respirator), and then no air sampling is needed; or, for tasks not in Table 1 or where its controls are not fully used,
  measure exposure and keep it at or under the PEL. With wet methods, apply water at flow rates sufficient to minimize the release of
  visible dust. Housekeeping: no dry sweeping or dry brushing where it could add to exposure unless wet sweeping or HEPA vacuuming is not
  feasible; no compressed air for cleaning clothing or surfaces unless used with a ventilation system that captures the dust or no other
  method is feasible.""",
  '29 CFR 1926.1153(a), (b), (c)(1)-(2), (d)(1), (f)', OSHA + '1926/1926.1153')
F('osha-pl-silica-table1-1', 'Silica Table 1 for pipe crews: saws, drills, jackhammers, equipment', T_SIL,
  """29 CFR 1926.1153 Table 1 (respirator shown for 4 hours or less / more than 4 hours per shift; APF 10 means at least a tight N95 or
  half mask). Handheld power saw, any blade diameter, with an integrated water feed to the blade: outdoors none / APF 10; indoors or in an
  enclosed area APF 10 / APF 10. Walk-behind saw with integrated water feed: outdoors none / none; indoors APF 10 / APF 10. Rig-mounted core
  saw or drill with water to the cutting surface: none / none. Handheld and stand-mounted drills with a shroud and dust collector, and a
  HEPA vacuum to clean holes: none / none. Jackhammers and handheld powered chipping tools with a continuous stream or spray of water at
  the point of impact, or a shroud and dust collector: outdoors none / APF 10; indoors APF 10 / APF 10. Heavy equipment used to abrade or
  fracture silica material (hoe ram, rock ripping) or for demolition: operator in an enclosed cab, and water or dust suppressant when
  people outside the cab are involved: none / none. Heavy equipment for grading and excavating: water or dust suppressant as needed, or an
  enclosed cab when the operator is the only one on the task: none / none.""",
  '29 CFR 1926.1153(c)(1), Table 1 rows (ii), (iv), (vi), (vii), (x), (xvii), (xviii)', OSHA + '1926/1926.1153')
F('osha-pl-silica-plan-1', 'Silica written plan, competent person, medical exams and training', T_SIL,
  """29 CFR 1926.1153. (g) The employer has a written exposure control plan that describes the tasks with silica exposure, the engineering
  controls, work practices and respirators for each task, the housekeeping measures, and how access to the work area is restricted when
  needed to limit exposure, including dust made by other employers. The plan is reviewed at least once a year. (g)(4) The employer
  designates a competent person to make frequent and regular inspections of job sites, materials and equipment to carry out the plan.
  (h) Medical surveillance is offered at no cost to each employee who is required by this section to use a respirator 30 or more days per
  year. (i) Each covered employee can show knowledge of the health hazards, the tasks that could expose them, the controls, the contents of
  the rule, who the competent person is, and the purpose of the medical program. An enclosed cab used as a control is kept as free as
  practicable from settled dust, has working door seals, positive pressure, filtered intake air (95 percent efficient, MERV-16 or better)
  and heating and cooling.""",
  '29 CFR 1926.1153(c)(2)(iii), (g)(1)-(4), (h)(1), (i)(2)', OSHA + '1926/1926.1153')

# ------------------------------------------------------------------ Heat (federal)
F('osha-pl-heat-federal-1', 'Federal heat rule status: still a proposal', T_HEAT,
  """As of November 20, 2026 there is no final federal OSHA heat standard. OSHA published a proposed rule, Heat Injury and Illness
  Prevention in Outdoor and Indoor Work Settings, in the Federal Register on August 30, 2024. The comment period closed January 14, 2025;
  the informal public hearing ran June 16 through July 2, 2025; the post-hearing comment period ended October 30, 2025. OSHA's rulemaking
  page lists no later step and no final rule. Until a rule is final, federal OSHA enforces heat hazards under the General Duty Clause and
  its heat emphasis program, and the rules with real numbers are state rules. State plans with their own heat rule set the water, shade,
  rest and written plan duties for jobs in those states, so check the job's state.""",
  'OSHA, Heat Injury and Illness Prevention in Outdoor and Indoor Work Settings Rulemaking page', 'https://www.osha.gov/heat-exposure/rulemaking',
  ed='OSHA rulemaking page, read 2026-11-20')
F('osha-pl-heat-proposed-1', 'What the proposed federal heat rule would require (not in force)', T_HEAT,
  """OSHA's 2024 proposal, not in force, would add 29 CFR 1926.67 for construction, the same text as proposed 1910.148. Initial heat
  trigger: a heat index of 80 F (or a wet bulb globe temperature at the NIOSH alert limit): drinking water at 1 quart per employee per
  hour, a shaded or air-conditioned break area, paid rest breaks as needed, two-way communication, and acclimatization for new workers
  (for example 20, 40, 60 and 80 percent of a normal shift on days 1 to 4) and for workers back after more than 14 days away (50, 60, 80
  percent on days 1 to 3). High heat trigger: a heat index of 90 F: a paid 15-minute rest break at least every two hours, a buddy system
  or a supervisor watching no more than 20 employees, and a hazard alert. A written plan would be required for employers with more than
  10 employees, with a named heat safety coordinator. Exposure of 15 minutes or less in any 60 minutes would be exempt. None of this is
  enforceable until a final rule is published.""",
  'OSHA proposed rule text (NPRM published 2024-08-30), proposed 29 CFR 1910.148 and 1926.67', 'https://www.osha.gov/sites/default/files/Heat-NPRM-Final-Reg-Text.pdf',
  ed='Proposed rule text, 2024; read 2026-11-20', tier='shelf')

# ------------------------------------------------------------------ Subpart E
F('osha-pl-ppe-pay-1', 'Who pays for PPE under OSHA', T_PPE,
  """29 CFR 1926.95(d): protective equipment used to comply with the construction rules is provided by the employer at no cost to
  employees, with listed exceptions. The employer does not have to pay for non-specialty safety-toe footwear (steel-toe boots) or
  non-specialty prescription safety eyewear, if the employee is allowed to wear them off the jobsite. The employer does not have to pay
  for everyday clothing such as long-sleeve shirts, long pants, street shoes and normal work boots, or ordinary clothing and items used
  only for weather. 1926.95(a): PPE is provided, used and kept in a sanitary and reliable condition wherever hazards make it necessary.
  (c) PPE is of safe design and is selected so it properly fits each affected employee. Where an employee brings their own, the employer
  still has to make sure it is adequate and maintained (b). Some state plans require the employer to pay for all required PPE.""",
  '29 CFR 1926.95(a)-(d)', ECFR + '1926.95', ed=ED_LIB)
F('osha-pl-ppe-head-eye-1', 'Hard hats, eye protection and high-visibility vests', T_PPE,
  """29 CFR 1926.100(a): employees working where there is a possible danger of head injury from impact, falling or flying objects, or
  electrical shock and burns are protected by protective helmets, meeting one of the ANSI Z89.1 editions the rule lists. 1926.102(a):
  appropriate eye or face protection when exposed to flying particles, molten metal, liquid chemicals, acids or caustics, chemical gases or
  vapors, or injurious light; side protection when there are flying objects; devices meet one of the listed ANSI Z87.1 editions. 1926.28(a):
  the employer is responsible for requiring appropriate PPE wherever there is exposure to hazardous conditions. High visibility: employees
  exposed to public vehicular traffic at an excavation wear warning vests or other reflective or high-visibility garments (1926.651(d)),
  and flaggers' garments follow MUTCD Part 6 (1926.201(a)). Safety-toe footwear is covered by 1926.96.""",
  '29 CFR 1926.100(a)-(b); 1926.102(a)-(b); 1926.28(a); 1926.651(d); 1926.201(a)', ECFR + '1926.100', ed=ED_LIB)

# ------------------------------------------------------------------ Subpart G
F('osha-pl-signs-traffic-1', 'OSHA signs, tags and traffic control: the MUTCD link', T_MISC,
  """29 CFR 1926 Subpart G. 1926.200(a): signs and symbols are visible at all times when work is being performed and are removed or
  covered promptly when the hazard is gone. Danger signs are used only where an immediate hazard exists (red upper panel); caution signs
  warn of potential hazards or unsafe practices (yellow). (g)(1) "At points of hazard, construction areas shall be posted with legible
  traffic control signs" and protected by traffic control devices. (g)(2) Traffic control devices for the protection of construction
  workers conform to Part 6 of the MUTCD. 1926.201(a): flagger signaling and use, including warning garments, conform to Part 6 of the
  MUTCD. (h) Accident prevention tags are a temporary warning of an existing hazard, such as defective tools or equipment, and are not a
  substitute for signs. So OSHA does not write its own taper or sign spacing numbers: it points to the MUTCD, and the state's own MUTCD or
  supplement applies on that state's roads.""",
  '29 CFR 1926.200(a)-(c), (g)(1)-(2), (h); 1926.201(a)', 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926/subpart-G')

# ------------------------------------------------------------------ Subpart K and lockout
F('osha-pl-elec-underground-1', 'Electric lines underground and energized parts: the OSHA basics', T_ELEC,
  """29 CFR 1926.416(a): (1) no employee works so close to an electric power circuit that they could contact it, unless protected by
  deenergizing and grounding the circuit or guarding it by insulation or other means. (2) "In work areas where the exact location of
  underground electric powerlines is unknown, employees using jack-hammers, bars, or other hand tools which may contact a line shall be
  provided with insulated protective gloves." (3) Before work begins the employer finds out, by asking or by looking or with instruments,
  whether any energized circuit, exposed or concealed, is where people or tools could contact it, posts warning signs and tells the crew
  where the lines are and what to do. (e) Worn or frayed cords are not used; extension cords are not stapled, hung from nails or suspended
  by wire. 1926.417: controls being deactivated are tagged; deenergized equipment or circuits are made inoperative and tagged at every
  point where they could be energized.""",
  '29 CFR 1926.416(a)(1)-(3), (e); 1926.417(a)-(c)', ECFR + '1926.416', ed=ED_LIB)
F('osha-pl-lockout-1', 'Lockout/tagout: which OSHA rule applies on a pipe job', T_ELEC,
  """29 CFR 1910.147, the general industry lockout rule, covers servicing and maintenance of machines and equipment where unexpected
  start-up or release of stored energy could injure someone. It does not cover construction (1910.147(a)(1)(ii)). It requires an energy
  control program with written procedures, employee training and an inspection of each procedure at least annually. The lockout sequence:
  (1) prepare for shutdown, (2) shut the machine down, (3) isolate it from its energy sources, (4) apply the lock or tag, (5) release or
  restrain stored energy, (6) verify isolation before work. Before locks come off: inspect the area, make sure people are clear, notify
  affected employees. On construction work the lockout duties come from 1926.417 (tag and make circuits inoperative), the equipment
  rules, and for confined spaces the duty to isolate the space (1926.1204(c)(3)): pumps, valves, flow and gates are locked, blanked or
  plugged before entry. Work at an operating plant or lift station that is maintenance is under 1910.147 itself.""",
  '29 CFR 1910.147(a)(1), (c)(1), (c)(4), (c)(6), (d), (e); 1926.417; 1926.1204(c)(3)', OSHA + '1910/1910.147')
F('osha-pl-hazcom-1', 'Hazard communication: SDS, labels and training', T_MISC,
  """29 CFR 1910.1200 applies to construction through 1926.59. The employer has a written hazard communication program for the site, a
  list of the hazardous chemicals present, a label on each container, a safety data sheet (SDS) for each hazardous chemical that employees
  can get to during the shift, and training for employees when they are first assigned and when a new chemical hazard comes into their
  work area. For a pipe crew that means SDS on hand for primer and solvent cement, fuels, form oil, concrete and grout, epoxy, pipe lube and
  disinfectant (chlorine). On a site with several employers, each employer's program says how the others get the SDS and are told about
  the labels. Several state plans add right-to-know rules, such as yearly training.""",
  '29 CFR 1910.1200(e), (f), (g), (h); 29 CFR 1926.59', ECFR + '1910.1200', ed=ED_LIB)

# ------------------------------------------------------------------ Subparts N, O, CC
F('osha-pl-equip-vehicles-1', 'Trucks on site: backup alarms, seat belts, daily checks', T_EQ,
  """29 CFR 1926.601(b) motor vehicles on the jobsite: service, emergency and parking brakes in operable condition; no vehicle with an
  obstructed view to the rear is backed up unless it has "a reverse signal alarm audible above the surrounding noise level" or an observer
  signals that it is safe; haul vehicles loaded by crane, shovel or loader have a cab shield or canopy; seat belts and anchorages are
  installed; dump trucks have a permanently attached support that locks to hold the body up during maintenance; and vehicles are checked
  at the beginning of each shift, with all defects corrected before the vehicle is placed in service. 1926.600(a)(3)(ii): whenever
  equipment is parked, set the parking brake; on an incline, chock the wheels and set the brake.""",
  '29 CFR 1926.601(b)(1), (b)(4), (b)(6), (b)(9), (b)(10), (b)(14); 1926.600(a)(3)(ii)', 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926/subpart-O')
F('osha-pl-equip-earthmoving-1', 'Excavators, loaders and dozers: OSHA equipment rules', T_EQ,
  """29 CFR 1926.602(a) earthmoving equipment (scrapers, loaders, dozers, tractors, graders and similar): seat belts are provided, with
  rollover protection under Subpart W; equipment moves only on access roads and grades built and kept to carry it safely; service brakes
  can stop and hold the loaded machine. (a)(9)(i): bidirectional machines such as rollers, compactors, front-end loaders and bulldozers
  have a horn that can be heard above the surrounding noise. (a)(9)(ii): no earthmoving or compacting equipment with an obstructed view to
  the rear is used in reverse unless it has a reverse signal alarm that can be heard above the surrounding noise or an employee signals
  that it is safe. 1926.600(a)(3)(i): bulldozer and scraper blades, end-loader buckets, dump bodies and similar equipment are fully
  lowered or blocked when being repaired or when not in use. 1926.20(b)(4): only employees qualified by training or experience operate
  equipment. Forklift operators are trained under 1910.178(l) (1926.602(d)).""",
  '29 CFR 1926.602(a)(2)-(4), (a)(9)(i)-(ii), (d); 1926.600(a)(3)(i)', 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926/subpart-O')
F('osha-pl-equip-excavator-lift-1', 'Lifting pipe or a trench box with an excavator: which rules apply', T_EQ,
  """The crane standard, 29 CFR 1926 Subpart CC, excludes "Power shovels, excavators, wheel loaders, backhoes, loader backhoes, track
  loaders" and says this machinery is also excluded "when used with chains, slings or other rigging to lift suspended loads"
  (1926.1400(c)(2)). So setting pipe, structures or a trench box with an excavator is not crane work under Subpart CC, and the operator
  does not need crane operator certification for it. What still applies: no employee under a load handled by lifting or digging equipment
  (1926.651(e)); the rigging rules in 1926.251 (inspect slings and hardware before use each shift, pull damaged gear, stay within rated
  capacity); only qualified operators (1926.20(b)(4)); and the machine maker's lifting chart and lift points. A forklift is excluded from
  Subpart CC too, unless it is set up to hoist and lower a suspended load with a winch or hook. State plans may have their own rule for
  lifting with excavators.""",
  '29 CFR 1926.1400(c)(2), (c)(8); 1926.651(e); 1926.251; 1926.20(b)(4)', OSHA + '1926/1926.1400')
F('osha-pl-crane-powerline-1', 'Overhead power lines: 20 ft, or 10 ft up to 50 kV', T_EQ,
  """Cranes (29 CFR 1926.1408): before work, find out whether any part of the equipment, load line or load could get closer than 20 feet
  to a power line. If so, choose one: (1) have the utility confirm the line is deenergized and visibly grounded at the site; (2) keep
  everything at least 20 feet away; or (3) find the line's voltage and keep the Table A distance: up to 50 kV, 10 feet; over 50 to 200
  kV, 15 feet; over 200 to 350 kV, 20 feet; over 350 to 500 kV, 25 feet; over 500 to 750 kV, 35 feet; over 750 to 1,000 kV, 45 feet.
  Other equipment: 1926.600(a)(6) sets clearances for mechanized equipment near power lines, 10 feet for lines rated 50 kV or below.
  Excavators, dump trucks raising a bed and concrete pump booms are the usual contact. Assume every line is energized until the utility
  says otherwise, and use a spotter whose only job is the line.""",
  '29 CFR 1926.1408(a)(2), Table A; 1926.600(a)(6)', ECFR + '1926.1408', ed=ED_LIB)

# ------------------------------------------------------------------ Recordkeeping (1904)
F('osha-pl-report-8-24-1', 'Reporting a death or serious injury to federal OSHA: 8 hours and 24 hours', T_REC,
  """29 CFR 1904.39(a): report to OSHA within 8 hours after the death of any employee from a work-related incident, and within 24 hours
  after the in-patient hospitalization of one or more employees, an amputation, or the loss of an eye. How: call or go to the nearest OSHA
  Area Office, call 1-800-321-OSHA (1-800-321-6742), or use the online form at osha.gov. A voicemail, fax or email to a closed office does
  not count. A death is reportable only if it occurs within 30 days of the incident; a hospitalization, amputation or eye loss only if it
  occurs within 24 hours of the incident. If you learn of it later, the clock starts when you or your agent learn. In-patient
  hospitalization means formal admission for care or treatment; admission only for observation or tests is not reportable. A motor vehicle
  crash on a public road is reportable only if it happened in a construction work zone. All employers report, even those exempt from
  keeping the OSHA 300 log. Many state plans use shorter times or longer lists, so check the job's state.""",
  '29 CFR 1904.39(a)(1)-(3), (b)(1)-(11) (79 FR 56187, Sept. 18, 2014)', 'https://www.law.cornell.edu/cfr/text/29/1904.39')
F('osha-pl-record-recordable-1', 'What makes an injury OSHA recordable; the first aid list', T_REC,
  """29 CFR 1904.7: a work-related injury or illness is recordable on the OSHA 300 log if it results in death, days away from work,
  restricted work or transfer to another job, medical treatment beyond first aid, loss of consciousness, or a significant injury or
  illness diagnosed by a physician or other licensed health care professional (cancer, chronic irreversible disease, a fractured or
  cracked bone, a punctured eardrum). First aid, which does not make a case recordable, is a complete list: non-prescription medication at
  non-prescription strength; tetanus shots; cleaning, flushing or soaking surface wounds; bandages, gauze, butterfly bandages or
  Steri-Strips; hot or cold therapy; non-rigid supports such as elastic wraps; temporary immobilization for transport; drilling a nail or
  draining a blister; eye patches; removing something from the eye with irrigation or a cotton swab; removing splinters with tweezers or
  irrigation; finger guards; massage; drinking fluids for heat stress. Stitches, prescription drugs and rigid splints are medical
  treatment. Days away can be capped at 180.""",
  '29 CFR 1904.7(a), (b)(1), (b)(3)(vii), (b)(5)(ii), (b)(7)', OSHA + '1904/1904.7/')
F('osha-pl-record-forms-1', 'OSHA 300, 300A and 301: who keeps them and the dates', T_REC,
  """29 CFR Part 1904. Employers with 10 or fewer employees at all times during the last calendar year do not have to keep the OSHA
  injury and illness records unless OSHA or the Bureau of Labor Statistics tells them to in writing (1904.1); construction is not one of
  the low-hazard industries exempt under 1904.2. Covered employers enter each recordable case on the OSHA 300 log and a 301 incident
  report within 7 calendar days of learning of it (1904.29). The OSHA 300A annual summary is certified by a company executive and posted
  from February 1 to April 30 of the following year (1904.32). The log, summary and incident reports are kept for 5 years (1904.33).
  Larger establishments also send 300A data to OSHA electronically each year (1904.41). Reporting a death, hospitalization, amputation or
  eye loss (1904.39) applies to every employer, with or without a log. These sections were not checked against the rule text on
  2026-11-20, so the numbers here are unconfirmed until they are read; state plans may also require records from smaller employers.""",
  '29 CFR 1904.1, 1904.2, 1904.29, 1904.32, 1904.33, 1904.41', 'https://www.osha.gov/laws-regs/regulations/standardnumber/1904/', ed='29 CFR Part 1904 (not re-read 2026-11-20)',
  conf='medium', tier='shelf', unc='yes')

# ------------------------------------------------------------------ not re-read today (shelf, unconfirmed)
def U(id, title, topic, text, src, url):
    F(id, title, topic, text + NOTREAD, src, url, ed='29 CFR text (not re-read 2026-11-20)', conf='medium', tier='shelf', unc='yes')
U('osha-pl-health-lead-1', 'Lead in construction: the OSHA limits', T_HLTH,
  """29 CFR 1926.62 covers lead in construction, which a pipe crew can meet when cutting or burning old lead-jointed cast iron pipe, lead
  service lines, lead paint on steel, or lead-sheathed cable. The permissible exposure limit is 50 micrograms per cubic meter of air as
  an 8-hour average and the action level is 30. Until the employer has measured exposure, certain tasks are treated as over the limit and
  need respirators, protective clothing, change areas, hand washing, blood tests and training. Do not eat, drink or smoke in the work
  area, and wash before breaks.""", '29 CFR 1926.62(b), (c), (d)', ECFR + '1926.62')
U('osha-pl-fire-1', 'Fire extinguishers and fuel on a construction site', T_MISC,
  """29 CFR 1926.150 and 1926.152. A fire extinguisher rated at least 2A is provided for each 3,000 square feet of protected building
  area, with travel distance to the nearest one not over 100 feet. At least one extinguisher rated 10B or higher is within 50 feet of any
  place where more than 5 gallons of flammable or combustible liquid or 5 pounds of flammable gas is used. Flammable liquids are kept in
  approved containers; safety cans for quantities of 5 gallons or less. Fueling: shut the engine off, no smoking or open flame, and keep an
  extinguisher at the fuel service area. Extinguishers are inspected and kept in working order.""",
  '29 CFR 1926.150(c)(1); 1926.152(a), (g)', ECFR + '1926.150')
U('osha-pl-elec-gfci-1', 'GFCI protection for cords and tools on a jobsite', T_ELEC,
  """29 CFR 1926.404(b)(1): the employer uses either ground-fault circuit interrupters or an assured equipment grounding conductor
  program to protect employees. With GFCIs, all 120-volt, single-phase, 15- and 20-ampere receptacle outlets on construction sites that
  are not part of the permanent wiring have approved GFCI protection. That covers generators, pumps, saws and lights run from temporary
  power; small portable generators of 5 kW or less with a two-wire ungrounded system are an exception in the rule. The other option is a
  written assured equipment grounding program with a competent person, visual inspection of cords before each day's use, and periodic
  continuity tests.""", '29 CFR 1926.404(b)(1)(i)-(iii)', ECFR + '1926.404')
U('osha-pl-scaffold-1', 'Scaffolds in brief: the numbers a pipe crew meets', T_MISC,
  """29 CFR 1926 Subpart L (1926.450 to 1926.454). A scaffold carries its own weight plus at least 4 times the maximum intended load.
  Fall protection on a scaffold is required at more than 10 feet above a lower level, not 6 feet. A competent person inspects the
  scaffold before each work shift and after anything that could affect it, and scaffolds are erected, moved and taken down only under a
  competent person. Access by ladder, stair tower or ramp is needed when the platform is more than 2 feet above or below the access point.
  Inside a deep structure or wet well a scaffold is also inside a confined space, and both rules apply.""",
  '29 CFR 1926.451(a)(1), (e)(1), (f)(3), (f)(7), (g)(1)', ECFR + '1926.451')
U('osha-pl-crane-basics-1', 'Cranes on a pipe job: operator, signal person and keeping clear', T_EQ,
  """29 CFR 1926 Subpart CC applies when a crane, boom truck or similar hoisting machine sets structures, vaults, pipe or trench boxes.
  The operator is trained, certified or licensed, and evaluated by the employer on the machine (1926.1427). A signal person is needed when
  the point of operation is not in full view of the operator, when the view is blocked in the direction of travel, or when the operator or
  the person handling the load sees a need (1926.1419), and signal persons are qualified (1926.1428). Riggers are qualified. Hoisting
  routes that keep loads from passing over people are used where possible, and people stay out of the fall zone except those hooking,
  unhooking or guiding the load (1926.1425). A competent person inspects the crane each shift. Excavators and backhoes are excluded from
  Subpart CC.""", '29 CFR 1926.1419(a), 1926.1425, 1926.1427, 1926.1428, 1926.1412', ECFR + '1926.1427')
U('osha-pl-concrete-1', 'Rebar caps and concrete work rules', T_MISC,
  """29 CFR 1926 Subpart Q. 1926.701(b): all protruding reinforcing steel, onto and into which employees could fall, is guarded to
  eliminate the hazard of impalement; ordinary small plastic mushroom caps do not stop impalement from a fall, so use caps or troughs made
  for it or bend the bars over. No employee works under concrete buckets while they are being raised or lowered into position.
  1926.703: formwork is designed and braced to carry all loads, and forms and shores are not removed until the concrete can support its
  weight. 1926.704: precast pieces such as manhole sections, vaults and box culverts are supported so they cannot tip over or collapse
  until permanently connected, and no one is under a precast piece being lifted or tilted into position unless needed for the erection.""",
  '29 CFR 1926.701(b), (e); 1926.703(a), (e); 1926.704(a), (e)', ECFR + '1926.701')
U('osha-pl-tunnel-1', 'Tunnels, shafts and jacked pipe: when OSHA Subpart S applies', T_MISC,
  """29 CFR 1926.800 covers the construction of underground tunnels, shafts, chambers and passageways, and cut-and-cover excavations
  that are connected to ongoing underground construction or that create conditions like underground construction. Work under Subpart S is
  outside the confined space rule (1926.1201(b)). Key duties: a check-in and check-out procedure so the surface knows who is underground;
  at least one designated person on duty above ground who can summon help; a competent person who tests the air as often as needed
  (oxygen at least 19.5 percent, and limits on flammable gas, carbon monoxide and hydrogen sulfide); mechanical ventilation; a
  classification as potentially gassy or gassy when methane is found; rescue teams or services arranged in advance; and emergency lighting
  for each person underground. Large-diameter jacking and microtunnel shafts and tunnels that people enter usually fall here, not under
  the trench rule.""", '29 CFR 1926.800(a), (c), (g), (j), (k)', ECFR + '1926.800')
U('osha-pl-asbestos-pipe-1', 'Asbestos cement (transite) pipe: the OSHA rule', T_MISC,
  """29 CFR 1926.1101 covers asbestos in construction, including cutting, tapping, removing or repairing asbestos cement (AC, transite)
  water and sewer pipe. The permissible exposure limit is 0.1 fiber per cubic centimeter of air as an 8-hour average, with an excursion
  limit of 1.0 fiber over 30 minutes. Work on AC pipe is supervised by a competent person, uses wet methods and tools that do not make
  dust (snap cutters, wet hand tools; no dry abrasive saw cutting), and is done by trained workers. Waste pipe is kept wet, wrapped or
  bagged and labeled. State and local air rules and the owner's specifications often add notice and disposal steps.""",
  '29 CFR 1926.1101(c), (g), (k), (o)', ECFR + '1926.1101')

# ------------------------------------------------------------------ State plans (general, US scope)
F('osha-pl-stateplans-1', 'Which states run their own OSHA plan', T_SP,
  """OSHA lists 29 State Plans. 22 cover private employers and state and local government: AK, AZ, CA, HI, IN, IA, KY, MD, MI,
  MN, NV, NM, NC, OR, SC, TN, UT, VT, VA, WA, WY and Puerto Rico. 7 cover state and local government workers only: CT, IL, ME, MA,
  NJ, NY and the U.S. Virgin Islands; private crews there are under federal OSHA. Everywhere else federal OSHA covers private employers.
  A State Plan must be at least as effective as federal OSHA, and it can be stricter or have rules federal OSHA does not. Even inside a
  plan state, federal OSHA usually keeps jobs on military bases, tribal lands, some federal enclaves and national parks, and maritime
  work. For a pipe crew the things that most often change by state are the trench protection depth, heat rules, injury reporting times,
  written safety program and training card rules, and fall protection heights.""",
  'OSHA State Plans page', 'https://www.osha.gov/stateplans', ed='OSHA State Plans page, read 2026-11-20')
F('osha-pl-territories-1', 'OSHA in Puerto Rico and the U.S. territories', T_SP,
  """Puerto Rico has an OSHA-approved State Plan (PR OSHA) covering private employers and state and local government, so a job there
  follows PR OSHA's rules. The U.S. Virgin Islands plan covers state and local government workers only; private employers there are under
  federal OSHA. American Samoa, Guam and the Northern Mariana Islands have no approved State Plan: federal OSHA covers most private
  employers there. Federal OSHA's 29 CFR 1926 rules, including the 5 ft trench rule and the confined space rule, are the floor in all of
  them. Which Puerto Rico rules differ from the federal text was not checked: it is not confirmed here whether PR OSHA is stricter on
  trenching, heat or reporting, so ask PR OSHA for a job there.""",
  'OSHA State Plans page', 'https://www.osha.gov/stateplans', ed='OSHA State Plans page, read 2026-11-20', conf='low', unc='yes')

# ------------------------------------------------------------------ Interpretation letters
def L(id, title, text, src, url):
    F(id, title, T_LOI, text, src, url, ed='OSHA letter of interpretation, read 2026-11-20')
L('osha-loi-trench-avg-depth-1', 'OSHA letter: you cannot average trench depth to stay under 5 ft',
  """OSHA letter of September 30, 2004, "Permissibility of using average excavation depth to determine protective system requirements for
  the excavation." The question: a trench has some spots deeper than 5 ft and some shallower, and the average is under 5 ft. OSHA's
  answer: no. The exception in 29 CFR 1926.652(a)(1)(ii) is not based on an average. "Protective measures are required at each point where
  the excavation is 5 feet or deeper." Shallower stretches need protection only if the competent person's examination shows a potential
  cave-in. The letter adds that the definition of an excavation has no minimum length, because the danger at 5 ft or more does not depend
  on how long the cut is. So a short deep spot at a tie-in or a service crossing needs a box, shoring or a slope even if the rest of the
  run is shallow.""", 'OSHA Standard Interpretation, 2004-09-30 (1926.652(a)(1)(ii))', LOI + '2004-09-30')
L('osha-loi-trench-stacking-1', 'OSHA letter: stacking trench boxes',
  """OSHA letter of October 29, 1991, "Stacking trench boxes in trenches." A trade association asked whether, when two trench boxes are
  stacked, the top box has to be rated for the full depth of the trench. OSHA's answer: stacked shields "do not all have to be designed
  to resist the forces calculated for the deepest part of the trench." "The standard only requires that the shields be used at a depth not
  greater than that for which they are designed." OSHA suggested a design feature or a marking system showing each shield's maximum depth
  so a lighter box does not end up on the bottom. In practice: stack only as the manufacturer's tabulated data allows, pin the boxes
  together as the data says, put the deeper-rated box at the bottom, and keep the data on site.""",
  'OSHA Standard Interpretation, 1991-10-29 (1926.650, 1926.652)', LOI + '1991-10-29')
L('osha-loi-trench-water-1', 'OSHA letter: working in a trench that has water in it',
  """OSHA letter of March 23, 1992, "Construction standards addressing excavations." The question: may employees enter a trench with
  water in it if they are protected from cave-in by shoring, shields or sloping and the water level is controlled? OSHA's answer: 29 CFR
  1926.651(h) allows it "provided adequate precautions have been taken to protect employees against the hazards posed by water
  accumulation." The precautions depend on the situation, and OSHA said extra shoring and controlling the water level may not always give
  the protection required. So there is no fixed number of inches of water that is allowed: the competent person decides, watches the
  pumps, and treats soaked or seeping soil as Type C.""", 'OSHA Standard Interpretation, 1992-03-23 (1926.651(h))', LOI + '1992-03-23')
L('osha-loi-trench-tabdata-1', "OSHA letter: manufacturer's tabulated data needs no extra engineer stamp",
  """OSHA letter of May 21, 1992 on 29 CFR 1926.652(c) Option 2. OSHA agreed that trench protective systems may be designed using the
  manufacturer's tabulated data "without additional certification from a registered professional engineer", because tabulated data is by
  definition already approved by a registered professional engineer, so "additional certification is not necessary." What the crew needs:
  the tabulated data for the box or shoring actually in the trench, on site, and use that stays inside it (depth, soil type, spacing).
  Any deviation needs the manufacturer's written approval (1926.652(c)(2)).""",
  'OSHA Standard Interpretation, 1992-05-21 (1926.652(c), 1926.650(b))', LOI + '1992-05-21-2')
L('osha-loi-trench-over20-1', 'OSHA letter: trenches deeper than 20 ft and the engineer',
  """OSHA letter of December 22, 2003, on combination trench shield and sloping systems deeper than 20 ft. A shield manufacturer's
  tabulated data said to slope above the shield "per OSHA requirements." OSHA's answer: that is not enough over 20 ft, because Subpart P
  gives no sloping criteria beyond 20 ft: "Sloping or benching for excavations greater than 20 feet deep shall be designed by a registered
  professional engineer." The letter also says an engineer who approves tabulated data used in many states does not have to be registered
  in each state, but the engineer who approves an employer's own sloping design under 1926.652(b)(4) must be registered in the state where
  the work is done.""", 'OSHA Standard Interpretation, 2003-12-22 (1926.652(b)(3)-(4))', LOI + '2003-12-22')
L('osha-loi-storm-manhole-1', 'OSHA letter: a storm sewer manhole is a confined space',
  """OSHA letter of June 15, 1992 to a utility contractors association, "Soil testing for excavations and confined spaces." Three
  answers. (1) The thumb penetration test may be used to identify Type B soil. (2) A storm sewer manhole that is not connected to a raw
  sewage line is still a confined space, because rain can wash contaminants in: such manholes "must be considered confined spaces" and the
  atmosphere "must be tested before an employee enters it." (3) A trench usually has natural ventilation and is not a confined space
  unless the factors in 29 CFR 1926.651(g) are present, while other enclosed areas with limited access generally are. The letter predates
  the 2015 construction confined space rule (Subpart AA), which now covers manholes and sewers directly.""",
  'OSHA Standard Interpretation, 1992-06-15 (1926.651(g), 1910.146)', LOI + '1992-06-15')
L('osha-loi-shield-18in-1', 'OSHA letter: the 18 inch rule for a trench box at ground level',
  """OSHA letter of August 10, 2000, "Trench shield must extend 18 inches above excavation walls when below grade." A shield
  manufacturer asked whether the 18 inch extension applies when it would put the top of the box above ground level. OSHA's answer: no,
  "the standard does not require trench shields to extend above grade." The 18 inches in Appendix B applies where the box sits in the
  vertical lower part of a trench with a sloped cut above it: there the box extends at least 18 inches above the top of the vertical side
  so material from the slope cannot roll in. The 2 ft setback for spoil and materials (1926.651(j)(2)) still applies at the surface.""",
  'OSHA Standard Interpretation, 2000-08-10 (1926.652(b), 1926.651(j)(2))', LOI + '2000-08-10-0')
L('osha-loi-trench-ladder-1', 'OSHA letter: the ladder stays in the trench',
  """OSHA letter of March 17, 2009, "Removing ladders during trenching activities; compliance with 29 CFR 1926.651(c)(2)." An employer
  asked to pull the ladder out of a trench box after workers go in, keep it at the exit point, and have two trained workers outside ready
  to lower it. OSHA's answer: 1926.651(c)(2) requires a safe means of egress in trench excavations 4 ft or deeper that employees can use
  at all times, and "the system you describe would not be considered an 'other safe means of egress'", because it delays getting out and
  can fail. OSHA said it knew of no hazard from leaving the ladder in that outweighs the hazard of not having it.""",
  'OSHA Standard Interpretation, 2009-03-17 (1926.651(c)(2))', LOI + '2009-03-17')
L('osha-loi-competent-person-1', 'OSHA memo: no competent person at the trench is a citation',
  """OSHA memo of January 9, 1991, "Clarification of Excavation Standards." OSHA told its field offices that the competent person's
  duties vary with the protective system option used under 29 CFR 1926.652. Under 1926.651(k) a competent person inspects before work
  starts and daily, and 1926.651(k) is cited when no competent person is available to do those inspections. For the options that depend
  on soil type, the competent person does the visual and manual soil tests, and a manual test is expected whenever the soil looks like it
  is getting worse, because dug soil "can only deteriorate." If employees are in an excavation said to comply with 1926.652(b) or (c) and
  no competent person is present, both 1926.651(k) and the 1926.652 paragraph are cited. The federal rule does not say in so many words
  that the competent person must stay at the trench all day; some state plans do.""",
  'OSHA memorandum, 1991-01-09 (1926.651(k), 1926.652)', LOI + '1991-01-09')
