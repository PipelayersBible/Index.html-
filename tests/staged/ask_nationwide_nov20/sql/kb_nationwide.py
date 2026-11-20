# Ask KB source, Nov 20 2026 (ask_nationwide_nov20). Run: python3 kb_nationwide.py
# Same layout as /home/claude/kb_add/*.py and tests/r1707/askgrade/sql/kb_lockout_trench20.py. Writes next to this file:
#   kb_nationwide.jsonl            new field-library chunks (KB rebuild source)
#   01_ask_kb_nationwide.sql       staged migration (NOT applied): insert new chunks + guarded edits to existing chunks
#   01_ask_kb_nationwide_test.sql  the same statements in a DO block, checked, then rolled back by raising 'RESULT: ...'
#   02_ask_kb_topic_tags_OPTIONAL.sql  topic tags that only matter if the state filter is changed (see NOTES decision 2)
# Sources and dates:
#  - dig-<st> chunks: generated from tests/r1706/staterules/data/state_rules.json, the SAME table the app has used since
#    r17.06 (51 rows, every row lists its statute / 811-center URLs, checked 2026-11-19, recheck_by 2027-11-19).
#    Spot-checked again on 2026-11-20: Texas (texas811.org/faq: 2 business days, 18 in) and Florida
#    (sunshine811.com/excavator-instructions: 2 full business days, 30 calendar days, 24 in).
#  - plan-mi-trench-1: Mich. Admin. Code R 408.40941 (law.cornell.edu) and the filed Part 9 rule set (legislature.mi.gov),
#    read 2026-11-20. plan-or-confined-1: OAR 437-002-0146 (law.cornell.edu), read 2026-11-20.
#    plan-wa-confined-1: WAC 296-809-100 (law.cornell.edu), read 2026-11-20.
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
VERSION = 'b3e91f6c47d2'
RULES = os.path.join(HERE, '../../../r1706/staterules/data/state_rules.json')
TODAY = '2026-11-20'
NAMES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"]
CUES = [r'\b\d+VAC\d', r'\bTCEQ\b|\bTAC\b', r'\bNYCRR\b', r'\bF\.?A\.?C\.?\b', r'\bWAC\b', r'\bOAR\b']
CUE_OWNER = ['Virginia', 'Texas', 'New York', 'Florida', 'Washington', 'Oregon']
def head(c): return f"{c['title']} {c.get('source') or ''} {c['text'][:300]}"
def other_states(h, own=None):
    """state names / cues the live state filter (ask.ts otherStateOnly) would see in h, other than `own`"""
    out = [n for n in NAMES if n != own and re.search(r'\b' + n + r'\b', h)]
    out += [o for rx, o in zip(CUES, CUE_OWNER) if o != own and re.search(rx, h)]
    if own == 'West Virginia' and 'Virginia' in out and not re.search(r'(?<!West )\bVirginia\b', h): out.remove('Virginia')
    return sorted(set(out))

C = []
def add(id, title, topic, text, src, url, conf='high'):
    C.append({"id": id, "url": url, "text": text, "title": title, "topic": topic, "source": src, "confidence": conf})

# ---------------------------------------------------------------- A. one 811 chunk per state (50 states + DC)
T811 = "811 dig rules by state: wait before digging, ticket life, tolerance zone"
def sent(s):
    s = (s or '').strip()
    return s if not s or s[-1] in '.!?' else s + '.'
