import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
old = """    const el = document.getElementById(prefix+'StakeDerived');
    if (se === null || cf === null) { el.textContent=''; return; }"""
new = """    const el = document.getElementById(prefix+'StakeDerived');
    if (se === null && activeVal('hiToggle') === 'stakes' && getElevVal(prefix+'StakeReading') !== null && !isPredictedFillMarked(prefix+'StakeReading')) { el.textContent = 'Add the stake elevation to predict the other rod readings.'; return; } // r16.43: a shot with no elevation can't give the HI
    if (se === null || cf === null) { el.textContent=''; return; }"""
assert s.count(old) == 1
s = s.replace(old, new)
open(out, 'w', encoding='utf-8').write(s)
