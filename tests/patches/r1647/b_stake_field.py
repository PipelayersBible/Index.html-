import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)

# 1. A front photo waiting for its back is kept on the phone (an iPhone can reload the app while the camera is open).
rep("""  const pbStakeAiFront = {}; // prefix -> { img, ctx }: a front photo waiting for its back (or Read Now)""",
"""  const pbStakeAiFront = {}; // prefix -> { img, ctx }: a front photo waiting for its back (or Read Now)
  // r16.47: ... and in IndexedDB, keyed by the run draft and point, so a reload (the camera on an iPhone) doesn't lose it.
  const pbStakePend = (() => {
    let dbp = null;
    const db = () => dbp || (dbp = new Promise((ok, no) => { try { const r = indexedDB.open('pb-stake-pending', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('p'); } catch (e) {} }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } }).catch(e => { dbp = null; throw e; }));
    const tx = async (mode, fn) => { const d = await db(); return new Promise((ok, no) => { const t = d.transaction('p', mode); const r = fn(t.objectStore('p')); t.oncomplete = () => ok(r ? r.result : undefined); t.onerror = () => no(t.error); }); };
    const draft = () => { try { pbRdFlush(); return pbRd.formId ? pbRd.formUid + ':' + pbRd.formId : null; } catch (e) { return null; } };
    return {
      put: (prefix, img) => { const d = draft(); if (!d) return; tx('readwrite', st => st.put({ img, at: Date.now() }, d + ':' + prefix)).catch(() => {}); },
      del: (prefix) => { const d = draft(); if (!d) return; tx('readwrite', st => st.delete(d + ':' + prefix)).catch(() => {}); },
      forDraft: async (d) => { const out = {}; try { await tx('readonly', st => { const r = st.openCursor(); r.onsuccess = () => { const c = r.result; if (!c) return; const k = String(c.key); if (k.startsWith(d + ':') && c.value && c.value.img && Date.now() - c.value.at < 12 * 3600e3) out[k.slice(d.length + 1)] = c.value.img; c.continue(); }; return null; }); } catch (e) {} return out; },
      dropDraft: async (d) => { try { await tx('readwrite', st => { const r = st.openCursor(); r.onsuccess = () => { const c = r.result; if (!c) return; if (String(c.key).startsWith(d + ':') || Date.now() - ((c.value && c.value.at) || 0) > 12 * 3600e3) c.delete(); c.continue(); }; return null; }); } catch (e) {} }
    };
  })();
  function pbStakeAiFrontShow(prefix) {
    const st = document.getElementById(prefix + 'AiStakeStatus'); if (!st) return;
    pbAiShow(st, 'info', 'Front photo added.', 'Add the back if it has the stake number or hub elevation.');
    st.insertAdjacentHTML('beforeend', '<div class="pb-btn-row"><button type="button" class="pb-btn ghost small" onclick="pbStakeAiBack(\\'' + prefix + '\\')">Add Back Photo</button><button type="button" class="pb-btn small" onclick="pbStakeAiReadNow(\\'' + prefix + '\\')">Read Stake</button></div>');
  }
  // A resumed draft: its points' waiting front photos come back, with Add Back Photo / Read Stake.
  window.pbStakeAiResumeFronts = async function(draftKey, map) {
    const got = await pbStakePend.forDraft(draftKey);
    Object.keys(got).forEach(old => {
      const p = (map && map[old]) || old; if (!document.getElementById(p + 'AiStakeStatus')) return;
      pbStakeAiFront[p] = { img: got[old], ctx: { photoGen: window._pbPhotoContextGen, life: (window._pbPointLifecycleGen || {})[p] || 0 } };
      if (p !== old) { pbStakePend.del(old); pbStakePend.put(p, got[old]); }
      pbStakeAiFrontShow(p);
    });
  };""")
