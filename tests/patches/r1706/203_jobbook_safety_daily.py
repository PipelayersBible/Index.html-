#!/usr/bin/env python3
# daily3 #48 (owner, Nov 18): Job Book near misses, incidents and stop-work show on that day's daily report and its PDF.
# The daily pulls in the job's Job Book safety events dated that day (all five kinds: Near miss, First aid, Incident,
# Property damage, Stop work; a night shift's events after midnight, up to the shift's last stop, go with the shift):
# the company server's list (loaded again with signal, merged the Job Book's own way: the higher version wins) plus this
# phone's entries not sent yet. New snapshot section `safety_events` { source, items[] }.
# Screen: a "Safety (Job Book)" card (left out when there are none); Incident and Stop work also show under Needs
# attention on the card and in the PDF. PDF: a "Safety events (Job Book)" section. A signed day whose safety events
# changed afterwards gets the r16.98 "changed after you signed" warning.
# The office reads the same snapshot (pb_daily_get) and builds the same PDF, so the office copy shows them too.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 1) collecting
rep("""  // Everything the report pulls in, as of now (also used right before signing, review S9).
  async function pbDlyCollect(uid, job, date) {""",
"""  // daily3 #48: the job's Job Book safety events for the report day
  const PB_DLY_SAFETY_ALERT = ['Incident', 'Stop work'];
  async function pbDlySafetySection(uid, job, date, runs) {
    const out = { source: 'The Job Book\\u2019s safety events for this job dated this day (the company server\\u2019s list, plus this phone\\u2019s entries not sent yet). Each one\\u2019s photos and history are in the Job Book.', items: [] };
    try {
      if (typeof pbJbLoadStore !== 'function') return out;
      const st = await pbJbLoadStore(uid); if (!st) { out.source += ' This phone\\u2019s Job Book could not be read.'; return out; }
      const key = pbJbKey(job);
      if (await pbDlyCanAsk(uid)) {
        const r = await pbPermitRpc('pb_prod_job_items', { p_job_number: job, p_expect_uid: uid }, 15000);
        if (r && !r.error && r.data && Array.isArray(r.data.items) && pbJb.uid === uid && pbJb.st === st) {
          const prev = ((st.jobs[key] || {}).items) || [], at = Date.parse(r.data.server_at || '') || 0;
          const items = r.data.items.map(x => { const o = prev.find(y => y.id === x.id); return o && Number(o.version) > Number(x.version) ? o : x; });
          prev.forEach(o => { if (!items.some(x => x.id === o.id) && at && Date.parse(o.updated_at || '') > at) items.push(o); });
          st.jobs[key] = Object.assign({}, st.jobs[key] || {}, { at: Date.now(), items, can: r.data.can_manage === true, job_number: r.data.job_number || job });
          await pbJbSaveStore(uid);
        }
      } /* the source line stays the same with or without signal, so signing never sees a "change" that is only the signal */
      // a night shift: its events after midnight, up to the shift's last stop, belong to this day
      let next = '', upTo = '';
      try {
        const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(date); next = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + 1)).toISOString().slice(0, 10) : '';
        let last = 0; (runArchive || []).filter(e => e && e.kind === 'run' && (typeof pbDlyRunDay === 'function' ? pbDlyRunDay(e) : pbFmDay(e.runStartTime || e.lockTime)) === date).forEach(e => { const t = Number(e.runEndTime) || Date.parse(e.runEndTime || '') || (e.completed || e.incomplete ? 0 : Date.now()); if (t > last) last = t; });
        if (last && pbFmDay(last) === next) upTo = new Intl.DateTimeFormat('en-GB', { timeZone: pbFmCoTz() || undefined, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(last));
      } catch (e) { upTo = ''; }
      const dayOf = (x) => { const d = x.data || {}; return /^\\d{4}-\\d{2}-\\d{2}$/.test(String(d.date || '')) ? String(d.date) : pbFmDay(x.created_at || x.updated_at); };
      const list = (pbJbItems(key) || []).filter(x => x && x.kind === 'safety' && x.status !== 'void' && (dayOf(x) === date || (upTo && dayOf(x) === next && /^\\d{2}:\\d{2}/.test(String((x.data || {}).time || '')) && String(x.data.time).slice(0, 5) <= upTo)));
      out.items = list.map(x => { const d = x.data || {};
        return { id: String(x.id), kind: String(d.kind || 'Safety event'), date: dayOf(x), time: d.time ? String(d.time).slice(0, 5) : null, people: d.people ? String(d.people).slice(0, 500) : null, what: String(d.what || '').slice(0, 2000), done: d.done ? String(d.done).slice(0, 2000) : null,
          by: x._q && !x.version ? null : (x.by || null), status: x.status || 'open', photos: (Number(x.photo_count) || 0) + ((x._photos || []).length), sent: !(x._q && !x._q.sent), after_midnight: dayOf(x) !== date }; })
        .sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
    } catch (e) { console.error(e); out.source += ' Not read: ' + (e && e.message || e); }
    return out;
  }
  window.__pbDlySafety = (job, date) => pbDlySafetySection(pbArchiveOwnerUid, job, date, []); // tests
  function pbDlySafetyAlerts(S) { return ((S && S.safety_events && S.safety_events.items) || []).filter(x => PB_DLY_SAFETY_ALERT.includes(x.kind)).map(x => x.kind.toUpperCase() + ' logged in the Job Book' + (x.time ? ' at ' + x.time : '') + (x.after_midnight ? ' (after midnight)' : '') + ': ' + String(x.what || '').slice(0, 140) + (x.what && x.what.length > 140 ? '\\u2026' : '')); }
  // Everything the report pulls in, as of now (also used right before signing, review S9).
  async function pbDlyCollect(uid, job, date) {""")
