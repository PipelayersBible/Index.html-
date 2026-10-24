// Overnight sweep (Oct 23–24) — company side. Setup on batch 20 HOME's pd_lib (hunt6 mock5 Supabase + window.__rpc, a
// fake of pb_prod_* with state in localStorage '__psrv'), plus answers for the other company reads the job page and Home
// make: job create, materials, inspections, daily, company settings, crew list, PMs, inbox, PM runs, site log, no-run save.
// Roles: setup(browser, { who: 'company' | 'manager' | 'foreman' | 'pipelayer', extra })
//   company  = the owner's company account with NO member row (__ownerCo 1 + __manager 1, as t_manual does)
//   manager  = a manager on a crew (pd_lib manager: true, role foreman)
//   foreman  = __role foreman;  pipelayer = __role pipelayer
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js');
const { M } = T;
const check = (l, c, d) => { console.log((c ? 'OK  ' : '*** FAIL ***') + ' - ' + l + (c || d === undefined ? '' : ' :: ' + String(d).slice(0, 500))); if (!c) process.exitCode = 1; };
const EXTRA = () => {
  const orig = window.__rpc, jk = (n) => String(n || '').trim().toLowerCase().slice(0, 60);
  const day = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  const me = () => (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
  const mgr = () => localStorage.getItem('__manager') === '1';
  const owner = () => localStorage.getItem('__ownerCo') === '1';
  const role = () => localStorage.getItem('__role') || 'foreman';
  const srvGet = () => JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}');
  const srvSet = (v) => localStorage.setItem('__psrv', JSON.stringify(v));
  const mats = () => JSON.parse(localStorage.getItem('__mats') || '{}'); // { jobkey: [materials] }
  window.__unmocked = window.__unmocked || [];
  window.__rpc = async (fn, args) => {
    const off = (localStorage.getItem('__rpcMode') || 'ok') === 'offline';
    const log = () => window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
    const done = (data) => off ? { data: null, error: { message: 'TypeError: Failed to fetch' } } : { data, error: null };
    const jn = String((args && args.p_job_number) || '');
    if (fn === 'pb_prod_job_create') {
      log(); if (off) return done();
      if (args.p_expect_uid !== me()) return { data: null, error: { message: 'pb:wrong_account' } };
      if (!mgr()) return { data: null, error: { message: 'pb:not_company_account' } };
      const srv = srvGet(), co = localStorage.getItem('__company') || 'c1', k = jk(args.p_job_number);
      if (!k) return { data: null, error: { message: 'pb:bad_job' } };
      const p = srv.plans[co + '|' + k], e = Object.values(srv.entries || {}).find(x => x.company === co && jk(x.record && x.record.jobNumber) === k);
      if (p || e) return { data: null, error: { message: 'pb:job_exists ' + ((p && p.job_number) || e.record.jobNumber) } };
      srv.plans[co + '|' + k] = { plan: args.p_plan, version: 1, job_number: String(args.p_job_number).trim() }; srvSet(srv);
      const info = JSON.parse(localStorage.getItem('__jinfo') || '{}'); info[k] = { project_name: args.p_project_name || null, address: args.p_address || null, start_date: args.p_start_date || null }; localStorage.setItem('__jinfo', JSON.stringify(info));
      return { data: { ok: true, job_key: k, job_number: String(args.p_job_number).trim(), version: 1, plan: args.p_plan }, error: null };
    }
    // ---- materials (batch 18 M shapes) ----
    if (fn === 'pb_mat_job') { log(); return done({ job_key: jk(jn), job_number: jn, materials: mats()[jk(jn)] || [], pipe_ft: { counted: 0, waiting: 0 }, server_at: new Date().toISOString() }); }
    if (fn === 'pb_mat_company') { log(); const Mm = mats(); return done({ server_at: new Date().toISOString(), jobs: Object.keys(Mm).map(k => ({ job_key: k, job_number: k, unassigned_tickets: 0, stale_ticket_links: 0, materials: Mm[k] })) }); }
    if (fn === 'pb_mat_save') { log(); const Mm = mats(), L = Mm[jk(jn)] = Mm[jk(jn)] || []; const m = Object.assign({ id: 'n' + L.length, version: 1, unit: 'LF', fig: { status: 'ok', used: 0, ordered: 0, waiting: 0 }, orders: [], uses: [] }, args.p_material); L.push(m); localStorage.setItem('__mats', JSON.stringify(Mm)); return done({ ok: true, material: m }); }
    if (fn === 'pb_mat_mute') { log(); const Mm = mats(); let mm = null; Object.values(Mm).forEach(L => L.forEach(x => { if (x.id === args.p_material_id) { x.muted = !!args.p_muted; mm = x; } })); localStorage.setItem('__mats', JSON.stringify(Mm)); return done({ ok: true, material: mm }); }
    if (fn === 'pb_mat_tickets') { log(); return done({ lines: JSON.parse(localStorage.getItem('__tklines') || '[]'), unassigned: 0 }); }
    if (fn === 'pb_mat_job_settings') { log(); return done({ settings: localStorage.getItem('__noTrench') ? null : { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, pipe_od_in: 8.625, version: 1 } }); }
    if (fn === 'pb_mat_job_settings_history') { log(); return done({ history: [] }); }
    if (fn === 'pb_mat_history') { log(); return done({ history: [] }); }
    if (fn === 'pb_mat_spoils' || fn === 'pb_mat_spoils_company') { log(); return done({ jobs: [], spoils: null }); }
    if (fn === 'pb_mat_crew_list') {
      log(); if (off) return done();
      return done({ job_key: jk(jn), company_id: 'c1', server_at: new Date().toISOString(), materials: (mats()[jk(jn)] || []).map(m => ({ id: m.id, name: m.name, category: m.category || 'other', use: m.category === 'pipe' ? 'pipe' : /bedding/.test(m.category || '') ? 'bedding' : null, unit: m.unit })), settings: { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, od_in: 9.05 } });
    }
    // ---- inspections / daily (batch 23 shapes) ----
    if (fn === 'pb_insp_job') { log(); if (localStorage.getItem('__inspFail') === '1') return done(); return done({ ok: true, company_id: 'c1', job_key: jk(jn), can_add: mgr(), is_foreman: role() === 'foreman', items: JSON.parse(localStorage.getItem('__insp') || '[]').filter(i => !i.job_key || i.job_key === jk(jn)) }); }
    if (fn === 'pb_insp_mine') { log(); return done({ ok: true, company_id: 'c1', foreman: role() === 'foreman', items: [] }); }
    if (fn === 'pb_insp_company') { log(); return done({ ok: true, company_id: 'c1', jobs: [] }); }
    if (fn === 'pb_prod_insp_required') { log(); const srv = srvGet(), p = srv.plans['c1|' + jk(jn)]; if (!p) return { data: null, error: { message: 'pb:not_found' } }; const req = {}; for (const k in args.p_required) if (args.p_required[k] != null) req[k] = args.p_required[k]; p.plan = Object.assign({}, p.plan); delete p.plan.inspections; if (Object.keys(req).length) p.plan.inspections = req; p.version++; srvSet(srv); return done({ ok: true, version: p.version, plan: p.plan }); }
    if (fn === 'pb_daily_prod_day') { log(); return done({ ok: true, company_id: 'c1', server_at: new Date().toISOString(), entries: [] }); }
    if (fn === 'pb_daily_list') { log(); return done({ ok: true, reports: JSON.parse(localStorage.getItem('__dailyReports') || '[]') }); }
    if (fn === 'pb_daily_get') { log(); const r = JSON.parse(localStorage.getItem('__dailyReports') || '[]').find(x => x.id === args.p_report_id); return done(r ? Object.assign({ ok: true }, r) : { ok: false, code: 'pb:not_found' }); }
    if (fn === 'pb_daily_weather_get') { log(); return done({ ok: true, company_id: 'c1', can_set_location: mgr(), weather: null, location: null }); }
    if (fn === 'pb_daily_submit') { log(); const L = JSON.parse(localStorage.getItem('__dailyReports') || '[]'); const id = 'rep-' + (L.length + 1); L.push({ id, job_number: args.p_job_number, work_date: args.p_work_date, version: 1, supersedes: null, signed_by: args.p_signed_by || null, received_at: new Date().toISOString(), sha256: args.p_sha256, snapshot: args.p_snapshot || null }); localStorage.setItem('__dailyReports', JSON.stringify(L)); return done({ ok: true, id, version: 1, received_at: new Date().toISOString(), server_sha256: args.p_sha256, sha_matches: true, phone_clock_ahead_s: 0 }); }
    // ---- company settings (feat_cotz) ----
    if (fn === 'pb_company_settings_get') { log(); const S = JSON.parse(localStorage.getItem('__cosettings') || '{"tz":"America/Chicago","digest_time":"06:00","owner_copies":true,"tz_set":true}'); return done(Object.assign({ ok: true, company_id: 'c1', company_name: 'DIG Civil Construction', is_owner: owner() || mgr(), server_at: new Date().toISOString() }, S)); }
    if (fn === 'pb_pm_settings_set') { log(); const S = JSON.parse(localStorage.getItem('__cosettings') || '{"tz":"America/Chicago","digest_time":"06:00","owner_copies":true,"tz_set":true}'); if (args.p_tz) { S.tz = args.p_tz; S.tz_set = true; } if (args.p_digest_time) S.digest_time = args.p_digest_time; if (args.p_owner_copies === true || args.p_owner_copies === false) S.owner_copies = args.p_owner_copies; localStorage.setItem('__cosettings', JSON.stringify(S)); return done(Object.assign({ ok: true }, S)); }
    // ---- crew members (batch 13 / hunt39 shapes) ----
    if (fn === 'pb_crew_list') {
      log(); if (!mgr()) return { data: null, error: { message: 'pb:not_company_account' } };
      const d = (n) => new Date(Date.now() - n * 86400000).toISOString();
      const rows = [
        owner() ? { user_id: me(), email: 'a@x.com', name: 'DIG Civil Construction', role: null, member: false, owner: true, manager: false, status: 'active', joined_at: null, last_sign_in_at: d(0) }
          : { user_id: '00000000-0000-4000-8000-0000000000aa', email: 'office@digcivil.test', name: 'DIG Civil Construction', role: null, member: false, owner: true, manager: false, status: 'active', joined_at: null, last_sign_in_at: d(0) },
        { user_id: 'acctF', email: 'frank.ortiz@digcivil.test', name: 'Frank Ortiz', role: 'foreman', member: true, owner: false, manager: false, status: 'active', joined_at: d(120), last_sign_in_at: d(1) },
        { user_id: 'acctF2', email: 'fiona@digcivil.test', name: 'Fiona Foreman', role: 'foreman', member: true, owner: false, manager: true, status: 'active', joined_at: d(90), last_sign_in_at: d(2) },
        { user_id: 'acctP', email: 'wes.hall@digcivil.test', name: 'Wes Hall', role: 'pipelayer', member: true, owner: false, manager: false, status: 'active', joined_at: d(30), last_sign_in_at: d(0) },
        { user_id: 'acctP2', email: 'walt.ruiz@digcivil.test', name: null, role: 'pipelayer', member: true, owner: false, manager: false, status: 'invited', joined_at: d(3), last_sign_in_at: null },
        { user_id: 'pm1', email: 'rachel@digcivil.test', name: 'Rachel Nguyen', role: 'pm', member: true, owner: false, manager: true, status: 'active', joined_at: d(40), last_sign_in_at: d(1) }
      ];
      if (!owner()) rows.push({ user_id: me(), email: 'a@x.com', name: 'Tommy Fontaine', role: role(), member: true, owner: false, manager: true, status: 'active', joined_at: d(300), last_sign_in_at: d(0) });
      return done({ company_id: 'c1', company_name: 'DIG Civil Construction', me: me(), is_owner: owner(), owner_user_id: owner() ? me() : 'x', invites_today: 2, invite_limit: 30, seats: rows.filter(r => r.member).length, seats_included: 5, can_manage_pms: owner(), server_at: new Date().toISOString(), members: rows.map(r => Object.assign({}, r, { me: r.user_id === me() })), invitations: [] });
    }
    if (fn === 'pb_job_pms_get') { log(); const P = JSON.parse(localStorage.getItem('__jobPmsList') || '{}'); return done({ ok: true, is_owner: owner(), assigned: P[jk(jn)] || [], candidates: [{ user_id: 'pm1', name: 'Rachel Nguyen', email: 'rachel@digcivil.test' }, { user_id: 'pm2', name: 'Marcus Webb', email: 'marcus@digcivil.test' }] }); }
    if (fn === 'pb_job_pms_set') { log(); const P = JSON.parse(localStorage.getItem('__jobPmsList') || '{}'); P[jk(jn)] = (args.p_user_ids || []).map(u => ({ user_id: u, name: u === 'pm1' ? 'Rachel Nguyen' : 'Marcus Webb', email: u + '@digcivil.test' })); localStorage.setItem('__jobPmsList', JSON.stringify(P)); const pm = JSON.parse(localStorage.getItem('__jobPms') || '{}'); pm[jk(jn)] = P[jk(jn)].length; localStorage.setItem('__jobPms', JSON.stringify(pm)); return done({ ok: true, assigned: P[jk(jn)] }); }
    if (fn === 'pb_report_inbox') { log(); return done({ company_name: 'DIG Civil Construction', reports: JSON.parse(localStorage.getItem('__inbox') || '[]') }); }
    if (fn === 'pb_prod_company_runs') { log(); if (!mgr()) return { data: null, error: { message: 'pb:not_company_account' } }; return done({ runs: JSON.parse(localStorage.getItem('__corruns') || '[]'), server_at: new Date().toISOString() }); }
    if (fn === 'pb_prod_company_run_get') { log(); const x = JSON.parse(localStorage.getItem('__corruns') || '[]').find(y => y.id === args.p_id); return x ? done({ id: x.id, record: x.record || null, version: x.version, who: x.who, photo_count: 0, prod: x.prod || null }) : { data: null, error: { message: 'pb:not_found' } }; }
    if (fn === 'pb_prod_crew_reports') { log(); return done({ reports: [], server_at: new Date().toISOString() }); }
    if (fn === 'pb_prod_job_site_log') { log(); return done({ ok: true, entries: [], server_at: new Date().toISOString() }); }
    if (fn === 'pb_prod_crew_covered') { log(); return done({ ok: true, covered: [] }); }
    if (fn === 'pb_prod_company_jobs') { log(); if (off) return done(); const srv = srvGet(); return done({ server_at: new Date().toISOString(), company_id: 'c1', jobs: Object.keys(srv.plans).filter(k => k.startsWith('c1|')).map(k => ({ job_key: k.split('|')[1], job_number: srv.plans[k].job_number, jobsite: null, plan: srv.plans[k].plan, last_at: null })) }); }
    if (fn === 'pb_prod_company_norun_save') {
      log(); if (off) return done();
      if (!owner()) return { data: null, error: { message: 'pb:not_company_account' } };
      const srv = srvGet(), k = me() + '|' + args.p_client_entry_id, row = srv.entries[k];
      if (row && row.voided) return { data: null, error: { message: 'pb:voided' } };
      const items = args.p_items.map(x => ({ key: x.key, qty: x.qty == null ? null : Number(x.qty), unit: x.unit || null }));
      const r = row || (srv.entries[k] = { id: '00000000-0000-0000-0000-' + String(900 + Object.keys(srv.entries).length).padStart(12, '0'), user: me(), email: 'office@x.com', company: 'c1', versions: [], crew: null });
      if (JSON.stringify([r.record, r.items]) !== JSON.stringify([args.p_record, items]) || !r.versions.length) r.versions.push(1);
      r.record = args.p_record; r.items = items; r.updated_at = new Date().toISOString(); r.kind = 'run'; srvSet(srv);
      return done({ ok: true, id: r.id, version: r.versions.length, role: 'manager', counted: true, server_at: new Date().toISOString() });
    }
    if (fn === 'pb_push_status' || fn === 'pb_push_prefs_get') { log(); return done({ ok: true, subscribed: false, prefs: { crew_production: true } }); }
    if (fn === 'pb_my_name_get') { log(); return done({ ok: true, name: localStorage.getItem('__myName') || null }); }
    if (fn === 'pb_brand_logo_get') { log(); return done({ ok: true, logo: null }); }
    if (fn === 'pb_ticket_company_totals') { log(); return done({ tickets: 0, concrete_yd3: 0, sub_hours: [] }); }
    if (fn === 'pb_ticket_company_page2' || fn === 'pb_ticket_cost_codes') { log(); return done({ tickets: [], codes: [], lines: [] }); }
    const r = await orig(fn, args);
    if (r && r.error && /not mocked|unknown/.test(String(r.error.message))) window.__unmocked.push(fn);
    if (fn === 'pb_prod_company_dashboard' && r && r.data && Array.isArray(r.data.jobs)) { const info = JSON.parse(localStorage.getItem('__jinfo') || '{}'); r.data.jobs.forEach(j => Object.assign(j, info[j.job_key] || { project_name: null, address: null, start_date: null })); }
    return r;
  };
};
// A consistent server: job 24-101 with a plan (planned amounts, budget hours, cost code, alerts, equipment), entries from
// a foreman and a pipelayer, a held pipelayer run (waiting), a pending edit, and job 24-202 with no plan.
function seed() {
  const day = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const E = (user, cid, job, site, off, by, items, extra) => [user + '|' + cid, Object.assign({ id: cid, user, email: user + '@crew.test', company: 'c1', versions: [1], updated_at: new Date(Date.now() - off * 86400000 - 3600000).toISOString(), record: { jobNumber: job, jobsite: site, workDate: day(-off), enteredBy: by }, items }, extra || {})];
  const entries = Object.fromEntries([
    E('acctF', 'r1', '24-101', 'Elm St water main', 0, 'Frank Ortiz', [{ key: 'excavation', qty: 120, unit: 'LF' }, { key: 'pipe', qty: 100, unit: 'LF' }, { key: '_manhours', qty: 32, unit: 'h' }, { key: '_eq_excavator', qty: 6, unit: 'h' }, { key: '_ei_excavator', qty: 1.5, unit: 'h' }, { key: '_ed_excavator', qty: 0.5, unit: 'h' }]),
    E('acctF', 'r2', '24-101', 'Elm St water main', 2, 'Frank Ortiz', [{ key: 'excavation', qty: 300, unit: 'LF' }, { key: 'pipe', qty: 260, unit: 'LF' }, { key: 'backfill', qty: 240, unit: 'LF' }, { key: 'demo', qty: 40, unit: 'LF' }, { key: 'structures', qty: 2, unit: 'EA' }, { key: '_manhours', qty: 40, unit: 'h' }, { key: '_eq_excavator', qty: 8, unit: 'h' }, { key: '_eq_loader', qty: 4, unit: 'h' }]),
    E('acctF2', 'r3', '24-101', 'Elm St water main', 5, 'Fiona Foreman', [{ key: 'pipe', qty: 40, unit: 'LF' }, { key: 'restoration', qty: 10, unit: 'SY' }]),
    // a pipelayer's held run: waiting for a foreman (created 2 h ago)
    E('acctP', 'p1', '24-101', 'Elm St water main', 0, 'Wes Hall', [{ key: 'pipe', qty: 60, unit: 'LF' }], { crew: { state: 'pending', created: Date.now() - 2 * 3600000, assigned: null } }),
    // a pipelayer's run that counted (sent), with an edit waiting for approval
    E('acctP2', 'p2', '24-101', 'Elm St water main', 1, 'Walt Ruiz', [{ key: 'pipe', qty: 80, unit: 'LF' }], { crew: { state: 'sent', created: Date.now() - 30 * 3600000, assigned: null, by: 'acctP2' }, pendingEdit: { id: 7, record: { jobNumber: '24-101', jobsite: 'Elm St water main', workDate: day(-1), enteredBy: 'Walt Ruiz' }, items: [{ key: 'pipe', qty: 95, unit: 'LF' }], saved_at: new Date(Date.now() - 3600000).toISOString(), by: 'acctP2' } }),
    E('acctF', 'r4', '24-202', 'Oak Ave sewer', 1, 'Frank Ortiz', [{ key: 'excavation', qty: 80, unit: 'LF' }, { key: 'restoration', qty: 400, unit: 'LF' }])
  ]);
  const plan = { budget_hours: 400, categories: [
    { key: 'demo', name: 'Demo', unit: 'LF', planned: 500 },
    { key: 'excavation', name: 'Excavation', unit: 'LF', planned: 1000, hours: 160, cost_code: '02-100' },
    { key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 1000, hours: 200, cost_code: '02-200', alert_pct: 50, alerts: [{ pct: 100, label: 'Call for pressure test' }] },
    { key: 'backfill', name: 'Backfill', unit: 'LF', planned: 1000, hours: 40 },
    { key: 'restoration', name: 'Restoration', unit: 'SY', planned: 200 },
    { key: 'structures', name: 'Structures', unit: 'EA', planned: 8, muted: true }],
    equipment: [{ key: 'eq_excavator', name: 'Excavator', unit_no: '312', cost_code: '05-100' }, { key: 'eq_loader', name: 'Loader', unit_no: '950' }], inspections: { pressure: 4 } };
  return { entries, plans: { 'c1|24-101': { plan, version: 3, job_number: '24-101' } }, editSeq: 7, links: [{ foreman: 'acctF', pipelayer: 'acctP', by: 'acctF', started: new Date(Date.now() - 20 * 86400000).toISOString() }] };
}
const MATS = { '24-101': [
  { id: 'm1', job_key: '24-101', job_number: '24-101', name: '3/4" crushed rock', unit: 'tons', category: 'bedding_rock', source: 'bedding_calc', expected: 700, alert_pct: 80, archived: false, version: 1, fig: { used: 410, waiting: 22, ordered: 520, estimate: true, status: 'ok' }, orders: [], uses: [] },
  { id: 'm2', job_key: '24-101', job_number: '24-101', name: '8" C900 PVC', unit: 'LF', category: 'pipe', source: 'pipe_footage', expected: 1000, alert_pct: 80, archived: false, version: 1, fig: { used: 480, waiting: 60, ordered: 500, estimate: false, status: 'ok' }, orders: [], uses: [] },
  { id: 'm3', job_key: '24-101', job_number: '24-101', name: '8" gate valves', unit: 'EA', category: 'fittings', source: 'entered', expected: 8, alert_pct: 80, archived: false, version: 1, fig: { used: 2, waiting: 0, ordered: 8, estimate: false, status: 'ok' }, orders: [], uses: [] }] };
