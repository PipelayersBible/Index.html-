import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# daily2 01: a second job the same day. A person with no Crew-log hours starts at the full-day default LESS the hours
# he already has on this foreman's other signed reports for that date (the latest version on each job), never below 0.
rep("""  const pbDxHvC = (p, eq) => { const v = pbDxHv(p, !!eq); return v === '' && (p.hours === undefined || p.hours === null) ? (eq ? pbEhDefRun(p) : pbDxDayDef()) : v; };""",
"""  function pbDxElseH(p) { /* daily2 01: hours this person already has on his other signed reports for this date */
    try {
      const V = pbDlyView, st = pbDly.st; if (!st || !V || !V.date || !p || V.amend) return 0;
      const last = {}; st.reports.filter(r => r && r.snapshot && r.workDate === V.date && pbDlyKey(r.jobNumber) !== pbDlyKey(V.job) && r.state !== 'discarded' && r.state !== 'replaced' && pbDpSameCo(r))
        .forEach(r => { const k = pbDlyKey(r.jobNumber); if (!last[k] || (r.signedAt || 0) > (last[k].signedAt || 0)) last[k] = r; });
      const nk = pbDxNk(p.name), uid = p.me ? pbArchiveOwnerUid : p.user_id; let h = 0;
      Object.keys(last).forEach(k => { const P = last[k].snapshot.crew_today && Array.isArray(last[k].snapshot.crew_today.people) ? last[k].snapshot.crew_today.people : [];
        P.forEach(q => { if (q && typeof q.hours === 'number' && isFinite(q.hours) && ((uid && q.user_id === uid) || pbDxNk(q.name) === nk)) h += q.hours; }); });
      return Math.max(0, h);
    } catch (e) { return 0; }
  }
  const pbDxDayDefFor = (p) => { const def = Number(pbDxDayDef()) || 8, e = pbDxElseH(p); return e > 0 ? String(Math.max(0, Math.round((def - e) * 2) / 2)) : String(def); };
  const pbDxHvC = (p, eq) => { const v = pbDxHv(p, !!eq); return v === '' && (p.hours === undefined || p.hours === null) ? (eq ? pbEhDefRun(p) : pbDxDayDefFor(p)) : v; }; /* daily2 01: less his hours on today's other report(s) */""")
rep("""      + pbDpAddRow('crew', 'Add a name', false) + '</div></section>';""",
"""      + (d.crew.some(p => (p.hours === undefined || p.hours === null) && pbDxHv(p, false) === '' && pbDxElseH(p) > 0) ? '<p class="pbd-dim" id="dxCrewElse">' + escapeHtml('Hours already on today\\u2019s other report(s) are taken off the full day for the people on them. Change any box that is wrong.') + '</p>' : '') /* daily2 01 */
      + pbDpAddRow('crew', 'Add a name', false) + '</div></section>';""")
open(out, 'w', encoding='utf-8').write(s)
