// Batch 11 D: shared setup for the production tests. Supabase is the hunt6 mock5 (session from localStorage
// '__mockSess'); sbClient.rpc is answered by window.__rpc below: a fake of the pb_prod_* functions in
// D/sql/01_production.sql (state in localStorage '__psrv'), plus pb_report_access and pb_ticket_company_totals.
// Pattern copied from batch7/T1/tests/tk_lib.js.
//   localStorage: '__rpcMode' ok|offline|boom|signedout, '__manager' '1', '__company' (default c1), '__member' '0' = no company
const M = require('/home/claude/test/hunt6/confined/mock5.js');
const { check } = M;
const RPC = () => {
  const d = Object.getOwnPropertyDescriptor(window, 'supabase');
  Object.defineProperty(window, 'supabase', { configurable: true, get() { const s = d.get(); return { createClient: (...a) => {
    const c = s.createClient(...a);
    c.rpc = (fn, args) => window.__rpc(fn, args);
    const from = c.from;
    c.from = (t) => {
      const tier = localStorage.getItem('__tier');
      if (t !== 'subscriptions' || !tier) return from(t);
      const q = { select() { return q; }, eq() { return q; }, maybeSingle: async () => ({ data: tier === 'none' ? null : { tier, status: 'active' }, error: null }) };
      return q;
    };
    return c; } }; }, set(v) {} });
  window.__rpcLog = [];
  const RealDate = Date; // the "server" keeps real time even when a test moves the phone's clock
  const me = () => (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
  const srvGet = () => JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}');
  const srvSet = (v) => localStorage.setItem('__psrv', JSON.stringify(v));
  const jk = (n) => String(n || '').trim().toLowerCase().slice(0, 60);
  const day = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  window.__pdDay = day;
  const sums = (rows, today) => {
    const m = new Map();
    rows.forEach(e => (e.items || []).forEach(it => { if (it.qty == null) return; const k = it.key + '|' + (it.unit || ''); const r = m.get(k) || { key: it.key, unit: it.unit || '', done: 0, today: 0, week: 0, n: 0 }; r.done += it.qty; if (e.record.workDate === today) r.today += it.qty; const dd = (Date.parse(today) - Date.parse(e.record.workDate)) / 86400000; if (dd >= 0 && dd <= 6) r.week += it.qty; r.n++; m.set(k, r); }));
    return [...m.values()].sort((a, b) => a.key.localeCompare(b.key));
  };
  window.__rpc = async (fn, args) => {
    window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
    const mode = localStorage.getItem('__rpcMode') || 'ok';
    const manager = localStorage.getItem('__manager') === '1';
    const member = localStorage.getItem('__member') !== '0';
    const company = localStorage.getItem('__company') || 'c1';
    const joined = localStorage.getItem('__joinedAt') || '2020-01-01T00:00:00Z';
    if (fn === 'pb_prod_access') { if (localStorage.getItem('__accessDown') === '1' || mode === 'offline') return { data: null, error: { message: 'TypeError: Failed to fetch' } }; return { data: { member, company_id: member ? company : null, company_active: member, joined_at: member ? joined : null, role: 'foreman', manager: manager && member, server_at: new RealDate(RealDate.now()).toISOString() }, error: null }; }
    if (fn === 'pb_report_access') return { data: { member, company_id: member ? company : null, company_active: member, report_key: 'k', manager }, error: null };
    if (!/^pb_prod_|^pb_ticket_company_totals$/.test(fn)) return { data: null, error: { message: 'not mocked' } };
    if (mode === 'offline') return { data: null, error: { message: 'TypeError: Failed to fetch' } };
    if (window.__rpcDelay) await new Promise(r => setTimeout(r, window.__rpcDelay));
    if (mode === 'signedout') return { data: null, error: { message: 'pb:signed_out' } };
    if (mode === 'boom') return { data: null, error: { message: 'boom' } };
    const srv = srvGet();
    if (fn === 'pb_prod_save') {
      if (!('p_access_company' in args) || !('p_access_at' in args) || !('p_items' in args)) return { data: null, error: { message: 'Could not find the function' } };
      if (args.p_expect_uid !== me()) return { data: null, error: { message: 'pb:wrong_account' } };
      if (!member) return { data: null, error: { message: 'pb:not_company_member' } };
      const k = me() + '|' + args.p_client_entry_id, row = srv.entries[k];
      if (row && row.company !== company) return { data: null, error: { message: 'pb:left_company' } };
      if (!row && (!args.p_access_company || !args.p_access_at)) return { data: null, error: { message: 'pb:no_company_stamp' } };
      if (!row && args.p_access_company !== company) return { data: null, error: { message: 'pb:company_changed' } };
      if (!row && RealDate.parse(joined) > RealDate.parse(args.p_access_at)) return { data: null, error: { message: 'pb:joined_after_answer' } };
      if (!row && RealDate.parse(args.p_access_at) > RealDate.now()) return { data: null, error: { message: 'pb:bad_access_at' } };
      if (row && row.voided) return { data: null, error: { message: 'pb:voided' } };
      (window.__filed = window.__filed || []).push([args.p_client_entry_id, company]);
      const items = args.p_items.map(x => ({ key: x.key, qty: x.qty == null ? null : Number(x.qty), unit: x.unit || null }));
      const r = row || (srv.entries[k] = { id: '00000000-0000-0000-0000-' + String(Object.keys(srv.entries).length).padStart(12, '0'), user: me(), email: me() + '@x.com', company, versions: [] });
      if (row) (row.items || []).forEach(it => { if (!items.some(x => x.key === it.key)) items.push({ key: it.key, qty: null, unit: it.unit }); });
      const changed = JSON.stringify([r.record, r.items]) !== JSON.stringify([args.p_record, items]);
      r.record = args.p_record; r.items = items; r.updated_at = new Date().toISOString(); if (changed || !r.versions.length) r.versions.push(1);
      srvSet(srv);
      return { data: { ok: true, id: r.id, version: r.versions.length }, error: null };
    }
    if (fn === 'pb_prod_void_mine') {
      if (args.p_expect_uid !== me()) return { data: null, error: { message: 'pb:wrong_account' } };
      const row = srv.entries[me() + '|' + args.p_client_entry_id];
      if (!row) return { data: { ok: true, id: null, voided: true, none: true }, error: null };
      if (row.company !== company) return { data: null, error: { message: 'pb:left_company' } };
      if (!row.voided) { row.voided = true; row.versions.push('void'); } srvSet(srv);
      return { data: { ok: true, id: row.id, version: row.versions.length, voided: true }, error: null };
    }
    const today = args.p_today || day(0);
    const allCo = Object.values(srv.entries).filter(e => e.company === company), mineCo = allCo.filter(e => !e.voided);
    if (fn === 'pb_prod_foreman_scope') {
      if (!member) return { data: null, error: { message: 'pb:not_company_member' } };
      const keys = [...new Set(mineCo.filter(e => e.user === me() && jk(e.record.jobNumber) && (e.items || []).some(i => i.qty >= 1 && !/^_/.test(i.key))).map(e => jk(e.record.jobNumber)))];
      return { data: { today, jobs: keys.map(key => ({ job_key: key, job_number: (mineCo.find(e => jk(e.record.jobNumber) === key) || {}).record.jobNumber || null, last_at: new Date().toISOString(),
        plan: (srv.plans[company + '|' + key] || {}).plan || null, cats: sums(mineCo.filter(e => jk(e.record.jobNumber) === key), today), mine: sums(mineCo.filter(e => e.user === me() && jk(e.record.jobNumber) === key), today) })) }, error: null };
    }
    if (!manager) return { data: null, error: { message: 'pb:not_company_account' } };
    if (fn === 'pb_ticket_company_totals') return { data: { tickets: 7, concrete_yd3: 42.5, sub_hours: [{ key: 'Ace', hours: 12, n: 2 }] }, error: null };
    const jobKeys = [...new Set(mineCo.map(e => jk(e.record.jobNumber)).concat(Object.keys(srv.plans).filter(k => k.startsWith(company + '|')).map(k => k.split('|')[1])))];
    const jobOf = (key) => { const es = mineCo.filter(e => jk(e.record.jobNumber) === key), p = srv.plans[company + '|' + key];
      return { job_key: key, job_number: p ? p.job_number : (es[0] ? es[0].record.jobNumber || null : null), jobsite: (es.find(e => e.record.jobsite) || { record: {} }).record.jobsite || null,
        last_at: es.length ? es.map(e => e.updated_at).sort().pop() : null, last_work_date: es.length ? es.map(e => e.record.workDate).sort().pop() : null, entries: es.length,
        reporters: new Set(es.map(e => e.user)).size, reporters_today: new Set(es.filter(e => e.record.workDate === today).map(e => e.user)).size,
        plan: p ? p.plan : null, plan_version: p ? p.version : null, cats: sums(es, today), _es: es }; };
    if (fn === 'pb_prod_manual_add') {
      if (args.p_expect_uid !== me()) return { data: null, error: { message: 'pb:wrong_account' } };
      if (!(args.p_qty > 0)) return { data: null, error: { message: 'pb:bad_items' } };
      const k = me() + '|' + args.p_client_entry_id;
      if (!srv.entries[k]) srv.entries[k] = { id: '00000000-0000-0000-0001-' + String(Object.keys(srv.entries).length).padStart(12, '0'), user: me(), email: me() + '@x.com', company, kind: 'manual', versions: [1], updated_at: new Date().toISOString(), record: { jobNumber: args.p_job_number, workDate: args.p_work_date, note: args.p_note, kind: 'manual' }, items: [{ key: args.p_category_key, qty: args.p_qty, unit: args.p_unit || null }] };
      srvSet(srv); return { data: { ok: true, id: srv.entries[k].id, version: 1 }, error: null };
    }
    if (fn === 'pb_prod_void') {
      const row = allCo.find(e => e.id === args.p_entry_id); if (!row) return { data: null, error: { message: 'pb:not_found' } };
      if (!row.voided) { row.voided = true; row.versions.push('void'); row.updated_at = new Date().toISOString(); } srvSet(srv);
      return { data: { ok: true, id: row.id, version: row.versions.length, voided: true }, error: null };
    }
    if (fn === 'pb_prod_company_dashboard' && localStorage.getItem('__bigJobs') === '1') return { data: { today, jobs: Array.from({ length: 600 }, (_, i) => ({ job_key: 'big-' + i, job_number: 'BIG-' + i, jobsite: 'x'.repeat(600), last_at: new Date().toISOString(), entries: 1, reporters: 1, reporters_today: 0, plan: null, cats: [{ key: 'pipe', unit: 'LF', done: i, today: 0, week: 0, n: 1 }] })) }, error: null };
    if (fn === 'pb_prod_company_dashboard') return { data: { today, jobs: jobKeys.map(jobOf).map(j => { delete j._es; return j; }).sort((a, b) => String(b.last_at || '').localeCompare(String(a.last_at || ''))) }, error: null };
    if (fn === 'pb_prod_job_detail') {
      const j = jobOf(jk(args.p_job_number)), es = j._es; delete j._es;
      const days = []; es.forEach(e => (e.items || []).forEach(it => { if (it.qty != null) days.push({ date: e.record.workDate, key: it.key, unit: it.unit || '', qty: it.qty }); }));
      const byU = {}; es.forEach(e => { const r = byU[e.user] || (byU[e.user] = { name: null, email: e.email, entries: 0, last_at: null, today: false }); r.entries++; if (e.record.enteredBy) r.name = e.record.enteredBy; r.last_at = e.updated_at; if (e.record.workDate === today) r.today = true; });
      const all = allCo.filter(e => jk(e.record.jobNumber) === jk(args.p_job_number)).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
      return { data: Object.assign(j, { days, reporters: Object.values(byU), recent: all.map(e => ({ id: e.id, kind: e.kind || 'run', voided: !!e.voided, note: e.record.note || null, work_date: e.record.workDate, entered_by: e.record.enteredBy || null, email: e.email, version: e.versions.length, updated_at: e.updated_at, items: (e.items || []).filter(i => i.qty != null) })) }), error: null };
    }
    if (fn === 'pb_prod_plan_set') {
      if (args.p_expect_uid !== me()) return { data: null, error: { message: 'pb:wrong_account' } };
      const key = company + '|' + jk(args.p_job_number), cur = srv.plans[key];
      if ((cur ? cur.version : 0) !== args.p_expect_version) return { data: null, error: { message: 'pb:plan_changed' } };
      const keys = new Set(); for (const c of args.p_plan.categories) { if (!c.name || keys.has(c.key) || !/^[a-z0-9][a-z0-9_]{0,39}$/.test(c.key)) return { data: null, error: { message: 'pb:bad_plan' } }; keys.add(c.key); }
      const plan = { categories: args.p_plan.categories.map(c => { const o = { key: c.key, name: c.name }; if (c.unit) o.unit = c.unit; if (c.planned != null) o.planned = c.planned; if (c.weight) o.weight = c.weight; if (c.hours != null) o.hours = c.hours; return o; }) };
      if (args.p_plan.budget_hours != null) plan.budget_hours = args.p_plan.budget_hours;
      srv.plans[key] = { plan, version: (cur ? cur.version : 0) + 1, job_number: args.p_job_number }; srvSet(srv);
      return { data: { ok: true, version: srv.plans[key].version, plan }, error: null };
    }
    if (fn === 'pb_prod_plan_get') { const p = srv.plans[company + '|' + jk(args.p_job_number)]; return { data: p ? { plan: p.plan, version: p.version } : { plan: null, version: 0 }, error: null }; }
    return { data: null, error: { message: 'unknown' } };
  };
};
async function setup(browser, { tier = null, manager = false, width = 390, height = 900, xl = false, extra = null } = {}) {
  const c2 = await browser.newContext({ viewport: { width, height } });
  await c2.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await c2.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await c2.addInitScript(M.mockInit);
  await c2.addInitScript(RPC);
  await c2.addInitScript(([t, mg, ex]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctA', email: 'a@x.com' }));
    localStorage.setItem('lastKnownUserId', 'acctA'); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem('acctA:cachedSubscription', JSON.stringify(t ? (t === 'none' ? { tier: 'none', status: 'inactive' } : { tier: t, status: 'active' }) : { tier: 'contractor', status: 'active' }));
    if (t) localStorage.setItem('__tier', t);
    if (mg) localStorage.setItem('__manager', '1');
    if (ex) for (const k in ex) localStorage.setItem(k, typeof ex[k] === 'string' ? ex[k] : JSON.stringify(ex[k]));
  }, [tier, manager, extra]);
  const page = await M.open(c2); await M.dismiss(page);
  await page.waitForTimeout(1200); // account load + access answer
  if (xl) { await page.evaluate(() => window.pbSetTextSize(140)); await page.waitForTimeout(300); }
  return { ctx: c2, page };
}
// server rows from other crews, for the dashboards
function seedServer(opts) {
  const day = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const E = (user, cid, job, site, off, by, items) => [user + '|' + cid, { id: cid, user, email: user + '@crew.test', company: 'c1', versions: [1], updated_at: new Date(Date.now() - off * 86400000 - 3600000).toISOString(), record: { jobNumber: job, jobsite: site, workDate: day(-off), enteredBy: by }, items }];
  const entries = Object.fromEntries([
    E('u1', 'r1', '24-101', 'Elm St water main', 0, 'Frank Ortiz', [{ key: 'excavation', qty: 120, unit: 'LF' }, { key: 'pipe', qty: 100, unit: 'LF' }, { key: '_manhours', qty: 32, unit: 'h' }]),
    E('u2', 'r2', '24-101', 'Elm St water main', 2, 'Wes Hall', [{ key: 'excavation', qty: 300, unit: 'LF' }, { key: 'pipe', qty: 260, unit: 'LF' }, { key: 'backfill', qty: 240, unit: 'LF' }, { key: 'demo', qty: 40, unit: 'LF' }, { key: 'structures', qty: 2, unit: 'EA' }]),
    E('u1', 'r3', '24-202', 'Oak Ave sewer', 1, 'Frank Ortiz', [{ key: 'excavation', qty: 80, unit: 'LF' }, { key: 'restoration', qty: 400, unit: 'LF' }]),
    E('u3', 'r4', '', '', 0, '', [{ key: 'pipe', qty: 20, unit: 'LF' }])
  ].filter(x => !(opts && opts.only) || opts.only.includes(x[1].id)));
  return { entries, plans: (opts && opts.plans) || {} };
}
const modal = (p) => p.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); if (!ov || getComputedStyle(ov).display === 'none') return null; return { title: document.getElementById('pbModalTitle').textContent, msg: document.getElementById('pbModalMessage').textContent, buttons: [...document.querySelectorAll('#pbModalButtons button')].map(b => b.textContent) }; });
const click = (p, re) => p.evaluate((s) => { const ov = document.getElementById('pbModalOverlay'); if (getComputedStyle(ov).display === 'none') return false; const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => new RegExp(s).test(x.textContent)); if (b) b.click(); return !!b; }, re);
const screen = (p) => p.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id);
const saves = (p) => p.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_save'));
const prod = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__debugProd())));
const layout = (p) => p.evaluate(() => {
  const scr = document.querySelector('.pb-screen.active');
  const small = [...scr.querySelectorAll('button, select, input, textarea')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && r.height < 44; }).map(el => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().height));
  const clipped = [...scr.querySelectorAll('button')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && el.scrollWidth > el.clientWidth + 1; }).map(el => (el.id || el.textContent.trim().slice(0, 20)) + ':' + el.scrollWidth + '>' + el.clientWidth);
  return { hscroll: document.documentElement.scrollWidth > window.innerWidth + 1, small, clipped };
});
// a locked run with a job number and foreman quantities saved, on the Results screen
async function runWithProduction(page, { job = '24-101', exc = '120', pipe = '80', by = 'Frank' } = {}) {
  await M.lockRun(page);
  await page.evaluate((j) => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = j; return window.__debugSaveRunArchive(); }, job); await page.waitForTimeout(300);
  await page.fill('#fpForeman', by); if (exc !== null) await page.fill('#fpExcavated', exc); if (pipe !== null) await page.fill('#fpPipeInstalled', pipe);
  await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(600); await M.dismiss(page);
}
module.exports = { M, check, setup, seedServer, modal, click, screen, saves, prod, layout, runWithProduction };
