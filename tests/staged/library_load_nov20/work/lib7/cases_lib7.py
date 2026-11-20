# lib7 eval cases: follow-through (2 turns), strictest rule, recurring misses. python3 cases_lib7.py -> cases_lib7.json
# FU: 'all' = facts the two turns together must contain (the offered table/list delivered); turn 2 must not say it lacks the part, not restart.
import json
FT = 'ft|feet|foot|\''
FU = [
 ('fu7-01', 'What slope do I cut in Type B soil, and what are my options instead of sloping?', 'Phoenix, AZ', 'pipelayer', 'yes please', ['1 ?(to|:) ?1', 'bench', f'4 ?({FT})']),
 ('fu7-02', 'Can we bench a trench in Type C soil, and what are the benching rules?', 'Dallas, TX', 'pipelayer', 'ok go ahead', ['Type C', f'4 ?({FT})', f'5 ?({FT})|Type A']),
 ('fu7-03', 'How do I size timber shoring for a 10 foot deep trench in Type B soil?', 'Columbus, OH', 'foreman', 'yes', ['C-1\\.2|Table C', 'cross ?brace', 'upright|wale']),
 ('fu7-04', 'How do I set up hydraulic shores in an 8 foot trench in Type C soil?', 'Denver, CO', 'foreman', 'sure', ['D-1\\.3|Table D|Appendix D', 'sheeting|plywood', 'spacing|apart|on center']),
 ('fu7-05', 'How do I set up a lane closure on a 45 mph two-lane road for a sewer tie-in?', 'Tulsa, OK', 'foreman', 'yes', ['flagger', 'taper', 'sign']),
 ('fu7-06', 'What sign spacing do I need for a work zone on a 55 mph highway?', 'Little Rock, AR', 'foreman', 'keep going', ['500|1,?000|1,?500', 'taper|660', 'buffer|495']),
 ('fu7-07', 'How long does the merging taper have to be for a lane closure on a 40 mph road with 12 foot lanes?', 'Boise, ID', 'foreman', 'yes', ['320', 'cone|channeliz|spacing']),
 ('fu7-08', 'We have to close the sidewalk for the trench. What do we have to do for people walking?', 'Minneapolis, MN', 'foreman', 'yes', ['detour|alternate|route', 'accessib|ADA|wheelchair|60 ?(in|inch)|4 ?ft|48', 'barricade|channeliz|edge']),
 ('fu7-09', 'Where do the flaggers go and what signs do we need for one-lane flagging on a 35 mph road?', 'Raleigh, NC', 'foreman', 'go on', ['Flagger', '250|stopping sight', 'shoulder|closed lane|escape']),
 ('fu7-10', 'What are the steps to issue a confined space entry permit for a manhole?', 'Columbus, OH', 'foreman', 'go on', ['attendant', 'retriev|rescue', 'test|monitor', 'cancel|sign|entry supervisor']),
 ('fu7-11', 'What has to be on a confined space entry permit?', 'Atlanta, GA', 'foreman', 'sure', ['hazard', 'attendant|entrant', 'test result|readings|monitor', '1 year|one year|retain|keep']),
 ('fu7-12', 'What order do we test the air in a manhole, and what are the limits?', 'Detroit, MI', 'foreman', 'yes', ['oxygen', 'flammable|LEL', '19\\.5', '10 ?%']),
 ('fu7-13', 'How do we set up rescue for a sewer manhole entry?', 'Nashville, TN', 'foreman', 'more', ['retriev', 'harness', 'rescue service|rescue team', 'tripod|mechanical|winch']),
 ('fu7-14', 'How do I renew my 811 ticket when the job runs long?', 'Las Vegas, NV', 'foreman', 'yes', ['28', 'two extensions|2 extensions|two renewals|more than two', 'new (ticket|notification)']),
 ('fu7-15', 'Our Texas811 ticket is about to run out and we are not done. What do we do?', 'Houston, TX', 'foreman', 'go ahead', ['14 working days', 'update|refresh', '30 days']),
 ('fu7-16', 'How do I bed PVC sewer pipe in the trench?', 'Reno, NV', 'pipelayer', 'yes', ['bedding', '4|6', 'haunch', 'bell hole|compact']),
 ('fu7-17', 'How do I pressure test a new PVC water main?', 'Omaha, NE', 'foreman', 'yeah', ['1\\.5|150', '2 hours|two hours', 'leakage|allowable']),
 ('fu7-18', 'How do I disinfect a new water main before it goes in service?', 'Boise, ID', 'foreman', 'more', ['25 ?mg', '24 hours', 'bac-?T|bacteri', 'flush']),
 ('fu7-19', 'What do we have to do for heat on a trench crew in summer?', 'Bakersfield, CA', 'foreman', 'yes', ['80', '95', 'shade', 'water|quart']),
 ('fu7-20', 'How do I pick a trench box for a 12 foot deep sewer trench?', 'Nashville, TN', 'foreman', 'yes', ['tabulated|manufacturer', '18 ?in|2 ?(ft|feet)', 'depth|deeper']),
 ('fu7-21', 'What are all the trench rules for a 6 foot deep trench?', 'Orlando, FL', 'foreman', 'yes', [f'25 ?({FT})', f'2 ?({FT})', 'daily|each shift|inspect', 'protective system|slope|shor|box']),
 ('fu7-22', 'We are cutting concrete pipe with a saw. What does the silica rule want us to do?', 'Chicago, IL', 'foreman', 'yes', ['water', 'respirator|APF', 'Table 1|1926\\.1153']),
 ('fu7-23', 'How close can the excavator work to an overhead power line?', 'Atlanta, GA', 'foreman', 'go on', [f'20 ?({FT})', f'10 ?({FT})', '50 ?kV', 'spotter|dedicated|insulat|barrier']),
 ('fu7-24', 'What do I need to do for the SWPPP on the job?', 'Denver, CO', 'office', 'yes', ['inspect', '7 (calendar )?days|14', '0\\.25', 'corrective']),
 ('fu7-25', 'How do I set up traffic control for night work on a pipe job?', 'Phoenix, AZ', 'foreman', 'yes', ['illuminat|light', 'retroreflect', 'Class 3|vest|apparel']),
 ('fu7-26', 'How do I figure the thrust block for a 90 degree bend on an 8 inch water main?', 'Fresno, CA', 'foreman', 'sure', ['bearing', 'psf|lb', 'undisturbed|against']),
 ('fu7-27', 'What does the competent person have to do on an excavation?', 'Tulsa, OK', 'foreman', 'go on', ['classif', 'inspect', 'remov|pull|out']),
]
ST = [  # strictest rule: (id, q, where, level, must, mustnot, lead, which)
 ('st7-01', 'At what depth do I need shoring or a trench box?', 'Spokane, WA', 'pipelayer', [f'4 ?({FT})', 'stricter|federal|5 ?(ft|feet)'], [], [f'4 ?({FT})'], 'state stricter'),
 ('st7-02', 'Can we cut Type A at 1/2 to 1 since the trench is 10 feet deep and only open one day?', 'Tacoma, WA', 'pipelayer', ['3/4|0\\.75|three.quarter'], ['^\\s*yes'], ['\\bno\\b|not|3/4|0\\.75'], 'state stricter'),
 ('st7-03', 'How fast do I have to report a worker admitted to the hospital?', 'Salt Lake City, UT', 'foreman', ['8 ?(hours|hrs|h)\\b'], [], ['8 ?(hours|hrs|h)\\b'], 'state stricter'),
 ('st7-04', 'What CO reading on the gas meter is too high for a manhole entry?', 'Fresno, CA', 'foreman', ['25 ?ppm'], [], ['25 ?ppm'], 'state stricter'),
 ('st7-05', 'At what temperature do we have to put up shade for the crew?', 'Bakersfield, CA', 'foreman', ['80'], [], ['80'], 'state stricter (no federal rule)'),
 ('st7-06', 'What is the minimum wage I have to pay a new laborer?', 'Savannah, GA', 'office', ['7\\.25'], ['(pay|is) \\$?5\\.15(?! for)'], ['7\\.25'], 'federal stricter'),
 ('st7-07', 'What is the minimum wage for a laborer on our job?', 'Casper, WY', 'office', ['7\\.25'], ['(pay|is) \\$?5\\.15(?! for)'], ['7\\.25'], 'federal stricter'),
 ('st7-08', 'At what depth do I need shoring or a trench box?', 'Phoenix, AZ', 'pipelayer', [f'5 ?({FT})'], [f'\\b4 ?(ft|feet) (deep|or deeper)'], [f'5 ?({FT})'], 'equal'),
 ('st7-09', 'How far apart do the ladders have to be in the trench?', 'Reno, NV', 'pipelayer', [f'25 ?({FT})'], [], [f'25 ?({FT})'], 'equal'),
 ('st7-10', 'After how many hours a week do I owe overtime?', 'Houston, TX', 'office', ['40'], [], ['40'], 'equal (federal only)'),
 ('st7-11', 'At what depth do I need shoring or a trench box?', 'Oakland, CA', 'pipelayer', [f'5 ?({FT})', 'permit'], [], [f'5 ?({FT})'], 'equal depth; state adds a permit'),
 ('st7-12', 'What is the minimum wage for laborers on our job?', 'Seattle, WA', 'office', ['17\\.13|21\\.30'], [], ['17\\.13|21\\.30'], 'state stricter'),
]
RE = ['lib-us-osha-62', 'lib-us-mutcd-40', 'lib-us-mutcd-55', 'lib-us-fed-17', 'lib-us-mutcd-15', 'lib-us-osha-12', 'lib-mt-dig-1', 'lib-ny-sp-1', 'lib-us-fed-9', 'lib-ut-sp-1', 'lib-in-dig-2']
OLD = ['tr12', 'tr14', 'ct4', 'nw12', 'ph08', 'brk1', 'wa3']
json.dump({'fu': [dict(id=a, q=b, where=c, level=d, reply=e, all=f) for a, b, c, d, e, f in FU],
           'st': [dict(id=a, q=b, where=c, level=d, must=e, mustnot=f, lead=g, which=h) for a, b, c, d, e, f, g, h in ST],
           're': RE, 'old': OLD}, open(__file__.replace('.py', '.json'), 'w'), indent=0)
print(len(FU), len(ST), len(RE), len(OLD))
