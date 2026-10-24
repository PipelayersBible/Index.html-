#!/usr/bin/env python3
"""feat_company32 (r15.32, from the overnight company-side sweep, /home/claude/night/company.md):
 C1 [DATA] Save Plan sent the plan without its required-inspection counts (the server now keeps them — migration 32 —
    and the app sends them too, belt and braces).
 C3 [DATA] The job page counted a pipelayer's pending edit twice (crew row + approvals): Home said 2 waiting, the job 3.
 C4 [WORDING] The material chip printed the alert threshold as if it were the amount used ("80% of ordered used" at
    108%); now the real share, or "All of what's ordered used".
 C5 [UX] "Work without a run" panel sat on every job tab; Production tab only.
 C6 [WORDING] Foreman Home tile said "Waiting on you · Nothing waiting" above "1 run waiting for you"; the tile is named
    for what it counts: "Runs need production".
 C7 [UX] A manager who is also a foreman got both the crew pulse and the company pulse; the company one stays.
 C9 [UX] The field "Current job" card led the company account's Home; hidden there (the office does not start runs).
 C10 [WORDING] Equipment tab note said the hours come from Enter Production on each run; they come from the pieces
    entered for a pipelayer's run (My crew now) and the office form — said so until the foreman's own-run form exists.
 C11 [WORDING] Waiting note names the pipelayer too; the Edit project menu describes what the plan editor holds."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))
r('C1', "p_plan: Object.assign({ categories: cats, budget_hours: budget }, equipment.length ? { equipment } : {}), p_expect_uid: uid, p_expect_version: E.version }, 30000);",
  "p_plan: Object.assign({ categories: cats, budget_hours: budget }, equipment.length ? { equipment } : {}, pbPj.data && pbPj.data.plan && pbPj.data.plan.inspections ? { inspections: pbPj.data.plan.inspections } : {}), p_expect_uid: uid, p_expect_version: E.version }, 30000); // feat_company32 C1: the required inspections ride along")
r('C3b', "D.crew.filter(x => x && !x.voided && (x.status === 'pending' || x.status === 'assigned' || x.pending_edit)).length", "D.crew.filter(x => x && !x.voided && (x.status === 'pending' || x.status === 'assigned')).length /* feat_company32 C3: approvals carry every pending edit */")
r('C4a', "if (s.reached) h += '<span class=\"pb-chip notsent pbm-chip pbm-reached\">' + escapeHtml(s.pct + '% of ordered used') + '</span> ';",
  "if (s.reached) h += '<span class=\"pb-chip notsent pbm-chip pbm-reached\">' + escapeHtml(pbMatShareText(s)) + '</span> '; // feat_company32 C4")
r('C4b', "alertText: s.over ? 'Over expected' : s.reached ? s.pct + '% of ordered used' : '',", "alertText: s.over ? 'Over expected' : s.reached ? pbMatShareText(s) : '',")
r('C4c', "pbCxE(x.s.pct + '% of ordered used')", "pbCxE(pbMatShareText(x.s))")
r('C4d', "  function pbMatChips(m, s) {", "  function pbMatShareText(s) { return s.share !== null && s.share >= 1 ? 'All of what’s ordered used' : (s.share !== null ? Math.floor(s.share * 100) : s.pct) + '% of ordered used'; } // feat_company32 C4: the real share (used + waiting), never the alert line\n  function pbMatChips(m, s) {")
r('C5', ":is(#pjProgress, #pjManualSec, #pjTableSec, #pjDaysSec, #pjRecentSec, #pjWhoSec, #pjSiteLogSec) { display: none; }", ":is(#pjProgress, #pjNoRunWrap, #pjManualSec, #pjTableSec, #pjDaysSec, #pjRecentSec, #pjWhoSec, #pjSiteLogSec) { display: none; }")
r('C6', "'Waiting on you', C.wait ? 'Ended runs need production' : C.wait === null ? 'Loads with signal' : 'Nothing waiting'", "'Runs need production', C.wait ? 'Your crew’s ended runs' : C.wait === null ? 'Loads with signal' : 'None right now'")
r('C7_C9css', "#pbApp#pbApp #screen-settings .pb-set-switch { display: flex;", "html.pb-cx #homeFmPulse, html.pb-cx #homeCurrentJob { display: none !important; } /* feat_company32 C7/C9: the company Home has its own pulse and does not start runs */\n#pbApp#pbApp #screen-settings .pb-set-switch { display: flex;")
r('C10', "From the hours foremen enter on each run (Enter Production).", "From the hours foremen enter for their pipelayers’ runs (My crew now) and the office enters on run reports.")
r('C11a', "Nudge a foreman from a run below.", "Nudge the pipelayer or the assigned foreman from a run below.")
r('C11b', "['plan', 'Job plan', 'Categories, planned amounts, weights and budget hours']", "['plan', 'Job plan', 'Categories, planned amounts, budget hours, alerts, cost codes and equipment']")

def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('company32 written', len(s))
