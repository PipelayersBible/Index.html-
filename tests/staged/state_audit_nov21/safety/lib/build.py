# state_audit_nov21/safety library cards: state safety facts read Nov 20 2026 that lib_osha_nov20 did not have.
# python3 build.py  -> lib_safety_states.jsonl (+ report + staged SQL, NOT applied) and cases.jsonl
import sys, json, os
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
from lib_kb import Batch, check_case
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
D = '2026-11-20'
C = []
def add(**k): k.setdefault('checked', D); C.append(k)
REP = 'State safety plan: injury reporting'
add(id='sp-md-report-1', state='MD', tier='core', title='Maryland injury reporting to MOSH: deaths in 8 hours, hospital stays in 24 hours',
    topic=REP, text='Maryland employers report a work-related death to MOSH (Maryland Occupational Safety and Health) within 8 hours, and an in-patient hospital stay, an amputation or the loss of an eye within 24 hours. COMAR 09.12.21 adopts the federal recordkeeping and reporting rule, 29 CFR Part 1904, by reference, with MOSH in place of OSHA. MOSH Central Office toll-free number: 1-800-759-6297. Maryland\'s text words the amputation item as an amputation involving bone or cartilage loss; when in doubt, call. The 8 and 24 hour times are the federal 1904.39 times that COMAR 09.12.21 adopts. Call 911 first for the injured worker; the report is the company\'s job.',
    source='COMAR 09.12.21, Employee Injury and Illness Records and Reports (adopts 29 CFR 1904; amends 1904.39(a)(2))', url='https://labor.maryland.gov/labor/mosh/pdf/091221_employeeinjury-illnessrecords.pdf',
    edition='COMAR 09.12.21 as posted by MOSH, read 2026-11-20', confidence='high', kind='summary', license='gov-state')
add(id='sp-mn-report-1', state='MN', tier='core', title='Minnesota injury reporting to MNOSHA: 8 hours for a death, 24 hours for hospital, amputation, eye',
    topic=REP, text='Minnesota employers report every work-related death to MNOSHA within 8 hours, and every work-related in-patient hospitalization, amputation and loss of an eye within 24 hours. Call MNOSHA Compliance at 651-284-5050 or 877-470-6742 from 8 a.m. to 4:30 p.m. Monday to Friday; outside those hours, on weekends and holidays, call federal OSHA at 800-321-6742. Minnesota adopted federal OSHA\'s revised reporting rule effective October 1, 2015. Call 911 first for the injured worker; the report is the company\'s job.',
    source='Minnesota Department of Labor and Industry, MNOSHA Compliance: Report an accident, fatality or serious injury', url='https://www.dli.mn.gov/node/1281',
    edition='DLI web page, read 2026-11-20', confidence='medium', kind='summary', license='gov-state')
add(id='sp-nv-report-1', state='NV', tier='core', title='Nevada injury reporting to Nevada OSHA: 8 hours for a death, 24 hours for hospital, amputation, eye',
    topic=REP, text='Nevada employers report to Nevada OSHA (NVOSHA) every workplace accident with an employee death within 8 hours of learning of it, and every in-patient hospitalization of one or more employees, amputation, or loss of an eye within 24 hours. Phone: Southern Nevada (702) 486-9020, Northern Nevada (775) 688-3700. These are the same times as the federal rule (29 CFR 1904.39). Call 911 first for the injured worker; the report is the company\'s job.',
    source='Nevada Division of Industrial Relations, Nevada OSHA: Report an Accident or Fatality', url='https://dir.nv.gov/OSHA/Report_an_Accident_or_Fatality',
    edition='DIR web page, read 2026-11-20', confidence='medium', kind='summary', license='gov-state')
add(id='sp-sc-report-1', state='SC', tier='core', title='South Carolina injury reporting to SC OSHA: 8 hours for a death, 24 hours for hospital, amputation, eye',
    topic=REP, text='South Carolina employers report a work-related fatality to SC OSHA within 8 hours, and an in-patient hospitalization, an amputation or an eye loss within 24 hours. Call the SC OSHA office at (803) 896-7672, or report online through the SC OSHA eService portal. These are the same times as the federal rule (29 CFR 1904.39). Call 911 first for the injured worker; the report is the company\'s job.',
    source='SC Department of Labor, Licensing and Regulation, SC OSHA: Report a Severe Injury', url='https://osha.llr.sc.gov/reportinjury.aspx',
    edition='SC OSHA web page, read 2026-11-20', confidence='medium', kind='summary', license='gov-state')
