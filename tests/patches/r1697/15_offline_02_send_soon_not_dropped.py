import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# offline audit 02 (Nov 17, on r16.95) [low]: r16.95's "company copy follows in seconds" (pbRrSendSoon ~4 s after Lock
# and after each laid mark) is dropped when a send is already going: pbRrSend returns at once on pbRr.busy and nothing
# runs it again, so on a slow bar of signal (a pass takes seconds) the newest laid mark waits for the 60 s timer
# (44 s in rig/t03_burst.js instead of ~5-10 s). The live status queue (pbLiveSend) drops a nudge the same way.
# Fix: a nudge that finds a send going is remembered, and that send runs once more right after it ends.
rep("""    if (!uid || uid === 'shared' || pbRr.busy || archiveLoadFailed) return;""",
    """    if (pbRr.busy) { pbRr.more = true; return; } /* offline audit 02: runs again right after the send going now */
    if (!uid || uid === 'shared' || archiveLoadFailed) return;""")
rep("""    } finally { pbRr.busy = false; if (again) pbRrSoon(5000); }""",
    """    } finally { pbRr.busy = false; const more = !!pbRr.more; pbRr.more = false; if (more) pbRrSoon(1500); else if (again) pbRrSoon(5000); } /* offline audit 02 */""")
rep("""    if (!uid || !q || pbLiveQ.busy || !Object.keys(q.pending).length) return;""",
    """    if (pbLiveQ.busy) { pbLiveQ.more = true; return; } /* offline audit 02 */
    if (!uid || !q || !Object.keys(q.pending).length) return;""")
rep("""    finally { pbLiveQ.busy = false; if (again) pbLiveSendSoon(Math.max(5000, pbLiveQ.pauseUntil - Date.now() + 500)); }""",
    """    finally { pbLiveQ.busy = false; const more = !!pbLiveQ.more; pbLiveQ.more = false; if (again) pbLiveSendSoon(Math.max(5000, pbLiveQ.pauseUntil - Date.now() + 500)); else if (more) pbLiveSendSoon(1500); } /* offline audit 02 */""")
open(out, 'w', encoding='utf-8').write(s)
