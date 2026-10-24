#!/usr/bin/env python3
"""feat_wording35 (r15.35, overnight round 3 — stats/reports finder, /home/claude/night/stats.md):
 W1 the Management report form said "For anything urgent, call." twice with Anonymous picked.
 W2 Records' time-period picker spelled like Stats' (the Stats form is what gets printed).
 D1 daily report: the signature pad clears with the narrative when another day/job is picked; D3 "Check Again" while the job has no location;
 D4 "— past due" on an open inspection scheduled before today; D5 one sentence on the empty My inspections; D6 login password keeps the
 keychain (current-password) and Enter logs in; D7 inspector/agency capitalise words; D8 plain wrong-password message."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))
r('W1', "reaches them at the end of that hour. For anything urgent, call.</strong>", "reaches them at the end of that hour.</strong>")
r('W2a', '<option value="all">All time</option>\n            <option value="today">Today</option>\n            <option value="week">Last 7 days</option>\n            <option value="month">Last 31 days</option>',
  '<option value="all">All Time</option>\n            <option value="today">Today</option>\n            <option value="week">Last 7 Days</option>\n            <option value="month">Last 31 Days</option>')

# --- daily/login finder (/home/claude/night/daily.md) ---
r('D1', "['drNarrative', 'drAmendReason'].forEach(id => { const el = pbDlyEl(id); if (el) el.value = ''; });",
  "['drNarrative', 'drAmendReason'].forEach(id => { const el = pbDlyEl(id); if (el) el.value = ''; }); try { pbDlySigClear(); } catch (e) {} /* feat_wording35 D1: a day's report starts with a clean pad */")
r('D3', "(V.weather ? 'Update Weather' : 'Get Weather')", "(V.weather ? 'Update Weather' : V.needLoc ? 'Check Again' : 'Get Weather')")
r('D4', "'Scheduled ' + pbDlyDayText(i.scheduled_date)", "'Scheduled ' + pbDlyDayText(i.scheduled_date) + (i.status === 'open' && i.scheduled_date < pbTkToday() ? ' \u2014 past due' : '')")
r('D5', "Nothing assigned to you is open. The office adds inspections and tests to a job and assigns a foreman.", "Nothing assigned to you is open.")
r('D6a', 'enterkeyhint="done" id="loginPassword" autocomplete="off"', 'enterkeyhint="go" id="loginPassword" autocomplete="current-password"')
r('D6b', "  pbChainField('cpAtmoTester', 'cpAtmoSaveBtn', true);", "  pbChainField('cpAtmoTester', 'cpAtmoSaveBtn', true);\n  pbChainField('loginPassword', 'loginSubmitBtn', true); // feat_wording35 D6: Enter on the password logs in")
r('D7a', '<input type="text" id="icInspector" maxlength="120" autocomplete="off">', '<input type="text" id="icInspector" maxlength="120" autocomplete="off" autocapitalize="words">')
r('D7b', '<input type="text" id="icAgency" maxlength="160" autocomplete="off" placeholder', '<input type="text" id="icAgency" maxlength="160" autocomplete="off" autocapitalize="words" placeholder')
r('D8', "'Login failed: ' + result.error.message", "(/invalid login credentials/i.test(String(result.error.message || '')) ? 'Wrong email or password. Check both, or use Forgot password.' : 'Login failed: ' + result.error.message)")
def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('wording35 written', len(s))