add(id='sp-ia-report-1', state='IA', tier='core', title='Iowa injury reporting to Iowa OSHA: federal times, phone 877-242-6742',
    topic=REP, text='Iowa employers report a work-related death within 8 hours and an in-patient hospitalization, amputation or loss of an eye within 24 hours: 875 IAC chapter 4 adopts the federal rule, 29 CFR 1904.0 to 1904.46, by reference. Rule 875-4.3(2) adds ways to report on top of the federal ones: call Iowa OSHA at 877-242-6742, fax or email the completed incident report form, or go to 6200 Park Avenue, Suite 100, Des Moines. Call 911 first for the injured worker; the report is the company\'s job.',
    source='Iowa Administrative Code 875 chapter 4 (adopts 29 CFR 1904; rule 4.3(2) reporting methods)', url='https://www.legis.iowa.gov/docs/iac/chapter/04-30-2025.875.4.pdf',
    edition='875 IAC ch. 4 as of 2025-04-30', confidence='high', kind='summary', license='gov-state')
add(id='sp-ca-permit-341-1', state='CA', tier='core', title='California Cal/OSHA trench permit: 5 feet or deeper, annual or project permit, who is exempt',
    topic='State safety plan: trench and excavation', text='California requires a Cal/OSHA permit before building a trench or excavation 5 feet or deeper into which any person is required to descend (8 CCR 341(d)(5)(A)); descend means entering any part of it once it reaches 5 feet. The Project Administrator gets a Project Permit for the project (341(c)(1)); other employers doing the permit work hold an Annual Permit, good for any jobsite that year (341(c)(2)). An Annual Permit holder must notify the Division each time it starts permit-required work at a new site (341(c)(2)(B)). Exempt (341(e)): federal, state, county, city and district government agencies; public utilities under the Public Utilities Commission; trenches for emergency repair of underground facilities; excavations nobody has to enter; graves; swimming pools. Cal/OSHA says annual permit holders must hold a valid contractor\'s license.',
    source='8 CCR 341 (c)(1), (c)(2), (c)(2)(B), (d)(5)(A), (e); Cal/OSHA enforcement FAQ on construction activity permits', url='https://dir.ca.gov/Title8/341.html',
    edition='Title 8 section 341 as posted, read 2026-11-20', confidence='high', kind='summary', license='gov-state',
    note='More detail than staged lib_osha_nov20 sp-ca-trench-1 (which says 341 was not re-read). Keep both or edit sp-ca-trench-1.')
add(id='sp-ca-meetings-1', state='CA', tier='core', title='California toolbox or tailgate safety meetings: at least every 10 working days',
    topic='State safety plan: written programs and training', text='California construction employers must have supervisors hold toolbox or tailgate safety meetings, or equivalent meetings, with their crews at least every 10 working days to emphasize safety (8 CCR 1509(e)). The same section requires an Injury and Illness Prevention Program under 8 CCR 3203 (1509(a)) and a written Code of Safe Practices for the employer\'s operations (1509(b)), posted at a conspicuous place at each job site office or given to each supervisor, who keeps it readily available (1509(c)).',
    source='8 CCR 1509 (a), (b), (c), (e), Construction Safety Orders', url='https://dir.ca.gov/title8/1509.html',
    edition='Title 8 section 1509 as posted, read 2026-11-20', confidence='high', kind='summary', license='gov-state')
add(id='sp-wa-meetings-1', state='WA', tier='core', title='Washington crew safety meetings: start of each job and at least weekly, minutes kept 1 year',
    topic='State safety plan: written programs and training', text='Washington construction employers must hold crew leader-crew safety meetings at the beginning of each job and at least weekly after that (WAC 296-155-110(5)(a)), tailored to the operation. Each meeting covers walk-around inspections, citations and accident investigations since the last meeting (6), and the employer documents attendance (6)(d) and the subjects discussed (6)(e). Minutes of each meeting are prepared and a copy is kept where most of the site\'s employees report each day (7), and the minutes are kept at least one year (8). Every 2 weeks is not enough in Washington.',
    source='WAC 296-155-110 (5)(a), (6), (7), (8), Accident prevention program', url='https://lawfilesext.leg.wa.gov/law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-110.htm',
    edition='WAC 296-155-110 as posted by the Legislature, read 2026-11-20', confidence='high', kind='summary', license='gov-state')
