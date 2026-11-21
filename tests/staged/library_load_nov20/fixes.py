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
MUSTNOT_FIX = {'lib-us-fed-1': ('no CDL (is )?(needed|required)', '^\\s*no\\b[^.\\n]{0,40}CDL')}   # round 8 (lib7): the old pattern hit "Under 26,001 lb ... no CDL is needed" in a right answer
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
        if c['id'] in MUSTNOT_FIX: c['mustnot'] = [MUSTNOT_FIX[c['id']][1] if m == MUSTNOT_FIX[c['id']][0] else m for m in c.get('mustnot', [])]; n += 1
        # round 9 (lib7e, fourth helper): "doesn't expire" is the right answer (lib-ri-dig-1); the pattern only had "don't expire"
        for k in ('must', 'lead'):
            v = [p.replace("don't expire", "don't expire|doesn.t expire") if "don't expire" in p and "doesn.t expire" not in p else p for p in c.get(k, [])]
            if v != c.get(k, []): c[k] = v; n += 1
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
LIB7_EDIT += [
 ('kb2-102', 'Flaggers stand where approaching drivers can see them well ahead, off the travel lane when possible, with an escape route,',
  'Flaggers stand on the shoulder next to the lane they control, or in the closed lane, and step into the open lane only after traffic has stopped (MUTCD flagger procedures); clearly visible well ahead, with an escape route,',
  'flagger position answered "off the travel lane" (lib-us-mutcd-40, 4 rounds)'),
 ('tc-2', 'standing where approaching drivers can see them in time and with an escape route;', 'standing on the shoulder next to the lane they control or in the closed lane, where approaching drivers can see them in time, with an escape route;',
  'flagger position (lib-us-mutcd-40)'),
 ('trench-crossings-fall-public-4', "Steel plates over open trenches in roadways at the end of the day: Caltrans' Encroachment Permits Manual (section 602.1) gives minimum A-36 plate thickness by trench width for highway loading: 1/2 inch for a 10 inch trench, 3/4 inch to 1 ft 11 in, 7/8 inch to 2 ft 7 in, 1 inch to 3 ft 5 in, 1 3/4 inch to 5 ft 3 in, and an engineered design for anything wider; plates extend at least 12 inches past the trench edges, are pinned or recessed, ramped with asphalt at no more than 8.5 percent, and may be signed Rough Road (W8-8). Cities copy or tighten these in the permit.",
  "Steel plates over open trenches in roadways at the end of the day: OSHA treats them as covers, which in a roadway must hold at least twice the maximum axle load of the largest vehicle expected to cross and be secured against moving (1926.502(i)); the road agency's encroachment permit sets the plate thickness by trench width, how far the plate laps past the edges, pinning and ramping.",
  'a general card carried one state\'s plate table, which answers on other states\' jobs quoted (lib-us-osha-62); the table moves to sp-ca-road-plates-1'),
]
LIB7_NEW.append(dict(id='sp-ca-road-plates-1', state='CA', tier='core', title='California steel road plates over a trench: Caltrans plate thickness by trench width (Encroachment Permits Manual 602.1)',
  topic='Trench crossings, walkways, loads, traffic and public protection', source='Caltrans Encroachment Permits Manual section 602.1 (steel plate bridging), as summarized in the live library chunk trench-crossings-fall-public-4; city encroachment permit conditions',
  url='https://dot.ca.gov/programs/traffic-operations/ep/manual', checked='2026-11-20', edition='as carried in the live library (moved, not re-read)', confidence='medium', kind='summary', license='summary',
  text="On a California job, steel plates over an open trench in a road follow the road owner's encroachment permit. Caltrans' Encroachment Permits Manual (section 602.1) gives minimum A-36 plate thickness by trench width for highway loading: 1/2 inch for a 10 inch trench, 3/4 inch to 1 ft 11 in, 7/8 inch to 2 ft 7 in, 1 inch to 3 ft 5 in, 1 3/4 inch to 5 ft 3 in, and an engineered design for anything wider. Plates extend at least 12 inches past the trench edges, are pinned or recessed, ramped with asphalt at no more than 8.5 percent, and may be signed Rough Road (W8-8). Cities copy or tighten these in their permits. OSHA's cover rule applies too: at least twice the maximum axle load (1926.502(i)(1))."))

# coordinator Nov 20 evening: Appendix D table values, so a continuation can deliver them (fu7-04, fu7-20). Federal tables are images in the eCFR; values read
# from Cal/OSHA's identical text copy (8 CCR 1541.1 Appendix D, dir.ca.gov/Title8/1541_1d.html), twice, consistent; matches OSHA's own Example 1 (Type A, 2 in at 8 ft x 4 ft).
APPD = dict(state='US', tier='core', topic='OSHA excavation appendices in plain words: slopes, benches, shoring tables', url='https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926SubpartPAppD',
            checked='2026-11-20', edition='29 CFR 1926 Subpart P Appendix D (1989, unchanged); values read from the identical 8 CCR 1541.1 Appendix D text', confidence='high', kind='summary', license='gov-us')
