# lib_811_nov20/tools/build.py - builds the 811 / damage prevention library batch. Run: python3 build.py
# Follows tests/staged/library_arch_nov20/lib_kb.py (id dig-<st>-<topic>-1, state field, edition/effective, license). Nothing is applied to the server.
import sys, os, importlib
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
from lib_kb import Batch, STATES
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
TODAY = '2026-11-20'
TOPIC = {
 'overview':  '811 dig rules by state: wait before digging, ticket life, tolerance zone',
 'tickets':   '811 tickets: types, ticket life, renewals and updates',
 'marks':     '811 marks: tolerance zone, hand digging, white lining, positive response',
 'damage':    '811 emergencies and what to do when a line is hit',
 'penalties': '811 penalties, exemptions and design tickets',
}
B = Batch('lib_811_dig', collection='dig', out_dir=OUT)
FED = Batch('lib_811_fed', out_dir=OUT)
def S(st, tag, title, text, source, url, ed=None, eff=None, conf='high', lic='gov-state', unc=None, n=1):
    """one state chunk. tag = overview|tickets|marks|damage|penalties. The overview chunk replaces the old one-per-state card dig-<st>."""
    B.add(id=f'dig-{st.lower()}-{tag}-{n}', state=st, title=f'{STATES[st]} 811: {title}', topic=TOPIC[tag], text=' '.join(text.split()),
          source=source, url=url, checked=TODAY, edition=ed, effective=eff, confidence=conf, kind='summary', license=lic,
          unconfirmed=unc, supersedes=(f'dig-{st.lower()}' if tag == 'overview' else None))
def U(id, title, topic, text, source, url, ed=None, eff=None, conf='high', lic='gov-us'):
    FED.add(id=id, state='US', title=title, topic=topic, text=' '.join(text.split()), source=source, url=url, checked=TODAY,
            edition=ed, effective=eff, confidence=conf, kind='summary', license=lic)
for m in sorted(f[:-3] for f in os.listdir(HERE) if f.startswith('d') and f[1:-3].isdigit() and f.endswith('.py')):
    importlib.import_module(m).load(S, U)
if __name__ == '__main__':
    strict = '--loose' not in sys.argv
    B.write(strict=strict); FED.write(strict=strict)
    import collections
    c = collections.Counter(x['state'] for x in B.chunks)
    print(len(B.chunks), 'state chunks in', len(c), 'states;', len(FED.chunks), 'US chunks')
    print('states missing:', sorted(set(STATES) - set(c)))