add(id='sp-wa-firstaid-1', state='WA', tier='core', title='Washington first aid card: every crew leader and supervisor needs one',
    topic='State safety plan: first aid training and emergency numbers', text='Washington requires a person or persons holding a valid first-aid certificate at worksites with a crew (WAC 296-155-120(1)), and crew leaders, supervisors and persons in direct charge of one or more employees must have a valid first-aid certificate (296-155-120(2)). A crew is two or more employees at any worksite (3). A note allows a crew leader to work up to 30 days in an emergency without the certificate if another trained employee or crew leader is in the immediate work area. For a pipe crew this means the foreman carries a current first-aid card.',
    source='WAC 296-155-120 (1), (2), (3), First-aid requirements', url='https://lawfilesext.leg.wa.gov/Law/WACArchive/2024/htm/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-120.htm',
    edition='WAC 296-155-120, 2024 archive copy read 2026-11-20', confidence='high', kind='summary', license='gov-state')
add(id='sp-ca-firstaid-1', state='CA', tier='core', title='California first aid on construction jobs: trained people, a kit, and emergency numbers posted',
    topic='State safety plan: first aid training and emergency numbers', text='California construction employers must make sure a suitable number of appropriately trained persons are available to give first aid (8 CCR 1512(b)); employers on a shared site may pool them. At least one first-aid kit in a weatherproof container is provided, inspected regularly and restocked (1512(c)(1)); no drugs or medicines unless a physician approves in writing (1512(c)(3)). The phone numbers of a physician and an alternate, hospitals, ambulance services and fire protection services in the area are posted near the job telephone, or otherwise made available where there is no job phone (1512(e)). Section 1512 sets no ratio of first aiders per crew.',
    source='8 CCR 1512 (b), (c)(1), (c)(3), (e), Emergency Medical Services', url='https://dir.ca.gov/Title8/1512.html',
    edition='Title 8 section 1512 as posted (last amended 2012), read 2026-11-20', confidence='high', kind='summary', license='gov-state')
add(id='sp-ca-confined-2026-1', state='CA', tier='core', title='California confined space changes from January 1, 2026: site survey and rescue standby',
    topic='State safety plan: confined space', text='California amended its construction confined space rules (8 CCR 1951, 1952, 1953, 1955, 1956, 1960) effective January 1, 2026. Per the Standards Board\'s Final Statement of Reasons: a competent person surveys the work area for confined spaces that exist when work begins (1952(a)(1)) and inspects often enough to find new ones (1952(a)(2)); evaluation of a space now includes testing to tell a confined space from a permit space (1952(a)(4)); where less than 10 percent LFL cannot be reached the space is inerted and PPE provided (1953); and standby personnel trained, equipped and available to rescue an entrant are required (1960(a)). The Final Statement of Reasons describes no change to the permit items in 1955. Read the amended rule text before relying on wording.',
    source='OSHSB rulemaking Confined Spaces in Construction, Final Statement of Reasons updated 2025-09-18; effective 2026-01-01', url='https://dir.ca.gov/OSHSB/Confined-Spaces-in-Construction.html',
    effective='2026-01-01', confidence='medium', kind='summary', license='gov-state')
