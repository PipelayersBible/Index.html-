# state_audit_nov21/safety p5: confined space permit rule line.
# python3 p5_permit_rules.py in.html out.html   (applies alone on r17.13)
#  - Michigan: Construction Part 35 (R 408.43501, .43505, .43510) adopts 29 CFR 1926.1202-.1212 by reference; the
#    permit items are the federal ones. Read Nov 20 2026: https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-408-43501
#    and the Part 35 rule list (3 rules: scope, documents, adopted standards). Part 35 does not cover work under Part 9
#    (excavation), Part 14 (tunnels), Part 504, Part 665.
#  - California: "Confined Spaces in Construction" rulemaking, effective Jan 1 2026 (FSOR updated Sept 18 2025):
#    1952(a)(1) a competent person surveys the work area for confined spaces when work begins; 1960(a) standby
#    personnel trained, equipped and available to rescue. https://dir.ca.gov/OSHSB/Confined-Spaces-in-Construction.html
#    Shown on the FORM only (pbCpRuleText(code, true)); the permit PDF keeps the item line it always printed, so an
#    old permit's PDF does not change.
#  - Maryland: MOSH lists 1926.1201-1213 with no Maryland supplement (labor.maryland.gov/labor/mosh/moshspecific.shtml);
#    federal, no change.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep('''  const PB_CP_RULES = { checked: '2026-11-19', fed: '29 CFR 1926.1206', states: {
    CA: { name: 'California', cite: '8 CCR 1955' },''', '''  // state_audit_nov21/safety (Nov 20 2026): Michigan Part 35 adopts 1926.1202-.1212; California's Jan 1 2026 changes
  // (8 CCR 1952(a)(1) survey, 1960(a) rescue standby) as a form note. Maryland: no supplement (MOSH list).
  const PB_CP_RULES = { checked: '2026-11-20', fed: '29 CFR 1926.1206', states: {
    CA: { name: 'California', cite: '8 CCR 1955', note: 'California, since Jan 1, 2026: a competent person checks the work area for confined spaces when work starts, and rescue standby must be trained, equipped and ready (8 CCR 1952(a), 1960(a)).' },
    MI: { name: 'Michigan', cite: 'MIOSHA Part 35 (adopts 29 CFR 1926.1202-.1212)' },''')
p.rep('''  function pbCpRuleText(code) {
    const s = code && Object.prototype.hasOwnProperty.call(PB_CP_RULES.states, code) ? PB_CP_RULES.states[code] : null;
    let t = 'Permit items: federal OSHA ' + PB_CP_RULES.fed + (s ? ' and ' + s.name + ' ' + s.cite : '') + '.';''',
'''  function pbCpRuleText(code, onForm) {
    const s = code && Object.prototype.hasOwnProperty.call(PB_CP_RULES.states, code) ? PB_CP_RULES.states[code] : null;
    let t = 'Permit items: federal OSHA ' + PB_CP_RULES.fed + (s ? ' and ' + s.name + ' ' + s.cite : '') + '.';
    if (onForm && s && s.note) t += ' ' + s.note;''')
p.rep('''if (rr) rr.textContent = pbCpRuleText(pbCpRuleState(pbCpVal('cpAddress'), pbCpVal('cpJobNumber')));''',
      '''if (rr) rr.textContent = pbCpRuleText(pbCpRuleState(pbCpVal('cpAddress'), pbCpVal('cpJobNumber')), true);''')
p.save()
