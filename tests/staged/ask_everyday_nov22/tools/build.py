# build.py (ask_everyday_nov22): staged library fixes for "Review - Ask Everyday Answers - 2026-11-22".
# Base: live library b3e91f6c47d2, 3,247 rows, md5 f85b4d61df8e54abe6bd391f7317cbd7 (server SELECT 2026-11-22; the same rows as
# ask_quality_nov22/work/after_rows.jsonl, checked row by row on id + md5(text) + md5(title)).
# Outputs (nothing applied anywhere):
#   cards/ask_everyday.jsonl (+ report, sql/)  new and replacing cards, written and checked by lib_kb.py (must be 0 errors)
#   cards/legacy_edits.jsonl                   exact-once text edits on old-format cards (ids without a library prefix)
#   work/after_rows.jsonl, work/kb_staged.json the whole library after the change (for the free retrieval check)
import json, os, re, sys, hashlib
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
from lib_kb import Batch, state_names_in, STATES

H = '/home/claude/index.html-/tests/staged/ask_everyday_nov22'
LIVE = '/home/claude/index.html-/tests/staged/ask_quality_nov22/work/after_rows.jsonl'
D = '2026-11-22'
B = Batch('ask_everyday', out_dir=H + '/cards')
LEGACY = {}   # id -> list of (old, new) exact-once text replacements, plus optional new title


def legacy(cid, pairs=(), title=None, why='', **meta):
    assert cid not in LEGACY, cid
    LEGACY[cid] = {'pairs': list(pairs), 'title': title, 'why': why, 'meta': meta}


C651_NOTE = (" AWWA lists C651-23 as the current edition of the disinfection standard; the numbers here are from the 2014 "
             "(and 2005) editions and were not re-checked against C651-23, so a change there is not confirmed.")

# ---------------------------------------------------------------- 1. air test times (review Part 1 #1): test-2 had the 0.5 psi column labelled 1.0 psi
B.add(id='std-astm-airtest-1', supersedes='test-2', state='US', tier='core',
      title='Sewer air test times: how long to hold for a 1.0 psi drop (or 0.5 psi), 4 to 15 inch (ASTM F1417)',
      topic='Testing: sewer low-pressure air test',
      text=("Minimum time for a 1.0 psi drop on a low-pressure air test of plastic gravity sewer (ASTM F1417 / UNI-B-6 table, Q = 0.0015): "
            "4 in 3:46 up to 597 ft; 6 in 5:40 up to 398 ft; 8 in 7:34 up to 298 ft; 10 in 9:26 up to 239 ft; 12 in 11:20 up to 199 ft; "
            "15 in 14:10 up to 159 ft. Longer runs, in seconds with L in feet: 0.380 x L (4 in), 0.854 x L (6 in), 1.520 x L (8 in), "
            "2.374 x L (10 in), 3.418 x L (12 in), 5.342 x L (15 in). Example: 300 ft of 8 in = 1.520 x 300 = 456 seconds = 7:36. "
            "If the spec times a 0.5 psi drop instead, every time is half (8 in: 3:47 up to 298 ft, then 0.760 x L). "
            "Procedure in these specs: pressurize to 4.0 psi above the groundwater back pressure (never over 9 psi), let it settle, "
            "start timing at 3.5 psi; the line passes if it takes longer than the table time to lose the drop. "
            "Never stand in front of a plug under pressure. The job spec's own table governs."),
      source=('ASTM F1417 / UNI-B-6 times as printed in Berkeley County Water & Sanitation Section 02731 (Rev 4/2023), Table 1 (1.0 psig) '
              'and Table 2 (0.5 psig); same 1.0 psi times in American Water spec 33 01 30.13 Table 2 (rev. Jan 2017)'),
      url='https://bcws.berkeleycountysc.gov/wp-content/uploads/docs/tech specs/appendix-g-02731-sanitary-gravity-sewer-line-testing.pdf'.replace(' ', '%20'),
      checked=D, edition='Section 02731 Rev 4/2023; 33 01 30.13 rev. January 2017', confidence='high', kind='summary', license='summary',
      note='Replaces test-2 in place: test-2 printed the 0.5 psig table (3:47, 0.760 L for 8 in) as the 1.0 psig times. Greenbook air test numbers stay in gb-5.')

