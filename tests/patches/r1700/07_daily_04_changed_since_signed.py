import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# daily2 04: a signed day whose runs / crew hours / materials changed after signing says so, above Add an Amendment
rep("""      + (V.amend || !mine.some(r => r.state === 'sent' || r.state === 'waiting' || r.state === 'blocked') ? '' : '<div class="pb-btn-wrap pbd-bw"><button type="button" class="pb-btn ghost" id="drAmendBtn" onclick="pbDlyAmendStart()">Add an Amendment</button></div>') + '</div>';""",
"""      + (V.amend || !mine.some(r => r.state === 'sent' || r.state === 'waiting' || r.state === 'blocked') ? '' : pbDlyChangedSince(mine) + '<div class="pb-btn-wrap pbd-bw"><button type="button" class="pb-btn ghost" id="drAmendBtn" onclick="pbDlyAmendStart()">Add an Amendment</button></div>') + '</div>';""")
rep("""  window.pbDlyAmendStart = function() {""", """  function pbDlyChangedSince(mine) { /* daily2 04 */
    try {
      const V = pbDlyView, S = V.snap, last = mine.filter(r => r.state !== 'discarded' && r.state !== 'replaced' && r.snapshot).pop(); if (!S || V.building || !last) return '';
      const L = last.snapshot; if (!L.app || L.app !== S.app) return ''; // a report signed by another build is laid out differently
      const diff = [['runs', 'runs and production'], ['crew', 'crew hours'], ['materials', 'materials']].filter(([k]) => pbJsonbText(L[k] === undefined ? null : L[k]) !== pbJsonbText(S[k] === undefined ? null : S[k])).map(x => x[1]);
      if (!diff.length) return '';
      return '<div class="pb-warn" id="drChangedSince"><strong>The day\\u2019s records changed after you signed (' + escapeHtml(diff.join(', ')) + ').</strong>' + escapeHtml('The company has the signed version. Add an Amendment so it matches.') + '</div>';
    } catch (e) { return ''; }
  }
  window.pbDlyAmendStart = function() {""")
open(out, 'w', encoding='utf-8').write(s)
