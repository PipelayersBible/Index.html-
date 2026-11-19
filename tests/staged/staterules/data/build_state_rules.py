#!/usr/bin/env python3
# Builds state_rules.json: 811 one-call rules and trench rules for 50 states + DC, checked 2026-11-19.
# Every value here was read from the source listed on the row (statute, regulation, the state's one-call
# center or the state agency). A value we could not confirm is None, and the app then says
# "Check your state's 811 rules" instead of guessing. Re-check every row once a year (decision #64).
#
# Units: 'wd' = working/business days (Mon-Fri, not holidays), 'cd' = calendar days.
# life.from: 'call'  = counted from the day the ticket was called in (or renewed)
#            'dig'   = counted from the end of the wait (the first legal dig day). Laws that count from the
#                      "start date" on the ticket use 'dig': the start date can't be earlier, so the app's date
#                      is never later than the real one.
# life.incl: True when the law counts the first day as day 1 (expiry = base + n - 1).
# start: the latest day work may start after the call (or None).
import json, sys, os

CHECKED = '2026-11-19'
DIR = 'https://read.nxtbook.com/gulf_energy_information/underground_infrastructure/march_2026/one_call_directory.html'
OSHA_PLANS = 'https://www.osha.gov/stateplans'
FED652 = 'https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.652'

FULL_PLAN = {'AK', 'AZ', 'CA', 'HI', 'IN', 'IA', 'KY', 'MD', 'MI', 'MN', 'NV', 'NM', 'NC', 'OR', 'SC', 'TN', 'UT', 'VT', 'VA', 'WA', 'WY'}
PUBLIC_ONLY = {'CT', 'IL', 'ME', 'MA', 'NJ', 'NY'}