async function setup(browser, o) {
  o = o || {};
  const who = o.who || 'company';
  const uid = o.uid || (who === 'foreman' ? 'acctF' : who === 'pipelayer' ? 'acctP' : 'acctA');
  const ex = Object.assign({ __psrv: seed(), __mats: MATS, __foremen: [{ id: 'acctF', name: 'Frank Ortiz' }, { id: 'acctF2', name: 'Fiona Foreman' }], __pipelayers: [{ id: 'acctP', name: 'Wes Hall' }, { id: 'acctP2', name: 'Walt Ruiz' }], __names: { acctF: 'Frank Ortiz', acctF2: 'Fiona Foreman', acctP: 'Wes Hall', acctP2: 'Walt Ruiz', acctA: 'DIG Civil' } },
    who === 'company' ? { __ownerCo: '1', __manager: '1' } : who === 'manager' ? { __manager: '1', __role: 'foreman' } : { __role: who }, o.extra || {});
  const ctx = await browser.newContext({ viewport: { width: o.width || 390, height: o.height || 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(M.mockInit); await ctx.addInitScript(T.RPC); await ctx.addInitScript(EXTRA);
  await ctx.addInitScript(([u, ex2]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: u, email: u + '@x.com' })); localStorage.setItem('lastKnownUserId', u); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem(u + ':cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active', companyName: 'DIG Civil Construction', companyRole: 'Company account' }));
    for (const k in ex2) localStorage.setItem(k, typeof ex2[k] === 'string' ? ex2[k] : JSON.stringify(ex2[k]));
  }, [uid, ex]);
  const page = await M.open(ctx); await M.dismiss(page);
  page._errors = []; page.on('pageerror', e => page._errors.push(String(e && e.message || e)));
  page._console = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') page._console.push(m.type() + ': ' + m.text().slice(0, 200)); });
  await page.waitForTimeout(1500);
  return { ctx, page, uid };
}
const txt = (p, s) => p.evaluate((q) => { const e = document.querySelector(q); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, s);
const text = (p, id) => p.evaluate((i) => { const el = document.getElementById(i); return el ? el.innerText.replace(/\s+/g, ' ').trim() : null; }, id);
const shown = (p, id) => p.evaluate((i) => { const el = document.getElementById(i); if (!el) return false; let x = el; while (x) { if (x.hidden || getComputedStyle(x).display === 'none') return false; x = x.parentElement; } return el.getBoundingClientRect().height > 0; }, id);
const scr = (p) => p.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id);
const rpcs = (p, name) => p.evaluate((n) => window.__rpcLog.filter(x => x.fn === n), name);
const unmocked = (p) => p.evaluate(() => [...new Set(window.__unmocked || [])]);
const waitFor = T.waitFor;
// visible text of the active screen, one line per block
const screenText = (p) => p.evaluate(() => { const s = document.querySelector('.pb-screen.active'); return s ? s.innerText : ''; });
// layout problems at the current width: elements wider than the viewport, tap targets under 44 px, clipped buttons
const layout = (p) => p.evaluate(() => {
  const scrn = document.querySelector('.pb-screen.active'); if (!scrn) return null;
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const wide = [...scrn.querySelectorAll('*')].filter(el => vis(el) && el.getBoundingClientRect().right > window.innerWidth + 1).map(el => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().right)).slice(0, 12);
  const small = [...scrn.querySelectorAll('button, a[href], select, input:not([type=hidden]), textarea, summary, [role=button], [role=tab]')].filter(el => vis(el) && el.getBoundingClientRect().height < 40).map(el => (el.id || el.textContent.trim().slice(0, 24) || el.tagName) + ':' + Math.round(el.getBoundingClientRect().height) + 'x' + Math.round(el.getBoundingClientRect().width)).slice(0, 30);
  const clipped = [...scrn.querySelectorAll('button, .pbx-leg-n, .pbx-leg-a, .pbx-row-h, .pbx-row-s, .pbx-job-site, .pbx-tab')].filter(el => vis(el) && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible' && getComputedStyle(el).textOverflow !== 'ellipsis').map(el => (el.id || el.textContent.trim().slice(0, 24)) + ':' + el.scrollWidth + '>' + el.clientWidth).slice(0, 12);
  return { hscroll: document.documentElement.scrollWidth > window.innerWidth + 1, wide, small, clipped };
});
module.exports = { M, T, check, setup, seed, MATS, EXTRA, txt, text, shown, scr, rpcs, unmocked, waitFor, screenText, layout, modal: T.modal, click: T.click };
