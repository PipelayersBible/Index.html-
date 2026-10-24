// Batch 18 M2: shared setup for the materials tests. Builds on batch 11 D's production mock (pd_lib.js: the hunt6
// mock5 Supabase, window.__rpc for pb_prod_*). On top of it, window.__rpc also answers the pb_mat_* functions with a
// small fake of sql/01_materials.sql (its figures use the same math): state in localStorage '__msrv' = { mats: [...] }.
//   '__matMode' ok | offline | missing (the server functions aren't there yet) | dup (save says pb:duplicate_name)
//   '__matWait' { <job_key>: waiting LF }   window.__matLog: every pb_mat_* call
// The mock is added as an init script between pd_lib's RPC script and its seed script (registration order).
const T = require('/home/claude/batch11/D/tests/pd_lib.js');
const { M, check } = T;
const MAT = () => {
  const orig = window.__rpc;
  window.__matLog = [];
  const get = () => JSON.parse(localStorage.getItem('__msrv') || '{"mats":[]}');
  const put = (v) => localStorage.setItem('__msrv', JSON.stringify(v));
  const jk = (n) => String(n || '').trim().toLowerCase().slice(0, 60);
  const nk = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const pipeFt = (key) => { const p = JSON.parse(localStorage.getItem('__psrv') || '{"entries":{}}'); let s = 0; Object.values(p.entries || {}).forEach(e => { if (jk(e.record && e.record.jobNumber) === key) (e.items || []).forEach(i => { if (i.key === 'pipe' && i.qty) s += i.qty; }); }); return s; };
  const links = (m) => (get().links || []).filter(l => l.material_id === m.id);
  const fig = (m) => {
    const L = links(m).filter(l => !l.unlinked), live = (m.orders || []).filter(o => !o.voided && o.unit === m.unit);
    const ord = live.reduce((a, o) => a + Math.max(o.qty, L.filter(l => l.order_id === o.id).reduce((x, l) => x + l.qty, 0)), 0) + L.filter(l => !l.order_id || !live.some(o => o.id === l.order_id)).reduce((a, l) => a + l.qty, 0);
    const ft = pipeFt(m.job_key), ftw = (JSON.parse(localStorage.getItem('__matWait') || '{}'))[m.job_key] || 0;
    let used = null, waiting = 0, status = 'ok', per = null, geom = null;
    const uk = (x) => x.source === 'pipe_footage' ? 'pipe' : x.source === 'bedding_calc' ? (x.use_as === 'shading' ? 'shading' : 'bedding') : null;
    const split = uk(m) && !m.archived ? get().mats.filter(o => o.id !== m.id && !o.archived && o.job_key === m.job_key && uk(o) === uk(m)).map(o => o.name) : [];
    if (split.length) { status = 'split_unknown'; }
    else if (m.source === 'pipe_footage') { used = ft; waiting = ftw; }
    else if (m.source === 'bedding_calc') {
      // (03) the same as pb_mat.geom: material values win over the job's settings; shading takes the pipe's area off
      const J = (get().settings || {})[m.job_key] || {}, shade = m.use_as === 'shading';
      const w = m.trench_width_ft != null ? m.trench_width_ft : J.trench_width_ft, t = shade ? (m.shade_thick_ft != null ? m.shade_thick_ft : J.shade_thick_ft) : (m.bed_thick_ft != null ? m.bed_thick_ft : J.bed_thick_ft);
      const od = J.pipe_id_in != null && J.pipe_wall_in != null ? J.pipe_id_in + 2 * J.pipe_wall_in : J.pipe_od_in;
      if (w == null) status = 'needs_width'; else if (t == null) status = shade ? 'needs_shading_thickness' : 'needs_thickness'; else if (shade && od == null) status = 'needs_od'; else if (shade && w <= od / 12) status = 'width_under_od'; else if (m.basis === 'weight' && m.density_tpy == null) status = 'needs_density';
      else { const ft3 = shade ? w * (od / 12 + t) - Math.PI * Math.pow(od / 12, 2) / 4 : w * t; per = ft3 / 27; geom = { use_as: shade ? 'shading' : 'bedding', width_ft: w, thick_ft: t, od_in: od, od_from: od == null ? null : J.pipe_id_in != null && J.pipe_wall_in != null ? 'id_wall' : 'pm_od', ft3_per_ft: Math.round(ft3 * 1e5) / 1e5, width_from: m.trench_width_ft != null ? 'material' : 'job', thick_from: (shade ? m.shade_thick_ft : m.bed_thick_ft) != null ? 'material' : 'job' };
        const f = (1 + m.extra_pct / 100) * (m.basis === 'weight' ? m.density_tpy : 1); used = r3(ft * per * f); waiting = r3(ftw * per * f); }
    } else used = (m.uses || []).filter(u => !u.voided).reduce((a, u) => a + u.qty, 0);
    return { used, waiting, ordered: ord, delivered: L.reduce((a, l) => a + l.qty, 0), tickets: L.length, status, estimate: m.source === 'bedding_calc', ft: m.source === 'entered' ? null : ft, ft_waiting: m.source === 'entered' ? null : ftw, yd3_per_ft: per === null ? null : Math.round(per * 1e5) / 1e5, geom, split_with: split };
  };
  const out = (m) => Object.assign({}, m, { fig: fig(m), tickets: links(m).map(l => Object.assign({}, l, (get().lines || []).find(x => x.ticket_id === l.ticket_id && x.line_no === l.line_no) || {}, { id: l.id, qty: l.qty, unit: l.unit })) });
  const UK = (u) => { const x = String(u || '').toLowerCase().replace(/[^a-z0-9³]/g, ''); return /^(yd3|yd³|cy)$/.test(x) ? 'yd3' : /^(tons?|tn)$/.test(x) ? 'ton' : /^(lf|ft)$/.test(x) ? 'lf' : x; };
  const factor = (u, m) => UK(u) === UK(m.unit) ? 1 : UK(u) === 'ton' && UK(m.unit) === 'yd3' && m.density_tpy ? Math.round(1 / m.density_tpy * 1e6) / 1e6 : UK(u) === 'yd3' && UK(m.unit) === 'ton' && m.density_tpy ? m.density_tpy : null;
  const num = (v, lo, hi) => { if (v === undefined || v === null || v === '') return null; const n = Number(v); if (!Number.isFinite(n) || n < lo || n > hi) throw new Error('pb:bad_material'); return n; };
  window.__matFig = fig;
  window.__rpc = async (fn, args) => {
    if (fn === 'pb_ticket_photo') { window.__matLog.push({ fn, args }); return { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', error: null }; }
    if (!/^pb_mat_/.test(fn)) return orig(fn, args);
    window.__matLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
    const mode = localStorage.getItem('__matMode') || 'ok';
    if (mode === 'offline' || navigator.onLine === false) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
    if (mode === 'missing') return { data: null, error: { message: 'Could not find the function public.' + fn } };
    const S = get();
    // M3: the job's list for Run Setup: anyone in the company (crews too); names and uses only
    if (fn === 'pb_mat_crew_list') {
      if (localStorage.getItem('__member') === '0') return { data: null, error: { message: 'pb:not_company_member' } };
      const k = jk(args.p_job_number), st = (S.settings || {})[k] || null;
      const use = (m) => m.category === 'pipe' ? 'pipe' : /^bedding_/.test(m.category) ? (m.use_as || 'bedding') : null;
      return { data: { job_key: k, materials: S.mats.filter(m => m.job_key === k && !m.archived).map(m => ({ id: m.id, name: m.name, category: m.category, use: use(m), unit: m.unit })),
        settings: st ? { trench_width_ft: st.trench_width_ft, bed_thick_ft: st.bed_thick_ft, shade_thick_ft: st.shade_thick_ft, od_in: st.pipe_id_in != null && st.pipe_wall_in != null ? st.pipe_id_in + 2 * st.pipe_wall_in : st.pipe_od_in } : null }, error: null };
    }
    if (localStorage.getItem('__manager') !== '1') return { data: null, error: { message: 'pb:not_company_account' } };
    try {
      if (fn === 'pb_mat_company') {
        const keys = [...new Set(S.mats.filter(m => !m.archived).map(m => m.job_key))];
        return { data: { server_at: new Date().toISOString(), jobs: keys.map(k => ({ job_key: k, job_number: S.mats.find(m => m.job_key === k).job_number, stale_ticket_links: (S.stale || {})[k] || 0, unassigned_tickets: (S.lines || []).filter(x => x.job_key === k && !(S.links || []).some(l => l.ticket_id === x.ticket_id && l.line_no === x.line_no && !l.unlinked)).length, materials: S.mats.filter(m => m.job_key === k && !m.archived).map(out) })) }, error: null };
      }
      if (fn === 'pb_mat_job') { const k = jk(args.p_job_number); return { data: { job_key: k, job_number: args.p_job_number, pipe_ft: { counted: pipeFt(k), waiting: 0 }, materials: S.mats.filter(m => m.job_key === k).map(out) }, error: null }; }
      if (fn === 'pb_mat_save') {
        if (mode === 'dup') throw new Error('pb:duplicate_name');
        const p = args.p_material, k = jk(args.p_job_number);
        const cat = p.category, src = p.source, basis = src === 'bedding_calc' ? (p.basis || 'volume') : null;
        const unit = src === 'pipe_footage' ? 'LF' : basis === 'volume' ? 'yd³' : basis === 'weight' ? 'ton' : p.unit;
        const row = { job_key: k, job_number: args.p_job_number, name: p.name, category: cat, source: src, basis, unit, expected: num(p.expected, 0, 1e8), alert_pct: num(p.alert_pct, 10, 100) || 80,
          trench_width_ft: src === 'bedding_calc' ? num(p.trench_width_ft, 0.01, 100) : null, bed_thick_ft: src === 'bedding_calc' ? num(p.bed_thick_ft, 0.01, 20) : null,
          density_tpy: src === 'bedding_calc' ? num(p.density_tpy, 0.1, 5) : null, use_as: src === 'bedding_calc' ? (p.use_as || 'bedding') : null, shade_thick_ft: p.use_as === 'shading' ? num(p.shade_thick_ft, 0.01, 20) : null, extra_pct: src === 'bedding_calc' ? (num(p.extra_pct, 0, 100) ?? 15) : 0 };
        if (S.mats.some(m => m.job_key === k && !m.archived && nk(m.name) === nk(p.name) && m.id !== p.id)) throw new Error('pb:duplicate_name');
        let m;
        if (p.id) { m = S.mats.find(x => x.id === p.id); if (m.version !== args.p_expect_version) throw new Error('pb:changed'); Object.assign(m, row); m.version++; }
        else { m = Object.assign({ id: 'mat' + (S.mats.length + 1) + '-' + Math.random().toString(36).slice(2, 6), version: 1, archived: false, orders: [], uses: [], created_at: new Date().toISOString() }, row); S.mats.push(m); }
        put(S); return { data: { ok: true, material: out(m) }, error: null };
      }
      if (fn === 'pb_mat_order_add' || fn === 'pb_mat_used_add') {
        const m = S.mats.find(x => x.id === args.p_material_id); if (!m) throw new Error('pb:not_found');
        const list = fn === 'pb_mat_order_add' ? m.orders : m.uses, cid = args.p_client_order_id || args.p_client_use_id;
        if (list.some(o => o.cid === cid)) return { data: { ok: true, already: true }, error: null };
        list.push({ id: 'x' + Math.random().toString(36).slice(2, 8), cid, qty: args.p_qty, unit: m.unit, ordered_on: args.p_ordered_on, used_on: args.p_used_on, ref: args.p_ref, note: args.p_note, voided: false, created_at: new Date().toISOString() });
        put(S); return { data: { ok: true, material: out(m) }, error: null };
      }
      if (fn === 'pb_mat_order_void' || fn === 'pb_mat_used_void') {
        if (!String(args.p_reason || '').trim()) throw new Error('pb:reason_needed');
        const id = args.p_order_id || args.p_use_id;
        S.mats.forEach(m => [...m.orders, ...m.uses].forEach(o => { if (o.id === id) { o.voided = true; o.voided_at = new Date().toISOString(); o.void_reason = args.p_reason; } }));
        put(S); return { data: { ok: true }, error: null };
      }
      if (fn === 'pb_mat_job_settings') { if (localStorage.getItem('__noSettings') === '1') return { data: null, error: { message: 'Could not find the function public.pb_mat_job_settings' } }; const st = (S.settings || {})[jk(args.p_job_number)]; return { data: { settings: st || null }, error: null }; }
      if (fn === 'pb_mat_job_settings_history') return { data: { versions: ((S.settingsHist || {})[jk(args.p_job_number)] || []).slice().reverse() }, error: null };
      if (fn === 'pb_mat_job_settings_set') {
        const k = jk(args.p_job_number); S.settings = S.settings || {}; const cur = S.settings[k];
        if ((cur ? cur.version : 0) !== args.p_expect_version) throw new Error('pb:changed');
        const o = {}; ['trench_width_ft', 'bed_thick_ft', 'shade_thick_ft', 'pipe_id_in', 'pipe_wall_in', 'pipe_od_in'].forEach(x => { o[x] = num(args.p_settings[x], 0.01, 240); });
        if ('swell_pct' in args.p_settings) o.swell_pct = num(args.p_settings.swell_pct, 0, 200); else if (cur) o.swell_pct = cur.swell_pct;
        if ('native_unsuitable' in args.p_settings) o.native_unsuitable = !!args.p_settings.native_unsuitable; else if (cur) o.native_unsuitable = cur.native_unsuitable;
        if ('truck_yd3' in args.p_settings) o.truck_yd3 = num(args.p_settings.truck_yd3, 0.1, 100); else if (cur) o.truck_yd3 = cur.truck_yd3;
        S.settings[k] = Object.assign(o, { version: (cur ? cur.version : 0) + 1 });
        S.settingsHist = S.settingsHist || {}; (S.settingsHist[k] = S.settingsHist[k] || []).push({ version: S.settings[k].version, at: new Date().toISOString(), phone_at: args.p_phone_at, by: 'owner-a.test', values: o }); put(S); return { data: { ok: true, version: S.settings[k].version }, error: null };
      }
      if (fn === 'pb_mat_unlisted') { const k = jk(args.p_job_number); return { data: { lines: ((S.unlisted || {})[k] || []), maps: (S.maps || []).filter(t => t.job_key === k && !t.unlinked) }, error: null }; }
      if (fn === 'pb_mat_typed_assign') {
        const k = jk(args.p_job_number), m = S.mats.find(x => x.id === args.p_material_id);
        if (!m) throw new Error('pb:bad_material');
        S.maps = S.maps || []; S.maps.push({ id: 'map' + (S.maps.length + 1), job_key: k, use: args.p_use, typed_name: args.p_typed_name, material_id: m.id, material: m.name, by: 'owner-a.test', at: new Date().toISOString() });
        S.unlisted = S.unlisted || {}; S.unlisted[k] = (S.unlisted[k] || []).filter(x => !(x.use === args.p_use && nk(x.name) === nk(args.p_typed_name)));
        put(S); return { data: { ok: true }, error: null };
      }
      if (fn === 'pb_mat_typed_unassign') { if (!String(args.p_reason || '').trim()) throw new Error('pb:reason_needed'); const t = (S.maps || []).find(x => x.id === args.p_map_id); t.unlinked = true; put(S); return { data: { ok: true }, error: null }; }
      if (fn === 'pb_mat_spoils') { const k = jk(args.p_job_number); const sp = (S.spoils || {})[k]; return { data: sp ? Object.assign({ job_key: k }, sp) : { status: 'no_footage', ft: 0 }, error: null }; }
      if (fn === 'pb_mat_spoils_company') return { data: { jobs: Object.keys(S.spoils || {}).map(k => Object.assign({ job_key: k }, S.spoils[k])) }, error: null };
      if (fn === 'pb_mat_tickets') {
        const k = jk(args.p_job_number), mats = S.mats.filter(m => m.job_key === k && !m.archived);
        const lines = (S.lines || []).filter(x => x.job_key === k).map(x => { const l = (S.links || []).find(y => y.ticket_id === x.ticket_id && y.line_no === x.line_no && !y.unlinked);
          const sm = l ? null : mats.find(m => (nk(m.name).includes(nk(x.item)) || nk(x.item).includes(nk(m.name))) && factor(x.unit, m) !== null);
          return Object.assign({}, x, { link: l ? { id: l.id, material_id: l.material_id } : null, suggest: sm ? { material_id: sm.id, name: sm.name, factor: factor(x.unit, sm), qty: r3(x.qty * factor(x.unit, sm)), unit: sm.unit } : null }); });
        return { data: { lines, unassigned: lines.filter(x => !x.link).length }, error: null };
      }
      if (fn === 'pb_mat_ticket_link') {
        const m = S.mats.find(x => x.id === args.p_material_id), x = (S.lines || []).find(y => y.ticket_id === args.p_ticket_id && y.line_no === args.p_line_no);
        if (!m || !x) throw new Error('pb:not_found');
        if ((S.links || []).some(y => y.ticket_id === x.ticket_id && y.line_no === x.line_no && !y.unlinked)) throw new Error('pb:already_linked');
        const f = args.p_factor || factor(x.unit, m); if (!f) throw new Error('pb:needs_factor');
        S.links = S.links || []; S.links.push({ id: 'l' + (S.links.length + 1), material_id: m.id, ticket_id: x.ticket_id, line_no: x.line_no, order_id: args.p_order_id, item: x.item, ticket_qty: x.qty, ticket_unit: x.unit, factor: f, qty: r3(x.qty * f), unit: m.unit, unlinked: false });
        put(S); return { data: { ok: true }, error: null };
      }
      if (fn === 'pb_mat_ticket_unlink') { if (!String(args.p_reason || '').trim()) throw new Error('pb:reason_needed'); const l = (S.links || []).find(y => y.id === args.p_link_id); l.unlinked = true; l.unlinked_at = new Date().toISOString(); l.unlink_reason = args.p_reason; put(S); return { data: { ok: true }, error: null }; }
      if (fn === 'pb_mat_archive') { const m = S.mats.find(x => x.id === args.p_material_id); m.archived = !!args.p_archived; m.version++; put(S); return { data: { ok: true, material: out(m) }, error: null }; }
      if (fn === 'pb_mat_history') return { data: { changes: [{ action: 'create', at: new Date().toISOString(), phone_at: new Date().toISOString(), by: 'owner-a.test' }], alerts: [{ at: new Date().toISOString(), state: 'sent', alert_pct: 80, used: 360, waiting: 0, ordered: 400, unit: 'LF', sent_to: [{ to: 'owner-a.test' }] }] }, error: null };
    } catch (e) { return { data: null, error: { message: e.message } }; }
    return { data: null, error: { message: 'unknown' } };
  };
};
// A context whose 3rd init script (pd_lib's seed) gets the materials mock registered just before it.
async function setup(browser, opts) {
  const real = browser.newContext.bind(browser);
  const b2 = Object.create(browser);
  b2.newContext = async (o) => {
    const ctx = await real(o); const add = ctx.addInitScript.bind(ctx); let n = 0;
    ctx.addInitScript = async (...a) => { n++; if (n === 3) await add(MAT); return add(...a); };
    return ctx;
  };
  return T.setup(b2, opts);
}
// server materials for job 24-101 (360 LF of counted pipe in pd_lib's seed) and 24-202
function seedMats() {
  return { mats: [
    { id: 'mp1', job_key: '24-101', job_number: '24-101', name: '8in PVC SDR 35', category: 'pipe', source: 'pipe_footage', basis: null, unit: 'LF', expected: 1000, alert_pct: 80, trench_width_ft: null, bed_thick_ft: null, density_tpy: null, extra_pct: 0, version: 1, archived: false,
      orders: [{ id: 'o1', cid: 'c-o1', qty: 400, unit: 'LF', ordered_on: '2026-10-01', ref: 'PO 7', voided: false }], uses: [] },
    { id: 'ms1', job_key: '24-101', job_number: '24-101', name: 'Fine sand (mason sand)', category: 'bedding_sand', source: 'bedding_calc', basis: 'volume', unit: 'yd³', expected: 10, alert_pct: 80, trench_width_ft: 3, bed_thick_ft: 0.5, density_tpy: 1.2, extra_pct: 15, version: 1, archived: false, orders: [], uses: [] },
    { id: 'mr1', job_key: '24-101', job_number: '24-101', name: '3/4" crushed rock', category: 'bedding_rock', source: 'bedding_calc', basis: 'weight', use_as: 'shading', unit: 'ton', expected: null, alert_pct: 80, trench_width_ft: null, bed_thick_ft: null, density_tpy: 1.35, extra_pct: 15, version: 1, archived: false, orders: [], uses: [] },
    { id: 'mf1', job_key: '24-101', job_number: '24-101', name: 'Tees', category: 'fittings', source: 'entered', basis: null, unit: 'EA', expected: 12, alert_pct: 80, trench_width_ft: null, bed_thick_ft: null, density_tpy: null, extra_pct: 0, version: 1, archived: false, orders: [], uses: [{ id: 'u1', cid: 'c-u1', qty: 3, unit: 'EA', used_on: '2026-10-18', voided: false }] }
  ],
  // job 24-101's delivery ticket lines (what pb_mat.ticket_lines() returns)
  lines: [
    { job_key: '24-101', ticket_id: 'tk1', line_no: 0, type: 'material', item: 'Fine sand', qty: 12, unit: 'tons', supplier: 'Rock Co', ticket_no: '5512', ticket_date: '2026-10-17', has_photo: true },
    { job_key: '24-101', ticket_id: 'tk1', line_no: 1, type: 'material', item: 'Gaskets', qty: 50, unit: 'EA', supplier: 'Rock Co', ticket_no: '5512', ticket_date: '2026-10-17', has_photo: true },
    { job_key: '24-101', ticket_id: 'tk2', line_no: 0, type: 'material', item: '8in PVC SDR 35', qty: 14, unit: 'sticks', supplier: 'Pipe Co', ticket_no: 'P-9', ticket_date: '2026-10-18', has_photo: false }
  ], links: [], stale: { '24-101': 1 } };
}
const openJob = async (page, job) => { await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(900); await page.evaluate((j) => { const i = [...document.querySelectorAll('#pdJobs .pbp-job')].findIndex(b => b.textContent.includes('Job ' + j)); document.getElementById('pdJob' + i).click(); }, job); await page.waitForTimeout(900); };
const matText = (page) => page.evaluate(() => { const s = document.getElementById('pjMatSec'); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
const matLog = (page, fn) => page.evaluate((f) => (window.__matLog || []).filter(x => x.fn === f), fn);
module.exports = Object.assign({}, T, { setup, seedMats, openJob, matText, matLog });
