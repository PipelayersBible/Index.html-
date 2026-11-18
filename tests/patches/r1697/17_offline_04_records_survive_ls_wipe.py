import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# offline audit 04 (Nov 17, on r16.95) [medium: rare, but every run and photo is lost]: since r16.47 Records live in
# IndexedDB and only a tiny localStorage marker ("<uid>:runArchive@idb") says so. When localStorage is wiped and
# IndexedDB is not (a phone cleaner, a browser's "clear cookies" that keeps databases, a WebKit storage hiccup), the
# load reads "no marker, nothing in localStorage" = an empty Records, and the next save (the next Lock, laid mark, ...)
# writes that near-empty list over the intact copy in IndexedDB. rig/t14_lsclear.js: the run is gone after the wipe and
# overwritten by the next Lock. Fix: with no marker and nothing in localStorage, the IndexedDB copy is read (and the
# marker put back); a localStorage copy, when there is one, still wins as before.
rep("""    if (!moved) return localStorage.getItem(key);""",
    """    if (!moved) {
      const ls = localStorage.getItem(key); if (ls !== null) return ls;
      let v = null; try { v = await pbBigTx('readonly', st => st.get(key)); } catch (e) { v = null; } /* offline audit 04: the marker was wiped, the records weren't */
      if (typeof v === 'string') { try { localStorage.setItem(pbBigMark(key), '1'); } catch (e) {} return v; }
      return null;
    }""")
open(out, 'w', encoding='utf-8').write(s)
