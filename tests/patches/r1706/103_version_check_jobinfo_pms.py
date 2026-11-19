#!/usr/bin/env python3
# office3 #32: the app side of the server version check (sql/32_version_check.sql).
# Job details: Save reads the job's details and their version (pb_prod_job_info_get), merges as office2 01 did (a field
# this manager didn't touch takes the server's value; a field both changed differently stops with "Someone else changed
# ..."), then saves with p_expect_ver. If another manager saved in between, the server refuses (pb:changed) and sends
# what it has now: the app merges once more and saves again, or shows the clash. An older server (no _get): the old way.
# PMs & supers: the same with pb_job_pms_get's 'ver' and pb_job_pms_set(..., p_expect_ver). On pb:changed the list as it
# is now comes back with the refusal: this manager's own ticks are applied to it and it is saved once more.
# Shared code touched: pbCxInfoSave (job details save), pbPmJobSave (PMs & supers save). Nothing else.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# ---------- Job details ----------
rep("""    { const B = pbCxInfoBase && pbCxInfoBase.key === job.job_key ? pbCxInfoBase : null; /* office2 01: another manager may have changed them since this copy loaded */
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
    const r = await pbPermitRpc('pb_prod_job_info_set', { p_job_number: job.job_number, p_project_name: v.name || null, p_address: v.addr || null, p_start_date: v.start || null, p_expect_uid: uid }, 30000);
    if (!sbUser || sbUser.id !== uid || !pbPj.job || pbPj.job.job_key !== job.job_key) return;""",
"""    const same = () => !!sbUser && sbUser.id === uid && !!pbPj.job && pbPj.job.job_key === job.job_key;
    const lbl = { name: 'the job name', addr: 'the City, State', start: 'the start date' };
    const norm = (x) => ({ name: String(x.project_name || '').trim(), addr: String(x.address || '').trim(), start: x.start_date ? String(x.start_date).slice(0, 10) : '' });
    const merge = (now) => { /* office2 01: a field this manager didn't touch takes the server's value */
      const B = pbCxInfoBase && pbCxInfoBase.key === job.job_key ? pbCxInfoBase : null, clash = [];
      if (B) ['name', 'addr', 'start'].forEach(k => { if (now[k] !== B[k]) { if (v[k] === B[k]) v[k] = now[k]; else if (v[k] !== now[k]) clash.push(k); } });
      const dj0 = pbCxKnownJob(job.job_number); if (dj0) Object.assign(dj0, { project_name: now.name || null, address: now.addr || null, start_date: now.start || null });
      pbCxInfoBase = Object.assign({ key: job.job_key }, now);
      return clash.length ? 'Someone else changed ' + clash.map(k => lbl[k] + ' meanwhile (now “' + (now[k] || 'empty') + '”)').join(' and ') + '. Check it, then Save again.' : '';
    };
    /* office3 #32: the server's details and their version, read right before the save; the save names that version */
    let ver = null;
    { const g = await pbPermitRpc('pb_prod_job_info_get', { p_job_number: job.job_number }, 30000);
      if (!same()) return;
      let now = null;
      if (g && !g.error && g.data && g.data.ok === true) { now = norm(g.data); ver = Number(g.data.info_ver) || 0; }
      else if (pbCxInfoBase && pbCxInfoBase.key === job.job_key) { // an older server: the dashboard's copy (office2 01)
        const fr = await pbPermitRpc('pb_prod_company_dashboard', { p_today: pbTkToday() }, 30000);
        if (!same()) return;
        const fj = fr && !fr.error && fr.data && Array.isArray(fr.data.jobs) ? fr.data.jobs.find(j => j && j.job_key === job.job_key) : null;
        if (fj) now = norm(fj);
      }
      if (now) { const t = merge(now); if (t) return window.pbCxInfoForm(v, t); } }
    const infoArgs = () => Object.assign({ p_job_number: job.job_number, p_project_name: v.name || null, p_address: v.addr || null, p_start_date: v.start || null, p_expect_uid: uid }, ver !== null ? { p_expect_ver: ver } : {});
    let r = await pbPermitRpc('pb_prod_job_info_set', infoArgs(), 30000);
    if (!same()) return;
    if (r && !r.error && r.data && r.data.ok === false && r.data.code === 'pb:changed' && r.data.now) { // office3 #32: another manager saved between the read and this save
      const t = merge(norm(r.data.now)); if (t) return window.pbCxInfoForm(v, t);
      ver = Number(r.data.now.info_ver) || 0;
      r = await pbPermitRpc('pb_prod_job_info_set', infoArgs(), 30000);
      if (!same()) return;
    }
    if (r && !r.error && r.data && r.data.ok === false && r.data.code === 'pb:changed') return again('Someone else is changing the job details right now. Check them, then Save again.');""")