NAMES = {'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut',
 'DE': 'Delaware', 'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois',
 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts',
 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee',
 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'}

def C(name, url, area=None, phone='811'):
    d = {'name': name, 'url': url, 'phone': phone}
    if area: d['area'] = area
    return d

def N(n, unit, text):  # notice / wait before digging
    return {'n': n, 'unit': unit, 'text': text}

def L(n, unit, frm, text, incl=False):  # ticket life
    d = {'n': n, 'unit': unit, 'from': frm, 'text': text}
    if incl: d['incl'] = True
    return d

def S(n, unit, text):  # latest start after the call
    return {'n': n, 'unit': unit, 'text': text}

R = {}
def row(code, centers, notice, life, renew, tol, tol_text, white, white_text, emergency, sources, start=None, trench=None, permit=None, osha_name=None, osha_url=None, note=None, level='law'):
    R[code] = dict(code=code, name=NAMES[code], centers=centers, notice=notice, start=start, life=life, renew=renew,
                   tol_in=tol, tol_text=tol_text, white=white, white_text=white_text, emergency=emergency,
                   trench=trench, permit=permit, osha_name=osha_name, osha_url=osha_url, note=note,
                   sources=sources, checked=CHECKED, level=level)

# ---------------- the ten western states first ----------------
row('CA', [C('USA North 811', 'https://usanorth811.org', 'Northern California'), C('DigAlert', 'https://digalert.org', 'Southern California')],
    N(2, 'wd', 'Call at least 2 working days before digging, not counting the call day. Working days are Mon-Fri, 7 AM to 5 PM, not holidays.'),
    L(28, 'cd', 'call', 'A ticket is good for 28 days from the day it is issued.'),
    'Renew online or by phone by the end of day 28 if work goes on.',
    24, '24 inches each side of the field mark.', 'required', 'Mark the dig area (white) before you call.',
    'In an emergency you may dig without the 2-day wait. Call 811 as soon as you can.',
    [{'what': 'Gov. Code 4216.2 (notice, 28-day ticket, delineate)', 'url': "https://california.public.law/codes/ca_gov't_code_section_4216.2"},
     {'what': 'Gov. Code 4216 (tolerance zone, working day, emergency)', 'url': 'https://codes.findlaw.com/ca/government-code/gov-sect-4216/'},
     {'what': '8 CCR 1541.1 (protective systems from 5 ft)', 'url': 'https://dir.ca.gov/Title8/1541_1.html'},
     {'what': '8 CCR 341 (permit, 5 ft trenches)', 'url': 'https://dir.ca.gov/Title8/341.html'}],
    start=S(14, 'cd', 'Call no more than 14 calendar days before work starts.'),
    trench={'ft': 5, 'text': 'Cal/OSHA: protective system from 5 ft unless the competent person finds no cave-in hazard under 5 ft, or it is all stable rock (8 CCR 1541.1).'},
    permit='Cal/OSHA permit needed for trenches or excavations 5 ft or deeper that anyone enters (8 CCR 341). Emergency repair of underground facilities is exempt.',
    osha_name='Cal/OSHA', osha_url='https://www.dir.ca.gov/dosh/')

row('AZ', [C('Arizona 811', 'https://www.arizona811.com')],
    N(2, 'wd', 'Call at least 2 working days before digging. Working days skip weekends, legal holidays and the Friday after Thanksgiving.'),
    L(15, 'wd', 'call', 'Marks are good for 15 working days from the day they were marked. The app counts from the call-in day, so its date can be a little early.'),
    'Tell the operators at least 2 working days before the 15 working days run out if work goes on.',
    24, 'Dig by hand within 24 inches of a facility.', 'required', 'Mark the dig area with white lining before you call (not needed on your own single-family home).',
    'Emergencies with immediate danger to life, health or property are treated differently. Take reasonable care to protect lines.',
    [{'what': 'A.R.S. 40-360.22 (marking valid 15 working days, white lining)', 'url': 'https://www.azleg.gov/ars/40/00360-22.htm'},
     {'what': '2026 Laws ch. 147 (SB 1137): definitions, 24 in hand digging, emergencies', 'url': 'https://www.azleg.gov/legtext/57leg/2R/laws/0147.htm'},
     {'what': 'A.A.C. R20-5-601 (ADOSH adopts 29 CFR 1926)', 'url': 'https://www.law.cornell.edu/regulations/arizona/Ariz-Admin-Code-SS-R20-5-601'}],
    trench={'ft': 5, 'text': 'ADOSH uses the federal rule: protective system from 5 ft (29 CFR 1926.652).'},
    osha_name='ADOSH (Arizona state plan)', osha_url='https://www.azica.gov/divisions/adosh')

row('NV', [C('USA North 811', 'https://usanorth811.org')],
    N(2, 'wd', 'Call at least 2 working days (7 AM to 5 PM, not holidays) and not more than 28 calendar days before digging.'),
    L(28, 'cd', 'call', 'A ticket is good for 28 calendar days from the day it is issued.'),
    'Renew by the end of day 28 if work goes on and marks are still clear. Two renewals at most, then a new ticket.',
    24, 'The facility can be up to 24 inches either side. Hand tools only within 24 inches.', 'required', 'Mark the proposed dig area (white paint, flags, stakes or whiskers).',
    'In an emergency you may dig without the wait. Tell the operator as soon as you can.',
    [{'what': 'NRS 455.110 (notice, premark, emergency)', 'url': 'https://nevada.public.law/statutes/nrs_455.110'},
     {'what': 'NRS 455 (24 in approximate location, working day)', 'url': 'https://www.leg.state.nv.us/NRs/NRS-455.html'},
     {'what': 'USA North 811 Nevada 2025 handbook (28 days, 2 renewals)', 'url': 'https://usanorth811.org/assets/PDF/Nevada-2025-Handbook.pdf'},
     {'what': 'Nevada OSHA letter: enforces 29 CFR 1926 Subpart P', 'url': 'https://dir.nv.gov/uploadedFiles/dirnvgov/content/OSHA/Guidance/2024-01-30 (LOI - Use of Engineered Designs for Excavations).pdf'}],
    start=S(28, 'cd', 'Call no more than 28 calendar days before work starts.'),
    trench={'ft': 5, 'text': 'Nevada OSHA enforces the federal rule: protective system from 5 ft (29 CFR 1926.652).'},
    osha_name='Nevada OSHA (state plan)', osha_url='https://dir.nv.gov/OSHA/')

row('OR', [C('Oregon 811 (Oregon Utility Notification Center)', 'https://digsafelyoregon.com')],
    N(2, 'wd', 'Call at least 2 full business days and not more than 10 business days before digging. After 5 PM counts as the next business day.'),
    L(45, 'cd', 'call', 'A ticket is good for 45 calendar days from the day it was sent in.'),
    'Past 45 days, call in a new locate request.',
    24, '24 inches each side of the facility. Hand tools or non-invasive methods inside it.', 'required', 'Mark the proposed dig area in white before you call.',
    'Emergency locates are for immediate danger to life or property, or to essential service. There is no legal "priority" locate.',
    [{'what': 'Oregon 811 FAQ (OAR 952-001-0040, -0050, -0060, -0090)', 'url': 'https://digsafelyoregon.com/resources/faq/'},
     {'what': 'OAR 952-001-0070 (24 in marking, white premark)', 'url': 'https://oregon.public.law/rules/oar_952-001-0070'},
     {'what': 'OAR 437-003-0001 (Oregon OSHA adopts 1926.650-652)', 'url': 'https://oregon.public.law/rules/oar_437-003-0001'}],
    start=S(10, 'wd', 'Call no more than 10 business days before work starts.'),
    trench={'ft': 5, 'text': 'Oregon OSHA adopts the federal rule: protective system from 5 ft (29 CFR 1926.652).'},
    osha_name='Oregon OSHA (state plan)', osha_url='https://osha.oregon.gov/')

row('WA', [C('Washington 811', 'https://www.washington811.com')],
    N(2, 'wd', 'Call at least 2 full business days and not more than 10 full business days before digging. From Jan 1, 2026, wait for a positive response from every operator.'),
    L(45, 'cd', 'call', 'Marks are good for 45 calendar days from the day you gave notice.'),
    'Past 45 days, give a new notice.',
    24, 'Marks are accurate to within 24 inches of each side of the facility.', 'required', 'Mark the dig area with white lining or white pin flags before you call.',
    'Emergency: clear and present danger to life, health or property, or an unplanned outage with a crew on site or on the way.',
    [{'what': 'RCW 19.122.030 (white lining, notice, 45 days)', 'url': 'https://app.leg.wa.gov/RCW/default.aspx?cite=19.122.030'},
     {'what': 'RCW 19.122.020 (24 in reasonable accuracy, business day, emergency)', 'url': 'https://lawfilesext.leg.wa.gov/law/RCWPDF/RCW%20%2019%20%20TITLE/RCW%20%2019%20.122%20%20CHAPTER/RCW%20%2019%20.122%20.020.pdf'},
     {'what': 'UTC: dig law changes from July 27, 2025', 'url': 'https://www.utc.wa.gov/news/2025/changes-washington-dig-law-take-effect-july-27'},
     {'what': 'WAC 296-155-657 (protective system from 4 ft)', 'url': 'https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-657.htm'},
     {'what': 'WSR 26-09-113 (trench work plan, competent person on site, from June 1, 2026)', 'url': 'https://lawfilesext.leg.wa.gov/law/wsr/2026/09/26-09-113.htm'}],
    start=S(10, 'wd', 'Call no more than 10 full business days before work starts.'),
    trench={'ft': 4, 'text': 'Washington DOSH: protective system from 4 ft unless the competent person finds no cave-in hazard, or it is all stable rock (WAC 296-155-657). From June 1, 2026: a written trench work plan when a protective system is needed, and a competent person on site during trench work.'},
    osha_name='Washington DOSH (L&I, state plan)', osha_url='https://lni.wa.gov/safety-health/')

row('TX', [C('Texas811', 'https://texas811.org')],
    N(2, 'wd', 'Call at least 48 hours before digging, not counting weekends and legal holidays, and not more than 14 days ahead. A Saturday call: dig from Tuesday 11:59 AM.'),
    L(14, 'wd', 'call', 'A routine ticket is good for 14 working days from the call (Railroad Commission rule).'),
    'If the work isn’t done, refresh the ticket for the area still to dig.',
    18, 'Pipelines: half the pipe diameter plus 18 inches each side (16 TAC 18.2). The one-call law sets no zone for other lines; Texas811 uses 18 inches.', 'conditional',
    'White-line the area before you call when the site can’t be clearly described on the ticket.',
    'Emergency: danger to life, health or property, or urgent service restoration. Call 811 for an emergency ticket. Gas line hit: call 911.',
    [{'what': 'Utilities Code 251.151 (48 hours, 14 days)', 'url': 'https://texas.public.law/statutes/tex._util._code_section_251.151'},
     {'what': '16 TAC Chapter 18 (14-day ticket, working days, tolerance zone, white lining)', 'url': 'https://www.rrc.texas.gov/media/ap2ck4pb/chapter18-all-effective-feb12-2018.pdf'},
     {'what': 'RRC excavator brochure: tickets expire in 14 working days', 'url': 'https://rrc.texas.gov/media/bwciof3s/excavator-brochure-english.pdf'},
     {'what': 'Texas811 FAQ', 'url': 'https://www.texas811.org/faq'}],
    start=S(14, 'cd', 'Call no more than 14 days before work starts.'))

row('UT', [C('Blue Stakes of Utah 811', 'https://www.bluestakes.org')],
    N(2, 'wd', 'Give notice at least 48 hours (business days) and not more than 14 days before digging. The clock starts 8 AM the next business day.'),
    L(21, 'cd', 'call', 'A ticket is good for 21 days from the day notice was given. New tickets expire at 8 AM on day 21.'),
    'Renew at least 48 hours and no sooner than 7 days before day 21. A renewal adds 21 days from the old expiry.',
    24, '24 inches either side of the facility mark (or half the marked diameter plus 24 inches from center).', 'conditional',
    'If the site can’t be described, outline it using the uniform color code.',
    'The notice rule does not apply in an emergency.',
    [{'what': 'Utah Code 54-8a-4 (48 hours, 14 days, 21-day notice, renewal)', 'url': 'https://le.utah.gov/xcode/Title54/Chapter8A/C54-8a-S4_2024050120240501.html'},
     {'what': 'Utah Code 54-8a-2 (tolerance zone 24 in, emergency)', 'url': 'https://le.utah.gov/xcode/Title54/Chapter8A/C54-8a-S2_2024050120240501.html'},
     {'what': 'Blue Stakes: state law (21 days, 8 AM)', 'url': 'https://www.bluestakes.org/?p=68875'},
     {'what': 'Utah Admin. Code R614-1-4 (UOSH adopts 29 CFR 1926)', 'url': 'https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R614-1-4'}],
    start=S(14, 'cd', 'Give notice no more than 14 days before work starts.'),
    trench={'ft': 5, 'text': 'UOSH adopts the federal rule: protective system from 5 ft (29 CFR 1926.652).'},
    osha_name='Utah OSH (state plan)', osha_url='https://laborcommission.utah.gov/divisions/uosh/')

row('CO', [C('Colorado 811', 'https://www.colorado811.org')],
    N(2, 'wd', 'Call at least 2 business days before digging, not counting the call day.'),
    L(30, 'cd', 'dig', 'Marks are good while clearly visible, but not more than 30 calendar days after the locate due date.'),
    'Before the 30 days end, call again with at least 2 business days’ notice.',
    18, '18 inches each side of the facility. Use nondestructive digging inside it.', 'conditional',
    'Mark the area in white (or by electronic white lining or an on-site meeting) when it can’t be described on the ticket.',
    'Emergency: no advance notice needed. Take reasonable care, notify the owners and Colorado 811 as soon as you can.',
    [{'what': 'C.R.S. 9-1.5-103', 'url': 'https://codes.findlaw.com/co/title-9-safety-industrial-and-commercial/co-rev-st-sect-9-1-5-103/'}],
    trench={'ft': 5, 'text': 'Federal OSHA: protective system from 5 ft (29 CFR 1926.652).'})

row('NM', [C('New Mexico 811', 'https://www.nm811.org')],
    N(2, 'wd', 'Give notice 2 working days ahead, not counting the notice day. Operators have 2 full working days to mark.'),
    L(15, 'wd', 'dig', 'Marks are good for 15 working days from the end of the notice period.'),
    'Wide-area tickets must be reaffirmed every 15 working days.',
    18, 'Within 18 inches either side of a mark, expose the line by hand or vacuum first.', 'required',
    'Pre-mark the actual dig site in white in towns. Outside towns, pre-mark or give GPS points.',
    'Emergency locates: marked as soon as practical, ideally within 2 hours.',
    [{'what': '18.60.5 NMAC (Pipeline Safety Bureau excavation rule)', 'url': 'https://www.srca.nm.gov/parts/title18/18.060.0005.html'},
     {'what': '11.5.3 NMAC (NM OSHA adopts 29 CFR 1926)', 'url': 'https://srca.nm.gov/parts/title11/11.005.0003.html'}],
    trench={'ft': 5, 'text': 'NM OSHA adopts the federal rule: protective system from 5 ft (29 CFR 1926.652).'},
    osha_name='New Mexico OSHA (state plan)', osha_url='https://www.env.nm.gov/occupational_health_safety/')

row('ID', [C('Digline', 'https://www.digline.com', 'Most of Idaho'), C('Dig Safe North Idaho 811', 'https://digsafenorthidaho811.com', 'Bonner, Boundary, Kootenai'), C('North Idaho 811', 'https://www.nid811.com', 'Benewah, Shoshone')],
    N(2, 'wd', 'Call at least 2 business days and not more than 10 business days before digging.'),
    L(28, 'cd', 'call', 'Marks are good for no more than 4 weeks after the notice.'),
    'Not started within 3 weeks of the notice: call again. Use an update request to extend.',
    24, '24 inches from the outside edges of the facility. Hand dig inside it.', 'required',
    'Pre-mark the dig path in white, unless the address or lot on the ticket shows it or you met on site.',
    'Imminent danger: no wait. Other emergencies: give emergency notice. The owner calls within 1 hour and comes within 2 hours.',
    [{'what': 'Idaho DOPL Guide to Safe Digging 2026-27 (Idaho Code 55-2205, 55-2207)', 'url': 'https://dopl.idaho.gov/wp-content/uploads/2026/04/DAM-ID-Guide-to-Safe-Digging-26_27.pdf'},
     {'what': 'Idaho DOPL one-call centers', 'url': 'https://dopl.idaho.gov/dpb/dpb-one-call-centers/'}],
    start=S(21, 'cd', 'Not started within 3 weeks of the notice: call again.'),
    trench={'ft': 5, 'text': 'Federal OSHA: protective system from 5 ft (29 CFR 1926.652).'})

# ---------------- the rest ----------------
row('AL', [C('Alabama 811', 'https://al811.com')],
    N(2, 'wd', 'Call at least 2 and not more than 10 working days before digging.'),
    L(20, 'wd', 'dig', 'A notice is good for 20 working days from the start date on the ticket. The app counts from the first legal dig day.'),
    'Renew at least 2 working days before it expires if work goes on.',
    None, 'A new law (Jan 1, 2027) sets 18 inches plus the facility width. Check Alabama 811 for today’s rule.', 'conditional',
    'Pre-mark in white when the location can’t be described well enough.', None,
    [{'what': 'Ala. Code 37-15-4 (2022)', 'url': 'https://law.justia.com/codes/alabama/2022/title-37/chapter-15/section-37-15-4/'},
     {'what': '2026 SB205 (changes from Jan 1, 2027)', 'url': 'https://alison.legislature.state.al.us/files/pdf/SearchableInstruments/2026RS/SB205-enr.pdf'}],
    start=S(10, 'wd', 'Call no more than 10 working days before work starts.'), level='partial')

row('AK', [C('Alaska 811', 'https://www.811ak.com')],
    N(2, 'wd', 'Call at least 2 and not more than 15 working days before digging (10 to 20 in remote areas).'),
    None, 'The law sets no ticket expiry. Ask for a remark if marks fade.',
    24, 'Marks within 24 inches of the facility (30 inches if deeper than 10 ft).', 'recommended', 'Mark the dig area in white when it can’t be clearly described (black on snow).',
    'Emergency: notify every operator right away and ask for a prompt locate.',
    [{'what': 'Alaska 811 excavator handbook 2026 (AS 42.30.400-490)', 'url': 'https://cdn.pelicancorp.com/pdfs/26-ak811-excavator-handbook.pdf'}],
    start=S(15, 'wd', 'Call no more than 15 working days before work starts.'), osha_name='AKOSH (Alaska state plan)', level='partial')

row('AR', [C('Arkansas 811', 'https://arkansas811.com')], None, None, None, None, None, None, None, None,
    [{'what': 'Center directory (name and site only)', 'url': DIR}], level='partial',
    note='We could not confirm Arkansas’s wait, ticket life or tolerance from the law. Check Arkansas 811.')

row('CT', [C('Call Before You Dig (CBYD)', 'https://www.cbyd.com')],
    N(2, 'wd', 'Call at least 2 full days (not weekends or holidays) and not more than 30 days before digging.'),
    L(30, 'cd', 'call', 'A ticket expires 30 days from the day it is given.'),
    'Past 30 days, call in again.', None, None, None, None,
    'Emergency work: call the center right away, by phone as soon as you can.',
    [{'what': 'PURA: CBYD current provisions (RCSA 16-345-4)', 'url': 'https://portal.ct.gov/PURA/Gas-Pipeline-Safety/Call-Before-You-Dig/CBYD-Current-Provisions'},
     {'what': 'RCSA 16-345-4(d) (30-day expiry)', 'url': 'https://d1tvxue8o4w0fl.cloudfront.net/regulation/connecticut-administrative-code/title-16-public-service-companies/excavation-near-underground-utility-facilities/section-16-345-4-responsibilities-of-excavators-and-responsible-parties'}],
    start=S(30, 'cd', 'Call no more than 30 days before work starts.'), level='partial')

row('DE', [C('Miss Utility of Delmarva', 'https://www.missutilitydelmarva.com')],
    N(3, 'wd', 'Call at least 3 and not more than 12 business days before digging.'),
    L(12, 'wd', 'call', 'A ticket is good for 12 business days after it is sent. On day 13 it expires.'),
    'Get an update, remark or new ticket after it expires.',
    24, '24 inches from the outside of the facility.', 'recommended', 'White lining is highly recommended when the exact spot can’t be described.',
    'Emergency: the wait does not apply. Notify the center at the earliest moment.',
    [{'what': 'Del. Code Title 26, ch. 8, subch. I (802, 806)', 'url': 'https://delcode.delaware.gov/title26/c008/sc01/index.html'}],
    start=S(12, 'wd', 'Call no more than 12 business days before work starts.'))

row('DC', [C('Miss Utility', 'https://www.missutility.net')],
    N(4, 'wd', 'Notify at least 96 hours (not weekends or legal holidays) and not more than 10 days before digging.'),
    L(15, 'wd', 'call', 'A notice is good for 15 days, not counting weekends and legal holidays.'),
    'Ask for a remark 3 days before the end, or when marks fade.',
    24, 'Marks within 2 ft of the facility. Within 18 inches, expose it by hand.', None, None,
    'Imminent danger: the notice rule does not apply, but notify operators right away.',
    [{'what': 'D.C. Code ch. 27 (34-2704, 34-2709)', 'url': 'https://code.dccouncil.gov/us/dc/council/code/titles/34/chapters/27/index.full.html'}])

row('FL', [C('Sunshine 811', 'https://www.sunshine811.com')],
    N(2, 'wd', 'Call at least 2 full business days before digging (10 for underwater work).'),
    L(30, 'cd', 'call', 'Ticket information is good for 30 calendar days after you give it.'),
    'Past 30 days, call in again.',
    24, 'Lines are marked within 24 inches of either side. Hand dig, pothole or vacuum inside the tolerance zone.', None, None, None,
    [{'what': 'Fla. Stat. 556.105 (2026)', 'url': 'https://m.flsenate.gov/statutes/556.105'}])

row('GA', [C('Georgia 811', 'https://www.georgia811.com')], None,
    L(30, 'cd', 'call', 'A locate request expires after 30 calendar days.'),
    'Renew 3 business days before it expires.',
    18, '18 inches either side of the facility edge.', 'conditional', 'White-line the site when it can’t be described clearly enough.', None,
    [{'what': 'Georgia 811 FAQ', 'url': 'https://georgia811.com/?p=3343'},
     {'what': 'O.C.G.A. 25-9-6 (2022)', 'url': 'https://law.justia.com/codes/georgia/2022/title-25/chapter-9/section-25-9-6/'}],
    level='partial', note='Georgia’s wait is set as a "notice period" we could not confirm. Check Georgia 811.')

row('HI', [C('Hawaii One Call Center', 'https://www.callbeforeyoudig.org/hawaii/')],
    N(5, 'wd', 'Call at least 5 working days and not more than 28 calendar days before digging.'),
    L(28, 'cd', 'call', 'A ticket number is good for not more than 28 calendar days from issue.'),
    'Revalidate before it expires.', None, None, None, None, 'The notice rule does not apply in an emergency.',
    [{'what': 'HRS 269E-7', 'url': 'https://data.capitol.hawaii.gov/hrscurrent/Vol05_Ch0261-0319/HRS0269E/HRS_0269E-0007.htm'}],
    start=S(28, 'cd', 'Call no more than 28 calendar days before work starts.'), osha_name='HIOSH (Hawaii state plan)', level='partial')

row('IL', [C('JULIE', 'https://www.illinois1call.com', 'Illinois outside Chicago'), C('Chicago 811 (DIGGER)', 'https://ipi.cityofchicago.org/Digger', 'City of Chicago')],
    N(2, 'wd', 'Give notice not less than 2 days and not more than 10 days before digging (law from Jan 1, 2025).'),
    L(25, 'cd', 'call', 'The original notice expires after 25 days.'),
    'Past 25 days, get an extension; pre-mark again if you want new marks.', None, None, 'required', 'Pre-mark the dig area.', None,
    [{'what': '220 ILCS 50/4 (P.A. 103-614, from Jan 1, 2025)', 'url': 'https://witnessslips.ilga.gov/legislation/ilcs/documents/022000500K4.htm'}],
    start=S(10, 'cd', 'Give notice no more than 10 days before work starts.'), level='partial')

row('IN', [C('Indiana 811', 'https://indiana811.org')],
    N(2, 'wd', 'Call at least 2 full working days and not more than 10 calendar days before digging. Dig from 7 AM the next working day.'),
    L(20, 'cd', 'call', 'A notice expires at 11:59 PM, 20 days after it is received.'),
    'Past that, send a new locate request.', None, None, 'conditional', 'White-line the site when you can’t give an address, legal description or cross streets.', None,
    [{'what': 'Ind. Code 8-1-26-16 (2026)', 'url': 'https://codes.findlaw.com/in/title-8-utilities-and-transportation/in-code-sect-8-1-26-16/'}],
    start=S(10, 'cd', 'Call no more than 10 calendar days before work starts.'), osha_name='IOSHA (Indiana state plan)', level='partial')

row('IA', [C('Iowa One Call', 'https://www.iowaonecall.com')],
    N(2, 'wd', 'Give notice so digging starts after a 48-hour period.'),
    L(25, 'cd', 'dig', 'A notice is good for 25 calendar days starting the day the 48 hours end.', incl=True),
    'Ask for a remark if needed.',
    18, 'The facility location includes 18 inches either side.', 'required', 'Mark the proposed area with white paint, flags or stakes unless an exception applies.',
    'Emergency: you may start right away. Notify Iowa One Call as soon as practical.',
    [{'what': 'Iowa Code 480.4 (2025)', 'url': 'https://www.legis.iowa.gov/docs/code/2025/480.4.pdf'}], osha_name='Iowa OSHA (state plan)')

row('KS', [C('Kansas 811', 'https://www.kansas811.com')],
    N(2, 'wd', 'Call at least 2 full working days and not more than 20 calendar days before the start date.'),
    L(20, 'cd', 'dig', 'A notice is good for 20 calendar days after the start date. The app counts from the first legal dig day.'),
    'Update the notice to go on.', None, None, 'conditional', 'White-line the site when the operator asks.', 'The notice rule does not apply in an emergency.',
    [{'what': 'K.S.A. 66-1804', 'url': 'https://ksrevisor.gov/statutes/chapters/ch66/066_018_0004.html'}],
    start=S(20, 'cd', 'Call no more than 20 calendar days before work starts.'), level='partial')

row('KY', [C('Kentucky 811', 'https://www.kentucky811.org')],
    N(2, 'wd', 'Call at least 2 and not more than 10 full working days before digging.'),
    L(21, 'cd', 'call', 'A locate request is good for 21 calendar days from the day it was made.'),
    'Ask for a remark 2 working days before each 21 days end.', None, None, None, None, 'Gas or hazardous liquid leak: stop and call 911.',
    [{'what': 'KRS 367.4911 (2025)', 'url': 'https://law.justia.com/codes/kentucky/chapter-367/section-367-4911/'}],
    start=S(10, 'wd', 'Call no more than 10 full working days before work starts.'), osha_name='Kentucky OSH (state plan)', level='partial')

row('LA', [C('Louisiana 811', 'https://www.louisiana811.com')], None, None, None, None, None, None, None, None,
    [{'what': 'Center directory (name and site only)', 'url': DIR}], level='partial',
    note='Louisiana changed its law in 2023 and we could not confirm the current wait and ticket life. Check Louisiana 811.')

row('ME', [C('Dig Safe', 'https://www.digsafe.com')],
    N(3, 'wd', 'Call at least 3 business days and not more than 30 calendar days before digging.'),
    L(60, 'cd', 'call', 'Start within 30 days. If the work is not done 60 days after notice, call again.'),
    'Call again after 60 days or if the work area grows.',
    18, 'No mechanical digging within 18 inches of a mark until the line is exposed.', 'required', 'Mark the proposed dig area before you call.',
    'Emergency: notify the center and mark the site first if you can. Start within 12 hours of the notice.',
    [{'what': '23 M.R.S. 3360-A', 'url': 'https://legislature.maine.gov/statutes/23/title23sec3360-A.html'},
     {'what': 'Dig Safe excavator manual (Oct 2024)', 'url': 'https://digsafe.com/data/file_uploads/DGS Excavator Manual OCTOBER 2024 WEB.pdf'}],
    start=S(30, 'cd', 'Work must start within 30 days of the notice.'))

row('MD', [C('Miss Utility', 'https://www.missutility.net')],
    N(3, 'wd', 'Pick a start date at least 3 and not more than 12 business days after the ticket.'),
    L(12, 'wd', 'dig', 'A ticket is good for 12 business days after the start date you picked. The app counts from the first legal dig day.'),
    None, 18, 'Marks within 18 inches either side. No power equipment within 18 inches of the marks.', 'recommended', 'Miss Utility suggests marking the dig site in white.', None,
    [{'what': '2022 Md. Laws ch. 435 (HB 994)', 'url': 'https://mgaleg.maryland.gov/2022rs/Chapters_noln/CH_435_hb0994t.pdf'},
     {'what': 'Miss Utility: information for excavators', 'url': 'https://www.missutility.net/?p=6'}],
    start=S(12, 'wd', 'The start date can be no more than 12 business days after the ticket.'), osha_name='MOSH (Maryland state plan)')

row('MA', [C('Dig Safe', 'https://www.digsafe.com')],
    N(3, 'wd', 'Call at least 72 hours before digging, not counting weekends and holidays.'),
    L(30, 'cd', 'call', 'Tickets expire 30 days from the day they are issued.'),
    'Renew only if work will happen within 30 days.',
    18, 'The facility width plus 18 inches each side.', 'required', 'Premark the dig area in white before you call (some long digs are exempt).',
    'Emergency notice the same day.',
    [{'what': 'Dig Safe excavator manual (Oct 2024)', 'url': 'https://digsafe.com/data/file_uploads/DGS Excavator Manual OCTOBER 2024 WEB.pdf'},
     {'what': 'Dig Safe FAQ', 'url': 'https://digsafe.com/faqs'}], level='center')

row('MI', [C('MISS DIG 811', 'https://missdig811.org')],
    N(3, 'wd', 'Give notice at least 72 hours (not counting non-business days) and not more than 14 calendar days before digging.'),
    L(21, 'cd', 'dig', 'A ticket is good for 21 days from the start date (180 days if the notice says the work will take longer). The app counts from the first legal dig day.'),
    None, 48, 'Caution zone: 48 inches either side of the marks. Expose marked lines by soft digging.', 'conditional',
    'White-line before the ticket when the parcel can’t be described.', 'Give prompt emergency notice. Do only the work the emergency needs.',
    [{'what': 'MCL 460.725', 'url': 'https://ombudsman.legislature.mi.gov/documents/mcl/pdf/MCL-460-725.pdf'},
     {'what': 'MCL 460.723 (caution zone, business day)', 'url': 'https://law.justia.com/codes/michigan/2022/chapter-460/statute-act-174-of-2013/section-460-723/'}],
    start=S(14, 'cd', 'Give notice no more than 14 calendar days before work starts.'), osha_name='MIOSHA (Michigan state plan)')

row('MN', [C('Gopher State One Call', 'https://www.gopherstateonecall.org')],
    N(2, 'wd', 'Give notice at least 48 hours (not the notice day, weekends or holidays) and not more than 14 calendar days before digging.'),
    L(14, 'cd', 'dig', 'A notice is good for 14 calendar days from the start time on it. The app counts from the first legal dig day.'),
    'Past 14 days, give a new notice (or arrange mark checks: then 6 months).',
    24, 'Marks within 2 ft. Find the exact spot before digging within 2 ft of the mark.', None, None, 'The notice rule does not apply in an emergency.',
    [{'what': 'Minn. Stat. 216D.04 (2025)', 'url': 'https://www.revisor.mn.gov/statutes/?id=216D.04'}],
    start=S(14, 'cd', 'Give notice no more than 14 calendar days before work starts.'), osha_name='MNOSHA (Minnesota state plan)')

row('MS', [C('Mississippi 811', 'https://www.ms811.org')], None,
    L(20, 'cd', 'call', 'Normal and emergency tickets are good for 20 calendar days (from July 1, 2025).'),
    None, 18, '18 inches from each side of the marks, plus half the diameter if shown.', 'required',
    'Pre-mark the area unless it is electronically pre-marked.', 'Operators respond to emergency tickets within 2 hours.',
    [{'what': 'Mississippi 811: 2025 law changes', 'url': 'https://ms811.org/wp-content/uploads/2025/04/2025-Excavation-Law-Amendments-Summary.pdf'}],
    level='partial', note='We could not confirm Mississippi’s wait before digging. Check Mississippi 811.')

row('MO', [C('Missouri 811', 'https://missouri-811.org')],
    N(2, 'wd', 'Call at least 2 and not more than 10 working days before digging.'), None,
    'Not started within 10 working days: ask for a relocate first.', None, None, None, None, None,
    [{'what': 'RSMo 319.026', 'url': 'https://revisor.mo.gov/main/OneSection.aspx?section=319.026'}],
    start=S(10, 'wd', 'Not started within 10 working days: ask for a relocate.'), level='partial')

row('MT', [C('Montana 811', 'https://www.montana811.org')], None, None, None, None, None, None, None, None,
    [{'what': 'Center directory (name and site only)', 'url': DIR}], level='partial',
    note='We could not read Montana’s current statute. Check Montana 811.')

row('NE', [C('Nebraska 811', 'https://www.ne1call.com')],
    N(2, 'wd', 'Call at least 2 full business days and not more than 10 business days before digging.'), None,
    'Start within 17 calendar days of the ticket start date or give a new notice.',
    18, '18 inches either side of the mark plus half the facility width.', None, None, None,
    [{'what': 'Neb. Rev. Stat. 76-2321', 'url': 'https://law.justia.com/codes/nebraska/chapter-76/statute-76-2321/'},
     {'what': 'Nebraska One-Call Notification System Act (76-2323)', 'url': 'https://sfm.nebraska.gov/sites/default/files/doc/1.%20Nebraska%20One%20Call%20Act.pdf'}],
    start=S(17, 'cd', 'Start within 17 calendar days of the ticket start date.'), level='partial')

row('NH', [C('Dig Safe', 'https://www.digsafe.com')],
    N(3, 'wd', 'Call at least 72 hours before digging, not counting weekends and holidays.'),
    L(30, 'cd', 'call', 'Tickets expire 30 days from the day they are issued.'),
    'Renew only if work will happen within 30 days.',
    18, 'The facility width plus 18 inches each side.', 'required', 'Premark the dig area in white before you call (some long digs are exempt).',
    'Emergency notice the same day.',
    [{'what': 'Dig Safe excavator manual (Oct 2024)', 'url': 'https://digsafe.com/data/file_uploads/DGS Excavator Manual OCTOBER 2024 WEB.pdf'},
     {'what': 'Dig Safe FAQ', 'url': 'https://digsafe.com/faqs'}], level='center')

row('NJ', [C('New Jersey One Call', 'https://www.nj1-call.org')],
    N(3, 'wd', 'Call at least 3 business days before digging.'),
    L(45, 'wd', 'call', 'A notice is good for 45 business days if work starts within 10 business days and the marks are kept.'),
    'After 45 business days, give a new notice.', None, None, 'recommended', 'White premarking is optional but encouraged.',
    'Emergency: notify the center as soon as you can without delaying the work. Gas or liquid line damage: call 911.',
    [{'what': 'N.J.A.C. 14:2 (BPU one-call rules)', 'url': 'https://nj.gov/bpu/pdf/rules/Chapter%202 One Call Rules 10.28.21 Clean Version.pdf'}],
    start=S(10, 'wd', 'Work must start within 10 business days of the notice.'), level='partial')

row('NY', [C('UDig NY', 'https://udigny.org', 'New York outside NYC and Long Island'), C('New York 811', 'https://newyork-811.com', 'New York City and Long Island')],
    N(2, 'wd', 'Call at least 2 and not more than 10 working days before the start date, not counting the call day.'), None,
    'No set ticket life. A delay of more than 10 working days needs a new notice for the new start date.',
    24, 'Two feet either side of the center line (plus half the diameter if known).', 'conditional', 'Premark in white when needed to identify the site.',
    'Emergency work may start right away. Notify the one-call system as soon as possible.',
    [{'what': 'NY PSC 16 NYCRR Part 753 booklet (2025)', 'url': 'https://dps.ny.gov/system/files/documents/2025/06/ss753-booklet-2025.05.09-update.pdf'}],
    start=S(10, 'wd', 'Call no more than 10 working days before work starts.'))

row('NC', [C('NC811', 'https://nc811.org')],
    N(3, 'wd', 'Call at least 3 full working days before the start date.'),
    L(28, 'cd', 'dig', 'A notice expires 28 calendar days after the work start date. The app counts from the first legal dig day.'),
    'Past that, give a new notice.', None, '24 inches applies only to oil, gas transmission and electric transmission lines (no mechanized digging).', 'conditional',
    'Premark in white when the area can’t be identified from the notice.', None,
    [{'what': 'G.S. 87-122', 'url': 'https://www.ncleg.gov/EnactedLegislation/Statutes/PDF/BySection/Chapter_87/GS_87-122.pdf'}],
    osha_name='NC DOL OSH (state plan)', level='partial')

row('ND', [C('North Dakota One Call', 'https://www.ndonecall.com')], None,
    L(21, 'cd', 'dig', 'A locate is good for 21 days after the planned dig date. The app counts from the first legal dig day.'),
    'Not started in 21 days: ask for a relocate.', None, None, 'conditional', 'Give site identification (white marks or other means) unless an exception applies.',
    'Emergency: no advance notice. Notify the center as soon as practical.',
    [{'what': 'N.D.C.C. 49-23-04', 'url': 'https://law.counselstack.com/statute/nd/49-23-04'}],
    level='partial', note='We could not confirm North Dakota’s wait before digging. Check ND One Call.')

row('OH', [C('OHIO811', 'https://oups.org')],
    N(2, 'wd', 'Call at least 2 working days (not counting the call day) and not more than 16 calendar days before digging.'), None,
    'No ticket expiry is stated. Keep the ticket number for the whole job.',
    18, 'The facility width plus 18 inches each side.', 'required', 'Premark with white paint unless an exception applies.',
    'Emergency tickets are by phone only, for real emergencies.',
    [{'what': 'OHIO811 excavator manual, June 2026 (ORC 3781.25-.29)', 'url': 'https://oups.org/wp-content/uploads/2026/06/OHIO811_Excavator-Manual_English_June-2026.pdf'}],
    start=S(16, 'cd', 'Call no more than 16 calendar days before work starts.'), level='partial')

row('OK', [C('OKIE811', 'https://okie811.org')],
    N(2, 'wd', 'Give notice at least 48 hours (not the notice day, weekends or holidays) before digging.'),
    L(14, 'cd', 'dig', 'A notice expires 14 calendar days from the start date. The app counts from the first legal dig day.'),
    'Give a new notice to keep digging.', None, None, None, None,
    'Emergency: you may start right away with reasonable care. Notify operators promptly.',
    [{'what': '63 O.S. 142.6', 'url': 'https://law.counselstack.com/statute/ok/63/63-142.6'}], level='partial')

row('PA', [C('Pennsylvania 811', 'https://www.pa1call.org')], None, None, None,
    18, 'Lines are marked within 18 inches of the outside wall.', None, None, None,
    [{'what': '73 P.S. 177', 'url': 'https://codes.findlaw.com/pa/title-73-ps-trade-and-commerce/pa-st-sect-73-177/'}], level='partial',
    note='We could not confirm Pennsylvania’s wait or ticket life. Check Pennsylvania 811.')

row('RI', [C('Dig Safe', 'https://www.digsafe.com')],
    N(3, 'wd', 'Call at least 72 hours before digging, not counting weekends and holidays.'), None,
    'Tickets do not expire as long as the marks are kept.',
    18, 'The facility width plus 18 inches each side.', 'required', 'Premark the dig area in white before you call (digs over 500 ft are exempt).',
    'Emergency notice the same day.',
    [{'what': 'Dig Safe excavator manual (Oct 2024)', 'url': 'https://digsafe.com/data/file_uploads/DGS Excavator Manual OCTOBER 2024 WEB.pdf'},
     {'what': 'Dig Safe FAQ', 'url': 'https://digsafe.com/faqs'}], level='center')

row('SC', [C('SC811', 'https://sc811.com')],
    N(3, 'wd', 'Operators have 3 full working days to mark, not counting the call day.'),
    L(15, 'wd', 'dig', 'A normal ticket is good for 15 working days from its start time.'),
    'Send an extension before it expires (a remark gets a new ticket).',
    24, '24 inches each side of the mark, plus half the diameter if known.', 'conditional', 'Pre-mark in white when the site can’t be clearly identified.',
    'Emergency: exempt from the notice rule, but notify SC811 and the operators as soon as practicable.',
    [{'what': 'SC811 excavator manual 2026 (S.C. Code 58-36-60, -70)', 'url': 'https://sc811.com/wp-content/uploads/2026/05/Excavator-Manual-2026.pdf'}],
    osha_name='SC OSHA (state plan)', level='center')

row('SD', [C('South Dakota 811', 'https://www.sdonecall.com')],
    N(2, 'wd', 'Give notice at least 48 hours ahead. The 48 hours start 12:01 AM the next day and skip weekends and state holidays (2026 law).'), None, None,
    18, 'Marks within 18 inches of the facility; keep 18 inches between marks and machine teeth.', None, None, None,
    [{'what': '2026 SB 9 (SDCL 49-7A-5, -8)', 'url': 'https://mylrc.sdlegislature.gov/api/Documents/300764.pdf'}], level='partial',
    note='We could not confirm how long a South Dakota ticket lasts. Check South Dakota 811.')

row('TN', [C('Tennessee 811', 'https://www.tenn811.com')],
    N(3, 'wd', 'Call at least 3 and not more than 10 full working days before digging.'),
    L(15, 'cd', 'dig', 'A notice is good for 15 calendar days from the start date. The app counts from the first legal dig day.'),
    'Give a new notice at least 3 working days before day 15 if work goes on.', None, None, 'required',
    'Mark the area with white stakes, white paint or electronic white lining unless an exception applies.', None,
    [{'what': 'Tenn. Code 65-31-106', 'url': 'https://codes.findlaw.com/tn/title-65-public-utilities-and-carriers/tn-code-sect-65-31-106/'}],
    start=S(10, 'wd', 'Call no more than 10 full working days before work starts.'), osha_name='TOSHA (Tennessee state plan)', level='partial')

row('VT', [C('Dig Safe', 'https://www.digsafe.com')],
    N(3, 'wd', 'Call at least 72 hours before digging, not counting weekends and holidays.'),
    L(30, 'cd', 'call', 'Tickets expire 30 days from the day they are issued.'),
    'Renew only if work will happen within 30 days.',
    18, 'The facility width plus 18 inches each side.', 'required', 'Premark the dig area in white before you call (digs over 500 ft are exempt).',
    'Emergency notice the same day.',
    [{'what': 'Dig Safe excavator manual (Oct 2024)', 'url': 'https://digsafe.com/data/file_uploads/DGS Excavator Manual OCTOBER 2024 WEB.pdf'},
     {'what': 'Dig Safe FAQ', 'url': 'https://digsafe.com/faqs'}], osha_name='VOSHA (Vermont state plan)', level='center')

row('VA', [C('VA811', 'https://va811.com')], None,
    L(15, 'wd', 'call', 'A notice is good for 15 working days from 7 AM the next working day (or the scheduled date if later).'),
    'Ask for a remark 3 working days before the end, or when marks fade. A remark adds 15 working days.',
    None, None, 'conditional', 'Mark the route or site with white paint when a location can’t be given.', None,
    [{'what': 'Va. Code 56-265.17', 'url': 'https://law.lis.virginia.gov/vacode/56-265.17/'}], osha_name='VOSH (Virginia state plan)', level='partial',
    note='Virginia: dig only after every operator has marked or posted a positive response.')

row('WV', [C('WV811', 'https://wv811.com')],
    N(2, 'wd', 'Give notice at least 48 hours (not weekends or holidays) and not more than 10 work days before digging.'), None, None,
    None, None, None, None, 'A break or leak that causes an emergency: call 911 right away.',
    [{'what': 'W. Va. Code 24C-1-5', 'url': 'https://code.wvlegislature.gov/24C-1-5/'}],
    start=S(10, 'wd', 'Give notice no more than 10 work days before work starts.'), level='partial')

row('WI', [C('Diggers Hotline', 'https://www.diggershotline.com')],
    N(3, 'wd', 'Give notice at least 3 working days before digging.'), None,
    'No set ticket life. Give a new notice if marks are lost, or work doesn’t start within 10 days of the scheduled start, or stops more than 10 days.',
    18, 'Keep 18 inches between a mark and the machine’s cutting edge.', None, None, 'In an emergency, take all reasonable care and notify owners as soon as you can.',
    [{'what': 'Wis. Stat. 182.0175', 'url': 'https://docs.legis.wisconsin.gov/statutes/statutes/182/0175/2?up=1'}], level='partial')

row('WY', [C('Wyoming 811', 'https://www.onecallofwyoming.com')],
    N(2, 'wd', 'Call at least 2 full business days and not more than 14 business days before digging.'),
    L(14, 'wd', 'call', 'For longer jobs, renew the notice at least once every 14 business days.'),
    'Renew every 14 business days.',
    24, 'Marks within 24 inches of the facility.', None, None, 'Emergency digging is exempt from the time limits.',
    [{'what': 'W.S. 37-12-302', 'url': 'https://law.counselstack.com/statute/wy/37-12-302'}],
    start=S(14, 'wd', 'Call no more than 14 business days before work starts.'), osha_name='Wyoming OSHA (state plan)')

# ---------------- OSHA plan and trench depth for every row ----------------
for code, r in R.items():
    plan = 'state' if code in FULL_PLAN else 'public' if code in PUBLIC_ONLY else 'federal'
    r['osha'] = plan
    r['sources'].append({'what': 'OSHA: approved state plans', 'url': OSHA_PLANS})
    if not r['trench']:
        if plan in ('federal', 'public'):
            r['trench'] = {'ft': 5, 'text': 'Federal OSHA covers private crews here: protective system from 5 ft (29 CFR 1926.652).'}
        else:
            r['trench'] = {'ft': None, 'text': 'State OSHA plan. Federal OSHA’s 5 ft rule is the floor; we have not checked whether this plan is stricter.'}
    if r['trench']['ft'] == 5 and not any('1926.652' in s['url'] for s in r['sources']):
        r['sources'].append({'what': '29 CFR 1926.652 (protective systems)', 'url': FED652})
    if not any(s['url'] == DIR for s in r['sources']):
        r['sources'].append({'what': 'One-call center directory, March 2026 (cross-check of center names)', 'url': DIR})
    if plan == 'public' and not r['osha_name']:
        r['osha_name'] = 'Federal OSHA for private employers (state plan covers public workers only)'
    if plan == 'federal' and not r['osha_name']:
        r['osha_name'] = 'Federal OSHA'

assert len(R) == 51, len(R)
out = {'version': '2026-11-19', 'checked': CHECKED, 'recheck_by': '2027-11-19',
       'note': 'Rules change. Re-check every row once a year. A null value means we could not confirm it.',
       'states': [R[k] for k in sorted(R, key=lambda c: NAMES[c])]}
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'state_rules.json')
json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('wrote', dst, len(R), 'rows')
