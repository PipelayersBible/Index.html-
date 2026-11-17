import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.80: each time a run reaches the company, the phone's clock is recorded next to the server's (pb_prod.run_clock)
rep("if (!r.error && r.data && r.data.ok === true) { try { if (await pbRrPhotosUp(uid, t)) again = true; }",
    "if (!r.error && r.data && r.data.ok === true) { try { await pbPermitRpc('pb_prod_run_clock', { p_entry_id: t.id, p_phone_at: new Date().toISOString() }, 10000); } catch (x) {} /* r16.80 */ try { if (await pbRrPhotosUp(uid, t)) again = true; }")
# office list: the server's own check and the outside time stamps
rep("const btns = L.slice(0, 6).map(sl => ({ label: 'Version ' + sl.version + ' · ' + when(sl.made_at || sl.sealed_at), primary: sl === L[0], onClick: () => { window.pbRrSealGet(sl, x); } }));",
    "const btns = L.slice(0, 6).map(sl => ({ label: 'Version ' + sl.version + ' · ' + when(sl.made_at || sl.sealed_at), primary: sl === L[0], onClick: () => { window.pbRrSealGet(sl, x); } }));\n    const c0 = L[0] && L[0].server_check, chk = !c0 ? '\\n\\nThe server checks each new sealed copy within about 10 minutes.' : c0.matches ? '\\n\\nNewest version: the server re-read the file and its fingerprint matches' + (Array.isArray(c0.tsa) && c0.tsa.length ? '; time-stamped by ' + c0.tsa.join(' and ') + ' (outside time-stamp services)' : '') + '.' : '\\n\\nNewest version: the server\\u2019s check of this file did NOT match. Report it from Settings.'; /* r16.80 */")
rep("+ (L.length > 6 ? '\\n\\nShowing the newest 6 of ' + L.length + '.' : ''), btns, 'Sealed Originals');",
    "+ chk + (L.length > 6 ? '\\n\\nShowing the newest 6 of ' + L.length + '.' : ''), btns, 'Sealed Originals');")
open(out, 'w', encoding='utf-8').write(s); print('ok')
