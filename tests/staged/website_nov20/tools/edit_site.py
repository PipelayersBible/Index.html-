#!/usr/bin/env python3
# Applies the Nov 20 wording changes to a clone of PipelayersBible/website (run once on commit 581f74b).
# usage: python3 edit_site.py /path/to/clone
import sys, re, json, html, os
root = sys.argv[1]
def rd(p): return open(os.path.join(root, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(root, p), 'w', encoding='utf-8').write(s)
def rep(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70])
    return s.replace(a, b)

# ---------------- home ----------------
s = rd('index.html')
# legal review lines 1-9
s = rep(s, 'Calculates pipe grades from survey stake photos or manually entered survey data', 'Works out pipe grades from survey stake photos (read by AI, then checked by you) or from numbers you enter')
s = rep(s, 'Confined space permits and entry log, with a one-tap emergency call', "Confined space permits and entry log, with an emergency button that opens the phone's dialer")
s = rep(s, "Sees his crew's run progress live", "Sees his crew's run progress as their phones send it")
s = rep(s, 'Warnings when an 811 ticket is nearly expired', 'Warnings when an 811 ticket is nearly expired, in states where the ticket life is set by law')
s = rep(s, 'A PDF of every run, time-stamped at every point', "A PDF of every run, with the phone's time at every point")
s = rep(s, 'A sealed original of each run PDF, so any later change would show', 'A sealed original of each run PDF, so a later change to that file would show')
s = rep(s, 'Search and export every record', 'Search your records and export runs, daily reports and permits')
s = rep(s, "Built-in AI for civil work questions, crew management and your company's data", "Built-in AI for civil work questions and for questions about your company's own numbers")
s = rep(s, 'Thomas sets up your company the same day and sends them the invite.', 'Thomas sets up your company, usually the same day, and sends them the invite.')
# screenshot words that said "live"
s = rep(s, '4 active runs and 1 active permit live now', '4 active runs and 1 active permit under Live now')

# hero: say what it does
OLD_SUB = "A phone app built for underground pipe crews. It works with no signal and puts the day's work in front of the foreman and the office without anyone retyping it."
NEW_SUB = "A phone app built for underground pipe crews: grade sheets, delay logs, confined space permits and daily reports. It works with no signal and puts the day's work in front of the foreman and the office without anyone retyping it."
s = rep(s, '<p class="hero-sub">' + OLD_SUB, '<p class="hero-sub">' + NEW_SUB)
s = rep(s, '"description": "' + OLD_SUB + '"', '"description": "' + NEW_SUB + '"')
s = rep(s, '<p class="hero-note">30 days free for your company and 6 people. No credit card.</p>', '<p class="hero-note">30 days free for your company and 6 people. No credit card. Built by an underground foreman.</p>')

# quick answers strip under the hero
QUICK = '''  <section class="quick" aria-labelledby="quick-title">
    <div class="wrap">
      <h2 id="quick-title" class="sr">Quick answers</h2>
      <dl>
        <div><dt>Who it's for</dt><dd>Sewer, storm drain and water crews: pipelayers, foremen, superintendents and the office.</dd></div>
        <div><dt>What it costs</dt><dd>Free for 30 days, no card. Pricing is being set before the beta ends. <a href="#q-cost">More</a></dd></div>
        <div><dt>Getting it</dt><dd>iPhone and Android, no app store. It installs from an invite link. <a href="#q-phone">How</a></dd></div>
        <div><dt>No signal</dt><dd>Runs, calculators and permits work offline and send later. <a href="#q-signal">Details</a></dd></div>
        <div><dt>Who built it</dt><dd>Thomas Fontaine, an underground foreman. Call or text <a href="tel:+19094355250">(909) 435-5250</a>.</dd></div>
      </dl>
    </div>
  </section>

'''
s = rep(s, '  <section class="story" aria-labelledby="story-title">', QUICK + '  <section class="story" aria-labelledby="story-title">')
CSS = '''/* quick answers */
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.quick{padding:26px 0;background:var(--card);border-bottom:1px solid var(--rule)}
.quick dl{margin:0;display:grid;gap:16px}
.quick dl>div{border-left:4px solid var(--yellow);padding:2px 0 2px 14px}
.quick dt{font-family:var(--head);font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:14px;color:var(--brand);margin:0 0 2px}
.quick dd{margin:0;font-size:16px;line-height:1.45}
@media (min-width:640px){.quick dl{grid-template-columns:repeat(2,1fr);gap:20px 28px}}
@media (min-width:1000px){.quick dl{grid-template-columns:repeat(5,1fr);gap:20px}}
.faq details{scroll-margin-top:16px}

/* story */'''
s = rep(s, '/* story */', CSS)
s = rep(s, 'Thomas Fontaine has spent 12 years in underground construction. He built', 'Thomas Fontaine is an underground foreman with 12 years in underground construction. He built')

