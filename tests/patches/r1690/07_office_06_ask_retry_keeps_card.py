# 06: Ask Retry: when the retried request fails before any words arrive (no signal, limit, login), the "Not finished"
# card goes back where it was, with the new reason, instead of disappearing with the question.
import sys
s=open(sys.argv[1],encoding='utf-8').read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""      if (retryEntry) { const ri = pbAiAskHistory.indexOf(retryEntry); if (ri >= 0) { pbAiAskHistory.splice(ri, 1); pbAiAskRender(); } } // r15.99: the unfinished card goes once the new request starts""",
"""      let retryAt = -1; /* bughunt 06: where the unfinished card was, so it can go back if this try fails before any words */
      if (retryEntry) { const ri = pbAiAskHistory.indexOf(retryEntry); if (ri >= 0) { retryAt = ri; pbAiAskHistory.splice(ri, 1); pbAiAskRender(); } } // r15.99: the unfinished card goes once the new request starts""")
rep("""      if (!r.ok) { pbAiShow(st, r.code === 'canceled' ? 'info' : 'warn', r.message, '');""",
"""      if (!r.ok && !live && retryEntry && retryAt >= 0 && pbAiAskHistory.indexOf(retryEntry) < 0) { if (r.code !== 'canceled') retryEntry.failed = r.message; pbAiAskHistory.splice(Math.min(retryAt, pbAiAskHistory.length), 0, retryEntry); pbAiAskRender(); } /* bughunt 06 */
      if (!r.ok) { pbAiShow(st, r.code === 'canceled' ? 'info' : 'warn', r.message, '');""")
open(sys.argv[2],'w',encoding='utf-8').write(s)