rep("""    pbStakeAiFront[prefix] = { img: imgs[0], ctx };
    pbAiShow(st, 'info', 'Front photo added.', 'Add the back if it has the stake number or hub elevation.');
    if (st) st.insertAdjacentHTML('beforeend', '<div class="pb-btn-row"><button type="button" class="pb-btn ghost small" onclick="pbStakeAiBack(\\'' + prefix + '\\')">Add Back Photo</button><button type="button" class="pb-btn small" onclick="pbStakeAiReadNow(\\'' + prefix + '\\')">Read Stake</button></div>');
  };""", """    pbStakeAiFront[prefix] = { img: imgs[0], ctx };
    pbStakePend.put(prefix, imgs[0]);
    pbStakeAiFrontShow(prefix);
  };""")

# 2. A read that fails for signal keeps its photos: Try Again (and the photos stay on the point).
rep("""  async function pbStakeAiRead(prefix, ctx, img, back) {""", """  const pbStakeAiLast = {}; // prefix -> { ctx, img, back }: the last read that failed for signal, for Try Again
  window.pbStakeAiRetry = function(prefix) { const l = pbStakeAiLast[prefix]; delete pbStakeAiLast[prefix]; if (l && !pbStakeAiStale(prefix, l.ctx)) pbStakeAiRead(prefix, l.ctx, l.img, l.back); };
  async function pbStakeAiRead(prefix, ctx, img, back) {
    pbStakePend.del(prefix); delete pbStakeAiLast[prefix];""")
rep("""    if (!r.ok) { pbAiShow(stNow, 'warn', 'Stake not read.', r.message + ' Nothing on this point was changed.'); return; }""",
    """    if (!r.ok) {
      const net = /^(offline|timeout|network|dropped|ai_busy|ai_failed|ai_incomplete|unavailable|http_5\\d\\d)$/.test(r.code || '');
      pbAiShow(stNow, 'warn', 'Stake not read.', r.message + (net ? ' The photos are kept on this point.' : ' Nothing on this point was changed.'));
      if (net) { pbStakeAiLast[prefix] = { ctx, img, back }; pbStakeAiKeepPhotos(prefix, ctx, [img, back]); if (stNow) stNow.insertAdjacentHTML('beforeend', '<div class="pb-btn-row"><button type="button" class="pb-btn small" onclick="pbStakeAiRetry(\\'' + prefix + '\\')">Try Again</button></div>'); }
      return;
    }""")
# kept once: a retried read doesn't add the same photos again
rep("""    for (const [k, im] of list.entries()) {
      if (!im || !im.data) continue;""", """    for (const [k, im] of list.entries()) {
      if (!im || !im.data || im.__kept) continue;
      im.__kept = true;""")

# 3. Camera photos (12-48 MP) made 4 full-size close-ups per side: smaller close-ups, so a read sends about half as much.
rep("""            try { const kk = Math.min(1, maxPx / Math.max(tw, th)), t = document.createElement('canvas');""",
    """            try { const kk = Math.min(1, Math.min(maxPx, 1200) / Math.max(tw, th)), t = document.createElement('canvas'); // r16.47: close-ups at 1200 px""")
rep("""        const jpg = (cv) => { let qq = 0.78, d = cv.toDataURL('image/jpeg', qq);""",
    """        const jpg = (cv) => { let qq = 0.72, d = cv.toDataURL('image/jpeg', qq);""")
open(out, 'w', encoding='utf-8').write(s)
s = open(out, encoding='utf-8').read()
def rep2(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)
rep2("""    const rdGen = pbFormGen;
    pbRdPh.get(a + ':' + id).then(v => {""", """    const rdGen = pbFormGen;
    try { setTimeout(() => { if (pbRd.formId === id && pbFormGen === rdGen) window.pbStakeAiResumeFronts(a + ':' + id, rdMap); }, 0); } catch (e) {} // r16.47: fronts waiting for their backs
    pbRdPh.get(a + ':' + id).then(v => {""")
rep2("""rm(uid, id); const key = uid + ':' + id; delete pbRdPhLast[key]; pbRdPh.del(key).catch(() => {}); };""",
     """rm(uid, id); const key = uid + ':' + id; delete pbRdPhLast[key]; pbRdPh.del(key).catch(() => {}); try { pbStakePend.dropDraft(key); } catch (e) {} };""")
open(out, 'w', encoding='utf-8').write(s)
