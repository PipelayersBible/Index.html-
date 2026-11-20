# lib_traffic_nov20 / cases.py : python3 cases.py  -> traffic_cases.jsonl (checked with lib_kb.py cases)
# 60 federal cases (lib-us-mutcd-N) + state cases (lib-<st>-tc-N). Layout: LIBRARY_RULES.md section 5.
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from kb_traffic_states import NAMES, CITY, FLAG, ADOPT
C = []
def case(id, q, where, must, lead, chunks, kind='simple', cat='traffic', level='pipelayer', mustnot=None, strict=False):
    c = dict(id=id, cat=cat, q=q, where=where, level=level, kind=kind, must=must, lead=lead, chunks=chunks)
    if mustnot: c['mustnot'] = mustnot
    if kind == 'complex': c['complex'] = True
    if strict: c['state_strict'] = True
    C.append(c)

W = ['Tulsa, OK', 'Atlanta, GA', 'Kansas City, MO', 'Nashville, TN', 'Omaha, NE', 'Little Rock, AR', 'Wichita, KS', 'Jackson, MS', 'Louisville, KY', 'Billings, MT']
n = [0]
def fed(q, must, lead, chunks, kind='simple', level='pipelayer', mustnot=None):
    n[0] += 1
    case(f'lib-us-mutcd-{n[0]}', q, W[n[0] % len(W)], must, lead, chunks, kind, level=level, mustnot=mustnot)

