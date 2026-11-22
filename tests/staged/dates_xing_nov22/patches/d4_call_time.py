# dates_xing_nov22 d4: the time of the 811 call, where the law counts hours (or a cut-off time).
# Hour states (TX WV 48 h; MA ME NH RI VT MI TN 72 h; DC 96 h) showed "Can dig from Wed" with no time, so a crew could
# start at 7 AM, hours early. Now the ticket has an optional "Time called" (shown only for states where the time
# matters; filled in with the time now when the ticket is added the same day) and the app shows "Wed Nov 25, 2:00 PM".
# No time: "Wed Nov 25, after the time you called". A weekend / holiday call: the hours start at the next working day,
# so no time is needed.
#  TX  Utilities Code 251.151(b), 251.002(14): a Saturday call before 11:59 AM -> Tuesday 11:59 AM (Wednesday if Monday
#      is a holiday); a Saturday afternoon or Sunday call counts from Monday (48 h from Mon 12:00 AM -> Wednesday).
#  TN  TCA 65-31-102(26): a working day "shall commence at the time the ... call is received and shall expire at the
#      same time on the next working day" -> TN is counted from the call time too.
#  OR  a call after 5 PM counts as the next business day (the row's own sources): with a time at/after 5 PM the next
#      business day is the call day. No time: the date is labeled "if called before 5 PM".
#  Day states whose start time is in their own text get it shown: UT 8 AM, IA 6 AM, VA 7 AM, LA 7 AM, IN 7 AM, CA 7 AM.
# The company server stores the call-in DAY only (pb_prod_locate_set p_called_at date), so the time is kept on the phone
# that entered it (localStorage pbLocTm:<uid>, by ticket id + call day). Other phones show "after the time you called".
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
from _sr import SR, write_changes
p = P(); CH = []; sr = SR(p, CH)

# 1. the clock table and the dig day + time
p.rep("""  // the default expiry from a called-in (or renewal) day; '' when the state's ticket life isn't confirmed
  function pbSrExpires(base, code) {""", """  /* dates_xing_nov22: where the time of the call matters. h: the wait is counted in hours from the call (a weekend or
     holiday call: from the start of the next working day). after: a call at or after this time counts as the next
     business day's (OR). at: the hour digging may start on the dig day, from the state's own text. */
  const PB_SR_CLK = { TX: { h: 48 }, WV: { h: 48 }, MA: { h: 72 }, ME: { h: 72 }, NH: { h: 72 }, RI: { h: 72 }, VT: { h: 72 }, MI: { h: 72 }, TN: { h: 72 }, DC: { h: 96 },
    OR: { after: '17:00' }, UT: { at: '08:00' }, IA: { at: '06:00' }, VA: { at: '07:00' }, LA: { at: '07:00' }, IN: { at: '07:00' }, CA: { at: '07:00' } };
  const pbSrClkUses = (code) => { const C = PB_SR_CLK[code]; return !!(C && (C.h || C.after)); };
  function pbSrTm(t) { const m = /^(\\d{2}):(\\d{2})$/.exec(String(t || '')); if (!m) return ''; const h = Number(m[1]); return (h % 12 || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM'); }
  // the first legal dig day and, where it matters, the time: { d, t ('HH:MM' or ''), hint (when the time isn't known) }
  function pbSrCanDigAt(called, tm, code) {
    called = String(called || '').slice(0, 10); tm = /^\\d{2}:\\d{2}$/.test(String(tm || '')) ? String(tm) : '';
    const R = pbSrRow(code), C = PB_SR_CLK[code] || {}, d0 = pbSrCanDig(called, code);
    if (!d0) return { d: '', t: '', hint: '' };
    const work = pbSrWorkDay(called, code, false), wd = new Date(pbLocDayMs(called)).getUTCDay();
    if (code === 'TX' && wd === 6) { /* Utilities Code 251.151(b): a Saturday call before 11:59 AM -> Tuesday 11:59 AM (Wednesday if Monday is a holiday) */
      if (tm && tm < '11:59') return { d: pbSrAddWd(called, 2, code, false), t: '11:59', hint: '' };
      return { d: d0, t: '', hint: tm ? '' : 'or Tue 11:59 AM if called before noon' };
    }
    if (C.after && work) {
      if (!tm) return { d: d0, t: C.at || '', hint: 'if called before ' + pbSrTm(C.after).replace(':00', '') };
      if (tm >= C.after) { let n = pbLocAddDays(called, 1), g = 0; while (!pbSrWorkDay(n, code, false) && g++ < 20) n = pbLocAddDays(n, 1); return { d: pbSrAddWd(n, R.notice.n, code, false), t: C.at || '', hint: '' }; }
    }
    if (C.h) return work ? { d: d0, t: tm, hint: tm ? '' : 'after the time you called' } : { d: d0, t: '', hint: '' };
    return { d: d0, t: C.at || '', hint: '' };
  }
  // the default expiry from a called-in (or renewal) day; '' when the state's ticket life isn't confirmed
  function pbSrExpires(base, code) {""")
