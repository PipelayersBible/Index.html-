#!/usr/bin/env python3
# locate_form_nov20: the 811 Renew form and the new-ticket form apply the job's state rule without showing it.
#   python3 p01_locate_state_rule.py in.html out.html      (in = /tmp/claude-0/r1711/src.html, the r17.11 candidate)
# - renewal expiry: Utah from the old expiry (Utah Code 54-8a-4(6)(c)); every other state from the renewal day, with
#   no second notice wait in the states whose life counts from the first legal dig day
# - Nevada: two renewals, then a plain message
# - states where "renewing" is a new notice: the form asks for the new ticket number
# - the rule paragraphs leave both forms; one "<State> rule >" link opens a short sheet for that state only
import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()


def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, 'expected once, found %d: %r' % (n, a[:90])
    s = s.replace(a, b)


# ---- 1. the renewal rule of each state, and the renewal expiry
rep("""  function pbLocExpFor(base, x) { return pbSrExpires(base, pbLocSrOf(x).code); }
""", """  function pbLocExpFor(base, x) { return pbSrExpires(base, pbLocSrOf(x).code); }
  /* loc_form_nov20: how a state renews, from its own row and sources in PB_SR. exp: the new life runs from the old
     expiry. max: renewals allowed on one ticket. no: going on means a new notice, so 811 gives a new ticket number. */
  const PB_LOC_REN = { UT: { exp: 1 }, NV: { max: 2 }, CT: { no: 1 }, FL: { no: 1 }, IN: { no: 1 }, ME: { no: 1 }, MN: { no: 1 }, NC: { no: 1 }, NJ: { no: 1 }, OK: { no: 1 }, OR: { no: 1 }, TN: { no: 1 }, TX: { no: 1 }, WA: { no: 1 } };
  function pbLocRenRule(x) { const code = pbLocSrOf(x).code; return Object.assign({ code }, Object.prototype.hasOwnProperty.call(PB_LOC_REN, code) ? PB_LOC_REN[code] : {}); }
  // the expiry of a renewal: the state's ticket life from the renewal day (the notice wait is not added again), or
  // from the old expiry where the law says so. '' when the state's ticket life isn't confirmed.
  function pbLocRenExp(day, oldExp, x) {
    const U = pbLocRenRule(x), R = pbSrRow(U.code), L = R && R.life; day = String(day || '').slice(0, 10); oldExp = String(oldExp || '').slice(0, 10);
    if (!L || !(L.n > 0)) return '';
    if (U.exp && pbLocIsDay(oldExp)) return L.unit === 'wd' ? pbSrAddWd(oldExp, L.n, U.code, true) : pbLocAddDays(oldExp, L.n);
    if (!pbLocIsDay(day)) return '';
    const n = L.n - (L.incl ? 1 : 0);
    return L.unit === 'wd' ? pbSrAddWd(day, n, U.code, true) : pbLocAddDays(day, n);
  }
  window.__debugLocRen = { rule: pbLocRenRule, exp: pbLocRenExp, table: PB_LOC_REN }; /* tests */
  function pbLocRuleLink(id, x) { const R = pbSrRow(pbLocSrOf(x).code); return '<button type="button" class="pbloc-rule" id="' + id + '" onclick="pbLocRuleShow(' + pbLocQ(R.code) + ', this)">' + escapeHtml(R.name) + ' rule ›</button>'; }
""")

# ---- 2. Renew: Nevada's limit, the right expiry, the new number where there is one
rep("""    pbLoc.form = { mode: 'renew', id: l.id, ver: pbLocBaseVer(l), was: l.ticket_no, days, expTyped: !!(pre && pre.expires_at && pre.expires_at !== pbLocExpFor(t, l)), oldExp: String(l.expires_at || '').slice(0, 10), closed: null, err: (pre && pre.err) || '',
      v: { ticket_no: l.ticket_no || '', called_at: l.called_at, renewed_at: t, expires_at: (pre && pre.expires_at) || pbLocExpFor(t, l), note: l.note || '' } };""",
    """    const U = pbLocRenRule(l), oldExp = String(l.expires_at || '').slice(0, 10), auto = pbLocRenExp(t, oldExp, l);
    if (U.max && Number(l.renewals) >= U.max) { pbAlert(pbSrName(U.code) + ' allows ' + (U.max === 2 ? 'two' : U.max) + ' renewals on a ticket, and this one has had ' + (U.max === 2 ? 'both' : 'them') + '. Call in a new ticket and add it here.', 'New Ticket Needed'); return; }
    pbLoc.form = { mode: 'renew', id: l.id, ver: pbLocBaseVer(l), was: l.ticket_no, days, newNo: !!U.no, expTyped: !!(pre && pre.expires_at && pre.expires_at !== auto), oldExp, closed: null, err: (pre && pre.err) || '',
      v: { ticket_no: U.no ? String((pre && pre.ticket_no) || '') : l.ticket_no || '', called_at: l.called_at, renewed_at: t, expires_at: (pre && pre.expires_at) || auto, note: l.note || '' } };""")
