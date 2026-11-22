# A-12: the app's fonts (Inter, Oswald, IBM Plex Mono) come with the app instead of from Google's servers.
# Before: a <link> to fonts.googleapis.com that the service worker never kept, so with no signal (the normal jobsite
# case) the app fell back to the phone's own fonts and looked different, and every open sent the phone's IP to Google.
# Now: 4 woff2 files (latin, OFL licensed, from the fontsource npm packages: Inter and Oswald as variable fonts so every
# weight the CSS uses is exact, Plex Mono 500/600; 107 KB in all) published under pbx/ with a fingerprint in the name.
# The page names them with data-pb-src="pbx/..." (inert <meta> tags), which is how the service worker already finds
# the lazily loaded parts: it stores them at install / update and serves pbx/* cache-first, and keeps only what the
# page names. No sw.js change. font-display: swap, so a missing file (the raw _src copy, which has no pbx/) shows the
# phone's fonts exactly as before. Release: copy tests/staged/design_nov22/fonts/pbx/*.woff2 into pbx/ (build.sh puts
# them in build/pbx and build_hooks/pbx).
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
HERE = os.path.dirname(os.path.abspath(__file__))
FD = os.path.join(HERE, '..', '..', 'fonts', 'pbx')
names = sorted(os.listdir(FD))
def nm(prefix): m = [n for n in names if n.startswith(prefix)]; assert len(m) == 1, (prefix, m); return m[0]
inter, osw, pm5, pm6 = nm('inter-latin-var-'), nm('oswald-latin-var-'), nm('plexmono-latin-500-'), nm('plexmono-latin-600-')
p = P()
css = ("<style>/* design A-12: the fonts ship with the app (pbx/, kept by the service worker for use with no signal) */\n"
 "@font-face { font-family: 'Inter'; font-style: normal; font-weight: 100 900; font-display: swap; src: url('pbx/%s') format('woff2'); }\n"
 "@font-face { font-family: 'Oswald'; font-style: normal; font-weight: 200 700; font-display: swap; src: url('pbx/%s') format('woff2'); }\n"
 "@font-face { font-family: 'IBM Plex Mono'; font-style: normal; font-weight: 500; font-display: swap; src: url('pbx/%s') format('woff2'); }\n"
 "@font-face { font-family: 'IBM Plex Mono'; font-style: normal; font-weight: 600; font-display: swap; src: url('pbx/%s') format('woff2'); }\n"
 "</style>\n") % (inter, osw, pm5, pm6)
marks = ''.join('<meta name="pb-part" content="font" data-pb-src="pbx/%s">\n' % n for n in (inter, osw, pm5, pm6))
p.rep("""<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" media="print" onload="this.media='all'">
""", marks + css)
p.rep("""/* r15.56: the fonts come from the <link> above, which never holds up the page (an @import here made the app script wait for them) */""",
      """/* r15.56: the fonts never hold up the page (design A-12: @font-face above, files in pbx/, font-display: swap) */""")
p.save()
