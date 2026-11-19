from common import *
from tools_pages import related

AUTHOR = {'@type': 'Person', 'name': 'Thomas Fontaine', 'url': SITE + '/'}
PUBLISHER = {'@type': 'Organization', '@id': ORG_ID, 'name': "The Pipelayer's Bible", 'logo': {'@type': 'ImageObject', 'url': SITE + '/img/logo-192.png', 'width': 192, 'height': 192}}


def landing_ld(path, name, desc, trail):
    return [ORG_LD,
            {'@type': 'WebPage', '@id': SITE + path, 'url': SITE + path, 'name': name, 'description': desc, 'inLanguage': 'en-US',
             'isPartOf': {'@id': SITE + '/#website'}, 'about': {'@id': SITE + '/#app'}, 'publisher': ORG_REF,
             'primaryImageOfPage': OG_IMG},
            breadcrumb_ld(trail)]


def article_ld(path, headline, desc, trail):
    return [ORG_LD,
            {'@type': 'Article', '@id': SITE + path + '#article', 'headline': headline, 'description': desc, 'url': SITE + path,
             'mainEntityOfPage': SITE + path, 'image': OG_IMG, 'inLanguage': 'en-US', 'datePublished': TODAY, 'dateModified': TODAY,
             'author': AUTHOR, 'publisher': PUBLISHER},
            breadcrumb_ld(trail)]


# =============================================================================================
# Use-case landing pages
# =============================================================================================
def grade_landing():
    path = '/grade-and-cut-sheet-app/'
    title = 'Grade Stake and Cut Sheet App | The Pipelayer\'s Bible'
    desc = 'Pipe grade app: set up a run from grade stake photos, a cut sheet or typed survey data, and get a grade sheet with invert and BOP rod readings at every interval.'
    trail = [('Home', '/'), ('Grade and cut sheet app', path)]
    body = hero(trail, 'For pipelayers', 'Grade and cut sheet app',
                'Set up the run from the stakes or the cut sheet, and the phone works out the grade sheet: elevations and rod readings at every interval, with or without signal.') + '''
<div class="content"><div class="wrap"><div class="split"><div class="prose">
<h2>Start the run from what you have</h2>
<p>Every run starts with survey data. In The Pipelayer's Bible you can get it in three ways:</p>
<ul>
<li><strong>Stake photos.</strong> Take pictures of the grade stakes and the app reads them and fills in the run.</li>
<li><strong>The cut sheet.</strong> Import it as a PDF or a photo, or paste the rows. If the sheet has more than one pipe on it, you pick the run you're working today.</li>
<li><strong>By hand.</strong> Type in the start, the end, the hubs and the slope.</li>
</ul>
<p>The photo and cut sheet readers use AI, and AI can misread a number. Every value it fills in shows up for the crew to check against the stake, the plans and their own instrument before anyone lays pipe.</p>

<h2>The grade sheet</h2>
<p>Once the run is set up, the app builds the grade sheet: a row every interval you choose, such as every 25 ft, or at every joint when you give it the laying length. Each row shows the distance, the invert elevation and the rod readings for the invert and the bottom of pipe. It works with an engineer's rod in feet and hundredths, an architect's rod in feet and inches, or a Lenker rod.</p>
<p>The HI comes from a benchmark and backsight, or from a shot on a hub. Shoot more hubs and the app checks the HI against each one and warns you when they don't agree. Fittings and crossings sit on the sheet at their stations. As pipe goes in, laid rows are shaded, the next row is marked, and the footage shows at the top.</p>
<p>Check shots, slope and pipe info are all one tap away. If the inspector shows up late or you hit a utility, the delay log stamps the time, and that delay is already in the foreman's daily report.</p>

<h2>When the run is done</h2>
<p>End the run and the phone makes a PDF of it, time-stamped at every point. The office gets a sealed original of each run PDF, so any later change would show. The run goes to the foreman and the office when there's signal, and the footage counts toward the daily report.</p>

<h2>No signal in the hole</h2>
<p>Runs and calculators work with no signal. The run saves on the phone and sends when signal is back. Until it has sent, the only copy is on that phone.</p>
<p>Want to try the math first? The free <a href="/tools/pipe-grade-calculator/">pipe grade calculator</a> and <a href="/tools/rod-reading-to-invert/">rod reading to invert</a> tool use the same rounding as the app. New to reading stakes? See <a href="/guides/how-to-read-a-grade-stake/">how to read a grade stake</a>.</p>
</div>
<div>''' + shot('shot-grade-sheet.webp', 'Run Results screen: a grade sheet for a 250 foot, 8 inch run at 0.40 percent, 125 feet laid, rows of distance with BOP and invert rod readings, the laid rows shaded and the next row marked', 'Grade sheet, mid-run', 'Laid rows shaded, the next row marked, footage at the top.') + shot('shot-run-report.webp', 'The run report PDF open on the phone: a five-page Pipe Run Record for Main St Sewer with the locked time, distance, slope and invert elevations', 'Run report PDF', 'Made on the phone from the run, with the time on it.') + '''<p class="demo-note" style="font-size:14px;color:var(--muted)">Real screens from the app, filled in with made-up demo data.</p></div>
</div>
''' + related([('/daily-reports-for-underground-crews/', 'Daily reports', 'The run\'s footage and delays land in the foreman\'s daily report.'),
               ('/guides/rod-reading-to-invert-step-by-step/', 'Rod reading to invert, step by step', 'HI, foresight and invert, with a worked example.')]) + '''
</div></div>
''' + cta_band()
    return page(path, title, desc, body, landing_ld(path, 'Grade and cut sheet app', desc, trail))


