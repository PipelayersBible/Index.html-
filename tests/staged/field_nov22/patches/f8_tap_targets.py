# F8 small tap targets, 44 px without moving the layout:
#  - Terms of Use / Privacy Policy links in Account & Settings, and the OSHA / NIOSH / CFR links in Education
#    (a.pb-extlink): an invisible 44 px tall hit area around the link text (the text and the lines don't move).
#  - Run Setup "Clear" (job): 44 x 44 (was 39 x 40); it stays right-aligned.
#  - Home notice dots (.pb-ng-dots) are 44 x 44 already in r17.15 (verified); not changed.
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from _rep import P
p = P()
p.rep('''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
''', '''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
/* field_nov22 F8: 44 px tap areas for small links (an invisible hit area; the text doesn't move) and Run Setup Clear */
#pbApp :is(a.pb-extlink, #settingsLegal a) { position: relative; -webkit-tap-highlight-color: transparent; }
#pbApp :is(a.pb-extlink, #settingsLegal a)::before { content: ""; position: absolute; left: -4px; right: -4px; top: 50%; height: max(44px, 100%); transform: translateY(-50%); }
#pbApp#pbApp#pbApp #screen-input .pb-job-reset { min-height: 44px; min-width: 44px; text-align: center; }
''')
p.save()
