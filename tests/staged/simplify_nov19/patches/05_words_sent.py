# 05 Words: "sync" becomes "send / sent" on the screens a crew sees every day (Home already says "Not sent" and
# "Sending the report to the office"), and the permit's second air-test button gets the same name as the first.
# Words only; no behavior changes. Usage: python3 05_words_sent.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
R = [
 ("'Sign in to sync production to your company. It is saved on this phone with each run.'", "'Log in to send production to your company. It is saved on this phone with each run.'"),
 (": pbProd.failed ? 'Production sync is paused on this phone.'", ": pbProd.failed ? 'Sending is paused on this phone.'"),
 ("' not synced yet' + (nBad ? ' ('", "' not sent yet' + (nBad ? ' ('"),
 (": 'All production synced.';", ": 'All production sent.';"),
 ("Your jobs show here once your production has synced.", "Your jobs show here once your production is sent."),
 ("' not synced yet' : 'Field tickets: all synced'", "' not sent yet' : 'Field tickets: all sent'"),
 ("n + ' not synced yet' : 'What you logged and its sync state'", "n + ' not sent yet' : 'What you logged, and what’s sent'"),
 ("const PB_ROLES_MINE_SUB = 'What you logged and its sync state'", "const PB_ROLES_MINE_SUB = 'What you logged, and what’s sent'"),
 ("<strong>Sync paused</strong>This phone&rsquo;s production sync record couldn&rsquo;t be read,", "<strong>Sending paused</strong>This phone&rsquo;s record of what was sent couldn&rsquo;t be read,"),
 ("<use href=\"#pb-i-refresh\"/></svg>Sync Now</button>", "<use href=\"#pb-i-refresh\"/></svg>Send Now</button>"),
 ("(n ? ' · ' + n + ' not synced yet' : ' · all synced')", "(n ? ' · ' + n + ' not sent yet' : ' · all sent')"),
 ("'They sync once you log in with signal.' : 'They sync when you have signal.'", "'They send once you log in with signal.' : 'They send when you have signal.'"),
 ("onclick=\"pbCpAtmoFormOpen(true)\">+ Add Test Reading</button>", "onclick=\"pbCpAtmoFormOpen(true)\">+ Log Air Test</button>"),
]
for a, b in R: p.rep(a, b)
p.save()
