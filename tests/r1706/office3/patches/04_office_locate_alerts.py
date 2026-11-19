#!/usr/bin/env python3
# office3 #34: expired and expiring 811 tickets for the office, on Home (Needs attention) and on the office's job cards.
# Until now only the foreman's phone warned (pbLocHomeAttention returned nothing unless the account was a foreman, and
# pbCxJobFlags had no locate flag).
# Data: pb_prod_locates_mine already returns every open ticket of the company (expiring within 60 days) to the company
# account, PMs and managers; the app only asked it for foremen. Now it asks for managers too (no server change). The
# phone's unsent changes are laid over it the same way as for the foreman (pbLocMineRows).
# Expiry: ONE function, pbLocExpiry(ticket) -> { left, lv, text, due } (days left, 'red' | 'amber' | '', "Expires
# tomorrow", "expires tomorrow (Nov 21)"). The office Home line and the job-card flags read only that. It uses the
# existing rules (pbLocLeft / pbLocLevel: red = expired or 2 days or less, amber = 7 days or less). When a job's state
# decides the expiry (the #33 helper), plug it in there.
# Shared code touched: pbLocHomeAttention (a manager branch added before the foreman's), pbLocMineLoad / pbLocBoot (also
# for managers), pbCxJobFlags (one flag added).
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 1) the one expiry function
rep("""  const pbLocByExp = (a, b) => String(a.expires_at || '').localeCompare(String(b.expires_at || ''));""",
"""  const pbLocByExp = (a, b) => String(a.expires_at || '').localeCompare(String(b.expires_at || ''));
  /* office3 #34: THE expiry of one ticket for the office alerts (Home and job cards). Everything they show comes from here,
     so a per-job rule (the job's state, #33) changes it in one place. left: days left (negative: expired; null: no date) */
  function pbLocExpiry(l) {
    if (!l || l.closed) return null;
    const left = pbLocLeft(l); if (left === null) return null;
    return { left, lv: pbLocLevel(l), text: pbLocLeftText(l), due: pbLocDueText(l) };
  }
  window.pbLocExpiry = pbLocExpiry;
  // the office's open tickets that need a look (expired, or 7 days or less), soonest first, from what the phone holds
  function pbLocOfficeRows(jobKey) {
    const uid = pbArchiveOwnerUid; if (!uid || uid === 'shared' || pbLoc.uid !== uid || !pbLoc.st) return [];
    let L = []; try { L = pbLocMineRows(); } catch (e) { L = []; }
    return L.filter(l => l && !l.closed && (!jobKey || pbDlyKey(l.job_number) === jobKey)).map(l => ({ l, x: pbLocExpiry(l) })).filter(o => o.x && o.x.lv).sort((a, b) => a.x.left - b.x.left || pbLocByExp(a.l, b.l));
  }
  window.pbLocOfficeRows = pbLocOfficeRows;""")

# 2) Home: a manager (company account, PM, super, manager) gets the office line
rep("""    if (!pbDlyAcc(uid).foreman) return null;
    /* feat_locate28: + a ticket not valid yet, + a ticket in its last 2 days to start work (the expiry alert comes first) */""",
"""    if (!pbDlyAcc(uid).foreman) { /* office3 #34: the office: expired and expiring tickets across the company's jobs */
      if (!pbDlyAcc(uid).manager) return null;
      const R = pbLocOfficeRows(null); if (!R.length) return null;
      const gone = R.filter(o => o.x.left < 0).length, red = R.some(o => o.x.lv === 'red'), jobs = [...new Set(R.map(o => String(o.l.job_number || '')))].filter(Boolean);
      const t = R.length === 1 ? 'Locate ticket ' + R[0].l.ticket_no + ' ' + R[0].x.due.replace(/ — .*$/, '') : R.length + ' locate tickets ' + (gone ? (gone === R.length ? 'expired' : 'expired or expiring') : 'expire within 7 days');
      const body = R.length === 1 ? pbProdJobLabel(R[0].l.job_number) + (gone ? '. Don’t dig on it until a new ticket is valid.' : '. Call 811 for a refresh.')
        : R.slice(0, 4).map(o => pbProdJobLabel(o.l.job_number) + ': ' + o.l.ticket_no + ' ' + o.x.text.toLowerCase()).join('; ') + (R.length > 4 ? '; and ' + (R.length - 4) + ' more' : '') + (gone ? '. Don’t dig on an expired ticket until a new one is valid.' : '. Call 811 for a refresh.');
      const at = pbLoc.st.mine && pbLoc.st.mine.at, old = at && Date.now() - at > 12 * 3600000 ? ' (as of ' + pbProdTimeText(at) + ')' : '';
      const btns = jobs.slice(0, 3).map((n, i) => '<button type="button" class="pb-btn small" id="homeLocBtn' + i + '" data-job="' + escapeHtml(n) + '" onclick="pbOpenLocates(this.dataset.job)">' + escapeHtml(jobs.length > 1 ? 'Locates · ' + pbProdJobLabel(n) : 'Open Locates') + '</button>').join('');
      return { id: 'locates', info: !red, html: '<span class="t">' + escapeHtml(t) + '</span>' + escapeHtml(body + old) + btns };
    }
    /* feat_locate28: + a ticket not valid yet, + a ticket in its last 2 days to start work (the expiry alert comes first) */""")

# 3) load the company's open tickets for managers as well
rep("""    if (pbLoc.uid !== uid || !pbLoc.st || pbLoc.mineBusy) return;
    if (!pbDlyAcc(uid).foreman || !(await pbDlyCanAsk(uid))) return;""",
"""    if (pbLoc.uid !== uid || !pbLoc.st || pbLoc.mineBusy) return;
    { const a0 = pbDlyAcc(uid); if (!(a0.foreman || a0.manager) || !(await pbDlyCanAsk(uid))) return; } /* office3 #34: the office too */""")
rep("""    if (a.foreman) await pbLocMineLoad(uid);
    try { if (pbCurrentScreen === 'home') window.pbRenderHome(); } catch (e) {}""",
"""    if (a.foreman || a.manager) await pbLocMineLoad(uid); /* office3 #34 */
    try { if (pbCurrentScreen === 'home') window.pbRenderHome(); } catch (e) {}""")

# 4) the office's job cards: one flag
rep("""    if (ma) f.push(pbCxFlag('mat', 'cube', pbCxN(ma, 'material alert')));
    try { const sf = window.pbSchedFlag ? window.pbSchedFlag(j) : ''; if (sf) f.push(sf); } catch (e) {} // feat_schedule""",
"""    if (ma) f.push(pbCxFlag('mat', 'cube', pbCxN(ma, 'material alert')));
    try { /* office3 #34: expired / expiring 811 tickets on this job */
      const R = typeof window.pbLocOfficeRows === 'function' ? window.pbLocOfficeRows(j.job_key) : [];
      if (R.length) { const gone = R.filter(o => o.x.left < 0).length, x = R[0].x;
        f.push(pbCxFlag(x.lv === 'red' ? 'emerg' : 'wait', 'flag', gone ? (gone === 1 ? '811 ticket expired' : gone + ' 811 tickets expired') : R.length === 1 ? '811 ticket: ' + x.text.toLowerCase() : R.length + ' 811 tickets expire within 7 days')); }
    } catch (e) {}
    try { const sf = window.pbSchedFlag ? window.pbSchedFlag(j) : ''; if (sf) f.push(sf); } catch (e) {} // feat_schedule""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
