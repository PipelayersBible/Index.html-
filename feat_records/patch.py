#!/usr/bin/env python3
"""feat_records (r15.32, from the overnight Records sweep, /home/claude/night/records.md):
 R1 [DATA] Job Summary: after an earlier session of a resumed run is deleted, its 1.5 h stayed in the Footage / Man-Hour
    rate but vanished from the hours tiles. The grid now says "+ N h from a deleted earlier session: in the rates, not above".
 R2 [UX] Records: a superseded session read "100.0 ft (incomplete)" like an unfinished run; it now says "continued in a later
    session", and the later session says what it resumes. The Jobs page calls it "Continued later", not "Ended early".
 R3 [WORDING] Home: "saved on this phone but NOT sent" for a failed cloud copy now uses the Records words (no cloud copy /
    Retry Sync), so Home and Records agree about a run that WAS emailed.
 R4 [WORDING] Delete warning named "corrections" the run never had and could not tell two same-label sessions apart:
    the corrections sentence appears only when there are corrections; same-label runs are labelled with their lock date.
 R5 [UX] Job Summary field notes: the Note column was off-screen at phone width; the table is fixed-layout and wraps.
 R6 [WORDING] Report rows said the status three times; the saved-only line is one short sentence.
 R7 [WORDING] Jobs page still said "Reports" for the Records screen.
 R8 [WORDING] Bulk email subject "N Run Report(s)" also for permits → "N report(s) from The Pipelayer’s Bible"."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))
# R1
r('R1a', "    const totalManHours = laborerHours + operatorHours;\n    const crewHours = crewLogRuns ? {\n      laborerHours, operatorHours, equipmentHours,",
  "    const totalManHours = laborerHours + operatorHours;\n    const carriedManHours = runs.reduce((a, r) => a + pbChainOf(r).reduce((b, x) => b + (typeof x.deletedEarlierManHours === 'number' ? x.deletedEarlierManHours : 0), 0), 0); // feat_records R1: hours a deleted earlier session left behind (in the rates)\n    const crewHours = crewLogRuns ? {\n      laborerHours, operatorHours, equipmentHours, carriedManHours,")
r('R1b', """            <div class="pb-summary-item" style="grid-column:1/-1;"><div class="k">Equipment Hours</div><div class="v">${s.crewHours.equipmentHours.toFixed(1)} hr</div></div>
          </div></div>""",
"""            <div class="pb-summary-item" style="grid-column:1/-1;"><div class="k">Equipment Hours</div><div class="v">${s.crewHours.equipmentHours.toFixed(1)} hr</div></div>
          </div></div>
          ${s.crewHours.carriedManHours > 0 ? `<p class="pb-help" style="margin:8px 0 0 0;">+ ${s.crewHours.carriedManHours.toFixed(1)} h of crew time from a deleted earlier session: counted in Footage / Man-Hour, not in the hours above (its crew log went with it).</p>` : ''}""")
# R2
r('R2a', "(e.completedDistance !== undefined ? e.completedDistance : e.distance).toFixed(1) + ' ft' + (e.incomplete ? ' (incomplete)' : '') + (e.crew ? ' · ' + escapeHtml(e.crew) : '') + '<br>'",
  "(e.completedDistance !== undefined ? e.completedDistance : e.distance).toFixed(1) + ' ft' + (e.resumedIntoId ? ' · continued in a later session' : e.incomplete ? ' (incomplete)' : '') + (e.resumedFromLabel ? ' · resumes ' + escapeHtml(e.resumedFromLabel) : '') + (e.crew ? ' · ' + escapeHtml(e.crew) : '') + '<br>'")
r('R2b', "    const state = e.completed ? 'Finished' : e.incomplete ? 'Ended early' : 'Not finished yet';",
  "    const state = e.resumedIntoId ? 'Continued later' : e.completed ? 'Finished' : e.incomplete ? 'Ended early' : 'Not finished yet'; // feat_records R2")
# R3
r('R3', "' saved on this phone but NOT sent</span>The cloud copy didn’t go through. Saved on this phone is not the same as sent.'",
  "' with no cloud copy</span>The upload to your account didn’t go through. The run is saved on this phone; tap Retry Sync in Records.'")
# R4
r('R4a', """    return e.startLabel + ' \\u2192 ' + e.endLabel;
  }""",
"""    const twin = runArchive.some(o => o !== e && o.kind === 'run' && o.startLabel === e.startLabel && o.endLabel === e.endLabel); // feat_records R4: two sessions share the labels
    return e.startLabel + ' \\u2192 ' + e.endLabel + (twin && e.lockTime ? ' (locked ' + new Date(e.lockTime).toLocaleDateString() + (e.stoppedAtStation ? ', stopped at ' + e.stoppedAtStation : '') + ')' : '');
  }""")
r('R4b', "          : 'This run\\u2019s corrections are referenced by a later session (' + archiveEntryLabel(dependent) + '). Deleting it will permanently remove those corrections from that later run\\u2019s history \\u2014 they won\\u2019t be recoverable. ')",
  "          : ((e.correctionHistory || []).length ? 'This run\\u2019s corrections are referenced by a later session (' + archiveEntryLabel(dependent) + '). Deleting it will permanently remove those corrections from that later run\\u2019s history \\u2014 they won\\u2019t be recoverable. ' : 'This is an earlier session of ' + archiveEntryLabel(dependent) + '. That later session keeps this one\\u2019s time and crew hours in the job totals; this session\\u2019s own report goes. ')) // feat_records R4")
# R5
r('R5', """<div class="pb-table-wrap"><table class="pb-table"><thead><tr><th>Date</th><th>Run</th><th>Station</th><th>Note</th></tr></thead><tbody>${s.fieldNotes.map(n => `<tr><td>${n.runDate.toLocaleDateString()}</td><td>${escapeHtml(n.runLabel)}</td><td>${escapeHtml(n.station)}""",
"""<div class="pb-table-wrap"><table class="pb-table pb-notes-fixed"><thead><tr><th>Run</th><th>Station</th><th>Note</th></tr></thead><tbody>${s.fieldNotes.map(n => `<tr><td>${escapeHtml(n.runLabel)}<br><span class="pb-dim">${n.runDate.toLocaleDateString()}</span></td><td>${escapeHtml(n.station)}""")
r('R5css', "#pbApp#pbApp #screen-settings .pb-set-switch { display: flex;",
  "#pbApp .pb-table.pb-notes-fixed { table-layout: fixed; width: 100%; } #pbApp .pb-table.pb-notes-fixed th:nth-child(1), #pbApp .pb-table.pb-notes-fixed td:nth-child(1) { width: 30%; } #pbApp .pb-table.pb-notes-fixed th:nth-child(2), #pbApp .pb-table.pb-notes-fixed td:nth-child(2) { width: 22%; } #pbApp .pb-table.pb-notes-fixed td { white-space: normal; overflow-wrap: anywhere; } #pbApp .pb-table.pb-notes-fixed .pb-dim { color: var(--pb-text-3); font-size: 12px; } /* feat_records R5 */\n#pbApp#pbApp #screen-settings .pb-set-switch { display: flex;")
# R6
r('R6', "words: 'Not sent — saved only. Nothing was sent. Send it from My Management Reports when you’re ready.'", "words: 'Saved only — nothing was sent yet.'")
# R7
r('R7a', "in your Reports on this phone.", "in your Records on this phone.")
r('R7b', "Nothing in your Reports is saved under this job yet.", "Nothing in your Records is saved under this job yet.")
r('R7c', "Opens Reports searched for ", "Opens Records searched for ")
# R8
r('R8', "' Run Report(s)'", "' report(s) from The Pipelayer’s Bible'", 2)

def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('records written', len(s))
