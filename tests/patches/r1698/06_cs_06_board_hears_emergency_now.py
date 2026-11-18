import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# cs2 06: the EMERGENCY push to the foreman / office goes out at once (the open-permit upload, pbEmPushNow), and it opens
# the company "Live now" board. The board reads the live status, which the phone only sent on its 60-second tick: for up
# to a minute the board opened from the EMERGENCY push showed the permit with no emergency. The status is now sent right
# after the declaration (and after the incident is ended) is saved, after the call hand-off; nothing waits on it.
rep("""      else { try { pbEmPushNow(); } catch (e) {} } /* feat_emlink S6: the declaration goes up at once, after the dial and the save */""",
    """      else { try { pbEmPushNow(); } catch (e) {} try { if (typeof window.__pbLivePermitTick === 'function') window.__pbLivePermitTick(); } catch (e) {} } /* feat_emlink S6: the declaration goes up at once, after the dial and the save; cs2 06: the live board too */""")
rep("""        if (!savedOk) showConfinedEmergencySaveFailure('dismiss', sid, incident);
        else pbClearSavedOutcomeNote();""",
    """        if (!savedOk) showConfinedEmergencySaveFailure('dismiss', sid, incident);
        else { pbClearSavedOutcomeNote(); try { if (typeof window.__pbLivePermitTick === 'function') window.__pbLivePermitTick(); } catch (e) {} } // cs2 06""")
open(out, 'w', encoding='utf-8').write(s)