def daily_landing():
    path = '/daily-reports-for-underground-crews/'
    title = 'Daily Report App for Underground Crews | The Pipelayer\'s Bible'
    desc = 'Underground construction daily reports filled in from the day\'s work: footage, time-stamped delays, extra work and field tickets. The foreman signs and sends.'
    trail = [('Home', '/'), ('Daily reports', path)]
    body = hero(trail, 'For foremen and the office', 'Daily reports for underground crews',
                'The daily report fills in from the day\'s work on the crew\'s phones. The foreman checks it, signs it on the phone and sends it, before he leaves the job.') + '''
<div class="content"><div class="wrap"><div class="split"><div class="prose">
<h2>Filled in from the day's work</h2>
<p>A lot of daily reports get typed up at night from memory. In The Pipelayer's Bible the report is already mostly done when the foreman opens it, because the crew logged the work on their phones as it happened:</p>
<ul>
<li><strong>Production.</strong> Footage from the day's runs is already there.</li>
<li><strong>Delays.</strong> Delays logged on a run carry over with their times: utility conflict, inspector, weather, equipment down, material, survey/stakes, traffic control.</li>
<li><strong>Extra work.</strong> Documented when it happens, not remembered later.</li>
<li><strong>Crew and equipment.</strong> The day starts with the crew and equipment from the last report, so the foreman only changes what's different.</li>
<li><strong>Field tickets.</strong> Snap a photo of the ticket and it goes with the report.</li>
</ul>
<p>The foreman reads it over, adds anything that's missing, signs on the phone and sends it.</p>

<h2>What the office sees</h2>
<p>The office gets signed daily reports with production from every job and every crew. Each job shows percent complete by item, from what the crews log. Every record can be searched and exported. A crew's run progress shows live, so nobody has to call the foreman to ask how far they got.</p>

<h2>811 tickets</h2>
<p>Put the 811 ticket on the job and the foreman gets a warning when it's nearly expired: 7 days before, 2 days before, and on the day.</p>

<h2>Works with no signal</h2>
<p>The crew can keep logging with no signal. Records save on the phone and send when signal is back. Signing in and anything shared with the office need signal, and until a record has sent, the only copy is on that phone.</p>

<h2>Try it on a real job</h2>
<p>The free 30-day trial covers your company account and 6 people, any mix of superintendent, foremen and pipelayers. There's no credit card and no automatic payment when it's over. At the end, whoever ran it gets a one-page summary of what the crew logged to show the owner.</p>
<p>See also: the <a href="/grade-and-cut-sheet-app/">grade and cut sheet</a> side of the app, where the footage and delays come from.</p>
</div>
<div>''' + shot('shot-daily-report.webp', 'Daily report screen: the Delays and Extra Work section already shows a 0.58 hour delay, waiting on inspector, carried over from the run, ready to sign', 'Daily report', 'The delay logged on the run is already in it.') + shot('shot-office-jobs.webp', 'Company Home for the office: Main St Sewer at 68 percent complete with progress for demo, excavation, pipe installed, backfill, restoration and structures, and a second job with no plan yet', 'Office: every job', 'Percent complete by item, from what the crews log.') + '''<p style="font-size:14px;color:var(--muted)">Real screens from the app, filled in with made-up demo data.</p></div>
</div>
''' + related([('/confined-space-permit-app/', 'Confined space permits', 'The permit and entry log on the same phone.'),
               ('/tools/', 'Free tools', 'Grade, rod reading, trench sloping and volume calculators.')]) + '''
</div></div>
''' + cta_band()
    return page(path, title, desc, body, landing_ld(path, 'Daily reports for underground crews', desc, trail))