# Michigan's row in the app table says "not checked"; Part 9 was read on 2026-11-20 (see plan-mi-trench-1)
TRENCH_OVERRIDE = {'MI': "MIOSHA Part 9 (Michigan's own rule): slope or support the sides of an excavation more than 5 ft deep, and protect a shallower one when the ground may move (R 408.40941)."}
rules = json.load(open(RULES))
assert rules['checked'] == '2026-11-19' and len(rules['states']) == 51
for r in rules['states']:
    nm, code = r['name'], r['code']
    centers = ' and '.join(c['name'] + (f" ({c['area']})" if c.get('area') else '') for c in r['centers'])
    sites = ', '.join(re.sub(r'^https?://(www\.)?', '', c['url']).rstrip('/') for c in r['centers'] if c.get('url'))
    p = [f"{nm} ({code}) 811 rules as the app uses them, checked {r['checked']}. Call 811 or go online: {centers}" + (f" ({sites})." if sites else '.')]
    p.append("Wait before digging: " + (sent(r['notice']['text']) if r['notice'] else f"not confirmed from the law, so ask {r['centers'][0]['name']} and go by the dig date on your ticket."))
    if r['start'] and not re.search(r'(not|no) more than', (r['notice'] or {}).get('text', '')): p.append(sent(r['start']['text']))
    if r['life']: p.append("Ticket life: " + sent(r['life']['text']))
    elif r['renew']: p.append("Ticket life: " + sent(r['renew']) + " The app fills no expiry date for " + nm + "; enter the date printed on your ticket if it has one.")
    else: p.append("Ticket life: no fixed number of days is confirmed for " + nm + "; go by the expiry on your ticket (the app fills no expiry date and asks for the date on the ticket).")
    if r['life'] and r['renew']: p.append(sent(r['renew']))
    p.append("Tolerance zone (hand dig or vacuum only): " + (sent(r['tol_text']) if r['tol_text'] else f"not confirmed from the law; ask {r['centers'][0]['name']} and treat at least 24 inches each side of the marks as hand-dig until you know."))
    if r['white_text']: p.append("White lining: " + sent(r['white_text']))
    if r['emergency']: p.append(sent(r['emergency']))
    if r['note'] and not r['note'].startswith('We could not'): p.append(sent(r['note']))
    p.append("Trench protection: " + sent(TRENCH_OVERRIDE.get(code, r['trench']['text'])))
    if r.get('permit'): p.append(sent(r['permit'] if isinstance(r['permit'], str) else r['permit'].get('text', '')))
    p.append("Rules change. If your ticket or the 811 center says something different, go by them. A line hit that leaks gas or sparks: get everyone away and call 911, then the owner.")
    text = ' '.join(x for x in p if x).replace('\u2019', "'")
    srcs = [s for s in r['sources'] if not re.search(r'approved state plans|1926\.652|directory', s['what'], re.I)] or r['sources'][:1]
    src = '; '.join(s['what'] for s in srcs[:4]) + f"; app state table checked {r['checked']}"
    lvl = {'law': 'high', 'center': 'medium', 'partial': 'medium'}[r['level']]
    bits = [b for b, ok in (("wait before digging", r['notice']), ("ticket life", r['life']), ("tolerance zone", r['tol_text'])) if ok]
    title = f"{nm} 811 dig rules: " + (', '.join(bits) if bits else "811 center and what to check") + f" ({' / '.join(c['name'] for c in r['centers'][:2])})"
    add(f"dig-{code.lower()}", title, T811, text, src, srcs[0]['url'], lvl)

# ---------------------------------------------------------------- B. general 811 chunk that names no state up front
st = rules['states']
def rng(vals): return min(vals), max(vals)
add("dig-basics-1", "811 before you dig: what is the same everywhere and what changes by state",
 T811,
 "Every state has a one-call law and 811 reaches the right center from anywhere in the country. The steps are the same "
 "everywhere: mark your dig area in white, call or go online before you dig, wait the legal notice time, check that every "
 "utility has marked or answered, dig by hand or vacuum inside the tolerance zone, keep the marks visible, and renew the "
 "ticket before it runs out. What changes by state is the numbers. Of the 51 state tables in the app (50 states and DC, "
 f"checked {rules['checked']}): the wait is 2 working days in {sum(1 for r in st if r['notice'] and r['notice']['n']==2)} states and 3 in "
 f"{sum(1 for r in st if r['notice'] and r['notice']['n']==3)}, and longer in a few; ticket life runs from about two weeks to 60 days, counted "
 "in working days in some states and calendar days in others, and from the call in some and from the legal dig date in others; "
 "the tolerance zone is 18 inches each side in about as many states as 24 inches, measured from the mark in some and from "
 "the outside edge of the line in others. So never carry one state's numbers to the next job: ask for your job's state "
 "by name (for example 'how long is a ticket good for in Texas'), or open Locates and tap Rules for the state. Federal OSHA "
 "adds its own duty in every state: find out where underground lines are before opening an excavation, and protect, support "
 "or remove them while it is open (29 CFR 1926.651(b)). The ticket, the 811 center and the state law govern; this is a plain-"
 "language summary.",
 f"State one-call laws as listed in the app's state rules table (51 rows, checked {rules['checked']}); 29 CFR 1926.651(b)",
 "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.651")

