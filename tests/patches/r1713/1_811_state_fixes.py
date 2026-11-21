# r17.13 item 1: 811 state table fixes (Tommy approved Nov 20). python3 1_811_state_fixes.py in.html out.html
# Only what tests/staged/lib_811_nov20 confirmed from an official source (statute or the 811 center's current rules).
# Georgia NOT touched (Tommy is calling Georgia 811). North Dakota NOT touched (its wait and hand-dig numbers come only
# from a 2020 handbook copy hosted by a city, not a current official source). Illinois 25 working days: already in r17.12
# and confirmed by the statute text (220 ILCS 50/2: "'Day' does not include holidays recognized by JULIE, Saturdays,
# Sundays, and the day of the actual notice"; "valid for 25 days from the date of the initial request"), so unchanged.
# Every change: state, field, old, new, source in tests/staged/r1713_candidate/NOTES.md (table "811 changes").
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

i = p.s.index('  const PB_SR = {'); j = p.s.index('\n', i); line = p.s[i:j]
a = line.index('{'); b = line.rindex('}') + 1
T = json.loads(line[a:b]); dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
assert dump(T) == line[a:b], 'state table does not round-trip'
CHANGES = []  # (state, field, old, new, source)

def fix(code, fields, sources):
    assert code not in ('GA', 'ND'), code
    R = T['states'][code]; old = dump(R)
    R = json.loads(old); src = sources[0]['what'] if sources else '(existing source)'
    for k, v in fields.items():
        assert k in R, code + ' has no field ' + k
        CHANGES.append((code, k, R[k], v, src))
        R[k] = v
    have = {s['url'] for s in R['sources']}
    for s in sources:
        if s['url'] not in have: R['sources'] = [s] + R['sources']; have.add(s['url'])
    R['checked'] = '2026-11-20'
    p.rep('"' + code + '":' + old, '"' + code + '":' + dump(R))

NC = {'what': 'G.S. 87-117(22) and 87-122(c): tolerance zone for every marked line (as amended by S.L. 2025-21)', 'url': 'https://www.ncleg.net/EnactedLegislation/Statutes/HTML/ByArticle/Chapter_87/Article_8A.html'}
IL = {'what': '220 ILCS 50/2, 4, 5.1, 10: tolerance zone, positive response (from Jan 1, 2026), black on snow', 'url': 'https://ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1286'}
VA = {'what': 'Va. Code 56-265.17: 48 hours from 7:00 a.m. the next working day', 'url': 'https://law.lis.virginia.gov/vacode/56-265.17/'}
PA = {'what': '73 P.S. 180(2.1), (11), (14): notice 3 to 10 business days, white marks, call again after 2 business days away', 'url': 'https://codes.findlaw.com/pa/title-73-ps-trade-and-commerce/pa-st-sect-73-180/'}
LA = {'what': 'La. R.S. 40:1749.14 (Acts 2026, No. 902): marked location = width + 18 inches each side', 'url': 'https://legis.la.gov/legis/Law.aspx?d=169745'}
OK = {'what': 'OKIE811 Excavator Guide, Feb 2026 (Extend / Re-Mark 4 business days ahead; 63 O.S. 142.6 two feet each side)', 'url': 'https://okie811.org/wp-content/uploads/2026/07/2026-Excavator-Guide-Digital-.pdf'}
MN = {'what': 'Gopher State One Call Handbook 2026 (white marks "without exception")', 'url': 'https://gopherstateonecall.org/wp-content/uploads/GSOCHandbook2026.pdf'}
FL = {'what': 'Fla. Stat. 556.109 (emergency) and 556.114(3) (white premarking), 2025', 'url': 'https://flsenate.gov/Laws/Statutes/2025/Chapter556/All'}
MO = {'what': 'RSMo 319.026 (Aug 28, 2025): unmarked or wrong marks, 2 hours', 'url': 'https://revisor.mo.gov/main/OneSection.aspx?section=319.026'}
KY = {'what': 'KRS 367.4911: second notice; hand-dig or nonintrusive in the tolerance zone', 'url': 'https://law.justia.com/codes/kentucky/chapter-367/section-367-4911/'}

fix('NC', {'tol_in': 24, 'tol_text': '24 inches each side of the outside edge of the mark (half the diameter + 24 inches from the centerline when the size is known). No machines in it until you see the line. Within 24 inches of oil, gas transmission or electric transmission lines: hand tools only.'}, [NC])
fix('IL', {'tol_in': 18, 'tol_text': '18 inches each side of the outside edge of the marks (half the diameter + 18 inches when the size is shown). Hand or vacuum dig inside it.',
           'white_text': 'Pre-mark the dig area in white (black when snow is on the ground).',
           'note': 'Illinois: since Jan 1, 2026, check that every operator has posted a positive response before you dig.'}, [IL])
fix('VA', {'notice': {'n': 3, 'unit': 'wd', 'text': 'Operators have 48 hours, starting 7 AM the next working day. A Monday call is good Thursday at 7 AM. Start sooner only if every operator has marked or cleared.'}}, [VA])
fix('PA', {'notice': {'n': 3, 'unit': 'wd', 'text': 'Call at least 3 and not more than 10 business days before digging (at least 10 for complex projects).'},
           'start': {'n': 10, 'unit': 'wd', 'text': 'Call no more than 10 business days before work starts.'},
           'renew': 'The law sets no ticket life. Call again if you leave the site for more than 2 business days.',
           'white': 'conditional', 'white_text': 'Mark the site in white when the exact site can’t be given.',
           'note': 'Pennsylvania’s law sets no ticket life. Check Pennsylvania 811 for your ticket’s dates.'}, [PA])
fix('LA', {'tol_in': 18, 'tol_text': 'The line’s width plus 18 inches on either side.', 'note': None}, [LA])
fix('OK', {'renew': 'Update the ticket (Extend, or Re-Mark if marks are gone) at least 4 business days before it expires. Each adds 14 days.',
           'tol_in': 24, 'tol_text': '2 feet either side of the line. Hand dig only until the line is exposed. Machines may remove pavement only.'}, [OK])
fix('MN', {'white': 'required', 'white_text': 'Pre-mark the dig area in white, without exception. Electronic white marks count from Jan 1, 2026.'}, [MN])
fix('FL', {'white': 'conditional', 'white_text': 'Pre-mark in white (paint, stakes or flags) when the site can’t otherwise be identified.',
           'emergency': 'Emergency (clear danger to life or property, or loss of vital service): tell Sunshine 811 or the operator as early as you can.'}, [FL])
fix('MO', {'note': 'Line unmarked or marked wrong: tell Missouri 811. The owner must contact you or mark it within 2 hours.'}, [MO])
fix('KY', {'tol_text': 'Hand-dig or use nonintrusive means inside the tolerance zone. Machines only for pavement, rock and material more than 12 inches from the line, with a spotter.',
           'note': 'Operator didn’t answer in time: send a second notice.'}, [KY])

# the source note right under the table (the table itself is JSON: no comments inside it)
p.rep('\n  window.PB_STATE_RULES = PB_SR;\n', '\n  /* r17.13 (Nov 20): NC, IL, VA, PA, LA, OK, MN, FL, MO, KY rows fixed from the law or the 811 center\'s current rules.\n     Sources: each row\'s own "sources"; old/new table in tests/staged/r1713_candidate/NOTES.md. GA and ND untouched. */\n  window.PB_STATE_RULES = PB_SR;\n')
p.save()
if os.environ.get('PB_CHANGES'):
    json.dump(CHANGES, open(os.environ['PB_CHANGES'], 'w'), ensure_ascii=False, indent=1)