p.rep("""  window.pbSrMath = { canDig: pbSrCanDig, expires""", """  window.pbSrMath = { canDig: pbSrCanDig, canDigAt: pbSrCanDigAt, tm: pbSrTm, clk: (c) => PB_SR_CLK[c] || null, expires""")

# 2. the ticket's call time: kept on this phone (the server keeps the day only)
p.rep("""  function pbLocCanDig(called, x) { return pbSrCanDig(called, pbLocSrOf(x).code); }""",
"""  /* dates_xing_nov22: the time the ticket was called in, kept on this phone by ticket id and call day (the company
     server stores the day only). A form's values carry their own called_time. */
  const PB_LOC_TM = 'pbLocTm:'; let pbLocTmC = null;
  function pbLocTmAll(uid) { let o = null; try { o = JSON.parse(localStorage.getItem(PB_LOC_TM + uid) || 'null'); } catch (e) { o = null; } return o && typeof o === 'object' ? o : {}; }
  function pbLocTmPut(uid, id, day, t) {
    if (!uid || !id) return; const o = pbLocTmAll(uid);
    if (/^\\d{2}:\\d{2}$/.test(String(t || '')) && pbLocIsDay(day)) o[id] = { t: String(t), d: day, at: Date.now() }; else delete o[id];
    const k = Object.keys(o); if (k.length > 300) k.sort((a, b) => (o[a].at || 0) - (o[b].at || 0)).slice(0, k.length - 300).forEach(x => { delete o[x]; });
    try { localStorage.setItem(PB_LOC_TM + uid, JSON.stringify(o)); } catch (e) {} pbLocTmC = null;
  }
  function pbLocTimeOf(x) {
    if (!x) return '';
    if (Object.prototype.hasOwnProperty.call(x, 'called_time')) return /^\\d{2}:\\d{2}$/.test(String(x.called_time || '')) ? String(x.called_time) : '';
    const uid = pbArchiveOwnerUid; if (!uid || !x.id) return '';
    if (!pbLocTmC || pbLocTmC.uid !== uid) pbLocTmC = { uid, o: pbLocTmAll(uid) };
    const r = pbLocTmC.o[x.id]; return r && r.d === String(x.called_at || '').slice(0, 10) ? r.t : '';
  }
  const pbLocNowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  function pbLocCanDigAt(called, x) { const a = pbSrCanDigAt(called, pbLocTimeOf(x), pbLocSrOf(x).code); return Object.assign(a, { txt: a.t ? pbSrTm(a.t) : a.hint }); }
  function pbLocCanDig(called, x) { return pbLocCanDigAt(called, x).d; }""")

# 3. status and the dates row
p.rep("""    const today = pbTkToday(), cd = pbLocCanDig(l.called_at, l), sb = pbLocStartBy(l), left = pbLocLeft(l), lv = pbLocLevel(l);
    if (!pbLocRenewed(l) && cd && today < cd && !(left !== null && left < 0)) return { k: 'early', d: cd, text: 'Not valid until ' + pbLocDayW(cd), lv };""",
"""    const today = pbTkToday(), ca = pbLocCanDigAt(l.called_at, l), cd = ca.d, sb = pbLocStartBy(l), left = pbLocLeft(l), lv = pbLocLevel(l);
    if (!pbLocRenewed(l) && cd && (today < cd || (today === cd && ca.t && pbLocNowHM() < ca.t)) && !(left !== null && left < 0)) return { k: 'early', d: cd, text: 'Not valid until ' + pbLocDayW(cd) + (ca.txt ? ', ' + ca.txt : ''), lv }; /* dates_xing_nov22: + the time */""")
