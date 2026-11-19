#!/usr/bin/env python3
# speed2 #54 (Tommy, Nov 18: "raise the limit to match how Records is stored now"). The "Records is getting large (...
# of about 5 MB total)" alert dates from when Records lived in localStorage (about 5 MB on an iPhone). Since r16.47
# Records lives in IndexedDB, and since speed2 #52 its photos are stored apart, so the text size says nothing about room:
# anyone with a few photos got a false "getting full / will stop saving" alert on the first save of every session.
# Now, when Records is in IndexedDB, the warning is based on the browser's own figures (navigator.storage.estimate):
# shown once per session when this app's storage is 85 % used or has less than 100 MB left. Where the browser can't say
# (no estimate), nothing is shown. Records still in localStorage (no IndexedDB on that phone): the old 4 MB rule and
# wording, which are still true there. Checked at most every 10 minutes, after the save (never delays it).
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

rep("""      if (result.sizeMB > 4 && !archiveSizeWarningShown) {
        archiveSizeWarningShown = true;
        pbAlert('Records is getting large (' + result.sizeMB.toFixed(1) + ' MB of about 5 MB total). Once it\\u2019s full, new runs will stop saving. Consider deleting old runs you don\\u2019t need from Records screen.', 'Records Getting Full');
      }""",
"""      pbRecordsRoomCheck(result.sizeMB, saveUid); // speed2 #54: not awaited
""")

rep("""  let archiveSizeWarningShown = false;""",
"""  let archiveSizeWarningShown = false;
  // speed2 #54: is the phone's storage for this app getting full? (see 04_records_room_warning.py)
  let pbRoomCheckAt = 0;
  const PB_ROOM_PCT = 0.85, PB_ROOM_LEFT = 100 * 1048576;
  async function pbRecordsRoomCheck(sizeMB, uid) {
    if (archiveSizeWarningShown || Date.now() - pbRoomCheckAt < 600000) return;
    pbRoomCheckAt = Date.now();
    let inIdb = false; try { inIdb = localStorage.getItem(pbBigMark(uid + ':runArchive')) === '1'; } catch (e) {}
    if (!inIdb) { // Records in localStorage: its ~5 MB limit is real
      if (sizeMB > 4) { archiveSizeWarningShown = true; pbAlert('Records is getting large (' + sizeMB.toFixed(1) + ' MB of about 5 MB total). Once it\\u2019s full, new runs will stop saving. Consider deleting old runs you don\\u2019t need from Records screen.', 'Records Getting Full'); }
      return;
    }
    let est = null; try { if (navigator.storage && navigator.storage.estimate) est = await navigator.storage.estimate(); } catch (e) { est = null; }
    if (!est || !(est.quota > 0) || typeof est.usage !== 'number') return; // the browser can't say: no guess
    const pct = est.usage / est.quota, left = Math.max(0, est.quota - est.usage);
    if (pct < PB_ROOM_PCT && left > PB_ROOM_LEFT) return;
    archiveSizeWarningShown = true;
    pbAlert('This phone\\u2019s storage for the app is getting full (' + Math.round(pct * 100) + '% used, about ' + Math.round(left / 1048576) + ' MB left). Once it\\u2019s full, new runs will stop saving. Delete old runs you don\\u2019t need from Records' + (typeof pbPhClearDays === 'function' && pbPhClearDays() ? ', or clear phone copies of photos already sent' : '') + '.', 'Records Getting Full');
  }""")

open(out, 'w', encoding='utf-8').write(s)
print('ok', out)
