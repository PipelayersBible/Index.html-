// Batch 11 D: shared setup for the production tests. Supabase is the hunt6 mock5 (session from localStorage
// '__mockSess'); sbClient.rpc is answered by window.__rpc below: a fake of the pb_prod_* functions in
// D/sql/01_production.sql (state in localStorage '__psrv'), plus pb_report_access and pb_ticket_company_totals.
// Pattern copied from batch7/T1/tests/tk_lib.js.
//   localStorage: '__rpcMode' ok|offline|boom|signedout, '__manager' '1', '__company' (default c1), '__member' '0' = no company
// Batch 12 D2: '__role' (default foreman; 'pipelayer' = runs are held for a foreman, 03_crew_claims.sql), '__foremen' [{id,name}],
//   '__names' {uid: name}. A server row with a 'crew' object is a held crew entry { state, created, assigned, by, note }.
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
  const H24 = 24 * 3600000;
  const counts = (e) => { if (e.late === 'pending' || e.late === 'rejected') return false; const c = e.crew; if (!c) return true; if (c.state === 'claimed' || c.state === 'covered') return false; if (c.state === 'sent') return true; return RealDate.now() - c.created >= H24; };
  const effA = (c) => c && c.assigned && foremen().some(f => f.id === c.assigned) ? c.assigned : null; // review 1 SF2: a demoted / gone assignee holds nothing
  const cstatus = (e) => { const c = e.crew; if (!c) return null; if (c.state === 'pending' && RealDate.now() - c.created >= H24) return 'unclaimed'; if (c.state === 'pending' && effA(c)) return 'assigned'; return c.state; };
  const cnote = (e) => { const s = cstatus(e); return s === 'unclaimed' ? 'Not claimed by a foreman within 24 hours' : s === 'sent' ? 'Sent by the pipelayer without a foreman' : (e.crew && e.crew.note) || null; };
  const nameOf = (u) => (JSON.parse(localStorage.getItem('__names') || '{}'))[u] || (JSON.parse(localStorage.getItem('__foremen') || '[{"id":"acctF","name":"Frank Ortiz"},{"id":"acctF2","name":"Fiona Foreman"}]').find(f => f.id === u) || {}).name || u;
  const foremen = () => JSON.parse(localStorage.getItem('__foremen') || '[{"id":"acctF","name":"Frank Ortiz"},{"id":"acctF2","name":"Fiona Foreman"}]');
  const iso = (t) => new RealDate(t).toISOString();
  window.__rpc = async (fn, args) => {
    window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
    const mode = localStorage.getItem('__rpcMode') || 'ok';
    const manager = localStorage.getItem('__manager') === '1';
    const member = localStorage.getItem('__member') !== '0';
    const company = localStorage.getItem('__company') || 'c1';
    const joined = localStorage.getItem('__joinedAt') || '2020-01-01T00:00:00Z';
    if (fn === 'pb_prod_access') { if (localStorage.getItem('__accessDown') === '1' || mode === 'offline') return { data: null, error: { message: 'TypeError: Failed to fetch' } }; return { data: { member, company_id: member ? company : null, company_active: member, joined_at: member ? joined : null, role: localStorage.getItem('__role') || 'foreman', manager: manager && member, server_at: new RealDate(RealDate.now()).toISOString() }, error: null }; }
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
      const role = localStorage.getItem('__role') || 'foreman';
      const r = row || (srv.entries[k] = { id: '00000000-0000-0000-0000-' + String(Object.keys(srv.entries).length).padStart(12, '0'), user: me(), email: me() + '@x.com', company, versions: [], crew: role === 'foreman' || manager ? null : { state: 'pending', created: RealDate.now(), assigned: ((srv.links || []).find(l => l.pipelayer === me() && !l.ended) || {}).foreman || null } });
      if (row) (row.items || []).forEach(it => { if (!items.some(x => x.key === it.key)) items.push({ key: it.key, qty: null, unit: it.unit }); });
      const changed = JSON.stringify([r.record, r.items]) !== JSON.stringify([args.p_record, items]);
      const crewCounted = row && row.crew && (row.crew.state === 'sent' || (row.crew.state === 'pending' && RealDate.now() - row.crew.created >= H24));
      if (crewCounted && changed) { // Tommy 11:29: waits for approval, never applied directly
        const same = row.pendingEdit && JSON.stringify([row.pendingEdit.record, row.pendingEdit.items]) === JSON.stringify([args.p_record, items]);
        if (!same) { if (row.pendingEdit) (row.editHist = row.editHist || []).push(Object.assign({}, row.pendingEdit, { decision: 'replaced' })); srv.editSeq = (srv.editSeq || 0) + 1; row.pendingEdit = { id: srv.editSeq, record: args.p_record, items, saved_at: iso(RealDate.now()), by: me() }; }
        srvSet(srv);
        return { data: { ok: true, id: row.id, version: row.versions.length, role: localStorage.getItem('__role') || 'foreman', counted: counts(row), crew_status: cstatus(row), crew_deadline: iso(row.crew.created + H24), assigned_name: null, pending_edit: true, server_at: iso(RealDate.now()) }, error: null };
      }
      if (crewCounted && !changed && row.pendingEdit) { (row.editHist = row.editHist || []).push(Object.assign({}, row.pendingEdit, { decision: 'withdrawn' })); row.pendingEdit = null; }
      r.record = args.p_record; r.items = items; r.updated_at = new Date().toISOString(); if (changed || !r.versions.length) r.versions.push(1);
      srvSet(srv);
      return { data: { ok: true, id: r.id, version: r.versions.length, role, counted: counts(r), crew_status: cstatus(r), pending_edit: !!r.pendingEdit, crew_deadline: r.crew ? iso(r.crew.created + H24) : null, assigned_name: r.crew && r.crew.assigned ? ((foremen().find(f => f.id === r.crew.assigned) || {}).name || nameOf(r.crew.assigned)) : null, server_at: iso(RealDate.now()) }, error: null };
    }
    if (fn === 'pb_prod_void_mine') {
      if (args.p_expect_uid !== me()) return { data: null, error: { message: 'pb:wrong_account' } };
      const row = srv.entries[me() + '|' + args.p_client_entry_id];
      if (!row) return { data: { ok: true, id: null, voided: true, none: true }, error: null };
      if (row.company !== company) return { data: null, error: { message: 'pb:left_company' } };
      if (!row.voided) { row.voided = true; row.versions.push('void'); } srvSet(srv);
      return { data: { ok: true, id: row.id, version: row.versions.length, voided: true }, error: null };
    }
    const crewErr = (m) => ({ data: null, error: { message: m } });
    const heldErr = (e) => !e ? 'pb:not_found' : e.voided ? 'pb:voided' : !e.crew ? 'pb:not_held' : e.crew.state === 'claimed' ? 'pb:already_claimed' : e.crew.state === 'covered' ? 'pb:already_covered' : e.crew.state === 'sent' ? 'pb:already_sent' : RealDate.now() - e.crew.created >= H24 ? 'pb:window_over' : null;
    const isForeman = () => (localStorage.getItem('__role') || 'foreman') === 'foreman';
    if (fn === 'pb_prod_company_foremen') { if (!member) return crewErr('pb:not_company_member'); return { data: { foremen: foremen().filter(f => f.id !== me()) }, error: null }; }
    if (fn === 'pb_prod_crew_assign' || fn === 'pb_prod_crew_send') {
      if (args.p_expect_uid !== me()) return crewErr('pb:wrong_account');
      const e = srv.entries[me() + '|' + args.p_client_entry_id], er = heldErr(e);
      if (fn === 'pb_prod_crew_send' && er === 'pb:already_sent') return { data: { ok: true, id: e.id, crew_status: 'sent', again: true }, error: null };
      if (er) return crewErr(er);
      if (fn === 'pb_prod_crew_send') { e.crew.state = 'sent'; e.crew.by = me(); srvSet(srv); return { data: { ok: true, id: e.id, crew_status: 'sent' }, error: null }; }
      const f = foremen().find(x => x.id === args.p_foreman); if (!f || f.id === me()) return crewErr('pb:not_a_foreman');
      e.crew.assigned = f.id; srvSet(srv); return { data: { ok: true, id: e.id, crew_status: 'assigned', assigned_name: f.name }, error: null };
    }
    const pipelayers = () => JSON.parse(localStorage.getItem('__pipelayers') || '[{"id":"acctP","name":"Wes Hall"},{"id":"acctP2","name":"Walt Ruiz"}]');
    const links = () => (srv.links = srv.links || []);
    const openLink = (pl) => links().find(l => l.pipelayer === pl && !l.ended);
    if (fn === 'pb_prod_crew_links') {
      if (!member) return crewErr('pb:not_company_member');
      const role = localStorage.getItem('__role') || 'foreman', hist = links().filter(l => l.foreman === me() || l.pipelayer === me()).map(l => ({ foreman: nameOf(l.foreman), pipelayer: nameOf(l.pipelayer), started_by_me: l.by === me(), end_reason: l.reason || null, ended_at: l.ended || null }));
      if (role === 'pipelayer') { const l = openLink(me()); return { data: { role, server_at: iso(RealDate.now()), history: hist, my_foreman: l ? { id: l.foreman, name: (foremen().find(f => f.id === l.foreman) || {}).name || nameOf(l.foreman) } : null, foremen: foremen() }, error: null }; }
      return { data: { role, server_at: iso(RealDate.now()), history: hist, my_crew: links().filter(l => l.foreman === me() && !l.ended).map(l => ({ id: l.pipelayer, name: (pipelayers().find(p => p.id === l.pipelayer) || {}).name || nameOf(l.pipelayer) })),
        pipelayers: pipelayers().map(p => { const l = openLink(p.id); return { id: p.id, name: p.name, mine: !!l && l.foreman === me(), other: !!l && l.foreman !== me() }; }) }, error: null };
    }
    if (fn === 'pb_prod_crew_link_set' || fn === 'pb_prod_crew_link_end') {
      if (args.p_expect_uid !== me()) return crewErr('pb:wrong_account');
      if (me() !== args.p_foreman && me() !== args.p_pipelayer) return crewErr('pb:not_your_link');
      const fName = (foremen().find(f => f.id === args.p_foreman) || (args.p_foreman === me() && (localStorage.getItem('__role') || 'foreman') === 'foreman' ? { name: 'me' } : null));
      const pName = (pipelayers().find(p => p.id === args.p_pipelayer) || (args.p_pipelayer === me() && localStorage.getItem('__role') === 'pipelayer' ? { name: 'me' } : null));
      const cur = openLink(args.p_pipelayer);
      if (fn === 'pb_prod_crew_link_end') { if (cur && cur.foreman === args.p_foreman) { cur.ended = iso(RealDate.now()); cur.reason = me() === args.p_foreman ? 'ended_by_foreman' : 'ended_by_pipelayer'; srvSet(srv); return { data: { ok: true }, error: null }; } return { data: { ok: true, again: true }, error: null }; }
      if (!fName) return crewErr('pb:not_a_foreman'); if (!pName) return crewErr('pb:not_a_pipelayer');
      if (cur && cur.foreman === args.p_foreman) return { data: { ok: true, again: true }, error: null };
      if (cur) { cur.ended = iso(RealDate.now()); cur.reason = 'replaced'; }
      links().push({ foreman: args.p_foreman, pipelayer: args.p_pipelayer, by: me(), started: iso(RealDate.now()) }); srvSet(srv);
      return { data: { ok: true, foreman_name: fName.name, pipelayer_name: pName.name }, error: null };
    }
    if (fn === 'pb_prod_company_links') {
      if (!manager) return crewErr('pb:not_company_account');
      return { data: { links: links().filter(l => !l.ended).map(l => ({ foreman: (foremen().find(f => f.id === l.foreman) || {}).name || nameOf(l.foreman), pipelayer: (pipelayers().find(p => p.id === l.pipelayer) || {}).name || nameOf(l.pipelayer), since: l.started })) }, error: null };
    }
    if (fn === 'pb_prod_crew_mine') {
      const es = Object.values(srv.entries).filter(e => e.user === me() && e.crew);
      return { data: { server_at: iso(RealDate.now()), entries: es.map(e => ({ client_entry_id: e.cid || Object.keys(srv.entries).find(k => srv.entries[k] === e).split('|').slice(1).join('|'), job_number: e.record.jobNumber || null, work_date: e.record.workDate, in_company: e.company === company, voided: !!e.voided,
        crew_status: cstatus(e), deadline: iso(e.crew.created + H24), assigned_name: effA(e.crew) ? nameOf(e.crew.assigned) : null, by_name: e.crew.by && e.crew.by !== me() ? nameOf(e.crew.by) : null, note: cnote(e), counted: counts(e), edit: e.pendingEdit ? { decision: 'pending' } : e.lastEdit ? { decision: e.lastEdit.decision, by_name: nameOf(e.lastEdit.by) } : null })) }, error: null };
    }
    if (fn === 'pb_prod_edits_waiting') {
      if (!(isForeman() || manager) || !member) return { data: { approver: false, edits: [] }, error: null };
      const byId = (id) => Object.values(srv.entries).find(x => x.id === id);
      return { data: { approver: true, company_account: manager, server_at: iso(RealDate.now()), edits: Object.values(srv.entries).filter(e => e.company === company && e.pendingEdit && !e.voided && (manager || !e.pendingEdit.companyOnly)).map(e => { const o = e.source ? byId(e.source) : null, k = e.pendingEdit.kind || 'edit';
        return { id: e.pendingEdit.id, entry_id: e.id, job_number: e.record.jobNumber || null, work_date: e.record.workDate, kind: k, company_only: !!e.pendingEdit.companyOnly, pipelayer: o ? (o.record.enteredBy || nameOf(o.user)) : (e.record.enteredBy || nameOf(e.user)), by_name: nameOf(e.pendingEdit.by), saved_at: e.pendingEdit.saved_at, own: e.user === me() || e.pendingEdit.by === me(), before: ((k === 'late_claim' && o ? o.items : e.items) || []).filter(i => i.qty != null), after: e.pendingEdit.items }; }) }, error: null };
    }
    if (fn === 'pb_prod_edit_decide') {
      if (args.p_expect_uid !== me()) return crewErr('pb:wrong_account');
      const all = Object.values(srv.entries), e = all.find(x => x.pendingEdit && x.pendingEdit.id === args.p_edit_id) || all.find(x => (x.editHist || []).some(h => h.id === args.p_edit_id));
      if (!e || e.company !== company || !(isForeman() || manager)) return crewErr('pb:not_found');
      if (e.user === me() || (e.pendingEdit && e.pendingEdit.by === me())) return crewErr('pb:own_entry');
      if (!e.pendingEdit || e.pendingEdit.id !== args.p_edit_id) return crewErr('pb:edit_gone');
      if (e.pendingEdit.companyOnly && !manager) return crewErr('pb:company_only');
      if (e.pendingEdit.kind === 'late_claim') { const o = all.find(x => x.id === e.source);
        if (args.p_approve && o.versions.length !== e.pendingEdit.sourceVersion) return crewErr('pb:run_changed'); // R2-1
        if (args.p_approve) { if (o.pendingEdit) { (o.editHist = o.editHist || []).push(Object.assign({}, o.pendingEdit, { decision: 'superseded' })); o.pendingEdit = null; o.lastEdit = { decision: 'superseded', by: me(), at: iso(RealDate.now()) }; } e.items = e.pendingEdit.items; e.versions.push(1); e.late = 'approved'; o.crew.state = 'claimed'; o.crew.by = e.user; } else e.late = 'rejected';
        e.updated_at = new Date().toISOString(); e.lastEdit = { decision: args.p_approve ? 'approved' : 'rejected', by: me(), at: iso(RealDate.now()) }; e.pendingEdit = null; srvSet(srv);
        return { data: { ok: true, id: args.p_edit_id, decision: e.lastEdit.decision, late_claim: true }, error: null }; }
      if (args.p_approve && e.crew && e.crew.state === 'claimed') return crewErr('pb:already_claimed');
      if (args.p_approve && e.crew && e.crew.state === 'covered') return crewErr('pb:already_covered');
      if (args.p_approve) { e.record = e.pendingEdit.record; e.items = e.pendingEdit.items; e.versions.push(1); e.updated_at = new Date().toISOString(); }
      e.lastEdit = { decision: args.p_approve ? 'approved' : 'rejected', by: me(), at: iso(RealDate.now()) }; (e.editHist = e.editHist || []).push(Object.assign({}, e.pendingEdit, { decision: e.lastEdit.decision })); e.pendingEdit = null; srvSet(srv);
      return { data: { ok: true, id: args.p_edit_id, decision: e.lastEdit.decision, version: e.versions.length }, error: null };
    }
    if (fn === 'pb_prod_crew_waiting') {
      if (!member) return crewErr('pb:not_company_member');
      if (!isForeman()) return { data: { foreman: false, waiting: [], claimed: [] }, error: null };
      const all = Object.values(srv.entries).filter(e => e.company === company);
      return { data: { foreman: true, server_at: iso(RealDate.now()),
        waiting: all.filter(e => e.crew && e.crew.state === 'pending' && !e.voided && e.user !== me() && RealDate.now() - e.crew.created < H24 && (!effA(e.crew) || e.crew.assigned === me()))
          .map(e => ({ id: e.id, job_number: e.record.jobNumber || null, jobsite: e.record.jobsite || null, work_date: e.record.workDate, pipelayer: e.record.enteredBy || nameOf(e.user), deadline: iso(e.crew.created + H24), assigned_to_me: effA(e.crew) === me() && !!e.crew.assigned, version: e.versions.length, items: (e.items || []).filter(i => i.qty != null) })),
        counted: all.filter(e => e.crew && !e.voided && e.user !== me() && (e.crew.state === 'sent' || (e.crew.state === 'pending' && RealDate.now() - e.crew.created >= H24)) && !all.some(c => c.source === e.id && c.late !== 'rejected' && !(c.user === me() && c.late === 'pending' && c.pendingEdit && c.pendingEdit.sourceVersion !== e.versions.length)) && (!effA(e.crew) || e.crew.assigned === me()))
          .map(e => ({ id: e.id, job_number: e.record.jobNumber || null, work_date: e.record.workDate, pipelayer: e.record.enteredBy || nameOf(e.user), status: cstatus(e), version: e.versions.length, items: (e.items || []).filter(i => i.qty != null) })),
        claimed: all.filter(e => e.user === me() && e.source).map(e => ({ late: !!e.late, approval: e.late === 'pending' && e.pendingEdit && (all.find(o => o.id === e.source) || { versions: [] }).versions.length !== e.pendingEdit.sourceVersion ? 'changed' : e.late === 'pending' ? 'waiting' : e.late === 'rejected' ? 'rejected' : e.late === 'approved' ? 'approved' : null, pending_items: e.pendingEdit ? e.pendingEdit.items : null, id: e.id, source_id: e.source, job_number: e.record.jobNumber || null, work_date: e.record.workDate, version: e.versions.length, voided: !!e.voided, pipelayer: e.record.claimedFromName, updated_at: e.updated_at, items: (e.items || []).filter(i => i.qty != null) })) }, error: null };
    }
    if (fn === 'pb_prod_crew_claim' || fn === 'pb_prod_crew_cover') {
      if (args.p_expect_uid !== me()) return crewErr('pb:wrong_account');
      if (!isForeman()) return crewErr('pb:not_a_foreman');
      const e = Object.values(srv.entries).find(x => x.id === args.p_entry_id && x.company === company);
      if (fn === 'pb_prod_crew_claim') { const mine = Object.values(srv.entries).find(x => x.source === args.p_entry_id && x.user === me() && x.late !== 'rejected'); const orig0 = Object.values(srv.entries).find(x => x.id === args.p_entry_id);
        if (mine && mine.late === 'pending' && mine.pendingEdit && orig0 && mine.pendingEdit.sourceVersion !== orig0.versions.length) { // R2-1: refresh my stale waiting claim
          if (args.p_expect_version !== orig0.versions.length) return crewErr('pb:run_changed');
          (mine.editHist = mine.editHist || []).push(Object.assign({}, mine.pendingEdit, { decision: 'replaced' })); srv.editSeq = (srv.editSeq || 0) + 1;
          mine.pendingEdit = { id: srv.editSeq, kind: 'late_claim', companyOnly: true, sourceVersion: orig0.versions.length, record: mine.record, items: (orig0.items || []).filter(i => i.qty != null).map(i => Object.assign({}, i)), saved_at: iso(RealDate.now()), by: me() }; srvSet(srv);
          return { data: { ok: true, id: mine.id, version: mine.versions.length, late: true, again: true }, error: null }; }
        if (mine) { return { data: { ok: true, id: mine.id, version: mine.versions.length, again: true, late: !!mine.late }, error: null }; } }
      const lateOk = fn === 'pb_prod_crew_claim' && e && e.crew && !e.voided && (e.crew.state === 'sent' || (e.crew.state === 'pending' && RealDate.now() - e.crew.created >= H24));
      if (e && Object.values(srv.entries).some(x => x.source === e.id && x.user !== me() && x.late === 'pending')) return crewErr('pb:claim_pending');
      if (e && Object.values(srv.entries).some(x => x.source === e.id && x.user !== me() && x.late !== 'rejected')) return crewErr('pb:already_claimed');
      if (lateOk) { // Tommy 11:53: a claim after the run counted waits for the company; the original keeps counting
        if (e.user === me()) return crewErr('pb:own_entry');
        if (effA(e.crew) && e.crew.assigned !== me()) return crewErr('pb:assigned_to_other');
        if (args.p_expect_version !== e.versions.length) return crewErr('pb:run_changed');
        const id = '00000000-0000-0000-0003-' + String(Object.keys(srv.entries).length).padStart(12, '0'); srv.editSeq = (srv.editSeq || 0) + 1;
        const rec = Object.assign({}, e.record, { claimedFrom: e.id, claimedFromName: e.record.enteredBy || nameOf(e.user), enteredBy: null });
        const items = (e.items || []).filter(i => i.qty != null).map(i => Object.assign({}, i));
        srv.entries[me() + '|claim:' + e.id + (srv.entries[me() + '|claim:' + e.id] ? ':' + id : '')] = { id, user: me(), email: me() + '@x.com', company, source: e.id, late: 'pending', versions: [1], updated_at: new Date().toISOString(), record: rec, items, pendingEdit: { id: srv.editSeq, kind: 'late_claim', companyOnly: true, sourceVersion: e.versions.length, record: rec, items, saved_at: iso(RealDate.now()), by: me() } };
        srvSet(srv); return { data: { ok: true, id, version: 1, late: true }, error: null };
      }
      if (fn === 'pb_prod_crew_cover' && e && e.crew && e.crew.state === 'covered' && e.crew.by === me()) return { data: { ok: true, id: e.id, again: true }, error: null };
      const er = heldErr(e); if (er) return crewErr(er);
      if (e.user === me()) return crewErr('pb:own_entry');
      if (effA(e.crew) && e.crew.assigned !== me()) return crewErr('pb:assigned_to_other');
      if (fn === 'pb_prod_crew_claim' && args.p_expect_version !== e.versions.length) return crewErr('pb:run_changed');
      if (fn === 'pb_prod_crew_cover') { e.crew.state = 'covered'; e.crew.by = me(); e.crew.note = args.p_note || 'Already counted in the foreman\'s own run'; srvSet(srv); return { data: { ok: true, id: e.id }, error: null }; }
      const id = '00000000-0000-0000-0002-' + String(Object.keys(srv.entries).length).padStart(12, '0');
      srv.entries[me() + '|claim:' + e.id] = { id, user: me(), email: me() + '@x.com', company, source: e.id, versions: [1], updated_at: new Date().toISOString(), record: Object.assign({}, e.record, { claimedFrom: e.id, claimedFromName: e.record.enteredBy || nameOf(e.user), enteredBy: null }), items: (e.items || []).filter(i => i.qty != null).map(i => Object.assign({}, i)) };
      e.crew.state = 'claimed'; e.crew.by = me(); e.crew.claim = id; srvSet(srv);
      return { data: { ok: true, id, version: 1 }, error: null };
    }
    if (fn === 'pb_prod_claimed_edit') {
      if (args.p_expect_uid !== me()) return crewErr('pb:wrong_account');
      const e = Object.values(srv.entries).find(x => x.id === args.p_entry_id && x.user === me() && x.source); if (!e) return crewErr('pb:not_found');
      if (e.voided) return crewErr('pb:voided');
      if (args.p_expect_version !== e.versions.length) return crewErr('pb:changed');
      if (e.late === 'rejected') return crewErr('pb:claim_rejected');
      const items = args.p_items.map(x => ({ key: x.key, qty: x.qty == null ? null : Number(x.qty), unit: x.unit || null }));
      if (e.late) { srv.editSeq = (srv.editSeq || 0) + 1; const sv = e.late === 'pending' && e.pendingEdit ? e.pendingEdit.sourceVersion : undefined; if (e.pendingEdit) (e.editHist = e.editHist || []).push(Object.assign({}, e.pendingEdit, { decision: 'replaced' })); e.pendingEdit = { id: srv.editSeq, kind: e.late === 'pending' ? 'late_claim' : 'edit', companyOnly: true, sourceVersion: sv, record: e.record, items, saved_at: iso(RealDate.now()), by: me() }; srvSet(srv); return { data: { ok: true, id: e.id, version: e.versions.length, pending: true }, error: null }; }
      (e.items || []).forEach(it => { if (!items.some(x => x.key === it.key)) items.push({ key: it.key, qty: null, unit: it.unit }); });
      if (JSON.stringify(items) !== JSON.stringify(e.items)) { e.items = items; e.versions.push(1); e.updated_at = new Date().toISOString(); }
      srvSet(srv); return { data: { ok: true, id: e.id, version: e.versions.length }, error: null };
    }
    const today = args.p_today || day(0);
    const allCo = Object.values(srv.entries).filter(e => e.company === company), mineCo = allCo.filter(e => !e.voided), cntCo = mineCo.filter(counts);
    if (fn === 'pb_prod_foreman_scope') {
      if (!member) return { data: null, error: { message: 'pb:not_company_member' } };
      const keys = [...new Set(mineCo.filter(e => e.user === me() && jk(e.record.jobNumber) && (e.items || []).some(i => i.qty >= 1 && !/^_/.test(i.key))).map(e => jk(e.record.jobNumber)))];
      return { data: { today, jobs: keys.map(key => ({ job_key: key, job_number: (mineCo.find(e => jk(e.record.jobNumber) === key) || {}).record.jobNumber || null, last_at: new Date().toISOString(),
        plan: (srv.plans[company + '|' + key] || {}).plan || null, cats: sums(cntCo.filter(e => jk(e.record.jobNumber) === key), today), mine: sums(mineCo.filter(e => e.user === me() && jk(e.record.jobNumber) === key), today) })) }, error: null };
    }
    if (!manager) return { data: null, error: { message: 'pb:not_company_account' } };
    if (fn === 'pb_ticket_company_totals') return { data: { tickets: 7, concrete_yd3: 42.5, sub_hours: [{ key: 'Ace', hours: 12, n: 2 }] }, error: null };
    const jobKeys = [...new Set(mineCo.map(e => jk(e.record.jobNumber)).concat(Object.keys(srv.plans).filter(k => k.startsWith(company + '|')).map(k => k.split('|')[1])))];
    const jobOf = (key) => { const live = mineCo.filter(e => jk(e.record.jobNumber) === key), es = live.filter(counts), p = srv.plans[company + '|' + key];
      return { job_key: key, job_number: p ? p.job_number : (es[0] ? es[0].record.jobNumber || null : null), jobsite: (es.find(e => e.record.jobsite) || { record: {} }).record.jobsite || null,
        last_at: live.length ? live.map(e => e.updated_at).sort().pop() : null, last_work_date: live.length ? live.map(e => e.record.workDate).sort().pop() : null, entries: es.length,
        waiting: live.filter(e => e.crew && e.crew.state === 'pending' && RealDate.now() - e.crew.created < H24).length, edits_waiting: live.filter(e => e.pendingEdit).length,
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
      const crew = all.filter(e => e.crew).map(e => ({ id: e.id, voided: !!e.voided, work_date: e.record.workDate, entered_by: e.record.enteredBy || null, email: e.email, version: e.versions.length, updated_at: e.updated_at, status: cstatus(e), deadline: iso(e.crew.created + H24), assigned_name: effA(e.crew) ? nameOf(e.crew.assigned) : null, by_name: e.crew.by ? nameOf(e.crew.by) : null, note: cnote(e), counted: counts(e), pending_edit: e.pendingEdit ? { id: e.pendingEdit.id, items: e.pendingEdit.items, saved_at: e.pendingEdit.saved_at, by_name: e.record.enteredBy || nameOf(e.pendingEdit.by) } : null, last_edit: e.lastEdit ? { decision: e.lastEdit.decision, decided_at: e.lastEdit.at, by_name: nameOf(e.lastEdit.by) } : null, items: (e.items || []).filter(i => i.qty != null) }));
      return { data: Object.assign(j, { days, reporters: Object.values(byU), crew, approvals: all.filter(e => e.pendingEdit && !e.voided).map(e => { const o = e.source ? all.find(x => x.id === e.source) : null, k = e.pendingEdit.kind || 'edit';
        return { id: e.pendingEdit.id, kind: k, company_only: !!e.pendingEdit.companyOnly, work_date: e.record.workDate, pipelayer: o ? (o.record.enteredBy || nameOf(o.user)) : (e.record.enteredBy || nameOf(e.user)), by_name: nameOf(e.pendingEdit.by), saved_at: e.pendingEdit.saved_at, own: e.pendingEdit.by === me(), before: ((k === 'late_claim' && o ? o.items : e.items) || []).filter(i => i.qty != null), after: e.pendingEdit.items }; }),
        recent: all.filter(e => !e.crew && e.late !== 'pending' && e.late !== 'rejected').map(e => ({ claimed_from: e.source ? (e.record.claimedFromName || 'a pipelayer') : null, id: e.id, kind: e.kind || 'run', voided: !!e.voided, note: e.record.note || null, work_date: e.record.workDate, entered_by: e.record.enteredBy || null, email: e.email, version: e.versions.length, updated_at: e.updated_at, items: (e.items || []).filter(i => i.qty != null) })) }), error: null };
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
