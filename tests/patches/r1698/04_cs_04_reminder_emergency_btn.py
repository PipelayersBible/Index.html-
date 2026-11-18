import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# cs2 04: the air test / comm check reminder is a dialog over the whole screen, EMERGENCY button included, and while
# overdue it comes back every minute. An unanswered comm check is the moment an emergency is most likely to be called:
# the reminder itself carries the EMERGENCY call (same pbTriggerEmergency, from the tap), next to OK.
rep("""  function pbModalOpen() { const ov = document.getElementById('pbModalOverlay'); return !!ov && getComputedStyle(ov).display !== 'none'; }
  function pbShowReminder(kind, message, title) {""",
    """  function pbModalOpen() { const ov = document.getElementById('pbModalOverlay'); return !!ov && getComputedStyle(ov).display !== 'none'; }
  function pbReminderModal(msg, title) { // cs2 04
    pbShowModal(msg, [{ label: 'EMERGENCY \\u2014 Call ' + pbDialNumberNow(), onClick: () => window.pbTriggerEmergency() }, { label: 'OK', primary: true }], title);
    try { const b = document.querySelector('#pbModalButtons button'); if (b && /^EMERGENCY/.test(b.textContent)) { b.style.background = 'var(--rod-red)'; b.style.color = '#fff'; b.style.borderColor = '#7a1e1a'; b.style.fontWeight = '700'; } } catch (e) {} // solid red, as the screen's EMERGENCY button
  }
  function pbShowReminder(kind, message, title) {""")
rep("""    pbAlert(pbReminderShownMsg, (pbReminderShown && pbReminderShown.length > 1) ? 'Air Test and Communication Check Due' : title); // feat_permit32 P6""",
    """    pbReminderModal(pbReminderShownMsg, (pbReminderShown && pbReminderShown.length > 1) ? 'Air Test and Communication Check Due' : title); // feat_permit32 P6""")
rep("""    pbAlert(pbReminderShownMsg, due.length > 1 ? 'Air Test and Communication Check Due' : due[due.length - 1].title); // feat_permit32 P6""",
    """    pbReminderModal(pbReminderShownMsg, due.length > 1 ? 'Air Test and Communication Check Due' : due[due.length - 1].title); // feat_permit32 P6""")
rep("""'Communication check due — check in with the entrant(s) now.'""",
    """'Communication check due — check in with the entrant(s) now. If an entrant doesn\\u2019t answer, tap EMERGENCY.'""")
open(out, 'w', encoding='utf-8').write(s)
