import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.85 (owner, Nov 17): two-step login is offered to company owners and managers only (they see the whole company's
# records); crew accounts don't see it. Anyone who already turned it on still sees it (to turn it off) and is still asked for the code.
rep("""    const f = await pbMfaFactor();
    box.innerHTML = '<div class="pb-help" style="margin:0 0 6px;"><strong>Two-step login</strong>: ' + (f ? 'On. You enter a code from your authenticator app after each login.' : 'Off. Turn it on so a stolen password alone can’t get into this account.')""",
"""    const f = await pbMfaFactor();
    let mgr = false; try { const a = typeof pbProdAccMem !== 'undefined' && pbProdAccMem.get(sbUser.id); mgr = !!(a && a.manager); } catch (e) {}
    if (!f && !mgr) { box.innerHTML = ''; return; } // r16.85: crew accounts don't see it
    box.innerHTML = '<div class="pb-help" style="margin:0 0 6px;"><strong>Two-step login</strong>: ' + (f ? 'On. You enter a code from your authenticator app after each login.' : 'Off. Recommended for owners and managers, who can see the whole company’s records: with it on, a stolen password alone can’t get in. On an iPhone the Passwords app makes the codes; on Android use an authenticator app.')""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
