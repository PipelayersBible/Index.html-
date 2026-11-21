# survey Ask cards (state_audit_nov21). python3 build_cards.py  -> lib_survey.jsonl + report + sql/
import sys; sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
from lib_kb import Batch
B = Batch('lib_survey')
D = '2026-11-20'
B.add(id='fed-ngs-survey-foot-1', state='US', tier='core',
  title='US survey foot vs international foot: does it change my grade?',
  topic='Survey units: survey foot and international foot',
  text=('No. The US survey foot is about 2 parts per million longer than the international foot (0.3048 m exactly), about 0.01 ft per mile, '
        'so a cut, a fill, a rod reading or a pipe grade over a run is not changed. Where it matters is state plane coordinates (northings and eastings in the millions of feet), '
        'where the two feet can differ by several feet. NGS, NIST and the other federal agencies deprecated the US survey foot on December 31, 2022: '
        'from January 1, 2023 it should not be used, and the next state plane system (SPCS2022) supports only the international foot. '
        'It stays in older plans and records, and some agency manuals still set up projects in survey feet, so a plan set or data file may still be in survey feet. '
        'If a coordinate file and a plan disagree by a few feet over a long distance, ask the surveyor which foot each one uses.'),
  source='Federal Register, Deprecation of the United States (U.S.) Survey Foot, 85 FR 62698 (Oct. 5, 2020), final determination',
  url='https://www.govinfo.gov/content/pkg/FR-2020-10-05/pdf/2020-21902.pdf', checked=D, edition='85 FR 62698, October 5, 2020', effective='2023-01-01',
  confidence='high', kind='summary', license='gov-us')
B.add(id='fed-ngs-vertical-datum-1', state='US', tier='core',
  title='NAVD 88 vs NGVD 29: how far apart are the elevations, and why it matters on a pipe job',
  topic='Survey: vertical datum',
  text=('Elevations are measured from a vertical datum. Most current plans use NAVD 88; older plans, old record drawings and some local agencies use NGVD 29 (also written NGVD 1929) or a city datum. '
        'NGS found NAVD 88 minus NGVD 29 heights range from about -40 cm to +150 cm across the lower 48 states (about -1.3 ft to +4.9 ft), and +94 cm to +240 cm in Alaska. '
        'So an invert from an old as-built and a benchmark on the new datum can be off by feet, while every row on the cutsheet still adds up. '
        'Before tying into existing pipe or setting up on a benchmark, check that the plans, the cutsheet and the benchmark name the same datum. '
        'If they do not, or the benchmark has no datum on it, stop and ask the surveyor or engineer for the conversion. Never convert it yourself from a rule of thumb.'),
  source='Zilkoski, Richards and Young, Results of the General Adjustment of the North American Vertical Datum of 1988, Surveying and Land Information Systems Vol. 52 No. 3 (1992), abstract (published by NGS)',
  url='https://geodesy.noaa.gov/PUBS_LIB/NAVD88/navd88report.htm', checked=D, edition='1992', confidence='high', kind='summary', license='gov-us')
B.add(id='fed-ngs-napgd2022-1', state='US', tier='shelf',
  title='New national vertical datum (NAPGD2022) replacing NAVD 88: what changes for elevations',
  topic='Survey: vertical datum',
  text=('NGS is replacing NAVD 88 with the North American-Pacific Geopotential Datum of 2022 (NAPGD2022), part of the modernized National Spatial Reference System. '
        'A NOAA summary (2019) says the new vertical datum will change heights by about 50 cm on average, with about a 1 m tilt toward the Pacific Northwest. '
        'NGS says it is rolling the new system out for public testing over 2024 to 2026, the Federal Geodetic Control Subcommittee is expected to vote on approval (likely mid 2026), '
        'and the current system stays official during the rollout; NGS stops taking new submissions to the current system after January 13, 2027. Whether approval has happened is not confirmed here. '
        'For crews: once agencies switch, new plans and old as-builts may be on different datums by a foot or more. Check the datum note on every plan sheet and benchmark.'),
  source='NGS New Datums FAQ (geodesy.noaa.gov/datums/newdatums/FAQNewDatums.shtml); NOAA HSRP one-pager, New Datums (2019)',
  url='https://geodesy.noaa.gov/datums/newdatums/FAQNewDatums.shtml', checked=D, edition='NGS FAQ as read 2026-11-20', confidence='medium', kind='summary', license='gov-us', unconfirmed='yes')
B.add(id='spec-wa-dot-survey-stakes-1', state='WA', tier='core',
  title='Washington WSDOT stake flagging colors and blue tops, red tops, yellow tops',
  topic='Survey: stake and flagging colors',
  text=('Washington: the WSDOT Highway Surveying Manual (M 22-97, chapter 15) sets flagging colors for construction stakes on WSDOT jobs: clearing and grubbing white, right of way red, '
        'slope stakes blue, centerline yellow, drainage blue, signing and illumination white, references and control multicolor, selective thinning orange, trees remaining blue. '
        'Spray paint: white is acceptable for stationing along the paved shoulder; pink for all other survey markings, per the national utility color code. '
        'Grade hubs (15-02.9): subgrade hubs are called blue tops, base rock hubs red tops, and top course hubs yellow tops. '
        'That is different from many other places, where blue top means finish grade, so on a Washington job a blue top may be subgrade. '
        'Private surveyors and cities can use their own colors: read the writing on the lath and get the job staking legend. '
        'The copy read was dated January 2005 with a draft footer; whether the current WSDOT edition is the same is not confirmed.'),
  source='WSDOT Highway Surveying Manual M 22-97, Chapter 15 Construction Survey Procedures, 15-02.9 and 15-06',
  url='https://appstest.wsdot.wa.gov/publications/manuals/fulltext/M22-97/Chapter15.pdf', checked=D, edition='January 2005 (copy marked Draft 10/18/2004)',
  confidence='medium', kind='summary', license='gov-state', unconfirmed='yes', note='Read on an appstest.wsdot.wa.gov copy; current edition not checked.')
