// Overnight sweep round 2 (Oct 24) — the CREW side. Built on the company sweep's clib (pd_lib mock + company answers,
// the seeded server: job 24-101 with a plan, Frank's entries, Wes's held run p1, Walt's sent run p2 with pending edit 7,
// link Frank→Wes) plus answers for what a crew phone asks: pb_prod_job_plan_crew (the plan with equipment),
// pb_prod_crew_run_ends, pb_prod_crew_live_permits for a foreman, run reports (pb_prod_run_record_put /
// pb_prod_crew_reports / pb_prod_crew_run_record / pb_prod_run_report_review), pb_prod_crew_autolink, pb_prod_member_jobs,
// pb_prod_crew_nudge, pb_prod_crew_uncover.
// setup(browser, { who: 'foreman' | 'pipelayer' | 'company' | 'manager', uid, extra, width, height })
const C = require('./clib_company.js');
const { M, T, check } = C;
const CREW_EXTRA = () => {
  const orig = window.__rpc, jk = (n) => String(n || '').trim().toLowerCase().slice(0, 60);
  const me = () => (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
  const role = () => localStorage.getItem('__role') || 'foreman';
  const mgr = () => localStorage.getItem('__manager') === '1';
  const srvGet = () => JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}');
  const srvSet = (v) => localStorage.setItem('__psrv', JSON.stringify(v));
  const rrGet = () => JSON.parse(localStorage.getItem('__rrsrv') || '{"runs":{}}');
  const rrSet = (v) => localStorage.setItem('__rrsrv', JSON.stringify(v));
  const nameOf = (u) => (JSON.parse(localStorage.getItem('__names') || '{}'))[u] || u;
  window.__rpc = async (fn, args) => {
    const off = (localStorage.getItem('__rpcMode') || 'ok') === 'offline';
    const log = () => window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
    const done = (data) => off ? { data: null, error: { message: 'TypeError: Failed to fetch' } } : { data, error: null };
    const err = (m) => ({ data: null, error: { message: m } });
    if (fn === 'pb_prod_job_plan_crew') { log(); if (off) return done(); if (Number(localStorage.getItem('__planDelay'))) await new Promise(res => setTimeout(res, Number(localStorage.getItem('__planDelay')))); /* feat_crew34: a slow plan answer */ const srv = srvGet(), co = localStorage.getItem('__company') || 'c1', p = srv.plans[co + '|' + jk(args.p_job_number)]; return done({ job_key: jk(args.p_job_number), plan: p ? p.plan : null }); }
    if (fn === 'pb_prod_crew_run_ends') { log(); return done({ ends: JSON.parse(localStorage.getItem('__runEnds') || '[]') }); }
    if (fn === 'pb_prod_crew_live_permits' && !mgr()) { log(); if (off) return done(); const srv = srvGet(); return done({ server_at: new Date().toISOString(), permits: Object.values(srv.permits || {}).filter(x => x.company === (localStorage.getItem('__company') || 'c1')).map(x => ({ who: nameOf(x.user), permit_ref: x.ref, closed: x.closed, status: x.status, updated_at: x.updated_at })) }); }
    if (fn === 'pb_prod_crew_autolink') { log(); return done({ ok: true, linked: false, reason: 'no_match' }); }
    if (fn === 'pb_prod_member_jobs') { log(); if (off) return done(); const srv = srvGet(), co = localStorage.getItem('__company') || 'c1'; return done({ jobs: Object.keys(srv.plans).filter(k => k.startsWith(co + '|')).map(k => ({ job_number: srv.plans[k].job_number, project_name: null })) }); }
    if (fn === 'pb_prod_crew_nudge') { log(); if (off) return done(); (window.__nudges = window.__nudges || []).push(args.p_entry_id); return done({ ok: true, to: 'Wes Hall' }); }
    if (fn === 'pb_prod_crew_uncover') { log(); if (off) return done(); const srv = srvGet(); const e = Object.values(srv.entries).find(x => x.id === args.p_entry_id); if (!e || !e.crew || e.crew.state !== 'covered') return err('pb:not_covered'); e.crew = { state: 'pending', created: Date.now(), assigned: null, note: 'cover removed' }; srvSet(srv); return done({ ok: true }); }
    if (fn === 'pb_prod_crew_covered') { log(); if (off) return done(); const srv = srvGet(), co = localStorage.getItem('__company') || 'c1'; return done({ ok: true, covered: Object.values(srv.entries).filter(e => e.company === co && e.crew && e.crew.state === 'covered' && e.crew.by === me() && !e.voided).map(e => ({ id: e.id, job_number: e.record.jobNumber, work_date: e.record.workDate, pipelayer: e.record.enteredBy || nameOf(e.user), items: (e.items || []).filter(i => i.qty != null), note: e.crew.note || null, covered_at: new Date().toISOString() })) }); }
    // ---- run reports (feat_pmruns shapes, as feat_runedit/tests/t_eqtab_form.js mocks them) ----
    if (fn === 'pb_prod_run_record_put') {
      log(); if (off) return done();
      const srv = rrGet(), k = me() + '|' + args.p_entry_id, old = srv.runs[k] || null, rec = args.p_record, ended = !!(rec.completed || rec.incomplete);
      const x = { id: old ? old.id : 'rr-' + Object.keys(srv.runs).length, pid: me(), entry: args.p_entry_id, record: rec, sent_at: old ? old.sent_at : null, sent_how: old ? old.sent_how : null, reviewed_at: old ? old.reviewed_at : null, job_number: rec.jobNumber || null };
      if (!x.sent_at && ended && rec.pbOffice && rec.pbOffice.send) { x.sent_at = new Date().toISOString(); x.sent_how = 'pipelayer'; }
      if (!x.sent_at && ended && localStorage.getItem('__autoSend') === String(args.p_entry_id)) { x.sent_at = new Date().toISOString(); x.sent_how = 'auto'; }
      srv.runs[k] = x; rrSet(srv);
      return done({ ok: true, same: false, version: 1, sent_at: x.sent_at, sent_how: x.sent_how });
    }
    if (fn === 'pb_prod_crew_reports') { log(); if (off) return done(); const srv = rrGet(); return done({ foreman: role() === 'foreman', server_at: new Date().toISOString(), reports: Object.values(srv.runs).filter(x => x.sent_at && x.pid !== me()).map(x => ({ id: x.id, pipelayer_id: x.pid, entry_id: x.entry, job_number: x.job_number, label: (x.record.startLabel || 'Start') + ' → ' + (x.record.endLabel || 'End'), distance_ft: (() => { const d = Number(x.record.completedDistance != null && x.record.completedDistance !== '' ? x.record.completedDistance : x.record.distance); return Number.isFinite(d) ? Math.round(d * 100) / 100 : null; })(), laid_ft: x.record.pbOffice && Number.isFinite(Number(x.record.pbOffice.laidFt)) ? Math.round(Number(x.record.pbOffice.laidFt) * 100) / 100 : null, ended_at: Number.isFinite(Number(x.record.runEndTime)) && x.record.runEndTime ? new Date(Number(x.record.runEndTime)).toISOString() : null, /* feat_crew34: as feat_pmruns/sql/05 fills them */ sent_at: x.sent_at, sent_how: x.sent_how, reviewed_at: x.reviewed_at, who: nameOf(x.pid), status: x.reviewed_at ? 'approved' : 'waiting' })) }); }
    if (fn === 'pb_prod_crew_run_record') { log(); if (off) return done(); const x = rrGet().runs[args.p_pipelayer + '|' + args.p_session_ref]; if (!x) return err('pb:no_record'); if (!x.sent_at) return err('pb:not_sent'); return done({ id: x.id, record: x.record, who: nameOf(x.pid), job_number: x.job_number, label: 'run', locked_at: x.record.lockTime, photo_count: 0, sent_at: x.sent_at, sent_how: x.sent_how, reviewed_at: x.reviewed_at, can_review: true }); }
    if (fn === 'pb_prod_run_report_review') { log(); if (off) return done(); const srv = rrGet(), x = Object.values(srv.runs).find(y => y.id === args.p_id); if (!x) return err('pb:not_found'); const again = !!x.reviewed_at; if (!again) x.reviewed_at = new Date().toISOString(); rrSet(srv); return done({ ok: true, reviewed_at: x.reviewed_at, again }); }
    if (fn === 'pb_prod_run_remove') { log(); if (off) return done(); const srv = rrGet(), x = Object.values(srv.runs).find(y => y.id === args.p_id); if (!x) return err('pb:not_found'); x.removed_at = new Date().toISOString(); rrSet(srv); return done({ ok: true }); }
    if (fn === 'pb_push_status' || fn === 'pb_push_prefs_get') { log(); return done({ ok: true, subscribed: localStorage.getItem('__pushSub') === '1', prefs: { crew_production: true } }); }
    return orig(fn, args);
  };
};
async function setup(browser, o) {
  o = o || {};
  const who = o.who || 'foreman';
  const uid = o.uid || (who === 'foreman' ? 'acctF' : who === 'pipelayer' ? 'acctP' : 'acctA');
  const ex = Object.assign({ __psrv: C.seed(), __mats: C.MATS, __foremen: [{ id: 'acctF', name: 'Frank Ortiz' }, { id: 'acctF2', name: 'Fiona Foreman' }], __pipelayers: [{ id: 'acctP', name: 'Wes Hall' }, { id: 'acctP2', name: 'Walt Ruiz' }], __names: { acctF: 'Frank Ortiz', acctF2: 'Fiona Foreman', acctP: 'Wes Hall', acctP2: 'Walt Ruiz', acctA: 'DIG Civil' } },
    who === 'company' ? { __ownerCo: '1', __manager: '1' } : who === 'manager' ? { __manager: '1', __role: 'foreman' } : { __role: who }, o.extra || {});
  const ctx = await browser.newContext({ viewport: { width: o.width || 390, height: o.height || 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(M.mockInit); await ctx.addInitScript(T.RPC); await ctx.addInitScript(C.EXTRA); await ctx.addInitScript(CREW_EXTRA);
  await ctx.addInitScript(([u, ex2]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: u, email: u + '@x.com' })); localStorage.setItem('lastKnownUserId', u); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem(u + ':cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active', companyName: 'DIG Civil Construction', companyRole: ex2.__role || 'Company account', companyId: 'c1' }));
    for (const k in ex2) localStorage.setItem(k, typeof ex2[k] === 'string' ? ex2[k] : JSON.stringify(ex2[k]));
  }, [uid, ex]);
  const page = await M.open(ctx); await M.dismiss(page);
  page._errors = []; page.on('pageerror', e => page._errors.push(String(e && e.message || e)));
  page._console = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') page._console.push(m.type() + ': ' + m.text().slice(0, 200)); });
  await page.waitForTimeout(1500);
  return { ctx, page, uid };
}
// re-open the same phone (same localStorage) after the server state changed, or simply reload
const reload = async (page) => { await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page); };
const srv = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('__psrv') || '{"entries":{}}'));
const setSrv = (p, f, arg) => p.evaluate(([fs, a]) => { const s = JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}'); (new Function('s', 'a', fs))(s, a); localStorage.setItem('__psrv', JSON.stringify(s)); }, [f, arg]);
const prod = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__debugProd())));
const offline = async (p, on) => { await p.evaluate((o) => { localStorage.__rpcMode = o ? 'offline' : 'ok'; if (!o) window.dispatchEvent(new Event('online')); }, on); };
const sync = async (p) => { await p.evaluate(() => pbProdSyncNow()); };
module.exports = Object.assign({}, C, { setup, CREW_EXTRA, reload, srv, setSrv, prod, offline, sync });
