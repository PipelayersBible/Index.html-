import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)
rep("""  async function pbRawGet(key) { try { return localStorage.getItem(key); } catch(e){ return null; } }
  async function pbRawSet(key, val) { try { localStorage.setItem(key, val); return true; } catch(e){ return false; } }
  async function pbRawDelete(key) { try { localStorage.removeItem(key); return true; } catch(e){ return false; } }
""", """  async function pbRawGet(key) { if (pbBigKey(key)) { try { return await pbBigGet(key); } catch (e) { return null; } } try { return localStorage.getItem(key); } catch(e){ return null; } }
  async function pbRawSet(key, val) { if (pbBigKey(key)) return pbBigSet(key, val); try { localStorage.setItem(key, val); return true; } catch(e){ return false; } }
  async function pbRawDelete(key) { if (pbBigKey(key)) return pbBigDelete(key); try { localStorage.removeItem(key); return true; } catch(e){ return false; } }
  // r16.47: Records (runs with their photos, permits, reports) outgrew localStorage (about 5 MB on an iPhone).
  // An account's runArchive lives in IndexedDB (far more room); a tiny marker key "<key>@idb" says it moved.
  // No marker: still in localStorage (read as before; the next save moves it). IndexedDB unavailable: as before.
  const pbBigKey = (key) => /(^|:)runArchive$/.test(String(key || ''));
  let pbBigDbP = null;
  function pbBigDb() {
    return pbBigDbP || (pbBigDbP = new Promise((ok, no) => {
      try { const r = indexedDB.open('pb-big', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('kv'); } catch (e) {} }; r.onsuccess = () => { const d = r.result; d.onversionchange = () => { try { d.close(); } catch (e) {} pbBigDbP = null; }; ok(d); }; r.onerror = () => no(r.error); r.onblocked = () => no(new Error('blocked')); } catch (e) { no(e); }
    }).catch(e => { pbBigDbP = null; throw e; }));
  }
  async function pbBigTx(mode, fn) { const d = await pbBigDb(); return new Promise((ok, no) => { let r; try { const t = d.transaction('kv', mode); r = fn(t.objectStore('kv')); t.oncomplete = () => ok(r ? r.result : undefined); t.onerror = () => no(t.error); t.onabort = () => no(t.error || new Error('abort')); } catch (e) { no(e); } }); }
  const pbBigMark = (key) => key + '@idb';
  async function pbBigGet(key) { // throws when the moved value can't be read (a critical read must not see "no records")
    let moved = false; try { moved = localStorage.getItem(pbBigMark(key)) === '1'; } catch (e) {}
    if (!moved) return localStorage.getItem(key);
    const v = await pbBigTx('readonly', st => st.get(key));
    if (typeof v === 'string') return v;
    const old = localStorage.getItem(key); return old; // marker but nothing there: the localStorage copy, if any
  }
  async function pbBigSet(key, val) {
    try { await pbBigTx('readwrite', st => st.put(val, key)); }
    catch (e) { // no IndexedDB: localStorage, as before
      try { localStorage.setItem(key, val); } catch (x) { return false; }
      try { localStorage.removeItem(pbBigMark(key)); } catch (x) {}
      return true;
    }
    try { localStorage.setItem(pbBigMark(key), '1'); }
    catch (e) { try { localStorage.removeItem(key); localStorage.setItem(pbBigMark(key), '1'); } catch (x) { return false; } } // full: the old copy's room takes the marker
    try { localStorage.removeItem(key); } catch (e) {}
    return true;
  }
  async function pbBigDelete(key) {
    let ok = true;
    try { await pbBigTx('readwrite', st => st.delete(key)); } catch (e) { try { ok = localStorage.getItem(pbBigMark(key)) !== '1'; } catch (x) {} }
    try { localStorage.removeItem(key); localStorage.removeItem(pbBigMark(key)); } catch (e) { ok = false; }
    return ok;
  }
""")
rep("""  async function pbGetCriticalFor(uid, key) {
    return localStorage.getItem(uid + ':' + key);
  }
  async function pbGetCritical(key) {
    const uid = await pbResolveStorageUserId();
    return localStorage.getItem(uid + ':' + key);
  }""", """  async function pbGetCriticalFor(uid, key) {
    if (pbBigKey(key)) return pbBigGet(uid + ':' + key);
    return localStorage.getItem(uid + ':' + key);
  }
  async function pbGetCritical(key) {
    const uid = await pbResolveStorageUserId();
    if (pbBigKey(key)) return pbBigGet(uid + ':' + key);
    return localStorage.getItem(uid + ':' + key);
  }""")
rep("""if (/:(runArchive|activeConfinedSession)$/.test(k) && (localStorage.getItem(k) || '').length > 2) { has = true; break; }""",
    """if ((/:(runArchive|activeConfinedSession)$/.test(k) && (localStorage.getItem(k) || '').length > 2) || /:runArchive@idb$/.test(k)) { has = true; break; }""")
open(out, 'w', encoding='utf-8').write(s)
