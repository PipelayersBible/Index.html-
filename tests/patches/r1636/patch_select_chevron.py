import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:90]); s=s.replace(a,b)
# r16.36 (Tommy, Nov 15): pick lists look like pick lists again. The chevron rule lost to a later input rule's
# "background" shorthand, so every select in a form showed as a plain box. "Fitting" reads "Fitting type".
rep("""#pbApp .pb-fif-item select { padding-right: 18px; background-position: right 2px center; background-size: 14px 14px; }""",
"""#pbApp .pb-fif-item select { padding-right: 18px; background-position: right 2px center; background-size: 14px 14px; }
#pbApp#pbApp :is(.pb-field, .pb-fit-row) select:not([multiple]) {
  padding-right: 40px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' fill='none' stroke='%23F4F6F8' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; background-size: 20px 20px;
}
html.pb-light #pbApp#pbApp :is(.pb-field, .pb-fit-row) select:not([multiple]) {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' fill='none' stroke='%230B0D10' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}""")
rep("""<label for="' + prefix + 'FitType">Fitting</label>""", """<label for="' + prefix + 'FitType">Fitting type</label>""")
open(sys.argv[2],'w').write(s); print('ok')
