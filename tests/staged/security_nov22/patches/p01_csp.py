# security_nov22 p01 (review finding 7, LOW): a Content-Security-Policy for the app page, as a <meta> in <head>.
# python3 p01_csp.py in.html out.html   (exact-once; on _src/index.html r17.14)
# What it limits (with what the app really uses, measured Nov 21 2026):
#   scripts      the page itself, cdn.jsdelivr.net (supabase-js). 'unsafe-inline' is REQUIRED: the page is one HTML file
#                with ~15 inline <script> blocks, ~1,400 inline on*= handlers, and jsPDF/pdf.js code injected as inline
#                script text (pbLazy*). No 'unsafe-eval' (pdf.js runs with isEvalSupported: false).
#   connect      the page's own origin (data/, pbx/), Supabase (REST, Auth, Storage, Functions, Realtime wss), Sentry
#                ingest, OpenStreetMap reverse geocode (photo stamp), cdnjs (pdf.js cMaps + standard fonts), jsdelivr.
#   images       self, data:, blob:, Supabase storage. fonts: self (self-hosted later), data: (pdf.js), Google Fonts.
#   workers      self + blob: (the pdf.js worker is a blob URL). frames: self, blob:, data: (PDF preview windows).
#   object-src 'none'; base-uri 'self'; form-action 'self'.
# frame-ancestors and report-uri can't be set from a <meta> (browsers ignore them there): add them as HTTP headers if the
# host ever allows headers (GitHub Pages doesn't).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import rep
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
SB = 'rogfassochneycezecxa.supabase.co'
csp = '; '.join([
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://" + SB,
  "media-src 'self' data: blob:",
  "connect-src 'self' https://" + SB + " wss://" + SB + " https://o4512143154806784.ingest.us.sentry.io https://nominatim.openstreetmap.org https://cdnjs.cloudflare.com https://cdn.jsdelivr.net data: blob:",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'self' blob: data:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
])
assert SB in s, 'Supabase host changed: update the policy'
s = rep(s, '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        '<meta http-equiv="Content-Security-Policy" content="' + csp + '">\n', 'viewport meta')
open(out, 'w', encoding='utf-8').write(s)
print('p01_csp ok')
