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
 # round 2: the right card was not in the first search
 'osha-pl-fall-holes-covers-1': 'Covers over holes in a road or walkway: how strong (twice the axle load), plates, manhole openings, marked covers',
 'osha-pl-cs-monitor-1': 'Working in a live sewer that could flood: OSHA early-warning system, air testing order, continuous monitoring',
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
    apply_lib7(NEW, EDITS, BASE, say)
CASE_FIX = {
 'lib-us-osha-55': {'must': None},   # round 1: 'suspend' did not match "suspension" (see fix_cases)
}     # case id -> dict of fields to replace (a case that was wrong, not the answer); filled in as rounds find them
CASE_DROP = {}    # case id -> why
# round 2 (case, not answer): "wasn't confirmed", "isn't confirmed", "confirm with <agency>" are the right answer; two musts asked for a side fact
UNCONF = "(?:not |n't |un)confirmed|confirm with|to confirm|confirm "
DROP_MUST = {'lib-ky-sp-4': '600 volts', 'lib-us-osha-57': 'record'}
# round 3 (case): "head-injury" with a hyphen; "given a role ... before they take on that role" is "assigned"
SWAP = {'lib-us-em-3': ('concussion|head injury', 'concussion|head[- ]injur'), 'lib-us-osha-57': ('assign', 'assign|given|take on|takes on')}
def fix_cases(cases, ALL, say):
    n = 0
    for c in cases:
        if c['id'] == 'lib-us-osha-55': c['must'] = [m.replace('suspend', 'suspen[ds]') for m in c['must']]; n += 1
        for k in ('must', 'lead'):
            v = [p.replace('not confirmed', UNCONF) if 'not confirmed' in p and UNCONF not in p else p for p in c.get(k, [])]
            if v != c.get(k, []): c[k] = v; n += 1
        if c['id'] in SWAP: c['must'] = [SWAP[c['id']][1] if m == SWAP[c['id']][0] else m for m in c['must']]; c['lead'] = [SWAP[c['id']][1] if m == SWAP[c['id']][0] else m for m in c['lead']]; n += 1
        # round 6 (lib5 helper): "24-inch" with a hyphen is the right answer
        if any('24 ?(in|")' in m for m in c['must']): c['must'] = [m.replace('24 ?(in|")', '24[- ]?(in|")') for m in c['must']]; n += 1
        if c['id'] in DROP_MUST: c['must'] = [m for m in c['must'] if m != DROP_MUST[c['id']]]; n += 1
    say(f'fixes.py: {n} case patterns corrected (regex too narrow or a side fact asked as a must); none dropped')

# ---- lib7 (Tommy, Nov 20 14:47): recurring wrong facts and the 20 ft engineer rule. New cards are short answer cards; edits keep every number.
MUTCD = dict(state='US', tier='core', url='https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part6.pdf', checked='2026-11-20', edition='11th Edition, December 2023 (Revision 1, December 2025)',
             effective='2024-01-18', confidence='high', kind='summary', license='gov-us')