add(id='sp-mi-confined-2', state='MI', tier='core', title='Michigan confined space in construction: MIOSHA Part 35 adopts the federal rule',
    topic='State safety plan: confined space', text='Michigan\'s Construction Safety Standard Part 35, Confined Space in Construction, adopts 29 CFR 1926.1202 (definitions) through 1926.1212 (employee participation) by reference, except as amended in the rules (R 408.43510, via the scope rule R 408.43501(4)). That includes the federal permit items in 1926.1206, so a federal-style entry permit covers Michigan. Part 35 does not apply to work covered by Part 9 (excavation, trenching and shoring), Part 14 (tunnels, shafts, caissons, cofferdams), Part 504 (diving) or Part 665 (underground construction and compressed air); where another standard also covers a confined space hazard, both apply (R 408.43501(2), (3)). Part 35 has three rules: scope, provision of documents, and adopted standards.',
    source='Mich. Admin. Code R 408.43501, R 408.43505, R 408.43510 (MIOSHA Part 35)', url='https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-408-43501',
    edition='Part 35 as posted by Cornell LII, read 2026-11-20', confidence='medium', kind='summary', license='gov-state',
    note='Replaces staged lib_osha_nov20 sp-mi-confined-1 (shelf, low, not opened). Amendments, if any, not read: confidence medium.')
add(id='sp-in-trench-1', state='IN', tier='core', title='Indiana trench protection: IOSHA adopts the federal excavation rule, 5 feet',
    topic='State safety plan: trench and excavation', text='Indiana adopts the federal excavation rule, 29 CFR 1926.650 through 1926.652 with Appendices A to F, by reference (620 IAC 1-1-30, items 7 and 18; effective in Indiana March 5, 1990). So a trench 5 feet or deeper needs a protective system (sloping, benching, shoring or a shield) unless it is entirely in stable rock, and a competent person inspects daily (29 CFR 1926.652(a)(1), 1926.651(k)). The adopting rule shows no Indiana depth, permit or other excavation requirement of its own. OSHA\'s Indiana state plan page lists a unique excavation standard; it was not identified, so ask IOSHA if a job depends on it (not confirmed).',
    source='620 IAC 1-1-30 (adoption by reference from 54 FR, 29 CFR 1926 Subpart P)', url='https://www.law.cornell.edu/regulations/indiana/620-IAC-1-1-30',
    edition='620 IAC 1-1-30 as posted, read 2026-11-20', confidence='medium', unconfirmed='yes', kind='summary', license='gov-state',
    note='Replaces staged lib_osha_nov20 sp-in-who-1 trench part.')
add(id='sp-md-trench-1', state='MD', tier='core', title='Maryland trench rule: federal 5 feet, plus protective system records kept at the jobsite',
    topic='State safety plan: trench and excavation', text='Maryland (MOSH) uses the federal excavation rule: a protective system from 5 feet unless the trench is entirely in stable rock (29 CFR 1926.652). Maryland amends 1926.652 on records: the tabulated data used for a protective system, a slope design, the manufacturer\'s data and any approval to deviate from it, and an engineer\'s design are kept at the jobsite while the system is being built and after that until it is no longer used; then they may be kept off site but available to the Commissioner of Labor and Industry on request (Maryland amendments to 1926.652(b)(4)(iii), (c)(2)(iii), (c)(4)(iii)). MOSH lists no Maryland supplement to the confined space in construction rule.',
    source='MOSH, Maryland amendments to 29 CFR 1926.652; MOSH-specific standards list', url='https://labor.maryland.gov/labor/mosh/reqprotect.shtml',
    edition='MOSH web pages, read 2026-11-20', confidence='medium', kind='summary', license='gov-state')
add(id='fed-phmsa-damage-911-1', state='US', tier='core', title='Gas or hazardous liquid escaping after you hit a pipeline: the excavator calls 911',
    topic='Utility strike response', text='Federal pipeline safety rules say that if damage to a pipeline from excavation activity causes the release of any PHMSA regulated natural and other gas or hazardous liquid, "the excavator must promptly report the release to appropriate emergency response authorities by calling the 911 emergency telephone number" (49 CFR 196.109). Get people out and upwind first, keep ignition sources away, then call 911 and the pipeline operator. State one-call laws also require telling the operator about any damage, even a nick; check your state\'s damage notice rule.',
    source='49 CFR 196.109 (Protection of Underground Pipelines From Excavation Activity)', url='https://www.law.cornell.edu/cfr/text/49/196.109',
    edition='49 CFR Part 196 as posted, read 2026-11-20', confidence='high', kind='summary', license='gov-us')
B = Batch('lib_safety_states', collection='sp')
for c in C:
    if c['id'].startswith('sp-'): B.add(**c)