def permit_landing():
    path = '/confined-space-permit-app/'
    title = 'Confined Space Permit App | The Pipelayer\'s Bible'
    desc = 'Confined space permit app for pipe crews: entry permit, entrant and attendant roster, air test log with tester and time, one-tap emergency call. No signal needed.'
    trail = [('Home', '/'), ('Confined space permits', path)]
    body = hero(trail, 'For crews entering manholes and vaults', 'Confined space permit app',
                'The entry permit and the entry log on the phone at the manhole, instead of a clipboard in the truck.') + '''
<div class="content"><div class="wrap"><div class="split"><div class="prose">
<div class="warn"><p><strong>It records what your crew enters.</strong> The permit form doesn't replace your safety program, your air monitor, training or your competent person. The emergency button opens the phone's dialer to the number on the permit; someone still makes the call, and it needs signal.</p></div>

<h2>The permit</h2>
<p>The permit form has a place for each item OSHA lists for an entry permit, from the space and the purpose of the entry to the rescue services and how to summon them:</p>
<ul>
<li>The space, its location and the jobsite</li>
<li>Purpose of the entry, and the date and authorized window (dates fill in on their own)</li>
<li>Entry supervisor by name, with initials authorizing the entry, and the attendant by name</li>
<li>Hazards of the space and the isolation and control measures</li>
<li>Acceptable entry conditions: oxygen, LEL, and optional CO and H2S limits</li>
<li>How you'll detect a ventilation failure, communication procedures and equipment provided</li>
<li>Rescue and emergency services, and the emergency number</li>
<li>Any other permits issued, such as hot work, plus notes and photos</li>
</ul>
<p>Review it, then lock and activate it.</p>

<h2>The entry log</h2>
<p>Once the permit is active, the phone keeps the log while the work goes on:</p>
<ul>
<li><strong>Roster.</strong> Who's in the space and who's the attendant, with times in and out.</li>
<li><strong>Air tests.</strong> Each reading is logged with the tester's name and the time. A reading outside the permit's acceptable entry conditions is flagged.</li>
<li><strong>Reminders.</strong> Optional timers for the next air test and the next communication check.</li>
<li><strong>Emergency.</strong> A one-tap button that opens the phone's dialer to the number on the permit, 911 unless you change it for a site with its own rescue.</li>
</ul>
<p>When the job is done, the permit is closed and the record goes to the company. Closed permits and their air readings are kept.</p>

<h2>No signal down the hole</h2>
<p>Permits work with no signal. The record saves on the phone and sends when signal is back, and until it has sent, the only copy is on that phone. A phone call to 911 still needs signal.</p>

<h2>Know what goes on a permit</h2>
<p>For a plain list of what a permit has to cover under federal OSHA and Cal/OSHA, see <a href="/guides/what-goes-on-a-confined-space-permit/">what goes on a confined space permit</a>.</p>
</div>
<div>''' + shot('shot-office-busy.webp', 'Company Home in the app for an example company: 4 active runs and 1 active permit live now, 5 daily reports signed today, 3 delays and extra work, and 5 jobs underway starting with Main St Sewer Replacement', 'Company Home', 'Active permits show live for the office, next to the runs.') + '''<p style="font-size:14px;color:var(--muted)">Real screen from the app, filled in with made-up demo data.</p></div>
</div>
''' + related([('/guides/what-goes-on-a-confined-space-permit/', 'What goes on a confined space permit', 'Each item on the permit, with the OSHA and Cal/OSHA sections.'),
               ('/daily-reports-for-underground-crews/', 'Daily reports', 'Runs, delays and extra work, signed and sent from the phone.')]) + '''
</div></div>
''' + cta_band()
    return page(path, title, desc, body, landing_ld(path, 'Confined space permit app', desc, trail))


# =============================================================================================
# Guides
# =============================================================================================
BYLINE = 'By Thomas Fontaine, 12 years in underground construction. November 19, 2026.'


