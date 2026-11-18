# 05: a stake read refused for the daily limit, the plan or the login keeps the photo on the point (as a no-signal
# read already does), so the run report still has the stake photo. Try Again stays for the signal / server cases only.
import sys
s=open(sys.argv[1],encoding='utf-8').read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""      pbAiShow(stNow, 'warn', 'Stake not read.', r.message + (net ? ' The photos are kept on this point.' : ' Nothing on this point was changed.'));
      if (net) {""",
"""      const keepOnly = !net && /^(daily_limit|plan|signed_out)$/.test(r.code || ''); /* bughunt 05: no read, but the photo taken at the stake stays with the point */
      pbAiShow(stNow, 'warn', 'Stake not read.', r.message + (net ? ' The photos are kept on this point.' : keepOnly ? ' The photo is kept on this point. Type the values from the stake.' : ' Nothing on this point was changed.'));
      if (keepOnly) pbStakeAiKeepPhotos(prefix, ctx, only === 'back' ? [null, img] : [img, back]);
      if (net) {""")
open(sys.argv[2],'w',encoding='utf-8').write(s)
