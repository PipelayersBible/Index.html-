# 06 A foreman adding pipelayers: "On my crew" opens "Add to your crew", which listed only people already in the
# company ("Nobody to pick right now" for a new crew). It now also has "Text a Join Link" (was only in Settings).
# Usage: python3 06_foreman_picker_link.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""        + '<div class="pb-btn-wrap pbp-btns">' + pbCrewBtn('pmPickCancel', 'Cancel', 'pbCrewPickCancel()', 'ghost') + '</div></section>';""",
      """        + (P.mode === 'addcrew' && typeof window.pbObCanFmLink === 'function' && window.pbObCanFmLink() ? '<p class="pbp-dim" id="pmTextJoinLine">Not in the list? Text them a join link.</p><div class="pb-btn-wrap pbp-btns">' + pbCrewBtn('pmTextJoinBtn', 'Text a Join Link', 'pbObOpenInvite()', ' ') + '</div>' : '') /* streamline 06 */
        + '<div class="pb-btn-wrap pbp-btns">' + pbCrewBtn('pmPickCancel', 'Cancel', 'pbCrewPickCancel()', 'ghost') + '</div></section>';""")
p.rep("  // a foreman's way in (the office has it on Crew members): Settings, under the account", """  window.pbObCanFmLink = function () { const uid = sbUser && sbUser.id, acc = uid ? pbProdAccMem.get(uid) : null; return !!(acc && acc.member && acc.role === 'foreman' && !acc.manager); }; // streamline 06
  // a foreman's way in (the office has it on Crew members): Settings, under the account""")
p.save()
