#!/usr/bin/env python3
"""feat_office34 (on r15.33, from the overnight OFFICE sweep, /home/claude/night/office.md):
 O1 [DATA] pbProdAccessRefresh purged the company owner's copies (member:false, manager:true) on every access answer —
    Back from Inspections / Work without a run / the launch race left the job page and Home empty. Only a non-manager
    forgets now (a demoted manager still does; a non-member still forgets everything).
 O2 [DATA] Company production card printed the alert setting ("80% of ordered") as the share used; pbMatShareText(s) now,
    as the job page and the alerts list do.
 T3app [FUNCTION, TEMPORARY] The server (pb_tickets.my_company) files tickets by company_members only, so the company
    account's tickets never sync. Until sql/33_tickets_owner.sql is live: no New Ticket for the company account, and the
    chip / banner / empty line say tickets are typed on the crews' phones. DROP the T3app replacements once the SQL is on.
 O4 [UX] Company tickets › View: "Entered by <name> · Oct 23, 9:51 PM" (by_name from sql/34_ticket_by_name.sql; the plain
    time when the server doesn't send it) instead of a US date with seconds and no name.
 O5 [UX] New Ticket starts on the Current job (number + jobsite) and its job list offers the company's jobs.
 O6 [UX] Cancel Item asks its reason in the app's own modal (textarea), not a browser prompt().
 O7 [WORDING] Inspections with no signal: "No signal. The latest loads with signal." and one "Loads with signal." line
    instead of Open (0) / Done (0); "Invited <date>" for an invitee; the inbox preview ends with …; "LF per stick".
 O8 [UX] Materials tab › Field tickets is a row that opens Company tickets filtered on this job.
 O9 [FUNCTION] Edit project › Project details: name, address and start date (new RPC pb_prod_job_info_set,
    sql/35_job_info_set.sql), then pbCxRefresh(true)."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))

# ---- O1 the owner keeps its company copies ----
r('O1', "if (!a.manager || !a.member) pbProdForgetCompany(uid, a.member); // bughunt Oct 19 (2)",
  "if (!a.manager) pbProdForgetCompany(uid, a.member); // bughunt Oct 19 (2); feat_office34 O1: the owner (manager, no member row) keeps its copies; a non-manager member forgets the company's, a non-member everything")

# ---- O2 the dashboard card's chip ----
r('O2', "escapeHtml(s.pct + '% of ordered')", "escapeHtml(pbMatShareText(s))")

# ---- T3app (temporary: drop these three once sql/33_tickets_owner.sql is live) ----
# r('T3app_a', "  function pbTkState(t) {",  # dropped by the lead: sql/33 (owner tickets) is live
#     "  function pbTkOfficeOnly() { try { const a = sbUser ? pbProdAccMem.get(sbUser.id) : null; return !!(pbCxDashOn() && a && a.manager && !a.member); } catch (e) { return false; } } /* feat_office34 T3app: the company account (manager, no member row) — the server files tickets by company_members only; drop with sql/33_tickets_owner.sql */\n  function pbTkState(t) {")
# r('T3app_b', "    const nc = pbTkEl('tkNoCompanyWarn'); if (nc) nc.style.display = pbTkNoCompany && sbUser && pbTkNoCompany.uid === sbUser.id ? '' : 'none';\n",  # dropped by the lead: sql/33 (owner tickets) is live
#     "    const nc = pbTkEl('tkNoCompanyWarn'), office = pbTkOfficeOnly(); if (nc) { nc.style.display = pbTkNoCompany && sbUser && pbTkNoCompany.uid === sbUser.id ? '' : 'none'; nc.innerHTML = office ? '<strong>Company account</strong>These tickets can’t sync: tickets are typed on the crews’ phones. Read the company’s tickets under Company tickets.' : '<strong>Tickets need a company account</strong>Your tickets are saved on this phone. They sync once your account is part of a company on the Contractor plan.'; } /* feat_office34 T3app */\n    const nb = pbTkEl('tkNewBtn'); if (nb) nb.style.display = office ? 'none' : ''; /* feat_office34 T3app */\n")
# r('T3app_c', "'No tickets yet. Tap New Ticket to record one.'",  # dropped by the lead: sql/33 (owner tickets) is live
#     "(pbTkOfficeOnly() ? 'Tickets are typed on the crews’ phones; the company account reads them under Company tickets.' : 'No tickets yet. Tap New Ticket to record one.')")
# r('T3app_d', "else if (st.k === 'nocompany') h += chip('notsent pb-tk-unsynced', 'Not synced: tickets need a company account');",  # dropped by the lead: sql/33 (owner tickets) is live
#     "else if (st.k === 'nocompany') h += chip('notsent pb-tk-unsynced', pbTkOfficeOnly() ? 'Not synced: tickets are typed on the crews’ phones' : 'Not synced: tickets need a company account');")

# ---- O4 who entered the ticket ----
r('O4', "'<dt>Entered</dt><dd>' + escapeHtml(isNaN(new Date(x.created_at)) ? '' : new Date(x.created_at).toLocaleString()) + '</dd></dl>'",
  "'<dt>Entered</dt><dd>' + escapeHtml(((x.by_name || (x.record && x.record._by_name)) ? 'by ' + String(x.by_name || x.record._by_name) + ' · ' : '') + pbProdTimeText(x.created_at)) + '</dd></dl>'")

# ---- O5 New Ticket knows the Current job and the company's jobs ----
r('O5a', "    try { pbJobsCollect().forEach(j => add(j.number, j.sites[0])); } catch (e) {}\n    return [...map.values()];",
  "    try { pbJobsCollect().forEach(j => add(j.number, j.sites[0])); } catch (e) {}\n    try { (typeof window.pbCurJobChoices === 'function' ? window.pbCurJobChoices() : []).forEach(j => add(j.job_number, j.name)); } catch (e) {} // feat_office34 O5: the company's jobs (the Current job list) too\n    return [...map.values()];")
r('O5b', "    window.__pbCurJob = () => ({ v: pbCj.v, jobs: pbCj.jobs });",
  "    window.pbCurJobChoices = cjChoices; // feat_office34 O5: the ticket form's job list\n    window.__pbCurJob = () => ({ v: pbCj.v, jobs: pbCj.jobs });")
r('O5c', "    } catch (e) {}\n    return null;\n  }\n  function pbTkKnownJobs() {",
  "    } catch (e) {}\n    try { const v = typeof window.pbCurJobGet === 'function' ? window.pbCurJobGet() : null; if (v && v.job_number) return { number: String(v.job_number).trim(), site: String(v.name || '').trim() }; } catch (e) {} // feat_office34 O5: the Current job chosen on Home\n    return null;\n  }\n  function pbTkKnownJobs() {")

# ---- O6 Cancel Item: the app's own modal ----
r('O6a', "    const reason = window.prompt ? window.prompt('Why is this item canceled? (kept in its history)', '') : null;\n    if (reason === null) return;\n    if (!reason.trim()) { pbAlert('Canceling an item needs a reason.', 'Cancel Item'); return; }\n    (async () => {",
  "    pbInsCancelAsk(it, ''); // feat_office34 O6: the app's own modal, not a browser prompt()\n  };\n  function pbInsCancelAsk(it, err) {\n    let reason = '';\n    pbShowModal((err ? err + ' ' : '') + 'The reason is kept in the item’s history.', [{ label: 'Keep It' }, { label: 'Cancel Item', danger: true, onClick: () => { reason = reason.trim(); if (!reason) { pbInsCancelAsk(it, 'Canceling an item needs a reason.'); return; } pbInsCancelSend(it, reason); } }], 'Cancel ' + pbDlyKindName(it.kind));\n    const wrap = document.createElement('div'); wrap.className = 'pb-modal-extra pb-field'; wrap.style.margin = '0 0 14px 0';\n    wrap.innerHTML = '<label for=\"ijCancelReason\">Why is it canceled?</label><textarea id=\"ijCancelReason\" rows=\"3\" maxlength=\"500\" style=\"width:100%; box-sizing:border-box;\" placeholder=\"e.g. Retest scheduled under a new item\"></textarea>';\n    wrap.querySelector('textarea').addEventListener('input', (ev) => { reason = ev.target.value; });\n    document.getElementById('pbModalMessage').insertAdjacentElement('afterend', wrap);\n    setTimeout(() => { const t = document.getElementById('ijCancelReason'); if (t) t.focus(); }, 50);\n  }\n  function pbInsCancelSend(it, reason) {\n    (async () => {")
r('O6b', "p_scheduled_date: it.scheduled_date, p_foreman: it.foreman_uid, p_note: it.note, p_status: 'canceled', p_reason: reason.trim(), p_expect_uid: uid }, 30000);\n      if (r.error || !r.data || !r.data.ok) pbAlert(pbDlyWhy(r.data && r.data.code, r), 'Not Canceled');\n      pbInsJobLoad();\n    })();\n  };",
  "p_scheduled_date: it.scheduled_date, p_foreman: it.foreman_uid, p_note: it.note, p_status: 'canceled', p_reason: reason, p_expect_uid: uid }, 30000);\n      if (r.error || !r.data || !r.data.ok) pbAlert(pbDlyWhy(r.data && r.data.code, r), 'Not Canceled');\n      pbInsJobLoad();\n    })();\n  }")

# ---- O7 wording ----
r('O7a1', "pbInsCo.msg = 'Sign in with signal to see the latest.';", "pbInsCo.msg = navigator.onLine === false ? 'No signal. The latest loads with signal.' : 'Sign in with signal to see the latest.';")
r('O7a2', "pbInsJob.msg = 'Sign in with signal to see the latest.';", "pbInsJob.msg = navigator.onLine === false ? 'No signal. The latest loads with signal.' : 'Sign in with signal to see the latest.';")
r('O7a3', "    h += '<h2 class=\"pb-h2 pbd-h2\" id=\"ijOpenHead\">Open (' + open.length + ')</h2>'",
  "    if (!D) h += pbInsJob.busy ? '' : '<p class=\"pbd-dim\" id=\"ijNoData\">Loads with signal.</p>'; /* feat_office34 O7: nothing loaded yet is not \"none open\" */\n    else h += '<h2 class=\"pb-h2 pbd-h2\" id=\"ijOpenHead\">Open (' + open.length + ')</h2>'")
r('O7a4', "'<p class=\"pbd-dim\">None open.</p>');\n", "'<p class=\"pbd-dim\">None open.</p>')\n")
r('O7a5', "    h += '<h2 class=\"pb-h2 pbd-h2\" id=\"ijDoneHead\">Done (' + done.length + ')</h2>'", "      + '<h2 class=\"pb-h2 pbd-h2\" id=\"ijDoneHead\">Done (' + done.length + ')</h2>'")  # chained to the Open heading: both only when something was loaded
r('O7b', "if (m.member && m.joined_at) meta.push('Joined ' + pbCmDate(m.joined_at));",
  "if (m.member && m.joined_at) meta.push((m.status === 'invited' ? 'Invited ' : 'Joined ') + pbCmDate(m.joined_at)); /* feat_office34 O7: an invitee hasn't joined */")
r('O7c', "escapeHtml(String(r.body || '').slice(0, 60))",
  "escapeHtml(String(r.body || '').length > 60 ? String(r.body || '').slice(0, 60).trimEnd() + '…' : String(r.body || ''))")
r('O7d1', "  const pbMatUK = (u) =>",
  "  const pbMatOne = (u) => { const s = String(u || ''); return /(xes|ches|shes|sses)$/i.test(s) && s.length > 4 ? s.slice(0, -2) : /^[A-Za-z]{4,}s$/.test(s) && !/ss$/i.test(s) ? s.slice(0, -1) : s; }; // feat_office34 O7: one stick, not one sticks\n  const pbMatUK = (u) =>")
r('O7d2', "escapeHtml(m.unit) + ' per ' + escapeHtml(x.unit || 'ticket unit')", "escapeHtml(m.unit) + ' per ' + escapeHtml(pbMatOne(x.unit || 'ticket unit'))")
r('O7d3', "' one ' + escapeHtml(x.unit) + ' is.'", "' one ' + escapeHtml(pbMatOne(x.unit)) + ' is.'")
r('O7d4', "' one ' + escapeHtml(x.unit || 'unit') + ' is.'", "' one ' + escapeHtml(pbMatOne(x.unit || 'unit')) + ' is.'")

# ---- O8 Field tickets row → Company tickets on this job ----
r('O8a', "      + '<section class=\"pbp-block\" id=\"pjTicketsSec\"><h3 class=\"pb-h2 pbp-h3\">Field tickets</h3>' + (T ? '<div class=\"pb-stats\"><div class=\"pb-stat\"><span class=\"pb-stat-k\">Tickets</span><span class=\"pb-stat-v\">' + escapeHtml(pbTkFmtNum(Number(T.tickets) || 0, 0)) + '</span></div><div class=\"pb-stat\"><span class=\"pb-stat-k\">Concrete</span><span class=\"pb-stat-v\">' + escapeHtml(pbTkFmtNum(Number(T.concrete_yd3) || 0)) + '<span class=\"pb-stat-u\"> yd³</span></span></div><div class=\"pb-stat\"><span class=\"pb-stat-k\">Sub hours</span><span class=\"pb-stat-v\">' + escapeHtml(pbTkFmtNum((Array.isArray(T.sub_hours) ? T.sub_hours : []).reduce((s, x) => s + (Number(x && x.hours) || 0), 0))) + '</span></div></div>' : '<p class=\"pbp-dim pbp-none\">' + (job.job_number ? 'Not loaded.' : 'Tickets are filed by job number.') + '</p>') + '</section>'\n",
  "      + '<section class=\"pbp-block\" id=\"pjTicketsSec\"><h3 class=\"pb-h2 pbp-h3\">Field tickets</h3>' + (job.job_number ? '<div class=\"pbx-rows flat\"><button type=\"button\" class=\"pbx-row\" id=\"pjTicketsRow\" onclick=\"pbCxOpenJobTickets()\"><span class=\"pbx-row-tx\"><span class=\"pbx-row-h\">' + escapeHtml(T ? 'Tickets ' + pbTkFmtNum(Number(T.tickets) || 0, 0) + ' · Concrete ' + pbTkFmtNum(Number(T.concrete_yd3) || 0) + ' yd³ · Sub hours ' + pbTkFmtNum((Array.isArray(T.sub_hours) ? T.sub_hours : []).reduce((s, x) => s + (Number(x && x.hours) || 0), 0)) : 'Totals load with signal') + '</span><span class=\"pbx-row-s\">Company tickets on this job</span></span><span class=\"pbx-chev\" aria-hidden=\"true\">' + pbCxIc('chevron-right') + '</span></button></div>' : '<p class=\"pbp-dim pbp-none\">Tickets are filed by job number.</p>') + '</section>' /* feat_office34 O8: a row into Company tickets, filtered on this job */\n")
r('O8b', "  window.pbTicketsDashJob = function(v) {",
  "  window.pbCxOpenJobTickets = function() { // feat_office34 O8: the job page's Field tickets row opens Company tickets on this job\n    const uid = pbArchiveOwnerUid, n = pbPj.job && pbPj.job.job_number ? String(pbPj.job.job_number) : '';\n    if (pbTkDash.uid !== uid) { pbTkDashDropPhotos(); pbTkDash = pbTkDashNew(uid); }\n    if ((pbTkDash.job || '') !== n) { pbTkDashDropPhotos(); pbTkDash.job = n; pbTkDash.totals = null; pbTkDash.rows = []; pbTkDash.done = false; pbTkDash.open = {}; pbTkDash.gen++; pbTkDash.busy = false; }\n    return window.pbOpenTicketsDashboard();\n  };\n  window.pbTicketsDashJob = function(v) {")
r('O8c', "    const opts = '<option value=\"\">All jobs</option>' + D.jobs.map(j => '<option value=\"' + escapeHtml(j.job_number) + '\">' + escapeHtml('Job ' + j.job_number + (j.jobsite ? ' — ' + j.jobsite : '') + ' (' + (Number(j.tickets) || 0) + ')') + '</option>').join('');",
  "    const opts = '<option value=\"\">All jobs</option>' + D.jobs.map(j => '<option value=\"' + escapeHtml(j.job_number) + '\">' + escapeHtml('Job ' + j.job_number + (j.jobsite ? ' — ' + j.jobsite : '') + ' (' + (Number(j.tickets) || 0) + ')') + '</option>').join('') + (D.job && !D.jobs.some(j => j.job_number === D.job) ? '<option value=\"' + escapeHtml(D.job) + '\">' + escapeHtml('Job ' + D.job) + '</option>' : ''); /* feat_office34 O8: opened on one job before the job list loaded */")

# ---- O9 Project details ----
r('O9a', "['pms', 'Assigned PMs', 'Who gets this job’s alerts']]",
  "['pms', 'Assigned PMs', 'Who gets this job’s alerts'], ['info', 'Project details', 'Name, address and start date']]")
r('O9b', "    if (what === 'pms') { window.pbCxTab('overview'); if (pbPj.pms) window.pbPmJobEdit(); else pbAlert(pbPj.pmMsg || 'Assigned PMs load with signal.', 'Assigned PMs'); at('pjPmSec'); }\n  };",
  "    if (what === 'pms') { window.pbCxTab('overview'); if (pbPj.pms) window.pbPmJobEdit(); else pbAlert(pbPj.pmMsg || 'Assigned PMs load with signal.', 'Assigned PMs'); at('pjPmSec'); return; }\n    if (what === 'info') { window.pbCxJobPaint(); window.pbCxInfoForm(null, ''); }\n  };\n"
  "  // feat_office34 O9: Project details (name, address, start date) — the New job wizard's step-1 fields, editable afterwards.\n"
  "  // Server: public.pb_prod_job_info_set (feat_office34/sql/35_job_info_set.sql), the same guards as pb_prod_job_create.\n"
  "  window.pbCxInfoForm = function(v, err) {\n"
  "    const job = pbPj.job; if (!job) return;\n"
  "    const dj = pbCxKnownJob(job.job_number) || {};\n"
  "    v = v || { name: dj.project_name || '', addr: dj.address || '', start: dj.start_date ? String(dj.start_date).slice(0, 10) : '' };\n"
  "    const cur = Object.assign({}, v);\n"
  "    pbShowModal((err ? err + ' ' : '') + 'Shown on the Home card, the job page and report headers.', [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: () => pbCxInfoSave(cur) }], 'Project details · ' + pbProdJobLabel(job.job_number));\n"
  "    const wrap = document.createElement('div'); wrap.className = 'pb-modal-extra'; wrap.style.margin = '0 0 14px 0';\n"
  "    wrap.innerHTML = '<div class=\"pb-field\"><label for=\"cxiName\">Project name</label><input type=\"text\" id=\"cxiName\" maxlength=\"120\" autocomplete=\"off\" placeholder=\"Birch Rd water main\"></div>'\n"
  "      + '<div class=\"pb-field\"><label for=\"cxiAddr\">Jobsite address</label><input type=\"text\" id=\"cxiAddr\" maxlength=\"300\" autocomplete=\"street-address\" placeholder=\"100 Birch Rd, Springfield, IL\"></div>'\n"
  "      + '<div class=\"pb-field\"><label for=\"cxiStart\">Start date <span class=\"pbx-opt\">(optional)</span></label><input type=\"date\" id=\"cxiStart\"></div>';\n"
  "    const f = { cxiName: 'name', cxiAddr: 'addr', cxiStart: 'start' };\n"
  "    Object.keys(f).forEach(id => { const el = wrap.querySelector('#' + id); el.value = cur[f[id]] || ''; el.addEventListener('input', () => { cur[f[id]] = el.value; }); el.addEventListener('change', () => { cur[f[id]] = el.value; }); });\n"
  "    document.getElementById('pbModalMessage').insertAdjacentElement('afterend', wrap);\n"
  "    setTimeout(() => { const el = document.getElementById('cxiName'); if (el) el.focus(); }, 50);\n"
  "  };\n"
  "  async function pbCxInfoSave(v) {\n"
  "    const uid = pbArchiveOwnerUid, job = pbPj.job; if (!job) return;\n"
  "    v = { name: String(v.name || '').trim().slice(0, 120), addr: String(v.addr || '').trim().slice(0, 300), start: String(v.start || '').trim() };\n"
  "    const again = (t) => window.pbCxInfoForm(v, t + ' Nothing was saved; what you typed is still here.');\n"
  "    if (v.start && !/^\\d{4}-\\d{2}-\\d{2}$/.test(v.start)) return again('The start date isn’t a date. Pick one, or leave it empty.');\n"
  "    if (navigator.onLine === false) return again('No signal.');\n"
  "    if (!(sbClient && typeof sbClient.rpc === 'function' && sbUser && sbUser.id === uid && (await pbLiveSessionIs(uid)))) return again('Sign in with signal to change the project details.');\n"
  "    const r = await pbPermitRpc('pb_prod_job_info_set', { p_job_number: job.job_number, p_project_name: v.name || null, p_address: v.addr || null, p_start_date: v.start || null, p_expect_uid: uid }, 30000);\n"
  "    if (!sbUser || sbUser.id !== uid || !pbPj.job || pbPj.job.job_key !== job.job_key) return;\n"
  "    const m = String((r && r.error && r.error.message) || '');\n"
  "    if (!r || r.error || !r.data || r.data.ok !== true) return again(navigator.onLine === false || /failed to fetch|networkerror|load failed|no client|timeout/i.test(m) ? 'No signal.' : /Could not find the function|function .* does not exist/i.test(m) ? 'The company server can’t change project details yet.' : /pb:bad_date/.test(m) ? 'The server didn’t accept that start date.' : /pb:not_found/.test(m) ? 'This job isn’t on the company server any more.' : pbProdErrText(r));\n"
  "    const dj = pbCxKnownJob(job.job_number); // the phone's copy at once, then the server's\n"
  "    if (dj) { Object.assign(dj, { project_name: v.name || null, address: v.addr || null, start_date: v.start || null }); try { pbProdCacheSet(uid, 'dash', { at: pbPd.at || Date.now(), data: pbPd.data }); } catch (e) {} }\n"
  "    try { window.pbCxJobPaint(); } catch (e) {}\n"
  "    window.pbCxRefresh(true);\n"
  "  }")

def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('office34 written', len(s))