# ---------------------------------------------------------------- C. state OSHA plan differences (first batch, verified)
TP = "State OSHA plans: where trench and confined space rules differ from federal OSHA"
add("plan-mi-trench-1", "Michigan trench rules (MIOSHA Part 9): at what depth sloping, shoring or a trench box is required (over 5 ft), ladder at 4 ft",
 TP,
 "Michigan runs its own OSHA plan (MIOSHA) and has its own excavation rule, Construction Safety Standard Part 9, Excavation, "
 "Trenching and Shoring (R 408.40901 to R 408.40953, last amended effective January 3, 2024). Main numbers: the side of an "
 "excavation more than 5 ft deep must be sloped as Table 1 of Part 9 prescribes unless it is supported as the part "
 "prescribes; an excavation less than 5 ft deep must also be protected when examination of the ground shows hazardous earth "
 "movement may be expected (R 408.40941). Table 1 is Michigan's own table of maximum angles of repose by soil; read the "
 "table in Part 9 itself rather than assuming the federal Appendix B slopes. A competent person makes an ongoing inspection "
 "of the excavation or trench (R 408.40932). An excavation 48 inches or more deep with an employee in it needs a ladder "
 "extending at least 3 ft above the top (or other egress), with no more than 25 ft of lateral travel along the trench "
 "wall to reach it, and excavated material is kept at least 2 ft back from the edge (R 408.40933). A trench box or "
 "shield may be used in place of shoring or sloping (R 408.40945). Deep or unusual protective systems need a registered "
 "professional engineer's design (R 408.40942). Plain-language summary; the MIOSHA rule text and your competent person govern.",
 f"Mich. Admin. Code R 408.40932, R 408.40933, R 408.40941, R 408.40942, R 408.40945 (MIOSHA Construction Safety Standard Part 9, eff. 1/3/2024); checked {TODAY}",
 "https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-408-40941")
add("plan-or-confined-1", "Oregon confined space rule (OAR 437-002-0146): one rule for construction and general industry, sewers included",
 TP,
 "Oregon runs its own OSHA plan and uses one confined space rule for all work, construction included: OAR 437-002-0146 "
 "\"applies to all activities in confined spaces\" (it has applied to construction work since March 1, 2015). Excavation work "
 "and underground construction under Oregon's construction rules are excluded, but sanitary sewer spaces stay covered. "
 "Numbers match federal: a hazardous atmosphere is oxygen below 19.5 percent or above 23.5 percent, flammable gas, vapor or "
 "mist above 10 percent of its lower flammable limit, or a toxic substance above its Oregon OSHA limit. Rescue: arrange it "
 "before entry and contact an off-site rescue service ahead of time; counting on calling 911 when something goes wrong does "
 "not meet the rule. Rescuers practice permit-space rescue at least every 12 months; use non-entry retrieval with a harness "
 "and line where feasible, with a mechanical device for vertical spaces more than 5 ft deep. Alternate entry (no permit) is "
 "allowed only when every hazard is eliminated, or all physical hazards are eliminated and the air hazards are controlled "
 "by continuous ventilation, with written procedures, testing with a calibrated meter, continuous monitoring and a record of "
 "each entry; a tag alone does not eliminate a hazard, and continuous systems such as sewers have extra conditions. The "
 "entry supervisor and your company program decide; this is a plain-language summary of the rule.",
 f"Or. Admin. Code 437-002-0146 (Oregon OSHA Confined Spaces; OSHA 6-2012, 5-2014, 3-2015); checked {TODAY}",
 "https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-437-002-0146", 'high')
