import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:90]); s=s.replace(a,b)
# r16.29 (Tommy, Nov 15): the stake photo fills the point's own fields; no separate review card. Only values the AI was
# sure of (and that match what it copied) are filled, typed values are never replaced without asking, filled boxes are
# outlined until edited, and anything it wasn't sure of is listed in one line to type in.
rep("""    pbAiShow(stNow, Object.keys(got.flags).length ? 'warn' : 'ok', 'Check what AI read.', 'Nothing is filled until you tap Use These.');
    pbStakeAiRender(prefix);""", """    pbStakeAiRender(prefix);
    const box = document.getElementById(prefix + 'AiStakeReview'); if (box) box.style.display = 'none';
    pbStakeAiPending[prefix].auto = true;
    pbStakeAiUse(prefix);""")
rep("""    if (!plan.length) { showErr('Nothing to fill — type the values from the stake, or Discard.'); return; }""",
"""    if (!plan.length) {
      if (p.auto) { delete pbStakeAiPending[prefix]; pbStakeAiRender(prefix); pbAiShow(document.getElementById(prefix + 'AiStakeStatus'), 'warn', 'Nothing filled.', 'The AI wasn’t sure of anything on this stake.' + pbStakeAiUnsure(p)); return; }
      showErr('Nothing to fill — type the values from the stake, or Discard.'); return;
    }""")
rep("""      pbAiShow(document.getElementById(prefix + 'AiStakeStatus'), 'ok', 'Filled from the stake photo.', 'Check the numbers before you calculate.');
    };""", """      plan.forEach(x => { if (onlyEmpty && x.cur !== null) return; const el = document.getElementById(x.id); if (el) { el.classList.add('pb-ai-filled'); el.addEventListener('input', () => el.classList.remove('pb-ai-filled'), { once: true }); } });
      const filled = plan.filter(x => !(onlyEmpty && x.cur !== null) && x.kind !== 'sel').map(x => x.name.toLowerCase()).join(', ');
      pbAiShow(document.getElementById(prefix + 'AiStakeStatus'), p.flags && Object.keys(p.flags).filter(k => k !== 'stakeNum' && k !== 'line').length ? 'warn' : 'ok', 'Filled from the stake photo.', 'Filled: ' + filled + '. Check the outlined boxes against the stake.' + pbStakeAiUnsure(p));
    };""")
rep("""  window.pbStakeAiUse = function(prefix) {""", """  // One line listing what the AI read but wasn't sure of, so it can be typed in.
  function pbStakeAiUnsure(p) {
    const names = { stakeNum: 'stake number', station: 'station', offset: 'offset', line: 'line', cf: 'cut/fill', stakeElev: 'stake elevation' };
    const th = p.thought || {}, out = Object.keys(p.flags || {}).filter(k => names[k] && th[k]).map(k => names[k] + ' (it read “' + th[k] + '”)');
    return out.length ? ' Not sure: ' + out.join(', ') + '.' : '';
  }
  window.pbStakeAiUse = function(prefix) {""")
rep("""#pbApp .pb-ai-review { margin-top: 12px;""", """#pbApp .pb-ai-filled { box-shadow: 0 0 0 2px var(--pb-warn, #d99a00) !important; }
#pbApp .pb-ai-review { margin-top: 12px;""")
rep("Replace them with what you reviewed, or fill only the empty fields?", "Replace them with what the AI read, or fill only the empty fields?")
open(sys.argv[2],'w').write(s); print('ok')
