# State audit Nov 21 (specs_permits) patch 2: two words that assumed California.
#  a) Documents > "Add your spec books" named only the Greenbook (Southern California's book). Out-of-state crews have a
#     state DOT book, a city or county standard, or APWA / Ten States based standards.
#  b) Inspections & tests > Details: the one example was "Hydrostatic 150 psi" for every type. Test pressures come from
#     the spec and differ by agency (WSDOT 7-09.3(23): 150 psi over working pressure, at least 225 psi). The example now
#     follows the type and gives no pressure; it also names the tests the type list doesn't have (air, vacuum, bac-T),
#     which go under Pressure test or Other until the server's type list grows (server-enforced: pb_insp_add).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

p.rep('''<p class="s">The Greenbook or state specs, city and water district standards. Ask answers from them first, for everyone in the company.</p>''',
'''<p class="s">Your state DOT or city spec book (the Greenbook in Southern California), water and sewer district standards. Ask answers from them first, for everyone in the company.</p>''')

p.rep('''placeholder="e.g. Hydrostatic 150 psi, bedding, 95% Proctor"></div>\'''',
'''placeholder="e.g. Pipe zone, MH-3 to MH-4"></div>\'''')

p.rep('''  window.pbInsKindChange = function() { const k = pbDlyEl('ifKind').value, l = pbDlyEl('ifDetailLabel'); if (l) l.textContent = k === 'other' ? 'What it is (required)' : 'Details (optional)'; };''',
'''  const PB_INS_EG = { inspection: 'e.g. Pipe zone, MH-3 to MH-4', pressure: 'e.g. Hydrostatic per spec, or sewer air test', mandrel: 'e.g. 8 in SDR 35, mandrel size per spec', cctv: 'e.g. Final TV before paving', compaction: 'e.g. Trench backfill, density test per spec', other: 'e.g. Manhole vacuum test, bac-T sample, tracer wire test' }; /* state audit Nov 21 */
  window.pbInsKindChange = function() { const k = pbDlyEl('ifKind').value, l = pbDlyEl('ifDetailLabel'), d = pbDlyEl('ifDetail'); if (l) l.textContent = k === 'other' ? 'What it is (required)' : 'Details (optional)'; if (d) d.placeholder = PB_INS_EG[k] || PB_INS_EG.inspection; };''')
p.save()
