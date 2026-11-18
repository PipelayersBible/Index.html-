import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 08: every PDF says "Export record data (JSON) writes the exact text that is hashed. Compute its SHA-256 ... and
# compare." For a permit with an emergency responder link the export masks the link's secret (fix_emsecret), so the file's
# SHA-256 never matches the printed fingerprint: following the PDF's own instructions makes an untouched permit look altered.
# The PDF now says so for those records and points to the comparison that does work (the server's record_sha256).
rep("""numbers in plain decimal; no extra spaces or line breaks.', { size: 9 });
""", """numbers in plain decimal; no extra spaces or line breaks.', { size: 9 });
    if (!howText && e && e.kind === 'confined') { try { const ct = pbRptCanonicalText(e); if (pbEmMaskSecret(ct) !== ct) R.para('This permit holds an emergency responder link. Export record data replaces that link\\u2019s secret with "(kept on the phone)", so the SHA-256 of that file will NOT equal the fingerprint above; that difference is expected and is not a change to the record. Compare the fingerprint with the record_sha256 the company server stored for the backed-up version instead (Export for Records lists it for every version).', { size: 9, style: 'bold' }); } catch (x) {} } /* audit pdfs 08 */
""")
open(out, 'w', encoding='utf-8').write(s)
