# 04 Getting Started (a new company's Home): "Text a Join Link" opens the link sheet right there (was: Add Crew ->
# Crew members -> Text a Join Link), "Add by Email" goes to Crew members. Shorter words.
# Usage: python3 04_getting_started.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""      + '<p class="pbob-dim" style="margin:0;">Three steps to get your crew working in the app.</p><ol>'""", """      + '<ol>'""")
p.rep("""waiting ? waiting + ' waiting to join. Text a join link or add by email.' : 'Text each foreman and pipelayer a join link, or add them by email.', '<button type="button" class="pb-btn small" id="homeObCrewBtn" onclick="pbOpenCrewMembers()">Add Crew</button>')""",
      """waiting ? waiting + ' waiting to join.' : 'Text each person a join link. No email needed.', '<button type="button" class="pb-btn small" id="homeObCrewBtn" onclick="pbObStartText()">Text a Join Link</button> <button type="button" class="pb-btn tertiary small" id="homeObEmailBtn" onclick="pbOpenCrewMembers()">Add by Email</button>')""")
p.rep("""'They tap the link you text them. On iPhone, Safari’s Share button, then Add to Home Screen, keeps it one tap away. Checks off when someone on the crew signs in.'""",
      """'They tap the link you text them. Checks off when someone signs in.'""")
p.rep("  window.pbObStartRender = pbObStartRender;", """  window.pbObStartRender = pbObStartRender;
  window.pbObStartText = async function () { // streamline 04: the link sheet from Home; the crew list loads behind it for the foreman picker
    const uid = sbUser && sbUser.id; if (!uid) return;
    window.pbObOpenInvite();
    try {
      if (pbCmSt.uid !== uid) pbCmSt = pbCmNew(uid);
      if (!pbCmSt.data && typeof window.pbCmLoad === 'function') await window.pbCmLoad();
      const I = PB_OB.inv;
      if (I && I.uid === uid && pbCmSt.data && document.getElementById('pbObSheet') && !PB_OB.busy) { pbObKeepName(I); if (!I.co) I.co = pbCmSt.data.company_name || ''; pbObInvRender(); }
    } catch (e) {}
  };""")
p.save()
