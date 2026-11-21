# State audit Nov 21 (specs_permits) patch 1: the water / sewer crossing check follows the JOB's state.
# Before: every crossing of water and sewer (or storm / recycled) was checked against California Title 22 (water at least
# 1 ft ABOVE) in every state, and the warning said "Title 22" on a Texas or Ohio job.
# After: the job's state picks the rule; the warning names it.
#   CA  22 CCR 64572(d): water crosses at least 1 ft ABOVE sewer, recycled water or storm drain (law.cornell.edu, read 2026-11-21).
#   TX  30 TAC 290.44(e)(4)(B) (amended eff. 2023-12-21): water ABOVE wastewater; 2 ft over non-pressure-rated pipe, 6 in over
#       pressure-rated (force main). Storm and reclaimed lines are not in this rule: the crossing's own minimum is used.
#   FL  F.A.C. 62-555.314(2) (amended eff. 2025-02-26): gravity / vacuum sewer or storm sewer: water at least 6 in above
#       (12 preferred) or at least 12 in below; force main, pressure sewer, reclaimed: at least 12 in above or below.
#   MT  DEQ-1 (2022) 8.8.3: 18 in between water and sewer, outside to outside.
#   any other state, or state not known: Ten States Standards (Recommended Standards for Wastewater Facilities 2014, 38.32):
#       18 in between water main and sewer, water above or below; the line says to check that state's own rule.
# The state: the run's job number (saved run) or Run Setup's job number, through pbSrJobState (picked for the job, in its
# address, or the company's state). The 'default' answer (CA) is NOT used: then the Ten States line with "state not known".
# Every warning keeps the user's own "Min. clearance" box: the larger of the two wins.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

p.rep('''  function pbXingT22Text(o) { return o.t22 === 'utilAbove' ? 'Title 22: water must cross at least 1 ft above the sewer. This water line is below your pipe.' : 'Title 22: water must cross at least 1 ft above the ' + pbXingUtil(o.cx) + '. Your water pipe is below it.'; }''',
'''  /* state audit Nov 21: water / sewer crossings by the job's state. above / below: least clearance in inches with the water
     line above / below the other pipe; null = not allowed (water must go on top). */
  const PB_XING_PRESS = /force ?main|\\bfm\\b|pressure|reclaimed|recycled/i, PB_XING_STORM = /storm|\\bsd\\b/i;
  function pbXingSepRule(code, cx, t22) {
    const mine = t22 === 'utilAbove', u = mine ? '' : String((cx && cx.util) || ''), other = mine ? 'sewer' : pbXingUtil(cx); // utilAbove: the sewer side is our own pipe
    const press = PB_XING_PRESS.test(u), storm = PB_XING_STORM.test(u) && !/sewer|sanitary|\\bss\\b|waste/i.test(u);
    if (code === 'CA') return { code, above: 12, below: null, tag: 'Title 22 (California)', words: 'water must cross at least 1 ft above the ' + other };
    if (code === 'TX') { if (storm || /reclaimed|recycled/i.test(u)) return null;
      return press ? { code, above: 6, below: null, tag: 'Texas rule (TCEQ 290.44)', words: 'water crosses above the sewer, at least 6 in over pressure-rated pipe' }
        : { code, above: 24, below: null, tag: 'Texas rule (TCEQ 290.44)', words: 'water crosses above the sewer, at least 2 ft over gravity sewer pipe (6 in only over pressure-rated pipe)' }; }
    if (code === 'FL') return press ? { code, above: 12, below: 12, tag: 'Florida rule (62-555.314)', words: 'at least 12 in between the water main and a force main, pressure sewer or reclaimed line' }
      : { code, above: 6, below: 12, tag: 'Florida rule (62-555.314)', words: 'water main at least 6 in above (12 in preferred) or 12 in below the ' + other };
    if (code === 'MT') return { code, above: 18, below: 18, tag: 'Montana rule (DEQ-1 8.8.3)', words: 'at least 18 in between water and sewer at a crossing' };
    let nm = ''; try { const SR = window.PB_STATE_RULES && window.PB_STATE_RULES.states; nm = code && SR && SR[code] ? SR[code].name : ''; } catch (e) { nm = ''; }
    return { code: code || '', above: 18, below: 18, tag: 'Ten States Standards', words: 'at least 18 in between water and sewer at a crossing, water on top preferred. ' + (nm ? 'Check ' + nm + '\\u2019s own rule' : 'Job state not known: check your state\\u2019s rule') };
  }
  function pbXingState(entry) {
    let num = String((entry && entry.jobNumber) || '').trim();
    if (!num && entry && entry.setup) { try { num = String((document.getElementById('saJobNumber') || {}).value || '').trim(); } catch (e) { num = ''; } }
    let s = null; try { s = typeof window.pbSrJobState === 'function' ? window.pbSrJobState(num) : null; } catch (e) { s = null; }
    return s && s.how !== 'default' && typeof s.code === 'string' && /^[A-Z]{2}$/.test(s.code) ? s.code : '';
  }
  window.pbXingSepRule = pbXingSepRule; window.pbXingState = pbXingState;
  function pbXingT22Text(o) {
    const S = o.sep; if (!S) return o.t22 === 'utilAbove' ? 'Water must cross above the sewer. This water line is below your pipe.' : 'Water must cross above the ' + pbXingUtil(o.cx) + '. Your water pipe is below it.';
    const where = S.need === null ? (o.t22 === 'utilAbove' ? ' This water line is below your pipe.' : ' Your water pipe is below it.') : '';
    return S.R.tag + ': ' + S.R.words + '.' + where;
  }''')

p.rep('''      const t22 = pbXingT22(entry, cx); /* xing22 */
      if (t22) { min = Math.max(min, 12); if (o.pos === (t22 === 'utilAbove' ? 'below' : 'above')) o.t22 = t22; }''',
'''      const t22 = pbXingT22(entry, cx); /* xing22; state audit Nov 21: the job's state picks the rule */
      const R = t22 ? pbXingSepRule(xState, cx, t22) : null;
      if (R && (o.pos === 'above' || o.pos === 'below')) {
        const up = o.pos === (t22 === 'utilAbove' ? 'above' : 'below'), need = up ? R.above : R.below;
        min = Math.max(min, need === null ? R.above : need);
        if (need === null || (o.clrFt !== null && o.clrFt * 12 < need - 1e-6)) { o.t22 = t22; o.sep = { R, need }; }
      }''')

# the state is worked out once per pbXingInfo call (not once per crossing)
p.rep('''    const rows = entry.intervalRows || [], eps = 1e-6;
    return L.map(cx => {
      const run = cx ? runs.find(x => x.n === cx.run) || null : null;''',
'''    const rows = entry.intervalRows || [], eps = 1e-6, xState = pbXingState(entry); /* state audit Nov 21 */
    return L.map(cx => {
      const run = cx ? runs.find(x => x.n === cx.run) || null : null;''')

# Run Setup's own check (live line, Check Before Locking) reads the job number typed on Run Setup
p.rep('''    return { distance: calc.totalDist, pipeType: (document.getElementById('runPipeType') || {}).value || '', crossings:''',
'''    return { setup: true, distance: calc.totalDist, pipeType: (document.getElementById('runPipeType') || {}).value || '', crossings:''')

p.rep('''     main over the crossing's sewer/storm/recycled line; null: no Title 22 rule (gas, electric, telecom, water/water ...) */''',
'''     main over the crossing's sewer/storm/recycled line; null: no water / sewer rule (gas, electric, telecom, water/water ...).
     Which rule and how much clearance: pbXingSepRule, by the job's state (state audit Nov 21). */''')
p.save()
