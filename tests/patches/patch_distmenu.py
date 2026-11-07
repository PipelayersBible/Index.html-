import sys
src,out=sys.argv[1],sys.argv[2]; s=open(src,encoding='utf-8').read()
def rep(a,b):
    global s; c=s.count(a); assert c==1,(c,a[:70]); s=s.replace(a,b)
# distance cell = the row's menu button (the separate Menu column is hidden)
rep("""        <td>${escapeHtml(r.station)}${pbFitR ?""", """        <td class="pb-distcell" role="button" tabindex="0" aria-label="Distance ${escapeHtml(r.station)} actions" aria-haspopup="dialog"><span class="pb-distbtn">${escapeHtml(r.station)}</span>${pbFitR ?""")
rep("""' ft actions" onclick="pbXrMenu(this)"><span aria-hidden="true">\\u22ef</span></button>' : '') + '</td><td>' + escapeHtml(d) +""",
"""' ft actions" onclick="pbXrMenu(this)"><span aria-hidden="true">\\u22ef</span></button>' : '') + '</td>' + (xr ? '<td class="pb-distcell" role="button" tabindex="0" aria-label="Crossing at ' + escapeHtml(d) + ' ft actions" aria-haspopup="dialog"><span class="pb-distbtn">' + escapeHtml(d) + '</span>' : '<td>' + escapeHtml(d)) +""")
rep("    head.innerHTML = `<th>Menu</th><th>Dist.</th>`", "    head.innerHTML = `<th class=\"pb-menuth\">Menu</th><th>Dist.</th>`")
css = """
/* feat_r1613 (owner, Nov 7): no Menu column; the distance is the row's menu button (outlined, with a caret) */
#pbApp #screen-results #resultsTable thead th.pb-menuth, #pbApp #screen-results #resultsTable tr > td:first-child:not([colspan]):has(> .pb-gsdots), #pbApp #screen-results #resultsTable tr > td:first-child:not([colspan]):empty { display: none; }
#pbApp #screen-results #resultsTable td.pb-distcell { cursor: pointer; -webkit-tap-highlight-color: transparent; }
#pbApp #screen-results #resultsTable .pb-distbtn { position: relative; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px 2px 10px; border: 1.5px solid var(--pb-divider, #c9c2b0); border-radius: 10px; background: var(--pb-raised, #fff); line-height: 1.15; }
#pbApp #screen-results #resultsTable .pb-distbtn::after { content: ""; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid currentColor; opacity: 0.6; }
#pbApp #screen-results #resultsTable td.pb-distcell:active .pb-distbtn { background: var(--pb-raised-2, #eee); }
#pbApp #screen-results #resultsTable td.pb-distcell:focus-visible { outline: 2px solid var(--pb-brand, #f5c400); outline-offset: -2px; }
#pbApp #screen-results #resultsTable tr:has(.pb-gsdots.has-note) .pb-distbtn::before { content: ""; position: absolute; top: -4px; right: -4px; width: 9px; height: 9px; border-radius: 50%; background: var(--pb-brand, #f5c400); }
#pbApp#pbApp#pbApp #screen-results #resultsTable tr:is(:focus-within, :has(+ tr.pb-noterow:not([style*="none"])), :has(+ tr.pb-noterow + tr.pb-noterow:not([style*="none"]))) > td.pb-distcell { box-shadow: inset 6px 0 0 var(--pb-brand); }
#pbApp#pbApp#pbApp #screen-results #resultsTable tr:is(.pb-hubrow, .pb-startrow, .pb-endrow):not([data-laid-strip]) > td.pb-distcell { box-shadow: inset 5px 0 0 var(--pb-rs-edge, var(--pb-text-3)); }
#pbApp#pbApp#pbApp#pbApp #screen-results #resultsBody tr.pb-xing-near:not([data-laid-strip]):not(.pb-laid) > td.pb-distcell { box-shadow: inset 5px 0 0 var(--pb-danger-line); }
#pbApp#pbApp#pbApp#pbApp #screen-results #resultsBody tr.pb-xing-near:not([data-laid-strip]):not(.pb-laid):is(:focus-within, :has(+ tr.pb-noterow:not([style*="none"])), :has(+ tr.pb-noterow + tr.pb-noterow:not([style*="none"]))) > td.pb-distcell { box-shadow: inset 6px 0 0 var(--pb-brand), inset 10px 0 0 var(--pb-danger-line); }
"""
anchor='#pbApp .pbx-tabs::-webkit-scrollbar { display: none; }'
assert s.count(anchor)==1
s = s.replace(anchor, anchor + css)
# taps and keys on the distance open the hidden menu button's menu
rep("  function pbSlRowNotesInto(body, e, idx, colCount) {", """  (function () { // feat_r1613: the distance opens the row's menu
    const open = (ev) => { const td = ev.target && ev.target.closest && ev.target.closest('#resultsBody td.pb-distcell'); if (!td) return false; const b = td.parentElement && td.parentElement.querySelector('.pb-gsdots'); if (!b) return false; b.click(); return true; };
    document.addEventListener('click', (ev) => { open(ev); });
    document.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && open(ev)) ev.preventDefault(); });
  })();
  function pbSlRowNotesInto(body, e, idx, colCount) {""")
open(out,'w',encoding='utf-8').write(s); print('ok')
