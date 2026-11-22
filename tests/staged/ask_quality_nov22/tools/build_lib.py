# build_lib.py (ask_quality_nov22): live rows (work/live_rows.jsonl = live b3e91f6c47d2, 3,240 rows, md5 a9e67ec6527df46b665cbc03bdb6ca6c)
# + in-place edits + new cards (appended at the end) [+ retirements, renumbered] -> work/after_rows.jsonl, work/kb_after.json,
# cards/changed.jsonl (every new / changed chunk), work/check_batch.jsonl (lib_kb check copy). Sources: NOTES.md "Library changes".
import json, sys, os, re
H = '/home/claude/index.html-/tests/staged/ask_quality_nov22'
D = '2026-11-21'  # the machine's date (server UTC is already Nov 22)
EDITS, NEW, RETIRE = {}, [], []

def sub(cid, pairs=None, **meta):
    pairs = pairs or []
    """exact-once text replacements on card cid (pairs: [(old, new)]), plus field updates"""
    def f(c):
        c = dict(c); t = c['text']
        for a, b in pairs:
            assert t.count(a) == 1, (cid, a[:70], t.count(a)); t = t.replace(a, b)
        c['text'] = t; c.update(meta)
        if c.get('unconfirmed') and not re.search(r'not (been )?(confirmed|checked|read|opened)', t, re.I): c.pop('unconfirmed')
        return c
    assert cid not in EDITS, cid
    EDITS[cid] = f

def new(**c):
    c.setdefault('tier', 'core'); c.setdefault('kind', 'summary'); c.setdefault('checked', D)
    NEW.append(('field', c))

# ---------------------------------------------------------------- safety review items 6-8, 10 and the Monday examples
# 6: Washington carbon monoxide 35 ppm (WAC 296-841-20025 Table 3, read 2026-11-22 on law.cornell.edu; scope 296-841-100 read on regulations.justia.com)
sub('sp-wa-confined-1', [("Air numbers match federal: flammables over 10 percent of the LFL or LEL, oxygen below 19.5 or above 23.5 percent (296-809-099).",
     "Oxygen and flammable limits match federal: flammables over 10 percent of the LFL or LEL, oxygen below 19.5 or above 23.5 percent (296-809-099); carbon monoxide is stricter in Washington, 35 ppm (WAC 296-841-20025).")],
    checked=D, edition='WAC as read 2026-11-19 to 2026-11-22')
new(id='sp-wa-confined-air-1', state='WA', title='Washington air limits for manholes and vaults: CO 35 ppm (stricter than federal 50 ppm), H2S 10 and 15 ppm',
    topic='State safety plan: confined space',
    text=("Washington's exposure limits for airborne contaminants (WAC 296-841-20025, Table 3) apply wherever employees are or could be exposed (WAC 296-841-100), "
          "so they reach trench, manhole and vault work. Carbon monoxide: 35 ppm 8-hour average, a 200 ppm short-term limit averaged over 5 minutes, and a 1,500 ppm ceiling. "
          "The federal construction limit for carbon monoxide is 50 ppm (29 CFR 1926.55), so on a Washington job the stricter 35 ppm applies. "
          "Hydrogen sulfide: 10 ppm 8-hour average and a 15 ppm short-term limit (15 minutes); federal construction is 10 ppm. "
          "Oxygen (19.5 to 23.5 percent) and flammables (10 percent of the LEL) are the same as federal (WAC 296-809-099). A company program may set stricter alarm points. "
          "These numbers do not decide entry: the entry supervisor does, once testing, ventilation, the attendant and rescue are in place."),
    source='WAC 296-841-20025 Table 3, carbon monoxide and hydrogen sulfide rows (amended WSR 18-17-156, eff. 2018-12-12); WAC 296-841-100; WAC 296-809-099; 29 CFR 1926.55 Appendix A',
    url='https://www.law.cornell.edu/regulations/washington/WAC-296-841-20025', edition='WAC 296-841-20025 as amended 2018-12-12', effective='2018-12-12',
    confidence='high', license='gov-state')