FT = r'( ?ft| ?feet| ?foot|\')'
# ---- tapers
fed("How long does my taper need to be to close a 12 foot lane on a 35 mph street?", ["245" + FT], ["245"], ['mutcd-6b-taper-1', 'mutcd-6b-taper-2', 'mutcd-6b-setup-1'])
fed("What's the taper length for a 12 ft lane at 55 mph?", ["660" + FT], ["660"], ['mutcd-6b-taper-1', 'mutcd-6b-taper-2'])
fed("What's the taper formula for 40 mph and under?", [r"W ?[x*×] ?S ?(squared|\^ ?2|[x*×] ?S|²) ?/ ?60|WS ?(squared|\^ ?2|²) ?/ ?60"], [r"60"], ['mutcd-6b-taper-1'], 'rule')
fed("What's the taper formula at 45 mph and over?", [r"L ?= ?W ?[x*×]? ?S\b|W ?[x*×] ?S\b|width.{0,30}(times|x).{0,20}speed"], [r"W|width"], ['mutcd-6b-taper-1'], 'rule')
fed("How long is a shifting taper compared to a merging taper?", [r"half|1/2|0\.5"], [r"half|1/2|0\.5"], ['mutcd-6b-taper-1'])
fed("How long is a shoulder taper?", [r"third|1/3|0\.33"], [r"third|1/3|0\.33"], ['mutcd-6b-taper-1', 'mutcd-6n-shoulder-1'])
fed("How long is the taper in front of a flagger on a two lane road?", [r"50", r"100"], [r"50.{0,20}100"], ['mutcd-6b-taper-1', 'mutcd-6p-ta10-1'])
fed("How long should the downstream taper be at the end of my work zone?", [r"50", r"100"], [r"50.{0,20}100"], ['mutcd-6b-taper-1'])
fed("Taper for a 12 ft lane at 45 mph?", ["540" + FT], ["540"], ['mutcd-6b-taper-2', 'mutcd-6b-taper-1', 'mutcd-6b-setup-1'], mustnot=[r"\b405"])
fed("How long is the taper to close a 10 foot lane at 30 mph?", ["150" + FT], ["150"], ['mutcd-6b-taper-2', 'mutcd-6b-taper-1'])
fed("In the taper formula, what speed do I use for S?", [r"posted", r"85th"], [r"posted"], ['mutcd-6b-taper-1'], 'rule')
# ---- cone spacing
fed("How far apart do I set cones in the taper at 35 mph?", ["35" + FT], ["35"], ['mutcd-6k-spacing-1', 'mutcd-6b-setup-1'])
fed("How far apart can cones be along the work area at 45 mph?", ["90" + FT], ["90"], ['mutcd-6k-spacing-1'])
fed("How many cones do I need for a 245 foot taper at 35 mph?", [r"\b8\b|eight"], [r"\b8\b|eight"], ['mutcd-6k-spacing-1', 'mutcd-6b-setup-1'])
fed("Cone spacing in the short taper by the flagger?", ["20" + FT], ["20"], ['mutcd-6k-spacing-1', 'mutcd-6b-taper-1'])
fed("How tall do cones have to be at night?", [r"28 ?(in|\")"], [r"28"], ['mutcd-6k-cones-1'])
fed("Can I use 18 inch cones?", [r"day", r"28"], [r"day|low.speed"], ['mutcd-6k-cones-1'], 'rule')
fed("What reflective bands does a 28 inch cone need for night?", [r"6 ?(in|\")", r"4 ?(in|\")"], [r"6"], ['mutcd-6k-cones-1'], 'rule')
fed("How big do traffic drums have to be?", [r"36 ?(in|\")", r"18 ?(in|\")"], [r"36"], ['mutcd-6k-cones-1'])
# ---- sign spacing
fed("How far apart do the advance warning signs go on a rural road?", ["500" + FT], ["500"], ['mutcd-6b-signspacing-1'])
fed("Sign spacing on a freeway lane closure?", [r"1,?000", r"1,?500", r"2,?640|half.?mile|1/2 mile"], [r"1,?000"], ['mutcd-6b-signspacing-1'], 'rule')
fed("How far apart are the warning signs on a low speed city street?", ["100" + FT], ["100"], ['mutcd-6b-signspacing-1'])
fed("On the traffic control drawings, what do A, B and C mean?", [r"first sign", r"second"], [r"sign"], ['mutcd-6b-signspacing-1', 'mutcd-6p-howto-1'], 'rule')
fed("Which sign goes up first in a work zone?", [r"ROAD WORK AHEAD|UTILITY WORK"], [r"ROAD WORK AHEAD|UTILITY WORK"], ['mutcd-6b-signspacing-1', 'mutcd-6h-signs-1'])
fed("Can I use a Utility Work Ahead sign instead of Road Work Ahead?", [r"yes|may|can", r"W21-7|utility"], [r"yes|may|can"], ['mutcd-6h-signs-1', 'mutcd-6n-utility-1'])
fed("How high does a work zone sign have to be mounted in town?", ["7" + FT], ["7"], ['mutcd-6f-signs-1'])
fed("How long can I leave signs on low portable stands?", [r"3 days|three days"], [r"3 days|three days"], ['mutcd-6f-signs-1'])
fed("Is there a sign for steel plates in the road?", [r"STEEL PLATE AHEAD|W8-24"], [r"STEEL PLATE|W8-24|yes"], ['mutcd-6h-signs-1'])
# ---- buffer / zone
fed("How long should the buffer space be at 35 mph?", ["250" + FT], ["250"], ['mutcd-6b-activity-1', 'mutcd-6b-setup-1'])
fed("How long a buffer at 55 mph?", ["495" + FT], ["495"], ['mutcd-6b-activity-1'])
fed("Can I park the crew truck in the buffer space?", [r"no\b|should not|shouldn't|keep.{0,20}(empty|clear)"], [r"no\b|should not|shouldn't|empty|clear"], ['mutcd-6b-activity-1'])
fed("What are the parts of a work zone?", [r"advance warning", r"transition", r"activity", r"termination"], [r"advance warning"], ['mutcd-6b-zone-1'], 'rule')
fed("How far off the road do I have to be to not need traffic control?", ["15" + FT], ["15"], ['mutcd-6n-shoulder-1', 'mutcd-6p-shoulder-1'])
fed("How wide does the lane have to stay if my work sticks into it from the shoulder?", ["10" + FT], ["10"], ['mutcd-6n-shoulder-1'])
# ---- flaggers
fed("What class vest does a flagger need at night?", [r"Class 3"], [r"Class 3"], ['mutcd-6c-hivis-1', 'mutcd-6m-night-1'])
fed("What vest class do my guys need working in the road?", [r"Class 2", r"Class 3|\b3\b"], [r"Class 2"], ['mutcd-6c-hivis-1'])
fed("Does a flagger station have to be lit at night?", [r"yes|shall|must|required", r"emergenc"], [r"yes|shall|must|required"], ['mutcd-6d-flagger-station-1', 'mutcd-6m-night-1'])
fed("Can a flagger use a red flag instead of a paddle?", [r"emergenc"], [r"emergenc|no\b|only"], ['mutcd-6d-flagger-paddle-1'])
fed("How big does a flagger's flag have to be?", [r"24 ?(in|\")"], [r"24"], ['mutcd-6d-flagger-paddle-1'])
fed("Where should the flagger stand?", [r"shoulder", r"closed lane|stopped"], [r"shoulder"], ['mutcd-6d-flagger-signals-1'], 'rule')
fed("How does a flagger signal traffic to stop with the paddle?", [r"STOP", r"palm|free (hand|arm)"], [r"STOP"], ['mutcd-6d-flagger-signals-1'], 'steps')
fed("How far ahead of the work should the flagger be at 45 mph?", ["360" + FT], ["360"], ['mutcd-6d-flagger-station-1', 'mutcd-6b-activity-1'])
fed("Can I use just one flagger?", [r"see|sight|visible", r"short|low"], [r"yes|only|if"], ['mutcd-6e-onelane-1', 'mutcd-6p-ta10-1'], 'rule')
fed("Does the federal MUTCD require a flagger card?", [r"no\b|does not|doesn't", r"state"], [r"no\b|does not|doesn't"], ['mutcd-6d-flagger-qual-1'], 'rule', level='foreman')
fed("Can a flagger just wave cars through with hand signals?", [r"no\b|shall not|not allowed|cannot|can't", r"paddle"], [r"no\b|shall not|not|cannot|can't"], ['mutcd-6d-flagger-signals-1'])
fed("How long can a flag transfer section be?", [r"1 mile|one mile"], [r"1 mile|one mile"], ['mutcd-6e-onelane-1'])
fed("What sign goes on a pilot car?", [r"PILOT CAR FOLLOW ME|G20-4"], [r"PILOT CAR|G20-4"], ['mutcd-6e-onelane-1'])
# ---- devices
fed("Can I run the arrow on the arrow board for shoulder work?", [r"caution"], [r"no\b|caution"], ['mutcd-6l-arrowboard-1'])
fed("Arrow board on a two lane road with flaggers, arrow or caution?", [r"caution"], [r"caution"], ['mutcd-6l-arrowboard-1', 'mutcd-6p-ta10-1'])
fed("What barricade do I use to close a road?", [r"Type (3|III)"], [r"Type (3|III)"], ['mutcd-6k-barricades-1'])
# ---- pedestrians
fed("How wide does a temporary sidewalk detour have to be?", [r"60 ?(in|\")|5 ?(ft|feet)", r"48 ?(in|\")|200"], [r"60|48"], ['mutcd-6c-ada-1', 'mutcd-6p-ta28-1'], 'rule')
fed("What slope can a temporary curb ramp be?", [r"12:1|8\.33|1:12"], [r"12:1|8\.33|1:12"], ['mutcd-6c-ada-1', 'mutcd-6p-ta28-1'])
fed("Can I close a sidewalk with cones and caution tape?", [r"no\b|should not|not", r"detect|cane"], [r"no\b|should not|not"], ['mutcd-6c-ped-1', 'mutcd-6c-ada-1'], 'rule')
fed("We have to close the sidewalk for the trench. What do we have to do for people walking?", [r"detect|accessible", r"SIDEWALK CLOSED|sign|cross"], [r"route|walkway|access|path|detour"], ['mutcd-6c-ped-1', 'mutcd-6c-ada-1', 'mutcd-6p-ta28-1'], 'complex', level='foreman')
# ---- durations / typical setups
fed("What counts as short duration work?", [r"1 hour|one hour|60 minutes"], [r"1 hour|one hour|60 minutes"], ['mutcd-6n-duration-1', 'mutcd-6n-short-1'])
fed("When is a job long-term stationary?", [r"3 days|three days"], [r"3 days|three days"], ['mutcd-6n-duration-1'])
fed("We're only on the shoulder for 30 minutes. Do I need signs and cones?", [r"lights|strobe|beacon", r"60 minutes|1 hour|one hour|short"], [r"no\b|may|can|not"], ['mutcd-6n-short-1', 'mutcd-6p-shoulder-1'], 'rule')
fed("Which MUTCD typical application is the flagger setup for a lane closure on a two lane road?", [r"TA-?10|6P-10"], [r"TA-?10|6P-10"], ['mutcd-6p-ta10-1', 'mutcd-6n-utility-1'])
fed("How bright does the lighting need to be for night work?", [r"5 ?(foot|fc)", r"10|20"], [r"5"], ['mutcd-6m-night-1'], 'rule')
# ---- status / OSHA
fed("What edition of the MUTCD is current?", [r"11th", r"2023", r"Revision 1|Rev\.? 1"], [r"11th"], ['mutcd-6a-status-1'], level='office')
fed("Which OSHA rule covers flaggers?", [r"1926\.201"], [r"1926\.201"], ['mutcd-osha-subpartg-1'], level='office')
fed("Which OSHA standard says our traffic control has to follow the MUTCD?", [r"1926\.200\(g\)"], [r"1926\.200"], ['mutcd-osha-subpartg-1'], level='office')
fed("Which MUTCD edition does OSHA go by?", [r"2009"], [r"2009"], ['mutcd-osha-edition-1'], level='office')
fed("Is cone spacing in the MUTCD a requirement or a recommendation?", [r"guidance|should|recommend"], [r"guidance|recommend"], ['mutcd-6a-words-1', 'mutcd-6k-spacing-1'], level='office')
fed("How much can a work zone speed limit be dropped?", [r"10 mph"], [r"10 mph"], ['mutcd-6b-plan-1'], level='office')