def guide_stake():
    path = '/guides/how-to-read-a-grade-stake/'
    title = 'How to Read a Grade Stake | The Pipelayer\'s Bible'
    desc = 'How to read a grade stake for pipe: hub, guard stake, station, offset, cut and fill, and how to turn the numbers into the invert elevation and feet-inches.'
    trail = [('Home', '/'), ('Guides', '/guides/'), ('How to read a grade stake', path)]
    body = hero(trail, 'Guide', 'How to read a grade stake',
                'What the writing on a pipe grade stake means, and how to get from the stake to the invert.', BYLINE) + '''
<div class="content"><div class="wrap"><article class="prose">
<p>Every surveyor marks stakes a little differently, so treat this as the common way of doing it, not the only way. When a stake doesn't make sense, check the cut sheet's notes or call the surveyor before you dig to it.</p>

<h2>The hub and the guard stake</h2>
<p>A grade stake is usually two pieces. The <strong>hub</strong> is a short stake driven down near the ground, often with a tack or a mark on top. The top of the hub is the point the surveyor shot, and every number on the stake is measured from it. The <strong>guard stake</strong> (the lath) stands next to it so you can find the hub and read the writing.</p>
<p>Don't knock the hub or set anything on it. If it moves, its numbers are no good.</p>

<h2>What's written on it</h2>
<ul>
<li><strong>Station.</strong> Distance along the line, written in hundreds of feet: 1+25.00 is 125 feet from the start of the line (0+00).</li>
<li><strong>Offset.</strong> How far the stake is from the pipe centerline, and often the line type. "10' O/S" or "10/SS" means 10 feet off the centerline of the sewer. The number in a tag like 10/SS is the offset, not the pipe size. Offsets can change along a line when stakes get moved around an obstruction.</li>
<li><strong>Line type.</strong> SS sanitary sewer, SD storm drain, W water, and so on.</li>
<li><strong>Cut or fill.</strong> C 6.45 means the point you're building to is 6.45 feet below the top of the hub. F 1.20 means it's 1.20 feet above the hub.</li>
<li><strong>What the cut is to.</strong> Usually the invert or flowline (field crews use the two words for the same thing), sometimes the top of pipe or a structure rim. If it doesn't say, ask.</li>
<li><strong>Back of the stake.</strong> The stake number and the hub elevation are often written on the back. Read both sides.</li>
</ul>
<p>At structures you'll see the name, like MH-3, with an IE IN and an IE OUT. IE IN is the invert of the pipe coming in, the higher side; IE OUT is the pipe going out, the lower side.</p>
<p>If a number is crossed out or scribbled over, it's the surveyor's mistake. Don't use it. If you can't tell which number is the good one, call.</p>

<h2>Turning the cut into an invert elevation</h2>
<p>If you know the hub elevation, the invert is simple:</p>
<p class="formula">invert = hub elevation &minus; cut &nbsp;&nbsp; (or + fill)</p>
<p>Example: the back of the stake says the hub is 102.48. The front says C 6.45 to the invert. The invert at that station is 102.48 &minus; 6.45 = 96.03.</p>
<p>The cut sheet lists the same thing for every stake: stake number, station, offset, hub elevation, design invert and the cut or fill. Cut is just hub elevation minus design invert, so you can check any line on the sheet with a subtraction.</p>

<h2>Cuts in feet and inches</h2>
<p>Stakes are in feet and hundredths. If your tape is in feet and inches, convert the decimal part: multiply it by 12 for inches, then multiply what's left over by 16 for sixteenths.</p>
<p>6.45 feet: 0.45 &times; 12 = 5.4 inches. 0.4 &times; 16 = 6.4, call it 6/16, which is 3/8. So C 6.45 is 6'-5 3/8".</p>
<div class="tbl-wrap"><table><thead><tr><th>Hundredths of a foot</th><th>Inches, nearest 1/16</th></tr></thead><tbody>
<tr><td class="num">0.10</td><td>1 3/16"</td></tr><tr><td class="num">0.25</td><td>3"</td></tr><tr><td class="num">0.45</td><td>5 3/8"</td></tr><tr><td class="num">0.50</td><td>6"</td></tr><tr><td class="num">0.75</td><td>9"</td></tr></tbody></table></div>

<h2>Grade between the stakes</h2>
<p>Stakes might be 25 or 50 feet apart, and you need grade everywhere in between. On a straight grade the invert changes the same amount every foot:</p>
<p class="formula">change = slope % &divide; 100 &times; distance</p>
<p>At 0.40%, the invert drops 0.004 feet per foot, so 0.10 feet every 25 feet. Work the slope out from two stakes and compare it with the plans. If the two don't agree, something is off: a typo on the sheet, a disturbed hub or a misread number. Sort it out before you set pipe.</p>
<p>The free <a href="/tools/pipe-grade-calculator/">pipe grade calculator</a> does the stations for you, and the <a href="/tools/rod-reading-to-invert/">rod reading tool</a> turns your shots into inverts.</p>

<h2>Quick checks before you lay pipe</h2>
<ul>
<li>Read both sides of every stake.</li>
<li>Make sure you know what the cut is to: invert, top of pipe or rim.</li>
<li>Check the slope between two stakes against the plans.</li>
<li>Shoot a second hub to check your instrument setup.</li>
<li>Ignore anything crossed out, and call when in doubt.</li>
</ul>
<p>In <a href="/grade-and-cut-sheet-app/">The Pipelayer's Bible</a>, you can take photos of the stakes or import the cut sheet and the app sets up the run. It can misread a stake like anyone can, so the crew checks every value it fills in.</p>
</article>
''' + related([('/guides/rod-reading-to-invert-step-by-step/', 'Rod reading to invert, step by step', 'From the benchmark to the invert with a level and a rod.'),
               ('/tools/pipe-grade-calculator/', 'Pipe grade calculator', 'Invert elevations every 25 ft along a straight grade.')]) + '''
</div></div>
''' + cta_band()
    return page(path, title, desc, body, article_ld(path, 'How to read a grade stake', desc, trail), section='/guides/', og_type='article')


