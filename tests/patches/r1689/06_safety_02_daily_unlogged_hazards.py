import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Bug hunt (safety 02): the daily report's permit line counted outside-range air tests from the Atmospheric Test Log
# only. A hazardous reading that never reached the log (refused as a record, e.g. LEL left blank, or its save failed)
# is kept on the permit as permit.unloggedHazards and is in the permit's own report, but the daily said nothing.
# Now those count as OUTSIDE RANGE too (air_outside), with how many of them are not in the log (air_unlogged).
rep("""      let outN = 0; try { outN = air.filter(r => deps.problems(r, p)).length; } catch (x) {}
      let closed = null;""",
    """      let outN = 0; try { outN = air.filter(r => deps.problems(r, p)).length; } catch (x) {}
      let unl = 0; try { unl = typeof deps.unlogged === 'function' ? (Number(deps.unlogged(p, air)) || 0) : 0; } catch (x) { unl = 0; } /* hunt safety 02: hazardous readings kept on the permit that are in no log row */
      outN += unl;
      let closed = null;""")
rep("""map(x => x.name), air_tests: air.length, air_outside: outN,""",
    """map(x => x.name), air_tests: air.length, air_outside: outN, ...(unl ? { air_unlogged: unl } : {}),""")
rep("""      if (p.air_outside) out.push(p.air_outside + ' air test(s) OUTSIDE RANGE on ' + nm + '.');""",
    """      if (p.air_outside) out.push(p.air_outside + ' air test(s) OUTSIDE RANGE on ' + nm + (p.air_unlogged ? ' (' + p.air_unlogged + ' measured but not in the test log; see the permit record)' : '') + '.');""")
rep("""      archIncidents: (e) => pbRptPermitIncidents(e), closedAt: (e) => pbRptPermitClosed(e) });""",
    """      archIncidents: (e) => pbRptPermitIncidents(e), closedAt: (e) => pbRptPermitClosed(e),
      unlogged: (p, air) => pbUnloggedHazards(p, air).length /* hunt safety 02 */ });""")
# the screen line and the PDF cell say when an outside-range reading is not one of the logged tests
rep("""(p.air_outside ? ', ' + p.air_outside + ' OUTSIDE RANGE' : '') + (p.emergency_active ? ' · <strong>EMERGENCY IN PROGRESS</strong>' : '')""",
    """(p.air_outside ? ', ' + p.air_outside + ' OUTSIDE RANGE' + (p.air_unlogged ? ' (' + p.air_unlogged + ' not in the log)' : '') : '') + (p.emergency_active ? ' · <strong>EMERGENCY IN PROGRESS</strong>' : '')""")
rep("""p.air_tests + (p.air_outside ? '\\n' + p.air_outside + ' OUTSIDE RANGE' : ''), p.status""",
    """p.air_tests + (p.air_outside ? '\\n' + p.air_outside + ' OUTSIDE RANGE' + (p.air_unlogged ? '\\n(' + p.air_unlogged + ' not in the log)' : '') : ''), p.status""")
open(out, 'w', encoding='utf-8').write(s)
