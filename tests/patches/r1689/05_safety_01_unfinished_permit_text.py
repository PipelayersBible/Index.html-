import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Bug hunt (safety 01): Records > Unfinished permits (the last copy of a permit whose phone was lost or dead).
# 1. the emergency number was never printed (the permit stores emergencyDialNumber, the list asked for emergencyNumber);
# 2. air tests were printed as raw stored fields (UTC ISO time, order, by) with nothing marking a reading outside the
#    permit's limits. Now one readable line per test in this phone's local time, marked OUTSIDE ACCEPTABLE RANGE by the
#    same check every other permit view uses (pbAtmoProblems against the permit's own limits), plus the hazardous
#    readings kept on the permit that never reached the log (permit.unloggedHazards);
# 3. roster and communication-check times are local times too.
rep("""['comms', 'Communication'], ['emergencyNumber', 'Emergency number']];""",
    """['comms', 'Communication'], ['emergencyDialNumber', 'Emergency number']];""")
rep("""    (sn.atmoLog || []).forEach(r => L.push('  ' + flat(r)));
    L.push('', 'ROSTER');
    (sn.roster || []).forEach(r => { L.push('  ' + (r.name || 'Person') + ' - ' + (r.status || '') + (r.role ? ' (' + r.role + ')' : '')); (r.log || []).forEach(x => L.push('     ' + (typeof x === 'object' ? flat(x) : x))); });
    L.push('', 'COMM CHECKS'); (sn.commLog || []).forEach(r => L.push('  ' + (typeof r === 'object' ? flat(r) : r)));""",
    """    /* hunt safety 01: readable lines, local time, outside-range readings marked */
    const gv = (x, u) => typeof x === 'number' && isFinite(x) ? x + u : (x === null || x === undefined || x === '' ? '\\u2014' : String(x).slice(0, 20));
    const airRows = Array.isArray(sn.atmoLog) ? sn.atmoLog.filter(r => r && typeof r === 'object') : [];
    let outN = 0;
    airRows.forEach(r => {
      let pr = []; try { pr = pbAtmoProblems(r.o2, r.lel, p, { h2s: r.h2s, co: r.co }); } catch (e) { pr = []; }
      if (pr.length) outN++;
      L.push('  ' + (fmt(r.time) || 'time not recorded') + ' \\u2014 Tester: ' + (r.tester || '\\u2014') + ' \\u2014 O2: ' + gv(r.o2, '%') + ' \\u2014 LEL: ' + gv(r.lel, '%')
        + (r.h2s !== null && r.h2s !== undefined ? ' \\u2014 H2S: ' + gv(r.h2s, ' ppm') : '') + (r.co !== null && r.co !== undefined ? ' \\u2014 CO: ' + gv(r.co, ' ppm') : '') + (r.other ? ' \\u2014 ' + String(r.other).slice(0, 300) : '')
        + (pr.length ? ' \\u2014 OUTSIDE ACCEPTABLE RANGE (' + pr.join(' ') + ')' : ''));
    });
    let unl = []; try { unl = pbUnloggedHazards(p, airRows); } catch (e) { unl = []; }
    if (unl.length) { L.push('  Measured but NOT in the log (refused as a record or did not save), outside the acceptable range:'); unl.forEach(h => { try { L.push('     ' + pbUnloggedHazardLine(h, p)); } catch (e) {} }); }
    if (!airRows.length && !unl.length) L.push('  None logged.');
    else L.push('  ' + (outN + unl.length ? 'Readings outside the acceptable range: ' + (outN + unl.length) + ' of ' + (airRows.length + unl.length) : 'No reading outside the acceptable range') + ' (the permit\\u2019s limits above; a blank limit uses the standard value).');
    const evLine = (x) => { if (!x || typeof x !== 'object') return String(x); const t = fmt(x.time); return [x.action || '', t, x.outsideWindow ? '(outside permit window)' : '', x.againstBlock ? '(ENTERED AGAINST A DO NOT ENTER WARNING' + (x.reason ? ': ' + x.reason : '') + ')' : ''].filter(Boolean).join(' '); };
    L.push('', 'ROSTER');
    (sn.roster || []).forEach(r => { L.push('  ' + (r.name || 'Person') + ' - ' + (r.status === 'in' ? 'IN THE SPACE' : (r.status || '')) + (r.role ? ' (' + r.role + ')' : '')); (r.log || []).forEach(x => L.push('     ' + evLine(x))); });
    L.push('', 'COMM CHECKS'); (sn.commLog || []).forEach(r => L.push('  ' + (r && typeof r === 'object' ? (fmt(r.time) || flat(r)) : r)));""")
open(out, 'w', encoding='utf-8').write(s)
