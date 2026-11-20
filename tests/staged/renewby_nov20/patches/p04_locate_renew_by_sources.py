#!/usr/bin/env python3
# renewby_nov20: the Renew-by table after the Nov 20 "find the renew-by deadlines" research.
# Goes ON TOP of locate_round3_nov20/patches/p03_locate_renew_by.py:
#   python3 p04_locate_renew_by_sources.py in.html out.html     (in = the page with p01 + p02 + p03)
# No server change. Sources and quotes: ../NOTES.md and ../raw_findings.md.
#   named / follows from the law (no longer "not confirmed"): CT 2, IL 2, MO 2, NC 3, NM 2
#   South Carolina: an Extension can go in any time before the ticket expires -> no Renew-by line (like CA, HI, NV)
#   still the first-call wait, NOT confirmed (the rule sheet now says so): DE 3, FL 2, KS 2, SD 2, WY 2
#   Illinois: the law's "day" skips weekends and holidays -> the 25 days are working days
import sys, json

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()


def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, 'expected once, found %d: %r' % (n, a[:90])
    s = s.replace(a, b)


# ---- 1. the state rows (the JSON is re-written byte for byte except these rows)
i = s.index('const PB_SR = ') + len('const PB_SR = ')
d, n = json.JSONDecoder().raw_decode(s[i:])
orig = s[i:i + n]
dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
assert dump(d) == orig, 'the state table does not round-trip'
S = d['states']
DAY = '2026-11-20'
EST = ' The app’s Renew-by date uses the first-call wait: no source names a day.'


def row(code, src_add=(), **kw):
    r = S[code]
    for k, v in kw.items():
        assert k in r, k
        r[k] = v
    have = {x['url'] for x in r['sources']}
    r['sources'] = [{'what': w, 'url': u} for (w, u) in src_add if u not in have] + r['sources']
    r['checked'] = DAY


assert S['IL']['life'] == {'n': 25, 'unit': 'cd', 'from': 'call', 'text': 'The original notice expires after 25 days.'}, S['IL']['life']
row('CT', [('R.C.S.A. 16-345-4(d) (a ticket expires at the end of 30 days; no renewal in the rule)', 'https://d1tvxue8o4w0fl.cloudfront.net/regulation/connecticut-administrative-code/title-16-public-service-companies/excavation-near-underground-utility-facilities/section-16-345-4-responsibilities-of-excavators-and-responsible-parties')],
    renew='Past 30 days you need a new ticket. Call it in at least 2 full working days before the old one ends.')
row('IL', [('220 ILCS 50/2: “Day”, “Extension”, “Normal notice request” (text current to Jan 1, 2025)', 'https://codes.findlaw.com/il/chapter-220-utilities/il-st-sect-220-50-2/'),
           ('220 ILCS 50 (Illinois General Assembly)', 'https://ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1286')],
    life={'n': 25, 'unit': 'wd', 'from': 'call', 'text': 'A notice is good for 25 days from the request. The law’s “day” skips weekends, JULIE holidays and the day of the notice.'},
    renew='Ask JULIE for an extension before the 25 days end, and not before the 20th day. It adds 25 days to the old end date. Pre-mark again if you want new marks.')
row('MO', [('Ameren Missouri, Aug 7 2025: past 21 days “a new 811 ticket is required”', 'https://ameren.mediaroom.com/2025-08-07-Changes-to-Missouri-law-prioritize-safe-digging'),
           ('2025 SB 133, truly agreed text (319.025, 319.026)', 'https://www.senate.mo.gov/25info/pdf-bill/tat/SB133.pdf')],
    renew='Not started within 10 working days: ask for a relocate first. Past 21 days you need a new ticket: call it in at least 2 working days before the old one ends.')
row('NC', [('N.C.G.S. 87-122(a) (a later notice is given the same way as the first)', 'https://www.ncleg.net/EnactedLegislation/Statutes/HTML/ByArticle/Chapter_87/Article_8A.html')],
    renew='Past 28 days, give a new notice the same way as the first: at least 3 full working days ahead.')