sub('osha-pl-cs-states-2', [("Washington (chapter 296-809, all industries)", "Washington (chapter 296-809, all industries; CO 35 ppm)")], checked=D)
# 7: power line contact and gas strike, national cards
new(id='osha-pl-powerline-contact-1', state='US', title='Power line contact emergency: machine touched or hit a line, stay in the cab, keep everyone back, call the power company',
    topic='Power lines: contact with equipment, what to do',
    text=("If the boom, dump bed or load hits, touches or snags an overhead power line or service wire, or the machine rips into a buried electric line, treat the machine "
          "and the ground around it as live. OSHA's power line rule for equipment (29 CFR 1926.1408(g)) lists what crews must be trained on for a contact: the operator stays "
          "inside the cab unless fire, explosion or another emergency forces them out; touching the machine and the ground at the same time can electrocute; leave by the "
          "safest way (the usual method: jump clear with feet together, never touching machine and ground at once, then shuffle or hop away with feet together); the ground "
          "around the machine can be energized (step potential); the rest of the crew stays away from the machine and the load. Lines are presumed energized and uninsulated "
          "unless the utility confirms otherwise (1926.1408(g)(1)(ii)-(iii)). Call 911 and the power company to shut the line off. Do not touch a shocked person until the "
          "power is off; then CPR and an AED if they are not breathing. Report damage to a buried line to its owner and 811 as your state requires."),
    source='29 CFR 1926.1408(g)(1)(i)(A)-(F), (g)(1)(ii)-(iii); the jump-and-shuffle method is common utility training, not rule text',
    url='https://www.ecfr.gov/current/title-29/section-1926.1408', edition='29 CFR 1926.1408, eCFR current 2026', confidence='medium', license='gov-us')
new(id='fed-phmsa-gas-strike-1', state='US', title='Hit a gas line (nicked, ripped, blowing): what to do and who to call first',
    topic='811: damage and gas line strikes',
    text=("Any damage to a pipeline from digging, even a nick, gouge or scraped coating with no leak, must be reported promptly to the pipeline operator (49 CFR 196.107). "
          "If gas or hazardous liquid is escaping, the excavator must promptly call 911 (49 CFR 196.109). Steps crews are taught at a gas strike: get everyone out and well "
          "away, upwind; leave the machine where it is and do not restart engines near the leak; no smoking, flames or anything that sparks; do not try to crimp, plug or bury "
          "the line; keep the public and traffic back; call 911 from a safe distance, then the gas company (the operator: number on the locate ticket, or call 811); let the gas "
          "company shut it in; nobody goes back into the trench until the fire department or gas company says it is clear. Then report the damage to 811 or the operator as "
          "your state's one-call law requires, with the ticket number and photos taken from a safe distance."),
    source='49 CFR 196.107 (damage report to the operator), 49 CFR 196.109 (call 911 on a release); crew steps: common gas operator damage guidance',
    url='https://www.law.cornell.edu/cfr/text/49/196.109', edition='49 CFR Part 196, eCFR current 2026', confidence='high', license='gov-us')
# 8: "went to the ER, do I call OSHA" wording; CA serious injury definition (8 CCR 330(h), dir.ca.gov read 2026-11-22)
sub('sp-ca-report-1', [("Serious injury or illness is defined in 8 CCR 330(h), not in section 342; that definition was not re-read on 2026-11-20, so what counts as serious is not confirmed here.",
     "Serious injury or illness (8 CCR 330(h)) means a hospital admission as an inpatient for more than observation or tests, an amputation, the loss of an eye, or serious "
     "permanent disfigurement; a crash on a public road counts only in a construction zone. Taken to the emergency room (ER) and admitted: call Cal/OSHA within 8 hours; "
     "an ER visit only for observation or tests is not by itself a serious injury.")], checked=D, confidence='high')
