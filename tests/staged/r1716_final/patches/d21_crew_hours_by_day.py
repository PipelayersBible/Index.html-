# r1716_final decision 21: "Crew hours for payroll" -> "Crew hours by day" everywhere it shows (the office job page's
# Spreadsheets button, the sheet's title, the "done" message title) and the file name crew-hours-by-day-<job>-<from>-to-<to>.csv.
# The server function (pb_prod_export_hours), the column headings and the "check them against your time records before you
# run payroll" warning stay (legal_nov19 item 1).
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("  // ---- office3 #36: spreadsheets for the office (production by day; crew hours for payroll) ----",
      "  // ---- office3 #36: spreadsheets for the office (production by day; crew hours by day: r1716 decision 21) ----")
p.rep("row('pjExpHours', 'hours', 'Crew hours for payroll', ", "row('pjExpHours', 'hours', 'Crew hours by day', ")
p.rep("const title = kind === 'hours' ? 'Crew Hours for Payroll' : 'Production by Day';", "const title = kind === 'hours' ? 'Crew Hours by Day' : 'Production by Day';")
p.rep("pbCxExportSave('crew-hours-' + safe + '-' + from + '-to-' + to + '.csv', rows);", "pbCxExportSave('crew-hours-by-day-' + safe + '-' + from + '-to-' + to + '.csv', rows);")
p.rep("The spreadsheet has only the headings.', 'Crew Hours for Payroll');", "The spreadsheet has only the headings.', 'Crew Hours by Day');")
s = p.s
assert 'for Payroll' not in s and 'for payroll' not in s, 'payroll name left somewhere'
p.save()
