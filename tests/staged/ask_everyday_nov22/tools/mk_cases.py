# mk_cases.py: eval cases (lib_kb case format) for ask_everyday_nov22.
#   cases/cases_review40.jsonl  the review's 40 everyday questions (Part 1 scorecard g1-w2), right answers from the review, checked
#   cases/cases_fixes.jsonl     one or more cases per fixed answer (review findings + Part 1 / Part 2 "questions to run" 1-20)
#   cases/kw.json               keywords like Ask's helper step adds (MY approximation, for the free check's second pass only)
# Regexes run case-insensitive. "chunks" = cards that hold the answer (for the free retrieval check).
import json, sys
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
from lib_kb import check_case
H = '/home/claude/index.html-/tests/staged/ask_everyday_nov22/cases/'
KW = {}

def C(id, q, where, kind, must, lead, chunks, mustnot=(), cat='everyday', level='pipelayer', kw=None, strict=False):
    c = {'id': id, 'cat': cat, 'q': q, 'where': where, 'level': level, 'kind': kind, 'must': list(must), 'lead': list(lead),
         'mustnot': list(mustnot), 'chunks': list(chunks)}
    if kind == 'complex': c['complex'] = True
    if strict: c['state_strict'] = True
    if kw: KW[id] = kw
    return c

