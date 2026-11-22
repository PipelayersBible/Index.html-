# records_nov22 A10 (review "Records That Hold Up"): the custodian certificate's Exhibit 1 described today's app for records
# of any date. Lines that began on a date now say so, and say plainly when they did not apply to these records:
#   run clock difference, server re-hash of run photos / uploader can't replace or delete, outside time stamps on sealed
#   PDFs: r16.80, Nov 17 2026 · sealed PDFs: r16.76, Nov 16 2026 · administration log: r16.84, Nov 17 2026.
# Permit export paragraph 9 said "reached the server more than once (for example during entry and at close-out)"; only
# closed permits are backed up, so it now says a version is kept each time the closed permit was backed up.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
OLD_START = """  const PB_EXHIBIT = [
    'EXHIBIT 1: HOW THE PIPELAYER’S BIBLE MAKES AND KEEPS RECORDS (as of app build ' + String(window.PB_APP_BUILD || '') + ')',"""
p.rep(OLD_START, """  // records_nov22 A10: Exhibit 1 for the records' own dates (first..last). A feature that began on a date says so, and says
  // when it did not apply to any of these records.
  function pbExhibit(first, last) {
    const ms = (v) => { const t = new Date(v).getTime(); return isFinite(t) ? t : NaN; }, f = ms(first), l = ms(last);
    const on = (iso, words, text) => { const s = Date.parse(iso + 'T00:00:00'); if (isFinite(l) && l < s) return 'This did not apply to these Records: ' + words + ' began on ' + new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ', after the last of them.'; return (isFinite(f) && f < s ? 'Since ' + new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' (so not for the Records made before that date): ' : 'Since ' + new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ': ') + text; };
    return [
    'EXHIBIT 1: HOW THE PIPELAYER’S BIBLE MAKES AND KEEPS RECORDS (as of app build ' + String(window.PB_APP_BUILD || '') + '; dated lines say when each part began)',
    '',
    '1. Entry. Records are entered on a phone or tablet by a signed-in user. The app works without a network connection; entries are stored on the device and sent to the server when a connection is available.',
    '2. Event times. The time of an entry is taken from the device’s clock, with its time zone. The server separately records the time at which it received each record and each later version. ' + on('2026-11-17', 'recording the clock difference', 'for runs, the server also records the difference between the device’s clock and the server’s clock at the time of receipt.'),
    '3. Versions. Each time a changed run, site-log entry, production entry, ticket, daily report or closed permit reaches the server, the server stores it as a new version and keeps the earlier versions. Users cannot change or delete stored versions through the app.',
    '4. Photographs. Photographs taken in the app are reduced in size and saved as JPEG files; the camera’s original file and its embedded metadata are not kept. Photographs taken within about three minutes of being added carry a band with the device’s date and time, reported position and accuracy, compass direction and an approximate street address. Photographs chosen from the device’s library are not stamped. A SHA-256 hash value of each photograph is computed on the device and used as its file name. ' + on('2026-11-17', 'this check', 'the server re-reads each run photograph after it is uploaded and records the SHA-256 it computes itself, and the user who uploaded a run photograph cannot replace or delete it through the app.') + ' Photographs on permits, daily reports and tickets are kept as described for those records.',
    '5. Sealed PDF. ' + on('2026-11-16', 'sealed PDFs', 'after a finished run has reached the company’s account, the user’s device produces a PDF of the run, computes its SHA-256 hash value and uploads both. The server records the hash value and the time. Users cannot replace or delete a sealed PDF through the app. If the run is later changed, a further sealed PDF is made and the earlier ones are kept.') + ' ' + on('2026-11-17', 'the server check and outside time stamps', 'the server re-reads each sealed file, computes its own SHA-256, and obtains time-stamp tokens for that hash value from independent time-stamp authorities (RFC 3161).'),
    '6. Automated reading. A feature of the app can read values from a photograph of a survey stake and enter them in the form. For runs locked with app build r16.77 or later, the record keeps the values as read, the values as locked, and the time the person locking the run confirmed they checked them.',
    '7. Administration. The operator of the app has administrative access to the database and file storage, as the operator of any hosted service does. ' + on('2026-11-17', 'the administration log', 'every change to a field-record table that does not come from a signed-in user of the app or one of the app’s own scheduled jobs (for example, a change made in a database console or with the server key), and the operator’s administrative actions on a company account, are written to an insert-only log in the same database; each finished day of that log is fingerprinted and time-stamped by outside time-stamp services. The company’s managers can view the entries about their company in the app. Reading records is not logged, and the log is kept in the same database, so a person with full database control could still bypass it; the outside time stamps would show that a stamped day’s log was later changed.'),
    '8. Limits. The app records what users entered and when the server received it. It does not measure the work and does not verify that entries are correct.'
    ].join('\\n');
  }
  window.pbExhibit = pbExhibit; // tests
  const PB_EXHIBIT_OLD = [
    'EXHIBIT 1: HOW THE PIPELAYER’S BIBLE MAKES AND KEEPS RECORDS (as of app build ' + String(window.PB_APP_BUILD || '') + ')',""")
p.rep("""'Signature                                Printed name', '', '', PB_EXHIBIT].join('\\n');
    files.push({ name: 'CUSTODIAN-CERTIFICATE-draft.txt', data: enc.encode(cert) });""", """'Signature                                Printed name', '', '', pbExhibit(o.first, o.last)].join('\\n'); /* records_nov22 A10 */
    files.push({ name: 'CUSTODIAN-CERTIFICATE-draft.txt', data: enc.encode(cert) });""")
p.rep("""'Signature                                Printed name', '', '', PB_EXHIBIT].join('\\n');
      add('CUSTODIAN-CERTIFICATE-draft.txt', enc.encode(cert));""", """'Signature                                Printed name', '', '', pbExhibit(first, last)].join('\\n'); /* records_nov22 A10 */
      add('CUSTODIAN-CERTIFICATE-draft.txt', enc.encode(cert));""")
p.rep("""      p9: V.length > 1 ? 'This permit record reached the server more than once (for example during entry and at close-out). The Service keeps each version with the server time at which it was received; all of them are included in this export.' : 'The Service shows one stored version of this permit record.' });""",
"""      p9: V.length > 1 ? 'The Service keeps a version of this permit record each time the closed permit was backed up (' + V.length + ' versions), each with the server time at which it was received; all of them are included in this export.' : 'The closed permit was backed up once; the Service shows one stored version of this permit record.' }); /* records_nov22 A10 */""")
p.save()
