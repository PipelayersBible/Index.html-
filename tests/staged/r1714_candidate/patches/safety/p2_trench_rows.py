# state_audit_nov21/safety p2: state table trench lines for 8 plans still "not checked", and the California permit line.
# python3 p2_trench_rows.py in.html out.html   (applies alone on r17.13; edits only the PB_SR JSON, round-trip checked)
# Sources (read Nov 20 2026 unless noted):
#   AK 8 AAC 61.1010 adopts federal standards incl. 1926.652 (lib_osha_nov20)          https://www.law.cornell.edu/regulations/alaska/8-AAC-61.1010
#   HI, VA, TN: no excavation rule in the plan's unique-standards list (lib_osha_nov20)  https://www.osha.gov/stateplans/HI /VA /TN
#   NC: no excavation rule in NC's state-specific list (lib_osha_nov20)                  https://www.labor.nc.gov/north-carolina-state-specific-standards
#   IN 620 IAC 1-1-30 adopts 29 CFR 1926.650-.652 and Appendices A-F                     https://www.law.cornell.edu/regulations/indiana/620-IAC-1-1-30
#   SC: competent person needs specific training in soils analysis and protective systems (SC 1926.650(b) modification)
#       https://osha.llr.sc.gov/pdfs/SC%201926%20standard%20modifications.pdf (lib_osha_nov20)
#   MD: MOSH amendment to 1926.652: tabulated data, slope designs, maker's data and engineered designs kept at the
#       jobsite while the system is built and used; after that on file for the Commissioner   https://labor.maryland.gov/labor/mosh/reqprotect.shtml
#   CA 8 CCR 341: (d)(5)(A) permit for trenches 5 ft or deeper anyone descends into; (c)(1) project / (c)(2) annual
#       permit; (c)(2)(B) annual holders notify the Division before each new site; (e) exemptions   https://dir.ca.gov/Title8/341.html
# The row's own "checked" date is left alone (it dates the 811 data too). Not changed: IA, VT, WY (not read), MI (on hold).
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
K = 'const PB_SR = '
assert p.s.count(K) == 1
a = p.s.index(K) + len(K)
d, end = json.JSONDecoder().raw_decode(p.s[a:])
raw = p.s[a:a + end]
assert json.dumps(d, ensure_ascii=False, separators=(',', ':')) == raw, 'PB_SR does not round-trip'
S = d['states']
OLD = 'State OSHA plan. Federal OSHA’s 5 ft rule is the floor; we have not checked whether this plan is stricter.'
NEW = {
  'AK': ('AKOSH adopts the federal rule: protective system from 5 ft (29 CFR 1926.652; 8 AAC 61.1010).',
         [('8 AAC 61.1010 (Alaska adopts the federal construction standards)', 'https://www.law.cornell.edu/regulations/alaska/8-AAC-61.1010')]),
  'HI': ('HIOSH uses the federal rule: protective system from 5 ft (29 CFR 1926.652). Hawaii has no excavation rule of its own.',
         [('OSHA: Hawaii State Plan (unique standards)', 'https://www.osha.gov/stateplans/HI')]),
  'NC': ('NC DOL OSH uses the federal rule: protective system from 5 ft (29 CFR 1926.652). North Carolina has no excavation rule of its own.',
         [('NCDOL: North Carolina state-specific standards', 'https://www.labor.nc.gov/north-carolina-state-specific-standards')]),
  'TN': ('TOSHA uses the federal rule: protective system from 5 ft (29 CFR 1926.652). Tennessee has no excavation rule of its own.',
         [('OSHA: Tennessee State Plan (unique standards)', 'https://www.osha.gov/stateplans/TN')]),
  'VA': ('VOSH uses the federal rule: protective system from 5 ft (29 CFR 1926.652). Virginia has no excavation rule of its own.',
         [('OSHA: Virginia State Plan (unique standards)', 'https://www.osha.gov/stateplans/VA')]),
  'IN': ('IOSHA adopts the federal rule: protective system from 5 ft (29 CFR 1926.652; 620 IAC 1-1-30).',
         [('620 IAC 1-1-30 (Indiana adopts 29 CFR 1926.650-.652)', 'https://www.law.cornell.edu/regulations/indiana/620-IAC-1-1-30')]),
  'SC': ('SC OSHA uses the federal rule: protective system from 5 ft (29 CFR 1926.652). South Carolina: the competent person must have specific training in soils analysis and protective systems.',
         [('SC OSHA: SC 1926 standard modifications (competent person)', 'https://osha.llr.sc.gov/pdfs/SC%201926%20standard%20modifications.pdf')]),
  'MD': ('MOSH uses the federal rule: protective system from 5 ft (29 CFR 1926.652). Maryland: keep the tabulated data, slope design, box maker’s data or engineer’s design at the jobsite while the system is in use.',
         [('MOSH: Maryland amendments to 29 CFR 1926.652 (records at the jobsite)', 'https://labor.maryland.gov/labor/mosh/reqprotect.shtml')]),
}
for c, (txt, src) in NEW.items():
    r = S[c]
    assert r['trench'] == {'ft': None, 'text': OLD}, c
    r['trench'] = {'ft': 5, 'text': txt}
    have = {x['url'] for x in r['sources']}
    for w, u in src:
        if u not in have: r['sources'].append({'what': w, 'url': u})
ca = S['CA']
assert ca['permit'] == 'Cal/OSHA permit needed for trenches or excavations 5 ft or deeper that anyone enters (8 CCR 341). Emergency repair of underground facilities is exempt.'
ca['permit'] = ('Cal/OSHA permit needed for trenches or excavations 5 ft or deeper that anyone enters (8 CCR 341): a project permit, '
                'or the company’s annual permit. With an annual permit, tell the Cal/OSHA district office before you start each new site. '
                'Exempt: government agencies and PUC-regulated utilities as employers, and emergency repair of underground facilities.')
new = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
p.s = p.s[:a] + new + p.s[a + end:]
p.rep('''GA and ND untouched. */
  window.PB_STATE_RULES = PB_SR;''', '''GA and ND untouched.
     state_audit_nov21/safety (Nov 20): trench lines for AK, HI, NC, TN, VA, IN, SC, MD and the California permit line (8 CCR 341). */
  window.PB_STATE_RULES = PB_SR;''')
p.save()
