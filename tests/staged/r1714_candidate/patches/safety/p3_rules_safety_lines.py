# state_audit_nov21/safety p3: four short worker-safety lines in the state Rules view ("Rules for <state>"):
# Heat, Toolbox talks (how often), First aid, Flaggers. Only where the state has its own rule, except Heat, which says
# plainly when there is no state rule (federal OSHA has no heat standard in force).
# python3 p3_rules_safety_lines.py in.html out.html   (applies alone on r17.13)
# Sources:
#   Heat: 8 CCR 3395; WAC 296-62-095 to -09560 (L&I Be Heat Smart); OAR 437-002-0156; COMAR 09.12.32; NV R131-24;
#         Va. Code 40.1-44.2 (standard by May 1 2028); NM 11.5.7 NMAC proposed only. All read Nov 20 2026 in
#         tests/staged/lib_osha_nov20 (sp-*-heat-* chunks). Federal: proposed rule only; supplemental proposal targeted
#         Dec 2026 (Lockton, Sept 2026 summary, read Nov 20 2026).
#   Toolbox talks: 8 CCR 1509(e) "at least every 10 working days" https://dir.ca.gov/title8/1509.html ;
#         WAC 296-155-110(5)(a) "at the beginning of each job, and at least weekly thereafter", (6)(d)-(e) attendance and
#         subjects, (8) minutes kept at least one year  https://lawfilesext.leg.wa.gov/law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-110.htm
#   First aid: WAC 296-155-120(2) crew leaders and supervisors hold a valid first-aid certificate (2024 archive copy);
#         8 CCR 1512(b), (c)(1), (e) https://dir.ca.gov/Title8/1512.html
#   Flaggers: tests/staged/lib_traffic_nov20/work/flagger_by_state.tsv (WA from WAC 296-155-305(6); OR ODOT spec 00223.30
#         and OTTCH 2026; CA MUTCD 2026; CO CDOT Jan 2026 memo; MA 701 CMR 7.07; the rest are state DOT specs as reproduced by
#         the FHWA-funded Work Zone Safety Information Clearinghouse, some dated 2022: the line says to check the current spec).
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
HEAT = {
  'CA': 'Air temperature. Water and shade from 80°F; high-heat steps from 95°F (watch each other, pre-shift meeting); a cool-down rest whenever someone asks; watch new workers closely for 14 days (8 CCR 3395).',
  'WA': 'Air temperature. From 80°F (52°F in nonbreathable clothing): water, shade, cool-down rest when needed. From 90°F: at least 10 minutes of paid rest every 2 hours; from 100°F: 15 minutes every hour (WAC 296-62-095).',
  'OR': 'Heat index (heat plus humidity). From 80: shade and water (up to 32 oz an hour each), written plan. From 90: high-heat steps and a written rest-break schedule (OAR 437-002-0156).',
  'MD': 'Heat index (heat plus humidity). From 80: written plan, water (32 oz an hour each), shade. From 90: at least 10 minutes of rest every 2 hours; from 100: 15 minutes every hour (COMAR 09.12.32).',
  'NV': 'No temperature trigger. Companies with more than 10 workers write a heat hazard analysis for each job and plan water, rest and cooling (Nevada R131-24).',
  'VA': 'No state heat rule yet. Virginia must adopt one by May 1, 2028. Until then, follow the Heat Illness talk.',
  'NM': 'A state heat rule is proposed, not in force. Follow the Heat Illness talk.',
}
HEAT_NONE = 'No state heat rule. Federal OSHA has no heat standard yet (proposed only), but it cites heat hazards under the general duty clause. Follow the Heat Illness talk.'
MEET = {
  'CA': 'The foreman holds a toolbox or tailgate safety meeting at least every 10 working days (8 CCR 1509(e)).',
  'WA': 'At the start of each job and at least weekly. Write down who came and what was covered; keep the minutes 1 year (WAC 296-155-110).',
}
AID = {
  'CA': 'Enough trained first aiders on site, a weatherproof first-aid kit kept stocked, and the doctor, hospital, ambulance and fire numbers posted at the job (8 CCR 1512).',
  'WA': 'Every foreman, crew leader or supervisor needs a valid first-aid card (WAC 296-155-120).',
}
FLAG = {
  'AL': 'ALDOT: flaggers take the ATSSA flagger course (from an ALDOT contract, not confirmed in the spec book).',
  'AK': 'Alaska DOT&PF jobs: a current flagger certification from the state’s list (ATSSA, IMSA and others).',
  'CA': 'Train flaggers before they flag (CA MUTCD 2026). No state card.',
  'CO': 'CDOT flagger card: 18 or older, CDOT-authorized training, closed-book exam.',
  'CT': 'CTDOT jobs: ATSSA, National Safety Council or approved flagger training; certificate to the engineer.',
  'DE': 'State roads: DelDOT-recognized certification; carry the card and photo ID.',
  'DC': 'DDOT jobs: ATSSA or approved certification.',
  'GA': 'State highways, permit work included (utilities too): a certified flagger (ATSSA or NSC).',
  'HI': 'HDOT jobs: nationally recognized flagger certification within 4 years (from one HDOT contract).',
  'ID': 'ITD-approved certification; Washington, Oregon, Montana and Utah cards accepted.',
  'IL': 'IDOT contract and permit work: certified by an approved agency (ATSSA, NSC, Illinois Laborers).',
  'IN': 'INDOT jobs: ATSSA-certified flagger or approved equal.',
  'IA': 'Iowa DOT jobs: employer-issued flagger training card; good until Dec 31 of the year after training.',
  'KS': 'KDOT jobs: trained, carry a card with name and date; retrain every 3 years.',
  'KY': 'KYTC jobs: trained in MUTCD flagging, proof within the last 5 years.',
  'LA': 'DOTD jobs: ATSSA-type or approved flagger course.',
  'ME': 'State law: flaggers need MUTCD flagger training, private jobs too; MaineDOT jobs need certification.',
  'MD': 'SHA or ATSSA flagger card before flagging in Maryland work zones.',
  'MA': 'MassDOT flagger certification (2 years).',
  'MI': 'MDOT jobs: traffic regulator training within the last 12 months.',
  'MN': 'MnDOT trunk highway jobs: Flagger Qualification Card from a MnDOT-qualified trainer.',
  'MS': 'MDOT jobs: certified, carry proof and ID; recertify every 4 years.',
  'MO': 'MoDOT jobs: flagger card; recertify at least every 4 years.',
  'MT': 'MDT jobs: Montana, ATSSA, Idaho, Oregon or Washington card; carry proof.',
  'NE': 'NDOT jobs: certified flaggers only (video and exam); carry the card.',
  'NV': 'NDOT jobs: card from an NDOT or NDOT-approved course.',
  'NM': 'NMDOT jobs: flagger training card (4 years) to the engineer before flagging.',
  'NY': 'NYSDOT jobs: trained by a recognized program; roster to the engineer.',
  'NC': 'NCDOT jobs: NCDOT-approved flagger course.',
  'ND': 'NDDOT jobs: pass the written exam (ndsc.org) before flagging.',
  'OH': 'No state card required. Train flaggers anyway.',
  'OK': 'No card rule found; ODOT guidance says train flaggers.',
  'OR': 'Public roads: a current card (3 years) from Oregon, Washington, Idaho or Montana; 18 or older (Oregon Temporary Traffic Control Handbook 2026).',
  'PA': 'Training that meets PennDOT guidelines within 3 years; wallet card or roster.',
  'RI': 'RIDOT jobs: certificate from an approved course.',
  'SC': 'SCDOT jobs: course from an SCDOT-approved provider.',
  'SD': 'SDDOT jobs: South Dakota certification (2 years); 18 or older.',
  'TN': 'TDOT jobs: certified by an approved program (ATSSA, NSC and others).',
  'TX': 'TxDOT jobs: trained by the contractor’s named flagger instructor; list of certified flaggers before work.',
  'UT': 'Trained and certified before flagging (3 years).',
  'VT': 'VTrans jobs: 4-hour course within the past 2 years; carry proof.',
  'VA': 'VDOT, ATSSA or approved certification; carry the card (VDOT card 2 years).',
  'WA': 'Every flagger: a current card from Washington, Oregon, Idaho or Montana, no more than 3 years old (WAC 296-155-305).',
  'WV': 'WVDOH jobs: ATSSA certification.',
  'WI': 'State highways: certified flaggers only.',
  'WY': 'WYDOT jobs: approved course, retested every 3 years; card on the project.',
}
FLAG_NONE = 'No state card rule found. The MUTCD calls for trained flaggers.'
FLAG_TAIL = ' Check the current state DOT spec and your traffic permit.'
for k in FLAG: assert len(k) == 2
js = lambda o: json.dumps(o, ensure_ascii=False)
p.rep('''  // the Rules view: everything from the table, the sources, the day it was checked. Works with no signal (links need it).
  function pbSrViewHtml(code) {''', '''  /* state_audit_nov21/safety (Nov 20 2026): worker-safety lines by state for the Rules view. Sources in
     tests/staged/state_audit_nov21/safety/patches/p3_rules_safety_lines.py. Heat: 8 CCR 3395, WAC 296-62-095,
     OAR 437-002-0156, COMAR 09.12.32, NV R131-24. Talks: 8 CCR 1509(e), WAC 296-155-110. First aid: 8 CCR 1512,
     WAC 296-155-120. Flaggers: WAC 296-155-305, state DOT specs (lib_traffic_nov20). */
  const PB_SAFE = { heat: ''' + js(HEAT) + ''', heatNone: ''' + js(HEAT_NONE) + ''',
    meet: ''' + js(MEET) + ''', aid: ''' + js(AID) + ''',
    flag: ''' + js(FLAG) + ''', flagNone: ''' + js(FLAG_NONE) + ''', flagTail: ''' + js(FLAG_TAIL) + ''' };
  window.PB_SAFE = PB_SAFE;
  const pbSafeGet = (m, c) => (c && Object.prototype.hasOwnProperty.call(m, c) ? m[c] : '');
  // the Rules view: everything from the table, the sources, the day it was checked. Works with no signal (links need it).
  function pbSrViewHtml(code) {''')
p.rep('''      + sec('Report a serious injury', escapeHtml('Call 911 first. ' + pbInjuryLine(code)), 'inj') /* r17.13 */
''', '''      + sec('Report a serious injury', escapeHtml('Call 911 first. ' + pbInjuryLine(code)), 'inj') /* r17.13 */
      + sec('Heat', escapeHtml(pbSafeGet(PB_SAFE.heat, code) || PB_SAFE.heatNone), 'heat') /* state_audit_nov21/safety */
      + (pbSafeGet(PB_SAFE.meet, code) ? sec('Toolbox talks', escapeHtml(pbSafeGet(PB_SAFE.meet, code)), 'meet') : '')
      + (pbSafeGet(PB_SAFE.aid, code) ? sec('First aid', escapeHtml(pbSafeGet(PB_SAFE.aid, code)), 'aid') : '')
      + sec('Flaggers', escapeHtml(pbSafeGet(PB_SAFE.flag, code) ? pbSafeGet(PB_SAFE.flag, code) + (code === 'CA' || code === 'OH' || code === 'OK' ? '' : PB_SAFE.flagTail) : PB_SAFE.flagNone), 'flag')
''')
p.save()
