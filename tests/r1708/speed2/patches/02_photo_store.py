#!/usr/bin/env python3
# speed2 #52 (Tommy, Nov 18: yes; was #18): photos stored apart from Records on the phone.
#
# Before: Records (runArchive) was ONE text in IndexedDB with every photo inside it as base64. Every save (each laid
# mark, note, Lock, End, sent flag) built the whole text again and wrote all of it: with a couple of busy weeks of
# photos that is tens of MB per laid mark (1-6 s frozen on a phone), and every start-up read it all.
#
# Now: each photo (any data: URL or bare base64 string of 2000+ characters anywhere in a record) is stored once in its
# own IndexedDB entry ('pb-photos' / 'ph', key = SHA-256 of the text, value {u, n, at}); the Records text holds
# "pbph:1:<sha256>" in its place. In memory nothing changes: every record still holds its photos as data URLs, so the
# ~70 places that read photos (reports, PDFs, export / zip, cloud upload, seal, crew send, restore) are untouched.
#  - Save: JSON.stringify with a replacer that writes the reference for a photo already stored and verified (a Map
#    from the photo text to its key; no copy of the photo text is made). New photos in the text (a few per save) are
#    stored first, read back and compared, then referenced; the Records text is written only after that. Every
#    reference a text carries is checked to exist (getAllKeys) and put back from memory if missing.
#  - Read: the start-up load resolves references in the parsed records (one read transaction); every other reader of
#    the stored text (conflict merge, account moves, office tools) gets the text with the photos put back, as before.
#    The photo store unreadable = the read fails (Records "Failed to Load", saving blocked): never "no photos".
#  - Migration of existing Records: in the background after start-up (one photo at a time), each photo stored, read
#    back and compared; then one ordinary save writes the short text (the old text stays until that atomic write);
#    then the written text is read back and checked against memory, and every reference against the store. Killed at
#    any point it starts again where it was (keys are content fingerprints, so a photo already there is reused).
#    Storage full: the photos it wrote this time are removed again (they'd squeeze the Records save) and it waits for
#    the next start. Any check failing: Records is written back whole, as before, and photos stay inline.
#  - Photos nothing refers to any more are removed at most once a day, under the Records save lock, only when every
#    Records text on the phone (all accounts, IndexedDB and localStorage) was read, and only after 24 h.
#  - Rolled back to an older build: it opens pb-big as before (separate database), sees references instead of
#    photos (shown as missing pictures) and keeps them as they are when it saves; nothing is lost.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# ---------- the store, the write path and the read path ----------
rep("""  const pbBigMark = (key) => key + '@idb';
  async function pbBigGet(key) { // throws when the moved value can't be read (a critical read must not see "no records")""",
"""  const pbBigMark = (key) => key + '@idb';
  // ---- speed2 #52: photos stored apart from the Records text ----
  const PB_PH_REF = 'pbph:1:', PB_PH_MIN = 2000;
  const PB_PH_REF_RE = /"pbph:1:([0-9a-f]{64})"/g, PB_PH_REF_ONE = /^pbph:1:([0-9a-f]{64})$/;
  const PB_PH_TXT_RE = /"((?:data:[A-Za-z0-9.+\\/;=-]{1,200},)?[A-Za-z0-9+\\/]{2000,}={0,2})"/g; // a photo inside JSON text (base64 never needs escaping); pattern only: each use makes its own RegExp
  const PB_PH_OK = /^(?:data:[A-Za-z0-9.+\\/-]{1,100}(?:;[A-Za-z0-9.=+-]{1,100})*;base64,)?[A-Za-z0-9+\\/]+={0,2}$/;
  const pbPhKnown = new Map(), pbPhById = new Map(); // photo text -> key, key -> photo text (stored AND read back equal)
  let pbPhDbP = null, pbPhOff = false, pbPhBudget = Infinity, pbPhLeft = 0, pbPhUsed = null;
  function pbPhDb() {
    return pbPhDbP || (pbPhDbP = new Promise((ok, no) => {
      try { const r = indexedDB.open('pb-photos', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('ph'); } catch (e) {} }; r.onsuccess = () => { const d = r.result; d.onversionchange = () => { try { d.close(); } catch (e) {} pbPhDbP = null; }; ok(d); }; r.onerror = () => no(r.error); r.onblocked = () => no(new Error('blocked')); } catch (e) { no(e); }
    }).catch(e => { pbPhDbP = null; throw e; }));
  }
  async function pbPhTx(mode, fn) { const d = await pbPhDb(); return new Promise((ok, no) => { let r; try { const t = d.transaction('ph', mode); r = fn(t.objectStore('ph')); t.oncomplete = () => ok(r && 'result' in r ? r.result : r); t.onerror = () => no(t.error); t.onabort = () => no(t.error || new Error('abort')); } catch (e) { no(e); } }); }
  async function pbPhHash(text) {
    try { if (window.crypto && crypto.subtle) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''); } } catch (e) {}
    return pbSha256Text(text);
  }
  const pbPhIsPhoto = (v) => typeof v === 'string' && v.length >= PB_PH_MIN && PB_PH_OK.test(v);
  // One photo into the store: reused when the same text is already there, else written, read back and compared.
  async function pbPhPut(text) {
    const id = await pbPhHash(text);
    let got = await pbPhTx('readonly', st => st.get(id));
    if (!(got && got.u === text)) {
      await pbPhTx('readwrite', st => st.put({ u: text, n: text.length, at: Date.now() }, id));
      got = await pbPhTx('readonly', st => st.get(id));
      if (!(got && got.u === text)) throw new Error('photo did not read back the same');
    }
    pbPhKnown.set(text, id); pbPhById.set(id, text);
    return id;
  }
  async function pbPhKeys() { const k = await pbPhTx('readonly', st => st.getAllKeys()); return new Set(Array.isArray(k) ? k : []); }
  // Several photos by key, one read transaction. Map key -> photo text (missing keys are left out).
  async function pbPhGetMany(ids) {
    const out = new Map(); if (!ids.length) return out;
    const d = await pbPhDb();
    await new Promise((ok, no) => {
      try {
        const t = d.transaction('ph', 'readonly'), st = t.objectStore('ph');
        ids.forEach(id => { const q = st.get(id); q.onsuccess = () => { const v = q.result; if (v && typeof v.u === 'string' && (!v.n || v.n === v.u.length)) out.set(id, v.u); }; });
        t.oncomplete = () => ok(); t.onerror = () => no(t.error); t.onabort = () => no(t.error || new Error('abort'));
      } catch (e) { no(e); }
    });
    out.forEach((u, id) => { pbPhKnown.set(u, id); pbPhById.set(id, u); });
    return out;
  }
  // The text with stored photos written as references (photos stored AND verified only; others stay as they are).
  function pbPhStringify(v) {
    if (pbPhOff || !pbPhKnown.size) { pbPhUsed = null; return JSON.stringify(v); }
    const used = new Set();
    const out = JSON.stringify(v, function (k, x) { if (typeof x === 'string' && x.length >= PB_PH_MIN) { const id = pbPhKnown.get(x); if (id !== undefined) { used.add(id); return PB_PH_REF + id; } } return x; });
    pbPhUsed = used;
    return out;
  }
  // References put back from what this tab holds (no store read): for the whole-text fallback.
  function pbPhInlineFromMemory(text) { return typeof text === 'string' && text.indexOf('"' + PB_PH_REF) >= 0 ? text.replace(PB_PH_REF_RE, (m, id) => pbPhById.has(id) ? '"' + pbPhById.get(id) + '"' : m) : text; }
  // Before a Records text is written: every reference in it exists in the store (put back from memory if not), and new
  // photos still inside it are stored (up to pbPhBudget per write; the rest stay inline and the background pass takes
  // them). Any failure: the whole text, photos inline, as before this change.
  async function pbPhOut(text) {
    if (typeof text !== 'string' || pbPhOff) return pbPhInlineFromMemory(text);
    try {
      if (text.indexOf('"' + PB_PH_REF) >= 0) {
        const want = new Set(); text.replace(PB_PH_REF_RE, (m, id) => { want.add(id); return m; });
        const have = await pbPhKeys();
        for (const id of want) if (!have.has(id)) { const u = pbPhById.get(id); if (u !== undefined) await pbPhPut(u); else console.warn('Records refers to a photo this phone no longer has (' + id.slice(0, 12) + ')'); }
      }
      pbPhLeft = 0;
      const re = new RegExp(PB_PH_TXT_RE.source, 'g'); // its own: two writes may interleave across the awaits below
      if (text.indexOf('"') >= 0 && re.test(text)) {
        re.lastIndex = 0;
        const parts = []; let last = 0, m, done = 0;
        while ((m = re.exec(text))) {
          const u = m[1]; if (!PB_PH_OK.test(u)) continue;
          let id = pbPhKnown.get(u);
          if (id === undefined) { if (done >= pbPhBudget) { pbPhLeft++; continue; } id = await pbPhPut(u); done++; }
          parts.push(text.slice(last, m.index), '"' + PB_PH_REF + id + '"'); last = m.index + m[0].length;
        }
        if (parts.length) { parts.push(text.slice(last)); text = parts.join(''); }
      }
      return text;
    } catch (e) {
      console.warn('Photos could not be stored apart; Records is saved whole: ' + (e && (e.name || e.message)));
      return pbPhInlineFromMemory(text);
    }
  }
  // A stored text with its photos put back (for every reader of the stored text other than the start-up load).
  async function pbPhInText(text) {
    if (typeof text !== 'string' || text.indexOf('"' + PB_PH_REF) < 0) return text;
    const ids = new Set(); text.replace(PB_PH_REF_RE, (m, id) => { ids.add(id); return m; });
    const got = await pbPhGetMany(Array.from(ids)); // throws when the store can't be read: a critical read must fail, not lose photos
    return text.replace(PB_PH_REF_RE, (m, id) => got.has(id) ? '"' + got.get(id) + '"' : m);
  }
  // Parsed records: references replaced by the photos, in place. Returns how many could not be found.
  async function pbPhInObj(root) {
    const spots = [], ids = new Set();
    const walk = (v) => {
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const x = v[i]; if (typeof x === 'string') { if (x.length === 71 && x.charCodeAt(0) === 112) { const m = PB_PH_REF_ONE.exec(x); if (m) { spots.push([v, i, m[1]]); ids.add(m[1]); } } } else if (x && typeof x === 'object') walk(x); } return; }
      for (const k in v) { const x = v[k]; if (typeof x === 'string') { if (x.length === 71 && x.charCodeAt(0) === 112) { const m = PB_PH_REF_ONE.exec(x); if (m) { spots.push([v, k, m[1]]); ids.add(m[1]); } } } else if (x && typeof x === 'object') walk(x); }
    };
    if (root && typeof root === 'object') walk(root);
    if (!spots.length) return 0;
    const got = await pbPhGetMany(Array.from(ids));
    let miss = 0; spots.forEach(([o, k, id]) => { if (got.has(id)) o[k] = got.get(id); else miss++; });
    return miss;
  }
  async function pbBigGet(key) { return pbPhInText(await pbBigGetText(key)); } // speed2 #52: the text as before, photos inside
  async function pbBigGetText(key) { // throws when the moved value can't be read (a critical read must not see "no records")""")

