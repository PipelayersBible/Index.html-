# firstweek_web_nov22: website index.html edits (items 6, 7, 8, 9, 10, 12, 14). Exact-once. Run in the website clone:
#   python3 edit_index.py index.html
import sys
f = sys.argv[1]; s = open(f, encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:100]); s = s.replace(old, new)

PRICE = '$99 a month for your company and 5 people, $12 a month for each extra person'
# ---------- 6. JSON-LD: offers + FAQ answers ----------
rep('''   "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "url": "https://pipelayersbible.com/#start",
    "description": "Free 30-day trial for your company account plus 6 people. No credit card, and no automatic payment when it is over."
   },''', '''   "offers": [
    {
     "@type": "Offer",
     "name": "Company plan",
     "price": "99",
     "priceCurrency": "USD",
     "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "99",
      "priceCurrency": "USD",
      "unitText": "MONTH",
      "referenceQuantity": {"@type": "QuantitativeValue", "value": 1, "unitCode": "MON"}
     },
     "url": "https://pipelayersbible.com/#start",
     "description": "For your company and 5 people, $12 a month for each extra person, plus applicable tax. Free 30-day trial for your company account plus 6 people, no credit card, and no automatic payment when it is over."
    },
    {
     "@type": "Offer",
     "name": "Individual pipelayer plan",
     "price": "15",
     "priceCurrency": "USD",
     "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "15",
      "priceCurrency": "USD",
      "unitText": "MONTH",
      "referenceQuantity": {"@type": "QuantitativeValue", "value": 1, "unitCode": "MON"}
     },
     "description": "One person, no company: $15 a month or $144 a year, plus applicable tax."
    }
   ],''')
COST_LD = ("The company plan is " + PRICE + ", plus applicable tax. Try it free for 30 days first: your company account plus 6 people, with no credit card, "
           "and nothing is charged automatically. A pipelayer on his own can get the individual plan: $15 a month or $144 a year. "
           "The calculators and guides on this site are free, with no account.")
rep('"text": "The trial is free for 30 days: your company account plus 6 people, with no credit card. The app is in beta, and pricing is being set before the beta ends. You\'ll know the price before anyone asks you to pay, and nothing is charged automatically. The calculators and guides on this site are free, with no account."',
    '"text": "' + COST_LD + '"')
PHONE_OLD_LD = "On an iPhone: open it in Safari, tap Share, then Add to Home Screen. On Android: tap Install App in Chrome."
PHONE_NEW_LD = "On an iPhone: open it in Safari, tap ••• and then Share (or Share, if you see it), then Add to Home Screen. On Android: tap Install App in Chrome."
rep(PHONE_OLD_LD + ' Do this the first time where there\'s signal."', PHONE_NEW_LD + ' Do this the first time where there\'s signal."')
AFTER_OLD_LD = "Nothing is charged automatically, and there's no card on file to charge. Thomas talks with you about keeping it. Records already sent"
AFTER_NEW_LD = "Nothing is charged automatically, and there's no card on file to charge. To keep it, the company plan is " + PRICE + ". Records already sent"
rep('"text": "' + AFTER_OLD_LD, '"text": "' + AFTER_NEW_LD)
# 10. new FAQ entries, also in the JSON-LD (inserted before "Who owns our data?")
FAQ_NEW = [
 ("Bigger than 6 people?", "The free trial covers your company account plus 6 people. If more of your crew should try it, call or text Thomas at (909) 435-5250 about more seats. On a plan, every person past the first 5 is $12 a month."),
 ("Does it work in my state?", "Yes. It works in every state. The 811 ticket dates, trench rules and serious-injury reporting are set by state, for all 50 states and DC. Where we haven't confirmed a state's own rule, the app says so."),
 ("What does the AI do and how much can I use it?", "The AI reads survey stake photos, cut sheets and 811 tickets into the app, and answers civil work questions in Ask. You check what it reads before you use it. Each person on a company plan gets up to 25 AI requests a day (8 of them Ask questions) and 150 a month. The company account gets 5 a day. The individual plan gets 15 a day and 50 a month. During the free trial each person gets up to 30 a day. The app tells you when a limit is reached and when it resets."),
]
ld = ''.join('''    {
     "@type": "Question",
     "name": "%s",
     "acceptedAnswer": {
      "@type": "Answer",
      "text": "%s"
     }
    },
''' % (q, a) for q, a in FAQ_NEW)
rep('''    {
     "@type": "Question",
     "name": "Who owns our data?",''', ld + '''    {
     "@type": "Question",
     "name": "Who owns our data?",''')

