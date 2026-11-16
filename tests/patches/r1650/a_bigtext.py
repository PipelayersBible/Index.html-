import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
old = "#pbApp#pbApp #screen-input .pb-rs-slope:empty { display: none; }"
assert s.count(old) == 1
s = s.replace(old, old + """
/* r16.50: Large / Extra Large text: pairs that would cut words stack */
#pbApp#pbApp.pb-text-big #screen-input .pb-fit-row { grid-template-columns: minmax(0, 1fr) !important; }
#pbApp#pbApp.pb-text-big #screen-input .pb-pipepair:not(.pb-pipe-auto) { grid-template-columns: minmax(0, 1fr) !important; }
#pbApp#pbApp.pb-text-big #screen-results #pbSlBtns { grid-template-columns: minmax(0, 1fr) !important; }
#pbApp#pbApp.pb-text-big #screen-input .pb-red-after .pb-field { max-width: none; }""")
open(out, 'w', encoding='utf-8').write(s)
