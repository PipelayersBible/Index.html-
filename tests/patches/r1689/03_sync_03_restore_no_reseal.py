import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Bug hunt (sync 03): a run restored from the account is not sealed again as it stands (the copy has no photos and
# nobody edited it). Its current state is noted as already sealed on this phone; an edit made here later is sealed as
# the next version, as before.
rep("""    list.forEach(e => { try { sent[String(e.id)] = pbHashText(JSON.stringify([pbRrOfficeCopy(e), acc.companyId])); } catch (x) {} });
    await pbSetFor(uid, 'rrSent', JSON.stringify(sent));""",
"""    const keys = {};
    list.forEach(e => { try { const rec = pbRrOfficeCopy(e); sent[String(e.id)] = pbHashText(JSON.stringify([rec, acc.companyId])); keys[String(e.id)] = pbRrSealKey(rec); } catch (x) {} });
    await pbSetFor(uid, 'rrSent', JSON.stringify(sent));
    try { /* not sealed again as restored */
      let seals = {}; try { seals = JSON.parse((await pbGetFor(uid, 'rrSeals')) || '{}') || {}; } catch (x) { seals = {}; }
      Object.keys(keys).forEach(id => { if (!seals[id]) seals[id] = { k: keys[id], n: 0, at: Date.now(), restored: 1 }; });
      await pbSetFor(uid, 'rrSeals', JSON.stringify(seals));
    } catch (x) {}""")
open(out, 'w', encoding='utf-8').write(s)
