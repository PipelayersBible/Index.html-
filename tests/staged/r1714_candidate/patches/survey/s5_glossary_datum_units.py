# survey s5: Education pages for crews outside California.
#  - Glossary, Grade & Survey: 12 more field words (station, offset, hub, lath, guard / witness stake, RP, blue tops,
#    flagging colors, flowline, crowfoot, grade targets, vertical datum, survey foot). Each one says where it changes by
#    region or agency instead of giving one region's meaning as the rule.
#  - Reading Stationing & Cutsheets: a "Units and Datum" section (metric sheets aren't read; same datum for plans, sheet and
#    benchmark; survey foot vs international foot) and L/O named both ways it is used.
# Text only. Sources: NGS / Federal Register 85 FR 62698 (Oct 5 2020); Zilkoski et al. 1992 (NGS NAVD 88 report);
# NOAA new-datums one-pager (2019); WSDOT Highway Surveying Manual M22-97 ch.15 (15-02.9, 15-06); NCDOT Manual for
# Construction Layout (rev. 9/01/2018) 8.4; Caltrans Surveys Manual ch.12; Miami-Dade WASD spec 01031 (5/2017) 3.01-D.8.
# python3 s5_glossary_datum_units.py in.html out.html  (applies alone on r17.13)
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

def item(eid, k, body):
    return '        <div class="pb-review-item" data-edu-id="%s"><span class="k">%s</span><br>%s</div>\n' % (eid, k, body)

G = ''.join([
  item('station-sta', 'Station (STA)', 'Distance along the line, written hundreds + feet: 12+50 is 1,250 ft from 0+00. Metric plans write thousands + metres (1+250 is 1,250 m); the app doesn&rsquo;t read metric stations.'),
  item('offset-o-s', 'Offset (O/S, LT/RT)', 'How far a stake is set off the line so it survives the dig. Written L or R, LT or RT, or LEFT or RIGHT, looking up-station (the way the stations get bigger).'),
  item('hub', 'Hub', 'A short stake driven near flush with the ground. Its top, or the tack in it, is usually the point the cut or fill is measured from.'),
  item('lath-guard-stake', 'Lath / guard stake', 'The tall, thin stake beside a hub that carries the writing and the flagging. It marks and protects the hub; the cut or fill is still from the hub unless the lath says otherwise.'),
  item('witness-rp', 'Witness stake / reference point (RP)', 'Set off to the side to find a point that will be dug out or buried. The writing gives the distance and direction to the real point.'),
  item('crowfoot', 'Crowfoot', 'A short line with toes drawn on the lath. The line is the height the cut or fill is measured from.'),
  item('grade-targets', 'What the cut or fill is to', 'The letters beside the number: FL flowline, INV invert, TC top of curb, BC back of curb, EP edge of pavement, FG finish grade, FS finished surface, SG subgrade. Never use a cut meant for one target on another.'),
  item('flowline-fl', 'Flowline (FL)', 'For a pipe, the same as the invert: the inside bottom where the water runs. For curb and gutter, the low line of the gutter.'),
  item('blue-top-red-top', 'Blue tops, red tops', 'Hubs with painted tops for road and pad grades. The color changes by region: many crews call finish-grade hubs blue tops, but the WSDOT surveying manual uses blue tops for subgrade, red tops for base rock and yellow tops for top course. Ask the surveyor.'),
  item('flagging-colors', 'Flagging colors', 'Set by each agency or surveyor, not nationally. For example pipe stakes are blue on NCDOT jobs, right of way is red on WSDOT jobs and white/yellow on Caltrans jobs. Read the writing and get the job&rsquo;s staking legend.'),
  item('vertical-datum', 'Vertical datum (NAVD 88, NGVD 29)', 'The zero that elevations are measured from. Most current plans use NAVD 88; older plans and some local agencies use NGVD 29 or a city datum. NGS found the two differ by about &minus;1.3 to +4.9 ft across the lower 48. Plans, cutsheet and benchmark must all use the same one.'),
  item('survey-foot', 'US survey foot', 'An older foot, 2 parts per million longer than the international foot (about 0.01 ft per mile). It matters for state plane coordinates, not for grade on a run. Federal agencies retired it after December 31, 2022; some plans still use it.'),
])
rep("""        <div class="pb-review-item" data-edu-id="direct-reading"><span class="k">Direct reading</span><br>What a Lenker rod gives you — the number on the rod already is the elevation, no HI math needed.</div>
""", """        <div class="pb-review-item" data-edu-id="direct-reading"><span class="k">Direct reading</span><br>What a Lenker rod gives you — the number on the rod already is the elevation, no HI math needed.</div>
""" + G)

rep("""benchmarks (BM), lath offsets (L/O) and similar site rows.""",
"""benchmarks (BM), L/O rows (line only, or lath offset on some jobs) and similar site rows.""")

rep("""    <div class="pb-section" data-edu-id="why-discrepancies-matter">""",
"""    <div class="pb-section" data-edu-id="units-and-datum">
      <div class="pb-tag">Units and Datum</div>
      <div class="pb-body">
        <div class="pb-review-item" data-edu-id="metric-sheets"><span class="k">Metric sheets</span><br>The app works in feet. A sheet in metres (stations like 1+250, &ldquo;m&rdquo; or &ldquo;Chainage&rdquo;) is not read, and the AI lists metric pages instead of reading them. Ask the surveyor for a sheet in feet.</div>
        <div class="pb-review-item" data-edu-id="same-datum"><span class="k">Same datum everywhere</span><br>The cutsheet, the plans and the benchmark you shoot from must use the same vertical datum (usually NAVD 88; older plans NGVD 29 or a city datum). The app&rsquo;s plan check can&rsquo;t catch a datum mix-up: every row still adds up. If the benchmark says a different datum than the plans, stop and ask the surveyor.</div>
        <div class="pb-review-item" data-edu-id="survey-foot-cutsheet"><span class="k">Survey foot vs international foot</span><br>About 0.01 ft per mile apart. It changes northings and eastings, which the app doesn&rsquo;t import; it doesn&rsquo;t change a cut, a fill or a grade.</div>
      </div>
    </div>
    <div class="pb-section" data-edu-id="why-discrepancies-matter">""")

open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('s5 ok')