def guide_rod():
    path = '/guides/rod-reading-to-invert-step-by-step/'
    title = 'Rod Reading to Invert, Step by Step | The Pipelayer\'s Bible'
    desc = 'Step by step: shoot the benchmark, work out the HI, turn rod readings into inverts, and find the reading to lay pipe to. Worked example for 8 inch SDR 35.'
    trail = [('Home', '/'), ('Guides', '/guides/'), ('Rod reading to invert, step by step', path)]
    body = hero(trail, 'Guide', 'Rod reading to invert, step by step',
                'The height of instrument method, from the benchmark to the reading you lay pipe to.', BYLINE) + '''
<div class="content"><div class="wrap"><article class="prose">
<h2>The words</h2>
<ul>
<li><strong>Benchmark (BM).</strong> A point with a known elevation, from the plans or the cut sheet. A hub with its elevation written on it works too.</li>
<li><strong>Backsight (BS).</strong> The rod reading on the benchmark.</li>
<li><strong>HI, height of instrument.</strong> The elevation of the line of sight of your level or laser.</li>
<li><strong>Foresight (FS).</strong> Any rod reading after the backsight, on a point you want the elevation of.</li>
<li><strong>Invert.</strong> The inside bottom of the pipe, where the water runs. Flowline means the same thing in the field.</li>
</ul>

<h2>Step 1: set up and shoot the benchmark</h2>
<p>Set the instrument up where you can see the benchmark and the work, level it, and put the rod on the benchmark. Read it. That's your backsight.</p>

<h2>Step 2: work out the HI</h2>
<p class="formula">HI = benchmark elevation + backsight</p>
<p>The rod reading is how far the line of sight is above the benchmark, so adding it to the benchmark's elevation gives the elevation of the line of sight.</p>
<p>Example: the benchmark is 105.20 and the backsight is 4.36. The HI is 109.56.</p>

<h2>Step 3: check the HI</h2>
<p>Before you trust it, shoot a second known point, like another hub with its elevation on it. Work out the HI from that shot the same way. The two should agree within your tolerance. If they don't, find out why before you go on: a bumped instrument, a misread rod, a disturbed hub or a typo on the sheet. The instrument stays put once you have the HI. If it gets moved or bumped, start over at step 1.</p>

<h2>Step 4: rod reading to elevation</h2>
<p class="formula">elevation = HI &minus; foresight</p>
<p>Put the rod on the point and read it. A reading of 13.53 with an HI of 109.56 is an elevation of 96.03.</p>

<h2>Step 5: elevation to invert</h2>
<p>Where the foot of the rod sits matters:</p>
<ul>
<li><strong>On the invert.</strong> The elevation is the invert.</li>
<li><strong>On top of the pipe.</strong> Take off the outside diameter, then add back one wall: invert = elevation &minus; OD + wall.</li>
<li><strong>Under the pipe (bottom of pipe, BOP).</strong> Add one wall: invert = elevation + wall.</li>
</ul>
<p>For 8" PVC SDR 35, the outside diameter is 8.4 inches and the minimum wall is 0.24 inches (8.4 &divide; 35). The top of the pipe sits 8.4 &minus; 0.24 = 8.16 inches above the invert, which is 0.68 feet.</p>

<h2>Step 6: the reading to lay to</h2>
<p>Turn it around to set pipe. You know the design invert, so work out the rod reading that puts the pipe there:</p>
<p class="formula">reading to lay to = HI &minus; elevation you want at the foot of the rod</p>
<div class="tbl-wrap"><table><thead><tr><th>Rod on</th><th>Elevation at the foot of the rod</th><th class="num">Reading</th></tr></thead><tbody>
<tr><td>Invert</td><td>96.03</td><td class="num">13.53</td></tr>
<tr><td>Top of 8" SDR 35</td><td>96.03 + 0.68 = 96.71</td><td class="num">12.85</td></tr>
<tr><td>Bottom of 8" SDR 35</td><td>96.03 &minus; 0.02 = 96.01</td><td class="num">13.55</td></tr></tbody></table></div>
<p>All three use the HI of 109.56 and a design invert of 96.03. A higher reading means a lower point. If the rod on top of the pipe reads 12.88 when you want 12.85, the pipe is 0.03 feet low.</p>

<h2>Grade down the line</h2>
<p>The design invert changes as you go. At 0.40% it drops 0.10 feet every 25 feet, so the reading to lay to goes up 0.10 every 25 feet. Work out a row for each station before you start. The free <a href="/tools/pipe-grade-calculator/">pipe grade calculator</a> gives the invert at every station.</p>

<h2>Rod types</h2>
<ul>
<li><strong>Engineer's rod.</strong> Feet, tenths and hundredths. All the math above works straight off it.</li>
<li><strong>Architect's rod.</strong> Feet, inches and fractions. Convert to decimal feet first (inches &divide; 12), or do the whole thing in inches.</li>
<li><strong>Lenker rod.</strong> A direct elevation rod. Once it's set on the benchmark, the number you read is the elevation, with no subtraction.</li>
</ul>

<h2>Common mistakes</h2>
<ul>
<li>Adding the foresight instead of subtracting it.</li>
<li>Forgetting which part of the pipe the rod was on.</li>
<li>Using the nominal size instead of the outside diameter for a top of pipe shot.</li>
<li>Not checking the HI on a second point.</li>
<li>Rod not plumb. A leaning rod reads high. Rock it slowly and take the lowest reading.</li>
</ul>
<p>Try the numbers in the free <a href="/tools/rod-reading-to-invert/">rod reading to invert tool</a>. In <a href="/grade-and-cut-sheet-app/">The Pipelayer's Bible</a>, the grade sheet shows the invert and bottom of pipe readings for every row and checks the HI against every hub you shoot.</p>
</article>
''' + related([('/guides/how-to-read-a-grade-stake/', 'How to read a grade stake', 'Station, offset, cut and fill, and the hub elevation.'),
               ('/tools/rod-reading-to-invert/', 'Rod reading to invert', 'The calculator for this guide.')]) + '''
</div></div>
''' + cta_band()
    return page(path, title, desc, body, article_ld(path, 'Rod reading to invert, step by step', desc, trail), section='/guides/', og_type='article')