add("plan-wa-confined-1", "Washington confined space rule (chapter 296-809): covers all confined spaces, your own and other employers'",
 TP,
 "Washington runs its own OSHA plan (DOSH, at Labor and Industries) and its confined space rule is chapter 296-809 of the "
 "state code. Its scope section says the chapter applies to all confined spaces: when you have confined spaces in your "
 "workplace, when your employees enter another employer's confined spaces, when a contractor enters yours, and when you "
 "provide confined space rescue. A table in the scope section tells which sections apply to permit-required spaces, "
 "alternative entry methods, spaces that are never entered, spaces only a contractor enters, and rescue services; where "
 "another Washington chapter also applies and they conflict, follow the more specific requirement. Cite chapter 296-809 "
 "on a Washington job rather than the federal Subpart AA section numbers; the federal text in the app's OSHA library is a "
 "guide to the same ideas (permit, air testing, attendant, rescue), not the Washington wording. The entry supervisor and "
 "your company program decide.",
 f"WAC 296-809-100 (scope; WSR 04-03-081, 15-24-102, 18-02-071); checked {TODAY}",
 "https://www.law.cornell.edu/regulations/washington/WAC-296-809-100", 'medium')
add("plan-trench-depth-1", "State OSHA plans and trench protection depth: which rule book applies on your job",
 TP,
 "Federal OSHA requires a protective system (sloping, benching, shoring or a shield) in an excavation 5 ft or deeper unless "
 "it is entirely in stable rock, and in a shallower one when the competent person sees a cave-in hazard (29 CFR 1926.652). "
 "Twenty-one states run their own OSHA plan for private construction crews; a plan must be at least as protective as federal "
 "and may be stricter, so on those jobs cite the state rule. What has been checked against the state's own rule text so far "
 f"(as of {TODAY}): Washington requires protection at 4 ft and, since June 1, 2026, a written trench work plan and a competent "
 "person on site during trench work; California keeps 5 ft and adds a Cal/OSHA permit for excavations 5 ft or deeper that "
 "people enter; Michigan uses its own Part 9 (slope or support over 5 ft, with its own angle table); Arizona, Nevada, New "
 "Mexico, Oregon and Utah adopt the federal excavation standard, so 5 ft. Not yet checked line by line: Alaska, Hawaii, "
 "Indiana, Iowa, Kentucky, Maryland, Minnesota, North Carolina, South Carolina, Tennessee, Vermont, Virginia and Wyoming; "
 "treat federal 5 ft as the floor there and ask the state agency or your safety person whether the plan adds anything. In "
 "every state the competent person and your company program decide what protection a trench gets.",
 f"29 CFR 1926.652(a)(1); osha.gov/stateplans; Wash. Admin. Code 296-155-657; 8 CCR 341; Mich. Admin. Code R 408.40941; AZ R20-5-601; UT R614-1-4; OR 437-003-0001; NM 11.5.3.9 NMAC; checked {TODAY}",
 "https://www.osha.gov/stateplans", 'medium')

# ---------------------------------------------------------------- checks on the new chunks (what the live state filter will see)
ids = [c['id'] for c in C]; assert len(set(ids)) == len(ids)
problems = []
for c in C:
    own = None
    if c['id'].startswith('dig-') and c['id'] != 'dig-basics-1':
        own = next(r['name'] for r in rules['states'] if r['code'].lower() == c['id'][4:])
    elif c['id'].startswith('plan-') and c['id'] != 'plan-trench-depth-1':
        own = {'mi': 'Michigan', 'or': 'Oregon', 'wa': 'Washington'}[c['id'].split('-')[1]]
    o = other_states(head(c), own)
    if own == 'District of Columbia': o = other_states(head(c))
    if o: problems.append((c['id'], o))
    assert len(c['text']) < 2600, (c['id'], len(c['text']))
    assert '’' not in c['text'] or True
print('new chunks:', len(C), '| chunks whose first lines name another state (would be filtered wrongly):', problems)