# ---------------------------------------------------------------- 2. mandrel sizes (review #8, library list #3)
B.add(id='std-astm-mandrel-1', state='US', tier='core',
      title='Mandrel size for PVC sewer pipe: SDR 35 and SDR 26, 6 to 15 inch, at 5 and 7.5 percent deflection',
      topic='Testing: sewer deflection (mandrel) test',
      text=("A deflection mandrel is the pipe's base inside diameter times 0.95 for a 5 percent test or 0.925 for 7.5 percent. "
            "SDR 35 (ASTM D3034) as printed in county mandrel tables, base ID then 5 and 7.5 percent mandrel, inches: "
            "6 in 5.742, 5.454, 5.31; 8 in 7.665, 7.281, 7.09; 10 in 9.563, 9.084, 8.84; 12 in 11.361, 10.792, 10.51; "
            "15 in 13.898, 7.5 percent 12.86 (the printed 5 percent figure, 13.023, is not 95 percent of 13.898, so it is not confirmed). "
            "SDR 26 (D3034), 5 percent: 6 in 5.33, 8 in 7.11, 10 in 8.87, 12 in 10.55, 15 in 12.90; 7.5 percent: 5.19, 6.93, 8.64, 10.27, 12.56. "
            "Some specs size the mandrel from the average inside diameter instead, which gives a bigger mandrel, so use the table in your spec. "
            "C900 pressure pipe has its own sizes. The inspector proves the mandrel with its ring before the pull."),
      source=('ASTM D3034 mandrel tables as printed in Fulton County standard detail 106, Table 105-1 (SDR 35 values; same 7.5 percent column as '
              'Miami-Dade WASD UC-350 3.02-E for SDR 35) and Berkeley County Water & Sanitation mandrel sizes table (D3034 SDR 26)'),
      url='https://www.fultoncountyga.gov/-/media/Departments/Public-Works/Construction-Standard-Details-and-Design-Guidance/100-Series/106---MANDREL-DETAIL-FOR-PVC-PIPE-INSTALLATION.pdf',
      checked=D, edition='Fulton County detail 106 (page dated 2026-02-18); Miami-Dade UC-350 (1/1999); Berkeley County mandrel table (undated)',
      confidence='medium', kind='summary', license='summary', unconfirmed='yes',
      note=('Fulton table 105-1 does not print "SDR 35"; its base IDs (8 in 7.665) and 7.5 percent column equal Miami-Dade UC-350 SDR 35 table, '
            'and its 8 in 5 percent value (7.281) matches the Greenbook SDR 35 example (gb-6, 7.282). American Water 33 01 30.13 Table 4 sizes from average ID (8 in SDR 26 7.329).'))

# ---------------------------------------------------------------- 3. cover over a water main (review #3, Part 2 D, library list #2)
B.add(id='std-tenstates-watercover-1', state='US', tier='core',
      title='How much cover over a water main (how deep to bury it): who sets the number and how it is measured',
      topic='Water mains: cover and bury depth',
      text=("No federal rule sets the cover over a water main: the plans, the water agency's standard details or the state's drinking water "
            "rules set it, mainly to keep the pipe below frost and away from traffic loads. The Ten States Recommended Standards for Water Works "
            "(2018, Section 8.7.3), which many state programs follow, gives no number: mains are to be covered with enough earth or other "
            "insulation to prevent freezing. Cover is measured from the top of the pipe to finished grade, not from the trench bottom. "
            "Check the plan profile and the agency standard for the minimum, and for what to do where it cannot be met (insulation, a deeper "
            "line, or an engineer's detail). Cover is a different number from the 5 ft trench protection depth: cover is how deep the pipe is "
            "buried; protection is about the trench walls."),
      source=('Recommended Standards for Water Works (Ten States Standards), 2018 edition, Section 8.7.3 Cover (our summary); top of pipe to '
              'finish grade as defined in state rules such as 327 IAC 8-3.2-17(d)'),
      url='https://healthweb-back.health.ny.gov/environmental/water/drinking/regulations/docs/2018_recommended_standards.pdf',
      checked=D, edition='2018 edition (April 2018)', confidence='high', kind='summary', license='summary')