R40 = [
 C('lib-ca-ev40-1', 'BM is 102.50, rod on the BM reads 4.32, invert is 95.10. What should the rod read on the invert?', 'Fresno, CA', 'simple', [r'11\.72'], [r'11\.72'], ['grade-survey-9', 'grade-survey-12'], kw='height of instrument HI rod reading benchmark invert elevation grade rod'),
 C('lib-tx-ev40-2', '0.40% grade is how many inches per 100 ft?', 'Austin, TX', 'simple', [r'4\.8 ?(in|")'], [r'4\.8'], ['grade-survey-1', 'grade-survey-2', 'quick-reference-1'], kw='slope percent feet per 100 ft inches conversion grade'),
 C('lib-wa-ev40-3', 'What is 0.37 ft in inches?', 'Tacoma, WA', 'simple', [r'4\.4|4 ?7/16'], [r'4\.4|4 ?7/16'], ['grade-survey-3'], kw='decimal feet to inches tape conversion tenths hundredths'),
 C('lib-or-ev40-4', 'How much fall over 350 ft at 0.5%?', 'Salem, OR', 'simple', [r'1\.75 ?(ft|feet)'], [r'1\.75'], ['grade-survey-1', 'quick-reference-1'], mustnot=[r'fall protection', r'guardrail|harness'], kw='slope grade fall percent feet invert elevation drop'),
 C('lib-az-ev40-5', 'Invert 98.20 at one manhole, 96.45 at the next, 250 ft apart. What is the grade?', 'Phoenix, AZ', 'simple', [r'0\.70 ?%|0\.7 ?%|0\.007'], [r'0\.70?'], ['grade-survey-4', 'grade-survey-1'], kw='invert elevation slope percent grade between manholes fall over distance'),
 C('lib-co-ev40-6', 'An 1/8 inch per foot slope is what percent?', 'Denver, CO', 'simple', [r'1\.04 ?%'], [r'1\.04'], ['grade-survey-2', 'quick-reference-1'], kw='inches per foot slope percent conversion quarter inch eighth inch'),
 C('lib-tx-ev40-7', 'How do I set the pipe laser for 2% grade?', 'San Antonio, TX', 'steps', [r'2(\.00)? ?%|2\.00'], [r'(set|dial|enter)'], ['rod-2', 'tools-survey-2', 'grade-survey-14'], kw='pipe laser set grade percent target manhole alignment'),
 C('lib-oh-ev40-8', 'What is the minimum slope for 8 inch sewer?', 'Columbus, OH', 'simple', [r'0\.40 ?(%|percent|ft per 100|feet per 100)|0\.0040'], [r'0\.4'], ['std-tenstates-slope-1', 'grade-survey-18'], kw='minimum slope gravity sewer 8 inch Ten States Standards percent velocity 2 ft per second'),
 C('lib-ca-ev40-9', 'Stake says C 6.45 with a 10 ft offset. What does that mean?', 'Riverside, CA', 'simple', [r'6\.45', r'10 ?(ft|feet|foot)'], [r'cut'], ['stake-read-5', 'grade-survey-6'], kw='grade stake cut offset reading flowline'),
 C('lib-wa-ev40-10', 'What does O/S mean on a stake?', 'Everett, WA', 'simple', [r'offset'], [r'offset'], ['sym-4', 'stake-read-32'], kw='stake abbreviation offset O/S'),
 C('lib-tx-ev40-11', 'What do CL and RP mean on a stake?', 'Dallas, TX', 'simple', [r'center ?line', r'reference point'], [r'center ?line|reference point'], ['sym-6', 'stake-read-6'], kw='stake abbreviations centerline reference point'),
 C('lib-nv-ev40-12', 'Hub is 107.68 and the invert is 101.23. What is the cut?', 'Reno, NV', 'simple', [r'6\.45'], [r'6\.45'], ['stake-read-5', 'grade-survey-6'], kw='cut fill hub elevation minus invert grade stake cut sheet'),
 C('lib-fl-ev40-13', 'Stake says F 1.2. What do I do?', 'Orlando, FL', 'simple', [r'fill', r'1\.2'], [r'fill'], ['stake-read-5'], kw='fill stake build up grade stake reading'),
 C('lib-or-ev40-14', 'How do I read a cut sheet?', 'Eugene, OR', 'steps', [r'station', r'cut|fill'], [r'station|cut sheet'], ['stake-read-29', 'grade-survey-6'], kw='cut sheet station offset cut fill grade stake columns'),
 C('lib-ca-ev40-15', 'What is the OD of 8 inch C900?', 'Sacramento, CA', 'simple', [r'9\.05'], [r'9\.05'], ['pipe-pvc-3', 'water-distribution-19'], kw='C900 PVC outside diameter cast iron OD 8 inch'),
 C('lib-tx-ev40-16', "What's the difference between SDR 35 and SDR 26?", 'Houston, TX', 'simple', [r'46', r'115'], [r'thick|stiff|wall'], ['pipe-pvc-1', 'quick-reference-7', 'kb2-10'], kw='SDR 35 SDR 26 PVC sewer pipe stiffness PS 46 PS 115 wall'),
 C('lib-fl-ev40-17', 'Can we use C900 for a sewer force main?', 'Tampa, FL', 'simple', [r'yes|common|can'], [r'yes|can'], ['force-mains-lift-stations-1'], kw='C900 PVC force main sewage pressure pipe'),
 C('lib-wa-ev40-18', 'How much can I deflect a 12 inch ductile iron push-on joint?', 'Spokane, WA', 'simple', [r'5 ?(°|deg)'], [r'5 ?(°|deg)'], ['mfr-dipra-joint-1', 'pipe-ductile-iron-5'], kw='ductile iron push-on joint deflection degrees 12 inch'),
 C('lib-az-ev40-19', "What's the difference between MJ and push-on ductile iron?", 'Tucson, AZ', 'simple', [r'(mechanical joint|MJ).{0,80}(bolt|gland)|(bolt|gland)'], [r'(MJ|mechanical)'], ['pipe-ductile-iron-4', 'fit-1'], kw='mechanical joint MJ push-on ductile iron fittings gland bolts'),
 C('lib-ca-ev40-20', 'How big a thrust block for an 8 inch 90 at 150 psi in sand?', 'Bakersfield, CA', 'complex', [r'13,?6\d\d|13,?600', r'(psf|lb per sq|lb/sq)'], [r'sq(uare)? ?f'], ['mfr-dipra-thrust-2', 'thrust-restraint-2'], kw='thrust block bearing area 90 degree bend 8 inch 150 psi soil bearing sand psf'),
 C('lib-co-ev40-21', 'How far do I push a PVC spigot into the bell?', 'Pueblo, CO', 'simple', [r'(homing|insertion|reference) (mark|line)'], [r'mark'], ['pipe-pvc-5', 'laying-and-joints-2'], kw='PVC spigot bell homing mark insertion depth assemble joint'),
 C('lib-ca-ev40-22', 'How long is the air test on 300 ft of 8 inch PVC sewer?', 'Fresno, CA', 'simple', [r'7:36|7 ?min\w* 36'], [r'7:36|7 ?min'], ['std-astm-airtest-1', 'testing-sewer-3'], mustnot=[r'3:4[78]'], kw='low pressure air test time sewer 8 inch 300 ft ASTM F1417 minutes seconds 1.0 psi drop'),
 C('lib-tx-ev40-23', 'What pressure do we air test PVC sewer at and how much drop is allowed?', 'Fort Worth, TX', 'simple', [r'3\.5', r'1\.0 ?psi|1 psi'], [r'3\.5|4(\.0)? psi'], ['testing-sewer-1', 'std-astm-airtest-1'], mustnot=[r'permit[- ]required confined', r'competent person decides'], kw='low pressure air test sewer psig pressure drop ASTM F1417 plugs'),
 C('lib-wa-ev40-24', 'What size mandrel for 8 inch SDR 35?', 'Olympia, WA', 'simple', [r'7\.28'], [r'7\.28'], ['std-astm-mandrel-1'], mustnot=[r'7\.37'], kw='mandrel size deflection test SDR 35 PVC sewer 5 percent base inside diameter'),
 C('lib-or-ev40-25', 'When do we pull the mandrel?', 'Bend, OR', 'simple', [r'30 days'], [r'30 days'], ['testing-sewer-6', 'quick-reference-2'], kw='mandrel deflection test timing after backfill days'),
 C('lib-az-ev40-26', 'What pressure and how long for the hydro test on a new water main?', 'Mesa, AZ', 'simple', [r'1\.5 ?(times|x)', r'2 ?(hours|h\b)'], [r'1\.5'], ['std-awwa-c600-hydro-1', 'mfr-dipra-test-1'], mustnot=[r'4 hours'], kw='hydrostatic test pressure water main duration AWWA C600 C605 working pressure'),
 C('lib-oh-ev40-27', 'Allowed leakage on 1,000 ft of 8 inch DI at 150 psi?', 'Dayton, OH', 'simple', [r'0\.66'], [r'0\.66'], ['testing-water-3', 'std-awwa-c600-hydro-1'], kw='allowable leakage makeup water hydrostatic test formula gallons per hour 148,000'),
 C('lib-fl-ev40-28', 'How long do we hold the chlorine in a new water main?', 'Jacksonville, FL', 'simple', [r'24 ?(hours|h\b)'], [r'24'], ['std-awwa-c651-methods-1', 'testing-water-6'], kw='chlorine disinfection hold time AWWA C651 new water main 25 mg/L'),
 C('lib-co-ev40-29', 'How many bac-T samples and how far apart?', 'Aurora, CO', 'simple', [r'1,?200 ?(ft|feet)', r'16 ?(hours|h\b)|two sets'], [r'1,?200|two'], ['std-awwa-c651-bact-1', 'testing-water-10'], kw='bacteriological samples bac-T every 1,200 ft two sets 16 hours C651'),
 C('lib-ca-ev40-30', 'What compaction under pavement?', 'San Diego, CA', 'simple', [r'9[05] ?(%|percent)'], [r'9[05]'], ['gb-4', 'ca-compaction-relative-compaction-4'], kw='trench backfill relative compaction under pavement percent Greenbook'),
 C('lib-tx-ev40-31', 'How thick can our backfill lifts be?', 'El Paso, TX', 'simple', [r'(8|12) ?(in|inch)'], [r'(in|inch)'], ['installation-embedment-9', 'tools-compaction-2'], mustnot=[r'rated capacity|load chart'], kw='backfill lift thickness loose lift compaction inches trench'),
 C('lib-wa-ev40-32', 'How much bedding over the top of the pipe?', 'Kent, WA', 'simple', [r'(6|12) ?(in|inch)|1 ?ft'], [r'(in|inch|ft)'], ['spec-wa-dot-trench-1', 'installation-embedment-1'], kw='pipe zone bedding initial backfill above crown inches WSDOT'),
 C('lib-az-ev40-33', 'Can we jet the backfill?', 'Chandler, AZ', 'simple', [r'(spec|approv|allow)'], [r'(only|spec|approv|not)'], ['installation-embedment-9'], kw='jetting water settling flooding backfill allowed spec'),
 C('lib-nv-ev40-34', "What's a proctor?", 'Las Vegas, NV', 'simple', [r'(maximum|max) (dry )?density|lab'], [r'(density|lab)'], ['compaction-testing-1'], kw='proctor test maximum dry density optimum moisture ASTM D698 D1557'),
 C('lib-ca-ev40-35', 'Greenbook pipe zone: how much bedding above and below the pipe?', 'Long Beach, CA', 'simple', [r'1 ?(ft|foot)', r'4 ?(in|inch)'], [r'1 ?(ft|foot)|4 ?(in|inch)'], ['gb-3'], kw='Greenbook bedding zone 306-6 pipe zone above crown below barrel'),
 C('lib-wa-ev40-36', 'WSDOT trench backfill compaction?', 'Vancouver, WA', 'simple', [r'95 ?(%|percent)'], [r'95'], ['spec-wa-dot-trench-1'], kw='WSDOT 7-08 trench backfill compaction 95 percent'),
 C('lib-tx-ev40-37', 'How far apart do water and sewer lines have to be?', 'Plano, TX', 'simple', [r'9 ?(ft|feet)'], [r'9'], ['spec-tx-tceq-separation-1'], strict=True, kw='water sewer separation horizontal distance TCEQ 9 ft'),
 C('lib-or-ev40-38', 'How much cover over the water line?', 'Portland, OR', 'simple', [r'30 ?(in|inch)'], [r'30 ?(in|inch)'], ['spec-or-oha-watercover-1'], mustnot=[r'heat illness', r'\b5 ?(ft|feet)\b.{0,30}(protect|box|shor)'], strict=True, kw='water main cover bury depth top of pipe finished grade frost minimum cover'),
 C('lib-co-ev40-39', 'What goes on a daily report?', 'Fort Collins, CO', 'steps', [r'(crew|hours)', r'(weather|delay|equipment)'], [r'(date|crew|hours|weather)'], ['business-pm-9'], level='foreman', kw='daily report what to record crew hours equipment weather delays'),
 C('lib-fl-ev40-40', 'What goes on a T&M ticket?', 'Miami, FL', 'steps', [r'(hours)', r'(equipment)', r'sign'], [r'(date|hours|equipment|sign)'], ['business-pm-6'], mustnot=[r'811', r'locate', r'positive response'], level='foreman', kw='time and materials T&M ticket extra work force account labor equipment materials signature'),
]

