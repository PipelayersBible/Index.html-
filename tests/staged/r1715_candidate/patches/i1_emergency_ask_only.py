# r17.15 integration: "Emergency? Call 911." belongs on Ask's own "can't answer" messages (ask_quality_nov22), not on the
# photo readers (stake, ticket, cut sheet / generic AI reading), which share the same message table.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""  const PB_AI_MSG = {""", """  const pbAiNoEmg = (m) => String(m == null ? '' : m).replace(' Emergency? Call 911.', ''); // r17.15: the photo readers don't add the Ask line
  const PB_AI_MSG = {""")
p.rep("""    if (!r.ok) { pbAiShow(statusEl, 'warn', 'AI reading didn’t work.', r.message + ' Nothing here was changed.'); return; }""",
      """    if (!r.ok) { pbAiShow(statusEl, 'warn', 'AI reading didn’t work.', pbAiNoEmg(r.message) + ' Nothing here was changed.'); return; }""")
p.rep("""      pbAiShow(stNow, 'warn', 'Stake not read.', r.message + (net ?""", """      pbAiShow(stNow, 'warn', 'Stake not read.', pbAiNoEmg(r.message) + (net ?""")
p.rep("""        if (!r.ok) { if (r.code === 'daily_limit') limitHit = r.message; else netFail++; return; }""",
      """        if (!r.ok) { if (r.code === 'daily_limit') limitHit = pbAiNoEmg(r.message); else netFail++; return; }""")
p.rep("""pbTkAiShow('warn', 'Ticket not read.', (r.why ? r.message : 'No AI readings left today.') + ' Type the values from the ticket.'); return; }""",
      """pbTkAiShow('warn', 'Ticket not read.', (r.why ? pbAiNoEmg(r.message) : 'No AI readings left today.') + ' Type the values from the ticket.'); return; }""")
p.rep("""      pbTkAiShow('warn', 'Ticket not read.', r.message + ' Nothing on the form was changed.'); return;""",
      """      pbTkAiShow('warn', 'Ticket not read.', pbAiNoEmg(r.message) + ' Nothing on the form was changed.'); return;""")
p.save()
