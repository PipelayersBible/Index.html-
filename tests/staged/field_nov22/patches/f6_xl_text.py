# F6 cut-offs at Extra Large text (and "+ Add Crossing" at Normal on a 360 phone). CSS only, nothing moves at Normal
# except the two Run Setup add buttons' inner padding.
#  - Run details summary (distance · slope · pipe size) wraps instead of "…" (was cut at Extra Large).
#  - Pipe laid / Avg. time / Current time labels wrap at Large / Extra Large instead of running into each other.
#  - Pass / Fail / Partial (and every two-to-four choice toggle) at Large / Extra Large: a choice is never narrower than
#    its longest word; the row wraps instead of the word running past the button's edge ("Partial").
#  - Bottom tabs at 320 px with Extra Large text: the labels already draw at 11 px x 1.4 (about 15 px on screen, bigger
#    than Normal's 12.5 px); what was wrong is "Recor…" cut off. The tab loses its 2 px side padding and the label a hair
#    of letter spacing at that size, so "Records" shows whole.
#  - "+ Add Crossing" / "+ Add Hub" (Run Setup, two side by side at 360 px): 6 px side padding and may wrap (was 8 px past
#    its box at Normal).
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from _rep import P
p = P()
p.rep('''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
''', '''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
/* field_nov22 F6: Extra Large text cut-offs */
#pbApp#pbApp#pbApp #screen-results .pb-rdet-s { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; }
#pbApp#pbApp#pbApp.pb-text-big #screen-results .pb-lstat > dt { white-space: normal; overflow-wrap: normal; }
#pbApp#pbApp.pb-text-big .pb-toggle > button { min-width: auto; }
#pbTabBar .pb-tab { padding-left: 0; padding-right: 0; }
@container (max-width: 51.9px) { #pbTabBar#pbTabBar .pb-tab .lb { letter-spacing: -0.45px; text-overflow: clip; } }
#pbApp#pbApp#pbApp #screen-input .pb-hubgrp.pb-xing-grp > .pb-section:is(.pb-add-hub-section, .pb-add-xing-section) > .pb-tag { white-space: normal; padding-left: 6px; padding-right: 6px; overflow-wrap: anywhere; }
''')
p.save()
