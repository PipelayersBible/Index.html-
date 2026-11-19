#!/usr/bin/env python3
# daily3 #45 (owner's rule, Nov 18): crew hours on the daily default to 8 hours, unless the time from the crew's first start
# to last stop that day is greater than 8 hours; then first start to last stop is the default. The foreman can always
# change it.
# Before: a person on the Crew log got his logged run time (check-in to check-out on runs only, so setup, travel and the
# time between runs were dropped), and only people with no log hours got 8 h (or the day's run span).
# Now: everyone's box starts at the crew's day: 8 h, or first start to last stop when that is longer (to the half hour,
# at most 24). First start / last stop: this phone's runs reported on that day (any job, so a two-job day is one day),
# the crew's check-ins and check-outs on them, his crew's runs and an office fill-in's runs. A night shift's runs after
# midnight count with the shift (patch 01). Break is not taken off (#44: the foreman decides).
# #46 (r17.00, kept): a person's default is that day LESS the hours he already has on the foreman's other signed
# report(s) that day. The logged hours are still kept on the report (log_h), and what the foreman types always wins.
# Equipment keeps its own default (pbDxDayDef / pbEhDefRun, unchanged).
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 1) the crew's day: first start to last stop
rep("""  function pbDxDayDef() { const h = pbDxRunSpanH(); return h > 8 ? String(Math.min(16, Math.round(h * 2) / 2)) : '8'; }
  window.pbDxDayDef = pbDxDayDef;""",
"""  function pbDxDayDef() { const h = pbDxRunSpanH(); return h > 8 ? String(Math.min(16, Math.round(h * 2) / 2)) : '8'; }
  window.pbDxDayDef = pbDxDayDef;
  // daily3 #45: the crew's first start to last stop on the report day (all of this phone's runs that day, any job; their crew
  // check-ins; his crew's runs; an office fill-in's runs). { h, a, b } (ms), h 0 when nothing is known.
  function pbDxCrewSpan() {
    const V = pbDlyView; if (!V || !V.date) return { h: 0, a: null, b: null }; let a = Infinity, b = -Infinity;
    const tm = (v) => typeof v === 'number' ? v : typeof v === 'string' && v ? Date.parse(v) : NaN;
    const add = (s, e) => { s = tm(s); e = tm(e); if (!isFinite(s) || !isFinite(e) || e <= s || e - s > 20 * 3600000) return; if (s < a) a = s; if (e > b) b = e; };
    try {
      const co = pbDly.st && pbDly.st.co;
      (runArchive || []).filter(e => e && e.kind === 'run' && (typeof pbDlyRunDay === 'function' ? pbDlyRunDay(e) : pbFmDay(e.runStartTime || e.lockTime)) === V.date && (() => { const c = pbDlyRunCo(e); return !c || !co || c === co; })()).forEach(e => {
        add(e.runStartTime || e.lockTime, e.runEndTime);
        (e.crewLog || []).forEach(p => { if (p && p.type !== 'Equipment') pbDfIv(p.log).forEach(iv => add(iv[0], iv[1])); });
      });
    } catch (e) { console.error(e); }
    try { if (pbLv && pbLv.uid === pbArchiveOwnerUid && pbLv.data && Array.isArray(pbLv.data.crew)) pbLv.data.crew.forEach(c => (c && Array.isArray(c.runs) ? c.runs : []).forEach(r => { const st = (r && r.status) || {};
      if (String(r.work_date || st.workDate || '') !== String(V.date)) return; add(st.startedAt, st.endedAt); })); } catch (e) {}
    try { (V.fill ? pbP95OffRuns() : []).forEach(x => { const R = x && x.rec; if (R) add(R.runStartTime, R.runEndTime); }); } catch (e) {}
    try { const D = pbDa && pbDa.day; if (D && D.data && D.k === pbDlyKey(V.job) + '|' + V.date) D.data.runs.forEach(m => { const R = m && pbDa.recs.get('run:' + m.id), rec = R && R.rec; if (rec) add(rec.runStartTime, rec.runEndTime); }); } catch (e) {}
    return b > a ? { h: (b - a) / 3600000, a, b } : { h: 0, a: null, b: null };
  }
  // 8 h, or first start to last stop when that is longer (to the half hour, at most 24)
  function pbDxCrewDayDef() { const h = pbDxCrewSpan().h; return h > 8 ? String(Math.min(24, Math.round(h * 2) / 2)) : '8'; }
  window.pbDxCrewDayDef = pbDxCrewDayDef;""")

