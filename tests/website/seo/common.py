# Shared page shell for the static SEO pages of pipelayersbible.com.
# The pages are generated once and committed as plain HTML; the site itself has no build step.
import json, html, os

SITE = 'https://pipelayersbible.com'
ROOT = '/tmp/claude-0/website'
TODAY = '2026-11-19'
OG_IMG = SITE + '/img/og-share.png'
ORG_ID = SITE + '/#org'

PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'

GOATCOUNTER = '<script data-goatcounter="https://pipelayersbible.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>'

NAV_ITEMS = [('/', 'Home'), ('/tools/', 'Free tools'), ('/guides/', 'Guides'), ('/#start', 'Start a free trial')]


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def nav_html(section):
    out = []
    for href, label in NAV_ITEMS:
        attrs = ''
        if href == '/#start':
            attrs = ' class="nav-cta"'
        elif section and href == section:
            attrs = ' aria-current="page"'
        out.append('<li><a href="%s"%s>%s</a></li>' % (href, attrs, label))
    return '<nav class="site-nav" aria-label="Main"><ul>' + ''.join(out) + '</ul></nav>'


def header_html(section):
    return ('<header class="topbar">\n  <div class="wrap">\n'
            '    <a class="brand" href="/" aria-label="The Pipelayer\'s Bible, home">\n'
            '      <img src="/img/logo-96.png" width="40" height="40" alt="">\n'
            '      <span><small>The</small>Pipelayer\'s Bible</span>\n    </a>\n'
            '    ' + nav_html(section) + '\n'
            '    <a class="top-call" href="tel:+19094355250" aria-label="Call Thomas at (909) 435-5250">\n'
            '      ' + PHONE_SVG + '\n'
            '      <span class="word">Call</span><span class="num">(909) 435-5250</span>\n    </a>\n'
            '  </div>\n</header>')


FOOTER = '''<footer class="site-foot">
  <div class="wrap">
    <div class="foot-brand">
      <a class="brand" href="/" aria-label="The Pipelayer's Bible, home"><img src="/img/logo-96.png" width="40" height="40" alt=""><span><small>The</small>Pipelayer's Bible</span></a>
      <p>Field to office, seamlessly</p>
    </div>
    <div>
      <p class="foot-h">Free tools and guides</p>
      <ul class="foot-links">
        <li><a href="/tools/pipe-grade-calculator/">Pipe grade calculator</a></li>
        <li><a href="/tools/rod-reading-to-invert/">Rod reading to invert</a></li>
        <li><a href="/tools/trench-sloping/">Trench sloping</a></li>
        <li><a href="/tools/pipe-volume-weight/">Pipe volume and backfill</a></li>
        <li><a href="/guides/">All guides</a></li>
      </ul>
    </div>
    <div>
      <p class="foot-h">The app</p>
      <ul class="foot-links">
        <li><a href="/grade-and-cut-sheet-app/">Grade and cut sheets</a></li>
        <li><a href="/daily-reports-for-underground-crews/">Daily reports</a></li>
        <li><a href="/confined-space-permit-app/">Confined space permits</a></li>
        <li><a href="https://app.pipelayersbible.com">Open the app</a></li>
        <li><a href="https://app.pipelayersbible.com/terms.html">Terms</a></li>
        <li><a href="https://app.pipelayersbible.com/privacy.html">Privacy</a></li>
        <li><a href="tel:+19094355250">(909) 435-5250</a></li>
        <li><a href="mailto:tfontaine@pipelayersbible.com">tfontaine@pipelayersbible.com</a></li>
      </ul>
    </div>
    <p class="copy">&copy; 2026 The Pipelayer's Bible</p>
    <p class="copy">This site counts visits with GoatCounter: no cookies and no personal tracking.</p>
  </div>
</footer>'''


def cta_band(heading='Try the full app free', text=None):
    text = text or ("The Pipelayer's Bible puts grade, delays, permits and the daily report on the crew's phones, and sends them to the foreman and the office when there's signal. 30 days free for your company and 6 people. No credit card.")
    return ('<section class="cta-band" aria-labelledby="cta-title">\n  <div class="wrap">\n'
            '    <h2 id="cta-title">' + heading + '</h2>\n'
            '    <p>' + text + '</p>\n'
            '    <div class="btns"><a class="btn btn-primary" href="/#start">Start a free trial</a>'
            '<a class="btn btn-ghost" href="tel:+19094355250">Call (909) 435-5250</a></div>\n'
            '  </div>\n</section>')


