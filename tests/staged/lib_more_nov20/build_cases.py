# build_cases.py (lib_more_nov20): eval cases in the LIBRARY_RULES.md section 5 layout. Run: python3 build_cases.py
# cases_new.jsonl      -> answers live in the 37 staged chunks (lib_more.jsonl). Cannot pass until those chunks are loaded.
# cases_existing.jsonl -> answers already in the live library (testing, survey math, equipment, first aid, pipe and taps): can run today.
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
def C(id, cat, q, where, level, kind, must, lead, chunks, mustnot=(), strict=False):
    d = dict(id=id, cat=cat, q=q, where=where, level=level, kind=kind, must=list(must), lead=list(lead), mustnot=list(mustnot), chunks=list(chunks))
    if kind == 'complex': d['complex'] = True
    if strict: d['state_strict'] = True
    return d
NEW = [
 # ---- DOT for crews (fed-fmcsa, fed-fhwa, fed-phmsa)
 C('lib-us-fed-1', 'dot', 'Do I need a CDL to pull our mini excavator trailer with the 1 ton? Truck is 14,000 GVWR and the trailer is 14,000.', 'Omaha, NE', 'foreman', 'rule',
   ['Class A|CDL', '26,?001', '10,?000'], ['yes|Class A|need a CDL'], ['fed-fmcsa-cdl-classes-1'], ['no CDL (is )?(needed|required)']),
 C('lib-us-fed-2', 'dot', 'How many hours can my dump truck driver drive in a day?', 'Tulsa, OK', 'office', 'rule',
   ['11 hours', '14'], ['11 hours'], ['fed-fmcsa-hos-limits-1']),
 C('lib-us-fed-3', 'dot', 'Do our crew truck drivers have to keep a logbook? We never go more than 40 miles from the yard.', 'Boise, ID', 'office', 'rule',
   ['150 air.?miles?', 'time (records?|cards?)|6 months'], ['no|short.haul|not need'], ['fed-fmcsa-hos-shorthaul-1', 'fed-fmcsa-eld-exempt-1']),
 C('lib-us-fed-4', 'dot', 'I started at 6 am laying pipe and its 8:30 pm now. Can I drive the truck and trailer with the excavator back to the yard?', 'Kansas City, MO', 'pipelayer', 'rule',
   ['14', 'on.duty|on duty'], ['no|cannot|can.t|not (legally )?drive'], ['fed-fmcsa-hos-onduty-1', 'fed-fmcsa-hos-limits-1'], ['yes, you can']),
 C('lib-us-fed-5', 'dot', 'Does my equipment trailer need its own DOT inspection sticker?', 'Little Rock, AR', 'foreman', 'simple',
   ['12 months|every year|annual|yearly', 'trailer'], ['yes'], ['fed-fmcsa-annual-inspection-1']),
 C('lib-us-fed-6', 'dot', 'Do I need a DOT medical card to drive the one ton and trailer if I dont have a CDL?', 'Cheyenne, WY', 'pipelayer', 'rule',
   ['10,?001', '24 months|2 years|two years'], ['yes|10,?001'], ['fed-fmcsa-medical-card-1', 'fed-fmcsa-cmv-10001-1']),
 C('lib-us-fed-7', 'dot', 'How often do I have to stop and check the chains on the excavator when hauling it?', 'Billings, MT', 'pipelayer', 'simple',
   ['50 miles', '3 hours|150 miles'], ['50 miles'], ['fed-fmcsa-cargo-check-1']),
 C('lib-us-fed-8', 'dot', 'Do I have to fill out a post trip inspection report every day on the dump truck?', 'Sioux Falls, SD', 'pipelayer', 'rule',
   ['defect', '396\\.11|three months|3 months|before driving|pre.?trip'], ['no|only (if|when)|defect'], ['fed-fmcsa-dvir-1']),
 C('lib-us-fed-9', 'dot', 'How many gas cans can we carry in the crew truck before we need hazmat placards?', 'Jackson, MS', 'foreman', 'rule',
   ['8 gallons?', '440 (lb|pounds)'], ['8 gallons?|440'], ['fed-phmsa-fuel-cans-1']),
 C('lib-us-fed-10', 'dot', 'Whats the max weight on a tandem axle on the interstate?', 'Albuquerque, NM', 'office', 'simple',
   ['34,?000'], ['34,?000'], ['fed-fhwa-size-weight-1']),
 C('lib-us-fed-11', 'dot', 'Does a utility service truck have to follow hours of service? We are putting in new water main for a developer.', 'Fargo, ND', 'office', 'complex',
   ['395\\.1\\(n\\)|utility service vehicle', 'not confirmed|ask|check with|state'], ['utility service vehicle|not confirmed|depends'], ['fed-fmcsa-hos-construction-1']),
 C('lib-us-fed-12', 'dot', 'Do we need a DOT number on our pickups? We only work in state.', 'Phoenix, AZ', 'office', 'rule',
   ['10,?001', 'Arizona|state'], ['yes|10,?001|Arizona'], ['fed-fmcsa-usdot-number-1']),
 # ---- stormwater (fed-epa-cgp, env-tx)
 C('lib-us-fed-13', 'stormwater', 'How often do we have to do the SWPPP inspection?', 'Santa Fe, NM', 'foreman', 'rule',
   ['7 (calendar )?days', '14 (calendar )?days', '0?\\.25 ?(in|")'], ['7 (calendar )?days'], ['fed-epa-cgp-inspections-1']),
 C('lib-us-fed-14', 'stormwater', 'When does the silt fence need to be cleaned out?', 'Manchester, NH', 'pipelayer', 'simple',
   ['half|one.half|1/2'], ['half|one.half|1/2'], ['fed-epa-cgp-stabilization-1']),
 C('lib-us-fed-15', 'stormwater', 'We are pumping the trench out to the ditch. What do I have to check?', 'Boston, MA', 'pipelayer', 'rule',
   ['sheen|foam', 'daily|once (a|per) day|each day'], ['daily|once (a|per) day|each day|sheen|foam|sediment'], ['fed-epa-cgp-dewatering-1']),
 C('lib-us-fed-16', 'stormwater', 'How big does a job have to be before it needs a stormwater permit?', 'Roswell, NM', 'office', 'simple',
   ['(1|one) (or more )?acres?'], ['(1|one) (or more )?acres?'], ['fed-epa-cgp-who-1']),
 C('lib-tx-env-1', 'stormwater', 'Do I have to file an NOI for a 3 acre job?', 'Houston, TX', 'office', 'rule',
   ['site notice', 'SWP3|SWPPP', '5 (or more )?acres'], ['no'], ['env-tx-cgp-1'], strict=True),
 C('lib-us-fed-17', 'stormwater', 'How long do we keep the SWPPP inspection reports after the job?', 'Concord, NH', 'office', 'simple',
   ['3 years|three years'], ['3 years|three years'], ['fed-epa-cgp-paperwork-1', 'fed-epa-cgp-inspections-1']),
 # ---- asbestos-cement pipe
 C('lib-us-osha-1', 'environmental', 'Can I cut transite pipe with the chop saw if I keep it wet?', 'Tucson, AZ', 'pipelayer', 'rule',
   ['snap cutter|wet', 'Class II|1926\\.1101|trained|competent person'], ['no'], ['osha-loi-acpipe-class-1', 'fed-epa-acpipe-neshap-1'], ['yes, you can']),
 C('lib-us-fed-18', 'environmental', 'How much AC pipe can we take out before we have to notify the EPA?', 'Wichita, KS', 'office', 'rule',
   ['260 (linear )?(ft|feet)', '10 working days'], ['260'], ['fed-epa-acpipe-neshap-1']),
 C('lib-us-fed-19', 'environmental', 'Can we pipe burst an old asbestos cement water main?', 'Denver, CO', 'office', 'complex',
   ['not approved|neither approved|has not approved', 'slurrification|CTPS|air agency|owner'], ['not approved|neither approved|has not approved|no'], ['fed-epa-acpipe-bursting-1']),
 # ---- spills / fuel
 C('lib-us-fed-20', 'environmental', 'Hydraulic hose blew and theres a sheen on the creek. Who do I call?', 'Charleston, WV', 'foreman', 'rule',
   ['800.?424.?8802', 'National Response Center|NRC'], ['800.?424.?8802|National Response Center'], ['fed-epa-spill-report-1']),
 C('lib-us-fed-21', 'environmental', 'We have a 1000 gallon and a 500 gallon diesel tank at the yard. Do we need a spill plan?', 'Des Moines, IA', 'office', 'rule',
   ['1,?320', 'SPCC'], ['yes|SPCC|1,?320'], ['fed-epa-spcc-1']),
 C('lib-us-fed-22', 'environmental', 'Operator just dug up what looks like bones. What do we do?', 'Rapid City, SD', 'pipelayer', 'steps',
   ['stop', 'coroner|police|medical examiner|sheriff'], ['stop'], ['fed-achp-discovery-1'], ['keep digging|rebury|cover (it|them) (back )?up']),
 C('lib-us-fed-23', 'environmental', 'Are the 2021 nationwide permits for creek crossings still good?', 'Nashville, TN', 'office', 'rule',
   ['March 1[45], 2026', '2026'], ['no|expired|March 1[45], 2026'], ['fed-usace-nwp-2026-1']),
 # ---- disinfection (std-awwa, spec-fl)
 C('lib-us-std-1', 'water', 'How long between the two sets of bac-t samples on a new main?', 'Spokane, WA', 'foreman', 'rule',
   ['16 ?(h|hours)', 'spec|agency|edition'], ['16 ?(h|hours)'], ['std-awwa-c651-bact-1']),
 C('lib-us-std-2', 'water', 'How much chlorine and how long for the continuous feed method?', 'Salt Lake City, UT', 'foreman', 'rule',
   ['25 ?(mg/L|ppm)', '24 ?(h|hours)', '10 ?(mg/L|ppm)'], ['25 ?(mg/L|ppm)'], ['std-awwa-c651-methods-1']),
 C('lib-us-std-3', 'water', 'Do I have to chlorinate and sample the tie-in piece? Its one 18 ft stick.', 'Reno, NV', 'pipelayer', 'rule',
   ['1 ?(%|percent)', 'swab|spray'], ['swab|spray|1 ?(%|percent)'], ['std-awwa-c651-repairs-1']),
 C('lib-fl-spec-1', 'water', 'Can I pull both sets of bac-t samples the same day?', 'Orlando, FL', 'foreman', 'rule',
   ['separate day', '6 hours|six hours', '62-555'], ['no'], ['spec-fl-dep-main-disinfection-1'], strict=True),
 C('lib-us-std-4', 'water', 'What flushing velocity do we need before chlorinating?', 'Portland, ME', 'foreman', 'simple',
   ['3(\\.0)? ?(ft|feet|fps)'], ['3(\\.0)? ?(ft|feet|fps)'], ['std-awwa-c651-methods-1']),
 # ---- permits (row)
 C('lib-ca-row-1', 'permits', 'What form do I need to work in the Caltrans right of way and how long does it take?', 'Temecula, CA', 'office', 'rule',
   ['TR-?0100', '60 (calendar )?days', 'CEPS'], ['TR-?0100|encroachment permit'], ['row-ca-encroachment-1'], strict=True),
 C('lib-tx-row-1', 'permits', 'Who files the permit to bore under a state highway, us or the city?', 'San Antonio, TX', 'office', 'rule',
   ['UIR|Utility Installation Review', 'owner|city'], ['owner|city|utility'], ['row-tx-uir-1'], strict=True),
 C('lib-fl-row-1', 'permits', 'What manual covers utility work on a state road?', 'Tampa, FL', 'office', 'simple',
   ['Utility Accommodation Manual|UAM', '2017'], ['Utility Accommodation Manual|UAM'], ['row-fl-utility-permit-1'], strict=True),
 # ---- prevailing wage paperwork / getting paid
 C('lib-us-fed-24', 'office', 'When is certified payroll due on a Davis-Bacon job?', 'Lincoln, NE', 'office', 'simple',
   ['7 days|seven days', 'payday|payment date|pay date'], ['7 days|seven days'], ['fed-dol-certified-payroll-due-1']),
 C('lib-us-fed-25', 'office', 'We are a sub to a sub on an Army Corps job and havent been paid. How long do we have to send notice?', 'Savannah, GA', 'office', 'rule',
   ['90 days', 'one year|1 year', 'Miller Act|payment bond'], ['90 days'], ['fed-law-miller-act-1']),
 C('lib-us-fed-26', 'office', 'How long do we keep certified payroll records?', 'Louisville, KY', 'office', 'simple',
   ['3 years|three years'], ['3 years|three years'], ['fed-dol-certified-payroll-due-1']),
 C('lib-ca-lic-1', 'office', 'How soon do I have to send a prelim notice on a private job?', 'Murrieta, CA', 'office', 'simple',
   ['20 days'], ['20 days'], ['lic-ca-prelim-notice-1'], strict=True),
 C('lib-ca-lic-2', 'office', 'We are the pipe sub to the GC on a city job. Do we have to send a preliminary notice?', 'Riverside, CA', 'office', 'rule',
   ['direct contract|9300', 'supplier|sub'], ['no'], ['lic-ca-prelim-notice-1'], strict=True),
]
EXIST = [
 # ---- testing (already in the live library)
 C('lib-us-test-1', 'testing', 'How much makeup water is allowed on 1,000 ft of 12 inch at 150 psi for a 2 hour test?', 'Topeka, KS', 'foreman', 'rule',
   ['0\\.99|1\\.0 ?gal|1\\.98|1\\.99|2\\.0 ?gal|about 2 gal', '148,?000'], ['0\\.99|1\\.98|1\\.99|about (1|2) gal|2\\.0'], ['testing-water-2', 'testing-water-3']),
 C('lib-us-test-2', 'testing', 'What size mandrel for the deflection test and when can we pull it?', 'Columbia, SC', 'foreman', 'rule',
   ['95 ?%|5 ?%', '30 days'], ['95 ?%|5 ?%'], ['testing-sewer-6', 'testing-sewer-7', 'quick-reference-2']),
 C('lib-us-test-3', 'testing', 'How do they vacuum test a manhole?', 'Providence, RI', 'pipelayer', 'rule',
   ['10 ?(in|inches|")', '9 ?(in|inches|")'], ['10 ?(in|inches|")'], ['quick-reference-2', 'glossary-8']),
 C('lib-us-test-4', 'testing', 'Can we air test the new PVC water main instead of filling it?', 'Helena, MT', 'pipelayer', 'simple',
   ['water|hydrostatic'], ['no'], ['test-1', 'testing-water-1'], ['yes, you can']),
 # ---- survey and grade math (must agree with the app: HI = known elevation + rod; 0.35 ft = 4-3/16 in)
 C('lib-us-survey-1', 'math', 'Benchmark is 100.00. I read 4.25 on the benchmark and 6.75 on top of pipe. What elevation is the pipe?', 'Dover, DE', 'pipelayer', 'simple',
   ['97\\.50?', '104\\.25'], ['97\\.50?'], ['app-data-calculator-formulas-1']),
 C('lib-us-survey-2', 'math', 'How much fall in a 20 ft stick at 0.5 percent?', 'Hartford, CT', 'pipelayer', 'simple',
   ['0?\\.10? ?(ft|feet|foot|\')|1[- ]3/16|1\\.2 ?(in|")'], ['0?\\.10? ?(ft|feet|foot|\')|1[- ]3/16|1\\.2 ?(in|")'], ['app-data-calculator-formulas-2', 'app-data-calculator-formulas-4']),
 C('lib-us-survey-3', 'math', 'What is 0.35 ft in inches?', 'Montpelier, VT', 'pipelayer', 'simple',
   ['4[- ]3/16|4\\.2 ?(in|")'], ['4[- ]3/16|4\\.2'], ['app-data-calculator-formulas-4']),
 C('lib-us-survey-4', 'math', 'Stake says C 4.50 to flowline and the hub is 2.00 off. My rod reads 3.10 on the hub. What should it read at flowline?', 'Honolulu, HI', 'pipelayer', 'rule',
   ['7\\.60?'], ['7\\.60?'], ['stake-read-1', 'app-data-calculator-formulas-1']),
 C('lib-us-survey-5', 'math', 'What is a 2 percent grade as a ratio?', 'Anchorage, AK', 'pipelayer', 'simple',
   ['1 ?: ?50|1 in 50|50 ?: ?1'], ['1 ?: ?50|1 in 50|50 ?: ?1'], ['app-data-calculator-formulas-3']),
 # ---- equipment and lifting
 C('lib-us-eq-1', 'equipment', 'Can I hook the sling on a bucket tooth to set pipe?', 'Baltimore, MD', 'pipelayer', 'simple',
   ['lifting (eye|point|hook)|designated', 'chart|rated'], ['no'], ['equipment-rigging-2', 'pipe-weights-and-lifting-6'], ['yes, you can']),
 C('lib-us-eq-2', 'equipment', 'How many chains do I need on a 20,000 lb excavator on the trailer?', 'Trenton, NJ', 'pipelayer', 'rule',
   ['four|4', 'boom|bucket|attachment|accessory'], ['four|4'], ['heavy-trucks-haul-13']),
 C('lib-us-eq-3', 'equipment', 'Can the guys stay in the trench box while the excavator drags it ahead?', 'Indianapolis, IN', 'foreman', 'rule',
   ['1926\\.652\\(g\\)|vertical|lifted'], ['horizontal|vertical|not .*(in|inside)|out'], ['osha-appendix-b-c-d-in-words-6']),
 # ---- first aid and emergencies
 C('lib-us-em-1', 'emergency', 'Guy is confused and stumbling and its 100 out. What do I do?', 'Jackson, MS', 'pipelayer', 'steps',
   ['911', 'cool|ice|cold water'], ['911'], ['first_aid-16', 'first_aid-19']),
 C('lib-us-em-2', 'emergency', 'Trench wall caved in on a guy up to his waist. Should we jump in and dig him out?', 'Charlotte, NC', 'pipelayer', 'steps',
   ['911', 'do not|don.t|stay out|secondary|second (collapse|cave)'], ['911|do not|don.t|no'], ['trench-safety-1'], ['jump in and dig']),
 C('lib-us-em-3', 'emergency', 'Laborer got hit in the head by the bucket and says he is fine. Can he go back to work?', 'Milwaukee, WI', 'foreman', 'rule',
   ['concussion|head injury', 'medical|doctor|checked|911|emergency'], ['no|checked|medical|doctor'], ['first_aid-44']),
 # ---- pipe, joints and taps
 C('lib-us-pipe-1', 'water', 'Do we test the tapping sleeve before we cut, and with air or water?', 'Oklahoma City, OK', 'pipelayer', 'rule',
   ['water|hydrostatic', 'before'], ['yes|water|hydrostatic'], ['tools-pipe-testing-17']),
 C('lib-us-pipe-2', 'water', 'What holds the coupon when you wet tap a main?', 'Minneapolis, MN', 'pipelayer', 'simple',
   ['pilot (drill|bit)'], ['pilot (drill|bit)'], ['tools-pipe-testing-16']),
 C('lib-us-pipe-3', 'water', 'Is the testing allowance on ductile how much the joints are allowed to leak?', 'Birmingham, AL', 'foreman', 'rule',
   ['make.?up water', 'air|not a leak'], ['no'], ['pipe-ductile-iron-8']),
]
for name, cs in (('cases_new.jsonl', NEW), ('cases_existing.jsonl', EXIST)):
    assert len({c['id'] for c in cs}) == len(cs)
    open(os.path.join(HERE, name), 'w').write(''.join(json.dumps(c) + '\n' for c in cs))
    print(name, len(cs))