rep("""window.pbLocRender(); setTimeout(() => { const el = pbLocE('locRen'); if (el) el.focus(); }, 50);""",
    """window.pbLocRender(); setTimeout(() => { const el = pbLocE(pbLoc.form && pbLoc.form.newNo ? 'locNo' : 'locRen'); if (el) el.focus(); }, 50);""")
# a refused renewal opened again keeps the number that was typed
rep("""window.pbLocRenew(id, { base: Object.assign({}, sv, { pend: l.pend }), renewed_at: l.pend.renewed_at, expires_at: l.pend.expires_at, err: l.pend.why || '' }); return; }""",
    """window.pbLocRenew(id, { base: Object.assign({}, sv, { pend: l.pend }), renewed_at: l.pend.renewed_at, expires_at: l.pend.expires_at, ticket_no: l.pend.ticket_no !== sv.ticket_no ? l.pend.ticket_no : '', err: l.pend.why || '' }); return; }""")

rep("""      + '<div class="pbd-two"><div class="pb-field"><label for="locRen">Renewed with 811</label><input type="date" ' + pbLocId('locRen') + '></div><div class="pb-field"><label for="locExp">New expiry</label><input type="date" ' + pbLocId('locExp') + ' aria-describedby="locExpHelp"></div></div>'
      + '<p class="pb-help pbloc-help" ' + pbLocId('locExpHelp') + '>' + escapeHtml(pbLocRenHelp(F)) + '</p>'""",
    """      + (F.newNo ? '<div class="pb-field"><label for="locNo">New ticket number</label><input type="text" ' + pbLocId('locNo') + ' maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next" placeholder="From 811"></div>' : '')
      + '<div class="pbd-two"><div class="pb-field"><label for="locRen">' + (F.newNo ? 'Called in again' : 'Renewed with 811') + '</label><input type="date" ' + pbLocId('locRen') + '></div><div class="pb-field"><label for="locExp">New expiry</label><input type="date" ' + pbLocId('locExp') + ' aria-describedby="locExpHelp"></div></div>'
      + '<p class="pb-help pbloc-help" ' + pbLocId('locExpHelp') + '>' + escapeHtml(pbLocRenHelp(F)) + '</p>' + pbLocRuleLink('locRuleLink')""")

rep("""    const ren = () => { F.v.renewed_at = r.value; if (!F.expTyped && pbLocIsDay(r.value)) { F.v.expires_at = pbLocExpFor(r.value); x.value = F.v.expires_at; } say(); };""",
    """    const no = pbLocE('locNo'); if (no) { no.value = F.v.ticket_no; no.addEventListener('input', () => { F.v.ticket_no = no.value; }); }
    const ren = () => { F.v.renewed_at = r.value; if (!F.expTyped && pbLocIsDay(r.value)) { F.v.expires_at = pbLocRenExp(r.value, F.oldExp); x.value = F.v.expires_at; } say(); };""")
rep("""    const exp = () => { F.v.expires_at = x.value; F.expTyped = x.value !== ''; if (!x.value && pbLocIsDay(F.v.renewed_at)) { F.v.expires_at = pbLocExpFor(F.v.renewed_at); x.value = F.v.expires_at; F.expTyped = false; } say(); };""",
    """    const exp = () => { F.v.expires_at = x.value; F.expTyped = x.value !== '' && x.value !== pbLocRenExp(F.v.renewed_at, F.oldExp); /* the state's own date is not "your own date" */ if (!x.value && pbLocIsDay(F.v.renewed_at)) { F.v.expires_at = pbLocRenExp(F.v.renewed_at, F.oldExp); x.value = F.v.expires_at; F.expTyped = false; } say(); };""")

