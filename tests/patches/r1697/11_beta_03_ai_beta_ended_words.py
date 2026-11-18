import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# beta audit 03: when a beta has ended, the server gives every AI feature a limit of 0 (ai_try_consume returns -1 for an
# expired trial, ai_feature_limit = 0), so stake reads and Ask answer 429 and the app said "You've hit today's limit. It
# resets tomorrow." It doesn't reset tomorrow: the foreman retries every morning. With the plan the app already has
# (pb_my_plan: an ended trial and no individual plan) it now says the beta ended and what brings it back.
rep("""    daily: () => 'You’ve hit today’s limit. It resets tomorrow.', // v20: one line, whichever allowance ran out""",
    """    daily: () => 'You’ve hit today’s limit. It resets tomorrow.', // v20: one line, whichever allowance ran out
    betaEnded: 'The beta has ended, so AI reading is off until your company starts a plan. Everything else still works.', // beta audit 03""")
rep("""    if (st === 429) { const lim = Number(j && j.limit) || (pbAiQuota && pbAiQuota.limit) || 20; if (!(j && j.mode === 'analysis')) pbAiQuota = { left: 0, limit: lim }; return { ok: false, code: 'daily_limit', message: PB_AI_MSG.daily(lim) }; }""",
    """    if (st === 429) { const lim = Number(j && j.limit) || (pbAiQuota && pbAiQuota.limit) || 20; if (!(j && j.mode === 'analysis')) pbAiQuota = { left: 0, limit: lim };
      { let bp = null; try { bp = typeof window.pbPlanNow === 'function' ? window.pbPlanNow() : null; } catch (e) { bp = null; } /* beta audit 03: an ended beta is not "today's limit" */
        const endMs = bp && bp.plan === 'trial' && bp.trial_ends_at ? new Date(bp.trial_ends_at).getTime() : NaN;
        if (bp && bp.plan === 'trial' && !bp.individual && (bp.expired || (Number.isFinite(endMs) && endMs <= Date.now()))) return { ok: false, code: 'daily_limit', ended: true, message: PB_AI_MSG.betaEnded }; } /* same code: every caller treats it as the limit (not a signal problem) */
      return { ok: false, code: 'daily_limit', message: PB_AI_MSG.daily(lim) }; }""")
open(out, 'w', encoding='utf-8').write(s)
