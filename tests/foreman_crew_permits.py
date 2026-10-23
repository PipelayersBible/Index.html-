"""Foreman / company permit screens (static checks; server functions are tested against Supabase separately).
Run: python3 tests/foreman_crew_permits.py"""
import os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'index.html')
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('PB_CHROMIUM', '/opt/pw-browsers/chromium'))
    pg = b.new_context(viewport={'width': 430, 'height': 900}).new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
    pg.goto(URL); pg.wait_for_timeout(2000)
    check('crew permits box exists on foreman screen', pg.locator('#pmCrewPermits').count() == 1)
    check('crew permit records button exists, hidden for non-foreman', pg.locator('#archiveCrewPermitsBtn').count() == 1 and not pg.locator('#archiveCrewPermitsBtn').is_visible())
    check('company permit records button exists', pg.locator('#archiveCompanyPermitsBtn').count() == 1)
    check('open functions exposed', pg.evaluate("typeof pbOpenCrewPermits === 'function' && typeof pbOpenCompanyPermits === 'function' && typeof pbCpmRefresh === 'function'"))
    check('no page errors', not errs)
    b.close()
print('all passed' if not fails else 'FAILED: ' + ', '.join(fails))
raise SystemExit(1 if fails else 0)