FIX = [
 # Part 1 #1 air test half times
 C('lib-tx-evfix-1', 'How long is the low pressure air test on 300 ft of 8 inch PVC sewer?', 'Houston, TX', 'simple', [r'7:36|7 ?min\w* 36'], [r'7:36|7 ?min'], ['std-astm-airtest-1', 'testing-sewer-3'], mustnot=[r'3:4[78]', r'competent person decides'], kw='low pressure air test time sewer 8 inch 300 ft ASTM F1417 1.0 psi drop'),
 C('lib-us-evfix-2', 'Our spec times a half psi drop on the sewer air test. How long for 10 inch, 200 ft?', 'Boise, ID', 'simple', [r'4:43'], [r'4:43'], ['std-astm-airtest-1'], mustnot=[r'9:26'], kw='air test 0.5 psi drop half time 10 inch sewer'),
 C('lib-ga-evfix-3', 'Minimum air test time for 12 inch sewer, 150 ft?', 'Atlanta, GA', 'simple', [r'11:20'], [r'11:20'], ['std-astm-airtest-1', 'testing-sewer-2'], mustnot=[r'5:40'], kw='air test minimum time 12 inch sewer 1.0 psi'),
 # Part 1 #2 sewer gas smell (needs the code fix; until then the instant gas script answers)
 C('lib-us-evfix-4', 'smells like rotten eggs in the wet well', 'Tulsa, OK', 'simple', [r'(hydrogen sulfide|H2S)', r'(stay out|do not enter|don.t (go|enter))', r'(test|meter|monitor)'], [r'(hydrogen sulfide|H2S|stay out)'], ['osha-pl-h2s-smell-1', 'first_aid-25'], mustnot=[r'call (the )?gas company', r'leave the hole open'], kw='hydrogen sulfide H2S sewer gas rotten egg wet well confined space gas meter ventilate'),
 C('lib-us-evfix-5', 'Smells like sewer gas in the new manhole, is that normal?', 'Omaha, NE', 'simple', [r'(hydrogen sulfide|H2S)', r'(test|meter)'], [r'(hydrogen sulfide|H2S|stay out|not normal)'], ['osha-pl-h2s-smell-1'], mustnot=[r'gas company'], kw='hydrogen sulfide H2S sewer gas smell manhole confined space test ventilate'),
 # Part 1 #3 / Part 2 D cover
 C('lib-or-evfix-6', 'How deep do we dig the trench for an 8 inch water main?', 'Salem, OR', 'simple', [r'30 ?(in|inch)'], [r'30 ?(in|inch)|cover'], ['spec-or-oha-watercover-1', 'std-tenstates-watercover-1'], mustnot=[r'heat'], strict=True, kw='water main cover bury depth top of pipe trench depth minimum cover'),
 C('lib-in-evfix-7', 'Minimum cover over a water main?', 'Indianapolis, IN', 'simple', [r'36', r'60', r'count'], [r'36|count'], ['spec-in-idem-watercover-1'], strict=True, kw='water main minimum cover depth 327 IAC county table'),
 C('lib-ut-evfix-8', 'How much cover do we need over the water line?', 'Provo, UT', 'simple', [r'freez', r'(plans|agency|standard)'], [r'(freez|no set|plans|agency)'], ['spec-ut-ddw-watercover-1'], mustnot=[r'30 ?in'], strict=True, kw='water main cover bury depth frost R309-550'),
 C('lib-va-evfix-9', 'How deep does the water main have to be buried?', 'Richmond, VA', 'simple', [r'freez', r'(plans|utility|standard)'], [r'(freez|no set|plans|utility)'], ['spec-va-vdh-watercover-1'], strict=True, kw='water main cover bury depth frost 12VAC5-590'),
 C('lib-mo-evfix-10', 'How much cover over a water main?', 'Springfield, MO', 'simple', [r'(plans|agency|standard|utility)', r'freez|frost'], [r'(plans|agency|standard|utility|frost|freez)'], ['std-tenstates-watercover-1'], mustnot=[r'\b(often|usually|typically) (about )?\d'], strict=True, kw='water main cover bury depth top of pipe frost'),
 # Part 1 #4 thrust
 C('lib-ca-evfix-11', 'How do I figure the thrust block for a 90 degree bend on an 8 inch water main?', 'Fresno, CA', 'complex', [r'(plan|detail|geotech|engineer)', r'(psf|lb per sq|soil bearing)'], [r'(thrust|bearing|area)'], ['mfr-dipra-thrust-2', 'thrust-restraint-2'], kw='thrust block bearing area 90 degree bend soil bearing psf formula'),
 C('lib-oh-evfix-12', 'What soil bearing do I use for a thrust block in sand?', 'Toledo, OH', 'simple', [r'2,?000', r'4,?000'], [r'(plan|detail|geotech|engineer|2,?000)'], ['mfr-dipra-thrust-2'], kw='thrust block soil bearing sand psf table'),
 # Part 1 #5 / Part 2 A tickets (the code fix is what makes these pass)
 C('lib-fl-evfix-13', 'What do I need to write on a T&M ticket for extra work?', 'Tampa, FL', 'steps', [r'hours', r'equipment', r'sign'], [r'(date|hours|crew|sign)'], ['business-pm-6'], mustnot=[r'811', r'locate', r'positive response'], level='foreman', kw='time and materials T&M ticket extra work force account labor equipment materials signature'),
 C('lib-ca-evfix-14', 'What does the concrete ticket need to show?', 'Oakland, CA', 'simple', [r'(slump|mix|psi|yard|batch)'], [r'(mix|batch|yard|psi)'], ['concrete-practice-3', 'concrete-basics-1'], mustnot=[r'811', r'locate'], kw='concrete delivery ticket batch time mix psi slump yards water added'),
 # Part 1 #6 competent-person line on pipe air tests (prompt)
 C('lib-tx-evfix-15', 'How long do we hold the air on an 8 inch sewer air test?', 'Austin, TX', 'simple', [r'7:34|1\.520'], [r'7:34|minute'], ['std-astm-airtest-1', 'testing-sewer-2'], mustnot=[r'competent person decides', r'1910\.146', r'confined space'], kw='low pressure air test hold time 8 inch sewer F1417'),
 # Part 1 #7 min slope steady
 C('lib-ca-evfix-16', 'What is the minimum slope for 8 inch sewer?', 'Wildomar, CA', 'simple', [r'(agency|district|city|county|standard|plans)'], [r'(agency|district|city|county|standard|plans|0\.4)'], ['sewer-collection-11'], mustnot=[r'Ten States'], kw='minimum slope gravity sewer 8 inch percent'),
 C('lib-mi-evfix-27', 'What is the minimum slope for 8 inch sewer?', 'Lansing, MI', 'simple', [r'0\.40 ?(%|percent|ft per 100|feet per 100)|0\.0040|0\.4 ?(%|percent)'], [r'0\.40?'], ['std-tenstates-slope-1', 'grade-survey-18'], mustnot=[r'from the web'], kw='minimum slope gravity sewer 8 inch Ten States percent'),
 # Part 1 #8 mandrel
 C('lib-co-evfix-17', 'What mandrel for 8 inch SDR 26 at 5 percent?', 'Greeley, CO', 'simple', [r'7\.11'], [r'7\.11'], ['std-astm-mandrel-1'], mustnot=[r'7\.37'], kw='mandrel size SDR 26 PVC sewer 5 percent deflection'),
 C('lib-tn-evfix-18', 'Mandrel size for 10 inch SDR 35 at 7.5 percent?', 'Nashville, TN', 'simple', [r'8\.84'], [r'8\.84'], ['std-astm-mandrel-1'], kw='mandrel size SDR 35 10 inch 7.5 percent deflection'),
 # Part 1 #9 DI deflection
 C('lib-wa-evfix-19', 'How many degrees can I deflect 16 inch ductile push-on?', 'Seattle, WA', 'simple', [r'3 ?(°|deg)'], [r'3 ?(°|deg)'], ['mfr-dipra-joint-1', 'pipe-ductile-iron-5'], kw='ductile iron push-on joint deflection degrees 16 inch'),
 # Part 2 E agency numbers in national cards
 C('lib-oh-evfix-20', 'How long do we hold the hydro test on a new water main?', 'Cleveland, OH', 'simple', [r'2 ?(hours|h\b)'], [r'2 ?(hours|h\b)'], ['std-awwa-c600-hydro-1'], mustnot=[r'4 hours', r'Greenbook'], kw='hydrostatic test duration water main AWWA C600'),
 C('lib-tx-evfix-21', 'What chlorine dose for a new water main?', 'Lubbock, TX', 'simple', [r'25 ?mg/?L'], [r'25'], ['std-awwa-c651-methods-1', 'test-3'], mustnot=[r'Greenbook', r'50 to 100'], kw='chlorine dose disinfection new water main C651 mg/L continuous feed'),
 # DIPRA flushing fix (found while checking)
 C('lib-us-evfix-22', 'How many gpm to flush a 6 inch main at 3 feet per second?', 'Billings, MT', 'simple', [r'26[0-5] ?gpm'], [r'26[0-5]'], ['mfr-dipra-test-1', 'testing-water-8'], mustnot=[r'400 ?gpm'], kw='flushing velocity 3 ft per second gpm 6 inch main'),
 # Part 2 questions to run 14, 15, 18, 19, 20 (code fixes; cases record the right answer)
 C('lib-wa-evfix-23', 'How wide does the trench need to be for 12 inch PVC?', 'Bellevue, WA', 'simple', [r'(OD|outside diameter) ?\+ ?16|1\.25'], [r'(wide|width|in)'], ['installation-embedment-6'], kw='trench width PVC pipe ASTM D2321 OD plus 16 inches'),
 C('lib-oh-evfix-24', 'How many feet of 8 inch sewer should a good crew lay in a day?', 'Akron, OH', 'simple', [r'(ft|feet)'], [r'(ft|feet|depend)'], ['production-strategies-1', 'business-pm-2'], mustnot=[r'811', r'locate'], level='foreman', kw='production rate feet per day sewer pipe laying crew'),
 C('lib-us-evfix-25', 'Pipelayer is down in the trench shooting grade, how do I check the laser?', 'Wichita, KS', 'steps', [r'(laser|target|calibrat)'], [r'(laser|target|check)'], ['tools-survey-2', 'rod-2'], mustnot=[r'call 911'], kw='pipe laser check calibration grade target'),
 C('lib-us-evfix-26', 'Excavator ran over the lath, who resets it?', 'Boise, ID', 'simple', [r'surveyor'], [r'surveyor'], ['grade-survey-8'], mustnot=[r'call 911', r'tourniquet'], kw='survey stakes lath destroyed reset surveyor daily report'),
]

if __name__ == '__main__':
    for name, cs in (('cases_review40', R40), ('cases_fixes', FIX)):
        bad = 0
        for c in cs:
            for e in check_case(c): print('ERROR', c['id'], e); bad += 1
        assert len({c['id'] for c in cs}) == len(cs)
        with open(H + name + '.jsonl', 'w') as f:
            for c in cs: f.write(json.dumps(c, ensure_ascii=False) + '\n')
        print(name, len(cs), 'cases,', bad, 'errors')
    json.dump(KW, open(H + 'kw.json', 'w'), indent=0)
