import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.86: the daily report's materials list the fittings the app counted on each run (and the MJ kits they need)
rep("""      const ft = e.completedDistance !== undefined ? e.completedDistance : e.distance;
      return { id: String(e.id),""", """      const ft = e.completedDistance !== undefined ? e.completedDistance : e.distance;
      let fittings = null; try { const C = typeof window.pbFitCount === 'function' ? window.pbFitCount(e) : null; if (C && C.planned) fittings = { items: C.items.map(g => ({ name: g.name, n: g.n })), total: C.total, planned: C.planned, joints: C.joints, kind: C.kind, laid_only: C.laidOnly }; } catch (x) {} /* r16.86 */
      return { fittings, id: String(e.id),""")
rep("""      if (r.backfill_yd3 !== null) rows.push({ what: 'Backfill (calculated estimate)', qty: r.backfill_yd3, unit: 'yd³', basis: 'Run calculation for ' + r.label + whole, kind: 'estimate' });
    });""", """      if (r.backfill_yd3 !== null) rows.push({ what: 'Backfill (calculated estimate)', qty: r.backfill_yd3, unit: 'yd³', basis: 'Run calculation for ' + r.label + whole, kind: 'estimate' });
      if (r.fittings && r.fittings.total) { /* r16.86 */
        const fb = 'Fittings on ' + r.label + (r.fittings.laid_only ? ' marked laid (' + r.fittings.total + ' of ' + r.fittings.planned + ')' : ' (the run\\u2019s fittings; no laid marks)') + ', counted by the app';
        r.fittings.items.forEach(g => rows.push({ what: g.name, qty: g.n, unit: 'ea', basis: fb, kind: 'counted' }));
        if (r.fittings.kind === 'mj') rows.push({ what: 'MJ accessory kits (gland, gasket, bolts)', qty: r.fittings.joints, unit: 'ea', basis: 'One per MJ joint of those fittings, counted by the app', kind: 'counted' });
      }
    });""")
rep("""    return { source: 'Used: the foreman’s pipe footage on each run; bedding and backfill are the runs’ calculated estimates (whole run, not only this day).""",
    """    return { source: 'Used: the foreman’s pipe footage on each run; fittings counted by the app from each run’s fittings (the laid ones once laid marks are used), with MJ kits where the joints are MJ; bedding and backfill are the runs’ calculated estimates (whole run, not only this day).""")
rep("""  async function pbDlyMaterials(uid, job, date, runSec) {""", """  window.__pbDlyFitTest = async (e) => { const sec = pbDlyRunSection([e]); return (await pbDlyMaterials(null, e.jobNumber, '2000-01-01', sec)).used; }; // r16.86: tests
  async function pbDlyMaterials(uid, job, date, runSec) {""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
