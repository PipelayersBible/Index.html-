#!/usr/bin/env python3
# speed2 #52 (second half): offer to clear phone copies of photos the company already has, once a run is older than
# N days (Settings > Preferences: 30 / 60 / 90 days / Never; default 60; per phone). Needs 02_photo_store.py.
#
# A photo can leave the phone only when ALL of this holds: it is in a run (not a permit, not a management report) of
# the account whose Records is open; the run has ended (completed or ended early), is not the open run and was not
# restored from the cloud; the run was locked AND ended more than N days ago (N >= 30, so well past the 21 days in which
# a run's office copy and sealed original are still sent); and this phone's own upload log (rrPhotosUp, r16.75) shows
# that exact photo file (run-photos/<uid>/runs/<run>/<sha256 of its bytes>.jpg) reached the company. Anything else
# (never sent, an inline base64 field, an older log entry that was pruned) stays.
# It is never automatic: Records shows "N sent photos can leave this phone" and nothing happens until he confirms.
# Each cleared photo is replaced, in place, by a small picture that says "Photo kept by your company", the date, and the
# original photo's SHA-256, so every report, PDF and export keeps working and shows where the photo is. The run keeps a
# list (_phoneCleared: sha, placeholder sha, file path, time; "_" = phone bookkeeping, outside the record fingerprint),
# and the record fingerprint (rev) still counts the ORIGINAL photo, so it matches the company's sealed original.
# The save that records it must succeed, else everything is put back. The photos then leave the photo store at once.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# Settings: the choice (Preferences, under Text size)
rep("""        <p class="pb-help" id="textSizeMsg" style="display:none;"></p>""",
"""        <p class="pb-help" id="textSizeMsg" style="display:none;"></p>
        <p class="pb-set-label" id="phClearLabel">Offer to clear sent photos from this phone after</p><!-- speed2 #52 -->
        <div class="pb-toggle" id="phClearToggle" role="group" aria-labelledby="phClearLabel">
          <button type="button" data-val="30" aria-pressed="false" onclick="pbSetPhClearDays(30)">30 days</button>
          <button type="button" data-val="60" class="active" aria-pressed="true" onclick="pbSetPhClearDays(60)">60 days</button>
          <button type="button" data-val="90" aria-pressed="false" onclick="pbSetPhClearDays(90)">90 days</button>
          <button type="button" data-val="never" aria-pressed="false" onclick="pbSetPhClearDays('never')">Never</button>
        </div>""")

# Records: the offer (a banner like "Not sent", only when there is something to clear)
rep("""    <div id="archiveTopActions" class="rec-top"><!-- feat_records: only when something waits -->""",
"""    <div id="archiveTopActions" class="rec-top"><!-- feat_records: only when something waits -->
      <button type="button" class="rec-banner" id="archivePhClearBtn" hidden onclick="pbPhClearOffer()"><span class="rec-banner-ic" aria-hidden="true"></span><span class="name" id="archivePhClearName">Sent photos can leave this phone</span><span class="chev" aria-hidden="true"></span></button><!-- speed2 #52 -->""")

# the record fingerprint counts the original photo for a cleared one
rep("""  function pbRptCanonical(e) {
    if (e.kind === 'confined') return pbPermitBackupRecord(e);""",
"""  function pbRptCanonical(e) {
    if (e.kind === 'confined') return pbPermitBackupRecord(e);
    const pbClr = Array.isArray(e._phoneCleared) && e._phoneCleared.length ? new Map(e._phoneCleared.map(c => [c.ph, c.sha])) : null; // speed2 #52: a photo cleared from the phone counts as the original""")
rep("""      if (typeof v === 'string') return /^data:image\\//.test(v) ? 'sha256:' + pbPhotoSha(v) : v;
      if (Array.isArray(v)) return v.map(x => walk(x, false));""",
"""      if (typeof v === 'string') { if (!/^data:image\\//.test(v)) return v; const h = pbPhotoSha(v); return 'sha256:' + ((pbClr && pbClr.get(h)) || h); }
      if (Array.isArray(v)) return v.map(x => walk(x, false));""")

rep("""return (typeof v === 'string' && /^data:image\\//.test(v)) ? 'sha256:' + pbPhotoSha(v) : v; })), true);""",
"""return (typeof v === 'string' && /^data:image\\//.test(v)) ? 'sha256:' + ((h) => (pbClr && pbClr.get(h)) || h)(pbPhotoSha(v)) : v; })), true);""")

