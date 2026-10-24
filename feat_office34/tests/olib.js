// Overnight sweep round 2 — the OFFICE screens of a company account. Built on the company sweep's clib.js (pd_lib +
// job create / PMs / settings / crew list / inbox / PM runs / no-run save) and adds the fuller fakes the office screens
// need: batch 18 M's materials mock (orders, uses, voids, tickets, spoils, settings — state '__msrv'), the batch 7 ticket
// server ('__tsrv': save, cost codes, company totals, page 2, photos), batch 23's inspections / daily server ('__dlySrv':
// add, edit, check, daily submit/list/get, weather function), the management inbox ('__inbox': reply, status, photo), the
// company logo ('__logo'), crew-admin edge function (invite / role / remove, '__crSrv').
// Offline = localStorage '__rpcMode' = 'offline' AND ctx.setOffline(true) (navigator.onLine false): every fake then answers
// "TypeError: Failed to fetch", as the live client does with no signal.
const C = require('./clib.js'); // feat_office34: self-contained copy of the office sweep's lib (clib.js beside it)
const { M, T, check } = C;
const fs = require('fs');
const MATSRC = (() => { const s = fs.readFileSync('/home/claude/batch18/M/tests/mat_lib.js', 'utf8'); const a = s.indexOf('const MAT = () => {'), b = s.indexOf('// A context whose 3rd init script'); let src = s.slice(a + 'const MAT = '.length, b).trim().replace(/;$/, '');
  // only COUNTED pipe (as pb_mat.pipe_ft does): not voided, not a held / claimed / covered pipelayer run, not a late-claim copy
  src = src.replace("if (jk(e.record && e.record.jobNumber) === key) (e.items || [])", "if (jk(e.record && e.record.jobNumber) === key && !e.voided && e.late !== 'pending' && e.late !== 'rejected' && !(e.crew && (e.crew.state === 'claimed' || e.crew.state === 'covered' || (e.crew.state === 'pending' && Date.now() - e.crew.created < 86400000)))) (e.items || [])");
  src = src.replace("pipe_ft: { counted: pipeFt(k), waiting: 0 }", "pipe_ft: { counted: pipeFt(k), waiting: (JSON.parse(localStorage.getItem('__matWait') || '{}'))[k] || 0 }");
  if (!/e\.late !== 'pending'/.test(src)) throw new Error('MAT patch failed');
  return '(' + src + ')()'; })();
