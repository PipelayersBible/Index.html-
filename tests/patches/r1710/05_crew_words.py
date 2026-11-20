# 05 Crew members and the link sheet: one plain line each. Usage: python3 05_crew_words.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("No email needed. They tap the link and they&rsquo;re in, with the role you pick. Or add by email below.", "No email needed. They tap the link and they&rsquo;re in.")
p.rep('<h2 class="pb-h2 pbc-h2" id="crAddHead">Add crew member</h2>', '<h2 class="pb-h2 pbc-h2" id="crAddHead">Or invite by email</h2>')
p.rep("""'<p class="pbob-dim">For one person. They tap it and they’re in ' + escapeHtml(I.co || 'the company') + ' with the role you pick. No email, no password. Works once, for 24 hours.'""",
      """'<p class="pbob-dim">One link, one person. They tap it and they’re in ' + escapeHtml(I.co || 'the company') + '. Works once, for 24 hours.'""")
p.save()