LIB7_NEW = [
 dict(MUTCD, id='mutcd-6d-flagger-where-1', title='Where the flagger stands: on the shoulder next to the lane, or in the closed lane (never in the open lane)',
      topic='Traffic control: flaggers', source='MUTCD 11th Edition (FHWA, Dec 2023; Rev. 1 Dec 2025), Part 6, Sections 6D.05 (flagger procedures) and 6D.06 (flagger stations)',
      text='Where a flagger stands (MUTCD Part 6, flagger procedures, Guidance): on the shoulder next to the lane of traffic being controlled, or in the closed lane, before stopping traffic. A flagger should only stand in the lane that moving traffic uses after the vehicles have stopped. The flagger should stand alone, be clearly visible to approaching traffic the whole time, and not stand among other workers or equipment. The flagger station itself goes far enough ahead of the work that approaching drivers can stop at the stopping point (Section 6D.06, Standard), with advance warning signs ahead of it and lighting at night except in an emergency; the flagger picks an escape route before starting. Your state manual and the approved traffic control plan or permit govern on the job.'),
 dict(MUTCD, id='mutcd-6n-short-def-1', title='Short duration work in traffic control: up to 1 hour (MUTCD); not OSHA\'s 24-hour short-term soil term',
      topic='Traffic control: short jobs and mobile work', source='MUTCD 11th Edition (FHWA, Dec 2023; Rev. 1 Dec 2025), Part 6, Section 6N.01; 29 CFR 1926 Subpart P Appendix B (b) definition of short term exposure',
      text='"Short duration" is the traffic control manual\'s term: work that occupies one location for up to 1 hour (MUTCD Section 6N.01). The other work durations: short-term stationary is daytime work at one location for more than 1 hour within a single daylight period; intermediate-term stationary is more than one daylight period up to 3 days, or night work over 1 hour; long-term stationary is more than 3 days; mobile work moves along. For short-duration work the manual allows simplified traffic control built around a vehicle with high-intensity warning lights. Do not mix this up with OSHA\'s "short term exposure" in the trench sloping appendix, which means an excavation open 24 hours or less and only matters for the Type A short-term slope. Your state manual and the approved traffic control plan or permit govern on the job.'),
 dict(id='fed-epa-cgp-records-1', state='US', tier='core', title='How long to keep SWPPP inspection reports and the corrective action log: 3 years after coverage ends',
      topic='Stormwater on the job: construction general permit, SWPPP, inspections, dewatering',
      source='EPA 2022 Construction General Permit, as modified April 2025, Parts 4.7.3, 4.7.4, 5.4.3, 5.4.4, 7.3',
      url='https://www.epa.gov/system/files/documents/2025-04/2022-cgp-permit-as-modified.pdf', checked='2026-11-20',
      edition='2022 CGP as modified (effective April 8, 2025); expires February 16, 2027', confidence='high', kind='summary', license='gov-us',
      text='Under EPA\'s 2022 Construction General Permit, keep a copy of every SWPPP inspection report at the site or at an easily accessible location (Part 4.7.3), and retain all inspection reports "for at least three (3) years from the date that your permit coverage expires or is terminated" (Part 4.7.4). The corrective action log follows the same rule: a copy at the site or easily accessible (Part 5.4.3), kept at least three years after coverage expires or is terminated (Part 5.4.4). Keep a current copy of the SWPPP itself at the site or an easily accessible location (Part 7.3), with the dates of every change to it (Part 7.4.2). These are EPA\'s own permit numbers. Most states issue their own construction stormwater permit; where the state permit asks for longer, the longer period applies.'),
]
LIB7_EDIT = [  # (id, old, new, why) on live chunks (in-place edit rows)
 ('osha-appendix-b-c-d-in-words-1', 'Footnote 3: sloping or benching for excavations deeper than 20 ft must be designed by a registered professional engineer.',
  'Footnote 3: sloping or benching deeper than 20 ft must be designed by a registered professional engineer; since the table covers only less than 20 ft, exactly 20 ft and deeper is engineer-designed (the app\'s Trench Sloping screen says the same).',
  'Tommy Nov 20: 20 ft or greater needs an engineer (eval tr14)'),
 ('osha-appendix-b-c-d-in-words-2', 'All benched excavations must be 20 ft or less deep.', 'Benching from this figure is for excavations less than 20 ft deep; at 20 ft or deeper a registered professional engineer designs it.',
  'Tommy Nov 20: 20 ft or greater needs an engineer'),
 ('osha-pl-fall-holes-covers-1', '(1) covers in roadways and vehicular aisles support at least twice the maximum axle load of the largest vehicle expected to cross;',
  '(1) covers in roadways and vehicular aisles, steel road plates over a trench included, support at least twice the maximum axle load of the largest vehicle expected to cross;',
  'road plate strength answered with another state\'s plate table (lib-us-osha-62, 4 rounds)'),
]
LIB7_TITLE = {'osha-pl-fall-holes-covers-1': 'Covers and steel road plates over a hole or trench in the road: how strong (twice the axle load), secured, marked'}
def apply_lib7(NEW, EDITS, BASE, say):
    for c in LIB7_NEW:
        assert c['id'] not in NEW and c['id'] not in BASE; NEW[c['id']] = dict(c, _from='library_load_nov20/lib7')
    for cid, old, new, why in LIB7_EDIT:
        if cid in NEW: c = NEW[cid]
        else: c = EDITS.get(cid) or {k: v for k, v in BASE[cid].items() if not k.startswith('_')}; EDITS[cid] = c
        assert c['text'].count(old) == 1, (cid, old); c['text'] = c['text'].replace(old, new)
    for cid, t in LIB7_TITLE.items():
        (NEW[cid] if cid in NEW else EDITS[cid])['title'] = t
    say(f'fixes.py lib7: {len(LIB7_NEW)} new cards (flagger position, short duration, SWPPP records), {len(LIB7_EDIT)} text edits (20 ft engineer x2, road plates), {len(LIB7_TITLE)} title')
