# records_nov22 B8 (app half, goes with sql/b8_run_versions_export.sql): Export for Records adds the run's whole history
# from the server: history.json (versions with server time + md5, events incl. removal reasons, office setup changes)
# and versions/run-v<N>.json for each version the server sent with its record. Without the server function (or for a
# non-manager) the export says so in the manifest and goes on as before.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
p.rep("""      add('record.json', enc.encode(JSON.stringify({ run: x, record: e, sealed: seals, clock }, null, 1)));""",
"""      let hist = null; try { const r = await pbPermitRpc('pb_prod_run_versions', { p_run_id: x.id, p_expect_uid: (sbUser && sbUser.id) || null }, 45000); if (r && !r.error && r.data && r.data.ok) hist = r.data; } catch (y) {} /* records_nov22 B8 */
      if (hist) { (hist.versions || []).forEach(v => { if (v && v.record) add('versions/run-v' + v.version + '.json', enc.encode(JSON.stringify(v.record, null, 1))); }); add('history.json', enc.encode(JSON.stringify({ versions: (hist.versions || []).map(v => ({ version: v.version, saved_at: v.saved_at, record_md5: v.record_md5, file: v.record ? 'versions/run-v' + v.version + '.json' : null })), events: hist.events || [], setup: hist.setup || [], server_at: hist.server_at }, null, 1))); }
      add('record.json', enc.encode(JSON.stringify({ run: x, record: e, sealed: seals, clock }, null, 1)));""")
p.rep("""        '', 'SHA-256 (hex)                                                      bytes      file', ...sums, '', 'To check a file: compute its SHA-256 (for example: shasum -a 256 <file>, or certutil -hashfile <file> SHA256) and compare it with the line above.', tsrNote]""",
"""        hist ? 'Versions: ' + (hist.versions || []).length + ' stored on the server (history.json: each with the server time it was received and its md5; versions/*.json: the record of each); events and office setup changes in history.json.' : 'Versions: the server\\u2019s version history could not be read for this export (only the company account or a manager can export it).', /* records_nov22 B8 */
        '', 'SHA-256 (hex)                                                      bytes      file', ...sums, '', 'To check a file: compute its SHA-256 (for example: shasum -a 256 <file>, or certutil -hashfile <file> SHA256) and compare it with the line above.', tsrNote]""")
p.save()
