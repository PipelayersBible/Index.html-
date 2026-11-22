# C-2: a new field ticket starts with the time now, as it already starts with today's date (the time was left blank).
# Check-off, Entry Permit, daily report and Log Work Without a Run already fill date and time (the audit's blank
# check-off was the screen opened with no item, which no button does). AI ticket reading: a date or time the app filled
# in itself (not changed by the person) counts as empty, so what AI read from the ticket goes in without a
# "replace what you typed?" question; anything the person typed is never replaced without asking.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
p.rep("""    if (!t) set('tkF_date', pbTkToday());
    const job = t ? { number: t.jobNumber, site: t.jobsite } : pbTkCurrentJob();""",
"""    if (!t) set('tkF_date', pbTkToday());
    if (!t) { const n0 = new Date(); set('tkF_time', String(n0.getHours()).padStart(2, '0') + ':' + String(n0.getMinutes()).padStart(2, '0')); } /* design C-2 */
    if (pbTkForm) pbTkForm.auto = t ? {} : { date: (pbTkEl('tkF_date') || {}).value || '', time: (pbTkEl('tkF_time') || {}).value || '' };
    const job = t ? { number: t.jobNumber, site: t.jobsite } : pbTkCurrentJob();""")
p.rep("""    const plan = PB_TK_FIELDS[p.type].filter(([k]) => vals[k]).map(([k, label]) => { const el = pbTkEl('tkF_' + k); return { k, label, val: vals[k], cur: el ? el.value.trim() : '' }; });""",
"""    const plan = PB_TK_FIELDS[p.type].filter(([k]) => vals[k]).map(([k, label]) => { const el = pbTkEl('tkF_' + k); const cur0 = el ? el.value.trim() : ''; return { k, label, val: vals[k], cur: f.auto && f.auto[k] && cur0 === f.auto[k] ? '' : cur0 }; }); /* design C-2: the app's own date/time is not "typed" */""")
p.save()
