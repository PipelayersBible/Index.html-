import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt tonight 04: a Lenker run has no stake rod reading and no HI cross-check: no second-shot prompt (its "Add a Rod
# Shot" had no field to go to, and "Lock Without It" put a false line on the report). The prompt counts the shots.
rep("""      if (hc && hc.candidates.length < 2) {""", """      if (hc && hc.candidates.length < 2 && activeVal('rodToggle') !== 'lenker') { const nShot = hc.candidates.filter(c => c && c.prefix).length; // bughunt: no rod shots on a Lenker run""")
rep("""' by AI, and only one stake has a rod shot, so nothing can catch a misread cut or elevation.""", """' by AI, and ' + (nShot ? 'only one stake has a rod shot' : 'no stake has a rod shot') + ', so nothing can catch a misread cut or elevation.""")
open(out, 'w', encoding='utf-8').write(s)