LIB7_NEW += [
 dict(APPD, id='osha-pl-appd-vertical-1', title='Aluminum hydraulic shores (vertical shores) Type A and Type B: spacing and cylinder size, Tables D-1.1 and D-1.2',
      source='29 CFR 1926 Subpart P Appendix D, Tables D-1.1, D-1.2 and notes (g)(1)-(g)(7)',
      text='Appendix D vertical shores (no sheeting needed). Vertical spacing is 4 ft in every row. Cylinder size by trench width: up to 8 ft wide, 2 inch; over 8 to 12 ft, 2 inch with full-length steel tube oversleeves (3.5 x 3.5 x 0.1875) or the maker\'s oversleeves; over 12 to 15 ft, 3 inch. Maximum horizontal spacing, Type A (Table D-1.1): over 5 to 10 ft deep, 8 ft; over 10 to 15 ft, 8 ft; over 15 to 20 ft, 7 ft. Type B (Table D-1.2): over 5 to 10 ft, 8 ft; over 10 to 15 ft, 6.5 ft; over 15 to 20 ft, 5.5 ft. Over 20 ft deep: not from the tables; manufacturer\'s data or a registered professional engineer. Rules: 2 inch cylinders at least 18,000 lb and 3 inch at least 30,000 lb safe working capacity at full extension; spacing is center to center; shores in groups of at least three, equally spaced; rails at least 0.40 cubic inch section modulus; plywood (1.125 in softwood or 0.75 in 14-ply birch) only stops ravelling and is not structural. Type C is never on these tables: it needs a waler system with sheeting (Table D-1.4).'),
 dict(APPD, id='osha-pl-appd-waler-b-1', title='Aluminum hydraulic waler system in Type B soil: cylinder spacing by wale size and depth, Table D-1.3',
      source='29 CFR 1926 Subpart P Appendix D, Table D-1.3 and notes',
      text='Appendix D Table D-1.3, waler systems, Type B. Wales at 4 ft vertical spacing. Maximum horizontal cylinder spacing by wale section modulus (3.5 / 7.0 / 14.0 cubic inches): over 5 to 10 ft deep, 8.0 / 9.0 / 12.0 ft; over 10 to 15 ft, 6.0 / 8.0 / 10.0 ft; over 15 to 20 ft, 5.5 / 6.0 / 9.0 ft. Cylinders: with the 3.5 wale, 2 inch up to 8 ft wide, 2 inch with oversleeves over 8 to 12 ft, 3 inch over 12 to 15 ft; with the 14.0 wale, and with the 7.0 wale below 10 ft, 3 inch at every width. Timber uprights (3x12) behind the wales: 3 ft apart for 5 to 10 ft deep, 2 ft apart for 10 to 15 ft, solid sheeting for 15 to 20 ft. Over 20 ft deep: manufacturer\'s data or a registered professional engineer. Ask the shoring supplier which wale sizes they have (the table assumes the wale modulus you pick).'),
 dict(APPD, id='osha-pl-appd-waler-c-1', title='Aluminum hydraulic waler system in Type C soil: cylinder spacing by wale size and depth, solid sheeting, Table D-1.4',
      source='29 CFR 1926 Subpart P Appendix D, Table D-1.4 and notes',
      text='Appendix D Table D-1.4, waler systems, Type C. Type C always gets solid sheeting (3x12 timber) behind the wales; wales at 4 ft vertical spacing. Maximum horizontal cylinder spacing by wale section modulus (3.5 / 7.0 / 14.0 cubic inches): over 5 to 10 ft deep, 6.0 / 6.5 / 10.0 ft; over 10 to 15 ft, 4.0 / 5.5 / 8.0 ft; over 15 to 20 ft, 3.5 / 5.0 / 6.0 ft. Cylinders: with the 3.5 wale, 2 inch up to 8 ft wide, 2 inch with oversleeves over 8 to 12 ft, 3 inch over 12 to 15 ft; with the 14.0 wale, and with the 7.0 wale below 10 ft, 3 inch at every width. Example: an 8 ft deep, 4 ft wide Type C trench with 7.0 wales: cylinders at most 6.5 ft apart, 2 inch, wales every 4 ft, solid sheeting. Over 20 ft deep: manufacturer\'s data or a registered professional engineer.'),
]
# round 10 (lib7g, fourth helper): testing-water-8 still gave the 2005 flushing velocity (2.5 ft/s) as AWWA's; quick-reference-3 already says C651-14 = 3.0 ft/s (lib_more F3). Flows recomputed: Q = v x area x 448.83.
LIB7_EDIT.append(('testing-water-8', "AWWA C651 recommends flushing at a velocity of at least about 2.5 ft per second where possible. Flow needed for 2.5 ft per second (computed from pipe area): 4 inch about 100 gpm; 6 inch about 220 gpm; 8 inch about 390 gpm; 10 inch about 610 gpm; 12 inch about 880 gpm; 16 inch about 1,570 gpm.", "AWWA C651-14 (Sec. 4.4.2) calls for flushing at 3.0 ft per second or more; the 2005 edition said about 2.5 ft per second, and specs written on it still say that. Flow needed for 3.0 ft per second (computed from pipe area): 4 inch about 120 gpm; 6 inch about 265 gpm; 8 inch about 470 gpm; 10 inch about 735 gpm; 12 inch about 1,060 gpm; 16 inch about 1,880 gpm (at 2.5 ft per second, 8 inch is about 390 gpm). Your spec or the water agency governs.", 'flushing velocity: C651-14 3.0 ft/s'))
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
    say(f'fixes.py lib7: {len(LIB7_NEW)} new cards (flagger position, short duration, SWPPP records, CA road plates, Appendix D x3), {len(LIB7_EDIT)} text edits (20 ft engineer x2, road plates x2, flagger position x2), {len(LIB7_TITLE)} title')