B.add(id='spec-or-oha-watercover-1', state='OR', tier='core',
      title='Oregon water main cover: at least 30 inches over distribution piping (OAR 333-061-0050)',
      topic='Water mains: cover and bury depth',
      text=("Oregon's drinking water construction standards require distribution piping to be bedded in material free from rocks and to have "
            "a cover of at least 30 inches (OAR 333-061-0050(8)(f)). A main laid under a stream or other watercourse also gets at least "
            "30 inches of cover over the pipe (333-061-0050(9)(d)). These are the state minimums for public water systems; the water "
            "agency's standard or the plans can require more for frost or traffic, and the deeper number governs. Cover is measured from the "
            "top of the pipe to finished grade. It is not a trench safety number: protecting the trench walls is a separate Oregon OSHA rule."),
      source='OAR 333-061-0050(8)(f) and (9)(d), Construction Standards (amended PH 7-2023, effective 2023-02-01)',
      url='https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-333-061-0050',
      checked=D, effective='2023-02-01', edition='OAR 333-061-0050 as amended PH 7-2023', confidence='high', kind='summary', license='gov-state')

B.add(id='spec-in-idem-watercover-1', state='IN', tier='core',
      title='Indiana water main cover: 36 to 60 inches depending on the county (327 IAC 8-3.2-17)',
      topic='Water mains: cover and bury depth',
      text=("Indiana's public water system rule requires earthen cover over water mains as set by county in the table in 327 IAC 8-3.2-17(d); "
            "the table runs from 36 inches to 60 inches, and the cover is measured from the top of the pipe to the proposed finish grade. "
            "Look up the job's county in that table: the county-by-county values were not copied into this card, so the exact number for a "
            "given county is not confirmed here. The water utility's standard or the plans can require more, and the deeper number governs."),
      source='327 IAC 8-3.2-17(d), Installation, cover table and footnote 1 (Indiana Administrative Code, current through 2025-06-25)',
      url='https://regulations.justia.com/states/indiana/title-327/article-8/rule-3-2/section-17',
      checked=D, edition='327 IAC 8-3.2-17 current through 2025-06-25', confidence='medium', kind='summary', license='gov-state', unconfirmed='yes')

B.add(id='spec-ut-ddw-watercover-1', state='UT', tier='core',
      title='Utah water main cover: enough to prevent freezing, no set depth in the state rule (R309-550-8)',
      topic='Water mains: cover and bury depth',
      text=("Utah's drinking water rule requires all water mains to be covered with sufficient earth or other insulation to prevent freezing "
            "(Utah Admin. Code R309-550-8(5)); it sets no depth in inches. The exception is a noncommunity system that is shut down and drained "
            "when temperatures are below freezing. Under a water crossing the rule calls for at least 2 ft of cover, or more as local conditions "
            "require (R309-550-8(8)(b)(i)). The depth for a job comes from the plans and the water agency's standard. Cover is measured from the "
            "top of the pipe to finished grade."),
      source='Utah Admin. Code R309-550-8(5) Burial Cover and (8)(b)(i) (amended Utah State Bulletin 2014-23, effective 2014-11-10)',
      url='https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R309-550-8',
      checked=D, effective='2014-11-10', edition='R309-550-8 as amended 2014-11-10', confidence='high', kind='summary', license='gov-state')