F = Batch('lib_safety_fed', collection='fed')
for c in C:
    if c['id'].startswith('fed-'): F.add(**c)
live = json.load(open('/home/claude/index.html-/tests/staged/ask_state_nov20/work/kb_live2.json'))
existing = {c['id'] for l in live.values() for c in l}
staged = set()
for f in ('/home/claude/index.html-/tests/staged/lib_osha_nov20/lib_osha_sp.jsonl', '/home/claude/index.html-/tests/staged/lib_osha_nov20/lib_osha_fed.jsonl'):
    staged |= {json.loads(l)['id'] for l in open(f) if l.strip()}
B.write(existing_ids=existing | staged)
F.write(existing_ids=existing | staged)
CASES = [
 dict(id='lib-md-sp-1', cat='reporting', q='Guy got hurt and went to the hospital overnight. Who do we report it to and how fast?', where='Baltimore, MD', level='foreman', kind='rule', must=['MOSH', '24 ?hours'], lead=['MOSH|24 ?hours'], mustnot=[], chunks=['sp-md-report-1']),
 dict(id='lib-mn-sp-1', cat='reporting', q='How fast do we have to report an amputation to the state?', where='Duluth, MN', level='foreman', kind='rule', must=['24 ?hours', 'MNOSHA'], lead=['24 ?hours'], mustnot=[], chunks=['sp-mn-report-1']),
 dict(id='lib-ia-sp-1', cat='reporting', q='What number do I call to report a fatality to Iowa OSHA?', where='Des Moines, IA', level='office', kind='simple', must=['877.?242.?6742', '8 ?hours'], lead=['877.?242.?6742'], mustnot=[], chunks=['sp-ia-report-1']),
 dict(id='lib-ca-sp-1', cat='trench', q='We are a sub with an annual Cal/OSHA trench permit. Do we have to tell them about each new job?', where='Riverside, CA', level='office', kind='rule', must=['notif|tell', '341'], lead=['[Yy]es|notif'], mustnot=[], chunks=['sp-ca-permit-341-1']),
 dict(id='lib-ca-sp-2', cat='training', q='How often do we have to hold tailgate meetings in California?', where='Fresno, CA', level='foreman', kind='simple', must=['10 working days'], lead=['10 working days'], mustnot=[], chunks=['sp-ca-meetings-1']),
 dict(id='lib-wa-sp-1', cat='training', q='Can I do toolbox talks every other week in Washington?', where='Spokane, WA', level='foreman', kind='rule', must=['weekly|every week', '296-155-110'], lead=['[Nn]o|weekly|every week'], mustnot=[], chunks=['sp-wa-meetings-1']),
 dict(id='lib-wa-sp-2', cat='training', q='Does the foreman need a first aid card?', where='Tacoma, WA', level='foreman', kind='simple', must=['296-155-120', 'first.aid'], lead=['[Yy]es'], mustnot=[], chunks=['sp-wa-firstaid-1']),
 dict(id='lib-mi-sp-1', cat='confined', q='Is Michigan confined space permit different from OSHA?', where='Lansing, MI', level='foreman', kind='rule', must=['Part 35', '1926\\.1206|federal'], lead=['Part 35|federal|same'], mustnot=[], chunks=['sp-mi-confined-2']),
 dict(id='lib-ca-sp-3', cat='confined', q='Did California change its confined space rules for construction?', where='San Diego, CA', level='foreman', kind='rule', must=['2026', 'rescue|standby'], lead=['2026|[Yy]es'], mustnot=[], chunks=['sp-ca-confined-2026-1']),
 dict(id='lib-us-fed-1', cat='strike', q='We nicked a gas line and it is blowing. Who do we call first?', where='Dallas, TX', level='pipelayer', kind='simple', must=['911'], lead=['911'], mustnot=[], chunks=['fed-phmsa-damage-911-1']),
]
ids = {c['id'] for c in C}
errs = []
with open('cases.jsonl', 'w') as f:
    for c in CASES:
        e = check_case(c, ids)
        if e: errs.append((c['id'], e))
        f.write(json.dumps(c, ensure_ascii=False) + '\n')
print(len(C), 'chunks;', len(CASES), 'cases;', 'case errors:', errs or 0)
