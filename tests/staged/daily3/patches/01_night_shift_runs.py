#!/usr/bin/env python3
# daily3 #47 (owner, Nov 18): night shift. Runs started after midnight stay with the shift's report.
# A run's report day used to be the day it started (company zone). Now a run that starts before noon belongs to the day
# before when it continues a shift that started that day: the runs on this phone (any job), in start order, each
# starting no more than 4 h after the shift's last stop (or while a run of the shift is still open). Once the shift's
# report for that run's job is signed (signed before the run started), a later run starts a new day as before.
# Used by: the runs a daily pulls in (pbDlyRunsOf, so runs, crew log, materials, run notes, crew fill), the jobs list of
# a day, r17.00's "open on the shift's day" (pbFmNightDay) and the missing-reports list.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 1) the report day of a run
rep("""  // ---- what the report pulls in (every section says where it came from) ----
  function pbDlyRunsOf(job, date) {
    const k = pbDlyKey(job);
    return (runArchive || []).filter(e => e && e.kind === 'run' && pbDlyKey(e.jobNumber) === k && pbFmDay(e.runStartTime || e.lockTime) === date)""",
"""  // ---- daily3 #47 (owner): the day a run's work is reported on. A night shift's runs started after midnight stay with the
  // shift's report: a run started before noon (company zone) that starts within 4 h of the shift's last stop (or while one
  // of its runs is still open) belongs to the shift's day, unless that job's report for that day was already signed. ----
  const PB_SHIFT_GAP_MS = 4 * 3600000;
  let pbDlyShiftMemo = { k: null, m: null }, pbDlyHourFmt = { tz: undefined, f: null };
  function pbDlyHourOf(t) {
    const tz = pbFmCoTz() || undefined;
    try { if (!pbDlyHourFmt.f || pbDlyHourFmt.tz !== tz) pbDlyHourFmt = { tz, f: new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }) }; return Number(pbDlyHourFmt.f.format(new Date(t))) % 24; } catch (e) { return new Date(t).getHours(); }
  }
  function pbDlyDayBefore(d) { const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(d || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] - 1)).toISOString().slice(0, 10) : ''; }
  function pbDlyShiftSigned(e, day, s) {
    try { return pbDlyMineFor(e.jobNumber, day).some(r => r && r.state !== 'discarded' && r.state !== 'replaced' && (typeof r.signedAt === 'number' ? r.signedAt : Date.parse(r.signedAt || '')) < s); } catch (x) { return false; }
  }
  function pbDlyShiftMap() {
    const tm = (v) => typeof v === 'number' ? v : v ? Date.parse(v) : NaN;
    const runs = (runArchive || []).filter(e => e && e.kind === 'run');
    let k = (pbFmCoTz() || '') + '|' + runs.length;
    runs.forEach(e => { k += '|' + e.id + ':' + (e.runStartTime || e.lockTime || '') + ':' + (e.runEndTime || '') + (e.completed || e.incomplete ? 'c' : '') + ':' + pbDlyKey(e.jobNumber); });
    try { if (pbDly.st) k += '#' + pbDly.st.reports.map(r => r.cid + (r.state || '') + (r.signedAt || '')).join(','); } catch (x) {}
    if (pbDlyShiftMemo.k === k && pbDlyShiftMemo.m) return pbDlyShiftMemo.m;
    const L = runs.map(e => ({ e, s: tm(e.runStartTime || e.lockTime), f: tm(e.runEndTime) })).filter(x => isFinite(x.s)).sort((a, b) => a.s - b.s);
    const m = new Map(); let day0 = null, end0 = -Infinity, open0 = false;
    L.forEach(x => {
      const cal = pbFmDay(x.s); let day = cal;
      if (day0 && day0 < cal && day0 === pbDlyDayBefore(cal) && pbDlyHourOf(x.s) < 12 && (open0 || x.s - end0 <= PB_SHIFT_GAP_MS) && !pbDlyShiftSigned(x.e, day0, x.s)) day = day0;
      if (day !== day0) { day0 = day; end0 = -Infinity; open0 = false; }
      m.set(x.e, day);
      if (isFinite(x.f)) end0 = Math.max(end0, x.f); else if (!(x.e.completed || x.e.incomplete)) open0 = true; else end0 = Math.max(end0, x.s);
    });
    pbDlyShiftMemo = { k, m };
    return m;
  }
  function pbDlyRunDay(e) { try { const d = pbDlyShiftMap().get(e); if (d) return d; } catch (x) { console.error(x); } return pbFmDay(e.runStartTime || e.lockTime); }
  window.__pbDlyRunDay = (e) => pbDlyRunDay(e); // tests
  // ---- what the report pulls in (every section says where it came from) ----
  function pbDlyRunsOf(job, date) {
    const k = pbDlyKey(job);
    return (runArchive || []).filter(e => e && e.kind === 'run' && pbDlyKey(e.jobNumber) === k && pbDlyRunDay(e) === date) /* daily3 #47 */""")

# 2) the jobs of a day
rep("""    (runArchive || []).filter(e => e && (e.kind === 'run' || e.kind === 'confined') && pbFmDay(e.runStartTime || e.lockTime) === date).forEach(e => add(e.jobNumber, e.jobsite)); /* feat_foreman 2 */""",
"""    (runArchive || []).filter(e => e && (e.kind === 'run' || e.kind === 'confined') && (e.kind === 'run' ? pbDlyRunDay(e) : pbFmDay(e.runStartTime || e.lockTime)) === date).forEach(e => add(e.jobNumber, e.jobsite)); /* feat_foreman 2; daily3 #47 */""")

# 3) r17.00: which day the daily opens on after a night shift (a run of the shift started after midnight counts too)
rep("""      const runs = (runArchive || []).filter(e => e && e.kind === 'run' && e.runStartTime && pbFmDay(e.runStartTime) === y && (e.runEndTime ? pbFmDay(e.runEndTime) === today : !(e.completed || e.incomplete)))""",
"""      const runs = (runArchive || []).filter(e => e && e.kind === 'run' && e.runStartTime && pbDlyRunDay(e) === y && (pbFmDay(e.runStartTime) === today || (e.runEndTime ? pbFmDay(e.runEndTime) === today : !(e.completed || e.incomplete)))) /* daily3 #47 */""")
rep("""pbDxToast('Opened on ' + pbDlyDayText(nd.day) + ': your shift\\u2019s run started then. Change the date for today\\u2019s report.');""",
"""pbDxToast('Opened on ' + pbDlyDayText(nd.day) + ': your shift started then, and its runs after midnight are on this report. Change the date for today\\u2019s report.'); /* daily3 #47 */""")

# 4) the missing-reports list
rep("""      (runArchive || []).filter(e => e && e.kind === 'run' && e.jobNumber).forEach(e => add(e.jobNumber, pbFmDay(e.runStartTime || e.lockTime)));""",
"""      (runArchive || []).filter(e => e && e.kind === 'run' && e.jobNumber).forEach(e => add(e.jobNumber, pbDlyRunDay(e))); /* daily3 #47 */""")

# 5) the source line says so
rep("""return { source: 'This phone’s Records: the run sessions started on this day with this job number.""",
"""return { source: 'This phone’s Records: the run sessions started on this day with this job number (a night shift’s runs started after midnight are on the shift’s day).""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
