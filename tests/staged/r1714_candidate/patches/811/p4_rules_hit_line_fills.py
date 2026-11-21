# state_audit_nov21/811 patch 4: the Rules view gets a "Hit a line" section (every state), and blank emergency /
# white-lining rows are filled where tests/staged/lib_811_nov20 read the law or the center's current guide.
# python3 p4_rules_hit_line_fills.py in.html out.html   Applies alone on r17.13 or stacked with p1..p3, p5.
# "Hit a line" every state: the common rule of all 51 laws read (stop, 911 for gas or liquid or danger, tell the owner
# right away even for a nick, tell 811, don't bury or repair it) + the state's own extra duty where it was read:
#  CA Gov. Code 4216.4 (tell the 811 center within 48 hours)   TX 16 TAC 18.4, 18.11 (1 hour through 811; TDRF 30 days)
#  WA RCW 19.122.053 (UTC report within 45 days)   PA 73 P.S. 180 (alleged violation report within 30 days)
#  FL 556.116 (high-priority line: Sunshine 811 and State Fire Marshal within 24 hours)   AZ A.R.S. 40-360.24 (leave
#  the hole open)   NM 18.60.5.16 NMAC (stay until released)   WV 24C-1-5 (non-emergency damage: 811 within 24 hours)
# Georgia is on hold and gets only the common lines.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
from _sr import SR, write_changes
p = P(); CH = []; sr = SR(p, CH)
S = lambda what, url: {'what': what, 'url': url}
sr.fix('IL', {'emergency': 'Emergency request: imminent danger to life, health or property, or a utility outage. Wait at least 2 hours after the request unless the danger can’t wait; operators answer within 2 hours. It expires after 10 days.'}, [S('220 ILCS 50/6: emergency request, 2-hour wait, expires in 10 days', 'https://ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1286')])
sr.fix('NC', {'emergency': 'Emergency (clear and imminent danger to life, health or property): no advance notice, but tell NC811 as soon as you can. Operators make first contact within 3 hours. A false emergency is a misdemeanor.'}, [S('G.S. 87-117, 87-125: emergency notice', 'https://www.ncleg.net/EnactedLegislation/Statutes/HTML/ByArticle/Chapter_87/Article_8A.html')])
sr.fix('PA', {'emergency': 'Emergency (sudden danger to life, property or the environment): the 3-day notice doesn’t apply, but notify every facility owner as soon as possible.'}, [S('73 P.S. 180: emergency notice', 'https://codes.findlaw.com/pa/title-73-ps-trade-and-commerce/pa-st-sect-73-180/')])
sr.fix('AL', {'emergency': 'Emergency digging is allowed to remove an imminent danger to life, health, property or the environment.'}, [S('Ala. Code 37-15 (2026 SB205): emergency excavation', 'https://alison.legislature.state.al.us/files/pdf/SearchableInstruments/2026RS/SB205-enr.pdf')])
sr.fix('VA', {'emergency': 'In an emergency the waiting rules do not apply.'}, [])
sr.fix('MD', {'emergency': 'Emergency tickets: owners respond within 2 hours.'}, [S('Miss Utility Maryland: emergency tickets, Ticket Check', 'https://www.missutility.net/maryland/')])
sr.fix('OK', {'white': 'required', 'white_text': 'White-line the dig area before you call.'}, [])
sr.fix('WY', {'white': 'required', 'white_text': 'Mark the dig area before the locator comes, unless an operator can find the site from the address, you met on site, or it is an emergency.'}, [])
sr.fix('KY', {'white': 'conditional', 'white_text': 'Mark the edges of the dig yourself when an operator asks or the area can’t be described.'}, [])
sr.fix('MO', {'white': 'recommended', 'white_text': 'White lining (paint, stakes or whiskers) may be used when the site can’t be clearly described.'}, [S('RSMo 319.026 (Aug 28, 2025): white lining, unmarked lines', 'https://revisor.mo.gov/main/OneSection.aspx?section=319.026')])

p.rep("""  // the Rules view: everything from the table, the sources, the day it was checked. Works with no signal (links need it).
  function pbSrViewHtml(code) {""", """  /* state_audit_nov21/811: "Hit a line": the common rule of every state's law, then the state's own extra duty (sources in
     tests/staged/state_audit_nov21/811/patches/p4_rules_hit_line_fills.py). */
  const PB_SR_HIT = 'Stop digging near it. Gas or liquid escaping, or anyone in danger: get people away and call 911. Tell the line’s owner right away, even for a nick or scraped coating, and tell 811. Don’t bury, repair or pinch the line until the owner says so.';
  const PB_SR_HITX = {
    CA: 'Also tell the 811 center within 48 hours (Gov. Code 4216.4).',
    TX: 'Pipeline hit: tell the operator through 811 within 1 hour. The company files a damage report (TDRF) with the Railroad Commission within 30 days (16 TAC 18).',
    WA: 'The company reports the damage to the UTC within 45 days (RCW 19.122.053).',
    PA: 'File an alleged violation report through PA One Call within 30 days (73 P.S. 180).',
    FL: 'High-priority line hit: tell Sunshine 811 and the State Fire Marshal within 24 hours (556.116).',
    AZ: 'Leave the hole open until the operator arrives (A.R.S. 40-360.24).',
    NM: 'Stay on site until the operator or responders release you, unless you couldn’t reach them and the site is secured (18.60.5 NMAC).',
    WV: 'Damage that isn’t an emergency: tell WV811 within 24 hours (W. Va. Code 24C-1-5).'
  };
  function pbSrHit(code) { return PB_SR_HIT + (Object.prototype.hasOwnProperty.call(PB_SR_HITX, code) ? ' ' + PB_SR_HITX[code] : ''); }
  window.pbSrHit = pbSrHit;
  // the Rules view: everything from the table, the sources, the day it was checked. Works with no signal (links need it).
  function pbSrViewHtml(code) {""")
p.rep("""      + sec('Emergency', t(R.emergency), 'emerg')
""", """      + sec('Emergency', t(R.emergency), 'emerg')
      + sec('Hit a line', escapeHtml(pbSrHit(code)), 'hit') /* state_audit_nov21/811 */
""")
p.save()
write_changes(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'p4_changes.md'), CH)
print('p4 ok:', len(CH), 'changes')
