# legal_nov19 01: wording only (no logic). `python3 01_safety_and_hours_wording.py in.html out.html`
#  a) Trench Sloping + the Trenching lesson: the caution heading no longer calls OSHA's Table B-1 "tabulated data".
#     "Tabulated data" is a term of art in 29 CFR 1926.652(b)(3) / 8 CCR 1541.1(b)(3): written data approved by a
#     registered professional engineer, a copy kept at the jobsite. Table B-1 is Option 2 (Appendices A and B).
#  b) Type A vertical lower portion: "no shoring or shielding required" read as the app deciding the trench complies.
#  c) Crew hours spreadsheet: says what it is (daily totals the foreman signed), so it isn't taken for the
#     start/stop/meal time record California requires (Wage Order 16 s.6(A), Labor Code 1174(d)).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
OLD = '<strong>Tabulated data, not a substitute for a competent person</strong>'
NEW = '<strong>OSHA’s table, not a substitute for a competent person</strong>'
p.rep('data-edu-id="caution-tabulated-data-not-a-substitute-for-a-competent">\n      ' + OLD,
      'data-edu-id="caution-tabulated-data-not-a-substitute-for-a-competent">\n      ' + NEW)
p.rep('<div class="pb-warn" style="margin-top:16px;">\n      ' + OLD,
      '<div class="pb-warn" style="margin-top:16px;">\n      ' + NEW)
p.rep('Maximum allowed — no shoring or shielding required below this height',
      'OSHA’s maximum for an unsupported vertical lower portion in Type A soil (App. B, Fig. B-1.1). Your competent person decides if it applies here')
p.rep("'Crew hours for payroll', 'Each person’s hours from the signed daily reports'",
      "'Crew hours for payroll', 'Each person’s daily total from the signed daily reports'")
p.rep("with the hours the foreman signed.'",
      "with the hours the foreman signed. These are daily totals, not start, stop or meal times. Check them against your time records before you run payroll.'")
p.rep("The hours are the foreman’s, as signed. An amended report counts once, as amended.'",
      "The hours are the foreman’s daily totals, as signed, not start, stop or meal times. Check them against your time records before you run payroll. An amended report counts once, as amended.'")
p.save()
