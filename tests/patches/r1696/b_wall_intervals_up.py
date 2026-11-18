import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.96 (owner, Nov 17): "Put pipe wall and laying length and the intervals sections under the pipe section." Pipe Wall &
# Laying Length goes into the Pipe details card (under Pipe size / type), and the Intervals card comes back right after it.
# More settings keeps rod type, HI method, trench design and total distance; its closed line and its open rules follow.
rep("""      var mo = document.getElementById('runSecMore'), ls = document.getElementById('runLengthSection'); /* r16.95: Intervals and Trench design live in More settings */
      if (mo && ls && ls.parentNode === mo) [ic, bed].forEach(function (x) { if (x && x.parentNode !== mo) mo.insertBefore(x, ls); });""",
    """      var ws = document.getElementById('runWallSection'); if (ws && ws.parentNode !== pc) pc.appendChild(ws); /* r16.96: wall & laying length under the pipe */
      var mo = document.getElementById('runSecMore'), ls = document.getElementById('runLengthSection'); /* r16.95: Trench design lives in More settings (r16.96: Intervals back under the pipe) */
      if (mo && ls && ls.parentNode === mo) [bed].forEach(function (x) { if (x && x.parentNode !== mo) mo.insertBefore(x, ls); });
      if (ic && ic.closest('#runSecMore') && pc.parentNode) pc.parentNode.insertBefore(ic, pc.nextElementSibling);""")
rep("""      const wt = v('runWT');
      if (wt !== '' && !pbPiAIsAuto('runWT') && nrWtMem !== undefined) {
        const rem = document.getElementById('runRememberWtId');
        if (!(rem && rem.checked && nrWtMem !== '' && Number(wt) === Number(nrWtMem))) odd.push('wt:' + wt);
      }
      const c = pbLayCfg(1), r = pbLayRemembered || { on: false, len: null, div: 'halves' };
      if (c.len !== null && !c.lenAuto && !same(c.len, r.len)) odd.push('len:' + c.len);
      if (c.on !== !!r.on || (c.on && c.div !== (r.div || 'halves'))) odd.push('lay:' + c.on + c.div);
      const iv = document.getElementById('interval');
      if (iv && v('interval') !== '10' && !(iv.dataset.rsAuto !== undefined && iv.value === iv.dataset.rsAuto)) odd.push('iv:' + v('interval'));
""", """      // r16.96: wall, laying length and intervals sit under the pipe now (always in view), not in this fold
""")
rep("""      const wt = v('runWT'); p.push(wt ? wt + ' ft wall' + pbPiAWord(pbPiAIsAuto('runWT')) : 'wall thickness not entered');
      const c = pbLayCfg(1);
      if (c.len !== null) p.push(c.len + ' ft laying length' + pbPiAWord(c.lenAuto));
      p.push(pbLayRunSecWords() || (v('interval') ? v('interval') + ' ft interval' : 'interval not entered'));
""", "")
open(out, 'w', encoding='utf-8').write(s)
