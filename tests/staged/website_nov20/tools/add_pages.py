#!/usr/bin/env python3
# Adds the trench depth guide, the slope conversion table, hub cards, sitemap rows. usage: python3 add_pages.py /path/to/clone
import sys, os, re
root = sys.argv[1]
def rd(p): return open(os.path.join(root, p), encoding='utf-8').read()
def wr(p, s):
    os.makedirs(os.path.dirname(os.path.join(root, p)), exist_ok=True); open(os.path.join(root, p), 'w', encoding='utf-8').write(s)
def rep(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70]); return s.replace(a, b)

# ---- new guide, from the grade stake guide's shell ----
t = rd('guides/how-to-read-a-grade-stake/index.html')
TITLE = 'Trench Depth Rules: 4, 5 and 20 Feet | The Pipelayer\'s Bible'
H1 = 'Trench depth rules: 4, 5 and 20 feet'
DESC = "How deep can a trench be before it needs shoring or sloping? Federal OSHA's 4, 5 and 20 foot rules in plain words: ladders, cave-in protection, spoil, inspections."
OLD_DESC = "How to read a grade stake for pipe: hub, guard stake, station, offset, cut and fill, and how to turn the numbers into the invert elevation and feet-inches."
t = rep(t, OLD_DESC, DESC, 4)
t = rep(t, "How to Read a Grade Stake | The Pipelayer's Bible", TITLE, 3)
t = rep(t, 'guides/how-to-read-a-grade-stake/', 'guides/trench-depth-rules/', 6)
t = rep(t, '"headline": "How to read a grade stake"', '"headline": "' + H1 + '"')
t = rep(t, '"name": "How to read a grade stake"', '"name": "Trench depth rules"')
t = rep(t, '"datePublished": "2026-11-19",\n   "dateModified": "2026-11-19"', '"datePublished": "2026-11-20",\n   "dateModified": "2026-11-20"')
t = rep(t, '<span aria-current="page">How to read a grade stake</span>', '<span aria-current="page">Trench depth rules</span>')
t = rep(t, '<h1 id="page-title">How to read a grade stake</h1>', '<h1 id="page-title">' + H1 + '</h1>')
t = rep(t, '<p class="lead">What the writing on a pipe grade stake means, and how to get from the stake to the invert.</p>', '<p class="lead">How deep a trench can be before it needs a ladder, cave-in protection or an engineer, under federal OSHA.</p>')
t = rep(t, 'November 19, 2026.</p>', 'November 20, 2026.</p>')
a = t.index('<div class="content"><div class="wrap"><article class="prose">') + len('<div class="content"><div class="wrap"><article class="prose">')
b = t.index('<section class="cta-band"')
L = 'https://www.osha.gov/laws-regs/regulations/standardnumber/1926/'
BODY = f'''
<div class="warn"><p><strong>Your competent person decides what a trench needs.</strong> This is a plain summary of the federal rule, <a href="{L}1926.651">29 CFR 1926.651</a> and <a href="{L}1926.652">1926.652</a>. It isn't legal advice, it doesn't classify soil, and your state may be stricter. Read the rule for the exact wording.</p></div>

<h2>The short answer</h2>
<p>Under federal OSHA, a trench 5 feet deep or more needs a protective system (sloping, benching, shoring or a shield) unless it is cut entirely in stable rock. A shallower trench needs one too if the competent person sees any sign it could cave in.</p>
<div class="tbl-wrap"><table><thead><tr><th>Depth</th><th>What federal OSHA requires</th><th>Where</th></tr></thead><tbody>
<tr><td>Any depth</td><td>A competent person inspects the trench, the area around it and the protective system every day before work starts, and again as needed during the shift and after a rainstorm.</td><td>1926.651(k)(1)</td></tr>
<tr><td>Any depth</td><td>Spoil, materials and equipment stay at least 2 feet back from the edge, or are held back by a retaining device.</td><td>1926.651(j)(2)</td></tr>
<tr><td>4 ft or more</td><td>A stairway, ladder, ramp or other safe way out, placed so nobody has to travel more than 25 feet sideways to reach it.</td><td>1926.651(c)(2)</td></tr>
<tr><td>More than 4 ft</td><td>Test the air before anyone goes in, where low oxygen or a hazardous atmosphere exists or could reasonably be expected, such as near a landfill or stored hazardous substances.</td><td>1926.651(g)(1)(i)</td></tr>
<tr><td>Less than 5 ft</td><td>No protective system is required if a competent person examines the ground and finds no indication of a potential cave-in.</td><td>1926.652(a)(1)(ii)</td></tr>
<tr><td>5 ft or more</td><td>A protective system, unless the excavation is made entirely in stable rock.</td><td>1926.652(a)(1)</td></tr>
<tr><td>20 ft and deeper</td><td>OSHA's slope table only covers excavations less than 20 feet deep. Beyond it, sloping or benching "shall be designed by a registered professional engineer."</td><td>Subpart P, Appendix B, Table B-1</td></tr>
</tbody></table></div>

<h2>Does a trench under 5 feet need shoring?</h2>
<p>It can. The 5 foot line isn't a free pass. <a href="{L}1926.652">1926.652(a)(1)</a> only lets you skip the protective system below 5 feet when a competent person has looked at the ground and found no indication of a potential cave-in. Wet ground, fill, old utility trenches alongside, cracks at the edge or a machine working next to the cut are all reasons to protect a shallow trench.</p>

<h2>What counts as a protective system</h2>
<ul>
<li><strong>Sloping.</strong> Laying the walls back. The steepest slope allowed depends on the soil type: 3/4 to 1 for Type A, 1 to 1 for Type B and 1 1/2 to 1 for Type C, written horizontal to vertical. The <a href="/tools/trench-sloping/">trench sloping calculator</a> works out how far back that is and how wide the top gets.</li>
<li><strong>Benching.</strong> Cutting the walls in steps. Appendix B shows which layouts are allowed for each soil type.</li>
<li><strong>Shoring.</strong> Supports that hold the walls, such as hydraulic shores.</li>
<li><strong>Shielding.</strong> A trench box or shield that protects the people inside it if the wall lets go.</li>
</ul>
<p>The soil type is not a guess. A competent person classifies it under <a href="{L}1926SubpartPAppA">Appendix A</a>, and that decides how steep a slope can be.</p>

<h2>Who is the competent person?</h2>
<p>OSHA's definition (<a href="https://www.osha.gov/competent-person">29 CFR 1926.32(f)</a>) is someone "capable of identifying existing and predictable hazards in the surroundings or working conditions" who also "has authorization to take prompt corrective measures to eliminate them." Both halves count: he has to know what he's looking at, and he has to have the authority to pull the crew out. When he finds evidence of a possible cave-in, the people exposed are removed until it's made safe (1926.651(k)(2)).</p>

<h2>Other things the rule covers</h2>
<ul>
<li><strong>Utilities.</strong> The estimated location of underground utilities is determined before the excavation is opened (1926.651(b)(1)). That means the 811 ticket is in hand and the marks are on the ground.</li>
<li><strong>Water.</strong> Nobody works in a trench where water has built up or is building up unless precautions have been taken (1926.651(h)(1)).</li>
<li><strong>Signs of distress.</strong> If a sloped wall shows signs of distress, it gets cut back flatter than the table's maximum, by at least another 1/2 horizontal to 1 vertical (Appendix B).</li>
</ul>

<h2>State plans can be stricter</h2>
<p>Many states run their own OSHA plan, and the numbers above are only the federal floor. Two examples: Washington requires a protective system starting at 4 feet instead of 5 (<a href="https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-657.htm">WAC 296-155-657</a>), and California requires a Cal/OSHA permit before workers enter a trench or excavation 5 feet deep or more (<a href="https://dir.ca.gov/Title8/341.html">Title 8, section 341</a>). Check the rules for the state the job is in.</p>

<h2>Quick checks before anyone gets in</h2>
<ul>
<li>Has the competent person looked at it today, and since the rain?</li>
<li>4 feet or deeper: is there a ladder within 25 feet of everyone?</li>
<li>5 feet or deeper: is the slope, shoring or box in place for the soil you actually have?</li>
<li>Is the spoil at least 2 feet back?</li>
<li>Close to 20 feet: is there an engineer's design?</li>
</ul>
<p><a href="/">The Pipelayer's Bible</a> has a trench sloping calculator on the phone that works with no signal. Like the free one on this site, it only does the arithmetic on OSHA's table and gives no slope at 20 feet or more.</p>
</article>
<section class="related" aria-labelledby="rel-title"><h2 id="rel-title">Related</h2><ul class="cards"><li class="card"><h3><a href="/tools/trench-sloping/">Trench sloping calculator</a></h3><p>Table B-1 slopes and the top width of the cut.</p></li><li class="card"><h3><a href="/guides/what-goes-on-a-confined-space-permit/">What goes on a confined space permit</a></h3><p>Each item on the permit, with the OSHA sections.</p></li></ul></section>
</div></div>
'''
t = t[:a] + BODY + t[b:]
t = t.replace('<th>Depth</th><th>What federal OSHA requires</th><th>Where</th>', '<th>Depth</th><th>What federal OSHA requires</th>')
t = re.sub(r'</td><td>((?:1926\.65|Subpart P)[^<]*)</td></tr>', r' (\1)</td></tr>', t)
wr('guides/trench-depth-rules/index.html', t)