sub('osha-pl-report-8-24-1', [("In-patient hospitalization means formal admission for care or treatment; admission only for observation or tests is not reportable.",
     "In-patient hospitalization means formal admission for care or treatment; admission only for observation or tests is not reportable. Sent home from the emergency "
     "room (ER) without being admitted: no OSHA call for that (it may still go on the 300 log).")], checked=D)
# 10: Missouri ticket life (RSMo 319.025 as amended by 2025 SB 133, TAFP text; revisor shows 319.026 effective 2025-08-28 with A.L. 2025 S.B. 133)
sub('dig-mo-overview-1', [("You may work in the area on the notice, while the marks can be seen, until the \"notice of intent to excavate expiration date\" printed on the ticket; the number of days is not in this section and is not confirmed here.",
     "A notice is good until 11:59 p.m. 21 consecutive calendar days from the start date of work on the ticket (RSMo 319.025, amended by 2025 SB 133); work while the marks can be seen until then.")],
    checked=D, source='RSMo 319.025, 319.026 (revisor.mo.gov, effective Aug 28, 2025; 2025 SB 133 truly agreed text)', edition='RSMo as amended effective 2025-08-28')
# West Virginia: WV811 2026 excavator training (gowv.com, read 2026-11-22) quotes the statute: not valid more than 15 business days; tolerance 2 ft
sub('dig-wv-overview-1', [("The section sets no ticket life in days and no tolerance zone in inches; those are not confirmed here, so go by the ticket and West Virginia 811.",
     "West Virginia 811's 2026 training, quoting the statute: a ticket is valid no more than 15 business days (no weekends or holidays) and the tolerance zone is 2 feet from the outside edge of the line (not confirmed in the statute text).")],
    checked=D, source='W. Va. Code 24C-1-5 (code.wvlegislature.gov); West Virginia 811, 2026 excavator training slides (gowv.com)', edition='W. Va. Code 24C as read 2026-11-20; WV811 2026 training')
sub('fed-811-ticketlife-1', [("(use only the job state's line; days are calendar, working or business days as its card says)", "(use only the job state's line; day type as its card says)"),
    ("21: Kentucky, Michigan, North Dakota, South Dakota, Utah.", "21: Kentucky, Michigan, Missouri (from the start date), North Dakota, South Dakota, Utah."),
    ("12 business days: Delaware, Maryland.", "12 business days: Delaware, Maryland. 15 business days: West Virginia."),
    ("Not confirmed: Missouri, Montana, Nebraska, Pennsylvania, West Virginia.", "Not confirmed: Montana, Nebraska, Pennsylvania.")], checked=D)
sub('fed-811-zone-1', [("Utah, Washington, Wyoming;", "Utah, Washington, West Virginia, Wyoming;"),
    ("Missouri, Montana, West Virginia.", "Missouri, Montana.")], checked=D)
# Monday -> Thursday worked examples ("2 full business / working days", or 2 working days not counting the call day)
EX = " (a Monday call means Thursday is the first dig day)"
for cid, anchor in [('dig-wa-overview-1', '"not less than two full business days and not more than 10 full business days" before the work-to-begin date.'),
                    ('dig-fl-overview-1', '"not less than 2 full business days before beginning any excavation"'),
                    ('dig-co-overview-1', '"at least two (2) full business days prior to any excavation," not counting the call day.'),
                    ('dig-or-overview-1', 'then call at least 2 full business days and not more than 10 business days before digging.'),
                    ('dig-ks-overview-1', '"at least two full working days but not more than 20 calendar days before the scheduled excavation start date."'),
                    ('dig-wy-overview-1', '"at least two (2) full business days, but not more than fourteen (14) business days prior to any excavation."'),
                    ('dig-ar-overview-1', '"at least two (2), but not more than ten (10), full working days before commencing" the dig.'),
                    ('dig-nv-overview-1', 'and not more than 28 calendar days before digging.'),
                    ('dig-ny-overview-1', '"at least two but not more than ten working days, not including the date of the call."'),
                    ('dig-oh-overview-1', '"not more than sixteen calendar days before commencing excavation."'),
                    ('dig-il-overview-1', 'A "day" skips Saturdays, Sundays, JULIE holidays and the day of the notice.'),
                    ('dig-nm-overview-1', 'Notice: 2 working days, not counting the day you call;'),
                    ('ca-dig-alert-4216-1', 'not counting the day you call, and not more than 14 calendar days before (4216.2(b));')]:
    if anchor.endswith('.') or anchor.endswith(';'):
        b = anchor[:-1] + EX + anchor[-1]
    else:
        b = anchor + EX
    extra = []
    if cid == 'dig-ky-overview-1': pass
    sub(cid, [(anchor, b)], checked=D)
