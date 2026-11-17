import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(a[:80],s.count(a)); s=s.replace(a,b)
# 1) the office copy keeps a list of where each photo was (path in the record, its SHA-256 and its file in run-photos)
rep("""  function pbRrOfficeCopy(e) {
    let left = 0;
    const walk = (v) => {
      if (Array.isArray(v)) {
        const out = [];
        v.forEach(x => {
          if (pbRrIsBinary(x)) { left++; return; }
          if (x && typeof x === 'object' && !Array.isArray(x) && Object.values(x).some(pbRrIsBinary)) { left++; return; }
          out.push(walk(x));
        });
        return out;
      }
      if (v && typeof v === 'object') {
        const o = {};
        Object.keys(v).forEach(k => {
          const x = v[k];
          if (pbRrIsBinary(x)) { left++; o[k] = null; return; }""",
"""  function pbRrPhotoPath(uid, entryId, sha) { return uid + '/runs/' + String(entryId).replace(/[^A-Za-z0-9_.-]/g, '_') + '/' + sha + '.jpg'; } /* r16.75 */
  function pbRrOfficeCopy(e) {
    let left = 0; const refs = [], owner = pbArchiveOwnerUid; /* r16.75: where each photo was, so the office copy can put it back */
    const ref = (path, url, o) => { try { const sha = pbPhotoSha(url); refs.push(Object.assign({ p: path, sha, path: pbRrPhotoPath(owner, e.id, sha) }, o || {})); } catch (x) {} };
    const walk = (v, path) => {
      path = path || [];
      if (Array.isArray(v)) {
        const out = [];
        v.forEach((x, i) => {
          if (pbRrIsBinary(x)) { left++; ref(path.concat(i), x); return; }
          if (x && typeof x === 'object' && !Array.isArray(x) && Object.values(x).some(pbRrIsBinary)) { left++; const f = Object.keys(x).find(k => pbRrIsBinary(x[k])), o = {}; Object.keys(x).forEach(k => { if (!pbRrIsBinary(x[k])) o[k] = x[k]; }); ref(path.concat(i), x[f], { f, o }); return; }
          out.push(walk(x, path.concat(i)));
        });
        return out;
      }
      if (v && typeof v === 'object') {
        const o = {};
        Object.keys(v).forEach(k => {
          const x = v[k];
          if (pbRrIsBinary(x)) { left++; o[k] = null; ref(path.concat(k), x, { set: 1 }); return; }""")
rep("""          o[k] = walk(x);
        });
        return o;
      }
      return v;
    };
    const rec = walk(JSON.parse(JSON.stringify(e)));""","""          o[k] = walk(x, path.concat(k));
        });
        return o;
      }
      return v;
    };
    const rec = walk(JSON.parse(JSON.stringify(e)));""")
rep("""    rec.pbOffice = { laidFt, photosLeftOut: left, workDate: wd, send: !!(e.reportSendWanted && (e.completed || e.incomplete)) }; // r15.2: Send Report""",
"""    rec.pbOffice = { laidFt, photosLeftOut: left, workDate: wd, send: !!(e.reportSendWanted && (e.completed || e.incomplete)) }; // r15.2: Send Report
    if (refs.length && owner && owner !== 'shared') rec.pbOffice.photos = refs.slice(0, 200); /* r16.75: the photos themselves go to run-photos */""")
# 2) after a run is sent, its photos are uploaded (once each)
rep("""        if (!r.error && r.data && r.data.ok === true) { sent[t.id] = t.h;""",
"""        if (!r.error && r.data && r.data.ok === true) { try { if (await pbRrPhotosUp(uid, t)) again = true; } catch (x) { console.error('Run photo upload:', x); } /* r16.75 */ sent[t.id] = t.h;""")
rep("""  async function pbRrLoadSent(uid) {""",
"""  // r16.75 (Tommy): every photo in a run goes to the company with it (run-photos/<uid>/runs/<run>/<sha>.jpg), once each.
  async function pbRrPhotosUp(uid, t) {
    const list = (t.rec && t.rec.pbOffice && t.rec.pbOffice.photos) || []; if (!list.length || !sbClient || !sbClient.storage) return false;
    let done = {}; try { done = JSON.parse((await pbGetFor(uid, 'rrPhotosUp')) || '{}') || {}; } catch (x) { done = {}; }
    const urls = new Map(); const look = (v) => { if (pbRrIsBinary(v)) { try { urls.set(pbPhotoSha(v), v); } catch (x) {} return; } if (Array.isArray(v)) v.forEach(look); else if (v && typeof v === 'object') Object.keys(v).forEach(k => look(v[k])); };
    look(t.e);
    let n = 0, more = false;
    for (const ph of list) {
      if (done[ph.path]) continue;
      if (n >= 20) { more = true; break; }
      if (!sbUser || sbUser.id !== uid || navigator.onLine === false) return true;
      const url = urls.get(ph.sha); if (!url) continue;
      n++;
      try {
        const blob = await (await fetch(url)).blob();
        const { error } = await sbClient.storage.from('run-photos').upload(ph.path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
        if (!error || /exists|duplicate/i.test(String(error.message || error.error || ''))) done[ph.path] = Date.now();
        else { more = true; break; }
      } catch (x) { more = true; break; }
    }
    const ks = Object.keys(done); if (ks.length > 2000) ks.sort((a, b) => done[a] - done[b]).slice(0, ks.length - 2000).forEach(k => delete done[k]);
    await pbSetFor(uid, 'rrPhotosUp', JSON.stringify(done));
    return more;
  }
  // r16.75: an office copy's photos, put back where they were (for its PDF)
  async function pbRrPhotosIn(rec) {
    const list = rec && rec.pbOffice && Array.isArray(rec.pbOffice.photos) ? rec.pbOffice.photos : [];
    if (!list.length || !sbClient || !sbClient.storage) return rec;
    const c = JSON.parse(JSON.stringify(rec));
    const toUrl = (blob) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(blob); });
    const got = await Promise.all(list.map(async (ph) => { try { const { data } = await sbClient.storage.from('run-photos').download(ph.path); return data ? await toUrl(data) : null; } catch (x) { return null; } }));
    list.forEach((ph, i) => {
      const url = got[i]; if (!url || !Array.isArray(ph.p) || !ph.p.length) return;
      let at = c; for (let k = 0; k < ph.p.length - 1; k++) { at = at == null ? null : at[ph.p[k]]; } if (at == null) return;
      const last = ph.p[ph.p.length - 1], val = ph.f ? Object.assign({}, ph.o || {}, { [ph.f]: url }) : url;
      if (Array.isArray(at) && !ph.set) at.splice(Math.min(Number(last), at.length), 0, val); else at[last] = val;
    });
    return c;
  }
  window.pbRrPhotosIn = pbRrPhotosIn;
  async function pbRrLoadSent(uid) {""")
# 3) the office PDF puts the photos back first
rep("""  async function pbRrPdfDoc(e, say) {
    say = say || pbRptBusy;
    let doc;
    try {
      await say('Making the PDF…');""","""  async function pbRrPdfDoc(e, say) {
    say = say || pbRptBusy;
    let doc;
    try {
      await say('Making the PDF…');
      try { if (e && e.pbOffice && Array.isArray(e.pbOffice.photos) && e.pbOffice.photos.length && typeof window.pbRrPhotosIn === 'function') { await say('Making the PDF: getting ' + e.pbOffice.photos.length + ' photos…'); e = await window.pbRrPhotosIn(e); } } catch (x) { console.error('Run photos:', x); } /* r16.75 */""")
open(sys.argv[2],'w').write(s)
