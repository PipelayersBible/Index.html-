# dates_xing_nov22 d5: Utah tickets run out at 8 AM. Blue Stakes Excavator's Guide: "All requests expire at 8 AM on the
# 21st calendar day from the date the request is processed"; "New locate requests will expire at 8 AM on the 21st day
# after they are submitted" (Utah Code 54-8a-4(6)(a): valid 21 days from the day notice is given). The app's expiry day
# is right (call day + 21) but showed "Expires Sun Nov 22" / "Expires today" as if the whole day were good. Now:
# "Expires Sun Nov 22, 8 AM", "Expires 8 AM today" -> "Expired 8 AM today" after 8 AM, "Expires 8 AM tomorrow", and the
# card's "Don't dig" line from 8 AM on day 21. Same for an update (21 days from the old expiry, also 8 AM).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""      + (form ? '' : cell('Expires', 'Exp', pbLocIsDay(String(v.expires_at || '').slice(0, 10)) ? String(v.expires_at).slice(0, 10) : ''));""",
"""      + (form ? '' : cell('Expires', 'Exp', pbLocIsDay(String(v.expires_at || '').slice(0, 10)) ? String(v.expires_at).slice(0, 10) : '', pbSrTm(pbLocExpAt(v)).replace(':00', ''))); /* dates_xing_nov22: UT 8 AM */""")
p.rep("""  function pbLocLeftText(l) { const d = pbLocLeft(l); return d === null ? '' : d < 0 ? 'Expired ' + (-d) + (d === -1 ? ' day ago' : ' days ago') : d === 0 ? 'Expires today' : d === 1 ? 'Expires tomorrow' : d + ' days left'; }""",
"""  /* dates_xing_nov22: the hour a ticket runs out on its expiry day ('' = the end of the day). Utah: 8 AM (Blue Stakes). */
  const PB_SR_EXPAT = { UT: '08:00' };
  function pbLocExpAt(l) { try { const c = pbLocSrOf(l).code; return Object.prototype.hasOwnProperty.call(PB_SR_EXPAT, c) ? PB_SR_EXPAT[c] : ''; } catch (e) { return ''; } }
  const pbLocGoneToday = (l) => { const a = pbLocExpAt(l); return !!a && pbLocLeft(l) === 0 && pbLocNowHM() >= a; };
  function pbLocLeftText(l) { const d = pbLocLeft(l), a = pbSrTm(pbLocExpAt(l)).replace(':00', ''); if (a && (d === 0 || d === 1)) return (d === 0 && pbLocGoneToday(l) ? 'Expired ' : 'Expires ') + a + (d === 0 ? ' today' : ' tomorrow');
    return d === null ? '' : d < 0 ? 'Expired ' + (-d) + (d === -1 ? ' day ago' : ' days ago') : d === 0 ? 'Expires today' : d === 1 ? 'Expires tomorrow' : d + ' days left'; }""")
p.rep("""  function pbLocDueText0(l) { const d = pbLocLeft(l), x = pbLocDay(l.expires_at); return d === null ? ''""",
"""  function pbLocDueText0(l) { const d = pbLocLeft(l), x = pbLocDay(l.expires_at), a = pbSrTm(pbLocExpAt(l)).replace(':00', ''); if (a && d === 0) return (pbLocGoneToday(l) ? 'expired ' + a + ' today (' + x + ') — don’t dig until a new ticket is valid' : 'expires ' + a + ' today (' + x + ')'); if (a && d === 1) return 'expires ' + a + ' tomorrow (' + x + ')'; /* dates_xing_nov22 */ return d === null ? ''""")
p.rep("""      + (!l.closed && pbLocLeft(l) !== null && pbLocLeft(l) < 0 ? '<p class="pbp-err pbloc-nodig" id="locNoDig_' + sid + '">' + escapeHtml('Expired ' + pbLocDay(l.expires_at) + '. Don’t dig until a new ticket is valid.') + '</p>' : '');""",
"""      + (!l.closed && pbLocLeft(l) !== null && (pbLocLeft(l) < 0 || pbLocGoneToday(l)) ? '<p class="pbp-err pbloc-nodig" id="locNoDig_' + sid + '">' + escapeHtml('Expired ' + pbLocDay(l.expires_at) + (pbLocExpAt(l) ? ' at ' + pbSrTm(pbLocExpAt(l)).replace(':00', '') : '') + '. Don’t dig until a new ticket is valid.') + '</p>' : ''); /* dates_xing_nov22: UT from 8 AM */""")
p.rep("""  function pbLocDueText(l) { const t = pbLocDueText0(l), d = pbLocLeft(l); if (!t || d === null || d < 0 || l.closed) return t;""",
"""  function pbLocDueText(l) { const t = pbLocDueText0(l), d = pbLocLeft(l); if (!t || d === null || d < 0 || l.closed || pbLocGoneToday(l)) return t;""")
p.save()