sub('dig-ky-overview-1', [('"not less than two (2) full working days nor more than ten (10) full working days prior to commencing work."',
                           '"not less than two (2) full working days nor more than ten (10) full working days prior to commencing work"' + EX + '.'),
                          (" One request may not cover more than 5,000 feet unless you and the operator agree.", "")], checked=D)
sub('dig-az-overview-1', [('Operators must mark "as promptly as practicable, but not later than two working days."',
                           'Operators must mark "as promptly as practicable, but not later than two working days"; Arizona 811 calls these two full working days, so a Monday call means Thursday is the first dig day if every operator has answered.')],
    checked=D, source='A.R.S. 40-360.22 (azleg.gov); Arizona 811 how-811-works page (azcc.gov, read 2026-11-22)')

# ---------------------------------------------------------------- stale "not read / not confirmed" lines that other cards already answer
sub('sp-nv-who-1', [("The state's injury reporting rule was not read; it is not confirmed whether it differs from the federal 8 and 24 hours.",
                     "Injury reporting to Nevada OSHA uses the federal times: a death within 8 hours; a hospitalization, amputation or eye loss within 24 hours (Nevada OSHA's report page).")], checked=D)
sub('sp-sc-trench-1', [("The state's reporting times and any heat rule were not read.",
                        "Injury reporting to SC OSHA uses the federal times: 8 hours for a death, 24 hours for a hospitalization, amputation or eye loss (SC OSHA's report page).")], checked=D)
sub('sp-mn-confined-1', [(" Any state heat rule was not read; it is not confirmed here.", "")], checked=D)


# ---------------------------------------------------------------- round 2: injury reporting, national + state cards + table (step 1)
REP_SRC = 'state agency report pages read 2026-11-21: ADOSH (azica.gov), IOSHA (in.gov/dol), NCDOL (labor.nc.gov), TOSHA (tn.gov), VOSHA (labor.vermont.gov), 11.5.1.16 NMAC, Wyoming DWS OSHA page'
def rep_card(st, name, agency, phone, src, url, conf='high', extra='', tagency=None):
    tagency = tagency or agency
    new(id=f'sp-{st.lower()}-report-1', state=st, title=f'{name} injury reporting to {tagency}: 8 hours for a death, 24 hours for hospital, amputation, eye',
        topic='State safety plan: injury reporting',
        text=(f"{name} employers report a work-related death to {agency} within 8 hours, and an in-patient hospitalization, an amputation or the loss of an eye "
              f"within 24 hours. {phone} These are the same times as the federal rule (29 CFR 1904.39), but the report goes to {agency}, the state plan, for a job it covers. "
              f"{extra}Call 911 first for the injured worker; the report is the company's job."),
        source=src, url=url, edition='Agency page read 2026-11-21', confidence=conf, license='gov-state')