rep("""  async function pbBigSet(key, val) {
    try { await pbBigTx('readwrite', st => st.put(val, key)); }""",
"""  async function pbBigSet(key, val) {
    val = await pbPhOut(val); // speed2 #52: photos stored (and verified) first; the text then refers to them
    try { await pbBigTx('readwrite', st => st.put(val, key)); }""")

# ---------- start-up load: references resolved in the parsed records ----------
rep("""      raw = await pbGetCriticalFor(uid, 'runArchive'); // this account's key, explicitly
      if ((await pbResolveStorageUserId()) !== uid) return; // the account changed during the read — the newer login's own load will run
      const stored = raw ? JSON.parse(raw).map(e => normalizeArchiveEntry({ ...e, lockTime: new Date(e.lockTime) })) : [];""",
"""      raw = pbBigKey('runArchive') ? await pbBigGetText(uid + ':runArchive') : await pbGetCriticalFor(uid, 'runArchive'); // this account's key, explicitly (speed2 #52: as stored, photos as references)
      if ((await pbResolveStorageUserId()) !== uid) return; // the account changed during the read — the newer login's own load will run
      const parsedRaw = raw ? JSON.parse(raw) : [];
      const phMissing = await pbPhInObj(parsedRaw); // speed2 #52: the photos put back (throws if the photo store can't be read: then Records failed to load)
      if ((await pbResolveStorageUserId()) !== uid) return;
      const stored = parsedRaw.map(e => normalizeArchiveEntry({ ...e, lockTime: new Date(e.lockTime) }));
      if (phMissing) { console.error('Records: ' + phMissing + ' photo(s) could not be found on this phone'); try { if (window.pbCrash) window.pbCrash.note('Records photos missing: ' + phMissing, '', 'warning'); } catch (e) {} }
      pbPhAfterLoad(uid, raw);""")

