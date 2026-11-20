# hunt2 03 (round 1's approved proposal): one question at permit Lock when the window may have started last night.
# A night crew writes (or re-issues) a permit after midnight: Date = today (the default), Start 10:00 PM, End 2:00 AM.
# The app read that as TONIGHT 10 PM, locked without a word, and the active permit then flagged every check-in
# "OUTSIDE THIS PERMIT'S AUTHORIZED WINDOW ... has not started yet".
# Now, only when the window as typed has not started yet AND the same times one day earlier are running right now,
# Lock asks once: "Did this window start last night?"  Yes, Last Night -> the Authorized date moves back one day (the
# form shows it) and Lock goes on. No, Tonight -> Lock goes on as typed. Never asked for a day-shift permit, a permit
# written before midnight, or a window that is already running.
# Usage: python3 03_permit_started_last_night.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""    errEl.style.display = 'none';
    if (pbAskNewPermitOverKept(() => pbLockConfinedPermit(limitsConfirmed, windowConfirmed))) return; // Pass 25: a kept panel shown since the form opened
""", """    errEl.style.display = 'none';
    { // hunt2 03: written after midnight for a window that began before midnight?
      const dEl = document.getElementById('cpDate'), d0 = dEl.value, s0 = document.getElementById('cpStart').value, e0 = document.getElementById('cpEnd').value, nk = d0 + '|' + s0 + '|' + e0;
      const w = pbPermitWindow({ date: d0, start: s0, end: e0 }), now = Date.now();
      if (w && pbCpNightAnswered !== nk && s0 !== e0 && w.start.getTime() > now) {
        const y = new Date(d0 + 'T12:00'); y.setDate(y.getDate() - 1);
        const yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
        const wy = pbPermitWindow({ date: yd, start: s0, end: e0 });
        if (wy && wy.start.getTime() <= now && now < wy.end.getTime()) {
          const again = () => window.pbLockConfinedPermit(limitsConfirmed === true, windowConfirmed === true);
          const sh = (d) => d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }), hm = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          pbShowModal('Start is ' + hm(w.start) + ' and it is now ' + hm(new Date(now)) + '.\\n\\nYes: ' + sh(wy.start) + ' \\u2192 ' + sh(wy.end) + '. The permit is in its window now.\\nNo: it starts tonight, ' + sh(w.start) + '.', [
            { label: 'No, Tonight', onClick: () => { pbCpNightAnswered = nk; again(); } },
            { label: 'Yes, Last Night', primary: true, onClick: () => { dEl.value = yd; dEl.dispatchEvent(new Event('input', { bubbles: true })); dEl.dispatchEvent(new Event('change', { bubbles: true })); pbCpNightAnswered = yd + '|' + s0 + '|' + e0; again(); } }
          ], 'Did This Window Start Last Night?');
          return;
        }
      }
    }
    if (pbAskNewPermitOverKept(() => pbLockConfinedPermit(limitsConfirmed, windowConfirmed))) return; // Pass 25: a kept panel shown since the form opened
""")
p.rep("""    confinedSessionOwnerUid = await pbResolveStorageUserId(); // the new permit belongs to the account that creates it
""", """    pbCpNightAnswered = null; /* hunt2 03: the next permit is asked again */
    confinedSessionOwnerUid = await pbResolveStorageUserId(); // the new permit belongs to the account that creates it
""")
p.rep("""  window.pbLockConfinedPermit = async function(limitsConfirmed, windowConfirmed) {
""", """  let pbCpNightAnswered = null; // hunt2 03: "date|start|end" the last-night question was answered for
  window.pbLockConfinedPermit = async function(limitsConfirmed, windowConfirmed) {
""")
p.save()