# ---------- PMs & supers ----------
rep("""    let kept = []; /* office2 02: another manager may have changed the list since this page loaded it */
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
      r = await pbPermitRpc('pb_job_pms_set', { p_job_number: job.job_number, p_user_ids: ids, p_expect_uid: uid }, 30000); } finally { if (pbPj.job === job) pbPj.pmBusy = false; }""",
"""    let kept = []; /* office2 02: another manager may have changed the list since this page loaded it */
    const base = pbPj.pmBase instanceof Set ? pbPj.pmBase : null, mineIds = ids.slice();
    const apply = (state) => { // this manager's own ticks (who they put on, who they took off) applied to the list as it is now
      const now = state.assigned.filter(x => x && x.user_id && x.current !== false), mine = new Set(mineIds);
      const added = mineIds.filter(id => !base.has(id)), removed = [...base].filter(id => !mine.has(id));
      const fin = new Set(now.map(x => x.user_id).filter(id => !removed.includes(id))); added.forEach(id => fin.add(id));
      kept = now.filter(x => !base.has(x.user_id) && !removed.includes(x.user_id)).map(pbPmName);
      ids.length = 0; fin.forEach(id => ids.push(id));
      return ids.length <= 10;
    };
    const tooMany = (state) => { pbPj.pms = Object.assign({}, pbPj.pms, state); pbPj.pmMsg = 'Up to 10 PMs and supers per job (someone else added some meanwhile). Nothing was changed.'; pbPmJobPaint(); };
    let r, ver = null; try {
      const g = await pbPermitRpc('pb_job_pms_get', { p_job_number: job.job_number }, 30000);
      if (pbPj.job === job && g && !g.error && g.data && g.data.ok === true && Array.isArray(g.data.assigned)) {
        if (typeof g.data.ver === 'number') ver = g.data.ver; /* office3 #32: the server's version of the list this save is made on */
        if (base && !apply(g.data)) { pbPj.pmBusy = false; tooMany(g.data); return; }
      }
      if (pbPj.job !== job) return;
      const setArgs = () => Object.assign({ p_job_number: job.job_number, p_user_ids: ids, p_expect_uid: uid }, ver !== null ? { p_expect_ver: ver } : {});
      r = await pbPermitRpc('pb_job_pms_set', setArgs(), 30000);
      if (pbPj.job === job && r && !r.error && r.data && r.data.ok === false && r.data.code === 'pb:changed' && Array.isArray(r.data.assigned) && typeof r.data.ver === 'number') {
        // office3 #32: another manager saved between the read and this save: the list as it is now came back with the refusal
        if (base && !apply(r.data)) { pbPj.pmBusy = false; tooMany(r.data); return; }
        ver = r.data.ver;
        r = await pbPermitRpc('pb_job_pms_set', setArgs(), 30000);
      } } finally { if (pbPj.job === job) pbPj.pmBusy = false; }""")

rep("""    pbPj.pmMsg = (d && d.code === 'pb:owner_only') ? 'Only the owner, a PM or a superintendent can take another PM or super off this job. Nothing was changed.'""",
"""    if (d && d.code === 'pb:changed' && Array.isArray(d.assigned)) { pbPj.pms = Object.assign({}, pbPj.pms, d); pbPj.pmEdit = new Set(pbPj.pms.assigned.filter(x => x && x.user_id && x.current !== false).map(x => x.user_id)); pbPj.pmBase = new Set(pbPj.pmEdit); pbPj.pmMsg = 'Someone else is changing the PMs and supers on this job right now. Nothing was changed. This is the list as it is now: tick your change again, then Save.'; pbPmJobPaint(); return; } /* office3 #32 */
    pbPj.pmMsg = (d && d.code === 'pb:owner_only') ? 'Only the owner, a PM or a superintendent can take another PM or super off this job. Nothing was changed.'""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
