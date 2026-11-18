import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# daily2 03: removing a crew / equipment row from the daily (its X is 6 px from the "+" hours button) can be undone for 8 s
rep("""  // ---- B: on the screen ----""", """  { const o = window.pbDpRemove; window.pbDpRemove = async function(kind, i) { /* daily2 03: Undo */
      let d = null, x = null, rf, me; try { d = pbDpDraft(); x = d && (kind === 'Crew' ? d.crew[i] : d.equip[i]); x = x ? JSON.parse(JSON.stringify(x)) : null; rf = d && Array.isArray(d.rfGone) ? d.rfGone.slice() : undefined; me = d ? d.meGone : undefined; } catch (e) { x = null; }
      const r = await o.apply(this, arguments);
      if (x && d) { try { pbDpUndoBar('Removed ' + (kind === 'Crew' ? x.name : pbDpEqName(x)) + '.', () => {
        const d2 = pbDpDraft(); if (!d2 || d2.k !== d.k) return; const L = kind === 'Crew' ? d2.crew : d2.equip;
        if (L.some(y => JSON.stringify(y) === JSON.stringify(x))) return; L.splice(Math.min(i, L.length), 0, x);
        if (rf === undefined) delete d2.rfGone; else d2.rfGone = rf; if (me === undefined) delete d2.meGone; else d2.meGone = me;
        pbDpTouch(d2).catch(() => {}); pbDpRender(); }); } catch (e) { console.error(e); } }
      return r; }; }
  function pbDpUndoBar(text, undo) {
    try { const old = document.getElementById('dxUndo'); if (old) old.remove(); const tm = document.getElementById('dxToast'); if (tm) tm.remove();
      const o = document.createElement('div'); o.id = 'dxUndo'; o.className = 'dx-toast'; o.setAttribute('role', 'status'); o.style.cssText = 'display:flex;align-items:center;gap:12px;';
      const t = document.createElement('span'); t.style.flex = '1'; t.textContent = text; const b = document.createElement('button'); b.type = 'button'; b.id = 'dxUndoBtn'; b.className = 'pb-btn small'; b.textContent = 'Undo'; b.style.cssText = 'min-height:44px;min-width:88px;width:auto;margin:0;flex:none;';
      let done = false; b.addEventListener('click', () => { if (done) return; done = true; o.remove(); undo(); });
      o.appendChild(t); o.appendChild(b); (document.getElementById('pbApp') || document.body).appendChild(o); setTimeout(() => { try { o.remove(); } catch (e) {} }, 8000); } catch (e) {}
  }
  // ---- B: on the screen ----""")
open(out, 'w', encoding='utf-8').write(s)