rep("""      inspections: pbDlyInspSection(job, date, tz), permits: pbDlyPermitSection(job, date), talks: await pbDlyTalksSection(ctx), weather: null, narrative: '', signed: null, amendment: null""",
"""      inspections: pbDlyInspSection(job, date, tz), permits: pbDlyPermitSection(job, date), talks: await pbDlyTalksSection(ctx), safety_events: await pbDlySafetySection(uid, job, date, runs) /* daily3 #48 */, weather: null, narrative: '', signed: null, amendment: null""")

# 2) the screen: a card after the permits
rep("""    const T = S.talks;
    h += pbDlySecHtml('drTalks',""",
"""    const SE = S.safety_events; /* daily3 #48 */
    if (SE && SE.items.length) h += pbDlySecHtml('drSafety', 'Safety (Job Book) (' + SE.items.length + ')', SE.source, '<ul class="pbd-list" id="drSafetyList">' + SE.items.map(x => '<li><strong>' + escapeHtml(x.kind) + '</strong>' + (x.time ? ' · ' + escapeHtml(x.time) : '') + (x.after_midnight ? ' <span class="pbd-dim">(after midnight)</span>' : '') + ' · ' + escapeHtml(x.status === 'closed' ? 'closed' : 'open')
      + '<br>' + escapeHtml(x.what) + (x.done ? '<br><span class="pbd-dim">' + escapeHtml('Done: ' + x.done) + '</span>' : '') + '<br><span class="pbd-dim">' + escapeHtml([x.people ? 'People: ' + x.people : '', x.by ? 'Logged by ' + x.by : '', x.photos ? x.photos + (x.photos === 1 ? ' photo' : ' photos') : '', x.sent ? '' : 'saved on this phone, not sent yet'].filter(Boolean).join(' · ')) + '</span></li>').join('') + '</ul>'
      + (pbDlySafetyAlerts(S).length ? '<div class="pb-warn photo" id="drSafetyAlert"><strong>Needs attention</strong>' + pbDlySafetyAlerts(S).map(escapeHtml).join('<br>') + '</div>' : ''));
    const T = S.talks;
    h += pbDlySecHtml('drTalks',""")

# 3) before signing: name the section when it changed
rep("""['talks', 'toolbox talks'], ['other_prod', 'other crews’ production']]""",
"""['talks', 'toolbox talks'], ['other_prod', 'other crews’ production'], ['safety_events', 'safety events (Job Book)'] /* daily3 #48 */]""")
# 4) a signed day whose safety events changed afterwards
rep("""      const diff = [['runs', 'runs and production'], ['crew', 'crew hours'], ['materials', 'materials']].filter(([k]) => pbJsonbText(L[k] === undefined ? null : L[k]) !== pbJsonbText(S[k] === undefined ? null : S[k])).map(x => x[1]);""",
"""      const diff = [['runs', 'runs and production'], ['crew', 'crew hours'], ['materials', 'materials']].filter(([k]) => pbJsonbText(L[k] === undefined ? null : L[k]) !== pbJsonbText(S[k] === undefined ? null : S[k])).map(x => x[1]);
      { const se = (x) => JSON.stringify(((x && x.safety_events && x.safety_events.items) || []).map(i => [i.id, i.kind, i.date, i.time, i.what, i.done, i.people])); if ((L.safety_events || (S.safety_events && S.safety_events.items.length)) && se(L) !== se(S)) diff.push('safety events'); } /* daily3 #48 */""")

# 5) PDF: Needs attention + the section (after the permits)
rep("""    pbDlyPermitAlerts(S.permits.items).forEach(a => alerts.push(a));
    if (!(S.weather && S.weather.available)) alerts.push(""",
"""    pbDlyPermitAlerts(S.permits.items).forEach(a => alerts.push(a));
    pbDlySafetyAlerts(S).forEach(a => alerts.push(a)); /* daily3 #48 */
    if (!(S.weather && S.weather.available)) alerts.push(""")
rep("""    if (S.talks.items.length) { /* feat_dailyfill C: left out when empty */
    R.section('talks', 'Toolbox talks', { keep: 20 });""",
"""    if (S.safety_events && S.safety_events.items.length) { /* daily3 #48 */
      const SE = S.safety_events.items;
      R.section('safety', 'Safety events (Job Book) (' + SE.length + ')', { keep: 26 });
      R.table({ head: ['Kind', 'Time', 'What happened', 'What was done', 'People / logged'], columns: [{ cellWidth: 24 }, { cellWidth: 18 }, {}, { cellWidth: 40 }, { cellWidth: 36 }], fontSize: 8.4,
        body: SE.map(x => [{ content: x.kind, _accent: PB_DLY_SAFETY_ALERT.includes(x.kind) }, (x.time || '—') + (x.after_midnight ? '\\n' + x.date + ' (after midnight)' : ''), x.what || '—', x.done || '—',
          [x.people ? 'People: ' + x.people : '', x.by ? 'Logged by ' + x.by : '', 'Status: ' + x.status, x.photos ? x.photos + ' photo(s) in the Job Book' : '', x.sent ? '' : 'not on the company server yet'].filter(Boolean).join('\\n')]) });
      src(S.safety_events.source);
    }
    if (S.talks.items.length) { /* feat_dailyfill C: left out when empty */
    R.section('talks', 'Toolbox talks', { keep: 20 });""")
rep("""['Permits', String(S.permits.items.length)], ...pbDpKv(S) /* feat_dailyplus */""",
"""['Permits', String(S.permits.items.length)], ...(S.safety_events && S.safety_events.items.length ? [['Safety events (Job Book)', S.safety_events.items.map(x => x.kind).join(', ')]] : []) /* daily3 #48 */, ...pbDpKv(S) /* feat_dailyplus */""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