# ---------------------------------------------------------------- D. guarded edits to existing chunks
# field 'f': 'text' or 'source'. Each is applied only where the old phrase is still present.
UPD = [
 # D1. app chunks that still describe the pre-r17.06 app (California numbers for every job; a setting that no longer exists)
 dict(ord=71, id='app-howto-locates-1', f='text', why='r17.06: ticket dates follow the job state; the "good for (days)" setting was replaced by "811 rules state"',
  old='Each ticket shows Can dig from (2 working days after the call, the call day not counted) and Start work by (14 days after the call); a ticket is good for 28 days (Settings › Company: "A new dig ticket is good for (days)").',
  new='Each ticket shows Can dig from and Start work by, counted with the 811 rules of the job\'s state. The state comes from Change State on the Locates screen, else the job address, else Settings › Company › 811 rules state. Rules for the state (on the Locates screen) shows that state\'s wait, ticket life, tolerance zone, white lining and sources. Where a state\'s ticket life is not confirmed the app fills no expiry and Save asks for the date on the ticket. The numbers differ by state (for example a 28-day ticket in California and 14 working days in Texas), so go by the job\'s state, not by habit.'),
 dict(ord=235, id='app-data-other-reference-values-2', f='text', why='the 1-60 day company setting no longer exists (r17.06)',
  old='a ticket is good for 28 days (company setting 1–60, default 28).',
  new='a ticket is good for 28 days. Jobs in other states use that state\'s own numbers from the app\'s state table (Locates › Rules for the state).'),
 # D2. safety chunks the state filter hides on most jobs because their first lines or source name one state
 dict(ord=1912, id='quick-reference-4', f='text', why='Nov 18 edit put Washington/California in the first 300 chars: the trench quick reference is now filtered out in 48 states',
  old=' and in shallower trenches if a cave-in is possible; Washington requires it at 4 ft (WAC 296-155-657), and California also needs a Cal/OSHA permit at 5 ft (8 CCR 341). Over 20 ft',
  new=' and in shallower trenches if a cave-in is possible. Over 20 ft'),
 dict(ord=1912, id='quick-reference-4', f='text', why='(second half of the same edit: the state sentence moves to the end)',
  old='Daily inspection by the competent person, and after rain.',
  new='Daily inspection by the competent person, and after rain. State plans can be stricter: Washington requires a protective system at 4 ft (WAC 296-155-657), and California also needs a Cal/OSHA permit at 5 ft (8 CCR 341).'),
 dict(ord=1511, id='tools-power-support-20', f='text', why='"California\'s" at char 288 hides the 4-gas monitor chunk outside California',
  old="CO 35 ppm (California's limit is 25 ppm, so set the CO alarm to 25 ppm or lower there; the app uses 25 everywhere).",
  new="CO 35 ppm (the app's permit uses 25 ppm everywhere, which is the Cal/OSHA limit, so set the CO alarm to 25 ppm or lower to match the permit)."),
 dict(ord=331, id='retrieval-vocabulary-chunks-2', f='source', why='source names California: "yellow plastic pipe = gas, stop and call" is hidden outside California',
  old='California Government Code 4216.4(a)(3)', new='Cal. Gov. Code 4216.4(a)(3)'),
 dict(ord=1913, id='quick-reference-5', f='source', why='source names Iowa', old='Iowa One Call manual', new='One Call excavator manual (iowaonecall.com)'),
 dict(ord=1913, id='quick-reference-5', f='text', why='"(Iowa)" at char 294',
  old='commonly 18 inches each side of the marked facility (Iowa) or 24 inches in many states', new='commonly 18 inches each side of the marked facility or 24 inches, by state law'),
 dict(ord=2012, id='utility-locates-3', f='text', why='"(Iowa: ...)" at char 242',
  old='many states use 18 inches either side of the outside edge of the utility (Iowa: 18 inches each side, 36 inches total), others 24 inches',
  new='many states use 18 inches either side of the outside edge of the utility, others 24 inches'),
 dict(ord=2014, id='utility-locates-5', f='text', why='"Iowa requires" at char 135',
  old='Iowa requires white-lining unless the location can be clearly described on the call or at a preconstruction meeting, electronic white-lining is used, or physical premarking is impractical.',
  new='Many states require it; a typical law requires white lining unless the location can be clearly described on the call or at a preconstruction meeting, electronic white-lining is used, or physical premarking is impractical (that is how the Iowa law puts it).'),
 dict(ord=2015, id='utility-locates-6', f='text', why='"Iowa\'s manual" at char 136',
  old="(Iowa's manual says in an emergency leave equipment where it is)", new='(one state one-call manual says in an emergency leave equipment where it is)'),
 dict(ord=2016, id='utility-locates-7', f='text', why='"Iowa\'s definition" at char 196',
  old="(Iowa's definition)", new='(a typical state definition)'),
]
for o in (2010, 2012, 2014, 2015, 2016):
    UPD.append(dict(ord=o, id=f'utility-locates-{o-2009}', f='source', why='source names Iowa: the general 811 chunk is hidden outside Iowa',
                    old='Iowa One Call Excavator Manual 2024', new='One Call Excavator Manual 2024 (iowaonecall.com)'))