# ---- guides hub card, tools pages cross links ----
s = rd('guides/index.html')
m = re.search(r'<li class="card">(?:(?!</li>).)*what-goes-on-a-confined-space-permit(?:(?!</li>).)*</li>', s, re.S)
assert m, 'guide card'
card = '<li class="card"><h3><a href="/guides/trench-depth-rules/">Trench depth rules: 4, 5 and 20 feet</a></h3><p>When a trench needs a ladder, cave-in protection or an engineer under federal OSHA, and who decides.</p></li>'
s = s[:m.end()] + card + s[m.end():]
s = rep(s, "how to read a grade stake, rod reading to invert step by step, and what goes on a confined space entry permit.", "how to read a grade stake, rod reading to invert, what goes on a confined space permit, and trench depth rules.", 4)
wr('guides/index.html', s)

s = rd('tools/trench-sloping/index.html')
s = rep(s, "Check the rules for the state the job is in.</p>", "Check the rules for the state the job is in.</p>\n<p>For the ladder, spoil and inspection rules that go with the depth, see <a href=\"/guides/trench-depth-rules/\">trench depth rules: 4, 5 and 20 feet</a>.</p>")
wr('tools/trench-sloping/index.html', s)

# ---- slope conversion table on the grade calculator ----
def arch(n):
    feet = int(n); inches = (n - feet) * 12; w = int(inches); x = round((inches - w) * 16)
    if x == 16: x = 0; w += 1
    if w == 12: w = 0; feet += 1
    if x:
        d = 16
        while x % 2 == 0: x //= 2; d //= 2
        return f"{feet}'-{w} {x}/{d}\""
    return f"{feet}'-{w}\""