def crumbs_html(trail):
    # trail: [(name, path)], last is the current page
    items = []
    for i, (name, path) in enumerate(trail):
        if i == len(trail) - 1:
            items.append('<li><span aria-current="page">%s</span></li>' % esc(name))
        else:
            items.append('<li><a href="%s">%s</a></li>' % (path, esc(name)))
    return '<nav class="crumbs" aria-label="Breadcrumb"><ol>' + ''.join(items) + '</ol></nav>'


def breadcrumb_ld(trail):
    return {
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': SITE + path}
            for i, (name, path) in enumerate(trail)
        ],
    }


ORG_REF = {'@id': ORG_ID}
ORG_LD = {
    '@type': 'Organization', '@id': ORG_ID, 'name': "The Pipelayer's Bible", 'url': SITE + '/',
    'logo': SITE + '/img/logo-192.png', 'telephone': '+1-909-435-5250', 'email': 'tfontaine@pipelayersbible.com',
}


def ld_script(graph):
    data = {'@context': 'https://schema.org', '@graph': graph}
    s = json.dumps(data, ensure_ascii=False, indent=1)
    assert '</' not in s
    return '<script type="application/ld+json">\n' + s + '\n</script>'


def page(path, title, description, body, ld_graph, section=None, og_type='website', extra_head='', noindex=False):
    assert '—' not in title + description + body, 'em-dash in ' + path
    url = SITE + path
    head = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(t)s</title>
<link rel="preload" href="/fonts/oswald-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css">
<meta name="description" content="%(d)s">
%(robots)s
<meta name="theme-color" content="#111318">
<meta name="color-scheme" content="light">
<meta property="og:type" content="%(ogt)s">
<meta property="og:site_name" content="The Pipelayer's Bible">
<meta property="og:title" content="%(t)s">
<meta property="og:description" content="%(d)s">
<meta property="og:url" content="%(u)s">
<meta property="og:image" content="%(img)s">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The Pipelayer's Bible logo, a gold scope on black, with the words Field to office, seamlessly">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="%(t)s">
<meta name="twitter:description" content="%(d)s">
<meta name="twitter:image" content="%(img)s">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
%(ld)s
%(extra)s</head>
<body>
<a class="skip" href="#main">Skip to content</a>
''' % {'t': esc(title), 'd': esc(description), 'u': url, 'ogt': og_type, 'img': OG_IMG,
       'ld': ld_script(ld_graph) if ld_graph else '', 'extra': extra_head,
       'robots': '<meta name="robots" content="noindex">\n' if noindex else '<link rel="canonical" href="%s">\n' % url}
    doc = head + header_html(section) + '\n\n<main id="main">\n' + body + '\n</main>\n\n' + FOOTER + '\n' + GOATCOUNTER + '\n</body>\n</html>\n'
    assert '—' not in doc, 'em-dash in ' + path
    out = os.path.join(ROOT, path.strip('/'), 'index.html') if path != '/404.html' else os.path.join(ROOT, '404.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(doc)
    return out


def hero(trail, eyebrow, h1, lead, byline=None):
    return ('<section class="page-hero" aria-labelledby="page-title">\n  <div class="wrap">\n'
            '    ' + crumbs_html(trail) + '\n'
            '    <p class="eyebrow" style="margin-top:18px">' + eyebrow + '</p>\n'
            '    <h1 id="page-title">' + h1 + '</h1>\n'
            '    <p class="lead">' + lead + '</p>\n'
            + ('    <p class="byline">' + byline + '</p>\n' if byline else '') +
            '  </div>\n  <div class="stripe" aria-hidden="true"></div>\n</section>')


def shot(src, alt, title, cap):
    return ('<figure class="shot"><div class="phone"><img src="/img/%s" width="560" height="1212" loading="lazy" decoding="async" alt="%s"></div>'
            '<figcaption><b>%s</b>%s</figcaption></figure>') % (src, esc(alt), title, cap)
