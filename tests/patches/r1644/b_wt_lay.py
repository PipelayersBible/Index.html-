import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)
rep("""<label for="runWT">Wall thickness<span class="pb-sr"> (ft)</span><span class="pb-req"> (required)</span></label>""",
    """<label for="runWT">Wall thickness<span class="pb-sr"> (ft)</span></label>""")
rep("""      anchor.insertAdjacentHTML('afterend', pbLaySetupHTML(n));""",
    """      anchor.insertAdjacentHTML('afterend', pbLaySetupHTML(n));
      if (n === 1) { const row = document.getElementById('runWTRow'), lf = document.getElementById(ids.len) && document.getElementById(ids.len).closest('.pb-field'); if (row && lf) row.appendChild(lf); } // r16.43: laying length beside the wall thickness""")
open(out, 'w', encoding='utf-8').write(s)
