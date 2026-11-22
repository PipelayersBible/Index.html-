# C-1: the job follows you. A run that is open on Results (just locked, resumed, or continued) makes its job the phone's
# Current job, so it stays after End Run (Home no longer drops to "None chosen") and every form that already starts on the
# Current job (Daily report, Add note, Entry Permit, Field ticket, Locates, Job book) opens on it. Two forms that ignored
# it now start on it too: Log Work Without a Run (a new, empty form only; a kept draft or an edit keeps its own job) and
# Plans (the job number box, only when empty). An ended run seen again from Records changes nothing. Nothing the person
# typed is replaced. The person can still change or clear the Current job on Home.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
# 1. the run on Results sets the Current job (inside the feat_curjob block, next to its other exports)
p.rep("""    window.__pbCurJob = () => ({ v: pbCj.v, jobs: pbCj.jobs });
  }""",
"""    window.__pbCurJob = () => ({ v: pbCj.v, jobs: pbCj.jobs });
    // design C-1: an open run's job becomes the Current job (once per run and job; never an ended run's)
    let pbCjRunSeen = '';
    function pbCjFromRun() {
      let e = null; try { e = getCurrentArchiveEntry(); } catch (x) { e = null; }
      if (!e || e.kind !== 'run' || pbRunEnded(e)) return;
      const n = String(e.jobNumber || '').trim(); if (!n) return;
      const k = String(e.id) + '|' + n.toLowerCase(); if (k === pbCjRunSeen) return; pbCjRunSeen = k;
      const cur = window.pbCurJobGet();
      if (cur && cur.job_number.toLowerCase() === n.toLowerCase()) return;
      cjSet({ job_number: n.slice(0, 60), name: String(e.jobsite || '').trim().slice(0, 200) }).catch(() => {});
    }
    window.pbScreenHooks.push((name) => { if (name === 'results') { try { pbCjFromRun(); } catch (x) {} } });
    window.pbAccountLoadHooks.push(() => { pbCjRunSeen = ''; });
    // design C-1: Plans opens with the Current job in its job number box (when the box is empty)
    window.pbScreenHooks.push((name) => {
      if (name !== 'plans') return;
      setTimeout(() => { try { const ji = document.getElementById('plansJobIn'), v = window.pbCurJobGet(); if (ji && v && !String(ji.value || '').trim() && document.activeElement !== ji) ji.value = v.job_number; } catch (x) {} }, 0);
    });
  }""")
# 2. Log Work Without a Run: a new form starts on the Current job
p.rep("""    const jobs = pbNrJobs(uid); if (last) { f.job = last.jobNumber; } else if (jobs[0]) f.job = jobs[0].n;""",
"""    const jobs = pbNrJobs(uid), cjNow = typeof window.pbCurJobGet === 'function' ? window.pbCurJobGet() : null; /* design C-1 */
    if (cjNow && cjNow.job_number) { f.job = cjNow.job_number; if (cjNow.name) f.jobsite = cjNow.name; } else if (last) { f.job = last.jobNumber; } else if (jobs[0]) f.job = jobs[0].n;""")
p.save()
