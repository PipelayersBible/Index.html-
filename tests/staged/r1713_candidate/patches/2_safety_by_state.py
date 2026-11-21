# r17.13 item 2 (a)-(c): safety wording by state (Tommy approved Nov 20). python3 2_safety_by_state.py in.html out.html
#  (a) "Report a serious injury" by state: the state Rules view, the Job Book's safety event form, and the confined
#      space emergency panel. State: the job's state first, then the company's (the app's own pbSrJobState / the
#      permit's pbCpRuleState). Not known: the federal times plus "report within 8 hours to be safe" (strictest wins).
#      Sources (all read Nov 20 2026, tests/staged/lib_osha_nov20): 29 CFR 1904.39; CA 8 CCR 342; WA WAC 296-27-031;
#      UT R614-1-5; AK AS 18.60.058; HI HAR 12-52.1-1; OR OAR 437-001-0704; MI R 408.22139; VA Va. Code 40.1-51.1;
#      KY 803 KAR 2:181 (eff. Feb 3 2026). Other state plans: not read, so "report within 8 hours to be safe".
#  (b) Heat Illness talk (TT-036): Oregon and Maryland count the heat index, Washington and California the air
#      temperature; Oregon's written rest-break schedule from a heat index of 90; Nevada's written heat hazard
#      analysis. OAR 437-002-0156; COMAR 09.12.32; lni.wa.gov/HeatSmart; 8 CCR 3395; Nevada R131-24.
#  (c) Washington: guardrails on walkways 4 ft or more above lower levels (WAC 296-155-655(12)); federal is 6 ft
#      (29 CFR 1926.651(l)). In talks TT-046 and TT-066 and the Washington trench line of the state table.
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

# ---------------- (a) the table and the line ----------------
p.rep('''GA and ND untouched. */
  window.PB_STATE_RULES = PB_SR;
''', '''GA and ND untouched. */
  window.PB_STATE_RULES = PB_SR;
  /* r17.13: "Report a serious injury" by state. Federal: 29 CFR 1904.39 (8 h death; 24 h in-patient hospital stay,
     amputation, eye loss). Stricter or different state plans, each read Nov 20 2026 (tests/staged/lib_osha_nov20):
     CA 8 CCR 342, WA WAC 296-27-031, UT R614-1-5, AK AS 18.60.058, HI HAR 12-52.1-1, OR OAR 437-001-0704,
     MI R 408.22139, VA Va. Code 40.1-51.1, KY 803 KAR 2:181. A state plan not listed was not read: the line says to
     report within 8 hours to be safe (strictest wins). No state known: the same. */
  const PB_INJ = {
    CA: 'The company reports it to Cal/OSHA within 8 hours for any serious injury or illness, or a death (8 CCR 342).',
    WA: 'The company reports it to L&I (1-800-423-7233) within 8 hours for a death or any hospital stay, and within 24 hours for an amputation or a lost eye (WAC 296-27-031).',
    UT: 'The company reports it to Utah OSHA (801-530-6901) within 8 hours for a death or any serious injury, including a hospital stay, an amputation or a lost eye (R614-1-5).',
    AK: 'The company reports it to Alaska OSH within 8 hours for a death, a hospital stay, an amputation or a lost eye (AS 18.60.058).',
    HI: 'The company reports it to HIOSH (808-586-9102) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation (fingertips count), a lost eye, or property damage over $25,000 (HAR 12-52.1-1).',
    OR: 'The company reports it to Oregon OSHA within 8 hours for a death or a catastrophe, and within 24 hours for a hospital stay, an amputation (fingertips count) or a lost eye (OAR 437-001-0704).',
    MI: 'The company reports it to MIOSHA within 8 hours for a death (1-800-858-0397), and within 24 hours for a hospital stay, an amputation or a lost eye (1-844-464-6742) (R 408.22139).',
    VA: 'The company reports it to VOSH within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (Va. Code 40.1-51.1).',
    KY: 'The company reports it to Kentucky OSH or OSHA (1-800-321-6742) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (803 KAR 2:181).'
  };
  const PB_INJ_FED = 'The company reports it to OSHA (1-800-321-6742) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (29 CFR 1904.39).';
  const PB_INJ_NONE = 'The company reports it: within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (OSHA 1-800-321-6742). Some states want 8 hours for any serious injury. The job’s state isn’t known: report within 8 hours to be safe.';
  // code: a state in the table, or '' / null (not known). Returns the plain sentence(s), no HTML.
  function pbInjuryLine(code) {
    const R = pbSrRow(code);
    if (!R) return PB_INJ_NONE;
    if (Object.prototype.hasOwnProperty.call(PB_INJ, code)) return PB_INJ[code];
    if (R.osha === 'state') return 'The company reports it to ' + R.osha_name + ' within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye. We haven’t checked ' + R.name + '’s own rule: report within 8 hours to be safe.';
    return PB_INJ_FED; // federal OSHA (or a plan for public workers only: private crews are under federal OSHA)
  }
  // the job's state, then the company's; '' when neither is known (the table's California default is not knowledge)
  function pbInjuryState(jobNumber) {
    try { const s = pbSrJob(jobNumber ? pbDlyKey(jobNumber) : '', jobNumber || ''); return s && s.how !== 'default' && pbSrOk(s.code) ? s.code : ''; } catch (e) { return ''; }
  }
  window.pbInjuryLine = pbInjuryLine; window.pbInjuryState = pbInjuryState;
''')

