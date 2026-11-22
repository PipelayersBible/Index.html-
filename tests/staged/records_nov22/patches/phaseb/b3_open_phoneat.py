# records_nov22 B3 (app half, goes with sql/b3_permit_first_seen.sql): the open-permit backup carries the phone's clock
# time when it is sent (phoneAt), so the server can keep the phone-vs-server clock difference onto the closed permit.
# Added after the app's own change hash is taken, so it never makes an unchanged permit send again.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
p.rep("""      if (!(await pbLiveSessionIs(uid)) || !sbUser || sbUser.id !== uid || !confinedPermit || confinedPermit.sessionId !== sid) return;
      const r = await pbPermitRpc('pb_permit_open_put',""", """      if (!(await pbLiveSessionIs(uid)) || !sbUser || sbUser.id !== uid || !confinedPermit || confinedPermit.sessionId !== sid) return;
      snap.phoneAt = new Date().toISOString(); /* records_nov22 B3: after the change hash */
      const r = await pbPermitRpc('pb_permit_open_put',""")
p.save()