# ------------------------------------------------------------------ state cases: one per state on the adoption / flagger card
MUST = {
 'AL': [r"ATSSA"], 'AK': [r"ATSSA|IMSA"], 'AR': [r"train"], 'CT': [r"ATSSA|National Safety Council|NSC"], 'DE': [r"DelDOT|certif"], 'DC': [r"ATSSA"],
 'GA': [r"ATSSA|National Safety Council|NSC|certif"], 'HI': [r"4 years|four years|nationally"], 'ID': [r"ITD"], 'IL': [r"certif", r"ATSSA|National Safety Council|Laborers|approved"],
 'IN': [r"ATSSA|worksite traffic supervisor|certif"], 'IA': [r"December 31|card"], 'KS': [r"3 years|three years"], 'KY': [r"5 years|five years"], 'LA': [r"qualified|ATSSA"],
 'ME': [r"652|certif|train"], 'MD': [r"SHA|ATSSA"], 'MA': [r"2 years|two years"], 'MI': [r"12 months|traffic regulator"], 'MN': [r"MnDOT|qualif"], 'MS': [r"4 years|four years"],
 'MO': [r"4 years|four years"], 'MT': [r"certif"], 'NE': [r"certif", r"80|video|handbook"], 'NV': [r"NDOT|approved"], 'NM': [r"4 years|four years|ATSSA"],
 'NY': [r"train", r"ATSSA|National Safety Council|roster|recognized"], 'NC': [r"NCDOT"], 'ND': [r"exam|test"], 'OH': [r"does not require|no (state )?(certif|card)|not require"],
 'OK': [r"train"], 'PA': [r"3 years|three years"], 'RI': [r"RIDOT|certificate|approved"], 'SC': [r"SCDOT"], 'SD': [r"2 years|two years"], 'TN': [r"certif", r"ATSSA|approved"],
 'TX': [r"instructor|approved|qualified"], 'UT': [r"3 years|three years"], 'VT': [r"2 years|two years|4.hour"], 'VA': [r"VDOT|ATSSA", r"2 years|two years|4 years|four years"],
 'WA': [r"3 years|three years", r"card"], 'WV': [r"ATSSA"], 'WI': [r"certif"], 'WY': [r"3 years|three years"], 'OR': [r"3 years|three years"],
 'CO': [r"CDOT", r"18|exam|test"], 'CA': [r"train", r"1599|6D\.01|before"],
}
NOTCONF = {'NH', 'NJ', 'AZ', 'FL'}
for code, name in NAMES.items():
    where = f"{CITY[code]}, {code}"
    ch = [f'tc-{code.lower()}-adopt-1']
    if code in NOTCONF:
        case(f'lib-{code.lower()}-tc-1', "Do my flaggers need a state flagger card here?", where, [r"not confirmed|can't confirm|cannot confirm|don't have|check with|ask", r"DOT|permit|agency"],
             [r"not confirmed|can't confirm|cannot confirm|don't have|check|ask"], ch, 'rule', level='foreman', strict=True)
    else:
        q = "Do my flaggers need a card or certification here?" if code not in ('OH', 'OK', 'AR') else "Does the state require flagger certification here?"
        if code in ('KS', 'KY', 'MA', 'MS', 'MO', 'PA', 'SD', 'UT', 'WY', 'WA', 'OR', 'VT', 'HI'): q = "How long is a flagger card good for here?"
        if code == 'MI': q = "What training does a traffic regulator need here?"
        lead = [MUST[code][0]] if code in ('KS', 'KY', 'MA', 'MS', 'MO', 'PA', 'SD', 'UT', 'WY', 'WA', 'OR') else [r"yes|no\b|must|need|require|train|certif|not"]
        case(f'lib-{code.lower()}-tc-1', q, where, MUST[code], lead, ch, 'rule', level='foreman', strict=True)

