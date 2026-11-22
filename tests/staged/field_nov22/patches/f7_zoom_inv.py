# F7 Zoom on a 360 phone pushed INV off the screen (the numbers went 1.25x even when the columns no longer fit, and the
# table scrolled sideways). Now Zoom never makes the sheet wider than the screen: the Dist. column stays a step smaller
# (0.8x the normal size) and the value columns (BOP, INV, ...) take the largest size that still fits every picked
# column. On a 360 phone with Dist. + BOP + INV that is about 20% bigger numbers, all three on screen.
# Only when even Normal doesn't fit (many columns on a narrow phone) does it scroll sideways, as Normal does.
# Display only: the values, their rounding and the copy text are unchanged.
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from _rep import P
p = P()
p.rep('''    const min = Math.max(10, Math.round(parseFloat(getComputedStyle(cell).fontSize) || 13), zoomed && pbRsFit.normalFs ? Math.round(pbRsFit.normalFs * 1.25) : 0); // today's size (Zoom In's 25 px when zoomed); feat_rsgrid: Zoom always a step (1.25x) bigger than the fitted normal size''',
      '''    const min = Math.max(10, Math.round(parseFloat(getComputedStyle(cell).fontSize) || 13), zoomed && pbRsFit.normalFs ? pbRsFit.normalFs : 0); // field_nov22 F7: Zoom starts at the fitted normal size and grows only while every column stays on screen
    if (zoomed && pbRsFit.normalFs) t.style.setProperty('--pb-rs-dfs', Math.max(10, Math.round(pbRsFit.normalFs * 0.8)) + 'px'); else t.style.removeProperty('--pb-rs-dfs'); // the Dist. column a step smaller: room for bigger values''')
p.rep('''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
''', '''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
/* field_nov22 F7: Zoom keeps every column on screen: Dist. a step smaller, the values as big as fit */
#pbApp#pbApp#pbApp #screen-results #resultsTable.pb-rs-fit.pb-zoom tbody tr[data-laid-idx]:not([data-laid-strip]) > td:nth-child(2) { font-size: var(--pb-rs-dfs, var(--pb-rs-fs, 13px)); }
''')
p.save()
