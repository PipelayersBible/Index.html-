#!/usr/bin/env python3
"""Generate the SEO pages of pipelayersbible.com into /tmp/claude-0/website and update index.html, sitemap.xml and robots.txt.
Run: python3 /tmp/claude-0/site/tools/seo/build.py   (safe to run again; the index.html edits are idempotent)."""
import json, re, sys, os, html as H
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import tools_pages as T
import content_pages as C

pages = [
    T.tools_index(), T.grade_page(), T.rod_page(), T.trench_page(), T.vol_page(),
    C.guides_index(), C.guide_stake(), C.guide_rod(), C.guide_permit(),
    C.grade_landing(), C.daily_landing(), C.permit_landing(), C.not_found(),
]

# ---------------- index.html ----------------
IDX = os.path.join(ROOT, 'index.html')
src = open(IDX, encoding='utf-8').read()

NEW_TITLE = "Pipe Grade, Cut Sheet &amp; Daily Report App | The Pipelayer's Bible"
NEW_DESC = "App for underground pipe crews: grade from stakes and cut sheets, daily reports, confined space permits. Works with no signal. Free 30-day trial."
src = re.sub(r'<title>.*?</title>', '<title>' + NEW_TITLE + '</title>', src, count=1)
src = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + H.escape(NEW_DESC) + '">', src, count=1)
src = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="' + NEW_TITLE + '">', src, count=1)
src = re.sub(r'<meta name="twitter:title" content="[^"]*">', '<meta name="twitter:title" content="' + NEW_TITLE + '">', src, count=1)


def text_of(fragment):
    t = re.sub(r'</?(p|div|br|li|ul|ol)\b[^>]*>', ' ', fragment)  # block tags separate words
    t = re.sub(r'<[^>]+>', '', t)  # inline tags (links) don't
    t = H.unescape(t)
    return re.sub(r'\s+', ' ', t).strip()


# FAQ: the visible questions and answers, word for word (paragraphs joined with a space)
faq = []
for m in re.finditer(r'<details>\s*<summary>(.*?)</summary>\s*<div class="ans">(.*?)</div>\s*</details>', src, re.S):
    faq.append({'@type': 'Question', 'name': text_of(m.group(1)), 'acceptedAnswer': {'@type': 'Answer', 'text': text_of(m.group(2))}})
assert len(faq) == 6, len(faq)

graph = [
    ORG_LD,
    {'@type': 'WebSite', '@id': SITE + '/#website', 'url': SITE + '/', 'name': "The Pipelayer's Bible", 'publisher': ORG_REF, 'inLanguage': 'en-US'},
    {'@type': 'SoftwareApplication', '@id': SITE + '/#app', 'name': "The Pipelayer's Bible", 'url': 'https://app.pipelayersbible.com',
     'applicationCategory': 'BusinessApplication', 'operatingSystem': 'iOS, Android (web app)',
     'description': "A phone app built for underground pipe crews. It works with no signal and puts the day's work in front of the foreman and the office without anyone retyping it.",
     'image': SITE + '/img/og-share.png', 'screenshot': [SITE + '/img/shot-grade-sheet.webp', SITE + '/img/shot-daily-report.webp'],
     'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD', 'url': SITE + '/#start',
                'description': 'Free 30-day trial for your company account plus 6 people. No credit card, and no automatic payment when it is over.'},
     'publisher': ORG_REF},
    {'@type': 'FAQPage', '@id': SITE + '/#faq', 'mainEntity': faq},
]
ld = '<script type="application/ld+json" id="site-ld">\n' + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=1) + '\n</script>\n'
src = re.sub(r'<script type="application/ld\+json" id="site-ld">.*?</script>\n', '', src, flags=re.S)
src = src.replace('</head>', ld + '</head>', 1)

