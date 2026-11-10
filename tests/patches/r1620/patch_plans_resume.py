import sys
s = open(sys.argv[1]).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80]); s = s.replace(a, b)
# 1. sendOne takes the job explicitly
rep("async function pbPlansSendOne(file, pre) {", "async function pbPlansSendOne(file, pre, job) {")
rep("const b = await pbDocsRpc('pb_plans_begin', { p_job: pbPlans.job, p_title: title, p_pages: n, p_sha256: sha }, 'Couldn’t add it.');",
    "const b = await pbDocsRpc('pb_plans_begin', { p_job: job, p_title: title, p_pages: n, p_sha256: sha }, 'Couldn’t add it.');")
rep("const r = await pbPlansSendOne(pdfs[k], pdfs.length > 1 ? 'Set ' + (k + 1) + ' of ' + pdfs.length + ' · ' : '');",
    "const r = await pbPlansSendOne(pdfs[k], pdfs.length > 1 ? 'Set ' + (k + 1) + ' of ' + pdfs.length + ' · ' : '', pbPlans.job);\n"
    "        if (!r.stop || !r.net) await pbPlansQDel(qids[k]); // r16.20: done with it (sent, already there, a report, or refused)")
# queue the picks before sending
rep("    const reports = [], sent = [], already = []; let stop = '';\n    try {\n      for (let k = 0; k < pdfs.length && !stop; k++) {",
    "    const reports = [], sent = [], already = []; let stop = '';\n"
    "    const qids = []; for (const f of pdfs) qids.push(await pbPlansQAdd(f, pbPlans.job)); // r16.20: kept on the phone until sent\n"
    "    try {\n      for (let k = 0; k < pdfs.length && !stop; k++) {")
# network-type stops are marked so the queue keeps them
rep("return { stop: navigator.onLine === false ? 'No signal. Add the same file again to carry on.' : 'Sheet ' + p + ' didn’t send. Add the same file again to carry on.' };",
    "return { net: true, stop: navigator.onLine === false ? 'No signal. It carries on by itself when you’re back online.' : 'Sheet ' + p + ' didn’t send. It tries again by itself.' };")
rep("if (!r.ok) return { stop: r.line + ' Add the same file again to carry on.' };",
    "if (!r.ok) return { net: true, stop: r.line + ' It tries again by itself.' };")
# 2. the sending line says to keep the app open; list line fix (my_sets has no counts)
rep("    if (x.state === 'uploading') return 'Sending · ' + up + ' of ' + n;",
    "    if (x.state === 'uploading') return typeof up === 'number' ? 'Sending · ' + up + ' of ' + n : 'Sending'; // r16.20: the all-jobs list has no counts")
# 3. the queue + resume
rep("  // r16.18: hand a report to Documents, with this job picked",
r'''  // r16.20 (Tommy, Nov 10): an upload stopped by closing the app (or losing signal) finishes by itself the next time the
  // app is open: each picked PDF is kept on this phone (IndexedDB) until its sheets are all sent, then deleted.
  function pbPlansQDb() {
    return new Promise((ok) => {
      try { const req = indexedDB.open('pb-plans-q', 1); req.onupgradeneeded = () => { try { req.result.createObjectStore('q', { keyPath: 'id' }); } catch (e) {} }; req.onsuccess = () => ok(req.result); req.onerror = () => ok(null); } catch (e) { ok(null); }
    });
  }
  async function pbPlansQAdd(file, job) {
    const id = 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try { const db = await pbPlansQDb(); if (!db) return id; await new Promise((ok) => { const t = db.transaction('q', 'readwrite'); t.objectStore('q').put({ id, uid: pbArchiveOwnerUid, job, name: file.name, type: file.type || 'application/pdf', blob: file, at: Date.now() }); t.oncomplete = ok; t.onerror = ok; t.onabort = ok; }); db.close(); } catch (e) {}
    return id;
  }
  async function pbPlansQDel(id) {
    try { const db = await pbPlansQDb(); if (!db) return; await new Promise((ok) => { const t = db.transaction('q', 'readwrite'); t.objectStore('q').delete(id); t.oncomplete = ok; t.onerror = ok; t.onabort = ok; }); db.close(); } catch (e) {}
  }
  async function pbPlansQList(uid) {
    try { const db = await pbPlansQDb(); if (!db) return []; const all = await new Promise((ok) => { const r = db.transaction('q', 'readonly').objectStore('q').getAll(); r.onsuccess = () => ok(r.result || []); r.onerror = () => ok([]); }); db.close();
      return all.filter((x) => x && x.uid === uid).sort((a, b) => a.at - b.at); } catch (e) { return []; }
  }
  let pbPlansResumeAt = 0;
  async function pbPlansResume() {
    const uid = pbArchiveOwnerUid;
    if (!uid || uid === 'shared' || pbPlans.busy || navigator.onLine === false || !sbUser || sbUser.id !== uid || Date.now() - pbPlansResumeAt < 20000) return;
    pbPlansResumeAt = Date.now();
    const q = await pbPlansQList(uid); if (!q.length || pbPlans.busy) return;
    if (!(await pbEnsurePdfjs())) return;
    pbPlans.busy = true; pbPlansRender(); pbPlansSay('');
    let wake = null; try { wake = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch (e) { wake = null; }
    let done = 0, line = '';
    try {
      for (let k = 0; k < q.length; k++) {
        const e = q[k]; if (!sbUser || sbUser.id !== uid) break;
        const file = e.blob instanceof Blob ? new File([e.blob], e.name || 'Plans.pdf', { type: e.type || 'application/pdf' }) : null;
        if (!file) { await pbPlansQDel(e.id); continue; }
        const r = await pbPlansSendOne(file, 'Finishing ' + String(e.name || 'plans').replace(/\.pdf$/i, '') + ' · ', e.job);
        if (r.stop && r.net) { line = r.stop; break; }
        await pbPlansQDel(e.id);
        if (r.sent) done++;
        if (r.stop) line = r.stop;
      }
    } finally {
      try { if (wake) wake.release(); } catch (e) {}
      pbPlans.busy = false; pbPlansWait(''); pbPlansRender(); pbPlansLoad(true);
    }
    pbPlansSay(line || (done ? (done > 1 ? done + ' plan sets finished sending.' : 'Finished sending the plan set.') : ''));
  }
  window.pbAccountLoadHooks.push(() => setTimeout(pbPlansResume, 6000));
  window.addEventListener('online', () => setTimeout(pbPlansResume, 3000));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(pbPlansResume, 2000); });
  // r16.18: hand a report to Documents, with this job picked''')
# 4. the wait line while sending tells them to keep the app open
rep("        pbPlansWait(pre + 'Sending sheet ' + p + ' of ' + n + '…');",
    "        pbPlansWait(pre + 'Sending sheet ' + p + ' of ' + n + '… Keep the app open.');")
open(sys.argv[2], 'w').write(s); print('ok')