# second case per state where the adoption itself is confirmed, and detail cases for the priority states
def stc(code, k, q, must, lead, chunks, kind='simple', level='foreman', mustnot=None):
    case(f'lib-{code.lower()}-tc-{k}', q, f"{CITY[code]}, {code}", must, lead, chunks, kind, level=level, mustnot=mustnot, strict=True)
stc('CA', 2, "Which MUTCD do we follow here?", [r"CA MUTCD|California MUTCD", r"2026"], [r"CA MUTCD|California MUTCD"], ['tc-ca-adopt-1'])
stc('CA', 3, "How far apart do the advance warning signs go on a 35 mph street?", [r"200" + FT], [r"200"], ['tc-ca-signspacing-1'], mustnot=[r"350 ?(ft|feet)"])
stc('CA', 4, "Sign spacing on a 45 mph street?", [r"300" + FT], [r"300"], ['tc-ca-signspacing-1'])
stc('CA', 5, "Taper length for a 12 ft lane at 40 mph?", [r"320" + FT], [r"320"], ['tc-ca-taper-1'])
stc('CA', 6, "What's the lowest a construction zone speed limit can be set?", [r"25 mph"], [r"25"], ['tc-ca-fines-1'])
stc('CA', 7, "Are fines doubled in a construction zone?", [r"42009", r"workers"], [r"yes|doubl|higher"], ['tc-ca-fines-1'], 'rule')
stc('CA', 8, "Which Caltrans standard plan is the flagger setup for one-lane traffic?", [r"T-?13"], [r"T-?13"], ['tc-ca-plans-1'])
stc('TX', 2, "Which MUTCD applies here?", [r"TMUTCD|Texas MUTCD", r"2025"], [r"TMUTCD|Texas MUTCD"], ['tc-tx-adopt-1'])
stc('TX', 3, "Do fines double in a work zone here?", [r"workers", r"sign"], [r"yes|doubl"], ['tc-tx-fines-1'], 'rule')
stc('AZ', 2, "Can we leave the double fine signs up overnight when nobody's working?", [r"no\b|only when workers|removed|covered", r"workers"], [r"no\b|only|removed|covered"], ['tc-az-fines-1'], 'rule')
stc('AZ', 3, "Does the state have its own MUTCD?", [r"supplement", r"11th"], [r"supplement|national"], ['tc-az-adopt-1'])
stc('NV', 2, "What signs do I need for double penalties in my work zone?", [r"DOUBLE PENALTIES IN WORK ZONES", r"begin|end"], [r"DOUBLE PENALTIES|three|3"], ['tc-nv-fines-1'], 'rule')
stc('NV', 3, "Which MUTCD edition is the state on?", [r"not confirmed|can't confirm|cannot confirm|check|ask", r"NDOT"], [r"not confirmed|can't confirm|cannot confirm|check|ask|NDOT"], ['tc-nv-adopt-1'], 'rule')
stc('FL', 2, "Which MUTCD does the state use?", [r"11th", r"14-15\.010|national|FHWA"], [r"11th|national|FHWA"], ['tc-fl-adopt-1'])
stc('FL', 3, "When do speeding fines double in a construction zone?", [r"posted|sign", r"personnel|workers"], [r"posted|sign|personnel|workers"], ['tc-fl-fines-1'], 'rule')
stc('WA', 2, "Will an out of state flagger card work here?", [r"Oregon", r"Idaho", r"Montana"], [r"yes|Oregon|reciproc"], ['tc-wa-flagger-1', 'tc-wa-adopt-1'], 'rule')
stc('WA', 3, "Can my flagger use his phone between cars?", [r"no\b|may not|not allowed|cannot|can't"], [r"no\b|may not|not|cannot|can't"], ['tc-wa-flagger-1'])
stc('WA', 4, "Is the speeding ticket doubled in a construction zone?", [r"twice|doubl", r"46\.61\.527"], [r"yes|twice|doubl"], ['tc-wa-fines-1'], 'rule')
stc('OR', 2, "How long can I use the traffic control handbook diagrams before I need a full plan?", [r"3 days|three days|72 hours"], [r"3 days|three days|72 hours"], ['tc-or-handbook-1', 'tc-or-adopt-1'])
stc('OR', 3, "How long can we hold traffic at the flagger?", [r"20 minutes"], [r"20 minutes"], ['tc-or-handbook-1'])
stc('OR', 4, "How far apart can the flagger signs be with flaggers only?", [r"1 mile|one mile", r"pilot car"], [r"1 mile|one mile"], ['tc-or-handbook-1'], 'rule')
stc('CO', 2, "Can my flagger wear a fluorescent red vest?", [r"no\b|not allowed|not"], [r"no\b|not"], ['tc-co-fines-1'])
stc('CO', 3, "Which MUTCD is in effect here?", [r"11th", r"supplement"], [r"11th|supplement"], ['tc-co-adopt-1'])
stc('UT', 2, "When are speeding fines doubled in a construction zone?", [r"workers", r"sign"], [r"workers|sign"], ['tc-ut-fines-1'], 'rule')
stc('GA', 2, "Is the state on the new MUTCD yet?", [r"11th", r"2024"], [r"yes|11th"], ['tc-ga-adopt-1'])
stc('IN', 2, "Which MUTCD applies here?", [r"Indiana MUTCD|IMUTCD", r"2025|2026"], [r"Indiana MUTCD|IMUTCD"], ['tc-in-adopt-1'])
stc('OH', 2, "What taper length does the state supplement call for?", [r"not confirmed|can't confirm|cannot confirm|check|read", r"supplement"], [r"not confirmed|can't confirm|cannot confirm|check|read|supplement"], ['tc-oh-adopt-1'], 'rule')
stc('VA', 2, "What manual has the work zone rules here?", [r"Work Area Protection Manual"], [r"Work Area Protection Manual|Virginia MUTCD"], ['tc-va-adopt-1'])
stc('PA', 2, "Which PennDOT publication has the work zone setups?", [r"213"], [r"213"], ['tc-pa-adopt-1'])
stc('NY', 2, "Has the state adopted the 11th Edition MUTCD?", [r"not confirmed|can't confirm|cannot confirm|check", r"NYSDOT|supplement"], [r"not confirmed|can't confirm|cannot confirm|check"], ['tc-ny-adopt-1'], 'rule')
stc('UT', 3, "Is the state on the 11th Edition MUTCD?", [r"not confirmed|can't confirm|cannot confirm|check", r"UDOT"], [r"not confirmed|can't confirm|cannot confirm|check"], ['tc-ut-adopt-1'], 'rule')

for c in C:
    if c['id'] in ('lib-wa-tc-1', 'lib-wa-tc-2', 'lib-or-tc-1', 'lib-mt-tc-1', 'lib-id-tc-1'): c.pop('state_strict', None)   # the right answer names the reciprocity states
assert len({c['id'] for c in C}) == len(C)
with open(os.path.join(HERE, 'traffic_cases.jsonl'), 'w') as f:
    for c in C: f.write(json.dumps(c, ensure_ascii=False) + '\n')
print(len(C), 'cases;', sum(1 for c in C if c['id'].startswith('lib-us')), 'federal;', len({c['where'][-2:] for c in C if not c['id'].startswith('lib-us')}), 'states')