# ---------- 8. header: small Sign in link ----------
rep('''.top-call .num{display:none}''', '''.top-call .num{display:none}
.top-signin{margin-left:auto;color:var(--on-dark);font-weight:700;font-size:15px;text-decoration:none;display:inline-flex;align-items:center;min-height:44px;padding:0 6px}
.top-signin:hover{color:var(--yellow)}
@media (max-width:419px){.topbar .wrap{gap:0 10px}.top-signin{padding:0 2px}.top-call{padding:0 12px}.top-call .word{display:none}}''')
rep('''@media (min-width:900px){.site-nav{order:2;width:auto;border-top:0;margin-left:auto}.site-nav ul{gap:0 24px}.top-call{order:4}}''',
    '''@media (min-width:900px){.site-nav{order:2;width:auto;border-top:0;margin-left:auto}.site-nav ul{gap:0 24px}.top-signin{order:3;margin-left:0}.top-call{order:4}}''')
rep('''    <a class="top-call" href="tel:+19094355250" aria-label="Call Thomas at (909) 435-5250">''',
    '''    <a class="top-signin" href="https://app.pipelayersbible.com">Sign in</a>
    <a class="top-call" href="tel:+19094355250" aria-label="Call Thomas at (909) 435-5250">''')

# ---------- 8. hero: the job in the headline, one screenshot on phones too, no "Open the app" button ----------
rep('''.hero h1{font-size:clamp(40px,11vw,72px);text-transform:uppercase;color:#fff;margin-bottom:.2em}''',
    '''.hero h1{font-size:clamp(30px,7.6vw,52px);text-transform:uppercase;color:#fff;margin-bottom:.4em;max-width:16em}''')
rep('''.hero-phone{display:none}''', '''.hero-phone{justify-self:center;width:min(230px,62vw)}''')
rep('''        <img class="hero-logo" src="/img/logo-192.png" width="88" height="88" alt="The Pipelayer's Bible logo: a gold scope crosshair on black">
        <h1 id="hero-title">The Pipelayer's <span>Bible</span></h1>
        <p class="tagline">Field to office, seamlessly</p>
        <p class="hero-sub">A phone app built for underground pipe crews: grade sheets, delay logs, confined space permits and daily reports. It works with no signal and puts the day's work in front of the foreman and the office without anyone retyping it.</p>
        <div class="hero-ctas">
          <a class="btn btn-primary" href="#start">Start a free trial</a>
          <a class="btn btn-ghost" href="https://app.pipelayersbible.com">Open the app
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></a>
        </div>''', '''        <h1 id="hero-title">Grade sheets, confined space permits and daily reports on your crew's phones. <span>Works with no signal.</span></h1>
        <p class="hero-sub">A phone app built for underground pipe crews. The day's work, with its delay log, reaches the foreman and the office without anyone retyping it.</p>
        <div class="hero-ctas">
          <a class="btn btn-primary" href="#start">Start a free trial</a>
        </div>''')
rep('''<img src="/img/shot-office-busy.webp" width="560" height="1212" loading="lazy" decoding="async" alt="Company Home''',
    '''<img src="/img/shot-office-busy.webp" width="560" height="1212" decoding="async" alt="Company Home''')

# ---------- 6. visible price ----------
rep('''<div><dt>What it costs</dt><dd>Free for 30 days, no card. Pricing is being set before the beta ends. <a href="#q-cost">More</a></dd></div>''',
    '''<div><dt>What it costs</dt><dd>$99 a month for your company and 5 people, $12 for each extra person. 30-day free trial, no card. <a href="#q-cost">More</a></dd></div>''')
rep('''<p class="trial-lead" style="font-size:17px">The app is in beta. Pricing is being set before the beta ends, and you'll know the price before anyone asks you to pay.</p>''',
    '''<p class="trial-lead" style="font-size:17px">After the trial: <strong>$99 a month for your company and 5 people</strong>, $12 a month for each extra person, plus applicable tax. A pipelayer on his own: individual plan, $15 a month.</p>''')
rep('''          <div class="ans"><p>The trial is free for 30 days: your company account plus 6 people, with no credit card. The app is in beta, and pricing is being set before the beta ends. You'll know the price before anyone asks you to pay, and nothing is charged automatically.</p>''',
    '''          <div class="ans"><p>The company plan is $99 a month for your company and 5 people, and $12 a month for each extra person, plus applicable tax. Try it free for 30 days first: your company account plus 6 people, with no credit card, and nothing is charged automatically.</p>
          <p>A pipelayer on his own can get the individual plan: $15 a month or $144 a year.</p>''')
rep('''On an iPhone: open it in Safari, tap Share, then Add to Home Screen. On Android: tap Install App in Chrome. Do this the first time where there's signal.</p></div>''',
    '''On an iPhone: open it in Safari, tap <b>•••</b> and then <b>Share</b> (or <b>Share</b>, if you see it), then <b>Add to Home Screen</b>. On Android: tap Install App in Chrome. Do this the first time where there's signal.</p></div>''')
