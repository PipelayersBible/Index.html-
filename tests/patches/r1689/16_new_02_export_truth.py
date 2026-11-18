import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt (Nov 17): Export for Records on a daily report. The draft custodian certificate must only say what is in the ZIP:
# (a) no signature image stored -> paragraph 10 doesn't claim signature.png is included;
# (b) an earlier version that can't be fetched (or more than the loop reads) stops the export instead of the certificate
#     saying "no earlier version" / "the earlier versions are included";
# (c) photos listed in the report that couldn't be downloaded are counted and named in the manifest and the certificate.
rep("""    let nph = 0; try { const ph = await window.pbDaEvPhotosX({ serverId: d.id, snapshot: d.snapshot }, true); for (const sha of Object.keys(ph || {})) { if (!ph[sha]) continue; files.push({ name: 'photos/' + String(sha).replace(/[^A-Za-z0-9]/g, '') + '.jpg', data: window.pbB64Bytes(ph[sha]) }); nph++; } } catch (e) { console.error('Export photos:', e); }""",
"""    let nph = 0; const got = new Set();
    try { const ph = await window.pbDaEvPhotosX({ serverId: d.id, snapshot: d.snapshot }, true); for (const sha of Object.keys(ph || {})) { if (!ph[sha]) continue; files.push({ name: 'photos/' + String(sha).replace(/[^A-Za-z0-9]/g, '') + '.jpg', data: window.pbB64Bytes(ph[sha]) }); nph++; got.add(sha); } } catch (e) { console.error('Export photos:', e); }
    const want = new Set(); try { const sn = d.snapshot || {}; (Array.isArray(sn.events) ? sn.events : []).forEach(ev => ((ev && ev.photos) || []).forEach(q => { if (q && q.sha) want.add(q.sha); })); (Array.isArray(sn.photos) ? sn.photos : []).forEach(q => { if (q && q.sha) want.add(q.sha); }); } catch (e) {}
    const missPh = [...want].filter(x => !got.has(x)); // listed in the report, not in this export""")
rep("""    for (let i = 0; sup && i < 30; i++) { const g = await pbPermitRpc('pb_daily_get', { p_report_id: sup, p_expect_uid: uid }, 30000); if (!g.data || !g.data.ok) break; earlier.push(g.data); files.push({ name: 'earlier/daily-report-v' + g.data.version + '.json', data: enc.encode(JSON.stringify(g.data, null, 1)) }); sup = g.data.supersedes; }""",
"""    const seenV = new Set([String(d.id)]);
    for (let i = 0; sup && i < 300 && !seenV.has(String(sup)); i++) { seenV.add(String(sup)); const g = await pbPermitRpc('pb_daily_get', { p_report_id: sup, p_expect_uid: uid }, 30000); if (!g.data || !g.data.ok) break; earlier.push(g.data); files.push({ name: 'earlier/daily-report-v' + g.data.version + '.json', data: enc.encode(JSON.stringify(g.data, null, 1)) }); sup = g.data.supersedes; }
    if (sup) throw new Error('an earlier version of the daily report could not be read'); // never certify "no earlier version" on a failed read""")
rep("""(earlier.length === 1 ? '' : 's') : '') + ', ' + nph + ' photograph' + (nph === 1 ? '' : 's') + (d.signature_png_b64 ? ' and the signature image' : ''),
      lines: ['Versions: ' + [d].concat(earlier).map(vline).join(' | '), 'Phone clock when this version was sent: ' + clk + '.'],""",
"""(earlier.length === 1 ? '' : 's') : '') + ', ' + nph + ' photograph' + (nph === 1 ? '' : 's') + (missPh.length ? ' (' + missPh.length + ' more photograph' + (missPh.length === 1 ? '' : 's') + ' listed in the report could not be downloaded and ' + (missPh.length === 1 ? 'is' : 'are') + ' NOT in this export)' : '') + (d.signature_png_b64 ? ' and the signature image' : ''),
      lines: ['Versions: ' + [d].concat(earlier).map(vline).join(' | '), 'Phone clock when this version was sent: ' + clk + '.'].concat(missPh.length ? ['Photographs listed in the report but NOT in this export (they could not be downloaded; export again with signal): ' + missPh.map(x => String(x).replace(/[^A-Za-z0-9]/g, '')).join(', ')] : []),""")
rep("""      p10: 'The daily report was signed in the Service by the person named in the manifest, by drawing a signature on the device; the signature image is included as signature.png.' });""",
    """      p10: d.signature_png_b64 ? 'The daily report was signed in the Service by the person named in the manifest, by drawing a signature on the device; the signature image is included as signature.png.'
        : 'The daily report was signed in the Service by the person named in the manifest. The Service holds no signature image for this report, so none is included in this export.' });""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
