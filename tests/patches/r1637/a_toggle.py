import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)
rep("""    if (b.dataset.st === 'sta') { const el = document.getElementById(p + 'StaTxt'); if (el && !el.value.trim()) pbStSync(); else pbStFromText(p); }
    pbStOut(p);
  });""", """    if (b.dataset.st === 'sta') {
      const el = document.getElementById(p + 'StaTxt'), dEl = document.getElementById(pbStDistId(p)), n = pbStRunOf(p), s = pbStStart(n), d = dEl ? numVal(dEl.id) : null;
      if (el && dEl && s && d !== null && w.dataset.stLast === 'dist') { el.value = pbStFmt(s.v + pbStDirOf(n) * d); dEl.dataset.stFrom = dEl.value; } // the distance typed last: the station follows it
      else if (el && !el.value.trim()) pbStSync(); else pbStFromText(p);
    }
    delete w.dataset.stLast;
    pbStOut(p);
  });
  // Which box of a point was typed in last: switching back to Station keeps a distance typed after the station.
  document.addEventListener('input', (ev) => { const el = ev.target, w = el && el.closest && el.closest('#screen-input .pb-st-wrap'); if (!w || pbRsBusy) return; if (/StaTxt$/.test(el.id)) w.dataset.stLast = 'sta'; else if (el.closest('.pb-st-dist')) w.dataset.stLast = 'dist'; }, true);""")
open(out, 'w', encoding='utf-8').write(s)