B.add(id='spec-va-vdh-watercover-1', state='VA', tier='core',
      title='Virginia water main cover: enough earth to prevent freezing, no set depth in the state rule (12VAC5-590-1220)',
      topic='Water mains: cover and bury depth',
      text=("Virginia's Waterworks Regulations require all buried distribution pipe to have sufficient earth or other suitable cover, or "
            "encasement, to prevent freezing and protect it from external forces (12VAC5-590-1220, Pipe cover). The rule sets no depth in "
            "inches, so the depth for a job comes from the plans and the water utility's standard. Cover is measured from the top of the pipe "
            "to finished grade."),
      source='12VAC5-590-1220 Pipe cover (amended Virginia Register Vol. 37 Issue 20, effective 2021-06-23)',
      url='https://law.lis.virginia.gov/admincode/title12/agency5/chapter590/section1220/',
      checked=D, effective='2021-06-23', edition='12VAC5-590-1220 as amended 2021-06-23', confidence='high', kind='summary', license='gov-state')

# ---------------------------------------------------------------- 4. sewer gas smell (review #2, library list #6)
B.add(id='osha-pl-h2s-smell-1', state='US', tier='core',
      title='Sewer smells like rotten eggs or sewer gas in a manhole, wet well or new sewer: hydrogen sulfide, stay out and test',
      topic='Confined space: hydrogen sulfide (sewer gas)',
      text=("A rotten egg or sewer gas smell in a manhole, wet well, lift station or sewer line is usually hydrogen sulfide (H2S), not a gas "
            "line. Stay out and keep heads out of the opening; test the air from outside with a calibrated 4-gas meter before anyone enters, "
            "and ventilate. Your nose is no warning: OSHA lists loss of smell at about 100 to 150 ppm, and NIOSH's immediately dangerous level "
            "is 100 ppm. The federal construction limit is 10 ppm averaged over 8 hours (29 CFR 1926.55). A manhole or wet well is a "
            "confined space, so entry follows 29 CFR 1926 Subpart AA: testing, ventilation, an attendant and rescue planned. If someone is "
            "down or not answering, do not go in after them: call 911. A natural gas smell at a gas line or meter, not in a sewer, is a gas "
            "leak: get out, upwind, and call 911 and the gas company."),
      source=('OSHA Hydrogen Sulfide pages: Standards (29 CFR 1926.55, 10 ppm TWA; NIOSH IDLH 100 ppm) and Hazards (loss of smell at '
              '100-150 ppm); 29 CFR 1926.1200-1213 (Subpart AA)'),
      url='https://www.osha.gov/hydrogen-sulfide/hazards',
      checked=D, edition='OSHA web pages as read 2026-11-22; 29 CFR 1926, eCFR current 2026', confidence='high', kind='summary', license='gov-us',
      note='Pairs with the instant-emergency fix the review asks for (emergency.ts / app): today the sewer-smell questions never reach Ask.')

# ---------------------------------------------------------------- 5. thrust block soil bearing (review #4, library list #5)
B.add(id='mfr-dipra-thrust-2', state='US', tier='core',
      title='Thrust block soil bearing: which psf number to use when the tables disagree (sand 2,000 or 4,000)',
      topic='Water mains: thrust blocks and restraint',
      text=("Block bearing area = thrust divided by the allowable soil bearing, so the soil value sets the block size. Use the value on the "
            "plans' thrust block detail or in the geotechnical report first. Published tables disagree: DIPRA's guide (Table 8, a guide for "
            "about 4 ft deep) lists sand 4,000 lb per sq ft, soft clay 1,000, silt 1,500, sandy silt 3,000, sandy clay 6,000, hard clay "
            "9,000, muck 0; a DOT thrust blocking standard (RD250, Table B) lists sand 2,000, sand and gravel 3,000, soft clay 1,000, muck "
            "or peat 0. Example: an 8 in C900 90 degree bend at 150 psi pushes about 13,646 lb, so 6.8 sq ft at 2,000 psf but 3.4 sq ft at "
            "4,000. With no plan value, ask the engineer; the lower value gives the bigger, safer block. Size for test pressure and pour "
            "against undisturbed soil. Say which soil value the size uses."),
      source='DIPRA Installation Guide for Ductile Iron Pipe, rev. May 2015, Table 8 (p. 71); ODOT standard drawing RD250 Thrust Blocking, Table B (2024 standard drawings)',
      url='https://pe.mcwane.com/upl/downloads/dipra/dip-installation-guide-ab36416e.pdf',
      checked=D, edition='DIPRA guide rev. May 2015; RD250 in the 2024 standard drawings', confidence='medium', kind='summary', license='summary',
      note='Both tables were read as extracted text with soils and values matched in order (the PDF columns are not aligned), hence medium.')

