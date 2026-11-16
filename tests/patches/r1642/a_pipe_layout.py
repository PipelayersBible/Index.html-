import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
lines = s.split('\n')
# locate the run-1 pipe block
i = next(k for k, l in enumerate(lines) if 'id="runPipeSection"' in l)
assert '<div class="pb-row pb-pipepair">' in lines[i + 3]
wt, idf, close = lines[i + 4], lines[i + 5], lines[i + 6]
assert 'id="runWT"' in wt and 'id="runIdSel"' in idf and close.strip() == '</div>'
other = lines[i + 7]; assert 'id="runIdOtherWrap"' in other
pt = lines[i + 8]; assert pt.startswith('<div class="pb-field" id="runPipeTypeWrap">')
new = [
  '        <div class="pb-row pb-pipepair">',
  idf,
  '          ' + pt,
  '        </div>',
  other,
  '        <div class="pb-row pb-pipepair pb-pipe-auto" id="runWTRow">',
  wt,
  '        </div>',
]
lines[i + 3:i + 9] = new
s = '\n'.join(lines)
def rep(old, new_):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new_)
# run 1's laying length goes under the wall thickness (after its diagram link)
rep("""      const anchor = document.getElementById(n === 1 ? 'runIdOtherWrap' : 'seg' + n + 'IdOtherWrap');""",
    """      let anchor = document.getElementById(n === 1 ? 'runWTRow' : 'seg' + n + 'IdOtherWrap');
      if (anchor && n === 1 && anchor.nextElementSibling && anchor.nextElementSibling.classList.contains('pb-edu-helplink')) anchor = anchor.nextElementSibling;""")
rep("""#pbApp#pbApp #screen-input .pb-pipepair > .pb-field { margin-left: 0; margin-right: 0; min-width: 0; }""",
    """#pbApp#pbApp #screen-input .pb-pipepair > .pb-field { margin-left: 0; margin-right: 0; min-width: 0; }
#pbApp#pbApp #screen-input .pb-pipepair.pb-pipe-auto { grid-template-columns: 1fr 1fr; }""")
open(out, 'w', encoding='utf-8').write(s)