def guide_permit():
    path = '/guides/what-goes-on-a-confined-space-permit/'
    title = 'What Goes on a Confined Space Permit | The Pipelayer\'s Bible'
    desc = 'What a confined space entry permit must identify under OSHA 1910.146, 1926 Subpart AA and Cal/OSHA, in plain words, plus signing, posting and keeping it.'
    trail = [('Home', '/'), ('Guides', '/guides/'), ('What goes on a confined space permit', path)]
    body = hero(trail, 'Guide', 'What goes on a confined space permit',
                'Each item an entry permit has to cover, in plain words, with the section it comes from.', BYLINE) + '''
<div class="content"><div class="wrap"><article class="prose">
<div class="note"><p>This is a plain summary to help crews read and fill out a permit. It isn't legal advice and it doesn't replace your company's permit space program, your training or your competent person. The rules are linked below; read them for the exact wording.</p></div>

<h2>Which rule applies</h2>
<ul>
<li><strong>Construction work</strong> (most sewer, storm drain and water work on a jobsite): federal OSHA <a href="https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926/subpart-AA">29 CFR 1926 Subpart AA</a>, Confined Spaces in Construction. The permit contents are in <a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1206">1926.1206</a>, and the permitting process is in <a href="https://www.law.cornell.edu/cfr/text/29/1926.1205">1926.1205</a>.</li>
<li><strong>General industry</strong> (for example, plant or utility maintenance that isn't construction): <a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146">29 CFR 1910.146</a>, with the permit contents in paragraph (f).</li>
<li><strong>California</strong>: Cal/OSHA's Confined Spaces in Construction, Title 8, Article 37 (sections 1950 to 1962). The entry permit is <a href="https://dir.ca.gov/Title8/1955.html">section 1955</a> and the permitting process is <a href="https://dir.ca.gov/Title8/1954.html">section 1954</a>. Other state plans have their own versions too.</li>
</ul>
<p>The lists line up closely. The construction rule adds one item the general industry list doesn't have: how you'll detect rising hazards if the ventilation stops.</p>

<h2>What the permit has to identify</h2>
<p>Under 1926.1206 (construction), the permit identifies:</p>
<ol>
<li><strong>The permit space to be entered.</strong> Which manhole or vault, where. Use the structure number from the plans.</li>
<li><strong>The purpose of the entry.</strong> What work is being done in there.</li>
<li><strong>The date and the authorized duration.</strong> A permit doesn't run open-ended. It may not last longer than the job it covers.</li>
<li><strong>The authorized entrants.</strong> By name, or by a roster or tracking system that lets the attendant tell who is inside at any time.</li>
<li><strong>How you'll detect an increase in atmospheric hazards if the ventilation stops.</strong> For example, a continuous monitor on the entrant.</li>
<li><strong>Each attendant, by name.</strong></li>
<li><strong>The entry supervisor, by name</strong>, and the signature or initials of each entry supervisor who authorizes entry.</li>
<li><strong>The hazards of the space.</strong> Low oxygen, hydrogen sulfide, methane, engulfment, traffic, whatever applies.</li>
<li><strong>The measures used to isolate the space and control its hazards before entry.</strong> Lockout or tagging, plugging lines, purging, ventilating, flushing.</li>
<li><strong>The acceptable entry conditions.</strong> The limits the air and the space have to be within for anyone to go in.</li>
<li><strong>The test results</strong>, with the names or initials of the testers and when the tests were done.</li>
<li><strong>The rescue and emergency services you can summon, and how to summon them</strong>: the equipment to use and the numbers to call.</li>
<li><strong>The communication procedures</strong> entrants and attendants use to stay in contact.</li>
<li><strong>The equipment provided</strong>: PPE, testing equipment, communications, alarms and rescue equipment.</li>
<li><strong>Any other information needed</strong> for this particular space to keep people safe.</li>
<li><strong>Any additional permits</strong>, such as a hot work permit.</li>
</ol>
<p>Paragraph (f) of 1910.146 has the same items except number 5, and Cal/OSHA's section 1955 covers the same list for construction in California.</p>

<h2>Air test results</h2>
<p>OSHA's definition of a hazardous atmosphere in <a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146">1910.146(b)</a> includes:</p>
<blockquote class="reg"><p>"Flammable gas, vapor, or mist in excess of 10 percent of its lower flammable limit (LFL)"</p><p>"Atmospheric oxygen concentration below 19.5 percent or above 23.5 percent"</p><cite>29 CFR 1910.146(b), definition of hazardous atmosphere</cite></blockquote>
<p>It also covers toxic gases like hydrogen sulfide and carbon monoxide above their exposure limits. Those limits can be stricter in a state plan than under federal OSHA, so the permit's acceptable entry conditions should come from your program. Write down every reading with the time and who took it. Appendix B to 1910.146 says to test for oxygen first, then combustible gases, then toxic gases.</p>

<h2>Signing, posting, canceling and keeping it</h2>
<ul>
<li><strong>Signed before entry.</strong> The entry supervisor named on the permit signs it to authorize entry before entry begins (1926.1205(b); Cal/OSHA 1954).</li>
<li><strong>Available at the entry.</strong> The completed permit has to be available to the entrants at the time of entry, for example posted at the entry portal (1926.1205(c); 1910.146(e)(3)).</li>
<li><strong>Canceled when the work is done</strong>, or when a condition the permit doesn't allow comes up (1926.1205(e); 1910.146(e)(5)). Any problems during the entry get noted on the permit (1926.1205(f)).</li>
<li><strong>Kept at least 1 year.</strong> Canceled permits are kept for at least 1 year for the review of the permit space program (1926.1205(f); 1910.146(e)(6); Cal/OSHA 1954).</li>
</ul>

<h2>Filling it out in the field</h2>
<ul>
<li>Fill it out at the space, not in the truck from memory.</li>
<li>Put names, not "crew." The attendant has to know exactly who is inside.</li>
<li>Write the actual rescue number and who answers it. On some sites it's an on-site rescue team, not 911.</li>
<li>Log air readings with the time and the tester's name, every time you test.</li>
<li>When something changes that the permit doesn't allow, everyone gets out, and the permit gets canceled or suspended under your program.</li>
</ul>
<p><a href="/confined-space-permit-app/">The Pipelayer's Bible</a> has a permit form with a place for each of these items, an entry roster and an air test log with the tester and time. It records what the crew enters. It doesn't replace your safety program, your air monitor, training or your competent person.</p>
</article>
''' + related([('/confined-space-permit-app/', 'Confined space permit app', 'The permit, roster and air test log on the phone.'),
               ('/guides/', 'All guides', 'Grade stakes, rod readings and more.')]) + '''
</div></div>
''' + cta_band()
    return page(path, title, desc, body, article_ld(path, 'What goes on a confined space permit', desc, trail), section='/guides/', og_type='article')