rep("""    const r = pbLocE('locRen'), x = pbLocE('locExp'); if (r) F.v.renewed_at = r.value; if (x) F.v.expires_at = x.value;
    const v = F.v, fail = (t) => { F.err = t; const e = pbLocE('locErr'); if (e) { e.textContent = t; e.hidden = false; e.scrollIntoView({ block: 'nearest' }); } };
""", """    const r = pbLocE('locRen'), x = pbLocE('locExp'), no = pbLocE('locNo'); if (r) F.v.renewed_at = r.value; if (x) F.v.expires_at = x.value; if (no) F.v.ticket_no = no.value;
    const v = F.v, fail = (t) => { F.err = t; const e = pbLocE('locErr'); if (e) { e.textContent = t; e.hidden = false; e.scrollIntoView({ block: 'nearest' }); } };
    v.ticket_no = String(v.ticket_no || '').replace(/\\s+/g, ' ').trim();
    if (F.newNo && !v.ticket_no) return fail('Enter the new ticket number from 811.');
""")

# ---- 3. the help lines: no rule text; only what the crew has to do
rep("""    const R = pbSrRow(pbLocSrOf(null).code), e = pbLocExpFor(F.renewed && pbLocIsDay(F.v.renewed_at) ? F.v.renewed_at : F.v.called_at), chk = 'Check your state’s 811 rules.';
    if (F.renewed) return 'Renewed ' + pbLocDay(F.v.renewed_at) + '. ' + (e ? 'Clear it to use ' + R.name + '’s rule.' : chk);
    if (F.expTyped) return 'Your own date.' + (e ? ' Clear it to use ' + R.name + '’s rule.' : ' ' + chk);
    return e ? R.name + ': ' + R.life.text : 'The app doesn’t have ' + R.name + '’s ticket life. Enter the expiry on your ticket. ' + chk;""",
    """    const R = pbSrRow(pbLocSrOf(null).code), e = pbLocFormExp(F);
    if (F.renewed) return 'Renewed ' + pbLocDay(F.v.renewed_at) + '.' + (e ? ' Clear it to use ' + R.name + '’s rule.' : '');
    if (F.expTyped) return 'Your own date.' + (e ? ' Clear it to use ' + R.name + '’s rule.' : '');
    return e ? '' : 'Enter the expiry on your ticket.';""")
rep("""    const R = pbSrRow(pbLocSrOf(null).code), e = pbLocExpFor(F.v.renewed_at), chk = 'Check your state’s 811 rules.';
    if (F.expTyped) return 'Your own date.' + (e ? ' Clear it to use ' + R.name + '’s rule.' : ' ' + chk);
    return e ? R.name + ', from the renewal day: ' + R.life.text : 'Enter the new expiry 811 gave you. ' + chk;""",
    """    const R = pbSrRow(pbLocSrOf(null).code), e = pbLocRenExp(F.v.renewed_at, F.oldExp);
    if (F.expTyped) return 'Your own date.' + (e ? ' Clear it to use ' + R.name + '’s rule.' : '');
    return e ? '' : 'Enter the new expiry 811 gave you.';""")
rep("""    return R.notice ? R.name + ': ' + R.notice.text + (R.start ? ' ' + R.start.text : '') : 'The app doesn’t have ' + R.name + '’s wait before digging. Check your state’s 811 rules.';
  }""", """    return R.notice ? '' : 'Ask 811 when you can dig.';
  }
  // the form's default expiry: a renewed ticket by the renewal rule, any other from its call-in day
  function pbLocFormExp(F) { return F.renewed && pbLocIsDay(F.v.renewed_at) ? pbLocRenExp(F.v.renewed_at, '') : pbLocExpFor(F.v.called_at); }""")
rep("""<p class="pb-help pbloc-help" id="locRuleHelp">' + escapeHtml(pbLocRuleHelp()) + '</p>'""",
    """<p class="pb-help pbloc-help" id="locRuleHelp">' + escapeHtml(pbLocRuleHelp()) + '</p>' + pbLocRuleLink('locRuleLink')""")
rep("""const base = F.renewed && pbLocIsDay(F.v.renewed_at) ? F.v.renewed_at : F.v.called_at; if (!x.value && pbLocIsDay(base)) { F.v.expires_at = pbLocExpFor(base);""",
    """const base = F.renewed && pbLocIsDay(F.v.renewed_at) ? F.v.renewed_at : F.v.called_at; if (!x.value && pbLocIsDay(base)) { F.v.expires_at = pbLocFormExp(F);""")