# 2) each person's default: the crew's day, less his hours on today's other signed report(s) (#46)
rep("""  const pbDxDayDefFor = (p) => { const def = Number(pbDxDayDef()) || 8, e = pbDxElseH(p); return e > 0 ? String(Math.max(0, Math.round((def - e) * 2) / 2)) : String(def); };
  const pbDxHvC = (p, eq) => { const v = pbDxHv(p, !!eq);""",
"""  const pbDxDayDefFor = (p) => { const def = Number(pbDxCrewDayDef()) || 8, e = pbDxElseH(p); return e > 0 ? String(Math.max(0, Math.round((def - e) * 2) / 2)) : String(def); }; /* daily3 #45 */
  const pbDxHvC = (p, eq) => { const v = eq ? pbDxHv(p, true) : (p.hours !== undefined && p.hours !== null ? String(p.hours) : ''); /* daily3 #45: a person's box is what he typed, else the crew's day (not the logged run time) */""")

# 3) the lines under Crew Today: why the boxes say what they say
rep("""      + (d.crew.some(p => (p.hours === undefined || p.hours === null) && pbDxHv(p, false) === '' && pbDxElseH(p) > 0) ? '<p class="pbd-dim" id="dxCrewElse">'""",
"""      + pbDxCrewDefLine(d) /* daily3 #45 */
      + (d.crew.some(p => (p.hours === undefined || p.hours === null) && pbDxElseH(p) > 0) ? '<p class="pbd-dim" id="dxCrewElse">'""")
rep("""  function pbDxCrewCard(d, cs, ids) {""",
"""  function pbDxCrewDefLine(d) { /* daily3 #45 */
    try {
      if (!d.crew.length || pbDlyView.amend || !d.crew.some(p => p.hours === undefined || p.hours === null)) return '';
      const S = pbDxCrewSpan(), def = pbDxCrewDayDef(), tz = pbFmCoTz() || undefined;
      const tt = (t) => { try { return new Date(t).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }); } catch (e) { return new Date(t).toLocaleTimeString(); } };
      const txt = S.h > 8 ? 'Hours start at the crew\\u2019s day: first start ' + tt(S.a) + ' to last stop ' + tt(S.b) + ', ' + def + ' h. Change any box that is wrong.'
        : 'Hours start at 8 h' + (S.h > 0 ? ' (first start ' + tt(S.a) + ' to last stop ' + tt(S.b) + ' is not more than 8 h)' : '') + '. Change any box that is wrong.';
      return '<p class="pbd-dim" id="dxCrewDef">' + escapeHtml(txt) + '</p>';
    } catch (e) { return ''; }
  }
  function pbDxCrewCard(d, cs, ids) {""")

# 4) rows filled from the runs (feat_dailyfill) carry no hours for people: the crew's day applies (equipment unchanged)
rep("""    Object.keys(out).forEach(k => { const L = out[k], h = L.eq ? '' : pbDfHs(pbDfIvH(L.iv) + exOf(L)), mk =""",
"""    Object.keys(out).forEach(k => { const L = out[k], h = '' /* daily3 #45: a person's default is the crew's day, not his logged run time */, mk =""")

# 5) "Auto" after he changed a person's box goes back to the crew's day
rep("""    return (L && L.hours !== '' && i >= 0 && pbDfOver(x) ? pbDfResetHtml(x, eq, i, L) : '') + still;""",
"""    const LL = L && !eq ? Object.assign({}, L, { hours: pbDxDayDefFor(x) }) : L; /* daily3 #45 */
    return (LL && LL.hours !== '' && i >= 0 && pbDfOver(x) ? pbDfResetHtml(x, eq, i, LL) : '') + still;""")

# 6) the snapshot says what the default was (for the office; the hours themselves are per person as before)
rep("""    snap.crew_today.people = d.crew.map((p, i) => { const o = snap.crew_today.people[i], h = pbCeHrs(pbDxHvC(p)).n, lh = pbDxLogH(p.name, false);""",
"""    try { const S0 = pbDxCrewSpan(); snap.crew_today.day_default = { hours: Number(pbDxCrewDayDef()), first_start: S0.a ? new Date(S0.a).toISOString() : null, last_stop: S0.b ? new Date(S0.b).toISOString() : null, rule: '8 h, or first start to last stop when longer' }; } catch (e) {} /* daily3 #45 */
    snap.crew_today.people = d.crew.map((p, i) => { const o = snap.crew_today.people[i], h = pbCeHrs(pbDxHvC(p)).n, lh = pbDxLogH(p.name, false);""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
