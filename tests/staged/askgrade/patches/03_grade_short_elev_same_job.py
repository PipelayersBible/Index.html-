import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# Decision #42 (Nov 18): the short-elevation helper (98.68 -> 2598.68) borrows leading digits only from the same job.
# It fell back to "this phone's last" full elevation from ANY job, so the first short elevation on a new job (97.27 on a
# job at 1097 ft) could pick up the last job's thousands (2597.27). The reference is now: the latest full elevation typed
# on this run form (while the job is unchanged), else this run's own boxes, else the last one on this job. No job number
# or jobsite on the form, and nothing on this run: nothing is borrowed (the number stays as typed).
rep("""    pbSeLast = { v, gen: window._pbPhotoContextGen };""",
    """    pbSeLast = { v, gen: window._pbPhotoContextGen, job: pbSeJob() }; // #42: and the job it was typed on""")
rep("""    if (pbSeLast && pbSeLast.gen === window._pbPhotoContextGen && pbSeOk(pbSeLast.v)) return pbSeLast.v;""",
    """    if (pbSeLast && pbSeLast.gen === window._pbPhotoContextGen && pbSeLast.job === pbSeJob() && pbSeOk(pbSeLast.v)) return pbSeLast.v; // #42: not after the job was changed""")
rep("""    if (j && o.jobs && pbSeOk(o.jobs[j])) return o.jobs[j];
    return pbSeOk(o.phone) ? o.phone : null;""",
    """    if (j && o.jobs && pbSeOk(o.jobs[j])) return o.jobs[j];
    return null; // #42: never another job's (the phone's last elevation from any job is no longer used)""")
rep("""  // 2598.68 and 01.20 -> 2601.20). Reference: the latest full elevation on this run, else the job's last, else this
  // phone's last.""",
    """  // 2598.68 and 01.20 -> 2601.20). Reference: the latest full elevation on this run, else the job's last (#42: never
  // another job's; the phone's last from any job is not used).""")
open(out, "w", encoding="utf-8").write(s)