rows = [(0.20, ''), (0.40, ''), (0.50, ''), (1.00, ''), (100 / 96, '1/8" per foot'), (2.00, ''), (100 / 48, '1/4" per foot')]
tr = ''
for pct, note in rows:
    drop = pct  # ft per 100 ft
    tr += f'<tr><td class="num">{pct:.2f}%{(" (" + note + ")") if note else ""}</td><td class="num">{pct * 12 / 100:.3f}"</td><td class="num">{drop:.2f} ft</td><td class="num">{arch(drop)}</td></tr>'
TABLE = '''<h2>Slope in percent, inches per foot and fall per 100 feet</h2>
<p>Plans for sewer and storm drain give slope in percent (or in feet per foot: 0.0040 is 0.40%). Plumbing work talks in inches per foot. They are the same thing written three ways:</p>
<div class="tbl-wrap"><table><thead><tr><th class="num">Slope</th><th class="num">Inches per foot</th><th class="num">Fall in 100 ft</th><th class="num">Feet-inches</th></tr></thead><tbody>''' + tr + '''</tbody></table></div>
<p>To go the other way, percent = inches per foot &divide; 12 &times; 100. A quarter inch per foot is 0.25 &divide; 12 &times; 100 = 2.08%. The minimum slope for a line comes from the plans and the agency's standards, not from this table.</p>
'''
s = rd('tools/pipe-grade-calculator/index.html')
anchor = '<p>Check every number against the plans, the cut sheet and your own instrument before you lay pipe.'
assert s.count(anchor) == 1
i = s.index(anchor); j = s.index('</p>', i) + 4
s = s[:j] + '\n' + TABLE + s[j:]
wr('tools/pipe-grade-calculator/index.html', s)

# ---- sitemap ----
s = rd('sitemap.xml')
s = rep(s, '</urlset>', '  <url>\n    <loc>https://pipelayersbible.com/guides/trench-depth-rules/</loc>\n    <lastmod>2026-11-20</lastmod>\n  </url>\n</urlset>')
for u in ['', 'grade-and-cut-sheet-app/', 'daily-reports-for-underground-crews/', 'confined-space-permit-app/', 'tools/pipe-grade-calculator/', 'tools/trench-sloping/', 'guides/']:
    s = rep(s, f'<loc>https://pipelayersbible.com/{u}</loc>\n    <lastmod>2026-11-19</lastmod>', f'<loc>https://pipelayersbible.com/{u}</loc>\n    <lastmod>2026-11-20</lastmod>')
wr('sitemap.xml', s)
print('ok'); print(tr.replace('</tr>', '\n'))
