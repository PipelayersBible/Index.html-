# r17.14: Spanish for the "Report a serious injury" lines that safety p1 added (12 state plans). These lines sit in
# screens r17.13 already translates (Job Book safety form, confined space emergency panel), so without this they would
# show in English when Spanish is turned on. PB_ES_ENABLED stays false: dictionary only.
# Other new r17.14 English is listed in NOTES.md (Rules view, talks and PDFs are English today; the rest is left for the
# next Spanish round). Same style as r17.13 4_spanish.py. python3 es_injury_lines.py in.html out.html
import sys, os, json, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '811'))
from _rep import P
p = P()
TAIL = ' within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye'
ES = ' en 8 horas si hay una muerte, y en 24 horas por una hospitalización, una amputación o la pérdida de un ojo'
T = {
  'The company reports it to MOSH (1-800-759-6297)' + TAIL + ' (COMAR 09.12.21).': 'La compañía lo reporta a MOSH (1-800-759-6297)' + ES + ' (COMAR 09.12.21).',
  'The company reports it to MNOSHA (651-284-5050 or 877-470-6742; after hours, federal OSHA 1-800-321-6742)' + TAIL + '.': 'La compañía lo reporta a MNOSHA (651-284-5050 o 877-470-6742; fuera de horario, OSHA federal 1-800-321-6742)' + ES + '.',
  'The company reports it to Nevada OSHA (702-486-9020 south, 775-688-3700 north)' + TAIL + '.': 'La compañía lo reporta a Nevada OSHA (702-486-9020 sur, 775-688-3700 norte)' + ES + '.',
  'The company reports it to SC OSHA (803-896-7672)' + TAIL + '.': 'La compañía lo reporta a SC OSHA (803-896-7672)' + ES + '.',
  'The company reports it to Iowa OSHA (877-242-6742)' + TAIL + ' (875 IAC 4).': 'La compañía lo reporta a Iowa OSHA (877-242-6742)' + ES + ' (875 IAC 4).',
}
PATS = [
  # AZ, IN, NC, NM, TN, VT, WY: '... to ' + R.osha_name + TAIL + ' (the federal rule, 29 CFR 1904.39).'
  [r'^The company reports it to (.+?) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye \(the federal rule, 29 CFR 1904\.39\)\.$',
   'La compañía lo reporta a {0}' + ES + ' (la regla federal, 29 CFR 1904.39).'],
]
src = p.s
for k in T: assert k in src, 'English line not in the page: ' + k[:80]
a = '<script type="application/json" id="pbI18nDict">'
i = p.s.index(a) + len(a); j = p.s.index('</script>', i)
raw = p.s[i:j]; D = json.loads(raw)
dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
assert dump(D) == raw, 'dictionary does not round-trip'
for k, v in T.items():
    assert k not in D['t'] or D['t'][k] == v, 'already in the dictionary with other Spanish: ' + k
    D['t'][k] = v
have = {x[0] for x in D['p']}
for pat, es in PATS:
    re.compile(pat); assert pat not in have, pat
    D['p'].append([pat, es])
p.s = p.s[:i] + dump(D) + p.s[j:]
p.save()
print('spanish: +%d strings, +%d patterns' % (len(T), len(PATS)))
