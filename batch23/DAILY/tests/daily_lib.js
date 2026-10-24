// Batch 23 DAILY: shared setup for the UI tests. Supabase is the hunt6 mock5 (session from localStorage '__mockSess',
// signed in as acctA). On top of it, a fake of sql/01_daily.sql + the weather edge function (state in localStorage
// '__dlySrv'), with the same rules: the company adds items, only the ASSIGNED foreman checks off, only a foreman signs a
// daily report, one per job per day (amendments point at the version they replace).
//   localStorage '__dlyWho' = foreman (member, role foreman) | owner (company account) | pipelayer
//   localStorage '__dlyNoServer' = '1' -> every pb_insp_* / pb_daily_* call answers "Could not find the function" (base server)
//   window.__wx = 'need' | 'ok' | 'down' -> the weather function's answer
// No real email addresses: every address is built at run time on example.test.
const M = require('/home/claude/test/hunt6/confined/mock5.js');
const check = (l, c, d) => { console.log((c ? 'OK  ' : '*** FAIL ***') + ' - ' + l + (c || d === undefined ? '' : ' :: ' + String(d).slice(0, 400))); if (!c) process.exitCode = 1; };
const MOCK = () => {
  const d = Object.getOwnPropertyDescriptor(window, 'supabase');
  const CO = '0000000c-0000-4000-8000-000000000001', AT = String.fromCharCode(64), addr = (n) => n + AT + 'example.test';
  const FA = 'acctA', F2 = '00000000-0000-4000-8000-0000000000f2';
  const LTZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })(); // the phone's own zone
  const who = () => localStorage.getItem('__dlyWho') || 'foreman';
  const isOwner = () => who() === 'owner', isForeman = () => who() === 'foreman', isMember = () => who() !== 'owner';
  const today = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
  const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
  const srvGet = () => { let s = null; try { s = JSON.parse(localStorage.getItem('__dlySrv') || 'null'); } catch (e) {} if (s) return s;
    s = { items: [
      { id: 'it-1', job_key: '24-101', job_number: '24-101', jobsite: 'Main St', kind: 'pressure', kind_detail: 'Hydrostatic 150 psi', sta_from: 100, sta_to: 450, location_text: null, scheduled_date: today, foreman_uid: FA, foreman: 'Frank Ortiz', note: 'Bring the pump', status: 'open', last_result: null, version: 1, checks: [], history: [{ version: 1, action: 'added', by: 'DIG Civil Construction', at: iso(86400000) }] },
      { id: 'it-2', job_key: '24-101', job_number: '24-101', jobsite: 'Main St', kind: 'cctv', kind_detail: null, sta_from: null, sta_to: null, location_text: 'MH-7 to MH-10', scheduled_date: null, foreman_uid: F2, foreman: 'Wes Hall', note: null, status: 'open', last_result: null, version: 1, checks: [], history: [] },
      { id: 'it-3', job_key: '24-101', job_number: '24-101', jobsite: 'Main St', kind: 'compaction', kind_detail: '95% Proctor', sta_from: 200, sta_to: null, location_text: null, scheduled_date: null, foreman_uid: FA, foreman: 'Frank Ortiz', note: null, status: 'done', last_result: 'pass', version: 2,
        checks: [{ id: 'ck-0', result: 'pass', closes: true, inspector_name: 'Ann Lee', inspector_agency: 'Acme Testing', done_at: new Date().toISOString(), done_tz: LTZ, notes: 'Density 97%', photo_count: 0, photo_sha256: [], by: 'Frank Ortiz', received_at: new Date().toISOString() }], history: [] }],
      reports: [], weather: {}, location: null, n: 0 };
    localStorage.setItem('__dlySrv', JSON.stringify(s)); return s; }; // stored at once, so its times stay put (as on a real server)
  const srvSet = (v) => localStorage.setItem('__dlySrv', JSON.stringify(v));
  window.__rpcLog = []; window.__fnLog = [];
  const missing = () => ({ data: null, error: { message: 'Could not find the function public.x in the schema cache' } });
  const daily = (fn) => /^pb_(insp|daily)_/.test(fn);
  window.__dlyRpc = async (fn, args) => {
    window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
    if (navigator.onLine === false || window.__offline) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
    if (fn === 'pb_prod_access') return { data: { member: isMember(), company_id: isMember() ? CO : null, company_active: true, joined_at: iso(30 * 86400000), role: ({ foreman: 'foreman', pipelayer: 'pipelayer' })[who()] || null, manager: isOwner(), managed_company_id: isOwner() ? CO : null, server_at: new Date().toISOString() }, error: null };
    if (fn === 'pb_report_access') return { data: { member: isMember(), company_id: isMember() ? CO : null, company_active: true, report_key: 'k', manager: isOwner(), managed_company_id: isOwner() ? CO : null }, error: null };
    if (fn === 'pb_crew_my_invitations') return { data: { server_at: new Date().toISOString(), invitations: [] }, error: null };
    if (fn === 'pb_crew_list') return isOwner() ? { data: { company_id: CO, members: [{ user_id: FA, name: 'Frank Ortiz', role: 'foreman', member: true, status: 'active' }, { user_id: F2, name: 'Wes Hall', role: 'foreman', member: true, status: 'active' }, { user_id: 'p1', name: 'Pat Lay', role: 'pipelayer', member: true, status: 'active' }] }, error: null } : { data: null, error: { message: 'pb:not_company_account' } };
    if (fn === 'pb_prod_company_dashboard') return { data: { today, jobs: [{ job_key: '24-101', job_number: '24-101', jobsite: 'Main St', last_at: new Date().toISOString(), entries: 1, reporters: 1, reporters_today: 1, plan: null, cats: [{ key: 'pipe', unit: 'LF', done: 60, today: 60, week: 60, n: 1 }] }] }, error: null };
    if (fn === 'pb_prod_company_links') return { data: { links: [] }, error: null };
    if (fn === 'pb_prod_job_detail') return { data: { today, job_key: '24-101', job_number: '24-101', jobsite: 'Main St', plan: null, plan_version: 0, cats: [], days: [], reporters: [], recent: [], crew: [] }, error: null };
    if (fn === 'pb_ticket_company_totals') return { data: { tickets: 0, concrete_yd3: 0, sub_hours: [] }, error: null };
    if (!daily(fn)) return { data: null, error: { message: 'not mocked' } };
    if (localStorage.getItem('__dlyNoServer') === '1') return missing();
    if (args && args.p_expect_uid && args.p_expect_uid !== 'acctA') return { data: null, error: { message: 'pb:wrong_account' } };
    const s = srvGet();
    const mine = (i) => Object.assign({ company_id: CO }, i, { mine: i.foreman_uid === FA });
    // localStorage '__dlyRefuse' = { fn: 'future_time' | 'future_time_err' | 'bad_record_err' }: how the fake server refuses
    let refuse = {}; try { refuse = JSON.parse(localStorage.getItem('__dlyRefuse') || '{}'); } catch (e) {}
    const clock = (fn) => { const k = refuse[fn]; if (!k) return null; if (k === 'bad_record_err') return { data: null, error: { code: '23514', message: 'new row for relation "checks" violates check constraint "checks_notes_check"' } };
      if (args.p_clock_ok) return null; if (k === 'future_time_err') return { data: null, error: { code: 'P0001', message: 'pb:future_time' } }; return { data: { ok: false, code: 'pb:future_time', phone_ahead_s: 1800, server_at: new Date().toISOString() }, error: null }; };
    window.__dlyLastArgs = window.__dlyLastArgs || {}; window.__dlyLastArgs[fn] = args;
    if (fn === 'pb_daily_prod_day') return { data: { ok: true, company_id: CO, server_at: new Date().toISOString(), entries: isForeman() ? [{ entered_by: 'Pat Lay', role: 'pipelayer', kind: 'run', jobsite: 'Main St', updated_at: today + 'T15:00:00.000Z', items: [{ key: 'pipe', qty: 40, unit: 'LF' }] }] : [] }, error: null };
    if (fn === 'pb_insp_mine') return { data: { ok: true, company_id: CO, foreman: isForeman(), items: isForeman() ? s.items.filter(i => i.foreman_uid === FA && i.status !== 'canceled').map(mine) : [] }, error: null };
    if (fn === 'pb_insp_job') { if (who() === 'pipelayer') return { data: null, error: { message: 'pb:not_company_member' } }; return { data: { ok: true, company_id: CO, can_add: isOwner(), is_foreman: isForeman(), items: s.items.filter(i => i.job_key === String(args.p_job_number).trim().toLowerCase()).map(mine) }, error: null }; }
    if (fn === 'pb_insp_company') { if (!isOwner()) return { data: null, error: { message: 'pb:not_company_account' } }; const jobs = {}; s.items.forEach(i => { const j = jobs[i.job_key] || (jobs[i.job_key] = { job_key: i.job_key, job_number: i.job_number, open: 0, done: 0, failed_open: 0, reports: s.reports.filter(r => r.job_number === i.job_number).length, last_report: null }); if (i.status === 'open') { j.open++; if (i.last_result && i.last_result !== 'pass') j.failed_open++; } if (i.status === 'done') j.done++; }); return { data: { ok: true, jobs: Object.values(jobs) }, error: null }; }
    if (fn === 'pb_insp_add') {
      if (!isOwner()) return { data: { ok: false, code: 'pb:not_company_account' }, error: null };
      if (args.p_kind === 'other' && !args.p_kind_detail) return { data: { ok: false, code: 'pb:need_detail' }, error: null };
      if (![FA, F2].includes(args.p_foreman)) return { data: { ok: false, code: 'pb:not_foreman' }, error: null };
      const it = { id: 'it-new' + (++s.n), job_key: args.p_job_number.toLowerCase(), job_number: args.p_job_number, jobsite: args.p_jobsite, kind: args.p_kind, kind_detail: args.p_kind_detail, sta_from: args.p_sta_from, sta_to: args.p_sta_to, location_text: args.p_location_text, scheduled_date: args.p_scheduled_date, foreman_uid: args.p_foreman, foreman: args.p_foreman === FA ? 'Frank Ortiz' : 'Wes Hall', note: args.p_note, status: 'open', last_result: null, version: 1, checks: [], history: [{ version: 1, action: 'added', by: 'DIG Civil Construction', at: new Date().toISOString() }] };
      s.items.push(it); srvSet(s); return { data: { ok: true, item: it }, error: null };
    }
    if (fn === 'pb_insp_edit') {
      if (!isOwner()) return { data: { ok: false, code: 'pb:not_found' }, error: null };
      const it = s.items.find(i => i.id === args.p_item_id); if (!it) return { data: { ok: false, code: 'pb:not_found' }, error: null };
      if (it.version !== args.p_expect_version) return { data: { ok: false, code: 'pb:changed' }, error: null };
      if (it.status === 'done' && (args.p_status !== 'done' || args.p_foreman !== it.foreman_uid)) return { data: { ok: false, code: 'pb:item_done' }, error: null };
      if (!args.p_reason) return { data: { ok: false, code: args.p_status === 'canceled' ? 'pb:need_reason' : 'pb:need_change_reason' }, error: null };
      Object.assign(it, { kind: args.p_kind, kind_detail: args.p_kind_detail, sta_from: args.p_sta_from, sta_to: args.p_sta_to, location_text: args.p_location_text, note: args.p_note, foreman_uid: args.p_foreman, scheduled_date: args.p_scheduled_date, status: args.p_status, version: it.version + 1 });
      it.history.push({ version: it.version, action: args.p_status === 'canceled' ? 'canceled' : it.checks.length ? 'amended' : 'edited', reason: args.p_reason, by: 'DIG Civil Construction', at: new Date().toISOString() });
      srvSet(s); return { data: { ok: true, item: it }, error: null };
    }
    if (fn === 'pb_insp_check') {
      if (!isForeman()) return { data: { ok: false, code: 'pb:not_foreman' }, error: null };
      const it = s.items.find(i => i.id === args.p_item_id); if (!it) return { data: { ok: false, code: 'pb:not_found' }, error: null };
      const again = it.checks.find(c => c.cid === args.p_client_check_id); if (again) return { data: { ok: true, again: true, check_id: again.id, item: mine(it) }, error: null };
      if (it.foreman_uid !== FA) return { data: { ok: false, code: 'pb:not_assigned' }, error: null };
      if (it.status !== 'open') return { data: { ok: false, code: 'pb:item_done' }, error: null };
      const cr = clock(fn); if (cr) return cr;
      const c = { id: 'ck-' + (++s.n), item_version: args.p_item_version, item_seen: args.p_item_seen, item_version_now: it.version, phone_clock_ahead_s: args.p_clock_ok ? 1800 : null, cid: args.p_client_check_id, result: args.p_result, closes: args.p_result === 'pass' || !!args.p_close, inspector_name: args.p_inspector, inspector_agency: args.p_agency, done_at: args.p_done_at, done_tz: args.p_done_tz, notes: args.p_notes, photo_count: (args.p_photos || []).length, photo_sha256: (args.p_photos || []).map(() => 'ab'.repeat(32)), by: 'Frank Ortiz', received_at: new Date().toISOString() };
      it.checks.push(c); it.status = c.closes ? 'done' : 'open'; it.last_result = c.result; it.version++; srvSet(s);
      return { data: { ok: true, check_id: c.id, received_at: c.received_at, item: mine(it) }, error: null };
    }
    if (fn === 'pb_insp_photo') return { data: { ok: true, b64: '/9j/4AAQSkZJRgABAQ', sha256: 'ab'.repeat(32), received_at: new Date().toISOString() }, error: null };
    if (fn === 'pb_daily_submit') {
      if (!isForeman()) return { data: { ok: false, code: 'pb:not_foreman' }, error: null };
      const again = s.reports.find(r => r.cid === args.p_client_report_id); if (again) return { data: { ok: true, again: true, id: again.id, version: again.version }, error: null };
      const same = s.reports.filter(r => r.job_number.toLowerCase() === args.p_job_number.toLowerCase() && r.work_date === args.p_work_date).sort((a, b) => b.version - a.version);
      if (same.length && !args.p_supersedes) return { data: { ok: false, code: 'pb:report_exists', id: same[0].id }, error: null };
      if (same.length && args.p_supersedes !== same[0].id) return { data: { ok: false, code: 'pb:not_latest' }, error: null };
      if (args.p_supersedes && !args.p_amend_reason) return { data: { ok: false, code: 'pb:amend_reason' }, error: null };
      if (!same.length && args.p_supersedes) return { data: { ok: false, code: 'pb:bad_supersedes' }, error: null };
      const cr = clock(fn); if (cr) return cr;
      const r = { id: 'rep-' + (++s.n), phone_clock_ahead_s: args.p_clock_ok ? 1800 : null, client_report_id: args.p_client_report_id, cid: args.p_client_report_id, job_number: args.p_job_number, jobsite: args.p_jobsite, work_date: args.p_work_date, version: same.length + 1, supersedes: args.p_supersedes || null, amend_reason: args.p_amend_reason, snapshot: args.p_snapshot, snapshot_sha256: args.p_sha256, server_sha256: args.p_sha256,
        signed_name: args.p_signed_name, signed_at: args.p_signed_at, signed_tz: args.p_signed_tz, signature_png_b64: args.p_signature_b64, received_at: new Date().toISOString(), foreman: 'Frank Ortiz' };
      s.reports.push(r); srvSet(s); return { data: { ok: true, id: r.id, version: r.version, received_at: r.received_at, server_sha256: r.server_sha256, sha_matches: true, phone_clock_ahead_s: r.phone_clock_ahead_s }, error: null };
    }
    if (fn === 'pb_daily_list') return { data: { ok: true, reports: s.reports.filter(r => r.job_number.toLowerCase() === String(args.p_job_number).toLowerCase()).map(r => ({ id: r.id, job_number: r.job_number, work_date: r.work_date, version: r.version, supersedes: r.supersedes, amend_reason: r.amend_reason, foreman: r.foreman, mine: isForeman(), signed_name: r.signed_name, signed_at: r.signed_at, signed_tz: r.signed_tz, received_at: r.received_at, snapshot_sha256: r.snapshot_sha256, sha_matches: true, latest: !s.reports.some(x => x.supersedes === r.id) })).reverse() }, error: null };
    if (fn === 'pb_daily_get') { const r = s.reports.find(x => x.id === args.p_report_id); return { data: r ? Object.assign({ ok: true }, r) : { ok: false, code: 'pb:not_found' }, error: null }; }
    if (fn === 'pb_daily_weather_get') { const w = s.weather[args.p_job_number + '|' + args.p_work_date]; return { data: { ok: true, company_id: CO, can_set_location: isOwner(), weather: w || null, location: s.location }, error: null }; }
    return { data: null, error: { message: 'not mocked' } };
  };
  window.__dlyInvoke = async (name, opts) => {
    const body = (opts && opts.body) || {}; window.__fnLog.push({ name, body: JSON.parse(JSON.stringify(body)) });
    if (name !== 'weather') return { data: null, error: { message: 'not mocked' } };
    if (localStorage.getItem('__dlyNoServer') === '1') return { data: null, error: { name: 'FunctionsHttpError', message: 'Function not found' } };
    const s = srvGet(), mode = window.__wx || 'auto';
    if (mode === 'down') return { data: { ok: false, code: 'pb:nws_down', message: 'The National Weather Service isn’t answering right now. Try again later.' }, error: null };
    const newLoc = !!(body.address || (typeof body.lat === 'number'));
    if (newLoc && !isOwner()) return { data: { ok: false, code: 'pb:location_managers_only', message: 'Only the company account, a manager or a PM can set a job’s location. Ask the office to set it.' }, error: null };
    const key = body.job_number + '|' + body.work_date, last = (s.wxAt || {})[key];
    if (!newLoc && last && Date.now() - last < 3600000) { const w0 = s.weather[key]; return w0 ? { data: { ok: true, cached: true, weather: w0, next_at: new Date(last + 3600000).toISOString(), location: s.location }, error: null } : { data: { ok: false, code: 'pb:try_later', message: 'Looked up less than an hour ago.' }, error: null }; }
    if (!s.location && !newLoc) return { data: { ok: false, code: isOwner() ? 'pb:need_location' : 'pb:need_location_office', message: 'This job has no location yet. Ask the office to set it.' }, error: null };
    s.wxAt = s.wxAt || {}; s.wxAt[key] = Date.now();
    if (body.address) s.location = { source: 'geocoded', address: body.address, set_at: new Date().toISOString() }; else if (typeof body.lat === 'number') s.location = { source: body.source, lat: body.lat, lon: body.lon, set_at: new Date().toISOString() };
    const w = { station: 'KMDW', complete: false, retrieved_at: new Date().toISOString(), data: { station: 'KMDW', station_name: 'Chicago Midway', tz: 'America/Chicago', work_date: body.work_date, obs_count: 9, first_obs: new Date(Date.now() - 8 * 3600000).toISOString(), last_obs: new Date(Date.now() - 600000).toISOString(),
      high_f: 64.4, low_f: 46.4, high_c: 18, low_c: 8, precip_in: 0.3, precip_hours_reported: 4, precip_hours_in_day: 24, wind_max_mph: 14, gust_max_mph: 25, conditions: [{ text: 'Light Rain', n: 3 }, { text: 'Cloudy', n: 2 }], complete: false, location_source: s.location.source, location: s.location } };
    s.weather[body.job_number + '|' + body.work_date] = w; srvSet(s);
    return { data: { ok: true, cached: false, weather: w, location: { source: s.location.source, address: s.location.address || null } }, error: null };
  };
  Object.defineProperty(window, 'supabase', { configurable: true, get() { const sb = d.get(); return { createClient: (...a) => {
    const c = sb.createClient(...a);
    c.rpc = (fn, args) => window.__dlyRpc(fn, args);
    c.functions = { invoke: (n, o) => window.__dlyInvoke(n, o) };
    const from = c.from;
    c.from = (t) => {
      const one = (val) => { const q = { select() { return q; }, eq() { return q; }, maybeSingle: async () => (navigator.onLine === false ? { data: null, error: { message: 'offline' } } : { data: val(), error: null }) }; return q; };
      if (t === 'subscriptions') return one(() => null);
      if (t === 'company_members') return one(() => isMember() ? { company_id: CO, role: ({ foreman: 'foreman', pipelayer: 'pipelayer' })[who()], companies: { name: 'DIG Civil Construction', status: 'active' } } : null);
      if (t === 'companies') return one(() => isOwner() ? { name: 'DIG Civil Construction', status: 'active' } : null);
      return from(t);
    };
    return c; } }; }, set(v) {} });
};
// One archived run for job 24-101 started today (crew log, foreman production, a note), a field ticket, nothing else.
const SEED = () => {
  const now = Date.now(), sod = new Date(new Date().setHours(0, 0, 0, 0)).getTime(), t0 = Math.max(now - 5 * 3600000, sod + 60000); // started today, even just after midnight
  const run = { id: 9101, kind: 'run', jobNumber: '24-101', jobsite: 'Main St', startLabel: 'MH-7', endLabel: 'MH-8', runStartTime: new Date(t0).toISOString(), runEndTime: new Date(now - 3600000).toISOString(), lockTime: new Date(now - 3600000).toISOString(),
    distance: 120, completedDistance: 120, durationMin: 240, beddingVolumeYd3: 8.25, volumeYd3: 31.5, pipelayer: 'Wes Hall', crew: 'Crew 2', costCode: '02-100',
    foreman: { feetPipeInstalled: 60, feetExcavated: 70, feetBackfill: 50, enteredBy: 'Frank Ortiz', enteredAt: now - 3000000 },
    crewLog: [{ id: 'c1', name: 'Luis Ramos', type: 'Laborer', status: 'out', log: [{ action: 'Checked In', time: t0 }, { action: 'Checked Out', time: t0 + 4 * 3600000 }] },
      { id: 'c2', name: 'Dee Kim', type: 'Operator', status: 'in', log: [{ action: 'Checked In', time: t0 }] },
      { id: 'c3', name: 'CAT 320 excavator', type: 'Equipment', status: 'out', log: [{ action: 'Checked In', time: t0 }, { action: 'Checked Out', time: t0 + 3 * 3600000 }] }],
    fieldNotes: [{ station: '0+40.0', label: 'point', text: 'Gas line in conflict at 0+40, waited 45 min for locator', time: t0 + 3600000, photos: [] }],
    intervalRows: [], summary: {} };
  localStorage.setItem('acctA:runArchive', JSON.stringify([run]));
  const day = new Date(); const ds = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
  localStorage.setItem('acctA:fieldTickets', JSON.stringify({ tickets: [{ cid: 'tk1', type: 'concrete', jobNumber: '24-101', use: 'Thrust blocks', fields: { supplier: 'Ready Mix Co', ticketNo: 'RM-5531', date: ds, yd3: '4.5', mix: '3000 psi' }, createdAt: new Date().toISOString(), sync: {} }] }));
};
// tz / clockAt: run the phone in a given zone, starting at a given instant (the clock then runs on)
async function setup(browser, { who = 'foreman', width = 390, height = 900, seed = true, noServer = false, tz = null, clockAt = null } = {}) {
  const c2 = await browser.newContext(Object.assign({ viewport: { width, height }, acceptDownloads: true }, tz ? { timezoneId: tz } : {}));
  if (clockAt) await c2.clock.install({ time: clockAt });
  await c2.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await c2.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await c2.addInitScript(M.mockInit);
  await c2.addInitScript(MOCK);
  await c2.addInitScript(([w, sd, ns, seedSrc]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctA', email: 'frank' + String.fromCharCode(64) + 'example.test' }));
    localStorage.setItem('lastKnownUserId', 'acctA'); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem('__dlyWho', w); if (ns) localStorage.setItem('__dlyNoServer', '1');
    if (sd) (new Function(seedSrc))();
  }, [who, seed, noServer, '(' + SEED.toString() + ')()']);
  const page = await M.open(c2); await M.dismiss(page);
  await page.waitForTimeout(1500);
  return { ctx: c2, page };
}
const modal = (p) => p.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); if (!ov || getComputedStyle(ov).display === 'none') return null; return { title: document.getElementById('pbModalTitle').textContent, msg: document.getElementById('pbModalMessage').textContent, buttons: [...document.querySelectorAll('#pbModalButtons button')].map(b => b.textContent) }; });
const click = (p, label) => p.evaluate((l) => { const ov = document.getElementById('pbModalOverlay'); if (getComputedStyle(ov).display === 'none') return false; const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => x.textContent.trim() === l); if (b) b.click(); return !!b; }, label);
const shown = (p, id) => p.evaluate((i) => { const el = document.getElementById(i); return !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0; }, id);
const text = (p, id) => p.evaluate((i) => { const el = document.getElementById(i); return el ? el.textContent : null; }, id);
const rpcs = (p, name) => p.evaluate((n) => window.__rpcLog.filter(x => x.fn === n), name);
const layout = (p) => p.evaluate(() => ({ hscroll: document.documentElement.scrollWidth > window.innerWidth + 1 }));
// The downloaded PDF's text (pdftotext), or null when no PDF came.
async function pdfText(page, trigger) {
  const fs = require('fs'), cp = require('child_process'), os = require('os'), path = require('path');
  try {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), trigger()]);
    const f = path.join(os.tmpdir(), 'pbd_' + Date.now() + '.pdf'); await dl.saveAs(f);
    const txt = cp.execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' });
    return { name: dl.suggestedFilename(), txt, file: f };
  } catch (e) { return null; }
}
module.exports = { M, check, setup, modal, click, shown, text, rpcs, layout, pdfText };
