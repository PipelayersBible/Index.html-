# 01: a beta (trial) company's plan set is parked by the server (pb_plans_uploaded -> { ok, parked: true }).
# The status line must not promise that Ask reads it.
import sys
s=open(sys.argv[1],encoding='utf-8').read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""      if (!u.ok) return { stop: u.line };
      return Object.assign({ sent: true }, rep);""",
"""      if (!u.ok) return { stop: u.line };
      return Object.assign({ sent: true, parked: !!(u.data && u.data.parked) }, rep); /* bughunt 01: a beta company's set waits for a paid plan */""")
rep("""    const reports = [], sent = [], already = []; let stop = '';""",
"""    const reports = [], sent = [], already = []; let stop = '', parkedN = 0;""")
rep("""        if (r.sent) sent.push(pdfs[k].name);""",
"""        if (r.sent) { sent.push(pdfs[k].name); if (r.parked) parkedN++; }""")
rep("""(sent.length > 1 ? sent.length + ' plan sets sent.' : 'Sent.') + ' Ask can use each sheet as soon as it’s read.' : '')""",
"""(sent.length > 1 ? sent.length + ' plan sets sent.' : 'Sent.') + (parkedN ? ' You can open the sheets now. Plan reading for Ask starts with a paid plan.' : ' Ask can use each sheet as soon as it’s read.') : '')""")
open(sys.argv[2],'w',encoding='utf-8').write(s)
