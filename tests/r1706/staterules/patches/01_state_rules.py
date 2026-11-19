#!/usr/bin/env python3
# r17.05 staterules (decisions #33 and #64): 811 and trench rules come from the job's state, nationwide.
# Until now every job used California DigAlert's rules: a new ticket expired on the called-in day + 28 days (or the
# company's "good for N days" setting), the dig wait was 2 California working days and work had to start within 14 days.
#
# What changes
#  1. A table of 50 states + DC is embedded (data/state_rules.json, built by data/build_state_rules.py; every row has
#     its sources and "checked 2026-11-19"). A value we could not confirm is null and the app says
#     "Check your state's 811 rules" instead of guessing (no default expiry is filled in for that state).
#  2. The job's state: picked for the job (Locates screen, Change State), else read from the job address
#     ("..., Phoenix, AZ 85004"), else the company's state (Settings > Company > 811 rules state), else California.
#     Old tickets keep their stored dates: nothing already saved is recomputed. California jobs get the same dates
#     as before (2 working days with the same holiday list, start within 14 days, 28 days).
#  3. From the table: the dig wait ("Can dig from"), "Start work by", the default expiry on a new ticket / a renewal /
#     a changed call-in day, the form's help lines, the foreman's Home line and the daily report's 811 line (through
#     pbLocStat / pbLc811State), the Locates header (state, 811 center), a "Rules for <State>" view with the sources,
#     the protective-system depth for the run's deep-trench flag (pbCaveTrig: WA 4 ft, others 5 ft) and a state note
#     under the Trench Sloping result.
#  4. The job's and the company's state are kept on the phone (localStorage pbSr:<uid>) and sent to the company server
#     when it has the staged SQL (sql/01_state_rules.sql: pb_state_rules_get / pb_job_state_set). Without it the pick
#     stays on that phone and the app says so. Works with no signal: the table is in the page.
# Holidays: California keeps its own list. Other states: the wait counts federal holidays + the day after Thanksgiving
# as days off (a later dig date, never too early); a ticket life in working days counts only New Year's, Memorial Day,
# July 4, Labor Day, Thanksgiving and Christmas as days off (an earlier expiry, never too late).
# Shared code touched (narrow anchors): pbLocStat, pbLocDatesHtml, pbLocRender (header line), pbLocAdd / pbLocEdit /
# pbLocRenew and the two form wires (default expiry), pbLc811State, the Settings > Company locate row (replaced by
# the state picker; pb_company_locate_days_set is no longer called), pbCaveTrig.
import sys, os, json
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

def rep_between(start, end, new):  # replace from start (inclusive) to end (exclusive); both must be unique
    global s
    assert s.count(start) == 1, ('start', s.count(start), start[:80])
    assert s.count(end) == 1, ('end', s.count(end), end[:80])
    a = s.index(start); b = s.index(end)
    assert a < b
    s = s[:a] + new + s[b:]

data = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'state_rules.json'), encoding='utf-8'))
table = {'version': data['version'], 'checked': data['checked'], 'recheck_by': data['recheck_by'], 'states': {r['code']: r for r in data['states']}}
TABLE_JS = json.dumps(table, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

# ---------- 1) the table, the date math, the job's state (replaces the California-only rule block) ----------
rep_between("  /* feat_locate28: California 811 (Gov Code 4216.2): call at least 2 working days before digging (the call day doesn't",
            "  function pbLocDayW(d) {",
r"""  /* feat_locate28: California 811 (Gov Code 4216.2): call at least 2 working days before digging (the call day doesn't
     count), start within 14 calendar days of the call, the ticket is good for 28 days. A working day is Mon-Fri except
     federal and California holidays, as the 811 centers post them (a Saturday holiday is the Friday before, a Sunday one
     the Monday after). The holidays are worked out from their rules for any year, never typed in.
     r17.05 staterules: these are now California's row of the state table; other states use their own rows. */
  const PB_LOC_START = 14, PB_LOC_WAIT = 2, pbLocHolC = {};
  function pbLocHolidays(y) {
    if (pbLocHolC[y]) return pbLocHolC[y];
    const D = (m, d) => Date.UTC(y, m - 1, d, 12), W = (t) => new Date(t).getUTCDay(), DAY = 86400000;
    const nth = (m, wd, n) => D(m, 1) + (((wd - W(D(m, 1)) + 7) % 7) + 7 * (n - 1)) * DAY;
    const last = (m, wd) => { const t = Date.UTC(y, m, 0, 12); return t - ((W(t) - wd + 7) % 7) * DAY; };
    const obs = (t) => t + (W(t) === 6 ? -DAY : W(t) === 0 ? DAY : 0);
    const tg = nth(11, 4, 4);
    const L = [obs(D(1, 1)), nth(1, 1, 3), nth(2, 1, 3), obs(D(3, 31)), last(5, 1), obs(D(6, 19)) /* Juneteenth: from 2021 */, obs(D(7, 4)), nth(9, 1, 1), nth(10, 1, 2), obs(D(11, 11)), tg, tg + DAY, obs(D(12, 25))];
    /* New Year's Day, MLK Day, Presidents' Day, Cesar Chavez Day, Memorial Day, Juneteenth, Independence Day, Labor Day,
       Columbus Day, Veterans Day, Thanksgiving, the day after, Christmas */
    return (pbLocHolC[y] = L.filter((t, i) => i !== 5 || y >= 2021).map(t => new Date(t).toISOString().slice(0, 10)));
  }
  const pbLocHoliday = (d) => { const y = Number(String(d).slice(0, 4)); return pbLocHolidays(y).includes(d) || pbLocHolidays(y + 1).includes(d); }; /* Jan 1 on a Saturday is Dec 31 */
  const pbLocWorkDay = (d) => { const w = new Date(pbLocDayMs(d)).getUTCDay(); return w !== 0 && w !== 6 && !pbLocHoliday(d); };
  // ================= r17.05 staterules (#33, #64): the 811 and trench rules of the job's state =================
  // The table: 50 states + DC, each row with its sources and the day it was checked (re-check yearly). null = not
  // confirmed: the app then fills in no date and says "Check your state's 811 rules".
  const PB_SR = __PB_SR_TABLE__;
  window.PB_STATE_RULES = PB_SR;
  const pbSrRow = (c) => (c && Object.prototype.hasOwnProperty.call(PB_SR.states, c) ? PB_SR.states[c] : null);
  const pbSrOk = (c) => !!pbSrRow(c);
  const pbSrName = (c) => { const r = pbSrRow(c); return r ? r.name : ''; };
  const pbSrCodes = Object.keys(PB_SR.states).sort((a, b) => PB_SR.states[a].name.localeCompare(PB_SR.states[b].name));
  const pbSrHolC = {};
  // other states: the wait counts more days off (federal + the day after Thanksgiving: a later dig day); a working-day
  // ticket life counts fewer (the six holidays every state keeps: an earlier expiry). Never a date that is too generous.
  function pbSrHolidays(y, core) {
    const k = y + (core ? 'c' : 'b'); if (pbSrHolC[k]) return pbSrHolC[k];
    const D = (m, d) => Date.UTC(y, m - 1, d, 12), W = (t) => new Date(t).getUTCDay(), DAY = 86400000;
    const nth = (m, wd, n) => D(m, 1) + (((wd - W(D(m, 1)) + 7) % 7) + 7 * (n - 1)) * DAY;
    const last = (m, wd) => { const t = Date.UTC(y, m, 0, 12); return t - ((W(t) - wd + 7) % 7) * DAY; };
    const obs = (t) => t + (W(t) === 6 ? -DAY : W(t) === 0 ? DAY : 0);
    const tg = nth(11, 4, 4);
    const L = core ? [obs(D(1, 1)), last(5, 1), obs(D(7, 4)), nth(9, 1, 1), tg, obs(D(12, 25))]
      : [obs(D(1, 1)), nth(1, 1, 3), nth(2, 1, 3), last(5, 1)].concat(y >= 2021 ? [obs(D(6, 19))] : [], [obs(D(7, 4)), nth(9, 1, 1), nth(10, 1, 2), obs(D(11, 11)), tg, tg + DAY, obs(D(12, 25))]);
    return (pbSrHolC[k] = L.map(t => new Date(t).toISOString().slice(0, 10)));
  }
  function pbSrWorkDay(d, code, core) {
    if (code === 'CA') return pbLocWorkDay(d);
    const w = new Date(pbLocDayMs(d)).getUTCDay(); if (w === 0 || w === 6) return false;
    const y = Number(String(d).slice(0, 4)); return !pbSrHolidays(y, core).includes(d) && !pbSrHolidays(y + 1, core).includes(d);
  }
  function pbSrAddWd(d, n, code, core) { let k = 0, g = 0; while (k < n && g++ < 400) { d = pbLocAddDays(d, 1); if (pbSrWorkDay(d, code, core)) k++; } return d; }
  // the first day digging is allowed: the call day + the wait in working days, the call day not counted; a call on a
  // day off counts from the next working day
  function pbSrCanDig(called, code) {
    const R = pbSrRow(code); called = String(called || '').slice(0, 10);
    if (!pbLocIsDay(called) || !R || !R.notice || !(R.notice.n >= 0)) return '';
    let d = called, g = 0; while (!pbSrWorkDay(d, code, false) && g++ < 20) d = pbLocAddDays(d, 1);
    return pbSrAddWd(d, R.notice.n, code, false);
  }
  // the default expiry from a called-in (or renewal) day; '' when the state's ticket life isn't confirmed
  function pbSrExpires(base, code) {
    const R = pbSrRow(code), L = R && R.life; base = String(base || '').slice(0, 10);
    if (!L || !pbLocIsDay(base) || !(L.n > 0)) return '';
    const b = L.from === 'dig' ? (pbSrCanDig(base, code) || base) : base, n = L.n - (L.incl ? 1 : 0);
    return L.unit === 'wd' ? pbSrAddWd(b, n, code, true) : pbLocAddDays(b, n);
  }
  function pbSrStartBy(called, code) {
    const R = pbSrRow(code), S = R && R.start; called = String(called || '').slice(0, 10);
    if (!S || !pbLocIsDay(called) || !(S.n > 0)) return '';
    return S.unit === 'wd' ? pbSrAddWd(called, S.n, code, true) : pbLocAddDays(called, S.n);
  }
  // the state in a typed address: "..., Phoenix, AZ 85004", "..., Reno, NV", "..., Boise, Idaho"
  const pbSrNames = pbSrCodes.map(c => [c, PB_SR.states[c].name.toLowerCase()]).sort((a, b) => b[1].length - a[1].length);
  function pbSrParse(a) {
    let t = String(a || '').replace(/\s+/g, ' ').trim(); if (!t) return '';
    t = t.replace(/,?\s*(u\.?s\.?a?\.?|united states( of america)?)$/i, '').trim();
    let m = t.match(/(?:^|[\s,])([A-Za-z]{2})\.?,?\s+\d{5}(?:-\d{4})?$/); if (m && pbSrOk(m[1].toUpperCase())) return m[1].toUpperCase();
    m = t.match(/,\s*([A-Za-z]{2})\.?$/); if (m && pbSrOk(m[1].toUpperCase())) return m[1].toUpperCase();
    const l = t.toLowerCase().replace(/,?\s*\d{5}(?:-\d{4})?$/, '').trim();
    for (const [c, n] of pbSrNames) if (l === n || l.endsWith(', ' + n) || l.endsWith(',' + n)) return c;
    return '';
  }
  // the job's and the company's state, kept on this phone and on the company server (when it has the update)
  const PB_SR_LS = 'pbSr:';
  let pbSrMem = { uid: null, o: null };
  function pbSrGet(uid) {
    if (pbSrMem.uid === uid && pbSrMem.o) return pbSrMem.o;
    let o = null; try { o = JSON.parse(localStorage.getItem(PB_SR_LS + uid) || 'null'); } catch (e) { o = null; }
    if (!o || typeof o !== 'object') o = {};
    if (!o.jobs || typeof o.jobs !== 'object') o.jobs = {};
    if (!o.jobs_local || typeof o.jobs_local !== 'object') o.jobs_local = {};
    pbSrMem = { uid, o }; return o;
  }
  function pbSrPut(uid, o) { pbSrMem = { uid, o }; try { localStorage.setItem(PB_SR_LS + uid, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function pbSrCompany(uid) { const o = pbSrGet(uid || pbArchiveOwnerUid); const c = o.co_local !== undefined ? o.co_local : o.co; return pbSrOk(c) ? c : ''; }
  function pbSrJob(key, num) {
    const uid = pbArchiveOwnerUid, o = pbSrGet(uid), loc = key ? o.jobs_local[key] : null;
    if (loc && pbSrOk(loc.code)) return { code: loc.code, how: 'phone' };
    if (!loc && key && pbSrOk(o.jobs[key])) return { code: o.jobs[key], how: 'picked' };
    const J = pbLoc.st && key ? pbLoc.st.jobs[key] : null; let a = '';
    try { const k = pbCxKnownJob(num || (J && J.job_number) || ''); a = (k && k.address) || ''; } catch (e) { a = ''; }
    if (!a && J && J.address) a = J.address;
    const p = pbSrParse(a); if (p) return { code: p, how: 'address' };
    const c = pbSrCompany(uid); if (c) return { code: c, how: 'company' };
    return { code: 'CA', how: 'default' };
  }
  // a ticket (job_key / job_number) or a form's values (none: the open job)
  function pbLocSrOf(x) {
    const num = (x && x.job_number) || (pbLoc.job && pbLoc.job.job_number) || '';
    const key = (x && (x.job_key || (x.job_number ? pbDlyKey(x.job_number) : ''))) || (pbLoc.job && pbLoc.job.key) || '';
    return pbSrJob(key, num);
  }
  function pbLocCanDig(called, x) { return pbSrCanDig(called, pbLocSrOf(x).code); }
  function pbLocStartBy(l) { /* the state's latest start, or the expiry when that is sooner */
    const c = String((l && l.called_at) || '').slice(0, 10), x = String((l && l.expires_at) || '').slice(0, 10);
    const s = pbSrStartBy(c, pbLocSrOf(l).code); return s && pbLocIsDay(x) && x < s ? x : s;
  }
  function pbLocExpFor(base, x) { return pbSrExpires(base, pbLocSrOf(x).code); }
  window.pbSrMath = { canDig: pbSrCanDig, expires: pbSrExpires, startBy: pbSrStartBy, workDay: pbSrWorkDay, holidays: pbSrHolidays, parse: pbSrParse, row: pbSrRow, codes: () => pbSrCodes.slice() };
  window.pbSrJobState = (num) => pbSrJob(pbDlyKey(num), num);
""".replace('__PB_SR_TABLE__', TABLE_JS))

# ---------- 2) callers pass the ticket so the job's state is used ----------
rep("const today = pbTkToday(), cd = pbLocCanDig(l.called_at), sb = pbLocStartBy(l)",
    "const today = pbTkToday(), cd = pbLocCanDig(l.called_at, l), sb = pbLocStartBy(l)")
rep("cell('Can dig from', 'Dig', pbLocCanDig(v.called_at))", "cell('Can dig from', 'Dig', pbLocCanDig(v.called_at, v))")
rep("if (pbLocIsDay(called) && d < pbLocCanDig(called)) return 'early';", "if (pbLocIsDay(called) && d < pbLocCanDig(called, l)) return 'early';")
rep("isn’t valid until ' + pbLocDay(pbLocCanDig(l.called_at)) + '.'", "isn’t valid until ' + pbLocDay(pbLocCanDig(l.called_at, l)) + '.'")

# ---------- 3) the default expiry comes from the state ----------
rep("if (F && F.mode === 'add' && !F.expTyped && J.locate_days && Number(J.locate_days) !== F.days) { F.days = Number(J.locate_days); F.v.expires_at = pbLocAddDays(F.v.called_at, F.days); }",
    "if (F && F.mode === 'add' && !F.expTyped) F.v.expires_at = pbLocExpFor(F.v.called_at); /* r17.05: the job's state (its address may have just loaded) */")
rep("called_at: t, expires_at: pbLocAddDays(t, days), note: info.address || '' } };",
    "called_at: t, expires_at: pbLocExpFor(t), note: info.address || '' } }; /* r17.05 */")
rep("String(l.expires_at).slice(0, 10) !== pbLocAddDays(l.called_at, eDays))",
    "String(l.expires_at).slice(0, 10) !== pbLocExpFor(l.called_at, l))")
rep("expTyped: !!(pre && pre.expires_at && pre.expires_at !== pbLocAddDays(t, days)),",
    "expTyped: !!(pre && pre.expires_at && pre.expires_at !== pbLocExpFor(t, l)),")
rep("renewed_at: t, expires_at: (pre && pre.expires_at) || pbLocAddDays(t, days), note: l.note || '' } };",
    "renewed_at: t, expires_at: (pre && pre.expires_at) || pbLocExpFor(t, l), note: l.note || '' } };")
rep("+ '<p class=\"pb-help pbloc-help\" ' + pbLocId('locExpHelp') + '>' + escapeHtml(F.expTyped ? 'Your own date. Clear it to use the renewal day + ' + F.days + ' days.' : 'The renewal day + ' + F.days + ' days.') + '</p>'",
    "+ '<p class=\"pb-help pbloc-help\" ' + pbLocId('locExpHelp') + '>' + escapeHtml(pbLocRenHelp(F)) + '</p>'")
rep("const say = () => { if (help) help.textContent = F.expTyped ? 'Your own date. Clear it to use the renewal day + ' + F.days + ' days.' : 'The renewal day + ' + F.days + ' days.'; };",
    "const say = () => { if (help) help.textContent = pbLocRenHelp(F); };")
rep("const ren = () => { F.v.renewed_at = r.value; if (!F.expTyped && pbLocIsDay(r.value)) { F.v.expires_at = pbLocAddDays(r.value, F.days); x.value = F.v.expires_at; } };",
    "const ren = () => { F.v.renewed_at = r.value; if (!F.expTyped && pbLocIsDay(r.value)) { F.v.expires_at = pbLocExpFor(r.value); x.value = F.v.expires_at; } say(); };")
rep("if (!x.value && pbLocIsDay(F.v.renewed_at)) { F.v.expires_at = pbLocAddDays(F.v.renewed_at, F.days); x.value = F.v.expires_at; } say(); };",
    "if (!x.value && pbLocIsDay(F.v.renewed_at)) { F.v.expires_at = pbLocExpFor(F.v.renewed_at); x.value = F.v.expires_at; F.expTyped = false; } say(); };")
rep("if (!F.expTyped && pbLocIsDay(c.value)) { F.v.expires_at = pbLocAddDays(c.value, F.days); x.value = F.v.expires_at; }",
    "if (!F.expTyped && pbLocIsDay(c.value)) { F.v.expires_at = pbLocExpFor(c.value); x.value = F.v.expires_at; }")
rep("if (!x.value && pbLocIsDay(base)) { F.v.expires_at = pbLocAddDays(base, F.days); x.value = F.v.expires_at; }",
    "if (!x.value && pbLocIsDay(base)) { F.v.expires_at = pbLocExpFor(base); x.value = F.v.expires_at; F.expTyped = false; F.expTouched = false; }")
rep("function pbLocExpHelp(F) { if (F.renewed) return 'Renewed ' + pbLocDay(F.v.renewed_at) + '. Clear it to use the renewal day + ' + F.days + ' days.'; return F.expTyped ? 'Your own date. Clear it to use the called-in day + ' + F.days + ' days.' : 'The called-in day + ' + F.days + ' days (Settings › Company).'; }",
r"""function pbLocExpHelp(F) { /* r17.05: the job's state rule */
    const R = pbSrRow(pbLocSrOf(null).code), e = pbLocExpFor(F.renewed && pbLocIsDay(F.v.renewed_at) ? F.v.renewed_at : F.v.called_at), chk = 'Check your state’s 811 rules.';
    if (F.renewed) return 'Renewed ' + pbLocDay(F.v.renewed_at) + '. ' + (e ? 'Clear it to use ' + R.name + '’s rule.' : chk);
    if (F.expTyped) return 'Your own date.' + (e ? ' Clear it to use ' + R.name + '’s rule.' : ' ' + chk);
    return e ? R.name + ': ' + R.life.text : 'The app doesn’t have ' + R.name + '’s ticket life. Enter the expiry on your ticket. ' + chk;
  }
  function pbLocRenHelp(F) {
    const R = pbSrRow(pbLocSrOf(null).code), e = pbLocExpFor(F.v.renewed_at), chk = 'Check your state’s 811 rules.';
    if (F.expTyped) return 'Your own date.' + (e ? ' Clear it to use ' + R.name + '’s rule.' : ' ' + chk);
    return e ? R.name + ', from the renewal day: ' + R.life.text : 'Enter the new expiry 811 gave you. ' + chk;
  }
  function pbLocRuleHelp() {
    const R = pbSrRow(pbLocSrOf(null).code);
    return R.notice ? R.name + ': ' + R.notice.text + (R.start ? ' ' + R.start.text : '') : 'The app doesn’t have ' + R.name + '’s wait before digging. Check your state’s 811 rules.';
  }""")
rep("+ pbLocDatesHtml(F.v, 'locF', true) + '<p class=\"pb-help pbloc-help\" id=\"locRuleHelp\">Can’t dig before the 2-working-day wait. Work must start within 14 days of the call, or call in a new ticket.</p>' /* feat_locate28 */",
    "+ pbLocDatesHtml(F.v, 'locF', true) + '<p class=\"pb-help pbloc-help\" id=\"locRuleHelp\">' + escapeHtml(pbLocRuleHelp()) + '</p>' /* feat_locate28, r17.05: the job's state */")

# ---------- 4) the Locates header: the job's state, its 811 center, Rules / Change State ----------
rep("if (head) head.innerHTML = '<p class=\"pbp-sub\" id=\"locJobLine\">' + escapeHtml([pbProdJobLabel(job.job_number), info.name, info.address].filter(Boolean).join(' · ')) + '</p>';",
    "if (head) head.innerHTML = '<p class=\"pbp-sub\" id=\"locJobLine\">' + escapeHtml([pbProdJobLabel(job.job_number), info.name, info.address].filter(Boolean).join(' · ')) + '</p>' + pbLocSrLine(job); /* r17.05 */")

# ---------- 5) Settings > Company: the company's state replaces "tickets are good for N days" ----------
rep_between("  // ---- Settings › Company: how long a new ticket is good for ----",
            "  // ---- B. materials: expected delivery, lead time, the run-out forecast ----",
r"""  // ---- r17.05 staterules: the Locates header line, the state pickers, the Rules view, the company server ----
  let pbLocSrPick = false, pbSrPullAt = 0, pbSrNoServer = false;
  const PB_SR_HOW = { phone: 'picked on this phone', picked: 'picked for this job', address: 'from the job address', company: 'the company’s state', default: 'no state in the job address' };
  function pbSrOptions(sel, blank) { return (blank ? '<option value="">' + escapeHtml(blank) + '</option>' : '') + pbSrCodes.map(c => '<option value="' + c + '"' + (c === sel ? ' selected' : '') + '>' + escapeHtml(PB_SR.states[c].name) + '</option>').join(''); }
  function pbLocSrLine(job) {
    const uid = pbArchiveOwnerUid; pbSrPullSoon(uid);
    const s = pbSrJob(job.key, job.job_number), R = pbSrRow(s.code), cs = R.centers.map(c => c.name).join(' or ');
    let h = '<div class="pbsr-line" id="locSrLine"><p class="pbp-sub" id="locSrText">' + escapeHtml(R.name + ' rules (' + PB_SR_HOW[s.how] + '). Call 811: ' + cs + '.') + '</p>'
      + '<div class="pbsr-acts"><button type="button" class="pb-btn ghost small" id="locSrRules" onclick="pbSrShow(' + pbLocQ(s.code) + ', this)">Rules for ' + escapeHtml(R.name) + '</button>'
      + '<button type="button" class="pb-btn ghost small" id="locSrChange" aria-expanded="' + (pbLocSrPick ? 'true' : 'false') + '" onclick="pbLocSrPickToggle()">Change State</button></div>';
    if (pbLocSrPick) h += '<div class="pb-field pbsr-pick"><label for="locSrSel">State this job is in</label><select id="locSrSel" onchange="pbLocSrSet(this.value)">' + pbSrOptions(s.how === 'phone' || s.how === 'picked' ? s.code : '', 'From the job address') + '</select></div>';
    return h + '</div>';
  }
  window.pbLocSrPickToggle = function() { pbLocSrPick = !pbLocSrPick; window.pbLocRender(); const el = pbLocE(pbLocSrPick ? 'locSrSel' : 'locSrChange'); if (el) el.focus({ preventScroll: true }); };
  window.pbLocSrSet = function(v) {
    const uid = pbArchiveOwnerUid, job = pbLoc.job; if (!job || !uid) return;
    const o = pbSrGet(uid); o.jobs_local[job.key] = { code: pbSrOk(v) ? v : '', num: job.job_number }; pbSrPut(uid, o);
    pbLocSrPick = false;
    const F = pbLoc.form; if (F && F.mode !== 'renew' && !F.expTyped && !F.renewed) F.v.expires_at = pbLocExpFor(F.v.called_at); /* a new ticket follows the new state; saved tickets keep their dates */
    window.pbLocRender(); const b = pbLocE('locSrChange'); if (b) b.focus({ preventScroll: true });
    pbSrPush(uid, job.job_number, pbSrOk(v) ? v : '').then(() => { if (pbLoc.job === job) window.pbLocRender(); });
  };
  function pbSrNoFn(m) { return /Could not find the function|does not exist|PGRST202/i.test(m); }
  function pbSrPush(uid, num, code) { // num '' or null: the company's state
    if (pbSrNoServer || !uid || uid === 'shared' || navigator.onLine === false) return Promise.resolve(false);
    return Promise.resolve(pbPermitRpc('pb_job_state_set', { p_job_number: num || null, p_state: code || null, p_expect_uid: uid }, 20000)).then(r => {
      const m = String((r && r.error && r.error.message) || '');
      if (pbSrNoFn(m)) { pbSrNoServer = true; return false; }
      if (!r || r.error || !r.data || r.data.ok !== true || pbArchiveOwnerUid !== uid) return false;
      const o = pbSrGet(uid);
      if (num) { const k = pbDlyKey(num); if (pbSrOk(code)) o.jobs[k] = code; else delete o.jobs[k]; delete o.jobs_local[k]; }
      else { o.co = pbSrOk(code) ? code : ''; delete o.co_local; }
      pbSrPut(uid, o); return true;
    }).catch(() => false);
  }
  function pbSrPullSoon(uid) {
    if (pbSrNoServer || !uid || uid === 'shared' || navigator.onLine === false || Date.now() - pbSrPullAt < 300000) return;
    pbSrPullAt = Date.now();
    Promise.resolve(pbPermitRpc('pb_state_rules_get', {}, 20000)).then(async r => {
      const m = String((r && r.error && r.error.message) || '');
      if (pbSrNoFn(m)) { pbSrNoServer = true; return; }
      if (!r || r.error || !r.data || r.data.ok !== true || pbArchiveOwnerUid !== uid) return;
      const o = pbSrGet(uid), J = r.data.jobs && typeof r.data.jobs === 'object' ? r.data.jobs : {};
      o.co = pbSrOk(r.data.company_state) ? r.data.company_state : ''; o.jobs = {}; Object.keys(J).forEach(k => { if (pbSrOk(J[k])) o.jobs[k] = J[k]; }); o.at = Date.now(); pbSrPut(uid, o);
      for (const k of Object.keys(o.jobs_local)) { const x = o.jobs_local[k]; if (x && x.num) await pbSrPush(uid, x.num, x.code); } // picks made with no signal (or before the update)
      if (o.co_local !== undefined && r.data.can_set_company) await pbSrPush(uid, null, o.co_local);
      pbLocRefreshScreens(); try { pbLocCoRender(); } catch (e) {}
    }).catch(() => {});
  }
  // the Rules view: everything from the table, the sources, the day it was checked. Works with no signal (links need it).
  function pbSrViewHtml(code) {
    const R = pbSrRow(code), chk = 'Check your state’s 811 rules.';
    const sec = (k, v, id) => '<div class="pbsr-sec" id="pbSrV_' + id + '"><div class="pbsr-k">' + escapeHtml(k) + '</div><div class="pbsr-v">' + v + '</div></div>';
    const t = (x) => escapeHtml(x || chk);
    const centers = R.centers.map(c => '<div>' + escapeHtml(c.name) + (c.area ? ' (' + escapeHtml(c.area) + ')' : '') + '. Phone ' + escapeHtml(c.phone || '811') + '. <a href="' + escapeHtml(c.url) + '" target="_blank" rel="noopener">' + escapeHtml(c.url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></div>').join('');
    const white = { required: 'Required. ', conditional: 'Required in some cases. ', recommended: 'Recommended. ' };
    let h = sec('Call 811', centers, 'center')
      + sec('Wait before digging', t(R.notice && R.notice.text), 'notice')
      + (R.start ? sec('Latest start', t(R.start.text), 'start') : '')
      + sec('Ticket life', t(R.life && R.life.text), 'life')
      + (R.renew ? sec('Renew or call again', t(R.renew), 'renew') : '')
      + sec('Tolerance zone', R.tol_text ? t(R.tol_text) : R.tol_in ? t(R.tol_in + ' inches.') : t(''), 'tol')
      + sec('White lining', R.white ? t((white[R.white] || '') + (R.white_text || '')) : t(''), 'white')
      + sec('Emergency', t(R.emergency), 'emerg')
      + sec('Trench protection', escapeHtml(R.trench && R.trench.text ? R.trench.text : 'Federal OSHA: protective system from 5 ft (29 CFR 1926.652).'), 'trench')
      + (R.permit ? sec('Permit', escapeHtml(R.permit), 'permit') : '')
      + sec('OSHA', escapeHtml(R.osha_name || (R.osha === 'state' ? 'State OSHA plan' : 'Federal OSHA')), 'osha')
      + (R.note ? '<p class="pbsr-note" id="pbSrVNote">' + escapeHtml(R.note) + '</p>' : '');
    h += '<details class="pb-more pbsr-src" id="pbSrVSrc"><summary>Sources (' + R.sources.length + ')</summary><ul>' + R.sources.map(x => '<li><a href="' + escapeHtml(x.url) + '" target="_blank" rel="noopener">' + escapeHtml(x.what) + '</a></li>').join('') + '</ul><p class="pbd-dim">Links need signal.</p></details>';
    h += '<p class="pbd-dim pbsr-foot" id="pbSrVChecked">Checked ' + escapeHtml(pbLocDay(R.checked) + ', ' + String(R.checked).slice(0, 4)) + '. Rules change. If your ticket or 811 center says something different, go by them. The app records what you enter.</p>';
    return h;
  }
  let pbSrBack = null;
  window.pbSrShow = function(code, from) {
    code = pbSrOk(code) ? code : (pbLoc.job ? pbSrJob(pbLoc.job.key, pbLoc.job.job_number).code : 'CA');
    let w = document.getElementById('pbSrView');
    if (!w) {
      w = document.createElement('div'); w.id = 'pbSrView'; w.className = 'pbsr-view'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-labelledby', 'pbSrVTitle');
      w.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); window.pbSrClose(); } });
      (document.getElementById('pbApp') || document.body).appendChild(w);
      pbSrBack = from || document.activeElement || null;
    }
    w.innerHTML = '<div class="pbsr-card"><div class="pbsr-head"><h2 class="pb-h2" id="pbSrVTitle">Rules for ' + escapeHtml(pbSrName(code)) + '</h2><button type="button" class="pb-btn ghost small" id="pbSrVClose" onclick="pbSrClose()">Close</button></div>'
      + '<div class="pb-field"><label for="pbSrVSel">State</label><select id="pbSrVSel" onchange="pbSrShow(this.value)">' + pbSrOptions(code) + '</select></div>'
      + '<div id="pbSrVBody" data-state="' + code + '">' + pbSrViewHtml(code) + '</div></div>';
    w.hidden = false; const c = document.getElementById(from === undefined ? 'pbSrVSel' : 'pbSrVClose'); if (c) c.focus({ preventScroll: true });
  };
  window.pbSrClose = function() { const w = document.getElementById('pbSrView'); if (w) w.remove(); const b = pbSrBack; pbSrBack = null; if (b && b.isConnected && typeof b.focus === 'function') b.focus({ preventScroll: true }); };
  // under the Trench Sloping result: the protective-system depth of the state this phone is in
  function pbSrTrenchNote() {
    const d = document.getElementById('trenchDiagram'); if (!d) return;
    let el = document.getElementById('trenchStateNote'); if (!el) { el = document.createElement('div'); el.id = 'trenchStateNote'; el.className = 'pbsr-tnote'; d.insertAdjacentElement('afterend', el); }
    const dv = document.getElementById('trenchDepth'), depth = dv ? parseFloat(dv.value) : NaN;
    if (!(depth > 0)) { el.innerHTML = ''; return; }
    const st = typeof window.pbHereState === 'function' ? window.pbHereState() : null, R = pbSrRow(st);
    let h;
    if (R) {
      const ft = (R.trench && R.trench.ft) || 5;
      h = '<p class="pbsr-tl" id="trenchStateText"><strong>' + escapeHtml(R.name) + '</strong> (where this phone is): ' + escapeHtml(R.trench && R.trench.text ? R.trench.text : 'Federal OSHA’s 5 ft rule is the floor.') + '</p>'
        + (R.permit ? '<p class="pbsr-tl" id="trenchStatePermit">' + escapeHtml(R.permit) + '</p>' : '')
        + (depth >= ft ? '<p class="pbsr-over" id="trenchStateOver">' + escapeHtml(depth.toFixed(1) + ' ft is ' + ft + ' ft or more: a protective system is needed unless it is all stable rock.') + '</p>' : '');
    } else {
      h = '<p class="pbsr-tl" id="trenchStateText">This phone doesn’t know which state it is in. Federal OSHA and most states: protective system from 5 ft. Washington: from 4 ft.</p>'
        + (depth >= 4 ? '<p class="pbsr-over" id="trenchStateOver">' + escapeHtml(depth >= 5 ? depth.toFixed(1) + ' ft: a protective system is needed unless it is all stable rock.' : depth.toFixed(1) + ' ft: in Washington a protective system is needed from 4 ft.') + '</p>' : '');
    }
    h += '<button type="button" class="pb-btn ghost small" id="trenchStateRules" onclick="pbSrShow(' + pbLocQ(st || '') + ', this)">' + (R ? 'Rules for ' + escapeHtml(R.name) : 'Rules by State') + '</button>';
    el.innerHTML = '<div class="pbsr-tbox">' + h + '</div>';
  }
  { const o = window.pbCalcTrench; if (typeof o === 'function') window.pbCalcTrench = function() { const r = o.apply(this, arguments); try { pbSrTrenchNote(); } catch (e) { console.error(e); } return r; }; }
  window.__debugSr = { job: (k, n) => pbSrJob(k, n), store: (u) => JSON.parse(JSON.stringify(pbSrGet(u || pbArchiveOwnerUid))), reset: () => { pbSrPullAt = 0; pbSrNoServer = false; pbSrMem = { uid: null, o: null }; } };

  // ---- Settings › Company: the company's state (r17.05; replaced "a new ticket is good for N days") ----
  let pbLocCo = { edit: false, busy: false, msg: '', kind: '' };
  const pbLocOrigCoTzRender = window.pbCoTzRender;
  window.pbCoTzRender = function() { const r = pbLocOrigCoTzRender.apply(this, arguments); try { pbLocCoRender(); } catch (e) { console.error(e); } return r; };
  function pbLocCoRender() {
    const w = pbLocE('settingsCoLocate'); if (!w) return;
    const uid = pbArchiveOwnerUid, D = pbCoTz.uid === uid ? pbCoTz.data : null, S = pbLocCo;
    if (!D) { if (!w.hidden) w.hidden = true; if (w.innerHTML) w.innerHTML = ''; return; }
    w.hidden = false; pbSrPullSoon(uid);
    const co = pbSrCompany(uid), msg = S.msg ? '<p class="pb-help' + (S.kind === 'err' ? ' pb-err' : '') + '" id="settingsCoLocMsg" role="status">' + escapeHtml(S.msg) + '</p>' : '';
    if (!S.edit) { w.innerHTML = '<button type="button" class="pbx-namerow" id="settingsCoLocRow" aria-expanded="false" onclick="pbLocCoEdit(true)"><span class="pbx-namerow-k">811 rules state</span><span class="pbx-namerow-v" id="settingsCoLocShown">' + escapeHtml(co ? pbSrName(co) : 'Not set (California is used)') + '</span><span class="pbx-namerow-a">Edit</span></button>' + msg; return; }
    w.innerHTML = '<div class="pbx-name-edit" id="settingsCoLocEdit"><div class="pb-field"><label for="settingsCoLocState">Company state</label><select id="settingsCoLocState">' + pbSrOptions(co, 'Not set') + '</select></div>'
      + '<p class="pb-help">Each job uses the 811 and trench rules of its own state, read from the job address. This state is used when the address has no state. Tickets already saved keep their dates.</p>'
      + '<div class="pbx-btnrow"><button type="button" class="pb-btn secondary small" id="settingsCoLocSave" onclick="pbLocCoSave()"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Saving…' : 'Save') + '</button><button type="button" class="pb-btn ghost small" id="settingsCoLocCancel" onclick="pbLocCoEdit(false)">Cancel</button></div>' + msg + '</div>';
  }
  window.pbLocCoEdit = function(on) { pbLocCo.edit = !!on; pbLocCo.msg = ''; pbLocCoRender(); const f = pbLocE(on ? 'settingsCoLocState' : 'settingsCoLocRow'); if (f) f.focus({ preventScroll: true }); };
  window.pbLocCoSave = async function() {
    const S = pbLocCo, uid = pbArchiveOwnerUid, el = pbLocE('settingsCoLocState'); if (S.busy || !el || !uid) return;
    const v = pbSrOk(el.value) ? el.value : '';
    const o = pbSrGet(uid); o.co_local = v; pbSrPut(uid, o);
    S.busy = true; S.msg = ''; pbLocCoRender();
    let ok = false; try { ok = await pbSrPush(uid, null, v); } finally { S.busy = false; }
    if (pbArchiveOwnerUid !== uid) return;
    S.edit = false; S.kind = 'ok';
    S.msg = ok ? 'Saved.' : navigator.onLine === false ? 'Saved on this phone. It is sent to the company server when there is signal.' : pbSrNoServer ? 'Saved on this phone only. The company server needs an update before your crews get it.' : 'Saved on this phone. Not on the company server yet; it is tried again later.';
    pbLocCoRender(); pbLocRefreshScreens();
    const b = pbLocE('settingsCoLocRow'); if (b) b.focus({ preventScroll: true });
  };

""")

# ---------- 6) the run's deep-trench flag: the depth from the table ----------
rep("function pbCaveTrig() { const st = typeof window.pbHereState === 'function' ? window.pbHereState() : null; return { ft: st && st !== 'WA' ? 5 : 4, state: st }; }",
    "function pbCaveTrig() { const st = typeof window.pbHereState === 'function' ? window.pbHereState() : null, R = st && window.pbSrMath ? window.pbSrMath.row(st) : null; return { ft: st ? (R && R.trench && R.trench.ft) || 5 : 4, state: st }; } /* r17.05: the state table (WA 4 ft; a plan we haven't checked: the federal 5 ft floor) */")

# ---------- 7) styles ----------
rep("  #pbApp .pbloc-help { margin: -4px 0 12px; }",
r"""  #pbApp .pbloc-help { margin: -4px 0 12px; }
  /* r17.05 staterules */
  #pbApp .pbsr-line { margin: 4px 0 0; }
  #pbApp .pbsr-acts { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 0; }
  #pbApp .pbsr-pick { margin: 10px 0 0; }
  #pbApp .pbsr-view { position: fixed; inset: 0; z-index: 2147482000; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px)); background: rgba(0, 0, 0, 0.55); box-sizing: border-box; }
  #pbApp .pbsr-card { width: 100%; max-width: 520px; background: var(--pb-surface); color: var(--pb-text); border: 1px solid var(--pb-divider); border-radius: 16px; padding: 16px; box-sizing: border-box; }
  #pbApp .pbsr-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 8px; }
  #pbApp .pbsr-head .pb-h2 { margin: 0; font-size: 1.2rem; }
  #pbApp .pbsr-sec { padding: 10px 0; border-top: 1px solid var(--pb-divider); }
  #pbApp .pbsr-k { font-weight: 700; font-size: 0.95rem; margin: 0 0 4px; }
  #pbApp .pbsr-v { font-size: 0.95rem; line-height: 1.45; overflow-wrap: anywhere; }
  #pbApp .pbsr-v a, #pbApp .pbsr-src a { color: var(--pb-text); text-decoration: underline; }
  #pbApp .pbsr-src ul { margin: 6px 0; padding-left: 18px; line-height: 1.45; overflow-wrap: anywhere; }
  #pbApp .pbsr-note { margin: 10px 0 0; padding: 10px 12px; border-left: 4px solid var(--pb-warn-text); background: var(--pb-raised); border-radius: 8px; }
  #pbApp .pbsr-foot { margin: 12px 0 0; }
  #pbApp .pbsr-tnote { margin-top: 14px; }
  #pbApp .pbsr-tbox { padding: 12px; border: 1px solid var(--pb-divider); border-radius: 12px; background: var(--pb-raised); }
  #pbApp .pbsr-tl { margin: 0 0 8px; line-height: 1.45; }
  #pbApp .pbsr-over { margin: 0 0 10px; font-weight: 700; color: var(--pb-danger-text); }""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