rep('''<div class="ans"><p>Nothing is charged automatically, and there's no card on file to charge. Thomas talks with you about keeping it. Records already sent''',
    '''<div class="ans"><p>Nothing is charged automatically, and there's no card on file to charge. To keep it, the company plan is $99 a month for your company and 5 people, $12 a month for each extra person. Records already sent''')

# ---------- 7. takeoffs: not turned on yet in the app ----------
rep('''<li>Material takeoffs from your plan sets <span class="addon">add-on</span></li>''', '''<li>Material takeoffs from your plan sets <span class="addon">coming soon</span></li>''')

# ---------- 9. the edge features in the role lists ----------
rep('''            <li>Check shots, footage, slope and pipe info at a glance</li>''', '''            <li>Imports cut sheets: a PDF, a photo, or rows pasted in</li>
            <li>Lenker, engineer's and architect's rods</li>
            <li>HI cross-check: flags it when two shots don't agree on the instrument height</li>
            <li>Check shots, footage, slope and pipe info at a glance</li>''')
rep('''            <li>Warnings when an 811 ticket is nearly expired, in states where the ticket life is set by law</li>''',
    '''            <li>Warnings when an 811 ticket is nearly expired, in states where the ticket life is set by law</li>
            <li>811 and safety rules for all 50 states and DC: ticket dates, trench rules and injury reporting</li>''')
rep('''            <li>A sealed original of each run PDF, so a later change to that file would show</li>''',
    '''            <li>Sealed run records: a sealed original of each run PDF, so a later change to that file would show</li>''')

# ---------- 10. FAQ ----------
html = ''.join('''        <details id="%s">
          <summary>%s</summary>
          <div class="ans"><p>%s</p></div>
        </details>
''' % (i, q, a.replace("(909) 435-5250", '<a href="tel:+19094355250">(909) 435-5250</a>')) for i, (q, a) in zip(['q-seats', 'q-state', 'q-ai'], FAQ_NEW))
rep('''        <details>
          <summary>Who owns our data?</summary>''', html + '''        <details>
          <summary>Who owns our data?</summary>''')

# ---------- 12. trial form: state select + "check the marked field" ----------
STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']
opts = ''.join('\n                <option>%s</option>' % x for x in STATES)
rep('''            <div class="field">
              <label for="f-crew">Crew size <span class="opt">(optional)</span></label>''', '''            <div class="field">
              <label for="f-state">State you work in <span class="opt">(optional)</span></label>
              <select id="f-state" name="state" autocomplete="address-level1" aria-describedby="e-state">
                <option value="">Choose one</option>''' + opts + '''
                <option>More than one state</option>
              </select>
              <div class="err" id="e-state"></div>
            </div>
          </div>
          <div class="row2">
            <div class="field">
              <label for="f-crew">Crew size <span class="opt">(optional)</span></label>''')
rep('''      phone: val('phone'), crew_size: val('crew_size'), message: val('message'),''',
    '''      phone: val('phone'), crew_size: val('crew_size'), state: val('state'), message: val('message'),''')
rep('''  var FAIL = ''', '''  var CHECK = 'Check the marked field and send again.';
  var FAIL = ''')
rep('''      if (res.j && res.j.error === 'invalid' && res.j.fields && res.j.fields.length) {
        res.j.fields.forEach(function (f) { setErr(f, 'Check this field.'); });
      }
      throw new Error('failed');
    }).catch(function () {
      statusEl.className = 'status fail'; statusEl.innerHTML = FAIL;''', '''      if (res.j && res.j.error === 'invalid' && res.j.fields && res.j.fields.length) {
        var firstBad = null;
        res.j.fields.forEach(function (f) { setErr(f, 'Check this field.'); if (!firstBad && form.elements[f]) firstBad = form.elements[f]; });
        var e = new Error('fields'); e.fields = true; e.first = firstBad; throw e;
      }
      throw new Error('failed');
    }).catch(function (e) {
      statusEl.className = 'status fail';
      if (e && e.fields) { statusEl.textContent = CHECK; if (e.first) e.first.focus(); }
      else statusEl.innerHTML = FAIL;''')
rep('''  function setErr(n, msg) {
    var el = form.elements[n], e = document.getElementById('e-' + (n === 'message' ? 'msg' : n));''', '''  function setErr(n, msg) {
    var el = form.elements[n], e = document.getElementById('e-' + (n === 'message' ? 'msg' : n === 'crew_size' ? 'crew' : n));''')

# ---------- 14. footer ----------
rep('''      <li><a href="https://app.pipelayersbible.com">Open the app</a></li>''', '''      <li><a href="https://app.pipelayersbible.com">Sign in</a></li>''')
rep('''<p class="copy">&copy; 2026 The Pipelayer's Bible</p>''', '''<p class="copy">&copy; 2026 Desert Infrastructure Group</p>''')
open(f, 'w', encoding='utf-8').write(s)
print('index.html: ok')