row('NM', [('NM811 Pipeline Safety book 2019, p. 19 (not done in 15 working days: a new standard locate)', 'https://www.prc.nm.gov/wp-content/uploads/2021/06/NM811_ENG_Pipleline_Safety_book_2019.pdf'),
           ('18.60.5.13 NMAC (marks valid 15 working days)', 'https://regulations.justia.com/states/new-mexico/title-18/chapter-60/part-5/section-18-60-5-13')],
    renew='Not done in 15 working days: request a new locate for the work that is left, 2 working days ahead. Wide-area tickets must be reaffirmed every 15 working days.')
row('SC', [('S.C. Code 58-36-60(B) as amended, in force May 22, 2026', 'https://scstatehouse.gov/code/t58c036.php'),
           ('SC811 Excavator Web Tickets Manual, 2026 (an Extension keeps the number, adds 15 working days)', 'https://sc811.com/wp-content/uploads/2026/07/Excavator-Web-Tickets-Manual_Update-5-2026-1.pdf')],
    renew='Send an Extension any time before the ticket expires: same number, 15 more working days, no new marks. Marks gone: ask for a Remark (new number; operators have 3 full working days).')
row('DE', [('26 Del. C. 802(19), 806(a)(2) (no call-ahead named for an update)', 'https://delcode.delaware.gov/title26/c008/sc01/index.html')],
    renew='Get an update, remark or new ticket before day 13.' + EST)
row('FL', renew='Past 30 days, call in again. Leave out the areas that are finished.' + EST)
row('KS', renew='Update the notice to go on. An update is good for 20 calendar days after its own start date.' + EST)
row('SD', renew='Update the ticket before the 21 days end. No updates more than 90 days after the first start date.' + EST)
row('WY', renew='On a job longer than 14 business days, give notice again at least once every 14 business days.' + EST)
new = dump(d)
assert s.count(orig) == 1
s = s.replace(orig, new)

# ---- 2. the Renew-by table
rep("""const PB_LOC_RB = { AL: 2, AR: 2, AZ: 2, CO: 2, DC: 3, GA: 3, IA: 2, ID: 2, IN: 2, KY: 2, LA: 3, MA: 3, MD: 3, ME: 3, MI: 3, MN: 2, MS: 3, NH: 3, NJ: 3, OK: 4, OR: 2, TN: 3, TX: 2, UT: 2, VA: 3, VT: 3, WA: 2, WV: 2 };""",
    """const PB_LOC_RB = { AL: 2, AR: 2, AZ: 2, CO: 2, CT: 2, DC: 3, GA: 3, IA: 2, ID: 2, IL: 2, IN: 2, KY: 2, LA: 3, MA: 3, MD: 3, ME: 3, MI: 3, MN: 2, MO: 2, MS: 3, NC: 3, NH: 3, NJ: 3, NM: 2, OK: 4, OR: 2, TN: 3, TX: 2, UT: 2, VA: 3, VT: 3, WA: 2, WV: 2 }; /* renewby_nov20: + CT IL MO NC NM (sources: renewby_nov20/NOTES.md) */""")
rep("""const PB_LOC_RB0 = { CA: 1, HI: 1, NV: 1 },""", """const PB_LOC_RB0 = { CA: 1, HI: 1, NV: 1, SC: 1 }, /* renewby_nov20: SC811, an Extension "at any time during the life of the notice" */""")

# ---- 3. the rule sheet says when the Renew-by date is only the first-call wait
rep("""const B = pbLocRbCode(code), by = B ? ' “Renew by” on the ticket is ' + B.n + ' working days before it expires, with one day to spare.' :""",
    """const B = pbLocRbCode(code), by = B ? ' “Renew by” on the ticket is ' + B.n + ' working days before it expires, with one day to spare.' + (B.est ? ' Not confirmed with the 811 center.' : '') :""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
