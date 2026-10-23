"""Active Permit screen checks (Playwright, Python).

Run:  python3 tests/permit_active_screen.py            (from the repo root; needs playwright + chromium)
It opens index.html from disk with the network blocked, makes a test permit, and checks the top of the Active Permit
screen: timer chips, mid-permit reminders, air-test range hints, roster layout, Emergency pause/resolve.
This is a SMALL start, not the full suite. See tests/README.md.
"""
import datetime, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'index.html')
CHROMIUM = os.environ.get('PB_CHROMIUM', '/opt/pw-browsers/chromium')
fails = []

def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + ((' -- ' + str(detail)) if (detail and not ok) else ''))
    if not ok: fails.append(name)

def new_page(b, clock=False):
    pg = b.new_context(viewport={'width': 430, 'height': 1300}).new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
    if clock: pg.clock.install(time=datetime.datetime.now())
    pg.goto(URL); pg.wait_for_timeout(2000)
    return pg, errs

def wait(pg, ms, clock):
    pg.clock.run_for(ms) if clock else pg.wait_for_timeout(ms)

def make_permit(pg, clock=False, comm='', atmo=''):
    pg.evaluate("pbGoto('confinedPermit')"); wait(pg, 400, clock)
    now = datetime.datetime.now()
    vals = {'cpJobsite': 'Test Job', 'cpJobNumber': '1', 'cpAddress': '1 Main St', 'cpSpace': 'MH1', 'cpPurpose': 'Inspect',
            'cpDate': now.strftime('%Y-%m-%d'), 'cpStart': (now - datetime.timedelta(minutes=10)).strftime('%H:%M'),
            'cpEnd': (now + datetime.timedelta(hours=3)).strftime('%H:%M'), 'cpSupervisor': 'Tom', 'cpSupervisorInitials': 'TF',
            'cpAttendant': 'Brandon Jones', 'cpComms': 'Radio', 'cpHazards': 'None', 'cpControls': 'Vent', 'cpVentFail': 'Monitor',
            'cpRescue': '911', 'cpCommInterval': comm, 'cpAtmoInterval': atmo}
    for k, v in vals.items(): pg.fill('#' + k, v)
    pg.evaluate('pbLockConfinedPermit()'); wait(pg, 1500, clock)

def add_person(pg, name, role, clock=False):
    pg.evaluate('pbOpenRosterAddForm()'); pg.fill('#cpRosterName', name); pg.select_option('#cpRosterRole', role)
    pg.evaluate('pbAddRosterPerson()'); wait(pg, 1200, clock)

def modal_click_last(pg, clock=False):
    for _ in range(4):
        if pg.evaluate("()=>{const m=document.getElementById('pbModalMessage');return !!(m&&m.offsetParent)}"):
            pg.evaluate("[...document.querySelectorAll('#pbModalButtons button')].pop().click()"); wait(pg, 700, clock)

def log_air_and_check_in(pg, idx, clock=False):
    pg.evaluate('pbQuickAddAtmoTest()'); pg.fill('#cpAtmoO2', '20.9'); pg.fill('#cpAtmoLEL', '0'); pg.fill('#cpAtmoTester', 'Tom')
    pg.evaluate('pbSaveAtmoReading()'); wait(pg, 1500, clock); modal_click_last(pg, clock)
    pg.evaluate('pbToggleRosterStatus(%d)' % idx); wait(pg, 1500, clock); modal_click_last(pg, clock)

