import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt (Nov 17): the manager-only Settings boxes (two-step login, admin access log) are drawn again when the server's
# access answer arrives while Settings is open (first login on a phone: they stayed empty until Settings was reopened).
rep("""    pbProdAccMem.set(uid, a);
    try { await pbSetFor(uid, PB_PROD_ACCESS_KEY, JSON.stringify(Object.assign({}, a, { seq: 0 }))); } catch (e) {}""",
"""    pbProdAccMem.set(uid, a);
    try { if (pbCurrentScreen === 'settings') { if (typeof window.pbMfaRender === 'function') window.pbMfaRender(); if (typeof window.pbAdminLogRender === 'function') window.pbAdminLogRender(); } } catch (e) {}
    try { await pbSetFor(uid, PB_PROD_ACCESS_KEY, JSON.stringify(Object.assign({}, a, { seq: 0 }))); } catch (e) {}""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