# ---------------------------------------------------------------- 6. one hydro test card (library list #9) replacing test-1 (which carried Greenbook 4 h into every state, Part 2 E)
B.add(id='std-awwa-c600-hydro-1', supersedes='test-1', state='US', tier='core',
      title='Water main hydrostatic (pressure) test: test pressure, how long to hold, allowed make-up water (AWWA C600 / C605)',
      topic='Testing: water main pressure test',
      text=("Ductile iron (AWWA C600, per DIPRA's guide) and PVC (AWWA C605 Sec. 9.3.5) water mains are tested at no less than 1.5 times "
            "the working pressure at the lowest point of the section; C605 also requires at least 1.25 times the working pressure at the "
            "highest point. Never test above the rating of the pipe, fittings, valves or thrust restraint. Hold the test 2 hours. "
            "Example: 150 psi working means a 225 psi test at the low point. Pump in only enough water to hold pressure and measure it: "
            "allowed make-up water L (gallons per hour) = S x D x square root of P / 148,000, with S = feet tested, D = nominal diameter in "
            "inches, P = average test pressure in psi; 1,000 ft of 8 in at 150 psi allows about 0.66 gal/hr. Fill slowly and bleed the air "
            "first; pressure that keeps sagging usually means air, a passing valve or a leak. The job spec and water agency set the test "
            "pressure and time, and they govern."),
      source=('DIPRA Installation Guide (rev. May 2015) Sec. 7.2, p. 81 (1.5 times at the lowest point, 2 hours); Uni-Bell brief on PVC field '
              'test pressure (2025-09-09) quoting AWWA C605 Sec. 9.3.5; allowance formula as in county test specs (testing-water-2)'),
      url='https://www.uni-bell.org/portals/0/ResourceFile/pvc-pipe-field-testing-maximum-test-pressure.pdf',
      checked=D, edition='DIPRA guide May 2015; Uni-Bell brief 2025-09-09', confidence='medium', kind='summary', license='summary',
      note=('Replaces test-1 in place (it said "Greenbook: 4 hours" and "Greenbook working plus 50 psi" on every job; those stay in gb-7). '
            'Formula carried from testing-water-2 (county spec, not re-read today); 0.66 gal/hr arithmetic checked.'))

# ---------------------------------------------------------------- 7. existing library-format cards corrected in place (same id)
live = [json.loads(l) for l in open(LIVE)]
byid = {r['c']['id']: r for r in live}

def fix_same(cid, pairs, **meta):
    c = dict(byid[cid]['c'])
    t = c['text']
    for a, b in pairs:
        assert t.count(a) == 1, (cid, a); t = t.replace(a, b)
    c['text'] = t; c.update(meta); c['supersedes'] = cid; c['checked'] = D
    B.add(**c)

fix_same('mfr-dipra-test-1', [("roughly 400 gpm for a 6 inch main and 1,060 gpm for a 12 inch", "about 260 gpm for a 6 inch main and 1,060 gpm for a 12 inch (Table 9)")],
         note='6 inch flushing flow was 400 gpm; DIPRA Table 9 (p. 79) says 260 gpm at 3.0 ft/s (and 1,060 for 12 inch). 260 = 6 in area x 3 ft/s.')
fix_same('mfr-dipra-thrust-1', [("sand about 4,000 lb per square foot, hard clay about 9,000.",
                                 "sand about 4,000 lb per square foot, hard clay about 9,000; agency thrust block tables can list sand lower (2,000), and the plans' or geotech value governs.")])