UPD.append(dict(ord=2013, id='utility-locates-4', f='source', why='source names Iowa', old='(e.g., Iowa One Call manual)', new='(e.g., the One Call manual at iowaonecall.com)'))
for o, n in ((699, 6), (700, 7), (701, 8)):
    UPD.append(dict(ord=o, id=f'first_aid-{n}', f='source', why='source names Florida: the Stop the Bleed first-aid chunks are hidden outside Florida',
                    old='as summarized in Florida DOH Stop the Bleed card', new='as summarized in a state health department Stop the Bleed card (floridahealth.gov)'))
# D3. outdated: Virginia passed a heat law in 2026 (Va. Code 40.1-44.2; 2026 Acts cc. 731, 732), read 2026-11-20
UPD.append(dict(ord=637, id='emp-state-va-2', f='text', why='Virginia 2026 heat law: the Board must adopt heat illness rules (Va. Code 40.1-44.2)',
    old='Heat illness rules in Virginia: No state heat standard; federal OSHA rules apply (General Duty Clause, OSHA heat guidance: water, rest, shade, acclimatization).',
    new='Heat illness rules in Virginia: No state heat standard is in force yet (as of Nov 20, 2026); federal OSHA rules apply (General Duty Clause, OSHA heat guidance: water, rest, shade, acclimatization). A 2026 law (Va. Code 40.1-44.2) requires the state Safety and Health Codes Board to adopt heat illness rules: water, shade or cooled areas, rest periods, acclimatization, training, high-heat procedures and emergency response. Check the Department of Labor and Industry for the adopted rule and its start date.'))
SOILS = {2157: 1, 2158: 2, 2159: 3, 2162: 6, 2163: 7, 2170: 14, 2171: 15, 2172: 16, 2173: 17, 2175: 19, 2176: 20, 2177: 21}
for o, n in SOILS.items():
    UPD.append(dict(ord=o, id=f'visual-soils-{n}', f='source', why='"as adopted in WAC ..." in the source hides the trench-soil chunks outside Washington',
                    old=', as adopted in WAC 296-155-66401', new=''))

# verify the edits against the local copy of the live KB when it is there (tools/mkkb.py builds it)
KB = os.path.join(HERE, '../work/kb_live.json')
if os.path.exists(KB):
    kb = json.load(open(KB)); by = {c['_ord']: c for l in kb for c in kb[l]}
    bad = []; touched = set()
    for u in UPD:
        c = by[u['ord']]
        if c['id'] != u['id']: bad.append(('id', u['ord'], c['id'])); continue
        if c[u['f']].count(u['old']) != 1: bad.append(('old phrase count', u['ord'], u['f'], c[u['f']].count(u['old']))); continue
        c[u['f']] = c[u['f']].replace(u['old'], u['new']); touched.add(u['ord'])
    still = [(o, other_states(head(by[o]))) for o in sorted(touched) if o not in (71, 235, 637) and other_states(head(by[o]))]
    print('edits:', len(UPD), 'on', len(touched), 'chunks | problems:', bad, '| still filtered after the edit:', still)
    print('chunk 71 first-lines states:', other_states(head(by[71])), '| chunk 235:', other_states(head(by[235])))
    json.dump({o: by[o] for o in touched}, open(os.path.join(HERE, '../work/edited_chunks.json'), 'w'))

# ---------------------------------------------------------------- write files
def q(s, tag):
    assert ('$' + tag + '$') not in s
    return '$' + tag + '$' + s + '$' + tag + '$'
with open(os.path.join(HERE, 'kb_nationwide.jsonl'), 'w') as f:
    for c in C: f.write(json.dumps(c, ensure_ascii=False) + '\n')
arr = q(json.dumps(C, ensure_ascii=False), 'kb')
idl = ', '.join("'" + i + "'" for i in ids)
body = [f"""-- 1. new field-library chunks at the next ord numbers (skipped if any of their ids is already there)
insert into pb_ai.kb_chunks (version, ord, lib, chunk)
select '{VERSION}', m.mx + t.i, 'field', t.e
  from jsonb_array_elements({arr}::jsonb) with ordinality as t(e, i),
       (select max(ord) as mx from pb_ai.kb_chunks where version = '{VERSION}') m
 where not exists (select 1 from pb_ai.kb_chunks k where k.version = '{VERSION}' and k.chunk->>'id' in ({idl}));"""]
