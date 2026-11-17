import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
rep("""  async function pbRpfOpenPermit(x) {""", """  window.__pbRpfDebug = { openDaily: (id) => pbRpfOpenDaily(id), openPermit: (x) => pbRpfOpenPermit(x) }; // r16.84: tests
  async function pbRpfOpenPermit(x) {""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