# nav CSS (inside the inline style, once)
NAV_CSS = '''/* site nav (same as css/site.css) */
.topbar .wrap{flex-wrap:wrap;gap:0 12px}
.brand{min-height:64px}
.site-nav{order:3;width:100%;border-top:1px solid var(--ink-3)}
.site-nav ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 8px}
.site-nav a{display:inline-flex;align-items:center;min-height:44px;color:var(--on-dark);text-decoration:none;font-weight:700;font-size:15px;white-space:nowrap}
.site-nav a:hover{color:var(--yellow)}
.site-nav a[aria-current="page"]{color:var(--yellow);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:6px}
.site-nav .nav-cta{color:var(--yellow)}
@media (min-width:900px){.site-nav{order:2;width:auto;border-top:0;margin-left:auto}.site-nav ul{gap:0 24px}.top-call{order:4}}
.foot-h{font-family:var(--head);text-transform:uppercase;letter-spacing:.1em;font-size:14px;color:var(--yellow);margin:0 0 4px}
'''
src = re.sub(r'/\* site nav \(same as css/site.css\) \*/\n.*?\.foot-h\{[^\n]*\}\n', '', src, flags=re.S)
src = src.replace('\n/* hero */', '\n' + NAV_CSS + '\n/* hero */', 1)

# header nav (between the brand and the call button)
nav = nav_html('/').replace(' aria-current="page"', ' aria-current="page"')
src = re.sub(r'\n    <nav class="site-nav".*?</nav>', '', src, flags=re.S)
src = src.replace('''      <span><small>The</small>Pipelayer's Bible</span>
    </a>
    <a class="top-call"''', '''      <span><small>The</small>Pipelayer's Bible</span>
    </a>
    ''' + nav + '''
    <a class="top-call"''', 1)

# footer: tools and guides links
FOOT_EXTRA = '''    <div class="foot-more">
      <p class="foot-h">Free tools and guides</p>
      <ul class="foot-links">
        <li><a href="/tools/">Free tools</a></li>
        <li><a href="/guides/">Guides</a></li>
        <li><a href="/tools/pipe-grade-calculator/">Pipe grade calculator</a></li>
        <li><a href="/tools/trench-sloping/">Trench sloping</a></li>
        <li><a href="/grade-and-cut-sheet-app/">Grade and cut sheets</a></li>
        <li><a href="/daily-reports-for-underground-crews/">Daily reports</a></li>
        <li><a href="/confined-space-permit-app/">Confined space permits</a></li>
      </ul>
    </div>
'''
src = re.sub(r'    <div class="foot-more">.*?</div>\n', '', src, flags=re.S)
src = src.replace('    <p class="copy">&copy; 2026', FOOT_EXTRA + '    <p class="copy">&copy; 2026', 1)
src = src.replace('@media (min-width:900px){.site-foot .wrap{grid-template-columns:1fr 1.4fr;align-items:center}.copy{grid-column:1/-1}}',
                  '@media (min-width:900px){.site-foot .wrap{grid-template-columns:1fr 1.4fr;align-items:center}.foot-more,.copy{grid-column:1/-1}}')
assert '—' not in src
open(IDX, 'w', encoding='utf-8').write(src)

# ---------------- sitemap and robots ----------------
urls = ['/', '/grade-and-cut-sheet-app/', '/daily-reports-for-underground-crews/', '/confined-space-permit-app/',
        '/tools/', '/tools/pipe-grade-calculator/', '/tools/rod-reading-to-invert/', '/tools/trench-sloping/', '/tools/pipe-volume-weight/',
        '/guides/', '/guides/how-to-read-a-grade-stake/', '/guides/rod-reading-to-invert-step-by-step/', '/guides/what-goes-on-a-confined-space-permit/']
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
    '  <url>\n    <loc>%s%s</loc>\n    <lastmod>%s</lastmod>\n  </url>\n' % (SITE, u, TODAY) for u in urls) + '</urlset>\n'
open(os.path.join(ROOT, 'sitemap.xml'), 'w').write(sm)
open(os.path.join(ROOT, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\n\nSitemap: https://pipelayersbible.com/sitemap.xml\n')
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'urls.json'), 'w').write(json.dumps(urls))
print('wrote', len(pages), 'pages; index.html, sitemap.xml (%d urls), robots.txt' % len(urls))