const OFFICE = () => {
  const orig = window.__rpc, jk = (n) => String(n || '').trim().toLowerCase().slice(0, 60);
  const me = () => (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
  const mgr = () => localStorage.getItem('__manager') === '1';
  const owner = () => localStorage.getItem('__ownerCo') === '1';
  const role = () => localStorage.getItem('__role') || 'foreman';
  const off = () => (localStorage.getItem('__rpcMode') || 'ok') === 'offline' || navigator.onLine === false;
  const fail = () => ({ data: null, error: { message: 'TypeError: Failed to fetch' } });
  const ok = (d) => ({ data: d, error: null });
  const err = (m) => ({ data: null, error: { message: m } });
  const log = (fn, args) => window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
  const g = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const s = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const FA = 'acctF', F2 = 'acctF2', CO = 'c1';
  const names = () => g('__names', {});
  window.__fnLog = window.__fnLog || [];
  window.__rpc = async (fn, args) => {
    // ---- tickets (batch 7 T1 shapes) ----
    if (/^pb_ticket_/.test(fn)) {
      log(fn, args); if (off()) return fail();
      const srv = g('__tsrv', { tickets: {} }), save = () => s('__tsrv', srv);
      if (fn === 'pb_ticket_save') {
        if (args.p_expect_uid !== me()) return err('pb:wrong_account');
        if (owner() && localStorage.getItem('__ownerTickets') !== '1') return err('pb:not_company_member'); // live pb_tickets.my_company(): company_members only; the owner has no row
        const k = me() + '|' + args.p_client_ticket_id;
        const row = srv.tickets[k] || (srv.tickets[k] = { id: 'row-' + Object.keys(srv.tickets).length, created_at: new Date().toISOString(), owner: me(), photo: null, saves: 0, company: CO });
        row.record = args.p_record; row.saves++; row.versions = (row.versions || []).concat([args.p_record]); row.updated_at = new Date().toISOString();
        if (args.p_photo_b64 && !row.photo) row.photo = args.p_photo_b64;
        save();
        const f = args.p_record.fields || {}, no = String(f.ticketNo || '').toLowerCase(), sup = String((args.p_record.type === 'sub' ? f.company : f.supplier) || '').toLowerCase();
        const dups = no ? Object.keys(srv.tickets).filter(x => x !== k).map(x => srv.tickets[x]).filter(r => String((r.record.fields || {}).ticketNo || '').toLowerCase() === no && String((r.record.type === 'sub' ? r.record.fields.company : r.record.fields.supplier) || '').toLowerCase() === sup).map(r => ({ ticket_no: r.record.fields.ticketNo, supplier: r.record.fields.supplier || r.record.fields.company, created_at: r.created_at, mine: r.owner === me() })) : [];
        return ok({ ok: true, id: row.id, version: row.versions.length, duplicates: dups });
      }
      if (fn === 'pb_ticket_my_photo') { const row = srv.tickets[me() + '|' + args.p_client_ticket_id]; return row && row.photo ? ok(row.photo) : err('pb:not_found'); }
      if (fn === 'pb_ticket_cost_codes') { const cc = g('__cc', {}); return ok(cc[jk(args.p_job_number)] || []); }
      if (!mgr()) return err('pb:not_company_account');
      const rows = Object.values(srv.tickets).filter(r => r.company === CO).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const rec = (r) => r.record || {};
      if (fn === 'pb_ticket_company_totals') {
        const j = args.p_job_number ? String(args.p_job_number) : null, R = rows.filter(r => !j || rec(r).jobNumber === j);
        const by = (f) => { const m = new Map(); R.forEach(r => { const k = f(r); if (k == null) return; const x = m.get(k.key) || Object.assign({ n: 0 }, k.init); x.n++; k.add(x); m.set(k.key, x); }); return [...m.values()]; };
        const yd3 = (r) => Number((rec(r).fields || {}).yd3) || 0, hrs = (r) => Number((rec(r).fields || {}).hours) || 0;
        const jobsM = new Map(); rows.forEach(r => { const k = rec(r).jobNumber || ''; const x = jobsM.get(k) || { job_number: k, jobsite: rec(r).jobsite || null, tickets: 0 }; x.tickets++; jobsM.set(k, x); });
        return ok({ jobs: [...jobsM.values()], tickets: R.length, concrete_yd3: R.filter(r => rec(r).type === 'concrete').reduce((a, r) => a + yd3(r), 0),
          concrete_by_mix: by(r => rec(r).type === 'concrete' ? { key: (rec(r).fields || {}).mix || '', init: { key: (rec(r).fields || {}).mix || '', yd3: 0 }, add: (x) => { x.yd3 += yd3(r); } } : null),
          concrete_by_use: by(r => rec(r).type === 'concrete' ? { key: rec(r).use || '', init: { key: rec(r).use || '', yd3: 0 }, add: (x) => { x.yd3 += yd3(r); } } : null),
          by_cost_code: by(r => rec(r).costCode ? { key: rec(r).costCode, init: { key: rec(r).costCode, name: rec(r).costCodeName || '', yd3: 0, hours: 0 }, add: (x) => { x.yd3 += yd3(r); x.hours += hrs(r); } } : null),
          material_by_item: (() => { const m = new Map(); R.filter(r => rec(r).type === 'material').forEach(r => ((rec(r).fields || {}).items || []).forEach(it => { const k = String(it.item || '').toLowerCase() + '|' + String(it.unit || '').toLowerCase(); const x = m.get(k) || { item: it.item, unit: it.unit, qty: 0, n: 0 }; x.qty += Number(it.qty) || 0; x.n++; m.set(k, x); })); return [...m.values()]; })(),
          sub_hours: by(r => rec(r).type === 'sub' ? { key: (rec(r).fields || {}).company || '', init: { key: (rec(r).fields || {}).company || '', hours: 0 }, add: (x) => { x.hours += hrs(r); } } : null) });
      }
      if (fn === 'pb_ticket_company_page2') {
        const R = rows.filter(r => !args.p_job_number || rec(r).jobNumber === args.p_job_number).filter(r => !args.p_before_id || r.created_at < args.p_before_created).slice(0, args.p_limit || 50);
        return ok(R.map(r => Object.assign({ row_id: r.id, user_id: r.owner, created_at: r.created_at, has_photo: !!r.photo, version: (r.versions || []).length, updated_at: r.updated_at || r.created_at, record: localStorage.getItem('__noByName') === '1' ? r.record : Object.assign({}, r.record, { _by_name: names()[r.owner] || null }) }))); // feat_office34 O4: _by_name inside record, as the live sql/34 sends it
      }
      if (fn === 'pb_ticket_photo') { const r = rows.find(x => x.id === args.p_ticket_id); return r && r.photo ? ok(r.photo) : err('pb:not_found'); }
      return err('unknown');
    }
    // ---- inspections / daily (batch 23 DAILY shapes; the owner adds, the assigned foreman checks and signs) ----
    if (/^pb_(insp|daily)_/.test(fn)) {
      log(fn, args); if (off()) return fail();
      const S = g('__dlySrv', { items: [], reports: [], weather: {}, location: null, n: 0 }), put = () => s('__dlySrv', S);
      const isOwner = mgr(), isForeman = !owner() && role() === 'foreman', uid = me();
      const mine = (i) => Object.assign({ company_id: CO }, i, { mine: i.foreman_uid === uid });
      const rows = (k) => S.items.filter(i => !k || i.job_key === jk(k));
      if (fn === 'pb_insp_mine') return ok({ ok: true, company_id: CO, foreman: isForeman, items: isForeman ? S.items.filter(i => i.foreman_uid === uid && i.status !== 'canceled').map(mine) : [] });
      if (fn === 'pb_insp_job') { if (role() === 'pipelayer' && !owner()) return err('pb:not_company_member'); return ok({ ok: true, company_id: CO, can_add: isOwner, is_foreman: isForeman, items: rows(args.p_job_number).map(mine) }); }
      if (fn === 'pb_insp_company') { if (!isOwner) return err('pb:not_company_account'); const jobs = {}; S.items.forEach(i => { const j = jobs[i.job_key] || (jobs[i.job_key] = { job_key: i.job_key, job_number: i.job_number, open: 0, done: 0, failed_open: 0, reports: S.reports.filter(r => jk(r.job_number) === i.job_key).length, last_report: null }); if (i.status === 'open') { j.open++; if (i.last_result && i.last_result !== 'pass') j.failed_open++; } if (i.status === 'done') j.done++; }); S.reports.forEach(r => { const k = jk(r.job_number); const j = jobs[k] || (jobs[k] = { job_key: k, job_number: r.job_number, open: 0, done: 0, failed_open: 0, reports: 0, last_report: null }); j.reports = S.reports.filter(x => jk(x.job_number) === k).length; j.last_report = r.work_date; }); return ok({ ok: true, jobs: Object.values(jobs) }); }
      if (fn === 'pb_insp_add') {
        if (!isOwner) return ok({ ok: false, code: 'pb:not_company_account' });
        if (args.p_kind === 'other' && !args.p_kind_detail) return ok({ ok: false, code: 'pb:need_detail' });
        if (![FA, F2].includes(args.p_foreman)) return ok({ ok: false, code: 'pb:not_foreman' });
        const it = { id: 'it-new' + (++S.n), job_key: jk(args.p_job_number), job_number: args.p_job_number, jobsite: args.p_jobsite, kind: args.p_kind, kind_detail: args.p_kind_detail, sta_from: args.p_sta_from, sta_to: args.p_sta_to, location_text: args.p_location_text, scheduled_date: args.p_scheduled_date, foreman_uid: args.p_foreman, foreman: names()[args.p_foreman] || args.p_foreman, note: args.p_note, status: 'open', last_result: null, version: 1, checks: [], history: [{ version: 1, action: 'added', by: 'DIG Civil Construction', at: new Date().toISOString() }] };
        S.items.push(it); put(); return ok({ ok: true, item: it });
      }
      if (fn === 'pb_insp_edit') {
        if (!isOwner) return ok({ ok: false, code: 'pb:not_found' });
        const it = S.items.find(i => i.id === args.p_item_id); if (!it) return ok({ ok: false, code: 'pb:not_found' });
        if (it.version !== args.p_expect_version) return ok({ ok: false, code: 'pb:changed' });
        if (it.status === 'done' && (args.p_status !== 'done' || args.p_foreman !== it.foreman_uid)) return ok({ ok: false, code: 'pb:item_done' });
        if (!args.p_reason) return ok({ ok: false, code: args.p_status === 'canceled' ? 'pb:need_reason' : 'pb:need_change_reason' });
        Object.assign(it, { kind: args.p_kind, kind_detail: args.p_kind_detail, sta_from: args.p_sta_from, sta_to: args.p_sta_to, location_text: args.p_location_text, note: args.p_note, foreman_uid: args.p_foreman, foreman: names()[args.p_foreman] || args.p_foreman, scheduled_date: args.p_scheduled_date, status: args.p_status, version: it.version + 1 });
        it.history.push({ version: it.version, action: args.p_status === 'canceled' ? 'canceled' : it.checks.length ? 'amended' : 'edited', reason: args.p_reason, by: 'DIG Civil Construction', at: new Date().toISOString() });
        put(); return ok({ ok: true, item: it });
      }
      if (fn === 'pb_insp_check') {
        if (!isForeman) return ok({ ok: false, code: 'pb:not_foreman' });
        const it = S.items.find(i => i.id === args.p_item_id); if (!it) return ok({ ok: false, code: 'pb:not_found' });
        const again = it.checks.find(c => c.cid === args.p_client_check_id); if (again) return ok({ ok: true, again: true, check_id: again.id, item: mine(it) });
        if (it.foreman_uid !== uid) return ok({ ok: false, code: 'pb:not_assigned' });
        if (it.status !== 'open') return ok({ ok: false, code: 'pb:item_done' });
        const c = { id: 'ck-' + (++S.n), cid: args.p_client_check_id, result: args.p_result, closes: args.p_result === 'pass' || !!args.p_close, inspector_name: args.p_inspector, inspector_agency: args.p_agency, done_at: args.p_done_at, done_tz: args.p_done_tz, notes: args.p_notes, photo_count: (args.p_photos || []).length, photo_sha256: (args.p_photos || []).map(p => p.sha256), by: names()[uid] || uid, received_at: new Date().toISOString() };
        it.checks.push(c); it.status = c.closes ? 'done' : 'open'; it.last_result = c.result; it.version++; put();
        return ok({ ok: true, check_id: c.id, received_at: c.received_at, item: mine(it) });
      }
      if (fn === 'pb_insp_photo') return ok({ ok: true, b64: '/9j/4AAQSkZJRgABAQ', sha256: 'ab'.repeat(32), received_at: new Date().toISOString() });
      if (fn === 'pb_daily_prod_day') { const P = g('__psrv', { entries: {} }); const es = Object.values(P.entries || {}).filter(e => e.company === CO && !e.voided && jk(e.record && e.record.jobNumber) === jk(args.p_job_number) && e.record.workDate === args.p_work_date && e.user !== uid); return ok({ ok: true, company_id: CO, server_at: new Date().toISOString(), entries: es.map(e => ({ entered_by: e.record.enteredBy || names()[e.user] || e.user, role: e.crew ? 'pipelayer' : 'foreman', kind: e.kind || 'run', jobsite: e.record.jobsite, updated_at: e.updated_at, items: (e.items || []).filter(i => i.qty != null) })) }); }
      if (fn === 'pb_daily_submit') {
        if (!isForeman) return ok({ ok: false, code: 'pb:not_foreman' });
        const again = S.reports.find(r => r.cid === args.p_client_report_id); if (again) return ok({ ok: true, again: true, id: again.id, version: again.version });
        const same = S.reports.filter(r => jk(r.job_number) === jk(args.p_job_number) && r.work_date === args.p_work_date).sort((a, b) => b.version - a.version);
        if (same.length && !args.p_supersedes) return ok({ ok: false, code: 'pb:report_exists', id: same[0].id });
        if (same.length && args.p_supersedes !== same[0].id) return ok({ ok: false, code: 'pb:not_latest' });
        if (args.p_supersedes && !args.p_amend_reason) return ok({ ok: false, code: 'pb:amend_reason' });
        const r = { id: 'rep-' + (++S.n), cid: args.p_client_report_id, client_report_id: args.p_client_report_id, job_number: args.p_job_number, jobsite: args.p_jobsite, work_date: args.p_work_date, version: same.length + 1, supersedes: args.p_supersedes || null, amend_reason: args.p_amend_reason, snapshot: args.p_snapshot, snapshot_sha256: args.p_sha256, server_sha256: args.p_sha256, signed_name: args.p_signed_name, signed_at: args.p_signed_at, signed_tz: args.p_signed_tz, signature_png_b64: args.p_signature_b64, received_at: new Date().toISOString(), foreman: names()[uid] || uid, foreman_uid: uid };
        S.reports.push(r); put(); return ok({ ok: true, id: r.id, version: r.version, received_at: r.received_at, server_sha256: r.server_sha256, sha_matches: true, phone_clock_ahead_s: null });
      }
      if (fn === 'pb_daily_list') return ok({ ok: true, reports: S.reports.filter(r => jk(r.job_number) === jk(args.p_job_number)).map(r => ({ id: r.id, job_number: r.job_number, work_date: r.work_date, version: r.version, supersedes: r.supersedes, amend_reason: r.amend_reason, foreman: r.foreman, mine: r.foreman_uid === uid, signed_name: r.signed_name, signed_at: r.signed_at, signed_tz: r.signed_tz, received_at: r.received_at, snapshot_sha256: r.snapshot_sha256, sha_matches: true, has_signature: !!r.signature_png_b64, latest: !S.reports.some(x => x.supersedes === r.id), email_sent_at: r.email_sent_at || null })) });
      if (fn === 'pb_daily_get') { const r = S.reports.find(x => x.id === args.p_report_id); return ok(r ? Object.assign({ ok: true }, r) : { ok: false, code: 'pb:not_found' }); }
      if (fn === 'pb_daily_weather_get') { const w = S.weather[args.p_job_number + '|' + args.p_work_date]; return ok({ ok: true, company_id: CO, can_set_location: isOwner, weather: w || null, location: S.location }); }
      return err('not mocked');
    }
    // ---- management inbox (batch 4 R3 shapes) ----
    if (fn === 'pb_report_inbox' || fn === 'pb_report_reply' || fn === 'pb_report_set_status' || fn === 'pb_report_photo') {
      log(fn, args); if (off()) return fail(); if (!mgr()) return err('pb:not_manager');
      const R = g('__inbox', []), put = () => s('__inbox', R);
      if (fn === 'pb_report_inbox') return ok({ company_id: CO, company_name: 'DIG Civil Construction', flood_dropped_7d: 0, reports: R });
      const r = R.find(x => x.id === args.p_report_id); if (!r) return err('pb:not_found');
      if (fn === 'pb_report_reply') { (r.messages = r.messages || []).push({ from_management: true, body: args.p_body, at: new Date().toISOString(), time_is_hour: false }); if (r.status === 'new') r.status = 'read'; put(); return ok({ ok: true }); }
      if (fn === 'pb_report_set_status') { r.status = args.p_status; put(); return ok({ ok: true }); }
      if (fn === 'pb_report_photo') return ok('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP8z4AATAxEcQAAAD4BAx0v6YMAAAAASUVORK5CYII=');
    }
    // ---- PM run reports: the office's production on a run (feat_pmedit / feat_equip shapes); the entry counts on the job ----
    if (fn === 'pb_prod_company_run_get' || fn === 'pb_prod_company_run_prod_save' || fn === 'pb_prod_run_report_review') {
      log(fn, args); if (off()) return fail(); if (!mgr()) return err('pb:not_company_account');
      const L = g('__corruns', []), x = L.find(y => y.id === args.p_id); if (!x) return err('pb:not_found');
      const put = () => s('__corruns', L);
      if (fn === 'pb_prod_company_run_get') { const P = g('__psrv', { plans: {} }), pl = P.plans['c1|' + jk(x.job_number)]; return ok(Object.assign({}, x, { record: x.record, can_edit: !x.removed_at, prod: x.prod || null, plan: pl ? pl.plan.categories : [], equipment: pl && pl.plan.equipment ? pl.plan.equipment : [] })); }
      if (fn === 'pb_prod_run_report_review') { x.reviewed_at = new Date().toISOString(); x.reviewed_by_name = 'DIG Civil'; put(); return ok({ ok: true, reviewed_at: x.reviewed_at }); }
      const v = x.prod ? x.prod.version : 0; if (args.p_expect_version != null && args.p_expect_version !== v) return err('pb:changed');
      x.prod = x.prod ? Object.assign(x.prod, { version: v + 1, items: args.p_items }) : { entry_id: 'rr-e-' + x.id, version: 1, role: 'manager', mine: true, by_name: 'DIG Civil', items: args.p_items };
      put();
      const P = g('__psrv', { entries: {}, plans: {} }), k = me() + '|rr:' + x.id;
      P.entries[k] = Object.assign(P.entries[k] || { id: 'rr-e-' + x.id, user: me(), email: 'office@x.com', company: 'c1', versions: [], crew: null, kind: 'run' }, { record: { jobNumber: x.job_number, jobsite: x.record && x.record.jobsite, workDate: String(x.locked_at).slice(0, 10), enteredBy: 'DIG Civil', runRef: x.entry_id }, items: args.p_items.map(i => ({ key: i.key, qty: Number(i.qty), unit: i.unit || null })), updated_at: new Date().toISOString() });
      P.entries[k].versions.push(1); s('__psrv', P);
      return ok({ ok: true, id: x.prod.entry_id, version: x.prod.version, new: v === 0 });
    }
    // ---- feat_office34 O9: pb_prod_job_info_set (sql/35_job_info_set.sql) ----
    if (fn === 'pb_prod_job_info_set') {
      log(fn, args); if (off()) return fail();
      if (args.p_expect_uid !== me()) return err('pb:wrong_account');
      if (!mgr()) return err('pb:not_company_account');
      const k = jk(args.p_job_number); if (!k) return err('pb:bad_job');
      if (args.p_start_date && !/^\d{4}-\d{2}-\d{2}$/.test(args.p_start_date)) return err('pb:bad_date');
      const P = g('__psrv', { plans: {} }); if (!P.plans['c1|' + k]) return err('pb:not_found');
      const info = g('__jinfo', {}); info[k] = { project_name: args.p_project_name || null, address: args.p_address || null, start_date: args.p_start_date || null }; s('__jinfo', info);
      return ok(Object.assign({ ok: true, job_key: k, job_number: P.plans['c1|' + k].job_number }, info[k]));
    }
    // ---- logo, names ----
    if (fn === 'pb_brand_logo_get') { log(fn, args); if (off()) return fail(); const L = g('__logo', null); if (!L) return ok({ ok: true, company_id: CO, png_b64: null, version: 0 }); if (args.p_have_sha256 && args.p_have_sha256 === L.sha256) return ok({ ok: true, company_id: CO, same: true, sha256: L.sha256, version: L.version }); return ok(Object.assign({ ok: true, company_id: CO }, L)); }
    if (fn === 'pb_brand_logo_set') { log(fn, args); if (off()) return fail(); if (!mgr()) return err('pb:not_company_account'); const old = g('__logo', null), v = (old ? old.version : 0) + 1; if (args.png_b64) { const sha = Array.from({ length: 64 }, (_, i) => 'abcdef0123456789'[(i * 7 + v) % 16]).join(''); s('__logo', { png_b64: args.png_b64, width: args.width, height: args.height, sha256: sha, version: v, updated_at: new Date().toISOString() }); return ok({ ok: true, company_id: CO, version: v, sha256: sha, updated_at: new Date().toISOString() }); } localStorage.removeItem('__logo'); return ok({ ok: true, company_id: CO, version: v, updated_at: new Date().toISOString() }); }
    if (fn === 'pb_my_name_set') { log(fn, args); if (off()) return fail(); localStorage.setItem('__myName', args.p_name || ''); return ok({ ok: true, name: args.p_name || null }); }
    if (fn === 'pb_crew_set_name') { log(fn, args); if (off()) return fail(); return ok({ ok: true }); }
    if (fn === 'pb_member_label') { log(fn, args); if (off()) return fail(); return ok({ ok: true }); }
    if (fn === 'pb_prod_member_jobs') { log(fn, args); if (off()) return fail(); const P = g('__psrv', { plans: {} }); return ok({ server_at: new Date().toISOString(), jobs: Object.keys(P.plans).filter(k => k.startsWith('c1|')).map(k => ({ job_key: k.split('|')[1], job_number: P.plans[k].job_number, project_name: P.plans[k].job_number === '24-101' ? 'Elm St water main' : null })).concat([{ job_key: '24-202', job_number: '24-202', project_name: 'Oak Ave sewer' }]) }); }
    if (fn === 'pb_crew_my_invitations') { log(fn, args); if (off()) return fail(); return ok({ server_at: new Date().toISOString(), invitations: [] }); }
    if (fn === 'pb_mat_mute') { log(fn, args); if (off()) return fail(); const S = g('__msrv', { mats: [] }); const m = S.mats.find(x => x.id === args.p_material_id); if (!m) return err('pb:not_found'); m.muted = !!args.p_muted; m.version++; s('__msrv', S); return ok({ ok: true, material: m }); }
    if (/^pb_mat_/.test(fn) && off()) { log(fn, args); return fail(); }
    if (/^pb_prod_|^pb_job_pms|^pb_company_settings|^pb_pm_settings|^pb_crew_list/.test(fn) && off()) { log(fn, args); return fail(); }
    return orig(fn, args);
  };
  // edge functions: crew-admin (invite / role / remove / resend) and weather, through the same supabase client
  const d = Object.getOwnPropertyDescriptor(window, 'supabase');
  Object.defineProperty(window, 'supabase', { configurable: true, get() { const sb = d.get(); return { createClient: (...a) => { const c = sb.createClient(...a);
    c.functions = { invoke: async (name, opts) => {
      const body = (opts && opts.body) || {}; window.__fnLog.push({ name, body: JSON.parse(JSON.stringify(body)) });
      if (off()) return { data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' } };
      if (name === 'crew-admin') {
        const cr = g('__crSrv', { extra: [], removed: [], roles: {} });
        if (body.action === 'invite') { cr.extra.push({ user_id: 'inv-' + cr.extra.length, email: body.email, name: null, role: body.role || 'pipelayer', member: true, owner: false, manager: false, status: 'invited', joined_at: new Date().toISOString(), last_sign_in_at: null }); s('__crSrv', cr); return ok({ ok: true, status: 'invited', email: body.email, role: body.role }); }
        if (body.action === 'set_role') { cr.roles[body.user_id] = body.role; s('__crSrv', cr); return ok({ ok: true, role: body.role }); }
        if (body.action === 'remove') { cr.removed.push(body.user_id); s('__crSrv', cr); return ok({ ok: true, removed: true }); }
        if (body.action === 'set_manager' || body.action === 'manager') { return ok({ ok: true }); }
        return ok({ ok: true });
      }
      if (name === 'weather') {
        const S = g('__dlySrv', { items: [], reports: [], weather: {}, location: null, n: 0 });
        const newLoc = !!(body.address || typeof body.lat === 'number');
        if (!S.location && !newLoc) return ok({ ok: false, code: mgr() ? 'pb:need_location' : 'pb:need_location_office', message: 'This job has no location yet. Ask the office to set it.' });
        if (body.address) S.location = { source: 'geocoded', address: body.address, set_at: new Date().toISOString() }; else if (typeof body.lat === 'number') S.location = { source: body.source, lat: body.lat, lon: body.lon, set_at: new Date().toISOString() };
        const w = { station: 'KMDW', complete: false, retrieved_at: new Date().toISOString(), data: { station: 'KMDW', station_name: 'Chicago Midway', tz: 'America/Chicago', work_date: body.work_date, obs_count: 9, high_f: 64.4, low_f: 46.4, high_c: 18, low_c: 8, precip_in: 0.3, precip_hours_reported: 4, precip_hours_in_day: 24, wind_max_mph: 14, gust_max_mph: 25, conditions: [{ text: 'Light Rain', n: 3 }], complete: false, location_source: S.location.source, location: S.location } };
        S.weather[body.job_number + '|' + body.work_date] = w; s('__dlySrv', S);
        return ok({ ok: true, cached: false, weather: w, location: { source: S.location.source, address: S.location.address || null } });
      }
      return { data: null, error: { message: 'not mocked' } };
    } };
    return c; } }; }, set(v) {} });
};
// crew-admin changes show in pb_crew_list: wrap clib's answer
const CREW = () => {
  const orig = window.__rpc;
  window.__rpc = async (fn, args) => {
    const r = await orig(fn, args);
    if (fn === 'pb_crew_list' && r && r.data && r.data.members) { let cr = null; try { cr = JSON.parse(localStorage.getItem('__crSrv') || 'null'); } catch (e) {} if (cr) { r.data.members = r.data.members.filter(m => !cr.removed.includes(m.user_id)).map(m => cr.roles[m.user_id] ? Object.assign({}, m, { role: cr.roles[m.user_id] }) : m).concat(cr.extra); r.data.invites_today = 2 + cr.extra.length; } }
    return r;
  };
};
// ---- seeds ----
const day = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();
// materials for 24-101 in batch 18 M's server shape (480 LF of pipe is counted in clib's seed; MAT sums every 'pipe' item incl. the held 60)
function seedMats() {
  return { mats: [
    { id: 'mp1', job_key: '24-101', job_number: '24-101', name: '8" C900 PVC', category: 'pipe', source: 'pipe_footage', basis: null, unit: 'LF', expected: 1000, alert_pct: 80, trench_width_ft: null, bed_thick_ft: null, density_tpy: null, extra_pct: 0, version: 1, archived: false, orders: [{ id: 'o1', cid: 'c-o1', qty: 500, unit: 'LF', ordered_on: day(-20), ref: 'PO 1182', voided: false }], uses: [] },
    { id: 'mr1', job_key: '24-101', job_number: '24-101', name: '3/4" crushed rock', category: 'bedding_rock', source: 'bedding_calc', basis: 'weight', use_as: 'bedding', unit: 'ton', expected: 700, alert_pct: 80, trench_width_ft: null, bed_thick_ft: null, density_tpy: 1.35, extra_pct: 15, version: 1, archived: false, orders: [{ id: 'o2', cid: 'c-o2', qty: 520, unit: 'ton', ordered_on: day(-15), ref: 'Rock Co', voided: false }], uses: [] },
    { id: 'mf1', job_key: '24-101', job_number: '24-101', name: '8" gate valves', category: 'fittings', source: 'entered', basis: null, unit: 'EA', expected: 8, alert_pct: 80, trench_width_ft: null, bed_thick_ft: null, density_tpy: null, extra_pct: 0, version: 1, archived: false, orders: [{ id: 'o3', cid: 'c-o3', qty: 8, unit: 'EA', ordered_on: day(-10), ref: 'Ferguson', voided: false }], uses: [{ id: 'u1', cid: 'c-u1', qty: 2, unit: 'EA', used_on: day(-2), voided: false }] },
    { id: 'ma1', job_key: '24-101', job_number: '24-101', name: 'Asphalt', category: 'other', kind: 'asphalt', source: 'entered', basis: null, unit: 'ton', expected: 91.5, alert_pct: 80, trench_width_ft: null, bed_thick_ft: null, density_tpy: 1.96, extra_pct: 5, version: 1, archived: false, orders: [], uses: [] }
  ], lines: [
    { job_key: '24-101', ticket_id: 'row-0', line_no: 0, type: 'material', item: '8" C900 PVC', qty: 20, unit: 'sticks', supplier: 'Pipe Co', ticket_no: 'P-9', ticket_date: day(-3), has_photo: false },
    { job_key: '24-101', ticket_id: 'row-1', line_no: 0, type: 'material', item: 'Gaskets', qty: 50, unit: 'EA', supplier: 'Ferguson', ticket_no: 'M-77', ticket_date: day(-1), has_photo: false }
  ], links: [], settings: { '24-101': { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, pipe_od_in: 9.05, version: 1 } } };
}
// tickets sent by the crews (batch 7 record shapes)
function seedTickets() {
  const T0 = Date.now(), t = (h, owner, cid, record, photo) => [owner + '|' + cid, { id: 'row-' + cid, created_at: new Date(T0 - h * 3600000).toISOString(), updated_at: new Date(T0 - h * 3600000).toISOString(), owner, photo: photo || null, saves: 1, company: 'c1', record, versions: [record] }];
  return { tickets: Object.fromEntries([
    t(3, 'acctF', 'tk1', { type: 'concrete', jobNumber: '24-101', jobsite: 'Elm St water main', costCode: '02-310', costCodeName: 'Thrust blocks', use: 'Thrust blocks', notes: 'Pour at MH-7', fields: { supplier: 'Acme Ready Mix', ticketNo: '58012', date: day(0), time: '09:15', truck: '12', mix: '4000-A', psi: '4000', slump: '4', admixtures: 'None', waterAdded: '0', yd3: '9.5' }, ai: { used: false, uncertain: [] } }),
    t(27, 'acctF', 'tk2', { type: 'material', jobNumber: '24-101', jobsite: 'Elm St water main', costCode: '', costCodeName: '', use: '', notes: '', fields: { supplier: 'Ferguson', ticketNo: 'M-77', date: day(-1), items: [{ item: 'Gaskets', qty: '50', unit: 'ea' }, { item: '8" gate valves', qty: '2', unit: 'ea' }] }, ai: { used: false, uncertain: [] } }),
    t(50, 'acctF2', 'tk3', { type: 'sub', jobNumber: '24-202', jobsite: 'Oak Ave sewer', costCode: '03-100', costCodeName: '', use: '', notes: 'Bore under road', fields: { company: 'Ace Boring', ticketNo: 'S-4', date: day(-2), hours: '8.5', crew: '3', equipment: 'Bore rig' }, ai: { used: false, uncertain: [] } }),
    t(75, 'acctP', 'tk4', { type: 'concrete', jobNumber: '24-101', jobsite: 'Elm St water main', costCode: '02-310', costCodeName: 'Thrust blocks', use: 'Encasement', notes: '', fields: { supplier: 'Acme Ready Mix', ticketNo: '57990', date: day(-3), time: '14:00', truck: '7', mix: '3000-CLSM', psi: '3000', slump: '5', admixtures: '', waterAdded: '5', yd3: '12' }, ai: { used: true, uncertain: ['slump'] } })
  ]) };
}
function seedInsp() {
  return { items: [
    { id: 'it-1', job_key: '24-101', job_number: '24-101', jobsite: 'Elm St water main', kind: 'pressure', kind_detail: 'Hydrostatic 150 psi', sta_from: 100, sta_to: 450, location_text: null, scheduled_date: day(0), foreman_uid: 'acctF', foreman: 'Frank Ortiz', note: 'Bring the pump', status: 'open', last_result: null, version: 1, checks: [], history: [{ version: 1, action: 'added', by: 'DIG Civil Construction', at: ago(24) }] },
    { id: 'it-2', job_key: '24-101', job_number: '24-101', jobsite: 'Elm St water main', kind: 'cctv', kind_detail: null, sta_from: null, sta_to: null, location_text: 'MH-7 to MH-10', scheduled_date: null, foreman_uid: 'acctF2', foreman: 'Fiona Foreman', note: null, status: 'open', last_result: null, version: 1, checks: [], history: [] },
    { id: 'it-3', job_key: '24-101', job_number: '24-101', jobsite: 'Elm St water main', kind: 'pressure', kind_detail: '150 psi', sta_from: 0, sta_to: 100, location_text: null, scheduled_date: null, foreman_uid: 'acctF', foreman: 'Frank Ortiz', note: null, status: 'done', last_result: 'pass', version: 2,
      checks: [{ id: 'ck-0', cid: 'c0', result: 'pass', closes: true, inspector_name: 'Ann Lee', inspector_agency: 'City of Elm', done_at: ago(30), done_tz: 'America/Chicago', notes: 'Held 2 h', photo_count: 0, photo_sha256: [], by: 'Frank Ortiz', received_at: ago(30) }], history: [] },
    { id: 'it-4', job_key: '24-101', job_number: '24-101', jobsite: 'Elm St water main', kind: 'compaction', kind_detail: '95% Proctor', sta_from: 200, sta_to: 300, location_text: null, scheduled_date: day(-1), foreman_uid: 'acctF', foreman: 'Frank Ortiz', note: null, status: 'open', last_result: 'fail', version: 2,
      checks: [{ id: 'ck-1', cid: 'c1', result: 'fail', closes: false, inspector_name: 'Bo Diaz', inspector_agency: 'Acme Testing', done_at: ago(20), done_tz: 'America/Chicago', notes: 'Density 91%; re-roll', photo_count: 0, photo_sha256: [], by: 'Frank Ortiz', received_at: ago(20) }], history: [] }
  ], reports: [
    { id: 'rep-1', cid: 'd1', client_report_id: 'd1', job_number: '24-101', jobsite: 'Elm St water main', work_date: day(-2), version: 1, supersedes: null, amend_reason: null, snapshot: { job_number: '24-101', work_date: day(-2), production: [{ key: 'pipe', name: 'Pipe Installed', qty: 260, unit: 'LF' }], crew: [], notes: 'Wet morning.' }, snapshot_sha256: 'ab'.repeat(32), server_sha256: 'ab'.repeat(32), signed_name: 'Frank Ortiz', signed_at: ago(50), signed_tz: 'America/Chicago', signature_png_b64: null, received_at: ago(50), foreman: 'Frank Ortiz', foreman_uid: 'acctF' }
  ], weather: {}, location: null, n: 10 };
}
function seedRuns() {
  const t0 = Date.now() - 5 * 3600000;
  const rec = { id: 7101, kind: 'run', jobNumber: '24-101', jobsite: 'Elm St water main', startLabel: 'MH-7', endLabel: 'MH-8', runStartTime: new Date(t0).toISOString(), runEndTime: new Date(t0 + 3 * 3600000).toISOString(), lockTime: new Date(t0 + 3 * 3600000).toISOString(), distance: 150, completedDistance: 150, durationMin: 180, pipelayer: 'Wes Hall', crew: 'Crew 2', completed: true, foreman: null, crewLog: [], fieldNotes: [], intervalRows: [], summary: {} };
  return [{ id: 'rr-1', entry_id: 'e-7101', job_number: '24-101', label: 'MH-7 to MH-8', locked_at: rec.lockTime, ended: true, distance_ft: 150, photo_count: 0, version: 1, who: 'Wes Hall', role: 'pipelayer', sent_at: new Date(t0 + 3 * 3600000 + 60000).toISOString(), sent_how: 'auto', reviewed_at: null, reviewed_by_name: null, status: 'waiting', record: rec, prod: null }];
}
function seedInbox() {
  return [
    { id: 'rp-1', category: 'Safety', body: 'Trench box on Elm St has a bent strut; we stopped using it.', anonymous: false, sender_name: 'Frank Ortiz', sender_email: 'frank.ortiz@digcivil.test', created_at: ago(5), time_is_hour: false, status: 'new', photo_count: 1, photos_received: 1, messages: [] },
    { id: 'rp-2', category: 'Other', body: 'The water cooler on the Oak Ave job has been empty for two days.', anonymous: true, sender_name: null, sender_email: null, created_at: ago(30), time_is_hour: true, status: 'read', photo_count: 0, photos_received: 0, messages: [{ from_management: true, body: 'Thanks, a cooler goes out tomorrow.', at: ago(28), time_is_hour: false }] }
  ];
}
function seedCostCodes() { return { '24-101': [{ code: '02-100', name: 'Excavation' }, { code: '02-200', name: 'Pipe Installed' }, { code: '02-310', name: 'Thrust blocks' }, { code: '05-100', name: 'Excavator' }] }; }
async function setup(browser, o) {
  o = o || {};
  const who = o.who || 'company';
  const uid = o.uid || (who === 'foreman' ? 'acctF' : who === 'pipelayer' ? 'acctP' : 'acctA');
  const ex = Object.assign({ __psrv: C.seed(), __mats: C.MATS, __msrv: seedMats(), __tsrv: seedTickets(), __dlySrv: seedInsp(), __inbox: seedInbox(), __cc: seedCostCodes(), __matWait: { '24-101': 60 }, __corruns: seedRuns(),
    __foremen: [{ id: 'acctF', name: 'Frank Ortiz' }, { id: 'acctF2', name: 'Fiona Foreman' }], __pipelayers: [{ id: 'acctP', name: 'Wes Hall' }, { id: 'acctP2', name: 'Walt Ruiz' }], __names: { acctF: 'Frank Ortiz', acctF2: 'Fiona Foreman', acctP: 'Wes Hall', acctP2: 'Walt Ruiz', acctA: 'DIG Civil' } },
    who === 'company' ? { __ownerCo: '1', __manager: '1' } : who === 'manager' ? { __manager: '1', __role: 'foreman' } : { __role: who }, o.extra || {});
  const ctx = await browser.newContext(Object.assign({ viewport: { width: o.width || 390, height: o.height || 844 }, isMobile: true, hasTouch: true, acceptDownloads: true }, o.tz ? { timezoneId: o.tz } : {}));
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(M.mockInit); await ctx.addInitScript(T.RPC); await ctx.addInitScript(C.EXTRA); await ctx.addInitScript({ content: MATSRC }); await ctx.addInitScript(OFFICE); await ctx.addInitScript(CREW);
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
// no signal: the fakes answer "Failed to fetch" and navigator.onLine is false
const offline = async (ctx, page) => { await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline')); await ctx.setOffline(true); await page.waitForTimeout(300); };
const online = async (ctx, page) => { await ctx.setOffline(false); await page.evaluate(() => localStorage.setItem('__rpcMode', 'ok')); await page.waitForTimeout(300); };
const dump = async (page, dir, name) => { const t = await C.screenText(page); fs.writeFileSync(dir + 'dump/' + name + '.txt', t); await page.screenshot({ path: dir + 'shots/' + name + '.png', fullPage: true }); return t; };
const home = async (page) => { await page.evaluate(() => pbGotoTab('home')); await C.waitFor(page, () => document.querySelectorAll('#homeCxJobs .pbx-job').length > 0, 10000); await page.waitForTimeout(600); };
module.exports = Object.assign({}, C, { setup, seedMats, seedTickets, seedInsp, seedInbox, seedRuns, seedCostCodes, offline, online, dump, home, OFFICE, CREW, MATSRC });
