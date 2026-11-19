#!/usr/bin/env python3
# office3 #37: permit fingerprints that anyone can check. The responder link's secret stays out of the backed-up permit
# record, so the phone's "Export record data (JSON)", the PDF fingerprint and the server's record_sha256 are the same.
# New permits only: a permit closed from now on gets "emSecretApart": true in its record. For such a record:
#   - pbPermitBackupRecord (what is uploaded AND what the fingerprint and the export are made from) leaves out
#     permit.emLink.s; the phone keeps the secret in its own copy (e.permit.emLink.s) as before;
#   - the backup sends the secret beside the record (pb_permit_backup's p_em_secret, sql/37) so the server can still
#     prove the link code belongs to this permit; it is never stored.
# A record without the flag (closed before this, or by an older app) is built exactly as before: same text, same
# fingerprint, same server versions, and its PDF keeps the r16.98 note about the masked secret. Sealed things don't move.
# Server missing the new call: falls back to the 3-argument call with the same record (the open-permit snapshot,
# which still carries the secret, normally filed the link already).
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 1) new closed permits are marked
rep("""      kind: 'confined',
      id: closeTime.getTime(),
      permitSessionId: confinedPermit.sessionId,""",
"""      kind: 'confined',
      id: closeTime.getTime(),
      permitSessionId: confinedPermit.sessionId,
      ...(pbEmLinkOk(confinedPermit.emLink) && typeof confinedPermit.emLink.s === 'string' ? { emSecretApart: true } : {}), /* office3 #37: the link secret is sent beside this record, never in it */""")

# 2) the record that is uploaded, fingerprinted and exported leaves the secret out (flagged records only)
rep("""    const rec = JSON.parse(JSON.stringify(rest)); // dates as ISO text
    if (Array.isArray(photos) && photos.length) rec.photoCount = Math.max(Number(rec.photoCount) || 0, photos.length); // never adds a field the record didn't have (restore makes no new version)
    return rec;""",
"""    const rec = JSON.parse(JSON.stringify(rest)); // dates as ISO text
    if (Array.isArray(photos) && photos.length) rec.photoCount = Math.max(Number(rec.photoCount) || 0, photos.length); // never adds a field the record didn't have (restore makes no new version)
    if (rec.emSecretApart === true && rec.permit && rec.permit.emLink && typeof rec.permit.emLink === 'object') delete rec.permit.emLink.s; /* office3 #37 */
    return rec;""")

# 3) the backup pass sends the secret beside a flagged record
rep("""        .map(e => { const rec = pbPermitBackupRecord(e), json = JSON.stringify(rec); return { cid: pbPermitClientId(e), rec, json, h: pbHashText(json) }; })""",
"""        .map(e => { const rec = pbPermitBackupRecord(e), json = JSON.stringify(rec); return { cid: pbPermitClientId(e), rec, json, h: pbHashText(json), sec: e.emSecretApart === true && e.permit && e.permit.emLink && typeof e.permit.emLink.s === 'string' ? e.permit.emLink.s : null /* office3 #37 */ }; })""")
rep("""        const r = await pbPermitRpc('pb_permit_backup', { p_client_permit_id: x.cid, p_record: x.rec, p_expect_uid: uid }, ms);
        if (!same()) break;""",
"""        let r = await pbPermitRpc('pb_permit_backup', Object.assign({ p_client_permit_id: x.cid, p_record: x.rec, p_expect_uid: uid }, x.sec ? { p_em_secret: x.sec } : {}), ms);
        if (x.sec && r.error && /Could not find the function|function .* does not exist|schema cache/i.test(String(r.error.message || ''))) r = await pbPermitRpc('pb_permit_backup', { p_client_permit_id: x.cid, p_record: x.rec, p_expect_uid: uid }, ms); /* office3 #37: a server without the new call */
        if (!same()) break;""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