B.add(id='spec-nc-dot-survey-stakes-1', state='NC', tier='core',
  title='North Carolina NCDOT construction stake flagging colors and pipe stake cut to invert',
  topic='Survey: stake and flagging colors',
  text=('North Carolina: the NCDOT Manual for Construction Layout (revised 9/01/2018) gives flagging colors by stake type: centerline orange, slope stakes orange, intermediate grade stakes orange, '
        'fine grade hubs orange, clearing limits blue and white striped, ditch stakes blue, pipe stakes blue, minor structure and endwall stakes blue, fence line white, right of way markers white, sign stakes pink, curb stakes orange on the guard stake. '
        'Pipe stakes give the cut or fill from the hub to the invert (8.5); pipe stationing starts at 0+00 at the outlet end (8.2). '
        'On slope and ditch stakes the manual writes the offset difference with a sign: plus means the offset stake is higher than the intercept point, minus lower (6.5, 7.4). '
        'So on NCDOT work a plus or minus on a slope stake is not the same as fill or cut to grade: read the letters and the legend. Private surveyors may use other colors.'),
  source='NCDOT Manual for Construction Layout, revised 9/01/2018, chapters 3-17 (flagging), 6.5, 7.4, 8.2, 8.5',
  url='https://connect.ncdot.gov/projects/construction/Construction  Stakeout Manual/Manual for Construction Layout.pdf'.replace(' ', '%20'), checked=D, edition='Revised 9/01/2018',
  confidence='high', kind='summary', license='gov-state')
B.add(id='spec-fl-wasd-datum-1', state='FL', tier='core',
  title='Florida Miami-Dade water and sewer jobs: NGVD 1929, NAVD 88 and City of Miami datum on plans',
  topic='Survey: vertical datum',
  text=('Florida, Miami-Dade Water and Sewer Department (WASD) Section 01031 Grades, Lines and Levels (rev. 5/2017): elevations may be on NGVD 1929, NAVD 88 or the City of Miami datum. '
        'WASD accepts NAVD 88 with a conversion factor on each page; it notes FDOT uses NAVD 88 and that City of Miami datum needs a conversion factor to NAVD 88 (3.01-D.8). '
        'Stations are set along the pipe centerline (or a stationed offset line) at most 100 ft apart (3.01-B.4), with control points at the start, the end and at least every 1,400 ft (3.01-B.2). '
        'For crews: a Miami-Dade plan, an old as-built and a benchmark can be on different datums. Check the datum note and conversion factor on each sheet before tying into existing pipe, and ask the surveyor if they differ.'),
  source='Miami-Dade WASD Design and Construction Standard Specifications, Section 01031 Grades, Lines and Levels, rev. 05/2017, 3.01-B.2, 3.01-B.4, 3.01-D.8',
  url='https://www.miamidade.gov/water/library/Donation/part-2/01031.pdf', checked=D, edition='Revision 05/2017', confidence='high', kind='summary', license='gov-local')
B.add(id='spec-tn-dot-survey-units-1', state='TN', tier='shelf',
  title='Tennessee TDOT survey units and datum: US survey foot state plane, NAVD 88, Geoid 18',
  topic='Survey units: survey foot and international foot',
  text=('Tennessee: the TDOT Survey Standards Manual (Fourth Edition, October 2023) sets TDOT project control on NAD 83 (2011) Tennessee State Plane in US survey feet (2.1.3.1), '
        'vertical control on NAVD 88 for all TDOT projects, and Geoid 18 as the default geoid model unless directed otherwise (2.1.3.1). '
        'So TDOT plans after the federal retirement of the survey foot (December 31, 2022) still use survey feet for coordinates. '
        'That does not change cuts, fills or pipe grades; it matters only when mixing TDOT coordinates with data in international feet. Ask the TDOT Regional Survey Coordinator or the project surveyor.'),
  source='TDOT Survey Standards Manual, Fourth Edition, October 2023, 2.1.1, 2.1.2, 2.1.3.1',
  url='https://www.tn.gov/content/dam/tn/tdot/engineering-production-support/documents/tdot-documents/survey-documents/TDOT%20Survey%20Standards%20Manual.pdf',
  checked=D, edition='Fourth Edition, October 2023', confidence='high', kind='summary', license='gov-state')
B.add(id='spec-az-dot-slope-stakes-1', state='AZ', tier='shelf',
  title='Arizona ADOT slope stakes: how cut and fill are written',
  topic='Survey: stake writing',
  text=('Arizona: the ADOT Construction Manual, Section 1109 Construction Surveying (January 2005), says the standard slope stake is 1 in x 2 in x 14 in. '
        'On a cut, the inside of the slope stake carries the letter C, the cut at that point, the horizontal distance from centerline and the slope ratio (1109-3). '
        'On a fill, the front face carries the letter F, the fill from the guinea to grade, the distance from centerline to the guinea and the fill slope ratio (1109-4). '
        'The station is on the back. Offsets are measured at right angles from centerline to 0.01 ft; rod readings to 0.1 ft. '
        'ADOT coding and placement of slope stakes is in Exhibit 1109-1-1 (not read here).'),
  source='ADOT Construction Manual, Chapter 11, Section 1109 Construction Surveying, January 2005, 1109-3, 1109-4',
  url='https://azdot.gov/sites/default/files/construction-manual/CMChapter_11_Section_1109.pdf', checked=D, edition='January 2005', confidence='medium', kind='summary', license='gov-state')
B.write()