# ---------- save: the short text ----------
rep("""      const json = JSON.stringify(runArchive);
      const sizeMB = json.length / (1024*1024); // perf audit 03: no second copy of the whole text just to word a message
      const ok = await pbSetFor(saveUid, 'runArchive', json); // THIS account's key — never "whoever is signed in now\"""",
"""      const json = pbPhStringify(runArchive); // speed2 #52: photos already stored are written as references (no copy of them is made)
      const sizeMB = json.length / (1024*1024); // perf audit 03: no second copy of the whole text just to word a message
      pbPhBudget = 6; // speed2 #52: a save stores at most a few new photos itself; the background pass takes the rest
      let ok; try { ok = await pbSetFor(saveUid, 'runArchive', json); } finally { pbPhBudget = Infinity; } // THIS account's key — never "whoever is signed in now\"""")
rep("""      if (!revisionWritten) console.error('runArchiveRevision failed to persist after retries — a future save may not detect a conflict that actually exists');
      return { outcome: 'success', sizeMB };""",
"""      if (!revisionWritten) console.error('runArchiveRevision failed to persist after retries — a future save may not detect a conflict that actually exists');
      if (pbPhLeft) pbPhSweepSoon(); // speed2 #52: photos left inside the text are stored apart in the background
      pbPhTrimMaps(); // speed2 #52: photos no longer in Records are let go from memory
      return { outcome: 'success', sizeMB };""")

