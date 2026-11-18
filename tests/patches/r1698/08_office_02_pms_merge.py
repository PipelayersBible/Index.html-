import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# office2 02: pb_job_pms_set replaces the whole list. Save applies only this person's own ticks to the list as the server
# has it now, so a PM or super another manager added meanwhile is kept.
rep("""    pbPj.pmEdit = new Set(pbPj.pms.assigned.filter(x => x && x.user_id && x.current !== false).map(x => x.user_id)); pbPj.pmMsg = ''; pbPmJobPaint();""",
    """    pbPj.pmEdit = new Set(pbPj.pms.assigned.filter(x => x && x.user_id && x.current !== false).map(x => x.user_id)); pbPj.pmBase = new Set(pbPj.pmEdit); pbPj.pmMsg = ''; pbPmJobPaint(); /* office2 02: what the edit started from */""")
rep("""    pbPj.pmBusy = true; pbPmJobPaint();
    let r; try { r = await pbPermitRpc('pb_job_pms_set', { p_job_number: job.job_number, p_user_ids: ids, p_expect_uid: uid }, 30000); } finally { if (pbPj.job === job) pbPj.pmBusy = false; }""",
    """    pbPj.pmBusy = true; pbPmJobPaint();
    let kept = []; /* office2 02: another manager may have changed the list since this page loaded it */
    let r; try {
      const base = pbPj.pmBase instanceof Set ? pbPj.pmBase : null;
      const g = base ? await pbPermitRpc('pb_job_pms_get', { p_job_number: job.job_number }, 30000) : null;
      if (pbPj.job === job && g && !g.error && g.data && g.data.ok === true && Array.isArray(g.data.assigned)) {
        const now = g.data.assigned.filter(x => x && x.user_id && x.current !== false), mine = new Set(ids);
        const added = ids.filter(id => !base.has(id)), removed = [...base].filter(id => !mine.has(id));
        const fin = new Set(now.map(x => x.user_id).filter(id => !removed.includes(id))); added.forEach(id => fin.add(id));
        kept = now.filter(x => !base.has(x.user_id) && !removed.includes(x.user_id)).map(pbPmName);
        ids.length = 0; fin.forEach(id => ids.push(id));
        if (ids.length > 10) { pbPj.pmBusy = false; pbPj.pms = Object.assign({}, pbPj.pms, g.data); pbPj.pmMsg = 'Up to 10 PMs and supers per job (someone else added some meanwhile). Nothing was changed.'; pbPmJobPaint(); return; }
      }
      if (pbPj.job !== job) return;
      r = await pbPermitRpc('pb_job_pms_set', { p_job_number: job.job_number, p_user_ids: ids, p_expect_uid: uid }, 30000); } finally { if (pbPj.job === job) pbPj.pmBusy = false; }""")
rep("""      pbPj.pms = Object.assign({}, pbPj.pms, d); pbPj.pmEdit = null;
      pbPj.pmMsg = d.assigned.length ? 'Saved. ' + pbPmCountTxt(d.assigned) + ' on this job.' : 'Saved. No PM or super on this job: alerts go to every PM and super in the company.' /* feat_office B1 */;""",
    """      pbPj.pms = Object.assign({}, pbPj.pms, d); pbPj.pmEdit = null; pbPj.pmBase = null;
      pbPj.pmMsg = (d.assigned.length ? 'Saved. ' + pbPmCountTxt(d.assigned) + ' on this job.' : 'Saved. No PM or super on this job: alerts go to every PM and super in the company.' /* feat_office B1 */)
        + (kept.length ? ' ' + kept.join(', ') + (kept.length === 1 ? ' was' : ' were') + ' added by someone else meanwhile and ' + (kept.length === 1 ? 'is' : 'are') + ' kept.' : ''); /* office2 02 */""")
open(out, 'w', encoding='utf-8').write(s)
