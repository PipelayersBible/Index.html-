# hunt2 02: the phone says so when a photo can't be found (round 1's open item).
# Since r17.08 photos are kept apart from Records. When the phone's photo store has lost one (storage cleared by the
# phone, a damaged store), the record keeps the photo's reference and until now only a console line / crash note said so:
# the person saw a broken picture and nothing else.
# Now:
#  - Records shows a banner "N photos are missing from this phone"; tapping it says which records, and that photos
#    already sent are still with the company. Nothing is deleted or changed by it.
#  - Run Results of a record with missing photos shows one line under the lock band.
#  - Wherever a missing photo would be drawn (any <img>), a plain "Photo missing from this phone" picture shows
#    instead of a broken-image icon.
# Usage: python3 02_missing_photo_notice.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""<span class="name" id="archivePhClearName">Sent photos can leave this phone</span><span class="chev" aria-hidden="true"></span></button><!-- speed2 #52 -->
""", """<span class="name" id="archivePhClearName">Sent photos can leave this phone</span><span class="chev" aria-hidden="true"></span></button><!-- speed2 #52 -->
      <button type="button" class="rec-banner" id="archivePhLostBtn" hidden onclick="pbPhLostShow()"><span class="rec-banner-ic" aria-hidden="true"></span><span class="name" id="archivePhLostName">Photos missing from this phone</span><span class="chev" aria-hidden="true"></span></button><!-- hunt2 02 -->
""")
p.rep("""    <div class="pb-lockband" id="lockband"></div>
    <div id="lockSaveStatusBanner\"""", """    <div class="pb-lockband" id="lockband"></div>
    <div id="phLostRunBanner" role="status" style="display:none; margin:0 16px 10px 16px; padding:10px 14px; background:var(--pb-warn-soft); border:1px solid rgba(255,170,77,0.45); border-radius:var(--pb-r-card, 14px); font-size:15px; line-height:1.35;"></div><!-- hunt2 02 -->
    <div id="lockSaveStatusBanner\"""")
p.rep("""  window.__pbPhClear = { scan:""", """  // ==== hunt2 02: photos the phone's photo store no longer has ====
  const pbPhIsLostRef = (x) => typeof x === 'string' && x.length === 71 && x.charCodeAt(0) === 112 && PB_PH_REF_ONE.test(x);
  function pbPhLostIn(e) { // distinct missing photos inside one record
    const ids = new Set();
    const walk = (v) => { if (Array.isArray(v)) { for (const x of v) { if (typeof x === 'string') { if (pbPhIsLostRef(x)) ids.add(x); } else if (x && typeof x === 'object') walk(x); } return; } for (const k in v) { const x = v[k]; if (typeof x === 'string') { if (pbPhIsLostRef(x)) ids.add(x); } else if (x && typeof x === 'object' && !(x instanceof Date)) walk(x); } };
    try { if (e && typeof e === 'object') walk(e); } catch (err) {}
    return ids.size;
  }
  let pbPhLostState = null;
  function pbPhLostScan() {
    const key = pbSaveOkGen + ':' + runArchive.length + ':' + String(pbArchiveOwnerUid);
    if (pbPhLostState && pbPhLostState.key === key) return pbPhLostState;
    const list = []; let total = 0;
    runArchive.forEach(e => { const n = pbPhLostIn(e); if (n) { total += n; list.push({ id: e.id, n, e }); } });
    return (pbPhLostState = { key, total, list });
  }
  function pbPhLostName(e) {
    const lt = e.lockTime instanceof Date ? e.lockTime : new Date(e.lockTime), when = isFinite(lt.getTime()) ? lt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
    const what = e.kind === 'confined' ? 'Permit' + (e.space ? ' \\u2014 ' + e.space : '') : e.kind === 'report' ? 'Report' + (e.category ? ' \\u2014 ' + e.category : '') : e.kind === 'run' ? 'Run' + (e.jobNumber ? ', job ' + e.jobNumber : e.jobsite ? ', ' + e.jobsite : '') : 'Record';
    return what + (when ? ' (' + when + ')' : '');
  }
  function pbPhLostRefresh() {
    const b = document.getElementById('archivePhLostBtn'); if (!b) return;
    try { const st = pbPhLostScan(); b.hidden = !st.total; const nm = document.getElementById('archivePhLostName'); if (nm && st.total) nm.textContent = st.total + ' photo' + (st.total === 1 ? ' is' : 's are') + ' missing from this phone'; } catch (e) { b.hidden = true; }
  }
  window.pbPhLostShow = function () {
    const st = pbPhLostScan(); if (!st.total) { pbPhLostRefresh(); return; }
    const lines = st.list.slice(0, 6).map(x => '\\u2022 ' + pbPhLostName(x.e) + ': ' + x.n + ' photo' + (x.n === 1 ? '' : 's'));
    if (st.list.length > 6) lines.push('\\u2022 and ' + (st.list.length - 6) + ' more');
    pbAlert('This phone can\\u2019t find ' + (st.total === 1 ? 'a photo' : st.total + ' photos') + ' that belong' + (st.total === 1 ? 's' : '') + ' to:\\n' + lines.join('\\n') + '\\n\\nThe numbers, notes and times in these records are all still here. Photos that were already sent are still with your company. Photos that were never sent can\\u2019t be brought back.', 'Photos Missing');
  };
  function pbPhLostRun() {
    const el = document.getElementById('phLostRunBanner'); if (!el) return;
    let n = 0; try { const e = getCurrentArchiveEntry(); if (e && runArchive.includes(e)) n = pbPhLostIn(e); } catch (err) { n = 0; }
    el.style.display = n ? '' : 'none';
    if (n) el.textContent = (n === 1 ? 'A photo of this run is' : n + ' photos of this run are') + ' missing from this phone. Everything else in the record is here. If the run was sent, your company still has ' + (n === 1 ? 'the photo.' : 'the photos.');
  }
  const PB_PH_LOST_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" fill="#2a2a2a"/><rect x="6" y="6" width="308" height="228" fill="none" stroke="#c9541f" stroke-width="3" stroke-dasharray="10 8"/><text x="160" y="112" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700" fill="#ffffff">Photo missing</text><text x="160" y="146" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="18" fill="#dddddd">from this phone</text></svg>');
  window.addEventListener('error', (ev) => { // an <img> given a missing photo's reference: a plain picture that says so
    const t = ev && ev.target; if (!t || t.tagName !== 'IMG') return;
    try { const s = t.getAttribute('src') || ''; if (pbPhIsLostRef(s)) { t.setAttribute('data-pb-ph-lost', '1'); t.setAttribute('alt', 'Photo missing from this phone'); t.src = PB_PH_LOST_IMG; } } catch (e) {}
  }, true);
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'results') setTimeout(pbPhLostRun, 0); if (name === 'archive') setTimeout(pbPhLostRefresh, 0); });
  setTimeout(() => { try { const r1 = window.renderArchiveList; if (typeof r1 === 'function') window.renderArchiveList = function () { const out = r1.apply(this, arguments); try { pbPhLostRefresh(); } catch (e) {} return out; }; } catch (e) {} }, 0);
  window.__pbPhLost = { scan: () => { const s = pbPhLostScan(); return { total: s.total, list: s.list.map(x => ({ id: x.id, n: x.n })) }; } }; // tests
  window.__pbPhClear = { scan:""")
p.save()