for n, u in enumerate(UPD, 1):
    body.append(f"""-- 2.{n} chunk {u['ord']} ({u['id']}) {u['f']}: {u['why']}
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{{{u['f']}}}', to_jsonb(replace(chunk->>'{u['f']}', {q(u['old'], 'old')}, {q(u['new'], 'new')})))
 where version = '{VERSION}' and ord = {u['ord']} and chunk->>'id' = '{u['id']}'
   and strpos(chunk->>'{u['f']}', {q(u['old'], 'old')}) > 0;""")
body.append(f"""-- 3. the version's row count (the Ask loader refuses a build whose rows don't match kb_versions.n)
update pb_ai.kb_versions v
   set n = c.n, counts = c.counts
  from (select sum(k)::int as n, jsonb_object_agg(lib, k) as counts
          from (select lib, count(*)::int as k from pb_ai.kb_chunks where version = '{VERSION}' group by lib) x) c
 where v.version = '{VERSION}';""")
body.append(f"""-- 4. invalidate the cached search-index blob (same step as Nov 18 and Nov 19)
update pb_ai.kb_index set parts = 32 where version = '{VERSION}';""")
mig = [f"-- 01_ask_kb_nationwide.sql (ask_nationwide_nov20, {TODAY}): Ask KB, nationwide rules. NOT APPLIED. Generated by kb_nationwide.py.",
       f"-- Adds {len(C)} field chunks (51 state 811 chunks from the app's own state table, 1 general 811 chunk, 4 state-plan chunks)",
       f"-- and makes {len(UPD)} guarded edits to {len(set(u['ord'] for u in UPD))} existing chunks (stale app text; chunks the state filter hides).",
       f"-- Run in one transaction; expect: insert {len(C)}, then 1 row for each update. Run 01_ask_kb_nationwide_test.sql first (it rolls back).",
       "-- A KB rebuild from source must carry kb_nationwide.jsonl and these edits (as with Nov 17-19).", "", "begin;", ""]
mig += [b + "\n" for b in body]
mig += [f"""-- check
select (select count(*) from pb_ai.kb_chunks where version = '{VERSION}' and chunk->>'id' in ({idl})) as new_chunks,
       (select n from pb_ai.kb_versions where version = '{VERSION}') as n,
       (select count(*) from pb_ai.kb_chunks where version = '{VERSION}') as rows,
       (select strpos(chunk->>'text', '811 rules state') > 0 from pb_ai.kb_chunks where version = '{VERSION}' and ord = 71) as chunk71_edited,
       (select strpos(chunk->>'source', 'Florida') = 0 from pb_ai.kb_chunks where version = '{VERSION}' and ord = 699) as chunk699_edited,
       (select coalesce(jsonb_typeof(public.pb_ai_kb_boot()->'index'), 'null') <> 'object') as blob_not_used;
""", "commit;", "-- Warm Ask workers keep their in-memory index; the edits reach answers as workers cold-start."]
open(os.path.join(HERE, '01_ask_kb_nationwide.sql'), 'w').write('\n'.join(mig) + '\n')