p.rep("""    const cell = (k, t, d) => '<div class="pbloc-d"><span class="pbloc-dk">' + k + '</span><span class="pbloc-dv" id="' + id + t + '">' + escapeHtml(d ? pbLocDayW(d) : '—') + '</span></div>';""",
"""    const cell = (k, t, d, x) => '<div class="pbloc-d"><span class="pbloc-dk">' + k + '</span><span class="pbloc-dv" id="' + id + t + '">' + escapeHtml(d ? pbLocDayW(d) + (x ? ', ' + x : '') : '—') + '</span></div>';""")
p.rep("""    if (form && ren) return '<div id="' + id + 'Dates" hidden></div>';""", """    if (form && ren) return '<div id="' + id + 'Dates" hidden></div>';
    const ca = ren ? null : pbLocCanDigAt(v.called_at, v); /* dates_xing_nov22: the dig day and, where it matters, the time */""")
p.rep("""    const cells = (ren ? '' : cell('Can dig from', 'Dig', pbLocCanDig(v.called_at, v)) + cell('Start work by', 'Start', pbLocStartBy(v)))""",
"""    const cells = (ren ? '' : cell('Can dig from', 'Dig', ca.d, ca.txt) + cell('Start work by', 'Start', pbLocStartBy(v)))""")

# 4. the form: "Time called" where the state counts hours or has a cut-off
p.rep("""      + '<p class="pb-help pbloc-help" id="locExpHelp">' + escapeHtml(pbLocExpHelp(F)) + '</p>'
      + pbLocDatesHtml(F.v, 'locF', true)""",
"""      + (pbSrClkUses(pbLocSrOf(null).code) ? '<div class="pb-field"><label for="locCalledTm">Time called <span class="pbx-opt">(optional)</span></label><input type="time" id="locCalledTm" aria-describedby="locTmHelp"><p class="pb-help pbloc-help" id="locTmHelp">' + escapeHtml(pbSrRow(pbLocSrOf(null).code).name) + ' counts from the time you called.</p></div>' : '') /* dates_xing_nov22 */
      + '<p class="pb-help pbloc-help" id="locExpHelp">' + escapeHtml(pbLocExpHelp(F)) + '</p>'
      + pbLocDatesHtml(F.v, 'locF', true)""")
p.rep("""    no.value = F.v.ticket_no; c.value = F.v.called_at; x.value = F.v.expires_at; nt.value = F.v.note;""",
"""    no.value = F.v.ticket_no; c.value = F.v.called_at; x.value = F.v.expires_at; nt.value = F.v.note;
    const tm = pbLocE('locCalledTm'); /* dates_xing_nov22 */
    if (tm) { tm.value = F.v.called_time || ''; const tmIn = () => { F.v.called_time = tm.value; F.tmTyped = true; const w = pbLocE('locFDates'); if (w) w.outerHTML = pbLocDatesHtml(F.v, 'locF', true); }; tm.addEventListener('input', tmIn); tm.addEventListener('change', tmIn); }""")