for cid in ('std-awwa-c651-methods-1', 'std-awwa-c651-bact-1', 'std-awwa-c651-repairs-1'):
    pass   # already say "a 2023 edition exists and was not read" (review Part 2 F is a false alarm for these three)

# ---------------------------------------------------------------- 8. old-format cards: exact-once edits (lib_kb cannot check these ids; tools/check_legacy.py does)
legacy('test-3', [("Agency specs can be stronger (Greenbook: 50 to 100 mg/L, 24 hours, 25 mg/L residual). ", "Agency specs can be stronger. "),
                  ("resample if the main isn't put in service in time.", "resample if the main isn't put in service in time." + C651_NOTE)],
       why='Part 2 E (Greenbook dose on every job; stays in gb-7) and F (C651-23)')
legacy('quick-reference-3', [("which is about 390 gpm in 8 inch).", "which is about 390 gpm in 8 inch)." + C651_NOTE)], why='Part 2 F')
legacy('testing-water-8', [("Flow values are computed from area times velocity.", "Flow values are computed from area times velocity." + C651_NOTE)], why='Part 2 F')
legacy('pipe-ductile-iron-5', [("Other makers and AWWA C600 list similar or more conservative values, especially for larger sizes (some show 3 degrees for the largest pipe).",
                                "DIPRA's installation guide (Table 5, May 2015) lists 5 degrees for 3 to 12 inch and 3 degrees for 14 inch and larger push-on joints, noting larger pipe may allow more; without the maker's chart for 14 inch and up, use 3 degrees.")],
       why='Part 1 #9 (two numbers for 14-30 inch)')
legacy('quick-reference-8', [("36 inch, 4 degrees, about 15 inches, about 260 ft radius.",
                              "36 inch, 4 degrees, about 15 inches, about 260 ft radius. DIPRA's guide (Table 5) lists 3 degrees for 14 inch and larger push-on joints: use 3 degrees unless you have the maker's chart.")],
       why='Part 1 #9')
legacy('thr-1', [("Typical allowable bearing (check the geotech or agency standard): soft clay about 500 to 1,000 psf, sand about 2,000, gravel and hard clay 3,000 to 4,000 psf.",
                  "Soil bearing comes from the plans' thrust block detail or the geotech report; published tables disagree (sand is 2,000 psf in one DOT table and 4,000 in DIPRA's), so with no plan value ask the engineer and use the lower one.")],
       why='Part 1 #4')
legacy('business-pm-6', title='Time and materials (T&M) or force account tickets: what goes on the ticket for extra work', why='Part 1 #5 / Part 2 A (crew words in the title; the 811 forcing itself is code)')

# Part 2 E (lead's scope note): national quick-reference cards that carried one state's numbers onto every job
legacy('quick-reference-4', [(" State plans can be stricter: Washington requires a protective system at 4 ft (WAC 296-155-657), and California also needs a Cal/OSHA permit at 5 ft (8 CCR 341).",
                              " State plans can be stricter; the job state's own rule governs.")], why='Part 2 E (WA and CA numbers in a national card; the WA / CA state cards hold them)')
legacy('quick-reference-5', [("Tolerance zone: commonly 18 inches each side of the marked facility or 24 inches, by state law; hand dig or vacuum excavate inside it. Typical notice: 2 to 3 business days (Iowa 48 hours excluding weekends and holidays). Tickets expire (Iowa: 25 calendar days after the wait period).",
                              "Tolerance zone: set by each state's one-call law (18 or 24 inches each side of the marked facility in most laws); hand dig or vacuum excavate inside it. The notice time before digging and how long a ticket lasts are also set by the job state's one-call law, so check that state's rule.")],
       source='APWA uniform color code; state one-call laws', why='Part 2 E (Iowa notice and ticket life on every job; the dig-ia cards hold Iowa)')
