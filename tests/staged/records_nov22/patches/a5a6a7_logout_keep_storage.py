# records_nov22 A5 + A6 + A7
#  A5: an account with no email or password (join link) can't Log Out while anything is Not sent (counted as in A1):
#      once out, nobody can send it from this phone until that person gets a code or a new link.
#  A6: the phone's answer to "keep this app's storage" (navigator.storage.persist) was thrown away. Not kept + something
#      Not sent + not the Home Screen app -> Home's Not sent line adds "Add to Home Screen so this phone keeps your work."
#      One line in the Home Screen step and in Settings: don't delete the app icon while anything shows Not sent.
#  A7: the "storage full" advice said "delete old runs", but runs live in the big store (IndexedDB); a full small store
#      (localStorage, ~5 MB) is photos on unsent daily reports, field tickets and permits. The advice now matches the store
#      that failed.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
# ---- A5 ----
p.rep("""    if (typeof o === 'function') window.pbLogout = function () {
      if (ok || !sbUser || !pbObIsLink(sbUser)) return o.apply(this, arguments);
      const a = arguments, self = this;
      pbShowModal(""", """    if (typeof o === 'function') window.pbLogout = async function () {
      if (ok || !sbUser || !pbObIsLink(sbUser)) return o.apply(this, arguments);
      const a = arguments, self = this, uid = sbUser.id;
      let unsent = ''; try { unsent = pbArchiveOwnerUid === uid ? await pbUnsentSentence(uid) : ''; } catch (e) { unsent = ''; } /* records_nov22 A5 */
      if (unsent) { pbShowModal(unsent.replace(/ (It sends|They send) when this account logs in here again\\./, '') + '\\n\\nLet it send before you log out (it needs signal). This account has no email or password: once you log out, nothing on this phone can send until you get back in with a code or a new link from the office.', [{ label: 'See What’s Waiting', onClick: () => window.pbUnsentOpen() }, { label: 'Stay Logged In', primary: true }], 'Not Sent Yet'); return; }
      pbShowModal(""")
# A5 also for Lock This Phone (it logs out too)
p.rep("""  window.__debugOb = () => PB_OB;""", """  { const o = window.pbLockThisPhone; /* records_nov22 A5: Lock This Phone logs out too */
    if (typeof o === 'function') window.pbLockThisPhone = async function () {
      if (!sbUser || !pbObIsLink(sbUser)) return o.apply(this, arguments);
      const uid = sbUser.id; let unsent = ''; try { unsent = pbArchiveOwnerUid === uid ? await pbUnsentSentence(uid) : ''; } catch (e) { unsent = ''; }
      if (unsent) { pbShowModal(unsent.replace(/ (It sends|They send) when this account logs in here again\\./, '') + '\\n\\nLet it send before you lock the phone (it needs signal). This account has no email or password: once you log out, nothing on this phone can send until you get back in with a code or a new link from the office.', [{ label: 'See What’s Waiting', onClick: () => window.pbUnsentOpen() }, { label: 'Stay Logged In', primary: true }], 'Not Sent Yet'); return; }
      return o.apply(this, arguments);
    }; }
  window.__debugOb = () => PB_OB;""")
# ---- A6 ----
p.rep("""  window.addEventListener('load', () => { setTimeout(() => { try { if (navigator.storage && navigator.storage.persisted && navigator.storage.persist) navigator.storage.persisted().then(p => { if (!p) return navigator.storage.persist(); }).catch(() => {}); } catch (e) {} }, 4000); }); /* r16.94: keep unsent records from being cleared */""",
"""  window.addEventListener('load', () => { setTimeout(() => { try { if (navigator.storage && navigator.storage.persisted && navigator.storage.persist) navigator.storage.persisted().then(p => p ? true : navigator.storage.persist()).then(r => { window.pbStoreKept = !!r; try { pbUnsentHomeSoon(); } catch (x) {} }).catch(() => {}); } catch (e) {} }, 4000); }); /* r16.94: keep unsent records from being cleared; records_nov22 A6: the answer is kept */""")
p.rep("""    return { id: 'unsent', info: true, html: '<span class="t">Not sent</span>' + escapeHtml(g.map(x => x.short).join(' · ') + '.' + (ch ? ' Tap to choose.' : bad ? ' ' + bad + ' can’t go as ' + (bad === 1 ? 'it is' : 'they are') + '.' : ''))""",
"""    let keep = ''; try { if (window.pbStoreKept === false && !pbObStandalone()) keep = ' Add to Home Screen so this phone keeps your work.'; } catch (x) {} /* records_nov22 A6 */
    return { id: 'unsent', info: true, html: '<span class="t">Not sent</span>' + escapeHtml(g.map(x => x.short).join(' · ') + '.' + (ch ? ' Tap to choose.' : bad ? ' ' + bad + ' can’t go as ' + (bad === 1 ? 'it is' : 'they are') + '.' : '') + keep)""")
