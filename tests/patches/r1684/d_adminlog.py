import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.84: Settings > Admin Access Log (company managers): changes to the company's records made outside the app
rep("""<div id="settingsMfa" style="margin:0 0 12px;"></div>""", """<div id="settingsMfa" style="margin:0 0 12px;"></div><div id="settingsAdminLog" style="margin:0 0 12px;"></div>""")
rep("""  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { setTimeout(() => { window.pbMfaCheck(); if (name === 'settings') window.pbMfaRender(); }, 500); });""",
"""  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { setTimeout(() => { window.pbMfaCheck(); if (name === 'settings') { window.pbMfaRender(); window.pbAdminLogRender(); } }, 500); });
  // r16.84 (legal review I11): the admin access log, for a company's managers
  const PB_AL_TBL = { 'pb_prod.run_records': 'a run report', 'pb_prod.run_record_versions': 'a run report version', 'pb_prod.run_record_events': 'a run report event', 'pb_prod.run_setup_versions': 'a run setup', 'pb_prod.run_seals': 'a sealed original', 'pb_prod.run_clock': 'a run clock check',
    'pb_prod.entries': 'a production entry', 'pb_prod.entry_versions': 'a production entry version', 'pb_prod.site_log': 'a site-log entry', 'pb_prod.site_log_versions': 'a site-log version', 'pb_prod.job_items': 'a job item', 'pb_prod.job_item_versions': 'a job item version', 'pb_prod.job_item_photos': 'a job item photo',
    'pb_daily.reports': 'a daily report', 'pb_daily.items': 'a daily-report item', 'pb_daily.item_versions': 'a daily-report item version', 'pb_daily.checks': 'an inspection check', 'pb_daily.check_photos': 'an inspection photo', 'pb_daily.report_attachments': 'a daily-report attachment',
    'pb_safety.permits': 'a confined space permit', 'pb_safety.permit_versions': 'a permit version', 'pb_tickets.tickets': 'a field ticket', 'pb_tickets.ticket_versions': 'a field ticket version', 'pb_legal.acceptances': 'a Terms acceptance' };
  const PB_AL_ACT = { company_plan_set: 'Changed your company’s plan', individual_plan_on: 'Turned on an individual plan', beta_company_made: 'Started your company’s beta account' };
  function pbAdminLogLine(x) {
    const d = new Date(x.at), when = isFinite(d.getTime()) ? d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    const m = /^(INSERT|UPDATE|DELETE) (.+)$/.exec(String(x.what || '')), thing = m ? (PB_AL_TBL[m[2]] || 'a record') : '';
    const what = m ? ({ INSERT: 'Added ', UPDATE: 'Changed ', DELETE: 'Removed ' })[m[1]] + thing + (Array.isArray(x.changed) && x.changed.length ? ' (' + x.changed.slice(0, 4).join(', ') + ')' : '') : (PB_AL_ACT[String(x.what || '').trim()] || String(x.what || 'Admin action'));
    return when + ' · ' + (x.how || '') + ' · ' + what;
  }
  window.pbAdminLogRender = function() {
    const box = document.getElementById('settingsAdminLog'); if (!box) return;
    let mgr = false; try { const a = sbUser && typeof pbProdAccMem !== 'undefined' && pbProdAccMem.get(sbUser.id); mgr = !!(a && a.manager); } catch (e) {}
    if (!mgr || !sbClient) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="pb-help" style="margin:0 0 6px;"><strong>Admin access log</strong>: changes to your company’s records made outside the app.</div><button type="button" class="pb-btn ghost small" id="pbAdminLogBtn">View Admin Access Log</button>';
    box.querySelector('#pbAdminLogBtn').addEventListener('click', () => window.pbAdminLogOpen());
  };
  window.pbAdminLogOpen = async function() {
    if (!sbClient || navigator.onLine === false) { pbAlert('The admin access log opens from the company server. Try again with signal.', 'No Signal'); return; }
    let r; try { pbRptBusy('Loading the log…'); r = await sbClient.rpc('pb_admin_log_company', { p_limit: 100 }); } catch (e) { r = null; } finally { pbRptBusy(null); }
    const d = r && !r.error && r.data;
    if (!d || !d.ok) { pbAlert(d && d.code === 'pb:not_allowed' ? 'Only your company’s owner and managers can see this log.' : 'Couldn’t load the log. Try again with signal.', 'Admin Access Log'); return; }
    const E = Array.isArray(d.entries) ? d.entries : [];
    const since = new Date(String(d.since) + 'T12:00:00'), sinceTxt = isFinite(since.getTime()) ? since.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'November 17, 2026';
    const stamped = Number(d.days_stamped) || 0, due = Number(d.days_due) || 0;
    const head = 'This log lists every change to your company’s records that didn’t come from someone using the app: changes the app’s operator made directly in the database (for example, to fix a problem), changes made with the server key, and the operator’s admin actions on your account (like changing your plan). Records simply being read are not logged. Started ' + sinceTxt + '.';
    const body = E.length ? (d.total > E.length ? 'Newest ' + E.length + ' of ' + d.total + ':\\n' : (E.length === 1 ? '1 entry:\\n' : E.length + ' entries:\\n')) + E.map(pbAdminLogLine).join('\\n') : 'No entries: nothing about your company has been changed outside the app.';
    const tail = 'Each finished day of the log is fingerprinted and time-stamped by outside time-stamp services, so it can’t be quietly rewritten later. ' + (due ? 'Days time-stamped so far: ' + Math.min(stamped, due) + ' of ' + due + '.' : 'The first day is time-stamped after midnight (UTC).');
    pbAlert(head + '\\n\\n' + body + '\\n\\n' + tail, 'Admin Access Log');
  };""")
# the exhibit: what is logged now
rep("""    '7. Administration. The operator of the app has administrative access to the database and file storage, as the operator of any hosted service does.',""",
"""    '7. Administration. The operator of the app has administrative access to the database and file storage, as the operator of any hosted service does. Since November 17, 2026, every change to a field-record table that does not come from a signed-in user of the app or one of the app’s own scheduled jobs (for example, a change made in a database console or with the server key), and the operator’s administrative actions on a company account, are written to an insert-only log in the same database; each finished day of that log is fingerprinted and time-stamped by outside time-stamp services. The company’s managers can view the entries about their company in the app. Reading records is not logged, and the log is kept in the same database, so a person with full database control could still bypass it; the outside time stamps would show that a stamped day’s log was later changed.',""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
