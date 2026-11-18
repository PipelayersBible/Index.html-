import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# daily2 02: the daily opened after a night shift (before noon, no date asked for) opens on the day the shift's run
# started, when that run ended today (or is still open) and that day's report for its job isn't signed yet.
rep("""    const today = await pbFmOpenDay(uid), jobs = pbDlyJobsToday(uid, today); /* feat_foreman 2 */""",
"""    const today = await pbFmOpenDay(uid), nd = opts.date || opts.fill ? null : pbFmNightDay(today), jobs = pbDlyJobsToday(uid, nd ? nd.day : today); /* feat_foreman 2; daily2 02: night shift */
    if (nd && !opts.job) opts = Object.assign({}, opts, { job: nd.job });""")
rep("""day = opts.date && opts.date <= [today, pbTkToday(), pbFmToday()].sort().pop() ? opts.date : today;""",
    """day = opts.date && opts.date <= [today, pbTkToday(), pbFmToday()].sort().pop() ? opts.date : nd && pbDlyKey(nd.job) === pbDlyKey(opts.job) ? nd.day : today;""")
rep("""    pbDlyPick();
    pbDlySyncSoon(500);
  };""", """    pbDlyPick();
    if (nd && pbDlyView.date === nd.day) { try { pbDxToast('Opened on ' + pbDlyDayText(nd.day) + ': your shift\\u2019s run started then. Change the date for today\\u2019s report.'); } catch (e) {} } /* daily2 02 */
    pbDlySyncSoon(500);
  };
  // daily2 02: before noon (company time), a run on this phone that started yesterday and ended today or is still open,
  // whose job has no signed report for yesterday: that day and job (else null)
  function pbFmNightDay(today) {
    try {
      const tz = pbFmCoTz(); let hr = 12; try { hr = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, hour: '2-digit', hourCycle: 'h23' }).format(new Date())) % 24; } catch (e) { hr = new Date().getHours(); }
      if (!(hr < 12)) return null;
      const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(today || ''); if (!m) return null;
      const y = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] - 1)).toISOString().slice(0, 10);
      const runs = (runArchive || []).filter(e => e && e.kind === 'run' && e.runStartTime && pbFmDay(e.runStartTime) === y && (e.runEndTime ? pbFmDay(e.runEndTime) === today : !(e.completed || e.incomplete)))
        .sort((a, b) => (Number(b.runEndTime) || Date.now()) - (Number(a.runEndTime) || Date.now()));
      const r = runs.find(e => e.jobNumber && !pbDlyMineFor(e.jobNumber, y).some(x => x.state !== 'discarded' && x.state !== 'replaced'));
      return r ? { day: y, job: String(r.jobNumber).trim() } : null;
    } catch (e) { return null; }
  }""")
open(out, 'w', encoding='utf-8').write(s)
