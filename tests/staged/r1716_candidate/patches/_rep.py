# shared exact-once replace helper: python3 <patch>.py in.html out.html
import sys
class P:
    def __init__(self):
        self.src, self.dst = sys.argv[1], sys.argv[2]
        self.s = open(self.src, encoding='utf-8').read()
    def rep(self, old, new, count=1):
        n = self.s.count(old)
        assert n == count, ('expected %d, found %d' % (count, n), old[:120])
        self.s = self.s.replace(old, new)
    def save(self):
        open(self.dst, 'w', encoding='utf-8').write(self.s)
        print('ok', self.dst)