txt = lambda pg, i: pg.evaluate("document.getElementById('%s').textContent" % i)
disp = lambda pg, sel: pg.evaluate("getComputedStyle(document.querySelector('%s')).display" % sel)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROMIUM)

    # 1. No reminder intervals typed at lock: chips say so, Set reminder is offered, hints show this permit's limits
    pg, errs = new_page(b); make_permit(pg); add_person(pg, 'Mike', 'Entrant')
    check('chips show Not set when no interval was typed', txt(pg, 'cpAtmoCountdown') == 'Not set' and txt(pg, 'cpCommCountdown') == 'Not set')
    check('Set reminder is offered on both chips', disp(pg, '#cpAtmoTimerSection .cp-tc-set') == 'block' and disp(pg, '#cpCommTimerSection .cp-tc-set') == 'block')
    ph = pg.evaluate("['cpAtmoO2','cpAtmoLEL','cpAtmoH2S','cpAtmoCO'].map(i=>document.getElementById(i).placeholder)")
    check('air test boxes show range hints', ph == ['19.5 – 23.5', '0 – 10', 'max 10', 'max 35'], ph)
    check('roster is a grid with the toggle in column 2', pg.evaluate("(()=>{const r=document.querySelector('#cpRosterList .cp-roster-row');return getComputedStyle(r).display==='grid'&&getComputedStyle(r.querySelector('.cp-tog')).gridColumnStart==='2'})()"))
    check('Permit Status keeps the air readings, hides Recent Activity', 'Latest Air Readings' in pg.inner_text('#cpStatusGrid') and disp(pg, '#cpRecentSection') == 'none')
    top = pg.evaluate("()=>['cpTopPanel','cpStatusBlock'].map(i=>document.getElementById(i).getBoundingClientRect().top)")
    check('timers and roster sit above Permit Status', top[0] < top[1], top)

    # 2. Set reminders after locking
    pg.click('#cpCommTimerSection .cp-tc-set'); pg.fill('#cpLateMin', '0'); pg.click('text=Start Reminder')
    check('a bad interval is refused', 'whole number' in pg.inner_text('#cpLateErr'))
    pg.fill('#cpLateMin', '5'); pg.click('text=Start Reminder'); pg.wait_for_timeout(800)
    pg.click('#cpAtmoTimerSection .cp-tc-set'); pg.fill('#cpLateMin', '15'); pg.click('text=Start Reminder'); pg.wait_for_timeout(800)
    check('both reminders accepted, waiting for first check-in', txt(pg, 'cpCommCountdown') == 'Starts at first check-in' and disp(pg, '#cpCommTimerSection .cp-tc-set') == 'none')
    rem = pg.evaluate("document.querySelector('#cpStatusGrid .cp-rem-row .v').innerText")
    check('the permit records they were set during the entry', 'set during the entry' in rem and '15 min' in rem and '5 min' in rem, rem)
    log_air_and_check_in(pg, 2)
    check('timers run after the first check-in', txt(pg, 'cpCommCountdown').startswith('04:') and txt(pg, 'cpAtmoCountdown').startswith('14:'), (txt(pg, 'cpCommCountdown'), txt(pg, 'cpAtmoCountdown')))
    pg.reload(); pg.wait_for_timeout(3000); pg.evaluate("pbGoto('confinedActive')"); pg.wait_for_timeout(1500)
    check('late reminders survive a reload', 'set during the entry' in pg.evaluate("document.querySelector('#cpStatusGrid .cp-rem-row .v').innerText") and txt(pg, 'cpCommCountdown')[:2] in ('04', '03'))
    pg.evaluate('pbToggleRosterStatus(2)'); pg.wait_for_timeout(1500); modal_click_last(pg)
    pg.evaluate('pbCloseConfinedPermit()'); pg.wait_for_timeout(2500); modal_click_last(pg); pg.wait_for_timeout(2500); modal_click_last(pg); pg.wait_for_timeout(1500)
    prev = pg.evaluate("document.getElementById('cpCloseoutReportPreview').textContent")
    check('closeout finishes and the report lists the late reminders', disp(pg, '#cpCloseoutPanel') == 'block' and 'set during the entry' in prev, prev[-300:])
    check('no page errors (1)', not errs, errs[:3])

    # 3. Due state and Emergency (simulated clock)
    pg, errs = new_page(b, clock=True); make_permit(pg, True, comm='5', atmo='15'); add_person(pg, 'Mike', 'Entrant', True)
    log_air_and_check_in(pg, 2, True)
    pg.clock.run_for(5 * 60 * 1000 + 3000); modal_click_last(pg, True); pg.clock.run_for(1200)
    check('comm chip turns DUE after its interval', 'is-due' in pg.evaluate("document.getElementById('cpCommTimerSection').className") and txt(pg, 'cpCommCountdown') == '00:00')
    pg.evaluate('pbTriggerEmergency()'); pg.clock.run_for(1500); modal_click_last(pg, True)
    check('Emergency panel opens and chips say Paused', disp(pg, '#cpEmergencyPanel') == 'block' and txt(pg, 'cpCommCountdown') == 'Paused' and txt(pg, 'cpAtmoCountdown') == 'Paused')
    check('roster stays usable during an emergency', pg.evaluate("document.querySelectorAll('#cpRosterList .cp-tog').length") >= 2)
    pg.evaluate("pbDismissEmergencyPanel('resolved')"); pg.clock.run_for(1500); modal_click_last(pg, True); pg.clock.run_for(1500)
    check('resolving restarts the timers', disp(pg, '#cpEmergencyPanel') == 'none' and txt(pg, 'cpCommCountdown')[0] in '0123456789' and ':' in txt(pg, 'cpCommCountdown'), txt(pg, 'cpCommCountdown'))
    check('no page errors (2)', not errs, errs[:3])
    b.close()

print('\n%d failed' % len(fails) if fails else '\nall passed')
sys.exit(1 if fails else 0)