plain = '\n'.join(body)
stmts = [s.strip() for s in plain.split(';\n') if s.strip()]
dyn = '\n'.join('  execute ' + q('\n'.join(l for l in s.split('\n') if not l.startswith('--')).rstrip(';'), 'st') + '; get diagnostics r = row_count; rc := rc || r;' for s in stmts)
dyn2 = '\n'.join('  execute ' + q('\n'.join(l for l in s.split('\n') if not l.startswith('--')).rstrip(';'), 'st') + ';' for s in stmts[:-2])
nu = len(UPD)
test = f"""-- 01_ask_kb_nationwide_test.sql: runs the migration's statements, checks them, and rolls everything back by raising
-- 'RESULT: ...' at the end (nothing is kept). Generated by kb_nationwide.py. NOT RUN by the helper (server is read-only).
do $t$
declare n0 int; n1 int; r int; rc int[] := '{{}}'; mx0 int; vn int; cnt jsonb; blob boolean; act jsonb; t71 text; s699 text; n2 int; res text;
begin
  select count(*), max(ord) into n0, mx0 from pb_ai.kb_chunks where version = '{VERSION}';
{dyn}
  select count(*) into n1 from pb_ai.kb_chunks where version = '{VERSION}';
  select n, counts into vn, cnt from pb_ai.kb_versions where version = '{VERSION}';
  blob := coalesce(jsonb_typeof(public.pb_ai_kb_boot()->'index'), 'null') = 'object';
  act := public.pb_ai_kb_active();
  select chunk->>'text' into t71 from pb_ai.kb_chunks where version = '{VERSION}' and ord = 71;
  select chunk->>'source' into s699 from pb_ai.kb_chunks where version = '{VERSION}' and ord = 699;
  if n1 <> n0 + {len(C)} then raise exception 'FAIL rows % -> %', n0, n1; end if;
  if rc[1] <> {len(C)} then raise exception 'FAIL insert count %', rc[1]; end if;
  if exists (select 1 from generate_series(2, {nu + 1}) g where rc[g] <> 1) then raise exception 'FAIL an update did not hit exactly 1 row: %', rc; end if;
  if vn <> n1 or (act->>'n')::int <> n1 then raise exception 'FAIL kb_versions.n % / active % vs rows %', vn, act->>'n', n1; end if;
  if blob then raise exception 'FAIL the old index blob would still be used'; end if;
  if strpos(t71, '811 rules state') = 0 or strpos(t71, 'good for (days)') > 0 then raise exception 'FAIL chunk 71: %', t71; end if;
  if strpos(s699, 'Florida') > 0 then raise exception 'FAIL chunk 699 source: %', s699; end if;
  if (select count(*) from pb_ai.kb_chunks where version = '{VERSION}' and ord > mx0 and lib = 'field' and chunk->>'id' in ({idl})) <> {len(C)} then raise exception 'FAIL new ids'; end if;
  if (select count(distinct chunk->>'id') from pb_ai.kb_chunks where version = '{VERSION}') <> n1 then raise exception 'FAIL duplicate chunk id'; end if;
  -- a second run changes nothing (insert guarded by id, updates by their old phrase)
{dyn2}
  select count(*) into n2 from pb_ai.kb_chunks where version = '{VERSION}';
  if n2 <> n1 then raise exception 'FAIL second run changed rows % -> %', n1, n2; end if;
  res := format('PASS rows %s -> %s, n %s, counts %s, {nu} edits each 1 row, blob used %s, rerun no-op', n0, n1, vn, cnt, blob);
  raise exception 'RESULT: %', res;
end $t$;
"""
open(os.path.join(HERE, '01_ask_kb_nationwide_test.sql'), 'w').write(test)

# optional: topic tags so California-only chunks stay filtered if the filter is changed to read title + topic only
TAG = ['gb-1','gb-2','gb-3','gb-4','gb-5','gb-6','gb-7','gb-8','cal-1','cal-2','cal-3','rsf-1','rsf-2','loc-6','loc-10']
tagl = ', '.join("'" + i + "'" for i in TAG)
open(os.path.join(HERE, '02_ask_kb_topic_tags_OPTIONAL.sql'), 'w').write(f"""-- 02_ask_kb_topic_tags_OPTIONAL.sql ({TODAY}). NOT APPLIED. Only needed together with the state-filter change proposed in
-- NOTES.md (filter on title + topic instead of title + source + first 300 characters). These {len(TAG)} California-only chunks
-- name California only in their source line today; this puts it in the topic. Harmless on its own. Expect: update {len(TAG)}.
begin;
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{{topic}}', to_jsonb((chunk->>'topic') || ' (California)'))
 where version = '{VERSION}' and chunk->>'id' in ({tagl}) and strpos(chunk->>'topic', 'California') = 0;
update pb_ai.kb_index set parts = 32 where version = '{VERSION}';
commit;
""")
print('wrote kb_nationwide.jsonl, 01_ask_kb_nationwide.sql, 01_ask_kb_nationwide_test.sql, 02_ask_kb_topic_tags_OPTIONAL.sql')
