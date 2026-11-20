# shared exact-once replace helper: every rep(old, new) must match exactly once
import sys
def load():
    if len(sys.argv) != 3: sys.exit('usage: python3 p.py in.html out.html')
    return open(sys.argv[1], encoding='utf-8').read()
class P:
    def __init__(self): self.s = load()
    def rep(self, old, new):
        n = self.s.count(old)
        assert n == 1, 'expected 1 match, found %d: %r' % (n, old[:120])
        self.s = self.s.replace(old, new)
    def save(self): open(sys.argv[2], 'w', encoding='utf-8').write(self.s)
