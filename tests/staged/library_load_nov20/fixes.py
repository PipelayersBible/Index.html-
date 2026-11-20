# fixes.py: retrieval-level fixes found by the free check and by eval rounds. Titles in the words a crew types; no fact is changed.
# Called by merge.py: apply(NEW, EDITS, BASE, say) before validation, fix_cases(cases, ALL, say) after the case merge.
import re
TITLES = {
 # free check, Nov 20 (round 0)
 'osha-pl-report-8-24-1': 'Reporting a death, a worker admitted to the hospital, an amputation or eye loss to federal OSHA: 8 and 24 hours',
 'sp-nv-osha10-1': 'Nevada OSHA 10 and OSHA 30 cards: how long a new construction worker has to get one (15 days)',
 'sp-wa-report-1': 'Washington injury reporting: a worker admitted to the hospital, report within 8 hours',
 'sp-ca-report-1': 'California injury reporting: serious injury or worker in the hospital, immediately and no later than 8 hours',
 'spec-wa-dot-trench-1': 'Washington WSDOT pipe trench, bedding, backfill, and cover before equipment runs over new pipe (Section 7-08)',
 'spec-tx-dot-pipe-1': 'Texas TxDOT concrete pipe, metal pipe, box culverts; fill before equipment crosses new pipe (Items 460, 462, 464)',
 'mfr-dipra-thrust-1': 'Thrust blocks at bends and dead ends: forces, soil bearing values, how strong the concrete (DIPRA guide)',
 'sp-or-trench-1': 'Oregon OSHA trench and excavation rule: federal Subpart P plus the state utility-locate rules',
}
def apply(NEW, EDITS, BASE, say):
    n = 0
    for i, c in NEW.items():
        # every state's 811 overview: the old one-line card answered "how long is my ticket good" because it used those words
        m = re.match(r'^dig-([a-z]{2})-overview-1$', i)
        if m and 'not confirmed' not in c['title']:
            name = c['title'].split(' 811:')[0]; center = re.search(r'\(([^()]*)\)$', c['title'])
            t = f'{name} 811 rules in short: wait before you dig, how long a ticket is good, hand-dig zone'
            if center and len(t) + len(center.group(1)) + 3 <= 120: t += f' ({center.group(1)})'
            c['title'] = t; n += 1
        # "what's the fine for digging without calling 811"
        if re.match(r'^dig-[a-z]{2}-(damage|penalties)-1$', i) and re.search(r'\bfines\b', c['title']):
            t = c['title'].replace('fines and who enforces', 'the fine for digging without calling 811, and who enforces') if 'fines and who' in c['title'] else re.sub(r'\bfines\b', 'the fine for not calling 811', c['title'], count=1)
            if len(t) <= 120: c['title'] = t; n += 1
    for i, t in TITLES.items():
        assert i in NEW and len(t) <= 120, (i, len(t)); NEW[i]['title'] = t; n += 1
    say(f'fixes.py: {n} titles reworded in crew language (no text or number changed)')
CASE_FIX = {}     # case id -> dict of fields to replace (a case that was wrong, not the answer); filled in as rounds find them
CASE_DROP = {}    # case id -> why
def fix_cases(cases, ALL, say):
    for c in cases:
        if c['id'] in CASE_FIX: c.update(CASE_FIX[c['id']])
    k = [c for c in cases if c['id'] in CASE_DROP]
    for c in k: cases.remove(c)
    if CASE_FIX or CASE_DROP: say(f'fixes.py: {len(CASE_FIX)} cases corrected, {len(k)} dropped')