GUIDES = [
    ('/guides/how-to-read-a-grade-stake/', 'How to read a grade stake', 'Hub and guard stake, station, offset, cut and fill, and how to turn the stake into an invert elevation and feet-inches.'),
    ('/guides/rod-reading-to-invert-step-by-step/', 'Rod reading to invert, step by step', 'Benchmark, backsight, HI and foresight, then the invert with the rod on the invert, on top of the pipe or under it.'),
    ('/guides/what-goes-on-a-confined-space-permit/', 'What goes on a confined space permit', 'Each item an entry permit has to identify under OSHA and Cal/OSHA, plus signing, posting, canceling and keeping it.'),
]


def guides_index():
    path = '/guides/'
    title = 'Guides for Pipelayers | The Pipelayer\'s Bible'
    desc = 'Plain guides for underground pipe crews: how to read a grade stake, rod reading to invert step by step, and what goes on a confined space entry permit.'
    trail = [('Home', '/'), ('Guides', path)]
    cards = ''.join('<li class="card"><h2><a href="%s">%s</a></h2><p>%s</p></li>' % (h, t, d) for h, t, d in GUIDES)
    body = hero(trail, 'Guides', 'Guides for pipe crews',
                'Plain explanations of the math and the paperwork that come with underground pipe work.') + '''
<div class="content"><div class="wrap">
<ul class="cards">''' + cards + '''</ul>
<div class="prose" style="margin-top:32px"><p>Want to run the numbers? The <a href="/tools/">free tools</a> do the grade, rod reading, trench sloping and volume math on your phone.</p></div>
</div></div>
''' + cta_band()
    ld = [ORG_LD, {'@type': 'CollectionPage', 'name': 'Guides for pipe crews', 'url': SITE + path, 'description': desc, 'publisher': ORG_REF,
                   'mainEntity': {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': SITE + h, 'name': t} for i, (h, t, d) in enumerate(GUIDES)]}},
          breadcrumb_ld(trail)]
    return page(path, title, desc, body, ld, section='/guides/')


def not_found():
    body = '''<section class="nf"><div class="wrap">
  <img src="/img/logo-192.png" width="88" height="88" alt="The Pipelayer's Bible logo">
  <h1>Off grade</h1>
  <p>That page isn't here. It may have moved.</p>
  <div class="btns">
    <a class="btn btn-primary" href="/">Go to the home page</a>
    <a class="btn btn-ghost" href="/tools/">Free tools</a>
    <a class="btn btn-ghost" href="/guides/">Guides</a>
  </div>
</div></section>'''
    return page('/404.html', "Page not found | The Pipelayer's Bible", "That page isn't here. Go to the home page, the free tools or the guides.", body, None, noindex=True)