# the Rules view: a section after OSHA
p.rep('''      + sec('OSHA', escapeHtml(R.osha_name || (R.osha === 'state' ? 'State OSHA plan' : 'Federal OSHA')), 'osha')
''', '''      + sec('OSHA', escapeHtml(R.osha_name || (R.osha === 'state' ? 'State OSHA plan' : 'Federal OSHA')), 'osha')
      + sec('Report a serious injury', escapeHtml('Call 911 first. ' + pbInjuryLine(code)), 'inj') /* r17.13 */
''')

# the Job Book's safety event form: under its note, by the job's state
p.rep('''    if (K.note) h += '<p class="pbd-dim" id="jbFormNote">' + escapeHtml(K.note) + '</p>';
''', '''    if (K.note) h += '<p class="pbd-dim" id="jbFormNote">' + escapeHtml(K.note) + '</p>';
    if (F.kind === 'safety') { let c = ''; try { c = window.pbInjuryState((pbJb.job && pbJb.job.job_number) || ''); } catch (e) { c = ''; } /* r17.13: by the job's state, then the company's */
      h += '<p class="pbd-dim pb-inj" id="jbFormInj"><strong>Report a serious injury</strong> ' + escapeHtml('Call 911 first. ' + window.pbInjuryLine(c)) + '</p>'; }
''')

# the confined space emergency panel: a line at the top of "Send Incident Report"
p.rep('''        <div class="pb-tag">Send Incident Report</div>
        <div class="pb-body">
''', '''        <div class="pb-tag">Send Incident Report</div>
        <div class="pb-body">
          <p class="pb-help pb-inj" id="cpEmInjury" style="margin-top:0;"><strong>Report a serious injury</strong> <span id="cpEmInjuryText">The company reports it: within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (OSHA 1-800-321-6742). Some states want 8 hours for any serious injury. The job’s state isn’t known: report within 8 hours to be safe.</span></p>
''')
p.rep('''    document.getElementById('cpEmergencyNumDisplay').textContent = pbDialNumberNow(); // what the button dials
''', '''    document.getElementById('cpEmergencyNumDisplay').textContent = pbDialNumberNow(); // what the button dials
    try { const P0 = confinedPermit || {}, c = P0.ruleState || (typeof window.pbCpRuleState === 'function' ? window.pbCpRuleState(P0.address || '', P0.jobNumber || '') : ''); /* r17.13: the site's state, then the job's / company's */
      document.getElementById('cpEmInjuryText').textContent = window.pbInjuryLine(c); } catch (e) {}
''')

# ---------------- (b) the Heat Illness talk; (c) walkways ----------------
p.rep('''State heat rules (follow the strictest you work under): at least 1 quart of water per person per hour for the whole shift; shade up from 80°F (from 52°F in nonbreathable suits in Washington); high-heat steps from 90°F (Washington, Oregon, Maryland) or 95°F (California): watch each other, check in by radio, pre-shift reminder; rest at least 10 minutes every 2 hours from 90°F and 15 minutes every hour from 100°F (Washington, Maryland); anyone who asks gets a cool-down rest of at least 5 minutes in the shade (California); a new worker is watched closely for the first 14 days.",''',
'''State heat rules (follow the strictest you work under): at least 1 quart of water per person per hour for the whole shift; shade up from 80°F (from 52°F in nonbreathable suits in Washington); high-heat steps from 90°F (Washington, Oregon, Maryland) or 95°F (California): watch each other, check in by radio, pre-shift reminder; rest at least 10 minutes every 2 hours from 90°F and 15 minutes every hour from 100°F (Washington, Maryland); a written rest-break schedule from 90°F (Oregon); anyone who asks gets a cool-down rest of at least 5 minutes in the shade (California); a new worker is watched closely for the first 14 days.","Oregon and Maryland go by the heat index (heat plus humidity), not the air temperature. On a humid day the heat index runs higher, so their steps start sooner. Washington and California go by the air temperature.","Nevada sets no temperature: companies with more than 10 workers write up the heat hazards for each job and plan water, rest and cooling.",''')
p.rep('''Maryland COMAR 09.12.32",''', '''Maryland COMAR 09.12.32; Nevada R131-24",''')
p.rep('''"Walkways over trenches need guardrails if they are 6 ft or more above the lower level.",''',
      '''"Walkways over trenches need guardrails if they are 6 ft or more above the lower level. Washington: from 4 ft.",''')
p.rep('''Walkways 6 ft or more above the lower level need guardrails.",''',
      '''Walkways 6 ft or more above the lower level need guardrails. Washington: from 4 ft (WAC 296-155-655(12)).",''')
n = p.s.count('"29 CFR 1926.651(l) (walkways)",')
assert n == 2, n
p.s = p.s.replace('"29 CFR 1926.651(l) (walkways)",', '"29 CFR 1926.651(l) (walkways); Washington WAC 296-155-655(12)",')

# the Washington trench line in the state table (shown in Rules for Washington and under Trench Sloping)
old_wa = '''and a competent person on site during trench work."}'''
assert p.s.count(old_wa) == 1
p.rep(old_wa, '''and a competent person on site during trench work. Guardrails on walkways 4 ft or more above lower levels (WAC 296-155-655(12))."}''')

# a little room for the new line
p.rep('''.pb-help { font-size: 11.5px; color: var(--ink-soft); margin-top: 5px; line-height: 1.4; }''',
'''.pb-help { font-size: 11.5px; color: var(--ink-soft); margin-top: 5px; line-height: 1.4; }
.pb-inj strong { display: block; }''')
p.save()
