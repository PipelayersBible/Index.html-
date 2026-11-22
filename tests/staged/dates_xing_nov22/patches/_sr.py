# shared helpers for the 811 state table (PB_SR) and the Renew-by table (PB_LOC_RB). Each patch reads the CURRENT
# table, so the patches apply alone on r17.13 or stacked in any order (the row is re-serialized, not matched as text).
import json, re
dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
CHECKED = '2026-11-22'

class SR:
    def __init__(self, p, changes):
        self.p, self.changes = p, changes
    def table(self):
        s = self.p.s; i = s.index('  const PB_SR = {'); j = s.index('\n', i); line = s[i:j]
        a = line.index('{'); b = line.rindex('}') + 1
        T = json.loads(line[a:b]); assert dump(T) == line[a:b], 'state table does not round-trip'
        return T
    def fix(self, code, fields, sources, why=''):
        assert code != 'GA', 'Georgia is on hold'
        T = self.table(); R = T['states'][code]; old = dump(R)
        R = json.loads(old)
        for k, v in fields.items():
            assert k in R, code + ' has no field ' + k
            self.changes.append((code, k, R[k], v, (sources[0]['what'] if sources else why)))
            R[k] = v
        have = {x['url'] for x in R['sources']}
        for x in sources:
            if x['url'] not in have: R['sources'] = [x] + R['sources']; have.add(x['url'])
        R['checked'] = CHECKED
        self.p.rep('"' + code + '":' + old, '"' + code + '":' + dump(R))
    def notice_n(self, code, old_n, new_n, text, sources):
        T = self.table(); N = dict(T['states'][code]['notice'])
        assert N['n'] == old_n and N['unit'] == 'wd', (code, N)
        N['n'] = new_n; N['text'] = text
        self.fix(code, {'notice': N}, sources)
    def rb(self, code, old, new):
        # one entry of PB_LOC_RB (working days before expiry to call in the renewal / new ticket)
        s = self.p.s; i = s.index('  const PB_LOC_RB = {'); j = s.index('}', i)
        body = s[i:j]; tok = ' ' + code + ': ' + str(old) + ','
        if body.count(tok) != 1: tok = ' ' + code + ': ' + str(old) + ' '
        assert body.count(tok) == 1, ('RB', code, old)
        nb = body.replace(tok, tok.replace(': ' + str(old), ': ' + str(new)))
        self.p.s = s[:i] + nb + s[j:]
        self.changes.append((code, 'PB_LOC_RB', old, new, 'a new notice waits like the first call'))

def write_changes(path, changes):
    with open(path, 'w', encoding='utf-8') as f:
        f.write('| State | Field | Old | New | Source |\n|---|---|---|---|---|\n')
        for c, k, o, n, src in changes:
            sh = lambda v: (json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v).replace('|', '/')
            f.write('| %s | %s | %s | %s | %s |\n' % (c, k, sh(o), sh(n), src))