# trial: price line
s = rep(s, '(footage, delays, inspections, paperwork sent) to show the owner.</p>', "(footage, delays, inspections, paperwork sent) to show the owner.</p>\n      <p class=\"trial-lead\" style=\"font-size:17px\">The app is in beta. Pricing is being set before the beta ends, and you'll know the price before anyone asks you to pay.</p>")

# FAQ: ids on existing, new questions
s = rep(s, '<details>\n          <summary>Does it work with no signal?</summary>', '<details id="q-signal">\n          <summary>Does it work with no signal?</summary>')
OLD_PHONE = '''        <details>
          <summary>What phones does it work on?</summary>
          <div class="ans"><p>iPhone and Android. It runs in the phone's browser, and you add it to the home screen so it opens like any other app. No app store needed. The first time, open it and sign in where there's signal.</p></div>
        </details>
'''
assert OLD_PHONE in s
NEW_BLOCK = '''        <details id="q-cost">
          <summary>What does it cost?</summary>
          <div class="ans"><p>The trial is free for 30 days: your company account plus 6 people, with no credit card. The app is in beta, and pricing is being set before the beta ends. You'll know the price before anyone asks you to pay, and nothing is charged automatically.</p>
          <p>The <a href="/tools/">calculators</a> and <a href="/guides/">guides</a> on this site are free, with no account.</p></div>
        </details>
        <details id="q-phone">
          <summary>How do I get it on my phone?</summary>
          <div class="ans"><p>It works on iPhone and Android and it isn't in the app store. <a href="#start">Ask for a trial</a> and Thomas sets up your company and emails an invite to whoever will run it. They open the link, choose a password, and add the crew from the app.</p>
          <p>The app then shows how to put it on the home screen so it opens like any other app. On an iPhone: open it in Safari, tap Share, then Add to Home Screen. On Android: tap Install App in Chrome. Do this the first time where there's signal.</p></div>
        </details>
        <details>
          <summary>Does my crew need email addresses?</summary>
          <div class="ans"><p>No. The office or a foreman can text a join link to a foreman or pipelayer. He taps it, agrees to the Terms and he's on the crew, with no email and no password. A link works once and lasts 24 hours.</p></div>
        </details>
        <details>
          <summary>Who is it for?</summary>
          <div class="ans"><p>Crews that put sewer, storm drain and water pipe in the ground, and the people they report to. The pipelayer gets the grade sheet, check shots, the delay log and the permit. The foreman gets his crew's progress and a daily report that's already filled in. The superintendent, PM and office get every job, every signed report and the run records.</p>
          <p>See <a href="/grade-and-cut-sheet-app/">grade and cut sheets</a>, <a href="/daily-reports-for-underground-crews/">daily reports</a> and <a href="/confined-space-permit-app/">confined space permits</a>.</p></div>
        </details>
        <details>
          <summary>Who's behind it?</summary>
          <div class="ans"><p>Thomas Fontaine, an underground foreman with 12 years in underground construction. He built it and he's the one who answers: call or text <a href="tel:+19094355250">(909) 435-5250</a> or email <a href="mailto:tfontaine@pipelayersbible.com">tfontaine@pipelayersbible.com</a>.</p></div>
        </details>
'''
s = s.replace(OLD_PHONE, NEW_BLOCK)
OLD_SAFE = '<summary>Does it replace our safety program?</summary>'
s = rep(s, OLD_SAFE, OLD_SAFE)
NEW_OSHA = '''        <details>
          <summary>Is it OSHA approved?</summary>
          <div class="ans"><p>No, and nothing is: OSHA doesn't approve or certify apps. The permit form is built around the permit items in federal OSHA 29 CFR 1926.1206, and the trench calculator does the arithmetic on OSHA's Table B-1. Your state may be stricter than federal OSHA. Your competent person and your company's program decide what's safe and what's required.</p></div>
        </details>
        <details>
          <summary>Is the AI always right?</summary>'''