rep_card('AZ', 'Arizona', 'ADOSH', 'Call (602) 542-5795 or toll-free (855) 268-5251.', 'ADOSH, How to report a workplace fatality or serious event (azica.gov)', 'https://azica.gov/adosh-how-report-workplace-fatality')
rep_card('IN', 'Indiana', 'IOSHA', 'A death is reported by phone: IOSHA (317) 232-2655 in business hours, after hours the OSHA line 1-800-321-6742 (ask for the duty officer); the others may use the online serious event form.', 'IOSHA, Report an Accident or Fatality (in.gov/dol)', 'https://www.in.gov/dol/iosha/report-an-accident-or-fatality')
rep_card('NC', 'North Carolina', 'the NC Department of Labor OSH Division', 'Call 1-800-625-2267 or (919) 779-8560 (weekdays 8 AM to 5 PM).', 'NCDOL, Report a Workplace Accident (labor.nc.gov)', 'https://www.labor.nc.gov/contact/report-workplace-accident', tagency='NCDOL OSH')
rep_card('TN', 'Tennessee', 'TOSHA', 'Call TOSHA at 1-800-249-8510; after hours, the OSHA line 1-800-321-6742.', 'TOSHA, Fatality, Hospitalization, Amputation, and Loss of an Eye Reporting (tn.gov)', 'https://www.tn.gov/workforce/employees/safety-health/tosha-redirect/fatality--hospitalization-amputation-reporting.html')
rep_card('VT', 'Vermont', 'VOSHA', 'VOSHA takes the report through its online form or by phone at the OSHA line 1-800-321-6742.', 'VOSHA, Mandatory Reporting of Injuries/Illnesses (labor.vermont.gov)', 'https://www.labor.vermont.gov/form/mandatory-reporting-injuries-illnesses-vosha-online-form')
rep_card('NM', 'New Mexico', "the New Mexico Environment Department's Occupational Health and Safety Bureau", 'Call (505) 476-8700.', '11.5.1.16 NMAC (adopts 29 CFR 1904.39, reports go to the Bureau); NMED OHSB contact page', 'https://regulations.justia.com/states/new-mexico/title-11/chapter-5/part-1/section-11-5-1-16', conf='medium',
         extra='The rule adopts the federal reporting rule and sends the report to the Bureau instead of federal OSHA; the copy read may not be the latest text. ', tagency='NMED OHSB')
new(id='osha-pl-report-states-1', state='US', title='Injury reporting by state: hours to report a death, a worker admitted to the hospital, an amputation or eye loss',
    topic='Injury reporting: which states are stricter than federal OSHA',
    text=("A work-related death is reported within 8 hours and a hospital stay, amputation or eye loss within 24 hours, except where a state plan is stricter. Use only the "
          "job state's line. Federal OSHA, 8 and 24 hours, to OSHA at 1-800-321-6742 (29 CFR 1904.39): every state not named below, and private crews in "
          "the six states whose plans cover only public workers. State plans with the same 8 and 24 hours, reported to the state: Arizona, Indiana, Iowa, Kentucky, "
          "Maryland, Michigan, Minnesota, Nevada, New Mexico, North Carolina, South Carolina, Tennessee, Vermont, Virginia, Wyoming (adopts the federal rules as "
          "written; its page lists no times). Same times plus more to report: Hawaii (property damage over $25,000), Oregon (a catastrophe within 8 hours; avulsions with bone loss). "
          "Stricter, 8 hours: Alaska (death, hospital stay, amputation or eye loss), California (any serious injury or illness), Utah (any disabling, serious or "
          "significant injury), Washington (death or any hospital stay; amputation or eye loss without one, 24 hours). Public-worker-only plans: Connecticut, Illinois, "
          "Maine, Massachusetts, New Jersey, New York."),
    source='29 CFR 1904.39; each sp-<state>-report card (state rules and agency pages read 2026-11-20 and 2026-11-21); osha.gov/stateplans',
    url='https://www.osha.gov/stateplans', edition='As checked 2026-11-20 to 2026-11-21', confidence='medium', license='gov-us')
