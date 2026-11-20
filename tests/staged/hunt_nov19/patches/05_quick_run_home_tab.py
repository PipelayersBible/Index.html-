# hunt_nov19 05: Quick Run (and the Confined Space Permits list) lit up the "More" tab though they are opened from Home.
# Since the nav fix that moved them to Home > Start work, neither is on the More tab any more (More lists Education &
# Reference, Confined Space Reference, Plans, Toolbox Talks, Stats, Edit Home shortcuts), but the tab table still said
# 'tools' for both, so the bottom bar pointed at a tab that doesn't hold them. Now both light up Home.
# Only the highlighted tab changes (pbScreenTab is read by the tab bar and by the PDF viewer / job book, which copy the
# tab of the screen they were opened from). Usage: python3 05_quick_run_home_tab.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("    tools: 'tools', quickrun: 'tools', formulasHub: 'tools', confinedHub: 'tools',",
      "    tools: 'tools', quickrun: 'home', formulasHub: 'tools', confinedHub: 'home', /* hunt_nov19 05: both are opened from Home > Start work, not from More */")
p.save()
