import sys
s = open(sys.argv[1]).read()
a = s.index("  window.pbPlansPicked = async function(inp) {")
b = s.index("  // r16.18: hand a report to Documents")
s = s[:a] + open('new_block.js').read() + s[b:]
old = '<input type="file" id="plansFile" accept="application/pdf" hidden onchange="pbPlansPicked(this)">'
assert s.count(old) == 1
s = s.replace(old, '<input type="file" id="plansFile" accept="application/pdf" multiple hidden onchange="pbPlansPicked(this)">')
open(sys.argv[2], 'w').write(s); print('ok')