p.rep("""        <p class="pb-help" id="settingsLoginHelp"></p>
      </div>""", """        <p class="pb-help" id="settingsLoginHelp"></p>
        <p class="pb-help" id="settingsKeepWork">Don’t delete the app icon while anything shows Not sent. On an iPhone that deletes everything the app saved.</p><!-- records_nov22 A6 -->
      </div>""")
p.rep("""        + '<li>Open the new icon and tap <strong>Paste Join Code</strong>.</li></ol>'""",
"""        + '<li>Open the new icon and tap <strong>Paste Join Code</strong>.</li></ol>'
        + '<p class="pbob-dim" id="pbObKeepWork">Don’t delete the app icon while anything shows Not sent: that deletes what hasn’t sent.</p>' /* records_nov22 A6 */""")
# ---- A7 ----
p.rep("""  async function pbNoteStoreFailure() {
    const ok = await pbRawSetInner('pbSaveProbe', '1');""", """  async function pbNoteStoreFailure(key) {
    const big = pbBigKey(key); /* records_nov22 A7: Records (IndexedDB) or the small store (localStorage) */
    const ok = await pbRawSetInner('pbSaveProbe', '1');""")
p.rep("""    else pbStoreFailInfo.at = now;
    console.error('Save failed (' + kind + '), ref ' + pbStoreFailInfo.ref);""", """    else pbStoreFailInfo.at = now;
    pbStoreFailInfo.big = big;
    console.error('Save failed (' + kind + (big ? ', Records' : '') + '), ref ' + pbStoreFailInfo.ref);""")
p.rep("""  pbRawSet = async function(key, val) { const ok = await pbRawSetInner(key, val); if (!ok && key !== 'pbSaveProbe') await pbNoteStoreFailure(); return ok; };
  pbSet = async function(key, val) { const ok = await pbSetInner(key, val); if (!ok) await pbNoteStoreFailure(); return ok; };""",
"""  pbRawSet = async function(key, val) { const ok = await pbRawSetInner(key, val); if (!ok && key !== 'pbSaveProbe') await pbNoteStoreFailure(key); return ok; };
  pbSet = async function(key, val) { const ok = await pbSetInner(key, val); if (!ok) await pbNoteStoreFailure(key); return ok; };""")
p.rep("""    if (f && f.kind === 'room') return short
      ? 'This app\\u2019s own storage on the phone is out of room \\u2014 delete old runs you don\\u2019t need from Records (deleting phone photos may not help).' + ref
      : 'There isn\\u2019t enough room left in this app\\u2019s own storage on the phone for this save. Deleting your photos or videos usually won\\u2019t free it \\u2014 the app has its own limit. Delete old runs you don\\u2019t need from Records (download a copy first if you need one), then retry. Don\\u2019t clear the app\\u2019s data: that erases what hasn\\u2019t saved.' + ref;""",
"""    if (f && f.kind === 'room' && f.big) return short /* records_nov22 A7: Records lives in the phone's big store, which grows with free space on the phone */
      ? 'The phone is short of space for this app\\u2019s Records. Free up space on the phone (photos, videos, apps you don\\u2019t use), then retry.' + ref
      : 'The phone is short of space for this app\\u2019s Records. Free up space on the phone (photos, videos, apps you don\\u2019t use), then retry. Don\\u2019t clear the app\\u2019s data or delete its icon: that erases what hasn\\u2019t saved.' + ref;
    if (f && f.kind === 'room') return short /* records_nov22 A7: the small store (about 5 MB) holds photos on daily reports, field tickets and permits until they send */
      ? 'This app\\u2019s small storage is full, usually from photos on daily reports, field tickets or permits that haven\\u2019t sent. Let them send (needs signal) or remove photos you don\\u2019t need. Deleting runs won\\u2019t help.' + ref
      : 'This app\\u2019s small storage on the phone is full (about 5 MB, separate from Records). It is usually photos on daily reports, field tickets or permits that haven\\u2019t sent yet. Let them send (needs signal) or remove photos you don\\u2019t need from them, then retry. Deleting runs or phone photos won\\u2019t free it. Don\\u2019t clear the app\\u2019s data: that erases what hasn\\u2019t saved.' + ref;""")
p.rep("""      : 'The phone isn\\u2019t letting this app save anything right now: its storage for the app is completely full, or saving is turned off for it (for example a private/incognito window, or site data blocked). Delete old runs you don\\u2019t need from Records, or open the app in a normal window, then retry.""",
"""      : 'The phone isn\\u2019t letting this app save anything right now: its storage for the app is completely full, or saving is turned off for it (for example a private/incognito window, or site data blocked). Free up space on the phone, or open the app in a normal window, then retry.""")
p.rep("""    return short ? 'Retry in a moment.' : 'Retry in a moment. If it keeps failing, delete old runs you don\\u2019t need from Records. Don\\u2019t clear the app\\u2019s data: that erases what hasn\\u2019t saved.';""",
"""    return short ? 'Retry in a moment.' : 'Retry in a moment. If it keeps failing, free up space on the phone. Don\\u2019t clear the app\\u2019s data: that erases what hasn\\u2019t saved.';""")
p.save()