# the who cards that said "reporting times not read" now point to the new cards' facts
sub('sp-tn-who-1', [("The state's injury reporting times and any heat rule were not read; they are not confirmed here.",
                     "Injury reporting to TOSHA uses the federal times: 8 hours for a death, 24 hours for a hospitalization, amputation or eye loss (TOSHA's reporting page).")], checked=D)
sub('sp-nc-who-1', [("Who must have a safety committee, the state's reporting times and any heat rule were not read; they are not confirmed here.",
                     "Injury reporting to the OSH Division uses the federal times: 8 hours for a death, 24 hours for a hospitalization, amputation or eye loss (NCDOL's reporting page). Who must have a safety committee is not confirmed here.")], checked=D)
# ---------------------------------------------------------------- round 2: California heat, one card per sub-topic (retire 3 duplicates)
sub('sp-ca-heat-2', title='California at 95 degrees: high-heat procedures (buddy system, pre-shift meeting), heat waves and new workers', pairs=[("and an employee newly assigned to a high heat area is closely observed for the first 14 days.",
                      "and an employee newly assigned to a high heat area is closely observed for the first 14 days. The extra 10-minute cool-down every 2 hours at 95 F is for agriculture only, not construction (3395(e)(6)).")], checked=D)
sub('sp-ca-heat-1', title='California heat rule: water per person (1 quart an hour), shade over 80 degrees, cool-down rest', checked=D)
RETIRE += ['cal-2', 'emp-ca-safety-1', 'emp-ca-safety-2']

def build():
    live = [json.loads(l) for l in open(f'{H}/work/live_rows.jsonl')]
    assert len(live) == 3240 and [r['o'] for r in live] == list(range(3240))
    out, seen = [], set()
    for r in live:
        cid = r['c']['id']
        if cid in RETIRE: seen.add(cid); continue
        f = EDITS.get(cid)
        c = f(r['c']) if f else r['c']
        if f: seen.add(cid)
        out.append({'o': len(out), 'lib': r['lib'], 'c': c})
    assert seen == set(EDITS) | set(RETIRE), set(EDITS) | set(RETIRE) - seen
    ids = {r['c']['id'] for r in out}
    for lib, c in NEW:
        assert c['id'] not in ids, c['id']; out.append({'o': len(out), 'lib': lib, 'c': c})
    for r in out:
        if r['c'].get('tier') == 'core' and (r['c']['id'] in EDITS or r['o'] >= 3240 - len(RETIRE)): assert len(r['c']['text']) <= 1200, (r['c']['id'], len(r['c']['text']))
    return live, out

if __name__ == '__main__':
    live, out = build()
    with open(f'{H}/work/after_rows.jsonl', 'w') as f:
        for r in out: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    changed = [r['c'] for r in out if r['c']['id'] in EDITS or r['c']['id'] in {c['id'] for _, c in NEW}]
    os.makedirs(f'{H}/cards', exist_ok=True)
    with open(f'{H}/cards/changed.jsonl', 'w') as f:
        for c in changed: f.write(json.dumps(c, ensure_ascii=False) + '\n')
    with open(f'{H}/work/check_batch.jsonl', 'w') as f:
        for c in changed:
            if c.get('state'): f.write(json.dumps({**c, **({'supersedes': c['id']} if c['id'] in EDITS else {})}, ensure_ascii=False) + '\n')
    kb = {'app': [], 'field': [], 'osha': []}
    for r in out: kb[r['lib']].append(r['c'])
    json.dump(kb, open(f'{H}/work/kb_after.json', 'w'))
    ch = lambda rows: sum(len(r['c']['text']) for r in rows)
    print(f"before {len(live)} rows {ch(live)} chars; after {len(out)} rows {ch(out)} chars; edited {len(EDITS)}, new {len(NEW)}, retired {len(RETIRE)}")
