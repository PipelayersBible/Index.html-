import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# office2 01: Job details saved from a stale copy put back another manager's name / City, State (pb_prod_job_info_set has
# no version and writes all three fields). The form remembers what it opened with; Save reads the job's details as the
# server has them now: an untouched field takes the server's value, a field both changed differently stops the save.
rep("""  window.pbCxInfoForm = function(v, err) {
    const job = pbPj.job; if (!job) return;
    const dj = pbCxKnownJob(job.job_number) || {};
    v = v || { name: dj.project_name || '', addr: dj.address || '', start: dj.start_date ? String(dj.start_date).slice(0, 10) : '' };""",
"""  let pbCxInfoBase = null; /* office2 01: what the form opened with */
  window.pbCxInfoForm = function(v, err) {
    const job = pbPj.job; if (!job) return;
    const dj = pbCxKnownJob(job.job_number) || {};
    if (!v) pbCxInfoBase = { key: job.job_key, name: String(dj.project_name || '').trim(), addr: String(dj.address || '').trim(), start: dj.start_date ? String(dj.start_date).slice(0, 10) : '' };
    v = v || { name: dj.project_name || '', addr: dj.address || '', start: dj.start_date ? String(dj.start_date).slice(0, 10) : '' };""")
rep("""    if (!(sbClient && typeof sbClient.rpc === 'function' && sbUser && sbUser.id === uid && (await pbLiveSessionIs(uid)))) return again('Sign in with signal to change the job details.');
    const r = await pbPermitRpc('pb_prod_job_info_set',""",
"""    if (!(sbClient && typeof sbClient.rpc === 'function' && sbUser && sbUser.id === uid && (await pbLiveSessionIs(uid)))) return again('Sign in with signal to change the job details.');
    { const B = pbCxInfoBase && pbCxInfoBase.key === job.job_key ? pbCxInfoBase : null; /* office2 01: another manager may have changed them since this copy loaded */
      const fr = B ? await pbPermitRpc('pb_prod_company_dashboard', { p_today: pbTkToday() }, 30000) : null;
      if (!sbUser || sbUser.id !== uid || !pbPj.job || pbPj.job.job_key !== job.job_key) return;
      const fj = fr && !fr.error && fr.data && Array.isArray(fr.data.jobs) ? fr.data.jobs.find(j => j && j.job_key === job.job_key) : null;
      if (B && fj) {
        const now = { name: String(fj.project_name || '').trim(), addr: String(fj.address || '').trim(), start: fj.start_date ? String(fj.start_date).slice(0, 10) : '' };
        const lbl = { name: 'the job name', addr: 'the City, State', start: 'the start date' }, clash = [];
        ['name', 'addr', 'start'].forEach(k => { if (now[k] !== B[k]) { if (v[k] === B[k]) v[k] = now[k]; else if (v[k] !== now[k]) clash.push(k); } });
        const dj0 = pbCxKnownJob(job.job_number); if (dj0) Object.assign(dj0, { project_name: now.name || null, address: now.addr || null, start_date: now.start || null });
        pbCxInfoBase = Object.assign({ key: job.job_key }, now);
        if (clash.length) return window.pbCxInfoForm(v, 'Someone else changed ' + clash.map(k => lbl[k] + ' meanwhile (now “' + (now[k] || 'empty') + '”)').join(' and ') + '. Check it, then Save again.');
      } }
    const r = await pbPermitRpc('pb_prod_job_info_set',""")
open(out, 'w', encoding='utf-8').write(s)