s = rep(s, '        <details>\n          <summary>Is the AI always right?</summary>', NEW_OSHA)

# rebuild the FAQPage structured data from the page's own questions, so the two can't drift
def txt(h):
    h = re.sub(r'</p>\s*<p>', ' ', h); h = re.sub(r'<[^>]+>', '', h); return re.sub(r'\s+', ' ', html.unescape(h)).strip()
faq = s[s.index('<div class="faq-list">'):s.index('<section class="signup"')]
qs = re.findall(r'<summary>(.*?)</summary>\s*<div class="ans">(.*?)</div>\s*</details>', faq, re.S)
assert len(qs) == 11, len(qs)
ld_m = re.search(r'<script type="application/ld\+json" id="site-ld">\n(.*?)\n</script>', s, re.S)
ld = json.loads(ld_m.group(1))
for g in ld['@graph']:
    if g['@type'] == 'FAQPage':
        g['mainEntity'] = [{'@type': 'Question', 'name': txt(q), 'acceptedAnswer': {'@type': 'Answer', 'text': txt(a)}} for q, a in qs]
    if g['@type'] == 'Organization':
        g['founder'] = {'@type': 'Person', 'name': 'Thomas Fontaine', 'jobTitle': 'Underground foreman'}
        g['contactPoint'] = {'@type': 'ContactPoint', 'telephone': '+1-909-435-5250', 'email': 'tfontaine@pipelayersbible.com', 'contactType': 'sales and support', 'areaServed': 'US', 'availableLanguage': 'English'}
s = s[:ld_m.start(1)] + json.dumps(ld, indent=1, ensure_ascii=False) + s[ld_m.end(1):]
# footer: all four tools + new guide
s = rep(s, '        <li><a href="/tools/trench-sloping/">Trench sloping</a></li>\n        <li><a href="/grade-and-cut-sheet-app/">', '        <li><a href="/tools/rod-reading-to-invert/">Rod reading to invert</a></li>\n        <li><a href="/tools/trench-sloping/">Trench sloping</a></li>\n        <li><a href="/guides/trench-depth-rules/">Trench depth rules</a></li>\n        <li><a href="/grade-and-cut-sheet-app/">')
wr('index.html', s)

# ---------------- confined space page ----------------
p = 'confined-space-permit-app/index.html'; s = rd(p)
s = rep(s, 'air test log with tester and time, one-tap emergency call. No signal needed.', 'air test log with tester and time, emergency button that opens the dialer. Works offline.', 4)
s = rep(s, "A one-tap button that opens the phone's dialer", "A button that opens the phone's dialer")
s = rep(s, 'Active permits show live for the office, next to the runs.', "Active permits show for the office next to the runs, as the phones send them.")
wr(p, s)

# ---------------- grade page ----------------
p = 'grade-and-cut-sheet-app/index.html'; s = rd(p)
s = rep(s, 'the phone makes a PDF of it, time-stamped at every point. The office gets a sealed original of each run PDF, so any later change would show.', "the phone makes a PDF of it, with the phone's time at every point. The office gets a sealed original of each run PDF, so a later change to that file would show.")
wr(p, s)

# ---------------- daily reports page ----------------
p = 'daily-reports-for-underground-crews/index.html'; s = rd(p)
s = rep(s, "Every record can be searched and exported. A crew's run progress shows live, so nobody has to call the foreman to ask how far they got.", "Records can be searched, and runs, daily reports and permits can be exported. A crew's run progress shows as their phones send it, so the office can see how far they got without calling the foreman. A phone with no signal shows what it last sent.")
s = rep(s, "the foreman gets a warning when it's nearly expired: 7 days before, 2 days before, and on the day.", "the foreman gets a warning when it's nearly expired: 7 days before, 2 days before, and on the day. That works in states where the ticket life is set by law. In the others the app shows no expiry date, so go by your ticket.")
wr(p, s)
print('ok')
