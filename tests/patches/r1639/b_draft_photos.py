import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# wording: run drafts now keep photos
rep("const PB_DRAFT_PHOTO_NOTE = 'Photos are not kept in drafts.';", "const PB_DRAFT_PHOTO_NOTE = 'Photos are not kept in drafts.'; // permit drafts; run drafts keep their point photos (pbRdPh)")
rep("and stays in your drafts on Home and Run Setup. ' + PB_DRAFT_PHOTO_NOTE;", "and stays in your drafts on Home and Run Setup.';")
rep("return 'This run is not locked. Its draft is being saved on this phone \\u2014 wait a moment. ' + PB_DRAFT_PHOTO_NOTE;", "return 'This run is not locked. Its draft is being saved on this phone \\u2014 wait a moment.';")
rep("(pbRunFormPhotos().length ? PB_DRAFT_PHOTO_NOTE : '') + '</span>'", "'</span>'")
rep("' (the most: ' + PB_DRAFT_CAP + ')' : '') + '. ' + PB_DRAFT_PHOTO_NOTE) + '</span>'", "' (the most: ' + PB_DRAFT_CAP + ')' : '') + '.') + '</span>'")
rep("Drafts are kept on this phone for this account. ' + PB_DRAFT_PHOTO_NOTE + '</p>'", "Drafts are kept on this phone for this account. Permit drafts don\\u2019t keep photos.</p>'")
rep("' on the form and ' + (n.photos > 1 ? 'are' : 'is') + ' not in the draft — add ' + (n.photos > 1 ? 'them' : 'it') + ' again.' : '')",
    "' on the form and ' + (n.photos > 1 ? 'are' : 'is') + ' not in the draft — add ' + (n.photos > 1 ? 'them' : 'it') + ' again.' : '') + (n.photosBack ? ' Its ' + n.photosBack + ' photo' + (n.photosBack > 1 ? 's are' : ' is') + ' back.' : '')")
# snapshot: the photos change the draft (so it is saved again)
rep("rs: window._pbResumingFromEntryId ? { from: window._pbResumingFromEntryId } : undefined }; /* feat_r1612 (B10): the run this form continues */",
    "rs: window._pbResumingFromEntryId ? { from: window._pbResumingFromEntryId } : undefined, /* feat_r1612 (B10): the run this form continues */\n      phs: pbRdPhSig(pbRdFormPhotos()) || undefined };")
# save photos with each draft write
rep("""    pbRd.lastJson = core; snap.savedAt = Date.now(); snap.id = pbRd.formId;
    pbRd.write(a, snap);
  }""", """    pbRd.lastJson = core; snap.savedAt = Date.now(); snap.id = pbRd.formId;
    pbRd.write(a, snap);
    pbRdPhSave(a, snap.id);
  }
  // r16.38: a run draft keeps its point photos, on this phone, in IndexedDB (too big for the draft list in localStorage).
  const pbRdPh = (() => {
    let dbp = null;
    const db = () => dbp || (dbp = new Promise((ok, no) => { try { const r = indexedDB.open('pb-draft-photos', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('p'); } catch (e) {} }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } }).catch(e => { dbp = null; throw e; }));
    const tx = async (mode, fn) => { const d = await db(); return new Promise((ok, no) => { const t = d.transaction('p', mode); const r = fn(t.objectStore('p')); t.oncomplete = () => ok(r ? r.result : undefined); t.onerror = () => no(t.error); t.onabort = () => no(t.error); }); };
    return { put: (k, v) => tx('readwrite', st => st.put(v, k)), get: (k) => tx('readonly', st => st.get(k)), del: (k) => tx('readwrite', st => st.delete(k)) };
  })();
  const pbRdPhLast = {}; // key -> signature last saved
  function pbRdFormPhotos() {
    const out = {};
    pbRunFormPhotos().forEach(([k, l]) => { const keep = l.filter(ph => ph && ph.url && !ph.displayOnly).map(ph => ({ url: ph.url, name: ph.name || '', captureId: ph.captureId || '' })); if (keep.length) out[k] = keep; });
    return out;
  }
  function pbRdPhSig(m) { return Object.keys(m).sort().map(k => k + ':' + m[k].map(x => x.captureId || x.url.length + '/' + x.url.slice(-24)).join(',')).join(';'); }
  function pbRdPhSave(uid, id) {
    const m = pbRdFormPhotos(), sig = pbRdPhSig(m), key = uid + ':' + id;
    if (pbRdPhLast[key] === sig) return;
    pbRdPhLast[key] = sig;
    (sig ? pbRdPh.put(key, { photos: m, savedAt: Date.now() }) : pbRdPh.del(key)).catch(e => { delete pbRdPhLast[key]; console.error('Draft photos not saved:', e); });
  }
  { const rm = pbRd.remove; pbRd.remove = (uid, id) => { rm(uid, id); const key = uid + ':' + id; delete pbRdPhLast[key]; pbRdPh.del(key).catch(() => {}); }; }""")
# pbRdApply returns its hub id map
rep("""    steps.push(() => scheduleHiCascade());
    steps.forEach(f => { try { f(); } catch (e) { console.error('Draft restore step failed:', e); } });
  }
  // The form holds typed work that is NOT kept as a draft""", """    steps.push(() => scheduleHiCascade());
    steps.forEach(f => { try { f(); } catch (e) { console.error('Draft restore step failed:', e); } });
    return map;
  }
  // The form holds typed work that is NOT kept as a draft""")
rep("""    try { pbRdApply(d, !!rsE); } catch (e) { ok = false; console.error('Run draft restore failed:', e); } finally { pbRd.restoring = false; }""",
    """    let rdMap = {};
    try { rdMap = pbRdApply(d, !!rsE) || {}; } catch (e) { ok = false; console.error('Run draft restore failed:', e); } finally { pbRd.restoring = false; }
    const rdGen = pbFormGen;
    pbRdPh.get(a + ':' + id).then(v => {
      if (!v || !v.photos || pbRd.formId !== id || pbRd.formUid !== a || pbFormGen !== rdGen) return;
      let back = 0;
      Object.keys(v.photos).forEach(old => {
        const p = rdMap[old] || old; if (!document.getElementById(p + 'PhotoList')) return;
        const cur = window._pbPhotos[p] = window._pbPhotos[p] || [];
        (v.photos[old] || []).forEach(ph => { if (ph && ph.url && !cur.some(c => c.url === ph.url)) { cur.push({ url: ph.url, name: ph.name || '', captureId: ph.captureId || ('cap-' + Date.now().toString(36) + '-d' + (++back)) }); back++; } });
        renderPhotoList(p);
      });
      if (back && pbRd.note) { pbRd.note.photos = 0; pbRd.note.photosBack = Object.keys(v.photos).reduce((t, k) => t + (v.photos[k] || []).length, 0); }
      pbRdRefresh(); pbRdSchedule();
    }).catch(e => console.error('Draft photos not read:', e));""")
open(out, 'w', encoding='utf-8').write(s)