# ---------- the background pass (migration and new photos), verification, tidy ----------
rep("""  let archiveSizeWarningShown = false;""",
"""  // speed2 #52: the background pass. Every photo still inside Records (old Records after this update, a restore, more
  // than a save stores itself) is stored apart, one at a time, each read back and compared; then one ordinary save writes
  // the short text and the result is checked. Storage full: what this pass wrote is removed again, and it waits for the
  // next start. A failed check: Records is written back whole (photos inline) and the store isn't used this session.
  let pbPhSweepT = null, pbPhSweepBusy = false, pbPhSweepStop = false, pbPhFails = 0, pbPhStat = { stored: 0, reused: 0, runs: 0, last: '', at: 0, verified: null, gc: null };
  function pbPhTrimMaps() {
    const used = pbPhUsed; if (!used || pbPhSweepBusy) return;
    pbPhById.forEach((u, id) => { if (!used.has(id)) { pbPhById.delete(id); if (pbPhKnown.get(u) === id) pbPhKnown.delete(u); } });
  }
  function pbPhAfterLoad(uid, raw) {
    if (typeof raw === 'string' && new RegExp(PB_PH_TXT_RE.source).test(raw)) pbPhSweepSoon(4000);
    setTimeout(() => { pbPhGc().catch(() => {}); }, 20000);
  }
  function pbPhSweepSoon(ms) { if (pbPhOff || pbPhSweepStop) return; clearTimeout(pbPhSweepT); pbPhSweepT = setTimeout(() => { pbPhSweep().catch(e => console.warn('photo pass', e)); }, ms === undefined ? 1500 : ms); }
  function pbPhCollect(root) { // every photo text in the records that isn't stored yet (each once)
    const found = new Set();
    const walk = (v) => { if (Array.isArray(v)) { for (const x of v) { if (typeof x === 'string') { if (x.length >= PB_PH_MIN && !pbPhKnown.has(x) && pbPhIsPhoto(x)) found.add(x); } else if (x && typeof x === 'object') walk(x); } return; } for (const k in v) { const x = v[k]; if (typeof x === 'string') { if (x.length >= PB_PH_MIN && !pbPhKnown.has(x) && pbPhIsPhoto(x)) found.add(x); } else if (x && typeof x === 'object' && !(x instanceof Date)) walk(x); } };
    walk(root); return Array.from(found);
  }
  async function pbPhSweep() {
    if (pbPhSweepBusy || pbPhOff || pbPhSweepStop) return;
    const uid = pbArchiveOwnerUid; if (uid === null || archiveLoadFailed) return;
    pbPhSweepBusy = true; pbPhStat.runs++; pbPhStat.at = Date.now();
    const wrote = [];
    try {
      let todo = pbPhCollect(runArchive), rounds = 0;
      if (!todo.length) { pbPhStat.last = 'nothing to store'; return; }
      while (todo.length && rounds++ < 5) { // photos added while this ran are taken in the next round
        for (const u of todo) {
          if (pbArchiveOwnerUid !== uid) { pbPhStat.last = 'account changed'; return; }
          if (pbPhKnown.has(u)) continue;
          const id = await pbPhHash(u);
          let got = null; try { got = await pbPhTx('readonly', st => st.get(id)); } catch (e) { got = null; }
          if (got && got.u === u) { pbPhKnown.set(u, id); pbPhById.set(id, u); pbPhStat.reused++; }
          else { await pbPhPut(u); wrote.push(id); pbPhStat.stored++; }
          await new Promise(r => setTimeout(r, 0)); // never one long task
        }
        if (pbArchiveOwnerUid !== uid) return;
        todo = pbPhCollect(runArchive); // every photo in memory now maps to a stored, compared photo (and back to the same text)
      }
      if (todo.length) throw new Error(todo.length + ' photo(s) still not stored');
      pbPhStat.last = 'stored'; pbPhSweepBusy = false;
      const ok = await saveRunArchive();
      if (ok) await pbPhVerify(uid);
    } catch (e) {
      const full = e && (e.name === 'QuotaExceededError' || /quota|space|full/i.test(String(e.message || '')));
      pbPhStat.last = (full ? 'storage full: ' : 'failed: ') + String((e && (e.message || e.name)) || e).slice(0, 120);
      console.warn('Photos could not be stored apart: ' + pbPhStat.last);
      if (++pbPhFails >= 3) pbPhSweepStop = true; // not again this session
      if (full) { // what this pass wrote would only squeeze the Records save: removed again (nothing refers to it yet)
        pbPhSweepStop = true;
        for (const id of wrote) { try { const u = pbPhById.get(id); await pbPhTx('readwrite', st => st.delete(id)); if (u !== undefined) pbPhKnown.delete(u); pbPhById.delete(id); } catch (x) {} }
      }
    } finally { pbPhSweepBusy = false; }
  }
  // After the short text was written: read it back; it must be exactly what memory writes now, and every reference in it
  // must be in the store with the very same photo. If not (and memory didn't change meanwhile), Records is written whole.
  async function pbPhVerify(uid) {
    let ok = true, why = '';
    try {
      const raw = await pbBigGetText(uid + ':runArchive');
      const now = pbPhStringify(runArchive);
      if (raw !== now) { pbPhStat.verified = 'changed meanwhile'; return true; } // a newer save is in flight: its own write is checked by pbPhOut
      const ids = new Set(); raw.replace(PB_PH_REF_RE, (m, id) => { ids.add(id); return m; });
      const d = await pbPhDb();
      for (const id of ids) {
        const v = await new Promise((res, rej) => { try { const q = d.transaction('ph', 'readonly').objectStore('ph').get(id); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); } catch (e) { rej(e); } });
        if (!v || v.u !== pbPhById.get(id)) { ok = false; why = 'photo ' + id.slice(0, 12) + ' differs'; break; }
      }
    } catch (e) { ok = false; why = String((e && (e.message || e.name)) || e).slice(0, 80); }
    pbPhStat.verified = ok ? 'ok' : 'FAILED: ' + why;
    if (!ok) {
      console.error('Photos stored apart did not verify (' + why + '): Records is written whole again');
      try { if (window.pbCrash) window.pbCrash.note('Photo store did not verify: ' + why, '', 'error'); } catch (e) {}
      pbPhOff = true; await saveRunArchive();
    }
    return ok;
  }
  // Photos no record refers to: removed at most once a day, under the Records save lock, only when every Records text on
  // this phone (each account, IndexedDB and localStorage) was read, and only 24 h after they were stored.
  async function pbPhGc(force) {
    if (pbPhOff || pbPhSweepBusy || !(navigator.locks && navigator.locks.request)) return 'skipped';
    try { if (!force && Date.now() - (Number(localStorage.getItem('pbPhGcAt')) || 0) < 86400000) return 'not due'; } catch (e) {}
    return navigator.locks.request('pb-archive-save', async () => {
      const refs = new Set();
      const keys = await pbBigTx('readonly', st => st.getAllKeys());
      for (const k of (keys || [])) { if (!pbBigKey(k)) continue; const t = await pbBigTx('readonly', st => st.get(k)); if (typeof t === 'string') t.replace(PB_PH_REF_RE, (m, id) => { refs.add(id); return m; }); }
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) || ''; if (!pbBigKey(k)) continue; const t = localStorage.getItem(k) || ''; t.replace(PB_PH_REF_RE, (m, id) => { refs.add(id); return m; }); }
      pbPhById.forEach((u, id) => refs.add(id)); // what this tab holds may be written again
      const all = await pbPhTx('readonly', st => st.getAllKeys());
      let gone = 0, kept = 0;
      for (const id of (all || [])) {
        if (refs.has(id)) continue;
        const v = await pbPhTx('readonly', st => st.get(id));
        if (v && Date.now() - (Number(v.at) || 0) < (force === 'now' ? 0 : 86400000)) { kept++; continue; }
        await pbPhTx('readwrite', st => st.delete(id)); gone++;
      }
      try { localStorage.setItem('pbPhGcAt', String(Date.now())); } catch (e) {}
      pbPhStat.gc = { at: Date.now(), gone, kept, refs: refs.size };
      return pbPhStat.gc;
    });
  }
  window.__pbPhDebug = { stat: () => Object.assign({}, pbPhStat, { known: pbPhKnown.size, off: pbPhOff, stop: pbPhSweepStop }), sweep: () => pbPhSweep(), gc: (f) => pbPhGc(f || true), verify: () => pbPhVerify(pbArchiveOwnerUid), keys: async () => Array.from(await pbPhKeys()), stringify: () => pbPhStringify(runArchive) }; // tests
  let archiveSizeWarningShown = false;""")

open(out, 'w', encoding='utf-8').write(s)
print('ok', out)