# the feature
rep("""  window.__pbPhDebug = {""",
"""  // ---- speed2 #52: clear phone copies of photos the company already has (see 03_photo_clear.py) ----
  const PB_PHC_KEY = 'pbPhClearDays', PB_PHC_DEF = 60, PB_PHC_MIN = 30;
  let pbPhClearState = null, pbPhClearBusy = false;
  const pbPhShaMemo = new Map();
  function pbPhClearDays() { let d = PB_PHC_DEF; try { const v = localStorage.getItem(PB_PHC_KEY); if (v === 'never') return 0; if (v) d = Math.max(PB_PHC_MIN, parseInt(v, 10) || PB_PHC_DEF); } catch (e) {} return d; }
  function pbPhClearSyncToggle() { const t = document.getElementById('phClearToggle'); if (!t) return; const d = String(pbPhClearDays() || 'never'); t.querySelectorAll('button').forEach(b => { const on = b.dataset.val === d; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
  window.pbSetPhClearDays = function (v) { try { localStorage.setItem(PB_PHC_KEY, String(v)); } catch (e) {} pbPhClearSyncToggle(); pbPhClearState = null; pbPhClearRefresh(); };
  // the SHA-256 of a photo's image bytes, exactly as pbPhotoSha (the browser's own hashing when it has it)
  async function pbPhImgSha(url) {
    if (pbPhShaMemo.has(url)) return pbPhShaMemo.get(url);
    let h = null;
    try { const m = /^data:[^;,]*;base64,(.*)$/.exec(url); if (m && window.crypto && crypto.subtle) { const bin = atob(m[1]), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); const d = await crypto.subtle.digest('SHA-256', b); h = Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, '0')).join(''); } } catch (e) { h = null; }
    if (!h) h = pbPhotoSha(url);
    if (pbPhShaMemo.size > 3000) pbPhShaMemo.clear(); pbPhShaMemo.set(url, h);
    return h;
  }
  // The photos that may leave this phone (see the rules in 03_photo_clear.py). spots: where each one is.
  async function pbPhClearScan(withSpots) {
    const days = pbPhClearDays(), uid = pbArchiveOwnerUid, res = { days, count: 0, chars: 0, spots: [] };
    if (!days || uid === null || uid === 'shared' || archiveLoadFailed || pbPhOff) return res;
    let done = {}; try { done = JSON.parse((await pbGetFor(uid, 'rrPhotosUp')) || '{}') || {}; } catch (e) { done = {}; }
    if (!done || typeof done !== 'object' || !Object.keys(done).length) return res;
    const cut = Date.now() - days * 86400000, seen = new Set();
    const isPh = (x) => typeof x === 'string' && x.length >= PB_PH_MIN && /^data:image\\//.test(x);
    for (const e of runArchive.slice()) {
      if (!e || e.kind !== 'run' || !(e.completed || e.incomplete) || e.restoredFromCloud || e.id === currentRunArchiveId) continue;
      const lt = e.lockTime instanceof Date ? e.lockTime.getTime() : Date.parse(e.lockTime), end = Number(e.runEndTime) || lt;
      if (!(lt < cut) || !(end < cut)) continue;
      const spots = [];
      const walk = (v) => {
        if (Array.isArray(v)) { v.forEach((x, i) => { if (isPh(x)) spots.push([v, i, x]); else if (x && typeof x === 'object') walk(x); }); return; }
        Object.keys(v).forEach(k => { if (k === '_phoneCleared') return; const x = v[k]; if (isPh(x)) spots.push([v, k, x]); else if (x && typeof x === 'object' && !(x instanceof Date)) walk(x); });
      };
      walk(e);
      for (const [o, k, u] of spots) {
        const sha = await pbPhImgSha(u);
        if (!done[pbRrPhotoPath(uid, e.id, sha)]) continue;
        if (!seen.has(u)) { seen.add(u); res.count++; res.chars += u.length; }
        if (withSpots) res.spots.push({ e, o, k, u, sha });
      }
    }
    return res;
  }
  // what a cleared photo becomes: a small picture saying where the photo is, with its fingerprint
  function pbPhPlaceholder(sha, at) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 400; const g = c.getContext('2d');
    g.fillStyle = '#e9ecef'; g.fillRect(0, 0, 640, 400); g.fillStyle = '#212529'; g.textAlign = 'center';
    g.font = 'bold 32px sans-serif'; g.fillText('Photo kept by your company', 320, 150);
    g.font = '22px sans-serif'; g.fillText('Cleared from this phone ' + new Date(at).toLocaleDateString(), 320, 200);
    g.font = '18px monospace'; g.fillText('SHA-256 ' + sha.slice(0, 32), 320, 250); g.fillText(sha.slice(32), 320, 278);
    return c.toDataURL('image/jpeg', 0.8);
  }
  async function pbPhClearRefresh() {
    const b = document.getElementById('archivePhClearBtn'); if (!b) return;
    try {
      if (!pbPhClearState || pbPhClearState.gen !== pbSaveOkGen || Date.now() - pbPhClearState.at > 600000) { const gen = pbSaveOkGen, st = await pbPhClearScan(false); pbPhClearState = { count: st.count, chars: st.chars, days: st.days, gen, at: Date.now() }; }
      const n = pbPhClearState.count; b.hidden = !n;
      const nm = document.getElementById('archivePhClearName'); if (nm && n) nm.textContent = n + ' sent photo' + (n === 1 ? '' : 's') + ' can leave this phone';
    } catch (e) { b.hidden = true; }
  }
  window.pbPhClearOffer = async function () {
    if (pbPhClearBusy) return;
    const st = await pbPhClearScan(false);
    if (!st.count) { pbAlert('There are no photos to clear right now.', 'Phone Photos'); pbPhClearRefresh(); return; }
    const mb = Math.max(0.1, st.chars * 0.75 / 1048576).toFixed(1);
    pbShowModal(st.count + ' photo' + (st.count === 1 ? '' : 's') + ' (about ' + mb + ' MB) from runs older than ' + st.days + ' days ' + (st.count === 1 ? 'is' : 'are') + ' already with your company. Clear ' + (st.count === 1 ? 'it' : 'them') + ' from this phone? Reports made on this phone will show \\u201cPhoto kept by your company\\u201d instead.', [
      { label: 'Not Now' },
      { label: 'Clear Phone Copies', primary: true, onClick: () => { pbPhClearNow(); } }
    ], 'Free Up Phone Space');
  };
  async function pbPhClearNow() {
    if (pbPhClearBusy) return; pbPhClearBusy = true;
    const undo = [], lists = new Map();
    try {
      const st = await pbPhClearScan(true), at = Date.now(), made = new Map(), uid = pbArchiveOwnerUid;
      for (const x of st.spots) {
        if (x.o[x.k] !== x.u || pbArchiveOwnerUid !== uid) continue; // changed meanwhile: left as it is
        let ph = made.get(x.sha); if (!ph) { ph = pbPhPlaceholder(x.sha, at); made.set(x.sha, ph); }
        if (!lists.has(x.e)) lists.set(x.e, Array.isArray(x.e._phoneCleared) ? x.e._phoneCleared.slice() : undefined);
        undo.push([x.o, x.k, x.u]); x.o[x.k] = ph;
        const list = Array.isArray(x.e._phoneCleared) ? x.e._phoneCleared : (x.e._phoneCleared = []);
        if (!list.some(c => c.sha === x.sha)) list.push({ sha: x.sha, ph: pbPhotoSha(ph), path: pbRrPhotoPath(uid, x.e.id, x.sha), at });
      }
      if (!undo.length) { pbAlert('There are no photos to clear right now.', 'Phone Photos'); return; }
      const n = new Set(undo.map(u => u[2])).size;
      const ok = await saveRunArchive();
      if (!ok) {
        undo.reverse().forEach(([o, k, u]) => { o[k] = u; });
        lists.forEach((v, e) => { if (v === undefined) delete e._phoneCleared; else e._phoneCleared = v; });
        pbAlert('Nothing was cleared: Records couldn\\u2019t be saved just now. Your photos are still on this phone.', 'Phone Photos');
        return;
      }
      pbPhClearState = null;
      try { await pbPhGc('now'); } catch (e) {}
      pbAlert('Cleared ' + n + ' photo' + (n === 1 ? '' : 's') + ' from this phone. Your company keeps the originals.', 'Phone Photos');
      try { if (pbCurrentScreen === 'archive') window.renderArchiveList(); } catch (e) {}
    } finally { pbPhClearBusy = false; pbPhClearRefresh(); }
  }
  setTimeout(() => { // after the whole script ran: Records draws the offer; Settings shows the choice
    try { const r0 = window.renderArchiveList; if (typeof r0 === 'function') window.renderArchiveList = function () { const out = r0.apply(this, arguments); try { pbPhClearRefresh(); } catch (e) {} return out; }; } catch (e) {}
    pbPhClearSyncToggle();
  }, 0);
  window.__pbPhClear = { scan: async () => { const s = await pbPhClearScan(true); return { count: s.count, chars: s.chars, days: s.days, spots: s.spots.length }; }, now: () => pbPhClearNow(), refresh: () => pbPhClearRefresh() }; // tests
  window.__pbPhDebug = {""")

open(out, 'w', encoding='utf-8').write(s)
print('ok', out)
