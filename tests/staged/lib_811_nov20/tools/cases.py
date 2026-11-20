# lib_811_nov20/tools/cases.py -> ../cases_811.jsonl  (eval cases for the 811 library; 3+ per state). Run: python3 cases.py
import json, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cases_811.jsonl')
CITY = {'AL':'Birmingham','AK':'Anchorage','AZ':'Phoenix','AR':'Little Rock','CA':'Fresno','CO':'Denver','CT':'Hartford','DE':'Dover','DC':'Washington','FL':'Orlando','GA':'Atlanta','HI':'Honolulu','ID':'Boise','IL':'Springfield','IN':'Indianapolis','IA':'Des Moines','KS':'Wichita','KY':'Louisville','LA':'Baton Rouge','ME':'Portland','MD':'Baltimore','MA':'Worcester','MI':'Lansing','MN':'St. Cloud','MS':'Jackson','MO':'Columbia','MT':'Billings','NE':'Omaha','NV':'Reno','NH':'Concord','NJ':'Trenton','NM':'Albuquerque','NY':'Albany','NC':'Raleigh','ND':'Bismarck','OH':'Columbus','OK':'Tulsa','OR':'Salem','PA':'Harrisburg','RI':'Providence','SC':'Columbia','SD':'Sioux Falls','TN':'Nashville','TX':'Houston','UT':'Provo','VT':'Burlington','VA':'Richmond','WA':'Tacoma','WV':'Charleston','WI':'Madison','WY':'Casper'}
QW = "How many days before we dig do I have to call 811?"
QL = "How long is my 811 ticket good for?"
QT = "How close to the locate marks can I dig with the excavator?"
QH = "We just nicked a gas line with the bucket. What do we do?"
QF = "What's the fine for digging without calling 811?"
NC_ = "not confirmed|could(n't| not) confirm|can't confirm|check with|ask |go by"
# state: list of (question, kind, must[], lead[], mustnot[], chunk tag)
D = {
 'CA': [(QL,'simple',['28 (calendar )?days'],['28'],['30 days','45 days'],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)|two feet','hand'],['24|2 ?(ft|feet)|two feet'],['18 ?in'],'overview'), (QF,'rule',['10,000','50,000'],['10,000'],[],'penalties'), ("Do I have to tell 811 after we hit a line?",'rule',['48 hours'],['48 hours|yes'],[],'damage')],
 'AZ': [(QL,'simple',['15 working days'],['15 working'],['28 days'],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand'],['24|2 ?(ft|feet)'],[],'overview'), (QF,'simple',['5,000'],['5,000'],[],'overview'), ("Can I backfill the hole after we hit a line?",'rule',['open|not|don\'t','operator'],['no|not|leave'],[],'damage')],
 'NV': [(QL,'simple',['28 (calendar )?days'],['28'],['45 days'],'overview'), ("How many times can I renew my ticket?",'rule',['two|twice|2','new (ticket|notification)'],['two|twice|2'],[],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand'],['24|2 ?(ft|feet)'],[],'overview'), (QF,'rule',[NC_],[],['\\$10,000','\\$5,000'],'damage')],
 'TX': [(QL,'simple',['14 (working|business) days'],['14 (working|business)'],['28 days'],'overview'), ("The gas company never marked and never responded. Can I dig?",'rule',['second (notice|call)','4 hours|four hours'],['second'],[],'tickets'), ("We hit a gas main. How fast do we have to report it?",'rule',['1 hour|one hour','911'],['hour|911'],[],'damage'), (QT,'rule',['18 ?(in|")','hand|soft|vacuum'],['18'],['24 in'],'marks')],
 'FL': [(QL,'simple',['30 (calendar )?days'],['30'],['28 days'],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand|soft|vacuum|pot ?hol'],['24|2 ?(ft|feet)'],['18 in'],'overview'), (QF,'rule',['500','2,500'],['500'],[],'overview'), (QW,'simple',['2 (full )?business days|two (full )?business days'],['2|two'],['3 (business|working) days'],'overview')],
 'WA': [(QL,'simple',['45 (calendar )?days'],['45'],['28 days','30 days'],'overview'), ("Can I start digging if one utility hasn't responded yet?",'rule',['positive response'],['no|not|wait'],[],'overview'), (QW,'simple',['2 (full )?business days|two (full )?business days','10'],['2|two'],[],'overview'), ("Do I have to report a hit to the state?",'rule',['45 days','UTC|Utilities and Transportation'],['yes|45'],[],'overview')],
 'OR': [(QL,'rule',['30','45'],['30'],[],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand|non-?invasive|vacuum'],['24|2 ?(ft|feet)'],['18 in'],'overview'), ("Can I renew my ticket?",'rule',['new (locate )?(request|ticket)'],['no|new'],[],'tickets'), (QW,'simple',['2 (full )?business days|two (full )?business days','10'],['2|two'],[],'overview')],
 'CO': [(QL,'simple',['30 (calendar )?days'],['30'],['28 days'],'overview'), (QT,'rule',['18 ?(in|")','hand|vacuum|non-?destructive'],['18'],['24 in'],'overview'), ("A utility hasn't posted a positive response. Now what?",'rule',['re-?notif'],['re-?notif'],[],'overview'), (QW,'simple',['2 (full )?business days|two (full )?business days'],['2|two'],[],'overview')],
 'UT': [(QL,'simple',['21 (calendar )?days'],['21'],['28 days'],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand'],['24|2 ?(ft|feet)'],[],'overview'), ("When do I have to renew my ticket?",'rule',['48 hours','7 (calendar )?days'],['48 hours'],[],'overview'), (QF,'rule',['5,000','100,000'],['5,000'],[],'damage')],
 'GA': [(QL,'simple',['30 (calendar )?days'],['30'],['28 days'],'overview'), ("How many times can I update my ticket?",'rule',['two|twice|2','[Ll]arge [Pp]roject|90 days'],['two|twice|2'],[],'overview'), (QT,'rule',['18 ?(in|")','hand|vacuum|pot ?hol|soft'],['18'],['24 in'],'overview'), (QF,'simple',['10,000'],['10,000'],[],'overview')],
 'NC': [(QL,'simple',['28 (calendar )?days'],['28'],['30 days'],'overview'), (QW,'simple',['3 (full )?working days|three (full )?working days'],['3|three'],['2 (working|business) days'],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','see|expos|visual|hand'],['24|2 ?(ft|feet)|no'],['18 in'],'overview'), (QF,'simple',['2,500'],['2,500'],[],'damage')],
 'NY': [(QW,'simple',['2|two','10|ten','working days'],['2|two'],[],'overview'), (QL,'rule',['no (ticket )?expir|no set|does(n\'t| not) expire|10 working days|ten working days'],[],['28 days','30 days'],'overview'), (QT,'rule',['2 ?(ft|feet)|two feet|24 ?(in|")','hand'],['2 ?(ft|feet)|two feet|24'],[],'overview'), (QF,'rule',['4,375'],['4,375'],[],'damage')],
 'PA': [(QW,'simple',['3|three','10|ten','business days'],['3|three'],[],'overview'), (QT,'rule',['18 ?(in|")|eighteen','hand|test hole|vacuum|prudent'],['18|eighteen'],['24 in'],'overview'), (QL,'rule',[NC_],[],['28 days','30 days'],'overview'), (QF,'rule',['2,500','50,000'],['2,500'],[],'damage')],
 'IL': [(QL,'simple',['25 days'],['25'],['28 days','30 days'],'overview'), (QT,'rule',['18 ?(in|")|1\\.5 ?(ft|feet)|one and one-half','hand|vacuum'],['18|1\\.5|one and one-half'],['24 in'],'overview'), ("What color do I pre-mark with when there is snow on the ground?",'simple',['black'],['black'],['pink'],'marks'), (QW,'simple',['2 days|two days|2 (business|working) days','10'],['2|two'],[],'overview')],
 'OH': [(QW,'simple',['2 working days|two working days','16'],['2|two'],[],'overview'), (QT,'rule',['18 ?(in|")','hand|vacuum|pot ?hol'],['18'],['24 in'],'overview'), (QL,'rule',['no (ticket )?expir|not confirmed|no set|doesn\'t give|gives no|remark'],[],['28 days','30 days'],'overview'), (QH,'steps',['911','OHIO811|811|utility'],['safe|away|stop|911'],["you can (go in|enter)"],'damage')],
 'MI': [(QL,'simple',['21 days','180'],['21'],['28 days'],'overview'), (QT,'rule',['48 ?(in|")|4 ?(ft|feet)','soft|hand|vacuum|expos'],['48|4 ?(ft|feet)'],['24 in','18 in'],'overview'), (QW,'simple',['72 hours|3 business days','14'],['72|3'],[],'overview'), ("Can I renew my MISS DIG ticket?",'rule',['new ticket','180'],['no|new'],[],'tickets')],
 'DE': [(QL,'simple',['12 business days'],['12'],['28 days'],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand|vacuum'],['24|2 ?(ft|feet)|no'],[],'overview'), (QW,'simple',['3 business days|three business days','12'],['3|three'],[],'overview')],
 'DC': [(QL,'simple',['15 days'],['15'],['28 days'],'overview'), (QW,'simple',['96 hours','10 days'],['96'],[],'overview'), (QT,'rule',['18 ?(in|")','hand'],['18|2 ?(ft|feet)'],[],'overview')],
 'VA': [(QL,'simple',['15 working days'],['15'],['28 days'],'overview'), (QW,'rule',['48 hours','7(:00)? ?a\\.?m'],['48|third|3'],[],'overview'), ("Does my ticket number change when I update it?",'simple',['new (request |ticket )?number'],['yes|new'],[],'overview'), (QF,'rule',[NC_],[],['\\$10,000'],'overview')],
 'WV': [(QW,'simple',['48 hours|forty-eight hours','10|ten'],['48|forty-eight'],[],'overview'), (QL,'rule',[NC_],[],['28 days','30 days'],'overview'), (QF,'simple',['5,000'],['5,000'],[],'overview')],
 'MD': [(QL,'simple',['12 (full )?business days'],['12'],['28 days'],'overview'), (QW,'simple',['3 business days|three business days'],['3|three'],[],'overview'), (QT,'rule',[NC_+'|18 ?(in|")'],[],['24 in'],'overview')],
 'NJ': [(QL,'simple',['45 business days'],['45'],['28 days'],'overview'), (QW,'simple',['3 business days|three business days'],['3|three'],[],'overview'), (QH,'steps',['911','operator|One-?Call'],['911'],[],'damage')],
 'MA': [(QL,'simple',['30 days'],['30'],['28 days','60 days'],'overview'), (QW,'simple',['72 hours'],['72'],[],'overview'), (QT,'rule',['18 ?(in|")','hand|vacuum'],['18'],['24 in'],'overview'), (QF,'simple',['1,000'],['1,000'],[],'damage')],
 'NH': [(QL,'simple',['30 days'],['30'],['28 days','60 days'],'overview'), (QW,'simple',['72 hours'],['72'],[],'overview'), (QF,'simple',['500','5,000'],['500'],[],'damage')],
 'VT': [(QL,'simple',['30 days'],['30'],['28 days','60 days'],'overview'), (QW,'simple',['72 hours'],['72'],[],'overview'), (QT,'rule',['18 ?(in|")','hand|vacuum'],['18'],['24 in'],'overview')],
 'RI': [(QL,'rule',['do(es)? not expire|don\'t expire|no expir','marks'],['not expire|don\'t expire|no expir'],['30 days from'],'overview'), (QW,'simple',['72 hours'],['72'],[],'overview'), (QF,'simple',['350','2,500'],['350'],[],'damage')],
 'ME': [(QL,'simple',['60 (calendar )?days'],['60'],['28 days'],'overview'), (QT,'rule',['18 ?(in|")','expos|hand|vacuum'],['18'],['24 in'],'marks'), (QW,'simple',['72 hours|3 business days|three business days'],['72|3|three'],[],'overview')],
 'CT': [(QW,'simple',['2 (full )?days|two full days','30'],['2|two'],[],'overview'), (QT,'rule',[NC_],[],['24 in'],'overview'), ("We forgot to call 811. Can we call it an emergency ticket?",'simple',['not an emergency|no'],['no|not'],[],'overview')],
 'KS': [(QL,'simple',['20 calendar days'],['20'],['15 days','28 days'],'overview'), (QW,'simple',['2 (full )?working days|two full working days'],['2|two'],[],'overview'), (QT,'rule',[NC_+'|24 ?(in|")'],[],[],'overview')],
 'TN': [(QL,'simple',['15 calendar days'],['15'],['28 days'],'overview'), (QW,'simple',['3 working days|three working days|3 \\(?three|three \\(3\\)'],['3|three'],[],'overview'), ("Do I get a new ticket number when I renew?",'simple',['new ticket number|new number'],['yes|new'],[],'overview')],
 'AL': [(QL,'simple',['20 working days'],['20'],['28 days'],'overview'), (QW,'simple',['2|two','10','working days'],['2|two'],[],'overview'), (QT,'rule',['18 ?(in|")','2027'],['18'],['24 in'],'overview'), (QF,'rule',['500','10,000'],['500'],[],'damage')],
 'NE': [(QT,'rule',['18 ?(in|")','hand'],['18'],['24 in'],'overview'), ("How soon do I have to start after I call in a ticket?",'simple',['17|seventeen'],['17|seventeen'],[],'overview'), (QF,'rule',['5,000','10,000'],['5,000|10,000'],[],'overview')],
 'MO': [(QW,'simple',['2|two','10|ten','working days'],['2|two'],[],'overview'), (QL,'rule',['expiration date|not confirmed|on the ticket'],[],['28 days'],'overview'), ("The locator missed a line. How long does the utility have to fix the marks?",'simple',['2 hours|two hours'],['2 hours|two hours'],[],'overview')],
 'IN': [(QL,'simple',['20 days'],['20'],['28 days'],'overview'), (QW,'simple',['2 (full )?working days|two \\(2\\) full working days|two full working days'],['2|two'],[],'overview'), ("Can I dig on a Joint Meet ticket?",'simple',['not|no'],['no|not'],[],'overview')],
 'KY': [(QL,'simple',['21 (calendar )?days'],['21'],['28 days'],'overview'), (QW,'simple',['2|two','10|ten','working days'],['2|two'],[],'overview'), ("A utility never responded to my ticket. What now?",'rule',['second notice'],['second notice'],[],'overview'), (QF,'rule',[NC_],[],['\\$10,000'],'damage')],
 'ID': [(QW,'simple',['2|two','10|ten','business days'],['2|two'],[],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand'],['24|2 ?(ft|feet)'],['18 in'],'overview'), (QL,'simple',['4 (consecutive )?weeks|four'],['4|four'],['28 calendar'],'overview'), ("How deep can I dig on private property without calling 811?",'simple',['15 inches'],['15'],['12 inches'],'tickets')],
 'AK': [(QW,'simple',['2|two','15','working days'],['2|two'],[],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand|vacuum'],['24|2 ?(ft|feet)'],[],'overview'), ("What color do I mark my dig area with when there's snow?",'simple',['black'],['black'],['pink'],'overview')],
 'NM': [(QL,'simple',['15 working days'],['15'],['28 days'],'overview'), (QT,'rule',['18 ?(in|")','hand|non-?mechanical|vacuum'],['18'],['24 in'],'overview'), ("Can I leave the site after we hit a line?",'rule',['not|until|stay','responder|operator'],['no|not|stay'],[],'overview')],
 'MN': [(QL,'simple',['14 (calendar )?days'],['14'],['28 days'],'overview'), (QW,'simple',['48 hours'],['48'],[],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand|vacuum'],['24|2 ?(ft|feet)'],['18 in'],'overview')],
 'SC': [(QL,'simple',['15 working days'],['15'],['28 days'],'overview'), (QW,'simple',['3 (full )?working days|three full working days'],['3|three'],[],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)','hand|vacuum|see'],['24|2 ?(ft|feet)|no'],['18 in'],'overview'), (QF,'rule',[NC_],[],['\\$10,000'],'tickets')],
 'OK': [(QL,'simple',['14 (calendar )?days'],['14'],['28 days'],'overview'), (QW,'simple',['48 hours'],['48'],[],'overview'), (QT,'rule',['2 ?(ft|feet)|two feet|24 ?(in|")','hand'],['2 ?(ft|feet)|two feet|24|hand'],[],'overview')],
 'IA': [(QL,'simple',['25 (calendar )?days'],['25'],['28 days'],'overview'), (QW,'simple',['48 hours|forty-eight'],['48|forty-eight'],[],'overview'), (QT,'rule',['18 ?(in|")','hand|vacuum'],['18'],['24 in'],'overview'), (QF,'rule',['10,000','1,000'],['10,000|1,000'],[],'tickets')],
 'LA': [(QL,'simple',['20 (calendar )?days'],['20'],['28 days'],'overview'), (QW,'simple',['48 hours'],['48'],[],'overview'), (QF,'rule',[NC_],[],['\\$10,000'],'overview')],
 'MS': [(QL,'simple',['20 calendar days'],['20'],['14 calendar days from','28 days'],'overview'), (QT,'rule',['18 ?(in|")','hand|vacuum|non-?invasive'],['18'],['24 in'],'overview'), (QW,'rule',[NC_],[],[],'overview')],
 'SD': [(QW,'simple',['48 hours|forty-eight'],['48|forty-eight'],[],'overview'), (QT,'rule',['18 ?(in|")|eighteen','hand|non-?invasive'],['18|eighteen'],['24 in'],'overview'), (QL,'rule',[NC_],[],['28 days','30 days'],'overview')],
 'WY': [(QW,'simple',['2|two','14','business days'],['2|two'],[],'overview'), ("How often do I have to renew my locate on a long job?",'simple',['14 business days'],['14'],[],'overview'), (QH,'steps',['911','operator'],['911'],[],'overview')],
 'HI': [(QW,'simple',['5 working days|five working days','28'],['5|five'],[],'overview'), (QL,'simple',['28 (calendar )?days'],['28'],[],'overview'), (QT,'rule',[NC_],[],['24 in','18 in'],'overview')],
 'ND': [(QL,'simple',['21 (calendar )?days'],['21'],['28 days'],'overview'), (QW,'simple',['48 hours'],['48'],[],'overview'), (QT,'rule',['24 ?(in|")|2 ?(ft|feet)|two feet','hand'],['24|2 ?(ft|feet)|two feet'],['18 in'],'overview')],
 'AR': [(QL,'simple',['20 working days'],['20'],['28 days'],'overview'), (QW,'simple',['2|two','10|ten','working days'],['2|two'],[],'overview'), (QT,'rule',[NC_],[],['24 in','18 in'],'overview')],
 'MT': [(QL,'rule',[NC_],[],['28 days','30 days','14 days'],'overview'), (QW,'rule',[NC_],[],['2 (business|working) days'],'overview'), (QH,'steps',['911','operator|owner|utility'],['911|away|stop'],[],'overview')],
 'WI': [(QW,'simple',['3 working days|three working days'],['3|three'],[],'overview'), (QT,'rule',['18 ?(in|")'],['18'],['24 in'],'overview'), (QL,'rule',['no set|10 days|no (ticket )?expir'],[],['28 days','30 days'],'overview')],
}
import re
CH = {}
for fn in ('lib_811_dig.jsonl',):
    for l in open(os.path.join(os.path.dirname(OUT), fn)):
        c = json.loads(l); CH.setdefault(c['state'], []).append(c)
def also(st, must, first):
    # every chunk of the state whose own text holds all the must-facts also counts as the answer chunk
    out = [first]
    for c in CH.get(st, []):
        if c['id'] != first and all(re.search(m, c['title'] + ' ' + c['text'], re.I) for m in must): out.append(c['id'])
    return out
rows = []
for st, lst in D.items():
    for i, (q, kind, must, lead, mustnot, tag) in enumerate(lst, 1):
        r = {"id": f"lib-{st.lower()}-dig-{i}", "cat": "locate", "q": q, "where": f"{CITY[st]}, {st}", "level": "foreman" if 'fine' in q else "pipelayer",
             "kind": kind, "must": must, "lead": (lead or must[:1]), "mustnot": mustnot, "chunks": also(st, must, f"dig-{st.lower()}-{tag}-1"), "state_strict": True}
        rows.append(r)
US = [
 {"id":"lib-us-dig-1","cat":"locate","q":"What do the paint colors from the locators mean?","where":"Kansas City, MO","level":"pipelayer","kind":"rule","must":["red","yellow","blue","green","orange"],"lead":["red|yellow"],"mustnot":[],"chunks":["std-apwa-color-code-1"]},
 {"id":"lib-us-dig-2","cat":"locate","q":"What does purple paint on the ground mean?","where":"Tucson, AZ","level":"pipelayer","kind":"simple","must":["reclaimed|irrigation|slurry"],"lead":["reclaimed|irrigation|slurry"],"mustnot":[],"chunks":["std-apwa-color-code-1"]},
 {"id":"lib-us-dig-3","cat":"locate","q":"Is there a federal rule about hitting a gas pipeline while digging?","where":"Cheyenne, WY","level":"foreman","kind":"rule","must":["49 CFR (Part )?196","911"],"lead":["yes|196"],"mustnot":[],"chunks":["fed-phmsa-excavator-196-1"]},
 {"id":"lib-us-dig-4","cat":"locate","q":"We only scraped the coating on a gas pipe, no leak. Do we have to report it?","where":"Boise, ID","level":"pipelayer","kind":"rule","must":["operator|owner","report|notify|call|tell"],"lead":["yes"],"mustnot":["no need","don't need to report"],"chunks":["fed-phmsa-excavator-196-1","dig-id-overview-1"]},
]
with open(OUT, 'w') as f:
    for r in rows + US: f.write(json.dumps(r) + '\n')
import collections
c = collections.Counter(r['where'][-2:] for r in rows)
print(len(rows) + len(US), 'cases;', len(c), 'states; min per state', min(c.values()), '; unconfirmed-type', sum(1 for r in rows if 'not confirmed' in r['must'][0]))