legacy('quick-reference-12', [("Common separation rules (Ten States approach, as in Virginia 12VAC5-590-1150): water mains at least 10 ft horizontally from sanitary sewers and manholes, edge to edge.",
                               "Ten States Standards separation (Recommended Standards for Water Works, 2018, 8.8): water mains at least 10 ft horizontally from gravity sanitary or storm sewers, edge to edge (8.8.2); crossings at least 18 inches outside to outside (8.8.3); anything less needs the reviewing authority's approval (8.8.4)."),
                              ("Crossings: at least 18 inches vertical between bottom of water main and top of sewer, water over sewer. ", "Water over sewer at crossings. "),
                              ("States differ; check yours.", "The job state's own separation rule governs.")],
       source='Recommended Standards for Water Works (Ten States Standards), 2018 edition, Sections 8.8.2-8.8.4 (our summary)', why='Part 2 E (Virginia rule as the national card source)')


def build():
    assert len(live) == 3247 and [r['o'] for r in live] == list(range(3247))
    out = []
    rep = {c['supersedes']: c for c in B.chunks if c.get('supersedes')}
    changed_legacy = []
    for r in live:
        c = r['c']; cid = c['id']
        if cid in rep:
            n = dict(rep[cid])
            out.append({'o': r['o'], 'lib': r['lib'], 'c': n})
        elif cid in LEGACY:
            e = LEGACY[cid]; n = dict(c); t = n['text']
            for a, b in e['pairs']:
                assert t.count(a) == 1, (cid, a[:60]); t = t.replace(a, b)
            n['text'] = t
            if e['title']: n['title'] = e['title']
            n.update(e['meta'])
            out.append({'o': r['o'], 'lib': r['lib'], 'c': n}); changed_legacy.append((c, n, e['why']))
        else:
            out.append(r)
    for c in B.chunks:
        if not c.get('supersedes'):
            assert c['id'] not in byid, c['id']
            out.append({'o': len(out), 'lib': 'field', 'c': dict(c)})
    assert set(rep) <= set(byid), set(rep) - set(byid)
    return out, changed_legacy


def check_legacy(old, new):
    """the rules lib_kb applies to text, for old-format cards: length, no curly quotes, no state named in title/source/first 300 chars"""
    E = []
    t = new['text']
    if not 200 <= len(t) <= 1800: E.append(f'text length {len(t)}')
    if re.search(r'[‘’“”–—]', t + new.get('title', '')): E.append('curly quotes / long dashes')
    if state_names_in(f"{new.get('title','')} {new.get('source','')} {t[:300]}"): E.append('names a state in title/source/first 300')
    if len(new.get('title', '')) > 120: E.append('title over 120')
    return E


if __name__ == '__main__':
    B.write(existing_ids={r['c']['id'] for r in live})
    out, cl = build()
    bad = 0
    with open(H + '/cards/legacy_edits.jsonl', 'w') as f:
        for old, new, why in cl:
            e = check_legacy(old, new); bad += len(e)
            print('legacy', new['id'], len(old['text']), '->', len(new['text']), 'ERR ' + '; '.join(e) if e else 'ok')
            f.write(json.dumps({'id': new['id'], 'why': why, 'old_text_md5': hashlib.md5(old['text'].encode()).hexdigest(),
                                'old_title': old.get('title'), 'new': new}, ensure_ascii=False) + '\n')
    assert bad == 0, bad
    os.makedirs(H + '/work', exist_ok=True)
    with open(H + '/work/after_rows.jsonl', 'w') as f:
        for r in out: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    kb = {'app': [], 'field': [], 'osha': []}
    for r in out: kb[r['lib']].append(r['c'])
    json.dump(kb, open(H + '/work/kb_staged.json', 'w'))
    base = {'app': [], 'field': [], 'osha': []}
    for r in live: base[r['lib']].append(r['c'])
    json.dump(base, open(H + '/work/kb_live.json', 'w'))
    print(f"rows {len(live)} -> {len(out)}; lib_kb cards {len(B.chunks)} ({sum(1 for c in B.chunks if c.get('supersedes'))} replace in place); legacy edits {len(cl)}")