p.rep("""    const called = () => { F.v.called_at = c.value; if (F.mode === 'edit'""",
"""    const called = () => { F.v.called_at = c.value; if (!F.tmTyped) { F.v.called_time = F.mode === 'add' ? (c.value === pbTkToday() ? pbLocNowHM() : '') : (c.value === F.calledWas ? F.tmWas : ''); if (tm) tm.value = F.v.called_time; } /* dates_xing_nov22 */ if (F.mode === 'edit'""")
p.rep("""    pbLoc.form = { mode: 'add', id: pbLocUuid(), ver: 0, days, expTyped: false, noteTyped: false, err: '', v: { ticket_no: '', called_at: t, expires_at: pbLocExpFor(t), note: info.address || '' } }; /* r17.05 */""",
"""    pbLoc.form = { mode: 'add', id: pbLocUuid(), ver: 0, days, expTyped: false, noteTyped: false, err: '', v: { ticket_no: '', called_at: t, called_time: pbLocNowHM(), expires_at: pbLocExpFor(t), note: info.address || '' } }; /* r17.05; dates_xing_nov22: the call time = now */""")
p.rep("""v: { ticket_no: l.ticket_no || '', called_at: l.called_at || pbTkToday(), expires_at: l.expires_at || '', renewed_at: l.renewed_at || null, note: l.note || '' } };""",
"""v: { ticket_no: l.ticket_no || '', called_at: l.called_at || pbTkToday(), called_time: pbLocTimeOf(l), expires_at: l.expires_at || '', renewed_at: l.renewed_at || null, note: l.note || '' } };
    pbLoc.form.calledWas = pbLoc.form.v.called_at; pbLoc.form.tmWas = pbLoc.form.v.called_time; /* dates_xing_nov22 */""")
p.rep("""    F.saving = true;
    const ok = await pbLocQueue(uid, pbLocRec(job, F.id, v, F.mode === 'add' ? false : F.closed === undefined ? null : F.closed, F.ver));
    F.saving = false;
    if (!ok) return fail('Not saved. This phone’s storage is full.');""",
"""    F.saving = true;
    const tmEl = pbLocE('locCalledTm'); /* dates_xing_nov22: kept on this phone only when the form asked for it */
    if (tmEl) v.called_time = tmEl.value;
    const ok = await pbLocQueue(uid, pbLocRec(job, F.id, v, F.mode === 'add' ? false : F.closed === undefined ? null : F.closed, F.ver));
    F.saving = false;
    if (!ok) return fail('Not saved. This phone’s storage is full.');
    if (tmEl) pbLocTmPut(uid, F.id, v.called_at, v.called_time); else if (F.mode === 'edit' && v.called_at !== F.calledWas) pbLocTmPut(uid, F.id, '', '');""")
p.rep("""  window.__debugLoc28 = { canDig: pbLocCanDig,""", """  window.__debugLoc28 = { canDigAt: pbLocCanDigAt, timeOf: pbLocTimeOf, canDig: pbLocCanDig,""")

# 5. the Rules texts
def notice_text(code, fn, src):
    T = sr.table(); N = dict(T['states'][code]['notice']); old = N['text']; N['text'] = fn(old); assert N['text'] != old
    sr.fix(code, {'notice': N}, [src] if src else [], 'call time')
TXS = {'what': 'Utilities Code 251.151 (48 hours; a Saturday notification may dig Tuesday 11:59 AM, Wednesday if Monday is a holiday)', 'url': 'https://texas.public.law/statutes/tex._util._code_section_251.151'}
TXD = {'what': 'Utilities Code 251.002(14): "Saturday notification" = a notice on a Saturday before 11:59 a.m.', 'url': 'https://texas.public.law/statutes/tex._util._code_section_251.002'}
def tx(t):
    old = 'A Saturday call: dig from Tuesday 11:59 AM.'; assert t.count(old) == 1
    return t.replace(old, 'Counted from the time you called: a Monday 2 PM call can be dug Wednesday 2 PM. A Saturday call made before noon (11:59 AM): dig from Tuesday 11:59 AM (Wednesday if Monday is a holiday). A Saturday afternoon or Sunday call counts from Monday.')
notice_text('TX', tx, TXS); sr.fix('TX', {}, [TXD])
H2 = ' Counted from the time you called: a Monday 2 PM call can be dug Wednesday 2 PM.'
H3 = ' Counted from the time you called: a Monday 2 PM call can be dug Thursday 2 PM.'
notice_text('WV', lambda t: t + H2, None)
for c in ['MA', 'ME', 'NH', 'RI', 'VT', 'MI']: notice_text(c, lambda t: t + H3, None)
notice_text('DC', lambda t: t + ' Counted from the time you called: a Monday 2 PM call can be dug Friday 2 PM.', None)
notice_text('TN', lambda t: t + ' A working day runs from the time you call to the same time the next working day: a Monday 2 PM call can be dug Thursday 2 PM.', None)
p.save(); write_changes(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'd4_changes.md'), CH)
