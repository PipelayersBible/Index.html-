# 03: the beta line works its days out from trial_ends_at each time it is drawn (a kept or old answer no longer shows a
# stale "N days left"), and the plan is asked again when the app comes back to the front (at most every 10 minutes).
import sys
s=open(sys.argv[1],encoding='utf-8').read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""    function pbBetaRender() {
      const beta = !!(plan && plan.plan === 'trial'), ended = beta && !!plan.expired;""",
"""    function pbBetaRender() {
      const beta = !!(plan && plan.plan === 'trial');
      const endMs = beta && plan.trial_ends_at ? new Date(plan.trial_ends_at).getTime() : NaN; /* bughunt 03: the end date decides, not a count read days ago */
      const ended = beta && (!!plan.expired || (Number.isFinite(endMs) && endMs <= Date.now()));
      const daysLeft = Number.isFinite(endMs) ? Math.max(1, Math.ceil((endMs - Date.now()) / 864e5)) : (plan && plan.days_left) || 0;""")
rep("""          if (!ended) line.innerHTML = '<span class="pb-beta-chip">Beta</span><span>' + (plan.days_left === 1 ? '1 day left' : (plan.days_left || 0) + ' days left') + '</span>';""",
"""          if (!ended) line.innerHTML = '<span class="pb-beta-chip">Beta</span><span>' + (daysLeft === 1 ? '1 day left' : daysLeft + ' days left') + '</span>';""")
rep("""    async function pbPlanLoad() {
      if (!sbUser) { plan = null; pbBetaRender(); return; }
      try { plan = JSON.parse(localStorage.getItem(planKey()) || 'null'); } catch (e) { plan = null; }
      pbBetaRender();
      if (!sbClient || typeof sbClient.rpc !== 'function' || navigator.onLine === false) return;
      try {""",
"""    let planAt = 0; /* bughunt 03: when the server was last asked */
    async function pbPlanLoad(again) {
      if (!sbUser) { plan = null; pbBetaRender(); return; }
      if (!again || !plan) { try { plan = JSON.parse(localStorage.getItem(planKey()) || 'null'); } catch (e) { plan = null; } }
      pbBetaRender();
      if (!sbClient || typeof sbClient.rpc !== 'function' || navigator.onLine === false) return;
      planAt = Date.now();
      try {""")
rep("""    window.pbAccountLoadHooks.push(() => { plan = null; setTimeout(() => { pbPlanLoad(); useFlush(); }, 2000); });""",
"""    window.pbAccountLoadHooks.push(() => { plan = null; setTimeout(() => { pbPlanLoad(); useFlush(); }, 2000); });
    /* bughunt 03: back to the front (or back online): ask again, at most every 10 minutes, so an extended or paid plan (or an ended one) shows without restarting the app */
    const planAgain = () => { try { if (sbUser && document.visibilityState !== 'hidden' && planAt && Date.now() - planAt > 600000) pbPlanLoad(true); else pbBetaRender(); } catch (e) {} };
    document.addEventListener('visibilitychange', planAgain); window.addEventListener('online', planAgain);""")
open(sys.argv[2],'w',encoding='utf-8').write(s)