# ---- 4. the ticket: one small link to the rule of its state
rep("""+ (l.closed ? '' : pbLocDatesHtml(l, 'loc_' + sid)) /* feat_locate28 */""",
    """+ (l.closed ? '' : pbLocDatesHtml(l, 'loc_' + sid) + pbLocRuleLink('locRule_' + sid, l)) /* feat_locate28, loc_form_nov20 */""")

# ---- 5. the sheet: that state only, a few lines, where it comes from
rep("""  let pbSrBack = null;
""", """  let pbSrBack = null;
  /* loc_form_nov20: the 811 rule one job's area uses. No state list; the full Rules view is still under "Rules for <state>". */
  function pbLocRuleHtml(code) {
    const R = pbSrRow(code), U = Object.prototype.hasOwnProperty.call(PB_LOC_REN, code) ? PB_LOC_REN[code] : {};
    const sec = (k, v, id) => '<div class="pbsr-sec" id="pbLocRule_' + id + '"><div class="pbsr-k">' + escapeHtml(k) + '</div><div class="pbsr-v">' + v + '</div></div>';
    const app = !R.life ? '' : U.exp ? 'The app counts a renewal from the old expiry.' : U.no ? 'The app asks for the new ticket number. The old one stays in History.' : 'The app counts a renewal from the day you renew.';
    const src = R.sources.filter(x => !/OSHA|1926|directory|protective system/i.test(x.what));
    return sec('Before digging', escapeHtml(R.notice ? R.notice.text : 'Ask 811 when you can dig.'), 'notice')
      + sec('Ticket life', escapeHtml(R.life ? R.life.text : 'No set ticket life in the app. Enter the expiry on your ticket.'), 'life')
      + (R.renew || app ? sec('Renewing', escapeHtml([R.renew, app].filter(Boolean).join(' ')), 'renew') : '')
      + sec('Call 811', escapeHtml(R.centers.map(c => c.name).join(' or ')), 'center')
      + (src.length ? '<details class="pb-more pbsr-src" id="pbLocRuleSrc"><summary>Where this comes from</summary><ul>' + src.map(x => '<li><a href="' + escapeHtml(x.url) + '" target="_blank" rel="noopener">' + escapeHtml(x.what) + '</a></li>').join('') + '</ul></details>' : '')
      + '<p class="pbd-dim pbsr-foot" id="pbLocRuleChecked">Checked ' + escapeHtml(pbLocDay(R.checked) + ', ' + String(R.checked).slice(0, 4)) + '. If your ticket or 811 says something different, go by them.</p>';
  }
  window.pbLocRuleShow = function(code, from) {
    if (!pbSrOk(code)) return;
    let w = document.getElementById('pbSrView'); if (w) w.remove();
    w = document.createElement('div'); w.id = 'pbSrView'; w.className = 'pbsr-view'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-labelledby', 'pbLocRuleTitle');
    w.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); window.pbSrClose(); } });
    w.addEventListener('click', (e) => { if (e.target === w) window.pbSrClose(); });
    (document.getElementById('pbApp') || document.body).appendChild(w);
    pbSrBack = from || document.activeElement || null;
    w.innerHTML = '<div class="pbsr-card" id="pbLocRuleCard" data-state="' + code + '"><div class="pbsr-head"><h2 class="pb-h2" id="pbLocRuleTitle">' + escapeHtml(pbSrName(code)) + ' 811 rule</h2><button type="button" class="pb-btn ghost small" id="pbLocRuleClose" onclick="pbSrClose()">Close</button></div>' + pbLocRuleHtml(code) + '</div>';
    const c = document.getElementById('pbLocRuleClose'); if (c) c.focus({ preventScroll: true });
  };
""")

# ---- 6. looks
rep("""  #pbApp .pbloc-help { margin: -4px 0 12px; }
""", """  #pbApp .pbloc-help { margin: -4px 0 12px; }
  #pbApp .pbloc-help:empty { display: none; }
  #pbApp .pbloc-rule { display: inline-flex; align-items: center; min-height: 44px; margin: -6px 0 2px; padding: 0 12px 0 0; background: none; border: 0; color: var(--pb-text-2); font: inherit; font-size: 14px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; -webkit-tap-highlight-color: transparent; } /* loc_form_nov20 */
  #pbApp .pbloc-rule:focus-visible { outline: 2px solid var(--pb-text); outline-offset: 2px; border-radius: 6px; }
""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
