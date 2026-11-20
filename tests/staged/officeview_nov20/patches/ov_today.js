  // ================= officeview 01 (Nov 20): TODAY across crews, for the office on a computer =================
  // The critic (Nov 19, H): "A super checking four crews wants one table: crew, job, feet today, report in or not, permit
  // open or not." Company accounts (owner, managers, PMs: html.pb-cx) at 1024 px and wider get one table on Home: a row per
  // crew and job. Nothing new on the server: the live board the Home already loads (pb_prod_company_live,
  // pb_prod_company_live_permits), the jobs (pb_prod_company_dashboard), the people list Records already loads
  // (pb_reports_people) and ONE ask of the Records feed for today (pb_reports_feed: today's signed daily reports, field
  // tickets, delays), then pb_daily_get for today's signed dailies (their fittings count). Kept for no signal with its time.
  // A phone never draws it; field accounts never get here (pbCx.on is the company account only).
  const pbOvNew = (uid) => ({ uid, feed: null, day: '', more: false, at: 0, cached: false, busy: false, lastTry: 0, msg: '', fit: {}, open: null, sort: { k: 'crew', d: 1 }, read: false });
  let pbOv = pbOvNew(null);
  function pbOvFor(uid) { if (pbOv.uid !== uid) pbOv = pbOvNew(uid); return pbOv; }
  const pbOvWide = () => { try { return !!(pbCx && pbCx.on && pbCx.uid === pbArchiveOwnerUid && window.pbCxSideNav()); } catch (e) { return false; } };
  const pbOvKey = (s) => String(s == null ? '' : s).trim().toLowerCase();
  function pbOvPaint() { try { if (pbCurrentScreen === 'home') pbOvRender(); } catch (e) { console.error(e); } }
  function pbOvFittings(S) { // the signed daily's own count: fittings "counted by the app" (not the MJ kits)
    try { const U = S && S.materials && Array.isArray(S.materials.used) ? S.materials.used : []; let n = 0, any = false; U.forEach(r => { if (r && r.kind === 'counted' && !/^MJ accessory/i.test(String(r.what || '')) && Number(r.qty) > 0) { n += Number(r.qty); any = true; } }); return any ? n : 0; } catch (e) { return null; }
  }
  async function pbOvLoad(uid, force) {
    if (!uid || uid === 'shared') return;
    const O = pbOvFor(uid);
    if (!O.read) { O.read = true; try { const c = await pbProdCacheGet(uid, 'ovToday'); if (c && c.data && pbOv === O && !O.feed && Array.isArray(c.data.feed)) { O.feed = c.data.feed; O.day = String(c.data.day || ''); O.fit = c.data.fit && typeof c.data.fit === 'object' ? c.data.fit : {}; O.more = !!c.data.more; O.at = c.at || 0; O.cached = true; pbOvPaint(); } } catch (e) {} }
    if (O.busy || (!force && Date.now() - O.lastTry < 60000)) return;
    if (!(await pbDlyCanAsk(uid))) { if (pbOv === O) { O.msg = navigator.onLine === false ? 'No signal.' : ''; pbOvPaint(); } return; }
    if (pbOv !== O || O.busy) return;
    O.busy = true; O.lastTry = Date.now(); pbOvPaint();
    try {
      const day = pbTkToday();
      try { pbRpfMetaLoad(pbRpfFor(uid), false).then(pbOvPaint).catch(() => null); } catch (e) {} // the foremen's names (the list Records' People filter already loads)
      const r = await pbPermitRpc('pb_reports_feed', { p_filters: { tz: pbRpfTz(), from: day, to: day, types: ['daily', 'ticket', 'event'] }, p_before_at: null, p_before_key: null, p_limit: 100, p_expect_uid: uid }, 30000);
      if (pbOv !== O) return;
      if (r && !r.error && r.data && r.data.ok && Array.isArray(r.data.items)) {
        O.feed = r.data.items.filter(x => x && typeof x === 'object' && typeof x.key === 'string'); O.day = day; O.more = !!(r.data.next && r.data.next.key); O.at = Date.now(); O.cached = false; O.msg = '';
        const keep = {}; O.feed.forEach(x => { if (x.type === 'daily' && x.id && O.fit[x.id] !== undefined) keep[x.id] = O.fit[x.id]; }); O.fit = keep;
        pbOvPaint();
        for (const x of O.feed.filter(x => x.type === 'daily' && x.id && String(x.work_date) === day).slice(0, 8)) {
          if (O.fit[x.id] !== undefined) continue;
          const g = await pbPermitRpc('pb_daily_get', { p_report_id: x.id, p_expect_uid: uid }, 30000).catch(() => null); if (pbOv !== O) return;
          if (g && !g.error && g.data && g.data.ok && g.data.snapshot) O.fit[x.id] = pbOvFittings(g.data.snapshot);
        }
        pbProdCacheSet(uid, 'ovToday', { at: O.at, data: { day, feed: O.feed, fit: O.fit, more: O.more } });
      } else { const m = String((r && r.error && r.error.message) || ''); O.msg = navigator.onLine === false || /failed to fetch|networkerror|load failed|timeout/i.test(m) ? 'No signal.' : 'Couldn’t load today’s reports and tickets.'; }
    } finally { if (pbOv === O) O.busy = false; pbOvPaint(); }
  }
  // The rows: one per crew (its foreman) and job. Pure: the board, the feed, the people, the jobs in; rows out.
  function pbOvBuild(B, feed, people, jobs, fit, day) {
    const rows = new Map(), byId = new Map(), byName = new Map();
    const P = B && B.runs && Array.isArray(B.runs.people) ? B.runs.people.filter(p => p && typeof p === 'object') : [];
    const foremen = (Array.isArray(people) ? people : []).filter(p => p && p.role === 'foreman' && !p.left && p.name);
    const crewOf = (p) => p.role === 'foreman' ? (p.name || 'Foreman (no name set)') : (p.foreman || p.name || 'Crew member');
    P.forEach(p => { const c = crewOf(p); if (p.id) byId.set(String(p.id), c); if (p.name) byName.set(pbOvKey(p.name), c); });
    foremen.forEach(p => { if (!byId.has(String(p.id))) byId.set(String(p.id), p.name); });
    const jobOf = (num) => (Array.isArray(jobs) ? jobs : []).find(j => j && pbOvKey(j.job_number) === pbOvKey(num) && pbOvKey(num)) || null;
    const row = (crew, num) => {
      const k = pbOvKey(crew) + '|' + pbOvKey(num); let r = rows.get(k);
      if (!r) { const j = jobOf(num); r = { key: k, crew, job: String(num || '').trim(), jobKey: j ? j.job_key : '', jobName: j ? String(j.project_name || j.jobsite || '') : '', people: [], runs: [], active: 0, ended: 0, ft: 0, permits: [], inside: 0, emerg: false, airBad: false, daily: null, fittings: null, tickets: [], events: [], evH: 0, last: 0, idle: false }; rows.set(k, r); }
      return r;
    };
    const seen = (r, t) => { if (Number.isFinite(t) && t > r.last) r.last = t; };
    const srvRuns = B && B.runs && B.runs.server_at, srvPermits = B && B.permits && B.permits.server_at, at = B ? B.at : 0;
    P.forEach(p => (Array.isArray(p.runs) ? p.runs : []).forEach(r => {
      if (!r || typeof r !== 'object') return; const today = r.work_date === day;
      if (!today && r.ended) return;
      const s = r.status || {}, R = row(crewOf(p), r.job_number || s.jobNumber);
      if (!R.people.includes(p.name || 'Crew member')) R.people.push(p.name || 'Crew member');
      const ft = today ? pbLvToday({ runs: [r] }, day).total : 0;
      R.runs.push({ p, r, ft, today }); if (r.ended) R.ended++; else R.active++; R.ft += ft; seen(R, pbCrewPhoneTime(r.updated_at, srvRuns, at));
    }));
    (B && B.permits && Array.isArray(B.permits.permits) ? B.permits.permits : []).forEach(x => {
      if (!x || typeof x !== 'object' || !x.permit_ref || x.closed) return;
      const s = x.status || {}, R = row(byName.get(pbOvKey(x.who)) || x.who || 'Crew member', s.jobNumber);
      R.permits.push(x); R.inside += Number(s.inside) || 0; if (s.emergency) R.emerg = true; if (s.airOk === false) R.airBad = true; seen(R, pbCrewPhoneTime(x.updated_at, srvPermits, at));
    });
    (Array.isArray(feed) ? feed : []).forEach(x => {
      const a = x.author && typeof x.author === 'object' ? x.author : null, crew = (a && a.id && byId.get(String(a.id))) || (a && a.name && (byName.get(pbOvKey(a.name)) || a.name)) || x.signed_name || 'Crew member';
      if (x.type === 'daily') { if (String(x.work_date) !== day) return; const R = row(crew, x.job_number); if (!R.daily || Date.parse(x.at) > Date.parse(R.daily.at)) { R.daily = x; R.fittings = fit && fit[x.id] !== undefined ? fit[x.id] : null; } seen(R, Date.parse(x.at)); }
      else if (x.type === 'ticket') { const R = row(crew, x.job_number); R.tickets.push(x); seen(R, Date.parse(x.at)); }
      else if (x.type === 'event') { if (x.work_date && String(x.work_date) !== day) return; const R = row(crew, x.job_number); R.events.push(x); R.evH += Number(x.hours) > 0 ? Number(x.hours) : 0; seen(R, Date.parse(x.at)); }
    });
    const have = new Set(Array.from(rows.values()).map(r => pbOvKey(r.crew)));
    foremen.forEach(p => { if (!have.has(pbOvKey(p.name))) { const R = row(p.name, ''); R.idle = true; } });
    return Array.from(rows.values());
  }
  window.__pbOvBuild = pbOvBuild; // tests
  const PB_OV_COLS = [['crew', 'Crew', 'Foreman, and who is on the crew today'], ['job', 'Job', ''], ['runs', 'Runs', 'Runs in progress and runs ended today'], ['ft', 'Laid today', 'Feet of pipe marked laid today, as the crew’s phones last sent'], ['fittings', 'Fittings', 'Counted by the app on the signed daily report. Shows once the daily is signed.'], ['permits', 'Permits open', 'Confined space permits open now, and how many people are inside'], ['daily', 'Daily report', 'Signed for today or not'], ['tickets', 'Tickets', 'Field tickets sent today'], ['delays', 'Delays', 'Delays and extra work on today’s signed daily'], ['last', 'Last activity', 'The newest thing this crew’s phones sent']];
  function pbOvSortVal(r, k) {
    return k === 'crew' ? pbOvKey(r.crew) : k === 'job' ? pbOvKey(r.job) : k === 'runs' ? r.active * 1000 + r.ended : k === 'ft' ? r.ft : k === 'fittings' ? (r.fittings === null ? -1 : r.fittings) : k === 'permits' ? (r.emerg ? 1e6 : 0) + r.inside * 1000 + r.permits.length : k === 'daily' ? (r.daily ? 1 : 0) : k === 'tickets' ? r.tickets.length : k === 'delays' ? r.events.length * 1000 + r.evH : r.last;
  }
  function pbOvSorted(rows, sort) {
    return rows.slice().sort((a, b) => { if (a.idle !== b.idle) return a.idle ? 1 : -1; const x = pbOvSortVal(a, sort.k), y = pbOvSortVal(b, sort.k); return (x < y ? -1 : x > y ? 1 : 0) * sort.d || (pbOvKey(a.crew) < pbOvKey(b.crew) ? -1 : pbOvKey(a.crew) > pbOvKey(b.crew) ? 1 : 0) || (pbOvKey(a.job) < pbOvKey(b.job) ? -1 : 1); });
  }
  const pbOvT = (ms) => Number.isFinite(ms) && ms > 0 ? pbProdTimeText(ms) : '';
  function pbOvDetail(uid, r, B) {
    const srvRuns = B && B.runs && B.runs.server_at, srvPermits = B && B.permits && B.permits.server_at, at = B ? B.at : 0;
    let h = '<div class="ov-d">';
    h += '<div class="ov-dcol"><h4 class="ov-dh">Runs</h4>' + (r.runs.length ? '<ul class="ov-dl">' + r.runs.map(({ p, r: run, ft }) => {
      const s = run.status || {}, total = Number(s.totalFt), laid = pbLvReach(s), end = typeof s.endedAt === 'number' ? s.endedAt : Date.parse(s.endedAt);
      return '<li><strong>' + pbCxE(p.name || 'Crew member') + '</strong> · ' + pbCxE(s.label || 'Run') + '<br><span class="ov-dim">' + pbCxE((run.ended ? 'Ended' + (pbOvT(end) ? ' ' + pbOvT(end) : '') : 'In progress') + (total > 0 ? ' · laid ' + pbProdQtyText(laid) + ' of ' + pbProdQtyText(total) + ' ft' : '') + (ft > 0 ? ' · today ' + pbProdQtyText(ft) + ' ft' : '') + ' · last update ' + pbOvT(pbCrewPhoneTime(run.updated_at, srvRuns, at))) + '</span></li>'; }).join('') + '</ul>' : '<p class="ov-dim">No runs sent today.</p>') + '</div>';
    h += '<div class="ov-dcol"><h4 class="ov-dh">Permits open</h4>' + (r.permits.length ? '<ul class="ov-dl">' + r.permits.map(x => { const s = x.status || {};
      const air = s.lastAirAt ? 'Air ' + (s.airOk === true ? 'within limits' : s.airOk === false ? 'OUTSIDE LIMITS' : 'reading') + ' at ' + pbProdTimeText(Date.parse(s.lastAirAt)) : 'No air reading reported yet';
      return '<li' + (s.emergency ? ' class="ov-bad"' : '') + '><strong>' + pbCxE(s.space || 'Confined space') + '</strong> · ' + pbCxE((Number(s.inside) || 0) + ' inside') + (s.emergency ? ' · <strong>EMERGENCY</strong>' : '') + '<br><span class="' + (s.airOk === false ? 'ov-bad' : 'ov-dim') + '">' + pbCxE(air) + '</span><br>'
        + (s.emergency ? '<span class="ov-bad">' + pbCxE('Declared on the permit phone' + (s.emergencyAt ? ' at ' + pbProdTimeText(Date.parse(s.emergencyAt)) : '') + ' (as last reported). This board alerts no one.') + '</span><br>' : '')
        + '<span class="ov-dim">' + pbCxE((x.who ? x.who + ' · ' : '') + 'last update ' + pbOvT(pbCrewPhoneTime(x.updated_at, srvPermits, at))) + '</span></li>'; }).join('') + '</ul>' : '<p class="ov-dim">None open.</p>') + '</div>';
    const docs = [].concat(r.daily ? [r.daily] : [], r.tickets, r.events), R = pbRpfFor(uid), tier = pbRpfTier(R);
    h += '<div class="ov-dcol"><h4 class="ov-dh">Sent today</h4>' + (docs.length ? '<ul class="ov-dl">' + docs.map(x => { let v = null; try { v = pbRpfServerRow(R, x, tier); } catch (e) { v = null; }
      return v ? '<li><button type="button" class="ov-doc" data-key="' + pbCxE(x.key) + '" onclick="pbOvOpenDoc(this.dataset.key)">' + pbCxE(v.title || 'Record') + '</button> <span class="ov-dim">' + pbCxE([v.stText, pbOvT(Date.parse(x.at))].filter(Boolean).join(' · ')) + '</span></li>' : ''; }).join('') + '</ul>' : '<p class="ov-dim">Nothing sent yet.</p>')
      + (r.jobKey ? '<button type="button" class="pb-btn ghost small ov-jobbtn" data-job="' + pbCxE(r.jobKey) + '" onclick="pbCxOpenJob(this.dataset.job, \'overview\')">Open ' + pbCxE(pbProdJobLabel(r.job)) + '</button>' : '') + '</div>';
    return h + '</div>';
  }
  function pbOvRender() {
    const el = document.getElementById('homeCxToday'); if (!el) return;
    const uid = pbArchiveOwnerUid;
    if (!pbOvWide() || !uid || uid === 'shared') { if (!el.hidden) { el.hidden = true; el.innerHTML = ''; } return; }
    const O = pbOvFor(uid), B = pbCxBoard(uid), D = pbCxDash(uid), jobs = D ? D.data.jobs : [], now = pbTkToday();
    const day = (B && B.runs && typeof B.runs.today === 'string' && B.runs.today) || now, feed = O.feed && O.day === day ? O.feed : null;
    let people = []; try { const M = pbRpfFor(uid).meta; people = M && Array.isArray(M.people) ? M.people : []; } catch (e) {}
    const all = pbOvBuild(B, feed, people, jobs, O.fit, day), rows = pbOvSorted(all, O.sort);
    const ats = [B && B.at, feed ? O.at : 0].filter(t => t > 0), at = ats.length ? Math.min.apply(null, ats) : 0;
    const cached = !!((B && B.cached) || (feed && O.cached)), busy = !!((B && B.busy) || O.busy);
    const st = (day !== now ? 'Showing ' + pbRpfDayShort(day) + ', the last copy saved here. ' : '') + pbCxAge(busy, O.msg, at, cached) + (!feed && B ? ' Daily reports, tickets and delays load with signal.' : '') + (O.more && feed ? ' More than 100 records today: the newest 100 are counted.' : '');
    const th = PB_OV_COLS.map(([k, label, tip]) => '<th scope="col" class="ov-c-' + k + '"' + (O.sort.k === k ? ' aria-sort="' + (O.sort.d > 0 ? 'ascending' : 'descending') + '"' : '') + '><button type="button" class="ov-sort" id="ovSort_' + k + '" data-k="' + k + '"' + (tip ? ' title="' + pbCxE(tip) + '"' : '') + ' onclick="pbOvSort(this.dataset.k)">' + pbCxE(label) + '<span class="ov-arrow" aria-hidden="true">' + (O.sort.k === k ? (O.sort.d > 0 ? '▲' : '▼') : '') + '</span></button></th>').join('');
    const dash = '<span class="ov-dim">–</span>';
    const tr = (r, i) => {
      const open = O.open === r.key, pe = r.people.filter(n => pbOvKey(n) !== pbOvKey(r.crew));
      const cells = [
        '<button type="button" class="ov-open" id="ovOpen' + i + '" aria-expanded="' + open + '" aria-controls="ovDetail' + i + '">' + pbCxE(r.crew) + '</button>' + (pe.length ? '<span class="ov-sub">' + pbCxE(pe.join(', ')) + '</span>' : ''),
        r.job ? pbCxE(pbProdJobLabel(r.job)) + (r.jobName ? '<span class="ov-sub">' + pbCxE(r.jobName) + '</span>' : '') : (r.idle ? dash : pbCxE('No job number')),
        r.idle ? '<span class="ov-dim">Nothing sent today</span>' : (r.active || r.ended) ? (r.active ? '<span class="ov-on">' + r.active + ' active</span>' : '') + (r.active && r.ended ? ' · ' : '') + (r.ended ? r.ended + ' ended' : '') : dash,
        r.runs.some(x => x.today) ? pbCxE(pbProdQtyText(r.ft)) + ' ft' : dash,
        r.fittings !== null && r.fittings !== undefined ? pbCxE(pbProdQtyText(r.fittings)) : dash,
        r.permits.length ? (r.emerg ? '<span class="pbx-tag emerg">EMERGENCY</span> ' : '') + r.permits.length + ' open' + (r.inside > 0 ? ' <span class="ov-inside">' + r.inside + ' inside</span>' : ' · 0 inside') + (r.airBad ? ' <span class="ov-inside">air outside limits</span>' : '') : dash,
        r.idle ? dash : r.daily ? '<span class="ov-ok">Signed</span><span class="ov-sub">' + pbCxE(pbOvT(Date.parse(r.daily.at))) + '</span>' : feed ? '<span class="ov-no">Not yet</span>' : dash,
        r.tickets.length ? String(r.tickets.length) : feed && !r.idle ? '0' : dash,
        r.events.length ? r.events.length + (r.evH > 0 ? ' · ' + pbCxE(pbProdQtyText(Math.round(r.evH * 100) / 100)) + ' h' : '') : feed && !r.idle ? '0' : dash,
        r.last ? pbCxE(pbOvT(r.last)) : dash
      ];
      return '<tr class="ov-row' + (r.inside > 0 || r.emerg ? ' ov-hot' : '') + (r.idle ? ' ov-idle' : '') + (open ? ' ov-isopen' : '') + '" id="ovRow' + i + '" data-key="' + pbCxE(r.key) + '" onclick="pbOvToggle(this.dataset.key, event)">' + cells.map((c, j) => '<td class="ov-c-' + PB_OV_COLS[j][0] + '">' + c + '</td>').join('') + '</tr>'
        + (open ? '<tr class="ov-detail" id="ovDetail' + i + '"><td colspan="' + PB_OV_COLS.length + '">' + pbOvDetail(uid, r, B) + '</td></tr>' : '');
    };
    const body = !B && !feed ? '<p class="pbx-none" id="ovNone">' + (pbCxOnline() ? 'Loading today…' : 'Today loads with signal.') + '</p>'
      : !rows.length ? '<p class="pbx-none" id="ovNone">Nothing sent by any crew today.</p>'
      : '<div class="ov-scroll"><table class="ov-table" id="ovTable"><thead><tr>' + th + '</tr></thead><tbody>' + rows.map(tr).join('') + '</tbody></table></div>';
    const h = '<div class="pbx-sechead ov-head"><h2 class="pbx-h" id="ovHead">Today</h2><p class="pbx-stat" id="ovStatus" role="status">' + pbCxE(st.trim()) + '</p>'
      + '<button type="button" class="pbx-iconbtn" id="ovRefresh" onclick="pbOvRefresh()">' + pbCxIc('refresh') + '<span class="pb-sr">Refresh today</span></button></div>'
      + '<p class="ov-note">What crews’ phones last sent. Not live if a phone is offline, and nobody is alerted from here.</p>' + body;
    if (el.hidden) el.hidden = false;
    pbSetHtml(el, h);
  }
  window.pbOvSort = function(k) { const O = pbOvFor(pbArchiveOwnerUid); O.sort = O.sort.k === k ? { k, d: -O.sort.d } : { k, d: ['crew', 'job'].includes(k) ? 1 : -1 }; pbOvRender(); const b = document.getElementById('ovSort_' + k); if (b) b.focus({ preventScroll: true }); };
  window.pbOvToggle = function(key, ev) {
    if (ev && ev.target && ev.target.closest && ev.target.closest('.ov-detail')) return;
    const O = pbOvFor(pbArchiveOwnerUid); O.open = O.open === key ? null : key; pbOvRender();
    const tr = Array.from(document.querySelectorAll('#ovTable tr.ov-row')).find(t => t.dataset.key === key), b = tr && tr.querySelector('.ov-open'); if (b) b.focus({ preventScroll: true });
  };
  window.pbOvOpenDoc = function(key) {
    const uid = pbArchiveOwnerUid, O = pbOvFor(uid), x = (O.feed || []).find(f => f.key === key); if (!x) return;
    try { const R = pbRpfFor(uid), v = pbRpfServerRow(R, x, pbRpfTier(R)); if (v && typeof v.open === 'function') v.open(); } catch (e) { console.error(e); pbAlert('This record couldn’t be opened. Try again.', 'Today'); }
  };
  window.pbOvRefresh = function() { const uid = pbArchiveOwnerUid; try { window.pbCxRefresh(true); } catch (e) {} pbOvLoad(uid, true).catch(() => null); };
  window.__pbOvDebug = () => { const uid = pbArchiveOwnerUid, O = pbOvFor(uid); return JSON.parse(JSON.stringify({ wide: pbOvWide(), day: O.day, at: O.at, cached: O.cached, msg: O.msg, feed: O.feed ? O.feed.length : null, fit: O.fit, sort: O.sort, open: O.open })); };
  { const o = window.pbCxRender; window.pbCxRender = function() { const r = o.apply(this, arguments); try { pbOvRender(); if (pbOvWide() && pbCurrentScreen === 'home') pbOvLoad(pbArchiveOwnerUid, false).catch(() => null); } catch (e) { console.error(e); } return r; }; }
  window.pbAccountLoadHooks.push((uid) => { if (pbOv.uid !== uid) pbOv = pbOvNew(null); });
  window.addEventListener('resize', () => { try { if (pbCx.on && pbCurrentScreen === 'home') window.pbCxRender(); } catch (e) {} });
  // ================= end officeview 01 =================

